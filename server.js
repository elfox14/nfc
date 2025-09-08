// server.js
const fs = require('fs');
require('dotenv').config();
const express = require('express');
const { MongoClient, ObjectId } = require('mongodb');
const { nanoid } = require('nanoid');
const path = require('path');
const cors = require('cors');

const app = express();
const port = 3000;

// --- إعدادات قاعدة البيانات ---
const mongoUrl = process.env.MONGO_URI; // الرابط الافتراضي لـ MongoDB
const dbName = 'nfc_db';
const collectionName = 'designs';
let db;

// --- Middlewares ---
app.use(cors()); // للسماح بالطلبات من الواجهة الأمامية
app.use(express.json({ limit: '5mb' })); // للسماح باستقبال بيانات JSON بحجم كبير
app.use(express.static(path.join(__dirname, 'public'))); // لخدمة الملفات الثابتة (index.html, etc.)

// --- الاتصال بقاعدة البيانات ---
MongoClient.connect(mongoUrl)
  .then(client => {
    console.log('Connected successfully to MongoDB server');
    db = client.db(dbName);
  })
  .catch(err => {
    console.error('Failed to connect to MongoDB', err);
    process.exit(1); // إنهاء التطبيق إذا فشل الاتصال
  });

// --- API Routes ---

// API لحفظ تصميم جديد
app.post('/api/save-design', async (req, res) => {
  if (!db) {
    return res.status(500).json({ error: 'Database not connected' });
  }
  try {
    const designData = req.body;
    const shortId = nanoid(8); // إنشاء ID قصير وفريد (e.g., "V1StGXR8")
    
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

// --- Page Routing ---
// أي رابط يبدأ بـ /card/ سيعرض صفحة التطبيق الرئيسية
// --- الكود الجديد والمحسن ---
app.get('/card/:id', async (req, res) => {
  try {
    // 1. تحديد ما إذا كان الزائر هو روبوت أم مستخدم عادي
    const userAgent = req.headers['user-agent'] || '';
    const isBot = /facebookexternalhit|FacebookBot|Twitterbot|Pinterest|Discordbot/i.test(userAgent);

    if (isBot) {
      // 2. إذا كان الزائر روبوتًا، نجلب بيانات البطاقة من قاعدة البيانات
      const { id } = req.params;
      const collection = db.collection(collectionName);
      const design = await collection.findOne({ shortId: id });

      if (design && design.data) {
        // 3. إذا وجدنا بيانات البطاقة، نقرأ ملف index.html
        const filePath = path.join(__dirname, 'public', 'index.html');
        let htmlData = fs.readFileSync(filePath, 'utf8');

        // 4. نستخرج البيانات ونضع قيمًا افتراضية إذا كانت فارغة
        const cardName = design.data.inputs['input-name'] || 'بطاقة عمل رقمية';
        const cardTagline = design.data.inputs['input-tagline'] || 'تم إنشاؤها عبر محرر البطاقات الرقمية';
        const cardImage = design.data.inputs['input-logo'] || 'https://www.elfoxdm.com/elfox/mcprime-logo-transparent.png';
        const pageUrl = `https://www.elfoxdm.com/elfox/nfc/card/${id}`; // تأكد من أن هذا هو رابط موقعك الصحيح

        // 5. نستبدل الوسوم الوصفية في ملف HTML بالبيانات الجديدة
        htmlData = htmlData
          .replace(/<title>.*?<\/title>/, `<title>${cardName}</title>`)
          .replace(/<meta name="description" content=".*?"\/>/, `<meta name="description" content="${cardTagline}"/>`)
          .replace(/<meta property="og:title" content=".*?"\/>/, `<meta property="og:title" content="${cardName}"/>`)
          .replace(/<meta property="og:description" content=".*?"\/>/, `<meta property="og:description" content="${cardTagline}"/>`)
          .replace(/<meta property="og:image" content=".*?"\/>/, `<meta property="og:image" content="${cardImage}"/>`)
          .replace(/<meta property="og:url" content=".*?"\/>/, `<meta property="og:url" content="${pageUrl}"/>`)
          .replace(/<meta property="twitter:title" content=".*?"\/>/, `<meta property="twitter:title" content="${cardName}"/>`)
          .replace(/<meta property="twitter:description" content=".*?"\/>/, `<meta property="twitter:description" content="${cardTagline}"/>`)
          .replace(/<meta property="twitter:image" content=".*?"\/>/, `<meta property="twitter:image" content="${cardImage}"/>`);
        
        // 6. نرسل ملف HTML المعدّل إلى الروبوت
        return res.send(htmlData);
      }
    }
    
    // 7. إذا كان الزائر مستخدمًا عاديًا أو لم نجد البطاقة، نرسل الملف الأصلي
    res.sendFile(path.join(__dirname, 'public', 'index.html'));

  } catch (error) {
    console.error('Error handling card request:', error);
    // في حالة حدوث أي خطأ، نرسل الملف الأصلي لضمان عمل الموقع للمستخدم
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
  }
});
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(port, () => {
  console.log(`Server listening at http://localhost:${port}`);
});
// مثال في server.js
const rateLimit = require('express-rate-limit');

const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 دقيقة
    max: 100, // 100 طلب لكل IP
    message: 'Too many requests from this IP, please try again after 15 minutes'
});

app.use('/api/', apiLimiter); // تطبيق المحدد على كل الـ API
