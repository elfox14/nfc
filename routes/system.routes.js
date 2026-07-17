const express = require('express');
const fs = require('fs');
const path = require('path');
const packageJson = require('../package.json');

const DATABASE_TIMEOUT_MS = 1500;

module.exports = function createSystemRouter({ getDb, rootDir }) {
  const router = express.Router();
  const applicationRoot = rootDir || process.cwd();
  const release = String(
    process.env.RENDER_GIT_COMMIT ||
    process.env.GITHUB_SHA ||
    process.env.SOURCE_VERSION ||
    'local'
  ).slice(0, 12);

  function timeoutAfter(ms) {
    return new Promise((_, reject) => {
      const timer = setTimeout(() => reject(new Error('Database health check timed out')), ms);
      if (typeof timer.unref === 'function') timer.unref();
    });
  }

  async function checkDatabase() {
    const startedAt = Date.now();
    let db;
    try {
      db = getDb();
    } catch (error) {
      return { status: 'error', latencyMs: Date.now() - startedAt, message: error.message };
    }

    if (!db) return { status: 'disconnected', latencyMs: null };
    if (typeof db.command !== 'function') {
      return { status: 'connected', latencyMs: Date.now() - startedAt };
    }

    try {
      await Promise.race([db.command({ ping: 1 }), timeoutAfter(DATABASE_TIMEOUT_MS)]);
      return { status: 'ready', latencyMs: Date.now() - startedAt };
    } catch (error) {
      return { status: 'error', latencyMs: Date.now() - startedAt, message: error.message };
    }
  }

  function checkStorage() {
    const uploadsDir = path.join(applicationRoot, 'uploads');
    try {
      if (!fs.existsSync(uploadsDir)) {
        return { status: 'missing', writable: false };
      }
      fs.accessSync(uploadsDir, fs.constants.R_OK | fs.constants.W_OK);
      return { status: 'ready', writable: true };
    } catch (error) {
      return { status: 'error', writable: false, message: error.message };
    }
  }

  async function buildSnapshot() {
    const [database, storage] = await Promise.all([
      checkDatabase(),
      Promise.resolve(checkStorage())
    ]);
    const databaseReady = ['ready', 'connected'].includes(database.status);
    const storageReady = storage.status === 'ready';

    return {
      status: databaseReady && storageReady ? 'ok' : 'degraded',
      timestamp: new Date().toISOString(),
      version: packageJson.version,
      release,
      uptimeSeconds: Math.floor(process.uptime()),
      dbConnected: databaseReady,
      checks: {
        server: { status: 'ready' },
        database,
        storage
      }
    };
  }

  router.get('/healthz', async (req, res) => {
    const snapshot = await buildSnapshot();
    res.set('Cache-Control', 'no-store');
    res.status(200).json(snapshot);
  });

  router.get('/readyz', async (req, res) => {
    const snapshot = await buildSnapshot();
    res.set('Cache-Control', 'no-store');
    res.status(snapshot.status === 'ok' ? 200 : 503).json(snapshot);
  });

  router.get('/api/health', (req, res) => {
    res.set('Cache-Control', 'no-store');
    res.status(200).json({
      status: 'ok',
      version: packageJson.version,
      release,
      uptimeSeconds: Math.floor(process.uptime())
    });
  });

  router.get(['/nfc/editor', '/nfc/editor.html'], (req, res) => {
    if (req.useragent.isMobile) {
      const mobilePath = path.join(applicationRoot, 'editor-mobile.html');
      if (fs.existsSync(mobilePath)) {
        return res.sendFile(mobilePath);
      }
      console.log('[Editor] Mobile user detected, but editor-mobile.html not found. Serving editor.html.');
    }
    res.sendFile(path.join(applicationRoot, 'editor.html'));
  });

  return router;
};
