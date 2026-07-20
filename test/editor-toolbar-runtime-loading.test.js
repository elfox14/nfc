/** @jest-environment jsdom */
'use strict';

const fs = require('fs');
const path = require('path');

describe('private workspace runtime asset delivery', () => {
  beforeEach(() => {
    jest.resetModules();
    document.head.innerHTML = '';
    document.body.innerHTML = '';
    window.history.replaceState({}, '', '/nfc/editor.html');
    delete window.__API_BASE_URL;
    delete window.__MC_PRIME_RELEASE;
    delete window.__EDITOR_STABLE_SAVE_MONITOR__;
  });

  test('loads Brand Kit and team review assets with the editor managers', () => {
    jest.isolateModules(() => require('../runtime-config'));
    expect(document.querySelector('link[data-brand-kit-style]').getAttribute('href')).toBe('/nfc/brand-kit.css?v=10.0');
    expect(document.querySelector('script[data-brand-kit-client]').getAttribute('src')).toBe('/nfc/brand-kit-client.js?v=10.0');
    expect(document.querySelector('link[data-workspace-style]').getAttribute('href')).toBe('/nfc/workspace.css?v=11.0');
    expect(document.querySelector('script[data-workspace-client]').getAttribute('src')).toBe('/nfc/workspace-client.js?v=11.0');
    expect(document.querySelector('script[data-editor-brand-kit]').getAttribute('src')).toBe('/nfc/editor-brand-kit.js?v=10.0');
    expect(document.querySelector('script[data-editor-review-workflow]').getAttribute('src')).toBe('/nfc/editor-review-workflow.js?v=11.0');
    expect(document.querySelector('script[data-editor-asset-manager]')).not.toBeNull();
    expect(window.__MC_PRIME_RELEASE).toBe('2026.07.21-phase16.1');
  });

  test('loads dashboard Brand Kit and team workspace without editor managers', () => {
    window.history.replaceState({}, '', '/nfc/dashboard.html');
    jest.isolateModules(() => require('../runtime-config'));
    expect(document.querySelector('link[data-brand-kit-style]').getAttribute('href')).toBe('/nfc/brand-kit.css?v=10.0');
    expect(document.querySelector('script[data-brand-kit-client]').getAttribute('src')).toBe('/nfc/brand-kit-client.js?v=10.0');
    expect(document.querySelector('link[data-workspace-style]').getAttribute('href')).toBe('/nfc/workspace.css?v=11.0');
    expect(document.querySelector('script[data-workspace-client]').getAttribute('src')).toBe('/nfc/workspace-client.js?v=11.0');
    expect(document.querySelector('script[data-dashboard-brand-kit]').getAttribute('src')).toBe('/nfc/dashboard-brand-kit.js?v=10.0');
    expect(document.querySelector('script[data-dashboard-workspaces]').getAttribute('src')).toBe('/nfc/dashboard-workspaces.js?v=11.0');
    expect(document.querySelector('script[data-editor-asset-manager]')).toBeNull();
  });

  test('keeps unrelated public pages free from private workspace assets', () => {
    window.history.replaceState({}, '', '/nfc/index.html');
    jest.isolateModules(() => require('../runtime-config'));
    expect(document.querySelector('link[data-brand-kit-style]')).toBeNull();
    expect(document.querySelector('script[data-brand-kit-client]')).toBeNull();
    expect(document.querySelector('link[data-workspace-style]')).toBeNull();
    expect(document.querySelector('script[data-workspace-client]')).toBeNull();
    expect(document.querySelector('script[data-dashboard-workspaces]')).toBeNull();
  });

  test('service worker v21 precaches saved loading, drag fallback, default card, logo fitting, observability, Brand Kit, workspace and editor assets', () => {
    const source = fs.readFileSync(path.join(__dirname, '..', 'sw.js'), 'utf8');
    expect(source).toContain("const CACHE_VERSION = 'v21'");
    expect(source).toContain("'/nfc/editor-default-card.js?v=2.0'");
    expect(source).toContain("'/nfc/editor-design-loader.js?v=2.0'");
    expect(source).toContain("'/nfc/editor-interact-fallback.js?v=1.0'");
    expect(source).toContain("'/nfc/editor-logo-fit.js'");
    expect(source).toContain("'/nfc/viewer-logo-fit.css'");
    expect(source).toContain("'/nfc/client-observability.js'");
    expect(source).toContain("'/nfc/editor-productivity-tools.js'");
    expect(source).toContain("'/nfc/brand-kit.css'");
    expect(source).toContain("'/nfc/brand-kit-client.js'");
    expect(source).toContain("'/nfc/dashboard-brand-kit.js'");
    expect(source).toContain("'/nfc/editor-brand-kit.js'");
    expect(source).toContain("'/nfc/workspace.css'");
    expect(source).toContain("'/nfc/workspace-client.js'");
    expect(source).toContain("'/nfc/dashboard-workspaces.js'");
    expect(source).toContain("'/nfc/editor-review-workflow.js'");
  });
});
