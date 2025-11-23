// tests/api/auth.test.js
/**
 * Authentication API Tests
 * اختبارات API المصادقة
 */

const request = require('supertest');
const { MongoClient } = require('mongodb');
const app = require('../../server'); // سنحتاج لتصدير app من server.js

describe('Authentication API', () => {
    let connection;
    let db;

    // Setup قبل جميع الاختبارات
    beforeAll(async () => {
        const mongoUrl = process.env.MONGO_URI || 'mongodb://localhost:27017';
        connection = await MongoClient.connect(mongoUrl);
        db = connection.db('nfc_test_db');
    });

    // Cleanup بعد جميع الاختبارات
    afterAll(async () => {
        if (connection) {
            await db.dropDatabase();
            await connection.close();
        }
    });

    // Cleanup قبل كل اختبار
    beforeEach(async () => {
        const collections = await db.collections();
        for (let collection of collections) {
            await collection.deleteMany({});
        }
    });

    describe('POST /api/auth/register', () => {
        it('should register a new user successfully', async () => {
            const response = await request(app)
                .post('/api/auth/register')
                .send({
                    username: 'testuser',
                    email: 'test@example.com',
                    password: 'Test1234'
                });

            expect(response.status).toBe(201);
            expect(response.body).toHaveProperty('success', true);
            expect(response.body).toHaveProperty('token');
            expect(response.body.user).toHaveProperty('username', 'testuser');
            expect(response.body.user).toHaveProperty('email', 'test@example.com');
            expect(response.body.user).not.toHaveProperty('password');
        });

        it('should fail with duplicate username', async () => {
            // إنشاء مستخدم أولاً
            await request(app)
                .post('/api/auth/register')
                .send({
                    username: 'testuser',
                    email: 'test1@example.com',
                    password: 'Test1234'
                });

            // محاولة إنشاء بنفس username
            const response = await request(app)
                .post('/api/auth/register')
                .send({
                    username: 'testuser',
                    email: 'test2@example.com',
                    password: 'Test1234'
                });

            expect(response.status).toBe(400);
            expect(response.body).toHaveProperty('error');
        });

        it('should fail with weak password', async () => {
            const response = await request(app)
                .post('/api/auth/register')
                .send({
                    username: 'testuser',
                    email: 'test@example.com',
                    password: '123' // كلمة مرور ضعيفة
                });

            expect(response.status).toBe(400);
            expect(response.body).toHaveProperty('error');
        });

        it('should fail with invalid email', async () => {
            const response = await request(app)
                .post('/api/auth/register')
                .send({
                    username: 'testuser',
                    email: 'invalid-email',
                    password: 'Test1234'
                });

            expect(response.status).toBe(400);
            expect(response.body).toHaveProperty('error');
        });
    });

    describe('POST /api/auth/login', () => {
        beforeEach(async () => {
            // إنشاء مستخدم للاختبار
            await request(app)
                .post('/api/auth/register')
                .send({
                    username: 'testuser',
                    email: 'test@example.com',
                    password: 'Test1234'
                });
        });

        it('should login successfully with correct credentials', async () => {
            const response = await request(app)
                .post('/api/auth/login')
                .send({
                    email: 'test@example.com',
                    password: 'Test1234'
                });

            expect(response.status).toBe(200);
            expect(response.body).toHaveProperty('success', true);
            expect(response.body).toHaveProperty('token');
            expect(response.body.user).toHaveProperty('email', 'test@example.com');
        });

        it('should fail with wrong password', async () => {
            const response = await request(app)
                .post('/api/auth/login')
                .send({
                    email: 'test@example.com',
                    password: 'WrongPassword123'
                });

            expect(response.status).toBe(401);
            expect(response.body).toHaveProperty('error');
        });

        it('should fail with non-existent email', async () => {
            const response = await request(app)
                .post('/api/auth/login')
                .send({
                    email: 'nonexistent@example.com',
                    password: 'Test1234'
                });

            expect(response.status).toBe(401);
            expect(response.body).toHaveProperty('error');
        });
    });

    describe('GET /api/auth/me', () => {
        let token;

        beforeEach(async () => {
            // تسجيل والحصول على token
            const response = await request(app)
                .post('/api/auth/register')
                .send({
                    username: 'testuser',
                    email: 'test@example.com',
                    password: 'Test1234'
                });
            token = response.body.token;
        });

        it('should return user data with valid token', async () => {
            const response = await request(app)
                .get('/api/auth/me')
                .set('Authorization', `Bearer ${token}`);

            expect(response.status).toBe(200);
            expect(response.body).toHaveProperty('success', true);
            expect(response.body.user).toHaveProperty('username', 'testuser');
            expect(response.body.user).not.toHaveProperty('password');
        });

        it('should fail without token', async () => {
            const response = await request(app)
                .get('/api/auth/me');

            expect(response.status).toBe(401);
            expect(response.body).toHaveProperty('error');
        });

        it('should fail with invalid token', async () => {
            const response = await request(app)
                .get('/api/auth/me')
                .set('Authorization', 'Bearer invalid-token');

            expect(response.status).toBe(401);
            expect(response.body).toHaveProperty('error');
        });
    });
});
