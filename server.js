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

// API لجلب تصاميم المعرض (آخر 20 تصميم)
app.get('/api/gallery', async (req, res) => {
    if (!db) {
        return res.status(500).json({ error: 'Database not connected' });
    }
    try {
        const collection = db.collection(collectionName);
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
});


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
