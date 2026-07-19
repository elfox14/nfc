/** @jest-environment node */
const express = require('express');
const request = require('supertest');
const createObservabilityRouter = require('../routes/observability.routes');

function createApp(collection) {
  const app = express();
  app.use('/api/observability', createObservabilityRouter({
    getDb: () => collection ? { collection: () => collection } : null
  }));
  return app;
}

describe('privacy-safe observability ingestion', () => {
  test('aggregates only allowlisted events without user or design identifiers', async () => {
    const collection = { bulkWrite: jest.fn(async () => ({ ok: 1 })) };
    const response = await request(createApp(collection)).post('/api/observability').send({ entries: [
      { kind: 'event', name: 'save_succeeded', page: 'editor', device: 'mobile', release: '2026.07.20-v12', email: 'private@example.com', designId: 'secret' },
      { kind: 'metric', name: 'lcp', value: 2345, page: 'editor', device: 'mobile', release: '2026.07.20-v12' }
    ] });

    expect(response.status).toBe(202);
    expect(response.body.accepted).toBe(2);
    const operations = collection.bulkWrite.mock.calls[0][0];
    expect(JSON.stringify(operations)).not.toContain('private@example.com');
    expect(JSON.stringify(operations)).not.toContain('secret');
    expect(operations[1].updateOne.update.$inc).toMatchObject({ count: 1, valueSum: 2345, valueCount: 1 });
  });

  test('rejects unknown events and invalid batches', async () => {
    const collection = { bulkWrite: jest.fn() };
    const response = await request(createApp(collection)).post('/api/observability').send({
      kind: 'event', name: 'user_email_collected', email: 'private@example.com'
    });
    expect(response.status).toBe(400);
    expect(collection.bulkWrite).not.toHaveBeenCalled();
  });

  test('returns unavailable without a database instead of buffering personal payloads', async () => {
    const response = await request(createApp(null)).post('/api/observability').send({ kind: 'event', name: 'page_view' });
    expect(response.status).toBe(503);
  });
});
