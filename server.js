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

app.get('/api/gallery', async (req, res) => {
    if (!db) {
        return res.status(500).json({ error: 'Database not connected' });
    }
    try {
        const collection = db.collection(collectionName);
        const designs = await collection.find({})
                                      .sort({ createdAt: -1 })
                                      .limit(20)
                                      .toArray();
        res.json(designs);
    } catch (error) {
        console.error('Error fetching gallery designs:', error);
        res.status(500).json({ error: 'Failed to fetch gallery designs' });
    }
});

// --- Page Routing (SSR-First Approach) ---
app.get('/card/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const collection = db.collection(collectionName);
        const design = await collection.findOne({ shortId: id });

        if (design && design.data) {
            // **FIX: Use viewer.html as the template, not index.html**
            const filePath = path.join(__dirname, 'public', 'viewer.html');
            let htmlData = fs.readFileSync(filePath, 'utf8');

            const cardName = design.data.inputs['input-name'] || 'بطاقة عمل رقمية';
            const cardTagline = design.data.inputs['input-tagline'];
            const cardDescription = cardTagline || 'بطاقة عمل رقمية ذكية من MC PRIME. شارك بياناتك بلمسة واحدة.';
            const cardLogoUrl = (design.data.inputs['input-logo'] || 'https://www.mcprim.com/nfc/mcprime-logo-transparent.png').replace(/^http:\/\//i, 'https://');
            const optimizedOgImageUrl = 'https://www.mcprim.com/nfc/og-image.png';
            const pageUrl = `https://mcprim.com/nfc/card/${id}`;
            
            // **FIX: Generate dynamic titles**
            const pageTitle = `عرض وحفظ بطاقة ${cardName} الرقمية – MC PRIME`;
            const ogTitle = `بطاقة عمل ${cardName}`;

            const personSchema = {
                "@type": "Person",
                "@id": pageUrl,
                "name": cardName,
                "image": { "@type": "ImageObject", "url": cardLogoUrl },
                "url": pageUrl,
                "sameAs": []
            };
            if (cardTagline) personSchema.jobTitle = cardTagline;
            const socialLinks = design.data.dynamic?.social || [];
            socialLinks.forEach(link => {
                if (link.platform && link.value) {
                    const prefix = `https://www.${link.platform}.com/`;
                    const fullUrl = link.value.startsWith('http') ? link.value : prefix + link.value;
                    personSchema.sameAs.push(fullUrl);
                }
            });
            if (design.data.inputs['input-linkedin']) personSchema.sameAs.push(design.data.inputs['input-linkedin']);

            const schemaGraph = `<script type="application/ld+json">
            {
              "@context": "https://schema.org",
              "@graph": [
                ${JSON.stringify(personSchema)},
                {
                  "@type": "WebPage",
                  "url": "${pageUrl}",
                  "name": "${pageTitle.replace(/"/g, '\\"')}",
                  "about": { "@id": "${pageUrl}" },
                  "primaryImageOfPage": { "@type": "ImageObject", "url": "${cardLogoUrl}" },
                  "breadcrumb": { "@id": "${pageUrl}#breadcrumb" }
                },
                {
                  "@type": "BreadcrumbList",
                  "@id": "${pageUrl}#breadcrumb",
                  "itemListElement": [{
                    "@type": "ListItem", "position": 1, "name": "الرئيسية", "item": "https://www.mcprim.com/nfc/"
                  },{
                    "@type": "ListItem", "position": 2, "name": "${cardName.replace(/"/g, '\\"')}"
                  }]
                }
              ]
            }
            </script>`;

            htmlData = htmlData
                .replace(/<title>.*?<\/title>/, `<title>${pageTitle.replace(/"/g, '\\"')}</title>`)
                .replace(/<meta name="description" content=".*?"\/>/, `<meta name="description" content="${cardDescription.replace(/"/g, '\\"')}"/>`)
                .replace(/<meta property="og:title" content=".*?"\/>/, `<meta property="og:title" content="${ogTitle.replace(/"/g, '\\"')}"/>`)
                .replace(/<meta property="og:description" content=".*?"\/>/, `<meta property="og:description" content="${cardDescription.replace(/"/g, '\\"')}"/>`)
                .replace(/<meta property="og:image" content=".*?"\/>/, `<meta property="og:image" content="${optimizedOgImageUrl}"/>`)
                .replace(/<meta property="og:url" content=".*?"\/>/, `<meta property="og:url" content="${pageUrl}"/>`)
                .replace('</head>', `${schemaGraph}</head>`);
            
            return res.send(htmlData);
        }
        
        return res.status(404).sendFile(path.join(__dirname, 'public', '404.html'));

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
