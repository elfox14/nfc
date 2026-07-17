'use strict';

/**
 * Public deployment configuration.
 *
 * mcprim.com serves the static frontend while the API is hosted on Render.
 * Keep this small file as the single place that maps the public frontend to
 * its API. An explicitly injected value always wins for previews and future
 * deployments.
 */
(function configureRuntime() {
  const configuredBase = typeof window.__API_BASE_URL === 'string'
    ? window.__API_BASE_URL.trim()
    : '';

  if (configuredBase) {
    window.__API_BASE_URL = configuredBase.replace(/\/+$/, '');
  } else {
    const hostname = (window.location.hostname || '').toLowerCase().replace(/\.$/, '');
    const publicFrontendHosts = new Set(['mcprim.com', 'www.mcprim.com']);

    if (publicFrontendHosts.has(hostname)) {
      window.__API_BASE_URL = 'https://nfc-vjy6.onrender.com';
    }
  }

  window.__MC_PRIME_RELEASE = window.__MC_PRIME_RELEASE || '2026.07.18-phase7.1';

  const pathname = window.location.pathname || '';
  const isEditor = /(?:^|\/)editor(?:-en)?(?:\.html)?\/?$/i.test(pathname);
  if (!isEditor || document.querySelector('script[data-editor-production-guard]')) return;

  const guard = document.createElement('script');
  guard.src = '/nfc/editor-production-guard.js?v=1.0.0';
  guard.async = false;
  guard.dataset.editorProductionGuard = 'true';
  guard.addEventListener('error', () => {
    document.documentElement.dataset.editorProduction = 'load-error';
    console.error('[RuntimeConfig] Failed to load editor production guard.');
  });
  document.head.appendChild(guard);
}());
