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
const port = 3000;

// --- إعدادات قاعدة البيانات ---
const mongoUrl = process.env.MONGO_URI;
const dbName = 'nfc_db';
const collectionName = 'designs';
let db;

// --- Middlewares ---
app.use(cors());
app.use(express.json({ limit: '5mb' }));

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

// --- API Routes (No changes needed here) ---

// API لحفظ تصميم جديد
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

// --- NEW: Language-aware Page Routing ---

const langRouter = express.Router();

// --- خدمة الملفات الثابتة (CSS, JS, Images) ---
// Note: We serve them from the root path so links like /style.css work everywhere
app.use(express.static(path.join(__dirname, 'public')));


// --- NEW: Route for dynamic card viewer SEO ---
langRouter.get('/card/:id', async (req, res) => {
    try {
        const userAgent = req.headers['user-agent'] || '';
        const isBot = /facebookexternalhit|FacebookBot|Twitterbot|Pinterest|Discordbot/i.test(userAgent);
        const lang = req.params.lang || 'ar'; // Default to Arabic if lang is not in URL

        if (isBot) {
            const { id } = req.params;
            const collection = db.collection(collectionName);
            const design = await collection.findOne({ shortId: id });

            if (design && design.data) {
                // Choose the correct HTML template based on language
                const templatePath = path.join(__dirname, 'public', `viewer-${lang}.html`);
                let htmlData = fs.readFileSync(templatePath, 'utf8');

                const cardName = design.data.inputs['input-name'] || (lang === 'ar' ? 'بطاقة عمل رقمية' : 'Digital Business Card');
                const cardTagline = design.data.inputs['input-tagline'] || (lang === 'ar' ? 'تم إنشاؤها عبر محرر البطاقات الرقمية' : 'Created with the Digital Card Editor');
                const cardImage = design.data.inputs['input-logo'] || 'https://www.elfoxdm.com/elfox/mcprime-logo-transparent.png';
                const pageUrl = `https://mcprim.com/nfc/${lang}/card/${id}`;
                const alternateUrl = `https://mcprim.com/nfc/${lang === 'ar' ? 'en' : 'ar'}/card/${id}`;

                // --- إضافة Schema ديناميكي لتحسين SEO ---
                const personSchema = `<script type="application/ld+json">
                {
                  "@context": "https://schema.org",
                  "@type": "Person",
                  "name": "${cardName.replace(/"/g, '\\"')}",
                  "jobTitle": "${cardTagline.replace(/"/g, '\\"')}",
                  "image": "${cardImage}",
                  "url": "${pageUrl}"
                }
                </script>`;
                
                // Add hreflang tags
                const hreflangTags = `
                    <link rel="alternate" hreflang="ar" href="${lang === 'ar' ? pageUrl : alternateUrl}" />
                    <link rel="alternate" hreflang="en" href="${lang === 'en' ? pageUrl : alternateUrl}" />
                    <link rel="alternate" hreflang="x-default" href="${alternateUrl.replace('/ar/', '/en/')}" />
                `;

                htmlData = htmlData
                    .replace(/<title>.*?<\/title>/, `<title>${cardName}</title>`)
                    .replace(/<meta name="description" content=".*?"\/>/, `<meta name="description" content="${cardTagline}"/>`)
                    .replace(/<meta property="og:title" content=".*?"\/>/, `<meta property="og:title" content="${cardName}"/>`)
                    .replace(/<meta property="og:description" content=".*?"\/>/, `<meta property="og:description" content="${cardTagline}"/>`)
                    .replace(/<meta property="og:image" content=".*?"\/>/, `<meta property="og:image" content="${cardImage}"/>`)
                    .replace(/<meta property="og:url" content=".*?"\/>/, `<meta property="og:url" content="${pageUrl}"/>`)
                    .replace('</head>', `${hreflangTags}${personSchema}</head>`);
                
                return res.send(htmlData);
            }
        }
        
        // For regular users, send the correct language-specific viewer file
        res.sendFile(path.join(__dirname, 'public', `viewer-${lang}.html`));

    } catch (error) {
        console.error('Error handling card request:', error);
        res.sendFile(path.join(__dirname, 'public', `viewer-ar.html`)); // Fallback to Arabic version
    }
});

// --- NEW: Serve language-specific static pages ---
langRouter.get('/', (req, res) => res.sendFile(path.join(__dirname, 'public', `index-${req.params.lang}.html`)));
langRouter.get('/index', (req, res) => res.sendFile(path.join(__dirname, 'public', `index-${req.params.lang}.html`)));
langRouter.get('/about', (req, res) => res.sendFile(path.join(__dirname, 'public', `about-${req.params.lang}.html`)));
langRouter.get('/privacy', (req, res) => res.sendFile(path.join(__dirname, 'public', `privacy-${req.params.lang}.html`)));
langRouter.get('/contact', (req, res) => res.sendFile(path.join(__dirname, 'public', `contact-${req.params.lang}.html`)));
langRouter.get('/blog', (req, res) => res.sendFile(path.join(__dirname, 'public', `blog-${req.params.lang}.html`)));
langRouter.get('/gallery', (req, res) => res.sendFile(path.join(__dirname, 'public', `gallery-${req.params.lang}.html`)));

// --- NEW: Use the language router ---
app.use('/nfc/:lang(ar|en)', langRouter);


// --- NEW: Redirects from old paths to the new Arabic version ---
app.get('/nfc/', (req, res) => res.redirect(301, '/nfc/ar/'));
app.get('/nfc/index.html', (req, res) => res.redirect(301, '/nfc/ar/'));
app.get('/nfc/about.html', (req, res) => res.redirect(301, '/nfc/ar/about'));
app.get('/nfc/privacy.html', (req, res) => res.redirect(301, '/nfc/ar/privacy'));
app.get('/nfc/contact.html', (req, res) => res.redirect(301, '/nfc/ar/contact'));
app.get('/nfc/blog.html', (req, res) => res.redirect(301, '/nfc/ar/blog'));
app.get('/nfc/gallery.html', (req, res) => res.redirect(301, '/nfc/ar/gallery'));
app.get('/nfc/viewer.html', (req, res) => {
    // Keep query params for viewer
    const query = req.url.includes('?') ? req.url.slice(req.url.indexOf('?')) : '';
    res.redirect(301, `/nfc/ar/viewer${query}`);
});
// Redirect old card links to new structure
app.get('/card/:id', (req, res) => {
    res.redirect(301, `/nfc/ar/card/${req.params.id}`);
});


// --- Error Handling ---
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
