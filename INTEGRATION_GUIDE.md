# دليل دمج التحسينات الجديدة

هذا الدليل يشرح كيفية دمج جميع التحسينات الجديدة التي تم تطويرها في مشروع NFC Editor.

## 1. تحسينات الأمان (Security)

### ملف: `validation.js`

يحتوي على دوال للتحقق من صحة المدخلات وحماية من هجمات XSS.

#### الاستخدام:

```javascript
// استيراد الدوال
// <script src="validation.js"></script>

// التحقق من صحة البريد الإلكتروني
const emailValidation = validateEmail('user@example.com');
if (!emailValidation.isValid) {
  console.error(emailValidation.error);
}

// التحقق من صحة البيانات الكاملة
const cardData = {
  name: 'أحمد محمد',
  email: 'ahmed@example.com',
  phone: '+966501234567'
};

const validation = validateCardData(cardData);
if (!validation.isValid) {
  console.error('أخطاء في البيانات:', validation.errors);
}

// تنظيف البيانات من الأحرف الخطرة
const sanitized = validateAndSanitizeData(cardData);
console.log('بيانات آمنة:', sanitized.sanitizedData);
```

#### الدوال المتاحة:

- `validateText(text, minLength, maxLength)` - التحقق من النصوص
- `validateEmail(email)` - التحقق من البريد الإلكتروني
- `validatePhone(phone)` - التحقق من رقم الهاتف
- `validateURL(url)` - التحقق من رابط الويب
- `validateColor(color)` - التحقق من اللون (Hex)
- `validateFontSize(fontSize, minSize, maxSize)` - التحقق من حجم الخط
- `validateCardData(cardData)` - التحقق من بيانات البطاقة كاملة
- `sanitizeText(text)` - تنظيف النص من الأحرف الخطرة
- `sanitizeHTML(html)` - تنظيف HTML من الوسوم الخطرة
- `escapeHTML(text)` - تحويل النص إلى HTML آمن
- `validateAndSanitizeData(data)` - التحقق والتنظيف معاً

---

## 2. نظام التراجع والإعادة (Undo/Redo)

### ملف: `undo-redo.js`

يحتوي على نظام متقدم للتراجع والإعادة باستخدام نمط Command Pattern.

#### الاستخدام:

```javascript
// استيراد الفئات
// <script src="undo-redo.js"></script>

// إنشاء مدير التراجع والإعادة
const undoRedoManager = new UndoRedoManager(50); // 50 خطوة كحد أقصى

// إضافة مستمع للتغييرات
undoRedoManager.addListener((state) => {
  // تحديث حالة أزرار التراجع والإعادة
  document.getElementById('undo-btn').disabled = !state.canUndo;
  document.getElementById('redo-btn').disabled = !state.canRedo;
  document.getElementById('undo-btn').title = state.undoDescription;
  document.getElementById('redo-btn').title = state.redoDescription;
});

// تنفيذ أمر (تغيير خاصية)
const element = document.getElementById('card-name');
const oldValue = element.textContent;
const newValue = 'اسم جديد';

undoRedoManager.execute(new ChangeTextCommand(
  element,
  oldValue,
  newValue,
  'تغيير الاسم'
));

// التراجع
if (undoRedoManager.canUndo()) {
  undoRedoManager.undo();
}

// الإعادة
if (undoRedoManager.canRedo()) {
  undoRedoManager.redo();
}

// تنفيذ عدة أوامر معاً
const commands = [
  new ChangeStyleCommand(element, 'color', '#000000', '#FF0000', 'تغيير اللون'),
  new ChangeStyleCommand(element, 'fontSize', '16px', '24px', 'تغيير حجم الخط')
];

undoRedoManager.execute(new CompositeCommand(commands, 'تغييرات متعددة'));
```

#### الفئات المتاحة:

- `UndoRedoManager` - مدير التراجع والإعادة الرئيسي
- `ChangePropertyCommand` - أمر لتغيير خاصية
- `ChangeStyleCommand` - أمر لتغيير نمط CSS
- `ChangeTextCommand` - أمر لتغيير النص
- `CompositeCommand` - أمر مركب يجمع عدة أوامر

---

## 3. نظام الإشعارات (Notifications)

### ملف: `notifications.js`

يحتوي على نظام لعرض إشعارات مرئية للمستخدم.

#### الاستخدام:

```javascript
// استيراد النظام
// <script src="notifications.js"></script>

// عرض إشعار نجاح
notificationManager.success('تم حفظ البطاقة بنجاح', 'نجاح');

// عرض إشعار خطأ
notificationManager.error('حدث خطأ أثناء الحفظ', 'خطأ');

// عرض إشعار تحذير
notificationManager.warning('تأكد من صحة البيانات', 'تحذير');

// عرض إشعار معلومات
notificationManager.info('تم تحديث البطاقة', 'معلومة');

// عرض إشعار بدون إغلاق تلقائي
notificationManager.show('رسالة مهمة', 'info', 'عنوان', 0);

// إزالة جميع الإشعارات
notificationManager.clearAll();
```

#### الخيارات:

```javascript
// إنشاء مثيل مخصص من مدير الإشعارات
const customNotifications = new NotificationManager({
  defaultDuration: 5000, // مدة الإشعار بالميلي ثانية
  maxNotifications: 3,   // الحد الأقصى للإشعارات المعروضة
  position: 'bottom-right' // موضع الإشعارات
});
```

---

## 4. دمج التحسينات في `editor.html`

أضف الملفات الجديدة في ملف `editor.html`:

```html
<!DOCTYPE html>
<html lang="ar">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>محرر بطاقات الأعمال NFC</title>
  <link rel="stylesheet" href="style.css">
</head>
<body>
  <!-- محتوى الصفحة -->
  
  <!-- استيراد الملفات الجديدة -->
  <script src="validation.js"></script>
  <script src="undo-redo.js"></script>
  <script src="notifications.js"></script>
  
  <!-- الملفات الأصلية -->
  <script src="script-core.js"></script>
  <script src="script-card.js"></script>
  <script src="script-ui.js"></script>
  <script src="editor-enhancements.js"></script>
  <script src="state-manager-proxy.js"></script>
  <script src="script-main.js"></script>
</body>
</html>
```

---

## 5. مثال عملي: دمج التحسينات في حفظ البطاقة

```javascript
// في ملف script-main.js أو script-core.js

// إنشاء مدير التراجع والإعادة
const undoRedoManager = new UndoRedoManager();

// دالة حفظ البطاقة محسّنة
async function saveCard(cardData) {
  // التحقق من صحة البيانات
  const validation = validateCardData(cardData);
  
  if (!validation.isValid) {
    // عرض إشعار خطأ
    notificationManager.error(
      'تأكد من صحة جميع البيانات المدخلة',
      'خطأ في البيانات'
    );
    return false;
  }

  // تنظيف البيانات
  const sanitized = validateAndSanitizeData(cardData);

  try {
    // إرسال البيانات إلى الخادم
    const response = await fetch('/api/cards/save', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(sanitized.sanitizedData)
    });

    if (response.ok) {
      // عرض إشعار نجاح
      notificationManager.success(
        'تم حفظ البطاقة بنجاح',
        'نجاح'
      );
      return true;
    } else {
      throw new Error('فشل الحفظ');
    }
  } catch (error) {
    // عرض إشعار خطأ
    notificationManager.error(
      error.message || 'حدث خطأ أثناء الحفظ',
      'خطأ'
    );
    return false;
  }
}

// دالة تغيير خاصية مع دعم التراجع والإعادة
function updateCardProperty(element, property, newValue, description) {
  const oldValue = element[property];

  // إنشاء أمر وتنفيذه
  const command = new ChangePropertyCommand(
    element,
    property,
    oldValue,
    newValue,
    description
  );

  undoRedoManager.execute(command);
}

// إضافة مستمع لتحديث أزرار التراجع والإعادة
undoRedoManager.addListener((state) => {
  const undoBtn = document.getElementById('undo-btn');
  const redoBtn = document.getElementById('redo-btn');

  if (undoBtn) {
    undoBtn.disabled = !state.canUndo;
    undoBtn.title = `التراجع: ${state.undoDescription}`;
  }

  if (redoBtn) {
    redoBtn.disabled = !state.canRedo;
    redoBtn.title = `الإعادة: ${state.redoDescription}`;
  }
});
```

---

## 6. الخطوات التالية

1. **اختبار التحسينات**: تأكد من أن جميع الدوال تعمل بشكل صحيح
2. **تحديث الواجهة**: أضف أزرار للتراجع والإعادة في الواجهة
3. **توثيق الكود**: أضف تعليقات توضيحية في الكود الحالي
4. **اختبارات الوحدة**: أنشئ اختبارات للتحقق من صحة الدوال

---

## 7. الملاحظات الأمنية

- استخدم دائماً `sanitizeText()` عند عرض بيانات المستخدم
- تحقق من صحة البيانات قبل حفظها في قاعدة البيانات
- استخدم `textContent` بدلاً من `innerHTML` عند التعامل مع البيانات المدخلة
- قم بتشفير البيانات الحساسة قبل إرسالها إلى الخادم

---

**آخر تحديث**: 2026-02-21
