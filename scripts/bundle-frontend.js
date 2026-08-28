/**
 * Bundle editor frontend assets into single JS and CSS files.
 *
 * Reads the <script> and <link> tags from editor.html, concatenates
 * local (non-CDN) files in load order, minifies, and writes:
 *   - editor-bundle.js  (all deferred editor scripts)
 *   - editor-bundle.css (all editor stylesheets)
 *
 * Runtime-config.js, auth.js, and CDN-hosted libraries are excluded
 * because they must load independently before the bundle executes.
 *
 * Usage:  node scripts/bundle-frontend.js
 * Output: editor-bundle.js / editor-bundle.css in the project root.
 *
 * After testing, update editor.html to reference the bundles:
 *   <link rel="stylesheet" href="editor-bundle.css?v=1.0">
 *   <script src="editor-bundle.js?v=1.0" defer></script>
 */

'use strict';

const fs = require('fs');
const path = require('path');
const { minify: terserMinify } = require('terser');
const CleanCSS = require('clean-css');

const root = path.resolve(__dirname, '..');
const editorHtmlPath = path.join(root, 'editor.html');

// Files that must remain separate (loaded before or outside the bundle).
const EXCLUDE_JS = new Set([
  'runtime-config.js',
  'auth.js',
  'cookie-consent.js',     // loaded site-wide, keep separate
  'toolbar-tab-nav.js',    // loaded without defer, keep separate
]);

// CDN hosts to skip.
const CDN_HINTS = ['cdnjs.cloudflare.com', 'cdn.jsdelivr.net', 'fonts.googleapis.com', 'fonts.gstatic.com'];

function isCdn(url) {
  return CDN_HINTS.some(h => url.includes(h));
}

function resolveLocalPath(src) {
  // Strip query strings and leading /nfc/
  const clean = src.split('?')[0].replace(/^\/nfc\//, '');
  const candidate = path.resolve(root, clean);
  // Security: ensure the resolved path is inside the project root.
  if (!candidate.startsWith(root + path.sep) && candidate !== root) return null;
  return fs.existsSync(candidate) ? candidate : null;
}

async function main() {
  const html = fs.readFileSync(editorHtmlPath, 'utf8');

  // --- Collect JS files ---
  const scriptSrcRegex = /<script[^>]+src=["']([^"']+)["'][^>]*>/g;
  const jsFiles = [];
  let match;
  while ((match = scriptSrcRegex.exec(html)) !== null) {
    const src = match[1];
    if (isCdn(src)) continue;
    const basename = path.basename(src.split('?')[0]);
    if (EXCLUDE_JS.has(basename)) continue;
    const resolved = resolveLocalPath(src);
    if (!resolved) {
      console.warn(`[bundle] Skipping unresolved: ${src}`);
      continue;
    }
    jsFiles.push(resolved);
  }

  // --- Collect CSS files ---
  const linkHrefRegex = /<link[^>]+rel=["']stylesheet["'][^>]+href=["']([^"']+)["']/g;
  const cssFiles = [];
  while ((match = linkHrefRegex.exec(html)) !== null) {
    const href = match[1];
    if (isCdn(href)) continue;
    const basename = path.basename(href.split('?')[0]);
    if (basename === 'cookie-consent.css' || basename === 'premium-ui.css') continue;
    const resolved = resolveLocalPath(href);
    if (!resolved) {
      console.warn(`[bundle] Skipping unresolved CSS: ${href}`);
      continue;
    }
    cssFiles.push(resolved);
  }

  if (jsFiles.length === 0 && cssFiles.length === 0) {
    throw new Error('No local JS or CSS files found to bundle.');
  }

  // --- Concatenate and minify JS ---
  if (jsFiles.length > 0) {
    let combined = '';
    for (const filePath of jsFiles) {
      const code = fs.readFileSync(filePath, 'utf8');
      const rel = path.relative(root, filePath);
      combined += `\n/* ===== ${rel} ===== */\n${code}\n`;
    }
    const result = await terserMinify(combined, {
      compress: true,
      mangle: true,
      format: { comments: false }
    });
    const outPath = path.join(root, 'editor-bundle.js');
    fs.writeFileSync(outPath, result.code);
    const origSize = Buffer.byteLength(combined);
    const bundleSize = Buffer.byteLength(result.code);
    console.log(`[bundle] JS: ${jsFiles.length} files -> editor-bundle.js (${origSize} -> ${bundleSize} bytes, ${((1 - bundleSize / origSize) * 100).toFixed(1)}% smaller)`);
  }

  // --- Concatenate and minify CSS ---
  if (cssFiles.length > 0) {
    let combined = '';
    for (const filePath of cssFiles) {
      const code = fs.readFileSync(filePath, 'utf8');
      const rel = path.relative(root, filePath);
      combined += `\n/* ===== ${rel} ===== */\n${code}\n`;
    }
    const minifier = new CleanCSS({ returnPromise: true });
    const result = await minifier.minify(combined);
    if (result.errors.length > 0) {
      throw new Error(`CSS minify errors: ${result.errors.join('; ')}`);
    }
    const outPath = path.join(root, 'editor-bundle.css');
    fs.writeFileSync(outPath, result.styles);
    const origSize = Buffer.byteLength(combined);
    const bundleSize = Buffer.byteLength(result.styles);
    console.log(`[bundle] CSS: ${cssFiles.length} files -> editor-bundle.css (${origSize} -> ${bundleSize} bytes, ${((1 - bundleSize / origSize) * 100).toFixed(1)}% smaller)`);
  }

  console.log('[bundle] Done. Update editor.html to reference the bundles when ready.');
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
