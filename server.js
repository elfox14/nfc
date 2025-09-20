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

// --- Database Configuration ---
const mongoUrl = process.env.MONGO_URI;
if (!mongoUrl) {
    console.error("FATAL ERROR: MONGO_URI is not defined in .env file.");
    process.exit(1);
}
const dbName = 'nfc_db';
const collectionName = 'designs';
let db;

// --- Middlewares ---
app.use(cors());
app.use(express.json({ limit: '5mb' }));
// Serve static files from 'public' directory
app.use(express.static(path.join(__dirname, 'public')));


// --- Rate Limiting ---
const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100,
    message: 'Too many requests from this IP, please try again after 15 minutes.'
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

// Sanitize and validate function for strings
const sanitizeString = (value) => purify.sanitize(value || '');

// POST /api/designs - Save a new design
app.post(
    '/api/designs',
    [
        // Sanitize all string inputs to prevent XSS
        body('inputs.*').customSanitizer(sanitizeString),
        body('dynamic.phones.*').customSanitizer(sanitizeString),
        body('dynamic.social.*.value').customSanitizer(sanitizeString),
        
        // Validate specific fields
        body('inputs.input-email').trim().isEmail().withMessage('Invalid email format.').normalizeEmail(),
        body('inputs.input-name').trim().notEmpty().withMessage('Name cannot be empty.'),
    ],
    async (req, res) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ success: false, errors: errors.array() });
        }

        if (!db) {
            return res.status(503).json({ success: false, error: 'Database service is temporarily unavailable.' });
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

            res.status(201).json({ success: true, id: shortId });
        } catch (error) {
            console.error('Error saving design:', error);
            res.status(500).json({ success: false, error: 'Internal server error while saving design.' });
        }
    }
);

// GET /api/designs/:id - Fetch a saved design
app.get('/api/designs/:id', async (req, res) => {
    if (!db) {
        return res.status(503).json({ success: false, error: 'Database service is temporarily unavailable.' });
    }
    try {
        const { id } = req.params;
        const collection = db.collection(collectionName);
        const design = await collection.findOne({ shortId: id });

        if (design) {
            res.json(design.data);
        } else {
            res.status(404).json({ success: false, error: 'Design not found.' });
        }
    } catch (error) {
        console.error('Error fetching design:', error);
        res.status(500).json({ success: false, error: 'Internal server error while fetching design.' });
    }
});


// --- Page Routing ---

// Route for shared cards, handles SEO for bots
app.get('/card/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const collection = db.collection(collectionName);
        const design = await collection.findOne({ shortId: id });

        if (!design || !design.data) {
             return res.status(404).sendFile(path.join(__dirname, 'public', '404.html'));
        }

        const userAgent = req.headers['user-agent'] || '';
        const isBot = /facebookexternalhit|FacebookBot|Twitterbot|Pinterest|Discordbot/i.test(userAgent);
        
        // Serve SEO-enhanced HTML to bots
        if (isBot) {
            const filePath = path.join(__dirname, 'public', 'viewer.html');
            let htmlData = fs.readFileSync(filePath, 'utf8');

            const cardName = design.data.inputs['input-name'] || 'Digital Business Card';
            const cardTagline = design.data.inputs['input-tagline'] || 'Created with the Digital Card Editor';
            const cardImage = design.data.inputs['input-logo'] || 'https://www.mcprim.com/nfc/mcprime-logo-transparent.png';
            const pageUrl = `${req.protocol}://${req.get('host')}/card/${id}`;

            htmlData = htmlData
                .replace(/<title>.*?<\/title>/, `<title>${cardName}</title>`)
                .replace(/<meta name="description" content=".*?"\/>/, `<meta name="description" content="${cardTagline}"/>`)
                .replace(/<meta property="og:title" content=".*?"\/>/, `<meta property="og:title" content="${cardName}"/>`)
                .replace(/<meta property="og:description" content=".*?"\/>/, `<meta property="og:description" content="${cardTagline}"/>`)
                .replace(/<meta property="og:image" content=".*?"\/>/, `<meta property="og:image" content="${cardImage}"/>`)
                .replace(/<meta property="og:url" content=".*?"\/>/, `<meta property="og:url" content="${pageUrl}"/>`);
            
            return res.send(htmlData);
        }

        // Serve the standard viewer for regular users
        res.sendFile(path.join(__dirname, 'public', 'viewer.html'));
    } catch (error) {
        console.error('Error handling card request:', error);
        res.status(500).sendFile(path.join(__dirname, 'public', '500.html'));
    }
});

// Serve main editor for the root URL
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Catch-all 404 for any other route
app.use((req, res, next) => {
  res.status(404).sendFile(path.join(__dirname, 'public', '404.html'));
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('Internal Server Error:', err.stack);
  res.status(500).sendFile(path.join(__dirname, 'public', '500.html'));
});


app.listen(port, () => {
    console.log(`Server listening at http://localhost:${port}`);
});
