import Fastify from 'fastify';
import cors from '@fastify/cors';
import { prisma } from '@open-social/database';
import {
  AccountService,
  PostService,
  ScheduleService,
} from '@open-social/core';

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
  // Social Accounts Endpoints
  // -------------------------------------------------------------
  fastify.get('/api/social-accounts', async () => {
    return await AccountService.listAccounts();
  });

  fastify.delete('/api/social-accounts/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    await AccountService.disconnectAccount(id);
    return reply.send({ success: true });
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

