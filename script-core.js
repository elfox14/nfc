'use strict';


const Config = {
    // ... existing config ...
    GTM_CONTAINER_ID: 'GTM-PLL5SLNM', // GTM Container ID

    API_BASE_URL: 'https://nfc-vjy6.onrender.com',
    LOCAL_STORAGE_KEY: 'digitalCardEditorState_v20',
    GALLERY_STORAGE_KEY: 'digitalCardGallery_v2',
    MAX_LOGO_SIZE_MB: 10,
    MAX_BG_SIZE_MB: 10,

    SCRIPT_URLS: {
        html2canvas: 'https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js',
        jspdf: 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js',
        qrCodeStyling: 'https://unpkg.com/qr-code-styling@1.5.0/lib/qr-code-styling.js',
        jszip: 'https://cdnjs.cloudflare.com/ajax/libs/jszip/3.1.0/jszip.min.js',
        qrcode: 'https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js'
    },

    defaultState: {
        currentLanguage: 'ar', // NEW: To manage the current language
        inputs: {
            'layout-select': 'classic',
            'layout-select-visual': 'classic',
            'input-logo': 'mcprime-logo-transparent.png',
            'logo-size': 25,
            'logo-opacity': 1,
            'input-photo-url': '',
            'photo-size': 25,
            'photo-shape': 'circle',
            'photo-border-color': '#ffffff',
            'photo-border-width': 2,

            // BILINGUAL SUPPORT: Updated text fields
            'input-name_ar': 'اسمك الكامل هنا',
            'input-name_en': 'Your Full Name Here',
            'name-font-size': 22,
            'name-color': '#e6f0f7',
            'name-font': 'Tajawal, sans-serif',

            'input-tagline_ar': 'المسمى الوظيفي / الشركة',
            'input-tagline_en': 'Job Title / Company',
            'tagline-font-size': 14,
            'tagline-color': '#4da6ff',
            'tagline-font': 'Tajawal, sans-serif',

            'toggle-phone-buttons': true,
            'phone-text-layout': 'row',
            'phone-text-size': 14,
            'phone-text-color': '#e6f0f7',
            'phone-text-font': 'Tajawal, sans-serif',
            'phone-btn-bg-color': '#4da6ff',
            'phone-btn-text-color': '#ffffff',
            'phone-btn-font-size': 12,
            'phone-btn-padding': 6,
            'phone-btn-font': 'Poppins, sans-serif',
            'front-bg-start': '#2a3d54',
            'front-bg-end': '#223246',
            'front-bg-opacity': 0,
            'qr-source': 'auto-card',
            'input-qr-url': '',
            'qr-size': 30,
            'back-bg-start': '#2a3d54',
            'back-bg-end': '#223246',
            'back-bg-opacity': 0,
            'back-buttons-size': 10,
            'back-buttons-bg-color': '#364f6b',
            'back-buttons-text-color': '#aab8c2',
            'back-buttons-font': 'Poppins, sans-serif',
            'theme-select-input': 'deep-sea',
            'toggle-master-social': true,
            'toggle-social-buttons': true,
            'social-text-size': 12,
            'social-text-color': '#e6f0f7',
            'social-text-font': 'Tajawal, sans-serif'
        },
        dynamic: {
            phones: [
                { id: `phone_${Date.now()}`, value: '01000000000', placement: 'front' }
            ],
            social: [],
            staticSocial: {
                email: { value: '', placement: 'back' },
                website: { value: '', placement: 'back' },
                whatsapp: { value: '', placement: 'back' },
                facebook: { value: '', placement: 'back' },
                linkedin: { value: '', placement: 'back' }
            },
            qr: { enabled: true }
        },
        imageUrls: {
            front: null,
            back: null,
            qrCode: null,
            photo: null
        },
        positions: {
            "card-logo": { x: 0, y: 0 },
            "card-personal-photo-wrapper": { x: 0, y: 0 },
            "card-name": { x: 0, y: 0 },
            "card-tagline": { x: 0, y: 0 },
            "qr-code-wrapper": { x: 0, y: 0 }
        },
        placements: {
            logo: 'front',
            photo: 'front',
            name: 'front',
            tagline: 'front',
            qr: 'back'
        }
    },

    THEMES: {
        // --- Original Designs ---
        'deep-sea': { name: 'بحر عميق', nameEn: 'Deep Sea', gradient: ['#2a3d54', '#223246'], values: { textPrimary: '#e6f0f7', taglineColor: '#4da6ff', backButtonBg: '#364f6b', backButtonText: '#aab8c2', phoneBtnBg: '#4da6ff', phoneBtnText: '#ffffff' } },
        'modern-light': { name: 'أبيض حديث', nameEn: 'Modern Light', gradient: ['#e9e9e9', '#ffffff'], values: { textPrimary: '#121212', taglineColor: '#007BFF', backButtonBg: '#f0f2f5', backButtonText: '#343a40', phoneBtnBg: '#007BFF', phoneBtnText: '#ffffff' } },
        'forest-whisper': { name: 'همس الغابة', nameEn: 'Forest Whisper', gradient: ['#234d20', '#364935'], values: { textPrimary: '#f0f3f0', taglineColor: '#77ab59', backButtonBg: '#4a785f', backButtonText: '#f0f3f0', phoneBtnBg: '#77ab59', phoneBtnText: '#f0f3f0' } },
        'sunset-gradient': { name: 'غروب الشمس', nameEn: 'Sunset Gradient', gradient: ['#ff8c42', '#ff5f6d'], values: { textPrimary: '#ffffff', taglineColor: '#ffcc80', backButtonBg: '#c44d56', backButtonText: '#ffffff', phoneBtnBg: 'rgba(255,255,255,0.2)', phoneBtnText: '#ffffff' } },
        'corporate-elegance': { name: 'أناقة الشركات', nameEn: 'Corporate Elegance', gradient: ['#f8f9fa', '#e9ecef'], values: { textPrimary: '#212529', taglineColor: '#0056b3', backButtonBg: '#343a40', backButtonText: '#ffffff', phoneBtnBg: '#0056b3', phoneBtnText: '#ffffff' } },
        'night-neon': { name: 'النيون الليلي', nameEn: 'Night Neon', gradient: ['#0d0d0d', '#1a1a1a'], values: { textPrimary: '#f0f0f0', taglineColor: '#39ff14', backButtonBg: '#222222', backButtonText: '#00ffdd', phoneBtnBg: 'transparent', phoneBtnText: '#39ff14' } },

        // --- New Designs ---
        'royal-gold': { name: 'ملكي ذهبي', nameEn: 'Royal Gold', gradient: ['#141E30', '#243B55'], values: { textPrimary: '#F2C94C', taglineColor: '#F2994A', backButtonBg: '#1F2E40', backButtonText: '#F2C94C', phoneBtnBg: '#F2C94C', phoneBtnText: '#141E30' } },
        'crimson-red': { name: 'أحمر قرمزي', nameEn: 'Crimson Red', gradient: ['#870000', '#190A05'], values: { textPrimary: '#FFFFFF', taglineColor: '#FF6B6B', backButtonBg: '#4A0000', backButtonText: '#FFC3C3', phoneBtnBg: '#FF0000', phoneBtnText: '#FFFFFF' } },
        'purple-haze': { name: 'ضباب بنفسجي', nameEn: 'Purple Haze', gradient: ['#4568DC', '#B06AB3'], values: { textPrimary: '#FFFFFF', taglineColor: '#E0C3FC', backButtonBg: 'rgba(255,255,255,0.2)', backButtonText: '#FFFFFF', phoneBtnBg: '#B06AB3', phoneBtnText: '#FFFFFF' } },
        'teal-tech': { name: 'تكنولوجيا', nameEn: 'Teal Tech', gradient: ['#0F2027', '#203A43', '#2C5364'], values: { textPrimary: '#00FFFF', taglineColor: '#7FFFD4', backButtonBg: '#1C313A', backButtonText: '#00FFFF', phoneBtnBg: 'transparent', phoneBtnText: '#00FFFF' } },
        'desert-sand': { name: 'رمال الصحراء', nameEn: 'Desert Sand', gradient: ['#C9D6FF', '#E2E2E2'], values: { textPrimary: '#5D4E3E', taglineColor: '#8E7C68', backButtonBg: '#D1C4B5', backButtonText: '#5D4E3E', phoneBtnBg: '#8E7C68', phoneBtnText: '#FFFFFF' } },
        'midnight-blue': { name: 'أزرق منتصف الليل', nameEn: 'Midnight Blue', gradient: ['#000428', '#004e92'], values: { textPrimary: '#E0E0E0', taglineColor: '#4CA1AF', backButtonBg: '#002651', backButtonText: '#4CA1AF', phoneBtnBg: '#004e92', phoneBtnText: '#FFFFFF' } },
        'cherry-blossom': { name: 'أزهار الكرز', nameEn: 'Cherry Blossom', gradient: ['#FBD3E9', '#BB377D'], values: { textPrimary: '#5D1438', taglineColor: '#FFFFFF', backButtonBg: 'rgba(255,255,255,0.3)', backButtonText: '#5D1438', phoneBtnBg: '#BB377D', phoneBtnText: '#FFFFFF' } },
        'carbon-fiber': { name: 'ألياف الكربون', nameEn: 'Carbon Fiber', gradient: ['#232526', '#414345'], values: { textPrimary: '#EAEAEA', taglineColor: '#BDC3C7', backButtonBg: '#595B5D', backButtonText: '#FFFFFF', phoneBtnBg: '#343638', phoneBtnText: '#FFFFFF' } }
    },

    SOCIAL_PLATFORMS: {
        instagram: { name: 'انستغرام', nameEn: 'Instagram', icon: 'fab fa-instagram', prefix: 'https://instagram.com/' },
        x: { name: 'X (تويتر)', nameEn: 'X (Twitter)', icon: 'fab fa-xing', prefix: 'https://x.com/' },
        telegram: { name: 'تيليجرام', nameEn: 'Telegram', icon: 'fab fa-telegram', prefix: 'https://t.me/' },
        tiktok: { name: 'تيك توك', nameEn: 'TikTok', icon: 'fab fa-tiktok', prefix: 'https://tiktok.com/@' },
        snapchat: { name: 'سناب شات', nameEn: 'Snapchat', icon: 'fab fa-snapchat', prefix: 'https://snapchat.com/add/' },
        youtube: { name: 'يوتيوب', nameEn: 'YouTube', icon: 'fab fa-youtube', prefix: 'https://youtube.com/' },
        pinterest: { name: 'بينترست', nameEn: 'Pinterest', icon: 'fab fa-pinterest', prefix: 'https://pinterest.com/' },
        behance: { name: 'بيهانس', nameEn: 'Behance', icon: 'fab fa-behance', prefix: 'https://behance.net/' },
        github: { name: 'جيت هب', nameEn: 'GitHub', icon: 'fab fa-github', prefix: 'https://github.com/' },
        discord: { name: 'ديسكورد', nameEn: 'Discord', icon: 'fab fa-discord', prefix: 'https://discord.gg/' },
        spotify: { name: 'سبوتيفاي', nameEn: 'Spotify', icon: 'fab fa-spotify', prefix: 'https://open.spotify.com/user/' },
        soundcloud: { name: 'ساوند كلاود', nameEn: 'SoundCloud', icon: 'fab fa-soundcloud', prefix: 'https://soundcloud.com/' }
    },

    STATIC_CONTACT_METHODS: [
        { id: 'whatsapp', icon: 'fab fa-whatsapp', prefix: 'https://wa.me/' },
        { id: 'email', icon: 'fas fa-envelope', prefix: 'mailto:' },
        { id: 'website', icon: 'fas fa-globe' },
        { id: 'facebook', icon: 'fab fa-facebook-f' },
        { id: 'linkedin', icon: 'fab fa-linkedin-in' }
    ]
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
            audioEl.play().catch(e => console.warn("Audio play failed:", e));
        }
    },

    async copyTextToClipboard(text) {
        try {
            if (navigator.clipboard && window.isSecureContext) {
                await navigator.clipboard.writeText(text);
            } else {
                const textArea = document.createElement('textarea');
                textArea.value = text;
                textArea.style.position = 'absolute';
                textArea.style.left = '-999999px';
                document.body.prepend(textArea);
                textArea.select();
                document.execCommand('copy');
                textArea.remove();
            }
            return true;
        } catch (error) {
            console.error('Clipboard error:', error);
            return false;
        }
    },

    loadScript(url) {
        if (loadedScripts.has(url)) return Promise.resolve();
        return new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = url;
            script.onload = () => { loadedScripts.add(url); resolve(); };
            script.onerror = () => reject(new Error(`Failed to load script: ${url}`));
            document.head.appendChild(script);
        });
    }
};

const HistoryManager = {
    history: [],
    currentIndex: -1,
    // maxHistory: 20, // REMOVED: No limit for undo/redo history

    pushState(state) {
        // Cut future history if we push new state after undoing
        if (this.currentIndex < this.history.length - 1) {
            this.history.splice(this.currentIndex + 1);
        }

        // Avoid duplicates
        const newStateStr = JSON.stringify(state);
        const currentStateStr = this.currentIndex >= 0 ? JSON.stringify(this.history[this.currentIndex]) : null;

        if (newStateStr === currentStateStr) return;

        this.history.push(JSON.parse(newStateStr));
        this.currentIndex++; // UPDATED: Always increment index

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
        const undoBtn = document.getElementById('undo-btn');
        const redoBtn = document.getElementById('redo-btn');
        if (undoBtn) undoBtn.disabled = this.currentIndex <= 0;
        if (redoBtn) redoBtn.disabled = this.currentIndex >= this.history.length - 1;
    }
};

// Google Analytics Integration
document.addEventListener('DOMContentLoaded', () => {
    // Check if ID is configured and is not the placeholder
    if (Config.GA_MEASUREMENT_ID && Config.GA_MEASUREMENT_ID !== 'G-XXXXXXXXXX') {
        const script = document.createElement('script');
        script.async = true;
        script.src = `https://www.googletagmanager.com/gtag/js?id=${Config.GA_MEASUREMENT_ID}`;
        document.head.appendChild(script);

        window.dataLayer = window.dataLayer || [];
        function gtag() { dataLayer.push(arguments); }
        gtag('js', new Date());
        gtag('config', Config.GA_MEASUREMENT_ID);
        console.log('Google Analytics Initialized');
    }
});
