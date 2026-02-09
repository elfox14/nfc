// server.js (الكود الكامل والنهائي مع ميزة التحرير الجماعي)

require('dotenv').config();
const express = require('express');
const compression = require('compression');
const { MongoClient } = require('mongodb');
const path = require('path');
const cors = require('cors');
const fs = require('fs');
const rateLimit = require('express-rate-limit');
const { nanoid } = require('nanoid');
const { body, validationResult } = require('express-validator');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const verifyToken = require('./auth-middleware');
const EmailService = require('./email-service');
const { JSDOM } = require('jsdom');
const DOMPurifyFactory = require('dompurify');
const multer = require('multer');
const sharp = require('sharp');
const ejs = require('ejs');
const helmet = require('helmet');
const useragent = require('express-useragent');
const http = require('http'); // **جديد: استيراد http**
const { WebSocketServer } = require('ws'); // **جديد: استيراد WebSocketServer**
const url = require('url'); // **جديد: استيراد url**

const window = (new JSDOM('')).window;
const DOMPurify = DOMPurifyFactory(window);

const app = express();

// --- START: MIDDLEWARE SETUP ---
app.use(compression());
app.use(useragent.express());

const port = process.env.PORT || 3000;
app.set('trust proxy', 1);
app.disable('x-powered-by');

// --- START: SECURITY HEADERS (HELMET) ---
app.use(helmet.frameguard({ action: 'deny' }));
app.use(helmet.xssFilter());
app.use(helmet.noSniff());
app.use(helmet.hsts({ maxAge: 31536000, includeSubDomains: true, preload: true }));
app.use(helmet.contentSecurityPolicy({
  directives: {
    defaultSrc: ["'self'"],
    scriptSrc: ["'self'", "'unsafe-inline'", "https://cdnjs.cloudflare.com", "https://cdn.jsdelivr.net", "https://www.youtube.com"],
    styleSrc: ["'self'", "'unsafe-inline'", "https://cdnjs.cloudflare.com", "https://fonts.googleapis.com"],
    fontSrc: ["'self'", "https://fonts.gstatic.com"],
    imgSrc: ["'self'", "data:", "https:", "https://i.imgur.com", "https://www.mcprim.com", "https://media.giphy.com", "https://nfc-vjy6.onrender.com"],
    mediaSrc: ["'self'", "data:"],
    frameSrc: ["'self'", "https://www.youtube.com"],
    connectSrc: ["'self'", "https://cdnjs.cloudflare.com", "https://cdn.jsdelivr.net", "https://www.youtube.com", "https://www.mcprim.com", "https://media.giphy.com", "https://nfc-vjy6.onrender.com", "ws:", "wss:"], // **جديد: السماح باتصالات WebSocket**
    objectSrc: ["'none'"],
    upgradeInsecureRequests: [],
  },
}));
// --- END: SECURITY HEADERS (HELMET) ---

app.use(cors({
  origin: true, // Allow all origins (for development)
  credentials: true
}));
app.use(express.json({ limit: '10mb' }));
app.set('view engine', 'ejs');

// --- DATABASE CONNECTION ---
const mongoUrl = process.env.MONGO_URI;
const dbName = process.env.MONGO_DB || 'nfc_db';
const designsCollectionName = process.env.MONGO_DESIGNS_COLL || 'designs';
const usersCollectionName = 'users'; // New Users Collection
const backgroundsCollectionName = process.env.MONGO_BACKGROUNDS_COLL || 'backgrounds';
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
      console.log('MongoDB indexes created');
    } catch (indexErr) {
      console.warn('Some indexes may already exist:', indexErr.message);
    }
  })
  .catch(err => { console.error('Mongo connect error', err); process.exit(1); });

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

const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (file.mimetype && file.mimetype.startsWith('image/')) {
      const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml'];
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
  if (!expected || expected !== provided) {
    res.status(401).json({ error: 'Unauthorized' });
    return false;
  }
  return true;
}

app.post('/api/upload-image', upload.single('image'), handleMulterErrors, async (req, res) => {
  try {
    if (!req.file) {
      if (!res.headersSent) {
        return res.status(400).json({ error: 'لم يتم تقديم أي ملف صورة.' });
      }
      return;
    }

    const filename = nanoid(10) + '.webp';
    const out = path.join(uploadDir, filename);
    await sharp(req.file.buffer)
      .resize({ width: 2560, height: 2560, fit: 'inside', withoutEnlargement: true })
      .webp({ quality: 85 })
      .toFile(out);

    const base = absoluteBaseUrl(req);
    return res.json({ success: true, url: `${base}/uploads/${filename}` });

  } catch (e) {
    console.error('Image upload processing error:', e);
    if (!res.headersSent) {
      return res.status(500).json({ error: 'فشل معالجة الصورة بعد الرفع.' });
    }
  }
});

app.post('/api/save-design', async (req, res) => {
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
        const secret = process.env.JWT_SECRET || 'default_jwt_secret_change_me';
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

// --- AUTHENTICATION ROUTES ---

// Register
app.post('/api/auth/register', [
  body('email').isEmail().normalizeEmail(),
  body('password').isLength({ min: 6 }),
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
    const secret = process.env.JWT_SECRET || 'default_jwt_secret_change_me';
    const verificationToken = jwt.sign({ userId, email, type: 'email-verify' }, secret, { expiresIn: '24h' });

    // Store verification token
    await db.collection(usersCollectionName).updateOne(
      { userId },
      { $set: { verificationToken } }
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

    // Generate login token
    const token = jwt.sign({ userId, email }, secret, { expiresIn: '7d' });

    res.status(201).json({ success: true, token, user: { name, email, userId, isVerified: false } });

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
  body('password').exists()
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    if (!db) return res.status(500).json({ error: 'DB not connected' });

    const { email, password } = req.body;

    const user = await db.collection(usersCollectionName).findOne({ email });
    if (!user) {
      return res.status(400).json({ error: 'Invalid credentials' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ error: 'Invalid credentials' });
    }

    const secret = process.env.JWT_SECRET || 'default_jwt_secret_change_me';
    const token = jwt.sign({ userId: user.userId, email: user.email }, secret, { expiresIn: '7d' });

    res.json({ success: true, token, user: { name: user.name, email: user.email, userId: user.userId } });

  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Login failed' });
  }
});

// Google OAuth - Initiate Flow
app.get('/api/auth/google', (req, res) => {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  if (!clientId) {
    return res.status(500).send('Google OAuth not configured');
  }

  // Use dynamic host for redirect URI to support both localhost and production
  const proto = req.headers['x-forwarded-proto'] || req.protocol;
  const host = req.get('host');
  const redirectUri = `${proto}://${host}/api/auth/google/callback`;

  console.log('------------------------------------------------');
  console.log('DEBUG: Google OAuth Redirect URI:', redirectUri);
  console.log('DEBUG: Please ensure this EXACT URL is added to Authorized redirect URIs in Google Cloud Console');
  console.log('------------------------------------------------');

  const scope = 'email profile';
  const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&scope=${encodeURIComponent(scope)}&access_type=offline&prompt=consent`;

  res.redirect(authUrl);
});

// Google OAuth - Callback Handler
app.get('/api/auth/google/callback', async (req, res) => {
  const { code, error } = req.query;

  if (error || !code) {
    return res.send(`
      <script>
        window.opener.postMessage({ type: 'google-auth', success: false, error: '${error || 'Authorization failed'}' }, '*');
        window.close();
      </script>
    `);
  }

  try {
    const clientId = process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
    // Use dynamic host for redirect URI to support both localhost and production
    const proto = req.headers['x-forwarded-proto'] || req.protocol;
    const host = req.get('host');
    const redirectUri = `${proto}://${host}/api/auth/google/callback`;

    // Exchange code for tokens
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code'
      })
    });

    const tokens = await tokenResponse.json();
    if (!tokens.access_token) throw new Error('No access token');

    // Get user info
    const userInfoResponse = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: { Authorization: `Bearer ${tokens.access_token}` }
    });
    const googleUser = await userInfoResponse.json();

    if (!googleUser.email) throw new Error('No email from Google');

    // Find or create user
    let user = await db.collection(usersCollectionName).findOne({ email: googleUser.email });

    if (!user) {
      // Create new user
      const userId = nanoid(10);
      await db.collection(usersCollectionName).insertOne({
        userId,
        email: googleUser.email,
        name: googleUser.name || googleUser.email.split('@')[0],
        googleId: googleUser.id,
        isVerified: true, // Google accounts are pre-verified
        createdAt: new Date()
      });
      user = { userId, email: googleUser.email, name: googleUser.name };
    }

    // Generate JWT
    const secret = process.env.JWT_SECRET || 'default_jwt_secret_change_me';
    const jwtToken = jwt.sign({ userId: user.userId, email: user.email }, secret, { expiresIn: '7d' });

    // Send success back to opener
    res.send(`
      <script>
        window.opener.postMessage({
          type: 'google-auth',
          success: true,
          token: '${jwtToken}',
          user: ${JSON.stringify({ name: user.name, email: user.email, userId: user.userId })}
        }, '*');
        window.close();
      </script>
    `);

  } catch (err) {
    console.error('Google OAuth error:', err);
    res.send(`
      <script>
        window.opener.postMessage({ type: 'google-auth', success: false, error: 'Authentication failed' }, '*');
        window.close();
      </script>
    `);
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
    const secret = process.env.JWT_SECRET || 'default_jwt_secret_change_me';
    const resetToken = jwt.sign({ userId: user.userId, email: user.email, type: 'password-reset' }, secret, { expiresIn: '1h' });

    // Store reset token in DB
    await db.collection(usersCollectionName).updateOne(
      { userId: user.userId },
      { $set: { resetToken, resetTokenExpiry: new Date(Date.now() + 3600000) } }
    );

    // TODO: Send email with reset link
    // For now, log the reset link (in production, use email service)
    const baseUrl = process.env.PUBLIC_BASE_URL || 'https://mcprim.com/nfc';
    const resetLink = `${baseUrl}/reset-password.html?token=${resetToken}`;
    console.log(`[ForgotPassword] Reset link for ${email}: ${resetLink}`);

    res.json({ success: true });

  } catch (err) {
    console.error('Forgot password error:', err);
    res.status(500).json({ error: 'Failed to process request' });
  }
});

// Reset Password - Set New Password
app.post('/api/auth/reset-password/:token', [
  body('password').isLength({ min: 6 })
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    if (!db) return res.status(500).json({ error: 'DB not connected' });

    const { token } = req.params;
    const { password } = req.body;

    // Verify token
    const secret = process.env.JWT_SECRET || 'default_jwt_secret_change_me';
    let decoded;
    try {
      decoded = jwt.verify(token, secret);
      if (decoded.type !== 'password-reset') throw new Error('Invalid token type');
    } catch (tokenErr) {
      return res.status(400).json({ error: 'رابط غير صالح أو منتهي الصلاحية' });
    }

    // Find user and verify token matches
    const user = await db.collection(usersCollectionName).findOne({ userId: decoded.userId, resetToken: token });
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
      { $set: { password: hashedPassword }, $unset: { resetToken: '', resetTokenExpiry: '' } }
    );

    console.log(`[ResetPassword] Password updated for user: ${user.email}`);
    res.json({ success: true });

  } catch (err) {
    console.error('Reset password error:', err);
    res.status(500).json({ error: 'Failed to reset password' });
  }
});

// Verify Email
app.get('/api/auth/verify-email/:token', async (req, res) => {
  try {
    if (!db) return res.status(500).json({ error: 'DB not connected' });

    const { token } = req.params;

    // Verify token
    const secret = process.env.JWT_SECRET || 'default_jwt_secret_change_me';
    let decoded;
    try {
      decoded = jwt.verify(token, secret);
      if (decoded.type !== 'email-verify') throw new Error('Invalid token type');
    } catch (tokenErr) {
      return res.status(400).json({ error: 'رابط التحقق غير صالح أو منتهي الصلاحية' });
    }

    // Find user and verify token matches
    const user = await db.collection(usersCollectionName).findOne({ userId: decoded.userId, verificationToken: token });
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
      { $set: { isVerified: true }, $unset: { verificationToken: '' } }
    );

    console.log(`[VerifyEmail] Email verified for user: ${user.email}`);
    res.json({ success: true });

  } catch (err) {
    console.error('Verify email error:', err);
    res.status(500).json({ error: 'Failed to verify email' });
  }
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
        'shortId': 1,
        'createdAt': 1,
        'views': 1,
        'data.imageUrls.front': 1
      })
      .sort({ createdAt: -1 })
      .toArray();

    res.json({ success: true, designs });
  } catch (err) {
    console.error('Get user designs error:', err);
    res.status(500).json({ error: 'Failed to fetch designs' });
  }
});

app.get('/api/get-design/:id', async (req, res) => {
  try {
    if (!db) return res.status(500).json({ error: 'DB not connected' });
    const id = String(req.params.id);
    const doc = await db.collection(designsCollectionName).findOne({ shortId: id });
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
app.get('/api/card-stats/:id', async (req, res) => {
  try {
    if (!db) return res.status(500).json({ error: 'DB not connected' });
    const id = String(req.params.id);
    const doc = await db.collection(designsCollectionName).findOne(
      { shortId: id },
      { projection: { views: 1, createdAt: 1, lastModified: 1, shortId: 1 } }
    );

    if (!doc) return res.status(404).json({ error: 'Design not found' });

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

    // Build search query
    const query = {};
    if (searchTerm) {
      const regex = new RegExp(searchTerm, 'i'); // Case-insensitive search
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
      const docs = await db.collection(designsCollectionName)
        .find({})
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
  // 4. استخراج `collabId` من رابط الاتصال
  const parameters = new url.URL(req.url, `ws://${req.headers.host}`).searchParams;
  const collabId = parameters.get('collabId');

  if (!collabId) {
    console.log('Connection rejected: No collabId provided.');
    ws.close(1008, 'collabId is required');
    return;
  }

  // 5. الانضمام إلى الغرفة
  if (!rooms.has(collabId)) {
    rooms.set(collabId, new Set());
  }
  const room = rooms.get(collabId);
  room.add(ws);

  console.log(`Client connected to room: ${collabId}. Room size: ${room.size}`);

  // 6. التعامل مع الرسائل الواردة من العميل
  ws.on('message', (message) => {
    try {
      // بث الرسالة (حالة التصميم الجديدة) إلى جميع العملاء الآخرين في نفس الغرفة
      room.forEach(client => {
        if (client !== ws && client.readyState === ws.OPEN) {
          client.send(message.toString());
        }
      });
    } catch (error) {
      console.error('Error broadcasting message:', error);
    }
  });

  // 7. التعامل مع انقطاع الاتصال (تنظيف)
  ws.on('close', () => {
    if (room) {
      room.delete(ws);
      console.log(`Client disconnected from room: ${collabId}. Room size: ${room.size}`);
      // إذا كانت الغرفة فارغة، قم بإزالتها لتوفير الذاكرة
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

// =================================================================
// === END: WEBSOCKET SERVER                                     ===
// =================================================================


// --- START SERVER (تغيير app.listen إلى server.listen) ---
server.listen(port, () => {
  console.log(`Server running on port: ${port}`);
  console.log('WebSocket server is also running.');
});
