# MC PRIME NFC

منصة عربية/إنجليزية لإنشاء بطاقات أعمال رقمية ونشرها ومشاركتها عبر رابط أو QR وNFC.

[الموقع](https://mcprim.com/nfc/) · [مرجع API](./docs/openapi.yaml) · [دليل الإصدار والاسترجاع](./docs/RELEASE_RUNBOOK.md)

## ما الذي يقدمه المشروع؟

- محرر بطاقات بوجهين مع الحفظ التلقائي والمعاينة والتنزيل.
- تسجيل بالبريد وGoogle OAuth مع Access/Refresh tokens آمنة.
- فصل صريح بين المسودة والنسخة المنشورة؛ نقاط العرض العامة لا تعيد المسودة.
- رفع صور موثّق، وإعادة ترميز WebP، وحد 5 MiB، وتخزين إنتاج دائم عبر Cloudinary أو خدمة رفع خارجية.
- تصدير بيانات الحساب وحذف الحساب والبيانات التابعة له.
- واجهة ثابتة على `mcprim.com/nfc` وAPI على Render، ينشرهما Workflow واحد من الـSHA نفسه.

## المتطلبات

- Node.js 22.x
- npm 9 أو أحدث
- MongoDB
- Cloudinary أو `EXTERNAL_UPLOAD_URL` في الإنتاج إذا كانت خاصية رفع الصور مطلوبة

## التشغيل المحلي

```bash
git clone https://github.com/elfox14/nfc.git
cd nfc
npm ci
cp .env.example .env
npm start
```

عدّل `.env` قبل التشغيل. الحد الأدنى المعتاد هو `MONGO_URI` و`JWT_SECRET` و`TOKEN_HASH_SECRET` و`COOKIE_SIGNING_SECRET`. إعدادات Google والبريد والتخزين اختيارية محليًا، لكنها مطلوبة في الإنتاج للميزات المرتبطة بها. ملف [`.env.example`](./.env.example) و[`render.yaml`](./render.yaml) هما المرجع الكامل للأسماء.

لا تضع القيم السرية في Git. متغيرات `sync: false` في `render.yaml` تُضبط يدويًا في Render، وأسرار النشر تُحفظ داخل GitHub Environment باسم `production`.

## أوامر الجودة

```bash
npm run lint             # ESLint
npm test -- --runInBand  # اختبارات Jest
npm run test:e2e         # سيناريوهات Playwright للمنتج
npm run audit:prod       # يفشل عند ثغرات high أو critical
npm run build:assets     # يبني كل CSS/JS من ملفات .original
npm run check:assets     # يتحقق من كل الأزواج ويمنع الانحراف
npm run package:static   # ينشئ حزمة الواجهة الثابتة
```

اختبارات E2E تحتاج MongoDB، وتشغّل خادم الاختبار وفق إعداد [`playwright.config.ts`](./playwright.config.ts). يشغّل CI التدقيق، وESLint، واختبارات Jest وPlaywright، وفحص الأصول.

## API والخصوصية

- المسودة الخاصة: `GET /api/get-design/{id}/draft` وتتطلب ملكية البطاقة.
- النسخة المنشورة العامة فقط: `GET /api/get-design/{id}`.
- بيانات الحساب: `GET /api/auth/export-data`.
- الحذف الدائم: `DELETE /api/auth/account` مع `{ "confirmation": "DELETE" }`.
- الجاهزية: `GET /healthz` ويعيد `503` إذا تعذر اتصال MongoDB.

التفاصيل والأجسام والاستجابات موثقة في [`docs/openapi.yaml`](./docs/openapi.yaml).

## الإصدار والنشر

الإصدار الحالي: `2.1.0`.

يُستخدم Workflow **Release and Rollback** لنشر الـAPI والواجهة من commit واحد، والتحقق من صحة قاعدة البيانات، ثم إنشاء Tag وGitHub Release غير قابلين للتغيير. الاسترجاع يعيد نشر الجزأين من Tag أو SHA تاريخي. اتبع [`docs/RELEASE_RUNBOOK.md`](./docs/RELEASE_RUNBOOK.md) ولا تنشر الجزأين يدويًا كلًا على حدة.

## الترخيص

[MIT](./LICENSE) © MC PRIME.
