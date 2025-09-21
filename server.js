// server.js
require('dotenv').config();
const express = require('express');
const { MongoClient, ObjectId } = require('mongodb'); // ObjectId مطلوب للتحديث
const path = require('path');
const cors = require('cors');
const fs = require('fs');
const rateLimit = require('express-rate-limit');
const { nanoid } = require('nanoid');
const { body, validationResult, param } = require('express-validator');
const { JSDOM } = require('jsdom');
const DOMPurify = require('dompurify');

const window = new JSDOM('').window;
const purify = DOMPurify(window);

const app = express();
const port = process.env.PORT || 3000;

// --- Database Config ---
const mongoUrl = process.env.MONGO_URI;
const dbName = 'nfc_db';
const collectionName = 'designs';
let db;

// --- Middlewares ---
app.use(cors());
app.use(express.json({ limit: '5mb' }));
app.use(express.static(path.join(__dirname, 'public')));

// --- Rate Limiting ---
const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
    standardHeaders: true,
    legacyHeaders: false,
    message: 'Too many requests from this IP, please try again after 15 minutes'
});
app.use('/api/', apiLimiter);

// --- Connect to Database ---
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

// Sanitize function for nested objects
const sanitizeObject = (obj) => {
    for (const key in obj) {
        if (typeof obj[key] === 'string') {
            obj[key] = purify.sanitize(obj[key]);
        } else if (typeof obj[key] === 'object' && obj[key] !== null) {
            sanitizeObject(obj[key]);
        }
    }
    return obj;
};

app.post(
    '/api/save-design',
    [
        // Basic validation
        body('inputs.input-name').trim().notEmpty().withMessage('Name is required.'),
        body('inputs.input-email').optional({ checkFalsy: true }).isEmail().normalizeEmail(),
        // Add more validation as needed
    ],
    async (req, res) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ success: false, errors: errors.array() });
        }

        if (!db) {
            return res.status(500).json({ success: false, error: 'Database not connected' });
        }
        try {
            const designData = req.body;
            // Sanitize all string inputs recursively
            const sanitizedData = sanitizeObject(designData);
            const shortId = nanoid(8);

            const collection = db.collection(collectionName);
            await collection.insertOne({
                shortId: shortId,
                data: sanitizedData,
                createdAt: new Date()
            });

            res.json({ success: true, id: shortId });
        } catch (error) {
            console.error('Error saving design:', error);
            res.status(500).json({ success: false, error: 'Failed to save design' });
        }
    }
);

app.get(
    '/api/get-design/:id',
    [
        param('id').isLength({ min: 8, max: 8 }).trim().escape()
    ],
    async (req, res) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ success: false, error: 'Invalid ID format' });
        }

        if (!db) {
            return res.status(500).json({ success: false, error: 'Database not connected' });
        }
        try {
            const { id } = req.params;
            const collection = db.collection(collectionName);
            const design = await collection.findOne({ shortId: id });

            if (design) {
                res.json(design.data);
            } else {
                res.status(404).json({ success: false, error: 'Design not found' });
            }
        } catch (error) {
            console.error('Error fetching design:', error);
            res.status(500).json({ success: false, error: 'Failed to fetch design' });
        }
    }
);

// --- Page Routing for Viewer with Server-Side Tag Injection for Bots ---
app.get('/card/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const userAgent = req.headers['user-agent'] || '';
        // More comprehensive bot detection
        const isBot = /bot|crawl|slurp|spider|mediapartners|facebookexternalhit|twitterbot|pinterest|discordbot/i.test(userAgent);

        const filePath = path.join(__dirname, 'public', 'viewer.html'); // Serve the viewer file
        
        if (isBot) {
            if (!db) {
                return res.status(500).sendFile(filePath); // Serve default if DB is down
            }
            const collection = db.collection(collectionName);
            const design = await collection.findOne({ shortId: id });

            if (design && design.data) {
                let htmlData = fs.readFileSync(filePath, 'utf8');
                const dom = new JSDOM(htmlData);
                const { document } = dom.window;

                // Extract data with fallbacks
                const cardName = design.data.inputs['input-name'] || 'بطاقة عمل رقمية';
                const cardTagline = design.data.inputs['input-tagline'] || 'تم إنشاؤها عبر محرر البطاقات الرقمية';
                
                // IDEAL: Use a pre-generated thumbnail. FALLBACK: Use logo. FINAL FALLBACK: Use generic site logo.
                const cardImage = design.data.thumbnailUrl || design.data.inputs['input-logo'] || 'https://www.mcprim.com/nfc/og-image.png';
                
                const pageUrl = `${req.protocol}://${req.get('host')}/card/${id}`;

                // Update meta tags safely using JSDOM
                document.querySelector('title').textContent = `${cardName} | ${cardTagline}`;
                document.querySelector('meta[name="description"]').setAttribute('content', cardTagline);
                document.querySelector('link[rel="canonical"]').setAttribute('href', pageUrl);
                
                // Update Open Graph tags
                document.querySelector('meta[property="og:title"]').setAttribute('content', cardName);
                document.querySelector('meta[property="og:description"]').setAttribute('content', cardTagline);
                document.querySelector('meta[property="og:image"]').setAttribute('content', cardImage);
                document.querySelector('meta[property="og:url"]').setAttribute('content', pageUrl);

                // Inject dynamic Schema.org data
                const personSchema = `
                <script type="application/ld+json">
                {
                  "@context": "https://schema.org",
                  "@type": "Person",
                  "name": "${cardName.replace(/"/g, '\\"')}",
                  "jobTitle": "${cardTagline.replace(/"/g, '\\"')}",
                  "image": "${cardImage}",
                  "url": "${pageUrl}"
                }
                </script>`;
                document.head.insertAdjacentHTML('beforeend', personSchema);
                
                return res.send(dom.serialize());
            }
        }
        
        // For regular users, just send the static viewer file. The `viewer.js` will fetch the data.
        res.sendFile(filePath);

    } catch (error) {
        console.error('Error handling card request:', error);
        res.status(500).sendFile(path.join(__dirname, 'public', '500.html'));
    }
});


// Serve static pages
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});
app.get('/about', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'about.html'));
});
// Add other static pages like contact, privacy, landing pages...

// --- Error Handling ---
app.use((req, res, next) => {
    res.status(404).sendFile(path.join(__dirname, 'public', '404.html'));
});

app.use((err, req, res, next) => {
    console.error('Internal Server Error:', err.stack);
    res.status(500).sendFile(path.join(__dirname, 'public', '500.html'));
});

app.listen(port, () => {
    console.log(`Server listening at http://localhost:${port}`);
});
