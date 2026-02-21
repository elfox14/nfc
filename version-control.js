/**
 * نظام إدارة الإصدارات (Version Control System)
 * 
 * يوفر هذا الملف نظام متقدم لإدارة إصدارات التصاميم والبطاقات
 */

/**
 * فئة الإصدار (Version)
 */
class Version {
  constructor(id, cardData, metadata = {}) {
    this.id = id;
    this.timestamp = new Date();
    this.cardData = JSON.parse(JSON.stringify(cardData)); // نسخة عميقة
    this.metadata = {
      author: metadata.author || 'Unknown',
      description: metadata.description || '',
      tags: metadata.tags || [],
      ...metadata
    };
  }

  /**
   * الحصول على حجم الإصدار بالبايت
   */
  getSize() {
    return JSON.stringify(this.cardData).length;
  }

  /**
   * الحصول على معلومات الإصدار
   */
  getInfo() {
    return {
      id: this.id,
      timestamp: this.timestamp.toISOString(),
      author: this.metadata.author,
      description: this.metadata.description,
      size: this.getSize(),
      tags: this.metadata.tags
    };
  }
}

/**
 * فئة مدير الإصدارات (Version Manager)
 */
class VersionManager {
  constructor(options = {}) {
    this.versions = [];
    this.currentVersionId = null;
    this.maxVersions = options.maxVersions || 50;
    this.autoSaveInterval = options.autoSaveInterval || 300000; // 5 دقائق
    this.storageKey = options.storageKey || 'card_versions';
    
    this.loadFromStorage();
    this.startAutoSave();
  }

  /**
   * إنشاء إصدار جديد
   */
  createVersion(cardData, metadata = {}) {
    const versionId = 'v_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    const version = new Version(versionId, cardData, metadata);
    
    this.versions.push(version);
    this.currentVersionId = versionId;
    
    // حذف الإصدارات القديمة إذا تجاوزنا الحد الأقصى
    if (this.versions.length > this.maxVersions) {
      this.versions.shift();
    }
    
    this.saveToStorage();
    console.log('✅ تم إنشاء إصدار جديد:', versionId);
    
    return version;
  }

  /**
   * الحصول على إصدار محدد
   */
  getVersion(versionId) {
    return this.versions.find(v => v.id === versionId);
  }

  /**
   * الحصول على جميع الإصدارات
   */
  getAllVersions() {
    return this.versions.map(v => v.getInfo());
  }

  /**
   * استعادة إصدار محدد
   */
  restoreVersion(versionId) {
    const version = this.getVersion(versionId);
    if (!version) {
      console.error('❌ الإصدار غير موجود:', versionId);
      return null;
    }
    
    this.currentVersionId = versionId;
    this.saveToStorage();
    console.log('✅ تم استعادة الإصدار:', versionId);
    
    return version.cardData;
  }

  /**
   * مقارنة إصدارين
   */
  compareVersions(versionId1, versionId2) {
    const version1 = this.getVersion(versionId1);
    const version2 = this.getVersion(versionId2);
    
    if (!version1 || !version2) {
      console.error('❌ أحد الإصدارات غير موجود');
      return null;
    }
    
    const diff = {
      added: [],
      removed: [],
      modified: []
    };
    
    // مقارنة الخصائص
    const keys1 = Object.keys(version1.cardData);
    const keys2 = Object.keys(version2.cardData);
    
    // البحث عن الخصائص المضافة
    keys2.forEach(key => {
      if (!keys1.includes(key)) {
        diff.added.push({
          key: key,
          value: version2.cardData[key]
        });
      }
    });
    
    // البحث عن الخصائص المحذوفة
    keys1.forEach(key => {
      if (!keys2.includes(key)) {
        diff.removed.push({
          key: key,
          value: version1.cardData[key]
        });
      }
    });
    
    // البحث عن الخصائص المعدلة
    keys1.forEach(key => {
      if (keys2.includes(key) && version1.cardData[key] !== version2.cardData[key]) {
        diff.modified.push({
          key: key,
          oldValue: version1.cardData[key],
          newValue: version2.cardData[key]
        });
      }
    });
    
    return diff;
  }

  /**
   * حذف إصدار
   */
  deleteVersion(versionId) {
    const index = this.versions.findIndex(v => v.id === versionId);
    if (index === -1) {
      console.error('❌ الإصدار غير موجود:', versionId);
      return false;
    }
    
    this.versions.splice(index, 1);
    this.saveToStorage();
    console.log('✅ تم حذف الإصدار:', versionId);
    
    return true;
  }

  /**
   * البحث عن إصدارات
   */
  searchVersions(query) {
    return this.versions.filter(v => {
      return v.metadata.description.includes(query) ||
             v.metadata.tags.some(tag => tag.includes(query)) ||
             v.metadata.author.includes(query);
    }).map(v => v.getInfo());
  }

  /**
   * الحصول على إحصائيات الإصدارات
   */
  getStats() {
    return {
      totalVersions: this.versions.length,
      totalSize: this.versions.reduce((sum, v) => sum + v.getSize(), 0),
      oldestVersion: this.versions.length > 0 ? this.versions[0].timestamp : null,
      newestVersion: this.versions.length > 0 ? this.versions[this.versions.length - 1].timestamp : null,
      averageSize: this.versions.length > 0 ? 
        this.versions.reduce((sum, v) => sum + v.getSize(), 0) / this.versions.length : 0
    };
  }

  /**
   * تصدير الإصدارات
   */
  exportVersions() {
    return JSON.stringify({
      versions: this.versions,
      currentVersionId: this.currentVersionId,
      exportDate: new Date().toISOString()
    }, null, 2);
  }

  /**
   * استيراد الإصدارات
   */
  importVersions(jsonData) {
    try {
      const data = JSON.parse(jsonData);
      this.versions = data.versions.map(v => {
        const version = new Version(v.id, v.cardData, v.metadata);
        version.timestamp = new Date(v.timestamp);
        return version;
      });
      this.currentVersionId = data.currentVersionId;
      this.saveToStorage();
      console.log('✅ تم استيراد الإصدارات بنجاح');
      return true;
    } catch (error) {
      console.error('❌ فشل استيراد الإصدارات:', error);
      return false;
    }
  }

  /**
   * حفظ الإصدارات في التخزين المحلي
   */
  saveToStorage() {
    try {
      const data = {
        versions: this.versions,
        currentVersionId: this.currentVersionId
      };
      localStorage.setItem(this.storageKey, JSON.stringify(data));
    } catch (error) {
      console.error('❌ فشل حفظ الإصدارات:', error);
    }
  }

  /**
   * تحميل الإصدارات من التخزين المحلي
   */
  loadFromStorage() {
    try {
      const data = JSON.parse(localStorage.getItem(this.storageKey));
      if (data) {
        this.versions = data.versions.map(v => {
          const version = new Version(v.id, v.cardData, v.metadata);
          version.timestamp = new Date(v.timestamp);
          return version;
        });
        this.currentVersionId = data.currentVersionId;
      }
    } catch (error) {
      console.error('❌ فشل تحميل الإصدارات:', error);
    }
  }

  /**
   * بدء الحفظ التلقائي
   */
  startAutoSave() {
    this.autoSaveTimer = setInterval(() => {
      this.saveToStorage();
      console.log('💾 تم الحفظ التلقائي للإصدارات');
    }, this.autoSaveInterval);
  }

  /**
   * إيقاف الحفظ التلقائي
   */
  stopAutoSave() {
    if (this.autoSaveTimer) {
      clearInterval(this.autoSaveTimer);
    }
  }

  /**
   * مسح جميع الإصدارات
   */
  clearAll() {
    this.versions = [];
    this.currentVersionId = null;
    this.saveToStorage();
    console.log('✅ تم مسح جميع الإصدارات');
  }
}

/**
 * فئة سجل التغييرات (Changelog)
 */
class Changelog {
  constructor() {
    this.entries = [];
  }

  /**
   * إضافة إدخال إلى السجل
   */
  addEntry(action, details = {}) {
    const entry = {
      timestamp: new Date().toISOString(),
      action: action,
      details: details
    };
    
    this.entries.push(entry);
    console.log('📝 تم تسجيل:', action);
    
    return entry;
  }

  /**
   * الحصول على جميع الإدخالات
   */
  getEntries() {
    return this.entries;
  }

  /**
   * الحصول على الإدخالات حسب النوع
   */
  getEntriesByAction(action) {
    return this.entries.filter(e => e.action === action);
  }

  /**
   * الحصول على آخر N إدخال
   */
  getLastEntries(count = 10) {
    return this.entries.slice(-count).reverse();
  }

  /**
   * مسح السجل
   */
  clear() {
    this.entries = [];
  }

  /**
   * تصدير السجل
   */
  export() {
    return JSON.stringify(this.entries, null, 2);
  }
}

// تصدير الفئات
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    Version,
    VersionManager,
    Changelog
  };
}
