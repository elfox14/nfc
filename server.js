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
const DOMPurifyFactory = require('dompurify');
const multer = require('multer');
const sharp = require('sharp');
const ejs = require('ejs');
const helmet = require('helmet');
// --- Placeholder for server-side image generation library (e.g., Puppeteer or node-html-to-image) ---
// const nodeHtmlToImage = require('node-html-to-image'); // Example

const window = (new JSDOM('')).window;
const DOMPurify = DOMPurifyFactory(window);

const app = express();
const port = process.env.PORT || 3000;

// --- إعدادات عامة ---
app.set('trust proxy', 1);
app.disable('x-powered-by');

// --- START: SECURITY HEADERS (HELMET) ---
app.use(helmet.frameguard({ action: 'deny' }));
app.use(helmet.xssFilter());
app.use(helmet.noSniff());
app.use(helmet.hsts({
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
}));

// Custom CSP to allow necessary external resources
app.use(helmet.contentSecurityPolicy({
    directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "https://cdnjs.cloudflare.com", "https://cdn.jsdelivr.net", "https://www.youtube.com"],
        styleSrc: ["'self'", "'unsafe-inline'", "https://cdnjs.cloudflare.com", "https://fonts.googleapis.com"],
        fontSrc: ["'self'", "https://fonts.gstatic.com"],
        imgSrc: ["'self'", "data:", "https:", "https://i.imgur.com", "https://www.mcprim.com", "https://media.giphy.com", "https://nfc-vjy6.onrender.com"], // Ensure your image hosting domain is listed if generating images server-side
        mediaSrc: ["'self'", "data:"],
        frameSrc: ["'self'", "https://www.youtube.com"],
        connectSrc: ["'self'", "https://cdnjs.cloudflare.com", "https://cdn.jsdelivr.net", "https://www.youtube.com", "https://www.mcprim.com", "https://media.giphy.com", "https://nfc-vjy6.onrender.com"],
        objectSrc: ["'none'"],
        upgradeInsecureRequests: [],
    },
}));
// --- END: SECURITY HEADERS (HELMET) ---

app.use(cors());
app.use(express.json({ limit: '10mb' })); // Keep limit reasonable if not sending large base64 images
app.set('view engine', 'ejs');

// قاعدة البيانات
const mongoUrl = process.env.MONGO_URI;
const dbName = process.env.MONGO_DB || 'nfc_db';
const designsCollectionName = process.env.MONGO_DESIGNS_COLL || 'designs';
const backgroundsCollectionName = process.env.MONGO_BACKGROUNDS_COLL || 'backgrounds';
let db;

MongoClient.connect(mongoUrl)
  .then(client => { db = client.db(dbName); console.log('MongoDB connected'); })
  .catch(err => { console.error('Mongo connect error', err); process.exit(1); });

const rootDir = __dirname;

// أدوات مساعدة
function absoluteBaseUrl(req) {
  const envBase = process.env.SITE_BASE_URL;
  if (envBase) return envBase.replace(/\/+$/, '');
  const proto = (req.headers['x-forwarded-proto'] || req.protocol || 'https');
  const host = req.get('host');
  return `${proto}://${host}`;
}

// قائمة بالحقول النصية التي يجب تعقيمها
const FIELDS_TO_SANITIZE = [
    'input-name', 'input-tagline',
    'input-email', 'input-website',
    'input-whatsapp', 'input-facebook', 'input-linkedin'
    // Add dynamic input values here if needed during sanitization
];

// دالة تعقيم لكائن الإدخالات (تحتاج تعديل بسيط لتعقيم القيم الديناميكية بشكل أفضل)
function sanitizeStateData(data) {
    if (!data) return {};
    const sanitizedData = JSON.parse(JSON.stringify(data)); // Deep copy

    // Sanitize top-level inputs
    if (sanitizedData.inputs) {
        FIELDS_TO_SANITIZE.forEach(k => {
            if (sanitizedData.inputs[k]) {
                sanitizedData.inputs[k] = DOMPurify.sanitize(String(sanitizedData.inputs[k]));
            }
        });
        // Sanitize other potentially risky inputs if any (e.g., URLs)
        ['input-logo', 'input-photo-url', 'input-qr-url'].forEach(k => {
             if (sanitizedData.inputs[k]) {
                 // Basic URL sanitization (might need more robust validation)
                 sanitizedData.inputs[k] = DOMPurify.sanitize(String(sanitizedData.inputs[k]), { USE_PROFILES: { html: false } });
             }
        });
    }

    // Sanitize dynamic data
    if (sanitizedData.dynamic) {
        if (sanitizedData.dynamic.phones) {
            sanitizedData.dynamic.phones = sanitizedData.dynamic.phones.map(phone => ({
                ...phone,
                value: phone && phone.value ? DOMPurify.sanitize(String(phone.value)) : ''
            }));
        }
        if (sanitizedData.dynamic.social) {
            sanitizedData.dynamic.social = sanitizedData.dynamic.social.map(link => ({
                ...link,
                value: link && link.value ? DOMPurify.sanitize(String(link.value)) : '',
                platform: link && link.platform ? DOMPurify.sanitize(String(link.platform)) : '' // Sanitize platform key too
            }));
        }
        if (sanitizedData.dynamic.staticSocial) {
            for (const key in sanitizedData.dynamic.staticSocial) {
                if (sanitizedData.dynamic.staticSocial[key] && sanitizedData.dynamic.staticSocial[key].value) {
                    sanitizedData.dynamic.staticSocial[key].value = DOMPurify.sanitize(String(sanitizedData.dynamic.staticSocial[key].value));
                }
            }
        }
    }

     // Sanitize image URLs (basic)
    if (sanitizedData.imageUrls) {
        ['front', 'back', 'qrCode', 'photo', 'capturedFront', 'capturedBack'].forEach(k => {
            if (sanitizedData.imageUrls[k]) {
                sanitizedData.imageUrls[k] = DOMPurify.sanitize(String(sanitizedData.imageUrls[k]), { USE_PROFILES: { html: false } });
            }
        });
    }


    // Important: Do NOT sanitize positions or placements unless they contain user strings
    // 'logo-size', 'logo-opacity', etc., should generally be numbers and don't need sanitization here,
    // but ensure validation happens if they come from user input directly without type conversion.

    return sanitizedData;
}


// --- صفحة عرض SEO لكل بطاقة: /nfc/view/:id (مُحسّنة) ---
app.get('/nfc/view/:id', async (req, res) => {
  try {
    if (!db) {
        res.setHeader('X-Robots-Tag', 'noindex, noarchive');
        return res.status(500).send('DB not connected');
    }
    const id = String(req.params.id);
    const doc = await db.collection(designsCollectionName).findOne({ shortId: id });

    // --- التحقق المحسن: تأكد من وجود الصور الملتقطة ---
    if (!doc || !doc.data || !doc.data.imageUrls || !doc.data.imageUrls.capturedFront || !doc.data.imageUrls.capturedBack) {
        res.setHeader('X-Robots-Tag', 'noindex, noarchive');
        // Provide more context if possible (e.g., "Images not generated yet")
        return res.status(404).send('Design not found, incomplete, or required images are missing.');
    }

    // Increment view count (no change needed here)
    db.collection(designsCollectionName).updateOne(
      { shortId: id },
      { $inc: { views: 1 } }
    ).catch(err => console.error(`Failed to increment view count for ${id}:`, err));

    res.setHeader('X-Robots-Tag', 'index, follow');

    const base = absoluteBaseUrl(req);
    const pageUrl = `${base}/nfc/view/${id}`;
    const designData = doc.data; // Use the full data object

    // Extract necessary data (use defaults)
    const inputs = designData.inputs || {};
    const dynamicData = designData.dynamic || {};
    const staticSocial = dynamicData.staticSocial || {};
    const imageUrls = designData.imageUrls || {}; // Already checked capturedFront/Back exist

    const name = DOMPurify.sanitize(inputs['input-name'] || 'بطاقة عمل رقمية');
    const tagline = DOMPurify.sanitize(inputs['input-tagline'] || ''); // Default to empty if none

    // --- توليد HTML للروابط (لا تغيير هنا، الكود الحالي جيد) ---
    let contactLinksHtml = '';
    const platforms = { /* ... (platform definitions remain the same) ... */
        whatsapp: { icon: 'fab fa-whatsapp', prefix: 'https://wa.me/' },
        email: { icon: 'fas fa-envelope', prefix: 'mailto:' },
        website: { icon: 'fas fa-globe', prefix: 'https://' },
        facebook: { icon: 'fab fa-facebook-f', prefix: 'https://facebook.com/' },
        linkedin: { icon: 'fab fa-linkedin-in', prefix: 'https://linkedin.com/in/' },
        instagram: { icon: 'fab fa-instagram', prefix: 'https://instagram.com/' },
        x: { icon: 'fab fa-xing', prefix: 'https://x.com/' },
        telegram: { icon: 'fab fa-telegram', prefix: 'https://t.me/' },
        tiktok: { icon: 'fab fa-tiktok', prefix: 'https://tiktok.com/@' },
        snapchat: { icon: 'fab fa-snapchat', prefix: 'https://snapchat.com/add/' },
        youtube: { icon: 'fab fa-youtube', prefix: 'https://youtube.com/' },
        pinterest: { icon: 'fab fa-pinterest', prefix: 'https://pinterest.com/' }
    };
    const linksHTML = [];
    // (Logic for generating linksHTML remains the same...)
    Object.entries(staticSocial).forEach(([key, linkData]) => {
         if (linkData && linkData.value && platforms[key]) {
             const platform = platforms[key];
             const value = DOMPurify.sanitize(linkData.value);
             let displayValue = value;
             let fullUrl = value;
             if (key === 'email') { fullUrl = `${platform.prefix}${value}`; }
             else if (key === 'whatsapp') { fullUrl = `${platform.prefix}${value.replace(/\D/g, '')}`; }
             else if (key === 'website') { fullUrl = !/^(https?:\/\/)/i.test(value) ? `${platform.prefix}${value}` : value; displayValue = value.replace(/^(https?:\/\/)?(www\.)?/, ''); }
             else { fullUrl = !/^(https?:\/\/)/i.test(value) ? `${platform.prefix}${value}` : value; displayValue = value.replace(/^(https?:\/\/)?(www\.)?/, ''); }
             linksHTML.push(`<a href="${fullUrl}" class="contact-link" target="_blank" rel="noopener noreferrer"><i class="${platform.icon}"></i><span>${displayValue}</span></a>`);
         }
     });
     if (dynamicData.phones) {
         dynamicData.phones.forEach(phone => {
             if (phone && phone.value) {
                 const sanitizedValue = DOMPurify.sanitize(phone.value);
                 const cleanNumber = sanitizedValue.replace(/\D/g, '');
                 linksHTML.push(`<a href="tel:${cleanNumber}" class="contact-link"><i class="fas fa-phone"></i><span>${sanitizedValue}</span></a>`);
             }
         });
     }
     if (dynamicData.social) {
         dynamicData.social.forEach(link => {
             if (link && link.value && link.platform && platforms[link.platform]) {
                 const platform = platforms[link.platform];
                 const value = DOMPurify.sanitize(link.value);
                 let displayValue = value;
                 let fullUrl = value;
                 fullUrl = !/^(https?:\/\/)/i.test(value) ? `${platform.prefix}${value}` : value;
                 displayValue = value.replace(/^(https?:\/\/)?(www\.)?/, '');
                 linksHTML.push(`<a href="${fullUrl}" class="contact-link" target="_blank" rel="noopener noreferrer"><i class="${platform.icon}"></i><span>${displayValue}</span></a>`);
             }
         });
     }

    if(linksHTML.length > 0) {
      contactLinksHtml = `<div class="links-group">${linksHTML.join('')}</div>`;
    } else {
      // الرسالة المحسنة التي أضفناها سابقًا
      contactLinksHtml = `
        <div style="text-align: center; padding: 25px 15px; opacity: 0.8;">
            <i class="fas fa-info-circle" style="font-size: 2.2rem; color: var(--accent-primary); margin-bottom: 15px; display: block;"></i>
            <p style="margin: 0; font-size: 0.95rem; color: var(--secondary-text-color); line-height: 1.6;">
                لم يقم صاحب البطاقة بإضافة أي معلومات اتصال إضافية.
            </p>
        </div>
      `;
    }

    // --- تحسينات Meta Tags و Schema ---
    const ogImage = imageUrls.capturedFront; // استخدم الصورة الملتقطة دائمًا لـ OG
    const keywords = [/* ... (keywords generation remains the same) ... */
        'NFC', 'بطاقة عمل ذكية', 'كارت شخصي', name, ...tagline.split(/\s+/).filter(Boolean)
    ].filter(Boolean).join(', ');

    // --- إثراء Schema.org ---
    const schema = {
        "@context": "https://schema.org",
        "@type": "Person",
        "name": name,
        "jobTitle": tagline || undefined, // Add tagline if present
        "url": pageUrl,
        "image": ogImage,
        "email": staticSocial.email?.value ? `mailto:${staticSocial.email.value}` : undefined,
        "telephone": dynamicData.phones?.[0]?.value || staticSocial.whatsapp?.value || undefined, // Primary phone or WhatsApp
        "sameAs": [] // Array to hold social links
    };
    // Add website if available
     if (staticSocial.website?.value) {
         let webUrl = staticSocial.website.value;
         if (!/^(https?:\/\/)/i.test(webUrl)) { webUrl = 'https://' + webUrl; }
         schema.url = webUrl; // Can overwrite the pageUrl if a specific website exists
     }
    // Add social profiles to sameAs
    const addSameAs = (key, linkData) => {
        if (linkData && linkData.value && platforms[key] && !['email', 'whatsapp', 'website'].includes(key)) {
            let fullUrl = linkData.value;
            fullUrl = !/^(https?:\/\/)/i.test(fullUrl) ? (platforms[key].prefix || 'https://') + fullUrl : fullUrl;
            if (schema.sameAs.length < 5) { // Limit number of sameAs links if needed
                 schema.sameAs.push(fullUrl);
            }
        }
    };
    Object.entries(staticSocial).forEach(([key, linkData]) => addSameAs(key, linkData));
    if (dynamicData.social) {
        dynamicData.social.forEach(link => addSameAs(link.platform, link));
    }
    if (schema.sameAs.length === 0) delete schema.sameAs; // Remove empty array


    // --- تمرير البيانات إلى EJS ---
    res.render(path.join(rootDir, 'viewer.ejs'), {
      pageUrl,
      name, // Already sanitized
      tagline, // Already sanitized
      ogImage, // Already sanitized (URL)
      keywords, // Generated, generally safe
      design: designData, // Pass the original data for potential JS use
      canonical: pageUrl,
      contactLinksHtml: contactLinksHtml, // Pre-rendered HTML
      schemaJson: JSON.stringify(schema), // Pass enriched schema
      // --- تمرير نصوص alt الديناميكية ---
      altFront: `الوجه الأمامي لبطاقة ${name} - ${tagline || 'بطاقة عمل رقمية'}`,
      altBack: `الوجه الخلفي لبطاقة ${name}`
    });

  } catch (e) {
    console.error('Error in /nfc/view/:id route:', e);
    res.setHeader('X-Robots-Tag', 'noindex, noarchive');
    res.status(500).send('View failed due to an internal server error.');
  }
});


// هيدر كاش للملفات الثابتة (No change)
app.use((req, res, next) => { /* ... */
    if (req.path.endsWith('.html') || req.path.endsWith('/') || req.path.startsWith('/nfc/view/')) {
        res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
        res.setHeader('Pragma', 'no-cache');
        res.setHeader('Expires', '0');
    } else {
        res.setHeader('Cache-Control', 'public, max-age=604800, immutable');
    }
    next();
});

// إزالة .html من الروابط القديمة (No change)
app.use((req, res, next) => { /* ... */
    if (req.path.endsWith('.html')) {
        const newPath = req.path.slice(0, -5);
        return res.redirect(301, newPath);
    }
    next();
});

// إعادة توجيه الجذر إلى /nfc/ (No change)
app.get('/', (req, res) => { /* ... */
  res.redirect(301, '/nfc/');
});

// خدمة كل المشروع كملفات ثابتة (No change)
app.use('/nfc', express.static(rootDir, { extensions: ['html'] }));

// مجلد uploads (No change)
const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });
app.use('/uploads', express.static(uploadDir, { maxAge: '30d', immutable: true }));

// عتاد الرفع/المعالجة (No change)
const storage = multer.memoryStorage();
const upload = multer({ /* ... (config remains the same) ... */
    storage,
    limits: { fileSize: 10 * 1024 * 1024 },
    fileFilter: (req, file, cb) => {
        if (file.mimetype && file.mimetype.startsWith('image/')) {
            const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml'];
            if (allowedTypes.includes(file.mimetype)) {
                cb(null, true);
            } else {
                cb(new Error('نوع الصورة غير مدعوم.'), false);
            }
        } else {
            cb(new Error('الرجاء رفع ملف صورة.'), false);
        }
    }
});


// ريت-لميت للـ API (No change)
const apiLimiter = rateLimit({ /* ... */
    windowMs: 15 * 60 * 1000,
    max: 200,
    standardHeaders: true,
    legacyHeaders: false,
    message: 'Too many requests from this IP, please try again after 15 minutes'
});
app.use('/api/', apiLimiter);

// Middleware لمعالجة أخطاء Multer بشكل أفضل (No change)
function handleMulterErrors(err, req, res, next) { /* ... */
    if (err instanceof multer.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
            return res.status(400).json({ error: `حجم الملف كبير جدًا. الحد الأقصى ${err.field ? err.field : '10'} ميجابايت.` });
        }
        return res.status(400).json({ error: `خطأ في رفع الملف: ${err.message}` });
    } else if (err) {
        return res.status(400).json({ error: err.message || 'خطأ غير معروف أثناء الرفع.' });
    }
    next();
}


function assertAdmin(req, res) { /* ... (No change) ... */
    const expected = process.env.ADMIN_TOKEN || '';
    const provided = req.headers['x-admin-token'] || '';
    if (!expected || expected !== provided) {
        res.status(401).json({ error: 'Unauthorized' });
        return false;
    }
    return true;
}

// --- API: رفع صورة (No change here, still needed for editor uploads) ---
app.post('/api/upload-image', upload.single('image'), handleMulterErrors, async (req, res) => { /* ... (code remains the same) ... */
    try {
        if (!req.file) {
            if (!res.headersSent) {
               return res.status(400).json({ error: 'لم يتم تقديم أي ملف صورة.' });
            }
            return;
        }
        const filename = nanoid(10) + '.webp';
        const out = path.join(uploadDir, filename);
        await sharp(req.file.buffer)
          .resize({ width: 2560, height: 2560, fit: 'inside', withoutEnlargement: true })
          .webp({ quality: 85 })
          .toFile(out);
        const base = absoluteBaseUrl(req);
        return res.json({ success: true, url: `${base}/uploads/${filename}` });
    } catch (e) {
        console.error('Image upload processing error:', e);
        if (!res.headersSent) {
          return res.status(500).json({ error: 'فشل معالجة الصورة بعد الرفع.' });
        }
    }
});


// --- API: حفظ تصميم (مُعدل لدعم توليد الصور من الخادم نظريًا) ---
app.post('/api/save-design', async (req, res) => {
  try {
    if (!db) return res.status(500).json({ error: 'DB not connected' });

    let data = req.body || {}; // The state object from the editor
    const triggerImageGeneration = req.query.generateImages === 'true'; // Check if image generation is requested (e.g., from Share button)

    // --- 1. تعقيم البيانات الواردة ---
    const sanitizedData = sanitizeStateData(data);

    // --- 2. (المكان المخصص لتوليد الصور) ---
    let capturedFrontUrl = sanitizedData.imageUrls?.capturedFront; // Use existing if available
    let capturedBackUrl = sanitizedData.imageUrls?.capturedBack;

    if (triggerImageGeneration || !capturedFrontUrl || !capturedBackUrl) {
        console.log("Image generation triggered or missing images...");
        // !!! هنا تضع الكود الخاص بتوليد الصور باستخدام Puppeteer أو مكتبة أخرى !!!
        // مثال نظري جدًا:
        try {
            // const frontHtml = generateHtmlForCardFace(sanitizedData, 'front'); // دالة لتوليد HTML
            // capturedFrontUrl = await generateImageFromHtml(frontHtml, `front_${shortId}.png`); // دالة لتوليد الصورة ورفعها

            // const backHtml = generateHtmlForCardFace(sanitizedData, 'back');
            // capturedBackUrl = await generateImageFromHtml(backHtml, `back_${shortId}.png`);

             // --- Placeholder URLs ---
             // Replace these with actual URLs after generation and upload
             capturedFrontUrl = capturedFrontUrl || "https://via.placeholder.com/510x330/2a3d54/ffffff?text=Front+Preview+(Generated)";
             capturedBackUrl = capturedBackUrl || "https://via.placeholder.com/510x330/223246/ffffff?text=Back+Preview+(Generated)";
             console.log("Placeholder images used. Implement actual server-side generation.");


            // Update sanitizedData with the new URLs
             if (!sanitizedData.imageUrls) sanitizedData.imageUrls = {};
             sanitizedData.imageUrls.capturedFront = capturedFrontUrl;
             sanitizedData.imageUrls.capturedBack = capturedBackUrl;

        } catch (genError) {
             console.error("Server-side image generation failed:", genError);
             // Decide how to handle failure: save without images? return error?
             // For now, let's proceed without generated images if they failed
             // but maybe log this design ID for later processing.
        }
    }

    // --- 3. حفظ البيانات في MongoDB ---
    const shortId = nanoid(8);
    await db.collection(designsCollectionName).insertOne({
        shortId,
        data: sanitizedData, // Save the sanitized data including image URLs
        createdAt: new Date(),
        views: 0
    });

    res.json({ success: true, id: shortId });

  } catch (e) {
    console.error('Save design error:', e);
     if (!res.headersSent) {
       res.status(500).json({ error: 'Save failed due to internal server error.' });
     }
  }
});

// --- API: جلب تصميم (مُعدل للتحقق من وجود الصور) ---
app.get('/api/get-design/:id', async (req, res) => {
  try {
    if (!db) return res.status(500).json({ error: 'DB not connected' });
    const id = String(req.params.id);
    const doc = await db.collection(designsCollectionName).findOne({ shortId: id });

    // --- التحقق الأساسي ---
    if (!doc || !doc.data) {
        return res.status(404).json({ error: 'Design not found or data missing' });
    }

    // --- التحقق من وجود الصور (اختياري، صفحة العرض تتحقق أيضًا) ---
    // if (!doc.data.imageUrls?.capturedFront || !doc.data.imageUrls?.capturedBack) {
    //     console.warn(`Design ${id} is missing captured images.`);
    //     // You might return a specific status or flag if needed by the editor
    // }

    // لا تعقيم هنا، التعقيم يتم عند الحفظ والعرض
    res.json(doc.data);
  } catch (e) {
    console.error('Get design error:', e);
    if (!res.headersSent) {
      res.status(500).json({ error: 'Fetch failed' });
    }
  }
});

// --- API: المعرض (أحدث التصاميم) - (No change needed) ---
app.get('/api/gallery', async (req, res) => { /* ... */
    try {
        if (!db) return res.status(500).json({ error: 'DB not connected' });
        const docs = await db.collection(designsCollectionName)
            .find({})
            .sort({ createdAt: -1 })
            .limit(20)
            .project({ shortId: 1, 'data.inputs.input-name': 1, 'data.imageUrls.capturedFront': 1, createdAt: 1 }) // Use capturedFront for thumbnail
            .toArray();
        // Map to expected format if needed, e.g., rename capturedFront to thumbnail
        const galleryItems = docs.map(d => ({
            shortId: d.shortId,
            name: d.data?.inputs?.['input-name'] || 'Untitled',
            thumbnail: d.data?.imageUrls?.capturedFront || 'https://via.placeholder.com/150x99?text=No+Preview', // Fallback image
            createdAt: d.createdAt
        }));
        res.json(galleryItems);
    } catch (e) {
        console.error('Fetch gallery error:', e);
        if (!res.headersSent) {
            res.status(500).json({ error: 'Fetch failed' });
        }
    }
});


// --- API: خلفيات (إدارة) - (No change) ---
app.post('/api/upload-background', upload.single('image'), handleMulterErrors, async (req, res) => { /* ... */ });

// --- API: جلب الخلفيات - (No change) ---
app.get('/api/gallery/backgrounds', async (req, res) => { /* ... */ });

// --- API: حذف خلفية - (No change) ---
app.delete('/api/backgrounds/:shortId', async (req, res) => { /* ... */ });


// robots.txt (No change)
app.get('/robots.txt', (req, res) => { /* ... */ });

// sitemap.xml (No change)
app.get('/sitemap.xml', async (req, res) => { /* ... */ });

// healthz (No change)
app.get('/healthz', (req, res) => { /* ... */ });

// --- معالج الأخطاء العام (No change) ---
app.use((err, req, res, next) => { /* ... */ });


// الاستماع (No change)
app.listen(port, () => {
  console.log(`Server running on port: ${port}`);
});

// --- دوال مساعدة نظرية لتوليد الصور (تحتاج للتنفيذ الفعلي) ---
/*
async function generateImageFromHtml(htmlContent, filename) {
    // 1. استخدم مكتبة مثل Puppeteer أو node-html-to-image
    // 2. قم بتوليد الصورة (PNG or WebP)
    // const imageBuffer = await nodeHtmlToImage({ html: htmlContent, ... });
    // 3. (اختياري لكن موصى به) ارفع الصورة إلى خدمة تخزين (مثل AWS S3, Cloudinary, أو مجلد uploads المحلي)
    // const uploadPath = path.join(uploadDir, filename);
    // await fs.promises.writeFile(uploadPath, imageBuffer);
    // 4. قم بإرجاع الرابط العام للصورة المرفوعة
    // const baseUrl = absoluteBaseUrl(req); // Need req context or use env var
    // return `${baseUrl}/uploads/${filename}`;
    throw new Error("generateImageFromHtml is not implemented"); // Placeholder
}

function generateHtmlForCardFace(data, face) {
    // 1. استخرج الأنماط والبيانات اللازمة من `data`
    // 2. قم ببناء كود HTML و CSS دقيق يطابق شكل البطاقة في المحرر
    //    - استخدم inline styles أو <style> tag
    //    - تأكد من تضمين الخطوط المستخدمة (e.g., via @import or base64)
    // 3. قم بإرجاع سلسلة HTML الكاملة للوجه المطلوب ('front' or 'back')
    throw new Error("generateHtmlForCardFace is not implemented"); // Placeholder
}
*/
