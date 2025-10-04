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
const DOMPurify = require('dompurify');
const DOMPurifyFactory = require('dompurify');
const multer = require('multer');
const sharp = require('sharp');
const ejs = require('ejs');



// --- بداية الكود التشخيصي ---
// هذا الكود سيقوم بطباعة قائمة بالملفات في سجلات Render
const currentDirectory = __dirname;
fs.readdir(currentDirectory, (err, files) => {
  if (err) {
    console.error('Could not list the directory.', err);
  } else {
    console.log('--- DIAGNOSTIC: FILE LIST IN PROJECT ROOT ---');
    files.forEach(file => {
      console.log(file);
    });
    console.log('-------------------------------------------');
  }
});
// --- نهاية الكود التشخيصي ---

const window = (new JSDOM('')).window;
const DOMPurify = DOMPurifyFactory(window);

const app = express();
const port = process.env.PORT || 3000;

// --- EJS Setup ---
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'public'));

// --- إعدادات قاعدة البيانات ---

// --- حل مشكلة ValidationError ---
// يجب وضع هذا السطر مباشرة بعد تعريف app
app.set('trust proxy', 1);

const mongoUrl = process.env.MONGO_URI;
const dbName = 'nfc_db';
const collectionName = 'designs';
let db;

// --- Middlewares ---
app.use(cors());
app.use(express.json({ limit: '5mb' }));
app.use(express.static(path.join(__dirname, 'public')));
app.use('/uploads', express.static(path.join(__dirname, 'uploads'))); // Serve uploaded images statically

// --- Create uploads directory if it doesn't exist ---
const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)){
    fs.mkdirSync(uploadDir);
}

app.get('/about', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'about.html'));
});
app.get('/privacy', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'privacy.html'));
});
app.get('/contact', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'contact.html'));
});

// --- تحديد معدل الطلبات ---
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

// تحديد المجلد الرئيسي للمشروع كمصدر للملفات
const rootDir = __dirname;

// إعادة توجيه المسار الجذري إلى /nfc/
app.get('/', (req, res) => {
    res.redirect(301, '/nfc/');
});

// خدمة الملفات من المجلد الرئيسي تحت المسار '/nfc'
app.use('/nfc', express.static(rootDir, { extensions: ['html'] }));

// خدمة مجلد uploads (إذا كان موجوداً في المجلد الرئيسي)
const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });
app.use('/uploads', express.static(uploadDir));

// Views (for viewer.ejs if needed)
app.set('view engine', 'ejs');
app.set('views', rootDir); // استخدام المجلد الرئيسي لعرض القوالب

// Rate Limit and other middlewares...
const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
    message: 'Too many requests from this IP, please try again after 15 minutes'
});
app.use('/api/', apiLimiter);

// --- Multer Configuration for Image Uploads ---
const storage = multer.memoryStorage(); // Store image in memory for processing
const upload = multer({
    storage: storage,
    limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
    fileFilter: (req, file, cb) => {
        if (file.mimetype.startsWith('image/')) {
            cb(null, true);
        } else {
            cb(new Error('Not an image! Please upload an image file.'), false);
        }
    }
});


// --- الاتصال بقاعدة البيانات ---

const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (file.mimetype && file.mimetype.startsWith('image/')) cb(null, true);
    else cb(new Error('Please upload an image'), false);
  }
});

// DB connect
MongoClient.connect(mongoUrl)
    .then(client => {
        console.log('Connected successfully to MongoDB server');
        db = client.db(dbName);
    })
    .catch(err => {
        console.error('Failed to connect to MongoDB', err);
        process.exit(1);
    });

// --- API Routes ---

// API Route for Image Uploading and Processing
app.post('/api/upload-image', upload.single('image'), async (req, res) => {
    if (!req.file) {
        return res.status(400).json({ error: 'No image file uploaded.' });
    }

    try {
        const filename = `${nanoid(10)}.webp`;
        const outputPath = path.join(uploadDir, filename);

        await sharp(req.file.buffer)
            .resize({ width: 1280, height: 1280, fit: 'inside', withoutEnlargement: true })
            .webp({ quality: 80 })
            .toFile(outputPath);

        const imageUrl = `/uploads/${filename}`;
        res.json({ success: true, url: imageUrl });

    } catch (error) {
        console.error('Error processing image:', error);
        res.status(500).json({ error: 'Failed to process image.' });
    }
});


// API لحفظ تصميم جديد مع التحقق والتنقية
app.post(
    '/api/save-design',
    [
        body('inputs.input-name').trim().customSanitizer(value => purify.sanitize(value)),
        body('inputs.input-tagline').trim().customSanitizer(value => purify.sanitize(value)),
        body('inputs.input-email').isEmail().normalizeEmail(),
        body('dynamic.phones.*').isMobilePhone().withMessage('Invalid phone number'),
    ],
    async (req, res) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        if (!db) {
            return res.status(500).json({ error: 'Database not connected' });
        }
        try {
            const designData = req.body;
            const shortId = nanoid(8);

            const collection = db.collection(collectionName);
            await collection.insertOne({
                shortId: shortId,
                data: designData,
                createdAt: new Date()
            });

            res.json({ success: true, id: shortId });
        } catch (error) {
            console.error('Error saving design:', error);
            res.status(500).json({ error: 'Failed to save design' });
        }
    }
);


// API لجلب تصميم محفوظ
app.get('/api/get-design/:id', async (req, res) => {
    if (!db) {
        return res.status(500).json({ error: 'Database not connected' });
    }
    try {
        const { id } = req.params;
        const collection = db.collection(collectionName);
        const design = await collection.findOne({ shortId: id });

        if (design) {
            res.json(design.data);
        } else {
            res.status(404).json({ error: 'Design not found' });
        }
    } catch (error) {
        console.error('Error fetching design:', error);
        res.status(500).json({ error: 'Failed to fetch design' });
    }
});

// --- Page Routing (مع الوسوم الديناميكية و SEO المحسن) ---
app.get('/card/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const collection = db.collection(collectionName);
        const design = await collection.findOne({ shortId: id });

        if (design && design.data) {
            const cardData = design.data;
            const renderData = {
                cardName: cardData.inputs['input-name'] || 'بطاقة عمل رقمية',
                cardTagline: cardData.inputs['input-tagline'] || 'تم إنشاؤها عبر محرر البطاقات الرقمية',
                cardImage: cardData.inputs['input-logo'] || 'https://www.mcprim.com/nfc/mcprime-logo-transparent.png',
                pageUrl: `https://www.mcprim.com/nfc/card/${id}`,
                cardData: cardData
            };
            res.render('viewer', renderData);
        } else {
            res.status(404).sendFile(path.join(__dirname, 'public', '404.html'));
        }
    } catch (error) {
        console.error('Error handling card request:', error);
        res.status(500).sendFile(path.join(__dirname, 'public', '500.html'));
    }

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
    const page = Math.max(1, parseInt(req.query.page||'1',10));
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

app.get('/card/:id', async (req,res) => {
  try {
    if (!db) return res.status(500).send('DB not connected');
    const id = String(req.params.id);
    const doc = await db.collection(designsCollectionName).findOne({ shortId: id });
    if (!doc) return res.status(404).send('Design not found');
    const filePath = path.join(rootDir, 'viewer.html'); // يقرأ القالب من المجلد الرئيسي
    let html = fs.readFileSync(filePath, 'utf8');
    const cardName = (doc.data.inputs['input-name']||'بطاقة عمل رقمية').replace(/</g,'&lt;');
    const cardTagline = (doc.data.inputs['input-tagline']||'').replace(/</g,'&lt;');
    const pageUrl = `https://www.mcprim.com/card/${id}`;
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

// معالج خطأ 404 في النهاية

app.use((req, res, next) => {
  res.status(404).sendFile(path.join(__dirname, 'public', '404.html'));
});

app.use((err, req, res, next) => {
  console.error('Internal Server Error:', err);
  res.status(500).sendFile(path.join(__dirname, 'public', '500.html'));
});

app.listen(port, () => {
    console.log(`Server listening at http://localhost:${port}`);
});

app.listen(port, () => console.log('Server listening on port ' + port));
