// server.js - إصدار مُحسّن وأكثر دقة في التوجيه

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

// Middlewares الأساسية
app.use(cors());
app.use(express.json({ limit: '5mb' }));

// إعدادات قاعدة البيانات
const mongoUrl = process.env.MONGO_URI;
const dbName = 'nfc_db';
const collectionName = 'designs';
let db;

// الاتصال بقاعدة البيانات
MongoClient.connect(mongoUrl)
    .then(client => {
        console.log('Connected to MongoDB');
        db = client.db(dbName);
    })
    .catch(err => {
        console.error('Failed to connect to MongoDB', err);
        process.exit(1);
    });

// =================================================================
// القسم الأول: تعريف كل المسارات الديناميكية ومسارات API
// (يجب أن يكون هذا القسم قبل خدمة الملفات الثابتة)
// =================================================================

// محدد السرعة لمسارات API
const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
    message: 'Too many requests, please try again later.'
});
app.use('/api/', apiLimiter);

// --- مسارات API ---
app.post('/api/save-design', [ /* validation rules */ ], async (req, res) => {
    // ... (الكود الخاص بحفظ التصميم)
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
    if (!db) return res.status(500).json({ error: 'Database not connected' });
    try {
        const designData = req.body;
        const shortId = nanoid(8);
        await db.collection(collectionName).insertOne({ shortId, data: designData, createdAt: new Date() });
        res.json({ success: true, id: shortId });
    } catch (error) {
        console.error('Error saving design:', error);
        res.status(500).json({ error: 'Failed to save design' });
    }
});

app.get('/api/get-design/:id', async (req, res) => {
    // ... (الكود الخاص بجلب التصميم)
    if (!db) return res.status(500).json({ error: 'Database not connected' });
    try {
        const { id } = req.params;
        const design = await db.collection(collectionName).findOne({ shortId: id });
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

app.get('/api/vcard/:id', async (req, res) => {
    // ... (الكود الخاص بإنشاء vCard)
    if (!db) return res.status(500).send('Database not connected');
    try {
        const { id } = req.params;
        const design = await db.collection(collectionName).findOne({ shortId: id });
        if (!design) return res.status(404).send('Card not found');

        const data = design.data;
        const name = data.inputs['input-name'] || '';
        const nameParts = name.split(' ');
        const lastName = nameParts.pop() || '';
        const firstName = nameParts.join(' ') || '';

        let vCard = `BEGIN:VCARD\nVERSION:3.0\n`;
        vCard += `N:${lastName};${firstName};;;\nFN:${name}\n`;
        if (data.inputs['input-tagline']) vCard += `TITLE:${data.inputs['input-tagline']}\n`;
        if (data.inputs['input-email']) vCard += `EMAIL;TYPE=PREF,INTERNET:${data.inputs['input-email']}\n`;
        if (data.inputs['input-website']) vCard += `URL:${data.inputs['input-website']}\n`;
        if (data.dynamic.phones) {
            data.dynamic.phones.forEach(phone => {
                if(phone) vCard += `TEL;TYPE=CELL:${phone}\n`;
            });
        }
        vCard += `END:VCARD`;

        res.set('Content-Type', 'text/vcard; name="contact.vcf"');
        res.set('Content-Disposition', 'inline; filename="contact.vcf"');
        res.send(vCard);
    } catch(error) {
        console.error("vCard generation error:", error);
        res.status(500).send("Error generating vCard");
    }
});

// --- مسارات الصفحات الديناميكية (SSR) ---
app.get('/view/:id', async (req, res) => {
    if (!db) return res.status(503).send('<h1>Service temporarily unavailable</h1>');
    try {
        const { id } = req.params;
        const design = await db.collection(collectionName).findOne({ shortId: id });
        if (!design || !design.data) {
            return res.status(404).sendFile(path.join(__dirname, 'public', '404.html'));
        }
        const templatePath = path.join(__dirname, 'viewer.html');
        let template = fs.readFileSync(templatePath, 'utf8');
        const cardData = design.data;
        const name = cardData.inputs['input-name'] || 'بطاقة عمل رقمية';
        const tagline = cardData.inputs['input-tagline'] || 'تصميم احترافي';
        const title = `${name} | ${tagline}`;
        const description = `ألقِ نظرة على بطاقة العمل الرقمية الخاصة بـ ${name}. ${tagline}.`;
        const logoUrl = cardData.inputs['input-logo'] || 'https://www.mcprim.com/nfc/mcprime-logo-transparent.png';
        template = template
            .replace(/%%TITLE%%/g, purify.sanitize(title))
            .replace(/%%DESCRIPTION%%/g, purify.sanitize(description))
            .replace(/%%OG_TITLE%%/g, purify.sanitize(title))
            .replace(/%%OG_DESCRIPTION%%/g, purify.sanitize(description))
            .replace(/%%OG_IMAGE%%/g, logoUrl)
            .replace('%%CARD_DATA%%', JSON.stringify(cardData));
        res.send(template);
    } catch (error) {
        console.error('Error serving viewer page (SSR):', error);
        res.status(500).sendFile(path.join(__dirname, 'public', '500.html'));
    }
});

// =================================================================
// القسم الثاني: خدمة الملفات الثابتة
// (يأتي بعد المسارات الديناميكية حتى لا يتعارض معها)
// =================================================================

// خدمة الملفات من المجلد الرئيسي (لـ viewer.html وملحقاته)
app.use(express.static(path.join(__dirname)));
// خدمة الملفات من مجلد public (للمحرر وملحقاته)
app.use(express.static(path.join(__dirname, 'public')));


// =================================================================
// القسم الثالث: المسارات الاحتياطية للصفحات الثابتة و SPA
// (تأتي في النهاية)
// =================================================================

// مسار المحرر الرئيسي
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// الصفحات الأخرى
app.get('/about', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'about.html'));
});
app.get('/privacy', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'privacy.html'));
});
app.get('/contact', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'contact.html'));
});

// التعامل مع الصفحات غير الموجودة (404)
app.use((req, res, next) => {
    res.status(404).sendFile(path.join(__dirname, 'public', '404.html'));
});

// التعامل مع الأخطاء الداخلية (500)
app.use((err, req, res, next) => {
    console.error('Internal Server Error:', err.stack);
    res.status(500).sendFile(path.join(__dirname, 'public', '500.html'));
});

app.listen(port, () => {
    console.log(`Server listening on port ${port}`);
});
