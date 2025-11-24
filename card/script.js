// script.js

(function () {
  "use strict";

  const Config = {
    API_BASE_URL: "https://nfc-vjy6.onrender.com",
    LOCAL_STORAGE_KEY: "digitalCardEditorState_v19",
    DND_HINT_SHOWN_KEY: "dndHintShown_v1",
    GALLERY_STORAGE_KEY: "digitalCardGallery_v1",
    MAX_LOGO_SIZE_MB: 10,
    MAX_BG_SIZE_MB: 10,
    SCRIPT_URLS: {
      html2canvas:
        "https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js",
      jspdf:
        "https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js",
      qrcode:
        "https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js",
      jszip: "https://cdnjs.cloudflare.com/ajax/libs/jszip/3.1.0/jszip.min.js",
    },
    defaultState: {
      inputs: {
        "layout-select": "classic",
        "input-logo": "https://www.mcprim.com/nfc/mcprime-logo-transparent.png",
        "logo-size": "25",
        "logo-opacity": "1",
        "input-photo-url": "",
        "photo-size": "25",
        "photo-shape": "circle",
        "photo-border-color": "#ffffff",
        "photo-border-width": "2",
        "input-name": "اسمك الكامل هنا",
        "name-font-size": "22",
        "name-color": "#e6f0f7",
        "name-font": "'Tajawal', sans-serif",
        "input-tagline": "شركتك / نشاطك التجاري",
        "tagline-font-size": "14",
        "tagline-color": "#4da6ff",
        "tagline-font": "'Tajawal', sans-serif",
        "toggle-phone-buttons": true,
        "phone-text-layout": "row",
        "phone-text-size": "14",
        "phone-text-color": "#e6f0f7",
        "phone-text-font": "'Tajawal', sans-serif",
        "phone-btn-bg-color": "#4da6ff",
        "phone-btn-text-color": "#ffffff",
        "phone-btn-font-size": "12",
        "phone-btn-padding": "6",
        "phone-btn-font": "'Poppins', sans-serif",
        "front-bg-start": "#2a3d54",
        "front-bg-end": "#223246",
        "front-bg-opacity": "1",
        "qr-source": "auto-vcard",
        "input-qr-url": "https://www.mcprim.com/nfc/mcprime_qr.png",
        "qr-size": "30",
        "back-bg-start": "#2a3d54",
        "back-bg-end": "#223246",
        "back-bg-opacity": "1",
        "back-buttons-size": "10",
        "back-buttons-bg-color": "#364f6b",
        "back-buttons-text-color": "#aab8c2",
        "back-buttons-font": "'Poppins', sans-serif",
        "theme-select-input": "deep-sea",
        "toggle-social-buttons": true,
        "social-text-size": "12",
        "social-text-color": "#e6f0f7",
        "social-text-font": "'Tajawal', sans-serif",
      },
      dynamic: {
        phones: [
          {
            id: `phone_${Date.now()}_0`,
            value: "01000000000",
            placement: "front",
          },
          {
            id: `phone_${Date.now()}_1`,
            value: "01200000000",
            placement: "front",
          },
        ],
        social: [],
        staticSocial: {
          email: { value: "your-email@example.com", placement: "back" },
          website: { value: "your-website.com", placement: "back" },
          whatsapp: { value: "201000000000", placement: "back" },
          facebook: { value: "yourprofile", placement: "back" },
          linkedin: { value: "yourprofile", placement: "back" },
        },
      },
      imageUrls: { front: null, back: null, qrCode: null, photo: null },
      positions: {
        "card-logo": { x: 0, y: 0 },
        "card-personal-photo-wrapper": { x: 0, y: 0 },
        "card-name": { x: 0, y: 0 },
        "card-tagline": { x: 0, y: 0 },
        "qr-code-wrapper": { x: 0, y: 0 },
      },
      placements: {
        logo: "front",
        photo: "front",
        name: "front",
        tagline: "front",
        qr: "back",
      },
    },
    THEMES: {
      "deep-sea": {
        name: "بحر عميق",
        gradient: ["#2a3d54", "#223246"],
        values: {
          textPrimary: "#e6f0f7",
          taglineColor: "#4da6ff",
          backButtonBg: "#364f6b",
          backButtonText: "#aab8c2",
          phoneBtnBg: "#4da6ff",
          phoneBtnText: "#ffffff",
        },
      },
      "modern-light": {
        name: "أبيض حديث",
        gradient: ["#e9e9e9", "#ffffff"],
        values: {
          textPrimary: "#121212",
          taglineColor: "#007BFF",
          backButtonBg: "#f0f2f5",
          backButtonText: "#343a40",
          phoneBtnBg: "#007BFF",
          phoneBtnText: "#ffffff",
        },
      },
      "forest-whisper": {
        name: "همس الغابة",
        gradient: ["#234d20", "#364935"],
        values: {
          textPrimary: "#f0f3f0",
          taglineColor: "#77ab59",
          backButtonBg: "#4a785f",
          backButtonText: "#f0f3f0",
          phoneBtnBg: "#77ab59",
          phoneBtnText: "#f0f3f0",
        },
      },
      "sunset-gradient": {
        name: "غروب الشمس",
        gradient: ["#ff8c42", "#ff5f6d"],
        values: {
          textPrimary: "#ffffff",
          taglineColor: "#ffcc80",
          backButtonBg: "#c44d56",
          backButtonText: "#ffffff",
          phoneBtnBg: "rgba(255,255,255,0.2)",
          phoneBtnText: "#ffffff",
        },
      },
      "corporate-elegance": {
        name: "أناقة الشركات",
        gradient: ["#f8f9fa", "#e9ecef"],
        values: {
          textPrimary: "#212529",
          taglineColor: "#0056b3",
          backButtonBg: "#343a40",
          backButtonText: "#ffffff",
          phoneBtnBg: "#0056b3",
          phoneBtnText: "#ffffff",
        },
      },
      "night-neon": {
        name: "النيون الليلي",
        gradient: ["#0d0d0d", "#1a1a1a"],
        values: {
          textPrimary: "#f0f0f0",
          taglineColor: "#39ff14",
          backButtonBg: "#222222",
          backButtonText: "#00ffdd",
          phoneBtnBg: "transparent",
          phoneBtnText: "#39ff14",
        },
      },
    },
    BACKGROUNDS: [], // تم حذف مصفوفة الخلفيات الثابتة من هنا. سيتم الآن تحميلها من قاعدة البيانات
    SOCIAL_PLATFORMS: {
      instagram: {
        name: "انستغرام",
        icon: "fab fa-instagram",
        prefix: "https://instagram.com/",
      },
      x: { name: "X (تويتر)", icon: "fab fa-xing", prefix: "https://x.com/" },
      telegram: {
        name: "تيليجرام",
        icon: "fab fa-telegram",
        prefix: "https://t.me/",
      },
      tiktok: {
        name: "تيك توك",
        icon: "fab fa-tiktok",
        prefix: "https://tiktok.com/@",
      },
      snapchat: {
        name: "سناب شات",
        icon: "fab fa-snapchat",
        prefix: "https://snapchat.com/add/",
      },
      youtube: {
        name: "يوتيوب",
        icon: "fab fa-youtube",
        prefix: "https://youtube.com/",
      },
      pinterest: {
        name: "بينترست",
        icon: "fab fa-pinterest",
        prefix: "https://pinterest.com/",
      },
    },
    STATIC_CONTACT_METHODS: [
      { id: "whatsapp", icon: "fab fa-whatsapp", prefix: "https://wa.me/" },
      { id: "email", icon: "fas fa-envelope", prefix: "mailto:" },
      { id: "website", icon: "fas fa-globe" },
      { id: "facebook", icon: "fab fa-facebook-f" },
      { id: "linkedin", icon: "fab fa-linkedin-in" },
    ],
  };
  const DOMElements = {};
  const loadedScripts = new Set();
  const Utils = {
    debounce: (func, delay = 250) => {
      let timeoutId;
      return (...args) => {
        clearTimeout(timeoutId);
        timeoutId = setTimeout(() => func.apply(this, args), delay);
      };
    },
    playSound: (soundId) => {
      const audioEl = DOMElements.sounds[soundId];
      if (audioEl) {
        audioEl.currentTime = 0;
        audioEl.play().catch((e) => console.error("Audio play failed:", e));
      }
    },
    async copyTextToClipboard(text) {
      try {
        if (navigator.clipboard && window.isSecureContext) {
          await navigator.clipboard.writeText(text);
        } else {
          const textArea = document.createElement("textarea");
          textArea.value = text;
          textArea.style.position = "absolute";
          textArea.style.left = "-999999px";
          document.body.prepend(textArea);
          textArea.select();
          document.execCommand("copy");
          textArea.remove();
        }
        return true;
      } catch (error) {
        console.error("فشل النسخ إلى الحافظة:", error);
        return false;
      }
    },
    loadScript(url) {
      if (loadedScripts.has(url)) {
        return Promise.resolve();
      }
      return new Promise((resolve, reject) => {
        const script = document.createElement("script");
        script.src = url;
        script.onload = () => {
          loadedScripts.add(url);
          resolve();
        };
        script.onerror = () =>
          reject(new Error(`Failed to load script: ${url}`));
        document.head.appendChild(script);
      });
    },
  };

  let hintTimeout;

  const HistoryManager = {
    history: [],
    currentIndex: -1,
    maxHistory: 30,

    pushState(state) {
      if (this.currentIndex < this.history.length - 1) {
        this.history.splice(this.currentIndex + 1);
      }
      if (
        this.history.length > 0 &&
        JSON.stringify(state) ===
          JSON.stringify(this.history[this.history.length - 1])
      ) {
        return;
      }
      this.history.push(JSON.parse(JSON.stringify(state)));
      if (this.history.length > this.maxHistory) {
        this.history.shift();
      }
      this.currentIndex = this.history.length - 1;
      this.updateButtonStates();
    },

    undo() {
      if (this.currentIndex > 0) {
        this.currentIndex--;
        const state = JSON.parse(
          JSON.stringify(this.history[this.currentIndex]),
        );
        StateManager.applyState(state, false);
        this.updateButtonStates();
      }
    },

    redo() {
      if (this.currentIndex < this.history.length - 1) {
        this.currentIndex++;
        const state = JSON.parse(
          JSON.stringify(this.history[this.currentIndex]),
        );
        StateManager.applyState(state, false);
        this.updateButtonStates();
      }
    },

    updateButtonStates() {
      DOMElements.buttons.undoBtn.disabled = this.currentIndex <= 0;
      DOMElements.buttons.redoBtn.disabled =
        this.currentIndex >= this.history.length - 1;
    },
  };

  const TabManager = {
    init(navSelector, buttonSelector) {
      const nav = document.querySelector(navSelector);
      if (!nav) return;

      const buttons = nav.querySelectorAll(buttonSelector);
      const panes = document.querySelectorAll(".tab-pane");

      nav.addEventListener("click", (e) => {
        const button = e.target.closest(buttonSelector);
        if (button) {
          const targetId = button.dataset.tabTarget;
          this.switchTab(targetId, button, buttons, panes);
        }
      });
    },
    switchTab(targetId, clickedButton, allButtons, allPanes) {
      allButtons.forEach((btn) => btn.classList.remove("active"));
      allPanes.forEach((pane) => pane.classList.remove("active"));

      clickedButton.classList.add("active");
      const targetPane = document.getElementById(targetId);
      if (targetPane) {
        targetPane.classList.add("active");
      }
    },
  };

  const TourManager = {
    TOUR_SHOWN_KEY: "digitalCardTourShown_v4",
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

      const steps = [
        {
          id: "welcome",
          title: "مرحباً بك في MC PRIME!",
          text: "أهلاً بك في محرر بطاقات الأعمال الذكية. دعنا نأخذك في جولة سريعة لتتعرف على أهم الميزات.",
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
          id: "controls",
          title: "1. لوحة التحكم",
          text: "من هنا يمكنك تعديل كل شيء في بطاقتك. استخدم هذه القوائم لتغيير النصوص، الشعار، الألوان، والخلفيات.",
          attachTo: { element: ".actions-column", on: "right" },
        },
        {
          id: "preview",
          title: "2. المعاينة الحية والتفاعلية",
          text: "شاهد تعديلاتك تظهر هنا فوراً. <b>الأهم:</b> يمكنك الضغط على الشعار أو النصوص وسحبها لتغيير مكانها مباشرة على البطاقة!",
          attachTo: { element: ".cards-wrapper", on: "top" },
        },
        {
          id: "actions",
          title: "3. الحفظ والمشاركة",
          text: "عندما يصبح تصميمك جاهزاً، استخدم هذه الخيارات لحفظه كصورة، ملف PDF، أو مشاركة رابط فريد لبطاقتك مع الآخرين.",
          attachTo: { element: "#export-fieldset-source", on: "left" },
        },
        {
          id: "finish",
          title: "أنت الآن جاهز!",
          text: 'هذه هي الأساسيات. استمتع بتصميم بطاقتك الاحترافية. يمكنك إعادة هذه الجولة في أي وقت بالضغط على زر "جولة إرشادية".',
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

      if (window.innerWidth <= 1200) {
        steps[1].attachTo = { element: ".controls-column", on: "top" };
        steps[3].attachTo = { element: "#export-fieldset-source", on: "top" };
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
        thumb.innerHTML = `
                    <div class="theme-preview" style="background: linear-gradient(135deg, ${theme.gradient[0]}, ${theme.gradient[1]});"></div>
                    <span class="theme-name">${theme.name}</span>
                `;
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
          ([key, platform]) =>
            `<option value="${key}">${platform.name}</option>`,
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
        thumb.innerHTML = `
                    <div class="background-preview" style="background-image: url('${bg.url}');"></div>
                    <span class="background-name">${bg.name}</span>
                `;
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
        const response = await fetch(
          `${Config.API_BASE_URL}/api/upload-image`,
          {
            method: "POST",
            body: formData,
          },
        );
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

    async handleImageUpload(
      event,
      { maxSizeMB, errorEl, spinnerEl, onSuccess },
    ) {
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
        }, 1500);
      }, 500);
    },
    updateFavicon(url) {
      if (url) document.getElementById("favicon").href = url;
    },
    highlightElement(targetId, state) {
      const el = document.getElementById(targetId);
      if (el) el.classList.toggle("highlighted", state);
    },

    navigateToAndHighlight(elementId) {
      const targetElement = document.getElementById(elementId);
      if (!targetElement) {
        console.warn(`Element with ID "${elementId}" not found.`);
        return;
      }

      const parentPane = targetElement.closest(".tab-pane");
      if (parentPane && !parentPane.classList.contains("active")) {
        const paneId = parentPane.id;
        const isMobile = window.innerWidth <= 1200;

        const buttonSelector = isMobile
          ? `.mobile-tab-btn[data-tab-target="${paneId}"]`
          : `.desktop-tab-btn[data-tab-target="${paneId}"]`;

        const buttonToClick = document.querySelector(buttonSelector);

        if (buttonToClick) {
          const allButtonsSelector = isMobile
            ? ".mobile-tab-btn"
            : ".desktop-tab-btn";
          const allButtons = document.querySelectorAll(allButtonsSelector);
          const allPanes = document.querySelectorAll(".tab-pane");
          TabManager.switchTab(paneId, buttonToClick, allButtons, allPanes);
        }
      }

      const parentAccordion = targetElement.closest("details");
      if (parentAccordion && !parentAccordion.open) {
        parentAccordion.open = true;
      }

      setTimeout(() => {
        const highlightTarget =
          targetElement.closest(".fieldset") ||
          targetElement.closest(".form-group") ||
          targetElement.closest(".dynamic-input-group") ||
          targetElement;
        highlightTarget.scrollIntoView({ behavior: "smooth", block: "center" });
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
      modalOverlay.dataset.focusTrapListener = eventListener;
    },
    hideModal(modalOverlay) {
      modalOverlay.classList.remove("visible");
      const triggerElementId = modalOverlay.dataset.triggerElementId;
      const triggerElement = document.getElementById(triggerElementId);
      if (triggerElement) {
        triggerElement.setAttribute("aria-expanded", "false");
        triggerElement.focus();
      }
      const eventListener = modalOverlay.dataset.focusTrapListener;
      if (eventListener) {
        modalOverlay.removeEventListener("keydown", eventListener);
      }
    },
    toggleDirection() {
      const html = document.documentElement;
      const btn = DOMElements.buttons.directionToggle;
      const span = btn.querySelector("span");
      if (html.dir === "rtl") {
        html.dir = "ltr";
        html.classList.add("ltr");
        span.textContent = "AR";
      } else {
        html.dir = "rtl";
        html.classList.remove("ltr");
        span.textContent = "EN";
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
    showDragAndDropHints() {
      const elementsToShowHint = [
        "#card-logo",
        "#card-personal-photo-wrapper",
        "#card-name",
        "#card-tagline",
        "#qr-code-wrapper",
        ".phone-button-draggable-wrapper",
        ".draggable-social-link",
      ];
      elementsToShowHint.forEach((selector) => {
        document.querySelectorAll(selector).forEach((el) => {
          const hint = document.createElement("div");
          hint.className = "dnd-hint";
          hint.innerHTML = `<i class="fas fa-arrows-alt" aria-hidden="true"></i>`;
          el.appendChild(hint);
        });
      });
      hintTimeout = setTimeout(this.hideDragAndDropHints, 7000);
    },
    hideDragAndDropHints() {
      clearTimeout(hintTimeout);
      document.querySelectorAll(".dnd-hint").forEach((hint) => {
        hint.classList.add("is-hidden");
        setTimeout(() => {
          hint.remove();
        }, 500);
      });
    },
  };

  const DragManager = {
    init() {
      const draggableSelectors = [
        "#card-logo",
        "#card-personal-photo-wrapper",
        "#card-name",
        "#card-tagline",
        "#qr-code-wrapper",
      ];
      draggableSelectors.forEach((selector) => this.makeDraggable(selector));
    },
    makeDraggable(selector) {
      interact(selector).draggable({
        inertia: true,
        modifiers: [
          interact.modifiers.restrictRect({
            restriction: "parent",
            endOnly: true,
          }),
        ],
        autoScroll: false,
        listeners: {
          start: this.dragStartListener,
          move: this.dragMoveListener,
          end: this.dragEndListener,
        },
      });
    },
    dragStartListener(event) {
      UIManager.hideDragAndDropHints();
      event.target.classList.add("dragging");
    },
    dragMoveListener(event) {
      const target = event.target;
      const x = (parseFloat(target.getAttribute("data-x")) || 0) + event.dx;
      const y = (parseFloat(target.getAttribute("data-y")) || 0) + event.dy;
      target.style.transform = `translate(${x}px, ${y}px)`;
      target.setAttribute("data-x", x);
      target.setAttribute("data-y", y);
    },
    dragEndListener(event) {
      event.target.classList.remove("dragging");
      StateManager.saveDebounced();
    },
    resetPositions() {
      const elementsToReset = [
        "#card-logo",
        "#card-personal-photo-wrapper",
        "#card-name",
        "#card-tagline",
        "#qr-code-wrapper",
        ".phone-button-draggable-wrapper",
        ".draggable-social-link",
      ];
      elementsToReset.forEach((selector) => {
        document.querySelectorAll(selector).forEach((el) => {
          if (el) {
            el.style.transform = "translate(0px, 0px)";
            el.removeAttribute("data-x");
            el.removeAttribute("data-y");
          }
        });
      });
    },
  };

  const CardManager = {
    frontBgImageUrl: null,
    backBgImageUrl: null,
    qrCodeImageUrl: null,
    personalPhotoUrl: null,
    autoGeneratedQrDataUrl: null,
    updateElementFromInput(input) {
      const { updateTarget, updateProperty, updateUnit = "" } = input.dataset;
      if (!updateTarget || !updateProperty) return;
      const targetElement = document.getElementById(updateTarget);
      if (!targetElement) return;
      const properties = updateProperty.split(".");
      let current = targetElement;
      for (let i = 0; i < properties.length - 1; i++) {
        current = current[properties[i]];
      }
      current[properties[properties.length - 1]] = input.value + updateUnit;
    },

    updatePersonalPhotoStyles() {
      const wrapper = DOMElements.draggable.photo;
      if (!wrapper) return;

      const imageUrl = DOMElements.photoControls.url.value;
      const size = DOMElements.photoControls.size.value;
      const shape = document.querySelector(
        'input[name="photo-shape"]:checked',
      ).value;
      const borderColor = DOMElements.photoControls.borderColor.value;
      const borderWidth = DOMElements.photoControls.borderWidth.value;

      wrapper.style.width = `${size}%`;
      wrapper.style.height = `${size}%`;
      wrapper.style.borderRadius = shape === "circle" ? "50%" : "8px";
      wrapper.style.border = `${borderWidth}px solid ${borderColor}`;
      wrapper.style.backgroundImage = imageUrl ? `url(${imageUrl})` : "none";
      wrapper.style.display = imageUrl ? "block" : "none";
    },

    updatePhoneButtonStyles() {
      const bgColor = DOMElements.phoneBtnBgColor.value;
      const textColor = DOMElements.phoneBtnTextColor.value;
      const fontSize = DOMElements.phoneBtnFontSize.value;
      const fontFamily = DOMElements.phoneBtnFont.value;
      const padding = DOMElements.phoneBtnPadding.value;
      document.querySelectorAll(".phone-button").forEach((button) => {
        button.style.backgroundColor = bgColor;
        button.style.color = textColor;
        button.style.borderColor =
          bgColor === "transparent" || bgColor.includes("rgba(0,0,0,0)")
            ? textColor
            : "transparent";
        button.style.fontSize = `${fontSize}px`;
        button.style.fontFamily = fontFamily;
        button.style.padding = `${padding}px ${padding * 2}px`;
      });
    },
    updatePhoneButtonsVisibility() {
      const isVisible = DOMElements.buttons.togglePhone.checked;
      document
        .querySelectorAll(".phone-button-draggable-wrapper")
        .forEach((wrapper) => {
          wrapper.classList.toggle("text-only-mode", !isVisible);
        });
      DOMElements.phoneTextControls.container.classList.toggle(
        "visible",
        !isVisible,
      );
    },

    updatePhoneTextStyles() {
      const layout = document.querySelector(
        'input[name="phone-text-layout"]:checked',
      ).value;
      const size = DOMElements.phoneTextControls.size.value;
      const color = DOMElements.phoneTextControls.color.value;
      const font = DOMElements.phoneTextControls.font.value;
      document
        .querySelectorAll(".phone-button-draggable-wrapper")
        .forEach((wrapper) => {
          wrapper.dataset.layout = layout;
          const button = wrapper.querySelector(".phone-button");
          if (button) {
            button.style.fontSize = `${size}px`;
            button.style.color = color;
            button.style.fontFamily = font;
          }
        });
    },
    renderPhoneButtons() {
      document
        .querySelectorAll(".phone-button-draggable-wrapper")
        .forEach((el) => el.remove());

      const state = StateManager.getStateObject();
      const phoneState = state.dynamic.phones || [];

      DOMElements.phoneNumbersContainer
        .querySelectorAll(".dynamic-input-group")
        .forEach((group) => {
          const phoneId = group.dataset.phoneId;
          const phoneData = phoneState.find((p) => p.id === phoneId);
          if (!phoneData || !phoneData.value) return;

          const placement = phoneData.placement || "front";
          const parentContainer =
            placement === "front"
              ? DOMElements.cardFrontContent
              : DOMElements.cardBackContent;

          const wrapper = document.createElement("div");
          wrapper.id = phoneId;
          wrapper.className = "phone-button-draggable-wrapper";
          wrapper.dataset.controlId = group.id;

          const pos = phoneData.position || { x: 0, y: 0 };
          wrapper.style.transform = `translate(${pos.x}px, ${pos.y}px)`;
          wrapper.setAttribute("data-x", pos.x);
          wrapper.setAttribute("data-y", pos.y);

          const phoneLink = document.createElement("a");
          phoneLink.href = `tel:${phoneData.value.replace(/[^0-9+]/g, "")}`;
          phoneLink.className = "phone-button";

          phoneLink.innerHTML = `
                    <i class="fas fa-phone-alt" aria-hidden="true"></i>
                    <span>${phoneData.value}</span>
                    <button class="copy-btn no-export" title="نسخ الرقم" aria-label="نسخ الرقم ${phoneData.value}">
                        <i class="fas fa-copy" aria-hidden="true"></i>
                    </button>
                `;

          phoneLink.querySelector(".copy-btn").onclick = (e) => {
            e.preventDefault();
            e.stopPropagation();
            Utils.copyTextToClipboard(phoneData.value).then((success) => {
              if (success) UIManager.announce("تم نسخ الرقم!");
            });
          };
          phoneLink.addEventListener("click", (e) => {
            e.preventDefault();
            UIManager.navigateToAndHighlight(wrapper.dataset.controlId);
          });

          wrapper.appendChild(phoneLink);
          parentContainer.appendChild(wrapper);
          DragManager.makeDraggable(`#${phoneId}`);
        });

      this.updatePhoneButtonStyles();
      this.updatePhoneButtonsVisibility();
      this.updatePhoneTextStyles();
    },
    createPhoneInput(phoneData = {}) {
      const {
        id = `phone_${Date.now()}`,
        value = "",
        placement = "front",
      } = phoneData;

      const inputGroup = document.createElement("div");
      inputGroup.className = "dynamic-input-group";
      inputGroup.id = `phone-control-${id}`;
      inputGroup.dataset.phoneId = id;

      const mainContent = document.createElement("div");
      mainContent.style.flexGrow = "1";

      const inputWrapper = document.createElement("div");
      inputWrapper.style.display = "flex";
      inputWrapper.style.alignItems = "center";
      inputWrapper.style.gap = "10px";

      const dragHandle = document.createElement("i");
      dragHandle.className = "fas fa-grip-vertical drag-handle";
      dragHandle.setAttribute("aria-hidden", "true");

      const newPhoneInput = document.createElement("input");
      newPhoneInput.type = "tel";
      newPhoneInput.value = value;
      newPhoneInput.placeholder = "رقم هاتف جديد";
      newPhoneInput.style.flexGrow = "1";

      const removeBtn = document.createElement("button");
      removeBtn.className = "remove-btn";
      removeBtn.textContent = "×";
      removeBtn.setAttribute("aria-label", "حذف رقم الهاتف");

      inputWrapper.append(dragHandle, newPhoneInput, removeBtn);

      const placementControl = document.createElement("div");
      placementControl.className = "placement-control";
      placementControl.innerHTML = `
                <div class="radio-group">
                    <label><input type="radio" name="placement-${id}" value="front" ${placement === "front" ? "checked" : ""}> أمامي</label>
                    <label><input type="radio" name="placement-${id}" value="back" ${placement === "back" ? "checked" : ""}> خلفي</label>
                </div>
            `;

      mainContent.append(inputWrapper, placementControl);
      inputGroup.appendChild(mainContent);

      const handleUpdate = () => {
        this.renderPhoneButtons();
        StateManager.saveDebounced();
      };
      removeBtn.onclick = () => {
        inputGroup.remove();
        handleUpdate();
      };
      newPhoneInput.addEventListener("input", () => {
        handleUpdate();
        CardManager.generateVCardQrDebounced();
      });
      placementControl
        .querySelectorAll('input[type="radio"]')
        .forEach((radio) => radio.addEventListener("change", handleUpdate));

      DOMElements.phoneNumbersContainer.appendChild(inputGroup);
    },
    updateCardBackgrounds() {
      const setBg = (
        imageLayer,
        gradientLayer,
        startId,
        endId,
        image,
        opacityId,
      ) => {
        if (!imageLayer || !gradientLayer) return;
        const startColor = document.getElementById(startId).value;
        const endColor = document.getElementById(endId).value;
        const opacity = document.getElementById(opacityId).value;

        imageLayer.style.backgroundImage = image ? `url(${image})` : "none";
        gradientLayer.style.backgroundImage = `linear-gradient(135deg, ${startColor}, ${endColor})`;
        gradientLayer.style.opacity = opacity;
      };

      setBg(
        document.getElementById("front-bg-image-layer"),
        document.getElementById("front-bg-gradient-layer"),
        "front-bg-start",
        "front-bg-end",
        this.frontBgImageUrl,
        "front-bg-opacity",
      );
      setBg(
        document.getElementById("back-bg-image-layer"),
        document.getElementById("back-bg-gradient-layer"),
        "back-bg-start",
        "back-bg-end",
        this.backBgImageUrl,
        "back-bg-opacity",
      );
    },

    renderCardContent() {
      const state = StateManager.getStateObject();
      if (!state || !state.placements) return;

      const containers = {
        front: DOMElements.cardFrontContent,
        back: DOMElements.cardBackContent,
      };
      const elements = {
        logo: DOMElements.draggable.logo,
        photo: DOMElements.draggable.photo,
        name: DOMElements.draggable.name,
        tagline: DOMElements.draggable.tagline,
        qr: DOMElements.draggable.qr,
      };

      Object.values(elements).forEach((el) => el.parentNode?.removeChild(el));

      for (const [key, side] of Object.entries(state.placements)) {
        if (elements[key] && containers[side]) {
          containers[side].appendChild(elements[key]);
        }
      }

      this.updatePersonalPhotoStyles();
      this.renderPhoneButtons();
      this.updateSocialLinks();
    },

    updateQrCodeDisplay() {
      const qrSourceRadio = document.querySelector(
        'input[name="qr-source"]:checked',
      );
      if (!qrSourceRadio) return;

      const qrSource = qrSourceRadio.value;
      const qrWrapper = DOMElements.draggable.qr;
      qrWrapper.innerHTML = "";

      let qrImage = "";

      if (qrSource === "custom") {
        qrImage = DOMElements.qrImageUrlInput.value;
      } else if (qrSource === "upload") {
        qrImage = this.qrCodeImageUrl;
      } else if (qrSource === "auto-card" || qrSource === "auto-vcard") {
        qrImage = this.autoGeneratedQrDataUrl;
      }

      if (qrImage) {
        qrWrapper.innerHTML = `<img src="${qrImage}" alt="QR Code" style="width: 100%; height: 100%; border-radius: 4px; object-fit: contain;">`;
      }

      qrWrapper.style.width = `${DOMElements.qrSizeSlider.value}%`;
    },

    updateSocialLinksVisibility() {
      const isVisibleAsButtons = DOMElements.buttons.toggleSocial.checked;
      DOMElements.socialTextControls.container.classList.toggle(
        "visible",
        !isVisibleAsButtons,
      );
      document.querySelectorAll(".draggable-social-link").forEach((wrapper) => {
        wrapper.classList.toggle("text-only-mode", !isVisibleAsButtons);
      });
    },

    updateSocialButtonStyles() {
      const backButtonBgColor = DOMElements.backButtonsBgColor.value;
      const backButtonTextColor = DOMElements.backButtonsTextColor.value;
      const backButtonFont = DOMElements.backButtonsFont.value;
      const backButtonSize = DOMElements.backButtonsSize.value;

      document.querySelectorAll(".draggable-social-link a").forEach((link) => {
        Object.assign(link.style, {
          backgroundColor: backButtonBgColor,
          color: backButtonTextColor,
          fontFamily: backButtonFont,
          fontSize: `${backButtonSize}px`,
          padding: `${backButtonSize * 0.5}px ${backButtonSize}px`,
        });
      });
    },

    updateSocialTextStyles() {
      const size = DOMElements.socialTextControls.size.value;
      const color = DOMElements.socialTextControls.color.value;
      const font = DOMElements.socialTextControls.font.value;

      document
        .querySelectorAll(".draggable-social-link.text-only-mode a")
        .forEach((link) => {
          const icon = link.querySelector("i");
          const span = link.querySelector("span");
          if (icon) icon.style.color = color;
          if (span) {
            span.style.fontSize = `${size}px`;
            span.style.color = color;
            span.style.fontFamily = font;
          }
        });
    },

    updateSocialLinks() {
      document
        .querySelectorAll(".draggable-social-link")
        .forEach((el) => el.remove());

      const state = StateManager.getStateObject();
      if (!state) return;

      const renderLink = (linkData) => {
        const { id, value, placement, platform, controlId, position } =
          linkData;
        if (!value) return;

        const parentContainer =
          placement === "front"
            ? DOMElements.cardFrontContent
            : DOMElements.cardBackContent;
        const elementId = `social-link-${id.replace(/[^a-zA-Z0-9-]/g, "-")}`;

        const linkWrapper = document.createElement("div");
        linkWrapper.id = elementId;
        linkWrapper.className = "draggable-social-link";
        linkWrapper.dataset.controlId = controlId;

        const pos = position || { x: 0, y: 0 };
        linkWrapper.style.transform = `translate(${pos.x}px, ${pos.y}px)`;
        linkWrapper.setAttribute("data-x", pos.x);
        linkWrapper.setAttribute("data-y", pos.y);

        let fullUrl = value,
          displayText = value;
        if (platform.prefix) {
          if (platform.id === "email" || platform.id === "whatsapp") {
            fullUrl = platform.prefix + value;
          } else {
            fullUrl = !/^(https?:\/\/)/i.test(value)
              ? platform.prefix + value
              : value;
          }
        } else if (!/^(https?:\/\/)/i.test(value)) {
          fullUrl = "https://" + value;
        }
        if (platform.id !== "email" && platform.id !== "whatsapp") {
          displayText = displayText
            .replace(/^(https?:\/\/)?(www\.)?/, "")
            .replace(/\/$/, "");
        }

        linkWrapper.innerHTML = `
                    <a href="${fullUrl}" target="_blank" rel="noopener noreferrer">
                        <i class="${platform.icon}" aria-hidden="true"></i>
                        <span>${displayText}</span>
                        <button class="copy-btn no-export" title="نسخ الرابط" aria-label="نسخ الرابط ${displayText}">
                            <i class="fas fa-copy" aria-hidden="true"></i>
                        </button>
                    </a>
                `;

        linkWrapper.querySelector(".copy-btn").onclick = (e) => {
          e.preventDefault();
          e.stopPropagation();
          Utils.copyTextToClipboard(fullUrl).then((success) => {
            if (success) UIManager.announce("تم نسخ الرابط!");
          });
        };
        linkWrapper.querySelector("a").addEventListener("click", (e) => {
          if (!e.metaKey && !e.ctrlKey) {
            e.preventDefault();
            UIManager.navigateToAndHighlight(controlId);
          }
        });

        parentContainer.appendChild(linkWrapper);
        DragManager.makeDraggable(`#${elementId}`);
      };

      if (state.dynamic.staticSocial) {
        Config.STATIC_CONTACT_METHODS.forEach((method) => {
          const socialState = state.dynamic.staticSocial[method.id];
          if (socialState && socialState.value) {
            renderLink({
              id: `static-${method.id}`,
              value: socialState.value,
              placement: socialState.placement,
              position: socialState.position,
              platform: method,
              controlId: `form-group-${method.id}`,
            });
          }
        });
      }

      if (state.dynamic.social) {
        state.dynamic.social.forEach((link, index) => {
          if (
            link.platform &&
            link.value &&
            Config.SOCIAL_PLATFORMS[link.platform]
          ) {
            renderLink({
              id: link.id || `dynamic-${link.platform}-${index}`,
              value: link.value,
              placement: link.placement,
              position: link.position,
              platform: Config.SOCIAL_PLATFORMS[link.platform],
              controlId: link.id
                ? `social-control-${link.id}`
                : `social-media-input`,
            });
          }
        });
      }

      this.updateSocialLinksVisibility();
      this.updateSocialButtonStyles();
      this.updateSocialTextStyles();
    },

    async generateVCardQr() {
      const qrSource = document.querySelector(
        'input[name="qr-source"]:checked',
      )?.value;
      if (qrSource !== "auto-vcard") return;

      const vCardData = ExportManager.getVCardString();
      if (vCardData.length < 30) {
        this.autoGeneratedQrDataUrl = null;
        this.updateQrCodeDisplay();
        return;
      }

      try {
        await Utils.loadScript(Config.SCRIPT_URLS.qrcode);

        const container = DOMElements.qrCodeTempGenerator;
        container.innerHTML = "";
        container.style.display = "block";

        new QRCode(container, {
          text: vCardData,
          width: 256,
          height: 256,
          correctLevel: QRCode.CorrectLevel.H,
        });

        setTimeout(() => {
          const canvas = container.querySelector("canvas");
          if (canvas) {
            this.autoGeneratedQrDataUrl = canvas.toDataURL();
            this.updateQrCodeDisplay();
          }
          container.style.display = "none";
        }, 100);
      } catch (error) {
        console.error(
          "Failed to load QRCode.js or generate QR code on page load:",
          error,
        );
      }
    },

    async generateCardLinkQr() {
      const button = DOMElements.buttons.generateAutoQr;
      UIManager.setButtonLoadingState(button, true, "جاري الحفظ...");
      try {
        await Utils.loadScript(Config.SCRIPT_URLS.qrcode);
        const designId = await ShareManager.saveDesign();
        if (!designId) {
          alert("فشل حفظ التصميم اللازم لإنشاء الرابط.");
          return;
        }

        UIManager.setButtonLoadingState(button, true, "جاري الإنشاء...");
        const viewerUrl = new URL("viewer.html", window.location.href);
        viewerUrl.searchParams.set("id", designId);
        const finalUrl = viewerUrl.href;

        const container = DOMElements.qrCodeTempGenerator;
        container.innerHTML = "";
        container.style.display = "block";

        new QRCode(container, {
          text: finalUrl,
          width: 256,
          height: 256,
          correctLevel: QRCode.CorrectLevel.H,
        });

        setTimeout(() => {
          const canvas = container.querySelector("canvas");
          if (canvas) {
            this.autoGeneratedQrDataUrl = canvas.toDataURL();
            this.updateQrCodeDisplay();
            UIManager.announce("تم إنشاء QR Code بنجاح.");
          } else {
            alert("حدث خطأ أثناء إنشاء QR Code. حاول مرة أخرى.");
          }
          container.style.display = "none";
        }, 100);
      } catch (error) {
        console.error("Error generating shareable QR code:", error);
        alert("حدث خطأ. لم نتمكن من إنشاء رابط QR Code.");
      } finally {
        UIManager.setButtonLoadingState(button, false);
      }
    },

    generateVCardQrDebounced: Utils.debounce(() => {
      CardManager.generateVCardQr();
    }, 400),

    applyTheme(themeKey) {
      const theme = Config.THEMES[themeKey];
      if (!theme) return;

      UIManager.setActiveThumbnail(themeKey);

      const controlsToUpdate = {
        "name-color": theme.values.textPrimary,
        "tagline-color": theme.values.taglineColor,
        "front-bg-start": theme.gradient[0],
        "front-bg-end": theme.gradient[1],
        "back-bg-start": theme.gradient[0],
        "back-bg-end": theme.gradient[1],
        "back-buttons-bg-color": theme.values.backButtonBg,
        "back-buttons-text-color": theme.values.backButtonText,
        "phone-btn-bg-color": theme.values.phoneBtnBg,
        "phone-btn-text-color": theme.values.phoneBtnText,
      };
      for (const [id, value] of Object.entries(controlsToUpdate)) {
        const control = document.getElementById(id);
        if (control) {
          control.value = value;
          control.dispatchEvent(new Event("input", { bubbles: true }));
        }
      }
      this.frontBgImageUrl = null;
      this.backBgImageUrl = null;
      DOMElements.fileInputs.frontBg.value = "";
      DOMElements.fileInputs.backBg.value = "";
      this.updateCardBackgrounds();
      UIManager.announce(`تم تطبيق تصميم ${theme.name}`);
      StateManager.saveDebounced();
    },
    addSocialLink() {
      const platformKey = DOMElements.social.typeSelect.value;
      const value = DOMElements.social.input.value.trim();
      if (!value) {
        UIManager.announce("الرجاء إدخال رابط أو معرف.");
        return;
      }

      const platform = Config.SOCIAL_PLATFORMS[platformKey];
      const id = `dynsocial_${Date.now()}`;

      const linkEl = document.createElement("div");
      linkEl.className = "dynamic-social-link";
      linkEl.id = `social-control-${id}`;
      linkEl.dataset.socialId = id;
      linkEl.dataset.platform = platformKey;
      linkEl.dataset.value = value;

      const mainContent = document.createElement("div");
      mainContent.style.flexGrow = "1";

      const infoWrapper = document.createElement("div");
      infoWrapper.style.display = "flex";
      infoWrapper.style.alignItems = "center";
      infoWrapper.style.gap = "10px";
      infoWrapper.innerHTML = `
                <i class="fas fa-grip-vertical drag-handle"></i>
                <i class="${platform.icon}" aria-hidden="true"></i>
                <span style="flex-grow: 1;">${value}</span>
                <button class="remove-btn" aria-label="حذف رابط ${platform.name}">×</button>
            `;

      const placementControl = document.createElement("div");
      placementControl.className = "placement-control";
      placementControl.innerHTML = `
                <div class="radio-group">
                    <label><input type="radio" name="placement-${id}" value="front"> أمامي</label>
                    <label><input type="radio" name="placement-${id}" value="back" checked> خلفي</label>
                </div>
            `;

      mainContent.append(infoWrapper, placementControl);
      linkEl.appendChild(mainContent);

      const handleUpdate = () => {
        this.updateSocialLinks();
        StateManager.saveDebounced();
      };
      infoWrapper.querySelector(".remove-btn").addEventListener("click", () => {
        linkEl.remove();
        handleUpdate();
      });
      placementControl
        .querySelectorAll('input[type="radio"]')
        .forEach((radio) => radio.addEventListener("change", handleUpdate));

      DOMElements.social.container.appendChild(linkEl);
      DOMElements.social.input.value = "";
      handleUpdate();
    },
    applyLayout(layoutName) {
      DOMElements.cardsWrapper.dataset.layout = layoutName;
      StateManager.saveDebounced();
    },
    applyBackground(bgUrl) {
      const targetSide =
        document.querySelector('input[name="bg-gallery-target"]:checked')
          ?.value || "front";

      if (targetSide === "front") {
        this.frontBgImageUrl = bgUrl;
        document.getElementById("front-bg-start").value = "#000000";
        document.getElementById("front-bg-end").value = "#000000";
        document.getElementById("front-bg-opacity").value = 0.3;
        DOMElements.buttons.removeFrontBg.style.display = "block";
      } else {
        this.backBgImageUrl = bgUrl;
        document.getElementById("back-bg-start").value = "#000000";
        document.getElementById("back-bg-end").value = "#000000";
        document.getElementById("back-bg-opacity").value = 0.3;
        DOMElements.buttons.removeBackBg.style.display = "block";
      }

      this.updateCardBackgrounds();
      StateManager.saveDebounced();
      UIManager.announce(
        `تم تطبيق خلفية ${targetSide === "front" ? "أمامية" : "خلفية"} جديدة.`,
      );
    },
  };

  const StateManager = {
    getStateObject() {
      const state = {
        inputs: {},
        dynamic: { phones: [], social: [], staticSocial: {} },
        imageUrls: {},
        positions: {},
        placements: {},
      };

      document.querySelectorAll("input, select, textarea").forEach((input) => {
        if (input.type === "radio" && !input.name.startsWith("placement-")) {
          if (input.checked) {
            state.inputs[input.name] = input.value;
          }
        } else if (input.type === "checkbox") {
          state.inputs[input.id] = input.checked;
        } else if (!input.name.startsWith("placement-")) {
          state.inputs[input.id] = input.value;
        }
      });

      DOMElements.phoneNumbersContainer
        .querySelectorAll(".dynamic-input-group")
        .forEach((group) => {
          const phoneId = group.dataset.phoneId;
          const phoneInput = group.querySelector('input[type="tel"]');
          const placementInput = group.querySelector(
            `input[name="placement-${phoneId}"]:checked`,
          );
          const cardElement = document.getElementById(phoneId);

          if (phoneId && phoneInput) {
            state.dynamic.phones.push({
              id: phoneId,
              value: phoneInput.value,
              placement: placementInput ? placementInput.value : "front",
              position: cardElement
                ? {
                    x: parseFloat(cardElement.getAttribute("data-x")) || 0,
                    y: parseFloat(cardElement.getAttribute("data-y")) || 0,
                  }
                : { x: 0, y: 0 },
            });
          }
        });

      DOMElements.social.container
        .querySelectorAll(".dynamic-social-link")
        .forEach((group) => {
          const socialId = group.dataset.socialId;
          const placementInput = group.querySelector(
            `input[name="placement-${socialId}"]:checked`,
          );
          const cardElement = document.getElementById(
            `social-link-${socialId}`,
          );

          if (socialId) {
            state.dynamic.social.push({
              id: socialId,
              platform: group.dataset.platform,
              value: group.dataset.value,
              placement: placementInput ? placementInput.value : "back",
              position: cardElement
                ? {
                    x: parseFloat(cardElement.getAttribute("data-x")) || 0,
                    y: parseFloat(cardElement.getAttribute("data-y")) || 0,
                  }
                : { x: 0, y: 0 },
            });
          }
        });

      Config.STATIC_CONTACT_METHODS.forEach((method) => {
        const controlGroup = document.getElementById(`form-group-${method.id}`);
        const input = document.getElementById(`input-${method.id}`);
        const placementInput = controlGroup
          ? controlGroup.querySelector(
              `input[name="placement-static-${method.id}"]:checked`,
            )
          : null;
        const cardElement = document.getElementById(
          `social-link-static-${method.id}`,
        );

        if (input) {
          state.dynamic.staticSocial[method.id] = {
            value: input.value,
            placement: placementInput ? placementInput.value : "back",
            position: cardElement
              ? {
                  x: parseFloat(cardElement.getAttribute("data-x")) || 0,
                  y: parseFloat(cardElement.getAttribute("data-y")) || 0,
                }
              : { x: 0, y: 0 },
          };
        }
      });

      state.imageUrls.front = CardManager.frontBgImageUrl;
      state.imageUrls.back = CardManager.backBgImageUrl;
      state.imageUrls.qrCode = CardManager.qrCodeImageUrl;
      state.imageUrls.photo = CardManager.personalPhotoUrl;

      const coreElements = [
        "card-logo",
        "card-personal-photo-wrapper",
        "card-name",
        "card-tagline",
        "qr-code-wrapper",
      ];
      coreElements.forEach((id) => {
        const el = document.getElementById(id);
        if (el) {
          state.positions[id] = {
            x: parseFloat(el.getAttribute("data-x")) || 0,
            y: parseFloat(el.getAttribute("data-y")) || 0,
          };
        }
      });

      const placementElements = ["logo", "photo", "name", "tagline", "qr"];
      placementElements.forEach((elName) => {
        const checkedRadio = document.querySelector(
          `input[name="placement-${elName}"]:checked`,
        );
        if (checkedRadio) {
          state.placements[elName] = checkedRadio.value;
        }
      });

      return state;
    },

    save() {
      try {
        const state = this.getStateObject();
        localStorage.setItem(Config.LOCAL_STORAGE_KEY, JSON.stringify(state));
      } catch (e) {
        console.error("Failed to save state:", e);
      }
    },
    load() {
      try {
        const savedState = localStorage.getItem(Config.LOCAL_STORAGE_KEY);
        if (savedState) {
          this.applyState(JSON.parse(savedState), false);
          return true;
        }
        return false;
      } catch (e) {
        console.error("Failed to load state:", e);
        return false;
      }
    },

    applyState(state, triggerSave = true) {
      if (!state) return;

      if (state.inputs) {
        for (const [key, value] of Object.entries(state.inputs)) {
          const radioInputs = document.querySelectorAll(
            `input[name="${key}"][type="radio"]`,
          );
          if (radioInputs.length > 0) {
            radioInputs.forEach(
              (radio) => (radio.checked = radio.value === value),
            );
          } else {
            const input = document.getElementById(key);
            if (input) {
              if (input.type === "checkbox") {
                input.checked = value;
              } else {
                input.value = value || "";
              }
            }
          }
        }
      }

      DOMElements.phoneNumbersContainer.innerHTML = "";
      if (state.dynamic && state.dynamic.phones) {
        state.dynamic.phones.forEach((phoneData) =>
          CardManager.createPhoneInput(phoneData),
        );
      }

      DOMElements.social.container.innerHTML = "";
      if (state.dynamic && state.dynamic.social) {
        state.dynamic.social.forEach((socialData) => {
          DOMElements.social.typeSelect.value = socialData.platform;
          DOMElements.social.input.value = socialData.value;
          CardManager.addSocialLink();
          const newControl = document.getElementById(
            `social-control-${socialData.id}`,
          );
          if (newControl) {
            const placementRadio = newControl.querySelector(
              `input[value="${socialData.placement}"]`,
            );
            if (placementRadio) placementRadio.checked = true;
          }
        });
      }

      if (state.dynamic && state.dynamic.staticSocial) {
        for (const [key, data] of Object.entries(state.dynamic.staticSocial)) {
          const input = document.getElementById(`input-${key}`);
          if (input) input.value = data.value || "";

          const placementRadio = document.querySelector(
            `input[name="placement-static-${key}"][value="${data.placement}"]`,
          );
          if (placementRadio) placementRadio.checked = true;
        }
      }

      if (state.imageUrls) {
        CardManager.frontBgImageUrl = state.imageUrls.front;
        CardManager.backBgImageUrl = state.imageUrls.back;
        CardManager.qrCodeImageUrl = state.imageUrls.qrCode;
        CardManager.personalPhotoUrl = state.imageUrls.photo;
        if (DOMElements.photoControls.url)
          DOMElements.photoControls.url.value = state.imageUrls.photo || "";

        DOMElements.buttons.removeFrontBg.style.display = state.imageUrls.front
          ? "block"
          : "none";
        DOMElements.buttons.removeBackBg.style.display = state.imageUrls.back
          ? "block"
          : "none";
      }

      if (state.placements) {
        for (const [elName, side] of Object.entries(state.placements)) {
          const radio = document.querySelector(
            `input[name="placement-${elName}"][value="${side}"]`,
          );
          if (radio) radio.checked = true;
        }
      }

      document.querySelectorAll("input, select, textarea").forEach((input) => {
        input.dispatchEvent(new Event("input", { bubbles: true }));
        input.dispatchEvent(new Event("change", { bubbles: true }));
      });

      if (state.positions) {
        for (const [id, pos] of Object.entries(state.positions)) {
          const el = document.getElementById(id);
          if (el && pos) {
            el.style.transform = `translate(${pos.x}px, ${pos.y}px)`;
            el.setAttribute("data-x", pos.x);
            el.setAttribute("data-y", pos.y);
          }
        }
      } else {
        DragManager.resetPositions();
      }

      if (state.inputs && state.inputs["theme-select-input"]) {
        UIManager.setActiveThumbnail(state.inputs["theme-select-input"]);
      }

      CardManager.renderCardContent();

      const qrSource = document.querySelector(
        'input[name="qr-source"]:checked',
      )?.value;
      if (qrSource === "auto-vcard") {
        setTimeout(() => CardManager.generateVCardQr(), 100);
      } else {
        CardManager.autoGeneratedQrDataUrl = null;
        CardManager.updateQrCodeDisplay();
      }

      if (triggerSave) {
        StateManager.saveDebounced();
      }
    },
    reset() {
      if (
        confirm(
          "هل أنت متأكد أنك تريد إعادة تعيين التصميم بالكامل؟ سيتم حذف أي بيانات محفوظة.",
        )
      ) {
        localStorage.removeItem(Config.LOCAL_STORAGE_KEY);
        window.location.reload();
      }
    },
    saveDebounced: Utils.debounce(() => {
      HistoryManager.pushState(StateManager.getStateObject());
      UIManager.showSaveNotification();
    }, 800),
  };
  const ExportManager = {
    pendingExportTarget: null,
    async captureElement(element, scale = 2) {
      await Utils.loadScript(Config.SCRIPT_URLS.html2canvas);
      const style = document.createElement("style");
      style.innerHTML = ".no-export { display: none !important; }";
      document.head.appendChild(style);
      try {
        return await html2canvas(element, {
          backgroundColor: null,
          scale: scale,
          useCORS: true,
        });
      } finally {
        document.head.removeChild(style);
      }
    },
    async downloadElement(options) {
      const { format, quality, scale } = options;
      const element =
        this.pendingExportTarget === "front"
          ? DOMElements.cardFront
          : DOMElements.cardBack;
      const filename = `card-${this.pendingExportTarget}.${format}`;
      UIManager.showModal(DOMElements.exportLoadingOverlay);
      try {
        await new Promise((resolve) => setTimeout(resolve, 100));
        const canvas = await this.captureElement(element, scale);
        const link = document.createElement("a");
        link.download = filename;
        link.href = canvas.toDataURL(`image/${format}`, quality);
        link.click();
      } catch (e) {
        console.error("Export failed:", e);
        UIManager.announce("فشل التصدير.");
      } finally {
        UIManager.hideModal(DOMElements.exportLoadingOverlay);
        UIManager.hideModal(DOMElements.exportModal.overlay);
      }
    },
    async downloadPdf() {
      await Promise.all([
        Utils.loadScript(Config.SCRIPT_URLS.html2canvas),
        Utils.loadScript(Config.SCRIPT_URLS.jspdf),
      ]);
      try {
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF({
          orientation: "landscape",
          unit: "px",
          format: [510, 330],
        });
        const frontCanvas = await this.captureElement(DOMElements.cardFront, 2);
        doc.addImage(frontCanvas.toDataURL("image/png"), "PNG", 0, 0, 510, 330);
        doc.addPage();
        const backCanvas = await this.captureElement(DOMElements.cardBack, 2);
        doc.addImage(backCanvas.toDataURL("image/png"), "PNG", 0, 0, 510, 330);
        doc.save("business-card.pdf");
      } catch (e) {
        console.error("PDF export failed:", e);
        UIManager.announce("فشل تصدير PDF.");
      }
    },
    getVCardString() {
      const name = DOMElements.nameInput.value.replace(/\n/g, " ").split(" ");
      const firstName = name.slice(0, -1).join(" ");
      const lastName = name.slice(-1).join(" ");
      let vCard = `BEGIN:VCARD\nVERSION:3.0\nN:${lastName};${firstName};;;\nFN:${DOMElements.nameInput.value}\nORG:${DOMElements.taglineInput.value.replace(/\n/g, " ")}\nTITLE:${DOMElements.taglineInput.value.replace(/\n/g, " ")}\n`;

      const state = StateManager.getStateObject();

      if (
        state.dynamic.staticSocial.email &&
        state.dynamic.staticSocial.email.value
      ) {
        vCard += `EMAIL;TYPE=PREF,INTERNET:${state.dynamic.staticSocial.email.value}\n`;
      }
      if (
        state.dynamic.staticSocial.website &&
        state.dynamic.staticSocial.website.value
      ) {
        vCard += `URL:${state.dynamic.staticSocial.website.value}\n`;
      }

      if (state.dynamic.phones) {
        state.dynamic.phones.forEach((phone, index) => {
          if (phone.value)
            vCard += `TEL;TYPE=CELL${index === 0 ? ",PREF" : ""}:${phone.value}\n`;
        });
      }

      if (state.dynamic.social) {
        state.dynamic.social.forEach((link) => {
          const platformKey = link.platform;
          const value = link.value;
          if (platformKey && value && Config.SOCIAL_PLATFORMS[platformKey]) {
            let fullUrl = !/^(https?:\/\/)/i.test(value)
              ? Config.SOCIAL_PLATFORMS[platformKey].prefix + value
              : value;
            vCard += `URL;TYPE=${platformKey}:${fullUrl}\n`;
          }
        });
      }

      vCard += `END:VCARD`;
      return vCard;
    },
    downloadVcf() {
      const vcfData = this.getVCardString();
      const blob = new Blob([vcfData], { type: "text/vcard" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = "contact.vcf";
      link.click();
      URL.revokeObjectURL(url);
    },
    async downloadQrCode() {
      try {
        await Utils.loadScript(Config.SCRIPT_URLS.qrcode);
        const designId = await ShareManager.saveDesign();
        if (!designId) {
          throw new Error("فشل حفظ التصميم اللازم لإنشاء الرابط.");
        }

        const viewerUrl = new URL("viewer.html", window.location.href);
        viewerUrl.searchParams.set("id", designId);
        const finalUrl = viewerUrl.href;

        const container = DOMElements.qrCodeContainer;
        container.innerHTML = "";
        new QRCode(container, {
          text: finalUrl,
          width: 256,
          height: 256,
          correctLevel: QRCode.CorrectLevel.H,
        });

        return new Promise((resolve, reject) => {
          setTimeout(() => {
            const canvas = container.querySelector("canvas");
            if (canvas) {
              const link = document.createElement("a");
              link.download = `qrcode-card-link-${designId}.png`;
              link.href = canvas.toDataURL("image/png");
              link.click();
              resolve();
            } else {
              reject(new Error("حدث خطأ أثناء إنشاء QR Code. حاول مرة أخرى."));
            }
          }, 100);
        });
      } catch (error) {
        console.error("Error generating shareable QR code:", error);
        alert(error.message || "حدث خطأ. لم نتمكن من إنشاء رابط QR Code.");
        throw error;
      }
    },
  };
  const GalleryManager = {
    designs: [],
    init() {
      this.loadDesigns();
    },
    loadDesigns() {
      this.designs =
        JSON.parse(localStorage.getItem(Config.GALLERY_STORAGE_KEY)) || [];
    },
    saveDesigns() {
      localStorage.setItem(
        Config.GALLERY_STORAGE_KEY,
        JSON.stringify(this.designs),
      );
    },
    async addCurrentDesign() {
      try {
        const state = StateManager.getStateObject();
        const thumbnail = await ExportManager.captureElement(
          DOMElements.cardFront,
          0.5,
        ).then((canvas) => canvas.toDataURL("image/jpeg", 0.5));
        this.designs.push({
          name: `تصميم ${this.designs.length + 1}`,
          timestamp: Date.now(),
          state,
          thumbnail,
        });
        this.saveDesigns();
        UIManager.announce("تم حفظ التصميم في المعرض بنجاح!");
      } catch (error) {
        console.error("Failed to add design to gallery:", error);
        alert(
          "فشل حفظ التصميم في المعرض. قد تكون هناك مشكلة في تحميل المكونات اللازمة.",
        );
        throw error;
      }
    },
    deleteDesign(index) {
      if (confirm(`هل أنت متأكد من حذف "${this.designs[index].name}"؟`)) {
        this.designs.splice(index, 1);
        this.saveDesigns();
        this.render();
      }
    },
    loadDesignToEditor(index) {
      const design = this.designs[index];
      if (design) {
        StateManager.applyState(design.state);
        UIManager.hideModal(
          DOMElements.galleryModal.overlay,
          DOMElements.buttons.showGallery,
        );
      }
    },
    toggleRename(itemElement, index) {
      const nameSpan = itemElement.querySelector(".gallery-item-name-span");
      const nameInput = itemElement.querySelector(".gallery-item-name-input");
      const renameBtn = itemElement.querySelector(".gallery-rename-btn");
      const icon = renameBtn.querySelector("i");
      if (nameInput.style.display === "none") {
        nameSpan.style.display = "none";
        nameInput.style.display = "block";
        nameInput.value = this.designs[index].name;
        nameInput.focus();
        icon.className = "fas fa-save";
      } else {
        const newName = nameInput.value.trim();
        if (newName) {
          this.designs[index].name = newName;
          this.saveDesigns();
          nameSpan.textContent = newName;
        }
        nameSpan.style.display = "block";
        nameInput.style.display = "none";
        icon.className = "fas fa-pencil-alt";
      }
    },
    render() {
      const grid = DOMElements.galleryModal.grid;
      grid.innerHTML = "";
      if (this.designs.length === 0) {
        const p = document.createElement("p");
        p.textContent = "المعرض فارغ. قم بحفظ تصميمك الحالي للبدء.";
        grid.appendChild(p);
        return;
      }
      this.designs.forEach((design, index) => {
        const item = document.createElement("div");
        item.className = "gallery-item";
        const checkbox = document.createElement("input");
        checkbox.type = "checkbox";
        checkbox.className = "gallery-item-select";
        checkbox.dataset.index = index;
        checkbox.onchange = () => this.updateSelectionState();
        const thumbnail = document.createElement("img");
        thumbnail.src = design.thumbnail;
        // --- بداية التعديل: تحسين النص البديل ---
        thumbnail.alt = `معاينة لتصميم '${design.name}' المحفوظ`;
        // --- نهاية التعديل ---
        thumbnail.className = "gallery-thumbnail";
        const nameDiv = document.createElement("div");
        nameDiv.className = "gallery-item-name";
        const nameSpan = document.createElement("span");
        nameSpan.className = "gallery-item-name-span";
        nameSpan.textContent = design.name;
        const nameInput = document.createElement("input");
        nameInput.type = "text";
        nameInput.className = "gallery-item-name-input";
        nameInput.style.display = "none";
        nameInput.onkeydown = (e) => {
          if (e.key === "Enter") this.toggleRename(item, index);
        };
        nameDiv.append(nameSpan, nameInput);
        const actionsDiv = document.createElement("div");
        actionsDiv.className = "gallery-item-actions";
        const createButton = (
          text,
          iconClass,
          clickHandler,
          isDanger = false,
        ) => {
          const button = document.createElement("button");
          const icon = document.createElement("i");
          icon.className = iconClass;
          icon.setAttribute("aria-hidden", "true");
          if (text) {
            button.append(icon, ` ${text}`);
          } else {
            button.appendChild(icon);
          }
          button.onclick = clickHandler;
          if (isDanger) button.classList.add("danger");
          return button;
        };
        const loadBtn = createButton("تحميل", "fas fa-edit", () =>
          this.loadDesignToEditor(index),
        );
        const renameBtn = createButton("", "fas fa-pencil-alt", () =>
          this.toggleRename(item, index),
        );
        renameBtn.classList.add("gallery-rename-btn");
        const deleteBtn = createButton(
          "",
          "fas fa-trash",
          () => this.deleteDesign(index),
          true,
        );
        actionsDiv.append(loadBtn, renameBtn, deleteBtn);
        item.append(checkbox, thumbnail, nameDiv, actionsDiv);
        grid.appendChild(item);
      });
      this.updateSelectionState();
    },
    updateSelectionState() {
      const selectedCount = DOMElements.galleryModal.grid.querySelectorAll(
        ".gallery-item-select:checked",
      ).length;
      DOMElements.galleryModal.downloadZipBtn.disabled = selectedCount === 0;
    },
    async downloadSelectedAsZip() {
      const selectedIndices = [
        ...DOMElements.galleryModal.grid.querySelectorAll(
          ".gallery-item-select:checked",
        ),
      ].map((cb) => parseInt(cb.dataset.index, 10));
      if (selectedIndices.length === 0) return;

      try {
        await Promise.all([
          Utils.loadScript(Config.SCRIPT_URLS.html2canvas),
          Utils.loadScript(Config.SCRIPT_URLS.jszip),
        ]);

        const originalState = StateManager.getStateObject();
        const zip = new JSZip();

        for (const index of selectedIndices) {
          const design = this.designs[index];
          StateManager.applyState(design.state, false);
          await new Promise((resolve) => setTimeout(resolve, 50));
          const frontCanvas = await ExportManager.captureElement(
            DOMElements.cardFront,
          );
          const backCanvas = await ExportManager.captureElement(
            DOMElements.cardBack,
          );
          const frontBlob = await new Promise((resolve) =>
            frontCanvas.toBlob(resolve, "image/png"),
          );
          const backBlob = await new Promise((resolve) =>
            backCanvas.toBlob(resolve, "image/png"),
          );
          zip.file(`${design.name}_Front.png`, frontBlob);
          zip.file(`${design.name}_Back.png`, backBlob);
        }

        const content = await zip.generateAsync({ type: "blob" });
        const link = document.createElement("a");
        link.href = URL.createObjectURL(content);
        link.download = "Business_Cards_Export.zip";
        link.click();
        URL.revokeObjectURL(link.href);
        StateManager.applyState(originalState, false);
      } catch (e) {
        console.error("ZIP export failed:", e);
        UIManager.announce("حدث خطأ أثناء تصدير الملف المضغوط.");
        alert(
          "فشل تصدير الملف المضغوط. قد تكون هناك مشكلة في تحميل المكونات اللازمة.",
        );
        throw e;
      }
    },
  };

  const ShareManager = {
    async saveDesign() {
      const state = StateManager.getStateObject();
      try {
        const response = await fetch(`${Config.API_BASE_URL}/api/save-design`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(state),
        });
        if (!response.ok) throw new Error("Server responded with an error");

        const result = await response.json();
        if (result.success && result.id) {
          return result.id;
        } else {
          throw new Error("Invalid response from server");
        }
      } catch (error) {
        console.error("Failed to save design:", error);
        UIManager.announce("فشل حفظ التصميم. حاول مرة أخرى.");
        return null;
      }
    },

    async performShare(url, title, text) {
      const shareData = { title, text, url };
      if (navigator.share) {
        try {
          await navigator.share(shareData);
        } catch (e) {
          console.error("Web Share API failed:", e);
          this.showFallback(url, text);
        }
      } else {
        this.showFallback(url, text);
      }
    },

    async shareCard() {
      UIManager.setButtonLoadingState(DOMElements.buttons.shareCard, true);
      const designId = await this.saveDesign();
      UIManager.setButtonLoadingState(DOMElements.buttons.shareCard, false);
      if (!designId) return;

      const viewerUrl = new URL("viewer.html", window.location.href);
      viewerUrl.searchParams.set("id", designId);

      this.performShare(
        viewerUrl.href,
        "بطاقة عملي الرقمية",
        "ألق نظرة على تصميم بطاقتي الجديدة!",
      );
    },

    async shareEditor() {
      UIManager.setButtonLoadingState(DOMElements.buttons.shareEditor, true);
      const designId = await this.saveDesign();
      UIManager.setButtonLoadingState(DOMElements.buttons.shareEditor, false);
      if (!designId) return;

      const editorUrl = new URL(window.location.href);
      editorUrl.searchParams.delete("id");
      editorUrl.searchParams.set("id", designId);

      this.performShare(
        editorUrl.href,
        "تعديل بطاقة العمل",
        "استخدم هذا الرابط لتعديل تصميم بطاقة العمل.",
      );
    },

    showFallback(url, text) {
      DOMElements.shareModal.email.href = `mailto:?subject=My Business Card&body=${encodeURIComponent(text + "\n" + url)}`;
      DOMElements.shareModal.whatsapp.href = `https://api.whatsapp.com/send?text=${encodeURIComponent(text + "\n" + url)}`;
      DOMElements.shareModal.twitter.href = `https://twitter.com/intent/tweet?url=${encodeURIComponent(url)}&text=${encodeURIComponent(text)}`;
      DOMElements.shareModal.copyLink.onclick = () => {
        Utils.copyTextToClipboard(url).then((success) => {
          if (success) UIManager.announce("تم نسخ الرابط!");
        });
      };
      UIManager.showModal(DOMElements.shareModal.overlay);
    },

    async loadFromUrl() {
      const params = new URLSearchParams(window.location.search);
      const designId = params.get("id");

      if (designId) {
        try {
          const response = await fetch(
            `${Config.API_BASE_URL}/api/get-design/${designId}`,
          );
          if (!response.ok) throw new Error("Design not found or server error");

          const state = await response.json();
          StateManager.applyState(state, false);
          UIManager.announce("تم تحميل التصميم من الرابط بنجاح.");

          const newUrl = new URL(window.location.href);
          newUrl.searchParams.delete("id");
          window.history.replaceState(
            {},
            document.title,
            newUrl.pathname + newUrl.search,
          );
          return true;
        } catch (e) {
          console.error("Failed to load state from URL:", e);
          UIManager.announce("فشل تحميل التصميم من الرابط.");
          window.history.replaceState(
            {},
            document.title,
            window.location.pathname,
          );
          return false;
        }
      }
      return false;
    },
  };

  const EventManager = {
    makeListSortable(container, onSortCallback) {
      let draggedItem = null;
      container.addEventListener("dragstart", (e) => {
        draggedItem = e.target;
        setTimeout(() => e.target.classList.add("dragging"), 0);
      });
      container.addEventListener("dragend", (e) => {
        e.target.classList.remove("dragging");
      });
      container.addEventListener("dragover", (e) => {
        e.preventDefault();
        const afterElement = [...container.children].reduce(
          (closest, child) => {
            const box = child.getBoundingClientRect();
            const offset = e.clientY - box.top - box.height / 2;
            if (offset < 0 && offset > closest.offset) {
              return { offset: offset, element: child };
            } else {
              return closest;
            }
          },
          { offset: Number.NEGATIVE_INFINITY },
        ).element;
        if (afterElement == null) {
          container.appendChild(draggedItem);
        } else {
          container.insertBefore(draggedItem, afterElement);
        }
      });
      container.addEventListener("drop", () => {
        if (onSortCallback) onSortCallback();
        StateManager.saveDebounced();
      });
    },
    bindEvents() {
      document.querySelectorAll("input, select, textarea").forEach((input) => {
        const eventType =
          input.type === "range" ||
          input.type === "color" ||
          input.type === "checkbox"
            ? "change"
            : "input";
        input.addEventListener(eventType, () => {
          if (
            document.activeElement === input ||
            input.type === "checkbox" ||
            input.tagName === "SELECT"
          ) {
            StateManager.saveDebounced();
          }
        });
        input.addEventListener("input", () => {
          CardManager.updateElementFromInput(input);
          if (input.id.includes("photo-"))
            CardManager.updatePersonalPhotoStyles();
          if (input.id.includes("phone-btn"))
            CardManager.updatePhoneButtonStyles();
          if (input.id.startsWith("back-buttons"))
            CardManager.updateSocialButtonStyles();
          if (input.id.startsWith("social-text"))
            CardManager.updateSocialTextStyles();
          if (input.id.startsWith("input-")) CardManager.updateSocialLinks();
          if (
            input.id.startsWith("front-bg-") ||
            input.id.startsWith("back-bg-")
          )
            CardManager.updateCardBackgrounds();
          if (input.id === "qr-size") CardManager.updateQrCodeDisplay();

          const vCardFields = [
            "input-name",
            "input-tagline",
            "input-email",
            "input-website",
          ];
          if (vCardFields.includes(input.id)) {
            CardManager.generateVCardQrDebounced();
          }

          if (input.name.startsWith("placement-static-")) {
            CardManager.updateSocialLinks();
          }
        });
        input.addEventListener("focus", () =>
          UIManager.highlightElement(input.dataset.updateTarget, true),
        );
        input.addEventListener("blur", () =>
          UIManager.highlightElement(input.dataset.updateTarget, false),
        );
      });

      DOMElements.qrSourceRadios.forEach((radio) => {
        radio.addEventListener("change", () => {
          const selectedValue = radio.value;
          DOMElements.qrUrlGroup.style.display =
            selectedValue === "custom" ? "block" : "none";
          DOMElements.qrUploadGroup.style.display =
            selectedValue === "upload" ? "block" : "none";
          DOMElements.qrAutoCardGroup.style.display =
            selectedValue === "auto-card" ? "block" : "none";

          CardManager.autoGeneratedQrDataUrl = null;

          if (selectedValue === "auto-vcard") {
            CardManager.generateVCardQr();
          } else {
            CardManager.updateQrCodeDisplay();
          }

          StateManager.saveDebounced();
        });
      });

      document
        .querySelectorAll('input[name^="placement-"]')
        .forEach((radio) => {
          radio.addEventListener("change", () => {
            const elementName = radio.name.replace("placement-", "");
            const elementsMap = {
              logo: DOMElements.draggable.logo,
              photo: DOMElements.draggable.photo,
              name: DOMElements.draggable.name,
              tagline: DOMElements.draggable.tagline,
              qr: DOMElements.draggable.qr,
            };
            const elementToReset = elementsMap[elementName];
            if (elementToReset) {
              elementToReset.style.transform = "translate(0px, 0px)";
              elementToReset.setAttribute("data-x", "0");
              elementToReset.setAttribute("data-y", "0");
            }

            CardManager.renderCardContent();
            StateManager.saveDebounced();
          });
        });

      DOMElements.buttons.generateAutoQr.addEventListener("click", () => {
        if (typeof gtag === "function") {
          gtag("event", "generate_qr_code");
        }
        CardManager.generateCardLinkQr();
      });

      DOMElements.fileInputs.logo.addEventListener("change", (e) =>
        UIManager.handleImageUpload(e, {
          maxSizeMB: Config.MAX_LOGO_SIZE_MB,
          errorEl: DOMElements.errors.logoUpload,
          spinnerEl: DOMElements.spinners.logo,
          onSuccess: (imageUrl) => {
            DOMElements.draggable.logo.src = imageUrl;
            document.getElementById("input-logo").value = imageUrl;
            UIManager.updateFavicon(imageUrl);
            StateManager.saveDebounced();
          },
        }),
      );

      DOMElements.fileInputs.photo.addEventListener("change", (e) =>
        UIManager.handleImageUpload(e, {
          maxSizeMB: Config.MAX_LOGO_SIZE_MB,
          errorEl: DOMElements.errors.photoUpload,
          spinnerEl: DOMElements.spinners.photo,
          onSuccess: (imageUrl) => {
            CardManager.personalPhotoUrl = imageUrl;
            DOMElements.photoControls.url.value = imageUrl;
            DOMElements.photoControls.url.dispatchEvent(
              new Event("input", { bubbles: true }),
            );
            StateManager.saveDebounced();
          },
        }),
      );

      DOMElements.fileInputs.frontBg.addEventListener("change", (e) =>
        UIManager.handleImageUpload(e, {
          maxSizeMB: Config.MAX_BG_SIZE_MB,
          errorEl: DOMElements.errors.logoUpload,
          spinnerEl: DOMElements.spinners.frontBg,
          onSuccess: (url) => {
            CardManager.frontBgImageUrl = url;
            DOMElements.buttons.removeFrontBg.style.display = "block";
            CardManager.updateCardBackgrounds();
            StateManager.saveDebounced();
          },
        }),
      );

      DOMElements.fileInputs.backBg.addEventListener("change", (e) =>
        UIManager.handleImageUpload(e, {
          maxSizeMB: Config.MAX_BG_SIZE_MB,
          errorEl: DOMElements.errors.logoUpload,
          spinnerEl: DOMElements.spinners.backBg,
          onSuccess: (url) => {
            CardManager.backBgImageUrl = url;
            DOMElements.buttons.removeBackBg.style.display = "block";
            CardManager.updateCardBackgrounds();
            StateManager.saveDebounced();
          },
        }),
      );

      DOMElements.fileInputs.qrCode.addEventListener("change", (e) =>
        UIManager.handleImageUpload(e, {
          maxSizeMB: Config.MAX_LOGO_SIZE_MB,
          errorEl: DOMElements.errors.qrUpload,
          spinnerEl: DOMElements.spinners.qr,
          onSuccess: (imageUrl) => {
            CardManager.qrCodeImageUrl = imageUrl;
            DOMElements.qrImageUrlInput.value = imageUrl;
            CardManager.updateQrCodeDisplay();
            StateManager.saveDebounced();
          },
        }),
      );

      DOMElements.themeGallery.addEventListener("click", (e) => {
        const thumbnail = e.target.closest(".theme-thumbnail");
        if (thumbnail) {
          const themeKey = thumbnail.dataset.themeKey;
          CardManager.applyTheme(themeKey);
        }
      });

      DOMElements.buttons.addPhone.addEventListener("click", () => {
        CardManager.createPhoneInput();
        CardManager.renderPhoneButtons();
      });
      DOMElements.buttons.addSocial.addEventListener("click", () =>
        CardManager.addSocialLink(),
      );
      DOMElements.buttons.reset.addEventListener("click", () =>
        StateManager.reset(),
      );
      DOMElements.layoutSelect.addEventListener("change", (e) =>
        CardManager.applyLayout(e.target.value),
      );
      DOMElements.buttons.directionToggle.addEventListener(
        "click",
        UIManager.toggleDirection,
      );
      DOMElements.buttons.startTour.addEventListener("click", () =>
        TourManager.start(),
      );

      DOMElements.buttons.shareCard.addEventListener("click", () => {
        if (typeof gtag === "function") {
          gtag("event", "share_card", { share_type: "viewer_link" });
        }
        ShareManager.shareCard();
      });

      DOMElements.buttons.shareEditor.addEventListener("click", () => {
        if (typeof gtag === "function") {
          gtag("event", "share_editor");
        }
        ShareManager.shareEditor();
      });

      DOMElements.draggable.logo.addEventListener("click", (e) => {
        e.preventDefault();
        e.stopPropagation();
        UIManager.navigateToAndHighlight("logo-drop-zone");
      });
      DOMElements.draggable.photo.addEventListener("click", (e) => {
        e.preventDefault();
        e.stopPropagation();
        UIManager.navigateToAndHighlight("photo-controls-fieldset");
      });
      DOMElements.draggable.name.addEventListener("click", (e) => {
        e.preventDefault();
        e.stopPropagation();
        UIManager.navigateToAndHighlight("input-name");
      });
      DOMElements.draggable.tagline.addEventListener("click", (e) => {
        e.preventDefault();
        e.stopPropagation();
        UIManager.navigateToAndHighlight("input-tagline");
      });
      DOMElements.draggable.qr.addEventListener("click", (e) => {
        e.preventDefault();
        e.stopPropagation();
        UIManager.navigateToAndHighlight("qr-code-accordion");
      });

      const flipCard = () => {
        DOMElements.cardsWrapper.classList.toggle("is-flipped");
      };
      DOMElements.buttons.mobileFlip.addEventListener("click", (e) => {
        e.stopPropagation();
        flipCard();
      });
      DOMElements.buttons.togglePhone.addEventListener("input", () => {
        CardManager.updatePhoneButtonsVisibility();
      });
      DOMElements.buttons.toggleSocial.addEventListener("input", () => {
        CardManager.updateSocialLinksVisibility();
        CardManager.updateSocialButtonStyles();
        CardManager.updateSocialTextStyles();
      });

      const phoneTextControlsList = [
        ...DOMElements.phoneTextControls.layoutRadios,
        DOMElements.phoneTextControls.size,
        DOMElements.phoneTextControls.color,
        DOMElements.phoneTextControls.font,
      ];
      phoneTextControlsList.forEach((control) => {
        control.addEventListener("input", () => {
          CardManager.updatePhoneTextStyles();
        });
      });

      DOMElements.buttons.removeFrontBg.addEventListener("click", () => {
        CardManager.frontBgImageUrl = null;
        DOMElements.fileInputs.frontBg.value = "";
        DOMElements.frontBgOpacity.value = 1;
        DOMElements.frontBgOpacity.dispatchEvent(new Event("input"));
        DOMElements.buttons.removeFrontBg.style.display = "none";
        CardManager.updateCardBackgrounds();
        StateManager.saveDebounced();
      });
      DOMElements.buttons.removeBackBg.addEventListener("click", () => {
        CardManager.backBgImageUrl = null;
        DOMElements.fileInputs.backBg.value = "";
        DOMElements.backBgOpacity.value = 1;
        DOMElements.backBgOpacity.dispatchEvent(new Event("input"));
        DOMElements.buttons.removeBackBg.style.display = "none";
        CardManager.updateCardBackgrounds();
        StateManager.saveDebounced();
      });

      DOMElements.buttons.downloadPngFront.addEventListener("click", (e) => {
        if (typeof gtag === "function") {
          gtag("event", "save_card", { file_type: "png_front" });
        }
        ExportManager.pendingExportTarget = "front";
        UIManager.showModal(DOMElements.exportModal.overlay, e.currentTarget);
      });

      DOMElements.buttons.downloadPngBack.addEventListener("click", (e) => {
        if (typeof gtag === "function") {
          gtag("event", "save_card", { file_type: "png_back" });
        }
        ExportManager.pendingExportTarget = "back";
        UIManager.showModal(DOMElements.exportModal.overlay, e.currentTarget);
      });

      DOMElements.buttons.downloadPdf.addEventListener("click", async (e) => {
        if (typeof gtag === "function") {
          gtag("event", "save_card", { file_type: "pdf" });
        }
        const button = e.currentTarget;
        UIManager.setButtonLoadingState(button, true);
        try {
          await ExportManager.downloadPdf();
        } catch (error) {
        } finally {
          UIManager.setButtonLoadingState(button, false);
        }
      });

      DOMElements.buttons.downloadVcf.addEventListener("click", () => {
        if (typeof gtag === "function") {
          gtag("event", "save_card", { file_type: "vcf" });
        }
        ExportManager.downloadVcf();
      });

      DOMElements.buttons.downloadQrCode.addEventListener(
        "click",
        async (e) => {
          if (typeof gtag === "function") {
            gtag("event", "save_card", { file_type: "qr_code_link" });
          }
          const button = e.currentTarget;
          UIManager.setButtonLoadingState(button, true);
          try {
            await ExportManager.downloadQrCode();
          } catch (error) {
          } finally {
            UIManager.setButtonLoadingState(button, false);
          }
        },
      );

      DOMElements.buttons.backToTop.addEventListener("click", () => {
        window.scrollTo({ top: 0, behavior: "smooth" });
      });
      const handleScroll = () => {
        window.scrollY > 300
          ? DOMElements.buttons.backToTop.classList.add("visible")
          : DOMElements.buttons.backToTop.classList.remove("visible");
      };
      window.addEventListener("scroll", Utils.debounce(handleScroll, 100));
      DOMElements.exportModal.overlay.addEventListener("click", (e) => {
        if (e.target === DOMElements.exportModal.overlay)
          UIManager.hideModal(DOMElements.exportModal.overlay);
      });
      DOMElements.exportModal.closeBtn.addEventListener("click", () =>
        UIManager.hideModal(DOMElements.exportModal.overlay),
      );

      DOMElements.exportModal.confirmBtn.addEventListener("click", async () => {
        try {
          const options = {
            format: DOMElements.exportModal.format.value,
            quality: DOMElements.exportModal.quality.value / 100,
            scale: parseFloat(
              DOMElements.exportModal.scaleContainer.querySelector(".selected")
                .dataset.scale,
            ),
          };
          await ExportManager.downloadElement(options);
        } catch (error) {
          alert("فشل تحميل أداة الحفظ. يرجى المحاولة مرة أخرى.");
        }
      });

      DOMElements.exportModal.format.addEventListener("input", () => {
        DOMElements.exportModal.qualityGroup.style.display =
          DOMElements.exportModal.format.value === "jpeg" ? "block" : "none";
      });
      DOMElements.exportModal.quality.addEventListener("input", () => {
        DOMElements.exportModal.qualityValue.textContent =
          DOMElements.exportModal.quality.value;
      });
      DOMElements.exportModal.scaleContainer.addEventListener("click", (e) => {
        if (e.target.classList.contains("scale-btn")) {
          DOMElements.exportModal.scaleContainer
            .querySelector(".selected")
            .classList.remove("selected");
          e.target.classList.add("selected");
        }
      });

      DOMElements.buttons.saveToGallery.addEventListener("click", async (e) => {
        const button = e.currentTarget;
        UIManager.setButtonLoadingState(button, true, "جاري الحفظ...");
        try {
          await GalleryManager.addCurrentDesign();
        } finally {
          UIManager.setButtonLoadingState(button, false);
        }
      });
      DOMElements.buttons.showGallery.addEventListener("click", (e) => {
        GalleryManager.render();
        UIManager.showModal(DOMElements.galleryModal.overlay, e.currentTarget);
      });

      DOMElements.galleryModal.closeBtn.addEventListener("click", () =>
        UIManager.hideModal(DOMElements.galleryModal.overlay),
      );
      DOMElements.galleryModal.selectAllBtn.addEventListener("click", () =>
        DOMElements.galleryModal.grid
          .querySelectorAll(".gallery-item-select")
          .forEach((cb) => {
            cb.checked = true;
            cb.closest(".gallery-item").classList.add("selected");
            GalleryManager.updateSelectionState();
          }),
      );
      DOMElements.galleryModal.deselectAllBtn.addEventListener("click", () =>
        DOMElements.galleryModal.grid
          .querySelectorAll(".gallery-item-select")
          .forEach((cb) => {
            cb.checked = false;
            cb.closest(".gallery-item").classList.remove("selected");
            GalleryManager.updateSelectionState();
          }),
      );

      DOMElements.galleryModal.downloadZipBtn.addEventListener(
        "click",
        async (e) => {
          const button = e.currentTarget;
          UIManager.setButtonLoadingState(button, true, "جاري التجهيز...");
          try {
            await GalleryManager.downloadSelectedAsZip();
          } finally {
            StateManager.applyState(StateManager.getStateObject(), false);
            UIManager.setButtonLoadingState(button, false);
          }
        },
      );

      DOMElements.galleryModal.grid.addEventListener("change", (e) => {
        if (e.target.classList.contains("gallery-item-select")) {
          e.target
            .closest(".gallery-item")
            .classList.toggle("selected", e.target.checked);
          GalleryManager.updateSelectionState();
        }
      });
      DOMElements.shareModal.closeBtn.addEventListener("click", () =>
        UIManager.hideModal(DOMElements.shareModal.overlay),
      );
      DOMElements.shareModal.overlay.addEventListener("click", (e) => {
        if (e.target === DOMElements.shareModal.overlay)
          UIManager.hideModal(DOMElements.shareModal.overlay);
      });

      DOMElements.buttons.undoBtn.addEventListener("click", () =>
        HistoryManager.undo(),
      );
      DOMElements.buttons.redoBtn.addEventListener("click", () =>
        HistoryManager.redo(),
      );

      // ===== بداية الكود المضاف لمركز المساعدة =====
      DOMElements.buttons.showHelp.addEventListener("click", (e) => {
        UIManager.showModal(DOMElements.helpModal.overlay, e.currentTarget);
      });
      DOMElements.helpModal.closeBtn.addEventListener("click", () =>
        UIManager.hideModal(DOMElements.helpModal.overlay),
      );
      DOMElements.helpModal.overlay.addEventListener("click", (e) => {
        if (e.target === DOMElements.helpModal.overlay)
          UIManager.hideModal(DOMElements.helpModal.overlay);
      });

      DOMElements.helpModal.nav.addEventListener("click", (e) => {
        const button = e.target.closest(".help-tab-btn");
        if (!button) return;

        // إزالة active من كل الأزرار والصفحات
        DOMElements.helpModal.nav
          .querySelectorAll(".help-tab-btn")
          .forEach((btn) => btn.classList.remove("active"));
        DOMElements.helpModal.panes.forEach((pane) =>
          pane.classList.remove("active"),
        );

        // إضافة active للزر والصفحة المستهدفة
        button.classList.add("active");
        const targetPane = document.getElementById(button.dataset.tabTarget);
        if (targetPane) {
          targetPane.classList.add("active");
        }
      });
      // ===== نهاية الكود المضاف لمركز المساعدة =====
    },
  };
  const App = {
    initResponsiveLayout() {
      const isMobile = window.innerWidth <= 1200;
      const sourceContainer = document.getElementById("ui-elements-source");
      const mobileControlsContainer =
        document.querySelector(".controls-column");
      const desktopControlsContainer = document.querySelector(
        ".actions-column .desktop-controls-wrapper .tabs-content",
      );
      const desktopActionsContainer =
        document.querySelector(".controls-column");

      if (isMobile) {
        if (!mobileControlsContainer.querySelector(".mobile-tabs-nav")) {
          const mobileNav = document.createElement("div");
          mobileNav.className = "mobile-tabs-nav";
          mobileNav.innerHTML = `<button class="mobile-tab-btn active" data-tab-target="tab-front">الواجهة الأمامية</button><button class="mobile-tab-btn" data-tab-target="tab-back">الواجهة الخلفية</button><button class="mobile-tab-btn" data-tab-target="tab-actions">التصاميم والحفظ</button>`;
          const mobileTabsContent = document.createElement("div");
          mobileTabsContent.className = "tabs-content";
          mobileTabsContent.innerHTML = `<div id="tab-front" class="tab-pane active"></div><div id="tab-back" class="tab-pane"></div><div id="tab-actions" class="tab-pane"></div>`;
          mobileControlsContainer.innerHTML = "";
          mobileControlsContainer.appendChild(mobileNav);
          mobileControlsContainer.appendChild(mobileTabsContent);
        }
        document
          .querySelectorAll("#ui-elements-source [data-tab-destination]")
          .forEach((group) => {
            const destinationId = group.dataset.tabDestination;
            const destinationPane = document.getElementById(destinationId);
            if (destinationPane)
              Array.from(group.children).forEach((child) =>
                destinationPane.appendChild(child),
              );
          });
      } else {
        mobileControlsContainer.innerHTML = "";
        const frontControls = sourceContainer.querySelector(
          '[data-tab-destination="tab-front"]',
        );
        const backControls = sourceContainer.querySelector(
          '[data-tab-destination="tab-back"]',
        );
        const desktopFrontPane = document.createElement("div");
        desktopFrontPane.id = "tab-front";
        desktopFrontPane.className = "tab-pane active";
        const desktopBackPane = document.createElement("div");
        desktopBackPane.id = "tab-back";
        desktopBackPane.className = "tab-pane";
        if (frontControls)
          Array.from(frontControls.children).forEach((child) =>
            desktopFrontPane.appendChild(child),
          );
        if (backControls)
          Array.from(backControls.children).forEach((child) =>
            desktopBackPane.appendChild(child),
          );
        desktopControlsContainer.innerHTML = "";
        desktopControlsContainer.appendChild(desktopFrontPane);
        desktopControlsContainer.appendChild(desktopBackPane);
        const actionsControls = sourceContainer.querySelector(
          '[data-tab-destination="tab-actions"]',
        );
        if (actionsControls)
          Array.from(actionsControls.children).forEach((child) =>
            desktopActionsContainer.appendChild(child),
          );
      }
    },

    async init() {
      Object.assign(DOMElements, {
        cardFront: document.getElementById("card-front-preview"),
        cardBack: document.getElementById("card-back-preview"),
        cardFrontContent: document.getElementById("card-front-content"),
        cardBackContent: document.getElementById("card-back-content"),
        phoneNumbersContainer: document.getElementById(
          "phone-numbers-container",
        ),
        cardsWrapper: document.getElementById("cards-wrapper"),

        draggable: {
          logo: document.getElementById("card-logo"),
          photo: document.getElementById("card-personal-photo-wrapper"),
          name: document.getElementById("card-name"),
          tagline: document.getElementById("card-tagline"),
          qr: document.getElementById("qr-code-wrapper"),
        },

        photoControls: {
          url: document.getElementById("input-photo-url"),
          size: document.getElementById("photo-size"),
          shapeRadios: document.querySelectorAll('input[name="photo-shape"]'),
          borderColor: document.getElementById("photo-border-color"),
          borderWidth: document.getElementById("photo-border-width"),
        },

        themeGallery: document.getElementById("theme-gallery"),
        layoutSelect: document.getElementById("layout-select"),
        liveAnnouncer: document.getElementById("live-announcer"),
        saveToast: document.getElementById("save-toast"),
        nameInput: document.getElementById("input-name"),
        taglineInput: document.getElementById("input-tagline"),
        qrImageUrlInput: document.getElementById("input-qr-url"),
        qrCodeContainer: document.getElementById("qrcode-container"),
        qrCodeTempGenerator: document.getElementById("qr-code-temp-generator"),
        qrSourceRadios: document.querySelectorAll('input[name="qr-source"]'),
        qrUrlGroup: document.getElementById("qr-url-group"),
        qrUploadGroup: document.getElementById("qr-upload-group"),
        qrAutoCardGroup: document.getElementById("qr-auto-card-group"),
        qrSizeSlider: document.getElementById("qr-size"),
        phoneBtnBgColor: document.getElementById("phone-btn-bg-color"),
        phoneBtnTextColor: document.getElementById("phone-btn-text-color"),
        phoneBtnFontSize: document.getElementById("phone-btn-font-size"),
        phoneBtnFont: document.getElementById("phone-btn-font"),
        backButtonsBgColor: document.getElementById("back-buttons-bg-color"),
        backButtonsTextColor: document.getElementById(
          "back-buttons-text-color",
        ),
        backButtonsFont: document.getElementById("back-buttons-font"),
        frontBgOpacity: document.getElementById("front-bg-opacity"),
        backBgOpacity: document.getElementById("back-bg-opacity"),
        phoneBtnPadding: document.getElementById("phone-btn-padding"),
        backButtonsSize: document.getElementById("back-buttons-size"),
        nameColor: document.getElementById("name-color"),
        nameFontSize: document.getElementById("name-font-size"),
        nameFont: document.getElementById("name-font"),
        taglineColor: document.getElementById("tagline-color"),
        taglineFontSize: document.getElementById("tagline-font-size"),
        taglineFont: document.getElementById("tagline-font"),
        social: {
          input: document.getElementById("social-media-input"),
          container: document.getElementById("dynamic-social-links-container"),
          typeSelect: document.getElementById("social-media-type"),
        },
        fileInputs: {
          logo: document.getElementById("input-logo-upload"),
          photo: document.getElementById("input-photo-upload"),
          frontBg: document.getElementById("front-bg-upload"),
          backBg: document.getElementById("back-bg-upload"),
          qrCode: document.getElementById("input-qr-upload"),
        },
        previews: { logo: document.getElementById("logo-preview") },
        errors: {
          logoUpload: document.getElementById("logo-upload-error"),
          photoUpload: document.getElementById("photo-upload-error"),
          qrUpload: document.getElementById("qr-upload-error"),
        },
        spinners: {
          logo: document.getElementById("logo-spinner"),
          photo: document.getElementById("photo-spinner"),
          frontBg: document.getElementById("front-bg-spinner"),
          backBg: document.getElementById("back-bg-spinner"),
          qr: document.getElementById("qr-spinner"),
        },
        sounds: {
          success: document.getElementById("audio-success"),
          error: document.getElementById("audio-error"),
        },
        phoneTextControls: {
          container: document.getElementById("phone-text-controls"),
          layoutRadios: document.querySelectorAll(
            'input[name="phone-text-layout"]',
          ),
          size: document.getElementById("phone-text-size"),
          color: document.getElementById("phone-text-color"),
          font: document.getElementById("phone-text-font"),
        },
        socialTextControls: {
          container: document.getElementById("social-text-controls"),
          size: document.getElementById("social-text-size"),
          color: document.getElementById("social-text-color"),
          font: document.getElementById("social-text-font"),
        },
        exportLoadingOverlay: document.getElementById("export-loading-overlay"),
        exportModal: {
          overlay: document.getElementById("export-modal-overlay"),
          closeBtn: document.getElementById("export-modal-close"),
          confirmBtn: document.getElementById("confirm-export-btn"),
          format: document.getElementById("export-format"),
          qualityGroup: document.getElementById("export-quality-group"),
          quality: document.getElementById("export-quality"),
          qualityValue: document.getElementById("export-quality-value"),
          scaleContainer: document.querySelector(".scale-buttons"),
        },
        galleryModal: {
          overlay: document.getElementById("gallery-modal-overlay"),
          closeBtn: document.getElementById("gallery-modal-close"),
          grid: document.getElementById("gallery-grid"),
          selectAllBtn: document.getElementById("gallery-select-all"),
          deselectAllBtn: document.getElementById("gallery-deselect-all"),
          downloadZipBtn: document.getElementById("gallery-download-zip"),
        },
        shareModal: {
          overlay: document.getElementById("share-fallback-modal-overlay"),
          closeBtn: document.getElementById("share-fallback-modal-close"),
          email: document.getElementById("share-email"),
          whatsapp: document.getElementById("share-whatsapp"),
          twitter: document.getElementById("share-twitter"),
          copyLink: document.getElementById("share-copy-link"),
        },
        // ===== بداية الإضافة لمركز المساعدة =====
        helpModal: {
          overlay: document.getElementById("help-modal-overlay"),
          closeBtn: document.getElementById("help-modal-close"),
          nav: document.querySelector(".help-tabs-nav"),
          panes: document.querySelectorAll(".help-tab-pane"),
        },
        // ===== نهاية الإضافة لمركز المساعدة =====
        buttons: {
          addPhone: document.getElementById("add-phone-btn"),
          addSocial: document.getElementById("add-social-btn"),
          directionToggle: document.getElementById("direction-toggle-btn"),
          startTour: document.getElementById("start-wizard-btn"),
          removeFrontBg: document.getElementById("remove-front-bg-btn"),
          removeBackBg: document.getElementById("remove-back-bg-btn"),
          backToTop: document.getElementById("back-to-top-btn"),
          mobileFlip: document.getElementById("mobile-flip-btn"),
          togglePhone: document.getElementById("toggle-phone-buttons"),
          toggleSocial: document.getElementById("toggle-social-buttons"),
          saveToGallery: document.getElementById("save-to-gallery-btn"),
          showGallery: document.getElementById("show-gallery-btn"),
          shareCard: document.getElementById("share-card-btn"),
          shareEditor: document.getElementById("share-editor-btn"),
          downloadPngFront: document.getElementById("download-png-front"),
          downloadPngBack: document.getElementById("download-png-back"),
          downloadPdf: document.getElementById("download-pdf"),
          downloadVcf: document.getElementById("download-vcf"),
          downloadQrCode: document.getElementById("download-qrcode"),
          reset: document.getElementById("reset-design-btn"),
          undoBtn: document.getElementById("undo-btn"),
          redoBtn: document.getElementById("redo-btn"),
          generateAutoQr: document.getElementById("generate-auto-qr-btn"),
          showHelp: document.getElementById("show-help-btn"),
        },
      });

      this.initResponsiveLayout();
      window.addEventListener(
        "resize",
        Utils.debounce(() => this.initResponsiveLayout(), 150),
      );

      UIManager.init();
      UIManager.fetchAndPopulateBackgrounds();
      GalleryManager.init();
      EventManager.bindEvents();

      const loadedFromUrl = await ShareManager.loadFromUrl();
      if (loadedFromUrl) {
        HistoryManager.pushState(StateManager.getStateObject());
        UIManager.announce("تم تحميل التصميم من الرابط بنجاح.");
      } else {
        const loadedFromStorage = StateManager.load();
        if (loadedFromStorage) {
          HistoryManager.pushState(StateManager.getStateObject());
          UIManager.announce("تم استعادة التصميم المحفوظ.");
        } else {
          StateManager.applyState(Config.defaultState, false);
          HistoryManager.pushState(Config.defaultState);
          UIManager.announce("تم تحميل التصميم الافتراضي.");
        }
      }

      const initialQrSource =
        document.querySelector('input[name="qr-source"]:checked')?.value ||
        "auto-card";
      DOMElements.qrUrlGroup.style.display =
        initialQrSource === "custom" ? "block" : "none";
      DOMElements.qrUploadGroup.style.display =
        initialQrSource === "upload" ? "block" : "none";
      DOMElements.qrAutoCardGroup.style.display =
        initialQrSource === "auto-card" ? "block" : "none";

      CardManager.updatePhoneButtonsVisibility();
      CardManager.updatePhoneTextStyles();
      DragManager.init();

      TabManager.init(".mobile-tabs-nav", ".mobile-tab-btn");
      TabManager.init(".desktop-tabs-nav", ".desktop-tab-btn");

      UIManager.announce("محرر بطاقة الأعمال جاهز للاستخدام.");

      if (!localStorage.getItem(Config.DND_HINT_SHOWN_KEY)) {
        setTimeout(() => UIManager.showDragAndDropHints(), 1000);
        localStorage.setItem(Config.DND_HINT_SHOWN_KEY, "true");
      }

      TourManager.init();
      if (!localStorage.getItem(TourManager.TOUR_SHOWN_KEY)) {
        setTimeout(() => {
          TourManager.start();
        }, 1500);
      }
    },
  };
  document.addEventListener("DOMContentLoaded", () => App.init());
})();
