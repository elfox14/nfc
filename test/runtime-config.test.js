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

  it('loads editor managers, Brand Kit, workspace review, and the production guard', () => {
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
    const workspaceStyles = editor.appendedNodes.find((node) => node.dataset.workspaceStyle === 'true');
    const workspaceClient = editor.appendedNodes.find((node) => node.dataset.workspaceClient === 'true');
    const editorBrandKit = editor.appendedNodes.find((node) => node.dataset.editorBrandKit === 'true');
    const reviewWorkflow = editor.appendedNodes.find((node) => node.dataset.editorReviewWorkflow === 'true');
    const guard = editor.appendedNodes.find((node) => node.dataset.editorProductionGuard === 'true');

    expect(editor.release).toBe('2026.07.21-phase17');
    expect(editor.appendedNodes).toHaveLength(16);
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
    expect(workspaceStyles.href).toBe('/nfc/workspace.css?v=11.0');
    expect(workspaceClient.src).toBe('/nfc/workspace-client.js?v=11.0');
    expect(editorBrandKit.src).toBe('/nfc/editor-brand-kit.js?v=10.0');
    expect(reviewWorkflow.src).toBe('/nfc/editor-review-workflow.js?v=11.0');
    expect(assetScript.async).toBe(false);
    expect(workspaceClient.async).toBe(false);
    expect(reviewWorkflow.async).toBe(false);
    expect(guard.src).toBe('/nfc/editor-production-guard.js?v=1.0.3');
  });

  it('loads Brand Kit and team workspace dashboard assets only on dashboard routes', () => {
    const dashboard = runConfig('https://mcprim.com', undefined, '/nfc/dashboard.html');

    expect(dashboard.appendedNodes).toHaveLength(6);
    expect(dashboard.appendedNodes.find(node => node.dataset.brandKitStyle === 'true').href)
      .toBe('/nfc/brand-kit.css?v=10.0');
    expect(dashboard.appendedNodes.find(node => node.dataset.brandKitClient === 'true').src)
      .toBe('/nfc/brand-kit-client.js?v=10.0');
    expect(dashboard.appendedNodes.find(node => node.dataset.workspaceStyle === 'true').href)
      .toBe('/nfc/workspace.css?v=11.0');
    expect(dashboard.appendedNodes.find(node => node.dataset.workspaceClient === 'true').src)
      .toBe('/nfc/workspace-client.js?v=11.0');
    expect(dashboard.appendedNodes.find(node => node.dataset.dashboardBrandKit === 'true').src)
      .toBe('/nfc/dashboard-brand-kit.js?v=10.0');
    expect(dashboard.appendedNodes.find(node => node.dataset.dashboardWorkspaces === 'true').src)
      .toBe('/nfc/dashboard-workspaces.js?v=11.0');
    expect(dashboard.appendedNodes.some(node => node.dataset.editorAssetManager === 'true')).toBe(false);
  });

  it('does not inject private workspace assets on unrelated public pages', () => {
    const page = runConfig('https://mcprim.com', undefined, '/nfc/index.html');
    expect(page.appendedNodes).toHaveLength(0);
  });

  it('loads editor assets immediately and waits before bootstrapping the save guard', () => {
    const editor = runConfig('https://mcprim.com', undefined, '/nfc/editor.html', 'loading');

    expect(editor.appendedNodes).toHaveLength(15);
    expect(editor.appendedNodes.some((node) => node.dataset.workspaceClient === 'true')).toBe(true);
    expect(editor.appendedNodes.some((node) => node.dataset.editorReviewWorkflow === 'true')).toBe(true);
    expect(editor.appendedNodes.some((node) => node.dataset.brandKitClient === 'true')).toBe(true);
    expect(editor.appendedNodes.some((node) => node.dataset.editorAssetManager === 'true')).toBe(true);
    editor.triggerDomReady();
    expect(editor.appendedNodes).toHaveLength(16);
    expect(editor.appendedNodes[15].dataset.editorProductionGuard).toBe('true');
  });

  it('reports when editor, Brand Kit and workspace loaders become ready', () => {
    const editor = runConfig('https://mcprim.com', undefined, '/nfc/editor.html');
    editor.triggerNodeLoad('brandKitClient');
    editor.triggerNodeLoad('workspaceClient');
    editor.triggerNodeLoad('editorAssetManager');
    editor.triggerNodeLoad('editorTemplateManager');
    editor.triggerNodeLoad('editorVersionManager');
    editor.triggerNodeLoad('editorProductivityTools');
    editor.triggerNodeLoad('editorBrandKit');
    editor.triggerNodeLoad('editorReviewWorkflow');
    expect(editor.document.documentElement.dataset.brandKitClientLoader).toBe('ready');
    expect(editor.document.documentElement.dataset.workspaceClientLoader).toBe('ready');
    expect(editor.document.documentElement.dataset.editorAssetManagerLoader).toBe('ready');
    expect(editor.document.documentElement.dataset.editorTemplateManagerLoader).toBe('ready');
    expect(editor.document.documentElement.dataset.editorVersionManagerLoader).toBe('ready');
    expect(editor.document.documentElement.dataset.editorProductivityToolsLoader).toBe('ready');
    expect(editor.document.documentElement.dataset.editorBrandKitLoader).toBe('ready');
    expect(editor.document.documentElement.dataset.editorReviewWorkflowLoader).toBe('ready');
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
