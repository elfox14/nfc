'use strict';

const crypto = require('crypto');

const CSRF_COOKIE_NAME = 'csrfToken';
const CSRF_HEADER_NAME = 'X-CSRF-Token';
const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);
const EXEMPT_PATHS = new Set(['/track-event', '/client-error']);
const CSRF_TOKEN_MAX_AGE_MS = 60 * 60 * 1000;

function csrfCookieOptions() {
  const production = process.env.NODE_ENV === 'production';
  return {
    httpOnly: true,
    secure: production,
    sameSite: production ? 'none' : 'lax',
    signed: true,
    path: '/api',
    maxAge: CSRF_TOKEN_MAX_AGE_MS
  };
}

function createCsrfToken(secret) {
  const payload = `${Date.now() + CSRF_TOKEN_MAX_AGE_MS}.${crypto.randomBytes(32).toString('base64url')}`;
  const signature = crypto.createHmac('sha256', secret).update(payload).digest('base64url');
  return `${payload}.${signature}`;
}

function verifySignedCsrfToken(token, secret) {
  if (typeof token !== 'string') return false;

  const signatureSeparator = token.lastIndexOf('.');
  if (signatureSeparator <= 0) return false;

  const payload = token.slice(0, signatureSeparator);
  const suppliedSignature = token.slice(signatureSeparator + 1);
  const expiresAt = Number(payload.slice(0, payload.indexOf('.')));
  if (!Number.isSafeInteger(expiresAt) || expiresAt < Date.now()) return false;

  const expectedSignature = crypto.createHmac('sha256', secret).update(payload).digest('base64url');
  const expectedBytes = Buffer.from(expectedSignature);
  const suppliedBytes = Buffer.from(suppliedSignature);
  return expectedBytes.length === suppliedBytes.length
    && crypto.timingSafeEqual(expectedBytes, suppliedBytes);
}

function verifyCsrfToken(req, secret) {
  const signedCookieToken = req.signedCookies?.[CSRF_COOKIE_NAME];
  if (typeof signedCookieToken === 'string') {
    req.cookies[CSRF_COOKIE_NAME] = signedCookieToken;
  } else {
    delete req.cookies[CSRF_COOKIE_NAME];
  }

  const cookieToken = req.cookies[CSRF_COOKIE_NAME];
  const headerToken = req.get(CSRF_HEADER_NAME);

  if (!verifySignedCsrfToken(headerToken, secret)) return false;
  // Some cross-origin browsers block third-party cookies. When the signed
  // cookie is present, bind it to the header; otherwise the HMAC-protected
  // custom header remains the CSRF proof and preserves bearer fallback.
  return cookieToken === undefined || cookieToken === headerToken;
}

function registerCsrfProtection(app, secret = process.env.COOKIE_SIGNING_SECRET) {
  app.get('/api/csrf-token', (req, res) => {
    const csrfToken = createCsrfToken(secret);
    res.cookie(CSRF_COOKIE_NAME, csrfToken, csrfCookieOptions());
    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('Pragma', 'no-cache');
    res.json({ csrfToken });
  });

  app.use('/api', (req, res, next) => {
    if (SAFE_METHODS.has(req.method) || EXEMPT_PATHS.has(req.path)) return next();
    if (verifyCsrfToken(req, secret)) return next();

    return res.status(403).json({
      error: 'Invalid CSRF token',
      code: 'INVALID_CSRF_TOKEN'
    });
  });
}

module.exports = {
  registerCsrfProtection,
  verifyCsrfToken,
  createCsrfToken,
  verifySignedCsrfToken,
  csrfCookieOptions,
  CSRF_COOKIE_NAME,
  CSRF_HEADER_NAME
};
