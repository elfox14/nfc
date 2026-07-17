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

  test('ships the patch through a fresh service-worker cache', () => {
    const sw = read('sw.js');

    expect(sw).toContain("const CACHE_VERSION = 'v7'");
    expect(sw).toContain("const EDITOR_STYLE_PATCH = '/nfc/editor-toolbar-release.css'");
    expect(sw).toContain('event.respondWith(editorStylesWithPatch(request))');
    expect(sw).toContain('function isEditorStylesheet(pathname)');
    expect(sw).toContain('MC PRIME toolbar release patch');
  });
});
