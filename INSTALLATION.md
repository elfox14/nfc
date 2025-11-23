# 🚀 دليل التثبيت والتحديث

## خطوات التثبيت (للمستخدمين الجدد)

### 1. تثبيت Dependencies الجديدة
```bash
npm install
```

هذا سيقوم بتثبيت جميع المكتبات المطلوبة بما فيها:
- `bcrypt` - لتشفير كلمات المرور
- `jsonwebtoken` - لنظام JWT authentication

### 2. تحديث ملف .env
أضف المتغيرات الجديدة إلى ملف `.env`:

```env
# JWT Configuration (NEW)
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
JWT_EXPIRE=7d
```

**⚠️ مهم جداً**: قم بتغيير `JWT_SECRET` إلى قيمة عشوائية قوية في الإنتاج!

يمكنك توليد قيمة عشوائية قوية باستخدام:
```bash
# في Node.js
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"

# أو استخدم أداة online: https://randomkeygen.com/
```

### 3. تشغيل التطبيق
```bash
npm start
```

---

## خطوات التحديث (للمستخدمين الحاليين)

### 1. سحب آخر التحديثات
```bash
git pull origin main
```

### 2. تثبيت Dependencies الجديدة
```bash
npm install bcrypt jsonwebtoken
```

### 3. تحديث ملف .env
أضف المتغيرات الجديدة (انظر أعلاه)

### 4. إعادة تشغيل الخادم
```bash
# إيقاف الخادم الحالي (Ctrl+C)
# ثم إعادة التشغيل
npm start
```

---

## اختبار نظام المصادقة

### 1. تسجيل مستخدم جديد
```bash
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "username": "testuser",
    "email": "test@example.com",
    "password": "Test1234"
  }'
```

**الرد المتوقع:**
```json
{
  "success": true,
  "message": "تم إنشاء الحساب بنجاح",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "...",
    "username": "testuser",
    "email": "test@example.com",
    "role": "user"
  }
}
```

### 2. تسجيل الدخول
```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "Test1234"
  }'
```

### 3. جلب بيانات المستخدم
```bash
curl http://localhost:3000/api/auth/me \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

---

## Migration للبيانات الموجودة

البيانات القديمة (البطاقات) ستستمر في العمل بدون أي تغيير. ولكن إذا كنت تريد ربط البطاقات القديمة بمستخدمين:

### Script لإضافة userId للبطاقات القديمة (اختياري)
```javascript
// scripts/migrate-old-designs.js
const { MongoClient } = require('mongodb');

async function migrateDesigns() {
  const client = await MongoClient.connect(process.env.MONGO_URI);
  const db = client.db(process.env.MONGO_DB || 'nfc_db');
  
  // إنشاء مستخدم "anonymous" للبطاقات القديمة
  const anonymousUser = {
    username: 'anonymous',
    email: 'anonymous@system.local',
    password: 'N/A',
    role: 'system',
    createdAt: new Date(),
    isActive: true
  };
  
  const userResult = await db.collection('users').insertOne(anonymousUser);
  const anonymousId = userResult.insertedId.toString();
  
  // تحديث جميع التصاميم بدون userId
  await db.collection('designs').updateMany(
    { userId: { $exists: false } },
    { $set: { userId: anonymousId } }
  );
  
  console.log('Migration complete!');
  await client.close();
}

migrateDesigns().catch(console.error);
```

---

## استكشاف الأخطاء

### خطأ: "JWT_SECRET is not defined"
**الحل**: تأكد من إضافة `JWT_SECRET` في ملف `.env`

### خطأ: "bcrypt not found"
**الحل**: 
```bash
npm install bcrypt
```

### خطأ: "Cannot connect to MongoDB"
**الحل**: تأكد من تشغيل MongoDB وأن `MONGO_URI` صحيح في `.env`

---

## الخطوات القادمة

بعد إكمال هذه الخطوات، سيكون لديك:
- ✅ نظام مصادقة كامل
- ✅ JWT tokens للجلسات
- ✅ Password hashing آمن

**ما هو التالي؟**
1. تكامل نظام المصادقة مع الـ Frontend (editor.html)
2. إضافة Database indexes للأداء
3. Redis caching
4. Unit tests

---

## الدعم

إذا واجهت أي مشاكل:
- افتح [Issue على GitHub](https://github.com/elfox14/nfc/issues)
- راجع التوثيق في [docs/API.md](docs/API.md)
