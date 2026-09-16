import { describe, it, after } from 'node:test';
import assert from 'node:assert/strict';
import { buildApp } from './index.js';

describe('API Server & Health Checks', () => {
  it('GET /api/health should return ok with database connectivity status', async () => {
    process.env.DATABASE_URL = 'file:./dev.db';
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
});
