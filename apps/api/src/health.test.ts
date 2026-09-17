import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { buildApp } from './index.js';

describe('API Server & Health Checks', () => {
  process.env.DATABASE_URL = 'file:./dev.db';
  process.env.ENCRYPTION_SECRET = 'test-secret-key-32-chars-length!';

  it('GET /api/health should return ok with database connectivity status', async () => {
    const app = await buildApp();
    const response = await app.inject({
      method: 'GET',
      url: '/api/health',
    });

    assert.equal(response.statusCode, 200);
    const body = JSON.parse(response.payload);
    assert.equal(body.status, 'ok');
    assert.equal(body.database, 'connected');
    assert.ok(body.timestamp);
    await app.close();
  });

  it('GET /api/auth/mock/url should return a valid authorization URL', async () => {
    const app = await buildApp();
    const response = await app.inject({
      method: 'GET',
      url: '/api/auth/mock/url',
    });

    assert.equal(response.statusCode, 200);
    const body = JSON.parse(response.payload);
    assert.ok(body.url.includes('/api/auth/mock/callback'));
    assert.ok(body.state);
    assert.equal(body.provider, 'mock');
    await app.close();
  });

  it('GET /api/auth/unknown/url should return 400 bad request', async () => {
    const app = await buildApp();
    const response = await app.inject({
      method: 'GET',
      url: '/api/auth/unknown/url',
    });

    assert.equal(response.statusCode, 400);
    await app.close();
  });

  it('GET /api/auth/x/url should return valid OAuth 2.0 PKCE URL with challenge and default scopes', async () => {
    const app = await buildApp();
    const response = await app.inject({
      method: 'GET',
      url: '/api/auth/x/url',
    });

    assert.equal(response.statusCode, 200);
    const body = JSON.parse(response.payload);
    assert.equal(body.provider, 'x');
    assert.equal(body.codeChallenge, true);
    assert.ok(body.url.startsWith('https://twitter.com/i/oauth2/authorize'));
    assert.ok(body.url.includes('code_challenge_method=S256'));
    assert.ok(body.url.includes('code_challenge='));
    assert.ok(body.url.includes('tweet.read'));
    assert.ok(body.url.includes('tweet.write'));
    assert.ok(body.url.includes('users.read'));
    assert.ok(body.url.includes('offline.access'));
    await app.close();
  });
});
