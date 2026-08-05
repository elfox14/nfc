/**
 * @jest-environment node
 */

'use strict';

const jwt = require('jsonwebtoken');
const {
  createOAuthState,
  verifyOAuthState,
  oauthStateCookieOptions
} = require('../utils/oauth-state');

describe('Google OAuth state binding', () => {
  test('creates a signed, short-lived state bound to a random browser nonce', () => {
    const first = createOAuthState('en');
    const second = createOAuthState('en');

    expect(first.nonce).toMatch(/^[A-Za-z0-9_-]{40,}$/);
    expect(first.nonce).not.toBe(second.nonce);
    expect(first.state).not.toBe(second.state);
    expect(first.state.split('.')).toHaveLength(3);

    const payload = jwt.decode(first.state);
    expect(payload).toMatchObject({
      type: 'oauth-state',
      lang: 'en',
      nonce: first.nonce,
      iss: 'mcprime-nfc',
      aud: 'google-oauth'
    });
    expect(payload.exp - payload.iat).toBeLessThanOrEqual(10 * 60);
    expect(verifyOAuthState(first.state, first.nonce)).toEqual({ lang: 'en' });
  });

  test('rejects missing, tampered, and browser-mismatched state', () => {
    const { state } = createOAuthState('ar');

    expect(() => verifyOAuthState(state, undefined)).toThrow(/Missing OAuth state/);
    expect(() => verifyOAuthState(`${state.slice(0, -1)}x`, 'wrong')).toThrow();
    expect(() => verifyOAuthState(state, createOAuthState('ar').nonce)).toThrow(/does not match/);
  });

  test('uses an HttpOnly SameSite cookie scoped to the OAuth flow', () => {
    expect(oauthStateCookieOptions()).toMatchObject({
      httpOnly: true,
      sameSite: 'lax',
      path: '/api/auth/google',
      maxAge: 10 * 60 * 1000
    });
  });
});
