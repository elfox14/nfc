/**
 * @jest-environment node
 */
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const source = fs.readFileSync(path.join(__dirname, '..', 'runtime-config.js'), 'utf8');

function runConfig(origin, configuredBase, pathname = '/') {
  const url = new URL(origin);
  const appendedScripts = [];
  const document = {
    querySelector: () => null,
    createElement: () => ({ dataset: {}, addEventListener: jest.fn() }),
    head: { appendChild: (node) => appendedScripts.push(node) },
    documentElement: { dataset: {} }
  };
  const window = {
    location: { origin: url.origin, hostname: url.hostname, pathname },
    __API_BASE_URL: configuredBase
  };

  vm.runInNewContext(source, { window, document, Set, console });
  return {
    apiBase: window.__API_BASE_URL,
    release: window.__MC_PRIME_RELEASE,
    appendedScripts
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

  it('loads the production guard only on editor routes', () => {
    const editor = runConfig('https://mcprim.com', undefined, '/nfc/editor.html');
    const dashboard = runConfig('https://mcprim.com', undefined, '/nfc/dashboard.html');

    expect(editor.release).toBe('2026.07.18-phase7.1');
    expect(editor.appendedScripts).toHaveLength(1);
    expect(editor.appendedScripts[0].src).toBe('/nfc/editor-production-guard.js?v=1.0.0');
    expect(editor.appendedScripts[0].dataset.editorProductionGuard).toBe('true');
    expect(dashboard.appendedScripts).toHaveLength(0);
  });
});
