// server.js (الكود الكامل والنهائي مع ميزة التحرير الجماعي)

require('dotenv').config({ override: false });

if (!process.env.JWT_SECRET) {
  throw new Error('JWT_SECRET is required. Please set it in your environment variables.');
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
const cloudinary = require('cloudinary').v2;

const window = (new JSDOM('')).window;
const DOMPurify = DOMPurifyFactory(window);

const app = express();

// --- START: MIDDLEWARE SETUP ---
app.use(compression());
app.use(useragent.express());

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
// CSP nonce middleware — generates a unique nonce per request
app.use((req, res, next) => {
  res.locals.cspNonce = crypto.randomBytes(16).toString('base64');
  next();
});

app.use(helmet.contentSecurityPolicy({
  directives: {
    defaultSrc: ["'self'"],
    scriptSrc: ["'self'", (req, res) => `'nonce-${res.locals.cspNonce}'`, "https://cdnjs.cloudflare.com", "https://cdn.jsdelivr.net", "https://www.youtube.com"],
    styleSrc: ["'self'", (req, res) => `'nonce-${res.locals.cspNonce}'`, "https://cdnjs.cloudflare.com", "https://fonts.googleapis.com"],
    fontSrc: ["'self'", "https://fonts.gstatic.com"],
    imgSrc: ["'self'", "data:", "https:", "https://res.cloudinary.com", "https://*.mcprim.com", "https://i.imgur.com", "https://mcprim.com", "https://www.mcprim.com", "https://media.giphy.com"],
    mediaSrc: ["'self'", "data:"],
    frameSrc: ["'self'", "https://www.youtube.com"],
    connectSrc: ["'self'", "https://cdnjs.cloudflare.com", "https://cdn.jsdelivr.net", "https://www.youtube.com", "https://*.mcprim.com", "https://mcprim.com", "https://www.mcprim.com", "https://media.giphy.com", `wss://${process.env.RENDER_EXTERNAL_HOSTNAME || 'nfc-vjy6.onrender.com'}`],
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
      console.log(`[CORS] Request from allowed origin: ${origin}`);
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

const FIELDS_TO_SANITIZE = [
  'input-name', 'input-name_ar', 'input-name_en',
  'input-tagline', 'input-tagline_ar', 'input-tagline_en',
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
  if (req.path.endsWith('.html') && !req.path.startsWith('/nfc/viewer.html')) {
    const newPath = req.path.slice(0, -5);
    const queryString = req.url.includes('?') ? req.url.slice(req.url.indexOf('?')) : '';
    console.log(`[Redirect] Stripping .html from ${req.url} -> ${newPath + queryString}`);
    return res.redirect(301, newPath + queryString);
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

const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (file.mimetype && file.mimetype.startsWith('image/')) {
      const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
      if (allowedTypes.includes(file.mimetype)) {
        cb(null, true);
      } else {
        cb(new Error('نوع الصورة غير مدعوم.'), false);
      }
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

function assertAdmin(req, res) {
  const expected = process.env.ADMIN_TOKEN || '';
  const provided = req.headers['x-admin-token'] || '';
  if (!expected || expected.length !== provided.length || !crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(provided))) {
    res.status(401).json({ error: 'Unauthorized' });
    return false;
  }
  return true;
}

app.post('/api/upload-image', verifyToken, upload.single('image'), handleMulterErrors, async (req, res) => {
  try {
    if (!req.file) {
      if (!res.headersSent) {
        return res.status(400).json({ error: 'لم يتم تقديم أي ملف صورة.' });
      }
      return;
    }

    // Process image with sharp
    const processedBuffer = await sharp(req.file.buffer)
      .resize({ width: 2560, height: 2560, fit: 'inside', withoutEnlargement: true })
      .webp({ quality: 85 })
      .toBuffer();

    // Phase 1: Try External Upload (Priority 1)
    if (process.env.EXTERNAL_UPLOAD_URL) {
      try {
        const formData = new FormData();
        const blob = new Blob([processedBuffer], { type: 'image/webp' });
        formData.append('file', blob, 'image.webp');
        if (process.env.UPLOAD_SECRET) {
          formData.append('secret', process.env.UPLOAD_SECRET);
        }

        const externalResponse = await fetch(process.env.EXTERNAL_UPLOAD_URL, {
          method: 'POST',
          body: formData
        });

        if (externalResponse.ok) {
          const result = await externalResponse.json();
          if (result.success && result.url) {
            console.log('[Upload] Image uploaded to external server:', result.url);
            return res.json({ success: true, url: result.url, external: true });
          }
        }
        console.warn('[Upload] External upload returned error status:', externalResponse.status);
      } catch (externalErr) {
        console.warn('[Upload] External upload failed, falling back to Cloudinary:', externalErr.message);
      }
    }

    // Phase 2: Try Cloudinary (Priority 2)
    if (process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY && process.env.CLOUDINARY_API_SECRET) {
      try {
        const result = await new Promise((resolve, reject) => {
          const uploadStream = cloudinary.uploader.upload_stream(
            { folder: 'mcprim', resource_type: 'image', format: 'webp' },
            (error, result) => {
              if (error) reject(error);
              else resolve(result);
            }
          );
          uploadStream.end(processedBuffer);
        });

        console.log('[Upload] Image uploaded to Cloudinary:', result.secure_url);
        return res.json({
          success: true,
          url: result.secure_url,
          cloud: true
        });
      } catch (cloudErr) {
        console.warn('[Upload] Cloudinary upload failed, falling back to local:', cloudErr.message);
      }
    }

    // fallback: Local storage (Ephemeral/Development)
    const filename = nanoid(10) + '.webp';
    const out = path.join(uploadDir, filename);
    await fs.promises.writeFile(out, processedBuffer);

    const base = absoluteBaseUrl(req);
    console.log('[Upload] Image saved locally (Fallback):', filename);

    return res.json({
      success: true,
      url: `${base}/uploads/${filename}`,
      local: true
    });

  } catch (e) {
    console.error('Image upload processing error:', e);
    if (!res.headersSent) {
      return res.status(500).json({ error: 'فشل معالجة الصورة بعد الرفع.' });
    }
  }
});

app.post('/api/save-design', verifyToken, async (req, res) => {
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

    // Retrieve ownerId from authenticated session via verifyToken
    let ownerId = req.user.userId;

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
      // Preserve captured card images during auto-save (which doesn't capture images)
      const existingDoc = await db.collection(designsCollectionName).findOne({ shortId: shortId });
      if (existingDoc?.data?.imageUrls) {
        if (!data.imageUrls) data.imageUrls = {};
        const existing = existingDoc.data.imageUrls;
        // If update has no captured images, keep existing ones
        if (!data.imageUrls.capturedFront && existing.capturedFront) {
          data.imageUrls.capturedFront = existing.capturedFront;
        }
        if (!data.imageUrls.capturedBack && existing.capturedBack) {
          data.imageUrls.capturedBack = existing.capturedBack;
        }
      }
    }

    const updateDoc = {
      data,
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
      // If user already has a design, update it instead of failing
      if (ownerId) {
        const designCount = await db.collection(designsCollectionName).countDocuments({ ownerId });
        if (designCount >= 1) {
          // Find the existing design and update it
          const existingDesign = await db.collection(designsCollectionName).findOne({ ownerId });
          if (existingDesign) {
            shortId = existingDesign.shortId;
            isUpdate = true;
            // Preserve existing captured images if not re-capturing now
            if (existingDesign.data?.imageUrls) {
              if (!data.imageUrls) data.imageUrls = {};
              const existing = existingDesign.data.imageUrls;
              if (!data.imageUrls.capturedFront && existing.capturedFront) {
                data.imageUrls.capturedFront = existing.capturedFront;
              }
              if (!data.imageUrls.capturedBack && existing.capturedBack) {
                data.imageUrls.capturedBack = existing.capturedBack;
              }
            }
            const updateExisting = { data, ownerId, lastModified: new Date() };
            await db.collection(designsCollectionName).updateOne(
              { shortId },
              { $set: updateExisting }
            );
            return res.json({ success: true, id: shortId });
          }
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

// PATCH element property
app.patch('/api/design/:id/element/:elementId', verifyToken, async (req, res) => {
  try {
    if (!db) return res.status(500).json({ error: 'DB not connected' });
    const { id, elementId } = req.params;
    const updates = req.body;

    // Whitelist of allowed properties
    const allowedKeys = ['position', 'fontSize', 'color', 'content', 'width', 'height', 'rotation', 'opacity', 'zIndex', 'display', 'text', 'src', 'url'];
    const filteredUpdates = {};
    Object.keys(updates).forEach(key => {
      if (allowedKeys.includes(key)) {
        filteredUpdates[key] = updates[key];
      }
    });

    if (Object.keys(filteredUpdates).length === 0) {
      return res.status(400).json({ error: 'No valid properties to update' });
    }

    const updatePayload = {};
    for (const key in filteredUpdates) {
      updatePayload[`data.elements.$.${key}`] = filteredUpdates[key];
    }

    // Try primary structure (data.elements)
    let result = await db.collection(designsCollectionName).updateOne(
      { shortId: id, 'data.elements.id': elementId, ownerId: req.user.userId },
      { $set: updatePayload }
    );

    // Fallback for legacy or test structures
    if (result.matchedCount === 0) {
      const fallbackPayload = {};
      for (const key in filteredUpdates) {
        fallbackPayload[`elements.$.${key}`] = filteredUpdates[key];
      }
      result = await db.collection(designsCollectionName).updateOne(
        { shortId: id, 'elements.id': elementId, ownerId: req.user.userId },
        { $set: fallbackPayload }
      );
    }

    if (result.matchedCount === 0) {
      return res.status(404).json({ error: 'Design or element not found or unauthorized' });
    }

    console.log(`[PatchElement] Element ${elementId} updated in design ${id}`);
    res.json({ success: true, message: 'Element updated successfully' });

  } catch (err) {
    console.error('Patch element error:', err);
    res.status(500).json({ error: 'Failed to update element' });
  }
});


// --- AUTHENTICATION ROUTES ---

// Register
app.post('/api/auth/register', [
  body('email').isEmail().normalizeEmail(),
  body('password').isLength({ min: 6, max: 128 }),
  body('name').trim().notEmpty()
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    if (!db) return res.status(500).json({ error: 'DB not connected' });

    const { email, password, name } = req.body;

    // Check if user exists
    const existingUser = await db.collection(usersCollectionName).findOne({ email });
    if (existingUser) {
      return res.status(400).json({ error: 'User already exists' });
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Create user
    const userId = nanoid(10);
    await db.collection(usersCollectionName).insertOne({
      userId,
      email,
      password: hashedPassword,
      name,
      isVerified: false,
      createdAt: new Date()
    });

    // Generate verification token
    const secret = process.env.JWT_SECRET;
    if (!secret) return res.status(500).json({ error: 'Server misconfiguration' });
    const verificationToken = jwt.sign({ userId, email, type: 'email-verify' }, secret, { expiresIn: '24h' });

    // Store verification token hash
    await db.collection(usersCollectionName).updateOne(
      { userId },
      { $set: { verificationTokenHash: hashToken(verificationToken) } }
    );

    // Send verification email (non-blocking)
    const baseUrl = process.env.PUBLIC_BASE_URL || 'https://mcprim.com/nfc';
    const verifyUrl = `${baseUrl}/verify-email.html?token=${verificationToken}`;
    try {
      const emailTemplate = EmailService.verificationEmail(name, verifyUrl);
      await EmailService.send({ to: email, ...emailTemplate });
    } catch (emailErr) {
      console.warn('[Register] Email sending failed (non-blocking):', emailErr.message);
    }

    // Generate short-lived access token + HttpOnly refresh cookie
    const accessToken = createAccessToken({ userId, email });
    const refreshTokenValue = createRefreshToken();
    const hashedRefresh = hashToken(refreshTokenValue);

    // Store hashed refresh token in DB
    await db.collection(usersCollectionName).updateOne(
      { userId },
      { $set: { refreshTokenHash: hashedRefresh } }
    );

    // Set refresh token as HttpOnly Secure cookie
    res.cookie('refreshToken', refreshTokenValue, {
      httpOnly: true,
      secure: true, // required for sameSite: 'None'
      sameSite: 'None', // allow cross-site (mcprim.com → onrender.com)
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      path: '/api/auth'
    });

    // Set access token as HttpOnly Secure cookie
    res.cookie('accessToken', accessToken, {
      httpOnly: true,
      secure: true,
      sameSite: 'None',
      maxAge: 15 * 60 * 1000, // 15 minutes
      path: '/'
    });

    // SECURITY: Token is in HttpOnly cookie only — do NOT send in response body
    res.status(201).json({ success: true, user: { name, email, userId, isVerified: false } });

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
  body('email').isEmail().normalizeEmail(),
  body('password').isLength({ max: 128 }).withMessage('Password too long')
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    console.warn('[Login] Validation failed:', errors.array());
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    if (!db) {
      console.error('[Login] Database not connected');
      return res.status(500).json({ error: 'DB not connected' });
    }

    const { email, password } = req.body;
    console.log(`[Login] Login attempt for: ${email}`);

    const user = await db.collection(usersCollectionName).findOne({ email });
    if (!user) {
      return res.status(400).json({ error: 'Invalid credentials' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ error: 'Invalid credentials' });
    }

    // Generate short-lived access token + HttpOnly refresh cookie
    const accessToken = createAccessToken({ userId: user.userId, email: user.email });
    const refreshTokenValue = createRefreshToken();
    const hashedRefresh = hashToken(refreshTokenValue);

    // Store hashed refresh token in DB
    await db.collection(usersCollectionName).updateOne(
      { userId: user.userId },
      { $set: { refreshTokenHash: hashedRefresh } }
    );

    // Set refresh token as HttpOnly Secure cookie
    res.cookie('refreshToken', refreshTokenValue, {
      httpOnly: true,
      secure: true, // required for sameSite: 'None'
      sameSite: 'None', // allow cross-site (mcprim.com → onrender.com)
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      path: '/api/auth'
    });

    // Set access token as HttpOnly Secure cookie
    res.cookie('accessToken', accessToken, {
      httpOnly: true,
      secure: true,
      sameSite: 'None',
      maxAge: 15 * 60 * 1000, // 15 minutes
      path: '/'
    });

    console.log(`[Login] Successful login for: ${email}. Token issued.`);
    // SECURITY: Token is in HttpOnly cookie only — do NOT send in response body
    res.json({ success: true, user: { name: user.name, email: user.email, userId: user.userId } });

  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Login failed' });
  }
});

// Google OAuth - Initiate Flow
app.get('/api/auth/google', (req, res) => {
  let clientId = process.env.GOOGLE_CLIENT_ID;
  if (!clientId) {
    return res.status(500).send('Google OAuth not configured');
  }
  clientId = clientId.trim();

  const protoHeader = req.headers['x-forwarded-proto'];
  const proto = protoHeader ? protoHeader.split(',')[0].trim() : req.protocol;
  const host = req.get('host');
  const redirectUri = `${proto}://${host}/api/auth/google/callback`;

  // Only store the language (ar/en) in state — rebuild full redirect URL from PUBLIC_BASE_URL
  const lang = (req.query.lang === 'en') ? 'en' : 'ar';
  const statePayload = Buffer.from(JSON.stringify({ lang })).toString('base64url');

  const scope = 'email profile';
  const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&scope=${encodeURIComponent(scope)}&access_type=offline&prompt=consent&state=${encodeURIComponent(statePayload)}`;

  res.redirect(authUrl);
});

// Google OAuth - Callback Handler
app.get('/api/auth/google/callback', async (req, res) => {
  const { code, error, state } = req.query;

  // Determine language from state
  let lang = 'ar';
  if (state) {
    try {
      const decoded = JSON.parse(Buffer.from(state, 'base64url').toString('utf8'));
      if (decoded.lang === 'en') lang = 'en';
    } catch (e) { /* use default */ }
  }

  // Build the absolute redirect URL to the FRONTEND (mcprim.com), not the Render backend
  const frontendBase = (process.env.PUBLIC_BASE_URL || 'https://mcprim.com/nfc').replace(/\/$/, '');
  const loginPage = lang === 'en'
    ? `${frontendBase}/login-en.html`
    : `${frontendBase}/login.html`;


  if (error || !code) {
    const safeError = encodeURIComponent(String(error || 'google_auth_failed').replace(/[^a-zA-Z0-9_ -]/g, ''));
    return res.redirect(`${loginPage}?error=${safeError}`);
  }

  try {
    if (!db) {
      const safeError = encodeURIComponent('خدمة قاعدة البيانات غير متوفرة حالياً، يرجى المحاولة لاحقاً.');
      return res.redirect(`${loginPage}?error=${safeError}`);
    }

    const clientId = (process.env.GOOGLE_CLIENT_ID || '').trim();
    const clientSecret = (process.env.GOOGLE_CLIENT_SECRET || '').trim();
    
    const protoHeader = req.headers['x-forwarded-proto'];
    const proto = protoHeader ? protoHeader.split(',')[0].trim() : req.protocol;
    const host = req.get('host');
    const redirectUri = `${proto}://${host}/api/auth/google/callback`;

    // Exchange code for tokens
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code: code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code'
      }).toString()
    });

    const tokens = await tokenResponse.json();
    if (!tokens.access_token) {
      console.error('Google Token API Error:', tokens);
      throw new Error(tokens.error_description || tokens.error || 'No access token');
    }

    // Get user info
    const userInfoResponse = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: { Authorization: `Bearer ${tokens.access_token}` }
    });
    const googleUser = await userInfoResponse.json();

    if (!googleUser.email) {
      console.error('Google UserInfo Error:', googleUser);
      throw new Error('No email returned from Google');
    }

    // Find or create user
    let user = await db.collection(usersCollectionName).findOne({ email: googleUser.email });

    if (!user) {
      const userId = nanoid(10);
      await db.collection(usersCollectionName).insertOne({
        userId,
        email: googleUser.email,
        name: googleUser.name || googleUser.email.split('@')[0],
        googleId: googleUser.id,
        isVerified: true,
        createdAt: new Date()
      });
      user = { userId, email: googleUser.email, name: googleUser.name };
    }

    // Generate tokens
    const accessToken = createAccessToken({ userId: user.userId, email: user.email });
    const refreshTokenValue = createRefreshToken();
    const hashedRefresh = hashToken(refreshTokenValue);

    await db.collection(usersCollectionName).updateOne(
      { userId: user.userId },
      { $set: { refreshTokenHash: hashedRefresh } }
    );

    // Set refresh token as HttpOnly Secure cookie
    res.cookie('refreshToken', refreshTokenValue, {
      httpOnly: true,
      secure: true, // required for sameSite: 'None'
      sameSite: 'None', // allow cross-site (mcprim.com → onrender.com)
      maxAge: 7 * 24 * 60 * 60 * 1000,
      path: '/api/auth'
    });

    // Set access token as HttpOnly Secure cookie
    res.cookie('accessToken', accessToken, {
      httpOnly: true,
      secure: true,
      sameSite: 'None',
      maxAge: 15 * 60 * 1000, // 15 minutes
      path: '/'
    });

    // Build the dashboard URL for fallback redirect
    // SECURITY: Token is already in HttpOnly cookies — do NOT put it in URL hash
    const dashboardPage = lang === 'en'
      ? `${frontendBase}/dashboard-en.html`
      : `${frontendBase}/dashboard.html`;



    // SECURITY: Generate a very short-lived (60s), one-time-use token to initialize the session
    // This allows the SPA to boot even if third-party cookies are blocked by the browser.
    const sessionInitToken = jwt.sign(
      { userId: user.userId, email: user.email, type: 'session-init' },
      process.env.JWT_SECRET,
      { expiresIn: '60s' }
    );

    // Send success signal to popup opener via postMessage
    const script = `
      (function() {
        var hasOpener = false;
        try {
          hasOpener = !!(window.opener && !window.opener.closed);
        } catch (e) {}

        if (hasOpener) {
          // Path 1: Popup flow — send success signal to opener, then close
          try {
            var msg = {
              type: 'google-auth',
              success: true,
              initToken: ${JSON.stringify(sessionInitToken)}
            };
            var origins = ${JSON.stringify(allowedOrigins)};
            origins.forEach(function(base) {
              try {
                window.opener.postMessage(msg, base);
                // Also try variant (www <-> non-www) to ensure target match
                if (base.includes('://www.')) {
                  window.opener.postMessage(msg, base.replace('://www.', '://'));
                } else {
                  window.opener.postMessage(msg, base.replace('://', '://www.'));
                }
              } catch (e) {}
            });
          } catch (e) { console.error('[GoogleAuth] postMessage failed:', e); }

          // Close the popup
          window.close();

          // If popup didn't close, fallback to redirect (no token in URL)
          setTimeout(function() {
            window.location.replace(${JSON.stringify(dashboardPage)} + '?oauthSuccess=1');
          }, 1000);
        } else {
          // Path 2: No opener — redirect to dashboard (cookies carry the session)
          window.location.replace(${JSON.stringify(dashboardPage)} + '?oauthSuccess=1');
        }
      })();
    `;

    res.send(`<!DOCTYPE html>
    <html lang="${lang}">
    <head><meta charset="utf-8"><title>Google Login</title></head>
    <body>
    <script nonce="${res.locals.cspNonce}">${script}</script>
    </body>
    </html>`);



  } catch (err) {
    console.error('Google OAuth error:', err);
    const errorMessage = err.message || 'Authentication failed';
    
    // Send error to the popup opener via postMessage, with fallback redirect
    const script = `
      (function() {
        try {
          if (window.opener && !window.opener.closed) {
            var msg = {
              type: 'google-auth',
              success: false,
              error: ${JSON.stringify(errorMessage)}
            };
            var origins = ${JSON.stringify(allowedOrigins)};
            origins.forEach(function(origin) { window.opener.postMessage(msg, origin); });
          }
        } catch (e) { console.error('[GoogleAuth] postMessage error failed:', e); }

        window.close();

        // Fallback: redirect to login page with error
        setTimeout(function() {
          window.location.replace(${JSON.stringify(loginPage)} + '?error=' + ${JSON.stringify(encodeURIComponent(errorMessage))});
        }, 500);
      })();
    `;

    res.send(`<!DOCTYPE html>
    <html lang="${lang}">
    <head><meta charset="utf-8"><title>Google Login Error</title></head>
    <body>
    <script nonce="${res.locals.cspNonce}">${script}</script>
    </body>
    </html>`);
  }
});

// Forgot Password - Request Reset Link
app.post('/api/auth/forgot-password', [
  body('email').isEmail().normalizeEmail()
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    if (!db) return res.status(500).json({ error: 'DB not connected' });

    const { email } = req.body;
    const user = await db.collection(usersCollectionName).findOne({ email });

    // Always return success to prevent email enumeration
    if (!user) {
      console.log(`[ForgotPassword] Email not found: ${email}`);
      return res.json({ success: true });
    }

    // Generate reset token
    const secret = process.env.JWT_SECRET;
    if (!secret) return res.status(500).json({ error: 'Server misconfiguration' });
    const resetToken = jwt.sign({ userId: user.userId, email: user.email, type: 'password-reset' }, secret, { expiresIn: '1h' });

    // Store reset token hash in DB
    await db.collection(usersCollectionName).updateOne(
      { userId: user.userId },
      { $set: { resetTokenHash: hashToken(resetToken), resetTokenExpiry: new Date(Date.now() + 3600000) } }
    );

    const baseUrl = process.env.PUBLIC_BASE_URL || 'https://mcprim.com/nfc';
    const resetLink = `${baseUrl}/reset-password.html?token=${resetToken}`;
    
    // Send email using EmailService
    try {
      const emailContent = EmailService.passwordResetEmail(user.name || 'مستخدم', resetLink);
      await EmailService.send({ to: email, subject: emailContent.subject, html: emailContent.html });
      console.log(`[ForgotPassword] Reset link sent to ${email}`);
    } catch (emailErr) {
      console.warn('[ForgotPassword] Email sending failed:', emailErr.message);
    }

    res.json({ success: true });

  } catch (err) {
    console.error('Forgot password error:', err);
    res.status(500).json({ error: 'Failed to process request' });
  }
});

// Reset Password - Set New Password
app.post('/api/auth/reset-password', authLimiter, [
  body('token').notEmpty().withMessage('Token is required'),
  body('password').isLength({ min: 6, max: 128 })
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    if (!db) return res.status(500).json({ error: 'DB not connected' });

    const { token, password } = req.body; // Token now comes from body

    // Verify token
    const secret = process.env.JWT_SECRET;
    if (!secret) return res.status(500).json({ error: 'Server misconfiguration' });
    let decoded;
    try {
      decoded = jwt.verify(token, secret);
      if (decoded.type !== 'password-reset') throw new Error('Invalid token type');
    } catch (tokenErr) {
      return res.status(400).json({ error: 'رابط غير صالح أو منتهي الصلاحية' });
    }

    // Find user and verify token hash matches
    const user = await db.collection(usersCollectionName).findOne({ 
      userId: decoded.userId, 
      resetTokenHash: hashToken(token) 
    });
    if (!user) {
      return res.status(400).json({ error: 'رابط غير صالح أو منتهي الصلاحية' });
    }

    // Check token expiry
    if (new Date() > new Date(user.resetTokenExpiry)) {
      return res.status(400).json({ error: 'انتهت صلاحية الرابط، اطلب رابطاً جديداً' });
    }

    // Hash new password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Update password and clear reset token
    await db.collection(usersCollectionName).updateOne(
      { userId: user.userId },
      { 
        $set: { password: hashedPassword }, 
        $unset: { resetTokenHash: '', resetTokenExpiry: '' } 
      }
    );

    console.log(`[ResetPassword] Password updated for user: ${user.email}`);
    res.json({ success: true });

  } catch (err) {
    console.error('Reset password error:', err);
    res.status(500).json({ error: 'Failed to reset password' });
  }
});

// Verify Email endpoint - switched to POST for better security
app.post('/api/auth/verify-email', authLimiter, async (req, res) => {
  try {
    if (!db) return res.status(500).json({ error: 'DB not connected' });

    const { token } = req.body;
    if (!token) return res.status(400).json({ error: 'Token missing' });

    // Verify token
    const secret = process.env.JWT_SECRET;
    if (!secret) return res.status(500).json({ error: 'Server misconfiguration' });
    let decoded;
    try {
      decoded = jwt.verify(token, secret);
      if (decoded.type !== 'email-verify') throw new Error('Invalid token type');
    } catch (tokenErr) {
      return res.status(400).json({ error: 'رابط التحقق غير صالح أو منتهي الصلاحية' });
    }

    // Find user and verify hashed token matches
    const user = await db.collection(usersCollectionName).findOne({ 
      userId: decoded.userId, 
      verificationTokenHash: hashToken(token) 
    });
    if (!user) {
      return res.status(400).json({ error: 'رابط التحقق غير صالح أو منتهي الصلاحية' });
    }

    // Check if already verified
    if (user.isVerified) {
      return res.json({ success: true, message: 'البريد مُتحقق مسبقاً' });
    }

    // Update user as verified
    await db.collection(usersCollectionName).updateOne(
      { userId: user.userId },
      { $set: { isVerified: true }, $unset: { verificationTokenHash: '' } }
    );

    console.log(`[VerifyEmail] Email verified for user: ${user.email}`);
    res.json({ success: true });

  } catch (err) {
    console.error('Verify email error:', err);
    res.status(500).json({ error: 'Failed to verify email' });
  }
});

// --- REFRESH TOKEN ROUTE ---
app.post('/api/auth/refresh', async (req, res) => {
  try {
    if (!db) return res.status(500).json({ error: 'DB not connected' });

    const tokenFromCookie = req.cookies?.refreshToken;
    if (!tokenFromCookie) {
      console.warn('[Refresh] No refresh token found in cookies');
      return res.status(401).json({ error: 'No refresh token provided' });
    }

    // Find user by hashed refresh token
    const hashedToken = hashToken(tokenFromCookie);
    const user = await db.collection(usersCollectionName).findOne({ refreshTokenHash: hashedToken });

    if (!user) {
      console.warn('[Refresh] Invalid refresh token: No user found for this hash');
      return res.status(403).json({ error: 'Invalid refresh token' });
    }
    console.log(`[Refresh] Refreshing session for user: ${user.email}`);

    // Rotate: generate new tokens
    const newAccessToken = createAccessToken({ userId: user.userId, email: user.email });
    const newRefreshToken = createRefreshToken();
    const newHashedRefresh = hashToken(newRefreshToken);

    // Update DB with new hashed refresh token (invalidates old one)
    await db.collection(usersCollectionName).updateOne(
      { userId: user.userId },
      { $set: { refreshTokenHash: newHashedRefresh } }
    );

    // Set new refresh token cookie
    res.cookie('refreshToken', newRefreshToken, {
      httpOnly: true,
      secure: true, // required for sameSite: 'None'
      sameSite: 'None', // allow cross-site (mcprim.com → onrender.com)
      maxAge: 7 * 24 * 60 * 60 * 1000,
      path: '/api/auth'
    });

    // Set new access token cookie
    res.cookie('accessToken', newAccessToken, {
      httpOnly: true,
      secure: true,
      sameSite: 'None',
      maxAge: 15 * 60 * 1000, // 15 minutes
      path: '/'
    });

    // SECURITY: Token is in HttpOnly cookie only — do NOT send in response body
    res.json({ success: true, user: { name: user.name, email: user.email, userId: user.userId } });

  } catch (err) {
    console.error('Token refresh error:', err);
    res.status(500).json({ error: 'Token refresh failed' });
  }
});

// --- LOGOUT ROUTE ---
app.post('/api/auth/logout', async (req, res) => {
  try {
    const tokenFromCookie = req.cookies?.refreshToken;

    if (tokenFromCookie && db) {
      // Remove refresh token from DB
      const hashedToken = hashToken(tokenFromCookie);
      await db.collection(usersCollectionName).updateOne(
        { refreshTokenHash: hashedToken },
        { $unset: { refreshTokenHash: '' } }
      );
    }

    // Clear the cookies
    res.clearCookie('refreshToken', {
      httpOnly: true,
      secure: true,
      sameSite: 'None',
      path: '/api/auth'
    });
    res.clearCookie('accessToken', {
      httpOnly: true,
      secure: true,
      sameSite: 'None',
      path: '/'
    });

    res.json({ success: true });

  } catch (err) {
    console.error('Logout error:', err);
    res.status(500).json({ error: 'Logout failed' });
  }
});

// Get current authenticated user info (used after OAuth redirect instead of URL hash)
app.get('/api/auth/me', verifyToken, async (req, res) => {
  try {
    if (!db) return res.status(500).json({ error: 'DB not connected' });
    const user = await db.collection(usersCollectionName).findOne(
      { userId: req.user.userId },
      { projection: { name: 1, email: 1, userId: 1, isVerified: 1, _id: 0 } }
    );
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json({ success: true, user });
  } catch (err) {
    console.error('Get user info error:', err);
    res.status(500).json({ error: 'Failed to get user info' });
  }
});

// Secure session initialization from a short-lived one-time code (OAuth success)
// POST /api/auth/session-init
// Exchanges a short-lived session-init token (from Google OAuth popup) for real session cookies
app.post('/api/auth/session-init', async (req, res) => {
  try {
    const { initToken } = req.body;
    if (!initToken) return res.status(400).json({ error: 'Token required' });

    const decoded = jwt.verify(initToken, process.env.JWT_SECRET);

    // Strict type check — reject any other token type
    if (decoded.type !== 'session-init') {
      return res.status(401).json({ error: 'Invalid token type' });
    }

    if (!db) return res.status(500).json({ error: 'DB not connected' });

    // Issue real session cookies
    const accessToken = createAccessToken({ userId: decoded.userId, email: decoded.email });
    const refreshTokenValue = createRefreshToken();
    const hashedRefresh = hashToken(refreshTokenValue);

    await db.collection(usersCollectionName).updateOne(
      { userId: decoded.userId },
      { $set: { refreshTokenHash: hashedRefresh } }
    );

    console.log(`[SessionInit] Session established for: ${decoded.email}`);

    res
      .cookie('accessToken', accessToken, {
        httpOnly: true, secure: true, sameSite: 'None',
        maxAge: 15 * 60 * 1000, path: '/'
      })
      .cookie('refreshToken', refreshTokenValue, {
        httpOnly: true, secure: true, sameSite: 'None',
        maxAge: 7 * 24 * 60 * 60 * 1000, path: '/api/auth'
      })
      .json({ success: true });

  } catch {
    return res.status(401).json({ error: 'Invalid or expired session token' });
  }
});

// Issue a short-lived token for WebSocket authentication
// WebSocket can't send cookies, so the client fetches this token via HTTP (with cookies),
// then sends it as the first WebSocket message
app.get('/api/auth/ws-token', verifyToken, (req, res) => {
  const wsToken = jwt.sign(
    { userId: req.user.userId, email: req.user.email, type: 'access' },
    process.env.JWT_SECRET,
    { expiresIn: '30s' } // Very short-lived — only for WebSocket handshake
  );
  res.json({ success: true, token: wsToken });
});

// Get User Profile/Designs
app.get('/api/user/designs', verifyToken, async (req, res) => {
  try {
    if (!db) return res.status(500).json({ error: 'DB not connected' });

    const designs = await db.collection(designsCollectionName)
      .find({ ownerId: req.user.userId })
      .project({
        'data.inputs.input-name_ar': 1,
        'data.inputs.input-name_en': 1,
        'data.inputs.input-name': 1,
        'shortId': 1,
        'createdAt': 1,
        'views': 1,
        'data.imageUrls.front': 1,
        'data.imageUrls.capturedFront': 1
      })
      .sort({ createdAt: -1 })
      .toArray();

    res.json({ success: true, designs });
  } catch (err) {
    console.error('Get user designs error:', err);
    res.status(500).json({ error: 'Failed to fetch designs' });
  }
});

// Delete a user's design
app.delete('/api/user/designs/:id', verifyToken, async (req, res) => {
  try {
    if (!db) return res.status(500).json({ error: 'DB not connected' });

    const shortId = String(req.params.id);
    const design = await db.collection(designsCollectionName).findOne({ shortId });

    if (!design) {
      return res.status(404).json({ error: 'التصميم غير موجود / Design not found' });
    }

    if (design.ownerId !== req.user.userId) {
      return res.status(403).json({ error: 'لا يمكنك حذف هذا التصميم / You cannot delete this design' });
    }

    await db.collection(designsCollectionName).deleteOne({ shortId });

    res.json({ success: true, message: 'تم حذف التصميم بنجاح / Design deleted successfully' });
  } catch (err) {
    console.error('Delete design error:', err);
    res.status(500).json({ error: 'فشل حذف التصميم / Failed to delete design' });
  }
});

// ===== CARD SAVE WITH CONSENT FEATURE =====

// Get card privacy setting
app.get('/api/card-privacy', verifyToken, async (req, res) => {
  try {
    if (!db) return res.status(500).json({ error: 'DB not connected' });
    const user = await db.collection(usersCollectionName).findOne(
      { userId: req.user.userId },
      { projection: { cardPrivacy: 1 } }
    );
    res.json({ success: true, cardPrivacy: user?.cardPrivacy || 'require_approval' });
  } catch (err) {
    console.error('Get card privacy error:', err);
    res.status(500).json({ error: 'Failed to get privacy setting' });
  }
});

// Update card privacy setting
app.put('/api/card-privacy', verifyToken, async (req, res) => {
  try {
    if (!db) return res.status(500).json({ error: 'DB not connected' });
    const { cardPrivacy } = req.body;
    if (!['allow_all', 'require_approval', 'deny_all'].includes(cardPrivacy)) {
      return res.status(400).json({ error: 'Invalid privacy setting' });
    }
    await db.collection(usersCollectionName).updateOne(
      { userId: req.user.userId },
      { $set: { cardPrivacy } }
    );
    res.json({ success: true });
  } catch (err) {
    console.error('Update card privacy error:', err);
    res.status(500).json({ error: 'Failed to update privacy setting' });
  }
});

// Request to save someone's card
app.post('/api/save-card/:designId', verifyToken, async (req, res) => {
  try {
    if (!db) return res.status(500).json({ error: 'DB not connected' });
    const designId = String(req.params.designId);
    const requesterId = req.user.userId;

    // Find the design
    const design = await db.collection(designsCollectionName).findOne({ shortId: designId });
    if (!design) return res.status(404).json({ error: 'Design not found' });

    // Can't save your own card
    if (design.ownerId === requesterId) {
      return res.status(400).json({ error: 'Cannot save your own card' });
    }

    // Check if already saved
    const existing = await db.collection(savedCardsCollectionName).findOne({
      userId: requesterId, designShortId: designId
    });
    if (existing) return res.json({ success: true, status: 'already_saved' });

    // Check if request already pending
    const pendingRequest = await db.collection(cardRequestsCollectionName).findOne({
      requesterId, designShortId: designId, status: 'pending'
    });
    if (pendingRequest) return res.json({ success: true, status: 'already_requested' });

    // Get owner's privacy setting
    let ownerPrivacy = 'require_approval';
    if (design.ownerId) {
      const owner = await db.collection(usersCollectionName).findOne(
        { userId: design.ownerId },
        { projection: { cardPrivacy: 1, email: 1, name: 1 } }
      );
      ownerPrivacy = owner?.cardPrivacy || 'require_approval';
    }

    // Get requester info
    const requester = await db.collection(usersCollectionName).findOne(
      { userId: requesterId },
      { projection: { name: 1, email: 1 } }
    );

    const cardName = design.data?.inputs?.['input-name_ar'] || design.data?.inputs?.['input-name_en'] || 'بطاقة';

    if (ownerPrivacy === 'deny_all') {
      return res.status(403).json({ error: 'Card owner does not allow saving', status: 'denied' });
    }

    if (ownerPrivacy === 'allow_all' || !design.ownerId) {
      // Save directly
      await db.collection(savedCardsCollectionName).insertOne({
        userId: requesterId,
        designShortId: designId,
        ownerName: cardName,
        cardThumb: design.data?.imageUrls?.front || null,
        savedAt: new Date()
      });
      return res.json({ success: true, status: 'saved' });
    }

    // require_approval: create a request
    await db.collection(cardRequestsCollectionName).insertOne({
      requesterId,
      requesterName: requester?.name || 'مستخدم',
      requesterEmail: requester?.email || '',
      designShortId: designId,
      cardName,
      cardThumb: design.data?.imageUrls?.front || null,
      ownerUserId: design.ownerId,
      status: 'pending',
      createdAt: new Date()
    });

    // Send email notification to owner
    if (owner && owner.email) {
      const link = 'https://mcprim.com/nfc/dashboard.html?tab=card-requests'; // Or dynamic host
      const emailContent = EmailService.cardRequestEmail(
        owner.name || 'مستخدم',
        requester?.name || 'مستخدم',
        cardName,
        link
      );
      // Fire and forget (don't await to avoid delaying response)
      EmailService.send({
        to: owner.email,
        subject: emailContent.subject,
        html: emailContent.html
      }).catch(err => console.error('Failed to send request email:', err));
    }

    res.json({ success: true, status: 'requested' });
  } catch (err) {
    console.error('Save card error:', err);
    res.status(500).json({ error: 'Failed to process save request' });
  }
});

// Get user's saved cards
app.get('/api/saved-cards', verifyToken, async (req, res) => {
  try {
    if (!db) return res.status(500).json({ error: 'DB not connected' });
    const savedCards = await db.collection(savedCardsCollectionName)
      .find({ userId: req.user.userId })
      .sort({ savedAt: -1 })
      .toArray();
    res.json({ success: true, savedCards });
  } catch (err) {
    console.error('Get saved cards error:', err);
    res.status(500).json({ error: 'Failed to fetch saved cards' });
  }
});

// Remove a saved card
app.delete('/api/saved-cards/:designId', verifyToken, async (req, res) => {
  try {
    if (!db) return res.status(500).json({ error: 'DB not connected' });
    await db.collection(savedCardsCollectionName).deleteOne({
      userId: req.user.userId,
      designShortId: String(req.params.designId)
    });
    res.json({ success: true });
  } catch (err) {
    console.error('Delete saved card error:', err);
    res.status(500).json({ error: 'Failed to remove saved card' });
  }
});

// Get pending card requests count (for badge)
app.get('/api/card-requests/count', verifyToken, async (req, res) => {
  try {
    if (!db) return res.status(500).json({ error: 'DB not connected' });
    const count = await db.collection(cardRequestsCollectionName).countDocuments({
      ownerUserId: req.user.userId,
      status: 'pending'
    });
    res.json({ success: true, count });
  } catch (err) {
    console.error('Get card requests count error:', err);
    res.status(500).json({ error: 'Failed to get request count' });
  }
});

// Get card requests for card owner
app.get('/api/card-requests', verifyToken, async (req, res) => {
  try {
    if (!db) return res.status(500).json({ error: 'DB not connected' });
    const requests = await db.collection(cardRequestsCollectionName)
      .find({ ownerUserId: req.user.userId })
      .sort({ createdAt: -1 })
      .toArray();
    res.json({ success: true, requests });
  } catch (err) {
    console.error('Get card requests error:', err);
    res.status(500).json({ error: 'Failed to fetch requests' });
  }
});

// Approve or reject a card request
app.put('/api/card-requests/:requestId', verifyToken, async (req, res) => {
  try {
    if (!db) return res.status(500).json({ error: 'DB not connected' });
    const { ObjectId } = require('mongodb');
    const requestId = req.params.requestId;
    const { action } = req.body; // 'approve' or 'reject'

    if (!['approve', 'reject'].includes(action)) {
      return res.status(400).json({ error: 'Invalid action' });
    }

    const request = await db.collection(cardRequestsCollectionName).findOne({
      _id: new ObjectId(requestId),
      ownerUserId: req.user.userId
    });

    if (!request) return res.status(404).json({ error: 'Request not found' });
    if (request.status !== 'pending') return res.status(400).json({ error: 'Request already processed' });

    // Update request status
    await db.collection(cardRequestsCollectionName).updateOne(
      { _id: new ObjectId(requestId) },
      { $set: { status: action === 'approve' ? 'approved' : 'rejected', processedAt: new Date() } }
    );

    // If approved, add to saved cards
    if (action === 'approve') {
      try {
        await db.collection(savedCardsCollectionName).insertOne({
          userId: request.requesterId,
          designShortId: request.designShortId,
          ownerName: request.cardName,
          cardThumb: request.cardThumb,
          savedAt: new Date()
        });
      } catch (dupErr) {
        // Already saved, ignore duplicate key error
        if (dupErr.code !== 11000) throw dupErr;
      }
    }

    res.json({ success: true });
  } catch (err) {
    console.error('Process card request error:', err);
    res.status(500).json({ error: 'Failed to process request' });
  }
});

// Get design owner info (for viewer save button)
app.get('/api/design-owner/:designId', async (req, res) => {
  try {
    if (!db) return res.status(500).json({ error: 'DB not connected' });
    const designId = String(req.params.designId);
    const design = await db.collection(designsCollectionName).findOne(
      { shortId: designId },
      { projection: { ownerId: 1 } }
    );
    if (!design) return res.status(404).json({ error: 'Design not found' });

    let cardPrivacy = 'require_approval';
    if (design.ownerId) {
      const owner = await db.collection(usersCollectionName).findOne(
        { userId: design.ownerId },
        { projection: { cardPrivacy: 1 } }
      );
      cardPrivacy = owner?.cardPrivacy || 'require_approval';
    }

    res.json({
      success: true,
      ownerId: design.ownerId || null,
      cardPrivacy
    });
  } catch (err) {
    console.error('Get design owner error:', err);
    res.status(500).json({ error: 'Failed to get design info' });
  }
});

app.get('/api/get-design/:id', async (req, res) => {
  try {
    if (!db) return res.status(500).json({ error: 'DB not connected' });
    const id = String(req.params.id);
    // SECURITY: Use projection to return only public design data, exclude internal fields
    const doc = await db.collection(designsCollectionName).findOne(
      { shortId: id },
      { projection: {
        'data.inputs': 1,
        'data.dynamic': 1,
        'data.imageUrls': 1,
        'data.template': 1,
        'data.cardBack': 1,
        'data.elements': 1,
        'data.sharedToGallery': 1,
        'data.cardFrontBg': 1,
        'data.cardBackBg': 1,
        'data.layout': 1,
        'data.currentLanguage': 1,
        '_id': 0
      }}
    );
    if (!doc || !doc.data) return res.status(404).json({ error: 'Design not found or data missing' });

    res.json(doc.data);
  } catch (e) {
    console.error('Get design error:', e);
    if (!res.headersSent) {
      res.status(500).json({ error: 'Fetch failed' });
    }
  }
});

// Get Card Statistics
// SECURITY: Card stats require authentication and ownership verification
app.get('/api/card-stats/:id', verifyToken, async (req, res) => {
  try {
    if (!db) return res.status(500).json({ error: 'DB not connected' });
    const id = String(req.params.id);
    const doc = await db.collection(designsCollectionName).findOne(
      { shortId: id },
      { projection: { views: 1, createdAt: 1, lastModified: 1, shortId: 1, ownerId: 1 } }
    );

    if (!doc) return res.status(404).json({ error: 'Design not found' });

    // Verify ownership — only the card owner can see detailed stats
    if (doc.ownerId && doc.ownerId !== req.user.userId) {
      return res.status(403).json({ error: 'Access denied: you do not own this design' });
    }

    res.json({
      success: true,
      stats: {
        id: doc.shortId,
        views: doc.views || 0,
        createdAt: doc.createdAt,
        lastModified: doc.lastModified
      }
    });
  } catch (e) {
    console.error('Get card stats error:', e);
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
});

// START: NEW GALLERY API ENDPOINT
app.get('/api/gallery', async (req, res) => {
  try {
    if (!db) return res.status(500).json({ error: 'Database not connected' });

    const page = parseInt(req.query.page, 10) || 1;
    const limit = 20; // 5 columns * 4 rows
    const skip = (page - 1) * limit;
    const sortBy = req.query.sortBy || 'createdAt';
    const searchTerm = req.query.search ? String(req.query.search).trim() : '';

    // Build search query - only show designs shared to gallery
    const query = { 'data.sharedToGallery': true };
    if (searchTerm) {
      const escaped = searchTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const regex = new RegExp(escaped, 'i'); // Case-insensitive search (escaped)
      query['$or'] = [
        { 'data.inputs.input-name_ar': regex },
        { 'data.inputs.input-name_en': regex },
        { 'data.inputs.input-tagline_ar': regex },
        { 'data.inputs.input-tagline_en': regex }
      ];
    }

    // Build sort options
    const sortOptions = {};
    if (sortBy === 'views') {
      sortOptions.views = -1; // Descending
    } else {
      sortOptions.createdAt = -1; // Default to newest
    }

    // Get total count for pagination
    const totalDesigns = await db.collection(designsCollectionName).countDocuments(query);
    const totalPages = Math.ceil(totalDesigns / limit);

    // Fetch paginated designs with projection
    const designs = await db.collection(designsCollectionName)
      .find(query)
      .project({
        'data.inputs.input-name_ar': 1,
        'data.inputs.input-name_en': 1,
        'data.inputs.input-tagline_ar': 1,
        'data.inputs.input-tagline_en': 1,
        'data.imageUrls.capturedFront': 1,
        'data.imageUrls.front': 1,
        'shortId': 1,
        'createdAt': 1,
        'views': 1
      })
      .sort(sortOptions)
      .skip(skip)
      .limit(limit)
      .toArray();

    res.json({
      success: true,
      designs,
      pagination: {
        page,
        totalPages,
        totalDesigns
      }
    });

  } catch (e) {
    console.error('Gallery fetch error:', e);
    res.status(500).json({ success: false, error: 'Failed to fetch gallery designs' });
  }
});
// END: NEW GALLERY API ENDPOINT

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
    const staticPages = ['/nfc/', '/nfc/gallery', '/nfc/blog', '/nfc/privacy'];
    const blogPosts = [];
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

app.get('/healthz', (req, res) => {
  if (db && db.client.topology && db.client.topology.isConnected()) {
    res.json({ ok: true, db_status: 'connected' });
  } else {
    res.status(500).json({ ok: false, db_status: 'disconnected' });
  }
});

app.get(['/nfc/editor', '/nfc/editor.html'], (req, res) => {
  if (req.useragent.isMobile) {
    res.sendFile(path.join(rootDir, 'editor-mobile.html'));
  } else {
    res.sendFile(path.join(rootDir, 'editor.html'));
  }
});

// --- STATIC FILE HANDLER ---
app.use('/nfc', express.static(rootDir, { extensions: ['html'] }));

// --- GENERAL ERROR HANDLER ---
app.use((err, req, res, next) => {
  console.error("Unhandled error:", err.stack || err);
  const statusCode = err.status || 500;
  const message = process.env.NODE_ENV === 'production' ? 'Internal Server Error' : err.message;
  if (!res.headersSent) {
    res.status(statusCode).json({ error: message });
  }
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

wss.on('connection', (ws, req) => {
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
      const data = JSON.parse(message.toString());
      if (data.type === 'auth' && data.token) {
        jwt.verify(data.token, secret);
        authenticated = true;
        clearTimeout(authTimeout);

        // Join the room after successful authentication
        if (!rooms.has(collabId)) {
          rooms.set(collabId, new Set());
        }
        const room = rooms.get(collabId);
        room.add(ws);

        console.log(`Client authenticated and joined room: ${collabId}. Room size: ${room.size}`);
        ws.send(JSON.stringify({ type: 'auth', success: true }));

        // Now register the normal message handler for collaboration
        ws.on('message', (msg) => {
          try {
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
