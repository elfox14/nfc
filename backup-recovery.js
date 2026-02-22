/**
 * نظام النسخ الاحتياطي والاستعادة (Backup & Recovery System)
 * 
 * يوفر هذا الملف نظام شامل لحماية البيانات والاستعادة من الأخطاء
 */

/**
 * فئة النسخة الاحتياطية (Backup)
 */
class Backup {
  constructor(id, data, metadata = {}) {
    this.id = id;
    this.timestamp = new Date();
    this.data = JSON.parse(JSON.stringify(data)); // نسخة عميقة
    this.metadata = {
      type: metadata.type || 'manual', // manual, auto, scheduled
      description: metadata.description || '',
      encrypted: metadata.encrypted || false,
      ...metadata
    };
    this.checksum = this.calculateChecksum();
  }

  /**
   * حساب بصمة البيانات (Checksum)
   */
  calculateChecksum() {
    const str = JSON.stringify(this.data);
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return Math.abs(hash).toString(16);
  }

  /**
   * التحقق من سلامة البيانات
   */
  verifyIntegrity() {
    return this.checksum === this.calculateChecksum();
  }

  /**
   * الحصول على حجم النسخة الاحتياطية
   */
  getSize() {
    return JSON.stringify(this.data).length;
  }

  /**
   * الحصول على معلومات النسخة
   */
  getInfo() {
    return {
      id: this.id,
      timestamp: this.timestamp.toISOString(),
      type: this.metadata.type,
      description: this.metadata.description,
      size: this.getSize(),
      encrypted: this.metadata.encrypted,
      checksum: this.checksum
    };
  }
}

/**
 * فئة مدير النسخ الاحتياطية (Backup Manager)
 */
class BackupManager {
  constructor(options = {}) {
    this.backups = [];
    this.maxBackups = options.maxBackups || 20;
    this.storageKey = options.storageKey || 'card_backups';
    this.encryptionKey = options.encryptionKey || null;
    this.autoBackupInterval = options.autoBackupInterval || 86400000; // 24 ساعة
    
    this.loadFromStorage();
    this.startAutoBackup();
  }

  /**
   * إنشاء نسخة احتياطية يدوية
   */
  createManualBackup(data, description = '') {
    const backupId = 'backup_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    const backup = new Backup(backupId, data, {
      type: 'manual',
      description: description
    });
    
    this.backups.push(backup);
    this.manageBackupLimit();
    this.saveToStorage();
    
    console.log('✅ تم إنشاء نسخة احتياطية يدوية:', backupId);
    return backup;
  }

  /**
   * إنشاء نسخة احتياطية تلقائية
   */
  createAutoBackup(data) {
    const backupId = 'auto_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    const backup = new Backup(backupId, data, {
      type: 'auto',
      description: 'نسخة احتياطية تلقائية'
    });
    
    this.backups.push(backup);
    this.manageBackupLimit();
    this.saveToStorage();
    
    console.log('✅ تم إنشاء نسخة احتياطية تلقائية:', backupId);
    return backup;
  }

  /**
   * إدارة حد النسخ الاحتياطية
   */
  manageBackupLimit() {
    if (this.backups.length > this.maxBackups) {
      const toDelete = this.backups.length - this.maxBackups;
      this.backups.splice(0, toDelete);
    }
  }

  /**
   * الحصول على نسخة احتياطية محددة
   */
  getBackup(backupId) {
    return this.backups.find(b => b.id === backupId);
  }

  /**
   * الحصول على جميع النسخ الاحتياطية
   */
  getAllBackups() {
    return this.backups.map(b => b.getInfo());
  }

  /**
   * استعادة نسخة احتياطية
   */
  restoreBackup(backupId) {
    const backup = this.getBackup(backupId);
    if (!backup) {
      console.error('❌ النسخة الاحتياطية غير موجودة:', backupId);
      return null;
    }
    
    if (!backup.verifyIntegrity()) {
      console.error('❌ فشل التحقق من سلامة البيانات');
      return null;
    }
    
    console.log('✅ تم استعادة النسخة الاحتياطية:', backupId);
    return backup.data;
  }

  /**
   * حذف نسخة احتياطية
   */
  deleteBackup(backupId) {
    const index = this.backups.findIndex(b => b.id === backupId);
    if (index === -1) {
      console.error('❌ النسخة الاحتياطية غير موجودة:', backupId);
      return false;
    }
    
    this.backups.splice(index, 1);
    this.saveToStorage();
    console.log('✅ تم حذف النسخة الاحتياطية:', backupId);
    
    return true;
  }

  /**
   * الحصول على أحدث نسخة احتياطية
   */
  getLatestBackup() {
    if (this.backups.length === 0) return null;
    return this.backups[this.backups.length - 1];
  }

  /**
   * الحصول على إحصائيات النسخ الاحتياطية
   */
  getStats() {
    return {
      totalBackups: this.backups.length,
      totalSize: this.backups.reduce((sum, b) => sum + b.getSize(), 0),
      oldestBackup: this.backups.length > 0 ? this.backups[0].timestamp : null,
      newestBackup: this.backups.length > 0 ? this.backups[this.backups.length - 1].timestamp : null,
      averageSize: this.backups.length > 0 ? 
        this.backups.reduce((sum, b) => sum + b.getSize(), 0) / this.backups.length : 0
    };
  }

  /**
   * تصدير النسخ الاحتياطية
   */
  exportBackups() {
    return JSON.stringify({
      backups: this.backups,
      exportDate: new Date().toISOString(),
      stats: this.getStats()
    }, null, 2);
  }

  /**
   * استيراد النسخ الاحتياطية
   */
  importBackups(jsonData) {
    try {
      const data = JSON.parse(jsonData);
      this.backups = data.backups.map(b => {
        const backup = new Backup(b.id, b.data, b.metadata);
        backup.timestamp = new Date(b.timestamp);
        backup.checksum = b.checksum;
        return backup;
      });
      this.saveToStorage();
      console.log('✅ تم استيراد النسخ الاحتياطية بنجاح');
      return true;
    } catch (error) {
      console.error('❌ فشل استيراد النسخ الاحتياطية:', error);
      return false;
    }
  }

  /**
   * حفظ النسخ الاحتياطية في التخزين المحلي
   */
  saveToStorage() {
    try {
      const data = {
        backups: this.backups
      };
      localStorage.setItem(this.storageKey, JSON.stringify(data));
    } catch (error) {
      console.error('❌ فشل حفظ النسخ الاحتياطية:', error);
    }
  }

  /**
   * تحميل النسخ الاحتياطية من التخزين المحلي
   */
  loadFromStorage() {
    try {
      const data = JSON.parse(localStorage.getItem(this.storageKey));
      if (data) {
        this.backups = data.backups.map(b => {
          const backup = new Backup(b.id, b.data, b.metadata);
          backup.timestamp = new Date(b.timestamp);
          backup.checksum = b.checksum;
          return backup;
        });
      }
    } catch (error) {
      console.error('❌ فشل تحميل النسخ الاحتياطية:', error);
    }
  }

  /**
   * بدء النسخ الاحتياطي التلقائي
   */
  startAutoBackup() {
    this.autoBackupTimer = setInterval(() => {
      console.log('🔄 جاري إنشاء نسخة احتياطية تلقائية...');
      // يمكن استدعاء هذه الدالة من الخارج مع البيانات الحالية
    }, this.autoBackupInterval);
  }

  /**
   * إيقاف النسخ الاحتياطي التلقائي
   */
  stopAutoBackup() {
    if (this.autoBackupTimer) {
      clearInterval(this.autoBackupTimer);
    }
  }

  /**
   * مسح جميع النسخ الاحتياطية
   */
  clearAll() {
    this.backups = [];
    this.saveToStorage();
    console.log('✅ تم مسح جميع النسخ الاحتياطية');
  }

  /**
   * جدولة النسخ الاحتياطي في وقت محدد
   */
  scheduleBackup(time, data, description = '') {
    const now = new Date();
    const scheduledTime = new Date(time);
    const delay = scheduledTime.getTime() - now.getTime();
    
    if (delay < 0) {
      console.error('❌ الوقت المحدد في الماضي');
      return null;
    }
    
    setTimeout(() => {
      this.createAutoBackup(data);
      console.log('✅ تم إنشاء النسخة الاحتياطية المجدولة');
    }, delay);
    
    console.log('📅 تم جدولة النسخة الاحتياطية للوقت:', time);
  }
}

/**
 * فئة نظام الاستعادة (Recovery System)
 */
class RecoverySystem {
  constructor(backupManager) {
    this.backupManager = backupManager;
    this.recoveryLog = [];
  }

  /**
   * استعادة من أحدث نسخة احتياطية
   */
  recoverFromLatest() {
    const latestBackup = this.backupManager.getLatestBackup();
    if (!latestBackup) {
      console.error('❌ لا توجد نسخ احتياطية متاحة');
      return null;
    }
    
    const data = this.backupManager.restoreBackup(latestBackup.id);
    if (data) {
      this.logRecovery('latest', latestBackup.id);
    }
    return data;
  }

  /**
   * استعادة من نسخة احتياطية محددة
   */
  recoverFromBackup(backupId) {
    const data = this.backupManager.restoreBackup(backupId);
    if (data) {
      this.logRecovery('specific', backupId);
    }
    return data;
  }

  /**
   * استعادة من تاريخ محدد
   */
  recoverFromDate(date) {
    const targetDate = new Date(date);
    const backup = this.backupManager.backups.find(b => {
      const backupDate = new Date(b.timestamp);
      return backupDate <= targetDate;
    });
    
    if (!backup) {
      console.error('❌ لا توجد نسخة احتياطية في هذا التاريخ');
      return null;
    }
    
    return this.recoverFromBackup(backup.id);
  }

  /**
   * تسجيل عملية الاستعادة
   */
  logRecovery(type, backupId) {
    const entry = {
      timestamp: new Date().toISOString(),
      type: type,
      backupId: backupId
    };
    this.recoveryLog.push(entry);
    console.log('📝 تم تسجيل عملية الاستعادة:', entry);
  }

  /**
   * الحصول على سجل الاستعادة
   */
  getRecoveryLog() {
    return this.recoveryLog;
  }

  /**
   * مسح سجل الاستعادة
   */
  clearRecoveryLog() {
    this.recoveryLog = [];
  }
}

// تصدير الفئات
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    Backup,
    BackupManager,
    RecoverySystem
  };
}
