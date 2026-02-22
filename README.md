# MC PRIME NFC - بطاقات الأعمال الرقمية

<div align="center">

![MC PRIME Logo](./logo.svg)

**منصة متكاملة لإنشاء ومشاركة بطاقات الأعمال الرقمية باستخدام تقنية NFC**

[![Node.js CI](https://github.com/your-username/nfc/actions/workflows/ci.yml/badge.svg)](https://github.com/your-username/nfc/actions/workflows/ci.yml)

[العرض التجريبي](https://mcprim.com/nfc) | [التوثيق](#التثبيت) | [المساهمة](./CONTRIBUTING.md)

</div>

---

## 🌟 المميزات

- ✨ **محرر مرئي** - تصميم البطاقات بدون كتابة كود
- 📱 **تصميم متجاوب** - يعمل على جميع الأجهزة
- 🔗 **مشاركة سهلة** - QR Code ورابط مباشر
- 🌐 **ثنائي اللغة** - عربي وإنجليزي
- 🔐 **آمن** - تسجيل دخول وحماية البيانات
- 📊 **تحليلات** - تتبع المشاهدات عبر GTM

---

## 🚀 البدء السريع

### المتطلبات
- Node.js 18+
- MongoDB Atlas (أو محلي)
- حساب Cloudinary (للصور)

### التثبيت

```bash
# استنساخ المشروع
git clone https://github.com/your-username/nfc.git
cd nfc

# تثبيت الاعتماديات
npm install

# إعداد المتغيرات البيئية
cp .env.example .env
# عدّل القيم في .env

# تشغيل الخادم
npm start
```

### متغيرات `.env`

يرجى الرجوع إلى ملف `.env.example` لمعرفة جميع المتغيرات المطلوبة والاختيارية لتشغيل المشروع. لا تقم أبداً برفع ملف `.env` الفعلي إلى المستودع.
في بيئة التطوير، يمكنك نسخ الملف وتعبئته بالقيم الخاصة بك:
```bash
cp .env.example .env
```

---

## 📁 هيكل المشروع

```
nfc/
├── server.js           # الخادم الرئيسي (Express)
├── auth-middleware.js  # التحقق من JWT
├── email-service.js    # خدمة البريد
├── auth.js             # مكتبة المصادقة (Frontend)
├── script-*.js         # سكربتات الواجهة
├── *.html              # صفحات HTML
├── *.css               # أنماط CSS
└── test/               # الاختبارات
```

---

## 🔌 API Endpoints

| Method | Endpoint | الوصف |
|--------|----------|-------|
| POST | `/api/auth/register` | تسجيل مستخدم جديد |
| POST | `/api/auth/login` | تسجيل الدخول |
| POST | `/api/auth/forgot-password` | طلب استعادة كلمة المرور |
| POST | `/api/auth/reset-password/:token` | تعيين كلمة مرور جديدة |
| GET | `/api/auth/verify-email/:token` | تأكيد البريد الإلكتروني |
| GET | `/api/user/designs` | جلب تصاميم المستخدم |
| POST | `/api/save-design` | حفظ تصميم جديد |
| GET | `/api/get-design/:id` | جلب تصميم |

---

## 🚢 النشر على بيئات الإنتاج (مثل Render)

**هام جدًا للأمان**: لا تقم أبدًا برفع ملف `.env` الفعلي إلى مستودعك الخاص أو العام!

1. أنشئ خدمة Web Service جديدة على دليلك المفضل (مثل Render أو Heroku).
2. اربط مستودع Git.
3. **Build Command:** `npm install`
4. **Start Command:** `node server.js`
5. **إعداد الأسرار (Secrets Manager)**:
   - اذهب إلى لوحة التحكم الخاصة باستضافتك (Environment variables / Secrets).
   - قم بإضافة جميع المتغيرات المذكورة في ملف `.env.example` يدويًا هناك بدلاً من رفع الملف.
   - من أهم المتغيرات التي يجب إضافتها: `MONGO_URI`، `JWT_SECRET`، `CLOUDINARY_CLOUD_NAME`، `CLOUDINARY_API_KEY`، `CLOUDINARY_API_SECRET` وغيرها من المفاتيح الحساسة. لن يعمل الخادم بدون قيم صحيحة لهذه المتغيرات نظرًا لأن النظام يفرض التحقق من وجودها لحماية تطبيقك من العمل بكلمات مرور افتراضية ולتفعيل الرفع المباشر والآمن للصور على Cloudinary.
   - **تقنيات المراقبة والأداء (اختياري ولكنه مفضل)**: لتفعيل خدمة التقاط الأخطاء ضع مفتاح `SENTRY_DSN`. ولتفعيل ذاكرة التخزينة المؤقتة السريعة العشوائية (Cache) ضع رابط خدمة التشغيل السريع `REDIS_URL`.

---

## 🤝 المساهمة

نرحب بمساهماتك! اطلع على [دليل المساهمة](./CONTRIBUTING.md).

---

## 📄 الترخيص

MIT License - انظر [LICENSE](./LICENSE) للتفاصيل.

---

<div align="center">
صنع بـ ❤️ بواسطة <a href="https://mcprim.com">MC PRIME</a>
</div>
