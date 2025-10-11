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

const rootDir = __dirname;

// أدوات مساعدة
function absoluteBaseUrl(req) {
  const envBase = process.env.SITE_BASE_URL || `https://${req.get('host')}`;
  if (envBase) return envBase.replace(/\/+$/, '');
  const proto = (req.headers['x-forwarded-proto'] || req.protocol || 'https');
  const host = req.get('host');
  return `${proto}://${host}`;
}

// --- START: REVERTED ROUTE TO OLD STRUCTURE ---
// The route is now back to /nfc/view/:id
app.get('/nfc/view/:id', async (req, res) => {
  try {
    if (!db) {
        res.setHeader('X-Robots-Tag', 'noindex, noarchive');
        return res.status(500).send('DB not connected');
    }
    const id = String(req.params.id);
    const doc = await db.collection(designsCollectionName).findOne({ shortId: id });

    if (!doc) {
        res.setHeader('X-Robots-Tag', 'noindex, noarchive');
        return res.status(404).send('Design not found');
    }
    
    db.collection(designsCollectionName).updateOne(
      { shortId: id },
      { $inc: { views: 1 } }
    ).catch(err => console.error(`Failed to increment view count for ${id}:`, err));

    res.setHeader('X-Robots-Tag', 'index, follow');

    const base = absoluteBaseUrl(req);
    // Note: The pageUrl construction for SEO/OG tags will be different now
    const pageUrl = `${base}/nfc/viewer.html?id=${id}`;
    
    const inputs = doc.data?.inputs || {};
    const name = inputs['input-name'] || 'بطاقة عمل رقمية';
    const tagline = inputs['input-tagline'] || 'MC PRIME Digital Business Cards';

    const ogImage = doc.data?.cardFaceUrls?.front
      ? (doc.data.cardFaceUrls.front.startsWith('http') ? doc.data.cardFaceUrls.front : `${base}${doc.data.cardFaceUrls.front}`)
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
    res.setHeader('X-Robots-Tag', 'noindex, noarchive');
    res.status(500).send('View failed');
  }
});
// --- END: REVERTED ROUTE ---

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

app.use(express.static(rootDir, { extensions: ['html'] }));

const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });
app.use('/uploads', express.static(uploadDir, { maxAge: '30d', immutable: true }));

const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (file.mimetype && file.mimetype.startsWith('image/')) cb(null, true);
    else cb(new Error('Please upload an image'), false);
  }
});

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  standardHeaders: true,
  legacyHeaders: false
});
app.use('/api/', apiLimiter);

function assertAdmin(req, res) {
  const expected = process.env.ADMIN_TOKEN || '';
  const provided = req.headers['x-admin-token'] || '';
  if (!expected || expected !== provided) { res.status(401).json({ error: 'Unauthorized' }); return false; }
  return true;
}

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
    
    const clientData = req.body || {};
    
    if (clientData.inputs) {
      ['input-name', 'input-tagline'].forEach(k => {
        if (clientData.inputs[k]) {
          clientData.inputs[k] = DOMPurify.sanitize(String(clientData.inputs[k]));
        }
      });
    }
    
    const shortId = nanoid(8);
    await db.collection(designsCollectionName).insertOne({
      shortId,
      data: clientData,
      createdAt: new Date(),
      views: 0
    });

    res.json({ success: true, id: shortId });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Save failed' });
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

app.post('/api/upload-background', upload.single('image'), async (req, res) => {
  try {
    if (!assertAdmin(req,res)) return;
    if (!req.file) return res.status(400).json({ error:'No image' });
    if (!db) return res.status(500).json({ error: 'DB not connected' });
    const filename = 'bg_' + nanoid(10) + '.webp';
    const out = path.join(uploadDir, filename);
    await sharp(req.file.buffer)
      .resize({ width: 3840, height: 3840, fit: 'inside', withoutEnlargement: true })
      .webp({ quality: 88 })
      .toFile(out);
    const payload = {
      shortId: nanoid(8),
      url: '/uploads/' + filename,
      name: String(req.body.name || 'خلفية'),
      category: String(req.body.category || 'عام'),
      createdAt: new Date()
    };
    await db.collection(backgroundsCollectionName).insertOne(payload);
    res.json({ success:true, background: payload });
  } catch (e) {
    console.error(e); res.status(500).json({ error: 'Upload background failed' });
  }
});

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

app.delete('/api/backgrounds/:shortId', async (req, res) => {
  try {
    if (!assertAdmin(req,res)) return;
    if (!db) return res.status(500).json({ error: 'DB not connected' });
    const shortId = String(req.params.shortId);
    const coll = db.collection(backgroundsCollectionName);
    const doc = await coll.findOne({ shortId });
    if (!doc) return res.status(404).json({ error: 'Not found' });
    const filePath = path.join(uploadDir, path.basename(doc.url));
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    await coll.deleteOne({ shortId });
    res.json({ success: true });
  } catch (e) {
    console.error(e); res.status(500).json({ error: 'Delete failed' });
  }
});


app.get('/robots.txt', (req, res) => {
  const base = absoluteBaseUrl(req);
  const txt = [
    'User-agent: *',
    'Allow: /nfc/',
    // We don't need to explicitly allow /view/ anymore
    'Disallow: /view/',
    `Sitemap: ${base}/sitemap.xml`
  ].join('\n');
  res.type('text/plain').send(txt);
});

app.get('/sitemap.xml', async (req, res) => {
  try {
    const base = absoluteBaseUrl(req);
    const staticPages = [
      '/nfc/',
      '/nfc/gallery',
      '/nfc/blog',
      '/nfc/about',
      '/nfc/contact',
      '/nfc/privacy'
    ];

    const blogPosts = [
      '/nfc/blog-nfc-at-events',
      '/nfc/blog-digital-menus-for-restaurants',
      '/nfc/blog-business-card-mistakes'
    ];

    let designUrls = [];
    if (db) {
      const docs = await db.collection(designsCollectionName)
        .find({})
        .project({ shortId: 1, createdAt: 1 })
        .sort({ createdAt: -1 })
        .limit(2000)
        .toArray();

      // Revert sitemap to use the old URL structure
      designUrls = docs.map(d => ({
        loc: `${base}/nfc/viewer.html?id=${d.shortId}`,
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

app.get('/healthz', (req, res) => res.json({ ok: true }));

app.listen(port, () => {
  console.log(`Server running on :${port}`);
});
