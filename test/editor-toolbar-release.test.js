const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');

describe('editor toolbar production release patch', () => {
  test('keeps the editor workspace below the floating toolbar', () => {
    const css = read('editor-toolbar-release.css');
    expect(css).toContain('--editor-toolbar-offset: 88px');
    expect(css).toContain('padding-top: var(--editor-toolbar-offset) !important');
    expect(css).toContain('height: calc(100dvh - var(--editor-toolbar-offset)) !important');
    expect(css).toContain('--editor-toolbar-offset: 74px');
  });

  test('compacts the desktop toolbar without hiding primary actions', () => {
    const css = read('editor-toolbar-release.css');
    expect(css).toContain('@media (min-width: 1025px) and (max-width: 1920px)');
    expect(css).toContain('.editor-body .tb-logo-text');
    expect(css).toContain('@media (min-width: 1025px) and (max-width: 1600px)');
    expect(css).not.toContain('#save-share-btn');
    expect(css).not.toContain('#preview-mode-btn');
  });

  test('ships editor managers and cloud Brand Kit through a fresh cache', () => {
    const sw = read('sw.js');
    const runtime = read('runtime-config.js');
    expect(sw).toContain("const CACHE_VERSION = 'v13'");
    expect(sw).toContain("'/nfc/editor-toolbar-release.css'");
    expect(sw).toContain("'/nfc/editor-asset-manager.js'");
    expect(sw).toContain("'/nfc/editor-template-manager.js'");
    expect(sw).toContain("'/nfc/editor-version-manager.js'");
    expect(sw).toContain("'/nfc/editor-productivity-tools.js'");
    expect(sw).toContain("'/nfc/brand-kit.css'");
    expect(sw).toContain("'/nfc/brand-kit-client.js'");
    expect(sw).toContain("'/nfc/dashboard-brand-kit.js'");
    expect(sw).toContain("'/nfc/editor-brand-kit.js'");
    expect(runtime).toContain('editor-productivity-tools.js?v=9.0');
    expect(runtime).toContain('brand-kit-client.js?v=10.0');
    expect(runtime).toContain('dashboard-brand-kit.js?v=10.0');
    expect(runtime).toContain('editor-brand-kit.js?v=10.0');
  });
});
