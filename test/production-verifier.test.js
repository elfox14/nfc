/**
 * @jest-environment node
 */

const fs = require('fs');
const path = require('path');
const {
  extractExpectedRelease,
  extractExpectedServiceWorkerCache,
  extractExpectedToolbarAsset,
  verifyProduction
} = require('../scripts/verify-production-release');

const rootDir = path.resolve(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(rootDir, file), 'utf8');

function response(status, body) {
  return {
    status,
    ok: status >= 200 && status < 300,
    text: async () => body
  };
}

function healthySnapshot(overrides = {}) {
  return {
    status: 'ok',
    timestamp: new Date().toISOString(),
    version: '2.0.0',
    release: 'abcdef123456',
    uptimeSeconds: 120,
    dbConnected: true,
    checks: {
      server: { status: 'ready' },
      database: { status: 'ready', latencyMs: 5 },
      storage: { status: 'ready', writable: true }
    },
    ...overrides
  };
}

function createFetch(overrides = {}) {
  const assets = {
    '/nfc/editor.html': response(200, read('editor.html')),
    '/nfc/editor-en.html': response(200, read('editor-en.html')),
    '/nfc/runtime-config.js': response(200, read('runtime-config.js')),
    '/nfc/editor-toolbar-release.css': response(200, read('editor-toolbar-release.css')),
    '/nfc/sw.js': response(200, read('sw.js')),
    '/healthz': response(200, JSON.stringify(healthySnapshot())),
    '/readyz': response(200, JSON.stringify(healthySnapshot())),
    '/api/health': response(200, JSON.stringify({
      status: 'ok',
      version: '2.0.0',
      release: 'abcdef123456',
      uptimeSeconds: 120
    })),
    ...overrides
  };

  return jest.fn(async (url) => {
    const parsed = new URL(url);
    const result = assets[parsed.pathname];
    if (!result) throw new Error(`Unexpected verification URL: ${parsed.pathname}`);
    return result;
  });
}

describe('production release verifier', () => {
  test('derives expected release values from the checked-out repository', () => {
    expect(extractExpectedRelease(rootDir)).toBe('2026.07.18-phase7.2');
    expect(extractExpectedServiceWorkerCache(rootDir)).toBe('v8');
    expect(extractExpectedToolbarAsset(rootDir)).toBe('/nfc/editor-toolbar-release.css?v=7.2');
  });

  test('passes when the live frontend and API match the repository release', async () => {
    const fetchImpl = createFetch();
    const report = await verifyProduction({
      rootDir,
      fetchImpl,
      attempts: 1,
      retryDelayMs: 0,
      cacheBuster: 'test'
    });

    expect(report.status).toBe('passed');
    expect(report.totals).toEqual({ checks: 8, passed: 8, failed: 0 });
    expect(fetchImpl).toHaveBeenCalledTimes(8);
  });

  test('fails clearly when cPanel still serves an older runtime release', async () => {
    const current = read('runtime-config.js');
    const fetchImpl = createFetch({
      '/nfc/runtime-config.js': response(200, current.replace('2026.07.18-phase7.2', '2026.07.18-phase7.1'))
    });

    const report = await verifyProduction({
      rootDir,
      fetchImpl,
      attempts: 1,
      retryDelayMs: 0,
      cacheBuster: 'test'
    });

    expect(report.status).toBe('failed');
    expect(report.checks.find((check) => check.name === 'Runtime release marker')).toMatchObject({
      status: 'failed'
    });
  });

  test('fails when Render readiness reports degraded infrastructure', async () => {
    const degraded = healthySnapshot({
      status: 'degraded',
      dbConnected: false,
      checks: {
        server: { status: 'ready' },
        database: { status: 'error', latencyMs: 1500 },
        storage: { status: 'ready', writable: true }
      }
    });
    const fetchImpl = createFetch({
      '/readyz': response(503, JSON.stringify(degraded))
    });

    const report = await verifyProduction({
      rootDir,
      fetchImpl,
      attempts: 1,
      retryDelayMs: 0,
      cacheBuster: 'test'
    });

    expect(report.status).toBe('failed');
    expect(report.checks.find((check) => check.name === 'API readiness')).toMatchObject({
      status: 'failed',
      error: expect.stringContaining('HTTP 503')
    });
  });
});
