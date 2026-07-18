/**
 * @jest-environment node
 */
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const source = fs.readFileSync(path.join(__dirname, '..', 'runtime-config.js'), 'utf8');

function runConfig(origin, configuredBase, pathname = '/', readyState = 'complete') {
  const url = new URL(origin);
  const appendedNodes = [];
  let domReadyHandler;
  const document = {
    readyState,
    querySelector: () => null,
    querySelectorAll: () => [],
    getElementById: () => null,
    createElement: (tagName) => ({
      tagName: String(tagName).toUpperCase(),
      dataset: {},
      listeners: {},
      addEventListener(name, handler) { this.listeners[name] = handler; },
      setAttribute() {},
      appendChild() {}
    }),
    addEventListener: (name, handler) => {
      if (name === 'DOMContentLoaded') domReadyHandler = handler;
    },
    head: { appendChild: (node) => appendedNodes.push(node) },
    body: { appendChild() {} },
    documentElement: { dataset: {} }
  };
  const initialFetch = jest.fn(async () => ({ ok: true, status: 200 }));
  const markSaved = jest.fn();
  const window = {
    location: { origin: url.origin, hostname: url.hostname, pathname, href: `${url.origin}${pathname}` },
    __API_BASE_URL: configuredBase,
    EditorProductionGuard: { markSaved },
    fetch: initialFetch,
    innerWidth: 1440,
    setTimeout: (handler) => handler()
  };

  vm.runInNewContext(source, { window, document, Set, URL, console, Promise });
  return {
    apiBase: window.__API_BASE_URL,
    release: window.__MC_PRIME_RELEASE,
    appendedNodes,
    document,
    window,
    initialFetch,
    markSaved,
    triggerDomReady: () => domReadyHandler?.(),
    triggerNodeLoad: (datasetKey) => {
      const node = appendedNodes.find((candidate) => candidate.dataset[datasetKey] === 'true');
      node?.listeners.load?.();
      return node;
    }
  };
}

describe('Runtime API configuration', () => {
  it.each(['https://mcprim.com', 'https://www.mcprim.com'])(
    'maps %s to the active Render API',
    (origin) => {
      expect(runConfig(origin).apiBase).toBe('https://nfc-vjy6.onrender.com');
    }
  );

  it('preserves an explicit runtime override', () => {
    expect(runConfig('https://www.mcprim.com', 'https://api.example.com///').apiBase)
      .toBe('https://api.example.com');
  });

  it('leaves same-origin deployments unconfigured', () => {
    expect(runConfig('https://preview.example.com').apiBase).toBeUndefined();
  });

  it('loads professional editor managers, Brand Kit assets, and the production guard on editor routes', () => {
    const editor = runConfig('https://mcprim.com', undefined, '/nfc/editor.html');
    const toolbarStyles = editor.appendedNodes.find((node) => node.dataset.editorToolbarRelease === 'true');
    const assetStyles = editor.appendedNodes.find((node) => node.dataset.editorAssetManagerStyle === 'true');
    const assetScript = editor.appendedNodes.find((node) => node.dataset.editorAssetManager === 'true');
    const templateStyles = editor.appendedNodes.find((node) => node.dataset.editorTemplateManagerStyle === 'true');
    const templateScript = editor.appendedNodes.find((node) => node.dataset.editorTemplateManager === 'true');
    const versionStyles = editor.appendedNodes.find((node) => node.dataset.editorVersionManagerStyle === 'true');
    const versionScript = editor.appendedNodes.find((node) => node.dataset.editorVersionManager === 'true');
    const productivityStyles = editor.appendedNodes.find((node) => node.dataset.editorProductivityToolsStyle === 'true');
    const productivityScript = editor.appendedNodes.find((node) => node.dataset.editorProductivityTools === 'true');
    const brandStyles = editor.appendedNodes.find((node) => node.dataset.brandKitStyle === 'true');
    const brandClient = editor.appendedNodes.find((node) => node.dataset.brandKitClient === 'true');
    const editorBrandKit = editor.appendedNodes.find((node) => node.dataset.editorBrandKit === 'true');
    const guard = editor.appendedNodes.find((node) => node.dataset.editorProductionGuard === 'true');

    expect(editor.release).toBe('2026.07.18-phase10.0');
    expect(editor.appendedNodes).toHaveLength(13);
    expect(toolbarStyles.href).toBe('/nfc/editor-toolbar-release.css?v=7.2');
    expect(assetStyles.href).toBe('/nfc/editor-asset-manager.css?v=8.1');
    expect(assetScript.src).toBe('/nfc/editor-asset-manager.js?v=8.1');
    expect(templateStyles.href).toBe('/nfc/editor-template-manager.css?v=8.2');
    expect(templateScript.src).toBe('/nfc/editor-template-manager.js?v=8.2');
    expect(versionStyles.href).toBe('/nfc/editor-version-manager.css?v=8.3');
    expect(versionScript.src).toBe('/nfc/editor-version-manager.js?v=8.3');
    expect(productivityStyles.href).toBe('/nfc/editor-productivity-tools.css?v=9.0');
    expect(productivityScript.src).toBe('/nfc/editor-productivity-tools.js?v=9.0');
    expect(brandStyles.href).toBe('/nfc/brand-kit.css?v=10.0');
    expect(brandClient.src).toBe('/nfc/brand-kit-client.js?v=10.0');
    expect(editorBrandKit.src).toBe('/nfc/editor-brand-kit.js?v=10.0');
    expect(assetScript.async).toBe(false);
    expect(brandClient.async).toBe(false);
    expect(editorBrandKit.async).toBe(false);
    expect(guard.src).toBe('/nfc/editor-production-guard.js?v=1.0.3');
  });

  it('loads only shared Brand Kit dashboard assets on dashboard routes', () => {
    const dashboard = runConfig('https://mcprim.com', undefined, '/nfc/dashboard.html');

    expect(dashboard.appendedNodes).toHaveLength(3);
    expect(dashboard.appendedNodes.find(node => node.dataset.brandKitStyle === 'true').href)
      .toBe('/nfc/brand-kit.css?v=10.0');
    expect(dashboard.appendedNodes.find(node => node.dataset.brandKitClient === 'true').src)
      .toBe('/nfc/brand-kit-client.js?v=10.0');
    expect(dashboard.appendedNodes.find(node => node.dataset.dashboardBrandKit === 'true').src)
      .toBe('/nfc/dashboard-brand-kit.js?v=10.0');
    expect(dashboard.appendedNodes.some(node => node.dataset.editorAssetManager === 'true')).toBe(false);
  });

  it('does not inject private workspace assets on unrelated public pages', () => {
    const page = runConfig('https://mcprim.com', undefined, '/nfc/index.html');
    expect(page.appendedNodes).toHaveLength(0);
  });

  it('loads editor assets immediately and waits before bootstrapping the save guard', () => {
    const editor = runConfig('https://mcprim.com', undefined, '/nfc/editor.html', 'loading');

    expect(editor.appendedNodes).toHaveLength(12);
    expect(editor.appendedNodes.some((node) => node.dataset.brandKitClient === 'true')).toBe(true);
    expect(editor.appendedNodes.some((node) => node.dataset.editorBrandKit === 'true')).toBe(true);
    expect(editor.appendedNodes.some((node) => node.dataset.editorAssetManager === 'true')).toBe(true);
    editor.triggerDomReady();
    expect(editor.appendedNodes).toHaveLength(13);
    expect(editor.appendedNodes[12].dataset.editorProductionGuard).toBe('true');
  });

  it('reports when editor and Brand Kit loaders become ready', () => {
    const editor = runConfig('https://mcprim.com', undefined, '/nfc/editor.html');
    editor.triggerNodeLoad('brandKitClient');
    editor.triggerNodeLoad('editorAssetManager');
    editor.triggerNodeLoad('editorTemplateManager');
    editor.triggerNodeLoad('editorVersionManager');
    editor.triggerNodeLoad('editorProductivityTools');
    editor.triggerNodeLoad('editorBrandKit');
    expect(editor.document.documentElement.dataset.brandKitClientLoader).toBe('ready');
    expect(editor.document.documentElement.dataset.editorAssetManagerLoader).toBe('ready');
    expect(editor.document.documentElement.dataset.editorTemplateManagerLoader).toBe('ready');
    expect(editor.document.documentElement.dataset.editorVersionManagerLoader).toBe('ready');
    expect(editor.document.documentElement.dataset.editorProductivityToolsLoader).toBe('ready');
    expect(editor.document.documentElement.dataset.editorBrandKitLoader).toBe('ready');
  });

  it('keeps save monitoring active after another script replaces fetch', async () => {
    const editor = runConfig('https://mcprim.com', undefined, '/nfc/editor.html');
    editor.triggerNodeLoad('editorProductionGuard');

    expect(editor.document.documentElement.dataset.editorSaveMonitor).toBe('ready');
    const replacementFetch = jest.fn(async () => ({ ok: true, status: 200 }));
    editor.window.fetch = replacementFetch;

    await editor.window.fetch('/api/save-design', { method: 'POST' });

    expect(replacementFetch).toHaveBeenCalledTimes(1);
    expect(editor.markSaved).toHaveBeenCalledTimes(1);
    expect(editor.document.documentElement.dataset.editorSaveMonitorState).toBe('saved');
    expect(editor.document.documentElement.dataset.editorSaveMonitorCount).toBe('2');
  });

  it('does not confirm a failed cloud save', async () => {
    const editor = runConfig('https://mcprim.com', undefined, '/nfc/editor.html');
    editor.triggerNodeLoad('editorProductionGuard');
    editor.window.fetch = jest.fn(async () => ({ ok: false, status: 503 }));

    await editor.window.fetch('/api/save-design', { method: 'POST' });

    expect(editor.markSaved).not.toHaveBeenCalled();
    expect(editor.document.documentElement.dataset.editorSaveMonitorState).toBe('failed-503');
  });
});
