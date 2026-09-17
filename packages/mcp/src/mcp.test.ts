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

  it('should initialize the MCP server and register all 23 tools', () => {
    const server = createMcpServer();
    assert.ok(server);
    // Verify server has tools registered
    assert.ok((server as any)._registeredTools);
    const toolNames = Object.keys((server as any)._registeredTools);

    const expectedTools = [
      'social_generate_content',
      'social_create_post',
      'social_get_post',
      'social_list_posts',
      'social_update_post',
      'social_delete_post',
      'social_list_accounts',
      'social_connect_account',
      'social_disconnect_account',
      'social_refresh_account',
      'social_schedule_post',
      'social_schedule_bulk',
      'social_list_scheduled',
      'social_get_scheduled_post',
      'social_update_schedule',
      'social_cancel_schedule',
      'social_publish_now',
      'social_get_publish_status',
      'social_get_publish_errors',
      'mcp_list_tools',
      'mcp_get_connector_status',
      'mcp_test_connection',
      'mcp_export_config',
    ];

    for (const tool of expectedTools) {
      assert.ok(toolNames.includes(tool), `Expected MCP tool "${tool}" to be registered`);
    }
  });

  it('should execute social_generate_content tool and generate platform variations', async () => {
    const server = createMcpServer();
    const toolHandler = (server as any)._registeredTools['social_generate_content'];
    assert.ok(toolHandler);

    const result = await toolHandler.handler({
      topic: 'Launch of Open Social Scheduler MCP support',
      tone: 'thought-leadership',
      platforms: ['linkedin', 'x'],
      keyPoints: ['Local data privacy', 'Direct MCP interface for Claude and Cursor'],
      callToAction: 'Star our repo on GitHub!',
    });

    assert.ok(result.content);
    const generated = JSON.parse(result.content[0].text);
    assert.ok(generated.canonicalContent);
    assert.ok(generated.variations.linkedin.includes('LinkedIn') || generated.variations.linkedin.length > 50);
    assert.ok(generated.variations.x.length <= 280);
    assert.ok(generated.suggestedHashtags.length > 0);
  });

  it('should execute social_create_post tool and return created targets', async () => {
    const server = createMcpServer();
    const toolHandler = (server as any)._registeredTools['social_create_post'];
    assert.ok(toolHandler);

    const result = await toolHandler.handler({
      content: 'Direct post created from AI MCP agent!',
      accountIds: [mockAccountId],
      publishNow: false,
      publishAtUtc: new Date(Date.now() + 7200_000).toISOString(),
      timezone: 'UTC',
    });

    const parsed = JSON.parse(result.content[0].text);
    assert.ok(parsed.postId);
    assert.equal(parsed.targetCount, 1);
    assert.equal(parsed.targets[0].status, 'scheduled');
  });

  it('should execute social_connect_account tool for mock provider', async () => {
    const server = createMcpServer();
    const toolHandler = (server as any)._registeredTools['social_connect_account'];
    assert.ok(toolHandler);

    const result = await toolHandler.handler({
      provider: 'mock',
      displayName: 'Automated AI Tester Channel',
      username: 'ai_tester',
    });

    const parsed = JSON.parse(result.content[0].text);
    assert.ok(parsed.account);
    assert.equal(parsed.account.provider, 'mock');
    assert.equal(parsed.account.displayName, 'Automated AI Tester Channel');
  });

  it('should execute mcp_list_tools and return catalog', async () => {
    const server = createMcpServer();
    const toolHandler = (server as any)._registeredTools['mcp_list_tools'];
    assert.ok(toolHandler);

    const result = await toolHandler.handler({});
    const parsed = JSON.parse(result.content[0].text);
    assert.ok(parsed.totalTools >= 20);
    assert.ok(Array.isArray(parsed.tools));
  });

  it('should execute mcp_export_config for claude-desktop', async () => {
    const server = createMcpServer();
    const toolHandler = (server as any)._registeredTools['mcp_export_config'];
    assert.ok(toolHandler);

    const result = await toolHandler.handler({ client: 'claude-desktop' });
    const parsed = JSON.parse(result.content[0].text);
    assert.equal(parsed.client, 'claude-desktop');
    assert.ok(parsed.config.mcpServers['open-social-scheduler']);
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
