/**
 * @jest-environment node
 */
const express = require('express');
const cookieParser = require('cookie-parser');
const request = require('supertest');
const {
  registerCsrfProtection,
  CSRF_COOKIE_NAME,
  CSRF_HEADER_NAME
} = require('../utils/csrf-protection');

const TEST_COOKIE_SECRET = 'test-cookie-secret-with-at-least-thirty-two-characters';

function createApp() {
  const app = express();
  app.use(express.json());
  app.use(cookieParser(TEST_COOKIE_SECRET));
  registerCsrfProtection(app, TEST_COOKIE_SECRET);
  app.get('/api/read', (req, res) => res.json({ ok: true }));
  app.post('/api/mutate', (req, res) => res.json({ ok: true }));
  app.post('/api/track-event', (req, res) => res.json({ ok: true }));
  app.post('/api/client-error', (req, res) => res.json({ ok: true }));
  return app;
}

function cookieHeader(response) {
  return response.headers['set-cookie'][0].split(';')[0];
}

describe('CSRF token protection', () => {
  it('issues a signed, HttpOnly token cookie without caching the response', async () => {
    const response = await request(createApp()).get('/api/csrf-token');

    expect(response.status).toBe(200);
    expect(response.body.csrfToken).toMatch(/^\d+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/);
    expect(response.headers['cache-control']).toBe('no-store');
    expect(response.headers['set-cookie'][0]).toContain(`${CSRF_COOKIE_NAME}=s%3A`);
    expect(response.headers['set-cookie'][0]).toContain('HttpOnly');
  });

  it('accepts a state-changing request only when the signed cookie matches the header', async () => {
    const app = createApp();
    const tokenResponse = await request(app).get('/api/csrf-token');

    const response = await request(app)
      .post('/api/mutate')
      .set('Cookie', cookieHeader(tokenResponse))
      .set(CSRF_HEADER_NAME, tokenResponse.body.csrfToken)
      .send({ value: 'safe' });

    expect(response.status).toBe(200);
    expect(response.body.ok).toBe(true);
  });

  it('accepts the signed header without a cookie for third-party-cookie-blocked browsers', async () => {
    const app = createApp();
    const tokenResponse = await request(app).get('/api/csrf-token');

    const response = await request(app)
      .post('/api/mutate')
      .set(CSRF_HEADER_NAME, tokenResponse.body.csrfToken)
      .send({ value: 'bearer-fallback' });

    expect(response.status).toBe(200);
  });

  it.each([
    ['a missing token', null, null],
    ['an unsigned cookie', 'csrfToken=attacker-token', 'attacker-token'],
    ['a mismatched header', 'SIGNED_COOKIE', 'wrong-token']
  ])('rejects %s', async (_label, suppliedCookie, suppliedHeader) => {
    const app = createApp();
    const tokenResponse = await request(app).get('/api/csrf-token');
    const req = request(app).post('/api/mutate').send({ value: 'blocked' });

    if (suppliedCookie === 'SIGNED_COOKIE') {
      req.set('Cookie', cookieHeader(tokenResponse));
    } else if (suppliedCookie) {
      req.set('Cookie', suppliedCookie);
    }
    if (suppliedHeader) req.set(CSRF_HEADER_NAME, suppliedHeader);

    const response = await req;
    expect(response.status).toBe(403);
    expect(response.body.code).toBe('INVALID_CSRF_TOKEN');
  });

  it('allows safe reads and non-state-changing telemetry without a token', async () => {
    const app = createApp();
    const [read, analytics, report] = await Promise.all([
      request(app).get('/api/read'),
      request(app).post('/api/track-event'),
      request(app).post('/api/client-error')
    ]);

    expect([read.status, analytics.status, report.status]).toEqual([200, 200, 200]);
  });
});
