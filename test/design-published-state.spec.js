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
        Object.values(mockCollection).forEach(mockFn => mockFn.mockReset());
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

    test('rejects attacker-controlled public design identifiers', async () => {
        const response = await request(app)
            .post('/api/save-design?id=..%2Fadmin%3Fx%3D1')
            .set('Authorization', `Bearer ${token}`)
            .send({ inputs: { 'input-name': 'Safe card' } });

        expect(response.status).toBe(400);
        expect(response.body.error).toBe('Invalid design ID format.');
        expect(mockCollection.insertOne).not.toHaveBeenCalled();
        expect(mockCollection.updateOne).not.toHaveBeenCalled();
    });

    test('first draft save protects the last captured revision for legacy cards', async () => {
        const existingDoc = {
            ownerId: 'owner-1',
            lastModified: new Date('2026-07-20T09:30:00.000Z'),
            data: {
                inputs: { 'logo-size': '80', 'input-name_ar': 'التصميم المحفوظ' },
                positions: { 'card-logo': { x: 10, y: 20 } },
                imageUrls: {
                    capturedFront: 'https://uploads.example/legacy-front.webp',
                    capturedBack: 'https://uploads.example/legacy-back.webp'
                }
            }
        };

        mockCollection.findOne
            .mockResolvedValueOnce({ userId: 'owner-1', isVerified: true })
            .mockResolvedValueOnce(existingDoc)
            .mockResolvedValueOnce(existingDoc);
        mockCollection.updateOne.mockResolvedValueOnce({ matchedCount: 1 });

        const response = await request(app)
            .post('/api/save-design?id=legacy-card')
            .set('Authorization', `Bearer ${token}`)
            .send({
                inputs: { 'logo-size': '25', 'input-name_ar': 'مسودة غير محفوظة' },
                imageUrls: {}
            });

        expect(response.status).toBe(200);
        const savedData = mockCollection.updateOne.mock.calls[0][1].$set.data;
        expect(savedData.inputs['input-name_ar']).toBe('مسودة غير محفوظة');
        expect(savedData.publishedState.inputs['input-name_ar']).toBe('التصميم المحفوظ');
        expect(savedData.publishedState.positions).toEqual(existingDoc.data.positions);
        expect(savedData.publishedAt).toBe('2026-07-20T09:30:00.000Z');
        expect(savedData.imageUrls).toEqual(existingDoc.data.imageUrls);
    });

    test('ownerless legacy cards are forked instead of being claimed', async () => {
        mockCollection.findOne
            .mockResolvedValueOnce({ userId: 'owner-1', isVerified: true })
            .mockResolvedValueOnce({ shortId: 'legacy-ownerless', data: { inputs: { 'input-name': 'Legacy' } } });
        mockCollection.insertOne.mockResolvedValueOnce({ insertedId: 'new-design' });

        const response = await request(app)
            .post('/api/save-design?id=legacy-ownerless')
            .set('Authorization', `Bearer ${token}`)
            .send({ inputs: { 'input-name': 'My copy' } });

        expect(response.status).toBe(200);
        expect(response.body.id).not.toBe('legacy-ownerless');
        expect(mockCollection.updateOne).not.toHaveBeenCalled();
        expect(mockCollection.insertOne.mock.calls[0][0]).toMatchObject({ ownerId: 'owner-1' });
    });

    test('owned updates use an atomic owner filter', async () => {
        const existing = { shortId: 'card-1', ownerId: 'owner-1', data: { inputs: {} } };
        mockCollection.findOne
            .mockResolvedValueOnce({ userId: 'owner-1', isVerified: true })
            .mockResolvedValueOnce(existing);
        mockCollection.updateOne.mockResolvedValueOnce({ matchedCount: 1 });

        const response = await request(app)
            .post('/api/save-design?id=card-1')
            .set('Authorization', `Bearer ${token}`)
            .send({ inputs: { 'input-name': 'Owned' } });

        expect(response.status).toBe(200);
        expect(mockCollection.updateOne.mock.calls[0][0]).toEqual({ shortId: 'card-1', ownerId: 'owner-1' });
    });

    test('public reads return only the published snapshot', async () => {
        mockCollection.findOne.mockResolvedValueOnce({
            _id: 'design-db-id',
            ownerId: 'owner-1',
            data: {
                inputs: { 'input-name_ar': 'اسم المسودة السري' },
                dynamic: { phones: [{ value: '01111111111' }] },
                publishedAt: '2026-07-31T12:00:00.000Z',
                publishedState: {
                    inputs: { 'input-name_ar': 'الاسم المنشور' },
                    dynamic: { phones: [{ value: '01000000000' }] },
                    imageUrls: {
                        capturedFront: 'https://uploads.example/front.webp',
                        capturedBack: 'https://uploads.example/back.webp'
                    }
                }
            }
        });
        mockCollection.updateOne.mockResolvedValueOnce({ matchedCount: 1 });

        const response = await request(app).get('/api/get-design/card-1?trackView=true');

        expect(response.status).toBe(200);
        expect(response.body.inputs['input-name_ar']).toBe('الاسم المنشور');
        expect(response.body.dynamic.phones[0].value).toBe('01000000000');
        expect(response.body.publishedState).toBeUndefined();
        expect(JSON.stringify(response.body)).not.toContain('اسم المسودة السري');
        expect(JSON.stringify(response.body)).not.toContain('01111111111');
    });

    test('public reads reject draft-only cards', async () => {
        mockCollection.findOne.mockResolvedValueOnce({
            ownerId: 'owner-1',
            data: {
                inputs: { 'input-name_ar': 'مسودة خاصة' },
                dynamic: { phones: [{ value: '01111111111' }] }
            }
        });

        const response = await request(app).get('/api/get-design/card-1');

        expect(response.status).toBe(404);
    });

    test('only the owner can read the latest draft', async () => {
        const draftData = {
            inputs: { 'input-name_ar': 'اسم المسودة' },
            dynamic: { phones: [{ value: '01111111111' }] }
        };
        mockCollection.findOne.mockResolvedValueOnce({
            ownerId: 'owner-1',
            data: draftData
        });

        const response = await request(app)
            .get('/api/get-design/card-1/draft')
            .set('Authorization', `Bearer ${token}`);

        expect(response.status).toBe(200);
        expect(response.body).toEqual(draftData);
        expect(response.headers['cache-control']).toContain('private');
        expect(response.headers['cache-control']).toContain('no-store');
    });

    test('draft reads do not reveal cards owned by another user', async () => {
        mockCollection.findOne.mockResolvedValueOnce({
            ownerId: 'owner-2',
            data: { inputs: { 'input-name_ar': 'مسودة شخص آخر' } }
        });

        const response = await request(app)
            .get('/api/get-design/card-1/draft')
            .set('Authorization', `Bearer ${token}`);

        expect(response.status).toBe(404);
    });
});
