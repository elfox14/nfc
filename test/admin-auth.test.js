/**
 * @jest-environment node
 */
const request = require('supertest');
const express = require('express');
const cookieParser = require('cookie-parser');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const createAdminRouter = require('../routes/admin.routes');

describe('Admin Authentication System (Email/Password + JWT)', () => {
  let app;
  let mockUsersCollection;
  let mockDb;
  const mockJwtSecret = 'test_jwt_secret_must_be_at_least_32_characters_long';

  beforeAll(() => {
    process.env.JWT_SECRET = mockJwtSecret;
  });

  beforeEach(() => {
    mockUsersCollection = {
      findOne: jest.fn(),
      countDocuments: jest.fn().mockResolvedValue(10),
      find: jest.fn().mockReturnValue({
        sort: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        toArray: jest.fn().mockResolvedValue([])
      })
    };

    mockDb = {
      collection: jest.fn().mockImplementation((name) => {
        if (name === 'users') return mockUsersCollection;
        return {
          countDocuments: jest.fn().mockResolvedValue(5),
          find: jest.fn().mockReturnValue({
            sort: jest.fn().mockReturnThis(),
            limit: jest.fn().mockReturnThis(),
            toArray: jest.fn().mockResolvedValue([])
          })
        };
      })
    };

    app = express();
    app.use(express.json());
    app.use(cookieParser());
    app.use('/api/admin', createAdminRouter({
      getDb: () => mockDb,
      errorBuffer: [],
      MAX_ERROR_BUFFER: 50
    }));
  });

  it('POST /api/admin/login should fail with missing credentials', async () => {
    const res = await request(app)
      .post('/api/admin/login')
      .send({});

    expect(res.status).toBe(400);
    expect(res.body.error).toBeDefined();
  });

  it('POST /api/admin/login should fail for non-admin user', async () => {
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash('password123', salt);

    mockUsersCollection.findOne.mockResolvedValue({
      _id: 'user-1',
      email: 'user@mcprim.com',
      password: hashedPassword,
      role: 'user' // Not admin
    });

    const res = await request(app)
      .post('/api/admin/login')
      .send({ email: 'user@mcprim.com', password: 'password123' });

    expect(res.status).toBe(401);
  });

  it('POST /api/admin/login should succeed for admin user and return JWT token', async () => {
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash('adminPass123', salt);

    mockUsersCollection.findOne.mockResolvedValue({
      _id: 'admin-1',
      name: 'Admin Name',
      email: 'admin@mcprim.com',
      password: hashedPassword,
      role: 'admin'
    });

    const res = await request(app)
      .post('/api/admin/login')
      .send({ email: 'admin@mcprim.com', password: 'adminPass123' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.token).toBeDefined();
    expect(res.body.user.email).toBe('admin@mcprim.com');
    expect(res.body.user.role).toBe('admin');

    // Verify token payload
    const decoded = jwt.verify(res.body.token, mockJwtSecret);
    expect(decoded.email).toBe('admin@mcprim.com');
    expect(decoded.role).toBe('admin');
  });

  it('GET /api/admin/stats should allow access with valid Bearer token', async () => {
    const token = jwt.sign(
      { userId: 'admin-1', email: 'admin@mcprim.com', role: 'admin', type: 'access' },
      mockJwtSecret
    );

    const res = await request(app)
      .get('/api/admin/stats')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.totalUsers).toBe(10);
  });

  it('GET /api/admin/stats should reject invalid Bearer token', async () => {
    const res = await request(app)
      .get('/api/admin/stats')
      .set('Authorization', 'Bearer invalid.token.here');

    expect(res.status).toBe(401);
  });
});
