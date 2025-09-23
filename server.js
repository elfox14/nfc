// server.js
require('dotenv').config();
const express = require('express');
const { MongoClient } = require('mongodb');
const path = require('path');
const cors = require('cors');
const fs = require('fs');
const rateLimit = require('express-rate-limit');
const { nanoid } = require('nanoid'); // <-- استخدام nanoid
const { body, validationResult } = require('express-validator'); // <-- للتحقق من المدخلات
const { JSDOM } = require('jsdom'); // <-- لمعالجة HTML وتنقيته
const DOMPurify = require('dompurify'); // <-- لتنقية المدخلات من XSS
const sharp = require('sharp'); // For image processing
const multer = require('multer'); // For handling file uploads

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

// Create uploads directory if it doesn't exist and make it static
const uploadsDir = path.join(__dirname, 'public', 'uploads');
if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir);
}
app.use('/uploads', express.static(path.join(__dirname, 'public', 'uploads')));


app.get('/about', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'about.html'));
});
app.get('/privacy', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'privacy.html'));
});
app.get('/contact', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'contact.html'));
});
// Add route for the new gallery page
app.get('/gallery', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'gallery.html'));
});

// --- Multer Setup for image uploads ---
const storage = multer.memoryStorage();
const upload = multer({ 
    storage: storage,
    limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
});


// --- تحديد معدل الطلبات ---
const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
    message: 'Too many requests from this IP, please try again after 15 minutes'
});
app.use('/api/', apiLimiter);

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

// API for image uploading and processing
app.post('/api/upload-image', upload.single('image'), async (req, res) => {
    if (!req.file) {
        return res.status(400).json({ error: 'No image file provided.' });
    }

    try {
        const uniqueFilename = `${Date.now()}-${nanoid(6)}.webp`;
        const outputPath = path.join(uploadsDir, uniqueFilename);

        await sharp(req.file.buffer)
            .resize({ width: 1280, withoutEnlargement: true })
            .webp({ quality: 80 })
            .toFile(outputPath);
        
        // Return the public URL of the processed image
        const imageUrl = `/uploads/${uniqueFilename}`;
        res.json({ success: true, url: imageUrl });

    } catch (error) {
        console.error('Error processing image:', error);
        res.status(500).json({ error: 'Failed to process image.' });
    }
});


// API لحفظ تصميم جديد مع التحقق والتنقية
app.post(
    '/api/save-design',
    // --- إضافة التحقق والتنقية هنا ---
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
            const shortId = nanoid(8); // <-- استخدام nanoid لإنشاء معرف آمن

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

// --- NEW: API for fetching gallery cards ---
app.get('/api/gallery', async (req, res) => {
    if (!db) {
        return res.status(500).json({ error: 'Database not connected' });
    }
    try {
        const collection = db.collection(collectionName);
        // Fetch the 12 most recent designs
        const designs = await collection.find({})
            .sort({ createdAt: -1 })
            .limit(12)
            .project({ 
                shortId: 1, 
                'data.inputs.input-name': 1,
                'data.inputs.input-tagline': 1,
                'data.inputs.input-logo': 1 // We need the logo for the thumbnail
            })
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
        if (!db) {
            return res.status(503).sendFile(path.join(__dirname, 'public', '500.html'));
        }
        
        const { id } = req.params;
        const collection = db.collection(collectionName);
        const design = await collection.findOne({ shortId: id });

        if (!design || !design.data) {
            return res.status(404).sendFile(path.join(__dirname, 'public', '404.html'));
        }

        const cardData = design.data;
        const cardName = cardData.inputs['input-name'] || 'بطاقة عمل رقمية';
        const cardTagline = cardData.inputs['input-tagline'] || 'تم إنشاؤها عبر محرر البطاقات الرقمية';
        const cardImage = cardData.inputs['input-logo'] || 'https://www.mcprim.com/nfc/mcprime-logo-transparent.png';
        const pageUrl = `https://mcprim.com/nfc/card/${id}`;

        res.render('viewer', {
            cardName,
            cardTagline,
            cardImage,
            pageUrl,
            cardData // Pass the full data object to the template
        });

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

