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
const helmet = require('helmet'); // لإضافة هيدرات أمان HTTP

// --- إعداد DOMPurify لتعقيم الإدخالات ---
const window = (new JSDOM('')).window;
const DOMPurify = DOMPurifyFactory(window);

const app = express();
const port = process.env.PORT || 3000;
const rootDir = __dirname;

// --- إعدادات Express الأساسية ---
app.set('trust proxy', 1); // ضروري إذا كان التطبيق خلف بروكسي (مثل Render, Heroku)
app.disable('x-powered-by'); // إخفاء نوع الخادم لتقليل البصمة الأمنية
app.set('view engine', 'ejs');
app.use(cors());
app.use(express.json({ limit: '10mb' })); // تحديد حجم الـ payload

// --- START: إعدادات الأمان (Helmet) ---
app.use(helmet.frameguard({ action: 'deny' })); // الحماية من Clickjacking
app.use(helmet.xssFilter()); // فلتر XSS أساسي (مضمن في المتصفحات الحديثة)
app.use(helmet.noSniff()); // منع المتصفح من تخمين نوع المحتوى (MIME-type sniffing)
app.use(helmet.hsts({ 
    maxAge: 31536000, // سنة واحدة
    includeSubDomains: true,
    preload: true
})); // فرض استخدام HTTPS

// سياسة أمان المحتوى (CSP)
app.use(helmet.contentSecurityPolicy({
    directives: {
        defaultSrc: ["'self'"],
        scriptSrc: [
            "'self'", 
            "https://cdnjs.cloudflare.com", 
            "https://cdn.jsdelivr.net", 
            "https://www.youtube.com" // للسماح بجلب سكربتات يوتيوب (للشروحات)
        ],
        styleSrc: [
            "'self'", 
            "'unsafe-inline'", // مطلوب لبعض التنسيقات المضمنة
            "https://cdnjs.cloudflare.com", 
            "https://fonts.googleapis.com"
        ],
        fontSrc: ["'self'", "https://fonts.gstatic.com"],
        imgSrc: [
            "'self'", 
            "data:", 
            "https:", 
            "https://i.imgur.com", 
            "https://www.mcprim.com", 
            "https://media.giphy.com", 
            process.env.SITE_BASE_URL || "https://nfc-vjy6.onrender.com" // السماح بالصور من الخادم نفسه
        ],
        mediaSrc: ["'self'", "data:"], // للسماح بالملفات الصوتية (base64)
        frameSrc: ["'self'", "https://www.youtube.com"], // للسماح بتضمين فيديوهات يوتيوب
        connectSrc: [
            "'self'",
            "https://cdnjs.cloudflare.com", 
            "https://cdn.jsdelivr.net", 
            "https://www.youtube.com", 
            "https://www.mcprim.com", 
            "https://media.giphy.com",
            process.env.SITE_BASE_URL || "https://nfc-vjy6.onrender.com" // للسماح بطلبات API للخادم
        ],
        objectSrc: ["'none'"], // منع إضافات مثل Flash
        upgradeInsecureRequests: [], // ترقية طلبات HTTP إلى HTTPS
    },
}));
// --- END: إعدادات الأمان ---

// --- إعداد قاعدة البيانات ---
const mongoUrl = process.env.MONGO_URI;
const dbName = process.env.MONGO_DB || 'nfc_db';
const designsCollectionName = process.env.MONGO_DESIGNS_COLL || 'designs';
const backgroundsCollectionName = process.env.MONGO_BACKGROUNDS_COLL || 'backgrounds';
let db;

MongoClient.connect(mongoUrl)
  .then(client => { 
    db = client.db(dbName); 
    console.log('MongoDB connected'); 
  })
  .catch(err => { 
    console.error('Mongo connect error', err); 
    process.exit(1); 
  });

// --- مجلدات الرفع والملفات الثابتة ---
const uploadDir = path.join(rootDir, 'uploads');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

// --- أدوات مساعدة ---
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

// دالة تعقيم الإدخالات
function sanitizeInputs(inputs) {
    if (!inputs) return {};
    const sanitized = { ...inputs };
    
    FIELDS_TO_SANITIZE.forEach(k => { 
        if (sanitized[k]) {
            sanitized[k] = DOMPurify.sanitize(String(sanitized[k]));
        }
    });
    
    // تعقيم الحقول الديناميكية (الروابط المضافة)
    if (sanitized.dynamic && sanitized.dynamic.social) {
        sanitized.dynamic.social = sanitized.dynamic.social.map(link => ({
            ...link,
            value: DOMPurify.sanitize(String(link.value))
        }));
    }
    return sanitized;
}

// دالة التحقق من صلاحيات الأدمن
function assertAdmin(req, res) {
  const expected = process.env.ADMIN_TOKEN || '';
  const provided = req.headers['x-admin-token'] || '';
  if (!expected || expected !== provided) { 
    res.status(401).json({ error: 'Unauthorized' }); 
    return false; 
  }
  return true;
}

// --- إعدادات Multer (رفع الملفات) ---
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (req, file, cb) => {
    if (file.mimetype && file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Please upload an image'), false);
    }
  }
});

// --- محدد الطلبات (Rate Limiter) للـ API ---
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 دقيقة
  max: 200, // 200 طلب لكل IP
  standardHeaders: true,
  legacyHeaders: false
});
app.use('/api/', apiLimiter);


// =============================================
// --- المسارات الديناميكية (Dynamic Routes) ---
// =============================================

// --- صفحة عرض SEO لكل بطاقة: /nfc/view/:id ---
// (يجب أن يكون هذا المسار قبل `express.static`)
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
    
    // زيادة عدد المشاهدات (بشكل غير متزامن في الخلفية)
    db.collection(designsCollectionName).updateOne(
      { shortId: id },
      { $inc: { views: 1 } }
    ).catch(err => console.error(`Failed to increment view count for ${id}:`, err));

    res.setHeader('X-Robots-Tag', 'index, follow'); // السماح بالأرشفة

    // إعداد متغيرات EJS لـ SEO
    const base = absoluteBaseUrl(req);
    const pageUrl = `${base}/nfc/view/${id}`;
    
    const inputs = doc.data?.inputs || {};
    const name = inputs['input-name'] || 'بطاقة عمل رقمية';
    const tagline = inputs['input-tagline'] || 'MC PRIME Digital Business Cards';
    
    // تحديد صورة OG
    const ogImage = doc.data?.imageUrls?.front
      ? (doc.data.imageUrls.front.startsWith('http') ? doc.data.imageUrls.front : `${base}${doc.data.imageUrls.front}`)
      : `${base}/nfc/og-image.png`;

    const keywords = [
        'NFC', 'بطاقة عمل ذكية', 'كارت شخصي', 
        name, 
        ...tagline.split(/\s+/).filter(Boolean)
    ].filter(Boolean).join(', ');

    // إرسال صفحة EJS
    res.render(path.join(rootDir, 'viewer.ejs'), {
      pageUrl,
      name,
      tagline,
      ogImage,
      keywords,
      design: doc.data, // تمرير بيانات التصميم كاملة إلى السكربت المضمن
      canonical: pageUrl
    });
    
  } catch (e) {
    console.error(e);
    res.setHeader('X-Robots-Tag', 'noindex, noarchive');
    res.status(500).send('View failed');
  }
});


// ===========================================
// --- خدمة الملفات الثابتة (Static Files) ---
// ===========================================

// هيدر كاش بسيط للملفات الثابتة
app.use((req, res, next) => {
  if (req.path.startsWith('/nfc/view/')) {
    // لا تقم بالكاش للمسارات الديناميكية
    return next();
  }
  res.setHeader('Cache-Control', 'public, max-age=600'); // 10 دقائق
  next();
});

// إعادة توجيه الروابط القديمة التي تنتهي بـ .html
app.use((req, res, next) => {
  if (req.path.endsWith('.html')) {
    const newPath = req.path.slice(0, -5);
    return res.redirect(301, newPath);
  }
  next();
});

// إعادة توجيه الجذر
app.get('/', (req, res) => {
  res.redirect(301, '/nfc/');
});

// خدمة مجلد 'uploads' مع كاش طويل الأمد
app.use('/uploads', express.static(uploadDir, { maxAge: '30d', immutable: true }));

// خدمة كل المشروع كملفات ثابتة (يأتي هذا بعد المسارات الديناميكية)
// يدعم `extensions: ['html']` لخدمة `index.html` عند طلب `/nfc/`
app.use(express.static(rootDir, { extensions: ['html'] }));


// ============================
// --- نقاط الـ API (Routes) ---
// ============================

// --- API: رفع صورة (عام) ---
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
    
    // تعقيم الإدخالات النصية قبل الحفظ
    if (data.inputs) {
        data.inputs = sanitizeInputs(data.inputs);
    }
    
    const shortId = nanoid(8);
    await db.collection(designsCollectionName).insertOne({ 
      shortId, 
      data, 
      createdAt: new Date(), 
      views: 0 
    });
    
    res.json({ success: true, id: shortId });
  } catch (e) {
    console.error(e); 
    res.status(500).json({ error: 'Save failed' });
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
    console.error(e); 
    res.status(500).json({ error: 'Fetch failed' });
  }
});

// --- API: المعرض (لصفحة المعرض العام) ---
app.get('/api/gallery', async (req, res) => {
  try {
    if (!db) return res.status(500).json({ error: 'DB not connected' });
    
    const docs = await db.collection(designsCollectionName)
      .find({})
      .sort({ createdAt: -1 })
      .limit(20)
      .toArray();
      
    res.json(docs);
  } catch (e) {
    console.error(e); 
    res.status(500).json({ error: 'Fetch failed' });
  }
});

// --- API: رفع خلفية (للأدمن) ---
app.post('/api/upload-background', upload.single('image'), async (req, res) => {
  try {
    if (!assertAdmin(req, res)) return;
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
      name: DOMPurify.sanitize(String(req.body.name || 'خلفية')),
      category: DOMPurify.sanitize(String(req.body.category || 'عام')),
      createdAt: new Date()
    };
    
    await db.collection(backgroundsCollectionName).insertOne(payload);
    res.json({ success:true, background: payload });
    
  } catch (e) {
    console.error(e); 
    res.status(500).json({ error: 'Upload background failed' });
  }
});

// --- API: جلب الخلفيات (عام) ---
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
    console.error(e); 
    res.status(500).json({ error: 'Fetch backgrounds failed' });
  }
});

// --- API: حذف خلفية (للأدمن) ---
app.delete('/api/backgrounds/:shortId', async (req, res) => {
  try {
    if (!assertAdmin(req, res)) return;
    if (!db) return res.status(500).json({ error: 'DB not connected' });
    
    const shortId = String(req.params.shortId);
    const coll = db.collection(backgroundsCollectionName);
    
    const doc = await coll.findOne({ shortId });
    if (!doc) return res.status(404).json({ error: 'Not found' });
    
    // حذف الملف الفعلي
    const filePath = path.join(uploadDir, path.basename(doc.url));
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    
    await coll.deleteOne({ shortId });
    res.json({ success: true });
    
  } catch (e) {
    console.error(e); 
    res.status(500).json({ error: 'Delete failed' });
  }
});


// ==========================
// --- ملفات SEO (Robots & Sitemap) ---
// ==========================

// --- robots.txt ---
app.get('/robots.txt', (req, res) => {
  const base = absoluteBaseUrl(req);
  const txt = [
    'User-agent: *',
    'Allow: /nfc/',
    'Disallow: /nfc/editor', // منع أرشفة المحرر
    `Sitemap: ${base}/sitemap.xml`
  ].join('\n');
  res.type('text/plain').send(txt);
});

// --- sitemap.xml (ديناميكي) ---
app.get('/sitemap.xml', async (req, res) => {
  try {
    const base = absoluteBaseUrl(req);
    
    // الصفحات الثابتة
    const staticPages = [
      '/nfc/',
      '/nfc/gallery',
      '/nfc/blog',
      '/nfc/about',
      '/nfc/contact',
      '/nfc/privacy'
    ];
    
    // صفحات المدونة
    const blogPosts = [
      '/nfc/blog-nfc-at-events',
      '/nfc/blog-digital-menus-for-restaurants',
      '/nfc/blog-business-card-mistakes'
    ];

    // جلب التصميمات المنشأة
    let designUrls = [];
    if (db) {
      const docs = await db.collection(designsCollectionName)
        .find({})
        .project({ shortId: 1, createdAt: 1 })
        .sort({ createdAt: -1 })
        .limit(2000) // حد أقصى
        .toArray();

      designUrls = docs.map(d => ({
        loc: `${base}/nfc/view/${d.shortId}`,
        lastmod: d.createdAt ? new Date(d.createdAt).toISOString() : undefined,
        changefreq: 'monthly',
        priority: '0.80'
      }));
    }

    // دالة لإنشاء وسم <url>
    function urlTag(loc, { lastmod, changefreq = 'weekly', priority = '0.7' } = {}) {
      return [
        '<url>',
        `  <loc>${loc}</loc>`,
        lastmod ? `  <lastmod>${lastmod}</lastmod>` : '',
        `  <changefreq>${changefreq}</changefreq>`,
        `  <priority>${priority}</priority>`,
        '</url>'
      ].join('\n');
    }

    const xml =
      [
        '<?xml version="1.0" encoding="UTF-8"?>',
        '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
        ...staticPages.map(p => urlTag(`${base}${p}`, { changefreq: 'weekly', priority: '0.9' })),
        ...blogPosts.map(p => urlTag(`${base}${p}`, { changefreq: 'monthly', priority: '0.7' })),
        ...designUrls.map(u => urlTag(u.loc, { lastmod: u.lastmod, changefreq: u.changefreq, priority: u.priority })),
        '</urlset>'
      ].join('\n');

    res.type('application/xml').send(xml);
    
  } catch (e) {
    console.error(e);
    res.status(500).send('Sitemap failed');
  }
});

// --- Health Check ---
app.get('/healthz', (req, res) => res.json({ ok: true }));

// --- تشغيل الخادم ---
app.listen(port, () => {
  console.log(`Server running on :${port}`);
});
