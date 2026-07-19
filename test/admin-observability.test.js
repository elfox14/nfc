/** @jest-environment node */
const crypto = require('crypto');
const express = require('express');
const request = require('supertest');
const createAdminRouter = require('../routes/admin.routes');

describe('admin observability summary', () => {
  test('requires admin authentication and returns aggregated operational metrics', async () => {
    const rows = [
      { kind: 'event', name: 'save_succeeded', release: 'phase12', count: 3 },
      { kind: 'metric', name: 'lcp', release: 'phase12', count: 2, valueCount: 2, valueSum: 4000, valueMax: 2500 }
    ];
    const cursor = { sort: jest.fn().mockReturnThis(), limit: jest.fn().mockReturnThis(), toArray: jest.fn(async () => rows) };
    const collection = { find: jest.fn(() => cursor) };
    const app = express();
    app.use('/api/admin', createAdminRouter({
      getDb: () => ({ collection: () => collection }),
      errorBuffer: [],
      MAX_ERROR_BUFFER: 100
    }));
    process.env.ADMIN_TOKEN_SHA256 = crypto.createHash('sha256').update('admin-test-token').digest('hex');
    delete process.env.ADMIN_TOKENH;

    const unauthorized = await request(app).get('/api/admin/observability');
    expect(unauthorized.status).toBe(401);

    const response = await request(app).get('/api/admin/observability?hours=24').set('x-admin-token', 'admin-test-token');
    expect(response.status).toBe(200);
    expect(response.headers['cache-control']).toBe('no-store');
    expect(response.body.events.save_succeeded).toBe(3);
    expect(response.body.metrics.lcp).toMatchObject({ count: 2, average: 2000, max: 2500 });
    expect(response.body.releases.phase12).toBe(5);
  });
});
