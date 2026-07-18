'use strict';

const express = require('express');
const verifyToken = require('../auth-middleware');
const { getDesignWorkspaceAccess, isSafeDesignId } = require('../utils/workspace-access');

module.exports = function createWorkspacePublicationGuard({
  getDb,
  designsCollectionName = 'designs',
  workspacesCollectionName = 'workspaces'
}) {
  const router = express.Router();

  router.get(['/nfc/viewer', '/nfc/viewer.html'], verifyToken.optional, async (req, res, next) => {
    try {
      const db = getDb();
      if (!db) return next();
      const designId = String(req.query.id || '');
      if (!isSafeDesignId(designId)) return next();
      const design = await db.collection(designsCollectionName).findOne(
        { shortId: designId },
        { projection: { ownerId: 1, workspaceId: 1, workflow: 1 } }
      );
      if (!design?.workflow?.enabled || design.workflow.status === 'published') return next();

      if (req.user?.userId) {
        const access = await getDesignWorkspaceAccess({
          db, workspacesCollectionName, design, userId: req.user.userId
        });
        if (access.allowed) {
          res.setHeader('X-Robots-Tag', 'noindex, noarchive');
          return next();
        }
      }

      res.setHeader('X-Robots-Tag', 'noindex, noarchive');
      return res.status(404).send('Design not found or not published');
    } catch (error) {
      console.error('[WorkspacePublicationGuard] Failed:', error);
      return res.status(500).send('Unable to verify publication state');
    }
  });

  return router;
};
