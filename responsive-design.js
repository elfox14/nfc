/**
 * Responsive Design & Mobile Support - تحسينات الاستجابة والأجهزة المحمولة
 * 
 * يوفر هذا الملف أدوات لتحسين تجربة المستخدم على الأجهزة المختلفة
 * والتعامل مع التفاعلات اللمسية
 */

/**
 * مدير الاستجابة (Responsive Manager)
 */
class ResponsiveManager {
  constructor() {
    this.breakpoints = {
      mobile: 480,
      tablet: 768,
      desktop: 1024,
      wide: 1440
    };

    this.currentDevice = this.detectDevice();
    this.listeners = [];

    // مراقبة تغيير حجم الشاشة
    window.addEventListener('resize', () => this.handleResize());
  }

  /**
   * كشف نوع الجهاز الحالي
   * @returns {string} - نوع الجهاز (mobile, tablet, desktop, wide)
   */
  detectDevice() {
    const width = window.innerWidth;

    if (width <= this.breakpoints.mobile) {
      return 'mobile';
    } else if (width <= this.breakpoints.tablet) {
      return 'tablet';
    } else if (width <= this.breakpoints.desktop) {
      return 'desktop';
    } else {
      return 'wide';
    }
  }

  /**
   * معالجة تغيير حجم الشاشة
   */
  handleResize() {
    const newDevice = this.detectDevice();

    if (newDevice !== this.currentDevice) {
      this.currentDevice = newDevice;
      this.notifyListeners();
    }
  }

  /**
   * الحصول على نوع الجهاز الحالي
   * @returns {string}
   */
  getDevice() {
    return this.currentDevice;
  }

  /**
   * التحقق من أن الجهاز من نوع معين
   * @param {string} deviceType - نوع الجهاز
   * @returns {boolean}
   */
  isDevice(deviceType) {
    return this.currentDevice === deviceType;
  }

  /**
   * التحقق من أن الجهاز محمول
   * @returns {boolean}
   */
  isMobile() {
    return this.currentDevice === 'mobile';
  }

  /**
   * التحقق من أن الجهاز لوحي
   * @returns {boolean}
   */
  isTablet() {
    return this.currentDevice === 'tablet';
  }

  /**
   * التحقق من أن الجهاز سطح مكتب
   * @returns {boolean}
   */
  isDesktop() {
    return this.currentDevice === 'desktop' || this.currentDevice === 'wide';
  }

  /**
   * إضافة مستمع لتغييرات الجهاز
   * @param {function} listener - دالة يتم استدعاؤها عند تغيير الجهاز
   */
  addListener(listener) {
    this.listeners.push(listener);
  }

  /**
   * إزالة مستمع
   * @param {function} listener - الدالة المراد إزالتها
   */
  removeListener(listener) {
    this.listeners = this.listeners.filter(l => l !== listener);
  }

  /**
   * إخطار المستمعين بالتغييرات
   */
  notifyListeners() {
    this.listeners.forEach(listener => {
      try {
        listener(this.currentDevice);
      } catch (error) {
        console.error('خطأ في استدعاء المستمع:', error);
      }
    });
  }

  /**
   * الحصول على عرض الشاشة الحالي
   * @returns {number}
   */
  getWidth() {
    return window.innerWidth;
  }

  /**
   * الحصول على ارتفاع الشاشة الحالي
   * @returns {number}
   */
  getHeight() {
    return window.innerHeight;
  }
}

/**
 * مدير التفاعلات اللمسية (Touch Manager)
 */
class TouchManager {
  constructor(element) {
    this.element = element;
    this.touchStartX = 0;
    this.touchStartY = 0;
    this.touchEndX = 0;
    this.touchEndY = 0;
    this.listeners = {
      swipeLeft: [],
      swipeRight: [],
      swipeUp: [],
      swipeDown: [],
      tap: [],
      doubleTap: [],
      longPress: []
    };

    this.lastTapTime = 0;
    this.longPressTimer = null;

    this.init();
  }

  /**
   * تهيئة مستمعي الأحداث
   */
  init() {
    this.element.addEventListener('touchstart', (e) => this.handleTouchStart(e), false);
    this.element.addEventListener('touchend', (e) => this.handleTouchEnd(e), false);
    this.element.addEventListener('touchmove', (e) => this.handleTouchMove(e), false);
  }

  /**
   * معالجة بداية اللمس
   */
  handleTouchStart(e) {
    this.touchStartX = e.changedTouches[0].screenX;
    this.touchStartY = e.changedTouches[0].screenY;

    // بدء مؤقت الضغط الطويل
    this.longPressTimer = setTimeout(() => {
      this.trigger('longPress', e);
    }, 500);
  }

  /**
   * معالجة نهاية اللمس
   */
  handleTouchEnd(e) {
    this.touchEndX = e.changedTouches[0].screenX;
    this.touchEndY = e.changedTouches[0].screenY;

    // إلغاء مؤقت الضغط الطويل
    clearTimeout(this.longPressTimer);

    // كشف نوع اللمس
    this.detectSwipe();
    this.detectTap();
  }

  /**
   * معالجة حركة اللمس
   */
  handleTouchMove(e) {
    // إلغاء مؤقت الضغط الطويل عند الحركة
    clearTimeout(this.longPressTimer);
  }

  /**
   * كشف حركات السحب (Swipe)
   */
  detectSwipe() {
    const diffX = this.touchStartX - this.touchEndX;
    const diffY = this.touchStartY - this.touchEndY;
    const threshold = 50; // الحد الأدنى للحركة

    if (Math.abs(diffX) > Math.abs(diffY)) {
      // حركة أفقية
      if (diffX > threshold) {
        this.trigger('swipeLeft');
      } else if (diffX < -threshold) {
        this.trigger('swipeRight');
      }
    } else {
      // حركة عمودية
      if (diffY > threshold) {
        this.trigger('swipeUp');
      } else if (diffY < -threshold) {
        this.trigger('swipeDown');
      }
    }
  }

  /**
   * كشف النقرات (Tap)
   */
  detectTap() {
    const diffX = Math.abs(this.touchStartX - this.touchEndX);
    const diffY = Math.abs(this.touchStartY - this.touchEndY);
    const threshold = 10; // الحد الأقصى للحركة

    if (diffX < threshold && diffY < threshold) {
      const currentTime = new Date().getTime();
      const tapLength = currentTime - this.lastTapTime;

      if (tapLength < 300 && tapLength > 0) {
        // نقرة مزدوجة
        this.trigger('doubleTap');
      } else {
        // نقرة عادية
        this.trigger('tap');
      }

      this.lastTapTime = currentTime;
    }
  }

  /**
   * إضافة مستمع لحدث معين
   * @param {string} event - اسم الحدث
   * @param {function} callback - دالة يتم استدعاؤها عند حدوث الحدث
   */
  on(event, callback) {
    if (this.listeners[event]) {
      this.listeners[event].push(callback);
    }
  }

  /**
   * إزالة مستمع
   * @param {string} event - اسم الحدث
   * @param {function} callback - الدالة المراد إزالتها
   */
  off(event, callback) {
    if (this.listeners[event]) {
      this.listeners[event] = this.listeners[event].filter(cb => cb !== callback);
    }
  }

  /**
   * تشغيل حدث
   * @param {string} event - اسم الحدث
   * @param {object} data - البيانات المرفقة بالحدث
   */
  trigger(event, data) {
    if (this.listeners[event]) {
      this.listeners[event].forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.error('خطأ في استدعاء المستمع:', error);
        }
      });
    }
  }
}

/**
 * مدير الاتجاه (Orientation Manager)
 */
class OrientationManager {
  constructor() {
    this.currentOrientation = this.detectOrientation();
    this.listeners = [];

    // مراقبة تغيير الاتجاه
    window.addEventListener('orientationchange', () => this.handleOrientationChange());
  }

  /**
   * كشف اتجاه الشاشة الحالي
   * @returns {string} - الاتجاه (portrait أو landscape)
   */
  detectOrientation() {
    if (window.innerHeight > window.innerWidth) {
      return 'portrait';
    } else {
      return 'landscape';
    }
  }

  /**
   * معالجة تغيير الاتجاه
   */
  handleOrientationChange() {
    const newOrientation = this.detectOrientation();

    if (newOrientation !== this.currentOrientation) {
      this.currentOrientation = newOrientation;
      this.notifyListeners();
    }
  }

  /**
   * الحصول على الاتجاه الحالي
   * @returns {string}
   */
  getOrientation() {
    return this.currentOrientation;
  }

  /**
   * التحقق من أن الاتجاه عمودي
   * @returns {boolean}
   */
  isPortrait() {
    return this.currentOrientation === 'portrait';
  }

  /**
   * التحقق من أن الاتجاه أفقي
   * @returns {boolean}
   */
  isLandscape() {
    return this.currentOrientation === 'landscape';
  }

  /**
   * إضافة مستمع لتغييرات الاتجاه
   * @param {function} listener - دالة يتم استدعاؤها عند تغيير الاتجاه
   */
  addListener(listener) {
    this.listeners.push(listener);
  }

  /**
   * إزالة مستمع
   * @param {function} listener - الدالة المراد إزالتها
   */
  removeListener(listener) {
    this.listeners = this.listeners.filter(l => l !== listener);
  }

  /**
   * إخطار المستمعين بالتغييرات
   */
  notifyListeners() {
    this.listeners.forEach(listener => {
      try {
        listener(this.currentOrientation);
      } catch (error) {
        console.error('خطأ في استدعاء المستمع:', error);
      }
    });
  }
}

/**
 * مدير الوصول (Accessibility Manager)
 */
class AccessibilityManager {
  /**
   * تحسين إمكانية الوصول للعناصر
   * @param {HTMLElement} element - العنصر المراد تحسينه
   * @param {object} options - خيارات الوصول
   */
  static makeAccessible(element, options = {}) {
    // إضافة role إذا لم يكن موجوداً
    if (options.role && !element.getAttribute('role')) {
      element.setAttribute('role', options.role);
    }

    // إضافة aria-label
    if (options.label) {
      element.setAttribute('aria-label', options.label);
    }

    // إضافة aria-describedby
    if (options.description) {
      element.setAttribute('aria-describedby', options.description);
    }

    // إضافة tabindex للعناصر التفاعلية
    if (options.focusable && !element.hasAttribute('tabindex')) {
      element.setAttribute('tabindex', '0');
    }

    // إضافة aria-disabled للعناصر المعطلة
    if (options.disabled) {
      element.setAttribute('aria-disabled', 'true');
    }
  }

  /**
   * إضافة دعم لوحة المفاتيح
   * @param {HTMLElement} element - العنصر
   * @param {function} callback - دالة يتم استدعاؤها عند الضغط على Enter أو Space
   */
  static addKeyboardSupport(element, callback) {
    element.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        callback();
      }
    });
  }

  /**
   * التحقق من دعم القارئ الصوتي
   * @returns {boolean}
   */
  static hasScreenReader() {
    return document.body.getAttribute('aria-live') !== null;
  }

  /**
   * إخطار القارئ الصوتي برسالة
   * @param {string} message - الرسالة
   * @param {string} priority - الأولوية (polite أو assertive)
   */
  static announceToScreenReader(message, priority = 'polite') {
    const announcement = document.createElement('div');
    announcement.setAttribute('aria-live', priority);
    announcement.setAttribute('aria-atomic', 'true');
    announcement.textContent = message;
    announcement.style.position = 'absolute';
    announcement.style.left = '-10000px';

    document.body.appendChild(announcement);

    setTimeout(() => {
      announcement.remove();
    }, 1000);
  }
}

/**
 * مدير الأداء على الأجهزة المحمولة (Mobile Performance)
 */
class MobilePerformance {
  /**
   * تعطيل الرسوميات الثقيلة على الأجهزة المحمولة
   */
  static optimizeForMobile() {
    const responsiveManager = new ResponsiveManager();

    if (responsiveManager.isMobile()) {
      // تعطيل الظلال والتأثيرات الثقيلة
      document.documentElement.style.setProperty('--shadow-enabled', 'none');

      // تقليل عدد الرسوميات المتحركة
      document.documentElement.style.setProperty('--animation-duration', '0.2s');

      // تعطيل الخلفيات الثقيلة
      const heavyElements = document.querySelectorAll('[data-heavy-bg]');
      heavyElements.forEach(el => {
        el.style.backgroundImage = 'none';
      });
    }
  }

  /**
   * تحسين استهلاك البطارية
   */
  static optimizeBattery() {
    // تقليل معدل التحديث
    if ('requestIdleCallback' in window) {
      requestIdleCallback(() => {
        // تنفيذ المهام غير الحرجة
      });
    }

    // تعطيل الحركات غير الضرورية
    if ('prefers-reduced-motion' in window.matchMedia) {
      const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      if (prefersReducedMotion) {
        document.documentElement.style.setProperty('--animation-enabled', 'false');
      }
    }
  }
}

// إنشاء مثيلات عامة
const responsiveManager = new ResponsiveManager();
const orientationManager = new OrientationManager();

// تصدير الفئات
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    ResponsiveManager,
    TouchManager,
    OrientationManager,
    AccessibilityManager,
    MobilePerformance,
    responsiveManager,
    orientationManager
  };
}
