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
    expect(css).toContain('.workspace-editor-modal[hidden]');
  });

  test('keeps version history accessible and moves secondary mobile actions into more', () => {
    const css = read('editor-toolbar-release.css');
    expect(css).toContain('@media (min-width: 1025px) and (max-width: 1920px)');
    expect(css).toContain('.editor-body .tb-logo-text');
    expect(css).toContain('@media (min-width: 1025px) and (max-width: 1600px)');
    expect(css).toContain('.editor-body #editor-versions-btn');
    expect(css).toContain('z-index: 4');
    expect(css).toContain('.editor-body #editor-brand-kit-btn');
    expect(css).toContain('.editor-body #editor-review-workflow-btn');
    expect(css).toContain('display: none !important');
    expect(css).toContain('#editor-versions-menu-btn');
    expect(css).toContain('#editor-brand-kit-menu-btn');
    expect(css).toContain('#editor-review-workflow-menu-btn');
    expect(css).not.toContain('#save-share-btn');
    expect(css).not.toContain('#preview-mode-btn');
  });

  test('ships editor managers, Brand Kit and team review through a fresh cache', () => {
    const sw = read('sw.js');
    const runtime = read('runtime-config.js');
    expect(sw).toContain("const CACHE_VERSION = 'v23'");
    expect(sw).toContain("'/nfc/editor-default-card.js?v=2.0'");
    expect(sw).toContain("'/nfc/editor-hydration.js?v=1.0'");
    expect(sw).toContain("'/nfc/editor-design-loader.js?v=2.0'");
    expect(sw).toContain("'/nfc/editor-interact-fallback.js?v=1.0'");
    expect(sw).toContain("'/nfc/editor-qr-runtime.js?v=1.0'");
    expect(sw).toContain("'/nfc/vendor/qr-code-styling.js?v=1.5.0'");
    expect(sw).toContain("'/nfc/vendor/qrcode.min.js?v=1.0.0'");
    expect(sw).toContain("'/nfc/editor-logo-fit.js'");
    expect(sw).toContain("'/nfc/viewer-logo-fit.css'");
    expect(sw).toContain("'/nfc/client-observability.js'");
    expect(sw).toContain("'/nfc/editor-toolbar-release.css'");
    expect(sw).toContain("'/nfc/editor-asset-manager.js'");
    expect(sw).toContain("'/nfc/editor-template-manager.js'");
    expect(sw).toContain("'/nfc/editor-version-manager.js'");
    expect(sw).toContain("'/nfc/editor-productivity-tools.js'");
    expect(sw).toContain("'/nfc/brand-kit.css'");
    expect(sw).toContain("'/nfc/brand-kit-client.js'");
    expect(sw).toContain("'/nfc/dashboard-brand-kit.js'");
    expect(sw).toContain("'/nfc/editor-brand-kit.js'");
    expect(sw).toContain("'/nfc/workspace.css'");
    expect(sw).toContain("'/nfc/workspace-client.js'");
    expect(sw).toContain("'/nfc/dashboard-workspaces.js'");
    expect(sw).toContain("'/nfc/editor-review-workflow.js'");
    expect(runtime).toContain('editor-productivity-tools.js?v=9.0');
    expect(runtime).toContain('brand-kit-client.js?v=10.0');
    expect(runtime).toContain('workspace-client.js?v=11.0');
    expect(runtime).toContain('dashboard-workspaces.js?v=11.0');
    expect(runtime).toContain('editor-review-workflow.js?v=11.0');
  });
});
