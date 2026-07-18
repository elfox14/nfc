/** @jest-environment jsdom */
'use strict';

const fs = require('fs');
const path = require('path');

describe('Brand Kit runtime asset delivery', () => {
  beforeEach(() => {
    jest.resetModules();
    document.head.innerHTML = '';
    document.body.innerHTML = '';
    window.history.replaceState({}, '', '/nfc/editor.html');
    delete window.__API_BASE_URL;
    delete window.__MC_PRIME_RELEASE;
    delete window.__EDITOR_STABLE_SAVE_MONITOR__;
  });

  test('loads Brand Kit assets with the editor managers', () => {
    jest.isolateModules(() => require('../runtime-config'));
    expect(document.querySelector('link[data-brand-kit-style]').getAttribute('href')).toBe('/nfc/brand-kit.css?v=10.0');
    expect(document.querySelector('script[data-brand-kit-client]').getAttribute('src')).toBe('/nfc/brand-kit-client.js?v=10.0');
    expect(document.querySelector('script[data-editor-brand-kit]').getAttribute('src')).toBe('/nfc/editor-brand-kit.js?v=10.0');
    expect(document.querySelector('script[data-editor-asset-manager]')).not.toBeNull();
    expect(window.__MC_PRIME_RELEASE).toBe('2026.07.18-phase10.0');
  });

  test('loads the dashboard Brand Kit workspace without editor managers', () => {
    window.history.replaceState({}, '', '/nfc/dashboard.html');
    jest.isolateModules(() => require('../runtime-config'));
    expect(document.querySelector('link[data-brand-kit-style]').getAttribute('href')).toBe('/nfc/brand-kit.css?v=10.0');
    expect(document.querySelector('script[data-brand-kit-client]').getAttribute('src')).toBe('/nfc/brand-kit-client.js?v=10.0');
    expect(document.querySelector('script[data-dashboard-brand-kit]').getAttribute('src')).toBe('/nfc/dashboard-brand-kit.js?v=10.0');
    expect(document.querySelector('script[data-editor-asset-manager]')).toBeNull();
  });

  test('keeps unrelated public pages free from private workspace assets', () => {
    window.history.replaceState({}, '', '/nfc/index.html');
    jest.isolateModules(() => require('../runtime-config'));
    expect(document.querySelector('link[data-brand-kit-style]')).toBeNull();
    expect(document.querySelector('script[data-brand-kit-client]')).toBeNull();
    expect(document.querySelector('script[data-dashboard-brand-kit]')).toBeNull();
  });

  test('service worker v13 precaches Brand Kit and editor assets', () => {
    const source = fs.readFileSync(path.join(__dirname, '..', 'sw.js'), 'utf8');
    expect(source).toContain("const CACHE_VERSION = 'v13'");
    expect(source).toContain("'/nfc/editor-productivity-tools.js'");
    expect(source).toContain("'/nfc/brand-kit.css'");
    expect(source).toContain("'/nfc/brand-kit-client.js'");
    expect(source).toContain("'/nfc/dashboard-brand-kit.js'");
    expect(source).toContain("'/nfc/editor-brand-kit.js'");
  });
});
