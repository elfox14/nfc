/**
 * @jest-environment node
 */
const express = require('express');
const request = require('supertest');
const jwt = require('jsonwebtoken');
const createViewerRouter = require('../routes/viewer.routes');
const createDesignsRouter = require('../routes/designs.routes');
const createAdminRouter = require('../routes/admin.routes');
const verifyToken = require('../auth-middleware');
const { registerCsrfOriginGuard } = require('../utils/cors-config')._private || {
  registerCsrfOriginGuard: (app, allowedOrigins) => {
    // Fallback import
  }
};

describe('Security Hardening Round 2 Tests', () => {
  const jwtSecret = 'test-secret-key-round2-hardening-32bytes!';

  beforeAll(() => {
    process.env.JWT_SECRET = jwtSecret;
  });

  describe('1. Lead Capture Endpoint Verification', () => {
    let app, mockDb, designsCollection, leadsCollection;

    beforeEach(() => {
      leadsCollection = {
        insertOne: jest.fn().mockResolvedValue({ insertedId: 'lead-123' })
      };
      designsCollection = {
        findOne: jest.fn()
      };
      mockDb = {
        collection: jest.fn((name) => {
          if (name === 'leads') return leadsCollection;
          if (name === 'designs') return designsCollection;
          return {};
        })
      };

      app = express();
      app.use(express.json());
      app.use(createViewerRouter({
        getDb: () => mockDb,
        designsCollectionName: 'designs',
        rootDir: __dirname,
        absoluteBaseUrl: () => 'https://mcprime.test'
      }));
    });

    it('rejects lead submission with 404 if target card does not exist', async () => {
      designsCollection.findOne.mockResolvedValue(null);

      const res = await request(app)
        .post('/nfc/api/leads/nonexistent-card')
        .send({ name: 'Ahmed', phone: '01000000000' });

      expect(res.status).toBe(404);
      expect(res.body.error).toContain('Card not found');
      expect(leadsCollection.insertOne).not.toHaveBeenCalled();
    });

    it('rejects lead submission with 404 if card exists but has no published revision', async () => {
      designsCollection.findOne.mockResolvedValue({
        shortId: 'draft-card',
        data: {
          draft: { name: 'Draft only' }
          // No published revision
        }
      });

      const res = await request(app)
        .post('/nfc/api/leads/draft-card')
        .send({ name: 'Ahmed', phone: '01000000000' });

      expect(res.status).toBe(404);
      expect(leadsCollection.insertOne).not.toHaveBeenCalled();
    });

    it('accepts lead submission when card is published', async () => {
      designsCollection.findOne.mockResolvedValue({
        shortId: 'live-card',
        data: {
          publishedState: {
            inputs: { name: 'Live Card' }
          },
          publishedAt: new Date().toISOString()
        }
      });

      const res = await request(app)
        .post('/nfc/api/leads/live-card')
        .send({ name: 'Visitor', email: 'visitor@example.com' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(leadsCollection.insertOne).toHaveBeenCalledWith(
        expect.objectContaining({
          cardId: 'live-card',
          visitorName: 'Visitor',
          visitorEmail: 'visitor@example.com'
        })
      );
    });

    it('also responds on alias route /api/leads/:idOrSlug', async () => {
      designsCollection.findOne.mockResolvedValue({
        shortId: 'live-card-2',
        data: {
          publishedState: {
            inputs: { name: 'Live Card 2' }
          },
          publishedAt: new Date().toISOString()
        }
      });

      const res = await request(app)
        .post('/api/leads/live-card-2')
        .send({ name: 'Visitor 2', phone: '0123456789' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });
  });

  describe('2. Card Stats IDOR Defense (Ownerless & Cross-user checks)', () => {
    let app, designsCollection, mockDb, userAccessToken;

    beforeEach(() => {
      userAccessToken = jwt.sign(
        { userId: 'user-abc', email: 'user@example.com', type: 'access' },
        jwtSecret
      );
      designsCollection = {
        findOne: jest.fn()
      };
      mockDb = {
        collection: jest.fn(() => designsCollection)
      };

      app = express();
      app.use(express.json());
      app.use('/api', createDesignsRouter({
        getDb: () => mockDb,
        designsCollectionName: 'designs',
        usersCollectionName: 'users',
        cardRequestsCollectionName: 'card_requests',
        savedCardsCollectionName: 'saved_cards',
        absoluteBaseUrl: () => 'https://mcprime.test',
        sanitizeDesignState: (s) => s,
        cloudinary: null
      }));
    });

    it('rejects access with 403 if card has NO ownerId (ownerless legacy design)', async () => {
      designsCollection.findOne.mockResolvedValue({
        shortId: 'legacy-no-owner',
        views: 42,
        ownerId: null
      });

      const res = await request(app)
        .get('/api/card-stats/legacy-no-owner')
        .set('Authorization', `Bearer ${userAccessToken}`);

      expect(res.status).toBe(403);
      expect(res.body.error).toContain('Access denied');
    });

    it('rejects access with 403 if card belongs to a different owner', async () => {
      designsCollection.findOne.mockResolvedValue({
        shortId: 'other-user-card',
        views: 10,
        ownerId: 'user-xyz'
      });

      const res = await request(app)
        .get('/api/card-stats/other-user-card')
        .set('Authorization', `Bearer ${userAccessToken}`);

      expect(res.status).toBe(403);
      expect(res.body.error).toContain('Access denied');
    });

    it('allows access with 200 if caller is the card owner', async () => {
      designsCollection.findOne.mockResolvedValue({
        shortId: 'my-card',
        views: 99,
        createdAt: '2026-01-01',
        lastModified: '2026-01-02',
        ownerId: 'user-abc'
      });

      const res = await request(app)
        .get('/api/card-stats/my-card')
        .set('Authorization', `Bearer ${userAccessToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.stats.views).toBe(99);
    });
  });

  describe('3. Admin Session DB Role Verification and JWT Expiration', () => {
    let app, usersCollection, mockDb;

    beforeEach(() => {
      usersCollection = {
        findOne: jest.fn()
      };
      const adminSessions = {
        findOne: jest.fn(async (query) => ({
          jti: query.jti,
          type: query.type,
          userId: query.userId || null,
          expiresAt: new Date(Date.now() + 60_000)
        })),
        deleteOne: jest.fn().mockResolvedValue({ deletedCount: 1 })
      };
      mockDb = {
        collection: jest.fn((name) => {
          if (name === 'users') return usersCollection;
          if (name === 'adminSessions') return adminSessions;
          return { findOne: jest.fn() };
        })
      };

      app = express();
      app.use(express.json());
      app.use('/api/admin', createAdminRouter({
        getDb: () => mockDb,
        usersCollectionName: 'users',
        designsCollectionName: 'designs',
        cardRequestsCollectionName: 'requests',
        errorTracker: null
      }));
    });

    it('rejects admin access if admin role has been revoked in DB', async () => {
      const adminToken = jwt.sign(
        { userId: 'demoted-user-1', email: 'demoted@test.com', role: 'admin', type: 'admin', jti: 'demoted-session' },
        jwtSecret,
        { expiresIn: '2h' }
      );

      // User in DB now has standard role 'user'
      usersCollection.findOne.mockResolvedValue({
        userId: 'demoted-user-1',
        role: 'user',
        isAdmin: false
      });

      const res = await request(app)
        .get('/api/admin/me')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(403);
      expect(res.body.error).toContain('تم سحب صلاحيات المسؤول');
    });

    it('allows admin access if user remains active admin in DB', async () => {
      const adminToken = jwt.sign(
        { userId: 'active-admin-1', email: 'admin@test.com', role: 'admin', type: 'admin', jti: 'active-session' },
        jwtSecret,
        { expiresIn: '2h' }
      );

      usersCollection.findOne.mockResolvedValue({
        userId: 'active-admin-1',
        role: 'admin',
        isAdmin: true
      });

      const res = await request(app)
        .get('/api/admin/me')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.admin.userId).toBe('active-admin-1');
    });
  });

  describe('4. JWT Verification Algorithm Pinning', () => {
    it('pins HS256 algorithm in auth-middleware', () => {
      const spy = jest.spyOn(jwt, 'verify');
      const req = {
        headers: { authorization: 'Bearer dummy-token' }
      };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };
      const next = jest.fn();

      verifyToken(req, res, next);
      expect(spy).toHaveBeenCalledWith(
        'dummy-token',
        jwtSecret,
        expect.objectContaining({ algorithms: ['HS256'] })
      );
      spy.mockRestore();
    });
  });

  describe('5. Refresh Token Server Expiry & Atomic Reset Token Consumption', () => {
    const cookieParser = require('cookie-parser');
    const createAuthRouter = require('../routes/auth.routes');
    const { createRefreshToken } = require('../utils/tokens');
    let app, usersCollection, mockDb;

    beforeEach(() => {
      usersCollection = {
        findOne: jest.fn(),
        findOneAndUpdate: jest.fn(),
        updateOne: jest.fn()
      };
      mockDb = {
        collection: jest.fn((name) => {
          if (name === 'users') return usersCollection;
          return { findOne: jest.fn() };
        })
      };

      app = express();
      app.use(express.json());
      app.use(cookieParser());
      app.use('/api/auth', createAuthRouter({
        getDb: () => mockDb,
        usersCollectionName: 'users',
        designsCollectionName: 'designs',
        savedCardsCollectionName: 'saved_cards',
        cardRequestsCollectionName: 'requests',
        authLimiter: (req, res, next) => next(),
        allowedOrigins: ['https://mcprime.test'],
        cloudinary: null
      }));
    });

    it('rotates refresh token atomically when token is unexpired', async () => {
      const token = createRefreshToken();
      usersCollection.findOneAndUpdate.mockResolvedValue({
        userId: 'user-refresh-1',
        email: 'user@test.com',
        name: 'Refreshed User'
      });

      const res = await request(app)
        .post('/api/auth/refresh')
        .set('Cookie', [`refreshToken=${token}`]);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.accessToken).toBeDefined();
      expect(usersCollection.findOneAndUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          refreshTokenHash: expect.any(String),
          refreshTokenExpiresAt: { $gt: expect.any(Date) }
        }),
        expect.objectContaining({
          $set: expect.objectContaining({
            refreshTokenHash: expect.any(String),
            refreshTokenExpiresAt: expect.any(Date)
          })
        }),
        { returnDocument: 'after' }
      );
    });

    it('rejects refresh request when token has expired on server', async () => {
      const token = createRefreshToken();
      // findOneAndUpdate returns null because refreshTokenExpiresAt is in the past
      usersCollection.findOneAndUpdate.mockResolvedValue(null);

      const res = await request(app)
        .post('/api/auth/refresh')
        .set('Cookie', [`refreshToken=${token}`]);

      expect(res.status).toBe(403);
      expect(res.body.error).toContain('Invalid refresh token');
    });

    it('rejects reset password if token was already consumed in a concurrent request', async () => {
      const token = 'a'.repeat(64);
      usersCollection.findOne.mockResolvedValue({
        userId: 'user-reset-1',
        resetTokenExpiry: new Date(Date.now() + 3600000)
      });
      // Simultaneous second request causes matchedCount to be 0
      usersCollection.updateOne.mockResolvedValue({ matchedCount: 0 });

      const res = await request(app)
        .post('/api/auth/reset-password')
        .send({ token, password: 'NewStrongPassword123!' });

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('رابط غير صالح أو منتهي الصلاحية');
    });
  });
});

describe('Security Hardening Round 3 - OAuth pre-hijacking and save-design id bypass', () => {
  const jwtSecret = 'test-secret-key-round3-hardening-32bytes!';

  beforeAll(() => {
    process.env.JWT_SECRET = jwtSecret;
  });

  describe('OAuth account resolution', () => {
    const { resolveGoogleAccount } = require('../routes/auth.routes')._private;

    it('rejects a Google identity whose email is not verified', async () => {
      const users = {
        findOne: jest.fn(),
        insertOne: jest.fn(),
        updateOne: jest.fn()
      };

      await expect(resolveGoogleAccount(users, {
        id: 'google-1',
        email: 'victim@example.com',
        verified_email: false
      })).rejects.toMatchObject({ code: 'GOOGLE_EMAIL_NOT_VERIFIED' });

      expect(users.findOne).not.toHaveBeenCalled();
      expect(users.insertOne).not.toHaveBeenCalled();
      expect(users.updateOne).not.toHaveBeenCalled();
    });

    it('claims an unverified password signup and removes attacker persistence', async () => {
      const pendingUser = {
        userId: 'pending-1',
        email: 'victim@example.com',
        name: 'Pending',
        password: 'attacker-password-hash',
        refreshTokenHash: 'old-refresh',
        isVerified: false
      };
      const claimedUser = {
        userId: 'pending-1',
        email: 'victim@example.com',
        name: 'Pending',
        googleId: 'google-victim',
        isVerified: true
      };
      const users = {
        findOne: jest.fn()
          .mockResolvedValueOnce(null)
          .mockResolvedValueOnce(pendingUser)
          .mockResolvedValueOnce(claimedUser),
        insertOne: jest.fn(),
        updateOne: jest.fn().mockResolvedValue({ matchedCount: 1 })
      };

      const user = await resolveGoogleAccount(users, {
        id: 'google-victim',
        email: 'Victim@Example.com',
        verified_email: true,
        name: 'Victim'
      });

      expect(user).toEqual(claimedUser);
      expect(users.updateOne).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'pending-1',
          email: 'victim@example.com'
        }),
        expect.objectContaining({
          $set: expect.objectContaining({
            googleId: 'google-victim',
            isVerified: true
          }),
          $unset: expect.objectContaining({
            password: '',
            refreshTokenHash: '',
            refreshTokenExpiresAt: ''
          })
        })
      );
    });

    it('does not relink an email already bound to another Google identity', async () => {
      const users = {
        findOne: jest.fn()
          .mockResolvedValueOnce(null)
          .mockResolvedValueOnce({
            userId: 'linked-1',
            email: 'victim@example.com',
            googleId: 'google-original',
            isVerified: true
          }),
        insertOne: jest.fn(),
        updateOne: jest.fn()
      };

      await expect(resolveGoogleAccount(users, {
        id: 'google-attacker',
        email: 'victim@example.com',
        verified_email: true
      })).rejects.toMatchObject({ code: 'GOOGLE_ACCOUNT_CONFLICT' });

      expect(users.updateOne).not.toHaveBeenCalled();
    });
  });

  describe('save-design id handling', () => {
    function buildApp({ user, findOneImpl, count = 0 } = {}) {
      const designsCollection = {
        findOne: jest.fn(findOneImpl || (() => null)),
        countDocuments: jest.fn().mockResolvedValue(count),
        insertOne: jest.fn().mockResolvedValue({ insertedId: 'db-id' }),
        updateOne: jest.fn().mockResolvedValue({ matchedCount: 1 })
      };
      const usersCollection = {
        findOne: jest.fn().mockResolvedValue(user || {
          userId: 'user-1',
          email: 'user@example.com',
          isVerified: true
        })
      };
      const mockDb = {
        collection: jest.fn((name) => {
          if (name === 'designs') return designsCollection;
          if (name === 'users') return usersCollection;
          return {};
        })
      };
      const app = express();
      app.use(express.json());
      app.use('/api', createDesignsRouter({
        getDb: () => mockDb,
        designsCollectionName: 'designs',
        usersCollectionName: 'users',
        cardRequestsCollectionName: 'card_requests',
        savedCardsCollectionName: 'saved_cards',
        absoluteBaseUrl: () => 'https://mcprime.test',
        sanitizeDesignState: (state) => state,
        cloudinary: null
      }));

      return { app, designsCollection };
    }

    function tokenFor(userId = 'user-1') {
      return jwt.sign(
        { userId, email: 'user@example.com', type: 'access' },
        jwtSecret
      );
    }

    it('rejects unsafe client-supplied design ids', async () => {
      const { app, designsCollection } = buildApp();
      const res = await request(app)
        .post('/api/save-design?id=bad%3Cscript%3E')
        .set('Authorization', `Bearer ${tokenFor()}`)
        .send({ inputs: { 'input-name': 'Safe Name' } });

      expect(res.status).toBe(400);
      expect(res.body.code).toBe('INVALID_DESIGN_ID');
      expect(designsCollection.insertOne).not.toHaveBeenCalled();
    });

    it('cannot bypass the unverified-user creation limit with an unknown ?id=', async () => {
      const { app, designsCollection } = buildApp({
        user: {
          userId: 'user-1',
          email: 'user@example.com',
          isVerified: false
        },
        findOneImpl: () => null,
        count: 3
      });

      const res = await request(app)
        .post('/api/save-design?id=attackerCard01')
        .set('Authorization', `Bearer ${tokenFor()}`)
        .send({ inputs: { 'input-name': 'Fourth Card' } });

      expect(res.status).toBe(403);
      expect(res.body.code).toBe('EMAIL_NOT_VERIFIED');
      expect(designsCollection.insertOne).not.toHaveBeenCalled();
    });

    it('reuses the member card instead of creating another card for an unknown ?id=', async () => {
      let call = 0;
      const existingMemberDesign = {
        shortId: 'ownedCard1',
        ownerId: 'user-1',
        data: {}
      };
      const { app, designsCollection } = buildApp({
        findOneImpl: () => {
          call += 1;
          if (call === 1) return null;
          if (call === 2) return existingMemberDesign;
          return null;
        }
      });

      const res = await request(app)
        .post('/api/save-design?id=unknownCard1')
        .set('Authorization', `Bearer ${tokenFor()}`)
        .send({ inputs: { 'input-name': 'Updated Card' } });

      expect(res.status).toBe(200);
      expect(res.body.id).toBe('ownedCard1');
      expect(designsCollection.insertOne).not.toHaveBeenCalled();
      expect(designsCollection.updateOne).toHaveBeenCalledWith(
        { shortId: 'ownedCard1', ownerId: 'user-1' },
        expect.any(Object)
      );
    });
  });
});

