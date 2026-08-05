const crypto = require('crypto');
const jwt = require('jsonwebtoken');

const OAUTH_STATE_COOKIE = 'oauthStateNonce';
const OAUTH_STATE_TTL_MS = 10 * 60 * 1000;

function getSigningSecret() {
  const secret = process.env.TOKEN_HASH_SECRET || process.env.JWT_SECRET;
  if (!secret) throw new Error('OAuth state signing secret is not configured.');
  return secret;
}

function createOAuthState(lang) {
  const nonce = crypto.randomBytes(32).toString('base64url');
  const state = jwt.sign(
    { type: 'oauth-state', nonce, lang: lang === 'en' ? 'en' : 'ar' },
    getSigningSecret(),
    {
      expiresIn: Math.floor(OAUTH_STATE_TTL_MS / 1000),
      issuer: 'mcprime-nfc',
      audience: 'google-oauth'
    }
  );

  return { nonce, state };
}

function verifyOAuthState(state, cookieNonce) {
  if (typeof state !== 'string' || typeof cookieNonce !== 'string') {
    throw new Error('Missing OAuth state binding.');
  }

  const payload = jwt.verify(state, getSigningSecret(), {
    issuer: 'mcprime-nfc',
    audience: 'google-oauth'
  });

  if (payload.type !== 'oauth-state' || typeof payload.nonce !== 'string') {
    throw new Error('Invalid OAuth state payload.');
  }

  const signedNonce = Buffer.from(payload.nonce);
  const browserNonce = Buffer.from(cookieNonce);
  if (
    signedNonce.length !== browserNonce.length ||
    !crypto.timingSafeEqual(signedNonce, browserNonce)
  ) {
    throw new Error('OAuth state does not match this browser session.');
  }

  return { lang: payload.lang === 'en' ? 'en' : 'ar' };
}

function oauthStateCookieOptions() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/api/auth/google',
    maxAge: OAUTH_STATE_TTL_MS
  };
}

function clearOAuthStateCookieOptions() {
  const options = oauthStateCookieOptions();
  delete options.maxAge;
  return options;
}

module.exports = {
  OAUTH_STATE_COOKIE,
  createOAuthState,
  verifyOAuthState,
  oauthStateCookieOptions,
  clearOAuthStateCookieOptions
};
