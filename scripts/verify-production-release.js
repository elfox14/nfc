'use strict';

const fs = require('fs');
const path = require('path');

const DEFAULT_PUBLIC_ORIGIN = 'https://www.mcprim.com';
const DEFAULT_API_ORIGIN = 'https://nfc-vjy6.onrender.com';
const DEFAULT_TIMEOUT_MS = 15000;
const DEFAULT_ATTEMPTS = 3;

const normalizeOrigin = value => String(value || '').trim().replace(/\/+$/, '');
const readUtf8 = (root, file) => fs.readFileSync(path.join(root, file), 'utf8');
const escapeRegex = value => String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

function extractRuntimeValue(root, pattern, message) {
  const match = readUtf8(root, 'runtime-config.js').match(pattern);
  if (!match) throw new Error(message);
  return match[1];
}

function extractRuntimeAsset(root, filename, message) {
  const pattern = new RegExp(`['\"]([^'\"]*${escapeRegex(filename)}[^'\"]*)['\"]`);
  return extractRuntimeValue(root, pattern, message || `Could not extract ${filename}`);
}

function extractExpectedRelease(root) {
  return extractRuntimeValue(root, /__MC_PRIME_RELEASE\s*=.*?['"]([^'"]+)['"]/, 'Could not extract release');
}

function extractExpectedServiceWorkerCache(root) {
  const match = readUtf8(root, 'sw.js').match(/CACHE_VERSION\s*=\s*['"]([^'"]+)['"]/);
  if (!match) throw new Error('Could not extract Service Worker cache version');
  return match[1];
}

const extractExpectedToolbarAsset = root => extractRuntimeAsset(root, 'editor-toolbar-release.css');
const extractExpectedAssetManagerStyle = root => extractRuntimeAsset(root, 'editor-asset-manager.css');
const extractExpectedAssetManagerScript = root => extractRuntimeAsset(root, 'editor-asset-manager.js');
const extractExpectedTemplateManagerStyle = root => extractRuntimeAsset(root, 'editor-template-manager.css');
const extractExpectedTemplateManagerScript = root => extractRuntimeAsset(root, 'editor-template-manager.js');
const extractExpectedVersionManagerStyle = root => extractRuntimeAsset(root, 'editor-version-manager.css');
const extractExpectedVersionManagerScript = root => extractRuntimeAsset(root, 'editor-version-manager.js');
const extractExpectedProductivityStyle = root => extractRuntimeAsset(root, 'editor-productivity-tools.css');
const extractExpectedProductivityScript = root => extractRuntimeAsset(root, 'editor-productivity-tools.js');
const extractExpectedBrandKitStyle = root => extractRuntimeAsset(root, 'brand-kit.css');
const extractExpectedBrandKitClient = root => extractRuntimeAsset(root, 'brand-kit-client.js');
const extractExpectedDashboardBrandKitScript = root => extractRuntimeAsset(root, 'dashboard-brand-kit.js');
const extractExpectedEditorBrandKitScript = root => extractRuntimeAsset(root, 'editor-brand-kit.js');
const extractExpectedWorkspaceStyle = root => extractRuntimeAsset(root, 'workspace.css');
const extractExpectedWorkspaceClient = root => extractRuntimeAsset(root, 'workspace-client.js');
const extractExpectedDashboardWorkspacesScript = root => extractRuntimeAsset(root, 'dashboard-workspaces.js');
const extractExpectedEditorReviewWorkflowScript = root => extractRuntimeAsset(root, 'editor-review-workflow.js');

const wait = ms => new Promise(resolve => setTimeout(resolve, ms));

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
        redirect: 'follow',
        cache: 'no-store',
        signal: controller.signal,
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
    productivityScript: options.expectedProductivityScript || extractExpectedProductivityScript(rootDir),
    brandKitStyle: options.expectedBrandKitStyle || extractExpectedBrandKitStyle(rootDir),
    brandKitClient: options.expectedBrandKitClient || extractExpectedBrandKitClient(rootDir),
    dashboardBrandKitScript: options.expectedDashboardBrandKitScript || extractExpectedDashboardBrandKitScript(rootDir),
    editorBrandKitScript: options.expectedEditorBrandKitScript || extractExpectedEditorBrandKitScript(rootDir),
    workspaceStyle: options.expectedWorkspaceStyle || extractExpectedWorkspaceStyle(rootDir),
    workspaceClient: options.expectedWorkspaceClient || extractExpectedWorkspaceClient(rootDir),
    dashboardWorkspacesScript: options.expectedDashboardWorkspacesScript || extractExpectedDashboardWorkspacesScript(rootDir),
    editorReviewWorkflowScript: options.expectedEditorReviewWorkflowScript || extractExpectedEditorReviewWorkflowScript(rootDir)
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

  async function checkEditorDocument(name, url) {
    checks.push(await executeCheck(name, async () => {
      const { response, body } = await requestWithRetry(url, requestOptions);
      assertResponse(response, body, name, ['id="pro-toolbar"', 'runtime-config.js', 'editor-shell.js', 'editor-logo-fit.js']);
      const normalized = body.replace(/^\uFEFF/, '');
      if (!normalized.startsWith('<!DOCTYPE html>')) throw new Error(`${name} does not start with <!DOCTYPE html>`);
      if (/Warning:\s*truncated output|Total output lines:/i.test(normalized.slice(0, 400))) throw new Error(`${name} contains injected output metadata`);
      return { url, bytes: Buffer.byteLength(body) };
    }));
  }

  await checkEditorDocument('Arabic editor shell', `${publicOrigin}/nfc/editor.html`);
  await checkEditorDocument('English editor shell', `${publicOrigin}/nfc/editor-en.html`);
  await checkUrl('Arabic dashboard shell', `${publicOrigin}/nfc/dashboard.html`, ['dashboard-main', 'runtime-config.js', 'auth.js']);
  await checkUrl('English dashboard shell', `${publicOrigin}/nfc/dashboard-en.html`, ['dashboard-main', 'runtime-config.js', 'auth.js']);
  await checkUrl('Runtime release marker', `${publicOrigin}/nfc/runtime-config.js`, [
    expected.release, expected.toolbarAsset, expected.assetManagerStyle, expected.assetManagerScript,
    expected.templateManagerStyle, expected.templateManagerScript,
    expected.versionManagerStyle, expected.versionManagerScript,
    expected.productivityStyle, expected.productivityScript,
    expected.brandKitStyle, expected.brandKitClient, expected.dashboardBrandKitScript,
    expected.editorBrandKitScript, expected.workspaceStyle, expected.workspaceClient,
    expected.dashboardWorkspacesScript, expected.editorReviewWorkflowScript, apiOrigin
  ]);
  await checkUrl('Toolbar release stylesheet', `${publicOrigin}${expected.toolbarAsset.split('?')[0]}`, [
    '--editor-toolbar-offset: 88px', 'padding-top: var(--editor-toolbar-offset)',
    'height: calc(100dvh - var(--editor-toolbar-offset))', '#editor-review-workflow-btn'
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
    "const VERSION = '8.2.0'", "makeTemplate('executive-navy'", 'createPersonalTemplate', 'editor:templateapplied'
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
    "const VERSION = '9.0.0'", 'groupSelection', 'distributeSelection', 'moveToOtherFace'
  ]);
  await checkUrl('Brand Kit stylesheet', `${publicOrigin}${expected.brandKitStyle.split('?')[0]}`, [
    '.brand-kit-workspace', '.brand-kit-modal', '.brand-kit-editor-actions'
  ]);
  await checkUrl('Brand Kit API client', `${publicOrigin}${expected.brandKitClient.split('?')[0]}`, [
    "const VERSION = '10.0.0'", 'installFormSubmitBridge', 'applyDesigns', 'addMember'
  ]);
  await checkUrl('Dashboard Brand Kit workspace', `${publicOrigin}${expected.dashboardBrandKitScript.split('?')[0]}`, [
    "const VERSION = '10.0.0'", 'section-brand-kit', 'applyDesigns', 'updateMember'
  ]);
  await checkUrl('Editor Brand Kit integration', `${publicOrigin}${expected.editorBrandKitScript.split('?')[0]}`, [
    "const VERSION = '10.0.0'", 'applyIdentity', 'saveTemplate', 'editor:brandkitapplied'
  ]);
  await checkUrl('Team workspace stylesheet', `${publicOrigin}${expected.workspaceStyle.split('?')[0]}`, [
    '.workspace-dashboard-section', '.workspace-editor-modal', '.workspace-status'
  ]);
  await checkUrl('Team workspace API client', `${publicOrigin}${expected.workspaceClient.split('?')[0]}`, [
    "const VERSION = '11.0.0'", 'submitReview', 'resolveComment', 'linkDesign'
  ]);
  await checkUrl('Dashboard team workspace', `${publicOrigin}${expected.dashboardWorkspacesScript.split('?')[0]}`, [
    "const VERSION = '11.0.0'", 'section-team-workspace', 'request_changes', 'linkDesign'
  ]);
  await checkUrl('Editor review workflow', `${publicOrigin}${expected.editorReviewWorkflowScript.split('?')[0]}`, [
    "const VERSION = '11.0.0'", 'workspace-review-modal', 'submitComment', 'resolveComment'
  ]);
  await checkUrl('Authenticated private viewer support', `${publicOrigin}/nfc/view/viewer.js`, [
    'window.Auth?.apiFetchWithRefresh', "credentials: 'include'", "cache: 'no-store'"
  ]);
  await checkUrl('Viewer logo fit stylesheet', `${publicOrigin}/nfc/viewer-logo-fit.css`, [
    '#card-logo-img', 'max-height: 190px', 'object-fit: contain'
  ]);
  await checkUrl('Service Worker release cache', `${publicOrigin}/nfc/sw.js`, [
    `CACHE_VERSION = '${expected.serviceWorkerCache}'`, '/nfc/editor-toolbar-release.css',
    '/nfc/editor-asset-manager.js', '/nfc/editor-template-manager.js', '/nfc/editor-version-manager.js',
    '/nfc/editor-productivity-tools.js', '/nfc/brand-kit.css', '/nfc/brand-kit-client.js',
    '/nfc/dashboard-brand-kit.js', '/nfc/editor-brand-kit.js', '/nfc/workspace.css',
    '/nfc/workspace-client.js', '/nfc/dashboard-workspaces.js', '/nfc/editor-review-workflow.js',
    '/nfc/editor-logo-fit.js', '/nfc/viewer-logo-fit.css'
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

  const failed = checks.filter(item => item.status === 'failed');
  return {
    status: failed.length ? 'failed' : 'passed',
    checkedAt: new Date().toISOString(),
    publicOrigin,
    apiOrigin,
    expected,
    totals: { checks: checks.length, passed: checks.length - failed.length, failed: failed.length },
    checks
  };
}

function renderSummary(report) {
  const lines = [
    '# Production release verification', '',
    `**Result:** ${report.status === 'passed' ? '✅ Passed' : '❌ Failed'}`, '',
    `- Public frontend: \`${report.publicOrigin}\``,
    `- API: \`${report.apiOrigin}\``,
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
  extractExpectedRelease,
  extractExpectedServiceWorkerCache,
  extractExpectedToolbarAsset,
  extractExpectedAssetManagerStyle,
  extractExpectedAssetManagerScript,
  extractExpectedTemplateManagerStyle,
  extractExpectedTemplateManagerScript,
  extractExpectedVersionManagerStyle,
  extractExpectedVersionManagerScript,
  extractExpectedProductivityStyle,
  extractExpectedProductivityScript,
  extractExpectedBrandKitStyle,
  extractExpectedBrandKitClient,
  extractExpectedDashboardBrandKitScript,
  extractExpectedEditorBrandKitScript,
  extractExpectedWorkspaceStyle,
  extractExpectedWorkspaceClient,
  extractExpectedDashboardWorkspacesScript,
  extractExpectedEditorReviewWorkflowScript,
  normalizeOrigin,
  renderSummary,
  requestWithRetry,
  verifyProduction,
  writeReport
};

if (require.main === module) main().catch(error => {
  console.error('[production-verification] Fatal error:', error);
  process.exitCode = 1;
});
