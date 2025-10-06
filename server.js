/**
 * ========================================
 * NFC Business Card Server - Enhanced Version
 * خادم بطاقات العمل NFC - النسخة المحسّنة
 * ========================================
 * 
 * التحسينات:
 * - نظام logging محسّن
 * - معالجة أخطاء أفضل
 * - أمان محسّن
 * - تحسينات الأداء
 * - API endpoints موثقة
 * - دعم WebSocket (اختياري)
 * ========================================
 */

require('dotenv').config();

// المكتبات الأساسية
const express = require('express');
const { MongoClient, ObjectId } = require('mongodb');
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
const compression = require('compression');
const morgan = require('morgan');

// إعداد DOMPurify
const window = (new JSDOM('')).window;
const DOMPurify = DOMPurifyFactory(window);

// إنشاء التطبيق
const app = express();
const port = process.env.PORT || 3000;

/* ====================================
   الإعدادات الأمنية والعامة
   ==================================== */

// Trust proxy للحصول على IP الحقيقي
app.set('trust proxy', 1);

// إخفاء معلومات Express
app.disable('x-powered-by');

// Helmet لتحسين الأمان
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com", "https://cdnjs.cloudflare.com"],
            scriptSrc: ["'self'", "'unsafe-inline'", "https://cdnjs.cloudflare.com"],
            fontSrc: ["'self'", "https://fonts.gstatic.com", "https://cdnjs.cloudflare.com"],
            imgSrc: ["'self'", "data:", "https:", "blob:"],
            connectSrc: ["'self'", "https://nfc-vjy6.onrender.com"]
        }
    },
    crossOriginEmbedderPolicy: false
}));

// Compression لتقليل حجم الاستجابة
app.use(compression());

// CORS
const corsOptions = {
    origin: process.env.ALLOWED_ORIGINS?.split(',') || '*',
    credentials: true,
    optionsSuccessStatus: 200
};
app.use(cors(corsOptions));

// Body parser
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Logging (Morgan)
if (process.env.NODE_ENV === 'production') {
    app.use(morgan('combined'));
} else {
    app.use(morgan('dev'));
}

// إعداد EJS
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

/* ====================================
   قاعدة البيانات MongoDB
   ==================================== */

const mongoUrl = process.env.MONGO_URI;
const dbName = process.env.MONGO_DB || 'nfc_db';
const designsCollectionName = process.env.MONGO_DESIGNS_COLL || 'designs';
const backgroundsCollectionName = process.env.MONGO_BACKGROUNDS_COLL || 'backgrounds';
const analyticsCollectionName = 'analytics'; // للإحصائيات

let db;
let mongoClient;

/**
 * الاتصال بقاعدة البيانات مع إعادة المحاولة
 */
async function connectToDatabase() {
    const maxRetries = 5;
    let retries = 0;

    while (retries < maxRetries) {
        try {
            mongoClient = await MongoClient.connect(mongoUrl, {
                useNewUrlParser: true,
                useUnifiedTopology: true,
                maxPoolSize: 10,
                serverSelectionTimeoutMS: 5000
            });
            
            db = mongoClient.db(dbName);
            
            // إنشاء الفهارس
            await createIndexes();
            
            console.log('✓ MongoDB connected successfully');
            return;
        } catch (error) {
            retries++;
            console.error(`MongoDB connection attempt ${retries} failed:`, error.message);
            
            if (retries === maxRetries) {
                console.error('❌ Failed to connect to MongoDB after maximum retries');
                process.exit(1);
            }
            
            // الانتظار قبل المحاولة التالية
            await new Promise(resolve => setTimeout(resolve, 5000));
        }
    }
}

/**
 * إنشاء الفهارس للأداء الأفضل
 */
async function createIndexes() {
    try {
        await db.collection(designsCollectionName).createIndex({ shortId: 1 }, { unique: true });
        await db.collection(designsCollectionName).createIndex({ createdAt: -1 });
        await db.collection(backgroundsCollectionName).createIndex({ shortId: 1 }, { unique: true });
        await db.collection(backgroundsCollectionName).createIndex({ category: 1 });
        await db.collection(analyticsCollectionName).createIndex({ designId: 1 });
        await db.collection(analyticsCollectionName).createIndex({ timestamp: -1 });
        
        console.log('✓ Database indexes created');
    } catch (error) {
        console.warn('⚠ Index creation warning:', error.message);
    }
}

// بدء الاتصال بقاعدة البيانات
connectToDatabase();

// معالجة إغلاق التطبيق بشكل صحيح
process.on('SIGINT', async () => {
    console.log('\n🛑 Shutting down gracefully...');
    if (mongoClient) {
        await mongoClient.close();
    }
    process.exit(0);
});

/* ====================================
   الأدوات المساعدة
   ==================================== */

const rootDir = __dirname;

/**
 * الحصول على URL الأساسي للموقع
 */
function absoluteBaseUrl(req) {
    const envBase = process.env.SITE_BASE_URL;
    if (envBase) return envBase.replace(/\/+$/, '');
    
    const proto = (req.headers['x-forwarded-proto'] || req.protocol || 'https');
    const host = req.get('host');
    return `${proto}://${host}`;
}

/**
 * Logger مخصص
 */
const logger = {
    info: (msg, data = {}) => console.log(`[INFO] ${msg}`, data),
    warn: (msg, data = {}) => console.warn(`[WARN] ${msg}`, data),
    error: (msg, error) => console.error(`[ERROR] ${msg}`, error)
};

/**
 * التحقق من صلاحيات المدير
 */
function assertAdmin(req, res) {
    const expected = process.env.ADMIN_TOKEN || '';
    const provided = req.headers['x-admin-token'] || '';
    
    if (!expected || expected !== provided) {
        res.status(401).json({ error: 'Unauthorized', message: 'Invalid admin token' });
        return false;
    }
    return true;
}

/**
 * معالج أخطاء عام
 */
function asyncHandler(fn) {
    return (req, res, next) => {
        Promise.resolve(fn(req, res, next)).catch(next);
    };
}

/* ====================================
   إعدادات رفع الملفات (Multer & Sharp)
   ==================================== */

const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.memoryStorage();
const upload = multer({
    storage,
    limits: { 
        fileSize: 10 * 1024 * 1024, // 10MB
        files: 1
    },
    fileFilter: (req, file, cb) => {
        const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
        if (allowedTypes.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error('نوع الملف غير مدعوم. الرجاء رفع صورة JPG، PNG، WebP، أو GIF'));
        }
    }
});

/* ====================================
   Rate Limiting
   ==================================== */

// API rate limiting
const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 دقيقة
    max: 200, // 200 طلب كحد أقصى
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Too many requests, please try again later.' }
});

// Upload rate limiting (أكثر صرامة)
const uploadLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // ساعة
    max: 50, // 50 رفع
    message: { error: 'Upload limit exceeded. Please try again later.' }
});

/* ====================================
   Middleware للتحقق من قاعدة البيانات
   ==================================== */

function requireDB(req, res, next) {
    if (!db) {
        return res.status(503).json({ 
            error: 'Service Unavailable', 
            message: 'Database connection not available' 
        });
    }
    next();
}

/* ====================================
   المسارات الديناميكية (قبل الملفات الثابتة)
   ==================================== */

/**
 * صفحة عرض SEO لكل بطاقة: /nfc/view/:id
 */
app.get('/nfc/view/:id', requireDB, asyncHandler(async (req, res) => {
    const id = String(req.params.id);
    
    const doc = await db.collection(designsCollectionName).findOne({ shortId: id });
    
    if (!doc) {
        res.setHeader('X-Robots-Tag', 'noindex, noarchive');
        return res.status(404).render('404', { 
            message: 'البطاقة غير موجودة',
            backLink: '/nfc/'
        });
    }
    
    // تسجيل الزيارة للإحصائيات
    await db.collection(analyticsCollectionName).insertOne({
        designId: id,
        type: 'view',
        timestamp: new Date(),
        ip: req.ip,
        userAgent: req.get('user-agent')
    }).catch(err => logger.warn('Failed to log analytics', err));
    
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
    
    res.render('viewer', {
        pageUrl,
        name,
        tagline,
        ogImage,
        keywords,
        design: doc.data,
        canonical: pageUrl
    });
}));

/* ====================================
   Middleware للملفات الثابتة
   ==================================== */

// Cache headers للملفات الثابتة
app.use((req, res, next) => {
    if (req.path.match(/\.(jpg|jpeg|png|gif|webp|svg|css|js|woff|woff2|ttf|eot)$/)) {
        res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
    } else {
        res.setHeader('Cache-Control', 'public, max-age=600');
    }
    next();
});

// إعادة توجيه الجذر
app.get('/', (req, res) => {
    res.redirect(301, '/nfc/');
});

// خدمة الملفات الثابتة
app.use(express.static(rootDir, { 
    extensions: ['html'],
    maxAge: '10m'
}));

// مجلد uploads
app.use('/uploads', express.static(uploadDir, { 
    maxAge: '30d', 
    immutable: true 
}));

/* ====================================
   API Endpoints
   ==================================== */

app.use('/api/', apiLimiter);

/**
 * API: رفع صورة
 * POST /api/upload-image
 */
app.post('/api/upload-image', uploadLimiter, upload.single('image'), asyncHandler(async (req, res) => {
    if (!req.file) {
        return res.status(400).json({ error: 'No image provided' });
    }
    
    const filename = `${nanoid(10)}.webp`;
    const outputPath = path.join(uploadDir, filename);
    
    await sharp(req.file.buffer)
        .resize({ 
            width: 2560, 
            height: 2560, 
            fit: 'inside', 
            withoutEnlargement: true 
        })
        .webp({ quality: 85 })
        .toFile(outputPath);
    
    logger.info('Image uploaded', { filename, size: req.file.size });
    
    res.json({ 
        success: true, 
        url: `/uploads/${filename}`,
        filename
    });
}));

/**
 * API: حفظ تصميم
 * POST /api/save-design
 */
app.post('/api/save-design', requireDB, [
    body('inputs.input-name').optional().trim().escape(),
    body('inputs.input-tagline').optional().trim().escape()
], asyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }
    
    const data = req.body || {};
    const inputs = data.inputs || {};
    
    // تنظيف البيانات
    ['input-name', 'input-tagline'].forEach(k => {
        if (inputs[k]) {
            inputs[k] = DOMPurify.sanitize(String(inputs[k]));
        }
    });
    
    data.inputs = inputs;
    const shortId = nanoid(8);
    
    await db.collection(designsCollectionName).insertOne({
        shortId,
        data,
        createdAt: new Date(),
        updatedAt: new Date(),
        views: 0,
        ip: req.ip
    });
    
    logger.info('Design saved', { shortId });
    
    res.json({ 
        success: true, 
        id: shortId,
        viewUrl: `/nfc/view/${shortId}`
    });
}));

/**
 * API: جلب تصميم
 * GET /api/get-design/:id
 */
app.get('/api/get-design/:id', requireDB, asyncHandler(async (req, res) => {
    const id = String(req.params.id);
    const doc = await db.collection(designsCollectionName).findOne({ shortId: id });
    
    if (!doc) {
        return res.status(404).json({ error: 'Design not found' });
    }
    
    res.json(doc.data);
}));

/**
 * API: تحديث تصميم
 * PUT /api/update-design/:id
 */
app.put('/api/update-design/:id', requireDB, asyncHandler(async (req, res) => {
    const id = String(req.params.id);
    const data = req.body || {};
    
    const result = await db.collection(designsCollectionName).updateOne(
        { shortId: id },
        { 
            $set: { 
                data,
                updatedAt: new Date()
            }
        }
    );
    
    if (result.matchedCount === 0) {
        return res.status(404).json({ error: 'Design not found' });
    }
    
    logger.info('Design updated', { id });
    res.json({ success: true });
}));

/**
 * API: حذف تصميم
 * DELETE /api/delete-design/:id
 */
app.delete('/api/delete-design/:id', requireDB, asyncHandler(async (req, res) => {
    const id = String(req.params.id);
    
    const result = await db.collection(designsCollectionName).deleteOne({ shortId: id });
    
    if (result.deletedCount === 0) {
        return res.status(404).json({ error: 'Design not found' });
    }
    
    logger.info('Design deleted', { id });
    res.json({ success: true });
}));

/**
 * API: المعرض
 * GET /api/gallery
 */
app.get('/api/gallery', requireDB, asyncHandler(async (req, res) => {
    const page = Math.max(1, parseInt(req.query.page || '1', 10));
    const limit = Math.max(1, Math.min(50, parseInt(req.query.limit || '20', 10)));
    const skip = (page - 1) * limit;
    
    const [docs, total] = await Promise.all([
        db.collection(designsCollectionName)
            .find({})
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit)
            .toArray(),
        db.collection(designsCollectionName).countDocuments({})
    ]);
    
    res.json({
        success: true,
        designs: docs,
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
    });
}));

/**
 * API: إحصائيات التصميم
 * GET /api/analytics/:id
 */
app.get('/api/analytics/:id', requireDB, asyncHandler(async (req, res) => {
    const id = String(req.params.id);
    
    const stats = await db.collection(analyticsCollectionName)
        .aggregate([
            { $match: { designId: id } },
            { 
                $group: {
                    _id: '$type',
                    count: { $sum: 1 }
                }
            }
        ])
        .toArray();
    
    res.json({ success: true, stats });
}));

/**
 * API: رفع خلفية (Admin)
 * POST /api/upload-background
 */
app.post('/api/upload-background', upload.single('image'), asyncHandler(async (req, res) => {
    if (!assertAdmin(req, res)) return;
    if (!req.file) return res.status(400).json({ error: 'No image' });
    if (!db) return res.status(500).json({ error: 'DB not connected' });
    
    const filename = `bg_${nanoid(10)}.webp`;
    const outputPath = path.join(uploadDir, filename);
    
    await sharp(req.file.buffer)
        .resize({ width: 3840, height: 3840, fit: 'inside', withoutEnlargement: true })
        .webp({ quality: 88 })
        .toFile(outputPath);
    
    const payload = {
        shortId: nanoid(8),
        url: `/uploads/${filename}`,
        name: String(req.body.name || 'خلفية'),
        category: String(req.body.category || 'عام'),
        createdAt: new Date()
    };
    
    await db.collection(backgroundsCollectionName).insertOne(payload);
    
    logger.info('Background uploaded', { shortId: payload.shortId });
    res.json({ success: true, background: payload });
}));

/**
 * API: الخلفيات
 * GET /api/gallery/backgrounds
 */
app.get('/api/gallery/backgrounds', requireDB, asyncHandler(async (req, res) => {
    const category = req.query.category;
    const page = Math.max(1, parseInt(req.query.page || '1', 10));
    const limit = Math.max(1, Math.min(100, parseInt(req.query.limit || '50', 10)));
    const skip = (page - 1) * limit;
    
    const query = (category && category !== 'all') ? { category: String(category) } : {};
    
    const [items, total] = await Promise.all([
        db.collection(backgroundsCollectionName)
            .find(query)
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit)
            .toArray(),
        db.collection(backgroundsCollectionName).countDocuments(query)
    ]);
    
    res.json({ 
        success: true, 
        items, 
        page, 
        limit, 
        total, 
        totalPages: Math.ceil(total / limit) 
    });
}));

/**
 * API: حذف خلفية (Admin)
 * DELETE /api/backgrounds/:shortId
 */
app.delete('/api/backgrounds/:shortId', asyncHandler(async (req, res) => {
    if (!assertAdmin(req, res)) return;
    if (!db) return res.status(500).json({ error: 'DB not connected' });
    
    const shortId = String(req.params.shortId);
    const doc = await db.collection(backgroundsCollectionName).findOne({ shortId });
    
    if (!doc) return res.status(404).json({ error: 'Not found' });
    
    const filePath = path.join(uploadDir, path.basename(doc.url));
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    
    await db.collection(backgroundsCollectionName).deleteOne({ shortId });
    
    logger.info('Background deleted', { shortId });
    res.json({ success: true });
}));

/* ====================================
   SEO: robots.txt & sitemap.xml
   ==================================== */

/**
 * robots.txt
 */
app.get('/robots.txt', (req, res) => {
    const base = absoluteBaseUrl(req);
    const txt = [
        'User-agent: *',
        'Allow: /nfc/',
        'Disallow: /api/',
        'Disallow: /uploads/',
        '',
        `Sitemap: ${base}/sitemap.xml`
    ].join('\n');
    
    res.type('text/plain').send(txt);
});

/**
 * sitemap.xml (ديناميكي)
 */
app.get('/sitemap.xml', requireDB, asyncHandler(async (req, res) => {
    const base = absoluteBaseUrl(req);
    
    const staticPages = [
        { loc: '/nfc/', priority: '1.0', changefreq: 'daily' },
        { loc: '/nfc/generator', priority: '0.9', changefreq: 'weekly' },
        { loc: '/nfc/gallery', priority: '0.8', changefreq: 'daily' },
        { loc: '/nfc/blog', priority: '0.7', changefreq: 'weekly' }
    ];
    
    const docs = await db.collection(designsCollectionName)
        .find({})
        .project({ shortId: 1, createdAt: 1 })
        .sort({ createdAt: -1 })
        .limit(5000)
        .toArray();
    
    function urlTag(loc, { lastmod, changefreq = 'weekly', priority = '0.7' } = {}) {
        return [
            '<url>',
            `  <loc>${loc}</loc>`,
            lastmod ? `  <lastmod>${lastmod}</lastmod>` : '',
            `  <changefreq>${changefreq}</changefreq>`,
            `  <priority>${priority}</priority>`,
            '</url>'
        ].filter(Boolean).join('\n');
    }
    
    const xml = [
        '<?xml version="1.0" encoding="UTF-8"?>',
        '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
        ...staticPages.map(p => urlTag(`${base}${p.loc}`, p)),
        ...docs.map(d => urlTag(`${base}/nfc/view/${d.shortId}`, {
            lastmod: d.createdAt ? new Date(d.createdAt).toISOString().split('T')[0] : undefined,
            changefreq: 'monthly',
            priority: '0.6'
        })),
        '</urlset>'
    ].join('\n');
    
    res.type('application/xml').send(xml);
}));

/* ====================================
   Health Check
   ==================================== */

app.get('/healthz', (req, res) => {
    res.json({ 
        ok: true, 
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        database: db ? 'connected' : 'disconnected'
    });
});

/* ====================================
   معالجة الأخطاء
   ==================================== */

// 404 Handler
app.use((req, res) => {
    res.status(404).json({ 
        error: 'Not Found', 
        path: req.path 
    });
});

// Error Handler
app.use((err, req, res, next) => {
    logger.error('Server error', err);
    
    res.status(err.status || 500).json({
        error: err.message || 'Internal Server Error',
        ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
    });
});

/* ====================================
   بدء الخادم
   ==================================== */

app.listen(port, () => {
    console.log(`
    ========================================
    🚀 NFC Business Card Server
    ========================================
    Port: ${port}
    Environment: ${process.env.NODE_ENV || 'development'}
    Database: ${db ? '✓ Connected' : '✗ Disconnected'}
    ========================================
    `);
});

// التعامل مع الأخطاء غير المعالجة
process.on('unhandledRejection', (reason, promise) => {
    logger.error('Unhandled Rejection', { reason, promise });
});

process.on('uncaughtException', (error) => {
    logger.error('Uncaught Exception', error);
    process.exit(1);
});
