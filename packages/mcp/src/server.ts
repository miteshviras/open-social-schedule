import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';
import {
  AccountService,
  PostService,
  ScheduleService,
  TargetStatus,
} from '@open-social/core';
import { prisma } from '@open-social/database';

export interface McpToolMeta {
  name: string;
  category: 'Content & Posts' | 'Accounts' | 'Scheduling' | 'Publishing' | 'Diagnostics';
  description: string;
  isMutating: boolean;
  parameters: Record<string, string>;
  samplePayload: Record<string, any>;
}

export const MCP_TOOLS_CATALOG: McpToolMeta[] = [
  {
    name: 'social_generate_content',
    category: 'Content & Posts',
    description: 'Generate tailored social media posts with platform-specific variations (LinkedIn, X) from a topic, tone, or key points.',
    isMutating: false,
    parameters: {
      topic: 'string (required) - The subject or theme of the post',
      tone: 'enum [professional, casual, thought-leadership, punchy, educational]',
      platforms: 'array of enum [linkedin, x]',
      keyPoints: 'array of strings (optional)',
      callToAction: 'string (optional)',
    },
    samplePayload: {
      topic: 'Announcing our new local-first social media scheduler with MCP support',
      tone: 'thought-leadership',
      platforms: ['linkedin', 'x'],
      callToAction: 'Check out the open-source repo!',
    },
  },
  {
    name: 'social_create_post',
    category: 'Content & Posts',
    description: 'Create and optionally schedule or immediately publish a post to one or more connected social accounts.',
    isMutating: true,
    parameters: {
      content: 'string (required) - Canonical text of the post',
      accountIds: 'array of strings (required) - Target social account IDs',
      publishNow: 'boolean - If true, triggers immediate publishing by local worker',
      publishAtUtc: 'string - ISO 8601 UTC timestamp (required if publishNow is false)',
      timezone: 'string - User timezone identifier (default: UTC)',
      contentOverride: 'string (optional) - Platform specific text override',
    },
    samplePayload: {
      content: 'Excited to introduce Open Social Scheduler! Local-first, private, and powered by Model Context Protocol.',
      accountIds: ['acc_123'],
      publishNow: false,
      publishAtUtc: new Date(Date.now() + 86400000).toISOString(),
      timezone: 'Asia/Kolkata',
    },
  },
  {
    name: 'social_get_post',
    category: 'Content & Posts',
    description: 'Retrieve a canonical post with all platform targets, delivery states, and attempt histories.',
    isMutating: false,
    parameters: {
      postId: 'string (required) - The master post ID',
    },
    samplePayload: { postId: 'post_123' },
  },
  {
    name: 'social_list_posts',
    category: 'Content & Posts',
    description: 'List recent master posts with their publication targets.',
    isMutating: false,
    parameters: {
      limit: 'number (optional, default: 20)',
      offset: 'number (optional, default: 0)',
    },
    samplePayload: { limit: 10, offset: 0 },
  },
  {
    name: 'social_update_post',
    category: 'Content & Posts',
    description: 'Update the canonical content of an existing post.',
    isMutating: true,
    parameters: {
      postId: 'string (required) - The master post ID',
      content: 'string (required) - Updated canonical text',
    },
    samplePayload: { postId: 'post_123', content: 'Updated copy for the launch announcement!' },
  },
  {
    name: 'social_delete_post',
    category: 'Content & Posts',
    description: 'Delete a post and all its associated scheduled targets.',
    isMutating: true,
    parameters: {
      postId: 'string (required) - Post ID to delete',
    },
    samplePayload: { postId: 'post_123' },
  },
  {
    name: 'social_list_accounts',
    category: 'Accounts',
    description: 'List all connected social media channels without exposing sensitive OAuth tokens.',
    isMutating: false,
    parameters: {},
    samplePayload: {},
  },
  {
    name: 'social_connect_account',
    category: 'Accounts',
    description: 'Connect a simulated mock channel instantly or retrieve OAuth connection URL instructions for LinkedIn / X.',
    isMutating: true,
    parameters: {
      provider: 'enum [mock, linkedin, x] (required)',
      displayName: 'string (optional) - Account display name',
      username: 'string (optional)',
    },
    samplePayload: { provider: 'mock', displayName: 'AI Social Channel', username: 'aisocial' },
  },
  {
    name: 'social_disconnect_account',
    category: 'Accounts',
    description: 'Disconnect and delete a social account channel.',
    isMutating: true,
    parameters: {
      accountId: 'string (required) - Account ID to disconnect',
    },
    samplePayload: { accountId: 'acc_123' },
  },
  {
    name: 'social_refresh_account',
    category: 'Accounts',
    description: 'Check health status and token expiration for a connected account.',
    isMutating: false,
    parameters: {
      accountId: 'string (required) - Account ID to check',
    },
    samplePayload: { accountId: 'acc_123' },
  },
  {
    name: 'social_schedule_post',
    category: 'Scheduling',
    description: 'Schedule a post for publication to one or more connected social accounts.',
    isMutating: true,
    parameters: {
      content: 'string (required)',
      accountIds: 'array of strings (required)',
      publishAtUtc: 'string (required) - ISO 8601 UTC timestamp',
      timezone: 'string (required) - Timezone string',
      contentOverride: 'string (optional)',
    },
    samplePayload: {
      content: 'Scheduled post content',
      accountIds: ['acc_123'],
      publishAtUtc: '2026-09-25T14:00:00Z',
      timezone: 'UTC',
    },
  },
  {
    name: 'social_schedule_bulk',
    category: 'Scheduling',
    description: 'Bulk import and schedule multiple posts across automated interval cadences.',
    isMutating: true,
    parameters: {
      accountId: 'string (required)',
      posts: 'array of strings (required)',
      startDateUtc: 'string (required)',
      intervalMinutes: 'number (optional, default: 120)',
      timezone: 'string (optional, default: UTC)',
    },
    samplePayload: {
      accountId: 'acc_123',
      posts: ['Tip 1: Use local-first software', 'Tip 2: Connect AI via MCP'],
      startDateUtc: '2026-09-22T09:00:00Z',
      intervalMinutes: 180,
    },
  },
  {
    name: 'social_list_scheduled',
    category: 'Scheduling',
    description: 'List scheduled post targets with optional status, date, or provider filters.',
    isMutating: false,
    parameters: {
      status: 'enum [draft, scheduled, publishing, published, retryable_failure, failed, canceled]',
      provider: 'string (optional)',
      fromUtc: 'string (optional)',
      toUtc: 'string (optional)',
      limit: 'number (optional, default: 20)',
    },
    samplePayload: { status: 'scheduled', limit: 10 },
  },
  {
    name: 'social_get_scheduled_post',
    category: 'Scheduling',
    description: 'Get detailed information and attempt history for a specific post target.',
    isMutating: false,
    parameters: {
      targetId: 'string (required)',
    },
    samplePayload: { targetId: 'target_123' },
  },
  {
    name: 'social_update_schedule',
    category: 'Scheduling',
    description: 'Reschedule an existing post target to a new date and time.',
    isMutating: true,
    parameters: {
      targetId: 'string (required)',
      newPublishAtUtc: 'string (required) - ISO 8601 UTC timestamp',
      timezone: 'string (optional)',
    },
    samplePayload: { targetId: 'target_123', newPublishAtUtc: '2026-09-26T18:00:00Z' },
  },
  {
    name: 'social_cancel_schedule',
    category: 'Scheduling',
    description: 'Cancel an upcoming scheduled publication.',
    isMutating: true,
    parameters: {
      targetId: 'string (required)',
    },
    samplePayload: { targetId: 'target_123' },
  },
  {
    name: 'social_publish_now',
    category: 'Publishing',
    description: 'Immediately enqueue an existing scheduled target for immediate worker execution.',
    isMutating: true,
    parameters: {
      targetId: 'string (required)',
    },
    samplePayload: { targetId: 'target_123' },
  },
  {
    name: 'social_get_publish_status',
    category: 'Publishing',
    description: 'Inspect the latest publication status and safe error logs for a post target.',
    isMutating: false,
    parameters: {
      targetId: 'string (required)',
    },
    samplePayload: { targetId: 'target_123' },
  },
  {
    name: 'social_get_publish_errors',
    category: 'Publishing',
    description: 'List recent failed delivery attempts with error categorization and recovery hints.',
    isMutating: false,
    parameters: {
      limit: 'number (optional, default: 10)',
    },
    samplePayload: { limit: 10 },
  },
  {
    name: 'mcp_list_tools',
    category: 'Diagnostics',
    description: 'Return full tool catalog with parameter schemas, descriptions, and mutation classifications.',
    isMutating: false,
    parameters: {},
    samplePayload: {},
  },
  {
    name: 'mcp_get_connector_status',
    category: 'Diagnostics',
    description: 'Check database connectivity, account counts, queue counts, and worker health.',
    isMutating: false,
    parameters: {},
    samplePayload: {},
  },
  {
    name: 'mcp_test_connection',
    category: 'Diagnostics',
    description: 'Test handshake ping to verify MCP server connectivity.',
    isMutating: false,
    parameters: {
      echo: 'string (optional)',
    },
    samplePayload: { echo: 'Hello from Claude Desktop!' },
  },
  {
    name: 'mcp_export_config',
    category: 'Diagnostics',
    description: 'Generate ready-to-use configuration blocks for supported MCP clients.',
    isMutating: false,
    parameters: {
      client: 'enum [claude-desktop, claude-code, cursor, antigravity, cline, windsurf, codex, generic]',
    },
    samplePayload: { client: 'claude-desktop' },
  },
];

export function generateAIPostContent(input: {
  topic: string;
  tone?: string;
  platforms?: ('linkedin' | 'x')[];
  keyPoints?: string[];
  callToAction?: string;
}) {
  const tone = input.tone || 'professional';
  const cta = input.callToAction || 'What are your thoughts? Join the conversation below.';
  const keyPointsText = input.keyPoints && input.keyPoints.length > 0
    ? input.keyPoints.map((p) => `• ${p}`).join('\n')
    : '• Privacy-first local data ownership\n• Direct native MCP connectivity for Claude, Cursor & AGY\n• Clean open-source design';

  let hook = '';
  let body = '';
  let xTweet = '';
  let hashtags: string[] = ['#OpenSource', '#DevTools', '#Tech'];

  switch (tone) {
    case 'thought-leadership':
      hook = `Most social management tools force you to hand over credentials to the cloud.\nWe chose a different path.`;
      body = `Announcing Open Social Scheduler: a 100% local-first, privacy-respecting scheduling engine built for developers and creators.\n\nKey architectural pillars:\n${keyPointsText}\n\n${cta}`;
      xTweet = `Why give your social media tokens to the cloud?\n\nIntroducing Open Social Scheduler: local-first, AES-256 encrypted, and native MCP support for AI agents.\n\n${cta} #OpenSource #DevTools`;
      hashtags = ['#ThoughtLeadership', '#OpenSource', '#PrivacyFirst', '#TechStack'];
      break;

    case 'punchy':
      hook = `Stop sending your OAuth secrets to third-party servers.`;
      body = `Meet Open Social Scheduler.\n\n${keyPointsText}\n\nFast. Local. MCP-ready.\n\n${cta}`;
      xTweet = `Meet Open Social Scheduler: local-first social publishing via Model Context Protocol. Zero cloud lock-in.\n\n${cta} #DevTools #AI`;
      hashtags = ['#Productivity', '#DevTools', '#AI'];
      break;

    case 'casual':
      hook = `Spent the weekend building something I really needed...`;
      body = `A clean, local-first social scheduler where your tokens stay on your laptop and AI agents can schedule posts via MCP.\n\nWhat it does:\n${keyPointsText}\n\n${cta}`;
      xTweet = `Built an open-source, local-first social scheduler with Model Context Protocol support. All tokens encrypted locally.\n\nCheck it out! #BuildInPublic #OpenSource`;
      hashtags = ['#BuildInPublic', '#IndieHacker', '#DevCommunity'];
      break;

    case 'educational':
      hook = `How Model Context Protocol (MCP) is changing developer productivity:`;
      body = `Instead of manually copying drafts between tools, your AI assistant can now draft, inspect, and schedule social posts directly.\n\nHere is how Open Social Scheduler works:\n${keyPointsText}\n\n${cta}`;
      xTweet = `How MCP is transforming content scheduling: Claude/Cursor can now draft and schedule directly to your local queue.\n\n${cta} #AI #DevTools`;
      hashtags = ['#Education', '#SoftwareEngineering', '#MCP', '#AI'];
      break;

    case 'professional':
    default:
      hook = `Excited to introduce Open Social Scheduler — an open-source, local-first social media scheduling platform.`;
      body = `Designed for creators, engineers, and teams who prioritize security, local data sovereignty, and AI interoperability.\n\nHighlights:\n${keyPointsText}\n\n${cta}`;
      xTweet = `Excited to introduce Open Social Scheduler: local-first social scheduling with native Model Context Protocol support.\n\n${cta} #Tech #DevTools #OpenSource`;
      hashtags = ['#Productivity', '#OpenSource', '#Technology', '#DevTools'];
      break;
  }

  // Ensure X tweet is strictly under 280 characters
  if (xTweet.length > 275) {
    xTweet = xTweet.slice(0, 272) + '...';
  }

  const linkedinPost = `${hook}\n\n${body}\n\n${hashtags.join(' ')}`;

  return {
    topic: input.topic,
    tone,
    canonicalContent: `${hook}\n\n${body}`,
    variations: {
      linkedin: linkedinPost,
      x: xTweet,
    },
    suggestedHashtags: hashtags,
    characterCounts: {
      linkedin: linkedinPost.length,
      x: xTweet.length,
    },
  };
}

export function generateClientConfig(client: string, basePath?: string) {
  const rootDir = basePath || process.cwd();
  const scriptPath = `${rootDir.replace(/\\/g, '/')}/packages/mcp/dist/index.js`;
  const dbUrl = `file:${rootDir.replace(/\\/g, '/')}/packages/database/prisma/dev.db`;

  switch (client) {
    case 'claude-desktop':
      return {
        client: 'claude-desktop',
        fileName: 'claude_desktop_config.json',
        pathHint: 'Windows: %APPDATA%/Claude/claude_desktop_config.json | macOS: ~/Library/Application Support/Claude/claude_desktop_config.json',
        config: {
          mcpServers: {
            'open-social-scheduler': {
              command: 'node',
              args: [scriptPath],
              env: {
                DATABASE_URL: dbUrl,
                ENCRYPTION_SECRET: process.env.ENCRYPTION_SECRET || 'super-secret-encryption-key-for-local-dev-32ch!',
              },
            },
          },
        },
      };

    case 'claude-code':
      return {
        client: 'claude-code',
        fileName: 'CLI Command',
        pathHint: 'Run in terminal where claude CLI is installed',
        cliCommand: `claude mcp add open-social-scheduler node "${scriptPath}"`,
        config: {
          mcpServers: {
            'open-social-scheduler': {
              command: 'node',
              args: [scriptPath],
            },
          },
        },
      };

    case 'cursor':
      return {
        client: 'cursor',
        fileName: '.cursor/mcp.json or Cursor Settings > MCP',
        pathHint: 'Add under Settings > Features > MCP Servers',
        config: {
          mcpServers: {
            'open-social-scheduler': {
              command: 'node',
              args: [scriptPath],
            },
          },
        },
      };

    case 'antigravity':
      return {
        client: 'antigravity',
        fileName: 'antigravity.mcp.json',
        pathHint: 'Antigravity MCP configuration',
        config: {
          mcpServers: {
            'open-social-scheduler': {
              command: 'node',
              args: [scriptPath],
            },
          },
        },
      };

    case 'cline':
      return {
        client: 'cline',
        fileName: 'cline_mcp_settings.json',
        pathHint: 'VS Code Cline Extension Settings',
        config: {
          mcpServers: {
            'open-social-scheduler': {
              command: 'node',
              args: [scriptPath],
            },
          },
        },
      };

    case 'windsurf':
      return {
        client: 'windsurf',
        fileName: '~/.codeium/windsurf/mcp_config.json',
        pathHint: 'Windsurf MCP Configuration file',
        config: {
          mcpServers: {
            'open-social-scheduler': {
              command: 'node',
              args: [scriptPath],
            },
          },
        },
      };

    case 'codex':
      return {
        client: 'codex',
        fileName: 'codex-mcp.json',
        pathHint: 'Codex CLI Configuration',
        config: {
          mcpServers: {
            'open-social-scheduler': {
              command: 'node',
              args: [scriptPath],
            },
          },
        },
      };

    case 'generic':
    default:
      return {
        client: 'generic',
        fileName: 'mcp-config.json',
        pathHint: 'Standard Model Context Protocol client configuration',
        config: {
          mcpServers: {
            'open-social-scheduler': {
              command: 'node',
              args: [scriptPath],
            },
          },
        },
      };
  }
}

export function createMcpServer(): McpServer {
  const server = new McpServer({
    name: 'open-social-scheduler',
    version: '0.1.0',
  });

  // -------------------------------------------------------------
  // AI Content Generator & Review Tool
  // -------------------------------------------------------------
  server.tool(
    'social_generate_content',
    'Generate tailored social media posts with platform-specific variations (LinkedIn, X) from a topic, tone, or key points.',
    {
      topic: z.string().min(1).describe('The subject, theme, or idea for the post'),
      tone: z.enum(['professional', 'casual', 'thought-leadership', 'punchy', 'educational']).default('professional').describe('Voice tone for the post'),
      platforms: z.array(z.enum(['linkedin', 'x'])).default(['linkedin', 'x']).describe('Target platforms to format for'),
      keyPoints: z.array(z.string()).optional().describe('Optional bullet points or key takeaways to include'),
      callToAction: z.string().optional().describe('Optional call to action phrase'),
    },
    async (args) => {
      const generated = generateAIPostContent(args);
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(generated, null, 2),
          },
        ],
      };
    }
  );

  // -------------------------------------------------------------
  // Post Management & Scheduling Workflows
  // -------------------------------------------------------------
  server.tool(
    'social_create_post',
    'Create and optionally schedule or immediately publish a post to one or more connected social accounts.',
    {
      content: z.string().min(1).describe('The canonical master text of the post'),
      accountIds: z.array(z.string()).min(1).describe('Array of social account IDs to publish to'),
      publishNow: z.boolean().default(false).describe('If true, triggers immediate publishing by local worker'),
      publishAtUtc: z.string().optional().describe('Target publication time in ISO 8601 UTC format (required if publishNow is false)'),
      timezone: z.string().default('UTC').describe('User timezone string (e.g. Asia/Kolkata, America/New_York)'),
      contentOverride: z.string().optional().describe('Optional platform-specific text override'),
    },
    async (args) => {
      const publishDate = args.publishNow
        ? new Date(Date.now() - 1000)
        : args.publishAtUtc
        ? new Date(args.publishAtUtc)
        : new Date();

      const post = await PostService.createPost({
        userId: 'default_local_user',
        canonicalContent: args.content,
        targets: args.accountIds.map((accId) => ({
          socialAccountId: accId,
          publishAtUtc: publishDate,
          timezone: args.timezone,
          contentOverride: args.contentOverride,
        })),
      });

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(
              {
                message: args.publishNow
                  ? 'Post created and enqueued for immediate publication by the local worker.'
                  : 'Post successfully scheduled.',
                postId: post.id,
                publishNow: args.publishNow,
                targetCount: post.targets.length,
                targets: post.targets.map((t) => ({
                  id: t.id,
                  socialAccountId: t.socialAccountId,
                  publishAtUtc: t.publishAtUtc,
                  status: t.status,
                })),
              },
              null,
              2
            ),
          },
        ],
      };
    }
  );

  server.tool(
    'social_get_post',
    'Retrieve a canonical post with all platform targets, delivery states, and attempt histories.',
    {
      postId: z.string().describe('The master post ID'),
    },
    async (args) => {
      const post = await PostService.getPost(args.postId);
      if (!post) {
        return {
          content: [{ type: 'text', text: JSON.stringify({ error: 'Post not found' }) }],
        };
      }

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(post, null, 2),
          },
        ],
      };
    }
  );

  server.tool(
    'social_list_posts',
    'List recent master posts with their publication targets.',
    {
      limit: z.number().int().positive().default(20).describe('Max posts to return'),
      offset: z.number().int().nonnegative().default(0).describe('Offset for pagination'),
    },
    async (args) => {
      const posts = await PostService.listPosts(undefined, args.limit, args.offset);
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(
              posts.map((p) => ({
                id: p.id,
                content: p.canonicalContent,
                createdAt: p.createdAt,
                targetCount: p.targets.length,
                targets: p.targets.map((t) => ({
                  id: t.id,
                  provider: t.socialAccount.provider,
                  displayName: t.socialAccount.displayName,
                  status: t.status,
                  publishAtUtc: t.publishAtUtc,
                })),
              })),
              null,
              2
            ),
          },
        ],
      };
    }
  );

  server.tool(
    'social_update_post',
    'Update the canonical content of an existing post.',
    {
      postId: z.string().describe('The master post ID'),
      content: z.string().min(1).describe('Updated canonical content'),
    },
    async (args) => {
      const updated = await PostService.updatePost(args.postId, {
        canonicalContent: args.content,
      });

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(
              {
                message: 'Post updated successfully.',
                id: updated.id,
                canonicalContent: updated.canonicalContent,
                updatedAt: updated.updatedAt,
              },
              null,
              2
            ),
          },
        ],
      };
    }
  );

  server.tool(
    'social_delete_post',
    'Delete a post and all its associated scheduled targets.',
    {
      postId: z.string().describe('The post ID to delete'),
    },
    async (args) => {
      await PostService.deletePost(args.postId);
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({ message: `Post ${args.postId} successfully deleted.` }),
          },
        ],
      };
    }
  );

  // 1. social_list_accounts
  server.tool(
    'social_list_accounts',
    'List all connected social media channels (LinkedIn, X, etc.) and their status without sensitive tokens.',
    {},
    async () => {
      const accounts = await AccountService.listAccounts();
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(accounts, null, 2),
          },
        ],
      };
    }
  );

  // -------------------------------------------------------------
  // Account Operations & Management
  // -------------------------------------------------------------
  server.tool(
    'social_connect_account',
    'Connect a simulated mock channel instantly or retrieve OAuth connection URL instructions for LinkedIn / X.',
    {
      provider: z.enum(['mock', 'linkedin', 'x']).describe('Provider to connect'),
      displayName: z.string().default('AI Agent Channel').describe('Display name for the account'),
      username: z.string().optional().describe('Optional username handle'),
    },
    async (args) => {
      if (args.provider === 'mock') {
        const account = await AccountService.connectAccount({
          userId: 'default_local_user',
          provider: 'mock',
          providerAccountId: `mock_mcp_${Date.now()}`,
          displayName: args.displayName || 'AI Mock Channel',
          username: args.username || 'aimock',
          accessToken: `mock_tok_${Date.now()}`,
        });

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                {
                  message: 'Mock social account connected successfully.',
                  account,
                },
                null,
                2
              ),
            },
          ],
        };
      }

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(
              {
                message: `To connect a live ${args.provider} account, open the local web UI at http://localhost:3000/accounts or trigger the OAuth redirect endpoint at /api/auth/${args.provider}/url.`,
                provider: args.provider,
                setupUrl: `http://localhost:3000/accounts`,
              },
              null,
              2
            ),
          },
        ],
      };
    }
  );

  server.tool(
    'social_disconnect_account',
    'Disconnect and delete a social account channel.',
    {
      accountId: z.string().describe('The account ID to disconnect'),
    },
    async (args) => {
      await AccountService.disconnectAccount(args.accountId);
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({ message: `Account ${args.accountId} disconnected.` }),
          },
        ],
      };
    }
  );

  server.tool(
    'social_refresh_account',
    'Check health status and token expiration for a connected account.',
    {
      accountId: z.string().describe('The account ID to inspect'),
    },
    async (args) => {
      const accounts = await AccountService.listAccounts();
      const account = accounts.find((a) => a.id === args.accountId);
      if (!account) {
        return {
          content: [{ type: 'text', text: JSON.stringify({ error: 'Account not found' }) }],
        };
      }

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(
              {
                id: account.id,
                provider: account.provider,
                displayName: account.displayName,
                status: account.status,
                tokenExpiresAt: account.tokenExpiresAt,
                isHealthy: account.status === 'active',
              },
              null,
              2
            ),
          },
        ],
      };
    }
  );

  // 2. social_schedule_post
  server.tool(
    'social_schedule_post',
    'Schedule a post for publication to one or more connected social accounts.',
    {
      content: z.string().min(1).describe('The canonical master text of the post'),
      accountIds: z.array(z.string()).min(1).describe('Array of social account IDs to publish to'),
      publishAtUtc: z.string().describe('Target publication time in ISO 8601 UTC format (e.g. 2026-09-21T09:00:00Z)'),
      timezone: z.string().describe('User timezone string (e.g. Asia/Kolkata, America/New_York)'),
      contentOverride: z.string().optional().describe('Optional platform-specific text override'),
    },
    async (args) => {
      const post = await PostService.createPost({
        userId: 'default_local_user',
        canonicalContent: args.content,
        targets: args.accountIds.map((accId) => ({
          socialAccountId: accId,
          publishAtUtc: new Date(args.publishAtUtc),
          timezone: args.timezone,
          contentOverride: args.contentOverride,
        })),
      });

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(
              {
                message: 'Post successfully scheduled.',
                postId: post.id,
                targetCount: post.targets.length,
                targets: post.targets.map((t) => ({
                  id: t.id,
                  socialAccountId: t.socialAccountId,
                  publishAtUtc: t.publishAtUtc,
                  status: t.status,
                })),
              },
              null,
              2
            ),
          },
        ],
      };
    }
  );

  // 3. social_schedule_bulk
  server.tool(
    'social_schedule_bulk',
    'Bulk import and schedule multiple posts across intervals with automated cadence rules.',
    {
      accountId: z.string().describe('Target social account ID'),
      posts: z.array(z.string().min(1)).min(1).describe('List of post contents to schedule'),
      startDateUtc: z.string().describe('Starting time in ISO 8601 UTC format'),
      intervalMinutes: z.number().int().positive().default(120).describe('Minutes between each post (e.g. 60, 120)'),
      timezone: z.string().default('UTC').describe('User timezone identifier'),
    },
    async (args) => {
      const rows = args.posts.map((content) => ({
        content,
        socialAccountId: args.accountId,
      }));

      const cadence = {
        startDateUtc: new Date(args.startDateUtc),
        timezone: args.timezone,
        intervalMinutes: args.intervalMinutes,
      };

      // Preview & validate
      const preview = await ScheduleService.bulkSchedulePreview(rows, cadence);

      if (preview.invalidCount > 0) {
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                {
                  error: 'Validation failed on bulk rows.',
                  invalidCount: preview.invalidCount,
                  issues: preview.items.filter((i) => !i.isValid),
                },
                null,
                2
              ),
            },
          ],
        };
      }

      // Commit
      const createdTargets = await ScheduleService.bulkScheduleCommit(
        'default_local_user',
        preview.items.map((i) => ({
          content: i.content,
          socialAccountId: i.socialAccountId,
          publishAtUtc: i.publishAtUtc,
          timezone: i.timezone,
        }))
      );

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(
              {
                message: `Successfully bulk scheduled ${createdTargets.length} posts.`,
                totalCount: createdTargets.length,
                firstPublishAtUtc: createdTargets[0]?.publishAtUtc,
                lastPublishAtUtc: createdTargets[createdTargets.length - 1]?.publishAtUtc,
              },
              null,
              2
            ),
          },
        ],
      };
    }
  );

  // 4. social_list_scheduled
  server.tool(
    'social_list_scheduled',
    'List scheduled post targets with optional status, date, or provider filters.',
    {
      status: z.enum(['draft', 'scheduled', 'publishing', 'published', 'retryable_failure', 'failed', 'canceled']).optional().describe('Filter by target status'),
      provider: z.string().optional().describe('Filter by provider ("linkedin" | "x" | "mock")'),
      fromUtc: z.string().optional().describe('Filter start date ISO 8601 UTC'),
      toUtc: z.string().optional().describe('Filter end date ISO 8601 UTC'),
      limit: z.number().int().positive().default(20).describe('Max items to return'),
    },
    async (args) => {
      const targets = await ScheduleService.listScheduled({
        status: args.status as TargetStatus,
        provider: args.provider,
        fromUtc: args.fromUtc ? new Date(args.fromUtc) : undefined,
        toUtc: args.toUtc ? new Date(args.toUtc) : undefined,
        limit: args.limit,
      });

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(
              targets.map((t) => ({
                id: t.id,
                content: t.contentOverride || t.post.canonicalContent,
                provider: t.socialAccount.provider,
                displayName: t.socialAccount.displayName,
                publishAtUtc: t.publishAtUtc,
                timezone: t.timezone,
                status: t.status,
              })),
              null,
              2
            ),
          },
        ],
      };
    }
  );

  // 5. social_get_scheduled_post
  server.tool(
    'social_get_scheduled_post',
    'Get detailed information, overrides, and publish attempt history for a specific post target.',
    {
      targetId: z.string().describe('The post target ID'),
    },
    async (args) => {
      const target = await ScheduleService.getTargetDetails(args.targetId);
      if (!target) {
        return {
          content: [{ type: 'text', text: JSON.stringify({ error: 'Post target not found' }) }],
        };
      }

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(
              {
                id: target.id,
                canonicalContent: target.post.canonicalContent,
                contentOverride: target.contentOverride,
                status: target.status,
                publishAtUtc: target.publishAtUtc,
                timezone: target.timezone,
                attemptCount: target.attemptCount,
                providerPostId: target.providerPostId,
                publishedAt: target.publishedAt,
                socialAccount: {
                  provider: target.socialAccount.provider,
                  displayName: target.socialAccount.displayName,
                },
                attempts: target.attempts,
              },
              null,
              2
            ),
          },
        ],
      };
    }
  );

  // 6. social_update_schedule
  server.tool(
    'social_update_schedule',
    'Reschedule an existing post target to a new date and time.',
    {
      targetId: z.string().describe('The post target ID'),
      newPublishAtUtc: z.string().describe('New publication time in ISO 8601 UTC format'),
      timezone: z.string().optional().describe('Updated timezone string (optional)'),
    },
    async (args) => {
      const updated = await ScheduleService.rescheduleTarget(
        args.targetId,
        new Date(args.newPublishAtUtc),
        args.timezone
      );

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(
              {
                message: 'Target successfully rescheduled.',
                id: updated.id,
                newPublishAtUtc: updated.publishAtUtc,
                timezone: updated.timezone,
                status: updated.status,
              },
              null,
              2
            ),
          },
        ],
      };
    }
  );

  // 7. social_cancel_schedule
  server.tool(
    'social_cancel_schedule',
    'Cancel an upcoming scheduled publication.',
    {
      targetId: z.string().describe('The post target ID to cancel'),
    },
    async (args) => {
      const canceled = await ScheduleService.cancelSchedule(args.targetId);
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(
              {
                message: 'Post target canceled.',
                id: canceled.id,
                status: canceled.status,
              },
              null,
              2
            ),
          },
        ],
      };
    }
  );

  // 8. social_publish_now
  server.tool(
    'social_publish_now',
    'Immediately enqueue an existing scheduled target for immediate worker execution.',
    {
      targetId: z.string().describe('The post target ID to publish immediately'),
    },
    async (args) => {
      const target = await ScheduleService.publishNow(args.targetId);
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(
              {
                message: 'Post target marked due immediately. The local worker will claim and publish it now.',
                id: target.id,
                status: target.status,
                publishAtUtc: target.publishAtUtc,
              },
              null,
              2
            ),
          },
        ],
      };
    }
  );

  // 9. social_get_publish_status
  server.tool(
    'social_get_publish_status',
    'Inspect the latest publication status and safe error logs for a post target.',
    {
      targetId: z.string().describe('The post target ID to inspect'),
    },
    async (args) => {
      const target = await ScheduleService.getTargetDetails(args.targetId);
      if (!target) {
        return {
          content: [{ type: 'text', text: JSON.stringify({ error: 'Post target not found' }) }],
        };
      }

      const latestAttempt = target.attempts[0];

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(
              {
                id: target.id,
                status: target.status,
                publishedAt: target.publishedAt,
                providerPostId: target.providerPostId,
                totalAttempts: target.attemptCount,
                latestAttempt: latestAttempt
                  ? {
                      outcome: latestAttempt.outcome,
                      startedAt: latestAttempt.startedAt,
                      errorCode: latestAttempt.errorCode,
                      errorMessageSafe: latestAttempt.errorMessageSafe,
                    }
                  : null,
              },
              null,
              2
            ),
          },
        ],
      };
    }
  );

  // -------------------------------------------------------------
  // Publishing Diagnostics & Errors
  // -------------------------------------------------------------
  server.tool(
    'social_get_publish_errors',
    'List recent failed delivery attempts with error categorization and recovery hints.',
    {
      limit: z.number().int().positive().default(10).describe('Max errors to return'),
    },
    async (args) => {
      const errors = await ScheduleService.getPublishErrors(args.limit);
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(
              errors.map((e) => ({
                id: e.id,
                targetId: e.postTargetId,
                startedAt: e.startedAt,
                finishedAt: e.finishedAt,
                errorCode: e.errorCode,
                errorMessageSafe: e.errorMessageSafe,
                provider: e.postTarget.socialAccount.provider,
                displayName: e.postTarget.socialAccount.displayName,
                content: e.postTarget.post.canonicalContent,
              })),
              null,
              2
            ),
          },
        ],
      };
    }
  );

  // -------------------------------------------------------------
  // System Diagnostics & Config Export
  // -------------------------------------------------------------
  server.tool(
    'mcp_list_tools',
    'Return full tool catalog with parameter schemas, descriptions, and mutation classifications.',
    {},
    async () => {
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(
              {
                totalTools: MCP_TOOLS_CATALOG.length,
                tools: MCP_TOOLS_CATALOG,
              },
              null,
              2
            ),
          },
        ],
      };
    }
  );

  server.tool(
    'mcp_get_connector_status',
    'Check database connectivity, account counts, queue counts, and worker health.',
    {},
    async () => {
      const [accountCount, scheduledCount, publishedCount] = await Promise.all([
        prisma.socialAccount.count(),
        prisma.postTarget.count({ where: { status: 'scheduled' } }),
        prisma.postTarget.count({ where: { status: 'published' } }),
      ]);

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(
              {
                status: 'online',
                mcpVersion: '0.1.0',
                database: 'connected',
                channelsConnected: accountCount,
                queue: {
                  scheduled: scheduledCount,
                  published: publishedCount,
                },
                workerMode: 'local-daemon',
                uptimeSeconds: process.uptime(),
              },
              null,
              2
            ),
          },
        ],
      };
    }
  );

  server.tool(
    'mcp_test_connection',
    'Test handshake ping to verify MCP server connectivity.',
    {
      echo: z.string().optional().describe('Optional string to echo back'),
    },
    async (args) => {
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(
              {
                handshake: 'pong',
                echo: args.echo || 'Handshake successful',
                timestamp: new Date().toISOString(),
                protocol: 'model-context-protocol/v1',
              },
              null,
              2
            ),
          },
        ],
      };
    }
  );

  server.tool(
    'mcp_export_config',
    'Generate ready-to-use configuration blocks for supported MCP clients.',
    {
      client: z
        .enum(['claude-desktop', 'claude-code', 'cursor', 'antigravity', 'cline', 'windsurf', 'codex', 'generic'])
        .default('claude-desktop')
        .describe('The client to generate config for'),
    },
    async (args) => {
      const configBlock = generateClientConfig(args.client);
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(configBlock, null, 2),
          },
        ],
      };
    }
  );

  return server;
}

export async function runStdioServer() {
  const server = createMcpServer();
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('[MCP] Open Social Scheduler MCP server running on stdio.');
}
