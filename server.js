// server.js - مدمج مع تحسينات الأمان و WebSocket
require('dotenv').config();

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

// لو أعددت الملف utils/field-encryption.js استخدمه عند الحاجة
let encrypt, decrypt;
try {
  ({ encrypt, decrypt } = require('./utils/field-encryption'));
} catch (e) {
  // إن لم يكن موجوداً فلا نكسر التطبيق — لكن من الأفضل إضافته في الإنتاج
  encrypt = (v) => v;
  decrypt = (v) => v;
  console.warn('Field encryption util not found — sensitive-field encryption will be skipped unless utils/field-encryption.js is added.');
}

// استخدم middleware auth الموجود في middleware/auth-middleware.js
const verifyToken = require('./auth-middleware');

const window = (new JSDOM('')).window;
const DOMPurify = DOMPurifyFactory(window);

const app = express();

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

// Helmet - رؤوس أمان HTTP (نطبق CSP مفصّل يدعم WebSocket كما في كودك)
app.use(helmet({
  // إعدادات عامة من helmet
}));

// CSP مفصل كما كان لديك سابقاً (يتضمن ws: و wss:)
app.use(helmet.contentSecurityPolicy({
  directives: {
    defaultSrc: ["'self'"],
    scriptSrc: ["'self'", "'unsafe-inline'", "https://cdnjs.cloudflare.com", "https://cdn.jsdelivr.net", "https://www.youtube.com"],
    styleSrc: ["'self'", "'unsafe-inline'", "https://cdnjs.cloudflare.com", "https://fonts.googleapis.com"],
    fontSrc: ["'self'", "https://fonts.gstatic.com"],
    imgSrc: ["'self'", "data:", "https:", "https://i.imgur.com", "https://www.mcprim.com", "https://media.giphy.com", "https://nfc-vjy6.onrender.com"],
    mediaSrc: ["'self'", "data:"],
    frameSrc: ["'self'", "https://www.youtube.com"],
    connectSrc: ["'self'", "https://cdnjs.cloudflare.com", "https://cdn.jsdelivr.net", "https://www.youtube.com", "https://www.mcprim.com", "https://media.giphy.com", "https://nfc-vjy6.onrender.com", "ws:", "wss:"],
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
  allowedHeaders: ['Content-Type', 'Authorization']
};
app.use(cors(corsOptions));

// Rate limiting عام لمسارات /api
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: 'Too many requests from this IP, please try again after 15 minutes'
});
app.use('/api/', apiLimiter);

// Rate limiting خاص لمصادقة المستخدمين (أكثر صرامة)
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: 'محاولات دخول/تسجيل كثيرة جداً، الرجاء الانتظار قليلاً. / Too many auth attempts, please try again later.'
});
app.use('/api/auth/', authLimiter);

// Rate limiting خاص لرفع الملفات تجنباً لاستنزاف مساحة التخزين أو الباندويث
const uploadLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  message: 'عمليات رفع كثيرة جداً، الرجاء المحاولة لاحقاً. / Too many upload attempts, please try again later.'
});
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

let db;
MongoClient.connect(mongoUrl, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(async client => {
    db = client.db(dbName);
    console.log('MongoDB connected');

    try {
      await db.collection(designsCollectionName).createIndex({ shortId: 1 }, { unique: true });
      await db.collection(designsCollectionName).createIndex({ ownerId: 1 });
      await db.collection(designsCollectionName).createIndex({ createdAt: -1 });
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

    res.render(path.join(__dirname, 'viewer.ejs'), {
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

// Image upload route (كما كان لديك)
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

    const filename = nanoid(10) + '.webp';
    const out = path.join(uploadDir, filename);
    fs.writeFileSync(out, processedBuffer);

    const base = absoluteBaseUrl(req);
    console.log('[Upload] Image saved locally (fallback):', filename);
    return res.json({ success: true, url: `${base}/uploads/${filename}` });

  } catch (e) {
    console.error('Image upload processing error:', e);
    if (!res.headersSent) {
      return res.status(500).json({ error: 'فشل معالجة الصورة بعد الرفع.' });
    }
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
      sameSite: 'Strict',
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
      sameSite: 'Strict',
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
      sameSite: 'Strict',
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
      sameSite: 'Strict',
      path: '/api/auth'
    });

    res.json({ success: true });
  } catch (err) {
    console.error('Logout error:', err);
    res.status(500).json({ error: 'Logout failed' });
  }
});

// --- بقية مسارات الـ auth (forgot/reset/verify) كذلك كما في كودك الأصلي ---
// (لقد أبقيت المسارات كما هي في ملفك الأصلي - لم أغيرها عدا استخدام encrypt عند الحاجة)
// .. بقية الشيفرة موجودة (forgot-password, reset-password, verify-email, user/designs, card privacy, save-card, saved-cards, card-requests, gallery, robots, sitemap, healthz etc.)
// (لأجل الإيجاز لم أعِد تكرار كامل الشيفرة هنا لأنك زودتني بها بالكامل — إن رغبت أدرجتها كاملة)

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
server.listen(port, () => {
  console.log(`Server running on port: ${port}`);
  console.log('WebSocket server is also running.');
});