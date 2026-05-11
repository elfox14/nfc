// server.js (الكود الكامل والنهائي مع ميزة التحرير الجماعي)

require('dotenv').config({ override: false });

if (!process.env.JWT_SECRET) {
  throw new Error('JWT_SECRET is required. Please set it in your environment variables.');
}

const REQUIRED_ENV = ['MONGO_URI', 'JWT_SECRET'];
const missingEnv = REQUIRED_ENV.filter(k => !process.env[k]);
if (missingEnv.length > 0) {
  console.error(`❌ Missing required env vars: ${missingEnv.join(', ')}`);
  process.exit(1);
}

const express = require('express');
const compression = require('compression');
const { MongoClient } = require('mongodb');
const path = require('path');
const cors = require('cors');
const fs = require('fs');
const crypto = require('crypto');
const rateLimit = require('express-rate-limit');
const { nanoid } = require('nanoid');
const { body, validationResult } = require('express-validator');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const cookieParser = require('cookie-parser');
const verifyToken = require('./auth-middleware');
const { createAccessToken, createRefreshToken, hashToken } = require('./utils/tokens');
const EmailService = require('./email-service');
const { DOMPurify, sanitizeInputs } = require('./utils/sanitize');
const multer = require('multer');
const sharp = require('sharp');
const ejs = require('ejs');
const helmet = require('helmet');
const useragent = require('express-useragent');
const http = require('http');
const { WebSocketServer } = require('ws');
const url = require('url');
const cloudinary = require('cloudinary').v2;

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

// --- START: SECURITY HEADERS (HELMET) ---
app.use(helmet.frameguard({ action: 'deny' }));
app.use(helmet.noSniff());
app.use(helmet.hsts({ maxAge: 31536000, includeSubDomains: true, preload: true }));
// CSP nonce middleware — generates a unique nonce for OAuth callback pages
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
      `wss://${process.env.RENDER_EXTERNAL_HOSTNAME || 'nfc-vjy6.onrender.com'}`
    ],
    objectSrc: ["'none'"],
    upgradeInsecureRequests: [],
  },
}));
// --- END: SECURITY HEADERS (HELMET) ---

const allowedOrigins = (process.env.ALLOWED_ORIGINS || '').split(',').map(s => s.trim()).filter(Boolean);

// Fail-fast: in production, ALLOWED_ORIGINS must be explicitly set
if (process.env.NODE_ENV === 'production' && allowedOrigins.length === 0) {
  throw new Error('FATAL: ALLOWED_ORIGINS must be set in production. Refusing to start with open CORS.');
}

app.use(cors({
  origin: (origin, cb) => {
    // Requests with no origin (health checks, Render monitoring, curl, server-to-server)
    // In production: allow through but WITHOUT CORS headers (browsers can't abuse this)
    // In development: allow with full CORS headers for Postman/curl convenience
    if (!origin) {
      if (process.env.NODE_ENV === 'production') {
        // cb(null, false) = proceed without CORS headers (safe: browsers always send Origin)
        return cb(null, false);
      }
      return cb(null, true);
    }
    // In all environments, check against allowedOrigins with flexible subdomain matching
    let isAllowed = allowedOrigins.some(baseDomain => {
      if (baseDomain === origin) return true;
      // Compare strictly with protocols, but handle www
      const normalizeUrl = o => o.replace(/^(https?:\/\/)(www\.)?/, '$1').toLowerCase();
      return normalizeUrl(baseDomain) === normalizeUrl(origin);
    });

    // In local development, allow localhost origins automatically
    if (!isAllowed && origin && (origin.startsWith('http://localhost:') || origin.startsWith('http://127.0.0.1:'))) {
        if (process.env.NODE_ENV !== 'production') {
            isAllowed = true;
        }
    }

    if (isAllowed) {
      // CORS origin accepted (verbose log removed for production performance)
      return cb(null, true);
    }
    console.warn(`[CORS] Request from BLOCKED origin: ${origin}. Allowed origins: ${allowedOrigins.join(', ')}`);
    cb(new Error('Not allowed by CORS'));
  },
  credentials: true,
  optionsSuccessStatus: 200 // Some legacy browsers crash on 204
}));

app.use(express.json({ limit: '10mb' }));
app.use(cookieParser());
app.set('view engine', 'ejs');

// --- HEALTH CHECK (for uptime monitors & container orchestration) ---
app.get('/healthz', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString(), dbConnected: !!db });
});

// --- DATABASE CONNECTION ---
const mongoUrl = process.env.MONGO_URI;
const dbName = process.env.MONGO_DB || 'mcnfc';
const designsCollectionName = process.env.MONGO_DESIGNS_COLL || 'designs';
const usersCollectionName = 'users'; // New Users Collection
const backgroundsCollectionName = process.env.MONGO_BACKGROUNDS_COLL || 'backgrounds';
const savedCardsCollectionName = 'savedCards';
const cardRequestsCollectionName = 'cardRequests';
let db;

MongoClient.connect(mongoUrl)
  .then(async client => {
    db = client.db(dbName);
    console.log('MongoDB connected');

    // Create indexes for better performance
    try {
      await db.collection(designsCollectionName).createIndex({ shortId: 1 }, { unique: true });
      await db.collection(designsCollectionName).createIndex({ ownerId: 1 });
      await db.collection(designsCollectionName).createIndex({ createdAt: -1 });
      await db.collection(usersCollectionName).createIndex({ email: 1 }, { unique: true });
      await db.collection(usersCollectionName).createIndex({ userId: 1 }, { unique: true });
      // Indexes for card save feature
      await db.collection(savedCardsCollectionName).createIndex({ userId: 1 });
      await db.collection(savedCardsCollectionName).createIndex({ userId: 1, designShortId: 1 }, { unique: true });
      await db.collection(cardRequestsCollectionName).createIndex({ ownerUserId: 1, status: 1 });
      await db.collection(cardRequestsCollectionName).createIndex({ requesterId: 1, designShortId: 1 });
      console.log('MongoDB indexes created');
    } catch (indexErr) {
      console.warn('Some indexes may already exist:', indexErr.message);
    }
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

// sanitizeInputs and DOMPurify are now imported from utils/sanitize.js

// --- VIEWER & SEO ROUTES ---
app.get(['/nfc/viewer', '/nfc/viewer.html'], async (req, res) => {
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

    // Validate ID format (nanoid produces alphanumeric + _- chars, length 8)
    if (!/^[a-zA-Z0-9_-]{4,30}$/.test(id)) {
      res.setHeader('X-Robots-Tag', 'noindex, noarchive');
      return res.status(400).send('Invalid card ID format.');
    }

    const doc = await db.collection(designsCollectionName).findOne({ shortId: id });

    if (!doc || !doc.data) {
      res.setHeader('X-Robots-Tag', 'noindex, noarchive');
      return res.status(404).send('Design not found or data is missing');
    }

    db.collection(designsCollectionName).updateOne(
      { shortId: id },
      { $inc: { views: 1 } }
    ).catch(err => console.error(`Failed to increment view count for ${id}:`, err));

    res.setHeader('X-Robots-Tag', 'index, follow');

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

    res.render(path.join(rootDir, 'viewer.ejs'), {
      pageUrl,
      name: name,
      tagline: tagline,
      ogImage,
      keywords,
      design: doc.data,
      canonical: pageUrl,
      contactLinksHtml: contactLinksHtml
    });
  } catch (e) {
    console.error('Error in /nfc/viewer route:', e);
    res.setHeader('X-Robots-Tag', 'noindex, noarchive');
    res.status(500).send('View failed due to an internal server error.');
  }
});

app.get('/nfc/view/:id', async (req, res) => {
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

// --- CACHING & REDIRECT MIDDLEWARE ---
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
  // Only redirect .html URLs for SEO-friendly clean URLs
  // SKIP redirect for: viewer.html (has its own route), and any page with query params
  // (editor.html?id=xxx, dashboard.html?initToken=xxx, login.html?error=xxx)
  // because the clean URL redirect can break app functionality behind CDN/proxy
  const hasQueryParams = req.url.includes('?');
  if (req.path.endsWith('.html') && !req.path.startsWith('/nfc/viewer.html') && !hasQueryParams) {
    const newPath = req.path.slice(0, -5);
    return res.redirect(301, newPath);
  }
  next();
});
app.get('/', (req, res) => { res.redirect(301, '/nfc/'); });

// --- UPLOADS FOLDER ---
const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });
app.use('/uploads', express.static(uploadDir, { maxAge: '30d', immutable: true }));

// --- API ROUTES ---
app.get('/api/health', (req, res) => {
  res.status(200).json({ status: 'ok' });
});

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
  message: 'Too many requests from this IP, please try again after 15 minutes'
});
app.use('/api/', apiLimiter);

// Stricter rate limiting for auth endpoints (5 attempts per 15 minutes)
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
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

// --- AUTHENTICATION ROUTES (MODULAR) ---
const createAuthRouter = require('./routes/auth.routes');
app.use('/api/auth', createAuthRouter({ 
  getDb: () => db, 
  usersCollectionName, 
  authLimiter,
  allowedOrigins
}));

app.get('/robots.txt', (req, res) => {
  const base = absoluteBaseUrl(req);
  const txt = [
    'User-agent: *',
    'Allow: /nfc/',
    'Allow: /nfc/viewer.html',
    'Disallow: /nfc/view/',
    'Disallow: /nfc/editor',
    'Disallow: /nfc/editor.html',
    'Disallow: /nfc/viewer.ejs',
    `Sitemap: ${base}/sitemap.xml`
  ].join('\n');
  res.type('text/plain').send(txt);
});

app.get('/sitemap.xml', async (req, res) => {
  try {
    const base = absoluteBaseUrl(req);
    const staticPages = ['/nfc/', '/nfc/gallery-en.html', '/nfc/gallery.html', '/nfc/blog-en.html', '/nfc/blog.html', '/nfc/privacy-en.html', '/nfc/privacy.html', '/nfc/terms-en.html', '/nfc/terms.html', '/nfc/contact-en.html', '/nfc/contact.html'];
    const blogPosts = [
      '/nfc/blog-nfc-at-events-en.html',
      '/nfc/blog-nfc-at-events.html',
      '/nfc/blog-digital-menus-for-restaurants-en.html',
      '/nfc/blog-digital-menus-for-restaurants.html',
      '/nfc/blog-business-card-mistakes-en.html',
      '/nfc/blog-business-card-mistakes.html',
      '/nfc/nfc-for-freelancers-en.html',
      '/nfc/nfc-for-freelancers.html',
      '/nfc/nfc-for-companies-en.html',
      '/nfc/nfc-for-companies.html',
      '/nfc/nfc-for-companies-egypt-en.html',
      '/nfc/nfc-for-companies-egypt.html',
      '/nfc/nfc-for-companies-saudi-en.html',
      '/nfc/nfc-for-companies-saudi.html',
      '/nfc/nfc-for-companies-uae-en.html',
      '/nfc/nfc-for-companies-uae.html'
    ];
    let designUrls = [];
    if (db) {
      // SECURITY: Only include designs shared to gallery in the sitemap
      const docs = await db.collection(designsCollectionName)
        .find({ 'data.sharedToGallery': true })
        .project({ shortId: 1, createdAt: 1 })
        .sort({ createdAt: -1 })
        .limit(5000)
        .toArray();
      designUrls = docs.map(d => ({
        loc: `${base}/nfc/viewer.html?id=${d.shortId}`,
        lastmod: d.createdAt ? new Date(d.createdAt).toISOString().split('T')[0] : undefined,
        changefreq: 'monthly',
        priority: '0.8'
      }));
    }
    function urlTag(loc, { lastmod, changefreq = 'weekly', priority = '0.7' } = {}) {
      if (!loc) return '';
      const lastmodTag = lastmod ? `<lastmod>${lastmod}</lastmod>` : '';
      const changefreqTag = changefreq ? `<changefreq>${changefreq}</changefreq>` : '';
      const priorityTag = priority ? `<priority>${priority}</priority>` : '';
      return `
  <url>
    <loc>${loc}</loc>${lastmodTag}${changefreqTag}${priorityTag}
  </url>`;
    }
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${staticPages.map(p => urlTag(`${base}${p}`, { priority: '0.9', changefreq: 'weekly' })).join('')}
${blogPosts.map(p => urlTag(`${base}${p}`, { priority: '0.7', changefreq: 'monthly' })).join('')}
${designUrls.map(u => urlTag(u.loc, { lastmod: u.lastmod, changefreq: u.changefreq, priority: u.priority })).join('')}
</urlset>`;
    res.type('application/xml').send(xml);
  } catch (e) {
    console.error('Sitemap generation error:', e);
    res.status(500).send('Sitemap failed');
  }
});

// NOTE: Duplicate /healthz endpoint was removed — primary one is at line 172

app.get(['/nfc/editor', '/nfc/editor.html'], (req, res) => {
  if (req.useragent.isMobile) {
    const mobilePath = path.join(rootDir, 'editor-mobile.html');
    // Serve mobile-optimized editor if it exists, otherwise fall back to desktop editor
    if (fs.existsSync(mobilePath)) {
      return res.sendFile(mobilePath);
    }
    // Fallback: desktop editor (already has responsive mobile CSS via mobile.css)
    console.log('[Editor] Mobile user detected, but editor-mobile.html not found. Serving editor.html.');
  }
  res.sendFile(path.join(rootDir, 'editor.html'));
});

// --- ERROR TRACKING (defined here so all routes below can use trackError) ---
const errorBuffer = []; // In-memory circular buffer for recent errors
const MAX_ERROR_BUFFER = 100;

function trackError(error, context = {}) {
  const entry = {
    timestamp: new Date().toISOString(),
    message: error.message || String(error),
    stack: error.stack?.split('\n').slice(0, 5).join('\n'),
    ...context,
  };
  errorBuffer.push(entry);
  if (errorBuffer.length > MAX_ERROR_BUFFER) errorBuffer.shift();
  console.error(`[ErrorTracker] ${entry.timestamp} | ${context.route || 'unknown'} | ${entry.message}`);
}

// --- CLIENT ERROR REPORTING ENDPOINT ---
const clientErrorLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 50,
  standardHeaders: true,
  legacyHeaders: false,
  message: '',
});
app.post('/api/client-error', clientErrorLimiter, express.json({ limit: '4kb' }), (req, res) => {
  const { message, source, line, col, stack, url: pageUrl } = req.body || {};
  if (!message) return res.status(400).end();
  console.error(`[ClientError] ${message} | ${source || ''}:${line || 0} | ${pageUrl || ''}`);
  // Store in errorBuffer
  trackError(new Error(message), { route: 'CLIENT', source, line, col, pageUrl });
  res.status(204).end();
});

// --- STATIC FILE HANDLER with Smart Caching ---
app.use('/nfc', express.static(rootDir, {
  extensions: ['html'],
  setHeaders: (res, filePath) => {
    const ext = path.extname(filePath).toLowerCase();
    if (['.css', '.js'].includes(ext)) {
      // CSS/JS: Cache for 7 days, revalidate
      res.setHeader('Cache-Control', 'public, max-age=604800, stale-while-revalidate=86400');
    } else if (['.png', '.jpg', '.jpeg', '.gif', '.webp', '.svg', '.ico', '.woff2', '.woff', '.ttf'].includes(ext)) {
      // Images & fonts: Cache for 30 days
      res.setHeader('Cache-Control', 'public, max-age=2592000, immutable');
    } else if (ext === '.html') {
      // HTML: Always revalidate (fresh content)
      res.setHeader('Cache-Control', 'no-cache, must-revalidate');
    } else if (ext === '.json') {
      res.setHeader('Cache-Control', 'public, max-age=3600');
    }
  }
}));

// --- ADMIN ROUTES (must be BEFORE general error handler) ---
const adminLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // Limit each IP to 10 admin attempts per window
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

// --- 404 NOT FOUND HANDLER ---
app.use((req, res, next) => {
  res.status(404).sendFile(path.join(rootDir, '404.html'));
});

// --- GENERAL ERROR HANDLER (must be AFTER all routes) ---
app.use((err, req, res, next) => {
  trackError(err, {
    route: `${req.method} ${req.originalUrl}`,
    ip: req.ip,
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

// =================================================================
// === START: WEBSOCKET SERVER FOR REAL-TIME COLLABORATION       ===
// =================================================================

// 1. إنشاء خادم HTTP من تطبيق Express
const server = http.createServer(app);

// 2. إنشاء خادم WebSocket وربطه بخادم HTTP
const wss = new WebSocketServer({ server });

// 3. هيكل بيانات لتخزين الغرف والعملاء المتصلين
// Map<collabId, Set<WebSocket>>
const rooms = new Map();

// === WebSocket Security: Rate limiting & connection limits ===
const WS_LIMITS = {
  MAX_MESSAGE_SIZE: 64 * 1024,       // 64KB max per message
  MAX_MESSAGES_PER_SEC: 30,           // 30 messages per second
  MAX_CONNECTIONS_PER_IP: 5,          // 5 simultaneous connections per IP
  MAX_ROOM_SIZE: 10,                  // 10 participants per room
  RATE_WINDOW_MS: 1000,              // 1 second window
};

// Track connections per IP
const wsConnectionsPerIP = new Map();

function getClientIP(req) {
  return req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.socket.remoteAddress || 'unknown';
}

wss.on('connection', (ws, req) => {
  // --- Connection limit per IP ---
  const clientIP = getClientIP(req);
  const currentCount = wsConnectionsPerIP.get(clientIP) || 0;

  if (currentCount >= WS_LIMITS.MAX_CONNECTIONS_PER_IP) {
    console.log(`WebSocket rejected: IP ${clientIP} exceeded max connections (${WS_LIMITS.MAX_CONNECTIONS_PER_IP})`);
    ws.close(1008, 'Too many connections from your IP');
    return;
  }
  wsConnectionsPerIP.set(clientIP, currentCount + 1);

  // Decrement on disconnect
  ws.on('close', () => {
    const count = wsConnectionsPerIP.get(clientIP) || 1;
    if (count <= 1) wsConnectionsPerIP.delete(clientIP);
    else wsConnectionsPerIP.set(clientIP, count - 1);
  });

  // SECURITY: Extract only collabId from URL — token comes via first message
  const parameters = new url.URL(req.url, `ws://${req.headers.host}`).searchParams;
  const collabId = parameters.get('collabId');

  if (!collabId) {
    console.log('Connection rejected: No collabId provided.');
    ws.close(1008, 'collabId is required');
    return;
  }

  const secret = process.env.JWT_SECRET;
  if (!secret) {
    console.error('CRITICAL: WebSocket connection rejected because JWT_SECRET is not configured on the server.');
    ws.close(1011, 'Internal Server Error: Authentication configuration missing');
    return;
  }

  // SECURITY: Do NOT accept token from URL query string.
  // Wait for the first message to authenticate.
  let authenticated = false;

  // Set a timeout — if no auth message within 10 seconds, disconnect
  const authTimeout = setTimeout(() => {
    if (!authenticated) {
      console.log(`WebSocket auth timeout for room: ${collabId}`);
      ws.close(1008, 'Authentication timeout');
    }
  }, 10000);

  // Listen for the first message as an auth message
  ws.once('message', (message) => {
    try {
      // --- Max message size check ---
      if (message.length > WS_LIMITS.MAX_MESSAGE_SIZE) {
        clearTimeout(authTimeout);
        ws.close(1009, 'Message too large');
        return;
      }

      const data = JSON.parse(message.toString());
      if (data.type === 'auth' && data.token) {
        jwt.verify(data.token, secret);
        authenticated = true;
        clearTimeout(authTimeout);

        // --- Room size limit ---
        if (!rooms.has(collabId)) {
          rooms.set(collabId, new Set());
        }
        const room = rooms.get(collabId);

        if (room.size >= WS_LIMITS.MAX_ROOM_SIZE) {
          ws.close(1008, 'Room is full');
          return;
        }

        room.add(ws);

        console.log(`Client authenticated and joined room: ${collabId}. Room size: ${room.size}`);
        ws.send(JSON.stringify({ type: 'auth', success: true }));

        // --- Rate limiter for this client ---
        let messageTimestamps = [];

        // Now register the normal message handler for collaboration
        ws.on('message', (msg) => {
          try {
            // Max message size check
            if (msg.length > WS_LIMITS.MAX_MESSAGE_SIZE) {
              ws.send(JSON.stringify({ type: 'error', message: 'Message too large' }));
              return;
            }

            // Rate limiting: sliding window
            const now = Date.now();
            messageTimestamps = messageTimestamps.filter(t => now - t < WS_LIMITS.RATE_WINDOW_MS);
            messageTimestamps.push(now);

            if (messageTimestamps.length > WS_LIMITS.MAX_MESSAGES_PER_SEC) {
              ws.send(JSON.stringify({ type: 'error', message: 'Rate limit exceeded. Slow down.' }));
              return; // Drop message, don't broadcast
            }

            room.forEach(client => {
              if (client !== ws && client.readyState === ws.OPEN) {
                client.send(msg.toString());
              }
            });
          } catch (error) {
            console.error('Error broadcasting message:', error);
          }
        });

        // Handle disconnect — cleanup
        ws.on('close', () => {
          room.delete(ws);
          console.log(`Client disconnected from room: ${collabId}. Room size: ${room.size}`);
          if (room.size === 0) {
            rooms.delete(collabId);
            console.log(`Room ${collabId} is now empty and has been closed.`);
          }
        });
      } else {
        console.log('WebSocket connection rejected: First message was not auth.');
        clearTimeout(authTimeout);
        ws.close(1008, 'Authentication required as first message');
      }
    } catch (err) {
      console.log('WebSocket connection rejected: Invalid auth token.');
      clearTimeout(authTimeout);
      ws.close(1008, 'Invalid authentication token');
    }
  });

  ws.on('error', (error) => {
    console.error('WebSocket error:', error);
    clearTimeout(authTimeout);
  });
});

// =================================================================
// === END: WEBSOCKET SERVER                                     ===
// =================================================================


// --- START SERVER (تغيير app.listen إلى server.listen) ---
if (require.main === module) {
  server.listen(port, () => {
    console.log(`Server running on port: ${port}`);
    console.log('WebSocket server is also running.');
  });
}

module.exports = app;
