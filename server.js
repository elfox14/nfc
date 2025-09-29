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
const multer = require('multer');
const sharp = require('sharp');
const ejs = require('ejs');

const window = new JSDOM('').window;
const purify = DOMPurify(window);

const app = express();
const port = 3000;

// --- EJS Setup ---
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'public'));

// --- إعدادات قاعدة البيانات ---
const mongoUrl = process.env.MONGO_URI;
const dbName = 'nfc_db';
const designsCollectionName = 'designs';
const backgroundsCollectionName = 'backgrounds';
let db;

// --- Middlewares ---
app.use(cors());
app.use(express.json({ limit: '5mb' }));
app.use(express.static(path.join(__dirname, 'public')));

// Serve uploaded images statically
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// --- Create uploads directory if it doesn't exist ---
const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) {
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

// 1) رفع صورة عامة (تستخدمها الواجهة حالياً للشعار/الخلفيات الخاصة)
app.post('/api/upload-image', upload.single('image'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No image file uploaded.' });

  try {
    const filename = `${nanoid(10)}.webp`;
    const outputPath = path.join(uploadDir, filename);

    await sharp(req.file.buffer)
      .resize({ width: 1920, height: 1920, fit: 'inside', withoutEnlargement: true })
      .webp({ quality: 82 })
      .toFile(outputPath);

    const imageUrl = `/uploads/${filename}`;
    res.json({ success: true, url: imageUrl });
  } catch (error) {
    console.error('Error processing image:', error);
    res.status(500).json({ error: 'Failed to process image.' });
  }
});

// 2) حفظ تصميم جديد
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
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
    if (!db) return res.status(500).json({ error: 'Database not connected' });

    try {
      const designData = req.body;
      const shortId = nanoid(8);
      const collection = db.collection(designsCollectionName);
      await collection.insertOne({
        shortId,
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

// 3) جلب تصميم محفوظ
app.get('/api/get-design/:id', async (req, res) => {
  if (!db) return res.status(500).json({ error: 'Database not connected' });
  try {
    const { id } = req.params;
    const collection = db.collection(designsCollectionName);
    const design = await collection.findOne({ shortId: id });
    if (design) res.json(design.data);
    else res.status(404).json({ error: 'Design not found' });
  } catch (error) {
    console.error('Error fetching design:', error);
    res.status(500).json({ error: 'Failed to fetch design' });
  }
});

// 4) جاليري التصاميم (قائم سابقاً)
app.get('/api/gallery', async (req, res) => {
  if (!db) return res.status(500).json({ error: 'Database not connected' });
  try {
    const collection = db.collection(designsCollectionName);
    const designs = await collection.find({})
      .sort({ createdAt: -1 })
      .limit(20)
      .toArray();
    res.json(designs);
  } catch (error) {
    console.error('Error fetching gallery designs:', error);
    res.status(500).json({ error: 'Failed to fetch gallery designs' });
  }
});

/* ============================= *
 *        معرض الخلفيات          *
 * ============================= */

// حماية بسيطة لرفع الخلفيات (اختياري): أرسل Header: x-admin-token يساوي ADMIN_TOKEN في env
function assertAdmin(req, res) {
  const expected = process.env.ADMIN_TOKEN || '';
  const provided = req.headers['x-admin-token'] || '';
  if (!expected || provided !== expected) {
    res.status(401).json({ error: 'Unauthorized' });
    return false;
  }
  return true;
}

// رفع خلفية جديدة إلى المعرض (للإدارة فقط)
app.post('/api/upload-background', upload.single('image'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No image file uploaded.' });
  if (!db) return res.status(500).json({ error: 'Database not connected' });
  if (!assertAdmin(req, res)) return; // تحقق توكن الإدارة

  try {
    const filename = `bg_${nanoid(10)}.webp`;
    const outputPath = path.join(uploadDir, filename);

    await sharp(req.file.buffer)
      .resize({ width: 2560, height: 2560, fit: 'inside', withoutEnlargement: true })
      .webp({ quality: 85 })
      .toFile(outputPath);

    const imageUrl = `/uploads/${filename}`;
    const payload = {
      shortId: nanoid(8),
      url: imageUrl,
      name: (req.body.name || '').toString().trim() || 'خلفية بدون اسم',
      category: (req.body.category || '').toString().trim() || 'عام',
      createdAt: new Date()
    };

    await db.collection(backgroundsCollectionName).insertOne(payload);
    res.json({ success: true, background: payload });
  } catch (error) {
    console.error('Error uploading background:', error);
    res.status(500).json({ error: 'Failed to upload background' });
  }
});

// جلب الخلفيات (عام للمستخدمين) مع دعم التصنيف و分页
app.get('/api/gallery/backgrounds', async (req, res) => {
  if (!db) return res.status(500).json({ error: 'Database not connected' });
  try {
    const { category, page = 1, limit = 50 } = req.query;
    const q = {};
    if (category && category !== 'all') q.category = category;

    const skip = (Math.max(1, parseInt(page, 10)) - 1) * Math.max(1, parseInt(limit, 10));
    const perPage = Math.max(1, Math.min(100, parseInt(limit, 10)));

    const coll = db.collection(backgroundsCollectionName);
    const [items, total] = await Promise.all([
      coll.find(q).sort({ createdAt: -1 }).skip(skip).limit(perPage).toArray(),
      coll.countDocuments(q)
    ]);

    res.json({
      success: true,
      items,
      page: Number(page),
      limit: perPage,
      total,
      totalPages: Math.ceil(total / perPage)
    });
  } catch (error) {
    console.error('Error fetching backgrounds:', error);
    res.status(500).json({ error: 'Failed to fetch backgrounds' });
  }
});

// حذف خلفية (للإدارة فقط) — اختياري
app.delete('/api/backgrounds/:shortId', async (req, res) => {
  if (!db) return res.status(500).json({ error: 'Database not connected' });
  if (!assertAdmin(req, res)) return;

  try {
    const { shortId } = req.params;
    const coll = db.collection(backgroundsCollectionName);
    const doc = await coll.findOne({ shortId });
    if (!doc) return res.status(404).json({ error: 'Background not found' });

    // حذف الملف من القرص
    const filePath = path.join(__dirname, doc.url.replace('/uploads/', 'uploads/'));
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    await coll.deleteOne({ shortId });
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting background:', error);
    res.status(500).json({ error: 'Failed to delete background' });
  }
});

/* ============================= *
 *         صفحة العرض SSR        *
 * ============================= */

app.get('/card/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const collection = db.collection(designsCollectionName);
    const design = await collection.findOne({ shortId: id });

    if (design && design.data) {
      // نستخدم viewer.html كقالب مصدر ونحقن وسوم ديناميكية (كما في كودك الحالي)
      const filePath = path.join(__dirname, 'public', 'viewer.html');
      let htmlData = fs.readFileSync(filePath, 'utf8');

      const cardName = design.data.inputs['input-name'] || 'بطاقة عمل رقمية';
      const cardTagline = design.data.inputs['input-tagline'];
      const cardDescription = cardTagline || 'بطاقة عمل رقمية ذكية من MC PRIME. شارك بياناتك بلمسة واحدة.';
      const cardLogoUrl = (design.data.inputs['input-logo'] || 'https://www.mcprim.com/nfc/mcprime-logo-transparent.png').replace(/^http:\/\//i, 'https://');
      const optimizedOgImageUrl = 'https://www.mcprim.com/nfc/og-image.png';
      const pageUrl = `https://mcprim.com/nfc/card/${id}`;

      const pageTitle = `عرض وحفظ بطاقة ${cardName} الرقمية – MC PRIME`;
      const ogTitle = `بطاقة عمل ${cardName}`;

      const personSchema = {
        "@type": "Person",
        "@id": pageUrl,
        "name": cardName,
        "image": { "@type": "ImageObject", "url": cardLogoUrl },
        "url": pageUrl,
        "sameAs": []
      };
      if (cardTagline) personSchema.jobTitle = cardTagline;
      const socialLinks = design.data.dynamic?.social || [];
      socialLinks.forEach(link => {
        if (link.platform && link.value) {
          const prefix = `https://www.${link.platform}.com/`;
          const fullUrl = link.value.startsWith('http') ? link.value : prefix + link.value;
          personSchema.sameAs.push(fullUrl);
        }
      });
      if (design.data.inputs['input-linkedin']) personSchema.sameAs.push(design.data.inputs['input-linkedin']);

      const schemaGraph = `<script type="application/ld+json">
      {
        "@context": "https://schema.org",
        "@graph": [
          ${JSON.stringify(personSchema)},
          {
            "@type": "WebPage",
            "url": "${pageUrl}",
            "name": "${pageTitle.replace(/"/g, '\\"')}",
            "about": { "@id": "${pageUrl}" },
            "primaryImageOfPage": { "@type": "ImageObject", "url": "${cardLogoUrl}" },
            "breadcrumb": { "@id": "${pageUrl}#breadcrumb" }
          },
          {
            "@type": "BreadcrumbList",
            "@id": "${pageUrl}#breadcrumb",
            "itemListElement": [{
              "@type": "ListItem", "position": 1, "name": "الرئيسية", "item": "https://www.mcprim.com/nfc/"
            },{
              "@type": "ListItem", "position": 2, "name": "${cardName.replace(/"/g, '\\"')}"
            }]
          }
        ]
      }
      </script>`;

      htmlData = htmlData
        .replace(/<title>.*?<\/title>/, `<title>${pageTitle.replace(/"/g, '\\"')}</title>`)
        .replace(/<meta name="description" content=".*?"\/>/, `<meta name="description" content="${cardDescription.replace(/"/g, '\\"')}"/>`)
        .replace(/<meta property="og:title" content=".*?"\/>/, `<meta property="og:title" content="${ogTitle.replace(/"/g, '\\"')}"/>`)
        .replace(/<meta property="og:description" content=".*?"\/>/, `<meta property="og:description" content="${cardDescription.replace(/"/g, '\\"')}"/>`)
        .replace(/<meta property="og:image" content=".*?"\/>/, `<meta property="og:image" content="${optimizedOgImageUrl}"/>`)
        .replace('</head>', `${schemaGraph}\n</head>`);

      res.send(htmlData);
    } else {
      res.status(404).send('Design not found');
    }
  } catch (error) {
    console.error('Error serving card page:', error);
    res.status(500).send('Internal server error');
  }
});

app.listen(port, () => {
  console.log(`Server listening on port ${port}`);
});
