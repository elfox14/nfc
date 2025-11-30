"use strict";

const TourManager = {
  TOUR_SHOWN_KEY: "digitalCardTourShown_v5_desktop", // إصدار جديد خاص بسطح المكتب
  tour: null,

  init() {
    this.tour = new Shepherd.Tour({
      useModalOverlay: true,
      defaultStepOptions: {
        classes: "shepherd-theme-arrows",
        scrollTo: { behavior: "smooth", block: "center" },
        cancelIcon: {
          enabled: true,
          label: "إغلاق الجولة",
        },
        buttons: [
          {
            text: "السابق",
            action() {
              return this.back();
            },
          },
          {
            text: "التالي",
            action() {
              return this.next();
            },
          },
        ],
      },
    });

    // --- خطوات جديدة لواجهة سطح المكتب فقط ---
    const steps = [
      {
        id: "welcome",
        title: "مرحباً بك في المحرر!",
        text: "أهلاً بك في واجهة MC PRIME الاحترافية. لنبدأ جولة سريعة.",
        buttons: [
          {
            text: "لنبدأ!",
            action() {
              return this.next();
            },
          },
        ],
      },
      {
        id: "elements_panel",
        title: "1. لوحة العناصر",
        text: "هذه هي لوحتك الرئيسية. هنا يمكنك إضافة وتعديل *محتوى* بطاقتك (مثل اسمك، شعارك، وأرقام الهواتف).",
        attachTo: {
          element: ".pro-sidebar-right",
          on: "left",
        },
      },
      {
        id: "design_panel",
        title: "2. لوحة التصميم",
        text: "هنا يمكنك تغيير *الشكل العام* للبطاقة، مثل اختيار التصاميم الجاهزة، تغيير الخلفيات، أو تعديل التخطيط.",
        attachTo: {
          element: ".pro-sidebar-left",
          on: "right",
        },
      },
      {
        id: "canvas_drag",
        title: "3. منطقة المعاينة",
        text: "هنا تظهر بطاقتك. يمكنك النقر على أي عنصر (مثل الاسم) لتعديله، أو سحبه مباشرة لتغيير مكانه.",
        attachTo: { element: "#cards-wrapper", on: "top" },
      },
      {
        id: "actions_toolbar",
        title: "4. شريط الأدوات",
        text: "عندما يصبح تصميمك جاهزاً، استخدم هذا الشريط العلوي لحفظ التصميم في المعرض، تنزيله كصورة، أو مشاركة رابط الكارت.",
        attachTo: { element: ".pro-toolbar .toolbar-end", on: "bottom" },
      },
      {
        id: "finish",
        title: "أنت الآن جاهز!",
        text: "هذه هي الأساسيات. استمتع بتصميم بطاقتك الاحترافية.",
        buttons: [
          {
            text: "إنهاء",
            action() {
              return this.complete();
            },
          },
        ],
      },
    ];

    if (window.MobileUtils) {
      window.MobileUtils.configureTourSteps(steps);
    }
    steps.forEach((step) => this.tour.addStep(step));
  },

  start() {
    this.tour.start();
    localStorage.setItem(this.TOUR_SHOWN_KEY, "true");
  },
};

const UIManager = {
  init() {
    this.populateThemeThumbnails();
    this.populateSocialMediaOptions();
  },
  announce: (message) => {
    if (DOMElements.liveAnnouncer)
      DOMElements.liveAnnouncer.textContent = message;
  },

  populateThemeThumbnails() {
    const container = document.getElementById("theme-gallery");
    if (!container) {
      console.error("Theme gallery container not found.");
      return;
    }
    container.innerHTML = "";
    Object.entries(Config.THEMES).forEach(([key, theme]) => {
      const thumb = document.createElement("div");
      thumb.className = "theme-thumbnail";
      thumb.dataset.themeKey = key;
      thumb.title = theme.name;
      thumb.setAttribute("role", "button");
      thumb.setAttribute("tabindex", "0");
      thumb.setAttribute("aria-label", `اختيار تصميم ${theme.name}`);

      const previewDiv = document.createElement("div");
      previewDiv.className = "theme-preview";
      previewDiv.style.background = `linear-gradient(135deg, ${theme.gradient[0]}, ${theme.gradient[1]})`;

      const nameSpan = document.createElement("span");
      nameSpan.className = "theme-name";
      nameSpan.textContent = theme.name;

      thumb.appendChild(previewDiv);
      thumb.appendChild(nameSpan);
      thumb.addEventListener("keydown", (e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          CardManager.applyTheme(key);
        }
      });
      container.appendChild(thumb);
    });
  },

  setActiveThumbnail(themeKey) {
    document.querySelectorAll(".theme-thumbnail").forEach((thumb) => {
      thumb.classList.toggle("active", thumb.dataset.themeKey === themeKey);
    });
    const hiddenInput = document.getElementById("theme-select-input");
    if (hiddenInput) {
      hiddenInput.value = themeKey;
    }
  },

  populateSocialMediaOptions() {
    const select = document.getElementById("social-media-type");
    if (!select) {
      console.error("CRITICAL: #social-media-type element not found in DOM.");
      return;
    }
    select.innerHTML = Object.entries(Config.SOCIAL_PLATFORMS)
      .map(
        ([key, platform]) => `<option value="${key}">${platform.name}</option>`,
      )
      .join("");
  },

  populateBackgroundGallery(backgrounds = []) {
    const container = document.getElementById("background-gallery");
    if (!container) return;

    container.innerHTML = "";
    backgrounds.forEach((bg) => {
      const thumb = document.createElement("div");
      thumb.className = "background-thumbnail";
      thumb.title = bg.name;
      thumb.setAttribute("role", "button");
      thumb.setAttribute("tabindex", "0");

      const previewDiv = document.createElement("div");
      previewDiv.className = "background-preview";
      previewDiv.style.backgroundImage = `url('${bg.url}')`;

      const nameSpan = document.createElement("span");
      nameSpan.className = "background-name";
      nameSpan.textContent = bg.name;

      thumb.appendChild(previewDiv);
      thumb.appendChild(nameSpan);
      thumb.addEventListener("click", () =>
        CardManager.applyBackground(bg.url),
      );
      thumb.addEventListener("keydown", (e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          CardManager.applyBackground(bg.url);
        }
      });
      container.appendChild(thumb);
    });
  },

  async fetchAndPopulateBackgrounds() {
    const container = document.getElementById("background-gallery");
    if (!container) return;
    try {
      const response = await fetch(
        `${Config.API_BASE_URL}/api/gallery/backgrounds`,
      );
      if (!response.ok) throw new Error("Network response was not ok");

      const data = await response.json();

      if (data.success && data.items) {
        this.populateBackgroundGallery(data.items);
      } else {
        throw new Error("API response was not successful");
      }
    } catch (error) {
      console.error("Failed to fetch backgrounds:", error);
      container.innerHTML =
        '<p style="font-size: 12px; color: var(--text-secondary);">فشل تحميل معرض الخلفيات.</p>';
    }
  },

  async uploadImageToServer(file) {
    const formData = new FormData();
    formData.append("image", file);
    try {
      const response = await fetch(`${Config.API_BASE_URL}/api/upload-image`, {
        method: "POST",
        body: formData,
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Server error");
      }
      const result = await response.json();
      return result.url;
    } catch (error) {
      console.error("Image upload failed:", error);
      throw error;
    }
  },

  async handleImageUpload(event, { maxSizeMB, errorEl, spinnerEl, onSuccess }) {
    const file = event.target.files[0];
    errorEl.textContent = "";
    errorEl.style.display = "none";
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      errorEl.textContent = "الرجاء اختيار ملف صورة صالح.";
      errorEl.style.display = "block";
      Utils.playSound("error");
      return;
    }
    if (file.size > maxSizeMB * 1024 * 1024) {
      errorEl.textContent = `يجب أن يكون حجم الملف أقل من ${maxSizeMB} ميجابايت.`;
      errorEl.style.display = "block";
      Utils.playSound("error");
      return;
    }

    spinnerEl.style.display = "block";
    try {
      const imageUrl = await this.uploadImageToServer(file);
      Utils.playSound("success");
      onSuccess(imageUrl);
      this.announce("تم رفع الصورة ومعالجتها بنجاح.");
    } catch (error) {
      errorEl.textContent = "فشل رفع الصورة. حاول مرة أخرى.";
      errorEl.style.display = "block";
      Utils.playSound("error");
    } finally {
      spinnerEl.style.display = "none";
    }
  },

  showSaveNotification() {
    const toast = DOMElements.saveToast;
    if (!toast) return;
    toast.textContent = "جاري الحفظ...";
    toast.classList.add("show");
    StateManager.save();
    setTimeout(() => {
      toast.textContent = "تم الحفظ ✓";
      UIManager.announce("تم حفظ التغييرات تلقائيًا");
      setTimeout(() => {
        toast.classList.remove("show");
      }, 3000);
    }, 500);
  },

  updateFavicon(url) {
    if (url) document.getElementById("favicon").href = url;
  },
  highlightElement(targetId, state) {
    const targetElement = document.getElementById(targetId);
    if (targetElement) {
      targetElement.classList.toggle("highlighted", state);
      if (
        targetElement.classList.contains("phone-button-draggable-wrapper") ||
        targetElement.classList.contains("draggable-social-link")
      ) {
        targetElement.querySelector("a").classList.toggle("highlighted", state);
      }
    }
  },

  navigateToAndHighlight(elementId) {
    const targetElement = document.getElementById(elementId);
    if (!targetElement) {
      console.warn(`Element with ID "${elementId}" not found.`);
      return;
    }

    // 1. فتح الأكورديون (Accordion) والتركيز التلقائي
    const parentAccordion = targetElement.closest("details");
    if (parentAccordion) {
      const sidebar = parentAccordion.closest(".pro-sidebar");
      if (sidebar) {
        const siblings = sidebar.querySelectorAll("details.fieldset-accordion");
        siblings.forEach((acc) => {
          if (acc !== parentAccordion) {
            acc.removeAttribute("open");
          }
        });
      }
      parentAccordion.open = true;
    }

    // 2. التمرير إلى العنصر وتظليله
    setTimeout(() => {
      const highlightTarget =
        targetElement.closest(".fieldset") ||
        targetElement.closest(".form-group") ||
        targetElement.closest(".dynamic-input-group") ||
        targetElement;

      const scrollContainer = highlightTarget.closest(".pro-sidebar");

      if (scrollContainer) {
        const targetTop = highlightTarget.offsetTop;
        scrollContainer.scrollTo({
          top: targetTop - 60, // تمرير إلى أعلى العنصر مع هامش
          behavior: "smooth",
        });
      } else {
        highlightTarget.scrollIntoView({ behavior: "smooth", block: "center" });
      }

      highlightTarget.classList.add("form-element-highlighted");
      setTimeout(() => {
        highlightTarget.classList.remove("form-element-highlighted");
      }, 2000);
    }, 150);
  },

  trapFocus(modalElement) {
    const focusableElements = modalElement.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
    );
    const firstElement = focusableElements[0];
    const lastElement = focusableElements[focusableElements.length - 1];
    const handleTabKeyPress = (e) => {
      if (e.key !== "Tab") return;
      if (e.shiftKey) {
        if (document.activeElement === firstElement) {
          e.preventDefault();
          lastElement.focus();
        }
      } else {
        if (document.activeElement === lastElement) {
          e.preventDefault();
          firstElement.focus();
        }
      }
    };
    modalElement.addEventListener("keydown", handleTabKeyPress);
    firstElement?.focus();
    return handleTabKeyPress;
  },
  showModal(modalOverlay, triggerElement) {
    modalOverlay.classList.add("visible");
    modalOverlay.dataset.triggerElementId = triggerElement?.id;
    if (triggerElement) {
      triggerElement.setAttribute("aria-expanded", "true");
    }
    const eventListener = this.trapFocus(modalOverlay);
    focusTrapListeners.set(modalOverlay, eventListener);
  },
  hideModal(modalOverlay) {
    modalOverlay.classList.remove("visible");
    const triggerElementId = modalOverlay.dataset.triggerElementId;
    const triggerElement = document.getElementById(triggerElementId);
    if (triggerElement) {
      triggerElement.setAttribute("aria-expanded", "false");
      triggerElement.focus();
    }
    const eventListener = focusTrapListeners.get(modalOverlay);
    if (eventListener) {
      modalOverlay.removeEventListener("keydown", eventListener);
      focusTrapListeners.delete(modalOverlay);
    }
  },
  setupDragDrop(dropZoneId, fileInputId) {
    const dropZone = document.getElementById(dropZoneId);
    const fileInput = document.getElementById(fileInputId);
    if (!dropZone || !fileInput) return;
    ["dragenter", "dragover", "dragleave", "drop"].forEach((eventName) => {
      dropZone.addEventListener(eventName, (e) => {
        e.preventDefault();
        e.stopPropagation();
      });
    });
    ["dragenter", "dragover"].forEach((eventName) => {
      dropZone.addEventListener(eventName, () =>
        dropZone.classList.add("drag-over"),
      );
    });
    ["dragleave", "drop"].forEach((eventName) => {
      dropZone.addEventListener(eventName, () =>
        dropZone.classList.remove("drag-over"),
      );
    });
    dropZone.addEventListener("drop", (e) => {
      if (e.dataTransfer.files.length) {
        fileInput.files = e.dataTransfer.files;
        fileInput.dispatchEvent(new Event("change", { bubbles: true }));
      }
    });
  },
  setButtonLoadingState(button, isLoading, text = "جاري التحميل...") {
    if (!button) return;
    const span = button.querySelector("span");
    const originalText =
      button.dataset.originalText || (span ? span.textContent : "");
    if (!button.dataset.originalText && span)
      button.dataset.originalText = originalText;
    if (isLoading) {
      button.disabled = true;
      button.classList.add("loading");
      if (span) span.textContent = text;
    } else {
      button.disabled = false;
      button.classList.remove("loading");
      if (span) span.textContent = originalText;
    }
  },
};