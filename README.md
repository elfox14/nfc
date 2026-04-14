# MC PRIME NFC - بطاقات الأعمال الرقمية

<div align="center">

![MC PRIME Logo](./logo.svg)

**منصة متكاملة لإنشاء ومشاركة بطاقات الأعمال الرقمية باستخدام تقنية NFC**

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
- Node.js 20+
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

```env
MONGO_URI=mongodb+srv://...
JWT_SECRET=your_secret_key
CLOUDINARY_CLOUD_NAME=your_cloud
CLOUDINARY_API_KEY=your_key
CLOUDINARY_API_SECRET=your_secret
PUBLIC_BASE_URL=https://your-domain.com/nfc

# اختياري - لإرسال البريد
EMAIL_PROVIDER=sendgrid
EMAIL_API_KEY=your_sendgrid_key
EMAIL_FROM_ADDRESS=noreply@your-domain.com
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
| POST | `/api/auth/reset-password` | تعيين كلمة مرور جديدة (token في body) |
| POST | `/api/auth/verify-email` | تأكيد البريد الإلكتروني (token في body) |
| POST | `/api/auth/session-init` | تهيئة الجلسة (OAuth Bootstrap) |
| GET | `/api/auth/me` | جلب بيانات المستخدم الحالي |
| GET | `/api/user/designs` | جلب تصاميم المستخدم |
| POST | `/api/save-design` | حفظ تصميم جديد |
| GET | `/api/get-design/:id` | جلب تصميم |

---

## 🚢 النشر على Render

1. أنشئ خدمة Web Service جديدة
2. اربط مستودع Git
3. **Build Command:** `npm install`
4. **Start Command:** `node server.js`
5. أضف متغيرات البيئة من `.env`

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
