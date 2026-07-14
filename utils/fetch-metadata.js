const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);
const TRUSTED_SITES = new Set(['same-origin', 'same-site', 'none']);

function applyFetchMetadataProtection(app) {
  app.use((req, res, next) => {
    const fetchSite = req.get('Sec-Fetch-Site');

    if (!fetchSite) return next();
    if (SAFE_METHODS.has(req.method)) return next();
    if (TRUSTED_SITES.has(fetchSite)) return next();

    return res.status(403).json({ error: 'Cross-site requests are not allowed' });
  });
}

module.exports = {
  applyFetchMetadataProtection,
  SAFE_METHODS,
  TRUSTED_SITES
};
