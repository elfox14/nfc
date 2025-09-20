// server.js
require('dotenv').config();
const express = require('express');
const { MongoClient } = require('mongodb');
const path = require('path');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const { nanoid } = require('nanoid');
const { body, validationResult } = require('express-validator');
const { JSDOM } = require('jsdom');
const DOMPurify = require('dompurify');

const window = new JSDOM('').window;
const purify = DOMPurify(window);

const app = express();
const port = process.env.PORT || 3000;

// --- إعدادات قاعدة البيانات ---
const mongoUrl = process.env.MONGO_URI;
const dbName = 'nfc_db';
const collectionName = 'designs';
let db;

// --- إعداد محرك القوالب EJS ---
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'public'));

// --- Middlewares ---
app.use(cors());
app.use(express.json({ limit: '5mb' }));

// --- ✨ التعديل هنا: تم نقل مسارات الصفحات الديناميكية قبل مسار الملفات الثابتة ✨ ---

// --- Page Routing (المسارات الديناميكية أولاً) ---

// إعادة توجيه الروابط القديمة
app.get('/viewer.html', (req, res) => {
    const cardId = req.query.id;
    if (cardId) {
        return res.redirect(301, `/card/${cardId}`);
    }
    res.redirect(301, '/');
});

// المسار الرئيسي لعرض البطاقات (SSR)
app.get('/card/:id', async (req, res) => {
    try {
        const { id } = req.params;
        if (!db) {
            return res.status(503).send('Service temporarily unavailable. Please try again in a moment.');
        }

        const collection = db.collection(collectionName);
        const design = await collection.findOne({ shortId: id });

        if (design && design.data) {
            const cardData = design.data;
            const pageUrl = `${req.protocol}://${req.get('host')}/card/${id}`;

            const pageData = {
                cardName: cardData.inputs['input-name'] || 'بطاقة عمل رقمية',
                cardTagline: cardData.inputs['input-tagline'] || 'تم إنشاؤها عبر محرر البطاقات الرقمية',
                cardImage: cardData.inputs['input-logo'] || 'https://www.mcprim.com/nfc/mcprime-logo-transparent.png',
                pageUrl: pageUrl,
                cardData: cardData
            };
            
            res.render('viewer', pageData);

        } else {
            res.status(404).sendFile(path.join(__dirname, 'public', '404.html'));
        }
    } catch (error) {
        console.error('Error handling card request:', error);
        res.status(500).sendFile(path.join(__dirname, 'public', '500.html'));
    }
});

// الصفحات الثابتة الأخرى
app.get('/about', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'about.html'));
});
app.get('/privacy', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'privacy.html'));
});
app.get('/contact', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'contact.html'));
});


// --- ✨ يأتي أمر خدمة الملفات الثابتة (الحارس الأول سابقًا) الآن في هذا المكان ✨ ---
app.use(express.static(path.join(__dirname, 'public')));


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
app.post(
    '/api/save-design',
    [
        body('inputs.input-name').trim().customSanitizer(value => purify.sanitize(value)),
        body('inputs.input-tagline').trim().customSanitizer(value => purify.sanitize(value)),
        body('inputs.input-email').isEmail().normalizeEmail(),
        body('dynamic.phones.*').isMobilePhone().withMessage('Invalid phone number'),
    ],
    async (req, res) => {
        // ... (باقي الكود كما هو)
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }
        if (!db) { return res.status(500).json({ error: 'Database not connected' }); }
        try {
            const designData = req.body;
            const shortId = nanoid(8);
            const collection = db.collection(collectionName);
            await collection.insertOne({ shortId: shortId, data: designData, createdAt: new Date() });
            res.json({ success: true, id: shortId });
        } catch (error) {
            console.error('Error saving design:', error);
            res.status(500).json({ error: 'Failed to save design' });
        }
    }
);

app.get('/api/get-design/:id', async (req, res) => {
    // ... (باقي الكود كما هو)
    if (!db) { return res.status(500).json({ error: 'Database not connected' }); }
    try {
        const { id } = req.params;
        const collection = db.collection(collectionName);
        const design = await collection.findOne({ shortId: id });
        if (design) { res.json(design.data); } 
        else { res.status(404).json({ error: 'Design not found' }); }
    } catch (error) {
        console.error('Error fetching design:', error);
        res.status(500).json({ error: 'Failed to fetch design' });
    }
});


// معالجة الأخطاء في النهاية
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
