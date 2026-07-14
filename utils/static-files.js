const express = require('express');
const path = require('path');

function registerCacheAndRedirectMiddleware(app) {
  app.use((req, res, next) => {
    if (req.path.startsWith('/api/')) {
      res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');
    } else if (req.path.endsWith('.html') || req.path.endsWith('/') || req.path.startsWith('/nfc/view/')) {
      res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');
    } else {
      res.setHeader('Cache-Control', 'public, max-age=604800, immutable');
    }
    next();
  });

  app.use((req, res, next) => {
    const hasQueryParams = req.url.includes('?');
    if (req.path.endsWith('.html') && !req.path.startsWith('/nfc/viewer.html') && !hasQueryParams) {
      const newPath = req.path.slice(0, -5);
      return res.redirect(301, newPath);
    }
    next();
  });

  app.get('/', (req, res) => {
    res.redirect(301, '/nfc/');
  });
}

function setNfcStaticHeaders(res, filePath) {
  const ext = path.extname(filePath).toLowerCase();
  const basename = path.basename(filePath).toLowerCase();
  res.setHeader('Vary', 'Accept-Encoding');

  if (basename === 'sw.js') {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
    res.setHeader('Service-Worker-Allowed', '/nfc/');
  } else if (['.css', '.js'].includes(ext)) {
    res.setHeader('Cache-Control', 'public, max-age=2592000, stale-while-revalidate=86400');
  } else if (['.png', '.jpg', '.jpeg', '.gif', '.webp', '.svg', '.ico', '.woff2', '.woff', '.ttf'].includes(ext)) {
    res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
  } else if (ext === '.html') {
    res.setHeader('Cache-Control', 'no-cache, must-revalidate');
  } else if (ext === '.json') {
    res.setHeader('Cache-Control', 'public, max-age=86400');
  }
}

function registerNfcStaticFiles(app, rootDir) {
  app.use('/nfc', express.static(rootDir, {
    extensions: ['html'],
    setHeaders: setNfcStaticHeaders
  }));
}

module.exports = {
  registerCacheAndRedirectMiddleware,
  registerNfcStaticFiles,
  setNfcStaticHeaders
};
