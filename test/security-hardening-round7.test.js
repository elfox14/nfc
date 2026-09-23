/**
 * @jest-environment node
 */
const crypto = require('crypto');
const express = require('express');
const request = require('supertest');
const jwt = require('jsonwebtoken');
const createAdminRouter = require('../routes/admin.routes');

describe('Security Hardening Round 7 - revocable admin sessions', () => {
  const originalEnv = { ...process.env };
  const jwtSecret = 'round7-admin-session-secret-at-least-thirty-two-chars';

  beforeEach(() => {
    process.env.NODE_ENV = 'test';
    process.env.JWT_SECRET = jwtSecret;
    delete process.env.ADMIN_TOKENH;
    delete process.env.ADMIN_PASSWORD;
    delete process.env.ADMIN_TOKEN;
  });

  afterAll(() => {
    process.env = { ...originalEnv };
  });

  function buildApp() {
    let activeSession = null;

    const adminSessions = {
      insertOne: jest.fn(async (doc) => {
        activeSession = { ...doc };
        return { insertedId: 'admin-session-id' };
      }),
      findOne: jest.fn(async (query) => {
        if (!activeSession) return null;
        if (query?.jti !== activeSession.jti) return null;
        if (query?.type !== activeSession.type) return null;
        if (query?.userId && query.userId !== activeSession.userId) return null;
        if (activeSession.expiresAt <= new Date()) return null;
        return { ...activeSession };
      }),
      deleteOne: jest.fn(async (query) => {
        if (activeSession && query?.jti === activeSession.jti) {
          activeSession = null;
          return { deletedCount: 1 };
        }
        return { deletedCount: 0 };
      }),
      deleteMany: jest.fn().mockResolvedValue({ deletedCount: 0 })
    };

    const users = {
      findOne: jest.fn(),
      updateOne: jest.fn().mockResolvedValue({ matchedCount: 1 }),
      deleteOne: jest.fn().mockResolvedValue({ deletedCount: 1 })
    };

    const generic = {
      findOne: jest.fn(),
      countDocuments: jest.fn().mockResolvedValue(0),
      aggregate: jest.fn(() => ({ toArray: jest.fn().mockResolvedValue([]) })),
      find: jest.fn(() => ({
        sort: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        toArray: jest.fn().mockResolvedValue([])
      })),
      deleteMany: jest.fn().mockResolvedValue({ deletedCount: 0 }),
      deleteOne: jest.fn().mockResolvedValue({ deletedCount: 0 }),
      updateOne: jest.fn().mockResolvedValue({ matchedCount: 1 })
    };

    const db = {
      collection: jest.fn((name) => {
        if (name === 'adminSessions') return adminSessions;
        if (name === 'users') return users;
        return generic;
      })
    };

    const app = express();
    app.use(express.json());
    app.use('/api/admin', createAdminRouter({
      getDb: () => db,
      usersCollectionName: 'users',
      designsCollectionName: 'designs',
      cardRequestsCollectionName: 'requests',
      savedCardsCollectionName: 'saved'
    }));

    return { app, adminSessions, users };
  }

  it('mints a jti-backed master session and revokes the exact JWT immediately on logout', async () => {
    const { app, adminSessions } = buildApp();
    const plaintext = 'round7-master-secret';
    process.env.ADMIN_TOKEN_SHA256 = crypto.createHash('sha256').update(plaintext).digest('hex');

    const login = await request(app)
      .post('/api/admin/login')
      .send({ token: plaintext });

    expect(login.status).toBe(200);
    const decoded = jwt.verify(login.body.token, jwtSecret, { algorithms: ['HS256'] });
    expect(decoded.type).toBe('admin-master');
    expect(typeof decoded.jti).toBe('string');
    expect(decoded.jti.length).toBeGreaterThan(20);
    expect(adminSessions.insertOne).toHaveBeenCalledWith(
      expect.objectContaining({
        jti: decoded.jti,
        type: 'admin-master',
        expiresAt: expect.any(Date)
      })
    );

    const beforeLogout = await request(app)
      .get('/api/admin/me')
      .set('Authorization', `Bearer ${login.body.token}`);
    expect(beforeLogout.status).toBe(200);

    const logout = await request(app)
      .post('/api/admin/logout')
      .set('Authorization', `Bearer ${login.body.token}`);
    expect(logout.status).toBe(200);
    expect(adminSessions.deleteOne).toHaveBeenCalledWith({ jti: decoded.jti });

    const afterLogout = await request(app)
      .get('/api/admin/me')
      .set('Authorization', `Bearer ${login.body.token}`);
    expect(afterLogout.status).toBe(401);
  });

  it('rejects a validly signed admin JWT when its server-side session record is missing', async () => {
    const { app } = buildApp();
    const token = jwt.sign(
      {
        role: 'admin',
        type: 'admin-master',
        jti: 'missing-session-jti'
      },
      jwtSecret,
      { expiresIn: '2h' }
    );

    const res = await request(app)
      .get('/api/admin/me')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(401);
    expect(res.body.error).toMatch(/جلسة الإدارة/);
  });

  it('revokes stored admin sessions when a user is demoted from admin to user', async () => {
    const { app, adminSessions, users } = buildApp();
    const plaintext = 'round7-master-secret-demotion';
    process.env.ADMIN_TOKEN_SHA256 = crypto.createHash('sha256').update(plaintext).digest('hex');

    const login = await request(app)
      .post('/api/admin/login')
      .send({ token: plaintext });
    expect(login.status).toBe(200);

    const res = await request(app)
      .patch('/api/admin/users/admin-user-1')
      .set('Authorization', `Bearer ${login.body.token}`)
      .send({ role: 'user' });

    expect(res.status).toBe(200);
    expect(users.updateOne).toHaveBeenCalledWith(
      { userId: 'admin-user-1' },
      { $set: { role: 'user', isAdmin: false } }
    );
    expect(adminSessions.deleteMany).toHaveBeenCalledWith({ userId: 'admin-user-1' });
  });
});
