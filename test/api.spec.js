/**
 * @jest-environment node
 */
const request = require('supertest');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// Mock Redis to prevent real connection attempts during tests
jest.mock('redis', () => ({
    createClient: jest.fn(() => ({
        on: jest.fn(),
        get: jest.fn(),
        setEx: jest.fn(),
        connect: jest.fn().mockResolvedValue(true),
        isReady: true,
        sendCommand: jest.fn()
    }))
}));

// Mock MongoDB
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
    MongoClient: {
        connect: jest.fn().mockResolvedValue(mockClient)
    }
}));

// Setup Test Environment Variables
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'secret123';
process.env.MONGO_URI = 'mongodb://fake-uri';
process.env.PUBLIC_BASE_URL = 'http://localhost:3000';

const app = require('../server.js');

describe('Auth Integration Tests (Ticket 9)', () => {

    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('POST /api/auth/register', () => {
        it('Should register a new user successfully', async () => {
            // Setup Mock: No existing user found
            mockCollection.findOne.mockResolvedValueOnce(null);
            mockCollection.insertOne.mockResolvedValueOnce({ insertedId: '123' });
            mockCollection.updateOne.mockResolvedValueOnce({ matchedCount: 1 });

            const res = await request(app)
                .post('/api/auth/register')
                .send({ name: 'Test User', email: 'test@example.com', password: 'password123' });

            expect(res.status).toBe(201);
            expect(res.body.success).toBe(true);
            expect(res.body.token).toBeDefined();
            expect(res.body.user.email).toBe('test@example.com');

            // Check if Refresh Token HttpOnly Cookie is Set
            const cookies = res.headers['set-cookie'];
            expect(cookies).toBeDefined();
            expect(cookies.some(c => c.includes('refreshToken='))).toBeTruthy();
        });

        it('Should reject duplicate emails', async () => {
            // Setup Mock: Existing user found
            mockCollection.findOne.mockResolvedValueOnce({ email: 'test@example.com' });

            const res = await request(app)
                .post('/api/auth/register')
                .send({ name: 'Test User 2', email: 'test@example.com', password: 'password123' });

            expect(res.status).toBe(400);
            expect(res.body.error).toBe('User already exists');
        });
    });

    describe('POST /api/auth/login', () => {
        it('Should log in user with correct credentials', async () => {
            // Hash a fake password to match
            const salt = await bcrypt.genSalt(10);
            const hashedPassword = await bcrypt.hash('password123', salt);

            // Setup Mock
            mockCollection.findOne.mockResolvedValueOnce({
                userId: 'u123',
                email: 'test@example.com',
                name: 'Test user',
                password: hashedPassword
            });
            mockCollection.insertOne.mockResolvedValueOnce({ insertedId: 'r123' });

            const res = await request(app)
                .post('/api/auth/login')
                .send({ email: 'test@example.com', password: 'password123' });

            expect(res.status).toBe(200);
            expect(res.body.success).toBe(true);
            expect(res.body.token).toBeDefined();

            const cookies = res.headers['set-cookie'];
            expect(cookies).toBeDefined();
            expect(cookies.some(c => c.includes('refreshToken='))).toBeTruthy();
        });

        it('Should reject incorrect password', async () => {
            const salt = await bcrypt.genSalt(10);
            const hashedPassword = await bcrypt.hash('password123', salt);

            mockCollection.findOne.mockResolvedValueOnce({
                userId: 'u123',
                email: 'test@example.com',
                password: hashedPassword
            });

            const res = await request(app)
                .post('/api/auth/login')
                .send({ email: 'test@example.com', password: 'wrongpassword' });

            expect(res.status).toBe(400);
            expect(res.body.error).toBe('Invalid credentials');
        });
    });

    describe('POST /api/auth/refresh', () => {
        it('Should prevent token refresh without a valid cookie payload', async () => {
            const res = await request(app).post('/api/auth/refresh');
            expect(res.status).toBe(401);
            expect(res.body.error).toBe('No refresh token provided');
        });

        // In a full environment, we would inject a mapped cookie matching mockCollection.findOne.
    });

    describe('POST /api/auth/logout', () => {
        it('Should clear the HttpOnly refreshToken cookie', async () => {
            mockCollection.deleteOne.mockResolvedValueOnce({ deletedCount: 1 });

            const res = await request(app)
                .post('/api/auth/logout')
                .set('Cookie', [`refreshToken=mocked_fake_token_value`]);

            expect(res.status).toBe(200);
            expect(res.body.success).toBe(true);

            const cookies = res.headers['set-cookie'];
            expect(cookies.some(c => c.includes('refreshToken=;'))).toBeTruthy();
        });
    });
});
