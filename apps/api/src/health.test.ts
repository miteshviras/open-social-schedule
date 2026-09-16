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
});
