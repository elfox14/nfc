'use strict';

/**
 * Public deployment configuration.
 *
 * mcprim.com serves the static frontend while the API is hosted on Render.
 * An explicitly injected value always wins for previews and future deployments.
 */
(function configureApiBaseUrl() {
  const configuredBase = typeof window.__API_BASE_URL === 'string'
    ? window.__API_BASE_URL.trim()
    : '';

  if (configuredBase) {
    window.__API_BASE_URL = configuredBase.replace(/\/+$/, '');
    return;
  }

  const hostname = (window.location.hostname || '').toLowerCase().replace(/\.$/, '');
  if (hostname === 'mcprim.com' || hostname === 'www.mcprim.com') {
    window.__API_BASE_URL = 'https://nfc-vjy6.onrender.com';
  }
})();
