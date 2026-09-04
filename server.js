// server.js (الكود الكامل والنهائي مع ميزة التحرير الجماعي)

require('dotenv').config({ override: false });

const assertEnv = require('./utils/env-validation');

try {
  assertEnv();
} catch (err) {
  console.error(`Environment validation failed: ${err.message}`);
  process.exit(1);
}

const express = require('express');
const compression = require('compression');
const path = require('path');
const fs = require('fs');
const rateLimit = require('express-rate-limit');
const cookieParser = require('cookie-parser');
const { sanitizeDesignState } = require('./utils/sanitize');
const useragent = require('express-useragent');
const http = require('http');
const cloudinary = require('cloudinary').v2;
const applySecurityHeaders = require('./utils/security-headers');
const applyCors = require('./utils/cors-config');
const { applyFetchMetadataProtection } = require('./utils/fetch-metadata');
const { registerRealtimeCollaboration } = require('./utils/realtime-collaboration');
const { connectDatabase } = require('./utils/database');
const {
  errorBuffer,
  MAX_ERROR_BUFFER,
  trackError,
  registerClientErrorRoute,
  configureErrorPersistence
} = require('./utils/error-tracking');
const {
  registerCacheAndRedirectMiddleware,
  registerNfcStaticFiles
} = require('./utils/static-files');

const app = express();

// --- START: MIDDLEWARE SETUP ---
app.use(compression());
app.use(useragent.express());

// Force HTTPS in production
app.use((req, res, next) => {
  if (process.env.NODE_ENV === 'production' && req.headers['x-forwarded-proto'] !== 'https') {
    return res.redirect(301, 'https://' + req.hostname + req.originalUrl);
  }
  next();
});

const port = process.env.PORT || 3000;
app.set('trust proxy', process.env.TRUST_PROXY === 'true' ? 1 : 0);
app.disable('x-powered-by');

// Cloudinary Configuration
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

applySecurityHeaders(app);
const allowedOrigins = applyCors(app);
applyFetchMetadataProtection(app, allowedOrigins);

app.use(express.json({ limit: '512kb' }));
app.use(cookieParser());
app.set('view engine', 'ejs');

// --- DATABASE CONNECTION ---
const mongoUrl = process.env.MONGO_URI;
const dbName = process.env.MONGO_DB || 'mcnfc';
const designsCollectionName = process.env.MONGO_DESIGNS_COLL || 'designs';
const usersCollectionName = 'users'; // New Users Collection
const savedCardsCollectionName = 'savedCards';
const cardRequestsCollectionName = 'cardRequests';
let db;
let mongoClient;

const databaseReady = connectDatabase({
  mongoUrl,
  dbName,
  collectionNames: {
    designsCollectionName,
    usersCollectionName,
    savedCardsCollectionName,
    cardRequestsCollectionName
  }
})
  .then(connection => {
    db = connection.db;
    mongoClient = connection.client;
    console.log('MongoDB connected');
    console.log('MongoDB indexes created');
    // Wire error persistence once the database is available.
    configureErrorPersistence({ getDb: () => db });
  })
  .catch(err => {
    console.error('Mongo connect error', err);
    throw err;
  });

const rootDir = __dirname;

// --- UTILITY FUNCTIONS ---
function absoluteBaseUrl(req) {
  const envBase = process.env.SITE_BASE_URL;
  if (envBase) return envBase.replace(/\/+$/, '');
  const proto = (req.headers['x-forwarded-proto'] || req.protocol || 'https');
  const host = req.get('host');
  return `${proto}://${host}`;
}

const createViewerRouter = require('./routes/viewer.routes');
app.use(createViewerRouter({ getDb: () => db, designsCollectionName, rootDir, absoluteBaseUrl }));

const createSystemRouter = require('./routes/system.routes');
app.use(createSystemRouter({ getDb: () => db, rootDir }));

registerCacheAndRedirectMiddleware(app);

// --- UPLOADS FOLDER ---
const uploadDir = path.join(__dirname, 'uploads');
if (process.env.NODE_ENV !== 'production') {
  if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });
  app.use('/uploads', express.static(uploadDir, { maxAge: '30d', immutable: true }));
}

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
  message: 'Too many requests from this IP, please try again after 15 minutes'
});
app.use('/api/', apiLimiter);

// Stricter rate limiting for auth endpoints (5 attempts per 15 minutes per IP)
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: process.env.NODE_ENV === 'test' ? 100 : 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'محاولات كثيرة جداً. حاول مرة أخرى بعد 15 دقيقة.' },
  skipSuccessfulRequests: true // Don't count successful logins
});
app.use('/api/auth/login', authLimiter);
app.use('/api/auth/register', authLimiter);
app.use('/api/auth/forgot-password', authLimiter);
app.use('/api/auth/reset-password', authLimiter);
app.use('/api/auth/verify-email', authLimiter);

// Account-aware rate limiting to prevent distributed brute-force attacks against specific accounts
const accountLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: process.env.NODE_ENV === 'test' ? 100 : 8,
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true,
  keyGenerator: (req) => {
    const email = typeof req.body?.email === 'string' ? req.body.email.trim().toLowerCase() : '';
    return email ? `acct_${email}` : (req.ip || 'unknown');
  },
  message: { error: 'محاولات دخول كثيرة جداً لهذا الحساب. حاول مرة أخرى بعد 15 دقيقة.' }
});
app.use('/api/auth/login', accountLimiter);
app.use('/api/auth/forgot-password', accountLimiter);

// --- DESIGNS & UPLOADS ROUTES (MODULAR) ---
const createDesignsRouter = require('./routes/designs.routes');
app.use('/api', createDesignsRouter({ 
  getDb: () => db, 
  designsCollectionName, 
  usersCollectionName, 
  cardRequestsCollectionName,
  savedCardsCollectionName,
  absoluteBaseUrl,
  sanitizeDesignState,
  cloudinary
}));

// --- AUTHENTICATION ROUTES (MODULAR) ---
const createAuthRouter = require('./routes/auth.routes');
app.use('/api/auth', createAuthRouter({ 
  getDb: () => db, 
  usersCollectionName,
  designsCollectionName,
  savedCardsCollectionName,
  cardRequestsCollectionName,
  authLimiter,
  allowedOrigins,
  cloudinary
}));

const createSeoRouter = require('./routes/seo.routes');
app.use(createSeoRouter({
  getDb: () => db,
  designsCollectionName,
  absoluteBaseUrl
}));

registerClientErrorRoute(app);
registerNfcStaticFiles(app, rootDir);

// --- ADMIN ROUTES (must be BEFORE general error handler) ---
const adminLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // Limit each IP to 10 admin attempts per window
  message: { error: 'تم تجاوز الحد المسموح لمحاولات تسجيل الدخول للإدارة، يرجى المحاولة لاحقاً.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// Protect admin.html page itself from automated enumeration.
// This rate limiter fires BEFORE the HTML page is served, limiting recon attempts.
const adminPageLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: process.env.NODE_ENV === 'test' ? 1000 : 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: 'Too many requests. Please try again later.',
  skipSuccessfulRequests: false,
});

app.get(['/nfc/admin', '/nfc/admin.html'], adminPageLimiter, (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('X-Robots-Tag', 'noindex, nofollow');
  res.sendFile(path.join(rootDir, 'admin.html'));
});

const createAdminRouter = require('./routes/admin.routes');
app.use('/api/admin', adminLimiter, createAdminRouter({ 
  getDb: () => db, 
  errorBuffer, 
  MAX_ERROR_BUFFER 
}));

// --- 404 NOT FOUND HANDLER ---
app.use((req, res, _next) => {
  res.status(404).sendFile(path.join(rootDir, '404.html'));
});

// --- GENERAL ERROR HANDLER (must be AFTER all routes) ---
app.use((err, req, res, _next) => {
  trackError(err, {
    route: `${req.method} ${req.originalUrl}`,
    ip: req.ip,
    origin: err.corsOrigin || req.get('Origin'),
    referer: req.get('Referer'),
    allowedOrigins: err.allowedOrigins,
    userAgent: req.get('User-Agent')?.substring(0, 80),
  });
  const statusCode = err.status || 500;
  const message = process.env.NODE_ENV === 'production' ? 'Internal Server Error' : err.message;
  if (!res.headersSent) {
    res.status(statusCode).json({ error: message });
  }
});

// Process-level error handlers (prevent silent crashes)
process.on('unhandledRejection', (reason) => {
  trackError(reason instanceof Error ? reason : new Error(String(reason)), { route: 'unhandledRejection' });
});

process.on('uncaughtException', (error) => {
  trackError(error, { route: 'uncaughtException' });
  // Give time to flush logs, then exit
  console.error('[FATAL] Uncaught exception — server will restart');
  setTimeout(() => process.exit(1), 1000);
});

const server = http.createServer(app);
registerRealtimeCollaboration(server, {
  getDb: () => db,
  designsCollectionName,
  allowedOrigins
});


async function startServer() {
  // Do not accept traffic until MongoDB is connected and indexes have been
  // attempted. A failed startup exits so Render can restart the instance.
  await databaseReady;
  return new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(port, () => {
      server.removeListener('error', reject);
      console.log(`Server running on port: ${port}`);
      console.log('WebSocket server is also running.');
      resolve(server);
    });
  });
}

let shutdownStarted = false;
async function closeDatabase() {
  db = undefined;
  if (mongoClient) {
    await mongoClient.close();
    mongoClient = undefined;
  }
}

function shutdown(signal) {
  if (shutdownStarted) return;
  shutdownStarted = true;
  console.log(`[Shutdown] ${signal} received; draining HTTP connections.`);

  const forceExit = setTimeout(() => {
    console.error('[Shutdown] Grace period expired.');
    process.exit(1);
  }, 25_000);
  forceExit.unref();

  const finish = async (serverError) => {
    try {
      await closeDatabase();
    } catch (dbError) {
      console.error('[Shutdown] MongoDB close failed:', dbError.message);
      serverError = serverError || dbError;
    }
    clearTimeout(forceExit);
    process.exit(serverError ? 1 : 0);
  };

  if (server.listening) {
    server.close(finish);
  } else {
    finish();
  }
}

if (require.main === module) {
  process.once('SIGTERM', () => shutdown('SIGTERM'));
  process.once('SIGINT', () => shutdown('SIGINT'));
  startServer().catch((err) => {
    console.error('[FATAL] Server startup failed:', err.message);
    process.exit(1);
  });
} else {
  // Keep test imports from creating an unhandled rejection while still making
  // the asynchronous database handle available to mocked route tests.
  databaseReady.catch(() => {});
}

module.exports = app;
module.exports.startServer = startServer;
module.exports.databaseReady = databaseReady;
