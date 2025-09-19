// server.js - الكود المحدث

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

// --- Middlewares الأساسية ---
app.use(cors());
app.use(express.json({ limit: '5mb' }));

// --- خدمة الملفات الثابتة (CSS, JS, images) من المجلد الرئيسي ---
app.use(express.static(path.join(__dirname)));

// --- خدمة الملفات الثابتة (المحرر والصفحات الأخرى) من مجلد public ---
app.use(express.static(path.join(__dirname, 'public')));


// --- تحديد معدل الطلبات لواجهة API ---
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

// ===============================================
// --- المسارات الديناميكية (يجب أن تأتي أولاً) ---
// ===============================================

// *** بداية: الكود الجديد المضاف لتطبيق SSR على viewer.html ***
// المسار الجديد لعرض البطاقة مع وسوم SEO (هذا هو المسار الذي يجب أن يستخدمه المحرر للمشاركة)
app.get('/view/:id', async (req, res) => {
    if (!db) return res.status(503).send('<h1>Service temporarily unavailable</h1>');
    
    try {
        const { id } = req.params;
        const design = await db.collection(collectionName).findOne({ shortId: id });

        if (!design || !design.data) {
            return res.status(404).sendFile(path.join(__dirname, 'public', '404.html'));
        }
        
        // استخدام قالب viewer.html
        const templatePath = path.join(__dirname, 'viewer.html');
        let template = fs.readFileSync(templatePath, 'utf8');

        // استخلاص البيانات
        const cardData = design.data;
        const name = cardData.inputs['input-name'] || 'بطاقة عمل رقمية';
        const tagline = cardData.inputs['input-tagline'] || 'تصميم احترافي';
        const title = `${name} | ${tagline}`;
        const description = `ألقِ نظرة على بطاقة العمل الرقمية الخاصة بـ ${name}. ${tagline}.`;
        const logoUrl = cardData.inputs['input-logo'] || 'https://www.mcprim.com/nfc/mcprime-logo-transparent.png'; // صورة المعاينة

        // استبدال المتغيرات في القالب
        template = template
            .replace(/%%TITLE%%/g, purify.sanitize(title))
            .replace(/%%DESCRIPTION%%/g, purify.sanitize(description))
            .replace(/%%OG_TITLE%%/g, purify.sanitize(title))
            .replace(/%%OG_DESCRIPTION%%/g, purify.sanitize(description))
            .replace(/%%OG_IMAGE%%/g, logoUrl)
            // حقن البيانات داخل الصفحة لتجنب طلب API آخر من المتصفح
            .replace('%%CARD_DATA%%', JSON.stringify(cardData));

        res.send(template);

    } catch (error) {
        console.error('Error serving viewer page (SSR):', error);
        res.status(500).send('<h1>Internal Server Error</h1>');
    }
});
// *** نهاية: الكود الجديد المضاف ***


// المسار الرئيسي لعرض صفحة البطاقة النهائية (الكود الحالي الخاص بك)
app.get('/card/:id', async (req, res) => {
    if (!db) return res.status(503).send('<h1>Service temporarily unavailable</h1>');
    
    try {
        const { id } = req.params;
        const design = await db.collection(collectionName).findOne({ shortId: id });

        if (!design || !design.data) {
            return res.status(404).sendFile(path.join(__dirname, 'public', '404.html'));
        }
        
        const templatePath = path.join(__dirname, 'card-template.html');
        let template = fs.readFileSync(templatePath, 'utf8');

        // استخلاص البيانات
        const cardData = design.data;
        const name = cardData.inputs['input-name'] || 'بطاقة عمل رقمية';
        const tagline = cardData.inputs['input-tagline'] || 'تم إنشاؤها عبر محرر البطاقات الرقمية';
        const logoUrl = cardData.inputs['input-logo'] || 'https://www.elfoxdm.com/elfox/mcprime-logo-transparent.png';
        const email = cardData.inputs['input-email'] || '';
        const whatsapp = cardData.inputs['input-whatsapp'] || '';
        
        const pageUrl = `https://mcprim.com/nfc/card/${id}`;
        
        const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(pageUrl)}`;

        // بناء أزرار الاتصال الديناميكية
        let contactButtonsHtml = '';
        if (cardData.dynamic.phones && cardData.dynamic.phones.length > 0 && cardData.dynamic.phones[0]) {
            contactButtonsHtml += `<a href="tel:${cardData.dynamic.phones[0]}" class="action-button contact-btn"><i class="fas fa-phone"></i><span>اتصال</span></a>`;
        }
        if (whatsapp) {
            contactButtonsHtml += `<a href="https://wa.me/${whatsapp.replace(/\+/g, '')}" class="action-button contact-btn" target="_blank"><i class="fab fa-whatsapp"></i><span>واتساب</span></a>`;
        }
        if (email) {
            contactButtonsHtml += `<a href="mailto:${email}" class="action-button contact-btn"><i class="fas fa-envelope"></i><span>بريد إلكتروني</span></a>`;
        }

        // بناء روابط التواصل الاجتماعي الديناميكية
        let socialLinksHtml = '';
        const socialLinks = [...(cardData.dynamic.social || [])];
        if (cardData.inputs['input-facebook']) socialLinks.unshift({ platform: 'facebook-f', value: cardData.inputs['input-facebook'] });
        if (cardData.inputs['input-linkedin']) socialLinks.unshift({ platform: 'linkedin-in', value: cardData.inputs['input-linkedin'] });

        socialLinks.forEach(link => {
            const icon = link.platform.includes('fa-') ? link.platform : `fa-${link.platform}`;
            socialLinksHtml += `<a href="${link.value}" target="_blank" rel="noopener noreferrer"><i class="fab ${icon}"></i></a>`;
        });
        
        // استبدال المتغيرات في القالب
        template = template.replace(/{{CARD_NAME}}/g, purify.sanitize(name));
        template = template.replace(/{{TAGLINE}}/g, purify.sanitize(tagline));
        template = template.replace(/{{LOGO_URL}}/g, logoUrl);
        template = template.replace('{{CONTACT_BUTTONS}}', contactButtonsHtml);
        template = template.replace('{{SOCIAL_LINKS}}', socialLinksHtml);
        template = template.replace('{{VCARD_URL}}', `/api/vcard/${id}`);
        template = template.replace('{{QR_CODE_URL}}', qrCodeUrl);
        
        res.send(template);

    } catch (error) {
        console.error('Error serving card page:', error);
        res.status(500).send('<h1>Internal Server Error</h1>');
    }
});

// ===================================
// --- مسارات الواجهة البرمجية (API) ---
// ===================================

// API لحفظ تصميم جديد
app.post(
    '/api/save-design',
    [
        body('inputs.input-name').trim().customSanitizer(value => purify.sanitize(value)),
        body('inputs.input-tagline').trim().customSanitizer(value => purify.sanitize(value)),
        body('inputs.input-email').optional({ checkFalsy: true }).isEmail().normalizeEmail(),
        body('dynamic.phones.*').optional({ checkFalsy: true }).isMobilePhone().withMessage('Invalid phone number'),
    ],
    async (req, res) => {
        // ... (الكود هنا يبقى كما هو بدون تغيير)
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

// API لجلب تصميم محفوظ (للمحرر)
app.get('/api/get-design/:id', async (req, res) => {
    // ... (الكود هنا يبقى كما هو بدون تغيير)
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

// مسار لإنشاء وتنزيل ملف vCard
app.get('/api/vcard/:id', async (req, res) => {
    // ... (الكود هنا يبقى كما هو بدون تغيير)
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
        vCard += `N:${lastName};${firstName};;;\n`;
        vCard += `FN:${name}\n`;
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

// =============================================
// --- المسارات الثابتة (يجب أن تأتي أخيراً) ---
// =============================================

// مسار لعرض المحرر الرئيسي
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

// التعامل مع الصفحات غير الموجودة
app.use((req, res, next) => {
    res.status(404).sendFile(path.join(__dirname, 'public', '404.html'));
});

// التعامل مع الأخطاء الداخلية
app.use((err, req, res, next) => {
    console.error('Internal Server Error:', err);
    res.status(500).sendFile(path.join(__dirname, 'public', '500.html'));
});

app.listen(port, () => {
    console.log(`Server listening on port ${port}`);
});
