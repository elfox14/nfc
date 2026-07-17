'use strict';

/**
 * Public deployment configuration.
 *
 * mcprim.com serves the static frontend while the API is hosted on Render.
 * Keep this small file as the single place that maps the public frontend to
 * its API. An explicitly injected value always wins for previews and future
 * deployments.
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
  const publicFrontendHosts = new Set(['mcprim.com', 'www.mcprim.com']);

  if (publicFrontendHosts.has(hostname)) {
    window.__API_BASE_URL = 'https://nfc-vjy6.onrender.com';
  }
})();
