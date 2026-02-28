/**
 * Templates & Color Presets System - نظام القوالب والألوان المسبقة
 * 
 * يوفر هذا الملف مجموعة من القوالب الجاهزة والألوان المتناسقة
 * لتسهيل عملية التصميم على المستخدمين الجدد
 */

/**
 * مكتبة القوالب الجاهزة
 */
const CARD_TEMPLATES = {
  // قالب احترافي كلاسيكي
  classic: {
    name: 'كلاسيكي احترافي',
    description: 'تصميم بسيط واحترافي مناسب للشركات الكبرى',
    thumbnail: '🎩',
    data: {
      name: 'اسمك الكامل',
      tagline: 'المسمى الوظيفي',
      email: 'email@example.com',
      phone: '+966501234567',
      website: 'https://example.com',
      company: 'اسم الشركة',
      address: 'العنوان',
      nameColor: '#1a1a1a',
      taglineColor: '#666666',
      backgroundColor: '#ffffff',
      accentColor: '#0066cc',
      nameFontSize: 24,
      taglineFontSize: 14,
      fontFamily: 'Arial'
    }
  },

  // قالب حديث ملون
  modern: {
    name: 'حديث ملون',
    description: 'تصميم عصري مع تدرجات لونية جميلة',
    thumbnail: '🎨',
    data: {
      name: 'اسمك الكامل',
      tagline: 'المسمى الوظيفي',
      email: 'email@example.com',
      phone: '+966501234567',
      website: 'https://example.com',
      company: 'اسم الشركة',
      address: 'العنوان',
      nameColor: '#ffffff',
      taglineColor: '#e0e0e0',
      backgroundColor: '#1a1a2e',
      accentColor: '#16c784',
      nameFontSize: 28,
      taglineFontSize: 16,
      fontFamily: 'Helvetica'
    }
  },

  // قالب تقني
  tech: {
    name: 'تقني',
    description: 'تصميم موجه للمطورين والمتخصصين التقنيين',
    thumbnail: '💻',
    data: {
      name: 'اسمك الكامل',
      tagline: 'المسمى الوظيفي',
      email: 'email@example.com',
      phone: '+966501234567',
      website: 'https://example.com',
      company: 'اسم الشركة',
      address: 'العنوان',
      nameColor: '#00ff00',
      taglineColor: '#00cc00',
      backgroundColor: '#0a0e27',
      accentColor: '#00ff00',
      nameFontSize: 26,
      taglineFontSize: 14,
      fontFamily: 'Courier New'
    }
  },

  // قالب إبداعي
  creative: {
    name: 'إبداعي',
    description: 'تصميم جريء وملفت للنظر مناسب للمبدعين',
    thumbnail: '🎭',
    data: {
      name: 'اسمك الكامل',
      tagline: 'المسمى الوظيفي',
      email: 'email@example.com',
      phone: '+966501234567',
      website: 'https://example.com',
      company: 'اسم الشركة',
      address: 'العنوان',
      nameColor: '#ff006e',
      taglineColor: '#fb5607',
      backgroundColor: '#fffcf2',
      accentColor: '#ff006e',
      nameFontSize: 32,
      taglineFontSize: 18,
      fontFamily: 'Georgia'
    }
  },

  // قالب رسمي
  formal: {
    name: 'رسمي',
    description: 'تصميم رسمي وجاد مناسب للمؤسسات الحكومية',
    thumbnail: '🏛️',
    data: {
      name: 'اسمك الكامل',
      tagline: 'المسمى الوظيفي',
      email: 'email@example.com',
      phone: '+966501234567',
      website: 'https://example.com',
      company: 'اسم الشركة',
      address: 'العنوان',
      nameColor: '#000080',
      taglineColor: '#333333',
      backgroundColor: '#f5f5f5',
      accentColor: '#000080',
      nameFontSize: 22,
      taglineFontSize: 13,
      fontFamily: 'Times New Roman'
    }
  },

  // قالب ودود
  friendly: {
    name: 'ودود',
    description: 'تصميم دافئ وودود مناسب للخدمات الشخصية',
    thumbnail: '😊',
    data: {
      name: 'اسمك الكامل',
      tagline: 'المسمى الوظيفي',
      email: 'email@example.com',
      phone: '+966501234567',
      website: 'https://example.com',
      company: 'اسم الشركة',
      address: 'العنوان',
      nameColor: '#d4663d',
      taglineColor: '#8b6f47',
      backgroundColor: '#fef9f3',
      accentColor: '#d4663d',
      nameFontSize: 26,
      taglineFontSize: 15,
      fontFamily: 'Verdana'
    }
  }
};

/**
 * مكتبة الألوان المسبقة المتناسقة
 */
const COLOR_PRESETS = {
  // تدرج أزرق احترافي
  blueOcean: {
    name: 'المحيط الأزرق',
    colors: {
      primary: '#0066cc',
      secondary: '#003d99',
      accent: '#00b4d8',
      background: '#f0f7ff',
      text: '#1a1a1a',
      textLight: '#666666'
    }
  },

  // تدرج أخضر طبيعي
  greenNature: {
    name: 'الطبيعة الخضراء',
    colors: {
      primary: '#16a34a',
      secondary: '#15803d',
      accent: '#22c55e',
      background: '#f0fdf4',
      text: '#1a1a1a',
      textLight: '#666666'
    }
  },

  // تدرج برتقالي دافئ
  orangeWarmth: {
    name: 'الدفء البرتقالي',
    colors: {
      primary: '#ea580c',
      secondary: '#c2410c',
      accent: '#fb923c',
      background: '#fffbf0',
      text: '#1a1a1a',
      textLight: '#666666'
    }
  },

  // تدرج بنفسجي ملكي
  purpleRoyalty: {
    name: 'الملكية البنفسجية',
    colors: {
      primary: '#7c3aed',
      secondary: '#6d28d9',
      accent: '#a78bfa',
      background: '#faf5ff',
      text: '#1a1a1a',
      textLight: '#666666'
    }
  },

  // تدرج وردي عصري
  pinkModern: {
    name: 'الحداثة الوردية',
    colors: {
      primary: '#ec4899',
      secondary: '#be185d',
      accent: '#f472b6',
      background: '#fdf2f8',
      text: '#1a1a1a',
      textLight: '#666666'
    }
  },

  // تدرج رمادي محترف
  greyProfessional: {
    name: 'الاحترافية الرمادية',
    colors: {
      primary: '#4b5563',
      secondary: '#2d3748',
      accent: '#718096',
      background: '#f7fafc',
      text: '#1a1a1a',
      textLight: '#666666'
    }
  },

  // تدرج أحمر جريء
  redBold: {
    name: 'الجرأة الحمراء',
    colors: {
      primary: '#dc2626',
      secondary: '#991b1b',
      accent: '#f87171',
      background: '#fef2f2',
      text: '#1a1a1a',
      textLight: '#666666'
    }
  },

  // تدرج تركواز هادئ
  turquoiseCalm: {
    name: 'الهدوء التركوازي',
    colors: {
      primary: '#0891b2',
      secondary: '#0e7490',
      accent: '#06b6d4',
      background: '#ecf0f1',
      text: '#1a1a1a',
      textLight: '#666666'
    }
  },

  // تدرج أسود وأبيض كلاسيكي
  blackWhiteClassic: {
    name: 'الكلاسيكية السوداء والبيضاء',
    colors: {
      primary: '#000000',
      secondary: '#333333',
      accent: '#666666',
      background: '#ffffff',
      text: '#000000',
      textLight: '#666666'
    }
  },

  // تدرج ذهبي فاخر
  goldLuxury: {
    name: 'الفخامة الذهبية',
    colors: {
      primary: '#b8860b',
      secondary: '#8b6914',
      accent: '#daa520',
      background: '#fffef0',
      text: '#1a1a1a',
      textLight: '#666666'
    }
  }
};

/**
 * فئة مدير القوالب
 */
class TemplateManager {
  /**
   * الحصول على قائمة جميع القوالب
   * @returns {array} - قائمة القوالب
   */
  static getTemplates() {
    return Object.entries(CARD_TEMPLATES).map(([key, template]) => ({
      id: key,
      ...template
    }));
  }

  /**
   * الحصول على قالب محدد
   * @param {string} templateId - معرف القالب
   * @returns {object} - بيانات القالب
   */
  static getTemplate(templateId) {
    return CARD_TEMPLATES[templateId];
  }

  /**
   * تطبيق قالب على البطاقة
   * @param {object} cardElement - عنصر البطاقة
   * @param {string} templateId - معرف القالب
   */
  static applyTemplate(cardElement, templateId) {
    const template = this.getTemplate(templateId);
    if (!template) {
      console.error('القالب غير موجود:', templateId);
      return;
    }

    // تطبيق البيانات
    const data = template.data;

    // تحديث النصوص
    if (cardElement.querySelector('.card-name')) {
      cardElement.querySelector('.card-name').textContent = data.name;
    }
    if (cardElement.querySelector('.card-tagline')) {
      cardElement.querySelector('.card-tagline').textContent = data.tagline;
    }
    if (cardElement.querySelector('.card-email')) {
      cardElement.querySelector('.card-email').textContent = data.email;
    }
    if (cardElement.querySelector('.card-phone')) {
      cardElement.querySelector('.card-phone').textContent = data.phone;
    }

    // تطبيق الألوان والأنماط
    cardElement.style.backgroundColor = data.backgroundColor;
    cardElement.style.color = data.nameColor;

    if (cardElement.querySelector('.card-name')) {
      cardElement.querySelector('.card-name').style.color = data.nameColor;
      cardElement.querySelector('.card-name').style.fontSize = data.nameFontSize + 'px';
      cardElement.querySelector('.card-name').style.fontFamily = data.fontFamily;
    }

    if (cardElement.querySelector('.card-tagline')) {
      cardElement.querySelector('.card-tagline').style.color = data.taglineColor;
      cardElement.querySelector('.card-tagline').style.fontSize = data.taglineFontSize + 'px';
      cardElement.querySelector('.card-tagline').style.fontFamily = data.fontFamily;
    }

    console.log('تم تطبيق القالب:', templateId);
  }

  /**
   * الحصول على قائمة جميع الألوان المسبقة
   * @returns {array} - قائمة الألوان المسبقة
   */
  static getColorPresets() {
    return Object.entries(COLOR_PRESETS).map(([key, preset]) => ({
      id: key,
      ...preset
    }));
  }

  /**
   * الحصول على مجموعة ألوان محددة
   * @param {string} presetId - معرف مجموعة الألوان
   * @returns {object} - بيانات مجموعة الألوان
   */
  static getColorPreset(presetId) {
    return COLOR_PRESETS[presetId];
  }

  /**
   * تطبيق مجموعة ألوان على البطاقة
   * @param {object} cardElement - عنصر البطاقة
   * @param {string} presetId - معرف مجموعة الألوان
   */
  static applyColorPreset(cardElement, presetId) {
    const preset = this.getColorPreset(presetId);
    if (!preset) {
      console.error('مجموعة الألوان غير موجودة:', presetId);
      return;
    }

    const colors = preset.colors;

    // تطبيق الألوان
    cardElement.style.backgroundColor = colors.background;
    cardElement.style.color = colors.text;

    if (cardElement.querySelector('.card-name')) {
      cardElement.querySelector('.card-name').style.color = colors.primary;
    }

    if (cardElement.querySelector('.card-tagline')) {
      cardElement.querySelector('.card-tagline').style.color = colors.textLight;
    }

    // تطبيق لون التأكيد على العناصر الأخرى
    const accentElements = cardElement.querySelectorAll('.accent');
    accentElements.forEach(el => {
      el.style.color = colors.accent;
    });

    console.log('تم تطبيق مجموعة الألوان:', presetId);
  }

  /**
   * إنشاء قالب مخصص
   * @param {string} name - اسم القالب
   * @param {object} data - بيانات القالب
   * @returns {object} - القالب الجديد
   */
  static createCustomTemplate(name, data) {
    const customTemplate = {
      name: name,
      description: 'قالب مخصص',
      thumbnail: '⭐',
      data: data
    };

    return customTemplate;
  }

  /**
   * حفظ قالب مخصص في التخزين المحلي
   * @param {string} templateId - معرف القالب
   * @param {object} template - بيانات القالب
   */
  static saveCustomTemplate(templateId, template) {
    const customTemplates = JSON.parse(localStorage.getItem('customTemplates') || '{}');
    customTemplates[templateId] = template;
    localStorage.setItem('customTemplates', JSON.stringify(customTemplates));
    console.log('تم حفظ القالب المخصص:', templateId);
  }

  /**
   * الحصول على القوالب المخصصة
   * @returns {object} - القوالب المخصصة
   */
  static getCustomTemplates() {
    return JSON.parse(localStorage.getItem('customTemplates') || '{}');
  }

  /**
   * حذف قالب مخصص
   * @param {string} templateId - معرف القالب
   */
  static deleteCustomTemplate(templateId) {
    const customTemplates = JSON.parse(localStorage.getItem('customTemplates') || '{}');
    delete customTemplates[templateId];
    localStorage.setItem('customTemplates', JSON.stringify(customTemplates));
    console.log('تم حذف القالب المخصص:', templateId);
  }

  /**
   * الحصول على بنية بيانات البطاقة الافتراضية
   * @param {string} templateId - معرف القالب (اختياري، افتراضي: 'classic')
   * @returns {object} - بنية بيانات البطاقة الموحدة
   */
  static getDefaultCardData(templateId = 'classic') {
    const template = this.getTemplate(templateId) || this.getTemplate('classic');
    const templateData = template.data;

    return {
      templateId: templateId,
      name: templateData.name || '',
      title: templateData.tagline || '',
      company: templateData.company || '',
      phone: templateData.phone || '',
      email: templateData.email || '',
      website: templateData.website || '',
      address: templateData.address || '',
      logoUrl: '',
      photoUrl: '',
      bio: '',
      socialLinks: {
        facebook: '',
        twitter: '',
        instagram: '',
        linkedin: '',
        github: '',
        whatsapp: ''
      },
      colors: {
        primary: templateData.accentColor || '#0066cc',
        secondary: templateData.secondaryColor || '#003d99',
        background: templateData.backgroundColor || '#ffffff',
        text: templateData.nameColor || '#1a1a1a',
        accent: templateData.accentColor || '#0066cc'
      },
      typography: {
        fontFamily: templateData.fontFamily || 'Arial',
        nameSize: templateData.nameFontSize || 24,
        titleSize: templateData.taglineFontSize || 14
      },
      layout: 'default',
      features: {
        showSaveContact: true,
        showShare: true,
        showQrcode: true
      }
    };
  }
}

// تصدير الفئة والثوابت
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    CARD_TEMPLATES,
    COLOR_PRESETS,
    TemplateManager
  };
}
