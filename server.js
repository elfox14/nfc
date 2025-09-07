// server.js
const express = require('express');
const { MongoClient, ObjectId } = require('mongodb');
const { nanoid } = require('nanoid');
const path = require('path');
const cors = require('cors');

const app = express();
const port = 3000;

// --- إعدادات قاعدة البيانات ---
mongodb+srv://nfc_db_user:mahMAH123#@@cluster0.tscffw5.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0; // الرابط الافتراضي لـ MongoDB
const dbName = 'digital_cards_db';
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
app.get('/card/:id', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(port, () => {
  console.log(`Server listening at http://localhost:${port}`);
});