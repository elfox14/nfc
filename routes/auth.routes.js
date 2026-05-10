const express = require('express');
const { body, validationResult } = require('express-validator');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { nanoid } = require('nanoid');
const crypto = require('crypto');
const EmailService = require('../email-service');
const { createAccessToken, createRefreshToken, hashToken } = require('../utils/tokens');
const verifyToken = require('../auth-middleware');

module.exports = function createAuthRouter({ getDb, usersCollectionName, authLimiter, allowedOrigins }) {
  const router = express.Router();

  // Rate Limiting is already applied in server.js globally for some paths, but we can re-apply if needed
  // For now, we just map the routes over.

// --- AUTHENTICATION ROUTES ---

// Register
router.post('/register', [
  body('email').isEmail().normalizeEmail(),
  body('password').isLength({ min: 6, max: 128 }),
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
      createdAt: new Date()
    });

    // Generate verification token
    const secret = process.env.JWT_SECRET;
    if (!secret) return res.status(500).json({ error: 'Server misconfiguration' });
    const verificationToken = jwt.sign({ userId, email, type: 'email-verify' }, secret, { expiresIn: '24h' });

    // Store verification token hash
    await getDb().collection(usersCollectionName).updateOne(
      { userId },
      { $set: { verificationTokenHash: hashToken(verificationToken) } }
    );

    // Send verification email (non-blocking)
    const baseUrl = process.env.PUBLIC_BASE_URL || 'https://mcprim.com/nfc';
    const verifyUrl = `${baseUrl}/verify-email.html?token=${verificationToken}`;
    try {
      const emailTemplate = EmailService.verificationEmail(name, verifyUrl);
      await EmailService.send({ to: email, ...emailTemplate });
    } catch (emailErr) {
      console.warn('[Register] Email sending failed (non-blocking):', emailErr.message);
    }

    // Generate short-lived access token + HttpOnly refresh cookie
    const accessToken = createAccessToken({ userId, email });
    const refreshTokenValue = createRefreshToken();
    const hashedRefresh = hashToken(refreshTokenValue);

    // Store hashed refresh token in DB
    await getDb().collection(usersCollectionName).updateOne(
      { userId },
      { $set: { refreshTokenHash: hashedRefresh } }
    );

    // Set refresh token as HttpOnly Secure cookie
    res.cookie('refreshToken', refreshTokenValue, {
      httpOnly: true,
      secure: true, // required for sameSite: 'None'
      sameSite: 'None', // allow cross-site (mcprim.com → onrender.com)
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      path: '/api/auth'
    });

    // Set access token as HttpOnly Secure cookie
    res.cookie('accessToken', accessToken, {
      httpOnly: true,
      secure: true,
      sameSite: 'None',
      maxAge: 15 * 60 * 1000, // 15 minutes
      path: '/'
    });

    // Return token in body as fallback for third-party cookie blocking
    res.status(201).json({ success: true, token: accessToken, user: { name, email, userId, isVerified: false } });

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
    console.log(`[Login] Login attempt for: ${email}`);

    const user = await getDb().collection(usersCollectionName).findOne({ email });
    if (!user) {
      return res.status(400).json({ error: 'Invalid credentials' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ error: 'Invalid credentials' });
    }

    // Generate short-lived access token + HttpOnly refresh cookie
    const accessToken = createAccessToken({ userId: user.userId, email: user.email });
    const refreshTokenValue = createRefreshToken();
    const hashedRefresh = hashToken(refreshTokenValue);

    // Store hashed refresh token in DB
    await getDb().collection(usersCollectionName).updateOne(
      { userId: user.userId },
      { $set: { refreshTokenHash: hashedRefresh } }
    );

    // Set refresh token as HttpOnly Secure cookie
    res.cookie('refreshToken', refreshTokenValue, {
      httpOnly: true,
      secure: true, // required for sameSite: 'None'
      sameSite: 'None', // allow cross-site (mcprim.com → onrender.com)
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      path: '/api/auth'
    });

    // Set access token as HttpOnly Secure cookie
    res.cookie('accessToken', accessToken, {
      httpOnly: true,
      secure: true,
      sameSite: 'None',
      maxAge: 15 * 60 * 1000, // 15 minutes
      path: '/'
    });

    console.log(`[Login] Successful login for: ${email}. Token issued.`);
    // Return token in body as fallback for third-party cookie blocking
    // Include isVerified so frontend can show verification reminder
    const loginResponse = { 
      success: true, 
      token: accessToken, 
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

  const protoHeader = req.headers['x-forwarded-proto'];
  const proto = protoHeader ? protoHeader.split(',')[0].trim() : req.protocol;
  const host = req.get('host');
  const redirectUri = `${proto}://${host}/api/auth/google/callback`;

  // Only store the language (ar/en) in state — rebuild full redirect URL from PUBLIC_BASE_URL
  const lang = (req.query.lang === 'en') ? 'en' : 'ar';
  const statePayload = Buffer.from(JSON.stringify({ lang })).toString('base64url');

  const scope = 'email profile';
  const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&scope=${encodeURIComponent(scope)}&access_type=offline&prompt=consent&state=${encodeURIComponent(statePayload)}`;

  res.redirect(authUrl);
});

// Google OAuth - Callback Handler
router.get('/google/callback', async (req, res) => {
  const { code, error, state } = req.query;

  // Determine language from state
  let lang = 'ar';
  if (state) {
    try {
      const decoded = JSON.parse(Buffer.from(state, 'base64url').toString('utf8'));
      if (decoded.lang === 'en') lang = 'en';
    } catch (e) { /* use default */ }
  }

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
    
    const protoHeader = req.headers['x-forwarded-proto'];
    const proto = protoHeader ? protoHeader.split(',')[0].trim() : req.protocol;
    const host = req.get('host');
    const redirectUri = `${proto}://${host}/api/auth/google/callback`;

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
      console.error('Google Token API Error:', tokens);
      throw new Error(tokens.error_description || tokens.error || 'No access token');
    }

    // Get user info
    const userInfoResponse = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: { Authorization: `Bearer ${tokens.access_token}` }
    });
    const googleUser = await userInfoResponse.json();

    if (!googleUser.email) {
      console.error('Google UserInfo Error:', googleUser);
      throw new Error('No email returned from Google');
    }

    // Find or create user
    let user = await getDb().collection(usersCollectionName).findOne({ email: googleUser.email });

    if (!user) {
      const userId = nanoid(10);
      const newUser = {
        userId,
        email: googleUser.email,
        name: googleUser.name || googleUser.email.split('@')[0],
        googleId: googleUser.id,
        isVerified: true,
        createdAt: new Date()
      };
      await getDb().collection(usersCollectionName).insertOne(newUser);
      user = newUser;
    } else {
      // If user exists but name is missing, update it from Google
      if (!user.name && googleUser.name) {
        await getDb().collection(usersCollectionName).updateOne(
          { userId: user.userId },
          { $set: { name: googleUser.name } }
        );
        user.name = googleUser.name;
      }
    }

    // Generate tokens
    const accessToken = createAccessToken({ userId: user.userId, email: user.email });
    const refreshTokenValue = createRefreshToken();
    const hashedRefresh = hashToken(refreshTokenValue);

    await getDb().collection(usersCollectionName).updateOne(
      { userId: user.userId },
      { $set: { refreshTokenHash: hashedRefresh } }
    );

    // Set refresh token as HttpOnly Secure cookie
    res.cookie('refreshToken', refreshTokenValue, {
      httpOnly: true,
      secure: true, // required for sameSite: 'None'
      sameSite: 'None', // allow cross-site (mcprim.com → onrender.com)
      maxAge: 7 * 24 * 60 * 60 * 1000,
      path: '/api/auth'
    });

    // Set access token as HttpOnly Secure cookie
    res.cookie('accessToken', accessToken, {
      httpOnly: true,
      secure: true,
      sameSite: 'None',
      maxAge: 15 * 60 * 1000, // 15 minutes
      path: '/'
    });

    // Build the dashboard URL for fallback redirect
    // SECURITY: Token is already in HttpOnly cookies — do NOT put it in URL hash
    const dashboardPage = lang === 'en'
      ? `${frontendBase}/dashboard-en.html`
      : `${frontendBase}/dashboard.html`;



    // SECURITY: Generate a very short-lived (60s), one-time-use token to initialize the session
    // This allows the SPA to boot even if third-party cookies are blocked by the browser.
    const sessionInitToken = jwt.sign(
      { userId: user.userId, email: user.email, type: 'session-init' },
      process.env.JWT_SECRET,
      { expiresIn: '60s' }
    );

    // Send success signal to popup opener via postMessage
    const script = `
      (function() {
        var hasOpener = false;
        try {
          hasOpener = !!(window.opener && !window.opener.closed);
        } catch (e) {}

        if (hasOpener) {
          // Path 1: Popup flow — send success signal to opener, then close
          try {
            var msg = {
              type: 'google-auth',
              success: true,
              initToken: ${JSON.stringify(sessionInitToken)},
              user: ${JSON.stringify({ userId: user.userId, email: user.email, name: user.name })}
            };
            var origins = ${JSON.stringify(allowedOrigins)};
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
            window.location.replace(${JSON.stringify(dashboardPage)} + '?oauthSuccess=1&initToken=' + ${JSON.stringify(sessionInitToken)});
          }, 1000);
        } else {
          // Path 2: No opener — redirect to dashboard (pass initToken to bypass cookie blocking)
          window.location.replace(${JSON.stringify(dashboardPage)} + '?oauthSuccess=1&initToken=' + ${JSON.stringify(sessionInitToken)});
        }
      })();
    `;

    res.send(`<!DOCTYPE html>
    <html lang="${lang}">
    <head><meta charset="utf-8"><title>Google Login</title></head>
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
              error: ${JSON.stringify(errorMessage)}
            };
            var origins = ${JSON.stringify(allowedOrigins)};
            origins.forEach(function(origin) { window.opener.postMessage(msg, origin); });
          }
        } catch (e) { console.error('[GoogleAuth] postMessage error failed:', e); }

        window.close();

        // Fallback: redirect to login page with error
        setTimeout(function() {
          window.location.replace(${JSON.stringify(loginPage)} + '?error=' + ${JSON.stringify(encodeURIComponent(errorMessage))});
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
      console.log(`[ForgotPassword] Email not found: ${email}`);
      return res.json({ success: true });
    }

    // Generate reset token
    const secret = process.env.JWT_SECRET;
    if (!secret) return res.status(500).json({ error: 'Server misconfiguration' });
    const resetToken = jwt.sign({ userId: user.userId, email: user.email, type: 'password-reset' }, secret, { expiresIn: '1h' });

    // Store reset token hash in DB
    await getDb().collection(usersCollectionName).updateOne(
      { userId: user.userId },
      { $set: { resetTokenHash: hashToken(resetToken), resetTokenExpiry: new Date(Date.now() + 3600000) } }
    );

    const baseUrl = process.env.PUBLIC_BASE_URL || 'https://mcprim.com/nfc';
    const resetLink = `${baseUrl}/reset-password.html?token=${resetToken}`;
    
    // Send email using EmailService
    try {
      const emailContent = EmailService.passwordResetEmail(user.name || 'مستخدم', resetLink);
      await EmailService.send({ to: email, subject: emailContent.subject, html: emailContent.html });
      console.log(`[ForgotPassword] Reset link sent to ${email}`);
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
  body('password').isLength({ min: 6, max: 128 })
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    if (!getDb()) return res.status(500).json({ error: 'DB not connected' });

    const { token, password } = req.body; // Token now comes from body

    // Verify token
    const secret = process.env.JWT_SECRET;
    if (!secret) return res.status(500).json({ error: 'Server misconfiguration' });
    let decoded;
    try {
      decoded = jwt.verify(token, secret);
      if (decoded.type !== 'password-reset') throw new Error('Invalid token type');
    } catch (tokenErr) {
      return res.status(400).json({ error: 'رابط غير صالح أو منتهي الصلاحية' });
    }

    // Find user and verify token hash matches
    const user = await getDb().collection(usersCollectionName).findOne({ 
      userId: decoded.userId, 
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

    // Update password and clear reset token
    await getDb().collection(usersCollectionName).updateOne(
      { userId: user.userId },
      { 
        $set: { password: hashedPassword }, 
        $unset: { resetTokenHash: '', resetTokenExpiry: '' } 
      }
    );

    console.log(`[ResetPassword] Password updated for user: ${user.email}`);
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

    // Verify token
    const secret = process.env.JWT_SECRET;
    if (!secret) return res.status(500).json({ error: 'Server misconfiguration' });
    let decoded;
    try {
      decoded = jwt.verify(token, secret);
      if (decoded.type !== 'email-verify') throw new Error('Invalid token type');
    } catch (tokenErr) {
      return res.status(400).json({ error: 'رابط التحقق غير صالح أو منتهي الصلاحية' });
    }

    // Find user and verify hashed token matches
    const user = await getDb().collection(usersCollectionName).findOne({ 
      userId: decoded.userId, 
      verificationTokenHash: hashToken(token) 
    });
    if (!user) {
      return res.status(400).json({ error: 'رابط التحقق غير صالح أو منتهي الصلاحية' });
    }

    // Check if already verified
    if (user.isVerified) {
      return res.json({ success: true, message: 'البريد مُتحقق مسبقاً' });
    }

    // Update user as verified
    await getDb().collection(usersCollectionName).updateOne(
      { userId: user.userId },
      { $set: { isVerified: true }, $unset: { verificationTokenHash: '' } }
    );

    console.log(`[VerifyEmail] Email verified for user: ${user.email}`);
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

    // Generate new verification token
    const secret = process.env.JWT_SECRET;
    if (!secret) return res.status(500).json({ error: 'Server misconfiguration' });
    const verificationToken = jwt.sign(
      { userId: user.userId, email: user.email, type: 'email-verify' },
      secret,
      { expiresIn: '24h' }
    );

    // Store new verification token hash
    await getDb().collection(usersCollectionName).updateOne(
      { userId: user.userId },
      { $set: { verificationTokenHash: hashToken(verificationToken) } }
    );

    // Send verification email
    const baseUrl = process.env.PUBLIC_BASE_URL || 'https://mcprim.com/nfc';
    const verifyUrl = `${baseUrl}/verify-email.html?token=${verificationToken}`;
    try {
      const emailTemplate = EmailService.verificationEmail(user.name, verifyUrl);
      await EmailService.send({ to: user.email, ...emailTemplate });
    } catch (emailErr) {
      console.warn('[ResendVerification] Email sending failed:', emailErr.message);
      return res.status(500).json({ error: 'فشل إرسال البريد. حاول لاحقاً.' });
    }

    console.log(`[ResendVerification] Verification email resent to: ${user.email}`);
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

    // Find user by hashed refresh token
    const hashedToken = hashToken(tokenFromCookie);
    const user = await getDb().collection(usersCollectionName).findOne({ refreshTokenHash: hashedToken });

    if (!user) {
      console.warn('[Refresh] Invalid refresh token: No user found for this hash');
      return res.status(403).json({ error: 'Invalid refresh token' });
    }
    console.log(`[Refresh] Refreshing session for user: ${user.email}`);

    // Rotate: generate new tokens
    const newAccessToken = createAccessToken({ userId: user.userId, email: user.email });
    const newRefreshToken = createRefreshToken();
    const newHashedRefresh = hashToken(newRefreshToken);

    // Update DB with new hashed refresh token (invalidates old one)
    await getDb().collection(usersCollectionName).updateOne(
      { userId: user.userId },
      { $set: { refreshTokenHash: newHashedRefresh } }
    );

    // Set new refresh token cookie
    res.cookie('refreshToken', newRefreshToken, {
      httpOnly: true,
      secure: true, // required for sameSite: 'None'
      sameSite: 'None', // allow cross-site (mcprim.com → onrender.com)
      maxAge: 7 * 24 * 60 * 60 * 1000,
      path: '/api/auth'
    });

    // Set new access token cookie
    res.cookie('accessToken', newAccessToken, {
      httpOnly: true,
      secure: true,
      sameSite: 'None',
      maxAge: 15 * 60 * 1000, // 15 minutes
      path: '/'
    });

    // Return token in body as fallback for third-party cookie blocking
    res.json({ success: true, token: newAccessToken, user: { name: user.name, email: user.email, userId: user.userId } });

  } catch (err) {
    console.error('Token refresh error:', err);
    res.status(500).json({ error: 'Token refresh failed' });
  }
});

// --- LOGOUT ROUTE ---
router.post('/logout', async (req, res) => {
  try {
    const tokenFromCookie = req.cookies?.refreshToken;

    if (tokenFromCookie && getDb()) {
      // Remove refresh token from DB
      const hashedToken = hashToken(tokenFromCookie);
      await getDb().collection(usersCollectionName).updateOne(
        { refreshTokenHash: hashedToken },
        { $unset: { refreshTokenHash: '' } }
      );
    }

    // Clear the cookies
    res.clearCookie('refreshToken', {
      httpOnly: true,
      secure: true,
      sameSite: 'None',
      path: '/api/auth'
    });
    res.clearCookie('accessToken', {
      httpOnly: true,
      secure: true,
      sameSite: 'None',
      path: '/'
    });

    res.json({ success: true });

  } catch (err) {
    console.error('Logout error:', err);
    res.status(500).json({ error: 'Logout failed' });
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

// POST /api/auth/session-init
// Verifies the short-lived one-time token sent via postMessage from Google OAuth popup.
// Cookies are already set by /google/callback — this just confirms the token is valid
// and returns user data so the frontend can initialize its session state.
router.post('/session-init', async (req, res) => {
  try {
    const { initToken } = req.body;
    if (!initToken) return res.status(400).json({ error: 'Token required' });

    const decoded = jwt.verify(initToken, process.env.JWT_SECRET);

    if (decoded.type !== 'session-init') {
      return res.status(401).json({ error: 'Invalid token type' });
    }

    console.log(`[SessionInit] Confirmed for: ${decoded.email}`);

    // Fetch the full user from DB to ensure we have the name
    const user = await getDb().collection(usersCollectionName).findOne(
      { userId: decoded.userId },
      { projection: { name: 1, email: 1, userId: 1 } }
    );

    if (!user) {
      return res.status(401).json({ error: 'User not found during initialization' });
    }

    const accessToken = createAccessToken({ userId: user.userId, email: user.email });

    // Cookies were already set by /google/callback — just return user info and token for fallback
    res.json({
      success: true,
      token: accessToken,
      user: { userId: user.userId, email: user.email, name: user.name }
    });

  } catch {
    return res.status(401).json({ error: 'Invalid or expired session token' });
  }
});

// Issue a short-lived token for WebSocket authentication
// WebSocket can't send cookies, so the client fetches this token via HTTP (with cookies),
// then sends it as the first WebSocket message
router.get('/ws-token', verifyToken, (req, res) => {
  const wsToken = jwt.sign(
    { userId: req.user.userId, email: req.user.email, type: 'access' },
    process.env.JWT_SECRET,
    { expiresIn: '30s' } // Very short-lived — only for WebSocket handshake
  );
  res.json({ success: true, token: wsToken });
});


  return router;
};
