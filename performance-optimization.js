/**
 * Performance Optimization - تحسينات الأداء
 * 
 * يوفر هذا الملف أدوات لتحسين أداء التطبيق من خلال:
 * - التحميل الكسول (Lazy Loading)
 * - تخزين مؤقت (Caching)
 * - ضغط الصور (Image Compression)
 * - تقسيم الكود (Code Splitting)
 */

/**
 * نظام التحميل الكسول (Lazy Loading)
 */
class LazyLoader {
  /**
   * تحميل ملف JavaScript بشكل كسول
   * @param {string} src - رابط الملف
   * @param {function} callback - دالة يتم استدعاؤها بعد التحميل
   */
  static loadScript(src, callback) {
    const script = document.createElement('script');
    script.src = src;
    script.async = true;

    script.onload = () => {
      console.log('تم تحميل:', src);
      if (callback) callback();
    };

    script.onerror = () => {
      console.error('فشل تحميل:', src);
    };

    document.head.appendChild(script);
  }

  /**
   * تحميل ملف CSS بشكل كسول
   * @param {string} href - رابط الملف
   * @param {function} callback - دالة يتم استدعاؤها بعد التحميل
   */
  static loadStylesheet(href, callback) {
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = href;

    link.onload = () => {
      console.log('تم تحميل:', href);
      if (callback) callback();
    };

    link.onerror = () => {
      console.error('فشل تحميل:', href);
    };

    document.head.appendChild(link);
  }

  /**
   * تحميل مكتبة ثقيلة عند الحاجة (مثل html2canvas و jspdf)
   * @param {string} libraryName - اسم المكتبة
   * @param {function} callback - دالة يتم استدعاؤها بعد التحميل
   */
  static loadLibrary(libraryName, callback) {
    const libraries = {
      html2canvas: 'https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js',
      jspdf: 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js',
      qrcode: 'https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js'
    };

    if (libraries[libraryName]) {
      this.loadScript(libraries[libraryName], callback);
    } else {
      console.error('المكتبة غير معروفة:', libraryName);
    }
  }

  /**
   * تحميل صورة بشكل كسول
   * @param {string} src - رابط الصورة
   * @param {HTMLElement} element - العنصر الذي سيتم عرض الصورة فيه
   */
  static loadImage(src, element) {
    const img = new Image();

    img.onload = () => {
      element.src = src;
      element.classList.add('loaded');
    };

    img.onerror = () => {
      console.error('فشل تحميل الصورة:', src);
    };

    img.src = src;
  }

  /**
   * تحميل صور متعددة بشكل متوازي
   * @param {array} images - قائمة الصور
   * @param {function} callback - دالة يتم استدعاؤها عند انتهاء التحميل
   */
  static loadImages(images, callback) {
    let loadedCount = 0;

    images.forEach(img => {
      const image = new Image();

      image.onload = () => {
        loadedCount++;
        if (loadedCount === images.length && callback) {
          callback();
        }
      };

      image.src = img.src;
    });
  }
}

/**
 * نظام التخزين المؤقت (Caching)
 */
class CacheManager {
  constructor(maxSize = 50) {
    this.cache = new Map();
    this.maxSize = maxSize;
  }

  /**
   * حفظ بيانات في الذاكرة المؤقتة
   * @param {string} key - مفتاح البيانات
   * @param {any} value - قيمة البيانات
   * @param {number} ttl - مدة الحفظ بالثواني (0 = بدون انتهاء)
   */
  set(key, value, ttl = 0) {
    // إذا تجاوزنا الحد الأقصى، احذف أقدم عنصر
    if (this.cache.size >= this.maxSize) {
      const firstKey = this.cache.keys().next().value;
      this.cache.delete(firstKey);
    }

    const cacheEntry = {
      value: value,
      timestamp: Date.now(),
      ttl: ttl
    };

    this.cache.set(key, cacheEntry);
  }

  /**
   * الحصول على بيانات من الذاكرة المؤقتة
   * @param {string} key - مفتاح البيانات
   * @returns {any} - قيمة البيانات أو null
   */
  get(key) {
    const entry = this.cache.get(key);

    if (!entry) {
      return null;
    }

    // التحقق من انتهاء صلاحية البيانات
    if (entry.ttl > 0) {
      const age = (Date.now() - entry.timestamp) / 1000;
      if (age > entry.ttl) {
        this.cache.delete(key);
        return null;
      }
    }

    return entry.value;
  }

  /**
   * التحقق من وجود مفتاح في الذاكرة المؤقتة
   * @param {string} key - مفتاح البيانات
   * @returns {boolean}
   */
  has(key) {
    return this.get(key) !== null;
  }

  /**
   * حذف بيانات من الذاكرة المؤقتة
   * @param {string} key - مفتاح البيانات
   */
  delete(key) {
    this.cache.delete(key);
  }

  /**
   * مسح الذاكرة المؤقتة بالكامل
   */
  clear() {
    this.cache.clear();
  }

  /**
   * الحصول على حجم الذاكرة المؤقتة
   * @returns {number}
   */
  size() {
    return this.cache.size;
  }
}

/**
 * ضغط الصور (Image Compression)
 */
class ImageCompressor {
  /**
   * ضغط صورة من ملف
   * @param {File} file - ملف الصورة
   * @param {number} quality - جودة الضغط (0-1)
   * @param {number} maxWidth - الحد الأقصى للعرض
   * @param {number} maxHeight - الحد الأقصى للارتفاع
   * @param {function} callback - دالة يتم استدعاؤها بعد الضغط
   */
  static compress(file, quality = 0.8, maxWidth = 1024, maxHeight = 1024, callback) {
    const reader = new FileReader();

    reader.onload = (e) => {
      const img = new Image();

      img.onload = () => {
        // حساب الأبعاد الجديدة
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > maxWidth) {
            height = Math.round(height * (maxWidth / width));
            width = maxWidth;
          }
        } else {
          if (height > maxHeight) {
            width = Math.round(width * (maxHeight / height));
            height = maxHeight;
          }
        }

        // إنشاء canvas وضغط الصورة
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);

        // تحويل إلى blob
        canvas.toBlob((blob) => {
          if (callback) {
            callback(blob);
          }
        }, 'image/jpeg', quality);
      };

      img.src = e.target.result;
    };

    reader.readAsDataURL(file);
  }

  /**
   * الحصول على حجم الملف بصيغة قابلة للقراءة
   * @param {number} bytes - حجم الملف بالبايت
   * @returns {string} - الحجم بصيغة مقروءة
   */
  static formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';

    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
  }

  /**
   * حساب نسبة الضغط
   * @param {number} originalSize - الحجم الأصلي
   * @param {number} compressedSize - الحجم المضغوط
   * @returns {number} - نسبة الضغط بالنسبة المئوية
   */
  static getCompressionRatio(originalSize, compressedSize) {
    return Math.round(((originalSize - compressedSize) / originalSize) * 100);
  }
}

/**
 * مراقب الأداء (Performance Monitor)
 */
class PerformanceMonitor {
  constructor() {
    this.metrics = {};
  }

  /**
   * بدء قياس الأداء
   * @param {string} label - اسم القياس
   */
  start(label) {
    this.metrics[label] = {
      startTime: performance.now(),
      endTime: null,
      duration: null
    };
  }

  /**
   * إنهاء قياس الأداء
   * @param {string} label - اسم القياس
   */
  end(label) {
    if (this.metrics[label]) {
      this.metrics[label].endTime = performance.now();
      this.metrics[label].duration = this.metrics[label].endTime - this.metrics[label].startTime;
      console.log(`⏱️ ${label}: ${this.metrics[label].duration.toFixed(2)}ms`);
    }
  }

  /**
   * الحصول على مدة القياس
   * @param {string} label - اسم القياس
   * @returns {number} - المدة بالميلي ثانية
   */
  getDuration(label) {
    return this.metrics[label] ? this.metrics[label].duration : null;
  }

  /**
   * طباعة جميع القياسات
   */
  printAll() {
    console.log('📊 ملخص الأداء:');
    for (const [label, metric] of Object.entries(this.metrics)) {
      if (metric.duration) {
        console.log(`  ${label}: ${metric.duration.toFixed(2)}ms`);
      }
    }
  }

  /**
   * مسح جميع القياسات
   */
  clear() {
    this.metrics = {};
  }
}

/**
 * تحسين الـ DOM (DOM Optimization)
 */
class DOMOptimizer {
  /**
   * تحديث عناصر متعددة بكفاءة
   * @param {function} updateFunction - دالة التحديث
   */
  static batchUpdate(updateFunction) {
    // قراءة البيانات
    const fragment = document.createDocumentFragment();

    // تنفيذ التحديثات
    updateFunction(fragment);

    // كتابة البيانات دفعة واحدة
    document.body.appendChild(fragment);
  }

  /**
   * تأجيل تنفيذ دالة (Debounce)
   * @param {function} func - الدالة المراد تأجيلها
   * @param {number} delay - التأخير بالميلي ثانية
   * @returns {function} - دالة معدلة
   */
  static debounce(func, delay) {
    let timeoutId;

    return function (...args) {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        func.apply(this, args);
      }, delay);
    };
  }

  /**
   * تقليل تكرار تنفيذ دالة (Throttle)
   * @param {function} func - الدالة المراد تقليل تكرارها
   * @param {number} limit - الحد الأدنى للتأخير بالميلي ثانية
   * @returns {function} - دالة معدلة
   */
  static throttle(func, limit) {
    let inThrottle;

    return function (...args) {
      if (!inThrottle) {
        func.apply(this, args);
        inThrottle = true;
        setTimeout(() => {
          inThrottle = false;
        }, limit);
      }
    };
  }

  /**
   * تحميل عناصر عند الرؤية (Intersection Observer)
   * @param {array} elements - العناصر المراد مراقبتها
   * @param {function} callback - دالة يتم استدعاؤها عند الرؤية
   */
  static observeIntersection(elements, callback) {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          callback(entry.target);
          observer.unobserve(entry.target);
        }
      });
    });

    elements.forEach(element => {
      observer.observe(element);
    });
  }
}

// تصدير الفئات
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    LazyLoader,
    CacheManager,
    ImageCompressor,
    PerformanceMonitor,
    DOMOptimizer
  };
}
