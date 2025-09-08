// server.js

// السطر الأول: يقوم بتحميل متغيرات البيئة من ملف .env أثناء التطوير المحلي
require('dotenv').config();

const express = require('express');
const { MongoClient } = require('mongodb');
const { nanoid } = require('nanoid');
const path = require('path');
const cors = require('cors');
const fs = require('fs'); // تم إضافة مكتبة نظام الملفات لقراءة index.html

const app = express();
const port = process.env.PORT || 3000;

// --- إعدادات قاعدة البيانات ---
const mongoUrl = process.env.DATABASE_URL;
const collectionName = 'designs';
let db;

// --- Middlewares ---
app.use(cors()); 
app.use(express.json({ limit: '5mb' })); 
app.use(express.static(path.join(__dirname, 'public')));

// --- التحقق من وجود رابط الاتصال ---
if (!mongoUrl) {
  console.error('Error: DATABASE_URL environment variable is not set.');
  process.exit(1);
}

// --- الاتصال بقاعدة البيانات ---
MongoClient.connect(mongoUrl)
  .then(client => {
    console.log('Connected successfully to MongoDB server');
    db = client.db();
  })
  .catch(err => {
    console.error('Failed to connect to MongoDB', err);
    process.exit(1); 
  });

// --- API Routes (تبقى كما هي بدون تغيير) ---

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

// --- Page Routing (تم التعديل هنا) ---
// الآن هذا المسار أصبح ديناميكيًا
app.get('/card/:id', async (req, res) => {
  const indexPath = path.join(__dirname, 'public', 'index.html');

  try {
    const { id } = req.params;
    let design = null;
    if (db) {
      const collection = db.collection(collectionName);
      design = await collection.findOne({ shortId: id });
    }

    // قراءة ملف index.html كنص
    let html = fs.readFileSync(indexPath, 'utf8');

    // إذا تم العثور على التصميم، قم باستبدال وسوم السيو
    if (design && design.data && design.data.inputs) {
      const cardName = design.data.inputs['input-name'] || 'بطاقة عمل رقمية';
      const cardTagline = design.data.inputs['input-tagline'] || 'تصميم احترافي';
      
      // استبدال العنوان
      html = html.replace(
        /<title>.*<\/title>/,
        `<title>${cardName} | ${cardTagline}</title>`
      );
      // استبدال الوصف
      html = html.replace(
        /<meta name="description" content=".*">/,
        `<meta name="description" content="بطاقة العمل الرقمية لـ ${cardName}. ${cardTagline}.">`
      );
       // استبدال عنوان المشاركة الاجتماعية
       html = html.replace(
        /<meta property="og:title" content=".*">/,
        `<meta property="og:title" content="${cardName} | ${cardTagline}">`
      );
    }
    
    // إرسال النسخة المعدلة من HTML إلى المتصفح
    res.send(html);

  } catch (error) {
    console.error('Error serving dynamic HTML:', error);
    // في حالة حدوث أي خطأ، أرسل الملف الأصلي كحل بديل
    res.sendFile(indexPath);
  }
});


app.listen(port, () => {
  console.log(`Server listening on port ${port}`);
});
