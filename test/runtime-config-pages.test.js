/**
 * @jest-environment node
 */
const fs = require('fs');
const path = require('path');

const apiPages = [
  'admin.html', 'dashboard-en.html', 'dashboard.html', 'editor-en.html',
  'editor.html', 'forgot-password.html', 'gallery-en.html', 'gallery.html',
  'index.html', 'login-en.html', 'login.html', 'reset-password.html',
  'signup-en.html', 'signup.html', 'verify-email.html', 'viewer-en.html',
  'viewer.html'
];

describe('Public API runtime configuration', () => {
  test.each(apiPages)('%s loads runtime config before API/auth code', (file) => {
    const html = fs.readFileSync(path.join(__dirname, '..', file), 'utf8');
    const runtimeIndex = html.indexOf('/nfc/runtime-config.js?v=1.0');
    const authIndex = html.indexOf('/nfc/auth.js');
    const firstApiIndex = html.search(/Auth\.|\/api\//);

    expect(runtimeIndex).toBeGreaterThan(-1);
    if (authIndex !== -1) expect(runtimeIndex).toBeLessThan(authIndex);
    if (firstApiIndex !== -1) expect(runtimeIndex).toBeLessThan(firstApiIndex);
  });
});
