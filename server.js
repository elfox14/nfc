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
const helmet = require('helmet');

const window = (new JSDOM('')).window;
const DOMPurify = DOMPurifyFactory(window);

const app = express();
const port = process.env.PORT || 3000;

// --- إعدادات عامة ---
app.set('trust proxy', 1);
app.disable('x-powered-by');

// --- START: SECURITY HEADERS (HELMET) ---
app.use(helmet.frameguard({ action: 'deny' }));
app.use(helmet.xssFilter());
app.use(helmet.noSniff());
app.use(helmet.hsts({ 
    maxAge: 31536000, 
    includeSubDomains: true,
    preload: true
}));

// Custom CSP to allow necessary external resources
app.use(helmet.contentSecurityPolicy({
    directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "https://cdnjs.cloudflare.com", "https://cdn.jsdelivr.net", "https://www.youtube.com"],
        styleSrc: ["'self'", "'unsafe-inline'", "https://cdnjs.cloudflare.com", "https://fonts.googleapis.com"],
        fontSrc: ["'self'", "https://fonts.gstatic.com"],
        imgSrc: ["'self'", "data:", "https:", "https://i.imgur.com", "https://www.mcprim.com", "https://media.giphy.com", "https://nfc-vjy6.onrender.com"],
        mediaSrc: ["'self'", "data:"],
        frameSrc: ["'self'", "https://www.youtube.com"],
        connectSrc: ["'self'", "https://cdnjs.cloudflare.com", "https://cdn.jsdelivr.net", "https://www.youtube.com", "https://www.mcprim.com", "https://media.giphy.com", "https://nfc-vjy6.onrender.com"],
        objectSrc: ["'none'"],
        upgradeInsecureRequests: [],
    },
}));
// --- END: SECURITY HEADERS (HELMET) ---

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
  const envBase = process.env.SITE_BASE_URL;
  if (envBase) return envBase.replace(/\/+$/, '');
  const proto = (req.headers['x-forwarded-proto'] || req.protocol || 'https');
  const host = req.get('host');
  return `${proto}://${host}`;
}

// قائمة بالحقول النصية التي يجب تعقيمها
const FIELDS_TO_SANITIZE = [
    'input-name', 'input-tagline', 
    'input-email', 'input-website', 
    'input-whatsapp', 'input-facebook', 'input-linkedin'
];

// دالة تعقيم لكائن الإدخالات
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
            value: DOMPurify.sanitize(String(link.value))
        }));
    }
    return sanitized;
}

// --- صفحة عرض SEO لكل بطاقة: /nfc/view/:id ---
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
    
    // Increment the view count
    db.collection(designsCollectionName).updateOne(
      { shortId: id },
      { $inc: { views: 1 } }
    ).catch(err => console.error(`Failed to increment view count for ${id}:`, err));

    res.setHeader('X-Robots-Tag', 'index, follow');

    const base = absoluteBaseUrl(req);
    const pageUrl = `${base}/nfc/view/${id}`;
    
    // === بداية التصحيح: إزالة ?. ===
    const inputs = (doc.data && doc.data.inputs) ? doc.data.inputs : {};
    const name = DOMPurify.sanitize(inputs['input-name'] || 'بطاقة عمل رقمية');
    const tagline = DOMPurify.sanitize(inputs['input-tagline'] || 'MC PRIME Digital Business Cards');
    
    // كود توليد HTML للروابط
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
    // === التصحيح: إزالة ?. ===
    const staticSocial = (doc.data && doc.data.dynamic && doc.data.dynamic.staticSocial) ? doc.data.dynamic.staticSocial : {};
    
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
            linksHTML.push(`<a href="${fullUrl}" class="contact-link" target="_blank" rel="noopener noreferrer"><i class="${platform.icon}"></i><span>${displayValue}</span></a>`);
        }
    });

    // === التصحيح: إزالة ?. ===
    if (doc.data && doc.data.dynamic && doc.data.dynamic.phones) {
        doc.data.dynamic.phones.forEach(phone => {
            if (phone && phone.value) {
                const cleanNumber = DOMPurify.sanitize(phone.value).replace(/\D/g, '');
                linksHTML.push(`<a href="tel:${cleanNumber}" class="contact-link"><i class="fas fa-phone"></i><span>${DOMPurify.sanitize(phone.value)}</span></a>`);
            }
        });
    }

    // === التصحيح: إزالة ?. ===
    if (doc.data && doc.data.dynamic && doc.data.dynamic.social) {
        doc.data.dynamic.social.forEach(link => {
            if (link && link.value && link.platform && platforms[link.platform]) {
                const platform = platforms[link.platform];
                const value = DOMPurify.sanitize(link.value);
                let displayValue = value;
                let fullUrl = value;
                fullUrl = !/^(https?:\/\/)/i.test(value) ? `${platform.prefix}${value}` : value;
                displayValue = value.replace(/^(https?:\/\/)?(www\.)?/, '');
                linksHTML.push(`<a href="${fullUrl}" class="contact-link" target="_blank" rel="noopener noreferrer"><i class="${platform.icon}"></i><span>${displayValue}</span></a>`);
            }
        });
    }

    if(linksHTML.length > 0) {
      contactLinksHtml = `<div class="links-group">${linksHTML.join('')}</div>`;
    } else {
      contactLinksHtml = '<p style="text-align: center; color: #999;">لا توجد روابط متاحة</p>';
    }

    // === التصحيح: إزالة ?. (هذا هو السطر الذي سبب الخطأ) ===
    let ogImage = `${base}/nfc/og-image.png`; // Default
    if (doc.data && doc.data.imageUrls && doc.data.imageUrls.front) {
        ogImage = doc.data.imageUrls.front.startsWith('http') 
          ? doc.data.imageUrls.front 
          : `${base}${doc.data.imageUrls.front}`;
    }
    // === نهاية التصحيح ===

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
      canonical: pageUrl,
      contactLinksHtml: contactLinksHtml
    });
  } catch (e) {
    console.error(e);
    res.setHeader('X-Robots-Tag', 'noindex, noarchive');
    res.status(500).send('View failed');
  }
});

// هيدر كاش للملفات الثابتة
app.use((req, res, next) => {
  if (req.path.endsWith('.html') || req.path.endsWith('/')) {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
  } else {
    // (تم التعديل مسبقاً) مدة كاش 7 أيام
    res.setHeader('Cache-Control', 'public, max-age=604800');
  }
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

// خدمة كل المشروع كملفات ثابتة
app.use(express.static(rootDir, { extensions: ['html'] }));

// مجلد uploads
const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });
app.use('/uploads', express.static(uploadDir, { maxAge: '30d', immutable: true }));

// عتاد الرفع/المعالجة
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (file.mimetype && file.mimetype.startsWith('image/')) cb(null, true);
    else cb(new Error('Please upload an image'), false);
  }
});

// ريت-لميت للـ API
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

// --- API: رفع صورة ---
app.post('/api/upload-image', upload.single('image'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No image' });
    const filename = nanoid(10) + '.webp';
    const out = path.join(uploadDir, filename);
    await sharp(req.file.buffer)
      .resize({ width: 2560, height: 2560, fit: 'inside', withoutEnlargement: true })
      .webp({ quality: 85 })
      .toFile(out);
    
    const base = absoluteBaseUrl(req);
    return res.json({ success: true, url: `${base}/uploads/${filename}` });

  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: 'Upload failed' });
  }
});

// --- API: حفظ تصميم ---
app.post('/api/save-design', async (req, res) => {
  try {
    if (!db) return res.status(500).json({ error: 'DB not connected' });
    
    let data = req.body || {};
    
    if (data.inputs) {
        data.inputs = sanitizeInputs(data.inputs);
    }
    
    const shortId = nanoid(8);
    await db.collection(designsCollectionName).insertOne({ shortId, data, createdAt: new Date(), views: 0 });
    res.json({ success: true, id: shortId });
  } catch (e) {
    console.error(e); res.status(500).json({ error: 'Save failed' });
  }
});

// --- API: جلب تصميم ---
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

// --- API: المعرض ---
app.get('/api/gallery', async (req, res) => {
  try {
    if (!db) return res.status(500).json({ error: 'DB not connected' });
    const docs = await db.collection(designsCollectionName).find({}).sort({ createdAt: -1 }).limit(20).toArray();
    res.json(docs);
  } catch (e) {
    console.error(e); res.status(500).json({ error: 'Fetch failed' });
  }
});

// --- API: خلفيات (إدارة) ---
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
    
    const base = absoluteBaseUrl(req);

    const payload = {
      shortId: nanoid(8),
      url: `${base}/uploads/${filename}`,
      name: DOMPurify.sanitize(String(req.body.name || 'خلفية')),
      category: DOMPurify.sanitize(String(req.body.category || 'عام')),
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


// (تم التعديل مسبقاً) robots.txt
app.get('/robots.txt', (req, res) => {
  const base = absoluteBaseUrl(req);
  const txt = [
    'User-agent: *',
    'Allow: /nfc/',
    'Allow: /nfc/view/',
    'Disallow: /nfc/editor',
    'Disallow: /nfc/editor.html',
    'Disallow: /nfc/viewer.html',
    `Sitemap: ${base}/sitemap.xml`
  ].join('\n');
  res.type('text/plain').send(txt);
});

// --- sitemap.xml (ديناميكي) ---
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
