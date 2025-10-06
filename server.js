// server.js - Enhanced & Fixed Version

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

// إعداد DOMPurify
const window = (new JSDOM('')).window;
const DOMPurify = DOMPurifyFactory(window);

const app = express();
const port = process.env.PORT || 3000;

/* ====================================
   الإعدادات الأمنية والعامة
   ==================================== */

app.set('trust proxy', 1);
app.disable('x-powered-by');
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.set('view engine', 'ejs');

/* ====================================
   قاعدة البيانات MongoDB - مصحح
   ==================================== */

const mongoUrl = process.env.MONGO_URI;
const dbName = process.env.MONGO_DB || 'nfc_db';
const designsCollectionName = process.env.MONGO_DESIGNS_COLL || 'designs';
const backgroundsCollectionName = process.env.MONGO_BACKGROUNDS_COLL || 'backgrounds';
let db;


/**
 * الاتصال بقاعدة البيانات - مصحح (بدون deprecated options)
 */
async function connectToDatabase() {
    const maxRetries = 5;
    let retries = 0;

    if (!mongoUrl) {
        console.error('❌ MONGO_URI is not defined in .env file');
        if (process.env.ALLOW_NO_DB === 'true') {
            console.warn('⚠️  Running without database (ALLOW_NO_DB=true)');
            return;
        }
        process.exit(1);
    }

    console.log(`🔌 Connecting to MongoDB Atlas...`);
    console.log(`📍 Database: ${dbName}`);

    while (retries < maxRetries) {
        try {
            // إزالة الخيارات المهملة (deprecated)
            mongoClient = await MongoClient.connect(mongoUrl, {
                maxPoolSize: 10,
                minPoolSize: 2,
                serverSelectionTimeoutMS: 10000,
                socketTimeoutMS: 45000,
            });
            
            db = mongoClient.db(dbName);
            
            // اختبار الاتصال
            await db.admin().ping();
            
            // إنشاء الفهارس
            await createIndexes();
            
            console.log('✅ MongoDB connected successfully');
            console.log(`✅ Database: ${dbName}`);
            console.log(`✅ Collections: ${designsCollectionName}, ${backgroundsCollectionName}`);
            return;
        } catch (error) {
            retries++;
            console.error(`❌ MongoDB connection attempt ${retries}/${maxRetries} failed:`);
            console.error(`   Error: ${error.message}`);
            
            if (error.message.includes('Authentication failed') || error.message.includes('bad auth')) {
                console.error('\n💡 Authentication Error - Solutions:');
                console.error('   1. Check MongoDB Atlas → Database Access');
                console.error('   2. Verify username: nfc_db');
                console.error('   3. Reset password (use simple password without special chars)');
                console.error('   4. Check Network Access → Add IP: 0.0.0.0/0 (for testing)');
                console.error('   5. Wait 2-3 minutes after password change\n');
            }
            
            if (retries === maxRetries) {
                console.error('❌ Failed to connect to MongoDB after maximum retries');
                
                if (process.env.ALLOW_NO_DB === 'true') {
                    console.warn('⚠️  Running without database (ALLOW_NO_DB=true)');
                    return;
                }
                
                console.error('\n🔧 Quick Fix: Add to .env file:');
                console.error('   ALLOW_NO_DB=true\n');
                process.exit(1);
            }
            
            console.log(`⏳ Retrying in 3 seconds...`);
            await new Promise(resolve => setTimeout(resolve, 3000));
        }
    }
}

/**
 * إنشاء الفهارس
 */
async function createIndexes() {
    if (!db) return;
    
    try {
        await db.collection(designsCollectionName).createIndex({ shortId: 1 }, { unique: true });
        await db.collection(designsCollectionName).createIndex({ createdAt: -1 });
        await db.collection(backgroundsCollectionName).createIndex({ shortId: 1 }, { unique: true });
        await db.collection(backgroundsCollectionName).createIndex({ category: 1 });
        
        console.log('✅ Database indexes created');
    } catch (error) {
        console.warn('⚠️  Index creation warning:', error.message);
    }
}

// بدء الاتصال
connectToDatabase();

// معالجة إغلاق التطبيق
process.on('SIGINT', async () => {
    console.log('\n🛑 Shutting down gracefully...');
    if (mongoClient) {
        await mongoClient.close();
        console.log('✅ MongoDB connection closed');
    }
    process.exit(0);
});

process.on('SIGTERM', async () => {
    console.log('\n🛑 SIGTERM received...');
    if (mongoClient) {
        await mongoClient.close();
    }
    process.exit(0);
});

/* ====================================
   الأدوات المساعدة
   ==================================== */

const rootDir = __dirname;

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
    
    if (!expected || expected !== provided) {
        res.status(401).json({ error: 'Unauthorized' });
        return false;
    }
    return true;
}

/* ====================================
   إعدادات رفع الملفات
   ==================================== */

const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.memoryStorage();
const upload = multer({
    storage,
    limits: { fileSize: 10 * 1024 * 1024 },
    fileFilter: (req, file, cb) => {
        if (file.mimetype && file.mimetype.startsWith('image/')) {
            cb(null, true);
        } else {
            cb(new Error('Please upload an image'), false);
        }
    }
});

/* ====================================
   Rate Limiting
   ==================================== */

const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 200,
    standardHeaders: true,
    legacyHeaders: false
});

/* ====================================
   Middleware للتحقق من DB
   ==================================== */

function requireDB(req, res, next) {
    if (!db) {
        return res.status(503).json({ 
            error: 'Service Unavailable', 
            message: 'Database not connected' 
        });
    }
    next();
}

/* ====================================
   المسارات الديناميكية
   ==================================== */

/**
 * صفحة عرض SEO: /nfc/view/:id
 */
app.get('/nfc/view/:id', requireDB, async (req, res) => {
    try {
        const id = String(req.params.id);
        const doc = await db.collection(designsCollectionName).findOne({ shortId: id });
        
        if (!doc) {
            res.setHeader('X-Robots-Tag', 'noindex, noarchive');
            return res.status(404).send('Design not found');
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

/* ====================================
   Middleware للملفات الثابتة
   ==================================== */

// Cache headers
app.use((req, res, next) => {
    if (req.path.match(/\.(jpg|jpeg|png|gif|webp|svg|css|js|woff|woff2)$/)) {
        res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
    } else {
        res.setHeader('Cache-Control', 'public, max-age=600');
    }
    next();
});

// إزالة .html
app.use((req, res, next) => {
    if (req.path.endsWith('.html')) {
        const newPath = req.path.slice(0, -5);
        if (newPath === '/nfc/viewer' || newPath.startsWith('/nfc/view/')) {
            return res.status(404).send('Not Found');
        }
        return res.redirect(301, newPath);
    }
    next();
});

// Redirect root
app.get('/', (req, res) => {
    res.redirect(301, '/nfc/');
});

// Serve static files
app.use(express.static(rootDir, { extensions: ['html'] }));

// Uploads folder
app.use('/uploads', express.static(uploadDir, { maxAge: '30d', immutable: true }));

/* ====================================
   API Endpoints
   ==================================== */

app.use('/api/', apiLimiter);

/**
 * API: رفع صورة
 */
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

/**
 * API: حفظ تصميم
 */
app.post('/api/save-design', requireDB, async (req, res) => {
    try {
        const data = req.body || {};
        const inputs = data.inputs || {};
        
        ['input-name', 'input-tagline'].forEach(k => {
            if (inputs[k]) inputs[k] = DOMPurify.sanitize(String(inputs[k]));
        });
        
        data.inputs = inputs;
        const shortId = nanoid(8);
        
        await db.collection(designsCollectionName).insertOne({
            shortId,
            data,
            createdAt: new Date()
        });
        
        res.json({ success: true, id: shortId, viewUrl: `/nfc/view/${shortId}` });
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: 'Save failed' });
    }
});

/**
 * API: جلب تصميم
 */
app.get('/api/get-design/:id', requireDB, async (req, res) => {
    try {
        const id = String(req.params.id);
        const doc = await db.collection(designsCollectionName).findOne({ shortId: id });
        
        if (!doc) return res.status(404).json({ error: 'Design not found' });
        
        res.json(doc.data);
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: 'Fetch failed' });
    }
});

/**
 * API: المعرض
 */
app.get('/api/gallery', requireDB, async (req, res) => {
    try {
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
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: 'Fetch failed' });
    }
});

/**
 * API: رفع خلفية (Admin)
 */
app.post('/api/upload-background', upload.single('image'), async (req, res) => {
    try {
        if (!assertAdmin(req, res)) return;
        if (!req.file) return res.status(400).json({ error: 'No image' });
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
        
        res.json({ success: true, background: payload });
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: 'Upload background failed' });
    }
});

/**
 * API: الخلفيات
 */
app.get('/api/gallery/backgrounds', requireDB, async (req, res) => {
    try {
        const category = req.query.category;
        const page = Math.max(1, parseInt(req.query.page || '1', 10));
        const limit = Math.max(1, Math.min(100, parseInt(req.query.limit || '50', 10)));
        const skip = (page - 1) * limit;
        
        const q = (category && category !== 'all') ? { category: String(category) } : {};
        
        const [items, total] = await Promise.all([
            db.collection(backgroundsCollectionName)
                .find(q)
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit)
                .toArray(),
            db.collection(backgroundsCollectionName).countDocuments(q)
        ]);
        
        res.json({
            success: true,
            items,
            page,
            limit,
            total,
            totalPages: Math.ceil(total / limit)
        });
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: 'Fetch backgrounds failed' });
    }
});

/**
 * API: حذف خلفية (Admin)
 */
app.delete('/api/backgrounds/:shortId', async (req, res) => {
    try {
        if (!assertAdmin(req, res)) return;
        if (!db) return res.status(500).json({ error: 'DB not connected' });
        
        const shortId = String(req.params.shortId);
        const doc = await db.collection(backgroundsCollectionName).findOne({ shortId });
        
        if (!doc) return res.status(404).json({ error: 'Not found' });
        
        const filePath = path.join(uploadDir, path.basename(doc.url));
        if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
        
        await db.collection(backgroundsCollectionName).deleteOne({ shortId });
        
        res.json({ success: true });
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: 'Delete failed' });
    }
});

/* ====================================
   SEO: robots.txt & sitemap.xml
   ==================================== */

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

app.get('/sitemap.xml', async (req, res) => {
    try {
        const base = absoluteBaseUrl(req);
        
        const staticPages = [
            { loc: '/nfc/', priority: '1.0' },
            { loc: '/nfc/gallery', priority: '0.8' },
            { loc: '/nfc/blog', priority: '0.7' }
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
                loc: `${base}/nfc/view/${d.shortId}`,
                lastmod: d.createdAt ? new Date(d.createdAt).toISOString().split('T')[0] : undefined,
                priority: '0.6'
            }));
        }
        
        function urlTag(loc, { lastmod, priority = '0.7' } = {}) {
            return [
                '<url>',
                `  <loc>${loc}</loc>`,
                lastmod ? `  <lastmod>${lastmod}</lastmod>` : '',
                `  <changefreq>weekly</changefreq>`,
                `  <priority>${priority}</priority>`,
                '</url>'
            ].filter(Boolean).join('\n');
        }
        
        const xml = [
            '<?xml version="1.0" encoding="UTF-8"?>',
            '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
            ...staticPages.map(p => urlTag(`${base}${p.loc}`, p)),
            ...designUrls.map(u => urlTag(u.loc, u)),
            '</urlset>'
        ].join('\n');
        
        res.type('application/xml').send(xml);
    } catch (e) {
        console.error(e);
        res.status(500).send('Sitemap failed');
    }
});

/* ====================================
   Health Check
   ==================================== */

app.get('/healthz', (req, res) => {
    res.json({ 
        ok: true,
        timestamp: new Date().toISOString(),
        database: db ? 'connected' : 'disconnected'
    });
});

/* ====================================
   Error Handlers
   ==================================== */

app.use((req, res) => {
    res.status(404).json({ error: 'Not Found', path: req.path });
});

app.use((err, req, res, next) => {
    console.error('Server error:', err);
    res.status(err.status || 500).json({
        error: err.message || 'Internal Server Error'
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
