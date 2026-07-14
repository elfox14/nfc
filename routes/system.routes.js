const express = require('express');
const fs = require('fs');
const path = require('path');

module.exports = function createSystemRouter({ getDb, rootDir }) {
  const router = express.Router();

  router.get('/healthz', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString(), dbConnected: !!getDb() });
  });

  router.get('/api/health', (req, res) => {
    res.status(200).json({ status: 'ok' });
  });

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
