// server.js
require('dotenv').config();
const express = require('express');
const { MongoClient } = require('mongodb');
const path = require('path');
const cors = require('cors');
const fs = require('fs');
const rateLimit = require('express-rate-limit');
const { nanoid } = require('nanoid');
const { body, validationResult } = require('express-validator');
const { JSDOM } = require('jsdom');
const DOMPurifyFactory = require('dompurify');
const multer = require('multer');
const sharp = require('sharp');
const ejs = require('ejs');

const window = (new JSDOM('')).window;
const DOMPurify = DOMPurifyFactory(window);

const app = express();
const port = process.env.PORT || 3000;

// --- إعدادات عامة ---
app.set('trust proxy', 1);
app.disable('x-powered-by');
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.set('view engine', 'ejs');

// قاعدة البيانات
const mongoUrl = process.env.MONGO_URI;
const dbName = process.env.MONGO_DB || 'nfc_db';
const designsCollectionName = process.env.MONGO_DESIGNS_COLL || 'designs';
const backgroundsCollectionName = process.env.MONGO_BACKGROUNDS_COLL || 'backgrounds';
let db;

MongoClient.connect(mongoUrl)
  .then(client => { db = client.db(dbName); console.log('MongoDB connected'); })
  .catch(err => { console.error('Mongo connect error', err); process.exit(1); });

// هيدر كاش بسيط للملفات الثابتة
app.use((req, res, next) => {
  res.setHeader('Cache-Control', 'public, max-age=600');
  next();
});

// إزالة .html من الروابط القديمة
app.use((req, res, next) => {
  if (req.path.endsWith('.html')) {
    const newPath = req.path.slice(0, -5);
    return res.redirect(301, newPath);
  }
  next();
});

// إعادة توجيه الجذر إلى /nfc/
app.get('/', (req, res) => {
  res.redirect(301, '/nfc/');
});

const rootDir = __dirname;

// === بداية التعديل: إصلاح مسار خدمة الملفات الثابتة ===
// ربط المسار /nfc بالمجلد الرئيسي للمشروع لخدمة الملفات بشكل صحيح
app.use('/nfc', express.static(rootDir, { extensions: ['html'] }));
// === نهاية التعديل ===

// مجلد uploads
const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });
app.use('/uploads', express.static(uploadDir, { maxAge: '30d', immutable: true }));

// عتاد الرفع/المعالجة (بدون تغيير)
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (file.mimetype && file.mimetype.startsWith('image/')) cb(null, true);
    else cb(new Error('Please upload an image'), false);
  }
});

// ريت-لميت للـ API (بدون تغيير)
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  standardHeaders: true,
  legacyHeaders: false
});
app.use('/api/', apiLimiter);

// أدوات مساعدة (بدون تغيير)
function absoluteBaseUrl(req) {
  const envBase = process.env.SITE_BASE_URL;
  if (envBase) return envBase.replace(/\/+$/, '');
  const proto = (req.headers['x-forwarded-proto'] || req.protocol || 'https');
  const host = req.get('host');
  return `${proto}://${host}`;
}

function assertAdmin(req, res) {
  const expected = process.env.ADMIN_TOKEN || '';
  const provided = req.headers['x-admin-token'] || '';
  if (!expected || expected !== provided) { res.status(401).json({ error: 'Unauthorized' }); return false; }
  return true;
}

// --- APIs (بدون تغيير) ---
app.post('/api/upload-image', upload.single('image'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No image' });
    const filename = nanoid(10) + '.webp';
    const out = path.join(uploadDir, filename);
    await sharp(req.file.buffer)
      .resize({ width: 2560, height: 2560, fit: 'inside', withoutEnlargement: true })
      .webp({ quality: 85 })
      .toFile(out);
    return res.json({ success: true, url: '/uploads/' + filename });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: 'Upload failed' });
  }
});

app.post('/api/save-design', async (req, res) => {
  try {
    if (!db) return res.status(500).json({ error: 'DB not connected' });
    const data = req.body || {};
    const inputs = data.inputs || {};
    ['input-name','input-tagline'].forEach(k => { if (inputs[k]) inputs[k] = DOMPurify.sanitize(String(inputs[k])); });
    data.inputs = inputs;
    const shortId = nanoid(8);
    await db.collection(designsCollectionName).insertOne({ shortId, data, createdAt: new Date() });
    res.json({ success: true, id: shortId });
  } catch (e) {
    console.error(e); res.status(500).json({ error: 'Save failed' });
  }
});

app.get('/api/get-design/:id', async (req, res) => {
  try {
    if (!db) return res.status(500).json({ error: 'DB not connected' });
    const id = String(req.params.id);
    const doc = await db.collection(designsCollectionName).findOne({ shortId: id });
    if (!doc) return res.status(404).json({ error: 'Design not found' });
    res.json(doc.data);
  } catch (e) {
    console.error(e); res.status(500).json({ error: 'Fetch failed' });
  }
});

app.get('/api/gallery', async (req, res) => {
  try {
    if (!db) return res.status(500).json({ error: 'DB not connected' });
    const docs = await db.collection(designsCollectionName).find({}).sort({ createdAt: -1 }).limit(20).toArray();
    res.json(docs);
  } catch (e) {
    console.error(e); res.status(500).json({ error: 'Fetch failed' });
  }
});

// --- API: خلفيات (إدارة) (بدون تغيير) ---
app.get('/api/gallery/backgrounds', async (req, res) => {
  try {
    if (!db) return res.status(500).json({ error: 'DB not connected' });
    const category = req.query.category;
    const page = Math.max(1, parseInt(req.query.page || '1', 10));
    const limit = Math.max(1, Math.min(100, parseInt(req.query.limit || '50', 10)));
    const skip = (page - 1) * limit;
    const q = (category && category !== 'all') ? { category: String(category) } : {};
    const coll = db.collection(backgroundsCollectionName);
    const [items, total] = await Promise.all([
      coll.find(q).sort({ createdAt: -1 }).skip(skip).limit(limit).toArray(),
      coll.countDocuments(q)
    ]);
    res.json({ success: true, items, page, limit, total, totalPages: Math.ceil(total / limit) });
  } catch (e) {
    console.error(e); res.status(500).json({ error: 'Fetch backgrounds failed' });
  }
});

// --- صفحة عرض SEO لكل بطاقة: /nfc/view/:id (بدون تغيير) ---
app.get('/nfc/view/:id', async (req, res) => {
  try {
    if (!db) return res.status(500).send('DB not connected');
    const id = String(req.params.id);
    const doc = await db.collection(designsCollectionName).findOne({ shortId: id });
    if (!doc) return res.status(404).send('Design not found');

    const base = absoluteBaseUrl(req);
    const pageUrl = `${base}/nfc/view/${id}/`;

    const inputs = doc.data?.inputs || {};
    const name = inputs['input-name'] || 'بطاقة عمل رقمية';
    const tagline = inputs['input-tagline'] || 'MC PRIME Digital Business Cards';
    const ogImage = doc.data?.imageUrls?.front
      ? (doc.data.imageUrls.front.startsWith('http') ? doc.data.imageUrls.front : `${base}${doc.data.imageUrls.front}`)
      : `${base}/nfc/og-image.png`;

    const keywords = [
        'NFC', 'بطاقة عمل ذكية', 'كارت شخصي', 
        name, 
        ...tagline.split(/\s+/).filter(Boolean)
    ].filter(Boolean).join(', ');

    res.render(path.join(rootDir, 'viewer.ejs'), {
      pageUrl,
      name,
      tagline,
      ogImage,
      keywords,
      design: doc.data,
      canonical: pageUrl
    });
  } catch (e) {
    console.error(e);
    res.status(500).send('View failed');
  }
});

// --- sitemap.xml و robots.txt (بدون تغيير) ---
app.get('/robots.txt', (req, res) => {
  const base = absoluteBaseUrl(req);
  const txt = [
    'User-agent: *',
    'Allow: /nfc/',
    'Disallow: /nfc/viewer',
    `Sitemap: ${base}/sitemap.xml`
  ].join('\n');
  res.type('text/plain').send(txt);
});

app.get('/sitemap.xml', async (req, res) => {
  try {
    const base = absoluteBaseUrl(req);
    const staticPages = [
      '/nfc/',
      '/nfc/gallery/',
      '/nfc/blog/',
      '/nfc/about/',
      '/nfc/contact/',
      '/nfc/privacy/'
    ];

    const blogPosts = [
      '/nfc/blog-nfc-at-events/',
      '/nfc/blog-digital-menus-for-restaurants/',
      '/nfc/blog-business-card-mistakes/'
    ];

    let designUrls = [];
    if (db) {
      const docs = await db.collection(designsCollectionName)
        .find({})
        .project({ shortId: 1, createdAt: 1 })
        .sort({ createdAt: -1 })
        .limit(2000)
        .toArray();

      designUrls = docs.map(d => ({
        loc: `${base}/nfc/view/${d.shortId}/`,
        lastmod: d.createdAt ? new Date(d.createdAt).toISOString() : undefined,
        changefreq: 'monthly',
        priority: '0.80'
      }));
    }

    function urlTag(loc, { lastmod, changefreq = 'weekly', priority = '0.7' } = {}) {
      return [
        '<url>',
        `<loc>${loc}</loc>`,
        lastmod ? `<lastmod>${lastmod}</lastmod>` : '',
        `<changefreq>${changefreq}</changefreq>`,
        `<priority>${priority}</priority>`,
        '</url>'
      ].join('');
    }

    const xml =
      [
        '<?xml version="1.0" encoding="UTF-8"?>',
        '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
        ...staticPages.map(p => urlTag(`${base}${p}`, { changefreq: 'weekly', priority: '0.9' })),
        ...blogPosts.map(p => urlTag(`${base}${p}`, { changefreq: 'monthly', priority: '0.7' })),
        ...designUrls.map(u => urlTag(u.loc, { lastmod: u.lastmod, changefreq: u.changefreq, priority: u.priority })),
        '</urlset>'
      ].join('');

    res.type('application/xml').send(xml);
  } catch (e) {
    console.error(e);
    res.status(500).send('Sitemap failed');
  }
});

// صحّة
app.get('/healthz', (req, res) => res.json({ ok: true }));

// الاستماع
app.listen(port, () => {
  console.log(`Server running on :${port}`);
});
