import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';
import {
  AccountService,
  PostService,
  ScheduleService,
  TargetStatus,
} from '@open-social/core';

export function createMcpServer(): McpServer {
  const server = new McpServer({
    name: 'open-social-scheduler',
    version: '0.1.0',
  });

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

  return server;
}

export async function runStdioServer() {
  const server = createMcpServer();
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('[MCP] Open Social Scheduler MCP server running on stdio.');
}
