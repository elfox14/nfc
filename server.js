// server.js
require('dotenv').config();
const express = require('express');
const { MongoClient } = require('mongodb');
const path = require('path');
const cors = require('cors');
const fs = require('fs');
const ejs = require('ejs');
const rateLimit = require('express-rate-limit');
const { nanoid } = require('nanoid');
const { body, validationResult } = require('express-validator');
const { JSDOM } = require('jsdom');
const DOMPurify = require('dompurify');
const multer = require('multer');
const sharp = require('sharp');

const window = new JSDOM('').window;
const purify = DOMPurify(window);

const app = express();
const port = process.env.PORT || 3000;

// --- EJS Setup ---
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'public'));

// --- Database Settings ---
const mongoUrl = process.env.MONGO_URI;
const dbName = 'nfc_db';
const collectionName = 'designs';
let db;

// --- Middlewares ---

// CORS Configuration
const allowedOrigins = [
    'https://www.mcprim.com',
    'http://localhost:3000',
    'http://127.0.0.1:5500' // For local development
];
const corsOptions = {
    origin: (origin, callback) => {
        if (!origin || allowedOrigins.indexOf(origin) !== -1) {
            callback(null, true);
        } else {
            callback(new Error('Not allowed by CORS'));
        }
    }
};
app.use(cors(corsOptions));

app.use(express.json({ limit: '5mb' }));

// --- Multer and Sharp Setup for Image Processing ---
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

// --- Rate Limiter ---
const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100,
    message: 'Too many requests from this IP, please try again after 15 minutes'
});
app.use('/api/', apiLimiter);

// --- Database Connection ---
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

// Ensure 'uploads' directory exists and is served statically
const uploadsDir = path.join(__dirname, 'public', 'uploads');
if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
}
// Note: The static middleware for /nfc will serve this directory.

app.post('/api/upload-image', upload.single('image'), async (req, res) => {
    if (!req.file) {
        return res.status(400).json({ error: 'No image file uploaded.' });
    }
    const filename = `${Date.now()}-${nanoid(6)}.webp`;
    const outputPath = path.join(uploadsDir, filename);
    try {
        await sharp(req.file.buffer)
            .resize({ width: 1280, withoutEnlargement: true })
            .webp({ quality: 80 })
            .toFile(outputPath);
        // Important: Return the URL with the /nfc prefix
        res.json({ success: true, url: `/nfc/uploads/${filename}` });
    } catch (error) {
        console.error('Error processing image:', error);
        res.status(500).json({ error: 'Failed to process image.' });
    }
});

app.post('/api/save-design', async (req, res) => {
    if (!db) return res.status(500).json({ error: 'Database not connected' });
    try {
        const designData = req.body;
        const shortId = nanoid(8);
        const collection = db.collection(collectionName);
        await collection.insertOne({ shortId, data: designData, createdAt: new Date() });
        res.json({ success: true, id: shortId });
    } catch (error) {
        console.error('Error saving design:', error);
        res.status(500).json({ error: 'Failed to save design' });
    }
});

app.get('/api/get-design/:id', async (req, res) => {
    if (!db) return res.status(500).json({ error: 'Database not connected' });
    try {
        const { id } = req.params;
        const collection = db.collection(collectionName);
        const design = await collection.findOne({ shortId: id });
        if (design) res.json(design.data);
        else res.status(404).json({ error: 'Design not found' });
    } catch (error) {
        console.error('Error fetching design:', error);
        res.status(500).json({ error: 'Failed to fetch design' });
    }
});

app.get('/api/gallery', async (req, res) => {
    if (!db) return res.status(500).json({ error: 'Database not connected' });
    try {
        const collection = db.collection(collectionName);
        const designs = await collection.find({})
            .sort({ createdAt: -1 })
            .limit(12)
            .project({ shortId: 1, 'data.inputs.input-name': 1, 'data.inputs.input-tagline': 1, 'data.inputs.input-logo': 1, _id: 0 })
            .toArray();
        res.json(designs);
    } catch (error) {
        console.error('Error fetching gallery designs:', error);
        res.status(500).json({ error: 'Failed to fetch gallery designs' });
    }
});


// --- Frontend Router Setup (/nfc) ---
const frontendRouter = express.Router();

// Serve static files like CSS, JS, and uploaded images from the /nfc path
frontendRouter.use(express.static(path.join(__dirname, 'public')));

// Route for the main editor page
frontendRouter.get('/', (req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));

// Route for the gallery page
frontendRouter.get('/gallery', (req, res) => res.sendFile(path.join(__dirname, 'public', 'gallery.html')));

// Route for viewing a specific card (using EJS for SSR)
frontendRouter.get('/card/:id', async (req, res) => {
    if (!db) return res.status(503).send('Service unavailable');
    try {
        const { id } = req.params;
        const collection = db.collection(collectionName);
        const design = await collection.findOne({ shortId: id });
        if (design && design.data) {
            const cardData = design.data;
            const renderData = {
                cardName: cardData.inputs['input-name'] || 'بطاقة عمل رقمية',
                cardTagline: cardData.inputs['input-tagline'] || 'تم إنشاؤها عبر محرر البطاقات الرقمية',
                cardImage: cardData.inputs['input-logo'] || `https://www.mcprim.com/nfc/og-image.png`,
                pageUrl: `https://www.mcprim.com/nfc/card/${id}`,
                cardData: cardData // Pass the full data object for client-side JS
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

// Mount all frontend routes under the /nfc prefix
app.use('/nfc', frontendRouter);

// --- Root Redirect ---
// Redirect from the base URL to the main application path
app.get('/', (req, res) => {
    res.redirect('/nfc/');
});

// --- Error Handling ---
app.use((req, res, next) => res.status(404).sendFile(path.join(__dirname, 'public', '404.html')));
app.use((err, req, res, next) => {
    console.error('Internal Server Error:', err);
    res.status(500).sendFile(path.join(__dirname, 'public', '500.html'));
});

app.listen(port, () => {
    console.log(`Server listening at http://localhost:${port}`);
});

