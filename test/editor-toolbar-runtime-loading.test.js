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
    document.documentElement.removeAttribute('data-editor-version-manager-loader');
    document.documentElement.removeAttribute('data-editor-productivity-tools-loader');
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
    const versionStyles = document.querySelector('link[data-editor-version-manager-style]');
    const versionScript = document.querySelector('script[data-editor-version-manager]');
    const productivityStyles = document.querySelector('link[data-editor-productivity-tools-style]');
    const productivityScript = document.querySelector('script[data-editor-productivity-tools]');
    expect(toolbarStyles).not.toBeNull();
    expect(toolbarStyles.getAttribute('href')).toBe('/nfc/editor-toolbar-release.css?v=7.2');
    expect(assetStyles.getAttribute('href')).toBe('/nfc/editor-asset-manager.css?v=8.1');
    expect(assetScript.getAttribute('src')).toBe('/nfc/editor-asset-manager.js?v=8.1');
    expect(templateStyles.getAttribute('href')).toBe('/nfc/editor-template-manager.css?v=8.2');
    expect(templateScript.getAttribute('src')).toBe('/nfc/editor-template-manager.js?v=8.2');
    expect(versionStyles.getAttribute('href')).toBe('/nfc/editor-version-manager.css?v=8.3');
    expect(versionScript.getAttribute('src')).toBe('/nfc/editor-version-manager.js?v=8.3');
    expect(productivityStyles.getAttribute('href')).toBe('/nfc/editor-productivity-tools.css?v=9.0');
    expect(productivityScript.getAttribute('src')).toBe('/nfc/editor-productivity-tools.js?v=9.0');
    expect(document.documentElement.dataset.editorToolbarRelease).toBe('loading');
    expect(document.documentElement.dataset.editorAssetManagerLoader).toBe('loading');
    expect(document.documentElement.dataset.editorTemplateManagerLoader).toBe('loading');
    expect(document.documentElement.dataset.editorVersionManagerLoader).toBe('loading');
    expect(document.documentElement.dataset.editorProductivityToolsLoader).toBe('loading');

    toolbarStyles.dispatchEvent(new Event('load'));
    assetScript.dispatchEvent(new Event('load'));
    templateScript.dispatchEvent(new Event('load'));
    versionScript.dispatchEvent(new Event('load'));
    productivityScript.dispatchEvent(new Event('load'));
    expect(document.documentElement.dataset.editorToolbarRelease).toBe('ready');
    expect(document.documentElement.dataset.editorAssetManagerLoader).toBe('ready');
    expect(document.documentElement.dataset.editorTemplateManagerLoader).toBe('ready');
    expect(document.documentElement.dataset.editorVersionManagerLoader).toBe('ready');
    expect(document.documentElement.dataset.editorProductivityToolsLoader).toBe('ready');
    expect(window.__MC_PRIME_RELEASE).toBe('2026.07.18-phase9.0');
  });

  test('does not inject editor-only assets on public non-editor pages', () => {
    window.history.replaceState({}, '', '/nfc/index.html');
    jest.isolateModules(() => require('../runtime-config'));

    expect(document.querySelector('link[data-editor-toolbar-release]')).toBeNull();
    expect(document.querySelector('script[data-editor-asset-manager]')).toBeNull();
    expect(document.querySelector('script[data-editor-template-manager]')).toBeNull();
    expect(document.querySelector('script[data-editor-version-manager]')).toBeNull();
    expect(document.querySelector('script[data-editor-productivity-tools]')).toBeNull();
  });

  test('service worker v12 precaches the editor release assets', () => {
    const source = fs.readFileSync(path.join(__dirname, '..', 'sw.js'), 'utf8');

    expect(source).toContain("const CACHE_VERSION = 'v12'");
    expect(source).toContain("'/nfc/editor-toolbar-release.css'");
    expect(source).toContain("'/nfc/editor-asset-manager.css'");
    expect(source).toContain("'/nfc/editor-asset-manager.js'");
    expect(source).toContain("'/nfc/editor-template-manager.css'");
    expect(source).toContain("'/nfc/editor-template-manager.js'");
    expect(source).toContain("'/nfc/editor-version-manager.css'");
    expect(source).toContain("'/nfc/editor-version-manager.js'");
    expect(source).toContain("'/nfc/editor-productivity-tools.css'");
    expect(source).toContain("'/nfc/editor-productivity-tools.js'");
    expect(source).not.toContain('editorStylesWithPatch');
    expect(source).not.toContain('isEditorStylesheet');
  });
});
