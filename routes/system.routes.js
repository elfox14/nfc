const express = require('express');
const fs = require('fs');
const path = require('path');

module.exports = function createSystemRouter({ getDb, rootDir }) {
  const router = express.Router();

  async function healthCheck(req, res) {
    const db = getDb();
    if (!db) {
      return res.status(503).json({
        status: 'unavailable',
        database: 'disconnected',
        release: process.env.RENDER_GIT_COMMIT || process.env.RELEASE_SHA || null,
        timestamp: new Date().toISOString()
      });
    }

    try {
      await db.command({ ping: 1 });
      return res.status(200).json({
        status: 'ok',
        database: 'connected',
        release: process.env.RENDER_GIT_COMMIT || process.env.RELEASE_SHA || null,
        timestamp: new Date().toISOString()
      });
    } catch (_error) {
      return res.status(503).json({
        status: 'unavailable',
        database: 'disconnected',
        release: process.env.RENDER_GIT_COMMIT || process.env.RELEASE_SHA || null,
        timestamp: new Date().toISOString()
      });
    }
  }

  router.get('/healthz', healthCheck);
  router.get('/api/health', healthCheck);

  router.get(['/nfc/editor', '/nfc/editor.html'], (req, res) => {
    if (req.useragent.isMobile) {
      const mobilePath = path.join(rootDir, 'editor-mobile.html');
      if (fs.existsSync(mobilePath)) {
        return res.sendFile(mobilePath);
      }
      console.log('[Editor] Mobile user detected, but editor-mobile.html not found. Serving editor.html.');
    }
    res.sendFile(path.join(rootDir, 'editor.html'));
  });

  return router;
};
