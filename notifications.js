/**
 * Notifications System - نظام الإشعارات (Toast Notifications)
 * 
 * يوفر هذا الملف نظاماً لعرض إشعارات مرئية للمستخدم
 * بأنواع مختلفة (نجاح، خطأ، تحذير، معلومات)
 */

class NotificationManager {
  /**
   * إنشاء مدير الإشعارات
   * @param {object} options - خيارات الإعدادات
   */
  constructor(options = {}) {
    this.container = null;
    this.notifications = [];
    this.defaultDuration = options.defaultDuration || 3000;
    this.maxNotifications = options.maxNotifications || 5;
    this.position = options.position || 'top-right'; // top-right, top-left, bottom-right, bottom-left
    
    this.init();
  }

  /**
   * تهيئة نظام الإشعارات
   */
  init() {
    // إنشاء حاوية الإشعارات
    this.container = document.createElement('div');
    this.container.id = 'notification-container';
    this.container.className = `notification-container notification-${this.position}`;
    this.container.style.cssText = `
      position: fixed;
      ${this.position.includes('top') ? 'top: 20px;' : 'bottom: 20px;'}
      ${this.position.includes('right') ? 'right: 20px;' : 'left: 20px;'}
      z-index: 9999;
      display: flex;
      flex-direction: column;
      gap: 10px;
      max-width: 400px;
      pointer-events: none;
    `;

    document.body.appendChild(this.container);

    // إضافة أنماط CSS
    this.addStyles();
  }

  /**
   * إضافة أنماط CSS للإشعارات
   */
  addStyles() {
    if (document.getElementById('notification-styles')) {
      return; // تم إضافة الأنماط بالفعل
    }

    const style = document.createElement('style');
    style.id = 'notification-styles';
    style.textContent = `
      .notification {
        display: flex;
        align-items: center;
        gap: 12px;
        padding: 16px;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        animation: slideIn 0.3s ease-out;
        pointer-events: auto;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
        font-size: 14px;
        line-height: 1.5;
        max-width: 100%;
        word-wrap: break-word;
      }

      .notification.success {
        background-color: #10b981;
        color: white;
        border-left: 4px solid #059669;
      }

      .notification.error {
        background-color: #ef4444;
        color: white;
        border-left: 4px solid #dc2626;
      }

      .notification.warning {
        background-color: #f59e0b;
        color: white;
        border-left: 4px solid #d97706;
      }

      .notification.info {
        background-color: #3b82f6;
        color: white;
        border-left: 4px solid #1d4ed8;
      }

      .notification-icon {
        flex-shrink: 0;
        font-size: 20px;
        width: 24px;
        height: 24px;
        display: flex;
        align-items: center;
        justify-content: center;
      }

      .notification-content {
        flex: 1;
        display: flex;
        flex-direction: column;
        gap: 4px;
      }

      .notification-title {
        font-weight: 600;
      }

      .notification-message {
        font-size: 13px;
        opacity: 0.95;
      }

      .notification-close {
        flex-shrink: 0;
        background: none;
        border: none;
        color: inherit;
        cursor: pointer;
        font-size: 18px;
        padding: 0;
        opacity: 0.7;
        transition: opacity 0.2s;
      }

      .notification-close:hover {
        opacity: 1;
      }

      .notification-progress {
        position: absolute;
        bottom: 0;
        left: 0;
        height: 3px;
        background-color: rgba(255, 255, 255, 0.5);
        animation: progress linear;
      }

      @keyframes slideIn {
        from {
          opacity: 0;
          transform: translateX(100%);
        }
        to {
          opacity: 1;
          transform: translateX(0);
        }
      }

      @keyframes slideOut {
        from {
          opacity: 1;
          transform: translateX(0);
        }
        to {
          opacity: 0;
          transform: translateX(100%);
        }
      }

      @keyframes progress {
        from {
          width: 100%;
        }
        to {
          width: 0%;
        }
      }

      .notification.removing {
        animation: slideOut 0.3s ease-in forwards;
      }

      @media (max-width: 640px) {
        .notification-container {
          max-width: calc(100vw - 40px) !important;
        }

        .notification {
          font-size: 13px;
          padding: 12px;
        }
      }
    `;

    document.head.appendChild(style);
  }

  /**
   * عرض إشعار نجاح
   * @param {string} message - رسالة الإشعار
   * @param {string} title - عنوان الإشعار (اختياري)
   * @param {number} duration - مدة الإشعار بالميلي ثانية
   */
  success(message, title = 'نجاح', duration = this.defaultDuration) {
    return this.show(message, 'success', title, duration);
  }

  /**
   * عرض إشعار خطأ
   * @param {string} message - رسالة الإشعار
   * @param {string} title - عنوان الإشعار (اختياري)
   * @param {number} duration - مدة الإشعار بالميلي ثانية
   */
  error(message, title = 'خطأ', duration = this.defaultDuration) {
    return this.show(message, 'error', title, duration);
  }

  /**
   * عرض إشعار تحذير
   * @param {string} message - رسالة الإشعار
   * @param {string} title - عنوان الإشعار (اختياري)
   * @param {number} duration - مدة الإشعار بالميلي ثانية
   */
  warning(message, title = 'تحذير', duration = this.defaultDuration) {
    return this.show(message, 'warning', title, duration);
  }

  /**
   * عرض إشعار معلومات
   * @param {string} message - رسالة الإشعار
   * @param {string} title - عنوان الإشعار (اختياري)
   * @param {number} duration - مدة الإشعار بالميلي ثانية
   */
  info(message, title = 'معلومة', duration = this.defaultDuration) {
    return this.show(message, 'info', title, duration);
  }

  /**
   * عرض إشعار
   * @param {string} message - رسالة الإشعار
   * @param {string} type - نوع الإشعار (success, error, warning, info)
   * @param {string} title - عنوان الإشعار
   * @param {number} duration - مدة الإشعار بالميلي ثانية
   */
  show(message, type = 'info', title = '', duration = this.defaultDuration) {
    // إذا تجاوزنا الحد الأقصى، احذف الإشعار الأقدم
    if (this.notifications.length >= this.maxNotifications) {
      const oldestNotification = this.notifications.shift();
      oldestNotification.element.remove();
    }

    // إنشاء عنصر الإشعار
    const notificationElement = document.createElement('div');
    notificationElement.className = `notification ${type}`;
    notificationElement.style.position = 'relative';

    // الرموز المختلفة لكل نوع
    const icons = {
      success: '✓',
      error: '✕',
      warning: '⚠',
      info: 'ℹ'
    };

    // بناء محتوى الإشعار
    notificationElement.innerHTML = `
      <div class="notification-icon">${icons[type] || icons.info}</div>
      <div class="notification-content">
        ${title ? `<div class="notification-title">${this.escapeHTML(title)}</div>` : ''}
        <div class="notification-message">${this.escapeHTML(message)}</div>
      </div>
      <button class="notification-close" aria-label="إغلاق">×</button>
    `;

    // إضافة شريط التقدم إذا كانت هناك مدة
    if (duration > 0) {
      const progressBar = document.createElement('div');
      progressBar.className = 'notification-progress';
      progressBar.style.animation = `progress ${duration}ms linear`;
      notificationElement.appendChild(progressBar);
    }

    // إضافة مستمع لزر الإغلاق
    const closeButton = notificationElement.querySelector('.notification-close');
    closeButton.addEventListener('click', () => {
      this.removeNotification(notificationElement, notification);
    });

    // إضافة الإشعار إلى الحاوية
    this.container.appendChild(notificationElement);

    // حفظ بيانات الإشعار
    const notification = {
      element: notificationElement,
      type: type,
      message: message,
      title: title,
      timeout: null
    };

    this.notifications.push(notification);

    // إزالة الإشعار تلقائياً بعد المدة المحددة
    if (duration > 0) {
      notification.timeout = setTimeout(() => {
        this.removeNotification(notificationElement, notification);
      }, duration);
    }

    return notification;
  }

  /**
   * إزالة إشعار
   * @param {HTMLElement} element - عنصر الإشعار
   * @param {object} notification - بيانات الإشعار
   */
  removeNotification(element, notification) {
    // إلغاء المؤقت إن وجد
    if (notification.timeout) {
      clearTimeout(notification.timeout);
    }

    // إضافة تأثير الإزالة
    element.classList.add('removing');

    // إزالة العنصر بعد انتهاء التأثير
    setTimeout(() => {
      element.remove();
      this.notifications = this.notifications.filter(n => n !== notification);
    }, 300);
  }

  /**
   * إزالة جميع الإشعارات
   */
  clearAll() {
    this.notifications.forEach(notification => {
      if (notification.timeout) {
        clearTimeout(notification.timeout);
      }
      notification.element.remove();
    });
    this.notifications = [];
  }

  /**
   * تحويل النص إلى HTML آمن
   * @param {string} text - النص المراد تحويله
   * @returns {string} - النص الآمن
   */
  escapeHTML(text) {
    const map = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#039;'
    };
    return text.replace(/[&<>"']/g, char => map[char]);
  }
}

// إنشاء مثيل عام من مدير الإشعارات
const notificationManager = new NotificationManager({
  defaultDuration: 3000,
  maxNotifications: 5,
  position: 'top-right'
});

// تصدير الفئة والمثيل
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    NotificationManager,
    notificationManager
  };
}
