/**
 * @jest-environment node
 */
const crypto = require('crypto');
const express = require('express');
const request = require('supertest');
const jwt = require('jsonwebtoken');
const createAdminRouter = require('../routes/admin.routes');
const createAuthRouter = require('../routes/auth.routes');

describe('Security Hardening Round 5 - session, OAuth, and action-token protections', () => {
  const originalEnv = { ...process.env };
  const jwtSecret = 'round5-jwt-secret-at-least-thirty-two-characters';
  const tokenHashSecret = 'round5-token-hash-secret-at-least-thirty-two-chars';

  beforeEach(() => {
    process.env.NODE_ENV = 'test';
    process.env.JWT_SECRET = jwtSecret;
    process.env.TOKEN_HASH_SECRET = tokenHashSecret;
    delete process.env.ADMIN_TOKENH;
    delete process.env.ADMIN_TOKEN_SHA256;
    delete process.env.GOOGLE_REDIRECT_URI;
    delete process.env.SITE_BASE_URL;
    process.env.PUBLIC_BASE_URL = 'https://mcprim.test/nfc';
  });

  afterAll(() => {
    process.env = { ...originalEnv };
  });

  it('uses the configured canonical OAuth callback instead of an attacker-controlled Host header', () => {
    const { getOAuthRedirectUri } = createAuthRouter._private;
    process.env.NODE_ENV = 'production';
    process.env.GOOGLE_REDIRECT_URI = 'https://nfc-vjy6.onrender.com/api/auth/google/callback';

    const req = {
      headers: { 'x-forwarded-proto': 'http' },
      protocol: 'http',
      get: jest.fn().mockReturnValue('attacker.example')
    };

    expect(getOAuthRedirectUri(req)).toBe('https://nfc-vjy6.onrender.com/api/auth/google/callback');
    expect(req.get).not.toHaveBeenCalled();
  });

  it('rejects insecure or malformed configured OAuth callback URLs', () => {
    const { getOAuthRedirectUri } = createAuthRouter._private;
    process.env.NODE_ENV = 'production';
    const req = { headers: {}, protocol: 'https', get: jest.fn() };

    process.env.GOOGLE_REDIRECT_URI = 'http://mcprim.com/api/auth/google/callback';
    expect(() => getOAuthRedirectUri(req)).toThrow(/HTTPS/i);

    process.env.GOOGLE_REDIRECT_URI = 'https://mcprim.com/not-the-callback';
    expect(() => getOAuthRedirectUri(req)).toThrow(/invalid/i);
  });

  it('escapes inline-script values so closing script tags cannot break out of the OAuth response', () => {
    const { serializeForInlineScript } = createAuthRouter._private;
    const serialized = serializeForInlineScript({
      name: '</script><script>alert(1)</script>'
    });

    expect(serialized).not.toContain('</script>');
    expect(serialized).toContain('\\u003c/script>');
  });

  it('builds reset and verification links with fragment tokens instead of query-string tokens', () => {
    const { buildFrontendActionUrl } = createAuthRouter._private;
    const url = buildFrontendActionUrl('reset-password.html', 'a+b/c');

    expect(url).toBe('https://mcprim.test/nfc/reset-password.html#token=a%2Bb%2Fc');
    expect(url).not.toContain('?token=');
  });

  it('rejects legacy verification records that have no server-side expiry', async () => {
    const token = 'a'.repeat(128);
    const users = {
      findOne: jest.fn().mockResolvedValue({
        userId: 'legacy-user',
        isVerified: false,
        verificationTokenExpiry: null
      }),
      updateOne: jest.fn()
    };
    const mockDb = {
      collection: jest.fn(() => users)
    };

    const app = express();
    app.use(express.json());
    app.use('/api/auth', createAuthRouter({
      getDb: () => mockDb,
      usersCollectionName: 'users',
      designsCollectionName: 'designs',
      savedCardsCollectionName: 'saved',
      cardRequestsCollectionName: 'requests',
      authLimiter: (req, res, next) => next(),
      allowedOrigins: ['https://mcprim.test'],
      cloudinary: null
    }));

    const res = await request(app)
      .post('/api/auth/verify-email')
      .send({ token });

    expect(res.status).toBe(400);
    expect(users.updateOne).not.toHaveBeenCalled();
  });

  it('does not accept a master secret directly on protected admin routes', async () => {
    const plaintext = 'master-secret-for-round5';
    process.env.ADMIN_TOKEN_SHA256 = crypto.createHash('sha256').update(plaintext).digest('hex');

    const mockDb = {
      collection: jest.fn(() => ({ findOne: jest.fn() }))
    };
    const app = express();
    app.use(express.json());
    app.use('/api/admin', createAdminRouter({
      getDb: () => mockDb,
      usersCollectionName: 'users',
      designsCollectionName: 'designs',
      cardRequestsCollectionName: 'requests',
      savedCardsCollectionName: 'saved'
    }));

    const direct = await request(app)
      .get('/api/admin/me')
      .set('x-admin-token', plaintext);
    expect(direct.status).toBe(401);

    const login = await request(app)
      .post('/api/admin/login')
      .send({ token: plaintext });
    expect(login.status).toBe(200);
    expect(jwt.decode(login.body.token).type).toBe('admin-master');

    const session = await request(app)
      .get('/api/admin/me')
      .set('Authorization', `Bearer ${login.body.token}`);
    expect(session.status).toBe(200);
  });

  it('rejects role-only admin JWTs that were not minted as admin sessions', async () => {
    const users = {
      findOne: jest.fn().mockResolvedValue({ role: 'admin', isAdmin: true })
    };
    const mockDb = { collection: jest.fn(() => users) };
    const app = express();
    app.use('/api/admin', createAdminRouter({
      getDb: () => mockDb,
      usersCollectionName: 'users',
      designsCollectionName: 'designs',
      cardRequestsCollectionName: 'requests',
      savedCardsCollectionName: 'saved'
    }));

    const untypedToken = jwt.sign(
      { userId: 'admin-1', role: 'admin' },
      jwtSecret,
      { expiresIn: '1h' }
    );
    const res = await request(app)
      .get('/api/admin/me')
      .set('Authorization', `Bearer ${untypedToken}`);

    expect(res.status).toBe(401);
    expect(users.findOne).not.toHaveBeenCalled();
  });
});
