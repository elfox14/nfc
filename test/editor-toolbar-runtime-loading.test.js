/**
 * @jest-environment jsdom
 */

const fs = require('fs');
const path = require('path');

describe('editor toolbar release delivery', () => {
  beforeEach(() => {
    jest.resetModules();
    document.head.innerHTML = '';
    document.body.innerHTML = '';
    document.documentElement.removeAttribute('data-editor-toolbar-release');
    window.history.replaceState({}, '', '/nfc/editor.html');
    delete window.__API_BASE_URL;
    delete window.__MC_PRIME_RELEASE;
    delete window.__EDITOR_STABLE_SAVE_MONITOR__;
  });

  test('loads the release stylesheet directly on the first editor visit', () => {
    jest.isolateModules(() => require('../runtime-config'));

    const stylesheet = document.querySelector('link[data-editor-toolbar-release]');
    expect(stylesheet).not.toBeNull();
    expect(stylesheet.getAttribute('rel')).toBe('stylesheet');
    expect(stylesheet.getAttribute('href')).toBe('/nfc/editor-toolbar-release.css?v=7.2');
    expect(document.documentElement.dataset.editorToolbarRelease).toBe('loading');

    stylesheet.dispatchEvent(new Event('load'));
    expect(document.documentElement.dataset.editorToolbarRelease).toBe('ready');
    expect(window.__MC_PRIME_RELEASE).toBe('2026.07.18-phase7.2');
  });

  test('does not inject editor-only styles on public non-editor pages', () => {
    window.history.replaceState({}, '', '/nfc/index.html');
    jest.isolateModules(() => require('../runtime-config'));

    expect(document.querySelector('link[data-editor-toolbar-release]')).toBeNull();
  });

  test('service worker v8 precaches the standalone patch without CSS response mutation', () => {
    const source = fs.readFileSync(path.join(__dirname, '..', 'sw.js'), 'utf8');

    expect(source).toContain("const CACHE_VERSION = 'v8'");
    expect(source).toContain("'/nfc/editor-toolbar-release.css'");
    expect(source).not.toContain('editorStylesWithPatch');
    expect(source).not.toContain('isEditorStylesheet');
  });
});
