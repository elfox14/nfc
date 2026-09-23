const express = require('express');
const { body, validationResult } = require('express-validator');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { nanoid } = require('nanoid');
const EmailService = require('../email-service');
const { createAccessToken, createRefreshToken, hashToken, isOpaqueToken } = require('../utils/tokens');
const { createVerifyToken, normalizeSessionVersion } = require('../auth-middleware');
const { passwordValidator } = require('../utils/password-policy');
const { redactSensitiveData } = require('../utils/error-tracking');
const { setAuthCookies, clearAuthCookies, REFRESH_TOKEN_MAX_AGE_MS } = require('../utils/auth-cookies');
const {
  OAUTH_STATE_COOKIE,
  createOAuthState,
  verifyOAuthState,
  oauthStateCookieOptions,
  clearOAuthStateCookieOptions
} = require('../utils/oauth-state');
const { isSafeCollabId } = require('../utils/websocket-security');
const {
  LEADS_COLLECTION_NAME,
  cleanupUserOwnedData
} = require('../utils/data-cleanup');

function isSafeDesignId(value) {
  return typeof value === 'string' && /^[A-Za-z0-9_-]{3,32}$/.test(value);
}

function createOAuthAccountError(message, code) {
  const error = new Error(message);
  error.code = code;
  return error;
}

function getOAuthRedirectUri(req) {
  const explicitRedirect = (process.env.GOOGLE_REDIRECT_URI || '').trim();
  const renderHostname = (process.env.RENDER_EXTERNAL_HOSTNAME || '').trim();
  const siteBase = (process.env.SITE_BASE_URL || '').trim().replace(/\/+$/, '');
  const candidate = explicitRedirect ||
    (renderHostname ? `https://${renderHostname}/api/auth/google/callback` : '') ||
    (process.env.NODE_ENV !== 'production' && siteBase
      ? `${siteBase}/api/auth/google/callback`
      : '');

  if (!candidate) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('Google OAuth redirect URI is not configured for production.');
    }
    const protoHeader = req.headers['x-forwarded-proto'];
    const proto = protoHeader ? protoHeader.split(',')[0].trim() : req.protocol;
    return `${proto}://${req.get('host')}/api/auth/google/callback`;
  }

  let parsed;
  try {
    parsed = new URL(candidate);
  } catch {
    throw new Error('Configured Google OAuth redirect URI is invalid.');
  }

  if (
    !['http:', 'https:'].includes(parsed.protocol) ||
    parsed.username ||
    parsed.password ||
    parsed.hash ||
    parsed.search ||
    parsed.pathname !== '/api/auth/google/callback'
  ) {
    throw new Error('Configured Google OAuth redirect URI is invalid.');
  }

  if (process.env.NODE_ENV === 'production' && parsed.protocol !== 'https:') {
    throw new Error('Google OAuth redirect URI must use HTTPS in production.');
  }

  return parsed.href;
}

function serializeForInlineScript(value) {
  const serialized = JSON.stringify(value);
  if (serialized === undefined) return 'undefined';
  return serialized
    .replace(/</g, '\\u003c')
    .replace(/\u2028/g, '\\u2028')
    .replace(/\u2029/g, '\\u2029');
}

function buildFrontendActionUrl(pathname, token) {
  const baseUrl = (process.env.PUBLIC_BASE_URL || 'https://mcprim.com/nfc').replace(/\/+$/, '');
  return `${baseUrl}/${pathname}#token=${encodeURIComponent(token)}`;
}

function sessionVersionMatch(version) {
  const normalized = normalizeSessionVersion(version);
  if (normalized === 0) {
    return {
      $or: [
        { sessionVersion: 0 },
        { sessionVersion: null },
        { sessionVersion: { $exists: false } }
      ]
    };
  }
  return { sessionVersion: normalized };
}

function sessionVersionUserFilter(userId, version) {
  return { userId, ...sessionVersionMatch(version) };
}

function readAccessToken(req) {
  const authHeader = req.headers?.authorization;
  if (typeof authHeader === 'string' && authHeader.startsWith('Bearer ')) {
    return authHeader.slice(7).trim();
  }
  return req.cookies?.accessToken || '';
}

async function resolveGoogleAccount(users, googleUser) {
  const googleId = typeof googleUser?.id === 'string' ? googleUser.id.trim() : '';
  const email = typeof googleUser?.email === 'string' ? googleUser.email.trim().toLowerCase() : '';
  const emailVerified = googleUser?.verified_email === true || googleUser?.email_verified === true;

  if (!googleId || !email || !emailVerified) {
    throw createOAuthAccountError('Google account email must be verified.', 'GOOGLE_EMAIL_NOT_VERIFIED');
  }

  let user = await users.findOne({ googleId });
  if (user) return user;

  const emailUser = await users.findOne({ email });
  if (!emailUser) {
    const newUser = {
      userId: nanoid(10),
      email,
      name: googleUser.name || email.split('@')[0],
      googleId,
      isVerified: true,
      sessionVersion: 0,
      createdAt: new Date()
    };
    await users.insertOne(newUser);
    return newUser;
  }

  if (emailUser.googleId && emailUser.googleId !== googleId) {
    throw createOAuthAccountError(
      'This email is already linked to another Google account.',
      'GOOGLE_ACCOUNT_CONFLICT'
    );
  }

  if (emailUser.googleId === googleId) return emailUser;

  const setFields = { googleId, isVerified: true };
  if (!emailUser.name && googleUser.name) setFields.name = googleUser.name;

  const update = { $set: setFields };
  if (!emailUser.isVerified) {
    update.$unset = {
      password: '',
      verificationTokenHash: '',
      verificationTokenExpiry: '',
      resetTokenHash: '',
      resetTokenExpiry: '',
      refreshTokenHash: '',
      refreshTokenExpiresAt: '',
      usedRefreshTokens: '',
      sessionInitTokenHash: '',
      sessionInitTokenExpiry: ''
    };
    update.$inc = { sessionVersion: 1 };
  }

  const linkResult = await users.updateOne(
    {
      userId: emailUser.userId,
      email,
      $or: [
        { googleId: { $exists: false } },
        { googleId: null },
        { googleId }
      ]
    },
    update
  );

  if (linkResult.matchedCount !== 1) {
    throw createOAuthAccountError(
      'Google account linking changed during sign-in.',
      'GOOGLE_ACCOUNT_CONFLICT'
    );
  }

  const linkedUser = await users.findOne({ userId: emailUser.userId });
  return linkedUser || { ...emailUser, ...setFields };
}

module.exports = function createAuthRouter({
  getDb,
  usersCollectionName,
  designsCollectionName,
  savedCardsCollectionName,
  cardRequestsCollectionName,
  authLimiter,
  allowedOrigins,
  cloudinary
}) {
  const router = express.Router();
  const verifyToken = createVerifyToken({ getDb, usersCollectionName });

  router.use((req, res, next) => {
    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('Pragma', 'no-cache');
    next();
  });

  // Rate Limiting is already applied in server.js globally for some paths, but we can re-apply if needed
  // For now, we just map the routes over.

// --- AUTHENTICATION ROUTES ---

// Register
router.post('/register', [
  body('email').isEmail().normalizeEmail(),
  body('password').custom((value, { req }) =>
    passwordValidator(value, { email: req.body.email, name: req.body.name })),
  body('name').trim().escape().notEmpty()
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    if (!getDb()) return res.status(500).json({ error: 'DB not connected' });

    const { email, password, name } = req.body;

    // Check if user exists
    const existingUser = await getDb().collection(usersCollectionName).findOne({ email });
    if (existingUser) {
      return res.status(400).json({ error: 'User already exists' });
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Create user
    const userId = nanoid(10);
    await getDb().collection(usersCollectionName).insertOne({
      userId,
      email,
      password: hashedPassword,
      name,
      isVerified: false,
      sessionVersion: 0,
      createdAt: new Date()
    });

    // Generate opaque verification token. The URL token carries no readable user data.
    const verificationToken = createRefreshToken();
    const verificationTokenExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000);

    // Store verification token hash
    await getDb().collection(usersCollectionName).updateOne(
      { userId },
      { $set: { verificationTokenHash: hashToken(verificationToken), verificationTokenExpiry } }
    );

    // Send verification email (non-blocking)
    const verifyUrl = buildFrontendActionUrl('verify-email.html', verificationToken);
    try {
      const emailTemplate = EmailService.verificationEmail(name, verifyUrl);
      await EmailService.send({ to: email, ...emailTemplate });
    } catch (emailErr) {
      console.warn('[Register] Email sending failed (non-blocking):', emailErr.message);
    }

    // Generate short-lived access token + HttpOnly refresh cookie
    const accessToken = createAccessToken({ userId, email, sessionVersion: 0 });
    const refreshTokenValue = createRefreshToken();
    const hashedRefresh = hashToken(refreshTokenValue);
    const refreshTokenExpiresAt = new Date(Date.now() + REFRESH_TOKEN_MAX_AGE_MS);

    // Store hashed refresh token in DB with server-side expiry
    await getDb().collection(usersCollectionName).updateOne(
      { userId },
      {
        $set: { refreshTokenHash: hashedRefresh, refreshTokenExpiresAt },
        $unset: { usedRefreshTokens: '' }
      }
    );

    setAuthCookies(res, { accessToken, refreshToken: refreshTokenValue });

    res.status(201).json({
      success: true,
      accessToken,
      user: { name, email, userId, isVerified: false }
    });

  } catch (err) {
    if (err.code === 11000) {
      console.warn('Register duplicate error:', err);
      return res.status(400).json({ error: 'User already exists' });
    }
    console.error('Register error:', err);
    res.status(500).json({ error: 'Registration failed' });
  }
});

// Login
router.post('/login', [
  body('email').isEmail().normalizeEmail(),
  body('password').isLength({ max: 128 }).withMessage('Password too long')
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    console.warn('[Login] Validation failed:', errors.array());
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    if (!getDb()) {
      console.error('[Login] Database not connected');
      return res.status(500).json({ error: 'DB not connected' });
    }

    const { email, password } = req.body;
    // Login attempt logged without PII

    const user = await getDb().collection(usersCollectionName).findOne({ email });
    if (!user || !user.password) {
      return res.status(400).json({ error: 'Invalid credentials' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ error: 'Invalid credentials' });
    }

    // A new login replaces the account's single active refresh session and
    // increments the session version so older access JWTs stop working immediately.
    const loginSessionVersion = normalizeSessionVersion(user.sessionVersion) + 1;
    const refreshTokenValue = createRefreshToken();
    const hashedRefresh = hashToken(refreshTokenValue);
    const refreshTokenExpiresAt = new Date(Date.now() + REFRESH_TOKEN_MAX_AGE_MS);

    await getDb().collection(usersCollectionName).updateOne(
      { userId: user.userId },
      {
        $set: {
          refreshTokenHash: hashedRefresh,
          refreshTokenExpiresAt,
          sessionVersion: loginSessionVersion
        },
        $unset: {
          usedRefreshTokens: '',
          sessionInitTokenHash: '',
          sessionInitTokenExpiry: ''
        }
      }
    );

    const accessToken = createAccessToken({
      userId: user.userId,
      email: user.email,
      sessionVersion: loginSessionVersion
    });

    setAuthCookies(res, { accessToken, refreshToken: refreshTokenValue });

    console.log(`[Login] Successful login for userId: ${user.userId}`);
    // Include isVerified so frontend can show the verification reminder. The
    // short-lived token is a tab-scoped fallback when cross-origin cookies fail.
    const loginResponse = { 
      success: true, 
      accessToken,
      user: { name: user.name, email: user.email, userId: user.userId, isVerified: !!user.isVerified } 
    };
    if (!user.isVerified) {
      loginResponse.warning = 'email_not_verified';
    }
    res.json(loginResponse);

  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Login failed' });
  }
});

// Google OAuth - Initiate Flow
router.get('/google', (req, res) => {
  let clientId = process.env.GOOGLE_CLIENT_ID;
  if (!clientId) {
    return res.status(500).send('Google OAuth not configured');
  }
  clientId = clientId.trim();

  let redirectUri;
  try {
    redirectUri = getOAuthRedirectUri(req);
  } catch (redirectError) {
    console.error('[GoogleOAuth] Redirect URI configuration error:', redirectError.message);
    return res.status(500).send('Google OAuth redirect URI is not configured securely');
  }

  const lang = (req.query.lang === 'en') ? 'en' : 'ar';
  const { nonce, state } = createOAuthState(lang);
  res.cookie(OAUTH_STATE_COOKIE, nonce, oauthStateCookieOptions());

  const scope = 'email profile';
  const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&scope=${encodeURIComponent(scope)}&access_type=offline&prompt=consent&state=${encodeURIComponent(state)}`;

  res.redirect(authUrl);
});

// Google OAuth - Callback Handler
router.get('/google/callback', async (req, res) => {
  const { code, error, state } = req.query;

  let lang = 'ar';
  try {
    const verifiedState = verifyOAuthState(state, req.cookies?.[OAUTH_STATE_COOKIE]);
    lang = verifiedState.lang;
  } catch (stateError) {
    res.clearCookie(OAUTH_STATE_COOKIE, clearOAuthStateCookieOptions());
    const frontendBase = (process.env.PUBLIC_BASE_URL || 'https://mcprim.com/nfc').replace(/\/$/, '');
    return res.redirect(`${frontendBase}/login.html?error=invalid_oauth_state`);
  }
  res.clearCookie(OAUTH_STATE_COOKIE, clearOAuthStateCookieOptions());

  // Build the absolute redirect URL to the FRONTEND (mcprim.com), not the Render backend
  const frontendBase = (process.env.PUBLIC_BASE_URL || 'https://mcprim.com/nfc').replace(/\/$/, '');
  const loginPage = lang === 'en'
    ? `${frontendBase}/login-en.html`
    : `${frontendBase}/login.html`;


  if (error || !code) {
    const safeError = encodeURIComponent(String(error || 'google_auth_failed').replace(/[^a-zA-Z0-9_ -]/g, ''));
    return res.redirect(`${loginPage}?error=${safeError}`);
  }

  try {
    if (!getDb()) {
      const safeError = encodeURIComponent('خدمة قاعدة البيانات غير متوفرة حالياً، يرجى المحاولة لاحقاً.');
      return res.redirect(`${loginPage}?error=${safeError}`);
    }

    const clientId = (process.env.GOOGLE_CLIENT_ID || '').trim();
    const clientSecret = (process.env.GOOGLE_CLIENT_SECRET || '').trim();
    
    const redirectUri = getOAuthRedirectUri(req);

    // Exchange code for tokens
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code: code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code'
      }).toString()
    });

    const tokens = await tokenResponse.json();
    if (!tokens.access_token) {
      console.error('Google Token API Error:', redactSensitiveData(tokens));
      throw new Error(tokens.error_description || tokens.error || 'No access token');
    }

    // Get user info
    const userInfoResponse = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: { Authorization: `Bearer ${tokens.access_token}` }
    });
    const googleUser = await userInfoResponse.json();

    if (!userInfoResponse.ok) {
      console.error('Google UserInfo Error:', redactSensitiveData(googleUser));
      throw new Error('Failed to retrieve Google user profile');
    }

    let user;
    try {
      user = await resolveGoogleAccount(
        getDb().collection(usersCollectionName),
        googleUser
      );
    } catch (accountError) {
      if (accountError.code === 'GOOGLE_EMAIL_NOT_VERIFIED') {
        return res.redirect(`${frontendBase}/login.html?error=unverified_google_email`);
      }
      if (accountError.code === 'GOOGLE_ACCOUNT_CONFLICT') {
        return res.redirect(`${frontendBase}/login.html?error=oauth_conflict`);
      }
      throw accountError;
    }

    // Google login also replaces the account's single active refresh session.
    const oauthSessionVersion = normalizeSessionVersion(user.sessionVersion) + 1;
    const refreshTokenValue = createRefreshToken();
    const hashedRefresh = hashToken(refreshTokenValue);
    const refreshTokenExpiresAt = new Date(Date.now() + REFRESH_TOKEN_MAX_AGE_MS);

    await getDb().collection(usersCollectionName).updateOne(
      { userId: user.userId },
      {
        $set: {
          refreshTokenHash: hashedRefresh,
          refreshTokenExpiresAt,
          sessionVersion: oauthSessionVersion
        },
        $unset: { usedRefreshTokens: '' }
      }
    );

    const accessToken = createAccessToken({
      userId: user.userId,
      email: user.email,
      sessionVersion: oauthSessionVersion
    });

    setAuthCookies(res, { accessToken, refreshToken: refreshTokenValue });

    // Build the dashboard URL for fallback redirect
    // SECURITY: Token is already in HttpOnly cookies — do NOT put it in URL hash
    const dashboardPage = lang === 'en'
      ? `${frontendBase}/dashboard-en.html`
      : `${frontendBase}/dashboard.html`;



    // SECURITY: Generate a very short-lived (60s), one-time-use token to initialize the session
    // This allows the SPA to boot even if third-party cookies are blocked by the browser.
    const sessionInitToken = jwt.sign(
      {
        userId: user.userId,
        email: user.email,
        type: 'session-init',
        sessionVersion: oauthSessionVersion,
        jti: nanoid(16)
      },
      process.env.JWT_SECRET,
      { expiresIn: '60s' }
    );

    // Store only a hash so the initialization token is short-lived and one-time.
    await getDb().collection(usersCollectionName).updateOne(
      { userId: user.userId },
      {
        $set: {
          sessionInitTokenHash: hashToken(sessionInitToken),
          sessionInitTokenExpiry: new Date(Date.now() + 60 * 1000)
        }
      }
    );

    // Send success signal to popup opener via postMessage
    const script = `
      (function() {
        var hasOpener = false;
        try {
          hasOpener = !!(window.opener && !window.opener.closed);
        } catch (e) {}

        // BroadcastChannel fallback — works even when COOP blocks window.opener
        try {
          var bc = new BroadcastChannel('mcprime-auth');
          bc.postMessage({
            type: 'google-auth',
            success: true,
            initToken: ${serializeForInlineScript(sessionInitToken)},
            user: ${serializeForInlineScript({ userId: user.userId, email: user.email, name: user.name })}
          });
          bc.close();
        } catch (e) { /* BroadcastChannel not supported */ }

        if (hasOpener) {
          // Path 1: Popup flow — send success signal to opener, then close
          try {
            var msg = {
              type: 'google-auth',
              success: true,
              initToken: ${serializeForInlineScript(sessionInitToken)},
              user: ${serializeForInlineScript({ userId: user.userId, email: user.email, name: user.name })}
            };
            var origins = ${serializeForInlineScript(allowedOrigins)};
            origins.forEach(function(base) {
              try {
                window.opener.postMessage(msg, base);
                // Also try variant (www <-> non-www) to ensure target match
                if (base.includes('://www.')) {
                  window.opener.postMessage(msg, base.replace('://www.', '://'));
                } else {
                  window.opener.postMessage(msg, base.replace('://', '://www.'));
                }
              } catch (e) {}
            });
          } catch (e) { console.error('[GoogleAuth] postMessage failed:', e); }

          // Close the popup
          window.close();

          // If popup didn't close, fallback to redirect (pass initToken to bypass cookie blocking)
          setTimeout(function() {
            window.location.replace(${serializeForInlineScript(dashboardPage)} + '#oauthSuccess=1&initToken=' + encodeURIComponent(${serializeForInlineScript(sessionInitToken)}));
          }, 1000);
        } else {
          // Path 2: No opener (COOP blocked it) — close popup; parent will recover via BroadcastChannel or cookie refresh
          window.close();

          // If popup didn't close (some browsers), fallback to redirect
          setTimeout(function() {
            window.location.replace(${serializeForInlineScript(dashboardPage)} + '#oauthSuccess=1&initToken=' + encodeURIComponent(${serializeForInlineScript(sessionInitToken)}));
          }, 1000);
        }
      })();
    `;

    res.send(`<!DOCTYPE html>
    <html lang="${lang}">
    <head><meta charset="utf-8"><meta name="referrer" content="no-referrer"><title>Google Login</title></head>
    <body>
    <script nonce="${res.locals.cspNonce}">${script}</script>
    </body>
    </html>`);



  } catch (err) {
    console.error('Google OAuth error:', err);
    const errorMessage = err.message || 'Authentication failed';
    
    // Send error to the popup opener via postMessage, with fallback redirect
    const script = `
      (function() {
        try {
          if (window.opener && !window.opener.closed) {
            var msg = {
              type: 'google-auth',
              success: false,
              error: ${serializeForInlineScript(errorMessage)}
            };
            var origins = ${serializeForInlineScript(allowedOrigins)};
            origins.forEach(function(origin) { window.opener.postMessage(msg, origin); });
          }
        } catch (e) { console.error('[GoogleAuth] postMessage error failed:', e); }

        window.close();

        // Fallback: redirect to login page with error
        setTimeout(function() {
          window.location.replace(${serializeForInlineScript(loginPage)} + '?error=' + ${serializeForInlineScript(encodeURIComponent(errorMessage))});
        }, 500);
      })();
    `;

    res.send(`<!DOCTYPE html>
    <html lang="${lang}">
    <head><meta charset="utf-8"><title>Google Login Error</title></head>
    <body>
    <script nonce="${res.locals.cspNonce}">${script}</script>
    </body>
    </html>`);
  }
});

// Forgot Password - Request Reset Link
router.post('/forgot-password', [
  body('email').isEmail().normalizeEmail()
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    if (!getDb()) return res.status(500).json({ error: 'DB not connected' });

    const { email } = req.body;
    const user = await getDb().collection(usersCollectionName).findOne({ email });

    // Always return success to prevent email enumeration
    if (!user) {
      // ForgotPassword: email not found (logged without PII)
      return res.json({ success: true });
    }

    // Generate opaque reset token. The URL token carries no readable user data.
    const resetToken = createRefreshToken();

    // Store reset token hash in DB
    await getDb().collection(usersCollectionName).updateOne(
      { userId: user.userId },
      { $set: { resetTokenHash: hashToken(resetToken), resetTokenExpiry: new Date(Date.now() + 3600000) } }
    );

    const resetLink = buildFrontendActionUrl('reset-password.html', resetToken);
    
    // Send email using EmailService
    try {
      const emailContent = EmailService.passwordResetEmail(user.name || 'مستخدم', resetLink);
      await EmailService.send({ to: email, subject: emailContent.subject, html: emailContent.html });
      console.log(`[ForgotPassword] Reset link sent for userId: ${user.userId}`);
    } catch (emailErr) {
      console.warn('[ForgotPassword] Email sending failed:', emailErr.message);
    }

    res.json({ success: true });

  } catch (err) {
    console.error('Forgot password error:', err);
    res.status(500).json({ error: 'Failed to process request' });
  }
});

// Reset Password - Set New Password
router.post('/reset-password', authLimiter, [
  body('token').notEmpty().withMessage('Token is required'),
  body('password').custom(passwordValidator)
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    if (!getDb()) return res.status(500).json({ error: 'DB not connected' });

    const { token, password } = req.body; // Token now comes from body
    if (!isOpaqueToken(token)) {
      return res.status(400).json({ error: 'رابط غير صالح أو منتهي الصلاحية' });
    }

    // Find user and verify token hash matches
    const user = await getDb().collection(usersCollectionName).findOne({ 
      resetTokenHash: hashToken(token) 
    });
    if (!user) {
      return res.status(400).json({ error: 'رابط غير صالح أو منتهي الصلاحية' });
    }

    // Check token expiry
    if (new Date() > new Date(user.resetTokenExpiry)) {
      return res.status(400).json({ error: 'انتهت صلاحية الرابط، اطلب رابطاً جديداً' });
    }

    // Hash new password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Update password and clear reset token atomically to prevent race condition reuse
    const updateResult = await getDb().collection(usersCollectionName).updateOne(
      { 
        userId: user.userId,
        resetTokenHash: hashToken(token),
        resetTokenExpiry: { $gt: new Date() }
      },
      { 
        $set: { password: hashedPassword },
        $inc: { sessionVersion: 1 },
        $unset: {
          resetTokenHash: '',
          resetTokenExpiry: '',
          refreshTokenHash: '',
          refreshTokenExpiresAt: '',
          usedRefreshTokens: '',
          sessionInitTokenHash: '',
          sessionInitTokenExpiry: ''
        }
      }
    );

    if (updateResult.matchedCount === 0) {
      return res.status(400).json({ error: 'رابط غير صالح أو منتهي الصلاحية' });
    }

    console.log(`[ResetPassword] Password updated for userId: ${user.userId}`);
    clearAuthCookies(res);
    res.json({ success: true });

  } catch (err) {
    console.error('Reset password error:', err);
    res.status(500).json({ error: 'Failed to reset password' });
  }
});

// Verify Email endpoint - switched to POST for better security
router.post('/verify-email', authLimiter, async (req, res) => {
  try {
    if (!getDb()) return res.status(500).json({ error: 'DB not connected' });

    const { token } = req.body;
    if (!token) return res.status(400).json({ error: 'Token missing' });
    if (!isOpaqueToken(token)) {
      return res.status(400).json({ error: 'رابط التحقق غير صالح أو منتهي الصلاحية' });
    }

    // Find user and verify hashed token matches
    const user = await getDb().collection(usersCollectionName).findOne({ 
      verificationTokenHash: hashToken(token) 
    });
    if (!user) {
      return res.status(400).json({ error: 'رابط التحقق غير صالح أو منتهي الصلاحية' });
    }

    if (!user.verificationTokenExpiry || new Date() > new Date(user.verificationTokenExpiry)) {
      return res.status(400).json({ error: 'انتهت صلاحية رابط التحقق، اطلب رابطاً جديداً' });
    }

    // Check if already verified
    if (user.isVerified) {
      return res.json({ success: true, message: 'البريد مُتحقق مسبقاً' });
    }

    // Update user as verified atomically
    const updateResult = await getDb().collection(usersCollectionName).updateOne(
      { 
        userId: user.userId,
        verificationTokenHash: hashToken(token),
        verificationTokenExpiry: { $gt: new Date() }
      },
      { $set: { isVerified: true }, $unset: { verificationTokenHash: '', verificationTokenExpiry: '' } }
    );

    if (updateResult.matchedCount === 0) {
      return res.status(400).json({ error: 'رابط التحقق غير صالح أو منتهي الصلاحية' });
    }

    console.log(`[VerifyEmail] Email verified for userId: ${user.userId}`);
    res.json({ success: true });

  } catch (err) {
    console.error('Verify email error:', err);
    res.status(500).json({ error: 'Failed to verify email' });
  }
});

// --- RESEND VERIFICATION EMAIL ---
router.post('/resend-verification', verifyToken, authLimiter, async (req, res) => {
  try {
    if (!getDb()) return res.status(500).json({ error: 'DB not connected' });

    const user = await getDb().collection(usersCollectionName).findOne({ userId: req.user.userId });
    if (!user) return res.status(404).json({ error: 'User not found' });

    if (user.isVerified) {
      return res.json({ success: true, message: 'البريد مُتحقق مسبقاً' });
    }

    // Generate new opaque verification token
    const verificationToken = createRefreshToken();
    const verificationTokenExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000);

    // Store new verification token hash
    await getDb().collection(usersCollectionName).updateOne(
      { userId: user.userId },
      { $set: { verificationTokenHash: hashToken(verificationToken), verificationTokenExpiry } }
    );

    // Send verification email
    const verifyUrl = buildFrontendActionUrl('verify-email.html', verificationToken);
    try {
      const emailTemplate = EmailService.verificationEmail(user.name, verifyUrl);
      await EmailService.send({ to: user.email, ...emailTemplate });
    } catch (emailErr) {
      console.warn('[ResendVerification] Email sending failed:', emailErr.message);
      return res.status(500).json({ error: 'فشل إرسال البريد. حاول لاحقاً.' });
    }

    console.log(`[ResendVerification] Verification email resent for userId: ${user.userId}`);
    res.json({ success: true, message: 'تم إرسال رسالة التحقق' });

  } catch (err) {
    console.error('Resend verification error:', err);
    res.status(500).json({ error: 'Failed to resend verification email' });
  }
});

// --- REFRESH TOKEN ROUTE ---
router.post('/refresh', async (req, res) => {
  try {
    if (!getDb()) return res.status(500).json({ error: 'DB not connected' });

    const tokenFromCookie = req.cookies?.refreshToken;
    if (!tokenFromCookie) {
      console.warn('[Refresh] No refresh token found in cookies');
      return res.status(401).json({ error: 'No refresh token provided' });
    }
    if (!isOpaqueToken(tokenFromCookie)) {
      return res.status(403).json({ error: 'Invalid refresh token' });
    }

    const hashedToken = hashToken(tokenFromCookie);
    const newRefreshToken = createRefreshToken();
    const newHashedRefresh = hashToken(newRefreshToken);
    const newExpiry = new Date(Date.now() + REFRESH_TOKEN_MAX_AGE_MS);

    const updateFilter = {
      refreshTokenHash: hashedToken,
      refreshTokenExpiresAt: { $gt: new Date() }
    };

    const updateDoc = {
      $set: {
        refreshTokenHash: newHashedRefresh,
        refreshTokenExpiresAt: newExpiry
      },
      $push: {
        usedRefreshTokens: {
          $each: [{ hash: hashedToken, expiresAt: newExpiry }],
          $slice: -50
        }
      }
    };

    let user;
    const dbCollection = getDb().collection(usersCollectionName);
    if (typeof dbCollection.findOneAndUpdate === 'function') {
      const result = await dbCollection.findOneAndUpdate(
        updateFilter,
        updateDoc,
        { returnDocument: 'after' }
      );
      user = result?.value || result;
    } else {
      // Fallback for mocked test environments
      const found = await dbCollection.findOne(updateFilter);
      if (found) {
        await dbCollection.updateOne({ userId: found.userId }, updateDoc);
        user = found;
      }
    }

    if (!user || !user.userId) {
      // If an already-rotated token is seen again, treat it as credential theft:
      // invalidate the whole user session, including the attacker's newer token.
      const reusedUser = typeof dbCollection.findOne === 'function'
        ? await dbCollection.findOne(
            {
              usedRefreshTokens: {
                $elemMatch: { hash: hashedToken, expiresAt: { $gt: new Date() } }
              }
            },
            { projection: { userId: 1, sessionVersion: 1, _id: 0 } }
          )
        : null;

      if (reusedUser?.userId) {
        await dbCollection.updateOne(
          sessionVersionUserFilter(reusedUser.userId, reusedUser.sessionVersion),
          {
            $inc: { sessionVersion: 1 },
            $unset: {
              refreshTokenHash: '',
              refreshTokenExpiresAt: '',
              usedRefreshTokens: '',
              sessionInitTokenHash: '',
              sessionInitTokenExpiry: ''
            }
          }
        );
        clearAuthCookies(res);
        console.warn(`[Refresh] Reuse detected; revoked session for userId: ${reusedUser.userId}`);
        return res.status(403).json({ error: 'Session revoked. Please sign in again.', code: 'SESSION_REVOKED' });
      }

      console.warn('[Refresh] Invalid or expired refresh token');
      return res.status(403).json({ error: 'Invalid refresh token' });
    }

    console.log(`[Refresh] Refreshing session for userId: ${user.userId}`);

    // Generate new access token bound to the current server-side session version.
    const newAccessToken = createAccessToken({
      userId: user.userId,
      email: user.email,
      sessionVersion: normalizeSessionVersion(user.sessionVersion)
    });

    setAuthCookies(res, { accessToken: newAccessToken, refreshToken: newRefreshToken });

    res.json({
      success: true,
      accessToken: newAccessToken,
      user: { name: user.name, email: user.email, userId: user.userId }
    });

  } catch (err) {
    console.error('Token refresh error:', err);
    res.status(500).json({ error: 'Token refresh failed' });
  }
});

// --- LOGOUT ROUTE ---
router.post('/logout', async (req, res) => {
  try {
    const users = getDb()?.collection(usersCollectionName);
    const tokenFromCookie = req.cookies?.refreshToken;
    let revoked = false;

    if (users && tokenFromCookie && isOpaqueToken(tokenFromCookie)) {
      const hashedToken = hashToken(tokenFromCookie);
      const refreshUser = await users.findOne(
        { refreshTokenHash: hashedToken },
        { projection: { userId: 1, sessionVersion: 1, _id: 0 } }
      );

      if (refreshUser?.userId) {
        const result = await users.updateOne(
          { refreshTokenHash: hashedToken, ...sessionVersionMatch(refreshUser.sessionVersion) },
          {
            $inc: { sessionVersion: 1 },
            $unset: {
              refreshTokenHash: '',
              refreshTokenExpiresAt: '',
              usedRefreshTokens: '',
              sessionInitTokenHash: '',
              sessionInitTokenExpiry: ''
            }
          }
        );
        revoked = result.matchedCount === 1;
      }
    }

    // Cookie-less/cross-origin clients can still revoke the current access
    // session. The version match makes a stale token unable to repeatedly
    // invalidate newer sessions.
    if (users && !revoked) {
      const accessToken = readAccessToken(req);
      if (accessToken) {
        try {
          const decoded = jwt.verify(accessToken, process.env.JWT_SECRET, { algorithms: ['HS256'] });
          if (decoded.type === 'access' && decoded.userId) {
            await users.updateOne(
              sessionVersionUserFilter(decoded.userId, decoded.sessionVersion),
              {
                $inc: { sessionVersion: 1 },
                $unset: {
                  refreshTokenHash: '',
                  refreshTokenExpiresAt: '',
                  usedRefreshTokens: '',
                  sessionInitTokenHash: '',
                  sessionInitTokenExpiry: ''
                }
              }
            );
          }
        } catch {
          // Logout always clears browser credentials even if the JWT is expired.
        }
      }
    }

    clearAuthCookies(res);
    return res.json({ success: true });

  } catch (err) {
    console.error('Logout error:', err);
    clearAuthCookies(res);
    return res.status(500).json({ error: 'Logout failed' });
  }
});

// Get current authenticated user info (used after OAuth redirect instead of URL hash)
router.get('/me', verifyToken, async (req, res) => {
  try {
    if (!getDb()) return res.status(500).json({ error: 'DB not connected' });
    const user = await getDb().collection(usersCollectionName).findOne(
      { userId: req.user.userId },
      { projection: { name: 1, email: 1, userId: 1, isVerified: 1, _id: 0 } }
    );
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json({ success: true, user });
  } catch (err) {
    console.error('Get user info error:', err);
    res.status(500).json({ error: 'Failed to get user info' });
  }
});

// Export the authenticated user's account data without credentials or token hashes.
router.get('/export-data', verifyToken, async (req, res) => {
  try {
    const db = getDb();
    if (!db) return res.status(503).json({ error: 'DB not connected' });

    const userId = req.user.userId;
    const [user, designs, savedCards, submittedRequests, receivedRequests] = await Promise.all([
      db.collection(usersCollectionName).findOne(
        { userId },
        {
          projection: {
            _id: 0,
            userId: 1,
            email: 1,
            name: 1,
            googleId: 1,
            isVerified: 1,
            cardPrivacy: 1,
            createdAt: 1
          }
        }
      ),
      db.collection(designsCollectionName).find({ ownerId: userId }).toArray(),
      db.collection(savedCardsCollectionName).find({ userId }).toArray(),
      db.collection(cardRequestsCollectionName).find({ requesterId: userId }).toArray(),
      db.collection(cardRequestsCollectionName).find(
        { ownerUserId: userId },
        { projection: { requesterEmail: 0 } }
      ).toArray()
    ]);

    if (!user) return res.status(404).json({ error: 'User not found' });

    const ownedDesignIds = designs.map(design => design.shortId).filter(Boolean);
    const leads = ownedDesignIds.length
      ? await db.collection(LEADS_COLLECTION_NAME).find({ cardId: { $in: ownedDesignIds } }).toArray()
      : [];

    const exportPayload = {
      exportedAt: new Date().toISOString(),
      account: user,
      designs,
      savedCards,
      leads,
      cardRequests: {
        submitted: submittedRequests,
        received: receivedRequests
      }
    };

    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="mcprime-data-${userId}.json"`);
    return res.status(200).send(JSON.stringify(exportPayload, null, 2));
  } catch (err) {
    console.error('Export account data error:', err);
    return res.status(500).json({ error: 'Failed to export account data' });
  }
});

// Permanently delete the authenticated account and its MongoDB-owned data.
router.delete('/account', verifyToken, authLimiter, async (req, res) => {
  try {
    if (req.body?.confirmation !== 'DELETE') {
      return res.status(400).json({ error: 'Type DELETE to confirm account deletion.' });
    }

    const db = getDb();
    if (!db) return res.status(503).json({ error: 'DB not connected' });

    const userId = req.user.userId;
    const user = await db.collection(usersCollectionName).findOne(
      { userId },
      { projection: { userId: 1, _id: 0 } }
    );
    if (!user) return res.status(404).json({ error: 'User not found' });

    await cleanupUserOwnedData(db, {
      userId,
      designsCollectionName,
      savedCardsCollectionName,
      cardRequestsCollectionName
    });

    // Cloudinary cleanup is best-effort. MongoDB deletion remains authoritative,
    // and provider CDN caches may take time to expire.
    if (
      cloudinary?.api?.delete_resources_by_prefix &&
      process.env.CLOUDINARY_CLOUD_NAME &&
      process.env.CLOUDINARY_API_KEY &&
      process.env.CLOUDINARY_API_SECRET
    ) {
      try {
        await cloudinary.api.delete_resources_by_prefix(`mcprim/user_${userId}_`);
      } catch (cloudError) {
        console.warn('[DeleteAccount] Cloudinary cleanup failed:', cloudError.message);
      }
    }

    const deletion = await db.collection(usersCollectionName).deleteOne({ userId });
    if (deletion.deletedCount !== 1) {
      return res.status(500).json({ error: 'Account deletion did not complete.' });
    }

    clearAuthCookies(res);
    return res.status(200).json({ success: true });
  } catch (err) {
    console.error('Delete account error:', err);
    return res.status(500).json({ error: 'Failed to delete account' });
  }
});

// POST /api/auth/session-init
// Verifies the short-lived one-time token sent via postMessage from Google OAuth popup.
// Cookies are already set by /google/callback — this just confirms the token is valid
// and returns user data so the frontend can initialize its session state.
router.post('/session-init', async (req, res) => {
  try {
    const { initToken } = req.body || {};
    if (!initToken || typeof initToken !== 'string') return res.status(400).json({ error: 'Token required' });
    if (!getDb()) return res.status(500).json({ error: 'DB not connected' });

    const decoded = jwt.verify(initToken, process.env.JWT_SECRET, { algorithms: ['HS256'] });

    if (decoded.type !== 'session-init' || !decoded.userId) {
      return res.status(401).json({ error: 'Invalid token type' });
    }

    const users = getDb().collection(usersCollectionName);
    const consumeResult = await users.updateOne(
      {
        userId: decoded.userId,
        sessionInitTokenHash: hashToken(initToken),
        sessionInitTokenExpiry: { $gt: new Date() },
        ...sessionVersionMatch(decoded.sessionVersion)
      },
      { $unset: { sessionInitTokenHash: '', sessionInitTokenExpiry: '' } }
    );

    if (consumeResult.matchedCount !== 1) {
      return res.status(401).json({ error: 'Session token already used or expired' });
    }

    console.log(`[SessionInit] Consumed for userId: ${decoded.userId}`);

    // Fetch the full user from DB to ensure we have the name
    const user = await users.findOne(
      { userId: decoded.userId },
      { projection: { name: 1, email: 1, userId: 1, sessionVersion: 1 } }
    );

    if (!user) {
      return res.status(401).json({ error: 'User not found during initialization' });
    }

    const accessToken = createAccessToken({
      userId: user.userId,
      email: user.email,
      sessionVersion: normalizeSessionVersion(user.sessionVersion)
    });

    res.json({
      success: true,
      accessToken,
      user: { userId: user.userId, email: user.email, name: user.name }
    });

  } catch {
    return res.status(401).json({ error: 'Invalid or expired session token' });
  }
});

// Create a bearer invitation that is scoped to one random collaboration room.
// The frontend puts it in the URL fragment, which browsers do not send in HTTP
// requests or Referer headers.
router.post('/collaboration-invite', verifyToken, async (req, res) => {
  try {
    const designId = req.body?.designId;
    if (!isSafeDesignId(designId)) {
      return res.status(400).json({ error: 'Valid designId is required' });
    }
    const design = await getDb().collection(designsCollectionName).findOne({
      shortId: designId,
      ownerId: req.user.userId
    });
    if (!design) return res.status(404).json({ error: 'Design not found' });

    const collabId = nanoid(32);
    const invite = jwt.sign(
      {
        type: 'collab-invite',
        collabId,
        designId,
        ownerId: req.user.userId,
        role: 'editor',
        jti: nanoid(16)
      },
      process.env.JWT_SECRET,
      { algorithm: 'HS256', expiresIn: '1h' }
    );
    return res.status(201).json({ success: true, collabId, invite, expiresIn: 3600 });
  } catch (error) {
    console.error('[Collaboration] Failed to create invitation:', error.message);
    return res.status(500).json({ error: 'Failed to create collaboration invitation' });
  }
});

// Exchange a room invitation for a 30-second, room-bound WebSocket token.
router.post('/ws-token', verifyToken, async (req, res) => {
  const { collabId, invite } = req.body || {};
  if (!isSafeCollabId(collabId) || typeof invite !== 'string') {
    return res.status(400).json({ error: 'Valid collaboration invitation is required' });
  }

  let invitation;
  try {
    invitation = jwt.verify(invite, process.env.JWT_SECRET, { algorithms: ['HS256'] });
  } catch {
    return res.status(401).json({ error: 'Invalid or expired collaboration invitation' });
  }

  if (
    invitation.type !== 'collab-invite' ||
    invitation.collabId !== collabId ||
    !isSafeDesignId(invitation.designId) ||
    !invitation.ownerId
  ) {
    return res.status(401).json({ error: 'Invalid collaboration invitation scope' });
  }

  const design = await getDb().collection(designsCollectionName).findOne({
    shortId: invitation.designId,
    ownerId: invitation.ownerId
  });
  if (!design) return res.status(404).json({ error: 'Collaboration design not found' });

  const role = req.user.userId === invitation.ownerId ? 'owner' : 'editor';
  const wsToken = jwt.sign(
    {
      userId: req.user.userId,
      type: 'ws',
      collabId,
      designId: invitation.designId,
      ownerId: invitation.ownerId,
      role,
      jti: nanoid(16)
    },
    process.env.JWT_SECRET,
    { algorithm: 'HS256', expiresIn: '30s' }
  );
  return res.json({ success: true, token: wsToken });
});


  return router;
};

module.exports._private = {
  buildFrontendActionUrl,
  getOAuthRedirectUri,
  readAccessToken,
  resolveGoogleAccount,
  serializeForInlineScript,
  sessionVersionMatch,
  sessionVersionUserFilter
};
