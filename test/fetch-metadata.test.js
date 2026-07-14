/**
 * @jest-environment node
 */
const { TextDecoder, TextEncoder } = require('util');

global.TextDecoder = global.TextDecoder || TextDecoder;
global.TextEncoder = global.TextEncoder || TextEncoder;

const express = require('express');
const request = require('supertest');
const { applyFetchMetadataProtection } = require('../utils/fetch-metadata');

function createApp() {
  const app = express();
  app.use(express.json());
  applyFetchMetadataProtection(app);
  app.post('/api/mutate', (req, res) => res.json({ ok: true }));
  app.get('/api/read', (req, res) => res.json({ ok: true }));
  return app;
}

describe('Fetch Metadata protection', () => {
  it('blocks cross-site state-changing requests', async () => {
    const res = await request(createApp())
      .post('/api/mutate')
      .set('Sec-Fetch-Site', 'cross-site')
      .send({ value: 'x' });

    expect(res.status).toBe(403);
  });

  it('allows same-origin state-changing requests', async () => {
    const res = await request(createApp())
      .post('/api/mutate')
      .set('Sec-Fetch-Site', 'same-origin')
      .send({ value: 'x' });

    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
  });

  it('allows requests without Fetch Metadata headers for compatibility', async () => {
    const res = await request(createApp())
      .post('/api/mutate')
      .send({ value: 'x' });

    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
  });

  it('allows cross-site safe reads', async () => {
    const res = await request(createApp())
      .get('/api/read')
      .set('Sec-Fetch-Site', 'cross-site');

    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
  });
});
