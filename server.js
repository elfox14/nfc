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

const window = (new JSDOM('')).window;
const DOMPurify = DOMPurifyFactory(window);

const app = express();
const port = process.env.PORT || 3000;

app.set('trust proxy', 1);

const mongoUrl = process.env.MONGO_URI;
const dbName = process.env.MONGO_DB || 'nfc_db';
const designsCollectionName = process.env.MONGO_DESIGNS_COLL || 'designs';
const backgroundsCollectionName = process.env.MONGO_BACKGROUNDS_COLL || 'backgrounds';
let db;

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));

app.use((req, res, next) => {
  if (req.path.endsWith('.html')) {
    const newPath = req.path.slice(0, -5);
    return res.redirect(301, newPath);
  }
  next();
});

const rootDir = __dirname;
const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

app.set('view engine', 'ejs');
app.set('views', rootDir); 

// إعادة توجيه المسار الجذري
app.get('/', (req, res) => {
    res.redirect(301, '/nfc/');
});

// --- بداية التعديل: تعديل مسار عرض البطاقة ---
// تعريف المسار الديناميكي لعرض البطاقة بالبنية الصحيحة
app.get('/nfc/card/:id', async (req,res) => {
  try {
    if (!db) return res.status(500).send('DB not connected');
    const id = String(req.params.id);
    const doc = await db.collection(designsCollectionName).findOne({ shortId: id });
    if (!doc) return res.status(404).send('Design not found');
    const filePath = path.join(__dirname, 'nfc', 'viewer.html');
    let html = fs.readFileSync(filePath, 'utf8');
    const cardName = (doc.data.inputs['input-name']||'بطاقة عمل رقمية').replace(/</g,'&lt;');
    const cardTagline = (doc.data.inputs['input-tagline']||'').replace(/</g,'&lt;');
    // تصحيح الرابط الكامل للصفحة
    const pageUrl = `https://www.mcprim.com/nfc/card/${id}`; 
    const og = {
      title: `بطاقة عمل ${cardName}`,
      desc: cardTagline || 'بطاقة عمل رقمية ذكية من MC PRIME. شارك بياناتك بلمسة واحدة.',
      image: 'https://www.mcprim.com/nfc/og-image.png'
    };
    html = html
      .replace(/<meta property="og:url" content=".*?"\s*\/>/, `<meta property="og:url" content="${pageUrl}"/>`)
      .replace(/<title>.*?<\/title>/, `<title>عرض وحفظ بطاقة ${cardName}</title>`)
      .replace(/<meta name="description" content=".*?"\s*\/>/, `<meta name="description" content="${og.desc}"/>`)
      .replace(/<meta property="og:title" content=".*?"\s*\/>/, `<meta property="og:title" content="${og.title}"/>`)
      .replace(/<meta property="og:description" content=".*?"\s*\/>/, `<meta property="og:description" content="${og.desc}"/>`)
      .replace(/<meta property="og:image" content=".*?"\s*\/>/, `<meta property="og:image" content="${og.image}"/>`);
    res.send(html);
  } catch (e) {
    console.error(e); res.status(500).send('Internal error');
  }
});
// --- نهاية التعديل ---

// خدمة الملفات الثابتة
app.use(express.static(rootDir, { extensions: ['html'] }));
app.use('/uploads', express.static(uploadDir));

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  standardHeaders: true,
  legacyHeaders: false
});
app.use('/api/', apiLimiter);

const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (file.mimetype && file.mimetype.startsWith('image/')) cb(null, true);
    else cb(new Error('Please upload an image'), false);
  }
});

MongoClient.connect(mongoUrl)
  .then(client => { db = client.db(dbName); console.log('MongoDB connected'); })
  .catch(err => { console.error('Mongo connect error', err); process.exit(1); });

// API Routes
app.post('/api/upload-image', upload.single('image'), async (req,res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No image' });
    const filename = nanoid(10) + '.webp';
    const out = path.join(uploadDir, filename);
    await sharp(req.file.buffer)
      .resize({ width: 2560, height: 2560, fit: 'inside', withoutEnlargement: true })
      .webp({ quality: 85 }).toFile(out);
    return res.json({ success: true, url: '/uploads/' + filename });
  } catch (e) {
    console.error(e); return res.status(500).json({ error: 'Upload failed' });
  }
});

app.post('/api/save-design', async (req,res) => {
  try {
    if (!db) return res.status(500).json({ error: 'DB not connected' });
    const data = req.body || { };
    const inputs = data.inputs || {};
    ['input-name','input-tagline'].forEach(k => { if (inputs[k]) inputs[k] = DOMPurify.sanitize(String(inputs[k])); });
    data.inputs = inputs;
    const shortId = nanoid(8);
    await db.collection(designsCollectionName).insertOne({
      shortId, data, createdAt: new Date()
    });
    res.json({ success:true, id: shortId });
  } catch (e) {
    console.error(e); res.status(500).json({ error: 'Save failed' });
  }
});

app.get('/api/get-design/:id', async (req,res) => {
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

app.get('/api/gallery', async (req,res) => {
  try {
    if (!db) return res.status(500).json({ error: 'DB not connected' });
    const docs = await db.collection(designsCollectionName).find({}).sort({createdAt:-1}).limit(20).toArray();
    res.json(docs);
  } catch (e) {
    console.error(e); res.status(500).json({ error: 'Fetch failed' });
  }
});

function assertAdmin(req,res) {
  const expected = process.env.ADMIN_TOKEN || '';
  const provided = req.headers['x-admin-token'] || '';
  if (!expected || expected !== provided) { res.status(401).json({ error: 'Unauthorized' }); return false; }
  return true;
}

app.post('/api/upload-background', upload.single('image'), async (req,res) => {
  try {
    if (!assertAdmin(req,res)) return;
    if (!req.file) return res.status(400).json({ error:'No image' });
    if (!db) return res.status(500).json({ error: 'DB not connected' });
    const filename = 'bg_' + nanoid(10) + '.webp';
    const out = path.join(uploadDir, filename);
    await sharp(req.file.buffer)
      .resize({ width: 3840, height: 3840, fit: 'inside', withoutEnlargement: true })
      .webp({ quality: 88 }).toFile(out);
    const payload = {
      shortId: nanoid(8),
      url: '/uploads/' + filename,
      name: String(req.body.name || 'خلفية'),
      category: String(req.body.category || 'عام'),
      createdAt: new Date()
    };
    await db.collection(backgroundsCollectionName).insertOne(payload);
    res.json({ success:true, background: payload });
  } catch (e) {
    console.error(e); res.status(500).json({ error: 'Upload background failed' });
  }
});

app.get('/api/gallery/backgrounds', async (req,res) => {
  try {
    if (!db) return res.status(500).json({ error: 'DB not connected' });
    const category = req.query.category;
    const page = Math.max(1, parseInt(req.query.page||'I',10));
    const limit = Math.max(1, Math.min(100, parseInt(req.query.limit||'50',10)));
    const skip = (page-1)*limit;
    const q = (category && category!=='all') ? { category: String(category) } : {};
    const coll = db.collection(backgroundsCollectionName);
    const [items, total] = await Promise.all([
      coll.find(q).sort({createdAt:-1}).skip(skip).limit(limit).toArray(),
      coll.countDocuments(q)
    ]);
    res.json({ success:true, items, page, limit, total, totalPages: Math.ceil(total/limit) });
  } catch (e) {
    console.error(e); res.status(500).json({ error: 'Fetch backgrounds failed' });
  }
});

app.delete('/api/backgrounds/:shortId', async (req,res) => {
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
    res.json({ success:true });
  } catch (e) {
    console.error(e); res.status(500).json({ error: 'Delete failed' });
  }
});


app.use((req, res, next) => {
    res.status(404).send('Sorry, that page does not exist.');
});

app.use((err, req, res, next) => {
  console.error('Internal Server Error:', err);
  res.status(500).send('Internal Server Error');
});

app.listen(port, () => console.log('Server listening on port ' + port));
