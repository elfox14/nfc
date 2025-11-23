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

// Define rootDir - CRITICAL FIX for Render deployment
const rootDir = __dirname;

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
  .then(client => {
    db = client.db(dbName);
    app.locals.db = db; // Make db accessible to routes
    console.log('MongoDB connected');
  })
  .catch(err => { console.error('Mongo connect error', err); process.exit(1); });

// --- Authentication Routes ---
const authRoutes = require('./routes/auth');
app.use('/api/auth', authRoutes);

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
  // تعقيم الحقول الديناميكية (مثل الروابط المضافة حديثًا)
  if (sanitized.dynamic && sanitized.dynamic.social) {
    sanitized.dynamic.social = sanitized.dynamic.social.map(link => ({
      ...link,
      value: link && link.value ? DOMPurify.sanitize(String(link.value)) : ''
    }));
  }
  // تعقيم أرقام الهواتف الديناميكية
  if (sanitized.dynamic && sanitized.dynamic.phones) {
    sanitized.dynamic.phones = sanitized.dynamic.phones.map(phone => ({
      ...phone,
      value: phone && phone.value ? DOMPurify.sanitize(String(phone.value)) : ''
    }));
  }
  return sanitized;
}

// --- معالجة رفع الصور ---
const uploadDir = path.join(rootDir, 'uploads');
if (!fs.existsSync(uploadDir)) { fs.mkdirSync(uploadDir, { recursive: true }); }

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|webp/;
    const extName = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimeCheck = allowedTypes.test(file.mimetype);
    (extName && mimeCheck) ? cb(null, true) : cb(new Error('نوع الملف غير مسموح به. استخدم صور فقط!'));
  }
});

function handleMulterErrors(err, req, res, next) {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(413).json({ error: 'حجم الملف كبير جداً. الحد الأقصى 10 ميجابايت.' });
    }
    return res.status(400).json({ error: 'خطأ في رفع الملف.' });
  } else if (err) {
    return res.status(400).json({ error: err.message });
  }
  next();
}

// --- API Endpoints ---

// Health check endpoint
app.get('/healthz', (req, res) => {
  if (db) {
    res.json({ ok: true, db_status: 'connected' });
  } else {
    res.status(500).json({ ok: false, db_status: 'disconnected' });
  }
});

// Upload image
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

// Save design
app.post('/api/save-design', async (req, res) => {
  try {
    if (!db) return res.status(500).json({ error: 'DB not connected' });

    let data = req.body || {};
    if (data.inputs) {
      data.inputs = sanitizeInputs(data.inputs);
    }
    if (data.dynamic) {
      if (data.dynamic.phones) {
        data.dynamic.phones = data.dynamic.phones.map(phone => ({
          ...phone,
          value: phone && phone.value ? DOMPurify.sanitize(String(phone.value)) : ''
        }));
      }
      if (data.dynamic.social) {
        data.dynamic.social = data.dynamic.social.map(link => ({
          ...link,
          value: link && link.value ? DOMPurify.sanitize(String(link.value)) : ''
        }));
      }
      if (data.dynamic.staticSocial) {
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

// Get design
app.get('/api/get-design', async (req, res) => {
  try {
    if (!db) return res.status(500).json({ error: 'DB not connected' });

    const id = String(req.query.id);
    const doc = await db.collection(designsCollectionName).findOne({ shortId: id });
    if (!doc) return res.status(404).json({ error: 'Not found' });

    res.json({ success: true, data: doc.data });
  } catch (e) {
    console.error('Get design error:', e);
    if (!res.headersSent) {
      res.status(500).json({ error: 'Fetch failed' });
    }
  }
});

// Gallery
app.get('/api/gallery', async (req, res) => {
  try {
    if (!db) return res.status(500).json({ error: 'DB not connected' });

    const page = parseInt(req.query.page || '1', 10);
    const limit = 12;
    const skip = (page - 1) * limit;

    const sortBy = String(req.query.sortBy || 'createdAt');
    const sortQuery = {};
    if (sortBy === 'views') {
      sortQuery.views = -1;
    } else {
      sortQuery.createdAt = -1;
    }

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

    res.json({
      success: true,
      designs: docs,
      pagination: {
        page,
        limit,
        totalDocs,
        totalPages
      }
    });
  } catch (e) {
    console.error('Fetch gallery error:', e);
    if (!res.headersSent) {
      res.status(500).json({ error: 'Fetch failed', success: false });
    }
  }
});

// Static files
app.use('/uploads', express.static(uploadDir));
app.use('/nfc', express.static(rootDir, { extensions: ['html'] }));

// Error handler
app.use((err, req, res, next) => {
  console.error("Unhandled error:", err.stack || err);
  const statusCode = err.status || 500;
  const message = process.env.NODE_ENV === 'production' ? 'Internal Server Error' : err.message;
  if (!res.headersSent) {
    res.status(statusCode).json({ error: message });
  }
});

// Start server
app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});