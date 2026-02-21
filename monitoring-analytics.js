/**
 * Monitoring & Analytics - المراقبة والتحليلات
 * 
 * يوفر هذا الملف أدوات لمراقبة الأخطاء وتحليل استخدام التطبيق
 */

/**
 * نظام تسجيل الأخطاء (Error Logger)
 */
class ErrorLogger {
  constructor(options = {}) {
    this.errors = [];
    this.maxErrors = options.maxErrors || 100;
    this.serverUrl = options.serverUrl || null;
    this.appName = options.appName || 'NFC Editor';
    this.userId = options.userId || 'anonymous';

    this.setupGlobalErrorHandlers();
  }

  /**
   * إعداد معالجات الأخطاء العامة
   */
  setupGlobalErrorHandlers() {
    // معالجة الأخطاء غير المعالجة
    window.addEventListener('error', (e) => {
      this.logError({
        type: 'uncaught_error',
        message: e.message,
        filename: e.filename,
        lineno: e.lineno,
        colno: e.colno,
        stack: e.error?.stack
      });
    });

    // معالجة الأخطاء في الـ Promises
    window.addEventListener('unhandledrejection', (e) => {
      this.logError({
        type: 'unhandled_rejection',
        message: e.reason?.message || String(e.reason),
        stack: e.reason?.stack
      });
    });

    // معالجة أخطاء الشبكة
    window.addEventListener('offline', () => {
      this.logError({
        type: 'network_error',
        message: 'تم قطع الاتصال بالإنترنت'
      });
    });
  }

  /**
   * تسجيل خطأ
   * @param {object} errorData - بيانات الخطأ
   */
  logError(errorData) {
    const error = {
      timestamp: new Date().toISOString(),
      userId: this.userId,
      appName: this.appName,
      userAgent: navigator.userAgent,
      url: window.location.href,
      ...errorData
    };

    // إضافة الخطأ إلى السجل
    this.errors.push(error);

    // إذا تجاوزنا الحد الأقصى، احذف الخطأ الأقدم
    if (this.errors.length > this.maxErrors) {
      this.errors.shift();
    }

    // طباعة الخطأ في الكونسول
    console.error('🔴 خطأ:', error);

    // إرسال الخطأ إلى الخادم
    if (this.serverUrl) {
      this.sendErrorToServer(error);
    }

    // حفظ الخطأ في التخزين المحلي
    this.saveToLocalStorage();
  }

  /**
   * إرسال الخطأ إلى الخادم
   * @param {object} error - بيانات الخطأ
   */
  sendErrorToServer(error) {
    fetch(this.serverUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(error)
    }).catch(err => {
      console.error('فشل إرسال الخطأ إلى الخادم:', err);
    });
  }

  /**
   * حفظ الأخطاء في التخزين المحلي
   */
  saveToLocalStorage() {
    try {
      localStorage.setItem('app_errors', JSON.stringify(this.errors));
    } catch (e) {
      console.error('فشل حفظ الأخطاء في التخزين المحلي:', e);
    }
  }

  /**
   * الحصول على جميع الأخطاء المسجلة
   * @returns {array}
   */
  getErrors() {
    return this.errors;
  }

  /**
   * الحصول على الأخطاء من نوع معين
   * @param {string} type - نوع الخطأ
   * @returns {array}
   */
  getErrorsByType(type) {
    return this.errors.filter(e => e.type === type);
  }

  /**
   * مسح جميع الأخطاء
   */
  clearErrors() {
    this.errors = [];
    localStorage.removeItem('app_errors');
  }

  /**
   * الحصول على إحصائيات الأخطاء
   * @returns {object}
   */
  getErrorStats() {
    const stats = {
      totalErrors: this.errors.length,
      errorsByType: {},
      errorsByHour: {}
    };

    this.errors.forEach(error => {
      // عد الأخطاء حسب النوع
      if (!stats.errorsByType[error.type]) {
        stats.errorsByType[error.type] = 0;
      }
      stats.errorsByType[error.type]++;

      // عد الأخطاء حسب الساعة
      const hour = new Date(error.timestamp).getHours();
      if (!stats.errorsByHour[hour]) {
        stats.errorsByHour[hour] = 0;
      }
      stats.errorsByHour[hour]++;
    });

    return stats;
  }
}

/**
 * نظام التحليلات (Analytics)
 */
class Analytics {
  constructor(options = {}) {
    this.events = [];
    this.maxEvents = options.maxEvents || 1000;
    this.serverUrl = options.serverUrl || null;
    this.appName = options.appName || 'NFC Editor';
    this.userId = options.userId || 'anonymous';
    this.sessionId = this.generateSessionId();

    this.trackPageView();
  }

  /**
   * توليد معرف جلسة فريد
   * @returns {string}
   */
  generateSessionId() {
    return 'session_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  }

  /**
   * تتبع عرض الصفحة
   */
  trackPageView() {
    this.trackEvent({
      type: 'page_view',
      page: window.location.pathname,
      referrer: document.referrer
    });
  }

  /**
   * تتبع حدث
   * @param {object} eventData - بيانات الحدث
   */
  trackEvent(eventData) {
    const event = {
      timestamp: new Date().toISOString(),
      sessionId: this.sessionId,
      userId: this.userId,
      appName: this.appName,
      userAgent: navigator.userAgent,
      ...eventData
    };

    // إضافة الحدث إلى السجل
    this.events.push(event);

    // إذا تجاوزنا الحد الأقصى، احذف الحدث الأقدم
    if (this.events.length > this.maxEvents) {
      this.events.shift();
    }

    // إرسال الحدث إلى الخادم
    if (this.serverUrl) {
      this.sendEventToServer(event);
    }

    console.log('📊 حدث:', event);
  }

  /**
   * تتبع النقر على عنصر
   * @param {string} elementId - معرف العنصر
   * @param {string} elementName - اسم العنصر
   */
  trackClick(elementId, elementName) {
    this.trackEvent({
      type: 'click',
      elementId: elementId,
      elementName: elementName
    });
  }

  /**
   * تتبع ملء نموذج
   * @param {string} formName - اسم النموذج
   * @param {object} formData - بيانات النموذج
   */
  trackFormSubmit(formName, formData) {
    this.trackEvent({
      type: 'form_submit',
      formName: formName,
      fields: Object.keys(formData)
    });
  }

  /**
   * تتبع الوقت المستغرق لعملية
   * @param {string} operationName - اسم العملية
   * @param {number} duration - المدة بالميلي ثانية
   */
  trackTiming(operationName, duration) {
    this.trackEvent({
      type: 'timing',
      operationName: operationName,
      duration: duration
    });
  }

  /**
   * تتبع استخدام ميزة
   * @param {string} featureName - اسم الميزة
   * @param {object} details - تفاصيل إضافية
   */
  trackFeatureUsage(featureName, details = {}) {
    this.trackEvent({
      type: 'feature_usage',
      featureName: featureName,
      ...details
    });
  }

  /**
   * إرسال الحدث إلى الخادم
   * @param {object} event - بيانات الحدث
   */
  sendEventToServer(event) {
    fetch(this.serverUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(event)
    }).catch(err => {
      console.error('فشل إرسال الحدث إلى الخادم:', err);
    });
  }

  /**
   * الحصول على جميع الأحداث المسجلة
   * @returns {array}
   */
  getEvents() {
    return this.events;
  }

  /**
   * الحصول على الأحداث من نوع معين
   * @param {string} type - نوع الحدث
   * @returns {array}
   */
  getEventsByType(type) {
    return this.events.filter(e => e.type === type);
  }

  /**
   * الحصول على إحصائيات الأحداث
   * @returns {object}
   */
  getAnalytics() {
    const stats = {
      totalEvents: this.events.length,
      eventsByType: {},
      topFeatures: {},
      averageSessionDuration: 0
    };

    this.events.forEach(event => {
      // عد الأحداث حسب النوع
      if (!stats.eventsByType[event.type]) {
        stats.eventsByType[event.type] = 0;
      }
      stats.eventsByType[event.type]++;

      // تتبع الميزات الأكثر استخداماً
      if (event.featureName) {
        if (!stats.topFeatures[event.featureName]) {
          stats.topFeatures[event.featureName] = 0;
        }
        stats.topFeatures[event.featureName]++;
      }
    });

    return stats;
  }

  /**
   * الحصول على معدل الاستخدام اليومي
   * @returns {object}
   */
  getDailyUsageStats() {
    const stats = {};

    this.events.forEach(event => {
      const date = new Date(event.timestamp).toLocaleDateString('ar-SA');
      if (!stats[date]) {
        stats[date] = 0;
      }
      stats[date]++;
    });

    return stats;
  }

  /**
   * مسح جميع الأحداث
   */
  clearEvents() {
    this.events = [];
  }
}

/**
 * مدير المراقبة الشامل (Monitoring Manager)
 */
class MonitoringManager {
  constructor(options = {}) {
    this.errorLogger = new ErrorLogger(options);
    this.analytics = new Analytics(options);
    this.performanceMetrics = {};
  }

  /**
   * بدء قياس الأداء
   * @param {string} label - اسم القياس
   */
  startPerformanceMetric(label) {
    this.performanceMetrics[label] = {
      startTime: performance.now()
    };
  }

  /**
   * إنهاء قياس الأداء وتسجيله
   * @param {string} label - اسم القياس
   */
  endPerformanceMetric(label) {
    if (this.performanceMetrics[label]) {
      const duration = performance.now() - this.performanceMetrics[label].startTime;
      this.analytics.trackTiming(label, duration);
      delete this.performanceMetrics[label];
    }
  }

  /**
   * الحصول على تقرير شامل
   * @returns {object}
   */
  getFullReport() {
    return {
      errors: this.errorLogger.getErrorStats(),
      analytics: this.analytics.getAnalytics(),
      dailyUsage: this.analytics.getDailyUsageStats()
    };
  }

  /**
   * طباعة التقرير
   */
  printReport() {
    const report = this.getFullReport();
    console.log('📋 تقرير المراقبة:');
    console.log(JSON.stringify(report, null, 2));
  }

  /**
   * تصدير البيانات
   * @returns {string} - بيانات JSON
   */
  exportData() {
    return JSON.stringify({
      errors: this.errorLogger.getErrors(),
      events: this.analytics.getEvents(),
      report: this.getFullReport()
    }, null, 2);
  }

  /**
   * تحميل البيانات المصدرة
   * @param {string} jsonData - بيانات JSON
   */
  importData(jsonData) {
    try {
      const data = JSON.parse(jsonData);
      if (data.errors) {
        this.errorLogger.errors = data.errors;
      }
      if (data.events) {
        this.analytics.events = data.events;
      }
      console.log('✅ تم استيراد البيانات بنجاح');
    } catch (error) {
      console.error('❌ فشل استيراد البيانات:', error);
    }
  }
}

// تصدير الفئات
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    ErrorLogger,
    Analytics,
    MonitoringManager
  };
}
