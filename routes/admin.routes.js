const express = require('express');
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

/**
 * Admin Router
 * @param {Object} dependencies - Pass required global variables and services
 * @param {Function} dependencies.getDb - Function returning the connected MongoDB instance
 * @param {Array} dependencies.errorBuffer - Array containing recent system errors
 * @param {number} dependencies.MAX_ERROR_BUFFER - Max size of error buffer
 * @returns {express.Router}
 */
module.exports = function createAdminRouter({ getDb, errorBuffer, MAX_ERROR_BUFFER }) {
  const router = express.Router();

  const usersCollectionName = process.env.MONGO_USERS_COLL || 'users';
  const designsCollectionName = process.env.MONGO_DESIGNS_COLL || 'designs';

  function sha256Hex(value) {
    return crypto.createHash('sha256').update(value).digest('hex');
  }

  function safeCompare(a, b) {
    return a.length === b.length && crypto.timingSafeEqual(Buffer.from(a), Buffer.from(b));
  }

  function clampPositiveInt(value, fallback, max) {
    const parsed = Number.parseInt(value, 10);
    if (!Number.isFinite(parsed) || parsed < 1) return fallback;
    return Math.min(parsed, max);
  }

  // --- 1. ADMIN LOGIN ENDPOINT (Email + Password) ---
  router.post('/login', async (req, res) => {
    try {
      const email = (req.body.email || '').trim().toLowerCase();
      const password = (req.body.password || '').trim();

      if (!email || !password) {
        return res.status(400).json({ error: 'يرجى إدخال البريد الإلكتروني وكلمة المرور.' });
      }

      const db = getDb();
      let adminUser = null;

      if (db) {
        // Find user by email (case-insensitive)
        const user = await db.collection(usersCollectionName).findOne({
          email: { $regex: new RegExp(`^${email.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') }
        });

        if (user && user.password) {
          const passwordMatches = await bcrypt.compare(password, user.password);
          const isUserAdmin = user.role === 'admin' || user.isAdmin === true;

          if (passwordMatches && isUserAdmin) {
            adminUser = user;
          }
        }
      }

      // Legacy fallback / Emergency admin credential support
      if (!adminUser) {
        const expectedHash = (process.env.ADMIN_TOKEN_SHA256 || '').trim().toLowerCase();
        const legacyExpected = (process.env.ADMIN_TOKENH || '').trim();
        const isTokenMatch = expectedHash
          ? /^[a-f0-9]{64}$/.test(expectedHash) && safeCompare(sha256Hex(password), expectedHash)
          : legacyExpected && safeCompare(password, legacyExpected);

        if (isTokenMatch) {
          adminUser = {
            _id: 'legacy-admin',
            name: 'مسؤول النظام الرئيسي',
            email: email || 'admin@mcprim.com',
            role: 'admin'
          };
        }
      }

      if (!adminUser) {
        return res.status(401).json({ error: 'البريد الإلكتروني أو كلمة المرور غير صحيحة، أو الحساب ليس لديه صلاحيات الإدارة.' });
      }

      const secret = process.env.JWT_SECRET || 'mcprime_admin_fallback_secret_key_32chars';
      const token = jwt.sign(
        {
          userId: adminUser._id.toString(),
          email: adminUser.email,
          name: adminUser.name || 'مسؤول النظام',
          role: 'admin',
          type: 'access'
        },
        secret,
        { expiresIn: '24h' }
      );

      return res.json({
        success: true,
        token,
        user: {
          id: adminUser._id.toString(),
          name: adminUser.name || 'مسؤول النظام',
          email: adminUser.email,
          role: 'admin'
        }
      });
    } catch (err) {
      console.error('Admin login error:', err);
      return res.status(500).json({ error: 'حدث خطأ في الخادم أثناء تسجيل الدخول.' });
    }
  });

  // --- 2. ADMIN AUTHENTICATION MIDDLEWARE ---
  const adminAuthMiddleware = (req, res, next) => {
    // A. Check for Bearer JWT Token or Cookie
    const authHeader = req.headers['authorization'];
    let jwtToken = authHeader && authHeader.startsWith('Bearer ') ? authHeader.split(' ')[1] : null;

    if (!jwtToken && req.cookies && req.cookies.adminAccessToken) {
      jwtToken = req.cookies.adminAccessToken;
    }

    if (jwtToken) {
      try {
        const secret = process.env.JWT_SECRET || 'mcprime_admin_fallback_secret_key_32chars';
        const decoded = jwt.verify(jwtToken, secret);
        if (decoded.role === 'admin' || decoded.isAdmin === true) {
          req.admin = decoded;
          return next();
        }
      } catch (e) {
        // Token invalid/expired, fall through to token check
      }
    }

    // B. Check for Legacy x-admin-token header (backwards compatibility)
    const expectedHash = (process.env.ADMIN_TOKEN_SHA256 || '').trim().toLowerCase();
    const legacyExpected = (process.env.ADMIN_TOKENH || '').trim();
    const provided = (req.headers['x-admin-token'] || '').trim();

    const isTokenValid = expectedHash
      ? /^[a-f0-9]{64}$/.test(expectedHash) && safeCompare(sha256Hex(provided), expectedHash)
      : legacyExpected && safeCompare(provided, legacyExpected);

    if (isTokenValid) {
      req.admin = { role: 'admin', type: 'legacy-token' };
      return next();
    }

    // Unauthorized
    return res.status(401).json({ error: 'غير مصرح بالدخول، يرجى تسجيل الدخول بحساب مسؤول.' });
  };

  // Apply auth middleware and cache-control to all following admin endpoints
  router.use(adminAuthMiddleware);
  router.use((req, res, next) => {
    res.setHeader('Cache-Control', 'no-store');
    next();
  });

  // --- 3. GET CURRENT ADMIN PROFILE ---
  router.get('/me', (req, res) => {
    res.json({
      admin: req.admin
    });
  });

  // --- 4. GET RECENT SYSTEM ERRORS ---
  router.get('/errors', (req, res) => {
    const limit = clampPositiveInt(req.query.limit, 50, Math.min(MAX_ERROR_BUFFER || 100, 100));
    res.json({
      total: errorBuffer ? errorBuffer.length : 0,
      errors: errorBuffer ? errorBuffer.slice(-limit).reverse() : [],
    });
  });

  // --- 5. GET SYSTEM STATISTICS ---
  router.get('/stats', async (req, res) => {
    try {
      const db = getDb();
      if (!db) return res.status(500).json({ error: 'DB not connected' });

      const totalUsers = await db.collection(usersCollectionName).countDocuments();
      const verifiedUsers = await db.collection(usersCollectionName).countDocuments({ isVerified: true });
      const totalDesigns = await db.collection(designsCollectionName).countDocuments();
      
      // Most recent 5 designs
      const recentDesigns = await db.collection(designsCollectionName)
        .find({}, { projection: { shortId: 1, 'data.inputs.name': 1, views: 1, createdAt: 1 } })
        .sort({ createdAt: -1 })
        .limit(5)
        .toArray();

      res.json({
        totalUsers,
        verifiedUsers,
        totalDesigns,
        recentDesigns
      });
    } catch (err) {
      console.error('Admin stats error:', err);
      res.status(500).json({ error: 'Failed to fetch stats' });
    }
  });

  // --- 6. LIST USERS ---
  router.get('/users', async (req, res) => {
    try {
      const db = getDb();
      if (!db) return res.status(500).json({ error: 'DB not connected' });

      const limit = clampPositiveInt(req.query.limit, 20, 100);
      const page = clampPositiveInt(req.query.page, 1, 100000);
      const skip = (page - 1) * limit;
      
      let query = {};
      if (req.query.search) {
        const escapedSearch = req.query.search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        query = {
          $or: [
            { name: { $regex: escapedSearch, $options: 'i' } },
            { email: { $regex: escapedSearch, $options: 'i' } }
          ]
        };
      }

      const total = await db.collection(usersCollectionName).countDocuments(query);
      const users = await db.collection(usersCollectionName)
        .find(query, { projection: { password: 0, refreshTokenHash: 0, verificationTokenHash: 0, resetTokenHash: 0, resetTokenExpiry: 0 } })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .toArray();

      res.json({
        users,
        total,
        page,
        pages: Math.ceil(total / limit)
      });
    } catch (err) {
      console.error('Admin users error:', err);
      res.status(500).json({ error: 'Failed to fetch users' });
    }
  });

  // --- 7. CREATE OR UPDATE ADMIN CREDENTIALS (Email & Password) ---
  router.post('/set-credentials', async (req, res) => {
    try {
      const email = (req.body.email || '').trim().toLowerCase();
      const password = (req.body.password || '').trim();
      const name = (req.body.name || 'مسؤول النظام').trim();

      if (!email || !password || password.length < 6) {
        return res.status(400).json({ error: 'يرجى إدخال بريد إلكتروني صحيح وكلمة مرور لا تقل عن 6 أحرف.' });
      }

      const db = getDb();
      if (!db) return res.status(500).json({ error: 'DB not connected' });

      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(password, salt);

      const existing = await db.collection(usersCollectionName).findOne({ email });

      if (existing) {
        await db.collection(usersCollectionName).updateOne(
          { _id: existing._id },
          {
            $set: {
              password: hashedPassword,
              name: name || existing.name,
              role: 'admin',
              isAdmin: true,
              isVerified: true,
              updatedAt: new Date()
            }
          }
        );
      } else {
        await db.collection(usersCollectionName).insertOne({
          email,
          password: hashedPassword,
          name,
          role: 'admin',
          isAdmin: true,
          isVerified: true,
          createdAt: new Date(),
          updatedAt: new Date()
        });
      }

      res.json({
        success: true,
        message: 'تم حفظ وتحديث بيانات حساب المسؤول بنجاح.',
        user: { email, name, role: 'admin' }
      });
    } catch (err) {
      console.error('Set credentials error:', err);
      res.status(500).json({ error: 'فشل حفظ بيانات المسؤول.' });
    }
  });

  return router;
};

