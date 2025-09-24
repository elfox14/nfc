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

// --- خدمة الملفات الثابتة (CSS, JS, Images) ---
// MODIFICATION: Serve static files from the project root (/nfc) itself
app.use('/nfc', express.static(__dirname));

// --- API Routes ---
// Apply rate limiter to API routes
app.post('/nfc/api/save-design', apiLimiter, [
    // Validation rules...
], async (req, res) => {
    // ... Save design logic (no changes)
});

app.get('/nfc/api/get-design/:id', async (req, res) => {
    // ... Get design logic (no changes)
});

// --- Language-aware Page Routing ---
const langRouter = express.Router();

langRouter.get('/', (req, res) => {
    // MODIFICATION: Removed 'public' from the path
    res.sendFile(path.join(__dirname, `index-${req.params.lang}.html`));
});

// Add other static pages similarly
langRouter.get('/blog', (req, res) => {
    res.sendFile(path.join(__dirname, `blog-${req.params.lang}.html`));
});
langRouter.get('/gallery', (req, res) => {
    res.sendFile(path.join(__dirname, `gallery-${req.params.lang}.html`));
});
// ... add about, contact, privacy if you create them

// Route for dynamic card viewer
langRouter.get('/card/:id', async (req, res) => {
    try {
        const userAgent = req.headers['user-agent'] || '';
        const isBot = /facebookexternalhit|FacebookBot|Twitterbot|Pinterest|Discordbot/i.test(userAgent);
        const lang = req.params.lang || 'ar';

        if (isBot) {
            // ... SEO logic for bots (no changes needed here) ...
            // MODIFICATION: Removed 'public' from the path
            const templatePath = path.join(__dirname, `viewer-${lang}.html`);
            // ... rest of the bot logic
        }
        
        // MODIFICATION: Removed 'public' from the path
        res.sendFile(path.join(__dirname, `viewer-${lang}.html`));

    } catch (error) {
        console.error('Error handling card request:', error);
        // MODIFICATION: Removed 'public' from the path
        res.sendFile(path.join(__dirname, `viewer-ar.html`));
    }
});

// Use the language router under the /nfc path
app.use('/nfc/:lang(ar|en)', langRouter);


// --- Redirects ---
app.get('/nfc/', (req, res) => res.redirect(301, '/nfc/ar/'));
// ... other redirects remain the same


// --- Error Handling ---
app.use((req, res, next) => {
  // MODIFICATION: Removed 'public' from the path
  res.status(404).sendFile(path.join(__dirname, '404.html'));
});

app.use((err, req, res, next) => {
  console.error('Internal Server Error:', err);
  // MODIFICATION: Removed 'public' from the path
  res.status(500).sendFile(path.join(__dirname, '500.html'));
});

app.listen(port, () => {
    console.log(`Server listening at http://localhost:${port}`);
});
