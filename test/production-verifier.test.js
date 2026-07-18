/** @jest-environment node */
const fs = require('fs');
const path = require('path');
const verifier = require('../scripts/verify-production-release');
const rootDir = path.resolve(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(rootDir, file), 'utf8');
const response = (status, body) => ({ status, ok: status >= 200 && status < 300, text: async () => body });

function health(overrides = {}) {
  return {
    status: 'ok', version: '2.0.0', release: 'abcdef', uptimeSeconds: 120, dbConnected: true,
    checks: { server: { status: 'ready' }, database: { status: 'ready' }, storage: { status: 'ready', writable: true } },
    ...overrides
  };
}

function createFetch(overrides = {}) {
  const assets = {
    '/nfc/editor.html': response(200, read('editor.html')),
    '/nfc/editor-en.html': response(200, read('editor-en.html')),
    '/nfc/runtime-config.js': response(200, read('runtime-config.js')),
    '/nfc/editor-toolbar-release.css': response(200, read('editor-toolbar-release.css')),
    '/nfc/editor-asset-manager.css': response(200, read('editor-asset-manager.css')),
    '/nfc/editor-asset-manager.js': response(200, read('editor-asset-manager.js')),
    '/nfc/editor-template-manager.css': response(200, read('editor-template-manager.css')),
    '/nfc/editor-template-manager.js': response(200, read('editor-template-manager.js')),
    '/nfc/sw.js': response(200, read('sw.js')),
    '/healthz': response(200, JSON.stringify(health())),
    '/readyz': response(200, JSON.stringify(health())),
    '/api/health': response(200, JSON.stringify(health())),
    ...overrides
  };
  return jest.fn(async (url) => {
    const item = assets[new URL(url).pathname];
    if (!item) throw new Error(`Unexpected verification URL: ${url}`);
    return item;
  });
}

describe('production release verifier', () => {
  test('derives current release assets', () => {
    expect(verifier.extractExpectedRelease(rootDir)).toBe('2026.07.18-phase8.2');
    expect(verifier.extractExpectedServiceWorkerCache(rootDir)).toBe('v10');
    expect(verifier.extractExpectedToolbarAsset(rootDir)).toBe('/nfc/editor-toolbar-release.css?v=7.2');
    expect(verifier.extractExpectedAssetManagerStyle(rootDir)).toBe('/nfc/editor-asset-manager.css?v=8.1');
    expect(verifier.extractExpectedAssetManagerScript(rootDir)).toBe('/nfc/editor-asset-manager.js?v=8.1');
    expect(verifier.extractExpectedTemplateManagerStyle(rootDir)).toBe('/nfc/editor-template-manager.css?v=8.2');
    expect(verifier.extractExpectedTemplateManagerScript(rootDir)).toBe('/nfc/editor-template-manager.js?v=8.2');
  });

  test('passes when production matches the repository', async () => {
    const fetchImpl = createFetch();
    const report = await verifier.verifyProduction({ rootDir, fetchImpl, attempts: 1, retryDelayMs: 0, cacheBuster: 'test' });
    expect(report.status).toBe('passed');
    expect(report.totals).toEqual({ checks: 12, passed: 12, failed: 0 });
    expect(fetchImpl).toHaveBeenCalledTimes(12);
    expect(report.expected).toMatchObject({
      release: '2026.07.18-phase8.2', serviceWorkerCache: 'v10',
      templateManagerStyle: '/nfc/editor-template-manager.css?v=8.2',
      templateManagerScript: '/nfc/editor-template-manager.js?v=8.2'
    });
  });

  test('detects stale runtime files', async () => {
    const stale = read('runtime-config.js').replace('2026.07.18-phase8.2', '2026.07.18-phase8.1');
    const report = await verifier.verifyProduction({
      rootDir, fetchImpl: createFetch({ '/nfc/runtime-config.js': response(200, stale) }),
      attempts: 1, retryDelayMs: 0, cacheBuster: 'test'
    });
    expect(report.status).toBe('failed');
    expect(report.checks.find((item) => item.name === 'Runtime release marker').status).toBe('failed');
  });

  test('detects missing template assets', async () => {
    const report = await verifier.verifyProduction({
      rootDir, fetchImpl: createFetch({ '/nfc/editor-template-manager.js': response(404, 'Not Found') }),
      attempts: 1, retryDelayMs: 0, cacheBuster: 'test'
    });
    expect(report.status).toBe('failed');
    expect(report.checks.find((item) => item.name === 'Template manager script')).toMatchObject({
      status: 'failed', error: expect.stringContaining('HTTP 404')
    });
  });

  test('detects degraded Render readiness', async () => {
    const degraded = health({ status: 'degraded', dbConnected: false });
    const report = await verifier.verifyProduction({
      rootDir, fetchImpl: createFetch({ '/readyz': response(503, JSON.stringify(degraded)) }),
      attempts: 1, retryDelayMs: 0, cacheBuster: 'test'
    });
    expect(report.status).toBe('failed');
    expect(report.checks.find((item) => item.name === 'API readiness').error).toContain('HTTP 503');
  });
});
