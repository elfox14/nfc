const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);
const TRUSTED_SITES = new Set(['same-origin', 'same-site', 'none']);
const { isAllowedOrigin } = require('./cors-config');

function applyFetchMetadataProtection(app, allowedOrigins = []) {
  app.use((req, res, next) => {
    const fetchSite = req.get('Sec-Fetch-Site');

    if (!fetchSite) return next();
    if (SAFE_METHODS.has(req.method)) return next();
    if (TRUSTED_SITES.has(fetchSite)) return next();

    // The UI may be hosted on the public custom domain while the API runs on
    // Render. Permit that cross-site request only when its Origin is already
    // explicitly trusted by the production CORS allowlist.
    const requestOrigin = req.get('Origin');
    if (fetchSite === 'cross-site' && isAllowedOrigin(requestOrigin, allowedOrigins)) {
      return next();
    }

    return res.status(403).json({ error: 'Cross-site requests are not allowed' });
  });
}

module.exports = {
  applyFetchMetadataProtection,
  SAFE_METHODS,
  TRUSTED_SITES
};
