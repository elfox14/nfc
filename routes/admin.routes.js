const express = require('express');
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { ObjectId } = require('mongodb');

/**
 * Admin Router
 * @param {Object} dependencies
 * @param {Function} dependencies.getDb - Function returning the connected MongoDB instance
 * @param {string} [dependencies.usersCollectionName]
 * @param {string} [dependencies.designsCollectionName]
 * @param {string} [dependencies.cardRequestsCollectionName]
 * @param {string} [dependencies.savedCardsCollectionName]
 * @param {Array} dependencies.errorBuffer - Array containing recent system errors
 * @param {number} dependencies.MAX_ERROR_BUFFER - Max size of error buffer
 * @returns {express.Router}
 */
module.exports = function createAdminRouter({
  getDb,
  usersCollectionName = 'users',
  designsCollectionName = 'designs',
  cardRequestsCollectionName = 'cardRequests',
  savedCardsCollectionName = 'savedCards',
  errorBuffer = [],
  MAX_ERROR_BUFFER = 100
}) {
  const router = express.Router();

  function sha256Hex(value) {
    return crypto.createHash('sha256').update(value).digest('hex');
  }

  function safeCompare(a, b) {
    if (typeof a !== 'string' || typeof b !== 'string') return false;
    if (a.length !== b.length) return false;
    return crypto.timingSafeEqual(Buffer.from(a), Buffer.from(b));
  }

  function clampPositiveInt(value, fallback, max) {
    const parsed = Number.parseInt(value, 10);
    if (!Number.isFinite(parsed) || parsed < 1) return fallback;
    return Math.min(parsed, max);
  }

  function validateMasterToken(provided) {
    if (!provided || typeof provided !== 'string') return false;
    const token = provided.trim();
    if (!token) return false;

    const expectedHash = (process.env.ADMIN_TOKEN_SHA256 || '').trim().toLowerCase();
    const legacyExpected = (process.env.ADMIN_TOKENH || '').trim();
    const directPassword = (process.env.ADMIN_PASSWORD || process.env.ADMIN_TOKEN || '').trim();

    // 1. Direct password match (from ADMIN_PASSWORD in .env)
    if (directPassword && safeCompare(token, directPassword)) {
      return true;
    }

    // 2. Exact match of 64-char hex hash itself (in case user entered the hash from .env)
    if (expectedHash && /^[a-f0-9]{64}$/.test(expectedHash)) {
      if (safeCompare(token.toLowerCase(), expectedHash)) {
        return true;
      }
      // 3. SHA-256 hash match of entered plaintext against expectedHash
      if (safeCompare(sha256Hex(token), expectedHash)) {
        return true;
      }
    }

    // 4. Legacy token fallback
    if (legacyExpected && safeCompare(token, legacyExpected)) {
      return true;
    }

    return false;
  }

  // Prevent caching of all administrative endpoints
  router.use((req, res, next) => {
    res.setHeader('Cache-Control', 'no-store');
    next();
  });

  // ==========================================
  // 1. PUBLIC ADMIN AUTH ROUTE (Login)
  // ==========================================
  router.post('/login', async (req, res) => {
    try {
      const { token, email, password, tokenOrPassword } = req.body || {};

      // 1. Check direct token / master secret
      const candidateToken = (token || tokenOrPassword || (!email ? password : '') || '').trim();
      if (candidateToken && validateMasterToken(candidateToken)) {
        const sessionToken = jwt.sign(
          { role: 'admin', type: 'master', name: 'المسؤول الرئيسي' },
          process.env.JWT_SECRET || 'secret-admin-fallback-key',
          { expiresIn: '24h' }
        );
        return res.json({
          success: true,
          token: sessionToken,
          admin: { name: 'المسؤول الرئيسي', email: 'admin@system', role: 'admin', type: 'master' }
        });
      }

      // 2. Check admin user credentials (Email + Password)
      const userEmail = (email || '').trim().toLowerCase();
      const userPassword = (password || tokenOrPassword || '');

      if (userEmail && userPassword) {
        const db = getDb();
        if (!db) return res.status(500).json({ error: 'قاعدة البيانات غير متصلة' });

        const user = await db.collection(usersCollectionName).findOne({ email: userEmail });
        if (user && (user.role === 'admin' || user.isAdmin === true)) {
          const isMatch = await bcrypt.compare(userPassword, user.password);
          if (isMatch) {
            const sessionToken = jwt.sign(
              { userId: user.userId, email: user.email, role: 'admin', name: user.name || 'مسؤول' },
              process.env.JWT_SECRET || 'secret-admin-fallback-key',
              { expiresIn: '24h' }
            );
            return res.json({
              success: true,
              token: sessionToken,
              admin: { name: user.name || 'مسؤول', email: user.email, role: 'admin' }
            });
          }
        }
      }

      return res.status(401).json({ error: 'رمز الدخول أو بيانات المشرف غير صحيحة.' });
    } catch (err) {
      console.error('[Admin Login Error]:', err);
      return res.status(500).json({ error: 'حدث خطأ أثناء معالجة تسجيل الدخول.' });
    }
  });

  // ==========================================
  // 2. ADMIN AUTHENTICATION MIDDLEWARE
  // ==========================================
  const adminAuthMiddleware = (req, res, next) => {
    let rawToken = (req.headers['x-admin-token'] || '').trim();
    const authHeader = req.headers['authorization'];
    if (!rawToken && authHeader && authHeader.startsWith('Bearer ')) {
      rawToken = authHeader.substring(7).trim();
    }

    if (!rawToken) {
      return res.status(401).json({ error: 'يرجى تسجيل الدخول كمسؤول للمتابعة.' });
    }

    // A. Check master token
    if (validateMasterToken(rawToken)) {
      req.admin = { role: 'admin', type: 'master', name: 'المسؤول الرئيسي' };
      return next();
    }

    // B. Check JWT token
    try {
      const decoded = jwt.verify(rawToken, process.env.JWT_SECRET || 'secret-admin-fallback-key');
      if (decoded && (decoded.role === 'admin' || decoded.isAdmin)) {
        req.admin = decoded;
        return next();
      }
    } catch (_err) {
      // Invalid or expired JWT
    }

    console.warn('[Admin Auth Failed]', {
      providedLength: rawToken.length,
      hasSha: Boolean(process.env.ADMIN_TOKEN_SHA256),
      hasLegacy: Boolean(process.env.ADMIN_TOKENH)
    });
    return res.status(401).json({ error: 'جلسة الإدارة غير صالحة أو منتهية الصلاحية.' });
  };

  // Protect all downstream admin routes
  router.use(adminAuthMiddleware);

  // Verify active session
  router.get('/me', (req, res) => {
    res.json({ success: true, admin: req.admin });
  });

  // ==========================================
  // 3. STATS & OVERVIEW
  // ==========================================
  router.get('/stats', async (req, res) => {
    try {
      const db = getDb();
      if (!db) return res.status(500).json({ error: 'DB not connected' });

      const [
        totalUsers,
        verifiedUsers,
        adminUsers,
        totalDesigns,
        viewsAggregate,
        totalCardRequests,
        pendingCardRequests,
        completedCardRequests,
        recentDesigns,
        recentUsers
      ] = await Promise.all([
        db.collection(usersCollectionName).countDocuments(),
        db.collection(usersCollectionName).countDocuments({ isVerified: true }),
        db.collection(usersCollectionName).countDocuments({ $or: [{ role: 'admin' }, { isAdmin: true }] }),
        db.collection(designsCollectionName).countDocuments(),
        db.collection(designsCollectionName).aggregate([
          { $group: { _id: null, totalViews: { $sum: { $ifNull: ['$views', 0] } } } }
        ]).toArray(),
        db.collection(cardRequestsCollectionName).countDocuments().catch(() => 0),
        db.collection(cardRequestsCollectionName).countDocuments({ status: 'pending' }).catch(() => 0),
        db.collection(cardRequestsCollectionName).countDocuments({ status: 'completed' }).catch(() => 0),
        db.collection(designsCollectionName)
          .find({}, { projection: { shortId: 1, 'data.inputs.name': 1, views: 1, createdAt: 1, userId: 1 } })
          .sort({ createdAt: -1 })
          .limit(6)
          .toArray(),
        db.collection(usersCollectionName)
          .find({}, { projection: { userId: 1, name: 1, email: 1, isVerified: 1, role: 1, createdAt: 1 } })
          .sort({ createdAt: -1 })
          .limit(6)
          .toArray()
      ]);

      const totalViews = viewsAggregate && viewsAggregate.length > 0 ? viewsAggregate[0].totalViews : 0;

      res.json({
        totalUsers,
        verifiedUsers,
        unverifiedUsers: Math.max(0, totalUsers - verifiedUsers),
        adminUsers,
        totalDesigns,
        totalViews,
        totalCardRequests,
        pendingCardRequests,
        completedCardRequests,
        recentDesigns,
        recentUsers
      });
    } catch (err) {
      console.error('Admin stats error:', err);
      res.status(500).json({ error: 'فشل في استخراج الإحصائيات' });
    }
  });

  // ==========================================
  // 4. USERS MANAGEMENT
  // ==========================================
  router.get('/users', async (req, res) => {
    try {
      const db = getDb();
      if (!db) return res.status(500).json({ error: 'DB not connected' });

      const limit = clampPositiveInt(req.query.limit, 20, 100);
      const page = clampPositiveInt(req.query.page, 1, 100000);
      const skip = (page - 1) * limit;

      const query = {};

      if (req.query.search) {
        const escapedSearch = req.query.search.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        query.$or = [
          { name: { $regex: escapedSearch, $options: 'i' } },
          { email: { $regex: escapedSearch, $options: 'i' } },
          { userId: { $regex: escapedSearch, $options: 'i' } }
        ];
      }

      if (req.query.filter === 'verified') {
        query.isVerified = true;
      } else if (req.query.filter === 'unverified') {
        query.isVerified = { $ne: true };
      } else if (req.query.filter === 'admin') {
        query.$or = [{ role: 'admin' }, { isAdmin: true }];
      }

      const total = await db.collection(usersCollectionName).countDocuments(query);
      const users = await db.collection(usersCollectionName)
        .find(query, {
          projection: {
            password: 0,
            refreshTokenHash: 0,
            verificationTokenHash: 0,
            resetTokenHash: 0,
            resetTokenExpiry: 0
          }
        })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .toArray();

      res.json({
        users,
        total,
        page,
        pages: Math.ceil(total / limit) || 1
      });
    } catch (err) {
      console.error('Admin users error:', err);
      res.status(500).json({ error: 'فشل في تحميل قائمة المستخدمين' });
    }
  });

  // Update User (Verify / Change Role)
  router.patch('/users/:userId', async (req, res) => {
    try {
      const db = getDb();
      if (!db) return res.status(500).json({ error: 'DB not connected' });

      const { userId } = req.params;
      const { isVerified, role } = req.body;

      const updateFields = {};
      if (typeof isVerified === 'boolean') {
        updateFields.isVerified = isVerified;
      }
      if (role === 'admin' || role === 'user') {
        updateFields.role = role;
        updateFields.isAdmin = (role === 'admin');
      }

      if (Object.keys(updateFields).length === 0) {
        return res.status(400).json({ error: 'لا توجد حقول للتحديث' });
      }

      const result = await db.collection(usersCollectionName).updateOne(
        { userId },
        { $set: updateFields }
      );

      if (result.matchedCount === 0) {
        return res.status(404).json({ error: 'المستخدم غير موجود' });
      }

      res.json({ success: true, message: 'تم تحديث بيانات المستخدم بنجاح' });
    } catch (err) {
      console.error('Admin update user error:', err);
      res.status(500).json({ error: 'فشل تحديث بيانات المستخدم' });
    }
  });

  // Delete User
  router.delete('/users/:userId', async (req, res) => {
    try {
      const db = getDb();
      if (!db) return res.status(500).json({ error: 'DB not connected' });

      const { userId } = req.params;

      // Delete user record
      const result = await db.collection(usersCollectionName).deleteOne({ userId });
      if (result.deletedCount === 0) {
        return res.status(404).json({ error: 'المستخدم غير موجود' });
      }

      // Cleanup user designs and saved cards non-blockingly
      await Promise.allSettled([
        db.collection(designsCollectionName).deleteMany({ userId }),
        db.collection(savedCardsCollectionName).deleteMany({ userId }),
        db.collection(cardRequestsCollectionName).deleteMany({ $or: [{ requesterId: userId }, { ownerUserId: userId }] })
      ]);

      res.json({ success: true, message: 'تم حذف المستخدم وجميع بياناته بنجاح' });
    } catch (err) {
      console.error('Admin delete user error:', err);
      res.status(500).json({ error: 'فشل حذف المستخدم' });
    }
  });

  // ==========================================
  // 5. DESIGNS & CARDS MANAGEMENT
  // ==========================================
  router.get('/designs', async (req, res) => {
    try {
      const db = getDb();
      if (!db) return res.status(500).json({ error: 'DB not connected' });

      const limit = clampPositiveInt(req.query.limit, 20, 100);
      const page = clampPositiveInt(req.query.page, 1, 100000);
      const skip = (page - 1) * limit;

      const query = {};
      if (req.query.search) {
        const escapedSearch = req.query.search.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        query.$or = [
          { shortId: { $regex: escapedSearch, $options: 'i' } },
          { 'data.inputs.name': { $regex: escapedSearch, $options: 'i' } },
          { 'data.inputs.title': { $regex: escapedSearch, $options: 'i' } },
          { userId: { $regex: escapedSearch, $options: 'i' } }
        ];
      }

      const total = await db.collection(designsCollectionName).countDocuments(query);
      const designs = await db.collection(designsCollectionName)
        .find(query, {
          projection: {
            shortId: 1,
            userId: 1,
            views: 1,
            createdAt: 1,
            updatedAt: 1,
            'data.inputs.name': 1,
            'data.inputs.title': 1,
            'data.inputs.company': 1,
            'data.photo': 1,
            'data.theme': 1
          }
        })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .toArray();

      res.json({
        designs,
        total,
        page,
        pages: Math.ceil(total / limit) || 1
      });
    } catch (err) {
      console.error('Admin designs error:', err);
      res.status(500).json({ error: 'فشل في تحميل قائمة التصاميم' });
    }
  });

  // Delete Design
  router.delete('/designs/:shortId', async (req, res) => {
    try {
      const db = getDb();
      if (!db) return res.status(500).json({ error: 'DB not connected' });

      const { shortId } = req.params;
      const result = await db.collection(designsCollectionName).deleteOne({ shortId });

      if (result.deletedCount === 0) {
        return res.status(404).json({ error: 'التصميم غير موجود' });
      }

      await db.collection(savedCardsCollectionName).deleteMany({ shortId }).catch(() => {});

      res.json({ success: true, message: 'تم حذف التصميم بنجاح' });
    } catch (err) {
      console.error('Admin delete design error:', err);
      res.status(500).json({ error: 'فشل في حذف التصميم' });
    }
  });

  // ==========================================
  // 6. CARD REQUESTS (ORDERS) MANAGEMENT
  // ==========================================
  router.get('/card-requests', async (req, res) => {
    try {
      const db = getDb();
      if (!db) return res.status(500).json({ error: 'DB not connected' });

      const limit = clampPositiveInt(req.query.limit, 20, 100);
      const page = clampPositiveInt(req.query.page, 1, 100000);
      const skip = (page - 1) * limit;

      const query = {};
      if (req.query.status && ['pending', 'processing', 'completed', 'cancelled'].includes(req.query.status)) {
        query.status = req.query.status;
      }

      if (req.query.search) {
        const escapedSearch = req.query.search.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        query.$or = [
          { requesterName: { $regex: escapedSearch, $options: 'i' } },
          { requesterEmail: { $regex: escapedSearch, $options: 'i' } },
          { requesterPhone: { $regex: escapedSearch, $options: 'i' } },
          { designShortId: { $regex: escapedSearch, $options: 'i' } }
        ];
      }

      const total = await db.collection(cardRequestsCollectionName).countDocuments(query);
      const requests = await db.collection(cardRequestsCollectionName)
        .find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .toArray();

      res.json({
        requests,
        total,
        page,
        pages: Math.ceil(total / limit) || 1
      });
    } catch (err) {
      console.error('Admin card requests error:', err);
      res.status(500).json({ error: 'فشل في جلب طلبات البطاقات' });
    }
  });

  // Update Card Request Status
  router.patch('/card-requests/:id', async (req, res) => {
    try {
      const db = getDb();
      if (!db) return res.status(500).json({ error: 'DB not connected' });

      const { id } = req.params;
      const { status, adminNotes } = req.body;

      if (!['pending', 'processing', 'completed', 'cancelled'].includes(status)) {
        return res.status(400).json({ error: 'حالة الطلب غير صالحة' });
      }

      let query;
      try {
        query = { _id: new ObjectId(id) };
      } catch (_e) {
        query = { id };
      }

      const updateData = {
        status,
        updatedAt: new Date()
      };
      if (typeof adminNotes === 'string') {
        updateData.adminNotes = adminNotes.trim();
      }

      const result = await db.collection(cardRequestsCollectionName).updateOne(
        query,
        { $set: updateData }
      );

      if (result.matchedCount === 0) {
        return res.status(404).json({ error: 'الطلب غير موجود' });
      }

      res.json({ success: true, message: 'تم تحديث حالة الطلب بنجاح' });
    } catch (err) {
      console.error('Admin update request error:', err);
      res.status(500).json({ error: 'فشل في تحديث حالة الطلب' });
    }
  });

  // ==========================================
  // 7. ERRORS & LOGS (Test compatibility preserved)
  // ==========================================
  router.get('/errors', (req, res) => {
    const limit = clampPositiveInt(req.query.limit, 50, Math.min(MAX_ERROR_BUFFER || 100, 100));
    res.json({
      total: errorBuffer ? errorBuffer.length : 0,
      errors: errorBuffer ? errorBuffer.slice(-limit).reverse() : [],
    });
  });

  // Clear errors
  router.delete('/errors', (req, res) => {
    if (Array.isArray(errorBuffer)) {
      errorBuffer.length = 0;
    }
    res.json({ success: true, message: 'تم مسح سجل الأخطاء بنجاح' });
  });

  // ==========================================
  // 8. SYSTEM HEALTH & METRICS
  // ==========================================
  router.get('/system', async (req, res) => {
    try {
      const db = getDb();
      let dbStatus = 'disconnected';
      if (db) {
        try {
          await db.command({ ping: 1 });
          dbStatus = 'connected';
        } catch (_e) {
          dbStatus = 'error';
        }
      }

      const mem = process.memoryUsage();

      res.json({
        nodeVersion: process.version,
        platform: process.platform,
        uptimeSeconds: Math.floor(process.uptime()),
        uptimeFormatted: `${Math.floor(process.uptime() / 3600)}h ${Math.floor((process.uptime() % 3600) / 60)}m`,
        database: dbStatus,
        memory: {
          heapUsedMB: Math.round((mem.heapUsed / 1024 / 1024) * 100) / 100,
          heapTotalMB: Math.round((mem.heapTotal / 1024 / 1024) * 100) / 100,
          rssMB: Math.round((mem.rss / 1024 / 1024) * 100) / 100
        },
        environment: process.env.NODE_ENV || 'development'
      });
    } catch (err) {
      console.error('Admin system metrics error:', err);
      res.status(500).json({ error: 'فشل في استخراج بيانات النظام' });
    }
  });

  return router;
};
