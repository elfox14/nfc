// server.js
require('dotenv').config();
const express = require('express');
const { MongoClient } = require('mongodb');
const path = require('path');
const cors = require('cors');
const fs = require('fs');
const rateLimit = require('express-rate-limit');
const { nanoid } = require('nanoid');
const { JSDOM } = require('jsdom');
const DOMPurifyFactory = require('dompurify');
const multer = require('multer');
const ejs = require('ejs');

// --- إضافات Cloudinary ---
const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');

const window = (new JSDOM('')).window;
const DOMPurify = DOMPurifyFactory(window);

const app = express();
const port = process.env.PORT || 3000;

// --- تكوين Cloudinary ---
// يقوم بقراءة المتغيرات من إعدادات البيئة على Render
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// --- تكوين مساحة تخزين Cloudinary لـ Multer ---
// هذا يخبر Multer برفع الملفات مباشرة إلى Cloudinary بدلاً من الخادم المحلي
const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'nfc_backgrounds', // يمكنك تغيير اسم المجلد على Cloudinary
    allowed_formats: ['jpeg', 'png', 'webp', 'jpg', 'gif'],
    transformation: [{ width: 2500, height: 2500, crop: 'limit' }] // لتصغير الصور الكبيرة تلقائيًا
  },
});

const upload = multer({ storage: storage });

const mongoUrl = process.env.MONGO_URI;
const dbName = process.env.MONGO_DB || 'nfc_db';
const designsCollectionName = process.env.MONGO_DESIGNS_COLL || 'designs';
const backgroundsCollectionName = process.env.MONGO_BACKGROUNDS_COLL || 'backgrounds';
let db;

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));

// Static (للواجهة الأمامية وملفاتها مثل CSS و JS)
const publicDir = path.join(__dirname, 'public');
if (fs.existsSync(publicDir)) app.use(express.static(publicDir));

// (لم نعد بحاجة لخدمة مجلد "uploads" لأنه تم استبداله بـ Cloudinary)

app.set('view engine', 'ejs');
app.set('views', publicDir);

// Rate Limit
const apiLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 200, standardHeaders: true, legacyHeaders: false });
app.use('/api/', apiLimiter);

// DB connect
MongoClient.connect(mongoUrl)
  .then(client => { db = client.db(dbName); console.log('MongoDB connected'); })
  .catch(err => { console.error('Mongo connect error', err); process.exit(1); });


// --- ENDPOINTS ---

// Admin gate via header
function assertAdmin(req, res, next) {
  const expected = process.env.ADMIN_TOKEN || '';
  const provided = req.headers['x-admin-token'] || '';
  if (!expected || expected !== provided) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  next(); // يسمح بالمرور إلى الدالة التالية إذا كان التوكن صحيحًا
}

// Upload general image (for logos, photos)
app.post('/api/upload-image', upload.single('image'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No image provided' });
    // req.file.path يحتوي الآن على الرابط الدائم من Cloudinary
    return res.json({ success: true, url: req.file.path });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: 'Image upload failed' });
  }
});

// Save design
app.post('/api/save-design', async (req, res) => {
  try {
    if (!db) return res.status(500).json({ error: 'DB not connected' });
    const data = req.body || {};
    const inputs = data.inputs || {};
    ['input-name', 'input-tagline'].forEach(k => { if (inputs[k]) inputs[k] = DOMPurify.sanitize(String(inputs[k])); });
    data.inputs = inputs;
    const shortId = nanoid(8);
    await db.collection(designsCollectionName).insertOne({ shortId, data, createdAt: new Date() });
    res.json({ success: true, id: shortId });
  } catch (e) {
    console.error(e); res.status(500).json({ error: 'Save failed' });
  }
});

// Get design
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

// Upload background (Admin only)
app.post('/api/upload-background', assertAdmin, upload.single('image'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No image' });
    if (!db) return res.status(500).json({ error: 'DB not connected' });

    const payload = {
      shortId: nanoid(8),
      url: req.file.path, // الرابط الدائم من Cloudinary
      public_id: req.file.filename, // المعرّف الفريد للصورة على Cloudinary (مهم للحذف)
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

// Fetch backgrounds (Public)
app.get('/api/gallery/backgrounds', async (req, res) => {
  try {
    if (!db) return res.status(500).json({ error: 'DB not connected' });
    const coll = db.collection(backgroundsCollectionName);
    const items = await coll.find({}).sort({ createdAt: -1 }).limit(100).toArray();
    res.json({ success: true, items });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Fetch backgrounds failed' });
  }
});

// Delete background (Admin only)
app.delete('/api/backgrounds/:shortId', assertAdmin, async (req, res) => {
  try {
    if (!db) return res.status(500).json({ error: 'DB not connected' });
    const shortId = String(req.params.shortId);
    const coll = db.collection(backgroundsCollectionName);
    const doc = await coll.findOne({ shortId });
    if (!doc) return res.status(404).json({ error: 'Background not found in database' });

    // 1. حذف الصورة من Cloudinary
    if (doc.public_id) {
      await cloudinary.uploader.destroy(doc.public_id);
    }

    // 2. حذف البيانات من قاعدة بيانات MongoDB
    await coll.deleteOne({ shortId });
    res.json({ success: true });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Delete failed' });
  }
});

// SSR view for cards (remains the same)
app.get('/card/:id', async (req, res) => {
    // ... no changes needed here
});

// Error handling
app.use((err, req, res, next) => {
  console.error('Internal Server Error:', err);
  res.status(500).send('Internal Server Error');
});

// Start server
app.listen(port, () => console.log('Server listening on port ' + port));
