/**
 * @jest-environment node
 */
const express = require('express');
const request = require('supertest');
const jwt = require('jsonwebtoken');
const createDesignsRouter = require('../routes/designs.routes');
const createAuthRouter = require('../routes/auth.routes');
const { sanitizeDesignState } = require('../utils/sanitize');

describe('Security Hardening Round 3 Tests', () => {
  const jwtSecret = 'test-round3-hardening-secret-key-32b!';

  beforeAll(() => {
    process.env.JWT_SECRET = jwtSecret;
  });

  describe('1. Sanitizer preserves sharedToGallery boolean', () => {
    it('preserves sharedToGallery when true or false', () => {
      const sanitizedTrue = sanitizeDesignState({
        inputs: { name: 'Card' },
        sharedToGallery: true
      });
      expect(sanitizedTrue.sharedToGallery).toBe(true);

      const sanitizedFalse = sanitizeDesignState({
        inputs: { name: 'Card' },
        sharedToGallery: false
      });
      expect(sanitizedFalse.sharedToGallery).toBe(false);
    });

    it('omits sharedToGallery when not a boolean', () => {
      const sanitized = sanitizeDesignState({
        inputs: { name: 'Card' },
        sharedToGallery: 'yes'
      });
      expect(sanitized.sharedToGallery).toBeUndefined();
    });
  });

  describe('2. Design Limits and shortId protection in save-design', () => {
    let app, designsCollection, usersCollection, mockDb, userAccessToken;

    beforeEach(() => {
      userAccessToken = jwt.sign(
        { userId: 'user-unverified', email: 'unverified@test.com', type: 'access' },
        jwtSecret
      );
      designsCollection = {
        findOne: jest.fn(),
        countDocuments: jest.fn(),
        insertOne: jest.fn().mockResolvedValue({ insertedId: 'design-1' }),
        updateOne: jest.fn().mockResolvedValue({ matchedCount: 1 })
      };
      usersCollection = {
        findOne: jest.fn().mockResolvedValue({
          userId: 'user-unverified',
          email: 'unverified@test.com',
          isVerified: false
        })
      };
      mockDb = {
        collection: jest.fn((name) => {
          if (name === 'designs') return designsCollection;
          if (name === 'users') return usersCollection;
          return {};
        })
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

    it('rejects invalid format for query id', async () => {
      const res = await request(app)
        .post('/api/save-design?id=../malicious/id')
        .set('Authorization', `Bearer ${userAccessToken}`)
        .send({ inputs: { 'input-name': 'Test' } });

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('Invalid design ID');
    });

    it('blocks unverified user from creating a 4th card via arbitrary ?id=', async () => {
      // Design not found in DB -> would create new
      designsCollection.findOne.mockResolvedValue(null);
      // Already has 3 cards
      designsCollection.countDocuments.mockResolvedValue(3);

      const res = await request(app)
        .post('/api/save-design?id=arbitrary123')
        .set('Authorization', `Bearer ${userAccessToken}`)
        .send({ inputs: { 'input-name': '4th card' } });

      expect(res.status).toBe(403);
      expect(res.body.code).toBe('EMAIL_NOT_VERIFIED');
      expect(designsCollection.insertOne).not.toHaveBeenCalled();
    });

    it('assigns a secure server-generated shortId and ignores arbitrary non-existent ?id=', async () => {
      // Verified user
      usersCollection.findOne.mockResolvedValue({
        userId: 'user-verified',
        isVerified: true
      });
      const verifiedToken = jwt.sign(
        { userId: 'user-verified', email: 'v@test.com', type: 'access' },
        jwtSecret
      );
      // Design not found in DB and user has no previous design
      designsCollection.findOne.mockResolvedValue(null);

      const res = await request(app)
        .post('/api/save-design?id=attacker_id')
        .set('Authorization', `Bearer ${verifiedToken}`)
        .send({ inputs: { 'input-name': 'My Card' } });

      expect(res.status).toBe(200);
      expect(res.body.id).toBeDefined();
      expect(res.body.id).not.toBe('attacker_id');
      expect(designsCollection.insertOne).toHaveBeenCalledWith(
        expect.objectContaining({
          shortId: expect.not.stringMatching(/^attacker_id$/),
          ownerId: 'user-verified'
        })
      );
    });
  });

  describe('3. Gallery omits internal Mongo _id', () => {
    let app, designsCollection, mockDb;

    beforeEach(() => {
      designsCollection = {
        countDocuments: jest.fn().mockResolvedValue(1),
        find: jest.fn(() => ({
          project: jest.fn().mockReturnThis(),
          sort: jest.fn().mockReturnThis(),
          skip: jest.fn().mockReturnThis(),
          limit: jest.fn().mockReturnThis(),
          toArray: jest.fn().mockResolvedValue([
            {
              shortId: 'gal-card-1',
              createdAt: '2026-01-01',
              views: 10,
              data: {
                publishedState: {
                  inputs: { 'input-name_ar': 'بطاقة تجريبية' },
                  sharedToGallery: true
                }
              }
            }
          ])
        }))
      };
      mockDb = {
        collection: jest.fn(() => designsCollection)
      };

      app = express();
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

    it('does not include _id in public gallery results', async () => {
      const res = await request(app).get('/api/gallery');
      expect(res.status).toBe(200);
      expect(res.body.designs).toHaveLength(1);
      expect(res.body.designs[0]._id).toBeUndefined();
      expect(res.body.designs[0].shortId).toBe('gal-card-1');
    });
  });

  describe('4. Account Pre-Hijacking Protection in Login Route', () => {
    let app, usersCollection, mockDb;

    beforeEach(() => {
      usersCollection = {
        findOne: jest.fn()
      };
      mockDb = {
        collection: jest.fn(() => usersCollection)
      };

      app = express();
      app.use(express.json());
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

    it('rejects password login cleanly when account has no password (e.g. wiped after Google claim)', async () => {
      // User claimed by Google OAuth, password field was unset ($unset: { password: "" })
      usersCollection.findOne.mockResolvedValue({
        userId: 'claimed-user',
        email: 'claimed@test.com',
        googleId: 'google-123',
        isVerified: true
        // No password field
      });

      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: 'claimed@test.com', password: 'attacker-old-password' });

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('Invalid credentials');
    });
  });
});
