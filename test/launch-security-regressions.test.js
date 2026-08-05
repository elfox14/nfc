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

  test('login and signup pages share strict redirect validation and reject legacy URL tokens', () => {
    const pages = [
      read('login.html'),
      read('login-en.html'),
      read('signup.html'),
      read('signup-en.html')
    ];
    pages.forEach(page => {
      expect(page).toContain('AuthRedirect.getSafeTarget');
      expect(page).not.toContain("redirectParam.startsWith('http')");
    });
    expect(pages[0]).not.toContain("params.get('google_token')");
    expect(pages[1]).not.toContain("params.get('google_token')");
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

  test('server-rendered auth and viewer pages use nonce-only script policies', () => {
    const authRoutes = read('routes/auth.routes.js');
    const viewerRoutes = read('routes/viewer.routes.js');
    expect(authRoutes).toContain('setNonceOnlyHtmlCsp(res)');
    expect(viewerRoutes).toContain("script-src 'self' 'nonce-${nonce}'");
  });

  test('WebSocket payloads are capped before frame buffering', () => {
    const realtime = read('utils/realtime-collaboration.js');
    expect(realtime).toContain('maxPayload: WS_LIMITS.MAX_MESSAGE_SIZE');
    expect(realtime).toContain('WebSocket origin is not allowed');
  });

  test('successful auth actions still count toward abuse limits', () => {
    const server = read('server.js');
    expect(server).toContain('const loginLimiter = rateLimit');
    expect(server).toContain('const authActionLimiter = rateLimit');
    expect(server).toMatch(/authActionLimiter = rateLimit\([\s\S]*?skipSuccessfulRequests: false/);
  });

  test('unsafe API requests require a signed CSRF cookie matching a custom header', () => {
    const server = read('server.js');
    const csrf = read('utils/csrf-protection.js');
    const auth = read('auth.js');
    expect(server).toContain('registerCsrfProtection(app, process.env.COOKIE_SIGNING_SECRET)');
    expect(csrf).toContain("req.signedCookies?.[CSRF_COOKIE_NAME]");
    expect(csrf).toContain("req.cookies[CSRF_COOKIE_NAME]");
    expect(csrf).toContain("req.get(CSRF_HEADER_NAME)");
    expect(csrf).toContain("crypto.createHmac('sha256', secret)");
    expect(csrf).toContain('crypto.timingSafeEqual');
    expect(auth).toContain("'X-CSRF-Token': csrfToken");
    expect(auth).toContain("/^\\/api\\/[A-Za-z0-9/_-]+$/");
    expect(server.indexOf("app.use('/api/', apiLimiter)")).toBeLessThan(
      server.indexOf('registerCsrfProtection(app, process.env.COOKIE_SIGNING_SECRET)')
    );
  });

  test('third-party Actions are immutable and secret scanning is not verified-only', () => {
    const workflows = [
      read('.github/workflows/ci.yml'),
      read('.github/workflows/codeql.yml'),
      read('.github/workflows/release.yml'),
      read('.github/workflows/secret-scan.yml')
    ].join('\n');
    expect(workflows).not.toMatch(/uses:\s+[^\s]+@(?:main|master|v\d+)\s*$/m);
    expect(workflows).not.toContain('--only-verified');
  });
});
