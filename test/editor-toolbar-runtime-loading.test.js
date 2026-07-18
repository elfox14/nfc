/**
 * @jest-environment jsdom
 */

const fs = require('fs');
const path = require('path');

describe('editor runtime release delivery', () => {
  beforeEach(() => {
    jest.resetModules();
    document.head.innerHTML = '';
    document.body.innerHTML = '';
    document.documentElement.removeAttribute('data-editor-toolbar-release');
    document.documentElement.removeAttribute('data-editor-asset-manager-loader');
    document.documentElement.removeAttribute('data-editor-template-manager-loader');
    window.history.replaceState({}, '', '/nfc/editor.html');
    delete window.__API_BASE_URL;
    delete window.__MC_PRIME_RELEASE;
    delete window.__EDITOR_STABLE_SAVE_MONITOR__;
  });

  test('loads release styles and professional editor managers on the first visit', () => {
    jest.isolateModules(() => require('../runtime-config'));

    const toolbarStyles = document.querySelector('link[data-editor-toolbar-release]');
    const assetStyles = document.querySelector('link[data-editor-asset-manager-style]');
    const assetScript = document.querySelector('script[data-editor-asset-manager]');
    const templateStyles = document.querySelector('link[data-editor-template-manager-style]');
    const templateScript = document.querySelector('script[data-editor-template-manager]');
    expect(toolbarStyles).not.toBeNull();
    expect(toolbarStyles.getAttribute('href')).toBe('/nfc/editor-toolbar-release.css?v=7.2');
    expect(assetStyles.getAttribute('href')).toBe('/nfc/editor-asset-manager.css?v=8.1');
    expect(assetScript.getAttribute('src')).toBe('/nfc/editor-asset-manager.js?v=8.1');
    expect(templateStyles.getAttribute('href')).toBe('/nfc/editor-template-manager.css?v=8.2');
    expect(templateScript.getAttribute('src')).toBe('/nfc/editor-template-manager.js?v=8.2');
    expect(document.documentElement.dataset.editorToolbarRelease).toBe('loading');
    expect(document.documentElement.dataset.editorAssetManagerLoader).toBe('loading');
    expect(document.documentElement.dataset.editorTemplateManagerLoader).toBe('loading');

    toolbarStyles.dispatchEvent(new Event('load'));
    assetScript.dispatchEvent(new Event('load'));
    templateScript.dispatchEvent(new Event('load'));
    expect(document.documentElement.dataset.editorToolbarRelease).toBe('ready');
    expect(document.documentElement.dataset.editorAssetManagerLoader).toBe('ready');
    expect(document.documentElement.dataset.editorTemplateManagerLoader).toBe('ready');
    expect(window.__MC_PRIME_RELEASE).toBe('2026.07.18-phase8.2');
  });

  test('does not inject editor-only assets on public non-editor pages', () => {
    window.history.replaceState({}, '', '/nfc/index.html');
    jest.isolateModules(() => require('../runtime-config'));

    expect(document.querySelector('link[data-editor-toolbar-release]')).toBeNull();
    expect(document.querySelector('script[data-editor-asset-manager]')).toBeNull();
    expect(document.querySelector('script[data-editor-template-manager]')).toBeNull();
  });

  test('service worker v10 precaches the editor release assets', () => {
    const source = fs.readFileSync(path.join(__dirname, '..', 'sw.js'), 'utf8');

    expect(source).toContain("const CACHE_VERSION = 'v10'");
    expect(source).toContain("'/nfc/editor-toolbar-release.css'");
    expect(source).toContain("'/nfc/editor-asset-manager.css'");
    expect(source).toContain("'/nfc/editor-asset-manager.js'");
    expect(source).toContain("'/nfc/editor-template-manager.css'");
    expect(source).toContain("'/nfc/editor-template-manager.js'");
    expect(source).not.toContain('editorStylesWithPatch');
    expect(source).not.toContain('isEditorStylesheet');
  });
});
