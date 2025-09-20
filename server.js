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

const window = new JSDOM('').window;
const purify = DOMPurify(window);

const app = express();
const port = process.env.PORT || 3000;

// --- إعدادات قاعدة البيانات ---
const mongoUrl = process.env.MONGO_URI;
const dbName = 'nfc_db';
const collectionName = 'designs';
let db;

// --- Middlewares ---
app.use(cors());
app.use(express.json({ limit: '5mb' }));
app.use(express.static(path.join(__dirname, 'public')));
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

// --- START: تعديل SSR ---
// مسار جديد لعرض البطاقة مع العرض من جانب الخادم (SSR)
app.get('/view/:id', async (req, res, next) => {
    try {
        const { id } = req.params;
        if (!id || id.length > 12) { // التحقق من صحة المعرف
             return res.status(404).sendFile(path.join(__dirname, 'public', '404.html'));
        }

        if (!db) {
            return res.status(503).send('الخدمة غير متاحة مؤقتاً.');
        }

        const collection = db.collection(collectionName);
        const design = await collection.findOne({ shortId: id });

        if (!design || !design.data) {
            return res.status(404).sendFile(path.join(__dirname, 'public', '404.html'));
        }

        const filePath = path.join(__dirname, 'public', 'viewer.html');
        let htmlTemplate = fs.readFileSync(filePath, 'utf8');

        const cardData = design.data;
        const cardName = cardData.inputs['input-name'] || 'بطاقة عمل رقمية';
        const cardTagline = cardData.inputs['input-tagline'] || 'تم إنشاؤها عبر محرر البطاقات الرقمية';
        const cardImage = cardData.inputs['input-logo'] || 'https://www.mcprim.com/nfc/mcprime-logo-transparent.png'; // صورة افتراضية
        const pageUrl = `${req.protocol}://${req.get('host')}/view/${id}`;

        // دالة لتنقية البيانات قبل إدخالها في HTML
        const escapeHtml = (unsafe) => {
            if (typeof unsafe !== 'string') return '';
            return unsafe
                 .replace(/&/g, "&amp;")
                 .replace(/</g, "&lt;")
                 .replace(/>/g, "&gt;")
                 .replace(/"/g, "&quot;")
                 .replace(/'/g, "&#039;");
        };

        const finalHtml = htmlTemplate
            .replace(/{{PAGE_TITLE}}/g, escapeHtml(cardName))
            .replace(/{{PAGE_DESCRIPTION}}/g, escapeHtml(cardTagline))
            .replace(/{{OG_URL}}/g, escapeHtml(pageUrl))
            .replace(/{{OG_TITLE}}/g, escapeHtml(cardName))
            .replace(/{{OG_DESCRIPTION}}/g, escapeHtml(cardTagline))
            .replace(/{{OG_IMAGE}}/g, escapeHtml(cardImage))
            // حقن البيانات الكاملة لكي يستخدمها السكريبت في المتصفح
            // يتم تنقية JSON لمنع هجمات XSS
            .replace(
                '{{{CARD_DATA_JSON}}}',
                JSON.stringify(cardData).replace(/</g, '\\u003c')
            );
        
        res.send(finalHtml);

    } catch (error) {
        console.error('Error in SSR for viewer:', error);
        next(error); // تمرير الخطأ للمعالج العام
    }
});
// --- END: تعديل SSR ---

app.get('/card/:id', async (req, res) => {
    // ... هذا المسار يبقى كما هو للمحرر ...
    try {
        const userAgent = req.headers['user-agent'] || '';
        const isBot = /facebookexternalhit|FacebookBot|Twitterbot|Pinterest|Discordbot/i.test(userAgent);

        if (isBot) {
            const { id } = req.params;
            const collection = db.collection(collectionName);
            const design = await collection.findOne({ shortId: id });

            if (design && design.data) {
                const filePath = path.join(__dirname, 'public', 'index.html');
                let htmlData = fs.readFileSync(filePath, 'utf8');

                const cardName = design.data.inputs['input-name'] || 'بطاقة عمل رقمية';
                const cardTagline = design.data.inputs['input-tagline'] || 'تم إنشاؤها عبر محرر البطاقات الرقمية';
                const cardImage = design.data.inputs['input-logo'] || 'https://www.elfoxdm.com/elfox/mcprime-logo-transparent.png';
                const pageUrl = `https://mcprim.com/nfc/card/${id}`;
                
                const personSchema = `<script type="application/ld+json">{ "@context": "https://schema.org", "@type": "Person", "name": "${cardName.replace(/"/g, '\\"')}", "jobTitle": "${cardTagline.replace(/"/g, '\\"')}", "image": "${cardImage}", "url": "${pageUrl}" }</script>`;

                htmlData = htmlData
                    .replace(/<title>.*?<\/title>/, `<title>${cardName}</title>`)
                    .replace(/<meta name="description" content=".*?"\/>/, `<meta name="description" content="${cardTagline}"/>`)
                    .replace(/<meta property="og:title" content=".*?"\/>/, `<meta property="og:title" content="${cardName}"/>`)
                    .replace(/<meta property="og:description" content=".*?"\/>/, `<meta property="og:description" content="${cardTagline}"/>`)
                    .replace(/<meta property="og:image" content=".*?"\/>/, `<meta property="og:image" content="${cardImage}"/>`)
                    .replace(/<meta property="og:url" content=".*?"\/>/, `<meta property="og:url" content="${pageUrl}"/>`)
                    .replace('</head>', `${personSchema}</head>`);
                
                return res.send(htmlData);
            }
        }

        res.sendFile(path.join(__dirname, 'public', 'index.html'));
    } catch (error) {
        console.error('Error handling card request:', error);
        res.sendFile(path.join(__dirname, 'public', 'index.html'));
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
