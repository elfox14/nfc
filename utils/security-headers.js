const crypto = require('crypto');
const helmet = require('helmet');

function applySecurityHeaders(app) {
  app.use(helmet.frameguard({ action: 'deny' }));
  app.use(helmet.noSniff());
  app.use(helmet.hsts({ maxAge: 31536000, includeSubDomains: true, preload: true }));
  app.use(helmet.referrerPolicy({ policy: 'strict-origin-when-cross-origin' }));
  app.use(helmet.dnsPrefetchControl({ allow: false }));
  app.use(helmet.permittedCrossDomainPolicies({ permittedPolicies: 'none' }));
  app.use(helmet.originAgentCluster());
  app.use(helmet.crossOriginOpenerPolicy({ policy: 'same-origin-allow-popups' }));

  app.use((req, res, next) => {
    res.setHeader(
      'Permissions-Policy',
      'camera=(), microphone=(), geolocation=(), payment=(), usb=(), bluetooth=(), interest-cohort=()'
    );
    next();
  });

  app.use((req, res, next) => {
    res.locals.cspNonce = crypto.randomBytes(16).toString('base64');
    next();
  });

  app.use(helmet.contentSecurityPolicy({
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: [
        "'self'",
        "'unsafe-inline'",
        "'unsafe-eval'",
        "https://cdnjs.cloudflare.com",
        "https://cdn.jsdelivr.net",
        "https://www.youtube.com",
        "https://www.googletagmanager.com",
        "https://pagead2.googlesyndication.com",
        "https://www.googleadservices.com",
        "https://tpc.googlesyndication.com"
      ],
      styleSrc: [
        "'self'",
        "'unsafe-inline'",
        "https://cdnjs.cloudflare.com",
        "https://fonts.googleapis.com"
      ],
      fontSrc: ["'self'", "https://fonts.gstatic.com", "https://cdnjs.cloudflare.com"],
      imgSrc: [
        "'self'",
        "data:",
        "https:",
        "https://res.cloudinary.com",
        "https://*.mcprim.com",
        "https://mcprim.com",
        "https://i.imgur.com",
        "https://media.giphy.com",
        "https://pagead2.googlesyndication.com"
      ],
      mediaSrc: ["'self'", "data:"],
      frameSrc: [
        "'self'",
        "https://www.youtube.com",
        "https://www.googletagmanager.com",
        "https://googleads.g.doubleclick.net",
        "https://tpc.googlesyndication.com",
        "https://www.google.com"
      ],
      connectSrc: [
        "'self'",
        "https://cdnjs.cloudflare.com",
        "https://cdn.jsdelivr.net",
        "https://*.mcprim.com",
        "https://mcprim.com",
        "https://res.cloudinary.com",
        "https://www.google-analytics.com",
        "https://pagead2.googlesyndication.com",
        ...(process.env.RENDER_EXTERNAL_HOSTNAME
          ? [`wss://${process.env.RENDER_EXTERNAL_HOSTNAME}`]
          : [])
      ],
      objectSrc: ["'none'"],
      upgradeInsecureRequests: [],
    },
  }));
}

module.exports = applySecurityHeaders;
