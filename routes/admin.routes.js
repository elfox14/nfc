const express = require('express');

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

  // Admin authentication middleware
  const adminAuthMiddleware = (req, res, next) => {
    const expected = (process.env.ADMIN_TOKENH || '').trim();
    const provided = (req.headers['x-admin-token'] || '').trim();
    
    if (!expected || expected === '' || expected !== provided) {
      console.warn('[Admin Auth Failed]', { providedLength: provided?.length, expectedLength: expected?.length });
      return res.status(401).json({ error: 'Unauthorized' });
    }
    next();
  };

  // Apply auth middleware to all admin routes
  router.use(adminAuthMiddleware);

  const usersCollectionName = process.env.MONGO_USERS_COLL || 'users';
  const designsCollectionName = process.env.MONGO_DESIGNS_COLL || 'designs';

  // 1. Get recent errors
  router.get('/errors', (req, res) => {
    const limit = Math.min(parseInt(req.query.limit) || 50, MAX_ERROR_BUFFER || 100);
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

      const limit = parseInt(req.query.limit) || 20;
      const page = parseInt(req.query.page) || 1;
      const skip = (page - 1) * limit;
      
      let query = {};
      if (req.query.search) {
        query = {
          $or: [
            { name: { $regex: req.query.search, $options: 'i' } },
            { email: { $regex: req.query.search, $options: 'i' } }
          ]
        };
      }

      const total = await db.collection(usersCollectionName).countDocuments(query);
      const users = await db.collection(usersCollectionName)
        .find(query, { projection: { password: 0, refreshTokenHash: 0, verificationTokenHash: 0 } })
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
