/**
 * Validation Module - التحقق من صحة المدخلات وحماية الأمان
 * 
 * يوفر هذا الملف مجموعة من الدوال للتحقق من صحة البيانات المدخلة
 * وحماية التطبيق من الهجمات الأمنية مثل XSS و SQL Injection
 */

/**
 * التحقق من صحة النص - يجب أن لا يكون فارغاً وطوله معقول
 * @param {string} text - النص المراد التحقق منه
 * @param {number} minLength - الحد الأدنى لطول النص (افتراضي: 1)
 * @param {number} maxLength - الحد الأقصى لطول النص (افتراضي: 500)
 * @returns {object} - {isValid: boolean, error: string}
 */
function validateText(text, minLength = 1, maxLength = 500) {
  if (typeof text !== 'string') {
    return { isValid: false, error: 'يجب أن يكون المدخل نصاً' };
  }

  const trimmedText = text.trim();

  if (trimmedText.length === 0) {
    return { isValid: false, error: 'الحقل مطلوب ولا يمكن أن يكون فارغاً' };
  }

  if (trimmedText.length < minLength) {
    return { isValid: false, error: `يجب أن يكون الطول على الأقل ${minLength} أحرف` };
  }

  if (trimmedText.length > maxLength) {
    return { isValid: false, error: `يجب ألا يتجاوز الطول ${maxLength} أحرف` };
  }

  return { isValid: true, error: null };
}

/**
 * التحقق من صحة البريد الإلكتروني
 * @param {string} email - البريد الإلكتروني المراد التحقق منه
 * @returns {object} - {isValid: boolean, error: string}
 */
function validateEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  if (!emailRegex.test(email)) {
    return { isValid: false, error: 'البريد الإلكتروني غير صحيح' };
  }

  return { isValid: true, error: null };
}

/**
 * التحقق من صحة رقم الهاتف
 * @param {string} phone - رقم الهاتف المراد التحقق منه
 * @returns {object} - {isValid: boolean, error: string}
 */
function validatePhone(phone) {
  // يقبل أرقام بصيغ مختلفة: +966501234567، 0501234567، إلخ
  const phoneRegex = /^[\+]?[(]?[0-9]{3}[)]?[-\s\.]?[0-9]{3}[-\s\.]?[0-9]{4,6}$/;

  if (!phoneRegex.test(phone.replace(/\s/g, ''))) {
    return { isValid: false, error: 'رقم الهاتف غير صحيح' };
  }

  return { isValid: true, error: null };
}

/**
 * التحقق من صحة رابط الويب (URL)
 * @param {string} url - الرابط المراد التحقق منه
 * @returns {object} - {isValid: boolean, error: string}
 */
function validateURL(url) {
  try {
    new URL(url);
    return { isValid: true, error: null };
  } catch (error) {
    return { isValid: false, error: 'الرابط غير صحيح' };
  }
}

/**
 * التحقق من صحة اللون (Hex Color)
 * @param {string} color - اللون المراد التحقق منه بصيغة Hex
 * @returns {object} - {isValid: boolean, error: string}
 */
function validateColor(color) {
  const colorRegex = /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/;

  if (!colorRegex.test(color)) {
    return { isValid: false, error: 'اللون يجب أن يكون بصيغة Hex صحيحة (#RRGGBB)' };
  }

  return { isValid: true, error: null };
}

/**
 * التحقق من صحة حجم الخط
 * @param {number} fontSize - حجم الخط المراد التحقق منه
 * @param {number} minSize - الحد الأدنى (افتراضي: 8)
 * @param {number} maxSize - الحد الأقصى (افتراضي: 72)
 * @returns {object} - {isValid: boolean, error: string}
 */
function validateFontSize(fontSize, minSize = 8, maxSize = 72) {
  const size = parseFloat(fontSize);

  if (isNaN(size)) {
    return { isValid: false, error: 'حجم الخط يجب أن يكون رقماً' };
  }

  if (size < minSize || size > maxSize) {
    return { isValid: false, error: `حجم الخط يجب أن يكون بين ${minSize} و ${maxSize}` };
  }

  return { isValid: true, error: null };
}

/**
 * التحقق من صحة البيانات الكاملة للبطاقة
 * @param {object} cardData - بيانات البطاقة
 * @returns {object} - {isValid: boolean, errors: object}
 */
function validateCardData(cardData) {
  const errors = {};

  // التحقق من الاسم
  if (cardData.name) {
    const nameValidation = validateText(cardData.name, 1, 100);
    if (!nameValidation.isValid) {
      errors.name = nameValidation.error;
    }
  }

  // التحقق من المسمى الوظيفي
  if (cardData.tagline) {
    const taglineValidation = validateText(cardData.tagline, 1, 100);
    if (!taglineValidation.isValid) {
      errors.tagline = taglineValidation.error;
    }
  }

  // التحقق من البريد الإلكتروني
  if (cardData.email) {
    const emailValidation = validateEmail(cardData.email);
    if (!emailValidation.isValid) {
      errors.email = emailValidation.error;
    }
  }

  // التحقق من رقم الهاتف
  if (cardData.phone) {
    const phoneValidation = validatePhone(cardData.phone);
    if (!phoneValidation.isValid) {
      errors.phone = phoneValidation.error;
    }
  }

  // التحقق من الموقع الإلكتروني
  if (cardData.website) {
    const urlValidation = validateURL(cardData.website);
    if (!urlValidation.isValid) {
      errors.website = urlValidation.error;
    }
  }

  // التحقق من الألوان
  if (cardData.nameColor) {
    const colorValidation = validateColor(cardData.nameColor);
    if (!colorValidation.isValid) {
      errors.nameColor = colorValidation.error;
    }
  }

  // التحقق من حجم الخط
  if (cardData.nameFontSize) {
    const fontSizeValidation = validateFontSize(cardData.nameFontSize);
    if (!fontSizeValidation.isValid) {
      errors.nameFontSize = fontSizeValidation.error;
    }
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors: errors
  };
}

/**
 * تنظيف النص من الأحرف الخطرة (حماية من XSS)
 * استخدم هذه الدالة عند عرض النصوص المدخلة من المستخدم
 * @param {string} text - النص المراد تنظيفه
 * @returns {string} - النص المنظف
 */
function sanitizeText(text) {
  if (typeof text !== 'string') {
    return '';
  }

  // إنشاء عنصر div مؤقت
  const tempDiv = document.createElement('div');
  tempDiv.textContent = text; // استخدام textContent بدلاً من innerHTML لتجنب XSS

  return tempDiv.innerHTML;
}

/**
 * تنظيف HTML من الوسوم الخطرة (حماية من XSS)
 * @param {string} html - HTML المراد تنظيفه
 * @returns {string} - HTML المنظف
 */
function sanitizeHTML(html) {
  if (typeof html !== 'string') {
    return '';
  }

  // قائمة الوسوم المسموحة
  const allowedTags = ['b', 'i', 'em', 'strong', 'u', 'br', 'p', 'span'];

  // قائمة الخصائص المسموحة
  const allowedAttributes = ['class', 'style', 'id'];

  // إنشاء عنصر مؤقت
  const tempDiv = document.createElement('div');
  tempDiv.innerHTML = html;

  // دالة تنظيف العناصر بشكل متكرر
  function cleanElement(element) {
    const nodesToRemove = [];

    for (let i = 0; i < element.childNodes.length; i++) {
      const node = element.childNodes[i];

      if (node.nodeType === 1) { // عنصر
        const tagName = node.tagName.toLowerCase();

        if (!allowedTags.includes(tagName)) {
          // إذا كان الوسم غير مسموح، احذفه وأبقِ على محتواه
          while (node.firstChild) {
            element.insertBefore(node.firstChild, node);
          }
          nodesToRemove.push(node);
        } else {
          // احذف الخصائص غير المسموحة
          const attributesToRemove = [];
          for (let j = 0; j < node.attributes.length; j++) {
            const attr = node.attributes[j];
            if (!allowedAttributes.includes(attr.name)) {
              attributesToRemove.push(attr.name);
            }
          }
          attributesToRemove.forEach(attr => node.removeAttribute(attr));

          // نظف العناصر الفرعية
          cleanElement(node);
        }
      }
    }

    nodesToRemove.forEach(node => node.parentNode.removeChild(node));
  }

  cleanElement(tempDiv);
  return tempDiv.innerHTML;
}

/**
 * تحويل النص إلى نص آمن للاستخدام في HTML
 * @param {string} text - النص المراد تحويله
 * @returns {string} - النص الآمن
 */
function escapeHTML(text) {
  const map = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
  };

  return text.replace(/[&<>"']/g, char => map[char]);
}

/**
 * التحقق من أن البيانات آمنة للحفظ في قاعدة البيانات
 * @param {object} data - البيانات المراد التحقق منها
 * @returns {object} - {isSafe: boolean, sanitizedData: object}
 */
function validateAndSanitizeData(data) {
  const sanitizedData = {};

  for (const [key, value] of Object.entries(data)) {
    if (typeof value === 'string') {
      // تنظيف النصوص من الأحرف الخطرة
      sanitizedData[key] = sanitizeText(value);
    } else if (typeof value === 'object' && value !== null) {
      // معالجة الكائنات بشكل متكرر
      sanitizedData[key] = validateAndSanitizeData(value);
    } else {
      // نسخ القيم الأخرى كما هي
      sanitizedData[key] = value;
    }
  }

  return {
    isSafe: true,
    sanitizedData: sanitizedData
  };
}

// تصدير الدوال
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    validateText,
    validateEmail,
    validatePhone,
    validateURL,
    validateColor,
    validateFontSize,
    validateCardData,
    sanitizeText,
    sanitizeHTML,
    escapeHTML,
    validateAndSanitizeData
  };
}
