#!/usr/bin/env node
/**
 * Externalize inline scripts from HTML files for strict CSP compliance.
 *
 * Scans every *.html file in the project root, extracts <script> blocks
 * that lack a src attribute (excluding JSON-LD), classifies them, and
 * replaces them with external <script src="..."> references.
 *
 * Common scripts (GTM, gtag, SW registration) are replaced with shared
 * files in /js/. Page-specific scripts are extracted to /js/<page>-page.js.
 *
 * Usage:  node scripts/externalize-inline-scripts.js [--dry-run]
 */
'use strict';

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const root = path.resolve(__dirname, '..');
const jsDir = path.join(root, 'js');
const dryRun = process.argv.includes('--dry-run');

// Shared script signatures → external file mapping.
const SHARED = [
  {
    test: content => /googletagmanager|gtm\.start/.test(content),
    file: 'js/gtm-bootstrap.js',
    alreadyExists: 'js/gtm-bootstrap.js'
  },
  {
    test: content => /gtag\('js'/.test(content) && /gtag\('config'/.test(content),
    file: 'js/gtag-config.js',
    alreadyExists: 'js/gtag-config.js'
  },
  {
    test: content => /serviceWorker.*register/.test(content) && /sw\.js/.test(content),
    file: 'js/sw-register.js',
    alreadyExists: 'js/sw-register.js'
  },
];

function ensureJsDir() {
  if (!fs.existsSync(jsDir)) fs.mkdirSync(jsDir, { recursive: true });
}

function isJsonLd(attrs) {
  return /type=["']application\/ld\+json["']/.test(attrs);
}

function extractInlineScripts(html) {
  const pattern = /<script([^>]*)>([\s\S]*?)<\/script>/g;
  const blocks = [];
  let match;
  let idx = 0;
  while ((match = pattern.exec(html)) !== null) {
    const attrs = match[1] || '';
    const content = match[2];
    const fullMatch = match[0];
    const hasSrc = /\bsrc=/.test(attrs);
    const isLdJson = isJsonLd(attrs);
    blocks.push({
      index: idx++,
      attrs,
      content,
      fullMatch,
      hasSrc,
      isLdJson,
      start: match.index,
      end: match.index + fullMatch.length
    });
  }
  return blocks;
}

function hashContent(content) {
  return crypto.createHash('sha256').update(content).digest('hex').slice(0, 12);
}

function classifyBlock(content) {
  const trimmed = content.trim();
  if (!trimmed) return { type: 'empty' };
  for (const shared of SHARED) {
    if (shared.test(trimmed)) return { type: 'shared', file: shared.file };
  }
  return { type: 'custom' };
}

function processFile(filePath) {
  const relPath = path.relative(root, filePath);
  const html = fs.readFileSync(filePath, 'utf8');
  const blocks = extractInlineScripts(html);

  const replacements = [];
  const customScripts = [];
  let pageName = path.basename(filePath, '.html');

  for (const block of blocks) {
    if (block.hasSrc || block.isLdJson) continue;
    const classification = classifyBlock(block.content);
    if (classification.type === 'empty') continue;

    if (classification.type === 'shared') {
      const src = classification.file;
      const newTag = `<script src="${src}"></script>`;
      replacements.push({ old: block.fullMatch, new: newTag, file: filePath });
    } else if (classification.type === 'custom') {
      const hash = hashContent(block.content);
      const outFile = `js/${pageName}-${hash}.js`;
      const outPath = path.join(root, outFile);
      const src = outFile;
      const newTag = `<script src="${src}" defer></script>`;
      replacements.push({ old: block.fullMatch, new: newTag, file: filePath });
      customScripts.push({ outPath, content: block.content.trim() });
    }
  }

  return { relPath, replacements, customScripts };
}

function main() {
  ensureJsDir();

  const htmlFiles = fs.readdirSync(root)
    .filter(f => f.endsWith('.html'))
    .map(f => path.join(root, f));

  let totalReplacements = 0;
  let totalCustomFiles = 0;
  let modifiedFiles = 0;

  for (const filePath of htmlFiles) {
    const { relPath, replacements, customScripts } = processFile(filePath);

    if (replacements.length === 0) continue;
    modifiedFiles++;

    // Write custom script files.
    if (!dryRun) {
      for (const cs of customScripts) {
        if (!fs.existsSync(cs.outPath)) {
          fs.writeFileSync(cs.outPath, cs.content + '\n');
          totalCustomFiles++;
        }
      }
    }

    // Apply replacements to HTML.
    let html = fs.readFileSync(filePath, 'utf8');
    for (const r of replacements) {
      html = html.replace(r.old, r.new);
    }

    if (!dryRun) {
      fs.writeFileSync(filePath, html);
    }

    totalReplacements += replacements.length;
    const sharedCount = replacements.filter(r => r.new.includes('/js/gtm-bootstrap.js') || r.new.includes('/js/gtag-config.js') || r.new.includes('/js/sw-register.js')).length;
    const customCount = replacements.length - sharedCount;
    console.log(`  ${relPath}: ${replacements.length} inline scripts → external (${sharedCount} shared, ${customCount} custom)`);
  }

  console.log(`\n${dryRun ? '[DRY RUN] ' : ''}Processed ${modifiedFiles} files: ${totalReplacements} inline scripts externalized, ${totalCustomFiles} custom JS files created.`);
}

main();
