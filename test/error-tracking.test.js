/**
 * @jest-environment node
 */
const express = require('express');
const request = require('supertest');
const {
  errorBuffer,
  registerClientErrorRoute,
  redactSensitiveData
} = require('../utils/error-tracking');

describe('client error tracking', () => {
  beforeEach(() => {
    errorBuffer.length = 0;
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    console.error.mockRestore();
  });

  it('stores editor release and operation context for production failures', async () => {
    const app = express();
    registerClientErrorRoute(app);

    const response = await request(app).post('/api/client-error').send({
      message: 'Cloud save failed',
      source: 'editor-production-guard',
      stack: 'Error: Cloud save failed\n at save',
      url: 'https://mcprim.com/nfc/editor.html?id=card-1',
      release: '2026.07.18-phase7.1',
      context: 'cloud-save:fetch',
      userAgent: 'Playwright',
      timestamp: '2026-07-18T00:00:00.000Z'
    });

    expect(response.status).toBe(204);
    expect(errorBuffer).toHaveLength(1);
    expect(errorBuffer[0]).toMatchObject({
      route: 'CLIENT',
      source: 'editor-production-guard',
      release: '2026.07.18-phase7.1',
      clientContext: 'cloud-save:fetch',
      userAgent: 'Playwright',
      clientTimestamp: '2026-07-18T00:00:00.000Z'
    });
  });

  it('redacts sensitive nested client context', () => {
    expect(redactSensitiveData({ token: 'secret-value', nested: { email: 'person@example.com' } }))
      .toEqual({ token: '[redacted]', nested: { email: '[redacted]' } });
  });
});
