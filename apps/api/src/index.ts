import Fastify from 'fastify';
import cors from '@fastify/cors';
import { prisma } from '@open-social/database';
import {
  AccountService,
  PostService,
  ScheduleService,
} from '@open-social/core';
import { ProviderRegistry } from '@open-social/providers';
import {
  MCP_TOOLS_CATALOG,
  generateAIPostContent,
  generateClientConfig,
} from '@open-social/mcp';

export async function buildApp() {
  const fastify = Fastify({
    logger: process.env.NODE_ENV !== 'test',
  });

  // Setup CORS for local frontend communication
  await fastify.register(cors, {
    origin: true,
  });

  // -------------------------------------------------------------
  // Health Check Endpoint (FR-13)
  // -------------------------------------------------------------
  fastify.get('/api/health', async (_request, reply) => {
    try {
      // Check DB readiness
      await prisma.$queryRaw`SELECT 1`;
      return reply.send({
        status: 'ok',
        timestamp: new Date().toISOString(),
        database: 'connected',
      });
    } catch (err: any) {
      return reply.status(503).send({
        status: 'degraded',
        error: 'Database connection failed',
        timestamp: new Date().toISOString(),
      });
    }
  });

  // -------------------------------------------------------------
  // Social Accounts & OAuth Endpoints
  // -------------------------------------------------------------
  fastify.get('/api/social-accounts', async () => {
    return await AccountService.listAccounts();
  });

  fastify.delete('/api/social-accounts/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    await AccountService.disconnectAccount(id);
    return reply.send({ success: true });
  });

  // Get OAuth initiation URL
  fastify.get('/api/auth/:provider/url', async (request, reply) => {
    const { provider } = request.params as { provider: string };
    if (!ProviderRegistry.has(provider)) {
      return reply.status(400).send({ error: `Unsupported provider: ${provider}` });
    }

    const instance = ProviderRegistry.get(provider);
    const state = `st_${Date.now()}_${Math.random().toString(36).substring(7)}`;
    const url = instance.getAuthorizationUrl({ state });

    return reply.send({ url, state, provider });
  });

  // Handle OAuth callback
  fastify.get('/api/auth/:provider/callback', async (request, reply) => {
    const { provider } = request.params as { provider: string };
    const query = request.query as { code?: string; state?: string; error?: string };

    if (query.error) {
      return reply.redirect(`http://localhost:3000/accounts?error=${encodeURIComponent(query.error)}`);
    }

    if (!query.code) {
      return reply.status(400).send({ error: 'Missing authorization code' });
    }

    try {
      const instance = ProviderRegistry.get(provider);
      const tokenResult = await instance.exchangeCodeForToken({ code: query.code });

      // Connect and encrypt tokens at rest
      await AccountService.connectAccount({
        userId: 'default_local_user',
        provider: provider as 'linkedin' | 'x' | 'mock',
        providerAccountId: tokenResult.profile.providerAccountId,
        displayName: tokenResult.profile.displayName,
        username: tokenResult.profile.username,
        avatarUrl: tokenResult.profile.avatarUrl,
        accessToken: tokenResult.accessToken,
        refreshToken: tokenResult.refreshToken,
        tokenExpiresAt: tokenResult.expiresInSeconds
          ? new Date(Date.now() + tokenResult.expiresInSeconds * 1000)
          : undefined,
      });

      return reply.redirect('http://localhost:3000/accounts?connected=true');
    } catch (err: any) {
      return reply.redirect(`http://localhost:3000/accounts?error=${encodeURIComponent(err.message)}`);
    }
  });

  // Manual connect endpoint (useful for demo/mock accounts and developer testing)
  fastify.post('/api/social-accounts/connect', async (request, reply) => {
    const body = request.body as any;
    const account = await AccountService.connectAccount({
      userId: body.userId || 'default_local_user',
      provider: body.provider,
      providerAccountId: body.providerAccountId,
      displayName: body.displayName,
      username: body.username,
      avatarUrl: body.avatarUrl,
      accessToken: body.accessToken,
      refreshToken: body.refreshToken,
      tokenExpiresAt: body.tokenExpiresAt ? new Date(body.tokenExpiresAt) : undefined,
    });
    return reply.status(201).send(account);
  });

  // -------------------------------------------------------------
  // Posts & Scheduling Endpoints
  // -------------------------------------------------------------
  fastify.get('/api/posts', async (request) => {
    const { limit, offset } = request.query as { limit?: string; offset?: string };
    return await PostService.listPosts(undefined, Number(limit) || 50, Number(offset) || 0);
  });

  fastify.post('/api/posts', async (request, reply) => {
    const body = request.body as any;
    const post = await PostService.createPost({
      userId: body.userId || 'default_local_user',
      canonicalContent: body.canonicalContent,
      targets: body.targets,
    });
    return reply.status(201).send(post);
  });

  fastify.get('/api/post-targets', async (request) => {
    const query = request.query as any;
    return await ScheduleService.listScheduled({
      status: query.status,
      provider: query.provider,
      fromUtc: query.from ? new Date(query.from) : undefined,
      toUtc: query.to ? new Date(query.to) : undefined,
    });
  });

  fastify.get('/api/post-targets/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const target = await ScheduleService.getTargetDetails(id);
    if (!target) {
      return reply.status(404).send({ error: 'Post target not found' });
    }
    return reply.send(target);
  });

  fastify.patch('/api/post-targets/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const body = request.body as { publishAtUtc: string; timezone?: string };
    const updated = await ScheduleService.rescheduleTarget(
      id,
      new Date(body.publishAtUtc),
      body.timezone
    );
    return reply.send(updated);
  });

  fastify.delete('/api/post-targets/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const canceled = await ScheduleService.cancelSchedule(id);
    return reply.send(canceled);
  });

  fastify.post('/api/post-targets/:id/publish', async (request, reply) => {
    const { id } = request.params as { id: string };
    const published = await ScheduleService.publishNow(id);
    return reply.send(published);
  });

  // Bulk preview & commit
  fastify.post('/api/schedules/bulk-preview', async (request, reply) => {
    const body = request.body as { rows: any[]; cadence: any };
    const preview = await ScheduleService.bulkSchedulePreview(body.rows, body.cadence);
    return reply.send(preview);
  });

  fastify.post('/api/schedules/bulk-commit', async (request, reply) => {
    const body = request.body as { userId?: string; items: any[] };
    const results = await ScheduleService.bulkScheduleCommit(
      body.userId || 'default_local_user',
      body.items
    );
    return reply.status(201).send(results);
  });

  // -------------------------------------------------------------
  // AI Content Generation & Assisted Scheduling
  // -------------------------------------------------------------
  fastify.post('/api/ai/generate', async (request, reply) => {
    const body = request.body as {
      topic: string;
      tone?: string;
      platforms?: ('linkedin' | 'x')[];
      keyPoints?: string[];
      callToAction?: string;
    };

    if (!body.topic || body.topic.trim().length === 0) {
      return reply.status(400).send({ error: 'Topic is required for AI post generation.' });
    }

    const generated = generateAIPostContent(body);
    return reply.send(generated);
  });

  // -------------------------------------------------------------
  // MCP (Model Context Protocol) Hub Endpoints
  // -------------------------------------------------------------
  fastify.get('/api/mcp/status', async (_request, reply) => {
    const [accountCount, scheduledCount, publishedCount] = await Promise.all([
      prisma.socialAccount.count(),
      prisma.postTarget.count({ where: { status: 'scheduled' } }),
      prisma.postTarget.count({ where: { status: 'published' } }),
    ]);

    return reply.send({
      status: 'online',
      mcpVersion: '0.1.0',
      database: 'connected',
      channelsConnected: accountCount,
      totalTools: MCP_TOOLS_CATALOG.length,
      queue: {
        scheduled: scheduledCount,
        published: publishedCount,
      },
      workerMode: 'local-daemon',
      uptimeSeconds: Math.floor(process.uptime()),
    });
  });

  fastify.get('/api/mcp/tools', async () => {
    return {
      totalTools: MCP_TOOLS_CATALOG.length,
      tools: MCP_TOOLS_CATALOG,
    };
  });

  fastify.get('/api/mcp/config/:client', async (request, reply) => {
    const { client } = request.params as { client: string };
    const config = generateClientConfig(client);
    return reply.send(config);
  });

  // Direct MCP Tool Runner for Interactive UI Playground
  fastify.post('/api/mcp/execute', async (request, reply) => {
    const startTime = Date.now();
    const { toolName, parameters = {} } = request.body as {
      toolName: string;
      parameters: Record<string, any>;
    };

    try {
      let result: any;

      switch (toolName) {
        case 'social_generate_content':
          result = generateAIPostContent(parameters as any);
          break;

        case 'social_create_post': {
          const publishDate = parameters.publishNow
            ? new Date(Date.now() - 1000)
            : parameters.publishAtUtc
            ? new Date(parameters.publishAtUtc)
            : new Date();

          const post = await PostService.createPost({
            userId: 'default_local_user',
            canonicalContent: parameters.content,
            targets: (parameters.accountIds || []).map((accId: string) => ({
              socialAccountId: accId,
              publishAtUtc: publishDate,
              timezone: parameters.timezone || 'UTC',
              contentOverride: parameters.contentOverride,
            })),
          });
          result = {
            message: parameters.publishNow
              ? 'Post created and enqueued for immediate publication by the local worker.'
              : 'Post successfully scheduled.',
            postId: post.id,
            publishNow: parameters.publishNow || false,
            targets: post.targets,
          };
          break;
        }

        case 'social_list_accounts':
          result = await AccountService.listAccounts();
          break;

        case 'social_connect_account':
          if (parameters.provider === 'mock') {
            result = await AccountService.connectAccount({
              userId: 'default_local_user',
              provider: 'mock',
              providerAccountId: `mock_mcp_${Date.now()}`,
              displayName: parameters.displayName || 'AI Mock Channel',
              username: parameters.username || 'aimock',
              accessToken: `mock_tok_${Date.now()}`,
            });
          } else {
            result = {
              message: `Initiate OAuth via /api/auth/${parameters.provider}/url`,
              provider: parameters.provider,
            };
          }
          break;

        case 'social_list_scheduled':
          result = await ScheduleService.listScheduled({
            status: parameters.status,
            provider: parameters.provider,
            limit: parameters.limit || 20,
          });
          break;

        case 'social_get_scheduled_post':
          result = await ScheduleService.getTargetDetails(parameters.targetId);
          break;

        case 'social_update_schedule':
          result = await ScheduleService.rescheduleTarget(
            parameters.targetId,
            new Date(parameters.newPublishAtUtc),
            parameters.timezone
          );
          break;

        case 'social_cancel_schedule':
          result = await ScheduleService.cancelSchedule(parameters.targetId);
          break;

        case 'social_publish_now':
          result = await ScheduleService.publishNow(parameters.targetId);
          break;

        case 'social_get_publish_status':
          result = await ScheduleService.getTargetDetails(parameters.targetId);
          break;

        case 'social_get_publish_errors':
          result = await ScheduleService.getPublishErrors(parameters.limit || 10);
          break;

        case 'social_list_posts':
          result = await PostService.listPosts(undefined, parameters.limit || 20, parameters.offset || 0);
          break;

        case 'social_get_post':
          result = await PostService.getPost(parameters.postId);
          break;

        case 'social_update_post':
          result = await PostService.updatePost(parameters.postId, {
            canonicalContent: parameters.content,
          });
          break;

        case 'social_delete_post':
          result = await PostService.deletePost(parameters.postId);
          break;

        case 'mcp_list_tools':
          result = { totalTools: MCP_TOOLS_CATALOG.length, tools: MCP_TOOLS_CATALOG };
          break;

        case 'mcp_get_connector_status': {
          const [accs, schs, pubs] = await Promise.all([
            prisma.socialAccount.count(),
            prisma.postTarget.count({ where: { status: 'scheduled' } }),
            prisma.postTarget.count({ where: { status: 'published' } }),
          ]);
          result = {
            status: 'online',
            database: 'connected',
            channelsConnected: accs,
            queue: { scheduled: schs, published: pubs },
            uptimeSeconds: Math.floor(process.uptime()),
          };
          break;
        }

        case 'mcp_test_connection':
          result = {
            handshake: 'pong',
            echo: parameters.echo || 'Handshake successful',
            timestamp: new Date().toISOString(),
          };
          break;

        case 'mcp_export_config':
          result = generateClientConfig(parameters.client || 'claude-desktop');
          break;

        default:
          return reply.status(404).send({ error: `Unknown MCP tool: ${toolName}` });
      }

      return reply.send({
        success: true,
        toolName,
        durationMs: Date.now() - startTime,
        result,
      });
    } catch (err: any) {
      return reply.status(500).send({
        success: false,
        toolName,
        durationMs: Date.now() - startTime,
        error: err.message || 'Error executing MCP tool',
      });
    }
  });

  return fastify;
}

const port = Number(process.env.API_PORT) || 4000;
export async function start() {
  const app = await buildApp();
  try {
    await app.listen({ port, host: '0.0.0.0' });
    console.log(`API server listening on port ${port}`);
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
}

// Auto-start if executed directly
if (process.argv[1] && process.argv[1].endsWith('index.js')) {
  start();
}

