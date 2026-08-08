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
  const blockedFiles = new Set([
    'server.js',
    'auth-middleware.js',
    'email-service.js',
    'package.json',
    'package-lock.json',
    'render.yaml',
    'playwright.config.ts',
    'jest.config.js',
    'minify-assets.js',
    'add-og-tags.js',
    'audit-pages.js',
    'convert-images.js',
    'fix-consistency.js',
    'fix-hreflang.js',
    'inject-premium.js',
    'optimize-images.js',
    'upload-config.php',  // PHP config — must never be served publicly
    'upload.php',         // PHP upload handler — not served from Node.js
  ]);
  const blockedDirectories = new Set([
    'routes', 'utils', 'test', 'e2e', 'scripts', 'docs', 'coverage', 'node_modules',
    'view', 'views', 'public', '.github', '.git'
  ]);
  const blockedExtensions = new Set([
    '.ejs', '.cjs', '.mjs', '.ts', '.map', '.md', '.yaml', '.yml', '.lock', '.log', '.php'
  ]);

  app.use('/nfc', (req, res, next) => {
    const segments = req.path.split('/').filter(Boolean);
    const basename = segments[segments.length - 1] || '';
    if (
      segments.some((segment) => blockedDirectories.has(segment)) ||
      blockedFiles.has(basename) ||
      blockedExtensions.has(path.extname(basename).toLowerCase()) ||
      basename.includes('.original.') ||
      basename.startsWith('.env')
    ) {
      return res.status(404).end();
    }
    next();
  });

  // Serve logo assets at root level as well to prevent logo 404s regardless of URL path
  const logoFiles = new Set([
    'mc-prime-nfc.png',
    'mcprime-logo-optimized.png',
    'mcprime-logo-optimized.webp',
    'mcprime-logo-transparent.png',
    'logo.svg',
    'logo.png',
    'favicon.ico'
  ]);

  app.get('*', (req, res, next) => {
    const basename = path.basename(req.path).toLowerCase();
    if (logoFiles.has(basename)) {
      const targetFile = path.resolve(rootDir, basename);
      if (fs.existsSync(targetFile)) {
        setNfcStaticHeaders(res, targetFile);
        return res.sendFile(targetFile);
      }
    }
    next();
  });

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
