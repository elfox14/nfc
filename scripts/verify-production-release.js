'use strict';

const fs = require('fs');
const path = require('path');

const DEFAULT_PUBLIC_ORIGIN = 'https://www.mcprim.com';
const DEFAULT_API_ORIGIN = 'https://nfc-vjy6.onrender.com';
const DEFAULT_TIMEOUT_MS = 15000;
const DEFAULT_ATTEMPTS = 3;

function normalizeOrigin(value) {
  return String(value || '').trim().replace(/\/+$/, '');
}

function readUtf8(rootDir, relativePath) {
  return fs.readFileSync(path.join(rootDir, relativePath), 'utf8');
}

function extractPattern(rootDir, pattern, errorMessage) {
  const source = readUtf8(rootDir, 'runtime-config.js');
  const match = source.match(pattern);
  if (!match) throw new Error(errorMessage);
  return match[1];
}

function extractExpectedRelease(rootDir) {
  return extractPattern(rootDir, /__MC_PRIME_RELEASE\s*=.*?['"]([^'"]+)['"]/, 'Could not extract the expected public release from runtime-config.js');
}

function extractExpectedServiceWorkerCache(rootDir) {
  const source = readUtf8(rootDir, 'sw.js');
  const match = source.match(/CACHE_VERSION\s*=\s*['"]([^'"]+)['"]/);
  if (!match) throw new Error('Could not extract the expected Service Worker cache version from sw.js');
  return match[1];
}

function extractExpectedToolbarAsset(rootDir) {
  return extractPattern(rootDir, /stylesheet\.href\s*=\s*['"]([^'"]*editor-toolbar-release\.css[^'"]*)['"]/, 'Could not extract the toolbar release stylesheet URL from runtime-config.js');
}

function extractExpectedAssetManagerStyle(rootDir) {
  return extractPattern(rootDir, /stylesheet\.href\s*=\s*['"]([^'"]*editor-asset-manager\.css[^'"]*)['"]/, 'Could not extract the asset manager stylesheet URL from runtime-config.js');
}

function extractExpectedAssetManagerScript(rootDir) {
  return extractPattern(rootDir, /script\.src\s*=\s*['"]([^'"]*editor-asset-manager\.js[^'"]*)['"]/, 'Could not extract the asset manager script URL from runtime-config.js');
}

function extractExpectedTemplateManagerStyle(rootDir) {
  return extractPattern(rootDir, /stylesheet\.href\s*=\s*['"]([^'"]*editor-template-manager\.css[^'"]*)['"]/, 'Could not extract the template manager stylesheet URL from runtime-config.js');
}

function extractExpectedTemplateManagerScript(rootDir) {
  return extractPattern(rootDir, /script\.src\s*=\s*['"]([^'"]*editor-template-manager\.js[^'"]*)['"]/, 'Could not extract the template manager script URL from runtime-config.js');
}

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function withCacheBuster(url, token) {
  const parsed = new URL(url);
  parsed.searchParams.set('__verify', token);
  return parsed.toString();
}

async function requestWithRetry(url, options = {}) {
  const {
    fetchImpl = global.fetch,
    attempts = DEFAULT_ATTEMPTS,
    timeoutMs = DEFAULT_TIMEOUT_MS,
    cacheBuster = Date.now().toString(),
    retryDelayMs = 900
  } = options;
  if (typeof fetchImpl !== 'function') throw new Error('A Fetch API implementation is required');

  let lastError;
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const response = await fetchImpl(withCacheBuster(url, `${cacheBuster}-${attempt}`), {
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
      if (attempt < attempts) {
        await wait(retryDelayMs * attempt);
        continue;
      }
    }
  }
  throw lastError || new Error(`Request failed: ${url}`);
}

function assertStatus(response, expected, label) {
  if (response.status !== expected) throw new Error(`${label} returned HTTP ${response.status}; expected ${expected}`);
}

function assertContains(body, markers, label) {
  for (const marker of markers) {
    if (!body.includes(marker)) throw new Error(`${label} is missing required marker: ${marker}`);
  }
}

function parseJson(body, label) {
  try { return JSON.parse(body); } catch (_error) { throw new Error(`${label} did not return valid JSON`); }
}

async function executeCheck(name, run) {
  const startedAt = Date.now();
  try {
    const details = await run();
    return { name, status: 'passed', durationMs: Date.now() - startedAt, details: details || null };
  } catch (error) {
    return { name, status: 'failed', durationMs: Date.now() - startedAt, error: error?.message || String(error) };
  }
}

async function verifyStaticAsset(checks, name, publicOrigin, asset, markers, requestOptions) {
  checks.push(await executeCheck(name, async () => {
    const assetPath = asset.split('?')[0];
    const url = `${publicOrigin}${assetPath}`;
    const { response, body } = await requestWithRetry(url, requestOptions);
    assertStatus(response, 200, assetPath);
    assertContains(body, markers, assetPath);
    return { url, bytes: Buffer.byteLength(body) };
  }));
}

async function verifyProduction(options = {}) {
  const rootDir = options.rootDir || process.cwd();
  const publicOrigin = normalizeOrigin(options.publicOrigin || DEFAULT_PUBLIC_ORIGIN);
  const apiOrigin = normalizeOrigin(options.apiOrigin || DEFAULT_API_ORIGIN);
  const expectedRelease = options.expectedRelease || extractExpectedRelease(rootDir);
  const expectedCache = options.expectedCache || extractExpectedServiceWorkerCache(rootDir);
  const expectedToolbarAsset = options.expectedToolbarAsset || extractExpectedToolbarAsset(rootDir);
  const expectedAssetManagerStyle = options.expectedAssetManagerStyle || extractExpectedAssetManagerStyle(rootDir);
  const expectedAssetManagerScript = options.expectedAssetManagerScript || extractExpectedAssetManagerScript(rootDir);
  const expectedTemplateManagerStyle = options.expectedTemplateManagerStyle || extractExpectedTemplateManagerStyle(rootDir);
  const expectedTemplateManagerScript = options.expectedTemplateManagerScript || extractExpectedTemplateManagerScript(rootDir);
  const requestOptions = {
    fetchImpl: options.fetchImpl || global.fetch,
    attempts: options.attempts || DEFAULT_ATTEMPTS,
    timeoutMs: options.timeoutMs || DEFAULT_TIMEOUT_MS,
    cacheBuster: options.cacheBuster || Date.now().toString(),
    retryDelayMs: options.retryDelayMs === undefined ? 900 : options.retryDelayMs
  };
  const checks = [];

  checks.push(await executeCheck('Arabic editor shell', async () => {
    const url = `${publicOrigin}/nfc/editor.html`;
    const { response, body } = await requestWithRetry(url, requestOptions);
    assertStatus(response, 200, 'Arabic editor');
    assertContains(body, ['id="pro-toolbar"', 'runtime-config.js', 'editor-shell.js'], 'Arabic editor');
    return { url, bytes: Buffer.byteLength(body) };
  }));

  checks.push(await executeCheck('English editor shell', async () => {
    const url = `${publicOrigin}/nfc/editor-en.html`;
    const { response, body } = await requestWithRetry(url, requestOptions);
    assertStatus(response, 200, 'English editor');
    assertContains(body, ['id="pro-toolbar"', 'runtime-config.js', 'editor-shell.js'], 'English editor');
    return { url, bytes: Buffer.byteLength(body) };
  }));

  checks.push(await executeCheck('Runtime release marker', async () => {
    const url = `${publicOrigin}/nfc/runtime-config.js`;
    const { response, body } = await requestWithRetry(url, requestOptions);
    assertStatus(response, 200, 'runtime-config.js');
    assertContains(body, [
      expectedRelease, expectedToolbarAsset, expectedAssetManagerStyle, expectedAssetManagerScript,
      expectedTemplateManagerStyle, expectedTemplateManagerScript, apiOrigin
    ], 'runtime-config.js');
    return {
      url, expectedRelease, expectedToolbarAsset, expectedAssetManagerStyle, expectedAssetManagerScript,
      expectedTemplateManagerStyle, expectedTemplateManagerScript
    };
  }));

  await verifyStaticAsset(checks, 'Toolbar release stylesheet', publicOrigin, expectedToolbarAsset, [
    '--editor-toolbar-offset: 88px', 'padding-top: var(--editor-toolbar-offset)',
    'height: calc(100dvh - var(--editor-toolbar-offset))'
  ], requestOptions);

  await verifyStaticAsset(checks, 'Asset manager stylesheet', publicOrigin, expectedAssetManagerStyle, [
    '.asset-drop-zone', '.asset-upload-status', '.asset-crop-toolbar'
  ], requestOptions);

  await verifyStaticAsset(checks, 'Asset manager script', publicOrigin, expectedAssetManagerScript, [
    "const VERSION = '8.1.0'", "inputId: 'input-logo-upload'", "inputId: 'input-photo-upload'",
    'editor:assetprocessed', 'data-crop-action'
  ], requestOptions);

  await verifyStaticAsset(checks, 'Template manager stylesheet', publicOrigin, expectedTemplateManagerStyle, [
    '.editor-template-manager-panel', '.editor-template-card-preview', '.editor-template-modal-dialog',
    '.editor-template-save-form'
  ], requestOptions);

  await verifyStaticAsset(checks, 'Template manager script', publicOrigin, expectedTemplateManagerScript, [
    "const VERSION = '8.2.0'", "id: 'executive-navy'", "id: 'medical-trust'",
    'createPersonalTemplate', 'editor:templateapplied'
  ], requestOptions);

  checks.push(await executeCheck('Service Worker release cache', async () => {
    const url = `${publicOrigin}/nfc/sw.js`;
    const { response, body } = await requestWithRetry(url, requestOptions);
    assertStatus(response, 200, 'sw.js');
    assertContains(body, [
      `CACHE_VERSION = '${expectedCache}'`, '/nfc/editor-toolbar-release.css',
      '/nfc/editor-asset-manager.css', '/nfc/editor-asset-manager.js',
      '/nfc/editor-template-manager.css', '/nfc/editor-template-manager.js'
    ], 'sw.js');
    return { url, expectedCache };
  }));

  checks.push(await executeCheck('API health snapshot', async () => {
    const url = `${apiOrigin}/healthz`;
    const { response, body } = await requestWithRetry(url, requestOptions);
    assertStatus(response, 200, '/healthz');
    const payload = parseJson(body, '/healthz');
    if (payload.status !== 'ok') throw new Error(`/healthz reported ${payload.status || 'unknown'} instead of ok`);
    if (!payload.checks || payload.checks.server?.status !== 'ready') throw new Error('/healthz server check is not ready');
    return { url, release: payload.release, version: payload.version, database: payload.checks.database?.status, storage: payload.checks.storage?.status };
  }));

  checks.push(await executeCheck('API readiness', async () => {
    const url = `${apiOrigin}/readyz`;
    const { response, body } = await requestWithRetry(url, requestOptions);
    assertStatus(response, 200, '/readyz');
    const payload = parseJson(body, '/readyz');
    if (payload.status !== 'ok') throw new Error(`/readyz reported ${payload.status || 'unknown'} instead of ok`);
    if (payload.dbConnected !== true) throw new Error('/readyz reports the database as disconnected');
    if (!['ready', 'connected'].includes(payload.checks?.database?.status)) throw new Error(`/readyz database status is ${payload.checks?.database?.status || 'unknown'}`);
    if (payload.checks?.storage?.status !== 'ready' || payload.checks?.storage?.writable !== true) throw new Error('/readyz upload storage is not ready and writable');
    return { url, release: payload.release, uptimeSeconds: payload.uptimeSeconds };
  }));

  checks.push(await executeCheck('API public health endpoint', async () => {
    const url = `${apiOrigin}/api/health`;
    const { response, body } = await requestWithRetry(url, requestOptions);
    assertStatus(response, 200, '/api/health');
    const payload = parseJson(body, '/api/health');
    if (payload.status !== 'ok') throw new Error(`/api/health reported ${payload.status || 'unknown'}`);
    return { url, release: payload.release, version: payload.version };
  }));

  const failed = checks.filter((check) => check.status === 'failed');
  return {
    status: failed.length ? 'failed' : 'passed', checkedAt: new Date().toISOString(), publicOrigin, apiOrigin,
    expected: {
      release: expectedRelease, serviceWorkerCache: expectedCache, toolbarAsset: expectedToolbarAsset,
      assetManagerStyle: expectedAssetManagerStyle, assetManagerScript: expectedAssetManagerScript,
      templateManagerStyle: expectedTemplateManagerStyle, templateManagerScript: expectedTemplateManagerScript
    },
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
  lines.push('');
  return `${lines.join('\n')}\n`;
}

function writeReport(report, outputPath) {
  const resolved = path.resolve(outputPath);
  fs.mkdirSync(path.dirname(resolved), { recursive: true });
  fs.writeFileSync(resolved, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  return resolved;
}

async function main() {
  const outputPath = process.env.PRODUCTION_VERIFY_REPORT || 'production-verification.json';
  const report = await verifyProduction({
    publicOrigin: process.env.PUBLIC_ORIGIN, apiOrigin: process.env.API_ORIGIN,
    expectedRelease: process.env.EXPECTED_RELEASE, expectedCache: process.env.EXPECTED_SW_CACHE,
    attempts: Number(process.env.VERIFY_ATTEMPTS || DEFAULT_ATTEMPTS),
    timeoutMs: Number(process.env.VERIFY_TIMEOUT_MS || DEFAULT_TIMEOUT_MS)
  });
  const savedAt = writeReport(report, outputPath);
  console.log(renderSummary(report));
  console.log(`JSON report: ${savedAt}`);
  if (process.env.GITHUB_STEP_SUMMARY) fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, renderSummary(report), 'utf8');
  if (report.status !== 'passed') process.exitCode = 1;
}

module.exports = {
  extractExpectedRelease, extractExpectedServiceWorkerCache, extractExpectedToolbarAsset,
  extractExpectedAssetManagerStyle, extractExpectedAssetManagerScript,
  extractExpectedTemplateManagerStyle, extractExpectedTemplateManagerScript,
  normalizeOrigin, renderSummary, requestWithRetry, verifyProduction, writeReport
};

if (require.main === module) {
  main().catch((error) => {
    console.error('[production-verification] Fatal error:', error);
    process.exitCode = 1;
  });
}
