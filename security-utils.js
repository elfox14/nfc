// security-utils.js - وظائف مساعدة آمنة لتجنب XSS

/**
 * تنظيف النصوص من HTML tags خطيرة
 * @param {string} text - النص المراد تنظيفه
 * @returns {string} - النص المنظف
 */
function sanitizeHTML(text) {
  if (!text) return "";
  const temp = document.createElement("div");
  temp.textContent = text;
  return temp.innerHTML;
}

/**
 * إنشاء عنصر بشكل آمن بدون innerHTML
 * @param {string} tag - اسم العنصر
 * @param {Object} attributes - الخصائص
 * @param {string|Node|Array} children - المحتوى
 * @returns {HTMLElement}
 */
function createElement(tag, attributes = {}, children = null) {
  const element = document.createElement(tag);

  // إضافة الخصائص
  Object.entries(attributes).forEach(([key, value]) => {
    if (key === "className") {
      element.className = value;
    } else if (key === "textContent") {
      element.textContent = value;
    } else if (key === "style" && typeof value === "object") {
      Object.assign(element.style, value);
    } else if (key.startsWith("data-")) {
      element.setAttribute(key, value);
    } else if (key.startsWith("on") && typeof value === "function") {
      const eventName = key.substring(2).toLowerCase();
      element.addEventListener(eventName, value);
    } else {
      element.setAttribute(key, value);
    }
  });

  // إضافة المحتوى
  if (children) {
    if (Array.isArray(children)) {
      children.forEach((child) => {
        if (child instanceof Node) {
          element.appendChild(child);
        } else if (typeof child === "string") {
          element.appendChild(document.createTextNode(child));
        }
      });
    } else if (children instanceof Node) {
      element.appendChild(children);
    } else if (typeof children === "string") {
      element.appendChild(document.createTextNode(children));
    }
  }

  return element;
}

/**
 * إنشاء عنصر بشكل آمن مع ميزات محسنة (Enhanced Safe Element Creator)
 * @param {string} tag - اسم العنصر (div, span, a, img, etc.)
 * @param {Object} options - خيارات العنصر
 * @param {string} options.className - اسم الـ class
 * @param {string} options.textContent - محتوى نصي آمن
 * @param {string} options.src - مصدر الصورة (يتم تعقيمه)
 * @param {string} options.href - رابط URL (يتم تعقيمه)
 * @param {string} options.alt - نص بديل للصور
 * @param {string} options.title - عنوان العنصر
 * @param {string} options.id - معرف العنصر
 * @param {Object} options.style - أنماط CSS كـ object
 * @param {Object} options.dataset - data attributes
 * @param {Array<Node|string>} options.children - العناصر الأبناء
 * @param {Object} options.attributes - أي attributes إضافية
 * @returns {HTMLElement}
 */
function createElementSafe(tag, options = {}) {
  const element = document.createElement(tag);

  // Class name
  if (options.className) {
    element.className = String(options.className);
  }

  // ID
  if (options.id) {
    element.id = String(options.id);
  }

  // Text content (XSS-safe)
  if (options.textContent) {
    element.textContent = String(options.textContent);
  }

  // Source for images/videos (sanitized)
  if (options.src) {
    const sanitized = sanitizeURL(options.src);
    if (sanitized) {
      element.src = sanitized;
    }
  }

  // Href for links (sanitized)
  if (options.href) {
    const sanitized = sanitizeURL(options.href);
    if (sanitized) {
      element.href = sanitized;
    }
  }

  // Alt text
  if (options.alt) {
    element.alt = String(options.alt);
  }

  // Title
  if (options.title) {
    element.title = String(options.title);
  }

  // Inline styles
  if (options.style && typeof options.style === 'object') {
    Object.entries(options.style).forEach(([property, value]) => {
      element.style[property] = String(value);
    });
  }

  // Data attributes
  if (options.dataset && typeof options.dataset === 'object') {
    Object.entries(options.dataset).forEach(([key, value]) => {
      element.dataset[key] = String(value);
    });
  }

  // Additional attributes
  if (options.attributes && typeof options.attributes === 'object') {
    Object.entries(options.attributes).forEach(([key, value]) => {
      element.setAttribute(key, String(value));
    });
  }

  // Children (can be strings or Nodes)
  if (options.children) {
    const childArray = Array.isArray(options.children) ? options.children : [options.children];
    childArray.forEach(child => {
      if (child instanceof Node) {
        element.appendChild(child);
      } else if (typeof child === 'string') {
        element.appendChild(document.createTextNode(child));
      }
    });
  }

  return element;
}


/**
 * التحقق من صحة URL
 * @param {string} url - الرابط
 * @returns {boolean}
 */
function isValidURL(url) {
  if (!url) return false;
  try {
    const urlObj = new URL(url, window.location.origin);
    return ["http:", "https:", "data:"].includes(urlObj.protocol);
  } catch {
    return false;
  }
}

/**
 * تنظيف URL من محتوى خطير
 * @param {string} url - الرابط
 * @returns {string|null}
 */
function sanitizeURL(url) {
  if (!url) return null;

  // منع javascript: و data: URLs الخطيرة (ماعدا data:image)
  if (url.toLowerCase().startsWith("javascript:")) {
    console.warn("Blocked dangerous URL:", url);
    return null;
  }

  if (
    url.toLowerCase().startsWith("data:") &&
    !url.toLowerCase().startsWith("data:image/")
  ) {
    console.warn("Blocked non-image data URL:", url);
    return null;
  }

  return url;
}

/**
 * عرض رسالة خطأ بشكل آمن
 * @param {string} message - رسالة الخطأ
 * @param {string} type - نوع الرسالة (error, success, warning)
 */
function showToast(message, type = "error") {
  const toast = createElement("div", {
    className: `toast toast-${type}`,
    role: "alert",
    "aria-live": "polite",
  });

  const icon = createElement("i", {
    className:
      type === "error"
        ? "fas fa-exclamation-circle"
        : type === "success"
          ? "fas fa-check-circle"
          : "fas fa-info-circle",
  });

  const text = createElement("span", { textContent: message });

  toast.appendChild(icon);
  toast.appendChild(text);

  // إضافة الـ toast إلى الصفحة
  let toastContainer = document.getElementById("toast-container");
  if (!toastContainer) {
    toastContainer = createElement("div", {
      id: "toast-container",
      style: {
        position: "fixed",
        top: "20px",
        right: "20px",
        zIndex: "10000",
      },
    });
    document.body.appendChild(toastContainer);
  }

  toastContainer.appendChild(toast);

  // إزالة بعد 5 ثوانٍ
  setTimeout(() => {
    toast.style.opacity = "0";
    setTimeout(() => toast.remove(), 300);
  }, 5000);
}

/**
 * معالجة الأخطاء وعرضها للمستخدم
 * @param {Error} error - الخطأ
 * @param {string} context - سياق الخطأ
 */
function handleError(error, context = "") {
  console.error(`Error in ${context}:`, error);

  let userMessage = "حدث خطأ غير متوقع. يرجى المحاولة مرة أخرى.";

  if (error.message.includes("network") || error.message.includes("fetch")) {
    userMessage = "خطأ في الاتصال بالخادم. يرجى التحقق من الإنترنت.";
  } else if (error.message.includes("timeout")) {
    userMessage = "انتهت مهلة الطلب. يرجى المحاولة مرة أخرى.";
  } else if (context) {
    userMessage = `خطأ في ${context}. ${error.message}`;
  }

  showToast(userMessage, "error");
}

// تصدير الوظائف للاستخدام في ملفات أخرى
if (typeof module !== "undefined" && module.exports) {
  module.exports = {
    sanitizeHTML,
    createElement,
    isValidURL,
    sanitizeURL,
    showToast,
    handleError,
  };
}
