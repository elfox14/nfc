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
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// --- تكوين مساحة تخزين Cloudinary ---
const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'nfc_uploads', // اسم المجلد الذي سيتم حفظ الصور فيه على Cloudinary
    allowed_formats: ['jpeg', 'png', 'webp', 'jpg', 'gif'],
    transformation: [{ width: 2000, height: 2000, crop: 'limit' }] // تحسين حجم الصورة
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

// Static (للواجهة الأمامية)
const publicDir = path.join(__dirname, 'public');
if (fs.existsSync(publicDir)) app.use(express.static(publicDir));

// (لم نعد بحاجة لمجلد uploads المحلي)

app.set('view engine', 'ejs');
app.set('views', publicDir);

// Rate Limit
const apiLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 200, standardHeaders: true, legacyHeaders: false });
app.use('/api/', apiLimiter);

// DB connect
MongoClient.connect(mongoUrl)
  .then(client => { db = client.db(dbName); console.log('MongoDB connected'); })
  .catch(err => { console.error('Mongo connect error', err); process.exit(1); });

// Upload general image
// --- تم التعديل ليستخدم Cloudinary ---
app.post('/api/upload-image', upload.single('image'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No image provided' });
    // الرابط الدائم يأتي الآن من Cloudinary
    return res.json({ success: true, url: req.file.path });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: 'Image upload failed' });
  }
});

// Save design
app.post('/api/save-design', async (req,res) => {
  // ... (هذا الجزء يبقى كما هو بدون تغيير)
  try {
    if (!db) return res.status(500).json({ error: 'DB not connected' });
    const data = req.body || { };
    const inputs = data.inputs || {};
    ['input-name','input-tagline'].forEach(k => { if (inputs[k]) inputs[k] = DOMPurify.sanitize(String(inputs[k])); });
    data.inputs = inputs;
    const shortId = nanoid(8);
    await db.collection(designsCollectionName).insertOne({ shortId, data, createdAt: new Date() });
    res.json({ success:true, id: shortId });
  } catch (e) {
    console.error(e); res.status(500).json({ error: 'Save failed' });
  }
});

// Get design
app.get('/api/get-design/:id', async (req,res) => {
  // ... (هذا الجزء يبقى كما هو بدون تغيير)
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

// Upload background (admin)
// --- تم التعديل ليستخدم Cloudinary ---
app.post('/api/upload-background', upload.single('image'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No image' });
    if (!db) return res.status(500).json({ error: 'DB not connected' });
    
    const payload = {
      shortId: nanoid(8),
      url: req.file.path, // الرابط الدائم من Cloudinary
      public_id: req.file.filename, // المعرف لحذف الصورة لاحقًا
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

// Fetch backgrounds (public)
app.get('/api/gallery/backgrounds', async (req, res) => {
    // --- تم تبسيط هذا الجزء لأنه لم يعد بحاجة لتصحيح الروابط ---
    try {
        if (!db) return res.status(500).json({ error: 'DB not connected' });
        const coll = db.collection(backgroundsCollectionName);
        const items = await coll.find({}).sort({createdAt: -1}).limit(50).toArray();
        const total = await coll.countDocuments({});
        res.json({ success: true, items, page: 1, limit: 50, total, totalPages: Math.ceil(total / 50) });
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: 'Fetch backgrounds failed' });
    }
});

// Delete background (admin)
// --- تم التعديل ليستخدم Cloudinary ---
app.delete('/api/backgrounds/:shortId', async (req, res) => {
    // ... (هذا الجزء يتطلب مصادقة إدارية، لم نضفها هنا للتبسيط)
    try {
        if (!db) return res.status(500).json({ error: 'DB not connected' });
        const shortId = String(req.params.shortId);
        const coll = db.collection(backgroundsCollectionName);
        const doc = await coll.findOne({ shortId });
        if (!doc) return res.status(404).json({ error: 'Not found' });
        
        // حذف الصورة من Cloudinary
        if (doc.public_id) {
            await cloudinary.uploader.destroy(doc.public_id);
        }
        
        // حذف البيانات من قاعدة البيانات
        await coll.deleteOne({ shortId });
        res.json({ success: true });
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: 'Delete failed' });
    }
});


// ... (باقي الأجزاء مثل SSR تبقى كما هي)
app.use((err, req, res, next) => {
  console.error('Internal Server Error:', err);
  res.status(500).send('Internal Server Error');
});

app.listen(port, () => console.log('Server listening on port ' + port));
