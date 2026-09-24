/**
 * @jest-environment node
 */
const express = require('express');
const cookieParser = require('cookie-parser');
const request = require('supertest');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { createVerifyToken } = require('../auth-middleware');
const createAuthRouter = require('../routes/auth.routes');
const createDesignsRouter = require('../routes/designs.routes');
const { createRefreshToken } = require('../utils/tokens');

describe('Security Hardening Round 6 - server-side session revocation', () => {
  const originalEnv = { ...process.env };
  const jwtSecret = 'round6-jwt-secret-at-least-thirty-two-characters';
  const tokenHashSecret = 'round6-token-hash-secret-at-least-thirty-two';

  beforeEach(() => {
    process.env.NODE_ENV = 'test';
    process.env.JWT_SECRET = jwtSecret;
    process.env.TOKEN_HASH_SECRET = tokenHashSecret;
  });

  afterAll(() => {
    process.env = { ...originalEnv };
  });

  function accessToken(userId, sessionVersion) {
    const payload = { userId, email: 'user@example.com', type: 'access' };
    if (sessionVersion !== undefined) payload.sessionVersion = sessionVersion;
    return jwt.sign(payload, jwtSecret, { expiresIn: '15m' });
  }

  it('rejects an access token immediately when its sessionVersion no longer matches', async () => {
    const users = {
      findOne: jest.fn().mockResolvedValue({ userId: 'u1', sessionVersion: 2 })
    };
    const db = { collection: jest.fn(() => users) };
    const app = express();
    app.get('/protected', createVerifyToken({ getDb: () => db, usersCollectionName: 'users' }), (req, res) => {
      res.json({ ok: true });
    });

    const res = await request(app)
      .get('/protected')
      .set('Authorization', `Bearer ${accessToken('u1', 1)}`);

    expect(res.status).toBe(401);
    expect(res.body.error).toMatch(/revoked/i);
  });

  it('keeps legacy version-zero access tokens compatible until the server increments the session version', async () => {
    const users = {
      findOne: jest.fn().mockResolvedValue({ userId: 'legacy-user' })
    };
    const db = { collection: jest.fn(() => users) };
    const app = express();
    app.get('/protected', createVerifyToken({ getDb: () => db, usersCollectionName: 'users' }), (req, res) => {
      res.json({ ok: true });
    });

    const res = await request(app)
      .get('/protected')
      .set('Authorization', `Bearer ${accessToken('legacy-user')}`);

    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
  });

  it('rejects a validly signed access token after the account has been deleted', async () => {
    const users = { findOne: jest.fn().mockResolvedValue(null) };
    const designs = {
      findOne: jest.fn(),
      insertOne: jest.fn()
    };
    const db = {
      collection: jest.fn((name) => {
        if (name === 'users') return users;
        if (name === 'designs') return designs;
        return {};
      })
    };

    const app = express();
    app.use(express.json());
    app.use('/api', createDesignsRouter({
      getDb: () => db,
      designsCollectionName: 'designs',
      usersCollectionName: 'users',
      cardRequestsCollectionName: 'requests',
      savedCardsCollectionName: 'saved',
      absoluteBaseUrl: () => 'https://mcprime.test',
      sanitizeDesignState: state => state,
      cloudinary: null
    }));

    const res = await request(app)
      .post('/api/save-design')
      .set('Authorization', `Bearer ${accessToken('deleted-user', 0)}`)
      .send({ inputs: { 'input-name': 'Should not persist' } });

    expect(res.status).toBe(401);
    expect(designs.insertOne).not.toHaveBeenCalled();
  });

  it('logout increments sessionVersion and clears refresh/session-init credentials', async () => {
    const refreshToken = createRefreshToken();
    const users = {
      findOne: jest.fn().mockResolvedValue({ userId: 'logout-user', sessionVersion: 4 }),
      updateOne: jest.fn().mockResolvedValue({ matchedCount: 1 })
    };
    const db = { collection: jest.fn(() => users) };
    const app = express();
    app.use(express.json());
    app.use(cookieParser());
    app.use('/api/auth', createAuthRouter({
      getDb: () => db,
      usersCollectionName: 'users',
      designsCollectionName: 'designs',
      savedCardsCollectionName: 'saved',
      cardRequestsCollectionName: 'requests',
      authLimiter: (req, res, next) => next(),
      allowedOrigins: ['https://mcprime.test'],
      cloudinary: null
    }));

    const res = await request(app)
      .post('/api/auth/logout')
      .set('Cookie', [`refreshToken=${refreshToken}`]);

    expect(res.status).toBe(200);
    expect(users.updateOne).toHaveBeenCalledWith(
      expect.objectContaining({ refreshTokenHash: expect.any(String) }),
      expect.objectContaining({
        $inc: { sessionVersion: 1 },
        $unset: expect.objectContaining({
          refreshTokenHash: '',
          usedRefreshTokens: '',
          sessionInitTokenHash: ''
        })
      })
    );
  });

  it('detects reuse of an already-rotated refresh token and revokes the whole session', async () => {
    const reusedToken = createRefreshToken();
    const users = {
      findOneAndUpdate: jest.fn().mockResolvedValue(null),
      findOne: jest.fn().mockResolvedValue({ userId: 'reuse-user', sessionVersion: 3 }),
      updateOne: jest.fn().mockResolvedValue({ matchedCount: 1 })
    };
    const db = { collection: jest.fn(() => users) };
    const app = express();
    app.use(express.json());
    app.use(cookieParser());
    app.use('/api/auth', createAuthRouter({
      getDb: () => db,
      usersCollectionName: 'users',
      designsCollectionName: 'designs',
      savedCardsCollectionName: 'saved',
      cardRequestsCollectionName: 'requests',
      authLimiter: (req, res, next) => next(),
      allowedOrigins: ['https://mcprime.test'],
      cloudinary: null
    }));

    const res = await request(app)
      .post('/api/auth/refresh')
      .set('Cookie', [`refreshToken=${reusedToken}`]);

    expect(res.status).toBe(403);
    expect(res.body.code).toBe('SESSION_REVOKED');
    expect(users.findOne).toHaveBeenCalledWith(
      expect.objectContaining({
        usedRefreshTokens: {
          $elemMatch: expect.objectContaining({ hash: expect.any(String) })
        }
      }),
      expect.any(Object)
    );
    expect(users.updateOne).toHaveBeenCalledWith(
      expect.objectContaining({ userId: 'reuse-user' }),
      expect.objectContaining({
        $inc: { sessionVersion: 1 },
        $unset: expect.objectContaining({ refreshTokenHash: '', usedRefreshTokens: '' })
      })
    );
  });

  it('issues refreshed access tokens with the current server-side sessionVersion', async () => {
    const token = createRefreshToken();
    const users = {
      findOneAndUpdate: jest.fn().mockResolvedValue({
        userId: 'refresh-user',
        email: 'user@example.com',
        name: 'User',
        sessionVersion: 7
      }),
      findOne: jest.fn(),
      updateOne: jest.fn()
    };
    const db = { collection: jest.fn(() => users) };
    const app = express();
    app.use(express.json());
    app.use(cookieParser());
    app.use('/api/auth', createAuthRouter({
      getDb: () => db,
      usersCollectionName: 'users',
      designsCollectionName: 'designs',
      savedCardsCollectionName: 'saved',
      cardRequestsCollectionName: 'requests',
      authLimiter: (req, res, next) => next(),
      allowedOrigins: ['https://mcprime.test'],
      cloudinary: null
    }));

    const res = await request(app)
      .post('/api/auth/refresh')
      .set('Cookie', [`refreshToken=${token}`]);

    expect(res.status).toBe(200);
    const decoded = jwt.verify(res.body.accessToken, jwtSecret, { algorithms: ['HS256'] });
    expect(decoded.sessionVersion).toBe(7);
    expect(users.findOneAndUpdate).toHaveBeenCalledWith(
      expect.any(Object),
      expect.objectContaining({
        $push: expect.objectContaining({ usedRefreshTokens: expect.any(Object) })
      }),
      { returnDocument: 'after' }
    );
  });

  it('rejects a stale concurrent password login before issuing credentials', async () => {
    const password = 'ConcurrentPass123!';
    const users = {
      findOne: jest.fn().mockResolvedValue({
        userId: 'concurrent-user',
        email: 'concurrent@example.com',
        name: 'Concurrent User',
        password: await bcrypt.hash(password, 4),
        sessionVersion: 5,
        isVerified: true
      }),
      updateOne: jest.fn().mockResolvedValue({ matchedCount: 0 })
    };
    const db = { collection: jest.fn(() => users) };
    const app = express();
    app.use(express.json());
    app.use(cookieParser());
    app.use('/api/auth', createAuthRouter({
      getDb: () => db,
      usersCollectionName: 'users',
      designsCollectionName: 'designs',
      savedCardsCollectionName: 'saved',
      cardRequestsCollectionName: 'requests',
      authLimiter: (req, res, next) => next(),
      allowedOrigins: ['https://mcprime.test'],
      cloudinary: null
    }));

    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'concurrent@example.com', password });

    expect(res.status).toBe(409);
    expect(res.body.code).toBe('LOGIN_SESSION_CONFLICT');
    expect(res.headers['set-cookie']).toBeUndefined();
    expect(users.updateOne).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 'concurrent-user',
        $or: expect.any(Array)
      }),
      expect.objectContaining({
        $set: expect.objectContaining({ sessionVersion: 6 })
      })
    );
  });

  it('binds OAuth session replacement and init-token storage to sessionVersion', () => {
    const fs = require('fs');
    const path = require('path');
    const code = fs.readFileSync(path.join(__dirname, '../routes/auth.routes.js'), 'utf8');

    expect(code).toContain('sessionVersionUserFilter(user.userId, user.sessionVersion)');
    expect(code).toContain('const oauthSessionUpdate');
    expect(code).toContain('const initTokenStore');
    expect(code).toContain('sessionVersionUserFilter(user.userId, oauthSessionVersion)');
    expect(code).toContain('OAUTH_SESSION_CONFLICT');
  });

});
