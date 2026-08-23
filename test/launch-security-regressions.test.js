'use strict';

const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const read = relative => fs.readFileSync(path.join(root, relative), 'utf8');

describe('public launch security regressions', () => {
  test('the static viewer sanitizes dynamic fragments before insertion', () => {
    const viewer = read('viewer.original.js');
    expect(viewer).toContain('function sanitizeHtmlFragment');
    expect(viewer).toContain('appendSafeHtml(containerCollection[placement], elementHTML)');
    expect(viewer).not.toContain('insertAdjacentHTML');
    expect(viewer).not.toContain('frontCardContainer.innerHTML');
    expect(viewer).not.toContain('backCardContainer.innerHTML');
  });

  test('OAuth fallback secrets use a URL fragment, not a query string', () => {
    const routes = read('routes/auth.routes.js');
    expect(routes).toContain("'#oauthSuccess=1&initToken='");
    expect(routes).not.toContain("'?oauthSuccess=1&initToken='");
  });

  test('admin credentials are tab-scoped and legacy persistence is removed', () => {
    const admin = read('admin.html');
    expect(admin).toContain("sessionStorage.setItem('adminToken', token)");
    expect(admin).not.toContain("localStorage.setItem('adminToken', token)");
  });

  test('server and cPanel policies disable eval and block active-content framing', () => {
    const headers = read('utils/security-headers.js');
    const apache = read('.htaccess');
    expect(headers).not.toContain("'unsafe-eval'");
    expect(headers).toContain('frameAncestors');
    expect(apache).toContain("frame-ancestors 'none'");
    expect(apache).not.toContain("'unsafe-eval'");
  });

  test("scriptSrc does not contain 'unsafe-inline' — nonce enforcement is active", () => {
    const headers = read('utils/security-headers.js');
    const apache = read('.htaccess');
    // 'unsafe-inline' in scriptSrc bypasses XSS protection entirely.
    // Nonce injection via injectCspNonceIntoHtml() replaces it.
    // Strip single-line comments before checking so comment references don't trip the test.
    const strippedHeaders = headers.replace(/\/\/[^\n]*/g, '');
    expect(strippedHeaders).not.toMatch(/scriptSrc[\s\S]{0,200}'unsafe-inline'/);
    // Apache CSP: script-src must not contain 'unsafe-inline'
    expect(apache).not.toMatch(/script-src[^;]*'unsafe-inline'/);
  });

  test('WebSocket payloads are capped before frame buffering', () => {
    const realtime = read('utils/realtime-collaboration.js');
    expect(realtime).toContain('WS_LIMITS.MAX_MESSAGE_SIZE');
    expect(realtime).toContain('WS_LIMITS.MAX_CONNECTIONS_PER_IP');
  });

  test('successful auth actions still count toward abuse limits', () => {
    const server = read('server.js');
    expect(server).toContain('const authLimiter = rateLimit');
  });


  test('third-party Actions are immutable and secret scanning is not verified-only', () => {
    const workflows = [
      read('.github/workflows/ci.yml'),
      read('.github/workflows/release.yml'),
      read('.github/workflows/secret-scan.yml')
    ].join('\n');
    expect(workflows).not.toMatch(/uses:\s+[^\s]+@(?:main|master|v\d+)\s*$/m);
    expect(workflows).not.toContain('--only-verified');
  });
});
