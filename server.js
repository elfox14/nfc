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

// --- إعدادات قاعدة البيانات ---
const mongoUrl = process.env.MONGO_URI;
const dbName = 'nfc_db';
const collectionName = 'designs';
let db;

// --- Middlewares ---

// CORS Configuration to allow requests from your specific domain
const allowedOrigins = [
    'https://www.mcprim.com', 
    'http://localhost:3000', 
    'http://127.0.0.1:5500'
];

const corsOptions = {
    origin: (origin, callback) => {
        // Allow requests with no origin (like mobile apps or curl requests) or from the allowed list
        if (!origin || allowedOrigins.indexOf(origin) !== -1) {
            callback(null, true);
        } else {
            callback(new Error('Not allowed by CORS'));
        }
    }
};
app.use(cors(corsOptions)); // Use configured CORS

app.use(express.json({ limit: '5mb' }));

// Ensure 'uploads' directory exists and is static
const uploadsDir = path.join(__dirname, 'public', 'uploads');
if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
}
app.use('/uploads', express.static(path.join(__dirname, 'public', 'uploads')));
app.use(express.static(path.join(__dirname, 'public')));


// --- Multer and Sharp Setup for Image Uploads ---
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });


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

// API for handling image uploads
app.post('/api/upload-image', upload.single('image'), async (req, res) => {
    if (!req.file) {
        return res.status(400).json({ error: 'No image file uploaded.' });
    }

    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const filename = `${uniqueSuffix}.webp`;
    const outputPath = path.join(uploadsDir, filename);

    try {
        await sharp(req.file.buffer)
            .resize({ width: 1280, withoutEnlargement: true }) // Resize without enlarging
            .webp({ quality: 80 }) // Convert to WebP with 80% quality
            .toFile(outputPath);
        
        const imageUrl = `/uploads/${filename}`; // URL path for the client
        res.json({ success: true, url: imageUrl });

    } catch (error) {
        console.error('Error processing image:', error);
        res.status(500).json({ error: 'Failed to process image.' });
    }
});


// API لحفظ تصميم جديد
app.post('/api/save-design', async (req, res) => {
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
});


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

// API endpoint to get gallery items
app.get('/api/gallery', async (req, res) => {
    if (!db) {
        return res.status(500).json({ error: 'Database not connected' });
    }
    try {
        const collection = db.collection(collectionName);
        // Fetch latest 12 designs, projecting only necessary fields
        const designs = await collection.find({})
            .sort({ createdAt: -1 })
            .limit(12)
            .project({ 
                shortId: 1, 
                'data.inputs.input-name': 1,
                'data.inputs.input-tagline': 1,
                'data.inputs.input-logo': 1,
                _id: 0 
            })
            .toArray();
        res.json(designs);
    } catch (error) {
        console.error('Error fetching gallery designs:', error);
        res.status(500).json({ error: 'Failed to fetch gallery designs' });
    }
});


// --- Page Routing ---
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/gallery', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'gallery.html'));
});


// Dynamic card viewer route using EJS
app.get('/card/:id', async (req, res) => {
    if (!db) {
        return res.status(503).send('Service unavailable');
    }
    try {
        const { id } = req.params;
        const collection = db.collection(collectionName);
        const design = await collection.findOne({ shortId: id });

        if (design && design.data) {
            const cardData = design.data;
            const renderData = {
                cardName: cardData.inputs['input-name'] || 'بطاقة عمل رقمية',
                cardTagline: cardData.inputs['input-tagline'] || 'تم إنشاؤها عبر محرر البطاقات الرقمية',
                cardImage: cardData.inputs['input-logo'] || 'https://www.mcprim.com/nfc/og-image.png',
                pageUrl: `https://www.mcprim.com/nfc/card/${id}`,
                cardData: cardData // Pass the full data object for the script
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

