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
const { DOMPurify, sanitizeInputs } = require('./utils/sanitize');
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
  registerClientErrorRoute
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
const usersCollectionName = 'users';
const backgroundsCollectionName = process.env.MONGO_BACKGROUNDS_COLL || 'backgrounds';
const savedCardsCollectionName = 'savedCards';
const cardRequestsCollectionName = 'cardRequests';
const brandKitsCollectionName = process.env.MONGO_BRAND_KITS_COLL || 'brandKits';
const workspacesCollectionName = process.env.MONGO_WORKSPACES_COLL || 'workspaces';
const designReviewsCollectionName = process.env.MONGO_DESIGN_REVIEWS_COLL || 'designReviews';
const designVersionsCollectionName = process.env.MONGO_DESIGN_VERSIONS_COLL || 'designVersions';
let db;

connectDatabase({
  mongoUrl,
  dbName,
  collectionNames: {
    designsCollectionName,
    usersCollectionName,
    savedCardsCollectionName,
    cardRequestsCollectionName,
    brandKitsCollectionName,
    workspacesCollectionName,
    designReviewsCollectionName,
    designVersionsCollectionName
  }
})
  .then(database => {
    db = database;
    console.log('MongoDB connected');
    console.log('MongoDB indexes created');
  })
  .catch(err => {
    console.error('Mongo connect error', err);
    process.exit(1);
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

// Workspace designs remain private until an authorized reviewer publishes them.
const createWorkspacePublicationGuard = require('./routes/workspace-publication-guard.routes');
app.use(createWorkspacePublicationGuard({
  getDb: () => db,
  designsCollectionName,
  workspacesCollectionName
}));

const createViewerRouter = require('./routes/viewer.routes');
app.use(createViewerRouter({ getDb: () => db, designsCollectionName, rootDir, absoluteBaseUrl, DOMPurify }));

const createSystemRouter = require('./routes/system.routes');
app.use(createSystemRouter({ getDb: () => db, rootDir }));

registerCacheAndRedirectMiddleware(app);

// --- UPLOADS FOLDER ---
const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });
app.use('/uploads', express.static(uploadDir, { maxAge: '30d', immutable: true }));

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
  message: 'Too many requests from this IP, please try again after 15 minutes'
});
app.use('/api/', apiLimiter);

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: process.env.NODE_ENV === 'test' ? 100 : 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'محاولات كثيرة جداً. حاول مرة أخرى بعد 15 دقيقة.' },
  skipSuccessfulRequests: true
});
app.use('/api/auth/login', authLimiter);
app.use('/api/auth/register', authLimiter);
app.use('/api/auth/forgot-password', authLimiter);
app.use('/api/auth/reset-password', authLimiter);
app.use('/api/auth/verify-email', authLimiter);

// Collaborative saves intercept existing workspace designs before the legacy owner/fork route.
const createWorkspaceDesignBridgeRouter = require('./routes/workspace-design-bridge.routes');
app.use('/api', createWorkspaceDesignBridgeRouter({
  getDb: () => db,
  designsCollectionName,
  workspacesCollectionName,
  sanitizeInputs,
  DOMPurify
}));

// --- DESIGNS & UPLOADS ROUTES (MODULAR) ---
const createDesignsRouter = require('./routes/designs.routes');
app.use('/api', createDesignsRouter({
  getDb: () => db,
  designsCollectionName,
  usersCollectionName,
  cardRequestsCollectionName,
  savedCardsCollectionName,
  absoluteBaseUrl,
  sanitizeInputs,
  DOMPurify,
  cloudinary
}));

const createDesignVersionsRouter = require('./routes/design-versions.routes');
app.use('/api', createDesignVersionsRouter({
  getDb: () => db,
  designsCollectionName,
  workspacesCollectionName,
  sanitizeInputs,
  DOMPurify,
  versionsCollectionName: designVersionsCollectionName
}));

const createBrandKitsRouter = require('./routes/brand-kits.routes');
app.use('/api', createBrandKitsRouter({
  getDb: () => db,
  brandKitsCollectionName,
  usersCollectionName,
  designsCollectionName
}));

const createWorkspacesRouter = require('./routes/workspaces.routes');
app.use('/api', createWorkspacesRouter({
  getDb: () => db,
  workspacesCollectionName,
  designReviewsCollectionName,
  usersCollectionName,
  designsCollectionName
}));

// --- AUTHENTICATION ROUTES (MODULAR) ---
const createAuthRouter = require('./routes/auth.routes');
app.use('/api/auth', createAuthRouter({
  getDb: () => db,
  usersCollectionName,
  authLimiter,
  allowedOrigins
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
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { error: 'تم تجاوز الحد المسموح لمحاولات تسجيل الدخول للإدارة، يرجى المحاولة لاحقاً.' },
  standardHeaders: true,
  legacyHeaders: false,
});

const createAdminRouter = require('./routes/admin.routes');
app.use('/api/admin', adminLimiter, createAdminRouter({
  getDb: () => db,
  errorBuffer,
  MAX_ERROR_BUFFER
}));

app.use((req, res) => {
  res.status(404).sendFile(path.join(rootDir, '404.html'));
});

app.use((err, req, res, next) => {
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
  if (!res.headersSent) res.status(statusCode).json({ error: message });
});

process.on('unhandledRejection', (reason) => {
  trackError(reason instanceof Error ? reason : new Error(String(reason)), { route: 'unhandledRejection' });
});

process.on('uncaughtException', (error) => {
  trackError(error, { route: 'uncaughtException' });
  console.error('[FATAL] Uncaught exception — server will restart');
  setTimeout(() => process.exit(1), 1000);
});

const server = http.createServer(app);
registerRealtimeCollaboration(server);

if (require.main === module) {
  server.listen(port, () => {
    console.log(`Server running on port: ${port}`);
    console.log('WebSocket server is also running.');
  });
}

module.exports = app;
