# 💳 NFC Digital Business Card - MC PRIME

![Version](https://img.shields.io/badge/version-1.0.0-blue.svg)
![License](https://img.shields.io/badge/license-MIT-green.svg)
![Node](https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen.svg)

> منصة متكاملة لإنشاء ومشاركة بطاقات العمل الرقمية الذكية (NFC) مع دعم كامل للغة العربية

## 📋 جدول المحتويات

- [نظرة عامة](#-نظرة-عامة)
- [الميزات](#-الميزات)
- [البنية التقنية](#-البنية-التقنية)
- [المتطلبات](#-المتطلبات)
- [التثبيت](#-التثبيت)
- [الإعدادات](#-الإعدادات)
- [الاستخدام](#-الاستخدام)
- [API Documentation](#-api-documentation)
- [Docker](#-docker)
- [النشر](#-النشر)
- [المساهمة](#-المساهمة)
- [الترخيص](#-الترخيص)

---

## 🌟 نظرة عامة

**NFC Digital Business Card** هو تطبيق ويب متقدم يمكّن المستخدمين من إنشاء بطاقات عمل رقمية احترافية قابلة للمشاركة عبر:
- 📱 تقنية NFC
- 🔲 رموز QR Code
- 🔗 روابط مباشرة

### لماذا هذا المشروع؟

- ✅ **صديق للبيئة**: توفير في الطباعة الورقية
- ✅ **تحديث فوري**: تحديث البيانات دون إعادة طباعة
- ✅ **احترافي**: تصاميم جاهزة وقابلة للتخصيص بالكامل
- ✅ **مجاني**: استخدام مجاني بدون قيود

---

## ✨ الميزات

### للمستخدمين
- 🎨 **محرر مرئي متقدم**: تحكم كامل في الألوان، الخطوط، والتخطيطات
- 📸 **رفع الصور**: دعم الشعارات والصور الشخصية
- 🌈 **تصاميم جاهزة**: مكتبة من القوالب الاحترافية
- 📊 **معاينة فورية**: رؤية التصميم مباشرة أثناء التعديل
- 💾 **معرض عام**: حفظ ومشاركة التصاميم
- 📤 **تصدير متعدد**: PNG, PDF, VCF, QR Code
- 📱 **Responsive**: يعمل على جميع الأجهزة

### تقنياً
- 🔒 **أمان عالي**: Helmet, DOMPurify, Rate Limiting, CSRF Protection
- ⚡ **أداء محسّن**: Image compression, Caching headers, Lazy loading
- 🔍 **SEO متقدم**: Dynamic sitemap, Schema.org, Meta tags
- 🌐 **RTL Support**: دعم كامل للغة العربية
- 📈 **Analytics**: تتبع المشاهدات والإحصائيات

---

## 🏗️ البنية التقنية

### Backend
- **Runtime**: Node.js (>=18.0.0)
- **Framework**: Express.js
- **Database**: MongoDB
- **Image Processing**: Sharp + Multer
- **Templating**: EJS
- **Security**: Helmet, DOMPurify, express-validator

### Frontend
- **HTML5/CSS3/JavaScript** (Vanilla)
- **Icons**: Font Awesome 6
- **Fonts**: Google Fonts (Tajawal, Cairo, Poppins)
- **RTL Support**: Native CSS `dir="rtl"`

### Dependencies الرئيسية
```json
{
  "express": "^4.21.2",
  "mongodb": "^6.20.0",
  "sharp": "^0.34.5",
  "dompurify": "^3.3.0",
  "helmet": "^8.1.0",
  "ejs": "^3.1.10",
  "multer": "^2.0.2",
  "nanoid": "^3.3.11"
}
```

---

## 📦 المتطلبات

قبل البدء، تأكد من توفر:

- **Node.js**: >= 18.0.0 ([تحميل](https://nodejs.org/))
- **MongoDB**: >= 6.0 ([تحميل](https://www.mongodb.com/try/download/community))
- **npm** أو **yarn**: لإدارة الحزم
- **Git**: للنسخ والتحكم بالإصدارات

### اختياري
- **Redis**: لتحسين الأداء (قادم قريباً)
- **Docker**: للتشغيل في حاوية

---

## 🚀 التثبيت

### 1. نسخ المشروع
```bash
git clone https://github.com/elfox14/nfc.git
cd nfc
```

### 2. تثبيت Dependencies
```bash
npm install
```

### 3. إعداد المتغيرات البيئية
```bash
cp .env.example .env
```
ثم عدّل ملف `.env` بالقيم المناسبة (انظر [الإعدادات](#-الإعدادات))

### 4. تشغيل MongoDB
تأكد من تشغيل MongoDB محلياً أو استخدم MongoDB Atlas:
```bash
# محلياً
mongod

# أو استخدم خدمة سحابية مثل MongoDB Atlas
```

### 5. بدء التطبيق
```bash
# Development mode (مع auto-restart)
npm run dev

# Production mode
npm start
```

التطبيق سيعمل على: `http://localhost:3000`

---

## ⚙️ الإعدادات

### Environment Variables

أنشئ ملف `.env` في الجذر مع المتغيرات التالية:

```env
# Server Configuration
PORT=3000
NODE_ENV=development

# Database
MONGO_URI=mongodb://localhost:27017
MONGO_DB=nfc_db
MONGO_DESIGNS_COLL=designs
MONGO_BACKGROUNDS_COLL=backgrounds

# Site Configuration
SITE_BASE_URL=https://www.mcprim.com

# Admin (for background management)
ADMIN_TOKEN=your-secure-admin-token-here

# Optional: Cloudinary (for cloud image hosting)
# CLOUDINARY_CLOUD_NAME=
# CLOUDINARY_API_KEY=
# CLOUDINARY_API_SECRET=
```

### تفاصيل المتغيرات

| Variable | الوصف | مطلوب | افتراضي |
|----------|-------|-------|---------|
| `PORT` | منفذ الخادم | لا | `3000` |
| `NODE_ENV` | بيئة التشغيل | لا | `development` |
| `MONGO_URI` | رابط MongoDB | **نعم** | - |
| `MONGO_DB` | اسم قاعدة البيانات | لا | `nfc_db` |
| `SITE_BASE_URL` | الرابط الأساسي للموقع | **نعم** | - |
| `ADMIN_TOKEN` | مفتاح الـ Admin | نعم (للخلفيات) | - |

---

## 💻 الاستخدام

### للمستخدمين النهائيين

1. **إنشاء بطاقة جديدة**:
   - افتح `/nfc/editor.html`
   - صمم بطاقتك باستخدام المحرر
   - احفظ التصميم

2. **مشاركة البطاقة**:
   - انقر "مشاركة الكارت"
   - احصل على رابط فريد
   - شارك عبر NFC/QR/Link

3. **عرض البطاقة**:
   - افتح الرابط `/nfc/viewer.html?id=CARD_ID`
   - شاهد البطاقة بتصميمها الكامل

### Scripts المتاحة

```bash
# تشغيل في وضع التطوير (مع nodemon)
npm run dev

# تشغيل في وضع الإنتاج
npm start

# تشغيل الاختبارات (قريباً)
npm test

# Linting (قريباً)
npm run lint
```

---

## 📡 API Documentation

### Base URL
```
http://localhost:3000/api
```

### Endpoints

#### 1. حفظ تصميم
```http
POST /api/save-design
Content-Type: application/json

Body: {
  "inputs": { ... },
  "imageUrls": { ... },
  "dynamic": { ... }
}

Response: {
  "success": true,
  "id": "abc12345"
}
```

#### 2. جلب تصميم
```http
GET /api/get-design/:id

Response: {
  "inputs": { ... },
  "imageUrls": { ... },
  "dynamic": { ... }
}
```

#### 3. رفع صورة
```http
POST /api/upload-image
Content-Type: multipart/form-data

Body: {
  "image": <file>
}

Response: {
  "success": true,
  "url": "https://example.com/uploads/xyz.webp"
}
```

#### 4. المعرض
```http
GET /api/gallery?page=1&sortBy=createdAt&search=keyword

Response: {
  "success": true,
  "designs": [...],
  "pagination": {
    "page": 1,
    "limit": 12,
    "totalDocs": 100,
    "totalPages": 9
  }
}
```

للمزيد من التفاصيل، راجع [docs/API.md](docs/API.md)

---

## 🐳 Docker

### تشغيل باستخدام Docker Compose

```bash
# البناء والتشغيل
docker-compose up -d

# إيقاف
docker-compose down

# إعادة البناء
docker-compose up -d --build
```

### Dockerfile
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
EXPOSE 3000
CMD ["npm", "start"]
```

---

## 🌐 النشر

### على Render.com
1. اربط repository على GitHub
2. أضف المتغيرات البيئية
3. Deploy!

### على Heroku
```bash
heroku create your-app-name
git push heroku main
heroku config:set MONGO_URI=your-mongo-url
```

### على VPS
```bash
# تثبيت PM2
npm install -g pm2

# تشغيل التطبيق
pm2 start server.js --name nfc-app

# حفظ القائمة
pm2 save

# تشغيل تلقائي عند الإقلاع
pm2 startup
```

---

## 🤝 المساهمة

نرحب بمساهماتك! اتبع الخطوات التالية:

1. Fork المشروع
2. أنشئ branch للميزة الجديدة (`git checkout -b feature/amazing-feature`)
3. Commit التغييرات (`git commit -m 'Add some amazing feature'`)
4. Push للـ branch (`git push origin feature/amazing-feature`)
5. افتح Pull Request

### Guidelines
- اتبع نمط الكود الموجود
- أضف تعليقات للكود المعقد
- اختبر التغييرات قبل الإرسال
- حدّث التوثيق إذا لزم الأمر

---

## 📝 الترخيص

هذا المشروع مرخص تحت [MIT License](LICENSE)

---

## 👨‍💻 المطورون

- **الفريق**: MC PRIME
- **Repository**: [github.com/elfox14/nfc](https://github.com/elfox14/nfc)
- **الموقع**: [www.mcprim.com](https://www.mcprim.com)

---

## 🙏 شكر وتقدير

شكراً لاستخدامك **NFC Digital Business Card**! إذا أعجبك المشروع، لا تنسَ إعطاءه ⭐ على GitHub!

---

## 📞 الدعم

إذا واجهت أي مشكلة أو لديك اقتراح:
- 🐛 افتح [Issue](https://github.com/elfox14/nfc/issues)
- 💬 راسلنا عبر [صفحة الاتصال](https://www.mcprim.com/nfc/contact)

---

**صُنع بـ ❤️ في مصر**
