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

  // Generate a fresh cryptographic nonce for every request.
  // HTML pages and EJS views must inject this nonce into every <script> tag.
  app.use((req, res, next) => {
    res.locals.cspNonce = crypto.randomBytes(16).toString('base64');
    next();
  });

  app.use((req, res, next) => {
    const cspDirectives = {
      defaultSrc: ["'self'"],
      scriptSrc: [
        "'self'",
        // Per-request cryptographic nonce injected by injectCspNonceIntoHtml() for static
        // HTML files and by res.locals.cspNonce for EJS views. This replaces 'unsafe-inline'.
        (req, res) => `'nonce-${res.locals.cspNonce}'`,
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
      fontSrc: ["'self'", "https:", "data:", "https://fonts.gstatic.com", "https://cdnjs.cloudflare.com"],
      imgSrc: [
        "'self'",
        "data:",
        "blob:",
        "https://res.cloudinary.com",
        "https://*.mcprim.com",
        "https://mcprim.com",
        "https://i.imgur.com",
        "https://media.giphy.com",
        "https://pagead2.googlesyndication.com",
        "https://*.onrender.com",
        // Allow arbitrary https: image sources — card designs may embed user-provided URLs.
        // Tighten this once image proxying is in place.
        "https:"
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
        "https://*.onrender.com",
        "wss://*.onrender.com",
        "https://res.cloudinary.com",
        "https://www.google-analytics.com",
        "https://pagead2.googlesyndication.com",
        ...(process.env.RENDER_EXTERNAL_HOSTNAME
          ? [
              `https://${process.env.RENDER_EXTERNAL_HOSTNAME}`,
              `wss://${process.env.RENDER_EXTERNAL_HOSTNAME}`
            ]
          : [])
      ],
      objectSrc: ["'none'"],
      baseUri: ["'self'"],
      formAction: ["'self'"],
      frameAncestors: ["'none'"],
      upgradeInsecureRequests: [],
    };

    helmet.contentSecurityPolicy({ directives: cspDirectives })(req, res, next);
  });
}

module.exports = applySecurityHeaders;
