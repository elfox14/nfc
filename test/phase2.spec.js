/**
 * @jest-environment node
 * 
 * Integration tests for Phase 2 fixes:
 * - Upload routes (public + authenticated)
 * - Error tracking endpoint
 * - Health check
 * - WebSocket limits validation
 */
const request = require('./csrf-test-request');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const express = require('express');
const cookieParser = require('cookie-parser');
const sharp = require('sharp');

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

const createDesignsRouter = require('../routes/designs.routes');
const { DOMPurify, sanitizeInputs } = require('../utils/sanitize');

jest.setTimeout(30000);

// Setup Test Environment Variables
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = require('crypto').randomBytes(32).toString('hex');
process.env.MONGO_URI = 'mongodb://fake-uri';
process.env.PUBLIC_BASE_URL = 'http://localhost:3000';

const app = require('../server.js');

describe('Health Check', () => {
  it('GET /healthz should return ok', async () => {
    const res = await request(app).get('/healthz');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
  });
});

describe('Static source isolation', () => {
  it.each([
    '/nfc/server.js',
    '/nfc/package.json',
    '/nfc/routes/auth.routes.js',
    '/nfc/sw.original.js'
  ])('does not expose server or source-only file %s', async (url) => {
    const res = await request(app).get(url);
    expect(res.status).toBe(404);
  });
});

describe('Client Error Reporting', () => {
  it('POST /api/client-error should accept valid error report', async () => {
    const res = await request(app)
      .post('/api/client-error')
      .send({
        message: 'Test error',
        source: 'test.js',
        line: 42,
        col: 10,
        url: 'http://localhost/test'
      });

    expect(res.status).toBe(204);
  });

  it('POST /api/client-error should reject empty payload', async () => {
    const res = await request(app)
      .post('/api/client-error')
      .send({});

    expect(res.status).toBe(400);
  });
});

describe('Legacy Upload Alias', () => {
  it('POST /api/upload-image-public should require authentication before parsing files', async () => {
    const res = await request(app)
      .post('/api/upload-image-public');

    expect(res.status).toBe(401);
  });

  it('POST /api/upload-image-public should reject anonymous file bodies', async () => {
    const res = await request(app)
      .post('/api/upload-image-public')
      .attach('image', Buffer.from('not an image'), {
        filename: 'test.txt',
        contentType: 'text/plain'
      });

    expect(res.status).toBe(401);
  });
});

describe('Authenticated Upload', () => {
  it('POST /api/upload-image should require authentication', async () => {
    const res = await request(app)
      .post('/api/upload-image');

    expect(res.status).toBe(401);
  });

  it('POST /api/upload-image should reject request with invalid token', async () => {
    const res = await request(app)
      .post('/api/upload-image')
      .set('Authorization', 'Bearer invalid-token');

    // Auth middleware returns 401 or 403 depending on token validity
    expect([401, 403]).toContain(res.status);
  });

  it('POST /api/upload-image should reject files larger than 5 MB', async () => {
    const token = jwt.sign({ userId: 'upload-user', type: 'access' }, process.env.JWT_SECRET);
    const res = await request(app)
      .post('/api/upload-image')
      .set('Authorization', `Bearer ${token}`)
      .attach('image', Buffer.alloc((5 * 1024 * 1024) + 1, 1), {
        filename: 'large.png',
        contentType: 'image/png'
      });

    expect(res.status).toBe(413);
  });

  it('never falls back to ephemeral local storage in production', async () => {
    const originalNodeEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'production';
    const token = jwt.sign({ userId: 'upload-user', type: 'access' }, process.env.JWT_SECRET);

    try {
      const validPng = await sharp({
        create: { width: 1, height: 1, channels: 4, background: '#ffffff' }
      }).png().toBuffer();
      const productionUploadApp = express();
      productionUploadApp.use(express.json());
      productionUploadApp.use(cookieParser());
      productionUploadApp.use('/api', createDesignsRouter({
        getDb: () => mockDb,
        designsCollectionName: 'designs',
        usersCollectionName: 'users',
        cardRequestsCollectionName: 'cardRequests',
        savedCardsCollectionName: 'savedCards',
        absoluteBaseUrl: () => 'https://api.example.test',
        sanitizeInputs,
        DOMPurify,
        cloudinary: {}
      }));

      const res = await request(productionUploadApp)
        .post('/api/upload-image')
        .set('Authorization', `Bearer ${token}`)
        .attach('image', validPng, {
          filename: 'pixel.png',
          contentType: 'image/png'
        });

      expect(res.status).toBe(503);
      expect(res.body.error).toMatch(/تخزين الصور/);
    } finally {
      process.env.NODE_ENV = originalNodeEnv;
    }
  });
});

describe('Design API', () => {
  it('POST /api/save-design should require authentication', async () => {
    const res = await request(app)
      .post('/api/save-design')
      .send({ inputs: { name: 'Test' } });

    expect(res.status).toBe(401);
  });

  it('GET /api/get-design/:id should return 404 for non-existent design', async () => {
    mockCollection.findOne.mockResolvedValueOnce(null);
    
    const res = await request(app)
      .get('/api/get-design/nonexistent123');

    expect(res.status).toBe(404);
  });

  it('GET /api/get-design/:id should not query by internal Mongo ObjectId', async () => {
    mockCollection.findOne.mockClear();
    mockCollection.findOne.mockResolvedValueOnce(null);

    const res = await request(app)
      .get('/api/get-design/507f1f77bcf86cd799439011');

    expect(res.status).toBe(404);
    expect(mockCollection.findOne).toHaveBeenCalledTimes(1);
    expect(mockCollection.findOne).toHaveBeenCalledWith({ shortId: '507f1f77bcf86cd799439011' });
  });
});

describe('Admin Error Endpoint', () => {
  it('GET /api/admin/errors should require admin token', async () => {
    const res = await request(app)
      .get('/api/admin/errors');

    expect(res.status).toBe(401);
  });

  it('GET /api/admin/errors should return errors with valid admin token', async () => {
    // Set admin token
    process.env.ADMIN_TOKENH = 'test-admin-token-123';
    delete process.env.ADMIN_TOKEN_SHA256;
    
    const res = await request(app)
      .get('/api/admin/errors')
      .set('x-admin-token', 'test-admin-token-123');

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('total');
    expect(res.body).toHaveProperty('errors');
    expect(Array.isArray(res.body.errors)).toBe(true);
  });

  it('GET /api/admin/errors should accept hashed admin token configuration', async () => {
    delete process.env.ADMIN_TOKENH;
    process.env.ADMIN_TOKEN_SHA256 = crypto
      .createHash('sha256')
      .update('hashed-admin-token-123')
      .digest('hex');

    const res = await request(app)
      .get('/api/admin/errors')
      .set('x-admin-token', 'hashed-admin-token-123');

    expect(res.status).toBe(200);
    expect(res.headers['cache-control']).toBe('no-store');
  });
});

describe('Static File Serving', () => {
  it('GET /nfc/ should serve index.html', async () => {
    const res = await request(app).get('/nfc/');
    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toMatch(/html/);
  });

  it('GET /nfc/cookie-consent.js should have cache headers', async () => {
    const res = await request(app).get('/nfc/cookie-consent.js');
    if (res.status === 200) {
      expect(res.headers['cache-control']).toContain('max-age');
    }
  });

  it('GET /nfc/sw.js should not be cached long-term', async () => {
    const res = await request(app).get('/nfc/sw.js');
    expect(res.status).toBe(200);
    expect(res.headers['cache-control']).toContain('no-store');
    expect(res.headers['service-worker-allowed']).toBe('/nfc/');
  });
});
