/**
 * مكتبة المكونات (Component Library)
 * 
 * توفر هذه المكتبة مكونات وعناصر جاهزة للاستخدام
 */

/**
 * فئة المكون (Component)
 */
class Component {
  constructor(id, name, type, config = {}) {
    this.id = id;
    this.name = name;
    this.type = type; // text, image, shape, icon, etc.
    this.config = config;
    this.createdAt = new Date();
    this.tags = config.tags || [];
    this.preview = config.preview || null;
  }

  /**
   * الحصول على معلومات المكون
   */
  getInfo() {
    return {
      id: this.id,
      name: this.name,
      type: this.type,
      tags: this.tags,
      preview: this.preview
    };
  }

  /**
   * تطبيق المكون على العنصر
   */
  apply(element) {
    Object.assign(element.style, this.config.styles || {});
    if (this.config.content) {
      element.innerHTML = this.config.content;
    }
  }
}

/**
 * فئة القالب (Template)
 */
class Template {
  constructor(id, name, structure = {}) {
    this.id = id;
    this.name = name;
    this.structure = structure;
    this.createdAt = new Date();
    this.category = structure.category || 'general';
    this.thumbnail = structure.thumbnail || null;
  }

  /**
   * الحصول على معلومات القالب
   */
  getInfo() {
    return {
      id: this.id,
      name: this.name,
      category: this.category,
      thumbnail: this.thumbnail
    };
  }

  /**
   * تطبيق القالب
   */
  apply(cardData) {
    return {
      ...cardData,
      ...this.structure.defaults
    };
  }
}

/**
 * فئة مدير المكتبة (Library Manager)
 */
class ComponentLibraryManager {
  constructor(options = {}) {
    this.components = [];
    this.templates = [];
    this.categories = new Set();
    this.storageKey = options.storageKey || 'component_library';
    
    this.initializeDefaultComponents();
    this.loadFromStorage();
  }

  /**
   * تهيئة المكونات الافتراضية
   */
  initializeDefaultComponents() {
    // مكونات النصوص
    this.addComponent(new Component(
      'text_heading',
      'عنوان',
      'text',
      {
        tags: ['نص', 'عنوان'],
        styles: {
          fontSize: '48px',
          fontWeight: 'bold',
          color: '#000000'
        }
      }
    ));

    this.addComponent(new Component(
      'text_body',
      'نص عادي',
      'text',
      {
        tags: ['نص', 'محتوى'],
        styles: {
          fontSize: '16px',
          fontWeight: 'normal',
          color: '#333333'
        }
      }
    ));

    this.addComponent(new Component(
      'text_tagline',
      'شعار',
      'text',
      {
        tags: ['نص', 'شعار'],
        styles: {
          fontSize: '24px',
          fontWeight: '500',
          color: '#666666'
        }
      }
    ));

    // مكونات الأشكال
    this.addComponent(new Component(
      'shape_circle',
      'دائرة',
      'shape',
      {
        tags: ['شكل', 'دائرة'],
        styles: {
          borderRadius: '50%',
          width: '100px',
          height: '100px',
          backgroundColor: '#e0e0e0'
        }
      }
    ));

    this.addComponent(new Component(
      'shape_rectangle',
      'مستطيل',
      'shape',
      {
        tags: ['شكل', 'مستطيل'],
        styles: {
          width: '200px',
          height: '100px',
          backgroundColor: '#e0e0e0'
        }
      }
    ));

    // مكونات الأيقونات
    this.addComponent(new Component(
      'icon_phone',
      'هاتف',
      'icon',
      {
        tags: ['أيقونة', 'اتصال'],
        content: '📱'
      }
    ));

    this.addComponent(new Component(
      'icon_email',
      'بريد إلكتروني',
      'icon',
      {
        tags: ['أيقونة', 'اتصال'],
        content: '📧'
      }
    ));

    this.addComponent(new Component(
      'icon_location',
      'موقع',
      'icon',
      {
        tags: ['أيقونة', 'موقع'],
        content: '📍'
      }
    ));

    // مكونات الخلفيات
    this.addComponent(new Component(
      'bg_gradient_blue',
      'تدرج أزرق',
      'background',
      {
        tags: ['خلفية', 'تدرج'],
        styles: {
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
        }
      }
    ));

    this.addComponent(new Component(
      'bg_gradient_sunset',
      'تدرج غروب',
      'background',
      {
        tags: ['خلفية', 'تدرج'],
        styles: {
          background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)'
        }
      }
    ));

    console.log('✅ تم تهيئة المكونات الافتراضية');
  }

  /**
   * إضافة مكون جديد
   */
  addComponent(component) {
    this.components.push(component);
    if (component.tags) {
      component.tags.forEach(tag => this.categories.add(tag));
    }
    console.log('✅ تم إضافة مكون:', component.name);
  }

  /**
   * الحصول على مكون محدد
   */
  getComponent(componentId) {
    return this.components.find(c => c.id === componentId);
  }

  /**
   * الحصول على جميع المكونات
   */
  getAllComponents() {
    return this.components.map(c => c.getInfo());
  }

  /**
   * البحث عن المكونات
   */
  searchComponents(query) {
    return this.components.filter(c => {
      return c.name.includes(query) ||
             c.tags.some(tag => tag.includes(query));
    }).map(c => c.getInfo());
  }

  /**
   * الحصول على المكونات حسب النوع
   */
  getComponentsByType(type) {
    return this.components.filter(c => c.type === type).map(c => c.getInfo());
  }

  /**
   * الحصول على المكونات حسب الفئة
   */
  getComponentsByCategory(category) {
    return this.components.filter(c => c.tags.includes(category)).map(c => c.getInfo());
  }

  /**
   * حذف مكون
   */
  deleteComponent(componentId) {
    const index = this.components.findIndex(c => c.id === componentId);
    if (index === -1) {
      console.error('❌ المكون غير موجود');
      return false;
    }
    
    this.components.splice(index, 1);
    this.saveToStorage();
    console.log('✅ تم حذف المكون');
    return true;
  }

  /**
   * إضافة قالب جديد
   */
  addTemplate(template) {
    this.templates.push(template);
    console.log('✅ تم إضافة قالب:', template.name);
  }

  /**
   * الحصول على قالب محدد
   */
  getTemplate(templateId) {
    return this.templates.find(t => t.id === templateId);
  }

  /**
   * الحصول على جميع القوالب
   */
  getAllTemplates() {
    return this.templates.map(t => t.getInfo());
  }

  /**
   * الحصول على القوالب حسب الفئة
   */
  getTemplatesByCategory(category) {
    return this.templates.filter(t => t.category === category).map(t => t.getInfo());
  }

  /**
   * حذف قالب
   */
  deleteTemplate(templateId) {
    const index = this.templates.findIndex(t => t.id === templateId);
    if (index === -1) {
      console.error('❌ القالب غير موجود');
      return false;
    }
    
    this.templates.splice(index, 1);
    this.saveToStorage();
    console.log('✅ تم حذف القالب');
    return true;
  }

  /**
   * الحصول على الفئات
   */
  getCategories() {
    return Array.from(this.categories);
  }

  /**
   * حفظ المكتبة في التخزين المحلي
   */
  saveToStorage() {
    try {
      const data = {
        components: this.components,
        templates: this.templates
      };
      localStorage.setItem(this.storageKey, JSON.stringify(data));
    } catch (error) {
      console.error('❌ فشل حفظ المكتبة:', error);
    }
  }

  /**
   * تحميل المكتبة من التخزين المحلي
   */
  loadFromStorage() {
    try {
      const data = JSON.parse(localStorage.getItem(this.storageKey));
      if (data) {
        this.components = data.components || [];
        this.templates = data.templates || [];
      }
    } catch (error) {
      console.error('❌ فشل تحميل المكتبة:', error);
    }
  }

  /**
   * تصدير المكتبة
   */
  exportLibrary() {
    return JSON.stringify({
      components: this.components,
      templates: this.templates,
      exportDate: new Date().toISOString()
    }, null, 2);
  }

  /**
   * استيراد المكتبة
   */
  importLibrary(jsonData) {
    try {
      const data = JSON.parse(jsonData);
      this.components = data.components || [];
      this.templates = data.templates || [];
      this.saveToStorage();
      console.log('✅ تم استيراد المكتبة بنجاح');
      return true;
    } catch (error) {
      console.error('❌ فشل استيراد المكتبة:', error);
      return false;
    }
  }

  /**
   * الحصول على إحصائيات المكتبة
   */
  getStats() {
    return {
      totalComponents: this.components.length,
      componentsByType: this.getComponentTypeStats(),
      totalTemplates: this.templates.length,
      categories: this.getCategories().length
    };
  }

  /**
   * الحصول على إحصائيات أنواع المكونات
   */
  getComponentTypeStats() {
    const stats = {};
    this.components.forEach(c => {
      stats[c.type] = (stats[c.type] || 0) + 1;
    });
    return stats;
  }
}

// تصدير الفئات
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    Component,
    Template,
    ComponentLibraryManager
  };
}
