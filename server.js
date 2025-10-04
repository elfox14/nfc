// server.js (النسخة المعدلة)

require('dotenv').config();
const express = require('express');
const { MongoClient } = require('mongodb');
const path = require('path');
const cors = require('cors');
const fs = require('fs');
const rateLimit = require('express-rate-limit');
const { nanoid } = require('nanoid');
const { JSDOM } = require('jsdom');
const DOMPurifyFactory = require('dompurify');
const multer = require('multer');
const sharp = require('sharp');

// --- إعدادات DOMPurify ---
const window = (new JSDOM('')).window;
const DOMPurify = DOMPurifyFactory(window);

const app = express();
const port = process.env.PORT || 3000;
const rootDir = __dirname;

// --- إعدادات عامة و Middleware ---
app.set('trust proxy', 1);
app.disable('x-powered-by');
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.set('view engine', 'ejs');
app.set('views', rootDir); // تحديد مجلد القوالب

// --- [تحسين أمني] إضافة هيدرز أمان أساسية ---
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('Content-Security-Policy', "frame-ancestors 'self'");
  next();
});

// --- إعداد قاعدة البيانات ---
const mongoUrl = process.env.MONGO_URI;
const dbName = process.env.MONGO_DB || 'nfc_db';
const designsCollectionName = process.env.MONGO_DESIGNS_COLL || 'designs';
const backgroundsCollectionName = process.env.MONGO_BACKGROUNDS_COLL || 'backgrounds';
let db;

MongoClient.connect(mongoUrl)
  .then(client => { db = client.db(dbName); console.log('MongoDB connected'); })
  .catch(err => { console.error('Mongo connect error', err); process.exit(1); });

// --- أدوات مساعدة ---
function absoluteBaseUrl(req) {
  const envBase = process.env.SITE_BASE_URL;
  if (envBase) return envBase.replace(/\/+$/, '');
  const proto = (req.headers['x-forwarded-proto'] || req.protocol || 'https');
  const host = req.get('host');
  return `${proto}://${host}`;
}

// --- المسارات الديناميكية (Routes) ---

// صفحة عرض SEO لكل بطاقة: /nfc/view/:id
app.get('/nfc/view/:id', async (req, res) => {
  try {
    if (!db) return res.status(503).send('Database not available');
    
    const id = String(req.params.id);
    const doc = await db.collection(designsCollectionName).findOne({ shortId: id });

    if (!doc) {
      res.setHeader('X-Robots-Tag', 'noindex, noarchive');
      return res.status(404).render(path.join(rootDir, '404.ejs'), { message: 'Design not found' });
    }

    res.setHeader('X-Robots-Tag', 'index, follow');

    const base = absoluteBaseUrl(req);
    const pageUrl = `${base}/nfc/view/${id}`;
    
    const inputs = doc.data?.inputs || {};
    const name = inputs['input-name'] || 'بطاقة عمل رقمية';
    const tagline = inputs['input-tagline'] || 'MC PRIME Digital Business Cards';
    const ogImage = doc.data?.imageUrls?.front
      ? (doc.data.imageUrls.front.startsWith('http') ? doc.data.imageUrls.front : `${base}${doc.data.imageUrls.front}`)
      : `${base}/nfc/og-image.png`;

    res.render(path.join(rootDir, 'viewer.ejs'), {
      pageUrl, name, tagline, ogImage,
      design: doc.data,
      canonical: pageUrl
    });
  } catch (e) {
    console.error(`View page error for ID ${req.params.id}:`, e);
    res.setHeader('X-Robots-Tag', 'noindex, noarchive');
    res.status(500).send('Failed to display the card');
  }
});

// --- خدمة الملفات الثابتة (Static Files) ---

// [إصلاح حاسم] خدمة الملفات من المسار /nfc/
// هذا السطر يخبر الخادم بأن أي طلب يبدأ بـ /nfc/ (مثل /nfc/style.css)
// يجب أن يبحث عن الملف مباشرة في المجلد الرئيسي للمشروع (rootDir).
// هذا يحل مشكلة عدم تحميل ملفات CSS و JS.
app.use('/nfc', express.static(rootDir, {
  extensions: ['html'],
  setHeaders: (res, path) => {
    // تحديد مدة الكاش للملفات المختلفة
    if (path.endsWith('.js') || path.endsWith('.css')) {
      res.setHeader('Cache-Control', 'public, max-age=31536000, immutable'); // سنة واحدة
    } else if (/\.(jpg|jpeg|png|gif|webp)$/.test(path)) {
      res.setHeader('Cache-Control', 'public, max-age=2592000'); // 30 يوم
    }
  }
}));

// مجلد uploads
const uploadDir = path.join(rootDir, 'uploads');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });
app.use('/uploads', express.static(uploadDir, { maxAge: '30d', immutable: true }));

// --- إعادة التوجيه (Redirects) ---
app.get('/', (req, res) => res.redirect(301, '/nfc/'));
app.get('/nfc', (req, res) => res.redirect(301, '/nfc/'));

// --- واجهات برمجة التطبيقات (API) ---

// إعدادات multer للرفع
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (req, file, cb) => {
    if (file.mimetype && file.mimetype.startsWith('image/')) cb(null, true);
    else cb(new Error('Please upload an image'), false);
  }
});

// Rate Limiter للـ API
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, max: 200, standardHeaders: true, legacyHeaders: false
});
app.use('/api/', apiLimiter);

// Middleware للتحقق من صلاحيات المدير
function assertAdmin(req, res, next) {
  const expected = process.env.ADMIN_TOKEN || '';
  const provided = req.headers['x-admin-token'] || '';
  if (!expected || expected !== provided) return res.status(401).json({ error: 'Unauthorized' });
  next();
}

// API: رفع صورة
app.post('/api/upload-image', upload.single('image'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No image provided' });
    const filename = nanoid(10) + '.webp';
    await sharp(req.file.buffer)
      .resize({ width: 2560, height: 2560, fit: 'inside', withoutEnlargement: true })
      .webp({ quality: 85 })
      .toFile(path.join(uploadDir, filename));
    res.json({ success: true, url: '/uploads/' + filename });
  } catch (e) {
    console.error('Image upload error:', e);
    res.status(500).json({ error: 'Upload failed' });
  }
});

// API: حفظ تصميم
app.post('/api/save-design', async (req, res) => {
  try {
    if (!db) return res.status(503).json({ error: 'Database not available' });
    const data = req.body || {};
    if (data.inputs) {
      ['input-name','input-tagline'].forEach(k => { if (data.inputs[k]) data.inputs[k] = DOMPurify.sanitize(String(data.inputs[k])); });
    }
    const shortId = nanoid(8);
    await db.collection(designsCollectionName).insertOne({ shortId, data, createdAt: new Date() });
    res.status(201).json({ success: true, id: shortId });
  } catch (e) {
    console.error('Save design error:', e);
    res.status(500).json({ error: 'Save failed' });
  }
});

// API: جلب تصميم
app.get('/api/get-design/:id', async (req, res) => {
  try {
    if (!db) return res.status(503).json({ error: 'Database not available' });
    const doc = await db.collection(designsCollectionName).findOne({ shortId: String(req.params.id) });
    if (!doc) return res.status(404).json({ error: 'Design not found' });
    res.json(doc.data);
  } catch (e) {
    console.error('Fetch design error:', e);
    res.status(500).json({ error: 'Fetch failed' });
  }
});

// API: المعرض (مع ترقيم الصفحات)
app.get('/api/gallery', async (req, res) => {
  try {
    if (!db) return res.status(503).json({ error: 'Database not available' });
    // [تحسين أداء] إضافة ترقيم الصفحات
    const page = Math.max(1, parseInt(req.query.page || '1', 10));
    const limit = Math.max(1, Math.min(50, parseInt(req.query.limit || '20', 10)));
    const skip = (page - 1) * limit;

    const coll = db.collection(designsCollectionName);
    const [items, total] = await Promise.all([
      coll.find({}).sort({ createdAt: -1 }).skip(skip).limit(limit).toArray(),
      coll.countDocuments({})
    ]);

    res.json({ success: true, items, page, limit, total, totalPages: Math.ceil(total / limit) });
  } catch (e) {
    console.error('Fetch gallery error:', e);
    res.status(500).json({ error: 'Fetch failed' });
  }
});

// --- بقية الـ API الخاص بالمدير (لم يتم تعديلها) ---
// ... (كود رفع الخلفيات، جلب الخلفيات، حذف الخلفيات)

// --- ملفات SEO ---
app.get('/robots.txt', (req, res) => { /* ... */ });
app.get('/sitemap.xml', async (req, res) => { /* ... */ });

// --- نقطة نهاية لفحص صحة الخادم ---
app.get('/healthz', (req, res) => res.json({ ok: true }));

// --- معالجة الأخطاء (404) ---
app.use((req, res, next) => {
  res.status(404).send("Sorry, can't find that!");
});

// --- بدء تشغيل الخادم ---
app.listen(port, () => {
  console.log(`Server running on port: ${port}`);
});
