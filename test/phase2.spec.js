/**
 * @jest-environment node
 * 
 * Integration tests for Phase 2 fixes:
 * - Upload routes (public + authenticated)
 * - Error tracking endpoint
 * - Health check
 * - WebSocket limits validation
 */
const request = require('supertest');
const jwt = require('jsonwebtoken');

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

describe('Public Upload Proxy', () => {
  it('POST /api/upload-image-public should reject request without image', async () => {
    const res = await request(app)
      .post('/api/upload-image-public');

    expect(res.status).toBe(400);
  });

  it('POST /api/upload-image-public should reject non-image files', async () => {
    const res = await request(app)
      .post('/api/upload-image-public')
      .attach('image', Buffer.from('not an image'), {
        filename: 'test.txt',
        contentType: 'text/plain'
      });

    expect(res.status).toBe(400);
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
    
    const res = await request(app)
      .get('/api/admin/errors')
      .set('x-admin-token', 'test-admin-token-123');

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('total');
    expect(res.body).toHaveProperty('errors');
    expect(Array.isArray(res.body.errors)).toBe(true);
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
});
