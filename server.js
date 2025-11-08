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
app.set('view engine', 'ejs');

app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// --- START: SECURITY HEADERS (HELMET) ---
app.use(helmet.frameguard({ action: 'deny' }));
app.use(helmet.xssFilter());
app.use(helmet.noSniff());
app.use(helmet.hsts({
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
}));

// Custom CSP (احتفظت بالمصادر التي استخدمتها في المشروع الأصلي)
app.use(helmet.contentSecurityPolicy({
    directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "https://cdnjs.cloudflare.com", "https://cdn.jsdelivr.net", "https://www.youtube.com"],
        styleSrc: ["'self'", "'unsafe-inline'", "https://cdnjs.cloudflare.com", "https://fonts.googleapis.com"],
        fontSrc: ["'self'", "https://fonts.gstatic.com"],
        imgSrc: ["'self'", "data:", "https:", "https://i.imgur.com", "https://www.mcprim.com", "https://media.giphy.com", process.env.SITE_BASE_URL || "https://nfc-vjy6.onrender.com"],
        mediaSrc: ["'self'", "data:"],
        frameSrc: ["'self'", "https://www.youtube.com"],
        connectSrc: ["'self'", "https://cdnjs.cloudflare.com", "https://cdn.jsdelivr.net", "https://www.youtube.com", "https://www.mcprim.com", "https://media.giphy.com", process.env.SITE_BASE_URL || "https://nfc-vjy6.onrender.com"],
        objectSrc: ["'none'"],
        upgradeInsecureRequests: [],
    },
}));
// --- END: SECURITY HEADERS (HELMET) ---

// --- Config DB names ---
const mongoUrl = process.env.MONGO_URI;
const dbName = process.env.MONGO_DB || 'nfc_db';
const designsCollectionName = process.env.MONGO_DESIGNS_COLL || 'designs';
const backgroundsCollectionName = process.env.MONGO_BACKGROUNDS_COLL || 'backgrounds';

if (!mongoUrl) {
  console.error('MONGO_URI not set in environment. Exiting.');
  process.exit(1);
}

// --- MongoDB connection (single shared client) ---
let db = null;
let mongoClient = null;

async function connectMongo() {
  mongoClient = new MongoClient(mongoUrl, { useNewUrlParser: true, useUnifiedTopology: true });
  await mongoClient.connect();
  db = mongoClient.db(dbName);
  console.log('MongoDB connected to', dbName);

  // Ensure indexes for faster queries and uniqueness
  try {
    await db.collection(designsCollectionName).createIndex({ shortId: 1 }, { unique: true, background: true });
    await db.collection(backgroundsCollectionName).createIndex({ shortId: 1 }, { unique: true, background: true });
    console.log('Indexes ensured');
  } catch (err) {
    console.warn('Index creation issue:', err.message || err);
  }
}

connectMongo().catch(err => {
  console.error('Failed to connect to MongoDB:', err);
  process.exit(1);
});

// --- Helpers ---
const rootDir = __dirname;

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
    // dynamic.social
    if (sanitized.dynamic && Array.isArray(sanitized.dynamic.social)) {
        sanitized.dynamic.social = sanitized.dynamic.social.map(link => ({
            ...link,
            value: link && link.value ? DOMPurify.sanitize(String(link.value)) : ''
        }));
    }
    if (sanitized.dynamic && Array.isArray(sanitized.dynamic.phones)) {
        sanitized.dynamic.phones = sanitized.dynamic.phones.map(phone => ({
            ...phone,
            value: phone && phone.value ? DOMPurify.sanitize(String(phone.value)) : ''
        }));
    }
    return sanitized;
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

// --- Uploads dir ---
const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

// --- Rate limiters ---
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
  message: 'Too many requests from this IP, please try again after 15 minutes'
});
app.use('/api/', apiLimiter);

// lighter limiter for public viewer endpoints
const viewLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 120,
  standardHeaders: true,
  legacyHeaders: false
});
app.use(['/nfc/viewer', '/nfc/viewer.html', '/nfc/view/:id'], viewLimiter);

// --- Multer setup for image uploads ---
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (req, file, cb) => {
    if (file.mimetype && file.mimetype.startsWith('image/')) {
        const allowed = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml'];
        if (allowed.includes(file.mimetype)) return cb(null, true);
        return cb(new Error('نوع الصورة غير مدعوم.'), false);
    }
    cb(new Error('الرجاء رفع ملف صورة.'), false);
  }
});

function handleMulterErrors(err, req, res, next) {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ error: `حجم الملف كبير جدًا. الحد الأقصى 10 ميجابايت.` });
    }
    return res.status(400).json({ error: `خطأ في رفع الملف: ${err.message}` });
  } else if (err) {
    return res.status(400).json({ error: err.message || 'خطأ في رفع الملف.' });
  }
  next();
}

// --- Routes ---

// Viewer SEO-friendly (uses ?id=)
app.get(['/nfc/viewer', '/nfc/viewer.html'], async (req, res) => {
  try {
    if (!db) {
        res.setHeader('X-Robots-Tag', 'noindex, noarchive');
        return res.status(500).send('DB not connected');
    }

    const id = String(req.query.id || '').trim();
    if (!id || id === 'undefined') {
         res.setHeader('X-Robots-Tag', 'noindex, noarchive');
         return res.status(400).send('Card ID is missing. Please provide an ?id= parameter.');
    }

    const doc = await db.collection(designsCollectionName).findOne({ shortId: id });

    if (!doc || !doc.data) {
        res.setHeader('X-Robots-Tag', 'noindex, noarchive');
        return res.status(404).send('Design not found or data is missing');
    }

    // increment view count (fire-and-forget)
    db.collection(designsCollectionName).updateOne({ shortId: id }, { $inc: { views: 1 } }).catch(e => console.error('Inc views failed', e));

    res.setHeader('X-Robots-Tag', 'index, follow');

    const base = absoluteBaseUrl(req);
    const pageUrl = `${base}/nfc/viewer.html?id=${encodeURIComponent(id)}`;

    const inputs = doc.data.inputs || {};
    const name = DOMPurify.sanitize(inputs['input-name'] || 'بطاقة عمل رقمية');
    const tagline = DOMPurify.sanitize(inputs['input-tagline'] || '');

    // build contact links HTML (maintain original behavior)
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

    // Determine OG image (prefer imageUrls.front)
    const imageUrls = doc.data.imageUrls || {};
    let ogImage = `${base}/nfc/og-image.png`;
    if (imageUrls.front) {
        ogImage = imageUrls.front.startsWith('http') ? imageUrls.front : `${base}${imageUrls.front.startsWith('/') ? '' : '/'}${imageUrls.front}`;
    }

    const keywords = [
        'NFC', 'بطاقة عمل ذكية', 'كارت شخصي',
        name,
        ...(tagline ? tagline.split(/\s+/).filter(Boolean) : [])
    ].filter(Boolean).join(', ');

    res.render(path.join(rootDir, 'viewer.ejs'), {
      pageUrl,
      name,
      tagline,
      ogImage,
      keywords,
      design: doc.data,
      canonical: pageUrl,
      contactLinksHtml
    });
  } catch (e) {
    console.error('Error in /nfc/viewer route:', e);
    res.setHeader('X-Robots-Tag', 'noindex, noarchive');
    res.status(500).send('View failed due to an internal server error.');
  }
});

// Redirect old style /nfc/view/:id -> new ?id= url
app.get('/nfc/view/:id', async (req, res) => {
  try {
    const id = String(req.params.id || '').trim();
    if (!id) return res.status(404).send('Not found');
    res.redirect(301, `/nfc/viewer.html?id=${encodeURIComponent(id)}`);
  } catch (e) {
    console.error('Error in /nfc/view/:id redirect route:', e);
    res.status(500).send('Redirect failed.');
  }
});

// Cache headers helper (simple)
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

// Remove .html from old links except the viewer new path
app.use((req, res, next) => {
  if (req.path.endsWith('.html') && !req.path.startsWith('/nfc/viewer.html')) {
    const newPath = req.path.slice(0, -5);
    return res.redirect(301, newPath);
  }
  next();
});

// Root redirect to /nfc/
app.get('/', (req, res) => {
  res.redirect(301, '/nfc/');
});

// Serve uploads
app.use('/uploads', express.static(uploadDir, { maxAge: '30d', immutable: true }));

// --- API endpoints ---
// Image upload (public)
app.post('/api/upload-image', upload.single('image'), handleMulterErrors, async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'لم يتم تقديم أي ملف صورة.' });

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
    return res.status(500).json({ error: 'فشل معالجة الصورة بعد الرفع.' });
  }
});

// Save design
app.post('/api/save-design', async (req, res) => {
  try {
    if (!db) return res.status(500).json({ error: 'DB not connected' });
    let data = req.body || {};

    // sanitize inputs before saving
    if (data.inputs) data.inputs = sanitizeInputs(data.inputs);
    if (data.dynamic) {
      if (Array.isArray(data.dynamic.phones)) {
        data.dynamic.phones = data.dynamic.phones.map(p => ({ ...p, value: p && p.value ? DOMPurify.sanitize(String(p.value)) : '' }));
      }
      if (Array.isArray(data.dynamic.social)) {
        data.dynamic.social = data.dynamic.social.map(s => ({ ...s, value: s && s.value ? DOMPurify.sanitize(String(s.value)) : '' }));
      }
      if (data.dynamic.staticSocial) {
        for (const k in data.dynamic.staticSocial) {
          if (data.dynamic.staticSocial[k] && data.dynamic.staticSocial[k].value) {
            data.dynamic.staticSocial[k].value = DOMPurify.sanitize(String(data.dynamic.staticSocial[k].value));
          }
        }
      }
    }

    const shortId = nanoid(8);
    await db.collection(designsCollectionName).insertOne({ shortId, data, createdAt: new Date(), views: 0 });
    res.json({ success: true, id: shortId });
  } catch (e) {
    console.error('Save design error:', e);
    return res.status(500).json({ error: 'Save failed' });
  }
});

// Get design JSON
app.get('/api/get-design/:id', async (req, res) => {
  try {
    if (!db) return res.status(500).json({ error: 'DB not connected' });
    const id = String(req.params.id || '').trim();
    const doc = await db.collection(designsCollectionName).findOne({ shortId: id });
    if (!doc || !doc.data) return res.status(404).json({ error: 'Design not found or data missing' });
    res.json(doc.data);
  } catch (e) {
    console.error('Get design error:', e);
    return res.status(500).json({ error: 'Fetch failed' });
  }
});

// Gallery (latest designs)
app.get('/api/gallery', async (req, res) => {
  try {
    if (!db) return res.status(500).json({ error: 'DB not connected' });
    const docs = await db.collection(designsCollectionName)
        .find({})
        .sort({ createdAt: -1 })
        .limit(20)
        .project({ shortId: 1, 'data.inputs.input-name': 1, 'data.imageUrls.thumbnail': 1, createdAt: 1 })
        .toArray();
    res.json(docs);
  } catch (e) {
    console.error('Fetch gallery error:', e);
    return res.status(500).json({ error: 'Fetch failed' });
  }
});

// Backgrounds management (upload)
app.post('/api/upload-background', upload.single('image'), handleMulterErrors, async (req, res) => {
  try {
    if (!assertAdmin(req, res)) return;
    if (!req.file) return res.status(400).json({ error: 'لم يتم تقديم أي ملف صورة.' });
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
    res.json({ success: true, background: payload });
  } catch (e) {
    console.error('Upload background error:', e);
    return res.status(500).json({ error: 'Upload background failed' });
  }
});

// Fetch backgrounds (paginated)
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
    console.error('Fetch backgrounds error:', e);
    return res.status(500).json({ error: 'Fetch backgrounds failed' });
  }
});

// Delete background
app.delete('/api/backgrounds/:shortId', async (req, res) => {
  try {
    if (!assertAdmin(req, res)) return;
    if (!db) return res.status(500).json({ error: 'DB not connected' });
    const shortId = String(req.params.shortId || '').trim();
    const coll = db.collection(backgroundsCollectionName);
    const doc = await coll.findOne({ shortId });
    if (!doc) return res.status(404).json({ error: 'Not found' });

    // delete file if exists
    if (doc.url) {
      try {
        const urlParts = doc.url.split('/');
        const filename = urlParts[urlParts.length - 1];
        if (filename) {
          const filePath = path.join(uploadDir, filename);
          if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
            console.log(`Deleted file: ${filePath}`);
          } else {
            console.warn(`File not found for deletion: ${filePath}`);
          }
        }
      } catch (fileErr) {
        console.error(`Error deleting file for background ${shortId}:`, fileErr);
      }
    }

    await coll.deleteOne({ shortId });
    res.json({ success: true });
  } catch (e) {
    console.error('Delete background error:', e);
    return res.status(500).json({ error: 'Delete failed' });
  }
});

// robots.txt
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

// sitemap.xml (dynamic)
app.get('/sitemap.xml', async (req, res) => {
  try {
    const base = absoluteBaseUrl(req);
    const staticPages = [
      '/nfc/',
      '/nfc/gallery',
      '/nfc/blog',
      '/nfc/privacy'
    ];

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
${designUrls.map(u => urlTag(u.loc, { lastmod: u.lastmod, changefreq: u.changefreq, priority: u.priority })).join('')}
</urlset>`;

    res.type('application/xml').send(xml);
  } catch (e) {
    console.error('Sitemap generation error:', e);
    res.status(500).send('Sitemap failed');
  }
});

// health check
app.get('/healthz', (req, res) => {
  // Try to detect connection status from mongoClient
  const status = (mongoClient && mongoClient.topology && (mongoClient.topology.isConnected && mongoClient.topology.isConnected())) ? 'connected' : 'unknown';
  res.json({ ok: !!db, db_status: status });
});

// static files (should be last for /nfc so viewer route runs before static)
app.use('/nfc', express.static(rootDir, { extensions: ['html'] }));

// global error handler (last)
app.use((err, req, res, next) => {
  console.error("Unhandled error:", err && (err.stack || err));
  const statusCode = err && err.status ? err.status : 500;
  const message = process.env.NODE_ENV === 'production' ? 'Internal Server Error' : (err && err.message ? err.message : 'Internal Server Error');
  if (!res.headersSent) {
    res.status(statusCode).json({ error: message });
  }
});

// start
app.listen(port, () => {
  console.log(`Server running on port: ${port}`);
});
