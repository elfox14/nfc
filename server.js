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
const helmet = require('helmet'); // <--- NEW

const window = (new JSDOM('')).window;
const DOMPurify = DOMPurifyFactory(window);

const app = express();
const port = process.env.PORT || 3000;

// --- إعدادات عامة ---
app.set('trust proxy', 1);
app.disable('x-powered-by');

// --- START: SECURITY HEADERS (HELMET) ---
app.use(helmet.frameguard({ action: 'deny' })); // Clickjacking Protection
app.use(helmet.xssFilter()); // Basic XSS protection
app.use(helmet.noSniff()); // MIME-type sniffing prevention
app.use(helmet.hsts({ 
    maxAge: 31536000, 
    includeSubDomains: true,
    preload: true
})); // Enforce HTTPS for a long time (Requires site to be fully HTTPS)

// Custom CSP to allow necessary external resources (cdnjs, cdn.jsdelivr, YouTube, Giphy)
app.use(helmet.contentSecurityPolicy({
    directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "https://cdnjs.cloudflare.com", "https://cdn.jsdelivr.net", "https://www.youtube.com"],
        styleSrc: ["'self'", "'unsafe-inline'", "https://cdnjs.cloudflare.com", "https://fonts.googleapis.com"],
        fontSrc: ["'self'", "https://fonts.gstatic.com"],
        imgSrc: ["'self'", "data:", "https:", "https://i.imgur.com", "https://www.mcprim.com", "https://media.giphy.com", "https://nfc-vjy6.onrender.com"], // Added API URL for images
        mediaSrc: ["'self'", "data:"], // Allows base64 encoded audio
        frameSrc: ["'self'", "https://www.youtube.com"],
        connectSrc: ["'self'", "https://cdnjs.cloudflare.com", "https://cdn.jsdelivr.net", "https://www.youtube.com", "https://www.mcprim.com", "https://media.giphy.com", "https://nfc-vjy6.onrender.com"], // Allow API calls and external services
        objectSrc: ["'none'"],
        upgradeInsecureRequests: [], // Automatically upgrade HTTP to HTTPS if possible
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

// قائمة بالحقول النصية التي يجب تعقيمها من الـ HTML (للحماية من XSS بعد الحفظ)
const FIELDS_TO_SANITIZE = [
    'input-name', 'input-tagline', 
    'input-email', 'input-website', 
    'input-whatsapp', 'input-facebook', 'input-linkedin'
];

// دالة تعقيم لكائن الإدخالات (موجودة بالفعل)
function sanitizeInputs(inputs) {
    if (!inputs) return {};
    const sanitized = { ...inputs };
    FIELDS_TO_SANITIZE.forEach(k => { 
        if (sanitized[k]) {
            sanitized[k] = DOMPurify.sanitize(String(sanitized[k]));
        }
    });
    // تعقيم الحقول الديناميكية (مثل الروابط المضافة حديثًا)
    if (sanitized.dynamic && sanitized.dynamic.social) {
        sanitized.dynamic.social = sanitized.dynamic.social.map(link => ({
            ...link,
            value: DOMPurify.sanitize(String(link.value))
        }));
    }
    return sanitized;
}

// --- صفحة عرض SEO لكل بطاقة: /nfc/view/:id ---
// تم نقل هذا المسار للأعلى ليتم تنفيذه قبل خدمة الملفات الثابتة
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
    
    // Increment the view count for the card in the background.
    db.collection(designsCollectionName).updateOne(
      { shortId: id },
      { $inc: { views: 1 } }
    ).catch(err => console.error(`Failed to increment view count for ${id}:`, err));

    res.setHeader('X-Robots-Tag', 'index, follow');

    const base = absoluteBaseUrl(req);
    const pageUrl = `${base}/nfc/view/${id}`;
    
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
    res.setHeader('X-Robots-Tag', 'noindex, noarchive');
    res.status(500).send('View failed');
  }
});

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

// خدمة كل المشروع كملفات ثابتة (مع دعم extensions: ['html'])
// يأتي هذا الأمر الآن بعد المسارات الديناميكية المهمة
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
    return res.json({ success: true, url: '/uploads/' + filename });
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
    
    // *** تعديل: إضافة الرابط الأساسي ***
    const base = absoluteBaseUrl(req); 
    const payload = {
      shortId: nanoid(8),
      url: `${base}/uploads/${filename}`, // *** تعديل: حفظ الرابط الكامل ***
      name: DOMPurify.sanitize(String(req.body.name || 'خلفية')), // Sanitization here
      category: DOMPurify.sanitize(String(req.body.category || 'عام')), // Sanitization here
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
    
    // *** تعديل: إضافة الرابط الأساسي ***
    const base = absoluteBaseUrl(req); 
    const [items, total] = await Promise.all([
      coll.find(q).sort({ createdAt: -1 }).skip(skip).limit(limit).toArray(),
      coll.countDocuments(q)
    ]);
    
    // --- *** تعديل: إصلاح الروابط النسبية *** ---
    const fixedItems = items.map(item => {
        // إذا كان الرابط موجوداً ويبدأ بـ /uploads/ (مسار نسبي)
        if (item.url && item.url.startsWith('/uploads/')) {
            // قم بدمجه مع الرابط الأساسي للخادم
            item.url = `${base}${item.url}`;
        }
        return item;
    });
    // --- نهاية التعديل ---

    res.json({ success: true, items: fixedItems, page, limit, total, totalPages: Math.ceil(total / limit) });
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

// --- API: تسجيل بريد إلكتروني (جديد) ---
app.post('/api/subscribe', [
    body('email').isEmail().normalizeEmail(),
    body('cardId').isString().isLength({ min: 6, max: 20 }) // التحقق من المدخلات
], async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    try {
        if (!db) return res.status(500).json({ error: 'DB not connected' });
        
        const { email, cardId } = req.body;

        // 1. ابحث عن صاحب البطاقة للتأكد من وجوده
        const cardOwner = await db.collection(designsCollectionName).findOne({ shortId: cardId });
        if (!cardOwner) {
            return res.status(404).json({ error: 'Card owner not found' });
        }

        // 2. احفظ الاشتراك في collection جديد
        const subscriptionCollection = db.collection('subscriptions'); // اسم الـ collection الجديد
        
        // 3. منع التكرار (نفس الإيميل لنفس صاحب البطاقة)
        const existingSubscription = await subscriptionCollection.findOne({ 
            email: email, 
            cardOwnerId: cardId 
        });
        
        if (existingSubscription) {
            return res.status(400).json({ error: 'Email already subscribed to this card' });
        }

        // 4. إضافة الاشتراك الجديد
        await subscriptionCollection.insertOne({
            email: email,
            cardOwnerId: cardId, // معرّف صاحب البطاقة
            cardOwnerName: cardOwner.data?.inputs?.['input-name'] || 'N/A', // (اختياري) لسهولة البحث
            subscribedAt: new Date()
        });
        
        // (اختياري متقدم)
        // يمكنك هنا إرسال إيميل إشعار إلى صاحب البطاقة
        // const ownerEmail = cardOwner.data?.inputs?.['input-email'];
        // if (ownerEmail) {
        //   // sendNotificationEmail(ownerEmail, email); // يتطلب خدمة إرسال
        // }

        res.status(201).json({ success: true, message: 'Subscribed successfully' });

    } catch (e) {
        console.error('Subscription save failed:', e);
        res.status(500).json({ error: 'Subscription failed' });
    }
});

// --- API: تسجيل مشترك جديد من الصفحة الرئيسية (جديد) ---
app.post('/api/homepage-subscribe', [
    body('name').notEmpty().trim().escape(),
    body('email').isEmail().normalizeEmail(),
    body('phone').optional().trim().escape() // الهاتف اختياري
], async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    try {
        if (!db) return res.status(500).json({ error: 'DB not connected' });
        
        const { name, email, phone } = req.body;
        
        // استخدم collection جديد للمشتركين من الصفحة الرئيسية
        const leadsCollection = db.collection('homepage_leads'); 
        
        // 1. التحقق من وجود الإيميل مسبقاً
        const existingLead = await leadsCollection.findOne({ email: email });
        if (existingLead) {
            // لا نعتبره خطأ فادح، فقط نبلغ بأن الإيميل موجود
            return res.status(400).json({ error: 'Email already exists' });
        }

        // 2. إضافة المشترك الجديد
        await leadsCollection.insertOne({
            name: name,
            email: email,
            phone: phone,
            subscribedAt: new Date(),
            source: 'homepage-form' // لتحديد مصدر التسجيل
        });

        res.status(201).json({ success: true, message: 'Subscribed successfully' });

    } catch (e) {
        console.error('Homepage subscription failed:', e);
        res.status(500).json({ error: 'Subscription failed' });
    }
});


// --- robots.txt ---
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
        .find({})
        .project({ shortId: 1, createdAt: 1 })
        .sort({ createdAt: -1 })
        .limit(2000)
        .toArray();

      designUrls = docs.map(d => ({
        loc: `${base}/nfc/view/${d.shortId}`,
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
