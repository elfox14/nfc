/**
 * script-safe-fixes.js
 * إصلاحات آمنة للوظائف الحرجة في script.js
 *
 * استخدم هذه الوظائف لاستبدال الأجزاء غير الآمنة في الكود الأصلي
 */

// ==================== Phone Buttons - Safe Version ====================

/**
 * عرض أزرار الهاتف بشكل آمن (استبدال CardManager.renderPhoneButtons)
 */
function renderPhoneButtonsSafe(phones, parentContainerId) {
  if (!phones || !Array.isArray(phones)) return;

  const parentContainer = document.getElementById(parentContainerId);
  if (!parentContainer) return;

  // تنظيف الحاوية القديمة
  parentContainer.innerHTML = "";

  phones.forEach((phoneData) => {
    if (!phoneData || !phoneData.id || !phoneData.value) return;

    const placement = phoneData.placement || "front";
    const phoneId = phoneData.id;

    // إنشاء wrapper آمن
    const wrapper = createElement("div", {
      id: phoneId,
      className: `phone-button-wrapper draggable placed-on-${placement}`,
      "data-type": "phone",
      "data-phone-id": phoneId,
      "data-placement": placement,
      "data-control-id": phoneId,
      tabindex: "0",
      role: "button",
      "aria-label": `رقم الهاتف ${phoneData.value}`,
    });

    // إنشاء رابط الهاتف
    const phoneLink = createElement("a", {
      href: `tel:${phoneData.value.replace(/[^0-9+]/g, "")}`,
      className: "phone-button",
    });

    // أيقونة الهاتف
    const icon = createElement("i", {
      className: "fas fa-phone-alt",
      "aria-hidden": "true",
    });

    // رقم الهاتف (استخدام textContent للأمان)
    const span = createElement("span", {
      textContent: phoneData.value,
    });

    // زر النسخ
    const copyBtn = createElement("button", {
      className: "copy-btn no-export",
      title: "نسخ الرقم",
      "aria-label": `نسخ الرقم ${phoneData.value}`,
      onclick: (e) => {
        e.preventDefault();
        e.stopPropagation();

        // استخدام clipboard API الآمن
        if (navigator.clipboard && window.isSecureContext) {
          navigator.clipboard
            .writeText(phoneData.value)
            .then(() => {
              showToast("تم نسخ الرقم!", "success");
            })
            .catch((err) => {
              console.error("فشل نسخ الرقم:", err);
              showToast("فشل نسخ الرقم", "error");
            });
        } else {
          // Fallback للمتصفحات القديمة
          fallbackCopyToClipboard(phoneData.value);
        }
      },
    });

    const copyIcon = createElement("i", {
      className: "fas fa-copy",
      "aria-hidden": "true",
    });

    copyBtn.appendChild(copyIcon);

    // تجميع العناصر
    phoneLink.appendChild(icon);
    phoneLink.appendChild(span);
    phoneLink.appendChild(copyBtn);

    // منع التنقل الافتراضي
    phoneLink.addEventListener("click", (e) => {
      e.preventDefault();
      // يمكن إضافة تنقل آمن هنا إذا لزم الأمر
    });

    wrapper.appendChild(phoneLink);

    // إضافة hint للسحب والإفلات
    const hint = createElement("i", {
      className: "fas fa-arrows-alt dnd-hover-hint",
    });
    wrapper.appendChild(hint);

    parentContainer.appendChild(wrapper);

    // تفعيل السحب والإفلات (إذا كانت الوظيفة موجودة)
    if (typeof DragManager !== "undefined" && DragManager.makeDraggable) {
      DragManager.makeDraggable(`#${phoneId}`);
    }
  });
}

// ==================== QR Code Display - Safe Version ====================

/**
 * عرض QR Code بشكل آمن (استبدال CardManager.updateQrCodeDisplay)
 */
function updateQrCodeDisplaySafe(qrImage, qrWrapperId) {
  const qrWrapper = document.getElementById(qrWrapperId);
  if (!qrWrapper) {
    console.warn("QR wrapper not found:", qrWrapperId);
    return;
  }

  // تنظيف المحتوى القديم
  qrWrapper.innerHTML = "";

  if (!qrImage) {
    qrWrapper.style.display = "none";
    return;
  }

  // التحقق من صحة URL
  const safeUrl = sanitizeURL(qrImage);
  if (!safeUrl) {
    console.error("Invalid QR code URL:", qrImage);
    qrWrapper.style.display = "none";
    return;
  }

  // إنشاء صورة QR بشكل آمن
  const img = createElement("img", {
    src: safeUrl,
    alt: "QR Code",
    style: {
      width: "100%",
      height: "100%",
      borderRadius: "4px",
      objectFit: "contain",
    },
    onerror: () => {
      console.error("Failed to load QR code image");
      qrWrapper.style.display = "none";
      showToast("فشل تحميل رمز QR", "error");
    },
  });

  qrWrapper.appendChild(img);
  qrWrapper.style.display = "block";
}

// ==================== Social Links - Safe Version ====================

/**
 * عرض روابط التواصل الاجتماعي بشكل آمن
 */
function renderSocialLinksSafe(socialLinks, parentContainerId) {
  if (!socialLinks || !Array.isArray(socialLinks)) return;

  const parentContainer = document.getElementById(parentContainerId);
  if (!parentContainer) return;

  // تنظيف الحاوية
  parentContainer.innerHTML = "";

  socialLinks.forEach((linkData) => {
    if (!linkData || !linkData.platform || !linkData.value) return;

    const platform = linkData.platform;
    const placement = linkData.placement || "back";
    const linkId = linkData.id || `social-${platform}-${Date.now()}`;

    // إنشاء wrapper
    const wrapper = createElement("div", {
      id: linkId,
      className: `social-link-wrapper draggable placed-on-${placement}`,
      "data-type": "social",
      "data-platform": platform,
      "data-placement": placement,
      tabindex: "0",
      role: "link",
    });

    // الحصول على معلومات المنصة
    const platformInfo = getSocialPlatformInfo(platform);
    if (!platformInfo) return;

    // إنشاء الرابط
    const link = createElement("a", {
      href: buildSafeURL(platformInfo.urlPattern, linkData.value),
      className: "social-link-button",
      target: "_blank",
      rel: "noopener noreferrer",
      "aria-label": `${platformInfo.name}: ${linkData.value}`,
    });

    // أيقونة المنصة
    const icon = createElement("i", {
      className: platformInfo.iconClass,
      "aria-hidden": "true",
    });

    // النص
    const span = createElement("span", {
      textContent: linkData.value,
    });

    link.appendChild(icon);
    link.appendChild(span);
    wrapper.appendChild(link);

    parentContainer.appendChild(wrapper);

    // تفعيل السحب والإفلات
    if (typeof DragManager !== "undefined" && DragManager.makeDraggable) {
      DragManager.makeDraggable(`#${linkId}`);
    }
  });
}

// ==================== Helper Functions ====================

/**
 * نسخ نص إلى الحافظة (fallback للمتصفحات القديمة)
 */
function fallbackCopyToClipboard(text) {
  const textArea = createElement("textarea", {
    value: text,
    style: {
      position: "fixed",
      top: "0",
      left: "0",
      opacity: "0",
    },
  });

  document.body.appendChild(textArea);
  textArea.focus();
  textArea.select();

  try {
    const successful = document.execCommand("copy");
    if (successful) {
      showToast("تم نسخ النص!", "success");
    } else {
      showToast("فشل نسخ النص", "error");
    }
  } catch (err) {
    console.error("Fallback copy failed:", err);
    showToast("فشل نسخ النص", "error");
  }

  document.body.removeChild(textArea);
}

/**
 * الحصول على معلومات منصة التواصل الاجتماعي
 */
function getSocialPlatformInfo(platform) {
  const platforms = {
    facebook: {
      name: "Facebook",
      iconClass: "fab fa-facebook",
      urlPattern: "https://facebook.com/{value}",
    },
    instagram: {
      name: "Instagram",
      iconClass: "fab fa-instagram",
      urlPattern: "https://instagram.com/{value}",
    },
    twitter: {
      name: "Twitter",
      iconClass: "fab fa-twitter",
      urlPattern: "https://twitter.com/{value}",
    },
    linkedin: {
      name: "LinkedIn",
      iconClass: "fab fa-linkedin",
      urlPattern: "https://linkedin.com/in/{value}",
    },
    whatsapp: {
      name: "WhatsApp",
      iconClass: "fab fa-whatsapp",
      urlPattern: "https://wa.me/{value}",
    },
    telegram: {
      name: "Telegram",
      iconClass: "fab fa-telegram",
      urlPattern: "https://t.me/{value}",
    },
    tiktok: {
      name: "TikTok",
      iconClass: "fab fa-tiktok",
      urlPattern: "https://tiktok.com/@{value}",
    },
    youtube: {
      name: "YouTube",
      iconClass: "fab fa-youtube",
      urlPattern: "https://youtube.com/{value}",
    },
  };

  return platforms[platform] || null;
}

/**
 * بناء URL آمن من pattern
 */
function buildSafeURL(pattern, value) {
  if (!pattern || !value) return "#";

  // تنظيف القيمة من محارف خطيرة
  const cleanValue = sanitizeHTML(value.trim());
  const url = pattern.replace("{value}", encodeURIComponent(cleanValue));

  // التحقق من صحة URL النهائي
  return sanitizeURL(url) || "#";
}

/**
 * تحميل صورة بشكل آمن مع معالجة الأخطاء
 */
function loadImageSafe(url, alt = "") {
  return new Promise((resolve, reject) => {
    const safeUrl = sanitizeURL(url);
    if (!safeUrl) {
      reject(new Error("Invalid image URL"));
      return;
    }

    const img = createElement("img", {
      src: safeUrl,
      alt: alt,
      onload: () => resolve(img),
      onerror: () => reject(new Error("Failed to load image")),
    });
  });
}

/**
 * تحديث theme بشكل آمن
 */
function applyThemeSafe(themeData) {
  if (!themeData || typeof themeData !== "object") {
    console.error("Invalid theme data");
    return;
  }

  try {
    // تطبيق الألوان بشكل آمن
    Object.entries(themeData).forEach(([key, value]) => {
      const element = document.getElementById(key);
      if (element && typeof value === "string") {
        // التحقق من أن القيمة لون صحيح
        if (isValidColor(value)) {
          element.value = value;
          element.dispatchEvent(new Event("input", { bubbles: true }));
        }
      }
    });

    showToast("تم تطبيق المظهر بنجاح", "success");
  } catch (error) {
    handleError(error, "تطبيق المظهر");
  }
}

/**
 * التحقق من صحة قيمة اللون
 */
function isValidColor(color) {
  if (!color) return false;

  // Hex colors
  if (/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/.test(color)) return true;

  // RGB/RGBA colors
  if (/^rgba?\([\d\s,]+\)$/.test(color)) return true;

  // Named colors
  const namedColors = ["red", "blue", "green", "white", "black", "transparent"];
  if (namedColors.includes(color.toLowerCase())) return true;

  return false;
}

// ==================== Enhanced Error Handling ====================

/**
 * معالجة أخطاء API بشكل أفضل
 */
async function fetchWithErrorHandling(url, options = {}) {
  try {
    // إضافة timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000); // 30s timeout

    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    if (error.name === "AbortError") {
      handleError(new Error("انتهت مهلة الطلب"), "جلب البيانات");
    } else if (error.message.includes("Failed to fetch")) {
      handleError(new Error("خطأ في الاتصال بالخادم"), "جلب البيانات");
    } else {
      handleError(error, "جلب البيانات");
    }
    throw error;
  }
}

// ==================== Export for use ====================

// إذا كنت تستخدم modules
if (typeof module !== "undefined" && module.exports) {
  module.exports = {
    renderPhoneButtonsSafe,
    updateQrCodeDisplaySafe,
    renderSocialLinksSafe,
    fallbackCopyToClipboard,
    loadImageSafe,
    applyThemeSafe,
    fetchWithErrorHandling,
  };
}
