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
    const adminExternal = fs.readdirSync(path.join(root, 'js'))
      .filter(f => f.startsWith('admin-'))
      .map(f => read(path.join('js', f)))
      .join('\n');
    const combined = admin + '\n' + adminExternal;
    expect(combined).toContain("sessionStorage.setItem('adminToken', token)");
    expect(combined).not.toContain("localStorage.setItem('adminToken', token)");
  });

  test('server and cPanel policies disable eval and block active-content framing', () => {
    const headers = read('utils/security-headers.js');
    const apache = read('.htaccess');
    expect(headers).not.toContain("'unsafe-eval'");
    expect(headers).toContain('frameAncestors');
    expect(apache).toContain("frame-ancestors 'none'");
    expect(apache).not.toContain("'unsafe-eval'");
  });

  test('WebSocket payloads are capped before frame buffering', () => {
    const realtime = read('utils/realtime-collaboration.js');
    expect(realtime).toContain('WS_LIMITS.MAX_MESSAGE_SIZE');
    expect(realtime).toContain('WS_LIMITS.MAX_CONNECTIONS_PER_IP');
  });

  test('successful recovery actions still count toward abuse limits', () => {
    const server = read('server.js');
    const authRoutes = read('routes/auth.routes.js');
    expect(server).toContain('const recoveryAccountLimiter = rateLimit');
    expect(server).toMatch(/const recoveryAccountLimiter = rateLimit\(\{[\s\S]*?skipSuccessfulRequests: false/);
    expect(server).toContain("app.use('/api/auth/forgot-password', recoveryAccountLimiter)");
    expect(authRoutes).toContain('passwordResetRequestedAt');
  });

  test('service worker never serves stale executable code or HTML', () => {
    const sw = read('sw.original.js');
    expect(sw).toContain("const CACHE_VERSION = 'v8'");
    expect(sw).toContain('isExecutableOrConfigAsset');
    expect(sw).toContain('networkOnlyHtmlWithOfflineFallback');
    expect(sw).not.toContain("'/nfc/error-reporter.js'");
    expect(sw).not.toMatch(/function isStaticAsset[\s\S]*?\|js\|/);
  });

  test('unversioned scripts revalidate and clean NFC document routes are no-store', () => {
    const staticFiles = read('utils/static-files.js');
    expect(staticFiles).toContain('isNfcDocumentRoute');
    expect(staticFiles).toContain("res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate')");
    expect(staticFiles).toContain('isFingerprintedAsset');
    expect(staticFiles).toContain("res.setHeader('Cache-Control', 'no-cache, must-revalidate')");
  });

  test('public design reads cannot mutate view counters', () => {
    const routes = read('routes/designs.routes.js');
    const viewer = read('viewer.original.js');
    expect(routes).not.toContain("req.query.trackView === 'true'");
    expect(routes).toContain("router.post('/track-view/:id'");
    expect(routes).toContain("VIEW_DEDUPE_WINDOW_MS");
    expect(viewer).not.toContain('?trackView=true');
    expect(viewer).toContain('/api/track-view/');
  });

  test('saved-card rendering escapes attribute data and avoids inline removal handlers', () => {
    const dashboards = [
      read('js/dashboard-2fd86ecf204e.js'),
      read('js/dashboard-en-dbf23d06155e.js')
    ].join('\n');
    expect(dashboards).toContain('alt="${escapeHTML(card.ownerName');
    expect(dashboards).toContain('src="${escapeHTML(thumb)}"');
    expect(dashboards).not.toContain("onclick=\"removeSavedCard('${card.designShortId}')");
    expect(dashboards).toContain("toastMessage.textContent = String(message ?? '')");
  });

  test('external upload rejects redirects and uses validated HTTPS endpoints', () => {
    const routes = read('routes/designs.routes.js');
    const validation = read('utils/env-validation.js');
    expect(routes).toContain("redirect: 'error'");
    expect(routes).toContain('assertSafeExternalUploadUrl');
    expect(validation).toContain("parsed.protocol !== 'https:'");
    expect(validation).toContain('isPrivateOrLocalIp');
  });

  test('editor and OAuth display names are sanitized before HTML insertion', () => {
    const authRoutes = read('routes/auth.routes.js');
    const editorStatus = read('editor-user-status.original.js');
    expect(authRoutes).toContain('function safePublicName');
    expect(authRoutes).toContain('name: safePublicName(googleUser.name');
    expect(authRoutes).toContain('user: toPublicUser(user');
    expect(editorStatus).toContain('${sanitizeHTML(userName)}');
    expect(editorStatus).not.toContain('<span class="tb-user-name">${userName}</span>');
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
