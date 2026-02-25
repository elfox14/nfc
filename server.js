// server.js - مدمج مع تحسينات الأمان و WebSocket
if (process.env.NODE_ENV !== 'production') {
  require('dotenv').config();
}

const { body, query, param, cookie, validationResult } = require('express-validator');

// Validation Middleware
const validateRequest = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  next();
};

const config = require('./config');

const express = require('express');
const compression = require('compression');
const { MongoClient } = require('mongodb');
const path = require('path');
const fs = require('fs');
const rateLimit = require('express-rate-limit');
const { nanoid } = require('nanoid');

const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const cookieParser = require('cookie-parser');
const { createAccessToken, createRefreshToken, hashToken } = require('./utils/tokens');
const EmailService = require('./email-service');
const { JSDOM } = require('jsdom');
const DOMPurifyFactory = require('dompurify');
const multer = require('multer');
const sharp = require('sharp');
const ejs = require('ejs');
const helmet = require('helmet');
const useragent = require('express-useragent');
const http = require('http');
const { WebSocketServer } = require('ws');
const url = require('url');

const mongoSanitize = require('express-mongo-sanitize');
const xss = require('xss-clean');
const hpp = require('hpp');
const cors = require('cors');

// Util for migrating legacy designs to v2 Element-centric model
const { convertOldToV2 } = require('./utils/migrateDesign');

// لو أعددت الملف utils/field-encryption.js استخدمه عند الحاجة
let encrypt, decrypt;
try {
  ({ encrypt, decrypt } = require('./utils/field-encryption'));
} catch (e) {
  // إن لم يكن موجوداً فلا نكسر التطبيق — لكن من الأفضل إضافته في الإنتاج
  encrypt = (v) => v;
  decrypt = (v) => v;
  if (process.env.NODE_ENV !== 'production') {
    console.warn('Field encryption util not found — sensitive-field encryption will be skipped unless utils/field-encryption.js is added.');
  }
}

// استخدم middleware auth الموجود في middleware/auth-middleware.js
const verifyToken = require('./auth-middleware');

// --- Sentry Integration (Ticket 8) ---
const Sentry = require('@sentry/node');
const { nodeProfilingIntegration } = require('@sentry/profiling-node');

if (process.env.SENTRY_DSN) {
  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    integrations: [
      nodeProfilingIntegration(),
    ],
    tracesSampleRate: 1.0,
    profilesSampleRate: 1.0,
  });
}

const window = (new JSDOM('')).window;
const DOMPurify = DOMPurifyFactory(window);

const app = express();

if (process.env.SENTRY_DSN) {
  app.use(Sentry.Handlers.requestHandler());
}

// --------------------------------------------------
// ========== Security & Middleware Setup ===========
// --------------------------------------------------

// إعدادات الثقة بالبروكسي (مهم للـ secure cookies خلف منصات مثل Render)
if (String(config.TRUST_PROXY || '').toLowerCase() === 'true' || config.TRUST_PROXY === '1') {
  app.set('trust proxy', 1);
}

// ضغط الاستجابات
app.use(compression());

// User-Agent
app.use(useragent.express());

// Body parsers مع حدود (لتقليل خطر DoS عبر bodies كبيرة)
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Cookies (مُهم للـ auth middleware الذي يحاول قراءة الكوكي)
app.use(cookieParser());

// Prevent NoSQL injection (express-mongo-sanitize)
app.use(mongoSanitize());

// Prevent XSS (xss-clean) - تنظيف القيم النصية الواردة
app.use(xss());

// Prevent HTTP Parameter Pollution
app.use(hpp());

const crypto = require('crypto');

// --- Health Check Endpoint (Ticket 8) ---
app.get('/health', async (req, res) => {
  try {
    if (db) {
      await db.command({ ping: 1 });
    }
    res.status(200).json({
      status: 'OK',
      uptime: process.uptime(),
      database: db ? 'connected' : 'connecting'
    });
  } catch (error) {
    console.error('Health Check Database Failure:', error);
    res.status(503).json({ status: 'Service Unavailable', error: 'Database ping failed' });
  }
});

// Middleware to generate a unique nonce per request
app.use((req, res, next) => {
  res.locals.nonce = crypto.randomBytes(16).toString('base64');
  next();
});

// Helmet - رؤوس أمان HTTP (نطبق CSP مفصّل يدعم WebSocket كما في كودك)
app.use(helmet({
  crossOriginOpenerPolicy: { policy: "unsafe-none" } // Changed from same-origin-allow-popups to allow cross-origin window.opener for Google Auth popup
}));

// Determine base WS/WSS URL from configuration
const publicBaseUrl = config.PUBLIC_BASE_URL || 'https://mcprim.com';
let wsOrigin = '';
try {
  const parsedUrl = new URL(publicBaseUrl);
  wsOrigin = `ws://${parsedUrl.host} wss://${parsedUrl.host}`;
} catch (e) {
  wsOrigin = "ws: wss:"; // Fallback if URL is invalid
}

// CSP مفصل كما كان لديك سابقاً (يتضمن ws: و wss:)
app.use(helmet.contentSecurityPolicy({
  directives: {
    defaultSrc: ["'self'"],
    scriptSrc: [
      "'self'",
      (req, res) => `'nonce-${res.locals.nonce}'`,
      "https://cdnjs.cloudflare.com",
      "https://cdn.jsdelivr.net",
      "https://www.youtube.com"
    ],
    styleSrc: [
      "'self'",
      (req, res) => `'nonce-${res.locals.nonce}'`,
      "https://cdnjs.cloudflare.com",
      "https://fonts.googleapis.com"
    ],
    fontSrc: ["'self'", "https://fonts.gstatic.com"],
    imgSrc: ["'self'", "data:", "https:", "https://i.imgur.com", "https://www.mcprim.com", "https://media.giphy.com", "https://nfc-vjy6.onrender.com"],
    mediaSrc: ["'self'", "data:"],
    frameSrc: ["'self'", "https://www.youtube.com"],
    connectSrc: [
      "'self'",
      "https://cdnjs.cloudflare.com",
      "https://cdn.jsdelivr.net",
      "https://www.youtube.com",
      "https://www.mcprim.com",
      "https://media.giphy.com",
      "https://nfc-vjy6.onrender.com",
      wsOrigin
    ].join(' ').split(' '), // split/join to handle the wsOrigin fallback cleanly
    objectSrc: ["'none'"],
    upgradeInsecureRequests: [],
  },
}));

// HSTS
app.use(helmet.hsts({ maxAge: 31536000, includeSubDomains: true, preload: true }));

// CORS صارمة: استخدم ALLOWED_ORIGINS من env
const allowedOrigins = (config.ALLOWED_ORIGINS || '')
  .split(',')
  .map(x => x.trim())
  .filter(Boolean);

// وظيفة origin للتحقق
const corsOptions = {
  origin: function (origin, callback) {
    // السماح لأدوات مثل curl/postman التي لا ترسل Origin
    if (!origin) return callback(null, true);
    // إذا لم نعرّف allowedOrigins فنبقي السماح لكل الأصول (للمطور)
    if (allowedOrigins.length === 0) return callback(null, true);
    if (allowedOrigins.indexOf(origin) !== -1) return callback(null, true);
    return callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Cookie']
};
app.use(cors(corsOptions));

// --- Redis Setup (Ticket 10) ---
const redis = require('redis');
let redisClient = null;
if (process.env.REDIS_URL) {
  redisClient = redis.createClient({ url: process.env.REDIS_URL });
  redisClient.on('error', (err) => console.error('Redis Client Error', err));
  redisClient.connect()
    .then(() => console.log('Redis connected successfully'))
    .catch(err => console.error('Redis connection failed:', err));
} else {
  if (process.env.NODE_ENV !== 'production') {
    console.warn('REDIS_URL not set. Caching will gracefully bypass.');
  }
}

const { RedisStore } = require('rate-limit-redis');

// Helper to easily inject Redis store if available
const getRedisStore = (prefix) => {
  if (redisClient) {
    return new RedisStore({
      sendCommand: (...args) => redisClient.sendCommand(args),
      prefix: prefix
    });
  }
  return undefined;
};

// Rate limiting عام لمسارات /api
const apiLimiterOpts = {
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: 'Too many requests from this IP, please try again after 15 minutes'
};
if (redisClient) apiLimiterOpts.store = getRedisStore('rl:api:');
const apiLimiter = rateLimit(apiLimiterOpts);
app.use('/api/', apiLimiter);

// Rate limiting خاص لمصادقة المستخدمين (أكثر صرامة)
const authLimiterOpts = {
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: 'محاولات دخول/تسجيل كثيرة جداً، الرجاء الانتظار قليلاً. / Too many auth attempts, please try again later.'
};
if (redisClient) authLimiterOpts.store = getRedisStore('rl:auth:');
const authLimiter = rateLimit(authLimiterOpts);
app.use('/api/auth/', authLimiter);

// Rate limiting خاص لرفع الملفات تجنباً لاستنزاف مساحة التخزين أو الباندويث
const uploadLimiterOpts = {
  windowMs: 15 * 60 * 1000,
  max: 30,
  message: 'عمليات رفع كثيرة جداً، الرجاء المحاولة لاحقاً. / Too many upload attempts, please try again later.'
};
if (redisClient) uploadLimiterOpts.store = getRedisStore('rl:upload:');
const uploadLimiter = rateLimit(uploadLimiterOpts);
app.use('/api/upload-image', uploadLimiter);

// --- انتهى إعداد الأمن ---


// عرض القوالب
app.set('view engine', 'ejs');

// --- DATABASE CONNECTION ---
const port = config.PORT || 3000;
const mongoUrl = config.MONGO_URI;
const dbName = config.MONGO_DB || 'nfc_db';
const designsCollectionName = config.MONGO_DESIGNS_COLL || 'designs';
const usersCollectionName = 'users';
const backgroundsCollectionName = config.MONGO_BACKGROUNDS_COLL || 'backgrounds';
// New collection for refresh tokens
const refreshTokensCollectionName = 'refresh_tokens';
const savedCardsCollectionName = 'savedCards';
const cardRequestsCollectionName = 'cardRequests';
const templatesCollectionName = config.MONGO_TEMPLATES_COLL || 'templates';

let db;
MongoClient.connect(mongoUrl)
  .then(async client => {
    db = client.db(dbName);
    console.log('MongoDB connected');

    try {
      await db.collection(designsCollectionName).createIndex({ shortId: 1 }, { unique: true });
      // Compound Index for fast retrieval of User Designs (Ticket 7)
      await db.collection(designsCollectionName).createIndex({ ownerId: 1, createdAt: -1 });
      await db.collection(usersCollectionName).createIndex({ email: 1 }, { unique: true });
      await db.collection(usersCollectionName).createIndex({ userId: 1 }, { unique: true });

      // Indexes for refresh tokens
      await db.collection(refreshTokensCollectionName).createIndex({ tokenHash: 1 }, { unique: true });
      await db.collection(refreshTokensCollectionName).createIndex({ userId: 1 });
      await db.collection(refreshTokensCollectionName).createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 });
      await db.collection(savedCardsCollectionName).createIndex({ userId: 1 });
      await db.collection(savedCardsCollectionName).createIndex({ userId: 1, designShortId: 1 }, { unique: true });
      await db.collection(cardRequestsCollectionName).createIndex({ ownerUserId: 1, status: 1 });
      await db.collection(cardRequestsCollectionName).createIndex({ requesterId: 1, designShortId: 1 });
      await db.collection(templatesCollectionName).createIndex({ ownerId: 1 });
      await db.collection(templatesCollectionName).createIndex({ isPublic: 1 });
      console.log('MongoDB indexes created');
    } catch (indexErr) {
      console.warn('Some indexes may already exist:', indexErr.message);
    }
  })
  .catch(err => { console.error('Mongo connect error', err); process.exit(1); });

// --- Utilities & sanitizers (كما كنت تستخدم) ---
function absoluteBaseUrl(req) {
  const envBase = config.SITE_BASE_URL;
  if (envBase) return envBase.replace(/\/+$/, '');
  const proto = (req.headers['x-forwarded-proto'] || req.protocol || 'https');
  const host = req.get('host');
  return `${proto}://${host}`;
}

const FIELDS_TO_SANITIZE = [
  'input-name', 'input-tagline',
  'input-email', 'input-website',
  'input-whatsapp', 'input-facebook', 'input-linkedin'
];

function sanitizeInputs(inputs) {
  if (!inputs) return {};
  const sanitized = { ...inputs };
  FIELDS_TO_SANITIZE.forEach(k => {
    if (sanitized[k]) {
      sanitized[k] = DOMPurify.sanitize(String(sanitized[k]));
    }
  });
  if (sanitized.dynamic && sanitized.dynamic.social) {
    sanitized.dynamic.social = sanitized.dynamic.social.map(link => ({
      ...link,
      value: link && link.value ? DOMPurify.sanitize(String(link.value)) : ''
    }));
  }
  if (sanitized.dynamic && sanitized.dynamic.phones) {
    sanitized.dynamic.phones = sanitized.dynamic.phones.map(phone => ({
      ...phone,
      value: phone && phone.value ? DOMPurify.sanitize(String(phone.value)) : ''
    }));
  }
  return sanitized;
}

// --- Viewer & SEO routes (بقيت كما هي) ---
app.get(['/nfc/viewer', '/nfc/viewer.html'], [
  query('id').optional().isString().trim().escape()
], validateRequest, async (req, res) => {
  try {
    if (!db) {
      res.setHeader('X-Robots-Tag', 'noindex, noarchive');
      return res.status(500).send('DB not connected');
    }

    const id = String(req.query.id);

    if (!id || id === 'undefined') {
      res.setHeader('X-Robots-Tag', 'noindex, noarchive');
      return res.status(400).send('Card ID is missing. Please provide an ?id= parameter.');
    }

    let doc = null;
    let fromCache = false;

    // 1. Try serving from Redis Cache
    if (redisClient && redisClient.isReady) {
      try {
        const cachedDoc = await redisClient.get(`design:${id}`);
        if (cachedDoc) {
          doc = JSON.parse(cachedDoc);
          fromCache = true;
          if (doc.data && doc.data.schemaVersion !== 2) {
            doc.data = convertOldToV2(doc.data);
          }
        }
      } catch (err) {
        console.warn('Redis GET failed:', err.message);
      }
    }

    // 2. Fallback to MongoDB if not cached
    if (!doc) {
      doc = await db.collection(designsCollectionName).findOne({ shortId: id });
    }

    if (!doc || !doc.data) {
      res.setHeader('X-Robots-Tag', 'noindex, noarchive');
      return res.status(404).send('Design not found or data is missing');
    }

    if (doc.data && doc.data.schemaVersion !== 2) {
      doc.data = convertOldToV2(doc.data);
      // Auto-save migrated design
      db.collection(designsCollectionName).updateOne(
        { shortId: id },
        { $set: { data: doc.data } }
      ).catch(err => console.error('Migration save failed:', err));
    }

    // PR-1: Extract legacy data for rendering in legacy viewer.ejs
    const renderDesign = (doc.data.schemaVersion === 2 && doc.data.legacy) ? doc.data.legacy : doc.data;
    const v2Data = (doc.data.schemaVersion === 2) ? doc.data.v2 : null;

    // 3. Populate Redis Cache if fetched directly from Mongo
    if (!fromCache && redisClient && redisClient.isReady) {
      try {
        // Cache for 60 seconds
        await redisClient.setEx(`design:${id}`, 60, JSON.stringify(doc));
      } catch (err) {
        console.warn('Redis SET failed:', err.message);
      }
    }

    db.collection(designsCollectionName).updateOne(
      { shortId: id },
      { $inc: { views: 1 } }
    ).catch(err => console.error(`Failed to increment view count for ${id}:`, err));

    res.setHeader('X-Robots-Tag', 'index, follow');
    // Set HTTP Cache Headers for CDN/Browsers (Ticket 10)
    res.setHeader('Cache-Control', 'public, max-age=60');

    const base = absoluteBaseUrl(req);
    const pageUrl = `${base}/nfc/viewer.html?id=${id}`;

    const inputs = doc.data.inputs || {};
    const name = DOMPurify.sanitize(inputs['input-name'] || 'بطاقة عمل رقمية');
    const tagline = DOMPurify.sanitize(inputs['input-tagline'] || '');

    let contactLinksHtml = '';
    const platforms = {
      whatsapp: { icon: 'fab fa-whatsapp', prefix: 'https://wa.me/' },
      email: { icon: 'fas fa-envelope', prefix: 'mailto:' },
      website: { icon: 'fas fa-globe', prefix: 'https://' },
      facebook: { icon: 'fab fa-facebook-f', prefix: 'https://facebook.com/' },
      linkedin: { icon: 'fab fa-linkedin-in', prefix: 'https://linkedin.com/in/' },
      instagram: { icon: 'fab fa-instagram', prefix: 'https://instagram.com/' },
      x: { icon: 'fab fa-xing', prefix: 'https://x.com/' },
      telegram: { icon: 'fab fa-telegram', prefix: 'https://t.me/' },
      tiktok: { icon: 'fab fa-tiktok', prefix: 'https://tiktok.com/@' },
      snapchat: { icon: 'fab fa-snapchat', prefix: 'https://snapchat.com/add/' },
      youtube: { icon: 'fab fa-youtube', prefix: 'https://youtube.com/' },
      pinterest: { icon: 'fab fa-pinterest', prefix: 'https://pinterest.com/' }
    };

    const linksHTML = [];
    const dynamicData = doc.data.dynamic || {};
    const staticSocial = dynamicData.staticSocial || {};

    Object.entries(staticSocial).forEach(([key, linkData]) => {
      if (linkData && linkData.value && platforms[key]) {
        const platform = platforms[key];
        const value = DOMPurify.sanitize(linkData.value);
        let displayValue = value;
        let fullUrl = value;
        if (key === 'email') { fullUrl = `${platform.prefix}${value}`; }
        else if (key === 'whatsapp') { fullUrl = `${platform.prefix}${value.replace(/\D/g, '')}`; }
        else if (key === 'website') { fullUrl = !/^(https?:\/\/)/i.test(value) ? `${platform.prefix}${value}` : value; displayValue = value.replace(/^(https?:\/\/)?(www\.)?/, ''); }
        else { fullUrl = !/^(https?:\/\/)/i.test(value) ? `${platform.prefix}${value}` : value; displayValue = value.replace(/^(https?:\/\/)?(www\.)?/, ''); }

        linksHTML.push(`
                <div class="contact-link-wrapper" data-copy-value="${encodeURI(fullUrl)}">
                    <a href="${encodeURI(fullUrl)}" class="contact-link" target="_blank" rel="noopener noreferrer">
                        <i class="${platform.icon}"></i>
                        <span>${displayValue}</span>
                    </a>
                    <button class="copy-link-btn" aria-label="نسخ الرابط">
                        <i class="fas fa-copy"></i>
                    </button>
                </div>
            `);
      }
    });

    if (dynamicData.phones) {
      dynamicData.phones.forEach(phone => {
        if (phone && phone.value) {
          const sanitizedValue = DOMPurify.sanitize(phone.value);
          const cleanNumber = sanitizedValue.replace(/\D/g, '');
          const fullUrl = `tel:${cleanNumber}`;
          linksHTML.push(`
                    <div class="contact-link-wrapper" data-copy-value="${cleanNumber}">
                        <a href="${fullUrl}" class="contact-link">
                            <i class="fas fa-phone"></i>
                            <span>${sanitizedValue}</span>
                        </a>
                        <button class="copy-link-btn" aria-label="نسخ الرقم">
                            <i class="fas fa-copy"></i>
                        </button>
                    </div>
                `);
        }
      });
    }

    if (dynamicData.social) {
      dynamicData.social.forEach(link => {
        if (link && link.value && link.platform && platforms[link.platform]) {
          const platform = platforms[link.platform];
          const value = DOMPurify.sanitize(link.value);
          let displayValue = value;
          let fullUrl = value;
          fullUrl = !/^(https?:\/\/)/i.test(value) ? `${platform.prefix}${value}` : value;
          displayValue = value.replace(/^(https?:\/\/)?(www\.)?/, '');
          linksHTML.push(`
                    <div class="contact-link-wrapper" data-copy-value="${encodeURI(fullUrl)}">
                        <a href="${encodeURI(fullUrl)}" class="contact-link" target="_blank" rel="noopener noreferrer">
                            <i class="${platform.icon}"></i>
                            <span>${displayValue}</span>
                        </a>
                        <button class="copy-link-btn" aria-label="نسخ الرابط">
                            <i class="fas fa-copy"></i>
                        </button>
                    </div>
                `);
        }
      });
    }

    if (linksHTML.length > 0) {
      contactLinksHtml = `<div class="links-group">${linksHTML.join('')}</div>`;
    } else {
      contactLinksHtml = `
          <div class="no-links-message">
              <i class="fas fa-info-circle"></i>
              <p>لم يقم صاحب البطاقة بإضافة أي معلومات اتصال إضافية.</p>
          </div>
      `;
    }

    const imageUrls = doc.data.imageUrls || {};
    let ogImage = `${base}/nfc/og-image.png`;
    if (imageUrls.front) {
      ogImage = imageUrls.front.startsWith('http')
        ? imageUrls.front
        : `${base}${imageUrls.front.startsWith('/') ? '' : '/'}${imageUrls.front}`;
    }

    const keywords = [
      'NFC', 'بطاقة عمل ذكية', 'كارت شخصي',
      name,
      ...(tagline ? tagline.split(/\s+/).filter(Boolean) : [])
    ].filter(Boolean).join(', ');

    res.render(path.join(__dirname, 'viewer.ejs'), {
      pageUrl,
      name: name,
      tagline: tagline,
      ogImage,
      keywords,
      design: renderDesign,
      v2: v2Data, // Pass v2 data if needed later
      canonical: pageUrl,
      contactLinksHtml: contactLinksHtml
    });
  } catch (e) {
    console.error('Error in /nfc/viewer route:', e);
    res.setHeader('X-Robots-Tag', 'noindex, noarchive');
    res.status(500).send('View failed due to an internal server error.');
  }
});

app.get('/nfc/view/:id', [
  param('id').optional().isString().trim().escape()
], validateRequest, async (req, res) => {
  try {
    const id = String(req.params.id);
    if (!id) {
      return res.status(404).send('Not found');
    }
    res.redirect(301, `/nfc/viewer.html?id=${id}`);
  } catch (e) {
    console.error('Error in /nfc/view/:id redirect route:', e);
    res.status(500).send('Redirect failed.');
  }
});

// مسار NFC لقراءة الرابط الموقّع القصير
app.get('/r/:token', [
  param('token').isString().notEmpty()
], validateRequest, async (req, res) => {
  try {
    const { token } = req.params;
    const secret = config.JWT_SECRET;

    // التحقق من صحة التوقيع
    jwt.verify(token, secret, (err, decoded) => {
      if (err) {
        console.warn('NFC Token verification failed:', err.message);
        // نعرض صفحة خطأ أو توجيه للرئيسية في حال العبث بالتوقيع أو انتهائه
        return res.status(400).send(`
          <html>
            <body style="font-family:sans-serif; text-align:center; padding: 20px;">
              <h2>عذراً، الرابط غير صالح أو منتهي الصلاحية.</h2>
              <p>قد تكون البطاقة غير مفعلة، أو أن جلسة المشاركة انتهت.</p>
              <a href="/nfc">العودة للرئيسية</a>
            </body>
          </html>
        `);
      }

      // التوقيع صحيح نأخذ ID التصميم ونوجهه للصفحة
      const designId = decoded.designId;
      if (!designId) return res.status(400).send('Invalid token payload.');

      // توجيه مباشر للصفحة الحقيقية
      res.redirect(301, `/nfc/viewer.html?id=${designId}`);
    });
  } catch (error) {
    console.error('Error in /r/:token route:', error);
    res.status(500).send('Server Error');
  }
});

// Caching & redirects & uploads (كما كان عندك)
app.use((req, res, next) => {
  if (req.path.endsWith('.html') || req.path.endsWith('/') || req.path.startsWith('/nfc/view/')) {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
  } else {
    res.setHeader('Cache-Control', 'public, max-age=604800, immutable');
  }
  next();
});
app.use((req, res, next) => {
  if (req.path.endsWith('.html') && !req.path.startsWith('/nfc/viewer.html')) {
    const newPath = req.path.slice(0, -5);
    return res.redirect(301, newPath);
  }
  next();
});
app.get('/', (req, res) => { res.redirect(301, '/nfc/'); });

const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });
app.use('/uploads', express.static(uploadDir, { maxAge: '30d', immutable: true }));

// Multer config
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (file.mimetype && file.mimetype.startsWith('image/')) {
      const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml'];
      if (allowedTypes.includes(file.mimetype)) cb(null, true);
      else cb(new Error('نوع الصورة غير مدعوم.'), false);
    } else {
      cb(new Error('الرجاء رفع ملف صورة.'), false);
    }
  }
});

function handleMulterErrors(err, req, res, next) {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ error: `حجم الملف كبير جدًا. الحد الأقصى ${err.field ? err.field : '10'} ميجابايت.` });
    }
    return res.status(400).json({ error: `خطأ في رفع الملف: ${err.message}` });
  } else if (err) {
    return res.status(400).json({ error: err.message || 'خطأ غير معروف أثناء الرفع.' });
  }
  next();
}

const cloudinary = require('cloudinary').v2;

// --- Logo Upload Endpoint (with Variant Generation) ---
app.post('/api/upload-logo', verifyToken, upload.single('logo'), handleMulterErrors, async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No logo file provided.' });
    }

    const mimeType = req.file.mimetype;
    const isSvg = mimeType === 'image/svg+xml';
    const variants = {};

    // 1. Process variants locally in memory
    if (isSvg) {
      // Decode, Sanitize and Store SVG
      let svgContent = req.file.buffer.toString('utf-8');
      const createDOMPurify = require('isomorphic-dompurify');
      svgContent = createDOMPurify.sanitize(svgContent, {
        USE_PROFILES: { svg: true },
        FORBID_TAGS: ['script', 'style', 'ForeignObject'], // strict svg rules
        FORBID_ATTR: ['on*']
      });

      const processedSvgBuffer = Buffer.from(svgContent, 'utf-8');

      // Rasterize for fallbacks (PNG 1x, 2x, Webp) using sharp from SVG buffer
      const png1xBuffer = await sharp(processedSvgBuffer).png().toBuffer();
      const png2xBuffer = await sharp(processedSvgBuffer).resize({ width: 1000, withoutEnlargement: true }).png().toBuffer();
      const webpBuffer = await sharp(processedSvgBuffer).webp({ quality: 90 }).toBuffer();

      variants.svg = { buffer: processedSvgBuffer, format: 'svg' };
      variants.png_1x = { buffer: png1xBuffer, format: 'png' };
      variants.png_2x = { buffer: png2xBuffer, format: 'png' };
      variants.webp = { buffer: webpBuffer, format: 'webp' };

    } else {
      // Raster image (PNG/JPG/WEBP)
      const image = sharp(req.file.buffer);
      const metadata = await image.metadata();

      const png1xBuffer = await sharp(req.file.buffer)
        .resize({ width: Math.min(metadata.width, 500) })
        .png().toBuffer();

      const png2xBuffer = await sharp(req.file.buffer)
        .resize({ width: Math.min(metadata.width, 1000) })
        .png().toBuffer();

      const webpBuffer = await sharp(req.file.buffer).webp({ quality: 90 }).toBuffer();

      variants.png_1x = { buffer: png1xBuffer, format: 'png' };
      variants.png_2x = { buffer: png2xBuffer, format: 'png' };
      variants.webp = { buffer: webpBuffer, format: 'webp' };
    }

    // 2. Upload Variants to Cloudinary
    const uploadedUrls = {};
    const baseId = `logo_${nanoid(10)}`;

    if (config.CLOUDINARY_CLOUD_NAME && config.CLOUDINARY_API_KEY && config.CLOUDINARY_API_SECRET) {
      const uploadPromises = Object.keys(variants).map(async (key) => {
        const variantData = variants[key];
        return new Promise((resolve, reject) => {
          const uploadStream = cloudinary.uploader.upload_stream(
            {
              folder: 'nfc/logos',
              public_id: `${baseId}_${key}`,
              resource_type: variantData.format === 'svg' ? 'raw' : 'image',
              format: variantData.format
            },
            (error, result) => {
              if (error) {
                console.warn(`[Upload Logo] Cloudinary variant ${key} failed:`, error.message);
                reject(error);
              } else resolve({ key, url: result.secure_url });
            }
          );
          uploadStream.end(variantData.buffer);
        });
      });

      const results = await Promise.allSettled(uploadPromises);
      results.forEach(res => {
        if (res.status === 'fulfilled') {
          uploadedUrls[res.value.key] = res.value.url;
        }
      });

      if (Object.keys(uploadedUrls).length === 0) {
        throw new Error('All Cloudinary variant uploads failed');
      }

    } else {
      // Fallback: Local Storage
      const base = absoluteBaseUrl(req);
      for (const [key, variantData] of Object.entries(variants)) {
        const tempName = `${baseId}_${key}.${variantData.format}`;
        const tempOut = path.join(uploadDir, tempName);
        fs.writeFileSync(tempOut, variantData.buffer);
        uploadedUrls[key] = `${base}/uploads/${tempName}`;
      }
    }

    // 3. Return Variant Map
    return res.json({
      success: true,
      id: baseId,
      variants: {
        full: uploadedUrls
      },
      activeVariant: 'full' // Default active variant group
    });

  } catch (err) {
    console.error('[Upload Logo] Error:', err);
    res.status(500).json({ error: 'Failed to process logo upload.' });
  }
});

// --- Avatar (Personal Photo) Upload Endpoint ---
app.post('/api/upload-avatar', verifyToken, upload.single('avatar'), handleMulterErrors, async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No avatar file provided.' });
    }

    const mimeType = req.file.mimetype;
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(mimeType)) {
      return res.status(400).json({ error: 'Invalid file type. Only JPG, PNG, and WebP are allowed for avatars.' });
    }

    const variants = {};
    const image = sharp(req.file.buffer);
    const metadata = await image.metadata();

    // Strip EXIF and resize
    const baseImage = image.withMetadata(false); // Strip EXIF

    const processVariant = async (size) => {
      // Create webp variants for avatars
      return await baseImage.clone()
        .resize({ width: Math.min(metadata.width, size), withoutEnlargement: true })
        // Could inject focal crop logic here if client passes coordinates, or let client use object-position
        .webp({ quality: 90 })
        .toBuffer();
    };

    variants.thumb = { buffer: await processVariant(48), format: 'webp' };
    variants.small = { buffer: await processVariant(128), format: 'webp' };
    variants.medium = { buffer: await processVariant(256), format: 'webp' };
    variants.large = { buffer: await processVariant(512), format: 'webp' };

    const uploadedUrls = {};
    const baseId = `avatar_${nanoid(10)}`;

    if (config.CLOUDINARY_CLOUD_NAME && config.CLOUDINARY_API_KEY && config.CLOUDINARY_API_SECRET) {
      const uploadPromises = Object.keys(variants).map(async (key) => {
        const variantData = variants[key];
        return new Promise((resolve, reject) => {
          const uploadStream = cloudinary.uploader.upload_stream(
            {
              folder: 'nfc/avatars', // Dedicated folder for avatars
              public_id: `${baseId}_${key}`,
              resource_type: 'image',
              format: variantData.format
            },
            (error, result) => {
              if (error) {
                console.warn(`[Upload Avatar] Cloudinary variant ${key} failed:`, error.message);
                reject(error);
              } else resolve({ key, url: result.secure_url, public_id: result.public_id });
            }
          );
          uploadStream.end(variantData.buffer);
        });
      });

      const results = await Promise.allSettled(uploadPromises);
      results.forEach(res => {
        if (res.status === 'fulfilled') {
          uploadedUrls[res.value.key] = res.value.url;
        }
      });

      if (Object.keys(uploadedUrls).length === 0) {
        throw new Error('All Cloudinary variant uploads failed');
      }

    } else {
      // Fallback: Local Storage
      const base = absoluteBaseUrl(req);
      for (const [key, variantData] of Object.entries(variants)) {
        const tempName = `${baseId}_${key}.${variantData.format}`;
        const tempOut = path.join(uploadDir, tempName);
        fs.writeFileSync(tempOut, variantData.buffer);
        uploadedUrls[key] = `${base}/uploads/${tempName}`;
      }
    }

    return res.json({
      success: true,
      id: baseId,
      variants: { full: uploadedUrls },
      activeVariant: 'full'
    });

  } catch (err) {
    console.error('[Upload Avatar] Error:', err);
    res.status(500).json({ error: 'Failed to process avatar upload.' });
  }
});

// --- Avatar Delete Endpoint ---
app.delete('/api/user/avatar', verifyToken, async (req, res) => {
  try {
    const publicId = req.query.public_id; // Pass specific ID or manage via db
    if (publicId && config.CLOUDINARY_CLOUD_NAME && config.CLOUDINARY_API_KEY && config.CLOUDINARY_API_SECRET) {
      // Deleting specific file from Cloudinary 
      // In a real app, you would verify ownership.
      cloudinary.uploader.destroy(publicId, (error, result) => {
        if (error) console.error("Cloudinary delete error:", error);
      });
    }
    // Return success since it's fire and forget
    res.json({ success: true, message: 'Avatar deleted successfully.' });
  } catch (err) {
    console.error('[Delete Avatar] Error:', err);
    res.status(500).json({ error: 'Failed to delete avatar.' });
  }
});

// Configure Cloudinary if credentials exist
if (config.CLOUDINARY_CLOUD_NAME && config.CLOUDINARY_API_KEY && config.CLOUDINARY_API_SECRET) {
  cloudinary.config({
    cloud_name: config.CLOUDINARY_CLOUD_NAME,
    api_key: config.CLOUDINARY_API_KEY,
    api_secret: config.CLOUDINARY_API_SECRET
  });
}

// Cloudinary Signature Route (Ticket 5)
app.get('/api/upload-signature', verifyToken, (req, res) => {
  try {
    if (!config.CLOUDINARY_API_SECRET && !process.env.CLOUDINARY_API_SECRET) {
      return res.status(500).json({ error: 'Cloudinary is not configured on the server.' });
    }

    const timestamp = Math.round((new Date()).getTime() / 1000);
    const signature = cloudinary.utils.api_sign_request(
      { timestamp, folder: 'nfc/designs' },
      config.CLOUDINARY_API_SECRET || process.env.CLOUDINARY_API_SECRET
    );

    res.json({
      signature,
      timestamp,
      cloudName: config.CLOUDINARY_CLOUD_NAME || process.env.CLOUDINARY_CLOUD_NAME,
      apiKey: config.CLOUDINARY_API_KEY || process.env.CLOUDINARY_API_KEY
    });
  } catch (error) {
    console.error('Signature generation error', error);
    res.status(500).json({ error: 'Failed to generate upload signature.' });
  }
});

// Image upload route (Legacy proxy functionality)
app.post('/api/upload-image', upload.single('image'), handleMulterErrors, async (req, res) => {
  try {
    if (!req.file) {
      if (!res.headersSent) {
        return res.status(400).json({ error: 'لم يتم تقديم أي ملف صورة.' });
      }
      return;
    }

    const processedBuffer = await sharp(req.file.buffer)
      .resize({ width: 2560, height: 2560, fit: 'inside', withoutEnlargement: true })
      .webp({ quality: 85 })
      .toBuffer();

    // 1. Try Cloudinary First
    if (config.CLOUDINARY_CLOUD_NAME && config.CLOUDINARY_API_KEY && config.CLOUDINARY_API_SECRET) {
      try {
        const uploadResult = await new Promise((resolve, reject) => {
          const uploadStream = cloudinary.uploader.upload_stream(
            {
              folder: 'nfc/designs',
              resource_type: 'image',
              format: 'webp' // Force webp extension since our buffer is webp
            },
            (error, result) => {
              if (error) reject(error);
              else resolve(result);
            }
          );
          uploadStream.end(processedBuffer);
        });

        console.log('[Upload] Image saved to Cloudinary:', uploadResult.secure_url);
        return res.json({ success: true, url: uploadResult.secure_url });
      } catch (cloudErr) {
        console.warn('[Upload] Cloudinary upload failed, falling back to external/local:', cloudErr.message);
      }
    }

    // 2. Try External PHP Fallback (existing logic)
    const externalUploadUrl = config.EXTERNAL_UPLOAD_URL;
    const uploadSecret = config.UPLOAD_SECRET;

    if (externalUploadUrl && uploadSecret) {
      try {
        const blob = new Blob([processedBuffer], { type: 'image/webp' });
        const formData = new FormData();
        formData.append('image', blob, nanoid(10) + '.webp');
        formData.append('secret', uploadSecret);

        const uploadResponse = await fetch(externalUploadUrl, {
          method: 'POST',
          body: formData
        });

        const responseText = await uploadResponse.text();
        console.log('[Upload] External response:', uploadResponse.status, responseText);

        if (uploadResponse.ok) {
          const result = JSON.parse(responseText);
          if (result.success && result.url) {
            console.log('[Upload] Image saved to external hosting:', result.url);
            return res.json({ success: true, url: result.url });
          }
        }
        console.warn('[Upload] External upload failed, status:', uploadResponse.status);
      } catch (extErr) {
        console.warn('[Upload] External upload error, falling back to local:', extErr.message);
      }
    }

    // 3. Ultimate Fallback: Local Disk
    const filename = nanoid(10) + '.webp';
    const out = path.join(uploadDir, filename);
    fs.writeFileSync(out, processedBuffer);

    const base = absoluteBaseUrl(req);
    console.log('[Upload] Image saved locally (fallback):', filename);
    return res.json({ success: true, url: `${base}/uploads/${filename}` });

  } catch (e) {
    console.error('Image upload processing error:', e);
    if (!res.headersSent) {
      res.status(500).json({ error: 'حدث خطأ غير متوقع أثناء معالجة الصورة.' });
    }
  }
});

// --- Templates API ---
app.post('/api/templates', [
  body('name').isString().isLength({ min: 1, max: 100 }),
  body('state').isObject(),
  body('isPublic').optional().isBoolean()
], validateRequest, async (req, res) => {
  try {
    if (!db) return res.status(500).json({ error: 'DB not connected' });

    // Check for authenticated user
    let ownerId = null;
    const authHeader = req.headers['authorization'];
    if (authHeader) {
      try {
        const token = authHeader.split(' ')[1];
        const secret = config.JWT_SECRET;
        const decoded = jwt.verify(token, secret);
        ownerId = decoded.userId;
      } catch (err) { }
    }

    if (!ownerId) {
      return res.status(401).json({ error: 'يجب تسجيل الدخول لحفظ القوالب' }); // Must be logged in
    }

    const newTemplate = {
      name: DOMPurify.sanitize(req.body.name),
      state: convertOldToV2(req.body.state),
      isPublic: req.body.isPublic || false,
      ownerId: ownerId,
      createdAt: new Date()
    };

    const templatesCollection = config.MONGO_TEMPLATES_COLL || 'templates';
    const result = await db.collection(templatesCollection).insertOne(newTemplate);
    res.json({ success: true, message: 'تم حفظ القالب بنجاح', templateId: result.insertedId });
  } catch (error) {
    console.error('Save template error:', error);
    res.status(500).json({ error: 'حدث خطأ أثناء حفظ القالب' });
  }
});

app.get('/api/templates', async (req, res) => {
  try {
    if (!db) return res.status(500).json({ error: 'DB not connected' });

    // Check for authenticated user
    let ownerId = null;
    const authHeader = req.headers['authorization'];
    if (authHeader) {
      try {
        const token = authHeader.split(' ')[1];
        const secret = config.JWT_SECRET;
        const decoded = jwt.verify(token, secret);
        ownerId = decoded.userId;
      } catch (err) { }
    }

    // Build query: public templates OR templates owned by this user
    const query = { $or: [{ isPublic: true }] };
    if (ownerId) {
      query.$or.push({ ownerId: ownerId });
    }

    const templatesCollection = config.MONGO_TEMPLATES_COLL || 'templates';
    const templates = await db.collection(templatesCollection)
      .find(query)
      .sort({ createdAt: -1 })
      .limit(50)
      .toArray();

    // PR-1: Backward compatibility for templates
    const processedTemplates = templates.map(t => {
      if (t.state && t.state.schemaVersion === 2 && t.state.legacy) {
        return { ...t, state: { ...t.state.legacy, schemaVersion: 2, isV2: true } };
      }
      return t;
    });

    res.json({ templates: processedTemplates });
  } catch (error) {
    console.error('Get templates error:', error);
    res.status(500).json({ error: 'حدث خطأ أثناء جلب القوالب' });
  }
});

// --- Partial Element Update Route ---
app.patch('/api/design/:id/element/:elementId', [
  param('id').isString().trim(),
  param('elementId').isString().trim(),
  body().isObject()
], validateRequest, async (req, res) => {
  try {
    if (!db) return res.status(500).json({ error: 'DB not connected' });

    let ownerId = null;
    const authHeader = req.headers['authorization'];
    if (authHeader) {
      try {
        const token = authHeader.split(' ')[1];
        const secret = config.JWT_SECRET;
        const decoded = jwt.verify(token, secret);
        ownerId = decoded.userId;
      } catch (err) { }
    }

    if (!ownerId) {
      return res.status(401).json({ error: 'يجب تسجيل الدخول لتعديل التصميم / You must be logged in' });
    }

    const designId = req.params.id;
    const elementId = req.params.elementId;
    const changes = req.body;

    delete changes._id;
    delete changes.id;
    delete changes.type;

    // The client sends { properties: { color: 'red' }, position: { x: 10, y: 10 }, text: 'Hello' }
    // We need to map this to the V1 schema that script-card.js uses since the full V2 migration on the server side is not complete.
    const updateKeys = {};

    // 1. Text changes usually go to data.inputs[`input-${elementId.replace('card-', '')}`] except it uses `input-name_ar` etc.
    // It's safer to just let the global save handle text changes, but if we want to handle it:
    // This partial PATCH is primarily for rapid visual changes (position, color, font size).

    // 2. Position changes
    if (changes.position) {
      if (changes.position.x !== undefined) updateKeys[`data.positions.${elementId}.x`] = changes.position.x;
      if (changes.position.y !== undefined) updateKeys[`data.positions.${elementId}.y`] = changes.position.y;
    }

    // 3. Properties changes (colors, fonts, etc) usually map to `data.inputs` in V1 schema
    if (changes.properties) {
      for (const [key, value] of Object.entries(changes.properties)) {
        // Map frontend DOM style property keys to input IDs used in V1 schema
        // e.g. color of name -> 'name-color'
        let targetInputId = null;

        if (elementId === 'card-name') {
          if (key === 'color') targetInputId = 'name-color';
          if (key === 'fontSize') targetInputId = 'name-font-size';
          if (key === 'fontFamily') targetInputId = 'name-font';
        } else if (elementId === 'card-tagline') {
          if (key === 'color') targetInputId = 'tagline-color';
          if (key === 'fontSize') targetInputId = 'tagline-font-size';
          if (key === 'fontFamily') targetInputId = 'tagline-font';
        } else if (elementId === 'card-logo-img') {
          if (key === 'width') targetInputId = 'logo-width';
          if (key === 'height') targetInputId = 'logo-height';
          if (key === 'objectFit') targetInputId = 'logo-object-fit';
        } else if (elementId === 'card-personal-photo-wrapper') {
          if (key === 'width') targetInputId = 'photo-size';
          if (key === 'opacity') targetInputId = 'photo-opacity';
        }

        if (targetInputId) {
          updateKeys[`data.inputs.${targetInputId}`] = value;
        }
      }
    }

    if (Object.keys(updateKeys).length === 0) {
      return res.status(400).json({ error: 'No valid properties to update mapped for V1 schema' });
    }

    const updateResult = await db.collection(config.MONGO_DESIGNS_COLL || 'designs').updateOne(
      { shortId: designId, ownerId: ownerId },
      { $set: updateKeys }
    );

    if (updateResult.matchedCount === 0) {
      return res.status(404).json({ error: 'Design not found or unauthorized' });
    }

    res.json({ success: true, message: 'Element properties updated successfully' });
  } catch (error) {
    console.error('Patch element error:', error);
    res.status(500).json({ error: 'حدث خطأ أثناء تحديث العنصر / Error updating element' });
  }
});

// --- Partial Background Update Route ---
app.patch('/api/design/:id/background', [
  param('id').isString().trim(),
  body('front').optional().isObject(),
  body('back').optional().isObject()
], validateRequest, async (req, res) => {
  try {
    if (!db) return res.status(500).json({ error: 'DB not connected' });

    let ownerId = null;
    const authHeader = req.headers['authorization'];
    if (authHeader) {
      try {
        const token = authHeader.split(' ')[1];
        const secret = config.JWT_SECRET;
        const decoded = jwt.verify(token, secret);
        ownerId = decoded.userId;
      } catch (err) { }
    }

    if (!ownerId) {
      return res.status(401).json({ error: 'يجب تسجيل الدخول / You must be logged in' });
    }

    const designId = req.params.id;
    const { front, back } = req.body;

    const updatePayload = {};
    if (front) updatePayload['data.background.front'] = front;
    if (back) updatePayload['data.background.back'] = back;

    if (Object.keys(updatePayload).length === 0) {
      return res.status(400).json({ error: 'No background properties provided' });
    }

    const updateResult = await db.collection(config.MONGO_DESIGNS_COLL || 'designs').updateOne(
      { shortId: designId, ownerId: ownerId },
      { $set: updatePayload }
    );

    if (updateResult.matchedCount === 0) {
      return res.status(404).json({ error: 'التصميم غير موجود أو لا تملك صلاحية تعديله / Design not found or no permission' });
    }

    res.json({ success: true, message: 'تم تحديث الخلفية بنجاح / Background updated successfully' });
  } catch (error) {
    console.error('Patch background error:', error);
    res.status(500).json({ error: 'Error updating background' });
  }
});

// --- Save design route (مع تنظيف المدخلات والحماية) ---
app.post('/api/save-design', [
  // Object Type Validations
  body('inputs').optional().isObject(),
  body('dynamic').optional().isObject(),
  body('imageUrls').optional().isObject(),

  // Specific inputs limits
  body('inputs.input-name').optional().isString().isLength({ max: 100 }),
  body('inputs.input-tagline').optional().isString().isLength({ max: 200 }),

  // Dynamic Arrays Bounds
  body('dynamic.phones').optional().isArray({ max: 10 }),
  body('dynamic.phones.*.value').optional().isString().isLength({ max: 50 }),

  body('dynamic.social').optional().isArray({ max: 20 }),
  body('dynamic.social.*.platform').optional().isString().isLength({ max: 50 }),
  body('dynamic.social.*.value').optional().isString().isLength({ max: 300 }),

  // Static Social Object Bounds
  body('dynamic.staticSocial').optional().isObject(),
  body('dynamic.staticSocial.*.value').optional().isString().isLength({ max: 300 }),

  // ID Param
  query('id').optional().isString().trim().escape()
], validateRequest, async (req, res) => {
  try {
    if (!db) return res.status(500).json({ error: 'DB not connected' });
    let data = req.body || {};
    if (data.inputs) data.inputs = sanitizeInputs(data.inputs);
    if (data.dynamic) {
      if (data.dynamic.phones) {
        data.dynamic.phones = data.dynamic.phones.map(phone => ({ ...phone, value: phone && phone.value ? DOMPurify.sanitize(String(phone.value)) : '' }));
      }
      if (data.dynamic.social) {
        data.dynamic.social = data.dynamic.social.map(link => ({ ...link, value: link && link.value ? DOMPurify.sanitize(String(link.value)) : '' }));
      }
      if (data.dynamic.staticSocial) {
        for (const key in data.dynamic.staticSocial) {
          if (data.dynamic.staticSocial[key] && data.dynamic.staticSocial[key].value) {
            data.dynamic.staticSocial[key].value = DOMPurify.sanitize(String(data.dynamic.staticSocial[key].value));
          }
        }
      }
    }
    const existingId = req.query.id;
    let shortId = existingId || nanoid(8);
    let isUpdate = false;

    // Check for authenticated user to assign ownership
    let ownerId = null;
    const authHeader = req.headers['authorization'];
    if (authHeader) {
      try {
        const token = authHeader.split(' ')[1];
        const secret = config.JWT_SECRET;
        if (!secret) throw new Error('JWT_SECRET is not configured.');
        const decoded = jwt.verify(token, secret);
        ownerId = decoded.userId;
      } catch (err) {
        console.warn('Invalid token during save, saving as anonymous');
      }
    }

    if (existingId) {
      const existingDesign = await db.collection(designsCollectionName).findOne({ shortId: existingId });
      if (existingDesign) {
        if (existingDesign.ownerId && existingDesign.ownerId !== ownerId) {
          shortId = nanoid(8);
          isUpdate = false;
        } else {
          isUpdate = true;
        }
      } else {
        shortId = nanoid(8);
        isUpdate = false;
      }
    }

    if (isUpdate) {
      const existingDoc = await db.collection(designsCollectionName).findOne({ shortId: shortId });
      if (existingDoc?.data?.imageUrls) {
        if (!data.imageUrls) data.imageUrls = {};
        const existing = existingDoc.data.imageUrls;
        if (!data.imageUrls.capturedFront && existing.capturedFront) {
          data.imageUrls.capturedFront = existing.capturedFront;
          data.imageUrls.front = existing.capturedFront;
        }
        if (!data.imageUrls.capturedBack && existing.capturedBack) {
          data.imageUrls.capturedBack = existing.capturedBack;
          data.imageUrls.back = existing.capturedBack;
        }
      }
    }

    // PR-1: Convert to V2 structure on save if not already
    const finalData = (data.schemaVersion === 2) ? data : convertOldToV2(data);

    const updateDoc = {
      data: finalData,
      lastModified: new Date()
    };
    if (ownerId && !isUpdate) updateDoc.ownerId = ownerId;
    if (ownerId && isUpdate) updateDoc.ownerId = ownerId;

    if (isUpdate) {
      await db.collection(designsCollectionName).updateOne(
        { shortId: shortId },
        { $set: updateDoc }
      );
    } else {
      if (ownerId) {
        const designCount = await db.collection(designsCollectionName).countDocuments({ ownerId });
        if (designCount >= 10) {
          return res.status(403).json({ error: 'لقد وصلت للحد الأقصى (10 تصاميم). احذف تصميماً قديماً أولاً. / You have reached the maximum limit of 10 designs. Please delete an old design first.' });
        }
      }
      await db.collection(designsCollectionName).insertOne({
        shortId,
        ...updateDoc,
        createdAt: new Date(),
        views: 0
      });
    }
    res.json({ success: true, id: shortId });
  } catch (e) {
    console.error('Save design error:', e);
    if (!res.headersSent) {
      res.status(500).json({ error: 'Save failed' });
    }
  }
});

// --- Get Design Data (Ticket 10 - Redis Cached Route) ---
app.get('/api/get-design/:id', [
  param('id').isString().notEmpty().trim().escape()
], validateRequest, async (req, res) => {
  try {
    if (!db) return res.status(500).json({ error: 'DB not connected' });
    const { id } = req.params;

    // 1. Try reading from Redis Native Cache (300s TTL)
    if (redisClient && redisClient.isReady) {
      try {
        const cachedPayload = await redisClient.get(`api:design_v2:${id}`);
        if (cachedPayload) {
          res.setHeader('X-Cache', 'HIT');
          let parsed = JSON.parse(cachedPayload);
          if (parsed && parsed.schemaVersion !== 2) {
            parsed = convertOldToV2(parsed);
          }
          return res.json(parsed);
        }
      } catch (redisErr) {
        console.warn('Redis Cache Read Failed:', redisErr.message);
      }
    }

    // 2. Fallback to MongoDB Query
    const doc = await db.collection(designsCollectionName).findOne({ shortId: id });
    if (!doc) return res.status(404).json({ error: 'Design not found' });

    let payload = doc.data;
    if (payload && payload.schemaVersion !== 2) {
      payload = convertOldToV2(payload);
      // Auto-save migrated design
      await db.collection(designsCollectionName).updateOne(
        { shortId: id },
        { $set: { data: payload } }
      );
    }

    // PR-1: For the editor (V1), return the legacy portion as if it was the full state
    const responsePayload = (payload.schemaVersion === 2 && payload.legacy) ? payload.legacy : payload;
    if (payload.schemaVersion === 2) {
      // Add a flag so the frontend knows it's a V2 design
      responsePayload.isV2 = true;
      responsePayload.schemaVersion = 2;
    }

    // 3. Populate Redis Cache asynchronously (300 seconds TTL)
    res.setHeader('X-Cache', 'MISS');
    if (redisClient && redisClient.isReady) {
      try {
        await redisClient.setEx(`api:design_v2:${id}`, 300, JSON.stringify(payload));
      } catch (redisSetErr) {
        console.warn('Redis Cache Write Failed:', redisSetErr.message);
      }
    }

    return res.json(responsePayload);
  } catch (err) {
    console.error('Fetch design error:', err);
    res.status(500).json({ error: 'Failed to retrieve design data' });
  }
});

// -------------------------
// === TEMPLATES API ===
// -------------------------

app.post('/api/templates', verifyToken, [
  body('name').isString().trim().notEmpty().withMessage('Name is required').escape(),
  body('state').isObject().withMessage('State is required'),
  body('thumbnailUrl').optional().isString().trim(),
  body('isPublic').optional().isBoolean()
], validateRequest, async (req, res) => {
  try {
    if (!db) return res.status(500).json({ error: 'DB not connected' });

    const userId = req.user.userId;
    const { name, state, thumbnailUrl, isPublic } = req.body;

    const templateId = nanoid(10);
    const template = {
      templateId,
      ownerId: userId,
      name,
      state: convertOldToV2(state),
      thumbnailUrl: thumbnailUrl || '',
      isPublic: !!isPublic,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    await db.collection(templatesCollectionName).insertOne(template);
    res.status(201).json({ success: true, template });
  } catch (error) {
    console.error('Save template error:', error);
    res.status(500).json({ error: 'Failed to save template.' });
  }
});

app.get('/api/templates', verifyToken, async (req, res) => {
  try {
    if (!db) return res.status(500).json({ error: 'DB not connected' });

    const userId = req.user.userId;
    const filter = {
      $or: [
        { ownerId: userId },
        { isPublic: true }
      ]
    };

    const templates = await db.collection(templatesCollectionName)
      .find(filter)
      .sort({ createdAt: -1 })
      .limit(50)
      .toArray();

    // PR-1: Backward compatibility for templates
    const processedTemplates = templates.map(t => {
      if (t.state && t.state.schemaVersion === 2 && t.state.legacy) {
        return { ...t, state: { ...t.state.legacy, schemaVersion: 2, isV2: true } };
      }
      return t;
    });

    res.json({ success: true, templates: processedTemplates });
  } catch (error) {
    console.error('Fetch templates error:', error);
    res.status(500).json({ error: 'Failed to fetch templates.' });
  }
});

app.delete('/api/templates/:id', verifyToken, [
  param('id').isString().trim().escape()
], validateRequest, async (req, res) => {
  try {
    if (!db) return res.status(500).json({ error: 'DB not connected' });

    const templateId = req.params.id;
    const userId = req.user.userId;

    const result = await db.collection(templatesCollectionName).deleteOne({
      templateId,
      ownerId: userId
    });

    if (result.deletedCount === 0) {
      return res.status(404).json({ error: 'Template not found or unauthorized' });
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Delete template error:', error);
    res.status(500).json({ error: 'Failed to delete template.' });
  }
});

// -------------------------
// === AUTH ROUTES (كما لديك) ===
// -------------------------

// Register
app.post('/api/auth/register', [
  body('email').isEmail().withMessage('Enter a valid email address').normalizeEmail(),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters long'),
  body('name').trim().notEmpty().withMessage('Name is required').escape(),
  body('phone').optional().isString().trim().escape()
], validateRequest, async (req, res) => {
  try {
    if (!db) return res.status(500).json({ error: 'DB not connected' });

    const { email, password, name, phone } = req.body;

    // Check if user exists
    const existingUser = await db.collection(usersCollectionName).findOne({ email });
    if (existingUser) return res.status(400).json({ error: 'User already exists' });

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Encrypt sensitive phone if present
    let phoneEncrypted = undefined;
    if (phone) {
      try { phoneEncrypted = encrypt(phone); } catch (e) { console.warn('Phone encryption failed:', e.message); }
    }

    // Create user
    const userId = nanoid(10);
    await db.collection(usersCollectionName).insertOne({
      userId,
      email,
      password: hashedPassword,
      name,
      phoneEncrypted,
      isVerified: false,
      createdAt: new Date()
    });

    // Generate verification token
    const secret = config.JWT_SECRET;
    if (!secret) return res.status(500).json({ error: 'Server configuration error' });
    const verificationToken = jwt.sign({ userId, email, type: 'email-verify' }, secret, { expiresIn: '24h' });

    // Store verification token
    await db.collection(usersCollectionName).updateOne(
      { userId },
      { $set: { verificationToken } }
    );

    // Send verification email (non-blocking)
    const baseUrl = config.PUBLIC_BASE_URL || 'https://mcprim.com/nfc';
    const verifyUrl = `${baseUrl}/verify-email.html?token=${verificationToken}`;
    try {
      const emailTemplate = EmailService.verificationEmail(name, verifyUrl);
      await EmailService.send({ to: email, ...emailTemplate });
    } catch (emailErr) {
      console.warn('[Register] Email sending failed (non-blocking):', emailErr.message);
    }

    // Generate login tokens
    const accessToken = createAccessToken({ userId, email });
    const refreshToken = createRefreshToken();
    const hashedRefreshToken = hashToken(refreshToken);

    const expiresAt = new Date(Date.now() + 7 * 24 * 3600 * 1000); // 7 days

    // Store refresh token in new collection
    await db.collection(refreshTokensCollectionName).insertOne({
      userId,
      tokenHash: hashedRefreshToken,
      createdAt: new Date(),
      expiresAt,
      userAgent: req.useragent.source
    });

    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: config.NODE_ENV === 'production',
      sameSite: config.NODE_ENV === 'production' ? 'None' : 'Lax',
      path: '/api/auth', // Scoped strictly to auth routes
      maxAge: 7 * 24 * 3600 * 1000 // 7 days
    });

    res.status(201).json({ success: true, token: accessToken, user: { name, email, userId, isVerified: false } });

  } catch (err) {
    if (err.code === 11000) {
      console.warn('Register duplicate error:', err);
      return res.status(400).json({ error: 'User already exists' });
    }
    console.error('Register error:', err);
    res.status(500).json({ error: 'Registration failed' });
  }
});

// Login
app.post('/api/auth/login', [
  body('email').isEmail().withMessage('Enter a valid email address').normalizeEmail(),
  body('password').exists().withMessage('Password is required')
], validateRequest, async (req, res) => {
  try {
    if (!db) return res.status(500).json({ error: 'DB not connected' });

    const { email, password } = req.body;
    const user = await db.collection(usersCollectionName).findOne({ email });
    if (!user) return res.status(400).json({ error: 'Invalid credentials' });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(400).json({ error: 'Invalid credentials' });

    // Generate login tokens
    const accessToken = createAccessToken({ userId: user.userId, email: user.email });
    const refreshToken = createRefreshToken();
    const hashedRefreshToken = hashToken(refreshToken);

    const expiresAt = new Date(Date.now() + 7 * 24 * 3600 * 1000); // 7 days

    // Store refresh token in new collection
    await db.collection(refreshTokensCollectionName).insertOne({
      userId: user.userId,
      tokenHash: hashedRefreshToken,
      createdAt: new Date(),
      expiresAt,
      userAgent: req.useragent.source
    });

    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: config.NODE_ENV === 'production',
      sameSite: config.NODE_ENV === 'production' ? 'None' : 'Lax',
      path: '/api/auth', // Scoped strictly to auth routes
      maxAge: 7 * 24 * 3600 * 1000 // 7 days
    });

    res.json({ success: true, token: accessToken, user: { name: user.name, email: user.email, userId: user.userId } });

  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Login failed' });
  }
});

// Refresh Token
app.post('/api/auth/refresh', [
  cookie('refreshToken').optional().isString().withMessage('Invalid token format')
], validateRequest, async (req, res) => {
  try {
    const { refreshToken } = req.cookies;
    if (!refreshToken) return res.status(401).json({ error: 'No refresh token provided' });

    const hashedToken = hashToken(refreshToken);

    // Find the token record in the new collection
    const tokenRecord = await db.collection(refreshTokensCollectionName).findOne({
      tokenHash: hashedToken,
      expiresAt: { $gt: new Date() }
    });

    if (!tokenRecord) {
      // REUSE DETECTION LOGIC:
      // The token was presented (so it was cryptographically signed and stored by the client)
      // but it is not in our active token database. This implies it was already rotated (used) 
      // by someone else, or the user logged out.
      // If the token is cryptographically valid (checked via structure, though here it's an opaque hex),
      // its absence from the DB when presented means it was revoked or used.
      // We will identify the user (if possible from the token, but with opaque hex tokens we can't easily 
      // know the userId unless we encoded it or stored a mapping of used tokens).
      // Since our refresh token `crypto.randomBytes` is completely opaque and not a JWT, 
      // we cannot extract `userId` from a token NOT in the database.
      // However, we effectively block access.
      res.clearCookie('refreshToken', { path: '/api/auth' });
      return res.status(403).json({ error: 'Refresh token invalid, expired, or previously used' });
    }

    const user = await db.collection(usersCollectionName).findOne({ userId: tokenRecord.userId });
    if (!user) {
      return res.status(403).json({ error: 'User not found' });
    }

    // ROTATION LOGIC:
    // Remove the old token from DB
    await db.collection(refreshTokensCollectionName).deleteOne({ _id: tokenRecord._id });

    // Issue a new access token
    const accessToken = createAccessToken({ userId: user.userId, email: user.email });

    // Issue a new refresh token
    const newRefreshToken = createRefreshToken();
    const newHashedToken = hashToken(newRefreshToken);
    const expiresAt = new Date(Date.now() + 7 * 24 * 3600 * 1000); // 7 days

    // Store the new refresh token
    await db.collection(refreshTokensCollectionName).insertOne({
      userId: user.userId,
      tokenHash: newHashedToken,
      createdAt: new Date(),
      expiresAt,
      userAgent: req.useragent.source
    });

    // Set the new strictly scoped cookie
    res.cookie('refreshToken', newRefreshToken, {
      httpOnly: true,
      secure: config.NODE_ENV === 'production',
      sameSite: config.NODE_ENV === 'production' ? 'None' : 'Lax',
      path: '/api/auth',
      maxAge: 7 * 24 * 3600 * 1000
    });

    res.json({ success: true, token: accessToken });

  } catch (err) {
    console.error('Refresh token error:', err);
    res.status(500).json({ error: 'Failed to refresh token' });
  }
});

// Logout
app.post('/api/auth/logout', [
  cookie('refreshToken').optional().isString().withMessage('Invalid token format')
], validateRequest, async (req, res) => {
  try {
    const { refreshToken } = req.cookies;
    if (refreshToken) {
      const hashedToken = hashToken(refreshToken);
      // Remove token from new collection
      await db.collection(refreshTokensCollectionName).deleteOne({ tokenHash: hashedToken });
    }

    // Always clear the cookie regardless with strict path
    res.clearCookie('refreshToken', {
      httpOnly: true,
      secure: config.NODE_ENV === 'production',
      sameSite: config.NODE_ENV === 'production' ? 'None' : 'Lax',
      path: '/api/auth'
    });

    res.json({ success: true });
  } catch (err) {
    console.error('Logout error:', err);
    res.status(500).json({ error: 'Logout failed' });
  }
});

// ---------- Google OAuth2 (popup flow) ----------
app.get('/api/auth/google', (req, res) => {
  try {
    const clientId = config.GOOGLE_CLIENT_ID || process.env.GOOGLE_CLIENT_ID;
    if (!clientId) {
      console.error('[Google OAuth] GOOGLE_CLIENT_ID not configured');
      return res.status(500).send('Google OAuth is not configured on the server.');
    }

    const redirectUri = `${publicBaseUrl}/api/auth/google/callback`;
    const state = nanoid(16);

    // Save state in HttpOnly cookie to validate on callback
    res.cookie('oauth_state', state, {
      httpOnly: true,
      secure: config.NODE_ENV === 'production',
      sameSite: config.NODE_ENV === 'production' ? 'None' : 'Lax', // Lax allows top-level navigation from popup to send cookie, None allows cross-site
      maxAge: 5 * 60 * 1000
    });

    const scope = encodeURIComponent('openid email profile');
    const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?response_type=code&client_id=${encodeURIComponent(clientId)}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${scope}&state=${state}&prompt=select_account`;

    // Prevent browsers from caching the old 302 redirects lacking the 'state' parameters
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');

    return res.redirect(authUrl);
  } catch (err) {
    console.error('[Google OAuth] initiation error:', err);
    return res.status(500).send('OAuth initiation failed: ' + String(err));
  }
});

app.get('/api/auth/google/callback', async (req, res) => {
  try {
    console.log('[Google OAuth] callback hit, query:', req.query);
    const { code, state } = req.query;
    const savedState = req.cookies && req.cookies.oauth_state;

    if (!code || !state || !savedState || state !== savedState) {
      const errMsg = 'Invalid OAuth state or missing authorization code.';
      console.warn('[Google OAuth] state validation failed', { codeExists: !!code, stateMatch: state === savedState });
      return res.send(`<html><body><script nonce="${res.locals.nonce}">window.opener.postMessage({ type: 'google-auth', success: false, error: ${JSON.stringify(errMsg)} }, '*'); window.close();</script></body></html>`);
    }

    // Exchange code for tokens
    const tokenResp = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: config.GOOGLE_CLIENT_ID || process.env.GOOGLE_CLIENT_ID,
        client_secret: config.GOOGLE_CLIENT_SECRET || process.env.GOOGLE_CLIENT_SECRET,
        redirect_uri: `${publicBaseUrl}/api/auth/google/callback`,
        grant_type: 'authorization_code'
      })
    });
    const tokenJson = await tokenResp.json();
    console.log('[Google OAuth] token exchange response:', tokenJson);

    if (!tokenJson || tokenJson.error) {
      const errMsg = tokenJson?.error_description || tokenJson?.error || 'Token exchange failed';
      console.error('[Google OAuth] token exchange failed', tokenJson);
      return res.send(`<html><body><script nonce="${res.locals.nonce}">window.opener.postMessage({ type: 'google-auth', success: false, error: ${JSON.stringify(errMsg)} }, '*'); window.close();</script></body></html>`);
    }

    const idToken = tokenJson.id_token;
    if (!idToken) {
      const errMsg = 'Missing id_token from Google.';
      console.error('[Google OAuth] no id_token in token response');
      return res.send(`<html><body><script nonce="${res.locals.nonce}">window.opener.postMessage({ type: 'google-auth', success: false, error: ${JSON.stringify(errMsg)} }, '*'); window.close();</script></body></html>`);
    }

    // Validate id_token
    const infoResp = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(idToken)}`);
    const userInfo = await infoResp.json();
    console.log('[Google OAuth] id_token info:', userInfo);

    const expectedClientId = config.GOOGLE_CLIENT_ID || process.env.GOOGLE_CLIENT_ID;
    if (!userInfo || userInfo.error_description || userInfo.aud !== expectedClientId) {
      console.error('[Google OAuth] Invalid id_token info', userInfo);
      return res.send(`<html><body><script nonce="${res.locals.nonce}">window.opener.postMessage({ type: 'google-auth', success: false, error: 'Invalid id_token' }, '*'); window.close();</script></body></html>`);
    }

    // userInfo contains email, email_verified, name, picture, sub
    const email = String(userInfo.email).toLowerCase();
    let user = await db.collection(usersCollectionName).findOne({ email });

    if (!user) {
      // Create new user
      const newUser = {
        userId: nanoid(10),
        email,
        name: userInfo.name || '',
        picture: userInfo.picture || '',
        isVerified: true,
        createdAt: new Date()
      };
      await db.collection(usersCollectionName).insertOne(newUser);
      user = newUser;
      console.log('[Google OAuth] created new user', user.userId);
    } else {
      console.log('[Google OAuth] found user', user.userId);
    }

    // Issue access token + refresh token (store hashed refresh token)
    const accessToken = createAccessToken({ userId: user.userId, email: user.email });
    const refreshToken = createRefreshToken();
    const hashed = hashToken(refreshToken);
    const expiresAt = new Date(Date.now() + 7 * 24 * 3600 * 1000);

    await db.collection(refreshTokensCollectionName).insertOne({
      tokenHash: hashed,
      userId: user.userId,
      createdAt: new Date(),
      expiresAt,
      userAgent: req.useragent ? req.useragent.source : '',
      ip: req.ip
    });

    // Set HttpOnly cookie for refresh token
    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: config.NODE_ENV === 'production',
      sameSite: config.NODE_ENV === 'production' ? 'None' : 'Lax',
      maxAge: 7 * 24 * 3600 * 1000
    });

    // Send success message back to popup opener and close popup
    const safeUser = { name: user.name, email: user.email, userId: user.userId, picture: user.picture };
    const payload = { type: 'google-auth', success: true, token: accessToken, user: safeUser };
    return res.send(`<html><body><script nonce="${res.locals.nonce}">try{window.opener.postMessage(${JSON.stringify(payload)}, '*');}catch(e){} window.close();</script></body></html>`);
  } catch (err) {
    console.error('[Google OAuth] callback error:', err);
    return res.send(`<html><body><script nonce="${res.locals.nonce}">window.opener.postMessage({ type: 'google-auth', success: false, error: 'Internal server error' }, '*'); window.close();</script></body></html>`);
  }
});

// --- NFC API ---
app.post('/api/nfc/sign', verifyToken, [
  body('designId').isString().notEmpty().trim().escape()
], validateRequest, async (req, res) => {
  try {
    const { designId } = req.body;

    // التحقق من أن المستخدم يملك هذا التصميم
    const design = await db.collection(designsCollectionName).findOne({ shortId: designId, ownerId: req.user.userId });
    if (!design) {
      return res.status(403).json({ error: 'عذراً لا تملك الصلاحية لإصدار رابط تنشيط NFC لهذا التصميم.' });
    }

    // إصدار التوكن طويل الأمد (مثلاً 30 يوم لبرمجة الشرائح المادية بحيث تظل تعمل، أو يمكن زيادتها)
    const token = jwt.sign({ designId }, config.JWT_SECRET, { expiresIn: '30d' });

    const baseUrl = config.PUBLIC_BASE_URL || absoluteBaseUrl(req);
    const signedUrl = `${baseUrl.replace(/\/+$/, '')}/r/${token}`;

    return res.json({ success: true, signedUrl });
  } catch (error) {
    console.error('Error signing NFC url:', error);
    res.status(500).json({ error: 'حدث خطأ أثناء إعداد الرابط الموقّع.' });
  }
});

// --- بقية مسارات الـ auth (forgot/reset/verify) كذلك كما في كودك الأصلي ---
// (لقد أبقيت المسارات كما هي في ملفك الأصلي - لم أغيرها عدا استخدام encrypt عند الحاجة)
// .. بقية الشيفرة موجودة (forgot-password, reset-password, verify-email, user/designs, card privacy, save-card, saved-cards, card-requests, gallery, robots, sitemap, healthz etc.)
// (لأجل الإيجاز لم أعِد تكرار كامل الشيفرة هنا لأنك زودتني بها بالكامل — إن رغبت أدرجتها كاملة)

// --- Sentry ErrorHandler (Must be before custom error handler) ---
if (process.env.SENTRY_DSN) {
  app.use(Sentry.Handlers.errorHandler());
}

// ----- Error handler -----
app.use((err, req, res, next) => {
  console.error("Unhandled error:", err.stack || err);
  const statusCode = err.status || 500;
  const message = config.NODE_ENV === 'production' ? 'Internal Server Error' : (err.message || 'Internal Server Error');
  if (!res.headersSent) {
    res.status(statusCode).json({ error: message });
  }
});

// =================================================================
// === WEBSOCKET SERVER (Real-time collaboration)                ===
// =================================================================

const server = http.createServer(app);
const wss = new WebSocketServer({ server });

const rooms = new Map();

wss.on('connection', (ws, req) => {
  const parameters = new url.URL(req.url, `ws://${req.headers.host}`).searchParams;
  const collabId = parameters.get('collabId');

  if (!collabId) {
    console.log('Connection rejected: No collabId provided.');
    ws.close(1008, 'collabId is required');
    return;
  }

  if (!rooms.has(collabId)) rooms.set(collabId, new Set());
  const room = rooms.get(collabId);
  room.add(ws);

  console.log(`Client connected to room: ${collabId}. Room size: ${room.size}`);

  ws.on('message', (message) => {
    try {
      room.forEach(client => {
        if (client !== ws && client.readyState === ws.OPEN) {
          client.send(message.toString());
        }
      });
    } catch (error) {
      console.error('Error broadcasting message:', error);
    }
  });

  ws.on('close', () => {
    if (room) {
      room.delete(ws);
      console.log(`Client disconnected from room: ${collabId}. Room size: ${room.size}`);
      if (room.size === 0) {
        rooms.delete(collabId);
        console.log(`Room ${collabId} is now empty and has been closed.`);
      }
    }
  });

  ws.on('error', (error) => {
    console.error('WebSocket error:', error);
  });
});

// --- Start server ---
if (require.main === module) {
  server.listen(port, () => {
    console.log(`Server running on port: ${port}`);
    console.log('WebSocket server is also running.');
  });
}

// Export Express App for Testing
module.exports = app;