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
  const scriptListeners = {};
  const document = {
    readyState,
    querySelector: () => null,
    createElement: () => ({
      dataset: {},
      addEventListener(name, handler) {
        scriptListeners[name] = handler;
      }
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
    triggerScriptLoad: () => scriptListeners.load?.()
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

  it('loads toolbar styles and the production guard only on editor routes', () => {
    const editor = runConfig('https://mcprim.com', undefined, '/nfc/editor.html');
    const dashboard = runConfig('https://mcprim.com', undefined, '/nfc/dashboard.html');
    const stylesheet = editor.appendedNodes.find((node) => node.dataset.editorToolbarRelease === 'true');
    const guard = editor.appendedNodes.find((node) => node.dataset.editorProductionGuard === 'true');

    expect(editor.release).toBe('2026.07.18-phase7.2');
    expect(editor.appendedNodes).toHaveLength(2);
    expect(stylesheet.href).toBe('/nfc/editor-toolbar-release.css?v=7.2');
    expect(stylesheet.rel).toBe('stylesheet');
    expect(guard.src).toBe('/nfc/editor-production-guard.js?v=1.0.3');
    expect(dashboard.appendedNodes).toHaveLength(0);
  });

  it('loads toolbar styles immediately and waits before bootstrapping the save guard', () => {
    const editor = runConfig('https://mcprim.com', undefined, '/nfc/editor.html', 'loading');

    expect(editor.appendedNodes).toHaveLength(1);
    expect(editor.appendedNodes[0].dataset.editorToolbarRelease).toBe('true');
    editor.triggerDomReady();
    expect(editor.appendedNodes).toHaveLength(2);
    expect(editor.appendedNodes[1].dataset.editorProductionGuard).toBe('true');
  });

  it('keeps save monitoring active after another script replaces fetch', async () => {
    const editor = runConfig('https://mcprim.com', undefined, '/nfc/editor.html');
    editor.triggerScriptLoad();

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
    editor.triggerScriptLoad();
    editor.window.fetch = jest.fn(async () => ({ ok: false, status: 503 }));

    await editor.window.fetch('/api/save-design', { method: 'POST' });

    expect(editor.markSaved).not.toHaveBeenCalled();
    expect(editor.document.documentElement.dataset.editorSaveMonitorState).toBe('failed-503');
  });
});
