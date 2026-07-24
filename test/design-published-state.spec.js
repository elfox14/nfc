/**
 * @jest-environment node
 */

'use strict';

const request = require('supertest');
const jwt = require('jsonwebtoken');

const mockCollection = {
    findOne: jest.fn(),
    insertOne: jest.fn(),
    updateOne: jest.fn(),
    deleteOne: jest.fn(),
    createIndex: jest.fn(),
    countDocuments: jest.fn()
};

const mockDb = {
    collection: jest.fn(() => mockCollection),
    command: jest.fn(() => Promise.resolve({ ok: 1 }))
};

const mockClient = {
    db: jest.fn(() => mockDb)
};

jest.mock('mongodb', () => ({
    MongoClient: { connect: jest.fn().mockResolvedValue(mockClient) }
}));

process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'published-state-test-secret';
process.env.MONGO_URI = 'mongodb://fake-uri';
process.env.PUBLIC_BASE_URL = 'http://localhost:3000';

const app = require('../server.js');

describe('Published card revision persistence', () => {
    let token;

    beforeEach(() => {
        jest.clearAllMocks();
        token = jwt.sign({ userId: 'owner-1', type: 'access' }, process.env.JWT_SECRET);
    });

    test('draft-only saves preserve captured faces and their published state', async () => {
        const publishedState = {
            inputs: { 'logo-size': '80' },
            positions: { 'card-logo': { x: 10, y: 20 } }
        };
        const existingDoc = {
            ownerId: 'owner-1',
            data: {
                publishedAt: '2026-07-24T12:00:00.000Z',
                publishedState,
                imageUrls: {
                    capturedFront: 'https://uploads.example/front.webp',
                    capturedBack: 'https://uploads.example/back.webp'
                }
            }
        };

        mockCollection.findOne
            .mockResolvedValueOnce({ userId: 'owner-1', isVerified: true })
            .mockResolvedValueOnce(existingDoc)
            .mockResolvedValueOnce(existingDoc);
        mockCollection.updateOne.mockResolvedValueOnce({ matchedCount: 1 });

        const response = await request(app)
            .post('/api/save-design?id=card-1')
            .set('Authorization', `Bearer ${token}`)
            .send({
                inputs: { 'logo-size': '10' },
                imageUrls: {}
            });

        expect(response.status).toBe(200);
        const savedData = mockCollection.updateOne.mock.calls[0][1].$set.data;
        expect(savedData.publishedState).toEqual(publishedState);
        expect(savedData.publishedAt).toBe('2026-07-24T12:00:00.000Z');
        expect(savedData.imageUrls).toEqual(existingDoc.data.imageUrls);
    });

    test('fresh published snapshots are sanitized and cannot nest recursively', async () => {
        mockCollection.findOne
            .mockResolvedValueOnce({ userId: 'owner-1', isVerified: true })
            .mockResolvedValueOnce(null);
        mockCollection.insertOne.mockResolvedValueOnce({ insertedId: 'db-id' });

        const response = await request(app)
            .post('/api/save-design')
            .set('Authorization', `Bearer ${token}`)
            .send({
                inputs: { 'input-name_ar': 'بطاقة سليمة' },
                publishedState: {
                    inputs: { 'input-name_ar': '<script>alert(1)</script>بطاقة' },
                    publishedState: { inputs: { 'logo-size': '999' } },
                    publishedAt: 'nested'
                },
                publishedAt: '2026-07-24T14:00:00.000Z'
            });

        expect(response.status).toBe(200);
        const insertedData = mockCollection.insertOne.mock.calls[0][0].data;
        expect(insertedData.publishedState.publishedState).toBeUndefined();
        expect(insertedData.publishedState.publishedAt).toBeUndefined();
        expect(insertedData.publishedState.inputs['input-name_ar']).not.toContain('<script>');
    });
});
