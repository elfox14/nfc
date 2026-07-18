'use strict';

const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');

describe('final production source fixes', () => {
  test.each(['editor.html', 'editor-en.html'])('%s starts with a clean HTML doctype', file => {
    const html = read(file).replace(/^\uFEFF/, '');
    expect(html.startsWith('<!DOCTYPE html>')).toBe(true);
    expect(html.slice(0, 400)).not.toMatch(/Warning:\s*truncated output|Total output lines:/i);
  });

  test('viewer forwards the authenticated session for private workspace previews', () => {
    const viewer = read('view/viewer.js');
    expect(viewer).toContain('window.Auth?.apiFetchWithRefresh');
    expect(viewer).toContain("credentials: 'include'");
    expect(viewer).toContain("cache: 'no-store'");
    expect(viewer).toContain('headers: window.Auth?.getHeader?.() || {}');
    expect(viewer).toContain(': await fetch(apiUrl, requestOptions)');
  });

  test('production verification checks clean editor documents and authenticated viewer support', () => {
    const verifier = read('scripts/verify-production-release.js');
    expect(verifier).toContain('async function checkEditorDocument');
    expect(verifier).toContain('does not start with <!DOCTYPE html>');
    expect(verifier).toContain('contains injected output metadata');
    expect(verifier).toContain('Authenticated private viewer support');
  });
});
