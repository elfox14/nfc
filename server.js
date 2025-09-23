// server.js
require('dotenv').config();
const express = require('express');
const { MongoClient } = require('mongodb');
const path = require('path');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const { nanoid } = require('nanoid');
const { body, validationResult } = require('express-validator');
const ejs = require('ejs');
const sharp = require('sharp');
const multer = require('multer');
const fs = require('fs');

const app = express();
const port = process.env.PORT || 3000;

// --- إعدادات قاعدة البيانات ---
const mongoUrl = process.env.MONGO_URI;
const dbName = 'nfc_db';
const collectionName = 'designs';
let db;

// --- إعدادات CORS ---
const allowedOrigins = ['https://www.mcprim.com', 'https://mcprim.com'];
const corsOptions = {
  origin: function (origin, callback) {
    if (!origin || allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  }
};
app.use(cors(corsOptions));


// --- Middlewares ---
app.use(express.json({ limit: '5mb' }));

// --- إعداد EJS ---
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'public'));


// --- تحديد معدل الطلبات ---
const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 200,
    message: 'Too many requests from this IP, please try again after 15 minutes'
});
app.use('/api/', apiLimiter);

// --- إعداد Multer لمعالجة الصور ---
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });
const uploadsDir = path.join(__dirname, 'public', 'uploads');
if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
}


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
const apiRouter = express.Router();

apiRouter.post('/save-design', async (req, res) => {
    if (!db) return res.status(500).json({ error: 'Database not connected' });
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

apiRouter.get('/get-design/:id', async (req, res) => {
    if (!db) return res.status(500).json({ error: 'Database not connected' });
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

apiRouter.get('/gallery', async (req, res) => {
    if (!db) return res.status(500).json({ error: 'Database not connected' });
    try {
        const collection = db.collection(collectionName);
        // تم حذف .project() لإعادة كامل بيانات التصميم اللازمة للعرض
        const designs = await collection.find({})
            .sort({ createdAt: -1 })
            .limit(12)
            .toArray();
        res.json(designs);
    } catch (error) {
        console.error('Error fetching gallery designs:', error);
        res.status(500).json({ error: 'Failed to fetch gallery designs' });
    }
});

apiRouter.post('/upload-image', upload.single('image'), async (req, res) => {
    if (!req.file) {
        return res.status(400).json({ error: 'No image file provided.' });
    }
    try {
        const fileName = `${Date.now()}-${nanoid(6)}.webp`;
        const filePath = path.join(uploadsDir, fileName);

        await sharp(req.file.buffer)
            .resize({ width: 1280, withoutEnlargement: true })
            .webp({ quality: 80 })
            .toFile(filePath);
            
        const fileUrl = `/nfc/uploads/${fileName}`;
        res.json({ success: true, url: fileUrl });

    } catch (error) {
        console.error('Error processing image:', error);
        res.status(500).json({ error: 'Failed to process image.' });
    }
});


// --- Frontend Page Routing ---
const frontendRouter = express.Router();

// Static pages
frontendRouter.get('/', (req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));
frontendRouter.get('/gallery', (req, res) => res.sendFile(path.join(__dirname, 'public', 'gallery.html')));


// Dynamic card rendering for bots and direct access
frontendRouter.get('/:id', async (req, res, next) => {
    const { id } = req.params;

    if (id.includes('.')) {
        return next();
    }
    
    if (!db) return res.status(500).send('Database not connected');

    try {
        const collection = db.collection(collectionName);
        const design = await collection.findOne({ shortId: id });

        if (design && design.data) {
            const cardData = design.data;
            const cardName = cardData.inputs['input-name'] || 'بطاقة عمل رقمية';
            const cardTagline = cardData.inputs['input-tagline'] || 'تم إنشاؤها عبر محرر البطاقات الرقمية';
            const cardImage = cardData.imageUrls.front || cardData.inputs['input-logo'] || 'https://www.mcprim.com/nfc/mcprime-logo-transparent.png';
            const pageUrl = `https://www.mcprim.com/nfc/${id}`;
            
            return res.render('viewer', {
                cardName,
                cardTagline,
                cardImage,
                pageUrl,
                cardData
            });
        } else {
            return next();
        }
    } catch (error) {
        console.error('Error handling card request:', error);
        return res.status(500).send('Error retrieving card data');
    }
});


// --- Main App Configuration ---
app.get('/', (req, res) => {
    res.redirect('/nfc/');
});

app.use('/nfc', express.static(path.join(__dirname, 'public')));
app.use('/nfc/api', apiRouter);
app.use('/nfc', frontendRouter);


// 404 and Error Handling
app.use((req, res, next) => {
  res.status(404).send("Sorry can't find that!");
});

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).send('Something broke!');
});

app.listen(port, () => {
    console.log(`Server listening at http://localhost:${port}`);
});

