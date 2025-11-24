// script-core.js
"use strict";

const Config = {
  API_BASE_URL: "https://nfc-vjy6.onrender.com",
  LOCAL_STORAGE_KEY: "digitalCardEditorState_v20",
  GALLERY_STORAGE_KEY: "digitalCardGallery_v2",
  MAX_LOGO_SIZE_MB: 10,
  MAX_BG_SIZE_MB: 10,

  SCRIPT_URLS: {
    html2canvas:
      "https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js",
    jspdf:
      "https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js",
    qrCodeStyling:
      "https://unpkg.com/qr-code-styling@1.5.0/lib/qr-code-styling.js",
    jszip: "https://cdnjs.cloudflare.com/ajax/libs/jszip/3.1.0/jszip.min.js",
    qrcode:
      "https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js",
  },

  defaultState: {
    inputs: {
      "layout-select": "classic",
      "layout-select-visual": "classic", // Default layout
      "input-logo": "mcprime-logo-transparent.png",
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
      "input-tagline": "المسمى الوظيفي / الشركة",
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
      "front-bg-opacity": 0,
      "qr-source": "auto-card",
      "input-qr-url": "",
      "qr-size": 30,
      "back-bg-start": "#2a3d54",
      "back-bg-end": "#223246",
      "back-bg-opacity": 0,
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
    },
    dynamic: {
      phones: [
        { id: `phone_${Date.now()}`, value: "01000000000", placement: "front" },
      ],
      social: [],
      staticSocial: {
        email: { value: "", placement: "back" },
        website: { value: "", placement: "back" },
        whatsapp: { value: "", placement: "back" },
        facebook: { value: "", placement: "back" },
        linkedin: { value: "", placement: "back" },
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
      // Default positions (x=0, y=0 means centered/default flow)
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

const DOMElements = {}; // Filled in App.init()
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
    const audioEl = document.getElementById(`audio-${soundId}`); // Fixed selector
    if (audioEl) {
      audioEl.currentTime = 0;
      audioEl.play().catch((e) => console.warn("Audio play failed:", e));
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
      console.error("Clipboard error:", error);
      return false;
    }
  },

  loadScript(url) {
    if (loadedScripts.has(url)) return Promise.resolve();
    return new Promise((resolve, reject) => {
      const script = document.createElement("script");
      script.src = url;
      script.onload = () => {
        loadedScripts.add(url);
        resolve();
      };
      script.onerror = () => reject(new Error(`Failed to load script: ${url}`));
      document.head.appendChild(script);
    });
  },
};

const HistoryManager = {
  history: [],
  currentIndex: -1,
  maxHistory: 20,

  pushState(state) {
    // Cut future history if we push new state after undoing
    if (this.currentIndex < this.history.length - 1) {
      this.history.splice(this.currentIndex + 1);
    }

    // Avoid duplicates
    const newStateStr = JSON.stringify(state);
    const currentStateStr =
      this.currentIndex >= 0
        ? JSON.stringify(this.history[this.currentIndex])
        : null;

    if (newStateStr === currentStateStr) return;

    this.history.push(JSON.parse(newStateStr));

    // Limit history size
    if (this.history.length > this.maxHistory) {
      this.history.shift();
    } else {
      this.currentIndex++;
    }

    this.updateButtonStates();
  },

  undo() {
    if (this.currentIndex > 0) {
      this.currentIndex--;
      const state = JSON.parse(JSON.stringify(this.history[this.currentIndex]));
      StateManager.applyState(state, false);
      this.updateButtonStates();
    }
  },

  redo() {
    if (this.currentIndex < this.history.length - 1) {
      this.currentIndex++;
      const state = JSON.parse(JSON.stringify(this.history[this.currentIndex]));
      StateManager.applyState(state, false);
      this.updateButtonStates();
    }
  },

  updateButtonStates() {
    const undoBtn = document.getElementById("undo-btn");
    const redoBtn = document.getElementById("redo-btn");
    if (undoBtn) undoBtn.disabled = this.currentIndex <= 0;
    if (redoBtn)
      redoBtn.disabled = this.currentIndex >= this.history.length - 1;
  },
};
