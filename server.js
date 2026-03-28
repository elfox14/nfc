// server.js (الكود الكامل والنهائي مع ميزة التحرير الجماعي)
require('dotenv').config();
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
const window = (new JSDOM('')).window;
const DOMPurify = DOMPurifyFactory(window);
const app = express();
// --- START: MIDDLEWARE SETUP ---
app.use(compression());
app.use(useragent.express());
const port = process.env.PORT || 3000;
app.set('trust proxy', process.env.TRUST_PROXY === 'true' ? 1 : 0);
app.disable('x-powered-by');
// --- START: SECURITY HEADERS (HELMET) ---
app.use(helmet.frameguard({ action: 'deny' }));
app.use(helmet.xssFilter());
app.use(helmet.noSniff());
app.use(helmet.hsts({ maxAge: 31536000, includeSubDomains: true, preload: true }));
// CSP nonce middleware
app.use((req, res, next) => {
  res.locals.cspNonce = crypto.randomBytes(16).toString('base64');
  next();
});
// ✅ Read internal server URL from environment variable
const INTERNAL_SERVER_URL = process.env.INTERNAL_SERVER_URL || '';
app.use(helmet.contentSecurityPolicy({
  directives: {
    defaultSrc: ["'self'"],
    scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'", (req, res) => `'nonce-${res.locals.cspNonce}'`, "https://cdnjs.cloudflare.com", "https://cdn.jsdelivr.net", "https://www.youtube.com", "https://www.googletagmanager.com", "https://accounts.google.com"],
    styleSrc: ["'self'", "'unsafe-inline'", "https://cdnjs.cloudflare.com", "https://fonts.googleapis.com", "https://www.googletagmanager.com"],
    fontSrc: ["'self'", "https://fonts.gstatic.com"],
    imgSrc: ["'self'", "data:", "https:", "https://i.imgur.com", "https://www.mcprim.com", "https://media.giphy.com", ...(INTERNAL_SERVER_URL ? [INTERNAL_SERVER_URL] : [])],
    mediaSrc: ["'self'", "data:"],
    frameSrc: ["'self'", "https://www.youtube.com"],
    connectSrc: ["'self'", "https://cdnjs.cloudflare.com", "https://cdn.jsdelivr.net", "https://www.youtube.com", "https://www.mcprim.com", "https://media.giphy.com", "ws:", "wss:", ...(INTERNAL_SERVER_URL ? [INTERNAL_SERVER_URL] : [])],
    objectSrc: ["'none'"],
    upgradeInsecureRequests: [],
  },
}));
// --- END: SECURITY HEADERS (HELMET) ---
const allowedOrigins = (process.env.ALLOWED_ORIGINS || '').split(',').map(s => s.trim()).filter(Boolean);
app.use(cors({
  origin: (origin, cb) => {
    if (!origin || allowedOrigins.length === 0 || allowedOrigins.includes(origin)) {
      cb(null, true);
    } else {
      cb(new Error('Not allowed by CORS'));
    }
  },
  credentials: true
}));
app.use(express.json({ limit: '10mb' }));
app.use(cookieParser());
app.set('view engine', 'ejs');
// --- DATABASE CONNECTION ---
const mongoUrl = process.env.MONGO_URI;
const dbName = process.env.MONGO_DB || 'nfc_db';
const designsCollectionName = process.env.MONGO_DESIGNS_COLL || 'designs';
const usersCollectionName = 'users';
const backgroundsCollectionName = process.env.MONGO_BACKGROUNDS_COLL || 'backgrounds';
const savedCardsCollectionName = 'savedCards';
const cardRequestsCollectionName = 'cardRequests';
let db;
MongoClient.connect(mongoUrl)
  .then(async client => {
    db = client.db(dbName);
    console.log('MongoDB connected');
    try {
      await db.collection(designsCollectionName).createIndex({ shortId: 1 }, { unique: true });
      await db.collection(designsCollectionName).createIndex({ ownerId: 1 });
      await db.collection(designsCollectionName).createIndex({ createdAt: -1 });
      await db.collection(usersCollectionName).createIndex({ email: 1 }, { unique: true });
      await db.collection(usersCollectionName).createIndex({ userId: 1 }, { unique: true });
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
  'input-name', 'input-tagline', 'input-email', 'input-website',
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
    if (!db) { res.setHeader('X-Robots-Tag', 'noindex, noarchive'); return res.status(500).send('DB not connected'); }
    const id = String(req.query.id);
    if (!id || id === 'undefined') { res.setHeader('X-Robots-Tag', 'noindex, noarchive'); return res.status(400).send('Card ID is missing.'); }
    if (!/^[a-zA-Z0-9_-]{4,30}$/.test(id)) { res.setHeader('X-Robots-Tag', 'noindex, noarchive'); return res.status(400).send('Invalid card ID format.'); }
    const doc = await db.collection(designsCollectionName).findOne({ shortId: id });
    if (!doc || !doc.data) { res.setHeader('X-Robots-Tag', 'noindex, noarchive'); return res.status(404).send('Design not found'); }
    db.collection(designsCollectionName).updateOne({ shortId: id }, { $inc: { views: 1 } }).catch(err => console.error(`Failed to increment view count for ${id}:`, err));
    res.setHeader('X-Robots-Tag', 'index, follow');
    const base = absoluteBaseUrl(req);
    const pageUrl = `${base}/nfc/viewer.html?id=${id}`;
    const inputs = doc.data.inputs || {};
    const name = DOMPurify.sanitize(inputs['input-name'] || 'بطاقة عمل رقمية');
    const tagline = DOMPurify.sanitize(inputs['input-tagline'] || '');
    const imageUrls = doc.data.imageUrls || {};
    let ogImage = `${base}/nfc/og-image.png`;
    if (imageUrls.front) { ogImage = imageUrls.front.startsWith('http') ? imageUrls.front : `${base}${imageUrls.front.startsWith('/') ? '' : '/'}${imageUrls.front}`; }
    const keywords = ['NFC', 'بطاقة عمل ذكية', 'كارت شخصي', name, ...(tagline ? tagline.split(/\s+/).filter(Boolean) : [])].filter(Boolean).join(', ');
    res.render(path.join(rootDir, 'viewer.ejs'), { pageUrl, name, tagline, ogImage, keywords, design: doc.data, canonical: pageUrl, contactLinksHtml: '' });
  } catch (e) {
    console.error('Error in /nfc/viewer route:', e);
    res.setHeader('X-Robots-Tag', 'noindex, noarchive');
    res.status(500).send('View failed due to an internal server error.');
  }
});
app.get('/nfc/view/:id', async (req, res) => {
  const id = String(req.params.id);
  if (!id) return res.status(404).send('Not found');
  res.redirect(301, `/nfc/viewer.html?id=${id}`);
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
const apiLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 200, standardHeaders: true, legacyHeaders: false, message: 'Too many requests from this IP, please try again after 15 minutes' });
app.use('/api/', apiLimiter);
const authLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 5, standardHeaders: true, legacyHeaders: false, message: { error: 'محاولات كثيرة جداً. حاول مرة أخرى بعد 15 دقيقة.' }, skipSuccessfulRequests: true });
app.use('/api/auth/login', authLimiter);
app.use('/api/auth/register', authLimiter);
app.use('/api/auth/forgot-password', authLimiter);
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (file.mimetype && file.mimetype.startsWith('image/')) {
      const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
      if (allowedTypes.includes(file.mimetype)) { cb(null, true); }
      else { cb(new Error('نوع الصورة غير مدعوم.'), false); }
    } else { cb(new Error('الرجاء رفع ملف صورة.'), false); }
  }
});
function handleMulterErrors(err, req, res, next) {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') return res.status(400).json({ error: `حجم الملف كبير جدًا. الحد الأقصى ${err.field ? err.field : '10'} ميجابايت.` });
    return res.status(400).json({ error: `خطأ في رفع الملف: ${err.message}` });
  } else if (err) { return res.status(400).json({ error: err.message || 'خطأ غير معروف أثناء الرفع.' }); }
  next();
}
// [SECURITY FIX] Use crypto.timingSafeEqual to prevent timing attacks
function assertAdmin(req, res) {
  const expected = process.env.ADMIN_TOKEN || '';
  const provided = req.headers['x-admin-token'] || '';
  if (!expected || expected.length !== provided.length ||
    !crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(provided))) {
    res.status(401).json({ error: 'Unauthorized' });
    return false;
  }
  return true;
}
app.post('/api/upload-image', upload.single('image'), handleMulterErrors, async (req, res) => {
  try {
    if (!req.file) { if (!res.headersSent) return res.status(400).json({ error: 'لم يتم تقديم أي ملف صورة.' }); return; }
    const processedBuffer = await sharp(req.file.buffer).resize({ width: 2560, height: 2560, fit: 'inside', withoutEnlargement: true }).webp({ quality: 85 }).toBuffer();
    const filename = nanoid(10) + '.webp';
    const out = path.join(uploadDir, filename);
    await fs.promises.writeFile(out, processedBuffer);
    const base = absoluteBaseUrl(req);
    return res.json({ success: true, url: `${base}/uploads/${filename}`, local: true });
  } catch (e) {
    console.error('Image upload processing error:', e);
    if (!res.headersSent) return res.status(500).json({ error: 'فشل معالجة الصورة بعد الرفع.' });
  }
});
app.post('/api/save-design', async (req, res) => {
  try {
    if (!db) return res.status(500).json({ error: 'DB not connected' });
    let data = req.body || {};
    if (data.inputs) data.inputs = sanitizeInputs(data.inputs);
    if (data.dynamic) {
      if (data.dynamic.phones) data.dynamic.phones = data.dynamic.phones.map(phone => ({ ...phone, value: phone && phone.value ? DOMPurify.sanitize(String(phone.value)) : '' }));
      if (data.dynamic.social) data.dynamic.social = data.dynamic.social.map(link => ({ ...link, value: link && link.value ? DOMPurify.sanitize(String(link.value)) : '' }));
      if (data.dynamic.staticSocial) { for (const key in data.dynamic.staticSocial) { if (data.dynamic.staticSocial[key] && data.dynamic.staticSocial[key].value) { data.dynamic.staticSocial[key].value = DOMPurify.sanitize(String(data.dynamic.staticSocial[key].value)); } } }
    }
    const existingId = req.query.id;
    let shortId = existingId || nanoid(8);
    let isUpdate = false;
    let ownerId = null;
    const authHeader = req.headers['authorization'];
    if (!authHeader) return res.status(401).json({ error: 'يجب تسجيل الدخول أولاً لحفظ التصميم' });
    try {
      const token = authHeader.split(' ')[1];
      const secret = process.env.JWT_SECRET;
      if (!secret) throw new Error('JWT_SECRET not configured');
      const decoded = jwt.verify(token, secret);
      ownerId = decoded.userId;
    } catch (err) { return res.status(401).json({ error: 'يجب تسجيل الدخول أولاً لحفظ التصميم' }); }
    if (existingId) {
      const existingDesign = await db.collection(designsCollectionName).findOne({ shortId: existingId });
      if (existingDesign) {
        if (existingDesign.ownerId && existingDesign.ownerId !== ownerId) { shortId = nanoid(8); isUpdate = false; }
        else { isUpdate = true; }
      } else { shortId = nanoid(8); isUpdate = false; }
    }
    if (isUpdate) {
      const existingDoc = await db.collection(designsCollectionName).findOne({ shortId });
      if (existingDoc?.data?.imageUrls) {
        if (!data.imageUrls) data.imageUrls = {};
        const existing = existingDoc.data.imageUrls;
        if (!data.imageUrls.capturedFront && existing.capturedFront) data.imageUrls.capturedFront = existing.capturedFront;
        if (!data.imageUrls.capturedBack && existing.capturedBack) data.imageUrls.capturedBack = existing.capturedBack;
      }
    }
    const updateDoc = { data, lastModified: new Date() };
    if (ownerId) updateDoc.ownerId = ownerId;
    if (isUpdate) {
      await db.collection(designsCollectionName).updateOne({ shortId }, { $set: updateDoc });
    } else {
      if (ownerId) {
        const designCount = await db.collection(designsCollectionName).countDocuments({ ownerId });
        if (designCount >= 1) {
          const existingDesign = await db.collection(designsCollectionName).findOne({ ownerId });
          if (existingDesign) {
            shortId = existingDesign.shortId;
            if (existingDesign.data?.imageUrls) {
              if (!data.imageUrls) data.imageUrls = {};
              const existing = existingDesign.data.imageUrls;
              if (!data.imageUrls.capturedFront && existing.capturedFront) data.imageUrls.capturedFront = existing.capturedFront;
              if (!data.imageUrls.capturedBack && existing.capturedBack) data.imageUrls.capturedBack = existing.capturedBack;
            }
            await db.collection(designsCollectionName).updateOne({ shortId }, { $set: { data, ownerId, lastModified: new Date() } });
            return res.json({ success: true, id: shortId });
          }
        }
      }
      await db.collection(designsCollectionName).insertOne({ shortId, ...updateDoc, createdAt: new Date(), views: 0 });
    }
    res.json({ success: true, id: shortId });
  } catch (e) {
    console.error('Save design error:', e);
    if (!res.headersSent) res.status(500).json({ error: 'Save failed' });
  }
});
// --- AUTHENTICATION ROUTES ---
app.post('/api/auth/register', [body('email').isEmail().normalizeEmail(), body('password').isLength({ min: 6 }), body('name').trim().notEmpty()], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
  try {
    if (!db) return res.status(500).json({ error: 'DB not connected' });
    const { email, password, name } = req.body;
    const existingUser = await db.collection(usersCollectionName).findOne({ email });
    if (existingUser) return res.status(400).json({ error: 'User already exists' });
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);
    const userId = nanoid(10);
    await db.collection(usersCollectionName).insertOne({ userId, email, password: hashedPassword, name, isVerified: false, createdAt: new Date() });
    const secret = process.env.JWT_SECRET;
    if (!secret) return res.status(500).json({ error: 'Server misconfiguration' });
    const verificationToken = jwt.sign({ userId, email, type: 'email-verify' }, secret, { expiresIn: '24h' });
    await db.collection(usersCollectionName).updateOne({ userId }, { $set: { verificationToken } });
    const baseUrl = process.env.PUBLIC_BASE_URL || 'https://mcprim.com/nfc';
    const verifyUrl = `${baseUrl}/verify-email.html?token=${verificationToken}`;
    try { const emailTemplate = EmailService.verificationEmail(name, verifyUrl); await EmailService.send({ to: email, ...emailTemplate }); } catch (emailErr) { console.warn('[Register] Email sending failed:', emailErr.message); }
    const accessToken = createAccessToken({ userId, email });
    const refreshTokenValue = createRefreshToken();
    const hashedRefresh = hashToken(refreshTokenValue);
    await db.collection(usersCollectionName).updateOne({ userId }, { $set: { refreshTokenHash: hashedRefresh } });
    res.cookie('refreshToken', refreshTokenValue, { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'Lax', maxAge: 7 * 24 * 60 * 60 * 1000, path: '/api/auth' });
    res.status(201).json({ success: true, token: accessToken, user: { name, email, userId, isVerified: false } });
  } catch (err) {
    if (err.code === 11000) return res.status(400).json({ error: 'User already exists' });
    console.error('Register error:', err);
    res.status(500).json({ error: 'Registration failed' });
  }
});
app.post('/api/auth/login', [body('email').isEmail().normalizeEmail(), body('password').exists()], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
  try {
    if (!db) return res.status(500).json({ error: 'DB not connected' });
    const { email, password } = req.body;
    const user = await db.collection(usersCollectionName).findOne({ email });
    if (!user) return res.status(400).json({ error: 'Invalid credentials' });
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(400).json({ error: 'Invalid credentials' });
    const accessToken = createAccessToken({ userId: user.userId, email: user.email });
    const refreshTokenValue = createRefreshToken();
    const hashedRefresh = hashToken(refreshTokenValue);
    await db.collection(usersCollectionName).updateOne({ userId: user.userId }, { $set: { refreshTokenHash: hashedRefresh } });
    res.cookie('refreshToken', refreshTokenValue, { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'Lax', maxAge: 7 * 24 * 60 * 60 * 1000, path: '/api/auth' });
    res.json({ success: true, token: accessToken, user: { name: user.name, email: user.email, userId: user.userId } });
  } catch (err) { console.error('Login error:', err); res.status(500).json({ error: 'Login failed' }); }
});
app.get('/api/auth/google', (req, res) => {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  if (!clientId) return res.status(500).send('Google OAuth not configured');
  const proto = req.headers['x-forwarded-proto'] || req.protocol;
  const host = req.get('host');
  const redirectUri = `${proto}://${host}/api/auth/google/callback`;
  const lang = (req.query.lang === 'en') ? 'en' : 'ar';
  const statePayload = Buffer.from(JSON.stringify({ lang })).toString('base64url');
  const scope = 'email profile';
  const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&scope=${encodeURIComponent(scope)}&access_type=offline&prompt=consent&state=${encodeURIComponent(statePayload)}`;
  res.redirect(authUrl);
});
app.get('/api/auth/google/callback', async (req, res) => {
  const { code, error, state } = req.query;
  let lang = 'ar';
  if (state) { try { const decoded = JSON.parse(Buffer.from(state, 'base64url').toString('utf8')); if (decoded.lang === 'en') lang = 'en'; } catch (e) {} }
  const frontendBase = (process.env.PUBLIC_BASE_URL || 'https://mcprim.com/nfc').replace(/\/$/, '');
  const loginPage = lang === 'en' ? `${frontendBase}/login-en` : `${frontendBase}/login`;
  if (error || !code) { const safeError = encodeURIComponent(String(error || 'google_auth_failed').replace(/[^a-zA-Z0-9_ -]/g, '')); return res.redirect(`${loginPage}?error=${safeError}`); }
  try {
    const clientId = process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
    const proto = req.headers['x-forwarded-proto'] || req.protocol;
    const host = req.get('host');
    const redirectUri = `${proto}://${host}/api/auth/google/callback`;
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams({ code, client_id: clientId, client_secret: clientSecret, redirect_uri: redirectUri, grant_type: 'authorization_code' }).toString() });
    const tokens = await tokenResponse.json();
    if (!tokens.access_token) throw new Error('No access token: ' + JSON.stringify(tokens));
    const userInfoResponse = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', { headers: { Authorization: `Bearer ${tokens.access_token}` } });
    const googleUser = await userInfoResponse.json();
    if (!googleUser.email) throw new Error('No email from Google: ' + JSON.stringify(googleUser));
    let user = await db.collection(usersCollectionName).findOne({ email: googleUser.email });
    if (!user) { const userId = nanoid(10); await db.collection(usersCollectionName).insertOne({ userId, email: googleUser.email, name: googleUser.name || googleUser.email.split('@')[0], googleId: googleUser.id, isVerified: true, createdAt: new Date() }); user = { userId, email: googleUser.email, name: googleUser.name }; }
    const accessToken = createAccessToken({ userId: user.userId, email: user.email });
    const refreshTokenValue = createRefreshToken();
    const hashedRefresh = hashToken(refreshTokenValue);
    await db.collection(usersCollectionName).updateOne({ userId: user.userId }, { $set: { refreshTokenHash: hashedRefresh } });
    res.cookie('refreshToken', refreshTokenValue, { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'Lax', maxAge: 7 * 24 * 60 * 60 * 1000, path: '/api/auth' });
    const authEncoded = encodeURIComponent(JSON.stringify({ token: accessToken, user: { name: user.name, email: user.email, userId: user.userId } }));
    const dashboardPage = lang === 'en' ? `${frontendBase}/dashboard-en.html#gauth=${authEncoded}` : `${frontendBase}/dashboard.html#gauth=${authEncoded}`;
    return res.redirect(dashboardPage);
  } catch (err) { 
    // ✅ Log internally only — never expose error details to user
    console.error('[Google OAuth] Internal error:', err.message); 
    return res.redirect(`${loginPage}?error=${encodeURIComponent('google_auth_failed')}`); 
  }
});
// [SECURITY FIX] Removed console.log that exposes password reset link
app.post('/api/auth/forgot-password', [body('email').isEmail().normalizeEmail()], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
  try {
    if (!db) return res.status(500).json({ error: 'DB not connected' });
    const { email } = req.body;
    const user = await db.collection(usersCollectionName).findOne({ email });
    if (!user) return res.json({ success: true });
    const secret = process.env.JWT_SECRET;
    if (!secret) return res.status(500).json({ error: 'Server misconfiguration' });
    const resetToken = jwt.sign({ userId: user.userId, email: user.email, type: 'password-reset' }, secret, { expiresIn: '1h' });
    await db.collection(usersCollectionName).updateOne({ userId: user.userId }, { $set: { resetToken, resetTokenExpiry: new Date(Date.now() + 3600000) } });
    const baseUrl = process.env.PUBLIC_BASE_URL || 'https://mcprim.com/nfc';
    const resetLink = `${baseUrl}/reset-password.html?token=${resetToken}`;
    // TODO: Send email with resetLink (EmailService integration) — console.log removed for security
    res.json({ success: true });
  } catch (err) { console.error('Forgot password error:', err); res.status(500).json({ error: 'Failed to process request' }); }
});
app.post('/api/auth/reset-password/:token', [body('password').isLength({ min: 6 })], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
  try {
    if (!db) return res.status(500).json({ error: 'DB not connected' });
    const { token } = req.params;
    const { password } = req.body;
    const secret = process.env.JWT_SECRET;
    if (!secret) return res.status(500).json({ error: 'Server misconfiguration' });
    let decoded;
    try { decoded = jwt.verify(token, secret); if (decoded.type !== 'password-reset') throw new Error('Invalid token type'); } catch (tokenErr) { return res.status(400).json({ error: 'رابط غير صالح أو منتهي الصلاحية' }); }
    const user = await db.collection(usersCollectionName).findOne({ userId: decoded.userId, resetToken: token });
    if (!user) return res.status(400).json({ error: 'رابط غير صالح أو منتهي الصلاحية' });
    if (new Date() > new Date(user.resetTokenExpiry)) return res.status(400).json({ error: 'انتهت صلاحية الرابط' });
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);
    await db.collection(usersCollectionName).updateOne({ userId: user.userId }, { $set: { password: hashedPassword }, $unset: { resetToken: '', resetTokenExpiry: '' } });
    res.json({ success: true });
  } catch (err) { console.error('Reset password error:', err); res.status(500).json({ error: 'Failed to reset password' }); }
});
app.get('/api/auth/verify-email/:token', async (req, res) => {
  try {
    if (!db) return res.status(500).json({ error: 'DB not connected' });
    const { token } = req.params;
    const secret = process.env.JWT_SECRET;
    if (!secret) return res.status(500).json({ error: 'Server misconfiguration' });
    let decoded;
    try { decoded = jwt.verify(token, secret); if (decoded.type !== 'email-verify') throw new Error('Invalid token type'); } catch (tokenErr) { return res.status(400).json({ error: 'رابط التحقق غير صالح' }); }
    const user = await db.collection(usersCollectionName).findOne({ userId: decoded.userId, verificationToken: token });
    if (!user) return res.status(400).json({ error: 'رابط التحقق غير صالح' });
    if (user.isVerified) return res.json({ success: true, message: 'البريد مُتحقق مسبقاً' });
    await db.collection(usersCollectionName).updateOne({ userId: user.userId }, { $set: { isVerified: true }, $unset: { verificationToken: '' } });
    res.json({ success: true });
  } catch (err) { console.error('Verify email error:', err); res.status(500).json({ error: 'Failed to verify email' }); }
});
app.post('/api/auth/refresh', async (req, res) => {
  try {
    if (!db) return res.status(500).json({ error: 'DB not connected' });
    const tokenFromCookie = req.cookies?.refreshToken;
    if (!tokenFromCookie) return res.status(401).json({ error: 'No refresh token provided' });
    const hashedToken = hashToken(tokenFromCookie);
    const user = await db.collection(usersCollectionName).findOne({ refreshTokenHash: hashedToken });
    if (!user) return res.status(403).json({ error: 'Invalid refresh token' });
    const newAccessToken = createAccessToken({ userId: user.userId, email: user.email });
    const newRefreshToken = createRefreshToken();
    const newHashedRefresh = hashToken(newRefreshToken);
    await db.collection(usersCollectionName).updateOne({ userId: user.userId }, { $set: { refreshTokenHash: newHashedRefresh } });
    res.cookie('refreshToken', newRefreshToken, { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'Lax', maxAge: 7 * 24 * 60 * 60 * 1000, path: '/api/auth' });
    res.json({ success: true, token: newAccessToken });
  } catch (err) { console.error('Token refresh error:', err); res.status(500).json({ error: 'Token refresh failed' }); }
});
app.post('/api/auth/logout', async (req, res) => {
  try {
    const tokenFromCookie = req.cookies?.refreshToken;
    if (tokenFromCookie && db) { const hashedToken = hashToken(tokenFromCookie); await db.collection(usersCollectionName).updateOne({ refreshTokenHash: hashedToken }, { $unset: { refreshTokenHash: '' } }); }
    res.clearCookie('refreshToken', { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'Lax', path: '/api/auth' });
    res.json({ success: true });
  } catch (err) { console.error('Logout error:', err); res.status(500).json({ error: 'Logout failed' }); }
});
app.get('/api/user/designs', verifyToken, async (req, res) => {
  try {
    if (!db) return res.status(500).json({ error: 'DB not connected' });
    const designs = await db.collection(designsCollectionName).find({ ownerId: req.user.userId }).project({ 'data.inputs.input-name_ar': 1, 'data.inputs.input-name_en': 1, 'data.inputs.input-name': 1, shortId: 1, createdAt: 1, views: 1, 'data.imageUrls.front': 1, 'data.imageUrls.capturedFront': 1 }).sort({ createdAt: -1 }).toArray();
    res.json({ success: true, designs });
  } catch (err) { console.error('Get user designs error:', err); res.status(500).json({ error: 'Failed to fetch designs' }); }
});
app.delete('/api/user/designs/:id', verifyToken, async (req, res) => {
  try {
    if (!db) return res.status(500).json({ error: 'DB not connected' });
    const shortId = String(req.params.id);
    const design = await db.collection(designsCollectionName).findOne({ shortId });
    if (!design) return res.status(404).json({ error: 'التصميم غير موجود' });
    if (design.ownerId !== req.user.userId) return res.status(403).json({ error: 'لا يمكنك حذف هذا التصميم' });
    await db.collection(designsCollectionName).deleteOne({ shortId });
    res.json({ success: true, message: 'تم حذف التصميم بنجاح' });
  } catch (err) { console.error('Delete design error:', err); res.status(500).json({ error: 'فشل حذف التصميم' }); }
});
app.get('/api/card-privacy', verifyToken, async (req, res) => {
  try {
    if (!db) return res.status(500).json({ error: 'DB not connected' });
    const user = await db.collection(usersCollectionName).findOne({ userId: req.user.userId }, { projection: { cardPrivacy: 1 } });
    res.json({ success: true, cardPrivacy: user?.cardPrivacy || 'require_approval' });
  } catch (err) { console.error('Get card privacy error:', err); res.status(500).json({ error: 'Failed to get privacy setting' }); }
});
app.put('/api/card-privacy', verifyToken, async (req, res) => {
  try {
    if (!db) return res.status(500).json({ error: 'DB not connected' });
    const { cardPrivacy } = req.body;
    if (!['allow_all', 'require_approval', 'deny_all'].includes(cardPrivacy)) return res.status(400).json({ error: 'Invalid privacy setting' });
    await db.collection(usersCollectionName).updateOne({ userId: req.user.userId }, { $set: { cardPrivacy } });
    res.json({ success: true });
  } catch (err) { console.error('Update card privacy error:', err); res.status(500).json({ error: 'Failed to update privacy setting' }); }
});
app.get('/api/get-design/:id', async (req, res) => {
  try {
    if (!db) return res.status(500).json({ error: 'DB not connected' });
    const id = String(req.params.id);
    const doc = await db.collection(designsCollectionName).findOne({ shortId: id });
    if (!doc || !doc.data) return res.status(404).json({ error: 'Design not found or data missing' });
    res.json(doc.data);
  } catch (e) { console.error('Get design error:', e); if (!res.headersSent) res.status(500).json({ error: 'Fetch failed' }); }
});
app.get('/api/card-stats/:id', async (req, res) => {
  try {
    if (!db) return res.status(500).json({ error: 'DB not connected' });
    const id = String(req.params.id);
    const doc = await db.collection(designsCollectionName).findOne({ shortId: id }, { projection: { views: 1, createdAt: 1, lastModified: 1, shortId: 1 } });
    if (!doc) return res.status(404).json({ error: 'Design not found' });
    res.json({ success: true, stats: { id: doc.shortId, views: doc.views || 0, createdAt: doc.createdAt, lastModified: doc.lastModified } });
  } catch (e) { console.error('Get card stats error:', e); res.status(500).json({ error: 'Failed to fetch stats' }); }
});
app.get('/api/gallery', async (req, res) => {
  try {
    if (!db) return res.status(500).json({ error: 'Database not connected' });
    const page = parseInt(req.query.page, 10) || 1;
    const limit = 20;
    const skip = (page - 1) * limit;
    const sortBy = req.query.sortBy || 'createdAt';
    const searchTerm = req.query.search ? String(req.query.search).trim() : '';
    const query = { 'data.sharedToGallery': true };
    if (searchTerm) { const escaped = searchTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); const regex = new RegExp(escaped, 'i'); query['$or'] = [{ 'data.inputs.input-name_ar': regex }, { 'data.inputs.input-name_en': regex }, { 'data.inputs.input-tagline_ar': regex }, { 'data.inputs.input-tagline_en': regex }]; }
    const sortOptions = {};
    if (sortBy === 'views') sortOptions.views = -1; else sortOptions.createdAt = -1;
    const totalDesigns = await db.collection(designsCollectionName).countDocuments(query);
    const totalPages = Math.ceil(totalDesigns / limit);
    const designs = await db.collection(designsCollectionName).find(query).project({ 'data.inputs.input-name_ar': 1, 'data.inputs.input-name_en': 1, 'data.inputs.input-tagline_ar': 1, 'data.inputs.input-tagline_en': 1, 'data.imageUrls.capturedFront': 1, 'data.imageUrls.front': 1, shortId: 1, createdAt: 1, views: 1 }).sort(sortOptions).skip(skip).limit(limit).toArray();
    res.json({ success: true, designs, pagination: { page, totalPages, totalDesigns } });
  } catch (e) { console.error('Gallery fetch error:', e); res.status(500).json({ success: false, error: 'Failed to fetch gallery designs' }); }
});
app.get('/robots.txt', (req, res) => {
  const base = absoluteBaseUrl(req);
  const txt = ['User-agent: *', 'Allow: /nfc/', 'Allow: /nfc/viewer.html', 'Disallow: /nfc/view/', 'Disallow: /nfc/editor', 'Disallow: /nfc/editor.html', 'Disallow: /nfc/viewer.ejs', `Sitemap: ${base}/sitemap.xml`].join('\n');
  res.type('text/plain').send(txt);
});
// [SECURITY FIX] Sitemap now only includes sharedToGallery designs
app.get('/sitemap.xml', async (req, res) => {
  try {
    const base = absoluteBaseUrl(req);
    const staticPages = ['/nfc/', '/nfc/gallery', '/nfc/blog', '/nfc/privacy'];
    const blogPosts = [];
    let designUrls = [];
    if (db) {
      const docs = await db.collection(designsCollectionName).find({ 'data.sharedToGallery': true }).project({ shortId: 1, createdAt: 1 }).sort({ createdAt: -1 }).limit(5000).toArray();
      designUrls = docs.map(d => ({ loc: `${base}/nfc/viewer.html?id=${d.shortId}`, lastmod: d.createdAt ? new Date(d.createdAt).toISOString().split('T')[0] : undefined, changefreq: 'monthly', priority: '0.8' }));
    }
    function urlTag(loc, { lastmod, changefreq = 'weekly', priority = '0.7' } = {}) {
      if (!loc) return '';
      const lastmodTag = lastmod ? `<lastmod>${lastmod}</lastmod>` : '';
      const changefreqTag = changefreq ? `<changefreq>${changefreq}</changefreq>` : '';
      const priorityTag = priority ? `<priority>${priority}</priority>` : '';
      return `<url><loc>${loc}</loc>${lastmodTag}${changefreqTag}${priorityTag}</url>`;
    }
    const xml = `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${staticPages.map(p => urlTag(`${base}${p}`, { priority: '0.9', changefreq: 'weekly' })).join('')}${blogPosts.map(p => urlTag(`${base}${p}`, { priority: '0.7', changefreq: 'monthly' })).join('')}${designUrls.map(u => urlTag(u.loc, { lastmod: u.lastmod, changefreq: u.changefreq, priority: u.priority })).join('')}</urlset>`;
    res.type('application/xml').send(xml);
  } catch (e) { console.error('Sitemap generation error:', e); res.status(500).send('Sitemap failed'); }
});
app.get('/healthz', (req, res) => {
  if (db && db.client.topology && db.client.topology.isConnected()) res.json({ ok: true, db_status: 'connected' }); else res.status(500).json({ ok: false, db_status: 'disconnected' });
});
app.get(['/nfc/editor', '/nfc/editor.html'], (req, res) => {
  if (req.useragent.isMobile) res.sendFile(path.join(rootDir, 'editor-mobile.html')); else res.sendFile(path.join(rootDir, 'editor.html'));
});
app.use('/nfc', express.static(rootDir, { extensions: ['html'] }));
app.use((err, req, res, next) => {
  console.error("Unhandled error:", err.stack || err);
  const statusCode = err.status || 500;
  const message = process.env.NODE_ENV === 'production' ? 'Internal Server Error' : err.message;
  if (!res.headersSent) res.status(statusCode).json({ error: message });
});
const server = http.createServer(app);
const wss = new WebSocketServer({ server });
const rooms = new Map();
wss.on('connection', (ws, req) => {
  const parameters = new url.URL(req.url, `ws://${req.headers.host}`).searchParams;
  const collabId = parameters.get('collabId');
  const token = parameters.get('token');
  if (!collabId) { console.log('Connection rejected: No collabId provided.'); ws.close(1008, 'collabId is required'); return; }
  const secret = process.env.JWT_SECRET;
  if (secret && token) { try { jwt.verify(token, secret); } catch (err) { console.log('WebSocket connection rejected: Invalid token.'); ws.close(1008, 'Invalid authentication token'); return; } } else if (secret && !token) { console.log('WebSocket connection rejected: No token provided.'); ws.close(1008, 'Authentication token required'); return; }
  if (!rooms.has(collabId)) rooms.set(collabId, new Set());
  const room = rooms.get(collabId);
  room.add(ws);
  // ✅ WebSocket message size limit to prevent DoS
  const WS_MAX_MESSAGE_BYTES = 64 * 1024; // 64KB
  ws.on('message', (message) => { try { if (message.length > WS_MAX_MESSAGE_BYTES) { console.warn(`[WS] Message too large (${message.length} bytes) — rejected`); ws.close(1009, 'Message too large'); return; } room.forEach(client => { if (client !== ws && client.readyState === ws.OPEN) client.send(message.toString()); }); } catch (error) { console.error('Error broadcasting message:', error); } });
  ws.on('close', () => { if (room) { room.delete(ws); if (room.size === 0) rooms.delete(collabId); } });
  ws.on('error', (error) => { console.error('WebSocket error:', error); });
});
if (require.main === module) { server.listen(port, () => { console.log(`Server running on port: ${port}`); console.log('WebSocket server is also running.'); }); }
module.exports = app;
