/**
 * @jest-environment node
 */
const fs = require('fs');
const path = require('path');
const request = require('supertest');
const jwt = require('jsonwebtoken');
const express = require('express');
const cookieParser = require('cookie-parser');
const createDesignsRouter = require('../routes/designs.routes');
const { hashToken } = require('../utils/tokens');

describe('Security Hardening Audit Regressions (P0 & P1)', () => {
  describe('1. Dedicated Secrets without Fallback', () => {
    test('hashToken throws if TOKEN_HASH_SECRET is missing', () => {
      const origSecret = process.env.TOKEN_HASH_SECRET;
      try {
        delete process.env.TOKEN_HASH_SECRET;
        expect(() => hashToken('test-token')).toThrow(/TOKEN_HASH_SECRET must be configured/);
      } finally {
        process.env.TOKEN_HASH_SECRET = origSecret;
      }
    });

    test('tokens.js does not fall back to JWT_SECRET', () => {
      const tokensCode = fs.readFileSync(path.join(__dirname, '../utils/tokens.js'), 'utf8');
      expect(tokensCode).not.toContain('process.env.TOKEN_HASH_SECRET || process.env.JWT_SECRET');
    });

    test('oauth-state.js does not fall back to JWT_SECRET', () => {
      const oauthCode = fs.readFileSync(path.join(__dirname, '../utils/oauth-state.js'), 'utf8');
      expect(oauthCode).not.toContain('process.env.TOKEN_HASH_SECRET || process.env.JWT_SECRET');
    });
  });

  describe('2. WebSocket Security Hardening', () => {
    test('realtime-collaboration.js configures maxPayload and origin validation', () => {
      const wsCode = fs.readFileSync(path.join(__dirname, '../utils/realtime-collaboration.js'), 'utf8');
      expect(wsCode).toContain('maxPayload: WS_LIMITS.MAX_MESSAGE_SIZE');
      expect(wsCode).toContain('isAllowedOrigin(origin, allowedOrigins)');
      expect(wsCode).toContain('Rate limit exceeded repeatedly');
    });

    test('server.js passes allowedOrigins to registerRealtimeCollaboration', () => {
      const serverCode = fs.readFileSync(path.join(__dirname, '../server.js'), 'utf8');
      expect(serverCode).toMatch(/registerRealtimeCollaboration\(\s*server,\s*\{[\s\S]*allowedOrigins/);
    });
  });

  describe('3. Upload Magic Bytes Validation', () => {
    let app;
    const token = jwt.sign({ userId: 'u-audit', type: 'access' }, process.env.JWT_SECRET);

    beforeAll(() => {
      app = express();
      app.use(cookieParser());
      app.use('/api', createDesignsRouter({
        getDb: () => ({ collection: () => ({}) }),
        designsCollectionName: 'designs',
        usersCollectionName: 'users',
        cardRequestsCollectionName: 'cardRequests',
        savedCardsCollectionName: 'savedCards',
        absoluteBaseUrl: () => 'http://localhost',
        sanitizeDesignState: s => s,
        cloudinary: {}
      }));
    });

    test('rejects fake PNG file containing text or SVG payload', async () => {
      const fakePng = Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>');
      const res = await request(app)
        .post('/api/upload-image')
        .set('Authorization', `Bearer ${token}`)
        .attach('image', fakePng, { filename: 'malicious.png', contentType: 'image/png' });

      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/غير صالح/);
    });

    test('rejects executable / script file disguised as JPEG', async () => {
      const fakeJpeg = Buffer.from('#!/bin/bash\necho hacked\n');
      const res = await request(app)
        .post('/api/upload-image')
        .set('Authorization', `Bearer ${token}`)
        .attach('image', fakeJpeg, { filename: 'exploit.jpg', contentType: 'image/jpeg' });

      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/غير صالح/);
    });
  });

  describe('4. Account-Aware Rate Limiting', () => {
    test('server.js configures accountLimiter on login and forgot-password', () => {
      const serverCode = fs.readFileSync(path.join(__dirname, '../server.js'), 'utf8');
      expect(serverCode).toContain('const accountLimiter = rateLimit');
      expect(serverCode).toContain('acct_${email}');
      expect(serverCode).toContain("app.use('/api/auth/login', accountLimiter)");
      expect(serverCode).toContain("app.use('/api/auth/forgot-password', accountLimiter)");
    });
  });
});
