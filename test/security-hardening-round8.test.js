/**
 * @jest-environment node
 */
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const express = require('express');
const request = require('supertest');
const createAdminRouter = require('../routes/admin.routes');

describe('Security Hardening Round 8', () => {
  const originalEnv = { ...process.env };
  const jwtSecret = 'round8-admin-privilege-secret-at-least-thirty-two-chars';

  beforeEach(() => {
    process.env.NODE_ENV = 'test';
    process.env.JWT_SECRET = jwtSecret;
    delete process.env.ADMIN_TOKENH;
    delete process.env.ADMIN_PASSWORD;
    delete process.env.ADMIN_TOKEN;
    delete process.env.ADMIN_TOKEN_SHA256;
  });

  afterAll(() => {
    process.env = { ...originalEnv };
  });

  function buildApp() {
    const sessions = new Map();
    const adminSessions = {
      insertOne: jest.fn(async (doc) => {
        sessions.set(doc.jti, { ...doc });
        return { insertedId: doc.jti };
      }),
      findOne: jest.fn(async (query) => {
        const doc = sessions.get(query?.jti);
        if (!doc) return null;
        if (query.type && doc.type !== query.type) return null;
        if (query.userId && doc.userId !== query.userId) return null;
        if (doc.expiresAt <= new Date()) return null;
        return { ...doc };
      }),
      deleteOne: jest.fn(async ({ jti }) => ({ deletedCount: sessions.delete(jti) ? 1 : 0 })),
      deleteMany: jest.fn().mockResolvedValue({ deletedCount: 0 })
    };

    const users = {
      findOne: jest.fn(),
      updateOne: jest.fn().mockResolvedValue({ matchedCount: 1 }),
      deleteOne: jest.fn().mockResolvedValue({ deletedCount: 1 }),
      countDocuments: jest.fn().mockResolvedValue(0),
      find: jest.fn(() => ({
        sort: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        toArray: jest.fn().mockResolvedValue([])
      }))
    };

    const generic = {
      findOne: jest.fn(),
      updateOne: jest.fn().mockResolvedValue({ matchedCount: 1 }),
      deleteOne: jest.fn().mockResolvedValue({ deletedCount: 1 }),
      deleteMany: jest.fn().mockResolvedValue({ deletedCount: 0 }),
      countDocuments: jest.fn().mockResolvedValue(0),
      aggregate: jest.fn(() => ({ toArray: jest.fn().mockResolvedValue([]) })),
      find: jest.fn(() => ({
        sort: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        toArray: jest.fn().mockResolvedValue([])
      }))
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

    return { app, users };
  }

  async function loginRegularAdmin(app, users) {
    const password = 'regular-admin-password-123';
    const adminUser = {
      userId: 'regular-admin',
      email: 'regular-admin@example.com',
      name: 'Regular Admin',
      role: 'admin',
      isAdmin: true,
      password: await bcrypt.hash(password, 4)
    };
    users.findOne.mockResolvedValue(adminUser);

    const login = await request(app)
      .post('/api/admin/login')
      .send({ email: adminUser.email, password });

    expect(login.status).toBe(200);
    return { token: login.body.token, adminUser };
  }

  it('regular admins cannot grant or revoke administrative roles', async () => {
    const { app, users } = buildApp();
    const { token } = await loginRegularAdmin(app, users);
    users.updateOne.mockClear();

    const res = await request(app)
      .patch('/api/admin/users/target-user')
      .set('Authorization', `Bearer ${token}`)
      .send({ role: 'admin' });

    expect(res.status).toBe(403);
    expect(users.updateOne).not.toHaveBeenCalled();
  });

  it('regular admins can still verify ordinary accounts', async () => {
    const { app, users } = buildApp();
    const { token } = await loginRegularAdmin(app, users);
    users.updateOne.mockClear();

    const res = await request(app)
      .patch('/api/admin/users/target-user')
      .set('Authorization', `Bearer ${token}`)
      .send({ isVerified: true });

    expect(res.status).toBe(200);
    expect(users.updateOne).toHaveBeenCalledWith(
      { userId: 'target-user' },
      { $set: { isVerified: true } }
    );
  });

  it('regular admins cannot delete an administrator account', async () => {
    const { app, users } = buildApp();
    const { token, adminUser } = await loginRegularAdmin(app, users);
    users.findOne.mockResolvedValue(adminUser);
    users.deleteOne.mockClear();

    const res = await request(app)
      .delete('/api/admin/users/another-admin')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(403);
    expect(users.deleteOne).not.toHaveBeenCalled();
  });

  it('master sessions can still change roles', async () => {
    const { app, users } = buildApp();
    const plaintext = 'round8-master-secret';
    process.env.ADMIN_TOKEN_SHA256 = crypto.createHash('sha256').update(plaintext).digest('hex');

    const login = await request(app)
      .post('/api/admin/login')
      .send({ token: plaintext });
    expect(login.status).toBe(200);

    const res = await request(app)
      .patch('/api/admin/users/target-admin')
      .set('Authorization', `Bearer ${login.body.token}`)
      .send({ role: 'user' });

    expect(res.status).toBe(200);
    expect(users.updateOne).toHaveBeenCalledWith(
      { userId: 'target-admin' },
      { $set: { role: 'user', isAdmin: false } }
    );
  });

  it('admin session introspection does not expose the revocation jti', async () => {
    const { app } = buildApp();
    const plaintext = 'round8-master-secret-jti';
    process.env.ADMIN_TOKEN_SHA256 = crypto.createHash('sha256').update(plaintext).digest('hex');

    const login = await request(app)
      .post('/api/admin/login')
      .send({ token: plaintext });
    const me = await request(app)
      .get('/api/admin/me')
      .set('Authorization', `Bearer ${login.body.token}`);

    expect(me.status).toBe(200);
    expect(me.body.admin).not.toHaveProperty('jti');
    expect(me.body.admin.type).toBe('admin-master');
  });

  it('admin user listing uses an allowlist projection', () => {
    const fs = require('fs');
    const path = require('path');
    const code = fs.readFileSync(path.join(__dirname, '../routes/admin.routes.js'), 'utf8');
    expect(code).toContain('userId: 1');
    expect(code).toContain('name: 1');
    expect(code).toContain('email: 1');
    expect(code).toContain('isVerified: 1');
    expect(code).not.toContain('refreshTokenHash: 0');
  });

  it('OAuth popup messaging uses only exact allowed origins', () => {
    const fs = require('fs');
    const path = require('path');
    const code = fs.readFileSync(path.join(__dirname, '../routes/auth.routes.js'), 'utf8');
    expect(code).toContain('window.opener.postMessage(msg, origin)');
    expect(code).not.toContain("base.replace('://www.', '://')");
    expect(code).not.toContain("base.replace('://', '://www.')");
  });
});
