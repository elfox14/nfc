/**
 * @jest-environment node
 */

'use strict';

const request = require('supertest');
const jwt = require('jsonwebtoken');

const mockCollection = {
  findOne: jest.fn(),
  createIndex: jest.fn()
};
const mockDb = {
  collection: jest.fn(() => mockCollection),
  command: jest.fn(() => Promise.resolve({ ok: 1 }))
};
const mockClient = { db: jest.fn(() => mockDb) };

jest.mock('mongodb', () => ({
  MongoClient: { connect: jest.fn().mockResolvedValue(mockClient) }
}));

process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'collaboration-test-secret-at-least-thirty-two-characters';
process.env.MONGO_URI = 'mongodb://fake-uri';

const app = require('../server');

describe('secure collaboration invitation exchange', () => {
  const ownerToken = jwt.sign(
    { userId: 'owner-1', email: 'owner@example.com', type: 'access' },
    process.env.JWT_SECRET
  );
  const editorToken = jwt.sign(
    { userId: 'editor-1', email: 'editor@example.com', type: 'access' },
    process.env.JWT_SECRET
  );

  beforeEach(() => {
    jest.clearAllMocks();
    mockCollection.findOne.mockReset();
  });

  test('only the design owner can create a random room invitation', async () => {
    mockCollection.findOne.mockResolvedValueOnce({ shortId: 'card-1', ownerId: 'owner-1' });

    const response = await request(app)
      .post('/api/auth/collaboration-invite')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ designId: 'card-1' });

    expect(response.status).toBe(201);
    expect(response.body.collabId).toMatch(/^[A-Za-z0-9_-]{32}$/);
    const invite = jwt.verify(response.body.invite, process.env.JWT_SECRET);
    expect(invite).toMatchObject({
      type: 'collab-invite',
      collabId: response.body.collabId,
      designId: 'card-1',
      ownerId: 'owner-1',
      role: 'editor'
    });
    expect(mockCollection.findOne).toHaveBeenCalledWith({ shortId: 'card-1', ownerId: 'owner-1' });
  });

  test('exchanges a valid invitation for a room-bound editor token', async () => {
    const collabId = 'a'.repeat(32);
    const invite = jwt.sign({
      type: 'collab-invite', collabId, designId: 'card-1', ownerId: 'owner-1', role: 'editor'
    }, process.env.JWT_SECRET, { expiresIn: '1h' });
    mockCollection.findOne.mockResolvedValueOnce({ shortId: 'card-1', ownerId: 'owner-1' });

    const response = await request(app)
      .post('/api/auth/ws-token')
      .set('Authorization', `Bearer ${editorToken}`)
      .send({ collabId, invite });

    expect(response.status).toBe(200);
    const wsToken = jwt.verify(response.body.token, process.env.JWT_SECRET);
    expect(wsToken).toMatchObject({
      type: 'ws',
      userId: 'editor-1',
      collabId,
      designId: 'card-1',
      ownerId: 'owner-1',
      role: 'editor'
    });
  });

  test('rejects generic or mismatched room credentials', async () => {
    const missingInvite = await request(app)
      .post('/api/auth/ws-token')
      .set('Authorization', `Bearer ${editorToken}`)
      .send({ collabId: 'a'.repeat(32) });
    expect(missingInvite.status).toBe(400);

    const invite = jwt.sign({
      type: 'collab-invite', collabId: 'a'.repeat(32), designId: 'card-1', ownerId: 'owner-1'
    }, process.env.JWT_SECRET, { expiresIn: '1h' });
    const mismatched = await request(app)
      .post('/api/auth/ws-token')
      .set('Authorization', `Bearer ${editorToken}`)
      .send({ collabId: 'b'.repeat(32), invite });
    expect(mismatched.status).toBe(401);
  });
});
