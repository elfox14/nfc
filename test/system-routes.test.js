/**
 * @jest-environment node
 */
const { TextDecoder, TextEncoder } = require('util');
const fs = require('fs');
const os = require('os');
const path = require('path');

global.TextDecoder = global.TextDecoder || TextDecoder;
global.TextEncoder = global.TextEncoder || TextEncoder;

const express = require('express');
const request = require('supertest');
const createSystemRouter = require('../routes/system.routes');

function createApp({ db = null, isMobile = false, rootDir = process.cwd() } = {}) {
  const app = express();
  app.use((req, res, next) => {
    req.useragent = { isMobile };
    next();
  });
  app.use(createSystemRouter({ getDb: () => db, rootDir }));
  return app;
}

function createWritableRoot() {
  const rootDir = fs.mkdtempSync(path.join(os.tmpdir(), 'mcprime-health-'));
  fs.mkdirSync(path.join(rootDir, 'uploads'));
  return rootDir;
}

describe('System routes', () => {
  it('reports process health, release metadata and database connection state', async () => {
    const res = await request(createApp({ db: {} })).get('/healthz');

    expect(res.status).toBe(200);
    expect(['ok', 'degraded']).toContain(res.body.status);
    expect(res.body.dbConnected).toBe(true);
    expect(res.body.timestamp).toBeDefined();
    expect(res.body.version).toBeDefined();
    expect(res.body.release).toBeDefined();
    expect(res.body.checks.server.status).toBe('ready');
    expect(res.headers['cache-control']).toContain('no-store');
  });

  it('reports API liveness without exposing infrastructure details', async () => {
    const res = await request(createApp()).get('/api/health');

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ status: 'ok' });
    expect(res.body.version).toBeDefined();
    expect(res.body.release).toBeDefined();
    expect(res.body.uptimeSeconds).toEqual(expect.any(Number));
  });

  it('returns ready when database and upload storage pass their probes', async () => {
    const rootDir = createWritableRoot();
    const db = { command: jest.fn(async () => ({ ok: 1 })) };

    const res = await request(createApp({ db, rootDir })).get('/readyz');

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
    expect(res.body.checks.database.status).toBe('ready');
    expect(res.body.checks.database.latencyMs).toEqual(expect.any(Number));
    expect(res.body.checks.storage).toMatchObject({ status: 'ready', writable: true });
    expect(db.command).toHaveBeenCalledWith({ ping: 1 });
    fs.rmSync(rootDir, { recursive: true, force: true });
  });

  it('returns unavailable readiness when the database is disconnected', async () => {
    const rootDir = createWritableRoot();

    const res = await request(createApp({ db: null, rootDir })).get('/readyz');

    expect(res.status).toBe(503);
    expect(res.body.status).toBe('degraded');
    expect(res.body.checks.database.status).toBe('disconnected');
    fs.rmSync(rootDir, { recursive: true, force: true });
  });

  it('serves the desktop editor when mobile editor is unavailable', async () => {
    const res = await request(createApp({ isMobile: true })).get('/nfc/editor');

    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toMatch(/html/);
  });
});
