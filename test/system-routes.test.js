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
    const res = await request(createApp({ db: {} })).get('/healthz');

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
    expect(res.body.dbConnected).toBe(true);
    expect(res.body.timestamp).toBeDefined();
  });

  it('reports API health', async () => {
    const res = await request(createApp()).get('/api/health');

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ status: 'ok' });
  });

  it('serves the desktop editor when mobile editor is unavailable', async () => {
    const res = await request(createApp({ isMobile: true })).get('/nfc/editor');

    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toMatch(/html/);
  });
});
