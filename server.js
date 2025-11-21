// server.js - محدث لدعم Cloudinary
require('dotenv').config();
const express = require('express');
const compression = require('compression');
const { MongoClient } = require('mongodb');
const path = require('path');
const cors = require('cors');
// const fs = require('fs'); // لم نعد بحاجة لنظام الملفات المحلي للصور
const rateLimit = require('express-rate-limit');
const { nanoid } = require('nanoid');
// const { body, validationResult } = require('express-validator'); // غير مستخدم حالياً في الكود الأصلي
const { JSDOM } = require('jsdom');
const DOMPurifyFactory = require('dompurify');
const multer = require('multer');
const sharp = require('sharp');
// const ejs = require('ejs'); // Express يستخدمه تلقائياً عند ضبط view engine
const helmet = require('helmet');
const cloudinary = require('cloudinary').v2; // إضافة Cloudinary

const window = (new JSDOM('')).window;
const DOMPurify = DOMPurifyFactory(window);

const app = express();
app.use(compression());
const port = process.env.PORT || 3000;

// --- إعدادات Cloudinary ---
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

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
        scriptSrc: ["'self'", "https://cdnjs.cloudflare.com", "https://cdn.jsdelivr.net", "https://www.youtube.com", "https://unpkg.com"],
        styleSrc: ["'self'", "'unsafe-inline'", "https://cdnjs.cloudflare.com", "https://fonts.googleapis.com"],
        fontSrc: ["'self'", "https://fonts.gstatic.com"],
        // إضافة res.cloudinary.com للسماح بعرض الصور المرفوعة
        imgSrc: ["'self'", "data:", "https:", "https://i.imgur.com", "https://www.mcprim.com", "https://media.giphy.com", "https://nfc-vjy6.onrender.com", "https://res.cloudinary.com"],
        mediaSrc: ["'self'", "data:"],
        frameSrc: ["'self'", "https://www.youtube.com"],
        connectSrc: ["'self'", "https://cdnjs.cloudflare.com", "https://cdn.jsdelivr.net", "https://www.youtube.com", "https://www.mcprim.com", "https://media.giphy.com", "https://nfc-vjy6.onrender.com", "https://res.cloudinary.com"],
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
    // تعقيم الحقول الديناميكية
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

// --- صفحة عرض SEO الجديدة (صيغة Query) ---
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

    // Increment the view count
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
    // ... (باقي كود توليد الروابط للـ SEO يبقى كما هو، تم اختصاره هنا للتركيز على التغييرات)
    
    // *** تحسين: تحديد صورة OG Image الذكية ***
    const imageUrls = doc.data.imageUrls || {};
    let ogImage = `${base}/nfc/og-image.png`; // Default

    // الصور الآن روابط كاملة من Cloudinary، لذا لا نحتاج لإضافة الـ base url إذا كانت تبدأ بـ http
    if (imageUrls.capturedFront) {
        ogImage = imageUrls.capturedFront.startsWith('http')
            ? imageUrls.capturedFront
            : `${base}${imageUrls.capturedFront.startsWith('/') ? '' : '/'}${imageUrls.capturedFront}`;
    } else if (imageUrls.front) {
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
      contactLinksHtml: contactLinksHtml // SEO fallback
    });
  } catch (e) {
    console.error('Error in /nfc/viewer route:', e);
    res.setHeader('X-Robots-Tag', 'noindex, noarchive');
    res.status(500).send('View failed due to an internal server error.');
  }
});

// --- صفحة عرض SEO لكل بطاقة: /nfc/view/:id ---
app.get('/nfc/view/:id', async (req, res) => {
  try {
    const id = String(req.params.id);
    if (!id) return res.status(404).send('Not found');
    res.redirect(301, `/nfc/viewer.html?id=${id}`);
  } catch (e) {
    console.error('Error in /nfc/view/:id redirect route:', e);
    res.status(500).send('Redirect failed.');
  }
});

// هيدر كاش للملفات الثابتة
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

// إزالة .html
app.use((req, res, next) => {
  if (req.path.endsWith('.html') && !req.path.startsWith('/nfc/viewer.html')) { 
    const newPath = req.path.slice(0, -5);
    return res.redirect(301, newPath);
  }
  next();
});

// توجيه الجذر
app.get('/', (req, res) => {
  res.redirect(301, '/nfc/');
});

// --- واجهة برمجة التطبيقات (API) ---

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
  message: 'Too many requests from this IP'
});
app.use('/api/', apiLimiter);

const storage = multer.memoryStorage(); // استخدام الذاكرة بدلاً من القرص
const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
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
    return res.status(400).json({ error: `خطأ في رفع الملف: ${err.message}` });
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

// دالة مساعدة لرفع Buffer إلى Cloudinary
const uploadBufferToCloudinary = (buffer, folder) => {
    return new Promise((resolve, reject) => {
        const uploadStream = cloudinary.uploader.upload_stream(
            { folder: folder }, // المجلد في Cloudinary
            (error, result) => {
                if (error) return reject(error);
                resolve(result);
            }
        );
        uploadStream.end(buffer);
    });
};

// --- API: رفع صورة (معدل ليدعم Cloudinary) ---
app.post('/api/upload-image', upload.single('image'), handleMulterErrors, async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'لم يتم تقديم أي ملف صورة.' });

    // معالجة الصورة باستخدام Sharp (ضغط وتغيير الحجم)
    const processedBuffer = await sharp(req.file.buffer)
      .resize({ width: 2560, height: 2560, fit: 'inside', withoutEnlargement: true })
      .webp({ quality: 85 })
      .toBuffer();

    // الرفع إلى Cloudinary
    const result = await uploadBufferToCloudinary(processedBuffer, 'nfc-cards/user-uploads');

    // إرجاع رابط Cloudinary الآمن
    return res.json({ success: true, url: result.secure_url });

  } catch (e) {
    console.error('Image upload processing error:', e);
    return res.status(500).json({ error: 'فشل معالجة الصورة أو رفعها للسحابة.' });
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
    await db.collection(designsCollectionName).insertOne({ shortId, data, createdAt: new Date(), views: 0, analytics: {} });
    res.json({ success: true, id: shortId });
  } catch (e) {
    console.error('Save design error:', e);
    res.status(500).json({ error: 'Save failed' });
  }
});

// --- API: جلب تصميم ---
app.get('/api/get-design/:id', async (req, res) => {
  try {
    if (!db) return res.status(500).json({ error: 'DB not connected' });
    const id = String(req.params.id);
    const doc = await db.collection(designsCollectionName).findOne({ shortId: id });
    if (!doc || !doc.data) return res.status(404).json({ error: 'Design not found' });

    res.json(doc.data);
  } catch (e) {
    console.error('Get design error:', e);
    res.status(500).json({ error: 'Fetch failed' });
  }
});

// --- API: Analytics Tracking ---
app.post('/api/track-event', async (req, res) => {
    try {
        if (!db) return res.status(500).json({ error: 'DB not connected' });
        const { cardId, eventType, platform } = req.body;

        if (!cardId || !eventType) return res.status(400).json({ error: 'Missing data' });

        const updateField = platform
            ? `analytics.clicks.${platform}`
            : `analytics.events.${eventType}`;

        await db.collection(designsCollectionName).updateOne(
            { shortId: cardId },
            { $inc: { [updateField]: 1 } }
        );

        res.json({ success: true });
    } catch (e) {
        console.error('Tracking error:', e);
        res.status(500).json({ error: 'Tracking failed' });
    }
});

// --- API: المعرض ---
app.get('/api/gallery', async (req, res) => {
  try {
    if (!db) return res.status(500).json({ error: 'DB not connected' });

    const page = parseInt(req.query.page || '1', 10);
    const limit = 12;
    const skip = (page - 1) * limit;
    const sortBy = String(req.query.sortBy || 'createdAt');
    const sortQuery = sortBy === 'views' ? { views: -1 } : { createdAt: -1 };

    const findQuery = {
        'data.imageUrls.capturedFront': { $exists: true, $ne: null } 
    };

    const searchQuery = req.query.search;
    if (searchQuery) {
        findQuery.$or = [
            { 'data.inputs.input-name': { $regex: searchQuery, $options: 'i' } },
            { 'data.inputs.input-tagline': { $regex: searchQuery, $options: 'i' } }
        ];
    }

    const totalDocs = await db.collection(designsCollectionName).countDocuments(findQuery);
    const totalPages = Math.ceil(totalDocs / limit);

    const docs = await db.collection(designsCollectionName)
        .find(findQuery)
        .sort(sortQuery)
        .skip(skip)
        .limit(limit)
        .project({
            shortId: 1, 
            'data.inputs.input-name': 1, 
            'data.inputs.input-tagline': 1,
            'data.imageUrls.capturedFront': 1,
            'data.imageUrls.front': 1,
            createdAt: 1,
            views: 1
        })
        .toArray();

    res.json({ success: true, designs: docs, pagination: { page, limit, totalDocs, totalPages } });
  } catch (e) {
    console.error('Fetch gallery error:', e);
    res.status(500).json({ error: 'Fetch failed' });
  }
});

// --- API: القوالب ---
app.get('/api/templates', async (req, res) => {
  try {
    if (!db) return res.status(500).json({ error: 'DB not connected' });
    const templates = await db.collection(designsCollectionName)
        .find({ "isTemplate": true, "data.imageUrls.capturedFront": { $exists: true } })
        .sort({ createdAt: -1 })
        .limit(20)
        .project({ shortId: 1, data: 1, name: "$data.inputs.input-name" })
        .toArray();
    res.json({ success: true, templates: templates });
  } catch (e) {
    console.error('Fetch templates error:', e);
    res.status(500).json({ error: 'Fetch templates failed' });
  }
});

// --- API: الخلفيات (إدارة) - معدل لـ Cloudinary ---
app.post('/api/upload-background', upload.single('image'), handleMulterErrors, async (req, res) => {
    try {
        if (!assertAdmin(req,res)) return;
        if (!req.file) return res.status(400).json({ error:'No file' });
        
        const processedBuffer = await sharp(req.file.buffer)
            .resize({ width: 3840, height: 3840, fit: 'inside' })
            .webp({ quality: 88 })
            .toBuffer();

        // رفع الخلفية إلى Cloudinary
        const result = await uploadBufferToCloudinary(processedBuffer, 'nfc-cards/backgrounds');

        const payload = { 
            shortId: nanoid(8), 
            url: result.secure_url, // استخدام رابط Cloudinary
            name: req.body.name || 'BG', 
            category: req.body.category || 'General', 
            createdAt: new Date() 
        };
        
        await db.collection(backgroundsCollectionName).insertOne(payload);
        res.json({ success:true, background: payload });
    } catch(e) { 
        console.error("Bg upload error", e);
        res.status(500).json({error: 'Upload failed'}); 
    }
});

app.get('/api/gallery/backgrounds', async (req, res) => {
    try {
        if(!db) return res.status(500).json({error:'No DB'});
        const items = await db.collection(backgroundsCollectionName).find({}).toArray();
        res.json({success:true, items});
    } catch(e) { res.status(500).json({error: 'Fetch failed'}); }
});

app.delete('/api/backgrounds/:shortId', async (req, res) => {
    try {
        if(!assertAdmin(req,res)) return;
        await db.collection(backgroundsCollectionName).deleteOne({shortId: req.params.shortId});
        res.json({success:true});
    } catch(e) { res.status(500).json({error: 'Delete failed'}); }
});

// robots.txt & sitemap.xml
app.get('/robots.txt', (req, res) => {
  const base = absoluteBaseUrl(req);
  const txt = `User-agent: *\nAllow: /nfc/\nAllow: /nfc/viewer.html\nDisallow: /nfc/view/\nSitemap: ${base}/sitemap.xml`;
  res.type('text/plain').send(txt);
});

app.get('/sitemap.xml', async (req, res) => {
    res.status(200).send('<?xml version="1.0" encoding="UTF-8"?><urlset></urlset>');
});

app.get('/healthz', (req, res) => {
    res.json({ ok: true });
});

// معالج الملفات الثابتة (يأتي أخيراً)
app.use('/nfc', express.static(rootDir, { extensions: ['html'] }));

// معالج الأخطاء العام
app.use((err, req, res, next) => {
  console.error("Unhandled error:", err.stack || err);
  const statusCode = err.status || 500;
  if (!res.headersSent) res.status(statusCode).json({ error: 'Internal Server Error' });
});

app.listen(port, () => {
  console.log(`Server running on port: ${port}`);
});
