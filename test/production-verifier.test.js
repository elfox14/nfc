/** @jest-environment node */
const fs = require('fs');
const path = require('path');
const verifier = require('../scripts/verify-production-release');
const rootDir = path.resolve(__dirname, '..');
const read = file => fs.readFileSync(path.join(rootDir, file), 'utf8');
const response = (status, body) => ({ status, ok: status >= 200 && status < 300, text: async () => body });

function health(overrides = {}) {
  return {
    status: 'ok',
    version: '2.0.0',
    release: 'abcdef',
    uptimeSeconds: 120,
    dbConnected: true,
    checks: {
      server: { status: 'ready' },
      database: { status: 'ready' },
      storage: { status: 'ready', writable: true }
    },
    ...overrides
  };
}

function createFetch(overrides = {}) {
  const assets = {
    '/nfc/editor.html': response(200, read('editor.html')),
    '/nfc/editor-en.html': response(200, read('editor-en.html')),
    '/nfc/dashboard.html': response(200, read('dashboard.html')),
    '/nfc/dashboard-en.html': response(200, read('dashboard-en.html')),
    '/nfc/runtime-config.js': response(200, read('runtime-config.js')),
    '/nfc/editor-toolbar-release.css': response(200, read('editor-toolbar-release.css')),
    '/nfc/editor-asset-manager.css': response(200, read('editor-asset-manager.css')),
    '/nfc/editor-asset-manager.js': response(200, read('editor-asset-manager.js')),
    '/nfc/editor-template-manager.css': response(200, read('editor-template-manager.css')),
    '/nfc/editor-template-manager.js': response(200, read('editor-template-manager.js')),
    '/nfc/editor-version-manager.css': response(200, read('editor-version-manager.css')),
    '/nfc/editor-version-manager.js': response(200, read('editor-version-manager.js')),
    '/nfc/editor-productivity-tools.css': response(200, read('editor-productivity-tools.css')),
    '/nfc/editor-productivity-tools.js': response(200, read('editor-productivity-tools.js')),
    '/nfc/brand-kit.css': response(200, read('brand-kit.css')),
    '/nfc/brand-kit-client.js': response(200, read('brand-kit-client.js')),
    '/nfc/dashboard-brand-kit.js': response(200, read('dashboard-brand-kit.js')),
    '/nfc/editor-brand-kit.js': response(200, read('editor-brand-kit.js')),
    '/nfc/workspace.css': response(200, read('workspace.css')),
    '/nfc/workspace-client.js': response(200, read('workspace-client.js')),
    '/nfc/dashboard-workspaces.js': response(200, read('dashboard-workspaces.js')),
    '/nfc/editor-review-workflow.js': response(200, read('editor-review-workflow.js')),
    '/nfc/editor-default-card.js': response(200, read('editor-default-card.js')),
    '/nfc/editor-hydration.js': response(200, read('editor-hydration.js')),
    '/nfc/editor-design-loader.js': response(200, read('editor-design-loader.js')),
    '/nfc/editor-qr-runtime.js': response(200, read('editor-qr-runtime.js')),
    '/nfc/editor-capture-runtime.js': response(200, read('editor-capture-runtime.js')),
    '/nfc/vendor/qr-code-styling.js': response(200, read('vendor/qr-code-styling.js')),
    '/nfc/vendor/qrcode.min.js': response(200, read('vendor/qrcode.min.js')),
    '/nfc/viewer-logo-fit.css': response(200, read('viewer-logo-fit.css')),
    '/nfc/view/viewer.js': response(200, read('view/viewer.js')),
    '/nfc/sw.js': response(200, read('sw.js')),
    '/healthz': response(200, JSON.stringify(health())),
    '/readyz': response(200, JSON.stringify(health())),
    '/api/health': response(200, JSON.stringify(health())),
    ...overrides
  };
  return jest.fn(async url => {
    const item = assets[new URL(url).pathname];
    if (!item) throw new Error(`Unexpected verification URL: ${url}`);
    return item;
  });
}

describe('production release verifier', () => {
  test('derives current Brand Kit and workspace assets', () => {
    expect(verifier.extractExpectedRelease(rootDir)).toBe('2026.07.22-phase19');
    expect(verifier.extractExpectedServiceWorkerCache(rootDir)).toBe('v24');
    expect(verifier.extractExpectedToolbarAsset(rootDir)).toBe('/nfc/editor-toolbar-release.css?v=7.2');
    expect(verifier.extractExpectedAssetManagerStyle(rootDir)).toBe('/nfc/editor-asset-manager.css?v=8.1');
    expect(verifier.extractExpectedAssetManagerScript(rootDir)).toBe('/nfc/editor-asset-manager.js?v=8.1');
    expect(verifier.extractExpectedTemplateManagerStyle(rootDir)).toBe('/nfc/editor-template-manager.css?v=8.2');
    expect(verifier.extractExpectedTemplateManagerScript(rootDir)).toBe('/nfc/editor-template-manager.js?v=8.2');
    expect(verifier.extractExpectedVersionManagerStyle(rootDir)).toBe('/nfc/editor-version-manager.css?v=8.3');
    expect(verifier.extractExpectedVersionManagerScript(rootDir)).toBe('/nfc/editor-version-manager.js?v=8.3');
    expect(verifier.extractExpectedProductivityStyle(rootDir)).toBe('/nfc/editor-productivity-tools.css?v=9.0');
    expect(verifier.extractExpectedProductivityScript(rootDir)).toBe('/nfc/editor-productivity-tools.js?v=9.0');
    expect(verifier.extractExpectedBrandKitStyle(rootDir)).toBe('/nfc/brand-kit.css?v=10.0');
    expect(verifier.extractExpectedBrandKitClient(rootDir)).toBe('/nfc/brand-kit-client.js?v=10.0');
    expect(verifier.extractExpectedDashboardBrandKitScript(rootDir)).toBe('/nfc/dashboard-brand-kit.js?v=10.0');
    expect(verifier.extractExpectedEditorBrandKitScript(rootDir)).toBe('/nfc/editor-brand-kit.js?v=10.0');
    expect(verifier.extractExpectedWorkspaceStyle(rootDir)).toBe('/nfc/workspace.css?v=11.0');
    expect(verifier.extractExpectedWorkspaceClient(rootDir)).toBe('/nfc/workspace-client.js?v=11.0');
    expect(verifier.extractExpectedDashboardWorkspacesScript(rootDir)).toBe('/nfc/dashboard-workspaces.js?v=11.0');
    expect(verifier.extractExpectedEditorReviewWorkflowScript(rootDir)).toBe('/nfc/editor-review-workflow.js?v=11.0');
  });

  test('passes when production matches the repository', async () => {
    const fetchImpl = createFetch();
    const report = await verifier.verifyProduction({
      rootDir,
      fetchImpl,
      attempts: 1,
      retryDelayMs: 0,
      cacheBuster: 'test'
    });
    expect(report.status).toBe('passed');
    expect(report.totals).toEqual({ checks: 35, passed: 35, failed: 0 });
    expect(fetchImpl).toHaveBeenCalledTimes(35);
    expect(report.expected).toMatchObject({
      release: '2026.07.22-phase19',
      serviceWorkerCache: 'v24',
      productivityScript: '/nfc/editor-productivity-tools.js?v=9.0',
      brandKitStyle: '/nfc/brand-kit.css?v=10.0',
      brandKitClient: '/nfc/brand-kit-client.js?v=10.0',
      dashboardBrandKitScript: '/nfc/dashboard-brand-kit.js?v=10.0',
      editorBrandKitScript: '/nfc/editor-brand-kit.js?v=10.0',
      workspaceStyle: '/nfc/workspace.css?v=11.0',
      workspaceClient: '/nfc/workspace-client.js?v=11.0',
      dashboardWorkspacesScript: '/nfc/dashboard-workspaces.js?v=11.0',
      editorReviewWorkflowScript: '/nfc/editor-review-workflow.js?v=11.0'
    });
  });

  test('detects stale runtime files', async () => {
    const stale = read('runtime-config.js').replace('2026.07.22-phase19', '2026.07.20-phase13.1');
    const report = await verifier.verifyProduction({
      rootDir,
      fetchImpl: createFetch({ '/nfc/runtime-config.js': response(200, stale) }),
      attempts: 1,
      retryDelayMs: 0,
      cacheBuster: 'test'
    });
    expect(report.status).toBe('failed');
    expect(report.checks.find(item => item.name === 'Runtime release marker').status).toBe('failed');
  });

  test('detects missing team review assets', async () => {
    const report = await verifier.verifyProduction({
      rootDir,
      fetchImpl: createFetch({ '/nfc/editor-review-workflow.js': response(404, 'Not Found') }),
      attempts: 1,
      retryDelayMs: 0,
      cacheBuster: 'test'
    });
    expect(report.status).toBe('failed');
    expect(report.checks.find(item => item.name === 'Editor review workflow')).toMatchObject({
      status: 'failed',
      error: expect.stringContaining('HTTP 404')
    });
  });

  test('detects degraded Render readiness', async () => {
    const degraded = health({ status: 'degraded', dbConnected: false });
    const report = await verifier.verifyProduction({
      rootDir,
      fetchImpl: createFetch({ '/readyz': response(503, JSON.stringify(degraded)) }),
      attempts: 1,
      retryDelayMs: 0,
      cacheBuster: 'test'
    });
    expect(report.status).toBe('failed');
    expect(report.checks.find(item => item.name === 'API readiness').error).toContain('HTTP 503');
  });
});
