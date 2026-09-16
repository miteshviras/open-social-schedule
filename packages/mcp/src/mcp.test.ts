import { describe, it, before } from 'node:test';
import assert from 'node:assert/strict';
import { prisma } from '@open-social/database';
import { AccountService } from '@open-social/core';
import { createMcpServer } from './server.js';

describe('Model Context Protocol (MCP) Server', () => {
  process.env.DATABASE_URL = 'file:./dev.db';
  process.env.ENCRYPTION_SECRET = 'test-secret-key-32-chars-length!';

  let mockAccountId: string;

  before(async () => {
    // Ensure mock account exists
    const account = await AccountService.connectAccount({
      userId: 'default_local_user',
      provider: 'mock',
      providerAccountId: 'mock_mcp_account_1',
      displayName: 'MCP Testing Creator',
      accessToken: 'mcp_test_secret_tok',
    });
    mockAccountId = account.id;
  });

  it('should initialize the MCP server and register the 9 tools', () => {
    const server = createMcpServer();
    assert.ok(server);
    // Verify server has tools registered
    assert.ok((server as any)._registeredTools);
    const toolNames = Object.keys((server as any)._registeredTools);

    const expectedTools = [
      'social_list_accounts',
      'social_schedule_post',
      'social_schedule_bulk',
      'social_list_scheduled',
      'social_get_scheduled_post',
      'social_update_schedule',
      'social_cancel_schedule',
      'social_publish_now',
      'social_get_publish_status',
    ];

    for (const tool of expectedTools) {
      assert.ok(toolNames.includes(tool), `Expected MCP tool "${tool}" to be registered`);
    }
  });

  it('should execute social_list_accounts tool and omit sensitive tokens', async () => {
    const server = createMcpServer();
    const toolHandler = (server as any)._registeredTools['social_list_accounts'];
    assert.ok(toolHandler);

    const result = await toolHandler.handler({});
    assert.ok(result.content);
    assert.equal(result.content[0].type, 'text');

    const accounts = JSON.parse(result.content[0].text);
    assert.ok(Array.isArray(accounts));
    assert.ok(accounts.length > 0);

    const targetAccount = accounts.find((a: any) => a.id === mockAccountId);
    assert.ok(targetAccount);
    assert.equal(targetAccount.displayName, 'MCP Testing Creator');
    // Verify zero secrets leaked
    assert.equal(targetAccount.accessToken, undefined);
    assert.equal(targetAccount.encryptedAccessToken, undefined);
  });

  it('should execute social_schedule_post tool and return scheduled target', async () => {
    const server = createMcpServer();
    const toolHandler = (server as any)._registeredTools['social_schedule_post'];

    const result = await toolHandler.handler({
      content: 'Scheduled via MCP tool call!',
      accountIds: [mockAccountId],
      publishAtUtc: new Date(Date.now() + 3600_000).toISOString(),
      timezone: 'UTC',
    });

    const parsed = JSON.parse(result.content[0].text);
    assert.ok(parsed.postId);
    assert.equal(parsed.targetCount, 1);
    assert.equal(parsed.targets[0].status, 'scheduled');
  });
});
