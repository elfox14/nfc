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
    createElement: (tagName) => ({
      tagName: String(tagName).toUpperCase(),
      dataset: {},
      listeners: {},
      addEventListener(name, handler) { this.listeners[name] = handler; }
    }),
    addEventListener: (name, handler) => {
      if (name === 'DOMContentLoaded') domReadyHandler = handler;
    },
    head: { appendChild: (node) => appendedNodes.push(node) },
    documentElement: { dataset: {} }
  };
  const initialFetch = jest.fn(async () => ({ ok: true, status: 200 }));
  const markSaved = jest.fn();
  const window = {
    location: { origin: url.origin, hostname: url.hostname, pathname, href: `${url.origin}${pathname}` },
    __API_BASE_URL: configuredBase,
    EditorProductionGuard: { markSaved },
    fetch: initialFetch,
    setTimeout: (handler) => handler()
  };

  vm.runInNewContext(source, { window, document, Set, URL, console });
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

  it('loads editor release styles, professional managers, and the production guard only on editor routes', () => {
    const editor = runConfig('https://mcprim.com', undefined, '/nfc/editor.html');
    const dashboard = runConfig('https://mcprim.com', undefined, '/nfc/dashboard.html');
    const toolbarStyles = editor.appendedNodes.find((node) => node.dataset.editorToolbarRelease === 'true');
    const assetStyles = editor.appendedNodes.find((node) => node.dataset.editorAssetManagerStyle === 'true');
    const assetScript = editor.appendedNodes.find((node) => node.dataset.editorAssetManager === 'true');
    const templateStyles = editor.appendedNodes.find((node) => node.dataset.editorTemplateManagerStyle === 'true');
    const templateScript = editor.appendedNodes.find((node) => node.dataset.editorTemplateManager === 'true');
    const guard = editor.appendedNodes.find((node) => node.dataset.editorProductionGuard === 'true');

    expect(editor.release).toBe('2026.07.18-phase8.2');
    expect(editor.appendedNodes).toHaveLength(6);
    expect(toolbarStyles.href).toBe('/nfc/editor-toolbar-release.css?v=7.2');
    expect(toolbarStyles.rel).toBe('stylesheet');
    expect(assetStyles.href).toBe('/nfc/editor-asset-manager.css?v=8.1');
    expect(assetScript.src).toBe('/nfc/editor-asset-manager.js?v=8.1');
    expect(assetScript.async).toBe(false);
    expect(templateStyles.href).toBe('/nfc/editor-template-manager.css?v=8.2');
    expect(templateScript.src).toBe('/nfc/editor-template-manager.js?v=8.2');
    expect(templateScript.async).toBe(false);
    expect(guard.src).toBe('/nfc/editor-production-guard.js?v=1.0.3');
    expect(dashboard.appendedNodes).toHaveLength(0);
  });

  it('loads editor assets immediately and waits before bootstrapping the save guard', () => {
    const editor = runConfig('https://mcprim.com', undefined, '/nfc/editor.html', 'loading');

    expect(editor.appendedNodes).toHaveLength(5);
    expect(editor.appendedNodes.some((node) => node.dataset.editorAssetManager === 'true')).toBe(true);
    expect(editor.appendedNodes.some((node) => node.dataset.editorTemplateManager === 'true')).toBe(true);
    editor.triggerDomReady();
    expect(editor.appendedNodes).toHaveLength(6);
    expect(editor.appendedNodes[5].dataset.editorProductionGuard).toBe('true');
  });

  it('reports when editor manager loaders become ready', () => {
    const editor = runConfig('https://mcprim.com', undefined, '/nfc/editor.html');
    editor.triggerNodeLoad('editorAssetManager');
    editor.triggerNodeLoad('editorTemplateManager');
    expect(editor.document.documentElement.dataset.editorAssetManagerLoader).toBe('ready');
    expect(editor.document.documentElement.dataset.editorTemplateManagerLoader).toBe('ready');
  });

  it('keeps save monitoring active after another script replaces fetch', async () => {
    const editor = runConfig('https://mcprim.com', undefined, '/nfc/editor.html');
    editor.triggerNodeLoad('editorProductionGuard');

    expect(editor.document.documentElement.dataset.editorSaveMonitor).toBe('ready');
    expect(editor.document.documentElement.dataset.editorSaveMonitorCount).toBe('0');
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
