const express = require('express');
const crypto = require('crypto');

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

  // Admin authentication middleware
  const adminAuthMiddleware = (req, res, next) => {
    const expectedHash = (process.env.ADMIN_TOKEN_SHA256 || '').trim().toLowerCase();
    const legacyExpected = (process.env.ADMIN_TOKENH || '').trim();
    const provided = (req.headers['x-admin-token'] || '').trim();

    const isValid = expectedHash
      ? /^[a-f0-9]{64}$/.test(expectedHash) && safeCompare(sha256Hex(provided), expectedHash)
      : legacyExpected && safeCompare(provided, legacyExpected);

    if (!isValid) {
      console.warn('[Admin Auth Failed]', { providedLength: provided?.length, configured: Boolean(expectedHash || legacyExpected) });
      return res.status(401).json({ error: 'Unauthorized' });
    }
    next();
  };

  // Apply auth middleware to all admin routes
  router.use(adminAuthMiddleware);
  router.use((req, res, next) => {
    res.setHeader('Cache-Control', 'no-store');
    next();
  });

  const usersCollectionName = process.env.MONGO_USERS_COLL || 'users';
  const designsCollectionName = process.env.MONGO_DESIGNS_COLL || 'designs';

  // 1. Get recent errors
  router.get('/errors', (req, res) => {
    const limit = clampPositiveInt(req.query.limit, 50, Math.min(MAX_ERROR_BUFFER || 100, 100));
    res.json({
      total: errorBuffer ? errorBuffer.length : 0,
      errors: errorBuffer ? errorBuffer.slice(-limit).reverse() : [],
    });
  });

  // 2. Get system statistics
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

  // 3. List users
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

  return router;
};
