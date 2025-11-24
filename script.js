// script.js

(function () {
  "use strict";
  const focusTrapListeners = new Map(); // <--- أضف هذا السطر هنا
  const Config = {
    API_BASE_URL: "https://nfc-vjy6.onrender.com", // تأكد من أن هذا هو الرابط الصحيح
    LOCAL_STORAGE_KEY: "digitalCardEditorState_v19",
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

    // --- ========================================= ---
    // --- === MODIFICATION START (Default State) === ---
    // --- ========================================= ---
    defaultState: {
      inputs: {
        "layout-select": "classic",
        "input-logo": "https://www.mcprim.com/nfc/mcprime-logo-transparent.png",
        "logo-size": 25,
        "logo-opacity": 1,
        "input-photo-url": "",
        "photo-size": 25,
        "photo-shape": "circle",
        "photo-border-color": "#ffffff",
        "photo-border-width": 2,
        "input-name": "اسمك الكامل هنا",
        "name-font-size": 22,
        "name-color": "#e6f0f7",
        "name-font": "Tajawal, sans-serif",
        "input-tagline": "شركتك / نشاطك التجاري",
        "tagline-font-size": 14,
        "tagline-color": "#4da6ff",
        "tagline-font": "Tajawal, sans-serif",
        "toggle-phone-buttons": true,
        "phone-text-layout": "row",
        "phone-text-size": 14,
        "phone-text-color": "#e6f0f7",
        "phone-text-font": "Tajawal, sans-serif",
        "phone-btn-bg-color": "#4da6ff",
        "phone-btn-text-color": "#ffffff",
        "phone-btn-font-size": 12,
        "phone-btn-padding": 6,
        "phone-btn-font": "Poppins, sans-serif",
        "front-bg-start": "#2a3d54",
        "front-bg-end": "#223246",
        "front-bg-opacity": 1,
        "qr-source": "auto-vcard",
        "input-qr-url": "https://www.mcprim.com/nfc/mcprime_qr.png",
        "qr-size": 25,
        "back-bg-start": "#2a3d54",
        "back-bg-end": "#223246",
        "back-bg-opacity": 1,
        "back-buttons-size": 10,
        "back-buttons-bg-color": "#364f6b",
        "back-buttons-text-color": "#aab8c2",
        "back-buttons-font": "Poppins, sans-serif",
        "theme-select-input": "deep-sea",
        "toggle-master-social": true,
        "toggle-social-buttons": true,
        "social-text-size": 12,
        "social-text-color": "#e6f0f7",
        "social-text-font": "Tajawal, sans-serif",
        "input-static-email-color": "#e6f0f7",
        "input-static-email-size": 12,
        "input-static-website-color": "#e6f0f7",
        "input-static-website-size": 12,
        "input-static-whatsapp-color": "#e6f0f7",
        "input-static-whatsapp-size": 12,
        "input-static-facebook-color": "#e6f0f7",
        "input-static-facebook-size": 12,
        "input-static-linkedin-color": "#e6f0f7",
        "input-static-linkedin-size": 12,
      },
      dynamic: {
        phones: [
          // تم التعديل: الإبقاء على رقم هاتف واحد فقط
          {
            id: `phone${Date.now()}_0`,
            value: "01000000000",
            placement: "front",
          },
        ],
        social: [],
        staticSocial: {
          // تم التعديل: الإبقاء على الايميل وفيسبوك فقط
          email: { value: "your-email@example.com", placement: "back" },
          website: { value: "", placement: "back" }, // تم الإفراغ
          whatsapp: { value: "", placement: "back" }, // تم الإفراغ
          facebook: { value: "yourprofile", placement: "back" },
          linkedin: { value: "", placement: "back" }, // تم الإفراغ
        },
        qr: { enabled: true },
      },
      imageUrls: {
        front: null,
        back: null,
        qrCode: null,
        photo: null,
      },
      positions: {
        "card-logo": { x: 0, y: 0 },
        "card-personal-photo-wrapper": { x: 0, y: 0 },
        "card-name": { x: 0, y: 0 },
        "card-tagline": { x: 0, y: 0 },
        "card-phones-wrapper": { x: 0, y: 0 },
        "qr-code-wrapper": { x: 0, y: 0 },
        "social-link-static-email": { x: 0, y: 0 },
        "social-link-static-website": { x: 0, y: 0 },
        "social-link-static-whatsapp": { x: 0, y: 0 },
        "social-link-static-facebook": { x: 0, y: 0 },
        "social-link-static-linkedin": { x: 0, y: 0 },
      },
      placements: {
        logo: "front",
        photo: "front", // (هذا مخفي افتراضياً لأن input-photo-url فارغ)
        name: "front",
        tagline: "front",
        qr: "back",
      },
    },
    // --- ========================================= ---
    // --- === MODIFICATION END (Default State) === ---
    // --- ========================================= ---

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
    BACKGROUNDS: [],
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

      // الخطوات المعدلة لتبدأ باختيار التصميم/الخلفية
      const steps = [
        {
          id: "welcome",
          title: "مرحباً بك في MC PRIME!",
          text: "أهلاً بك في محرر بطاقات الأعمال الذكية. لنبدأ بوضع اللمسات الجمالية لبطاقتك.",
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
          id: "design_theme",
          title: "1. اختر التصميم أو الخلفية",
          text: "من هنا يمكنك اختيار قالب جاهز أو تحديد صورة خلفية للوجه الأمامي والخلفي لبطاقتك.",
          attachTo: { element: "#designs-fieldset-source", on: "right" },
          buttons: [
            {
              text: "السابق",
              action() {
                return this.back();
              },
            },
            {
              text: "التالي (عناصر الواجهة)",
              action() {
                UIManager.navigateToAndHighlight("tab-front"); // التبديل إلى تبويب عناصر الواجهة الأمامية
                return this.next();
              },
            },
          ],
        },
        {
          id: "card_elements",
          title: "2. إضافة العناصر وتحديد موضعها",
          text: 'أدخل اسمك، وأضف شعارك/صورتك. *مهم:* استخدم أزرار "أمامي/خلفي" لتحديد الوجه الذي سيظهر عليه العنصر. ',
          attachTo: { element: "#name-tagline-accordion", on: "right" },
        },
        {
          id: "element_placement",
          title: "3. نقل العناصر (اختياري)",
          text: 'يمكنك تغيير موضع أي عنصر عن طريق سحبه وإفلاته مباشرة على البطاقة، أو باستخدام أدوات "التحريك الدقيق" في لوحة التحكم.',
          attachTo: { element: "#card-name", on: "top" },
        },
        {
          id: "saving_sharing",
          title: "4. الحفظ والمشاركة",
          text: 'عندما يصبح تصميمك جاهزاً، استخدم خيارات "تنزيل" و "مشاركة الكارت" للحفظ والاستخدام.',
          attachTo: { element: "#export-fieldset-source", on: "left" },
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

      // تعديلات الموبايل
      if (window.innerWidth <= 1200) {
        steps[1].attachTo = { element: "#designs-fieldset-source", on: "top" };
        steps[2].attachTo = { element: "#name-tagline-accordion", on: "top" };
        steps[4].attachTo = { element: "#export-fieldset-source", on: "top" };
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
      const targetElement = document.getElementById(targetId);
      if (targetElement) {
        targetElement.classList.toggle("highlighted", state);
        if (
          targetElement.classList.contains("phone-button-draggable-wrapper") ||
          targetElement.classList.contains("draggable-social-link")
        ) {
          targetElement
            .querySelector("a")
            .classList.toggle("highlighted", state);
        }
      }
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

        // --- MODIFICATION: Updated selector to find the correct tab button ---
        const buttonSelector = isMobile
          ? `.mobile-tab-btn[data-tab-target="#${paneId}"]` // Added #
          : `.desktop-tab-btn[data-tab-target="#${paneId}"]`; // Added #

        const buttonToClick = document.querySelector(buttonSelector);

        if (buttonToClick) {
          const allButtonsSelector = isMobile
            ? ".mobile-tab-btn"
            : ".desktop-tab-btn";
          const allButtons = document.querySelectorAll(allButtonsSelector);
          const allPanes = document.querySelectorAll(".tab-pane");
          // --- MODIFICATION: Pass the target ID with a # ---
          TabManager.switchTab(
            `#${paneId}`,
            buttonToClick,
            allButtons,
            allPanes,
          );
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

        // --- MODIFICATION: Check if target is inside a scrollable column ---
        const scrollContainer =
          window.innerWidth <= 1200
            ? highlightTarget.closest(".controls-column")
            : highlightTarget.closest(".controls-column") ||
              highlightTarget.closest(".actions-column");

        if (scrollContainer) {
          // Scroll within the column
          const targetTop = highlightTarget.offsetTop;
          const containerTop = scrollContainer.scrollTop;
          const containerHeight = scrollContainer.clientHeight;

          // Check if element is out of view
          if (
            targetTop < containerTop ||
            targetTop + highlightTarget.clientHeight >
              containerTop + containerHeight
          ) {
            scrollContainer.scrollTo({
              top: targetTop - (scrollContainer.offsetTop + 20), // Adjust for container's own offset and padding
              behavior: "smooth",
            });
          }
        } else {
          // Fallback to scrolling the whole window (for mobile)
          highlightTarget.scrollIntoView({
            behavior: "smooth",
            block: "center",
          });
        }
        // --- END MODIFICATION ---

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
      const eventListener = this.trapFocus(modalOverlay); // بافتراض أن trapFocus تُرجع المستمع
      focusTrapListeners.set(modalOverlay, eventListener); // خزّن في الـ Map
    },
    hideModal(modalOverlay) {
      modalOverlay.classList.remove("visible");
      const triggerElementId = modalOverlay.dataset.triggerElementId;
      const triggerElement = document.getElementById(triggerElementId);
      if (triggerElement) {
        triggerElement.setAttribute("aria-expanded", "false");
        triggerElement.focus();
      }
      const eventListener = focusTrapListeners.get(modalOverlay); // استرد من الـ Map
      if (eventListener) {
        modalOverlay.removeEventListener("keydown", eventListener);
        focusTrapListeners.delete(modalOverlay); // أزل من الـ Map
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
      this.setupDropzones();
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
    setupDropzones() {
      interact(".card-content-layer").dropzone({
        accept: ".draggable-on-card",
        overlap: 0.5,
        ondrop: (event) => {
          // --- MODIFICATION: This drop logic is now only relevant in desktop view ---
          if (window.innerWidth <= 1200) return;

          const droppedElement = event.relatedTarget;
          const dropzone = event.target;
          const newPlacement =
            dropzone.id === "card-front-content" ? "front" : "back";

          const placementMap = {
            "card-logo": "logo",
            "card-personal-photo-wrapper": "photo",
            "card-name": "name",
            "card-tagline": "tagline",
            "qr-code-wrapper": "qr",
          };

          let controlName = placementMap[droppedElement.id];
          let radioToSelect;

          if (controlName) {
            radioToSelect = document.querySelector(
              `input[name="placement-${controlName}"][value="${newPlacement}"]`,
            );
          } else if (
            droppedElement.classList.contains("phone-button-draggable-wrapper")
          ) {
            const phoneId = droppedElement.id;
            radioToSelect = document.querySelector(
              `#phone-control-${phoneId} input[name="placement-${phoneId}"][value="${newPlacement}"]`,
            );
          } else if (
            droppedElement.classList.contains("draggable-social-link")
          ) {
            const controlId = droppedElement.dataset.controlId;
            const controlElement = document.getElementById(controlId);
            if (controlElement) {
              const radioName = controlElement.querySelector(
                'input[type="radio"]',
              )?.name;
              if (radioName) {
                radioToSelect = controlElement.querySelector(
                  `input[name="${radioName}"][value="${newPlacement}"]`,
                );
              }
            }
          }

          if (radioToSelect && !radioToSelect.checked) {
            radioToSelect.checked = true;

            droppedElement.style.transform = "translate(0px, 0px)";
            droppedElement.setAttribute("data-x", "0");
            droppedElement.setAttribute("data-y", "0");

            CardManager.renderCardContent();
            StateManager.saveDebounced();
          }
        },
        ondragenter: (event) => {
          if (window.innerWidth > 1200)
            event.target.classList.add("drop-target-active");
        },
        ondragleave: (event) =>
          event.target.classList.remove("drop-target-active"),
        ondropdeactivate: (event) =>
          event.target.classList.remove("drop-target-active"),
      });
    },
    dragStartListener(event) {
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
          wrapper.className =
            "phone-button-draggable-wrapper draggable-on-card";
          wrapper.dataset.controlId = group.id;

          const pos = phoneData.position || { x: 0, y: 0 };
          wrapper.style.position = "absolute"; // تأكيد position: absolute
          wrapper.style.transform = `translate(${pos.x}px, ${pos.y}px)`;
          wrapper.setAttribute("data-x", pos.x);
          wrapper.setAttribute("data-y", pos.y);

          const phoneLink = document.createElement("a");
          phoneLink.href = `tel:${phoneData.value.replace(/[^0-9+]/g, "")}`;
          phoneLink.className = "phone-button";

          const icon = createElement("i", {
            className: "fas fa-phone-alt",
            "aria-hidden": "true",
          });

          const span = createElement("span", {
            textContent: phoneData.value,
          });

          const copyBtn = createElement(
            "button",
            {
              className: "copy-btn no-export",
              title: "نسخ الرقم",
              "aria-label": `نسخ الرقم ${phoneData.value}`,
              onclick: (e) => {
                e.preventDefault();
                e.stopPropagation();
                Utils.copyTextToClipboard(phoneData.value).then((success) => {
                  if (success) showToast("تم نسخ الرقم!", "success");
                });
              },
            },
            [
              createElement("i", {
                className: "fas fa-copy",
                "aria-hidden": "true",
              }),
            ],
          );

          phoneLink.appendChild(icon);
          phoneLink.appendChild(span);
          phoneLink.appendChild(copyBtn);

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

          const hint = document.createElement("i");
          hint.className = "fas fa-arrows-alt dnd-hover-hint";
          wrapper.appendChild(hint);

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

      const positionControl = document.createElement("div");
      positionControl.className = "form-group";
      positionControl.innerHTML = `
                <label>تحريك دقيق (بالبكسل)</label>
                <div class="position-controls-grid" data-target-id="${id}"> 
                    <button type="button" class="btn-icon move-btn" data-direction="up" title="للأعلى"><i class="fas fa-arrow-up"></i></button>
                    <div class="controls-row">
                        <button type="button" class="btn-icon move-btn" data-direction="left" title="لليسار"><i class="fas fa-arrow-left"></i></button>
                        <button type="button" class="btn-icon move-btn" data-direction="right" title="لليمين"><i class="fas fa-arrow-right"></i></button>
                    </div>
                    <button type="button" class="btn-icon move-btn" data-direction="down" title="للأسفل"><i class="fas fa-arrow-down"></i></button>
                </div>
            `;

      mainContent.append(inputWrapper, placementControl, positionControl);
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

      positionControl.querySelectorAll(".move-btn").forEach((button) => {
        button.addEventListener("click", (e) => {
          e.preventDefault();
          EventManager.moveElement(id, button.dataset.direction);
        });
      });

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
          elements[key].style.position = "absolute";
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

      const hint = document.createElement("i");
      hint.className = "fas fa-arrows-alt dnd-hover-hint";
      qrWrapper.appendChild(hint);

      qrWrapper.style.width = `${DOMElements.qrSizeSlider.value}%`;
    },

    // ===== دالة جديدة مضافة =====
    handleMasterSocialToggle() {
      const isEnabled = DOMElements.buttons.toggleMasterSocial
        ? DOMElements.buttons.toggleMasterSocial.checked
        : true;

      // 1. إخفاء/إظهار لوحة التحكم الفرعية
      if (DOMElements.socialControlsWrapper) {
        DOMElements.socialControlsWrapper.style.display = isEnabled
          ? "block"
          : "none";
      }

      // 2. إعادة رسم الروابط (ستكون فارغة إذا كان المفتاح مطفأ)
      this.updateSocialLinks();
    },
    // ===== نهاية الدالة الجديدة =====

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

    // ============================================
    //  بداية التعديل: إصلاح تداخل الألوان
    // ============================================
    updateSocialButtonStyles() {
      const backButtonBgColor = DOMElements.backButtonsBgColor.value;
      const backButtonTextColor = DOMElements.backButtonsTextColor.value;
      const backButtonFont = DOMElements.backButtonsFont.value;
      const backButtonSize = DOMElements.backButtonsSize.value;

      document
        .querySelectorAll(".draggable-social-link:not(.text-only-mode) a")
        .forEach((link) => {
          Object.assign(link.style, {
            backgroundColor: backButtonBgColor,
            color: backButtonTextColor,
            fontFamily: backButtonFont,
            fontSize: `${backButtonSize}px`,
            padding: `${backButtonSize * 0.5}px ${backButtonSize}px`,
          });

          // إعادة تعيين أنماط النص
          const icon = link.querySelector("i");
          const span = link.querySelector("span");
          if (icon) icon.style.color = "";
          if (span) {
            span.style.color = "";
            span.style.fontSize = "";
            span.style.fontFamily = "";
          }
        });
    },

    updateSocialTextStyles() {
      // جلب الإعدادات العامة
      const generalSize = DOMElements.socialTextControls.size.value;
      const generalColor = DOMElements.socialTextControls.color.value;
      const generalFont = DOMElements.socialTextControls.font.value;

      document
        .querySelectorAll(".draggable-social-link.text-only-mode")
        .forEach((wrapper) => {
          const link = wrapper.querySelector("a");
          if (!link) return;

          const icon = link.querySelector("i");
          const span = link.querySelector("span");
          const controlId = wrapper.dataset.controlId; // مثل "form-group-email" أو "social-control-dynsocial_123"

          let specificColor = null;
          let specificSize = null;

          // جلب الإعدادات الخاصة إذا وجدت
          if (controlId && controlId.startsWith("form-group-static-")) {
            const type = controlId.replace("form-group-static-", "");
            specificColor = document.getElementById(
              `input-static-${type}-color`,
            )?.value;
            specificSize = document.getElementById(
              `input-static-${type}-size`,
            )?.value;
          } else if (
            controlId &&
            controlId.startsWith("social-control-dynsocial_")
          ) {
            const id = controlId.replace("social-control-", "");
            specificColor = document.getElementById(`input-${id}-color`)?.value;
            specificSize = document.getElementById(`input-${id}-size`)?.value;
          }

          // تحديد اللون والحجم النهائي (الخاص أولاً، ثم العام)
          const finalColor =
            specificColor && specificColor !== "#e6f0f7"
              ? specificColor
              : generalColor;
          const finalSize =
            specificSize && specificSize !== "12" ? specificSize : generalSize;

          // تطبيق الأنماط على الرابط لإلغاء أنماط الزر
          Object.assign(link.style, {
            color: finalColor, // تطبيق اللون النهائي على الرابط
            backgroundColor: "transparent",
            padding: "2px",
            fontSize: "", // إزالة أي حجم خط سابق
            fontFamily: "", // إزالة أي خط سابق
          });

          // تطبيق الأنماط على الأيقونة والنص
          if (icon) icon.style.color = finalColor;
          if (span) {
            span.style.fontSize = `${finalSize}px`;
            span.style.color = finalColor;
            span.style.fontFamily = generalFont; // الخط العام يطبق دائماً
          }
        });
    },
    // ============================================
    //  نهاية التعديل
    // ============================================

    updateSocialLinks() {
      document
        .querySelectorAll(".draggable-social-link")
        .forEach((el) => el.remove());

      // ============================================
      //  الإضافة الحاسمة هنا:
      // ============================================
      const isMasterEnabled = DOMElements.buttons.toggleMasterSocial
        ? DOMElements.buttons.toggleMasterSocial.checked
        : true;
      if (!isMasterEnabled) {
        // إذا كان المفتاح الرئيسي مطفأ، لا تكمل الدالة.
        // (تم حذف الروابط في السطر الأول، لذا ستختفي البطاقة)
        return;
      }
      // ============================================
      //  نهاية الإضافة
      // ============================================

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
        const elementId = id.startsWith("static-")
          ? `social-link-${id}`
          : `social-link-${id.replace(/[^a-zA-Z0-9-]/g, "-")}`;

        const linkWrapper = document.createElement("div");
        linkWrapper.id = elementId;
        linkWrapper.className = "draggable-social-link draggable-on-card";
        linkWrapper.dataset.controlId = controlId; // الربط بعنصر التحكم

        const pos = position || { x: 0, y: 0 };
        linkWrapper.style.position = "absolute";
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

        const hint = document.createElement("i");
        hint.className = "fas fa-arrows-alt dnd-hover-hint";
        linkWrapper.appendChild(hint);

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
              controlId: `form-group-static-${method.id}`, // <-- تم تعديل المعرف
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
                : `social-media-input`, // الربط بالمعرف الصحيح
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
        const designId = await ShareManager.saveDesign(); // يستخدم الدالة المعدلة
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
      linkEl.className = "dynamic-input-group dynamic-social-link";
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
                <span style="flex-grow: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${platform.name}: ${value}</span>
                <button class="remove-btn" aria-label="حذف رابط ${platform.name}">×</button>
            `;

      const elementId = `social-link-${id.replace(/[^a-zA-Z0-9-]/g, "-")}`; // تعديل لضمان معرف صالح

      const placementControl = document.createElement("div");
      placementControl.className = "placement-control";
      placementControl.innerHTML = `
                <div class="radio-group">
                    <label><input type="radio" name="placement-${id}" value="front"> أمامي</label>
                    <label><input type="radio" name="placement-${id}" value="back" checked> خلفي</label>
                </div>
            `;

      const positionControl = document.createElement("div");
      positionControl.className = "form-group";
      positionControl.innerHTML = `
                <label>تحريك دقيق (بالبكسل)</label>
                <div class="position-controls-grid" data-target-id="${elementId}"> 
                    <button type="button" class="btn-icon move-btn" data-direction="up" title="للأعلى"><i class="fas fa-arrow-up"></i></button>
                    <div class="controls-row">
                        <button type="button" class="btn-icon move-btn" data-direction="left" title="لليسار"><i class="fas fa-arrow-left"></i></button>
                        <button type="button" class="btn-icon move-btn" data-direction="right" title="لليمين"><i class="fas fa-arrow-right"></i></button>
                    </div>
                    <button type="button" class="btn-icon move-btn" data-direction="down" title="للأسفل"><i class="fas fa-arrow-down"></i></button>
                </div>
            `;

      // ===== إضافة خانات التحكم الخاصة =====
      const formattingControl = document.createElement("details");
      formattingControl.className = "fieldset-accordion";
      formattingControl.style.backgroundColor = "var(--page-bg)";
      formattingControl.innerHTML = `
                <summary style="padding: 8px 12px; font-size: 0.9rem;">تنسيقات خاصة (للنص)</summary>
                <div class="fieldset-content" style="padding: 10px;">
                    <div class="control-grid">
                        <div class="form-group">
                            <label for="input-${id}-color">لون الخط</label>
                            <input type="color" id="input-${id}-color" value="#e6f0f7">
                        </div>
                        <div class="form-group">
                            <label for="input-${id}-size">حجم الخط</label>
                            <input type="range" id="input-${id}-size" min="10" max="24" value="12">
                        </div>
                    </div>
                </div>
            `;
      // ===== نهاية الإضافة =====

      mainContent.append(
        infoWrapper,
        placementControl,
        positionControl,
        formattingControl,
      ); // إضافة formattingControl
      linkEl.appendChild(mainContent);

      const handleUpdate = () => {
        this.updateSocialLinks();
        StateManager.saveDebounced();
        this.generateVCardQrDebounced();
      };
      infoWrapper.querySelector(".remove-btn").addEventListener("click", () => {
        linkEl.remove();
        handleUpdate();
      });
      placementControl
        .querySelectorAll('input[type="radio"]')
        .forEach((radio) => radio.addEventListener("change", handleUpdate));

      positionControl.querySelectorAll(".move-btn").forEach((button) => {
        button.addEventListener("click", (e) => {
          e.preventDefault();
          EventManager.moveElement(elementId, button.dataset.direction);
        });
      });

      // ===== ربط أحداث التنسيق الخاص =====
      formattingControl.querySelectorAll("input").forEach((input) => {
        input.addEventListener("input", () => {
          this.updateSocialTextStyles();
          StateManager.saveDebounced();
        });
      });
      // ===== نهاية الربط =====

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
            `social-link-${socialId.replace(/[^a-zA-Z0-9-]/g, "-")}`,
          ); // تعديل المعرف

          // ===== حفظ الإعدادات الخاصة =====
          const colorInput = group.querySelector(`#input-${socialId}-color`);
          const sizeInput = group.querySelector(`#input-${socialId}-size`);
          // ===== نهاية الحفظ =====

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
              color: colorInput ? colorInput.value : "#e6f0f7", // <-- حفظ اللون
              size: sizeInput ? sizeInput.value : 12, // <-- حفظ الحجم
            });
          }
        });

      Config.STATIC_CONTACT_METHODS.forEach((method) => {
        const controlGroup = document.getElementById(
          `form-group-static-${method.id}`,
        ); // <-- تعديل المعرف
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

      // ملاحظة: لا نحفظ الصور الملتقطة هنا، هي تحفظ فقط عند الضغط على "مشاركة"

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
          CardManager.addSocialLink(); // ستنشئ هذه الدالة عنصراً جديداً

          // الآن، ابحث عن العنصر الجديد وقم بتعبئة بياناته
          const newControl = document.getElementById(
            `social-control-${socialData.id}`,
          );
          if (newControl) {
            const placementRadio = newControl.querySelector(
              `input[value="${socialData.placement}"]`,
            );
            if (placementRadio) placementRadio.checked = true;

            // ===== تطبيق الإعدادات الخاصة المحفوظة =====
            const colorInput = newControl.querySelector(
              `#input-${socialData.id}-color`,
            );
            const sizeInput = newControl.querySelector(
              `#input-${socialData.id}-size`,
            );
            if (colorInput && socialData.color)
              colorInput.value = socialData.color;
            if (sizeInput && socialData.size) sizeInput.value = socialData.size;
            // ===== نهاية التطبيق =====
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
          let elementId = id;
          // تعديل المعرفات لتطابق
          if (
            id.startsWith("form-group-static-") &&
            !document.getElementById(id)
          ) {
            elementId = `social-link-static-${id.replace("form-group-static-", "")}`;
          }
          if (id.startsWith("dynsocial_") && !document.getElementById(id)) {
            elementId = `social-link-${id.replace(/[^a-zA-Z0-9-]/g, "-")}`;
          }

          const targetEl = document.getElementById(elementId);

          if (targetEl && pos) {
            targetEl.style.transform = `translate(${pos.x}px, ${pos.y}px)`;
            targetEl.setAttribute("data-x", pos.x);
            targetEl.setAttribute("data-y", pos.y);
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

      // ===== استدعاء الدالة الجديدة عند التحميل =====
      CardManager.handleMasterSocialToggle();
      // =========================================

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
        thumbnail.alt = `معاينة لتصميم '${design.name}' المحفوظ`;
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
    /**
     * دالة مساعدة لالتقاط عنصر وتحويله إلى صورة ورفعها
     * @param {HTMLElement} element - العنصر المراد التقاطه (مثل DOMElements.cardFront)
     * @returns {Promise<string>} - رابط URL للصورة المرفوعة
     */
    async captureAndUploadCard(element) {
      // 1. التأكد من تحميل مكتبة الالتقاط
      await Utils.loadScript(Config.SCRIPT_URLS.html2canvas);

      // 2. استخدام دالة الالتقاط الموجودة لديكم بجودة عالية
      const canvas = await ExportManager.captureElement(element, 2); // scale = 2

      return new Promise((resolve, reject) => {
        // 3. تحويل الكانفاس إلى Blob
        canvas.toBlob(
          async (blob) => {
            if (!blob) {
              return reject(new Error("فشل تحويل canvas إلى blob"));
            }
            try {
              // 4. تحويل الـ Blob إلى File ليتوافق مع دالة الرفع
              const file = new File([blob], "card-capture.png", {
                type: "image/png",
              });

              // 5. استخدام دالة الرفع الموجودة لديكم
              const imageUrl = await UIManager.uploadImageToServer(file);

              resolve(imageUrl);
            } catch (e) {
              reject(e);
            }
          },
          "image/png",
          0.95,
        ); // استخدام جودة 95%
      });
    },

    async saveDesign(stateToSave = null) {
      // إذا لم يتم تمرير كائن، احصل عليه بالطريقة التقليدية
      const state = stateToSave || StateManager.getStateObject();
      try {
        const response = await fetch(`${Config.API_BASE_URL}/api/save-design`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(state), // إرسال الكائن
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
      UIManager.setButtonLoadingState(
        DOMElements.buttons.shareCard,
        true,
        "جاري الالتقاط...",
      );

      let frontImageUrl, backImageUrl, state;

      try {
        // 1. احصل على الحالة الحالية أولاً
        state = StateManager.getStateObject();

        // 2. التقاط ورفع الواجهة الأمامية
        frontImageUrl = await this.captureAndUploadCard(DOMElements.cardFront);

        // 3. التقاط ورفع الواجهة الخلفية
        UIManager.setButtonLoadingState(
          DOMElements.buttons.shareCard,
          true,
          "جاري رفع الصور...",
        );
        backImageUrl = await this.captureAndUploadCard(DOMElements.cardBack);
      } catch (error) {
        console.error("Card capture/upload failed:", error);
        alert("فشل التقاط أو رفع صورة البطاقة. يرجى المحاولة مرة أخرى.");
        UIManager.setButtonLoadingState(DOMElements.buttons.shareCard, false);
        return;
      }

      // 4. إضافة روابط الصور الملتقطة إلى كائن الحالة
      if (!state.imageUrls) state.imageUrls = {};
      state.imageUrls.capturedFront = frontImageUrl;
      state.imageUrls.capturedBack = backImageUrl;

      // 5. حفظ التصميم (نمرر له كائن state المعدل)
      UIManager.setButtonLoadingState(
        DOMElements.buttons.shareCard,
        true,
        "جاري الحفظ...",
      );

      const designId = await this.saveDesign(state);

      UIManager.setButtonLoadingState(DOMElements.buttons.shareCard, false);
      if (!designId) return;

      // 6. إنشاء رابط المشاركة
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
      // عند مشاركة المحرر، نستخدم دالة الحفظ التقليدية بدون التقاط صور
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

    moveElement(elementId, direction, step = 5) {
      const target = document.getElementById(elementId);
      if (!target) return;

      let x = parseFloat(target.getAttribute("data-x")) || 0;
      let y = parseFloat(target.getAttribute("data-y")) || 0;

      switch (direction) {
        case "up":
          y -= step;
          break;
        case "down":
          y += step;
          break;
        case "left":
          x -= step;
          break;
        case "right":
          x += step;
          break;
      }

      target.style.transform = `translate(${x}px, ${y}px)`;
      target.setAttribute("data-x", x);
      target.setAttribute("data-y", y);

      StateManager.saveDebounced();
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

          // ============================================
          //  بداية التعديل: فصل منطق الاستدعاء
          // ============================================
          // التنسيقات الخاصة بالأزرار
          if (input.id.startsWith("back-buttons")) {
            CardManager.updateSocialButtonStyles();
          }
          // التنسيقات الخاصة بالنص (العامة أو الخاصة)
          if (
            input.id.startsWith("social-text") ||
            input.id.includes("-static-") ||
            input.id.includes("-dynsocial_")
          ) {
            CardManager.updateSocialTextStyles();
          }
          // ============================================
          //  نهاية التعديل
          // ============================================

          if (
            input.id.startsWith("input-") &&
            !input.id.includes("-static-") &&
            !input.id.includes("-dynsocial_")
          )
            CardManager.updateSocialLinks(); // منع الاستدعاء المزدوج
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
        input.addEventListener("focus", () => {
          let draggableId = input.dataset.updateTarget;
          const parentGroup = input.closest(".form-group");
          // تعديل المعرف
          if (parentGroup && parentGroup.id.startsWith("form-group-static-")) {
            draggableId = `social-link-static-${parentGroup.id.replace("form-group-static-", "")}`;
          }
          if (draggableId) UIManager.highlightElement(draggableId, true);
        });
        input.addEventListener("blur", () => {
          let draggableId = input.dataset.updateTarget;
          const parentGroup = input.closest(".form-group");
          // تعديل المعرف
          if (parentGroup && parentGroup.id.startsWith("form-group-static-")) {
            draggableId = `social-link-static-${parentGroup.id.replace("form-group-static-", "")}`;
          }
          if (draggableId) UIManager.highlightElement(draggableId, false);
        });
      });

      document.querySelectorAll(".position-controls-grid").forEach((grid) => {
        grid.querySelectorAll(".move-btn").forEach((button) => {
          button.addEventListener("click", (e) => {
            e.preventDefault();
            const direction = button.dataset.direction;
            let targetId = grid.dataset.targetId;

            // تعديل المعرف
            if (targetId && targetId.startsWith("form-group-static-")) {
              targetId = `social-link-static-${targetId.replace("form-group-static-", "")}`;
            }

            if (targetId) {
              EventManager.moveElement(targetId, direction);
            } else {
              console.error("Missing targetId for move button.");
            }
          });
        });
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
            let elementToReset;

            const staticMatch = elementName.match(/static-(.*)/);
            if (staticMatch) {
              elementToReset = document.getElementById(
                `social-link-static-${staticMatch[1]}`,
              );
            } else if (elementName.startsWith("dynsocial_")) {
              elementToReset = document.getElementById(
                `social-link-${elementName.replace(/[^a-zA-Z0-9-]/g, "-")}`,
              ); // تعديل المعرف
            } else {
              const elementsMap = {
                logo: DOMElements.draggable.logo,
                photo: DOMElements.draggable.photo,
                name: DOMElements.draggable.name,
                tagline: DOMElements.draggable.tagline,
                qr: DOMElements.draggable.qr,
              };
              elementToReset = elementsMap[elementName];
            }

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

      // --- START: MODIFICATION ---
      // تم إلغاء تفعيل هذا الكود ليعمل زر الموبايل فقط
      /*
            DOMElements.cardsWrapper.addEventListener('click', (e) => {
                if (e.target.closest('a') || e.target.closest('button')) {
                    return;
                }
                flipCard();
            });
            */
      // --- END: MODIFICATION ---

      DOMElements.buttons.togglePhone.addEventListener("input", () => {
        CardManager.updatePhoneButtonsVisibility();
      });

      // ===== تعديل/إضافة ربط الأحداث =====
      DOMElements.buttons.toggleSocial.addEventListener("input", () => {
        CardManager.updateSocialLinksVisibility();
        CardManager.updateSocialButtonStyles();
        CardManager.updateSocialTextStyles();
      });

      if (DOMElements.buttons.toggleMasterSocial) {
        DOMElements.buttons.toggleMasterSocial.addEventListener("input", () => {
          CardManager.handleMasterSocialToggle();
          StateManager.saveDebounced();
        });
      }
      // ===== نهاية التعديل =====

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

      DOMElements.buttons.downloadOptions.addEventListener("click", (e) => {
        e.stopPropagation();
        DOMElements.downloadMenu.classList.toggle("show");
      });

      window.addEventListener("click", (e) => {
        if (!DOMElements.downloadContainer.contains(e.target)) {
          DOMElements.downloadMenu.classList.remove("show");
        }
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

        DOMElements.helpModal.nav
          .querySelectorAll(".help-tab-btn")
          .forEach((btn) => btn.classList.remove("active"));
        DOMElements.helpModal.panes.forEach((pane) =>
          pane.classList.remove("active"),
        );

        button.classList.add("active");
        const targetPane = document.getElementById(button.dataset.tabTarget);
        if (targetPane) {
          targetPane.classList.add("active");
        }
      });
    },
  };
  const App = {
    // --- ========================================= ---
    // --- === MODIFICATION START (JS) === ---
    // --- ========================================= ---
    initResponsiveLayout() {
      const isMobile = window.innerWidth <= 1200;
      const sourceContainer = document.getElementById("ui-elements-source");

      // حاويات الموبايل
      const mobileControlsContainer =
        document.querySelector(".controls-column");

      // حاويات الديسكتوب
      const desktopLeftContainer = document.querySelector(
        ".actions-column .desktop-controls-wrapper",
      );
      const desktopRightContainer = document.querySelector(".controls-column");

      if (isMobile) {
        // --- منطق الموبايل (معدل) ---
        if (!mobileControlsContainer.querySelector(".mobile-tabs-nav")) {
          const mobileNav = document.createElement("div");
          mobileNav.className = "mobile-tabs-nav";
          // تم تعديل أسماء التبويبات لتكون أوضح
          mobileNav.innerHTML = `
                        <button class="mobile-tab-btn active" data-tab-target="#tab-elements">🎨 العناصر</button>
                        <button class="mobile-tab-btn" data-tab-target="#tab-design">🖌️ التصميم</button>
                        <button class="mobile-tab-btn" data-tab-target="#tab-actions">💾 حفظ</button>
                    `;

          const mobileTabsContent = document.createElement("div");
          mobileTabsContent.className = "tabs-content";
          mobileTabsContent.innerHTML = `
                        <div id="tab-elements" class="tab-pane active"></div>
                        <div id="tab-design" class="tab-pane"></div>
                        <div id="tab-actions" class="tab-pane"></div>
                    `;
          mobileControlsContainer.innerHTML = ""; // تنظيف الحاوية
          mobileControlsContainer.appendChild(mobileNav);
          mobileControlsContainer.appendChild(mobileTabsContent);
        }

        // البحث عن وجهة الموبايل
        document
          .querySelectorAll("#ui-elements-source [data-mobile-destination]")
          .forEach((group) => {
            let destinationId = "";

            // دمج "الأمامي" و "الخلفي" في تبويب "العناصر"
            if (
              group.dataset.mobileDestination === "tab-front" ||
              group.dataset.mobileDestination === "tab-back"
            ) {
              destinationId = "tab-elements";
            }
            // فصل "التصميم" عن "الحفظ"
            else if (group.dataset.mobileDestination === "tab-actions") {
              // العناصر التي تذهب لليسار في الديسكتوب هي "تصميم"
              if (group.dataset.desktopDestination === "desktop-left") {
                destinationId = "tab-design";
              } else {
                // العناصر المتبقية (مثل الحفظ) تذهب لـ "حفظ"
                destinationId = "tab-actions";
              }
            }

            const destinationPane = document.getElementById(destinationId);
            if (destinationPane) {
              Array.from(group.children).forEach((child) =>
                destinationPane.appendChild(child),
              );
            }
          });

        // إعادة تفعيل التبويب الأول (العناصر)
        TabManager.init(".mobile-tabs-nav", ".mobile-tab-btn");
        const firstButton = mobileControlsContainer.querySelector(
          '.mobile-tab-btn[data-tab-target="#tab-elements"]',
        );
        const firstPane = document.getElementById("tab-elements");
        if (firstButton && firstPane) {
          mobileControlsContainer
            .querySelectorAll(".mobile-tab-btn")
            .forEach((b) => b.classList.remove("active"));
          mobileControlsContainer
            .querySelectorAll(".tab-pane")
            .forEach((p) => p.classList.remove("active"));
          firstButton.classList.add("active");
          firstPane.classList.add("active");
        }
      } else {
        // --- منطق الديسكتوب (المعدل) ---

        // 1. تنظيف الحاويات
        desktopLeftContainer.innerHTML =
          '<h3 style="text-align:center; margin-top:0; color: var(--accent-primary);">أدوات عامة</h3>'; // إعادة العنوان
        desktopRightContainer.innerHTML =
          '<h3 style="text-align:center; margin-top:0; color: var(--accent-primary);">تعديل العناصر</h3>'; // إضافة عنوان

        // 2. توزيع العناصر بناءً على وجهة الديسكتوب
        document
          .querySelectorAll("#ui-elements-source [data-desktop-destination]")
          .forEach((group) => {
            let destinationContainer = null;

            if (group.dataset.desktopDestination === "desktop-left") {
              destinationContainer = desktopLeftContainer;
            } else if (group.dataset.desktopDestination === "desktop-right") {
              destinationContainer = desktopRightContainer;
            }

            if (destinationContainer) {
              Array.from(group.children).forEach((child) =>
                destinationContainer.appendChild(child),
              );
            }
          });
      }
    },
    // --- ========================================= ---
    // --- === MODIFICATION END (JS) === ---
    // --- ========================================= ---

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
        socialControlsWrapper: document.getElementById(
          "social-controls-wrapper",
        ), // <-- إضافة جديدة
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
        downloadContainer: document.querySelector(".download-container"),
        downloadMenu: document.getElementById("download-menu"),
        helpModal: {
          overlay: document.getElementById("help-modal-overlay"),
          closeBtn: document.getElementById("help-modal-close"),
          nav: document.querySelector(".help-tabs-nav"),
          panes: document.querySelectorAll(".help-tab-pane"),
        },

        buttons: {
          addPhone: document.getElementById("add-phone-btn"),
          addSocial: document.getElementById("add-social-btn"),
          removeFrontBg: document.getElementById("remove-front-bg-btn"),
          removeBackBg: document.getElementById("remove-back-bg-btn"),
          backToTop: document.getElementById("back-to-top-btn"),
          mobileFlip: document.getElementById("mobile-flip-btn"),
          togglePhone: document.getElementById("toggle-phone-buttons"),
          toggleSocial: document.getElementById("toggle-social-buttons"),
          toggleMasterSocial: document.getElementById("toggle-master-social"), // <-- إضافة جديدة
          saveToGallery: document.getElementById("save-to-gallery-btn"),
          showGallery: document.getElementById("show-gallery-btn"),
          shareCard: document.getElementById("share-card-btn"),
          shareEditor: document.getElementById("share-editor-btn"),
          downloadOptions: document.getElementById("download-options-btn"),
          downloadPngFront: document.getElementById("download-png-front"),
          downloadPngBack: document.getElementById("download-png-back"),
          downloadPdf: document.getElementById("download-pdf"),
          downloadVcf: document.getElementById("download-vcf"),
          downloadQrCode: document.getElementById("download-qrcode"),
          reset: document.getElementById("reset-design-btn"),
          undoBtn: document.getElementById("undo-btn"),
          redoBtn: document.getElementById("redo-btn"),
          generateAutoQr: document.getElementById("generate-auto-qr-btn"),
        },
      });

      Object.values(DOMElements.draggable).forEach((el) => {
        if (el) {
          el.classList.add("draggable-on-card");
          const hint = document.createElement("i");
          hint.className = "fas fa-arrows-alt dnd-hover-hint";
          el.appendChild(hint);
        }
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
      // تم إلغاء تفعيل هذا السطر لأنه لم يعد لدينا تبويبات ديسكتوب
      // TabManager.init('.desktop-tabs-nav', '.desktop-tab-btn');

      UIManager.announce("محرر بطاقة الأعمال جاهز للاستخدام.");

      TourManager.init();
      if (
        !localStorage.getItem(TourManager.TOUR_SHOWN_KEY) ||
        !loadedFromStorage
      ) {
        setTimeout(() => {
          TourManager.start();
        }, 1500);
      }
    },
  };
  document.addEventListener("DOMContentLoaded", () => App.init());
})();
/* =======================================================================
   كل الكود السابق كما هو (عمليات المحرر، واجهة المستخدم، التفاعلات ...)
   ======================================================================= */

/* === Thumbnail generation and upload helpers ===
   - generateThumbnailFromDesign(design): يبني بطاقة مصغرة من بيانات التصميم ويلتقطها بـ html2canvas
   - uploadThumbnail(designId, dataUrl): يرفع الصورة المصغرة إلى الخادم لتخزينها في قاعدة البيانات
   - يمكن استدعاؤهما من أي صفحة (مثل gallery.html)
*/
(function () {
  async function loadHtml2CanvasOnce() {
    if (window._html2canvasPromise) return window._html2canvasPromise;
    window._html2canvasPromise = new Promise((resolve, reject) => {
      if (window.html2canvas) return resolve(window.html2canvas);
      const s = document.createElement("script");
      s.src =
        "https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js";
      s.onload = () => resolve(window.html2canvas);
      s.onerror = () => reject(new Error("Failed to load html2canvas"));
      document.head.appendChild(s);
    });
    return window._html2canvasPromise;
  }

  function escapeHtml(str) {
    if (!str) return "";
    return String(str).replace(/[&<>"']/g, function (s) {
      return {
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;",
      }[s];
    });
  }

  // === إنشاء مصغرة من بيانات التصميم ===
  window.generateThumbnailFromDesign =
    async function generateThumbnailFromDesign(
      design,
      width = 800,
      height = 520,
    ) {
      try {
        await loadHtml2CanvasOnce();
      } catch (e) {
        console.error("html2canvas load failed", e);
        return null;
      }
      const inputs =
        design && design.data && design.data.inputs ? design.data.inputs : {};
      const wrapper = document.createElement("div");
      wrapper.style.position = "fixed";
      wrapper.style.left = "-9999px";
      wrapper.style.top = "0";
      wrapper.style.width = width + "px";
      wrapper.style.height = height + "px";
      wrapper.style.zIndex = "-9999";
      wrapper.style.opacity = "0";
      wrapper.setAttribute("aria-hidden", "true");

      const name = escapeHtml(inputs["input-name"] || "الاسم هنا");
      const tagline = escapeHtml(inputs["input-tagline"] || "");
      const logo = inputs["input-logo"] || "/nfc/mcprime-logo-transparent.png";
      const nameColor = inputs["name-color"] || "#e6f0f7";
      const tagColor = inputs["tagline-color"] || "#4da6ff";
      const start = inputs["front-bg-start"] || "#2a3d54";
      const end = inputs["front-bg-end"] || "#223246";
      const logoSize = inputs["logo-size"] || 25;
      const nameSize = inputs["name-font-size"] || 22;
      const tagSize = inputs["tagline-font-size"] || 14;
      const font = inputs["name-font"] || "Tajawal, sans-serif";

      wrapper.innerHTML = `
      <div style="box-sizing:border-box;width:${width}px;height:${height}px;display:flex;align-items:center;justify-content:center;font-family:${font};background: linear-gradient(135deg, ${start}, ${end});color:${nameColor};padding:20px;">
        <div style="width:92%;height:86%;border-radius:12px;overflow:hidden;display:flex;flex-direction:row;align-items:center;justify-content:space-between;padding:20px;box-shadow:0 6px 18px rgba(0,0,0,0.25);background: rgba(255,255,255,0.02);">
          <div style="flex:1;display:flex;flex-direction:column;gap:8px;justify-content:center;align-items:flex-end;text-align:right;">
            <div style="font-weight:700;font-size:${nameSize}px;line-height:1;">${name}</div>
            <div style="font-size:${tagSize}px;color:${tagColor};opacity:0.95;">${tagline}</div>
          </div>
          <div style="width:120px;display:flex;align-items:center;justify-content:center;">
            <img src="${logo}" alt="logo" style="max-width:${logoSize}%;opacity:1;object-fit:contain;"/>
          </div>
        </div>
      </div>
    `;

      document.body.appendChild(wrapper);
      try {
        const canvas = await window.html2canvas(wrapper, {
          scale: Math.min(window.devicePixelRatio || 1, 2),
          useCORS: true,
          allowTaint: true,
          backgroundColor: null,
        });
        const dataUrl = canvas.toDataURL("image/png");
        return dataUrl;
      } catch (err) {
        console.error("html2canvas capture failed", err);
        return null;
      } finally {
        wrapper.remove();
      }
    };

  // === رفع المصغرة للخادم ===
  window.uploadThumbnail = async function uploadThumbnail(designId, dataUrl) {
    try {
      const base =
        typeof Config !== "undefined" && Config.API_BASE_URL !== undefined
          ? Config.API_BASE_URL
          : "";
      const url =
        (base ? base.replace(/\/+$/, "") : "") +
        `/api/designs/${encodeURIComponent(designId)}/thumbnail`;
      const resp = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ thumbnail: dataUrl }),
      });
      if (!resp.ok) {
        const txt = await resp.text();
        console.warn("uploadThumbnail failed", resp.status, txt);
        return false;
      }
      return true;
    } catch (e) {
      console.error("uploadThumbnail error", e);
      return false;
    }
  };
})();
