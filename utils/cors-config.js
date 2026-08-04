const cors = require('cors');

function parseAllowedOrigins() {
  const configured = (process.env.ALLOWED_ORIGINS || '')
    .split(',')
    .map(s => s.trim())
    .filter(Boolean);

  if (process.env.RENDER_EXTERNAL_HOSTNAME) {
    const renderOrigin = `https://${process.env.RENDER_EXTERNAL_HOSTNAME}`;
    if (!configured.includes(renderOrigin)) {
      configured.push(renderOrigin);
    }
  }

  return configured;
}

function normalizeUrl(origin) {
  return origin.replace(/^(https?:\/\/)(www\.)?/, '$1').toLowerCase();
}

function isLocalDevelopmentOrigin(origin) {
  return origin.startsWith('http://localhost:') || origin.startsWith('http://127.0.0.1:');
}

function isAllowedOrigin(origin, allowedOrigins) {
  if (!origin) return false;

  const isConfigured = allowedOrigins.some(baseDomain => {
    if (baseDomain === origin) return true;
    return normalizeUrl(baseDomain) === normalizeUrl(origin);
  });

  if (isConfigured) return true;

  // Allow render.com subdomains automatically in production when accessing via default Render host
  try {
    const url = new URL(origin);
    if (url.hostname.endsWith('.onrender.com') || url.hostname.endsWith('.render.com')) {
      return true;
    }
  } catch {}

  return process.env.NODE_ENV !== 'production' && isLocalDevelopmentOrigin(origin);
}

function getRefererOrigin(referer) {
  if (!referer) return null;
  try {
    return new URL(referer).origin;
  } catch {
    return null;
  }
}

function registerCsrfOriginGuard(app, allowedOrigins) {
  const unsafeMethods = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

  app.use((req, res, next) => {
    if (!unsafeMethods.has(req.method) || !req.path.startsWith('/api/')) {
      return next();
    }

    const requestOrigin = req.get('Origin') || getRefererOrigin(req.get('Referer'));

    if (!requestOrigin) {
      if (process.env.NODE_ENV === 'production') {
        return res.status(403).json({ error: 'Request origin is required' });
      }
      return next();
    }

    if (isAllowedOrigin(requestOrigin, allowedOrigins)) {
      return next();
    }

    console.warn(`[CSRF] Blocked unsafe request from origin: ${requestOrigin}`);
    return res.status(403).json({ error: 'Request origin is not allowed' });
  });
}

function applyCors(app) {
  const allowedOrigins = parseAllowedOrigins();

  if (process.env.NODE_ENV === 'production' && allowedOrigins.length === 0) {
    throw new Error('FATAL: ALLOWED_ORIGINS must be set in production. Refusing to start with open CORS.');
  }

  app.use(cors({
    origin: (origin, cb) => {
      if (!origin) {
        return cb(null, true);
      }

      const isAllowed = isAllowedOrigin(origin, allowedOrigins);

      if (isAllowed) {
        return cb(null, true);
      }

      console.warn(`[CORS] Request from BLOCKED origin: ${origin}. Allowed origins: ${allowedOrigins.join(', ')}`);
      const error = new Error(`Not allowed by CORS: ${origin}`);
      error.status = 403;
      error.corsOrigin = origin;
      error.allowedOrigins = allowedOrigins;
      cb(error);
    },
    credentials: true,
    optionsSuccessStatus: 200
  }));

  registerCsrfOriginGuard(app, allowedOrigins);

  return allowedOrigins;
}

module.exports = applyCors;
module.exports.isAllowedOrigin = isAllowedOrigin;
