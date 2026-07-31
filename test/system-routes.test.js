/**
 * @jest-environment node
 */
const { TextDecoder, TextEncoder } = require('util');

global.TextDecoder = global.TextDecoder || TextDecoder;
global.TextEncoder = global.TextEncoder || TextEncoder;

const express = require('express');
const request = require('supertest');
const createSystemRouter = require('../routes/system.routes');

function createApp({ db = null, isMobile = false } = {}) {
  const app = express();
  app.use((req, res, next) => {
    req.useragent = { isMobile };
    next();
  });
  app.use(createSystemRouter({ getDb: () => db, rootDir: process.cwd() }));
  return app;
}

describe('System routes', () => {
  it('reports health and database connection state', async () => {
    const db = { command: jest.fn().mockResolvedValue({ ok: 1 }) };
    const res = await request(createApp({ db })).get('/healthz');

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
    expect(res.body.database).toBe('connected');
    expect(res.body.timestamp).toBeDefined();
    expect(db.command).toHaveBeenCalledWith({ ping: 1 });
  });

  it('returns 503 when the database has not connected', async () => {
    const res = await request(createApp()).get('/api/health');

    expect(res.status).toBe(503);
    expect(res.body.status).toBe('unavailable');
    expect(res.body.database).toBe('disconnected');
  });

  it('returns 503 when the database ping fails', async () => {
    const db = { command: jest.fn().mockRejectedValue(new Error('connection lost')) };
    const res = await request(createApp({ db })).get('/healthz');

    expect(res.status).toBe(503);
    expect(res.body.status).toBe('unavailable');
    expect(res.body.database).toBe('disconnected');
  });

  it('serves the desktop editor when mobile editor is unavailable', async () => {
    const res = await request(createApp({ isMobile: true })).get('/nfc/editor');

    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toMatch(/html/);
  });
});
