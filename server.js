```javascript
--- START OF FILE server.js ---

// server.js (الكود الكامل مع إضافة مسار Sitemap)

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
const useragent = require('express-useragent'); // استيراد مكتبة اكتشاف الجهاز

const window = (new JSDOM('')).window;
const DOMPurify = DOMPurifyFactory(window);

const app = express();

// --- START: MIDDLEWARE SETUP ---
app.use(compression());
app.use(useragent.express()); // !! هام: تفعيل Middleware اكتشاف الجهاز

const port = process.env.PORT || 3000;
app.set('trust proxy', 1);
app.disable('x-powered-by');

// --- START: SECURITY HEADERS (HELMET) ---
app.use(helmet.frameguard({ action: 'deny' }));
app.use(helmet.xssFilter());
app.use(helmet.noSniff());
app.use(helmet.hsts({ maxAge: 31536000, includeSubDomains: true, preload: true }));
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

// --- DATABASE CONNECTION ---
const mongoUrl = process.env.MONGO_URI;
const dbName = process.env.MONGO_DB || 'nfc_db';
const designsCollectionName = process.env.MONGO_DESIGNS_COLL || 'designs';
const backgroundsCollectionName = process.env.MONGO_BACKGROUNDS_COLL || 'backgrounds';
let db;

MongoClient.connect(mongoUrl)
  .then(client => { db = client.db(dbName); console.log('MongoDB connected'); })
  .catch(err => { console.error('Mongo connect error', err); process.exit(1); });

const rootDir = __dirname;

// --- UTILITY FUNCTIONS ---
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

// --- VIEWER & SEO ROUTES ---
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

    if(linksHTML.length > 0) {
      contactLinksHtml = `<div class="links-group">${linksHTML.join('')}</div>`;
    } else {
      contactLinksHtml = `
          <div class="no-links-message">
              <i class="fas fa-info-circle"></i>
              <p>لم يقم صاحب البطاقة بإضافة أي معلومات اتصال إضافية.</p>
          </div>
      `;
    }

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

    res.render(path.join(rootDir, 'viewer.ejs'), {
      pageUrl,
      name: name,
      tagline: tagline,
      ogImage,
      keywords,
      design: doc.data,
      canonical: pageUrl,
      contactLinksHtml: contactLinksHtml
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
    if (!id) {
         return res.status(404).send('Not found');
    }
    res.redirect(301, `/nfc/viewer.html?id=${id}`);
  } catch (e) {
    console.error('Error in /nfc/view/:id redirect route:', e);
    res.status(500).send('Redirect failed.');
  }
});

// --- CACHING & REDIRECT MIDDLEWARE ---
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
app.get('/', (req, res) => { res.redirect(301, '/nfc/'); });

// --- UPLOADS FOLDER ---
const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });
app.use('/uploads', express.static(uploadDir, { maxAge: '30d', immutable: true }));

// --- API ROUTES ---
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
  message: 'Too many requests from this IP, please try again after 15 minutes'
});
app.use('/api/', apiLimiter);

const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (file.mimetype && file.mimetype.startsWith('image/')) {
        const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml'];
        if (allowedTypes.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error('نوع الصورة غير مدعوم.'), false);
        }
    } else {
        cb(new Error('الرجاء رفع ملف صورة.'), false);
    }
  }
});

function handleMulterErrors(err, req, res, next) {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ error: `حجم الملف كبير جدًا. الحد الأقصى ${err.field ? err.field : '10'} ميجابايت.` });
    }
    return res.status(400).json({ error: `خطأ في رفع الملف: ${err.message}` });
  } else if (err) {
     return res.status(400).json({ error: err.message || 'خطأ غير معروف أثناء الرفع.' });
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
    if (!req.file) {
        if (!res.headersSent) {
           return res.status(400).json({ error: 'لم يتم تقديم أي ملف صورة.' });
        }
        return;
    }

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
    if (!res.headersSent) {
      return res.status(500).json({ error: 'فشل معالجة الصورة بعد الرفع.' });
    }
  }
});

app.post('/api/save-design', async (req, res) => {
  try {
    if (!db) return res.status(500).json({ error: 'DB not connected' });
    let data = req.body || {};
    if (data.inputs) data.inputs = sanitizeInputs(data.inputs);
     if (data.dynamic) {
         if(data.dynamic.phones) {
             data.dynamic.phones = data.dynamic.phones.map(phone => ({...phone, value: phone && phone.value ? DOMPurify.sanitize(String(phone.value)) : '' }));
         }
         if(data.dynamic.social) {
             data.dynamic.social = data.dynamic.social.map(link => ({...link, value: link && link.value ? DOMPurify.sanitize(String(link.value)) : '' }));
         }
         if(data.dynamic.staticSocial) {
             for (const key in data.dynamic.staticSocial) {
                 if (data.dynamic.staticSocial[key] && data.dynamic.staticSocial[key].value) {
                      data.dynamic.staticSocial[key].value = DOMPurify.sanitize(String(data.dynamic.staticSocial[key].value));
                 }
             }
         }
     }
    const shortId = nanoid(8);
    await db.collection(designsCollectionName).insertOne({ shortId, data, createdAt: new Date(), views: 0 });
    res.json({ success: true, id: shortId });
  } catch (e) {
    console.error('Save design error:', e);
     if (!res.headersSent) {
       res.status(500).json({ error: 'Save failed' });
     }
  }
});

app.get('/api/get-design/:id', async (req, res) => {
  try {
    if (!db) return res.status(500).json({ error: 'DB not connected' });
    const id = String(req.params.id);
    const doc = await db.collection(designsCollectionName).findOne({ shortId: id });
    if (!doc || !doc.data) return res.status(404).json({ error: 'Design not found or data missing' });

    res.json(doc.data);
  } catch (e) {
    console.error('Get design error:', e);
    if (!res.headersSent) {
      res.status(500).json({ error: 'Fetch failed' });
    }
  }
});

app.get('/api/gallery', async (req, res) => {
  try {
    if (!db) return res.status(500).json({ error: 'DB not connected' });
    const page = parseInt(req.query.page || '1', 10);
    const limit = 12;
    const skip = (page - 1) * limit;
    const sortBy = String(req.query.sortBy || 'createdAt');
    const sortQuery = {};
    if (sortBy === 'views') { sortQuery.views = -1; } 
    else { sortQuery.createdAt = -1; }
    const findQuery = { 'data.imageUrls.capturedFront': { $exists: true, $ne: null } };
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
    res.json({ success: true, designs: docs, pagination: { page, limit, totalDocs, totalPages }});
  } catch (e) {
    console.error('Fetch gallery error:', e);
    if (!res.headersSent) {
      res.status(500).json({ error: 'Fetch failed', success: false });
    }
  }
});

app.post('/api/upload-background', upload.single('image'), handleMulterErrors, async (req, res) => {
  try {
    if (!assertAdmin(req,res)) return;
    if (!req.file) {
        if (!res.headersSent) {
             return res.status(400).json({ error:'لم يتم تقديم أي ملف صورة.' });
        }
        return;
    }
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
    console.error('Upload background error:', e);
    if (!res.headersSent) {
      res.status(500).json({ error: 'Upload background failed' });
    }
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
    console.error('Fetch backgrounds error:', e);
     if (!res.headersSent) {
       res.status(500).json({ error: 'Fetch backgrounds failed' });
     }
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
        } catch (fileError) {
             console.error(`Error deleting file for background ${shortId}:`, fileError);
        }
    }
    await coll.deleteOne({ shortId });
    res.json({ success: true });
  } catch (e) {
    console.error('Delete background error:', e);
    if (!res.headersSent) {
      res.status(500).json({ error: 'Delete failed' });
    }
  }
});

app.get('/robots.txt', (req, res) => {
  const base = absoluteBaseUrl(req);
  const txt = [
    'User-agent: *',
    'Allow: /',
    'Disallow: /admin/',
    'Disallow: /tmp/',
    'Disallow: /private/',
    `Sitemap: ${base}/nfc/sitemap.xml`
  ].join('\n');
  res.type('text/plain').send(txt);
});

// --- [ADDED] SITEMAP ROUTE ---
app.get('/nfc/sitemap.xml', (req, res) => {
    // التأكد من أن الملف موجود قبل محاولة إرساله
    const sitemapPath = path.join(rootDir, 'sitemap.xml');
    if (fs.existsSync(sitemapPath)) {
        res.sendFile(sitemapPath);
    } else {
        res.status(404).send('Sitemap not found');
    }
});

app.get('/healthz', (req, res) => {
    if (db && db.client.topology && db.client.topology.isConnected()) {
        res.json({ ok: true, db_status: 'connected' });
    } else {
         res.status(500).json({ ok: false, db_status: 'disconnected' });
    }
});

// =======================================================================
// === START: MOBILE/DESKTOP EDITOR ROUTE (المنطقة المعدلة والمهمة)     ===
// =======================================================================

// هذا المسار يجب أن يكون **قبل** معالج الملفات الثابتة العام
app.get(['/nfc/editor', '/nfc/editor.html'], (req, res) => {
    if (req.useragent.isMobile) {
        console.log('Action: Serving editor-mobile.html');
        res.sendFile(path.join(rootDir, 'editor-mobile.html'));
    } else {
        console.log('Action: Serving editor.html');
        res.sendFile(path.join(rootDir, 'editor.html'));
    }
});

// =======================================================================
// === END: MOBILE/DESKTOP EDITOR ROUTE                                ===
// =======================================================================

// --- STATIC FILE HANDLER (يجب أن يكون في نهاية المسارات) ---
app.use('/nfc', express.static(rootDir, { extensions: ['html'] }));

// --- GENERAL ERROR HANDLER ---
app.use((err, req, res, next) => {
  console.error("Unhandled error:", err.stack || err);
  const statusCode = err.status || 500;
  const message = process.env.NODE_ENV === 'production' ? 'Internal Server Error' : err.message;
   if (!res.headersSent) {
     res.status(statusCode).json({ error: message });
   }
});

// --- START SERVER ---
app.listen(port, () => {
  console.log(`Server running on port: ${port}`);
});
