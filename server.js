// server.js
require('dotenv').config();
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

const window = (new JSDOM('')).window;
const DOMPurify = DOMPurifyFactory(window);

const app = express();
const port = process.env.PORT || 3000;

// --- Basic app settings ---
app.set('trust proxy', 1);
app.disable('x-powered-by');
app.set('view engine', 'ejs');

// --- Security middlewares (Helmet) ---
app.use(helmet.frameguard({ action: 'deny' }));
app.use(helmet.xssFilter());
app.use(helmet.noSniff());
app.use(helmet.hsts({
  maxAge: 31536000,
  includeSubDomains: true,
  preload: true
}));

// Minimal CSP tailored for the app (adjust as needed)
app.use(helmet.contentSecurityPolicy({
  directives: {
    defaultSrc: ["'self'"],
    scriptSrc: ["'self'", "https://cdnjs.cloudflare.com", "https://cdn.jsdelivr.net", "https://www.youtube.com"],
    styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com", "https://cdnjs.cloudflare.com"],
    fontSrc: ["'self'", "https://fonts.gstatic.com"],
    imgSrc: ["'self'", "data:", "https:", "https://i.imgur.com", "https://www.mcprim.com", "https://media.giphy.com", "https://nfc-vjy6.onrender.com"],
    connectSrc: ["'self'", "https://cdnjs.cloudflare.com", "https://cdn.jsdelivr.net", "https://www.youtube.com", "https://www.mcprim.com", "https://nfc-vjy6.onrender.com"],
    frameSrc: ["'self'", "https://www.youtube.com"],
    objectSrc: ["'none'"],
    upgradeInsecureRequests: [],
  }
}));

app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// --- Performance: compression ---
app.use(compression());

// --- Static files with cache / security headers ---
const staticOptions = {
  maxAge: '30d',
  etag: true,
  setHeaders: (res, filePath) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Referrer-Policy', 'no-referrer-when-downgrade');

    if (/\.(html|ejs)$/i.test(filePath)) {
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    } else if (/\.(css|js|jpg|jpeg|png|svg|webp|gif|woff2|woff|ttf)$/i.test(filePath)) {
      res.setHeader('Cache-Control', 'public, max-age=2592000, immutable');
    }
  }
};

// Serve `public/nfc` if exists, otherwise serve project root (fallback)
const publicNfcPath = path.join(__dirname, 'public', 'nfc');
if (fs.existsSync(publicNfcPath)) {
  app.use('/nfc', express.static(publicNfcPath, staticOptions));
}
app.use(express.static(path.join(__dirname), staticOptions));

// --- Rate limiting: basic global and API-specific ---
const globalLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 150,
  standardHeaders: true,
  legacyHeaders: false,
  message: 'Too many requests, please slow down.'
});
app.use(globalLimiter);

const apiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: 'Too many API requests, please try again later.'
});

// --- Database setup (MongoDB) ---
const mongoUrl = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017';
const dbName = process.env.MONGO_DB || 'nfc_db';
const designsCollectionName = process.env.MONGO_DESIGNS_COLL || 'designs';
const backgroundsCollectionName = process.env.MONGO_BACKGROUNDS_COLL || 'backgrounds';
let db;

MongoClient.connect(mongoUrl, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(client => {
    db = client.db(dbName);
    console.log('MongoDB connected to', dbName);
  })
  .catch(err => {
    console.error('MongoDB connection error:', err);
    // Do not exit so the server can still serve static assets if needed
  });

// --- Utilities ---
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
    if (sanitized[k]) sanitized[k] = DOMPurify.sanitize(String(sanitized[k]));
  });

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

// --- Multer for uploads (images) ---
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadsDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${Date.now()}-${nanoid(8)}${ext}`);
  }
});
const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (req, file, cb) => {
    const allowed = /jpeg|jpg|png|webp/;
    const mimeOK = allowed.test(file.mimetype);
    const extOK = allowed.test(path.extname(file.originalname).toLowerCase());
    if (mimeOK && extOK) return cb(null, true);
    cb(new Error('Only images are allowed (jpg, jpeg, png, webp)'));
  }
});

// --- Routes ---

// Home or index route (serves index.html under /nfc or root)
app.get(['/nfc', '/nfc/', '/'], (req, res) => {
  const indexPath = path.join(__dirname, 'index.html');
  if (fs.existsSync(indexPath)) {
    return res.sendFile(indexPath);
  }
  res.send('MC PRIME NFC - home');
});

// Viewer route (server-side rendered SEO-friendly)
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

    // Increment views (non-blocking)
    db.collection(designsCollectionName).updateOne({ shortId: id }, { $inc: { views: 1 } }).catch(err => {
      console.error('Failed to increment views for', id, err);
    });

    res.setHeader('X-Robots-Tag', 'index, follow');

    const base = absoluteBaseUrl(req);
    const pageUrl = `${base}/nfc/viewer.html?id=${encodeURIComponent(id)}`;

    const inputs = doc.data.inputs || {};
    const name = DOMPurify.sanitize(inputs['input-name'] || 'بطاقة عمل رقمية');
    const tagline = DOMPurify.sanitize(inputs['input-tagline'] || '');
    const ogImage = (doc.data.imageUrls && doc.data.imageUrls.front) ? doc.data.imageUrls.front : `${base}/nfc/og-image.png`;
    const canonical = pageUrl;

    // render viewer.ejs if present; else fallback to viewer.html
    const viewerEjsPath = path.join(__dirname, 'viewer.ejs');
    if (fs.existsSync(viewerEjsPath)) {
      return res.render(viewerEjsPath, {
        name, tagline, pageUrl, ogImage, canonical, doc
      });
    }

    const viewerHtmlPath = path.join(__dirname, 'viewer.html');
    if (fs.existsSync(viewerHtmlPath)) {
      return res.sendFile(viewerHtmlPath);
    }

    // fallback
    res.send(`
      <html><head><title>${name}</title><meta name="robots" content="index, follow"></head>
      <body><h1>${name}</h1><p>${tagline}</p><img src="${ogImage}" alt="og"></body></html>
    `);
  } catch (err) {
    console.error('Error in /nfc/viewer:', err);
    res.setHeader('X-Robots-Tag', 'noindex, noarchive');
    res.status(500).send('Internal server error');
  }
});

// API: get design JSON (used by viewer.js fallback)
app.get('/api/design/:id', apiLimiter, async (req, res) => {
  try {
    const id = String(req.params.id || '').trim();
    if (!id) return res.status(400).json({ error: 'Missing id' });
    if (!db) return res.status(500).json({ error: 'DB not connected' });
    const doc = await db.collection(designsCollectionName).findOne({ shortId: id });
    if (!doc) return res.status(404).json({ error: 'Not found' });
    // hide internal fields if any
    const sanitizedDoc = { ...doc };
    delete sanitizedDoc._id;
    res.json(sanitizedDoc);
  } catch (err) {
    console.error('/api/design/:id error', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// API: create a new design (example endpoint)
app.post('/api/design', apiLimiter, [
  body('inputs').isObject().optional(),
  body('dynamic').isObject().optional()
], async (req, res) => {
  try {
    if (!db) return res.status(500).json({ error: 'DB not connected' });

    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const payload = req.body || {};
    const inputs = sanitizeInputs(payload.inputs || {});
    const dynamic = payload.dynamic || {};
    const shortId = nanoid(8);

    const doc = {
      shortId,
      data: {
        inputs,
        dynamic,
        imageUrls: payload.imageUrls || {}
      },
      createdAt: new Date(),
      updatedAt: new Date(),
      views: 0
    };

    const result = await db.collection(designsCollectionName).insertOne(doc);
    return res.status(201).json({ ok: true, shortId });
  } catch (err) {
    console.error('POST /api/design error', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// API: upload image (logo/background/photo) and optionally produce optimized versions
app.post('/api/upload-image', apiLimiter, upload.single('image'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

    const filePath = req.file.path;
    const optimizedFilename = `opt-${path.basename(filePath, path.extname(filePath))}.webp`;
    const optimizedPath = path.join(uploadsDir, optimizedFilename);

    // Use sharp to resize/convert to webp for web delivery
    await sharp(filePath)
      .resize({ width: 1600, withoutEnlargement: true })
      .webp({ quality: 80 })
      .toFile(optimizedPath);

    // Optionally remove original to save space (commented out by default)
    // fs.unlinkSync(filePath);

    const publicUrl = `${absoluteBaseUrl(req)}/uploads/${optimizedFilename}`;

    return res.json({ ok: true, url: publicUrl, filename: optimizedFilename });
  } catch (err) {
    console.error('/api/upload-image error', err);
    return res.status(500).json({ error: 'Upload failed' });
  }
});

// Serve uploaded files (with caching)
app.use('/uploads', express.static(uploadsDir, {
  maxAge: '30d',
  etag: true,
  setHeaders: (res, filePath) => {
    res.setHeader('Cache-Control', 'public, max-age=2592000, immutable');
  }
}));

// API: simple healthcheck
app.get('/healthz', (req, res) => res.json({ ok: true, timestamp: Date.now() }));

// Sitemap route (basic dynamic sitemap for designs)
// NOTE: For large collections, generate sitemap periodically and serve static file
app.get('/sitemap.xml', async (req, res) => {
  try {
    const base = absoluteBaseUrl(req);
    let urls = [
      `${base}/nfc/`,
      `${base}/nfc/editor`,
      `${base}/nfc/gallery`
    ];

    if (db) {
      const docs = await db.collection(designsCollectionName)
        .find({}, { projection: { shortId: 1 } })
        .sort({ createdAt: -1 })
        .limit(5000)
        .toArray();
      docs.forEach(d => {
        if (d && d.shortId) urls.push(`${base}/nfc/viewer.html?id=${d.shortId}`);
      });
    }

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
    <urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
      ${urls.map(u => `<url><loc>${u}</loc></url>`).join('\n')}
    </urlset>`;

    res.header('Content-Type', 'application/xml');
    res.send(xml);
  } catch (err) {
    console.error('sitemap.xml error', err);
    res.status(500).send('Failed to generate sitemap');
  }
});

// Fallback 404 for unknown routes
app.use((req, res) => {
  // Prefer serving 404 page if exists under /nfc/404.html
  const custom404 = path.join(__dirname, '404.html');
  if (fs.existsSync(custom404)) return res.status(404).sendFile(custom404);
  res.status(404).send('Not Found');
});

// Generic error handler (do not leak stack in production)
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err && err.stack ? err.stack : err);
  if (res.headersSent) return next(err);
  res.status(500).send('Internal Server Error');
});

app.listen(port, () => {
  console.log(`Server listening on port ${port}`);
});
