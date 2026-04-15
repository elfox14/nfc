/**
 * @jest-environment node
 */
const request = require('supertest');
const jwt = require('jsonwebtoken');

// Mock Redis
jest.mock('redis', () => ({
    createClient: jest.fn(() => ({
        on: jest.fn(), get: jest.fn(), setEx: jest.fn(), connect: jest.fn().mockResolvedValue(true),
        isReady: true, sendCommand: jest.fn()
    }))
}));

// Mock MongoDB
const mockCollection = {
    findOne: jest.fn(),
    updateOne: jest.fn(),
    insertOne: jest.fn()
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
process.env.JWT_SECRET = 'secret123';
process.env.MONGO_URI = 'mongodb://fake-uri';
process.env.PUBLIC_BASE_URL = 'http://localhost:3000';

const app = require('../server.js');

describe('PATCH /api/design/:id/element/:elementId', () => {
    let token;

    beforeEach(() => {
        jest.clearAllMocks();
        token = jwt.sign({ userId: 'user123' }, process.env.JWT_SECRET);
    });

    it('Should update element property using data.elements array fallback', async () => {
        // Setup mock to fail first structure match, but succeed on fallback
        mockCollection.updateOne
            .mockResolvedValueOnce({ matchedCount: 0 }) // First attempt fails
            .mockResolvedValueOnce({ matchedCount: 1 }); // Fallback attempt succeeds

        const res = await request(app)
            .patch('/api/design/design-1/element/elem-1')
            .set('Authorization', `Bearer ${token}`)
            .send({ position: { x: 50, y: 100 } });

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        // Verify updateOne was called with correct fallback syntax
        expect(mockCollection.updateOne).toHaveBeenCalledWith(
            { shortId: 'design-1', 'elements.id': 'elem-1', ownerId: 'user123' },
            { $set: { "elements.$.position": { x: 50, y: 100 } } }
        );
    });

    it('Should filter non-whitelisted properties', async () => {
        mockCollection.updateOne.mockResolvedValueOnce({ matchedCount: 1 });

        const res = await request(app)
            .patch('/api/design/design-2/element/elem-2')
            .set('Authorization', `Bearer ${token}`)
            .send({ position: { x: 10 }, maliciousKey: 'hack' });

        expect(res.status).toBe(200);
        expect(mockCollection.updateOne).toHaveBeenCalledWith(
            expect.any(Object),
            expect.objectContaining({
                $set: { "data.elements.$.position": { x: 10 } }
            })
        );
        // Ensure "maliciousKey" is not present in the $set object check implicitly as we matched exactly the expected valid keys above.
    });

    it('Should return 401 if unauthorized', async () => {
        const res = await request(app)
            .patch('/api/design/design-1/element/elem-1')
            .send({ position: { x: 50, y: 100 } });

        expect(res.status).toBe(401);
    });
});
