const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const root = path.resolve(__dirname, '..');
const output = path.join(root, 'dist', 'static', 'nfc');
const includedExtensions = new Set([
  '.html', '.css', '.js', '.json', '.xml', '.svg', '.png', '.webp',
  '.jpg', '.jpeg', '.gif', '.ico', '.woff', '.woff2', '.ttf'
]);
const serverOnlyFiles = new Set([
  'server.js',
  'auth-middleware.js',
  'email-service.js',
  'package.json',
  'package-lock.json',
  'jest.config.js',
  'playwright.config.ts',
  'render.yaml',
  'minify-assets.js',
  'add-og-tags.js',
  'audit-pages.js',
  'convert-images.js',
  'fix-consistency.js',
  'fix-hreflang.js',
  'inject-premium.js',
  'optimize-images.js'
]);
const assetDirectories = ['backgrounds', 'images', 'libs'];

fs.rmSync(path.join(root, 'dist', 'static'), { recursive: true, force: true });
fs.mkdirSync(output, { recursive: true });

for (const entry of fs.readdirSync(root, { withFileTypes: true })) {
  if (!entry.isFile()) continue;
  const ext = path.extname(entry.name).toLowerCase();
  if (!includedExtensions.has(ext)) continue;
  if (entry.name.includes('.original.')) continue;
  if (serverOnlyFiles.has(entry.name)) continue;
  fs.copyFileSync(path.join(root, entry.name), path.join(output, entry.name));
}

for (const directory of assetDirectories) {
  const source = path.join(root, directory);
  if (fs.existsSync(source)) {
    fs.cpSync(source, path.join(output, directory), { recursive: true });
  }
}

const releaseSha = process.env.RELEASE_SHA || execFileSync('git', ['rev-parse', 'HEAD'], {
  cwd: root,
  encoding: 'utf8'
}).trim();
const { version } = require('../package.json');
fs.writeFileSync(
  path.join(output, 'release.json'),
  `${JSON.stringify({ version, sha: releaseSha }, null, 2)}\n`
);

for (const forbidden of serverOnlyFiles) {
  if (fs.existsSync(path.join(output, forbidden))) {
    throw new Error(`Server-only file leaked into static package: ${forbidden}`);
  }
}

console.log(`Static release package created at ${output}`);
