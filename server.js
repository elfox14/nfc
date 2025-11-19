// server.js
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
const { JSDOM } = require('jsdom');
const DOMPurifyFactory = require('dompurify');
const multer = require('multer');
const sharp = require('sharp');
const ejs = require('ejs');
const helmet = require('helmet');

const window = (new JSDOM('')).window;
const DOMPurify = DOMPurifyFactory(window);

const app = express();
app.use(compression());
const port = process.env.PORT || 3000;

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

app.use(helmet.contentSecurityPolicy({
    directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'", "https://cdnjs.cloudflare.com", "https://cdn.jsdelivr.net", "https://www.youtube.com", "https://www.googletagmanager.com"],
        styleSrc: ["'self'", "'unsafe-inline'", "https://cdnjs.cloudflare.com", "https://fonts.googleapis.com"],
        fontSrc: ["'self'", "https://fonts.gstatic.com", "https://cdnjs.cloudflare.com"],
        imgSrc: ["'self'", "data:", "https:", "blob:"], 
        mediaSrc: ["'self'", "data:"],
        frameSrc: ["'self'", "https://www.youtube.com"],
        connectSrc: ["'self'", "https://cdnjs.cloudflare.com", "https://cdn.jsdelivr.net", "https://nfc-vjy6.onrender.com"], // تأكد من إضافة نطاقك هنا
        objectSrc: ["'none'"],
        upgradeInsecureRequests: [],
    },
}));
// --- END: SECURITY HEADERS ---

app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.set('view engine', 'ejs');

const mongoUrl = process.env.MONGO_URI;
const dbName = process.env.MONGO_DB || 'nfc_db';
const designsCollectionName = process.env.MONGO_DESIGNS_COLL || 'designs';
const leadsCollectionName = 'leads'; // مجموعة جديدة لبيانات العملاء المحتملين
const backgroundsCollectionName = process.env.MONGO_BACKGROUNDS_COLL || 'backgrounds';
let db;

MongoClient.connect(mongoUrl)
  .then(client => { db = client.db(dbName); console.log('MongoDB connected'); })
  .catch(err => { console.error('Mongo connect error', err); process.exit(1); });

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

// --- مسار PWA Manifest ---
app.get('/manifest.json', (req, res) => {
    const base = absoluteBaseUrl(req);
    const manifest = {
        "name": "MC PRIME Card Editor",
        "short_name": "MC PRIME",
        "start_url": "/nfc/",
        "display": "standalone",
        "background_color": "#1c2a3b",
        "theme_color": "#4da6ff",
        "description": "أنشئ وشارك بطاقات العمل الذكية بسهولة.",
        "icons": [
            {
                "src": `${base}/nfc/mcprime-logo-transparent.png`, // تأكد من وجود أيقونة 192x192
                "sizes": "192x192",
                "type": "image/png"
            },
            {
                "src": `${base}/nfc/mcprime-logo-transparent.png`, // تأكد من وجود أيقونة 512x512
                "sizes": "512x512",
                "type": "image/png"
            }
        ]
    };
    res.json(manifest);
});

// --- مسار Service Worker ---
app.get('/service-worker.js', (req, res) => {
    res.sendFile(path.join(rootDir, 'service-worker.js'));
});


// --- صفحة عرض SEO الجديدة ---
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

    // تحضير المتغيرات للقالب
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

    // (ملاحظة: contactLinksHtml سيتم توليده في الـ Client-side عبر viewer.js للحفاظ على المرونة)
    // نحن فقط نمرر البيانات الخام للقالب
    
    res.render(path.join(rootDir, 'viewer.ejs'), {
      pageUrl,
      name,
      tagline,
      ogImage,
      keywords,
      design: doc.data,
      canonical: pageUrl,
      contactLinksHtml: '' // سيتم ملؤها بالـ JS
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
    if (!id) return res.status(404).send('Not found');
    res.redirect(301, `/nfc/viewer.html?id=${id}`);
  } catch (e) {
    res.status(500).send('Redirect failed.');
  }
});

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

app.get('/', (req, res) => {
  res.redirect(301, '/nfc/');
});

const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });
app.use('/uploads', express.static(uploadDir, { maxAge: '30d', immutable: true }));

// --- API ---
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
  message: 'Too many requests'
});
app.use('/api/', apiLimiter);

const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (file.mimetype && file.mimetype.startsWith('image/')) {
        cb(null, true);
    } else {
        cb(new Error('الرجاء رفع ملف صورة.'), false);
    }
  }
});

function handleMulterErrors(err, req, res, next) {
  if (err instanceof multer.MulterError) {
    return res.status(400).json({ error: `خطأ رفع: ${err.message}` });
  } else if (err) {
     return res.status(400).json({ error: err.message });
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
    if (!req.file) return res.status(400).json({ error: 'No file provided.' });

    const filename = nanoid(10) + '.webp';
    const out = path.join(uploadDir, filename);
    await sharp(req.file.buffer)
      .resize({ width: 2560, height: 2560, fit: 'inside', withoutEnlargement: true })
      .webp({ quality: 85 })
      .toFile(out);

    const base = absoluteBaseUrl(req);
    return res.json({ success: true, url: `${base}/uploads/${filename}` });
  } catch (e) {
    console.error('Image upload error:', e);
    return res.status(500).json({ error: 'Image processing failed.' });
  }
});

// --- NEW: Contact Exchange API ---
app.post('/api/exchange-contact', [
    body('cardId').notEmpty(),
    body('name').trim().notEmpty().escape(),
    body('email').trim().isEmail().normalizeEmail(),
    body('phone').trim().optional().escape(),
    body('message').trim().optional().escape()
], async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, errors: errors.array() });
    }

    try {
        if (!db) return res.status(500).json({ error: 'DB not connected' });
        
        const { cardId, name, email, phone, message } = req.body;
        
        // حفظ البيانات في مجموعة "leads"
        await db.collection(leadsCollectionName).insertOne({
            cardId,
            name,
            email,
            phone,
            message,
            createdAt: new Date()
        });

        // TODO: هنا يمكنك إضافة كود لإرسال بريد إلكتروني لصاحب البطاقة
        // باستخدام Nodemailer مثلاً لإعلامه بوجود عميل جديد.

        res.json({ success: true, message: 'تم إرسال بياناتك بنجاح!' });
    } catch (e) {
        console.error('Contact exchange error:', e);
        res.status(500).json({ success: false, error: 'Server error' });
    }
});


app.post('/api/save-design', [
    body('data.inputs.input-name').trim().notEmpty().isLength({ min: 2, max: 150 }),
    body('data.inputs.input-tagline').optional().trim().isLength({ max: 200 }),
    body('data.dynamic.staticSocial.email.value').optional({ checkFalsy: true }).trim().isEmail()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ error: 'Validation Failed', details: errors.array() });

    if (!db) return res.status(500).json({ error: 'DB not connected' });

    let data = req.body || {};
    if (data.inputs) data.inputs = sanitizeInputs(data.inputs);
     if (data.dynamic) {
         if(data.dynamic.phones) data.dynamic.phones = data.dynamic.phones.map(phone => ({...phone, value: DOMPurify.sanitize(String(phone.value || ''))}));
         if(data.dynamic.social) data.dynamic.social = data.dynamic.social.map(link => ({...link, value: DOMPurify.sanitize(String(link.value || ''))}));
         if(data.dynamic.staticSocial) {
             for (const key in data.dynamic.staticSocial) {
                 if (data.dynamic.staticSocial[key]) data.dynamic.staticSocial[key].value = DOMPurify.sanitize(String(data.dynamic.staticSocial[key].value || ''));
             }
         }
     }

    const shortId = nanoid(8);
    await db.collection(designsCollectionName).insertOne({ shortId, data, createdAt: new Date(), views: 0 });
    res.json({ success: true, id: shortId });
  } catch (e) {
    console.error('Save design error:', e);
     res.status(500).json({ error: 'Save failed' });
  }
});

app.get('/api/get-design/:id', async (req, res) => {
  try {
    if (!db) return res.status(500).json({ error: 'DB not connected' });
    const id = String(req.params.id);
    const doc = await db.collection(designsCollectionName).findOne({ shortId: id });
    if (!doc || !doc.data) return res.status(404).json({ error: 'Design not found' });

    res.json(doc.data);
  } catch (e) {
    res.status(500).json({ error: 'Fetch failed' });
  }
});

// --- API: Dashboard Analytics (Mock for now, connects to real 'views') ---
app.get('/api/analytics/:id', async (req, res) => {
    try {
        if (!db) return res.status(500).json({ error: 'DB not connected' });
        const id = String(req.params.id);
        
        // جلب بيانات المشاهدات الحقيقية
        const doc = await db.collection(designsCollectionName).findOne({ shortId: id }, { projection: { views: 1, createdAt: 1 } });
        
        // جلب عدد العملاء المحتملين (Leads)
        const leadsCount = await db.collection(leadsCollectionName).countDocuments({ cardId: id });

        if (!doc) return res.status(404).json({ error: 'Not found' });

        res.json({
            success: true,
            views: doc.views || 0,
            leads: leadsCount || 0,
            clicks: Math.floor((doc.views || 0) * 0.4), // محاكاة للنقرات
            saves: Math.floor((doc.views || 0) * 0.15) // محاكاة للحفظ
        });
    } catch (e) {
        res.status(500).json({ error: 'Analytics error' });
    }
});


app.get('/api/gallery', async (req, res) => {
  try {
    if (!db) return res.status(500).json({ error: 'DB not connected' });
    const page = parseInt(req.query.page || '1', 10);
    const limit = 12; 
    const skip = (page - 1) * limit;
    const findQuery = { 'data.imageUrls.capturedFront': { $exists: true, $ne: null } };

    const totalDocs = await db.collection(designsCollectionName).countDocuments(findQuery);
    const docs = await db.collection(designsCollectionName)
        .find(findQuery)
        .sort({ createdAt: -1 })
        .skip(skip).limit(limit)
        .project({ shortId: 1, 'data.inputs.input-name': 1, 'data.inputs.input-tagline': 1, 'data.imageUrls.capturedFront': 1, views: 1 })
        .toArray();

    res.json({ success: true, designs: docs, pagination: { page, limit, totalDocs, totalPages: Math.ceil(totalDocs / limit) } });
  } catch (e) {
    res.status(500).json({ error: 'Fetch failed' });
  }
});

app.get('/api/templates', async (req, res) => {
  try {
    if (!db) return res.status(500).json({ error: 'DB not connected' });
    const templates = await db.collection(designsCollectionName)
        .find({ "isTemplate": true, "data.imageUrls.capturedFront": { $exists: true } })
        .limit(20)
        .project({ shortId: 1, data: 1, name: "$data.inputs.input-name" })
        .toArray();
    res.json({ success: true, templates: templates });
  } catch (e) {
    res.status(500).json({ error: 'Fetch templates failed' });
  }
});

app.post('/api/upload-background', upload.single('image'), handleMulterErrors, async (req, res) => {
  try {
    if (!assertAdmin(req,res)) return;
    if (!req.file) return res.status(400).json({ error:'No file.' });
    if (!db) return res.status(500).json({ error: 'DB error' });

    const filename = 'bg_' + nanoid(10) + '.webp';
    const out = path.join(uploadDir, filename);
    await sharp(req.file.buffer).resize({ width: 3840 }).webp({ quality: 88 }).toFile(out);
    const base = absoluteBaseUrl(req);
    const payload = { shortId: nanoid(8), url: `${base}/uploads/${filename}`, name: req.body.name || 'خلفية', category: req.body.category || 'عام', createdAt: new Date() };
    await db.collection(backgroundsCollectionName).insertOne(payload);
    res.json({ success:true, background: payload });
  } catch (e) {
    res.status(500).json({ error: 'Upload failed' });
  }
});

app.get('/api/gallery/backgrounds', async (req, res) => {
  try {
    if (!db) return res.status(500).json({ error: 'DB not connected' });
    const coll = db.collection(backgroundsCollectionName);
    const items = await coll.find({}).sort({ createdAt: -1 }).limit(100).toArray();
    res.json({ success: true, items });
  } catch (e) {
    res.status(500).json({ error: 'Fetch failed' });
  }
});

app.get('/robots.txt', (req, res) => {
  const base = absoluteBaseUrl(req);
  const txt = `User-agent: *\nAllow: /nfc/\nAllow: /nfc/viewer.html\nDisallow: /nfc/editor\nSitemap: ${base}/sitemap.xml`;
  res.type('text/plain').send(txt);
});

app.get('/sitemap.xml', async (req, res) => {
  try {
    const base = absoluteBaseUrl(req);
    const staticPages = ['/nfc/', '/nfc/gallery'];
    let designUrls = [];
    if (db) {
      const docs = await db.collection(designsCollectionName).find({}).project({ shortId: 1 }).sort({ createdAt: -1 }).limit(1000).toArray();
      designUrls = docs.map(d => ({ loc: `${base}/nfc/viewer.html?id=${d.shortId}`, priority: '0.8' }));
    }
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${staticPages.map(p => `<url><loc>${base}${p}</loc><priority>0.9</priority></url>`).join('')}
${designUrls.map(u => `<url><loc>${u.loc}</loc><priority>${u.priority}</priority></url>`).join('')}
</urlset>`;
    res.type('application/xml').send(xml);
  } catch (e) {
    res.status(500).send('Sitemap failed');
  }
});

app.use('/nfc', express.static(rootDir, { extensions: ['html'] }));

app.use((err, req, res, next) => {
  console.error("Unhandled error:", err);
  res.status(500).json({ error: 'Internal Server Error' });
});

app.listen(port, () => {
  console.log(`Server running on port: ${port}`);
});
