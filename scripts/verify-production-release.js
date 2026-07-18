'use strict';

const fs = require('fs');
const path = require('path');

const DEFAULT_PUBLIC_ORIGIN = 'https://www.mcprim.com';
const DEFAULT_API_ORIGIN = 'https://nfc-vjy6.onrender.com';
const DEFAULT_TIMEOUT_MS = 15000;
const DEFAULT_ATTEMPTS = 3;

const normalizeOrigin = (value) => String(value || '').trim().replace(/\/+$/, '');
const readUtf8 = (root, file) => fs.readFileSync(path.join(root, file), 'utf8');

function extractRuntimeValue(root, pattern, message) {
  const match = readUtf8(root, 'runtime-config.js').match(pattern);
  if (!match) throw new Error(message);
  return match[1];
}

function extractExpectedRelease(root) {
  return extractRuntimeValue(root, /__MC_PRIME_RELEASE\s*=.*?['"]([^'"]+)['"]/, 'Could not extract release');
}

function extractExpectedServiceWorkerCache(root) {
  const match = readUtf8(root, 'sw.js').match(/CACHE_VERSION\s*=\s*['"]([^'"]+)['"]/);
  if (!match) throw new Error('Could not extract Service Worker cache version');
  return match[1];
}

const extractExpectedToolbarAsset = (root) => extractRuntimeValue(
  root,
  /stylesheet\.href\s*=\s*['"]([^'"]*editor-toolbar-release\.css[^'"]*)['"]/,
  'Could not extract toolbar stylesheet'
);
const extractExpectedAssetManagerStyle = (root) => extractRuntimeValue(
  root,
  /stylesheet\.href\s*=\s*['"]([^'"]*editor-asset-manager\.css[^'"]*)['"]/,
  'Could not extract asset manager stylesheet'
);
const extractExpectedAssetManagerScript = (root) => extractRuntimeValue(
  root,
  /script\.src\s*=\s*['"]([^'"]*editor-asset-manager\.js[^'"]*)['"]/,
  'Could not extract asset manager script'
);
const extractExpectedTemplateManagerStyle = (root) => extractRuntimeValue(
  root,
  /stylesheet\.href\s*=\s*['"]([^'"]*editor-template-manager\.css[^'"]*)['"]/,
  'Could not extract template manager stylesheet'
);
const extractExpectedTemplateManagerScript = (root) => extractRuntimeValue(
  root,
  /script\.src\s*=\s*['"]([^'"]*editor-template-manager\.js[^'"]*)['"]/,
  'Could not extract template manager script'
);
const extractExpectedVersionManagerStyle = (root) => extractRuntimeValue(
  root,
  /stylesheet\.href\s*=\s*['"]([^'"]*editor-version-manager\.css[^'"]*)['"]/,
  'Could not extract version manager stylesheet'
);
const extractExpectedVersionManagerScript = (root) => extractRuntimeValue(
  root,
  /script\.src\s*=\s*['"]([^'"]*editor-version-manager\.js[^'"]*)['"]/,
  'Could not extract version manager script'
);
const extractExpectedProductivityStyle = (root) => extractRuntimeValue(
  root,
  /stylesheet\.href\s*=\s*['"]([^'"]*editor-productivity-tools\.css[^'"]*)['"]/,
  'Could not extract productivity tools stylesheet'
);
const extractExpectedProductivityScript = (root) => extractRuntimeValue(
  root,
  /script\.src\s*=\s*['"]([^'"]*editor-productivity-tools\.js[^'"]*)['"]/,
  'Could not extract productivity tools script'
);

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function requestWithRetry(url, options = {}) {
  const fetchImpl = options.fetchImpl || global.fetch;
  const attempts = options.attempts || DEFAULT_ATTEMPTS;
  const timeoutMs = options.timeoutMs || DEFAULT_TIMEOUT_MS;
  const token = options.cacheBuster || String(Date.now());
  const retryDelayMs = options.retryDelayMs === undefined ? 900 : options.retryDelayMs;
  if (typeof fetchImpl !== 'function') throw new Error('A Fetch API implementation is required');

  let lastError;
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const target = new URL(url);
      target.searchParams.set('__verify', `${token}-${attempt}`);
      const response = await fetchImpl(target.toString(), {
        redirect: 'follow', cache: 'no-store', signal: controller.signal,
        headers: { accept: '*/*', 'cache-control': 'no-cache', pragma: 'no-cache' }
      });
      const body = await response.text();
      clearTimeout(timer);
      if (response.status >= 500 && attempt < attempts) {
        lastError = new Error(`${url} returned HTTP ${response.status}`);
        await wait(retryDelayMs * attempt);
        continue;
      }
      return { response, body };
    } catch (error) {
      clearTimeout(timer);
      lastError = error;
      if (attempt < attempts) await wait(retryDelayMs * attempt);
    }
  }
  throw lastError || new Error(`Request failed: ${url}`);
}

function assertResponse(response, body, label, markers = []) {
  if (response.status !== 200) throw new Error(`${label} returned HTTP ${response.status}; expected 200`);
  for (const marker of markers) {
    if (!body.includes(marker)) throw new Error(`${label} is missing required marker: ${marker}`);
  }
}

async function executeCheck(name, task) {
  const startedAt = Date.now();
  try {
    return { name, status: 'passed', durationMs: Date.now() - startedAt, details: await task() || null };
  } catch (error) {
    return { name, status: 'failed', durationMs: Date.now() - startedAt, error: error?.message || String(error) };
  }
}

async function verifyProduction(options = {}) {
  const rootDir = options.rootDir || process.cwd();
  const publicOrigin = normalizeOrigin(options.publicOrigin || DEFAULT_PUBLIC_ORIGIN);
  const apiOrigin = normalizeOrigin(options.apiOrigin || DEFAULT_API_ORIGIN);
  const expected = {
    release: options.expectedRelease || extractExpectedRelease(rootDir),
    serviceWorkerCache: options.expectedCache || extractExpectedServiceWorkerCache(rootDir),
    toolbarAsset: options.expectedToolbarAsset || extractExpectedToolbarAsset(rootDir),
    assetManagerStyle: options.expectedAssetManagerStyle || extractExpectedAssetManagerStyle(rootDir),
    assetManagerScript: options.expectedAssetManagerScript || extractExpectedAssetManagerScript(rootDir),
    templateManagerStyle: options.expectedTemplateManagerStyle || extractExpectedTemplateManagerStyle(rootDir),
    templateManagerScript: options.expectedTemplateManagerScript || extractExpectedTemplateManagerScript(rootDir),
    versionManagerStyle: options.expectedVersionManagerStyle || extractExpectedVersionManagerStyle(rootDir),
    versionManagerScript: options.expectedVersionManagerScript || extractExpectedVersionManagerScript(rootDir),
    productivityStyle: options.expectedProductivityStyle || extractExpectedProductivityStyle(rootDir),
    productivityScript: options.expectedProductivityScript || extractExpectedProductivityScript(rootDir)
  };
  const requestOptions = {
    fetchImpl: options.fetchImpl || global.fetch,
    attempts: options.attempts || DEFAULT_ATTEMPTS,
    timeoutMs: options.timeoutMs || DEFAULT_TIMEOUT_MS,
    cacheBuster: options.cacheBuster || String(Date.now()),
    retryDelayMs: options.retryDelayMs === undefined ? 900 : options.retryDelayMs
  };
  const checks = [];

  async function checkUrl(name, url, markers) {
    checks.push(await executeCheck(name, async () => {
      const { response, body } = await requestWithRetry(url, requestOptions);
      assertResponse(response, body, name, markers);
      return { url, bytes: Buffer.byteLength(body) };
    }));
  }

  await checkUrl('Arabic editor shell', `${publicOrigin}/nfc/editor.html`, ['id="pro-toolbar"', 'runtime-config.js', 'editor-shell.js']);
  await checkUrl('English editor shell', `${publicOrigin}/nfc/editor-en.html`, ['id="pro-toolbar"', 'runtime-config.js', 'editor-shell.js']);
  await checkUrl('Runtime release marker', `${publicOrigin}/nfc/runtime-config.js`, [
    expected.release, expected.toolbarAsset, expected.assetManagerStyle, expected.assetManagerScript,
    expected.templateManagerStyle, expected.templateManagerScript,
    expected.versionManagerStyle, expected.versionManagerScript,
    expected.productivityStyle, expected.productivityScript, apiOrigin
  ]);
  await checkUrl('Toolbar release stylesheet', `${publicOrigin}${expected.toolbarAsset.split('?')[0]}`, [
    '--editor-toolbar-offset: 88px', 'padding-top: var(--editor-toolbar-offset)',
    'height: calc(100dvh - var(--editor-toolbar-offset))'
  ]);
  await checkUrl('Asset manager stylesheet', `${publicOrigin}${expected.assetManagerStyle.split('?')[0]}`, [
    '.asset-drop-zone', '.asset-upload-status', '.asset-crop-toolbar'
  ]);
  await checkUrl('Asset manager script', `${publicOrigin}${expected.assetManagerScript.split('?')[0]}`, [
    "const VERSION = '8.1.0'", "inputId: 'input-logo-upload'", 'editor:assetprocessed', 'data-crop-action'
  ]);
  await checkUrl('Template manager stylesheet', `${publicOrigin}${expected.templateManagerStyle.split('?')[0]}`, [
    '.editor-template-manager-panel', '.editor-template-card-preview', '.editor-template-modal-dialog'
  ]);
  await checkUrl('Template manager script', `${publicOrigin}${expected.templateManagerScript.split('?')[0]}`, [
    "const VERSION = '8.2.0'", "makeTemplate('executive-navy'", "makeTemplate('medical-trust'",
    'createPersonalTemplate', 'editor:templateapplied'
  ]);
  await checkUrl('Version manager stylesheet', `${publicOrigin}${expected.versionManagerStyle.split('?')[0]}`, [
    '.editor-cloud-version-popover', '.editor-version-sync-badge', '.editor-version-comparison'
  ]);
  await checkUrl('Version manager script', `${publicOrigin}${expected.versionManagerScript.split('?')[0]}`, [
    "const VERSION = '8.3.0'", 'syncPendingVersions', 'compareStates', 'editor:versionrestored'
  ]);
  await checkUrl('Productivity tools stylesheet', `${publicOrigin}${expected.productivityStyle.split('?')[0]}`, [
    '.editor-productivity-toolbar', '.editor-productivity-selected', '.editor-productivity-context-menu'
  ]);
  await checkUrl('Productivity tools script', `${publicOrigin}${expected.productivityScript.split('?')[0]}`, [
    "const VERSION = '9.0.0'", 'groupSelection', 'distributeSelection', 'moveToOtherFace',
    'editor:productivityselectionchange'
  ]);
  await checkUrl('Service Worker release cache', `${publicOrigin}/nfc/sw.js`, [
    `CACHE_VERSION = '${expected.serviceWorkerCache}'`, '/nfc/editor-toolbar-release.css',
    '/nfc/editor-asset-manager.js', '/nfc/editor-template-manager.js', '/nfc/editor-version-manager.js',
    '/nfc/editor-productivity-tools.js'
  ]);

  checks.push(await executeCheck('API health snapshot', async () => {
    const url = `${apiOrigin}/healthz`;
    const { response, body } = await requestWithRetry(url, requestOptions);
    assertResponse(response, body, '/healthz');
    const payload = JSON.parse(body);
    if (payload.status !== 'ok' || payload.checks?.server?.status !== 'ready') throw new Error('/healthz is not ready');
    return { url, release: payload.release, version: payload.version };
  }));

  checks.push(await executeCheck('API readiness', async () => {
    const url = `${apiOrigin}/readyz`;
    const { response, body } = await requestWithRetry(url, requestOptions);
    assertResponse(response, body, '/readyz');
    const payload = JSON.parse(body);
    if (payload.status !== 'ok' || payload.dbConnected !== true) throw new Error('/readyz database is not ready');
    if (!['ready', 'connected'].includes(payload.checks?.database?.status)) throw new Error('/readyz database check failed');
    if (payload.checks?.storage?.status !== 'ready' || payload.checks?.storage?.writable !== true) throw new Error('/readyz storage is not writable');
    return { url, release: payload.release, uptimeSeconds: payload.uptimeSeconds };
  }));

  checks.push(await executeCheck('API public health endpoint', async () => {
    const url = `${apiOrigin}/api/health`;
    const { response, body } = await requestWithRetry(url, requestOptions);
    assertResponse(response, body, '/api/health');
    const payload = JSON.parse(body);
    if (payload.status !== 'ok') throw new Error('/api/health is not ok');
    return { url, release: payload.release, version: payload.version };
  }));

  const failed = checks.filter((item) => item.status === 'failed');
  return {
    status: failed.length ? 'failed' : 'passed', checkedAt: new Date().toISOString(),
    publicOrigin, apiOrigin, expected,
    totals: { checks: checks.length, passed: checks.length - failed.length, failed: failed.length },
    checks
  };
}

function renderSummary(report) {
  const lines = [
    '# Production release verification', '',
    `**Result:** ${report.status === 'passed' ? '✅ Passed' : '❌ Failed'}`, '',
    `- Public frontend: \`${report.publicOrigin}\``, `- API: \`${report.apiOrigin}\``,
    `- Expected release: \`${report.expected.release}\``,
    `- Expected Service Worker cache: \`${report.expected.serviceWorkerCache}\``, '',
    '| Check | Result | Duration |', '|---|---:|---:|'
  ];
  for (const check of report.checks) {
    const result = check.status === 'passed' ? '✅ Passed' : `❌ ${check.error}`;
    lines.push(`| ${check.name} | ${result.replace(/\|/g, '\\|')} | ${check.durationMs} ms |`);
  }
  return `${lines.join('\n')}\n`;
}

function writeReport(report, outputPath) {
  const resolved = path.resolve(outputPath);
  fs.mkdirSync(path.dirname(resolved), { recursive: true });
  fs.writeFileSync(resolved, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  return resolved;
}

async function main() {
  const report = await verifyProduction({
    publicOrigin: process.env.PUBLIC_ORIGIN,
    apiOrigin: process.env.API_ORIGIN,
    expectedRelease: process.env.EXPECTED_RELEASE,
    expectedCache: process.env.EXPECTED_SW_CACHE,
    attempts: Number(process.env.VERIFY_ATTEMPTS || DEFAULT_ATTEMPTS),
    timeoutMs: Number(process.env.VERIFY_TIMEOUT_MS || DEFAULT_TIMEOUT_MS)
  });
  const savedAt = writeReport(report, process.env.PRODUCTION_VERIFY_REPORT || 'production-verification.json');
  console.log(renderSummary(report));
  console.log(`JSON report: ${savedAt}`);
  if (process.env.GITHUB_STEP_SUMMARY) fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, renderSummary(report), 'utf8');
  if (report.status !== 'passed') process.exitCode = 1;
}

module.exports = {
  extractExpectedRelease, extractExpectedServiceWorkerCache, extractExpectedToolbarAsset,
  extractExpectedAssetManagerStyle, extractExpectedAssetManagerScript,
  extractExpectedTemplateManagerStyle, extractExpectedTemplateManagerScript,
  extractExpectedVersionManagerStyle, extractExpectedVersionManagerScript,
  extractExpectedProductivityStyle, extractExpectedProductivityScript,
  normalizeOrigin, renderSummary, requestWithRetry, verifyProduction, writeReport
};

if (require.main === module) main().catch((error) => {
  console.error('[production-verification] Fatal error:', error);
  process.exitCode = 1;
});
