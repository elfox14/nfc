'use strict';

const { getSafeTarget } = require('../auth-redirect');

describe('post-auth redirect validation', () => {
  const location = { href: 'https://www.mcprim.com/nfc/login.html' };
  const fallback = '/nfc/dashboard.html';

  test.each([
    'javascript:alert(1)',
    'data:text/html,attack',
    '//evil.example/steal',
    'https://evil.example/?www.mcprim.com',
    '\\\\evil.example\\steal',
    ' javaScript:alert(1) '
  ])('rejects unsafe target %s', target => {
    expect(getSafeTarget(target, fallback, location)).toBe(fallback);
  });

  it('accepts same-origin absolute paths and legacy relative editor paths', () => {
    expect(getSafeTarget('/nfc/editor.html?id=card-1', fallback, location))
      .toBe('/nfc/editor.html?id=card-1');
    expect(getSafeTarget('editor-en', fallback, location)).toBe('/nfc/editor-en');
  });

  it('falls back for empty, malformed, or oversized targets', () => {
    expect(getSafeTarget('', fallback, location)).toBe(fallback);
    expect(getSafeTarget('%', fallback, location)).toBe('/nfc/%');
    expect(getSafeTarget('a'.repeat(2049), fallback, location)).toBe(fallback);
  });
});
