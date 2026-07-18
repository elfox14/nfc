/** @jest-environment node */
'use strict';

const express = require('express');
const jwt = require('jsonwebtoken');
const request = require('supertest');
const createGuard = require('../routes/workspace-publication-guard.routes');

function createApp({ design, workspace }) {
  const db = {
    collection(name) {
      if (name === 'designs') return { findOne: jest.fn(async () => design) };
      if (name === 'workspaces') return { findOne: jest.fn(async () => workspace) };
      throw new Error(`Unexpected collection: ${name}`);
    }
  };
  const app = express();
  app.use(createGuard({
    getDb: () => db,
    designsCollectionName: 'designs',
    workspacesCollectionName: 'workspaces'
  }));
  app.get('/nfc/viewer.html', (req, res) => res.status(200).send('viewer'));
  return app;
}

describe('workspace publication guard', () => {
  const originalSecret = process.env.JWT_SECRET;

  beforeAll(() => { process.env.JWT_SECRET = 'workspace-test-secret-with-enough-length'; });
  afterAll(() => {
    if (originalSecret === undefined) delete process.env.JWT_SECRET;
    else process.env.JWT_SECRET = originalSecret;
  });

  test('hides an unpublished workspace design from anonymous visitors', async () => {
    const app = createApp({
      design: { shortId: 'card-123', ownerId: 'owner-1', workspaceId: 'workspace-1', workflow: { enabled: true, status: 'in_review' } },
      workspace: { workspaceId: 'workspace-1', ownerId: 'owner-1', members: [] }
    });

    const response = await request(app).get('/nfc/viewer.html?id=card-123');
    expect(response.status).toBe(404);
    expect(response.headers['x-robots-tag']).toBe('noindex, noarchive');
  });

  test('allows a published design to continue to the viewer', async () => {
    const app = createApp({
      design: { shortId: 'card-123', ownerId: 'owner-1', workspaceId: 'workspace-1', workflow: { enabled: true, status: 'published' } },
      workspace: null
    });

    const response = await request(app).get('/nfc/viewer.html?id=card-123');
    expect(response.status).toBe(200);
    expect(response.text).toBe('viewer');
  });

  test('allows an authenticated workspace reviewer to preview before publication', async () => {
    const app = createApp({
      design: { shortId: 'card-123', ownerId: 'owner-1', workspaceId: 'workspace-1', workflow: { enabled: true, status: 'approved' } },
      workspace: {
        workspaceId: 'workspace-1',
        ownerId: 'owner-1',
        members: [{ userId: 'reviewer-1', role: 'reviewer' }]
      }
    });
    const token = jwt.sign({ userId: 'reviewer-1', email: 'reviewer@example.com', type: 'access' }, process.env.JWT_SECRET);

    const response = await request(app)
      .get('/nfc/viewer.html?id=card-123')
      .set('Authorization', `Bearer ${token}`);

    expect(response.status).toBe(200);
    expect(response.headers['x-robots-tag']).toBe('noindex, noarchive');
  });
});
