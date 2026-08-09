const express = require('express');
const path = require('path');
const fs = require('fs');

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

function injectCspNonceIntoHtml(html, nonce) {
  if (!nonce) return html;
  // Static HTML is trusted repository content. Every script element receives the
  // per-request nonce so the strict CSP can execute both external and inline scripts.
  return html.replace(/<script(?![^>]*\bnonce\s*=)/gi, `<script nonce="${nonce}"`);
}

function resolveStaticHtml(rootDir, requestPath) {
  let decodedPath;
  try {
    decodedPath = decodeURIComponent(requestPath);
  } catch {
    return null;
  }

  const relativePath = decodedPath.replace(/^\/+/, '');
  const root = path.resolve(rootDir);
  let candidate = path.resolve(root, relativePath);

  if (!candidate.startsWith(`${root}${path.sep}`) && candidate !== root) return null;

  if (fs.existsSync(candidate) && fs.statSync(candidate).isFile() && path.extname(candidate).toLowerCase() === '.html') {
    return candidate;
  }

  if (!path.extname(candidate)) {
    const htmlCandidate = `${candidate}.html`;
    if (htmlCandidate.startsWith(`${root}${path.sep}`) && fs.existsSync(htmlCandidate) && fs.statSync(htmlCandidate).isFile()) {
      return htmlCandidate;
    }
  }

  if (fs.existsSync(candidate) && fs.statSync(candidate).isDirectory()) {
    const indexCandidate = path.join(candidate, 'index.html');
    if (indexCandidate.startsWith(`${root}${path.sep}`) && fs.existsSync(indexCandidate) && fs.statSync(indexCandidate).isFile()) {
      return indexCandidate;
    }
  }

  return null;
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
    'upload-config.php',
    'upload.php',
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

  const logoFileMap = {
    'mc-prime-nfc.png': path.resolve(rootDir, 'mc-prime-nfc.png'),
    'mcprime-logo-optimized.png': path.resolve(rootDir, 'mcprime-logo-optimized.png'),
    'mcprime-logo-optimized.webp': path.resolve(rootDir, 'mcprime-logo-optimized.webp'),
    'mcprime-logo-transparent.png': path.resolve(rootDir, 'mcprime-logo-transparent.png'),
    'logo.svg': path.resolve(rootDir, 'logo.svg'),
    'logo.png': path.resolve(rootDir, 'logo.png'),
    'favicon.ico': path.resolve(rootDir, 'favicon.ico')
  };

  Object.entries(logoFileMap).forEach(([filename, filePath]) => {
    app.get(`/${filename}`, (req, res, next) => {
      if (fs.existsSync(filePath)) {
        setNfcStaticHeaders(res, filePath);
        return res.sendFile(filePath);
      }
      next();
    });
  });

  // Static HTML must receive the same nonce that security-headers.js placed in
  // the CSP header for this request. Without this, browsers correctly ignore
  // 'unsafe-inline' when a nonce is present and block the page's inline scripts.
  app.use('/nfc', (req, res, next) => {
    if (!['GET', 'HEAD'].includes(req.method)) return next();

    const filePath = resolveStaticHtml(rootDir, req.path);
    if (!filePath) return next();

    fs.readFile(filePath, 'utf8', (err, html) => {
      if (err) return next(err);
      setNfcStaticHeaders(res, filePath);
      res.type('html');
      return res.send(injectCspNonceIntoHtml(html, res.locals.cspNonce));
    });
  });

  app.use('/nfc', express.static(rootDir, {
    extensions: ['html'],
    setHeaders: setNfcStaticHeaders
  }));
}

module.exports = {
  registerCacheAndRedirectMiddleware,
  registerNfcStaticFiles,
  setNfcStaticHeaders,
  injectCspNonceIntoHtml,
  resolveStaticHtml
};