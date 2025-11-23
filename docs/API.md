# 📡 API Documentation - NFC Digital Business Card

## Base URL
```
http://localhost:3000/api
```

في الإنتاج:
```
https://www.mcprim.com/api
```

---

## Table of Contents
- [Authentication](#authentication) (قريباً)
- [Designs](#designs)
- [Images](#images)
- [Backgrounds](#backgrounds)
- [Gallery](#gallery)
- [Error Handling](#error-handling)
- [Rate Limiting](#rate-limiting)

---

## Authentication
> 🚧 **قريباً**: سيتم إضافة نظام JWT Authentication

### Features القادمة
- User registration
- User login
- JWT token management
- Protected routes

---

## Designs

### حفظ تصميم جديد
إنشاء بطاقة عمل جديدة وحفظها في قاعدة البيانات.

```http
POST /api/save-design
Content-Type: application/json
```

**Request Body:**
```json
{
  "inputs": {
    "input-name": "محمد أحمد",
    "input-tagline": "مطور ويب",
    "input-email": "mohamed@example.com",
    "input-website": "www.example.com",
    "input-whatsapp": "+201234567890",
    "input-facebook": "https://facebook.com/user",
    "input-linkedin": "https://linkedin.com/in/user"
  },
  "imageUrls": {
    "logo": "https://example.com/logo.png",
    "photo": "https://example.com/photo.jpg",
    "front": "data:image/png;base64,...",
    "back": "data:image/png;base64,...",
    "capturedFront": "data:image/png;base64,...",
    "qr": "https://example.com/qr.png"
  },
  "dynamic": {
    "phones": [
      { "value": "+201234567890", "label": "موبايل" }
    ],
    "social": [
      { "platform": "instagram", "value": "username" }
    ],
    "staticSocial": {
      "email": { "value": "test@example.com", "fontSize": 12, "color": "#fff" },
      "whatsapp": { "value": "+201234567890", "fontSize": 12, "color": "#fff" }
    }
  },
  "styles": {
    "layout": "classic",
    "theme": "default",
    "colors": { ... },
    "fonts": { ... }
  }
}
```

**Response (Success):**
```json
{
  "success": true,
  "id": "abc12345"
}
```

**Response (Error):**
```json
{
  "error": "Save failed"
}
```

**Status Codes:**
- `200 OK`: تم الحفظ بنجاح
- `500 Internal Server Error`: خطأ في الخادم

---

### جلب تصميم
استرجاع بيانات بطاقة محفوظة.

```http
GET /api/get-design/:id
```

**Parameters:**
- `id` (path): معرّف التصميم الفريد

**Example:**
```bash
GET /api/get-design/abc12345
```

**Response (Success):**
```json
{
  "inputs": { ... },
  "imageUrls": { ... },
  "dynamic": { ... },
  "styles": { ... }
}
```

**Response (Error):**
```json
{
  "error": "Design not found or data missing"
}
```

**Status Codes:**
- `200 OK`: تم الجلب بنجاح
- `404 Not Found`: التصميم غير موجود
- `500 Internal Server Error`: خطأ في الخادم

---

## Images

### رفع صورة
رفع صورة (شعار، صورة شخصية، إلخ) مع معالجة وضغط تلقائي.

```http
POST /api/upload-image
Content-Type: multipart/form-data
```

**Request:**
```javascript
const formData = new FormData();
formData.append('image', file); // File object

fetch('/api/upload-image', {
  method: 'POST',
  body: formData
});
```

**Response (Success):**
```json
{
  "success": true,
  "url": "https://www.mcprim.com/uploads/xyz123.webp"
}
```

**Response (Error):**
```json
{
  "error": "لم يتم تقديم أي ملف صورة."
}
```

**Constraints:**
- الحد الأقصى للحجم: **10MB**
- الأنواع المدعومة: `image/jpeg`, `image/png`, `image/gif`, `image/webp`, `image/svg+xml`
- المعالجة:
  - تحويل إلى WebP
  - ضغط بجودة 85%
  - Resize (الحد الأقصى: 2560x2560)

**Status Codes:**
- `200 OK`: تم الرفع بنجاح
- `400 Bad Request`: نوع ملف خاطئ أو حجم كبير
- `500 Internal Server Error`: خطأ في المعالجة

---

## Backgrounds

### رفع خلفية (Admin فقط)
رفع صورة خلفية إلى المكتبة.

```http
POST /api/upload-background
Content-Type: multipart/form-data
Headers: {
  "x-admin-token": "your-admin-token"
}
```

**Request:**
```javascript
const formData = new FormData();
formData.append('image', file);
formData.append('name', 'خلفية رائعة');
formData.append('category', 'تدرجات');

fetch('/api/upload-background', {
  method: 'POST',
  headers: {
    'x-admin-token': 'your-token'
  },
  body: formData
});
```

**Response (Success):**
```json
{
  "success": true,
  "background": {
    "shortId": "bg123456",
    "url": "https://www.mcprim.com/uploads/bg_xyz.webp",
    "name": "خلفية رائعة",
    "category": "تدرجات",
    "createdAt": "2025-11-23T00:00:00.000Z"
  }
}
```

**Status Codes:**
- `200 OK`: تم الرفع بنجاح
- `401 Unauthorized`: token غير صحيح
- `400 Bad Request`: بيانات خاطئة

---

### جلب الخلفيات
استرجاع قائمة الخلفيات المتاحة.

```http
GET /api/gallery/backgrounds?category=تدرجات&page=1&limit=50
```

**Query Parameters:**
- `category` (optional): تصنيف الخلفية (`all` للكل)
- `page` (optional): رقم الصفحة (default: `1`)
- `limit` (optional): عدد العناصر (default: `50`, max: `100`)

**Response:**
```json
{
  "success": true,
  "items": [
    {
      "shortId": "bg123",
      "url": "...",
      "name": "...",
      "category": "...",
      "createdAt": "..."
    }
  ],
  "page": 1,
  "limit": 50,
  "total": 150,
  "totalPages": 3
}
```

---

### حذف خلفية (Admin فقط)
حذف خلفية من المكتبة.

```http
DELETE /api/backgrounds/:shortId
Headers: {
  "x-admin-token": "your-admin-token"
}
```

**Response:**
```json
{
  "success": true
}
```

**Status Codes:**
- `200 OK`: تم الحذف بنجاح
- `401 Unauthorized`: token غير صحيح
- `404 Not Found`: الخلفية غير موجودة

---

## Gallery

### جلب المعرض
استرجاع البطاقات المحفوظة مع pagination, sorting, والبحث.

```http
GET /api/gallery?page=1&sortBy=createdAt&search=keyword
```

**Query Parameters:**
- `page` (optional): رقم الصفحة (default: `1`)
- `sortBy` (optional): طريقة الترتيب
  - `createdAt`: الأحدث أولاً (default)
  - `views`: الأكثر مشاهدة
- `search` (optional): كلمة بحث (في الاسم أو المسمى الوظيفي)

**Example:**
```bash
GET /api/gallery?page=2&sortBy=views&search=مهندس
```

**Response:**
```json
{
  "success": true,
  "designs": [
    {
      "_id": "...",
      "shortId": "abc123",
      "data": {
        "inputs": {
          "input-name": "أحمد محمد",
          "input-tagline": "مهندس برمجيات"
        },
        "imageUrls": {
          "capturedFront": "https://...",
          "front": "https://..."
        }
      },
      "createdAt": "2025-11-23T00:00:00.000Z",
      "views": 42
    }
  ],
  "pagination": {
    "page": 2,
    "limit": 12,
    "totalDocs": 100,
    "totalPages": 9
  }
}
```

**Notes:**
- يتم إرجاع 12 بطاقة في كل صفحة
- فقط البطاقات التي لها صورة مصغرة (`capturedFront`)

---

## Error Handling

### Error Response Format
جميع الأخطاء تُرجع بهذا التنسيق:

```json
{
  "error": "رسالة الخطأ بالعربية"
}
```

### Common Error Codes

| Code | الوصف | السبب المحتمل |
|------|-------|---------------|
| 400 | Bad Request | بيانات خاطئة أو ناقصة |
| 401 | Unauthorized | Admin token مفقود أو خاطئ |
| 404 | Not Found | المورد المطلوب غير موجود |
| 429 | Too Many Requests | تجاوز حد الطلبات |
| 500 | Internal Server Error | خطأ في الخادم |

---

## Rate Limiting

### حدود الطلبات
```
Window: 15 minutes
Max Requests: 200 requests per IP
```

### Headers
عند الاقتراب من الحد، ستحصل على headers إضافية:
```
RateLimit-Limit: 200
RateLimit-Remaining: 50
RateLimit-Reset: 1700000000
```

### Error Response (429)
```json
{
  "error": "Too many requests from this IP, please try again after 15 minutes"
}
```

---

## Security

### Input Sanitization
- جميع المدخلات النصية يتم تعقيمها باستخدام **DOMPurify**
- حماية من XSS attacks

### Headers
```
X-Content-Type-Options: nosniff
X-Frame-Options: DENY
X-XSS-Protection: 1; mode=block
Strict-Transport-Security: max-age=31536000; includeSubDomains; preload
Content-Security-Policy: ...
```

### HTTPS
- في الإنتاج، يجب استخدام HTTPS فقط
- `upgradeInsecureRequests` مُفعّل في CSP

---

## Examples

### Example 1: إنشاء بطاقة كاملة

```javascript
// 1. رفع الشعار
const logoFormData = new FormData();
logoFormData.append('image', logoFile);

const logoRes = await fetch('/api/upload-image', {
  method: 'POST',
  body: logoFormData
});
const { url: logoUrl } = await logoRes.json();

// 2. حفظ التصميم
const designData = {
  inputs: {
    'input-name': 'أحمد محمد',
    'input-tagline': 'مطور Full-stack',
    'input-email': 'ahmed@example.com'
  },
  imageUrls: {
    logo: logoUrl,
    front: '...',
    back: '...'
  },
  dynamic: {
    phones: [{ value: '+201234567890' }]
  }
};

const saveRes = await fetch('/api/save-design', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(designData)
});

const { id } = await saveRes.json();
console.log(`Card URL: /nfc/viewer.html?id=${id}`);
```

### Example 2: جلب البطاقات الأكثر مشاهدة

```javascript
const res = await fetch('/api/gallery?sortBy=views&page=1');
const { designs } = await res.json();

designs.forEach(card => {
  console.log(`${card.data.inputs['input-name']} - ${card.views} views`);
});
```

---

## Changelog

### v1.0.0 (Current)
- Initial API release
- Save/Get designs
- Upload images
- Gallery with pagination
- Backgrounds management

### Upcoming (v1.1.0)
- JWT Authentication
- User-specific designs
- Advanced filtering
- Analytics endpoints

---

## Support

إذا واجهت أي مشكلة:
- 📧 Email: support@mcprim.com
- 🐛 GitHub Issues: [github.com/elfox14/nfc/issues](https://github.com/elfox14/nfc/issues)
- 📖 Documentation: [README.md](../README.md)
