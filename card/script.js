(function() {
    'use strict';
    
    const Config = {
        API_BASE_URL: 'https://nfc-vjy6.onrender.com',
        LOCAL_STORAGE_KEY: 'digitalCardEditorState_v15',
        DND_HINT_SHOWN_KEY: 'dndHintShown_v1',
        GALLERY_STORAGE_KEY: 'digitalCardGallery_v1',
        MAX_LOGO_SIZE_MB: 2, MAX_BG_SIZE_MB: 5, RESIZED_IMAGE_MAX_DIMENSION: 1280,
        defaultState: {
            inputs: {
                "layout-select": "classic",
                "input-logo": "https://www.mcprim.com/nfc/mcprime-logo-transparent.png",
                "logo-size": "25",
                "logo-opacity": "1",
                "input-name": "محمود ممدوح خميس",
                "name-font-size": "22",
                "name-color": "#e6f0f7",
                "name-font": "'Tajawal', sans-serif",
                "input-tagline": "MC PRIME للتوريدات الطبية",
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
                "qr-source": "custom",
                "input-qr-url": "https://www.mcprim.com/nfc/mcprime_qr.png",
                "qr-size": "30",
                "input-email": "hthefox14@gmail.com",
                "input-website": "https://www.elfoxdm.com/elfox/elfox.html",
                "input-whatsapp": "201062071741",
                "input-facebook": "https://www.facebook.com/thefox14/",
                "input-linkedin": "https://www.linkedin.com/in/elfox/",
                "social-media-type": "instagram",
                "social-media-input": "",
                "back-bg-start": "#2a3d54",
                "back-bg-end": "#223246",
                "back-bg-opacity": "1",
                "back-buttons-size": "10",
                "back-buttons-bg-color": "#364f6b",
                "back-buttons-text-color": "#aab8c2",
                "back-buttons-font": "'Poppins', sans-serif",
                "theme-select-input": "deep-sea"
            },
            dynamic: {
                phones: ["01062071741", "01555535154"],
                social: []
            },
            imageUrls: { front: null, back: null, qrCode: null },
            positions: {
                "card-logo": { x: 0, y: 0 },
                "identity-front": { x: 0, y: 0 },
                "phone-buttons-wrapper": { x: 0, y: 0 }
            }
        },
        THEMES: {
            'deep-sea': { name: 'بحر عميق', gradient: ['#2a3d54', '#223246'], values: { textPrimary: '#e6f0f7', taglineColor: '#4da6ff', backButtonBg: '#364f6b', backButtonText: '#aab8c2', phoneBtnBg: '#4da6ff', phoneBtnText: '#ffffff'}},
            'modern-light': { name: 'أبيض حديث', gradient: ['#e9e9e9', '#ffffff'], values: { textPrimary: '#121212', taglineColor: '#007BFF', backButtonBg: '#f0f2f5', backButtonText: '#343a40', phoneBtnBg: '#007BFF', phoneBtnText: '#ffffff'}},
            'forest-whisper': { name: 'همس الغابة', gradient: ['#234d20', '#364935'], values: { textPrimary: '#f0f3f0', taglineColor: '#77ab59', backButtonBg: '#4a785f', backButtonText: '#f0f3f0', phoneBtnBg: '#77ab59', phoneBtnText: '#f0f3f0'}},
            'sunset-gradient': { name: 'غروب الشمس', gradient: ['#ff8c42', '#ff5f6d'], values: { textPrimary: '#ffffff', taglineColor: '#ffcc80', backButtonBg: '#c44d56', backButtonText: '#ffffff', phoneBtnBg: 'rgba(255,255,255,0.2)', phoneBtnText: '#ffffff'}},
            'corporate-elegance': { name: 'أناقة الشركات', gradient: ['#f8f9fa', '#e9ecef'], values: { textPrimary: '#212529', taglineColor: '#0056b3', backButtonBg: '#343a40', backButtonText: '#ffffff', phoneBtnBg: '#0056b3', phoneBtnText: '#ffffff'}},
            'night-neon': { name: 'النيون الليلي', gradient: ['#0d0d0d', '#1a1a1a'], values: { textPrimary: '#f0f0f0', taglineColor: '#39ff14', backButtonBg: '#222222', backButtonText: '#00ffdd', phoneBtnBg: 'transparent', phoneBtnText: '#39ff14'}},
            'rose-gold': { name: 'الذهب الوردي', gradient: ['#f7cac9', '#92a8d1'], values: { textPrimary: '#5e548e', taglineColor: '#92a8d1', backButtonBg: '#ffffff', backButtonText: '#5e548e', phoneBtnBg: '#92a8d1', phoneBtnText: '#ffffff'}},
            'ocean-breeze': { name: 'نسيم المحيط', gradient: ['#48b1bf', '#06beb6'], values: { textPrimary: '#ffffff', taglineColor: '#e0f7fa', backButtonBg: 'rgba(255, 255, 255, 0.2)', backButtonText: '#ffffff', phoneBtnBg: '#ffffff', phoneBtnText: '#06beb6'}},
            'royal-gold': { name: 'الذهب الملكي', gradient: ['#141e30', '#243b55'], values: { textPrimary: '#f7b733', taglineColor: '#fc4a1a', backButtonBg: '#3a506b', backButtonText: '#f7b733', phoneBtnBg: '#fc4a1a', phoneBtnText: '#141e30'}},
            'emerald-city': { name: 'مدينة الزمرد', gradient: ['#0f2027', '#203a43'], values: { textPrimary: '#ffffff', taglineColor: '#2c5364', backButtonBg: '#2c5364', backButtonText: '#ffffff', phoneBtnBg: '#1ed760', phoneBtnText: '#ffffff'}},
            'ruby-red': { name: 'أحمر ياقوتي', gradient: ['#642b73', '#c6426e'], values: { textPrimary: '#ffffff', taglineColor: '#ffafbd', backButtonBg: 'rgba(0, 0, 0, 0.2)', backButtonText: '#ffffff', phoneBtnBg: '#ffafbd', phoneBtnText: '#642b73'}},
            'minimalist-gray': { name: 'رمادي بسيط', gradient: ['#e0e0e0', '#f5f5f5'], values: { textPrimary: '#212121', taglineColor: '#757575', backButtonBg: '#424242', backButtonText: '#ffffff', phoneBtnBg: '#212121', phoneBtnText: '#ffffff'}},
            'tech-blue': { name: 'أزرق تقني', gradient: ['#000428', '#004e92'], values: { textPrimary: '#ffffff', taglineColor: '#4c83ff', backButtonBg: '#1c3a6b', backButtonText: '#ffffff', phoneBtnBg: '#4c83ff', phoneBtnText: '#ffffff'}},
            'autumn-leaves': { name: 'أوراق الخريف', gradient: ['#d38312', '#a83279'], values: { textPrimary: '#ffffff', taglineColor: '#f5d020', backButtonBg: 'rgba(0, 0, 0, 0.25)', backButtonText: '#ffffff', phoneBtnBg: '#d38312', phoneBtnText: '#ffffff'}},
            'lavender-dream': { name: 'حلم الخزامى', gradient: ['#4e54c8', '#8f94fb'], values: { textPrimary: '#ffffff', taglineColor: '#e0e1ff', backButtonBg: '#6a70d6', backButtonText: '#ffffff', phoneBtnBg: '#ffffff', phoneBtnText: '#4e54c8'}},
            'graphite-orange': { name: 'برتقالي داكن', gradient: ['#1e1e1e', '#3e3e3e'], values: { textPrimary: '#ffffff', taglineColor: '#ff6b00', backButtonBg: '#333333', backButtonText: '#ff6b00', phoneBtnBg: '#ff6b00', phoneBtnText: '#1e1e1e'}},
            'nature-warmth': { name: 'دفء الطبيعة', gradient: ['#f5f5dc', '#f0e68c'], values: { textPrimary: '#556b2f', taglineColor: '#8b4513', backButtonBg: '#8fbc8f', backButtonText: '#2f4f4f', phoneBtnBg: '#8b4513', phoneBtnText: '#ffffff'}},
            'pastel-softness': { name: 'نعومة الباستيل', gradient: ['#fff0f5', '#e6e6fa'], values: { textPrimary: '#483d8b', taglineColor: '#ff69b4', backButtonBg: '#dda0dd', backButtonText: '#ffffff', phoneBtnBg: '#ffb6c1', phoneBtnText: '#483d8b'}},
            'modern-bold': { name: 'الجرأة العصرية', gradient: ['#ffffff', '#f1f1f1'], values: { textPrimary: '#000000', taglineColor: '#ff4500', backButtonBg: '#000000', backButtonText: '#ffffff', phoneBtnBg: '#ff4500', phoneBtnText: '#ffffff'}},
            'classic-noir': { name: 'أسود كلاسيكي', gradient: ['#f1f1f1', '#ffffff'], values: { textPrimary: '#1a1a1a', taglineColor: '#e63946', backButtonBg: '#343a40', backButtonText: '#f1f1f1', phoneBtnBg: '#1a1a1a', phoneBtnText: '#ffffff'}},
        },
        SOCIAL_PLATFORMS: { instagram: { name: 'انستغرام', icon: 'fab fa-instagram', prefix: 'https://instagram.com/' }, x: { name: 'X (تويتر)', icon: 'fab fa-xing', prefix: 'https://x.com/' }, telegram: { name: 'تيليجرام', icon: 'fab fa-telegram', prefix: 'https://t.me/' }, tiktok: { name: 'تيك توك', icon: 'fab fa-tiktok', prefix: 'https://tiktok.com/@' }, snapchat: { name: 'سناب شات', icon: 'fab fa-snapchat', prefix: 'https://snapchat.com/add/' }, youtube: { name: 'يوتيوب', icon: 'fab fa-youtube', prefix: 'https://youtube.com/' }, pinterest: { name: 'بينترست', icon: 'fab fa-pinterest', prefix: 'https://pinterest.com/' } },
        STATIC_CONTACT_METHODS: [ { id: 'whatsapp', icon: 'fab fa-whatsapp', prefix: 'https://wa.me/' }, { id: 'email', icon: 'fas fa-envelope', prefix: 'mailto:' }, { id: 'website', icon: 'fas fa-globe' }, { id: 'facebook', icon: 'fab fa-facebook-f' }, { id: 'linkedin', icon: 'fab fa-linkedin-in' } ]
    };
    const DOMElements = {};
    const Utils = {
        debounce: (func, delay = 250) => { let timeoutId; return (...args) => { clearTimeout(timeoutId); timeoutId = setTimeout(() => func.apply(this, args), delay); }; },
        resizeImage: (file, maxSize, callback) => { const reader = new FileReader(); reader.onload = e => { const img = new Image(); img.onload = () => { let { width, height } = img; if (width > height) { if (width > maxSize) { height *= maxSize / width; width = maxSize; } } else { if (height > maxSize) { width *= maxSize / height; height = maxSize; } } const canvas = document.createElement('canvas'); canvas.width = width; canvas.height = height; const ctx = canvas.getContext('2d'); ctx.drawImage(img, 0, 0, width, height); 
        callback(canvas.toDataURL('image/jpeg', 0.85)); }; img.src = e.target.result; }; reader.readAsDataURL(file); },
        playSound: (soundId) => {
            const audioEl = DOMElements.sounds[soundId];
            if (audioEl) { audioEl.currentTime = 0; audioEl.play().catch(e => console.error("Audio play failed:", e)); }
        },
        async copyTextToClipboard(text) { try { if (navigator.clipboard && window.isSecureContext) { await navigator.clipboard.writeText(text); } else { const textArea = document.createElement('textarea'); textArea.value = text; textArea.style.position = 'absolute'; textArea.style.left = '-999999px'; document.body.prepend(textArea); textArea.select(); document.execCommand('copy'); textArea.remove(); } return true; } catch (error) { console.error('فشل النسخ إلى الحافظة:', error); return false; } }
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
            if (this.history.length > 0 && JSON.stringify(state) === JSON.stringify(this.history[this.history.length - 1])) {
                return;
            }
            this.history.push(JSON.parse(JSON.stringify(state))); // Push a deep copy
            if (this.history.length > this.maxHistory) {
                this.history.shift();
            }
            this.currentIndex = this.history.length - 1;
            this.updateButtonStates();
        },

        undo() {
            if (this.currentIndex > 0) {
                this.currentIndex--;
                const state = JSON.parse(JSON.stringify(this.history[this.currentIndex])); // Get a deep copy
                StateManager.applyState(state, false); // Apply state without saving
                this.updateButtonStates();
            }
        },

        redo() {
            if (this.currentIndex < this.history.length - 1) {
                this.currentIndex++;
                const state = JSON.parse(JSON.stringify(this.history[this.currentIndex])); // Get a deep copy
                StateManager.applyState(state, false); // Apply state without saving
                this.updateButtonStates();
            }
        },

        updateButtonStates() {
            DOMElements.buttons.undoBtn.disabled = this.currentIndex <= 0;
            DOMElements.buttons.redoBtn.disabled = this.currentIndex >= this.history.length - 1;
        }
    };
    
    const TabManager = {
        init(navSelector, buttonSelector) {
            const nav = document.querySelector(navSelector);
            if (!nav) return;

            const buttons = nav.querySelectorAll(buttonSelector);
            const panes = document.querySelectorAll('.tab-pane');

            nav.addEventListener('click', (e) => {
                const button = e.target.closest(buttonSelector);
                if (button) {
                    const targetId = button.dataset.tabTarget;
                    this.switchTab(targetId, button, buttons, panes);
                }
            });
        },
        switchTab(targetId, clickedButton, allButtons, allPanes) {
            allButtons.forEach(btn => btn.classList.remove('active'));
            allPanes.forEach(pane => pane.classList.remove('active'));

            clickedButton.classList.add('active');
            const targetPane = document.getElementById(targetId);
            if(targetPane) {
                targetPane.classList.add('active');
            }
        }
    };

    const TooltipManager = {
        tooltipEl: null,
        init() {
            this.tooltipEl = document.createElement('div');
            this.tooltipEl.id = 'tooltip-popup';
            document.body.appendChild(this.tooltipEl);

            document.querySelectorAll('.help-tooltip').forEach(el => {
                el.addEventListener('mouseenter', this.showTooltip.bind(this));
                el.addEventListener('mousemove', this.moveTooltip.bind(this));
                el.addEventListener('mouseleave', this.hideTooltip.bind(this));
            });
        },
        showTooltip(event) {
            const text = event.target.dataset.tooltipText;
            if (text) {
                this.tooltipEl.textContent = text;
                this.tooltipEl.classList.add('visible');
            }
        },
        moveTooltip(event) {
            let x = event.clientX + 15;
            let y = event.clientY + 15;
            
            if (this.tooltipEl.offsetWidth && x + this.tooltipEl.offsetWidth > window.innerWidth) {
                x = event.clientX - this.tooltipEl.offsetWidth - 15;
            }
            if (this.tooltipEl.offsetHeight && y + this.tooltipEl.offsetHeight > window.innerHeight) {
                y = event.clientY - this.tooltipEl.offsetHeight - 15;
            }

            this.tooltipEl.style.left = `${x}px`;
            this.tooltipEl.style.top = `${y}px`;
        },
        hideTooltip() {
            this.tooltipEl.classList.remove('visible');
        }
    };

    const TourManager = {
        TOUR_SHOWN_KEY: 'digitalCardTourShown_v3',
        currentStep: -1,
        popoverEl: null,
        highlightedEl: null,
        steps: [
            {
                element: '.controls-column',
                title: 'مرحباً بك!',
                content: 'أهلاً بك في محرر بطاقات الأعمال الرقمية! دعنا نريك كيف تصمم بطاقتك في أقل من دقيقة.'
            },
            {
                element: '.controls-column .form-container',
                title: '1. أدوات التحكم',
                content: 'ابدأ من هنا. استخدم هذه التبويبات (الواجهة الأمامية، الخلفية، والتصاميم) لتغيير كل تفاصيل التصميم.'
            },
            {
                element: '.preview-column .cards-wrapper',
                title: '2. المعاينة الحية والتفاعلية',
                content: 'شاهد كل تغييراتك تحدث مباشرة هنا. يمكنك أيضاً سحب وإفلات الشعار، النصوص، وأرقام الهواتف لتغيير أماكنها بنفسك!'
            },
            {
                element: '.desktop-tabs-nav button[data-tab-target="tab-actions"]',
                title: '3. الحفظ والمشاركة',
                content: 'عندما تنتهي، اضغط على تبويب "التصاميم والحفظ" لحفظ تصميمك، أو تحميله بصيغ مختلفة، أو مشاركة رابط لبطاقتك من هنا.'
            },
            {
                element: '#help-btn',
                title: 'هل تحتاج للمساعدة؟',
                content: 'أنت الآن جاهز للبدء. إذا احتجت للمساعدة في أي وقت، اضغط على هذا الزر لفتح دليل الاستخدام المفصل.'
            }
        ],
        init() {
            // Tour might be confusing with new layout, disable for now or adjust later
        },
    };

    const ChatbotManager = {
        knowledgeBase: {
            'main': {
                message: 'أهلاً بك! أنا المساعد الآلي. كيف يمكنني خدمتك اليوم؟',
                options: [
                    { text: 'كيف أبدأ تصميم بطاقتي؟', nextNode: 'start_design' },
                    { text: 'شرح تخصيص التصميم', nextNode: 'customization' },
                    { text: 'شرح الحفظ والمشاركة', nextNode: 'saving' },
                    { text: 'ما هي العناصر التفاعلية؟', nextNode: 'interactive' },
                ]
            },
            'start_design': {
                message: 'بكل سهولة! ابدأ من القوائم على اليمين لتغيير الاسم، الشعار، والألوان. جميع تعديلاتك ستظهر مباشرة في المعاينة بالمنتصف.',
                options: [ { text: 'العودة للقائمة الرئيسية', nextNode: 'main' } ]
            },
            'customization': {
                message: 'ماذا تريد أن تعرف عن تخصيص التصميم؟',
                options: [
                    { text: 'تغيير النصوص والألوان', nextNode: 'custom_text' },
                    { text: 'إضافة رقم هاتف أو رابط', nextNode: 'custom_add' },
                    { text: 'العودة للقائمة الرئيسية', nextNode: 'main' },
                ]
            },
            'custom_text': {
                message: 'من القوائم على اليمين، افتح قسم "الاسم الكامل" أو "النشاط الوظيفي" لتجد حقول تعديل النص، حجم الخط، نوع الخط، واللون.',
                options: [ { text: 'العودة لشرح التخصيص', nextNode: 'customization' } ]
            },
            'custom_add': {
                message: 'لإضافة رقم هاتف، اذهب إلى قسم "أرقام الهواتف" واضغط "إضافة رقم". لإضافة رابط تواصل اجتماعي، اذهب إلى قسم "بيانات التواصل" واختر المنصة ثم أدخل الرابط واضغط "+".',
                options: [ { text: 'العودة لشرح التخصيص', nextNode: 'customization' } ]
            },
            'saving': {
                message: 'ماذا تريد أن تعرف عن الحفظ والمشاركة؟',
                options: [
                    { text: 'الفرق بين المعرض والمشاركة', nextNode: 'saving_diff' },
                    { text: 'شرح صيغ التصدير', nextNode: 'saving_formats' },
                    { text: 'العودة للقائمة الرئيسية', nextNode: 'main' },
                ]
            },
            'saving_diff': {
                message: '<b>الحفظ في المعرض:</b> يحفظ نسخة من تصميمك في متصفحك بشكل خاص للعودة إليها لاحقًا. <br><b>مشاركة الكارت:</b> ينشئ رابطاً عاماً لبطاقتك يمكن لأي شخص زيارته.',
                options: [ { text: 'العودة لشرح الحفظ', nextNode: 'saving' } ]
            },
            'saving_formats': {
                message: '<b>PNG:</b> صورة عالية الجودة. <br><b>PDF:</b> ملف مناسب للطباعة. <br><b>vCard:</b> لحفظ بياناتك مباشرة في جهات اتصال الهاتف.',
                options: [ { text: 'العودة لشرح الحفظ', nextNode: 'saving' } ]
            },
            'interactive': {
                message: 'أهم ميزة هي السحب والإفلات! يمكنك الضغط مع الاستمرار على <b>الشعار</b>، <b>كتلة الاسم والوظيفة</b>، و<b>أزرار الهواتف</b> في المعاينة، ثم تحريكها للمكان الذي تفضله.',
                options: [ { text: 'العودة للقائمة الرئيسية', nextNode: 'main' } ]
            },
        },

        init() {
            DOMElements.chatbot.toggleBtn.addEventListener('click', () => this.toggleWindow());
            DOMElements.chatbot.closeBtn.addEventListener('click', () => this.toggleWindow(false));
            this.displayNode('main');
        },

        toggleWindow(forceOpen) {
            DOMElements.chatbot.window.classList.toggle('visible', forceOpen);
        },

        addBotMessage(html) {
            const bubble = document.createElement('div');
            bubble.className = 'chat-bubble bot';
            bubble.innerHTML = html;
            DOMElements.chatbot.messages.appendChild(bubble);
            this.scrollToBottom();
        },
        
        addUserMessage(text) {
             const bubble = document.createElement('div');
            bubble.className = 'chat-bubble user';
            bubble.textContent = text;
            DOMElements.chatbot.messages.appendChild(bubble);
            this.scrollToBottom();
        },

        displayNode(nodeId) {
            const node = this.knowledgeBase[nodeId];
            if (!node) return;
            
            this.addBotMessage(node.message);
            
            DOMElements.chatbot.options.innerHTML = '';
            node.options.forEach(option => {
                const button = document.createElement('button');
                button.className = 'option-btn';
                button.textContent = option.text;
                button.addEventListener('click', () => {
                    this.addUserMessage(option.text);
                    setTimeout(() => this.displayNode(option.nextNode), 300);
                });
                DOMElements.chatbot.options.appendChild(button);
            });
        },

        scrollToBottom() {
            DOMElements.chatbot.messages.scrollTop = DOMElements.chatbot.messages.scrollHeight;
        }
    };

    const UIManager = {
        init() { this.populateThemeThumbnails(); this.populateSocialMediaOptions(); },
        announce: (message) => { if(DOMElements.liveAnnouncer) DOMElements.liveAnnouncer.textContent = message; },
        
        populateThemeThumbnails() {
            const container = document.getElementById('theme-gallery');
            if (!container) {
                console.error("Theme gallery container not found.");
                return;
            }
            container.innerHTML = '';
            Object.entries(Config.THEMES).forEach(([key, theme]) => {
                const thumb = document.createElement('div');
                thumb.className = 'theme-thumbnail';
                thumb.dataset.themeKey = key;
                thumb.title = theme.name;
                thumb.innerHTML = `
                    <div class="theme-preview" style="background: linear-gradient(135deg, ${theme.gradient[0]}, ${theme.gradient[1]});"></div>
                    <span class="theme-name">${theme.name}</span>
                `;
                container.appendChild(thumb);
            });
        },

        setActiveThumbnail(themeKey) {
            document.querySelectorAll('.theme-thumbnail').forEach(thumb => {
                thumb.classList.toggle('active', thumb.dataset.themeKey === themeKey);
            });
            const hiddenInput = document.getElementById('theme-select-input');
            if (hiddenInput) {
                hiddenInput.value = themeKey;
            }
        },

        populateSocialMediaOptions() { 
            const select = document.getElementById('social-media-type');
            if (!select) {
                console.error("CRITICAL: #social-media-type element not found in DOM.");
                return;
            }
            select.innerHTML = Object.entries(Config.SOCIAL_PLATFORMS).map(([key, platform]) => `<option value="${key}">${platform.name}</option>`).join(''); 
        },

        handleImageUpload(event, { maxSizeMB, errorEl, previewEl, spinnerEl, onSuccess }) {
            const file = event.target.files[0];
            errorEl.textContent = ''; errorEl.style.display = 'none';
            if (!file) return;
            if (!file.type.startsWith('image/')) { errorEl.textContent = 'الرجاء اختيار ملف صورة صالح.'; errorEl.style.display = 'block'; Utils.playSound('error'); return; }
            if (file.size > maxSizeMB * 1024 * 1024) { errorEl.textContent = `يجب أن يكون حجم الملف أقل من ${maxSizeMB} ميجابايت.`; errorEl.style.display = 'block'; Utils.playSound('error'); return; }
            spinnerEl.style.display = 'block';
            Utils.resizeImage(file, Config.RESIZED_IMAGE_MAX_DIMENSION, (resizedUrl) => {
                if(previewEl) previewEl.src = resizedUrl;
                spinnerEl.style.display = 'none';
                Utils.playSound('success');
                onSuccess(resizedUrl);
                this.announce("تم رفع الصورة المضغوطة بنجاح.");
            });
        },
        showSaveNotification() {
            const toast = DOMElements.saveToast; if (!toast) return;
            toast.textContent = 'جاري الحفظ...'; toast.classList.add('show');
            StateManager.save();
            setTimeout(() => {
                toast.textContent = 'تم الحفظ ✓';
                UIManager.announce("تم حفظ التغييرات تلقائيًا");
                setTimeout(() => { toast.classList.remove('show'); }, 1500);
            }, 500);
        },
        updateFavicon(url) { if(url) document.getElementById('favicon').href = url; },
        highlightElement(targetId, state) { const el = document.getElementById(targetId); if(el) el.classList.toggle('highlighted', state); },
        
        navigateToAndHighlight(elementId) {
            const targetElement = document.getElementById(elementId);
            if (!targetElement) { 
                console.warn(`Element with ID "${elementId}" not found.`); 
                return; 
            }

            const parentPane = targetElement.closest('.tab-pane');
            if (parentPane && !parentPane.classList.contains('active')) {
                const paneId = parentPane.id;
                const isMobile = window.innerWidth <= 1200;
                
                const buttonSelector = isMobile 
                    ? `.mobile-tab-btn[data-tab-target="${paneId}"]` 
                    : `.desktop-tab-btn[data-tab-target="${paneId}"]`;
                
                const buttonToClick = document.querySelector(buttonSelector);

                if (buttonToClick) {
                    const allButtonsSelector = isMobile ? '.mobile-tab-btn' : '.desktop-tab-btn';
                    const allButtons = document.querySelectorAll(allButtonsSelector);
                    const allPanes = document.querySelectorAll('.tab-pane');
                    TabManager.switchTab(paneId, buttonToClick, allButtons, allPanes);
                }
            }
            
            const parentAccordion = targetElement.closest('details');
            if (parentAccordion && !parentAccordion.open) {
                parentAccordion.open = true;
            }
            
            setTimeout(() => {
                const highlightTarget = targetElement.closest('.fieldset') || targetElement.closest('.form-group') || targetElement;
                highlightTarget.scrollIntoView({ behavior: 'smooth', block: 'center' });
                highlightTarget.classList.add('form-element-highlighted');
                setTimeout(() => {
                    highlightTarget.classList.remove('form-element-highlighted');
                }, 2000);
            }, 150);
        },

        trapFocus(modalElement) {
            const focusableElements = modalElement.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
            const firstElement = focusableElements[0];
            const lastElement = focusableElements[focusableElements.length - 1];
            const handleTabKeyPress = (e) => {
                if (e.key !== 'Tab') return;
                if (e.shiftKey) { if (document.activeElement === firstElement) { e.preventDefault(); lastElement.focus(); } }
                else { if (document.activeElement === lastElement) { e.preventDefault(); firstElement.focus(); } }
            };
            modalElement.addEventListener('keydown', handleTabKeyPress);
            firstElement?.focus();
            return handleTabKeyPress;
        },
        showModal(modalOverlay, triggerElement) {
            modalOverlay.classList.add('visible');
            modalOverlay.dataset.triggerElementId = triggerElement?.id;
            const eventListener = this.trapFocus(modalOverlay);
            modalOverlay.dataset.focusTrapListener = eventListener;
        },
        hideModal(modalOverlay) {
            modalOverlay.classList.remove('visible');
            const triggerElementId = modalOverlay.dataset.triggerElementId;
            if (triggerElementId) { document.getElementById(triggerElementId)?.focus(); }
            const eventListener = modalOverlay.dataset.focusTrapListener;
            if (eventListener) { modalOverlay.removeEventListener('keydown', eventListener); }
        },
        toggleDirection() {
            const html = document.documentElement; const btn = DOMElements.buttons.directionToggle; const span = btn.querySelector('span');
            if (html.dir === 'rtl') { html.dir = 'ltr'; html.classList.add('ltr'); span.textContent = 'AR'; }
            else { html.dir = 'rtl'; html.classList.remove('ltr'); span.textContent = 'EN'; }
        },
        setupDragDrop(dropZoneId, fileInputId) { const dropZone = document.getElementById(dropZoneId); const fileInput = document.getElementById(fileInputId); if (!dropZone || !fileInput) return; ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => { dropZone.addEventListener(eventName, e => { e.preventDefault(); e.stopPropagation(); }); }); ['dragenter', 'dragover'].forEach(eventName => { dropZone.addEventListener(eventName, () => dropZone.classList.add('drag-over')); }); ['dragleave', 'drop'].forEach(eventName => { dropZone.addEventListener(eventName, () => dropZone.classList.remove('drag-over')); }); dropZone.addEventListener('drop', e => { if (e.dataTransfer.files.length) { fileInput.files = e.dataTransfer.files; fileInput.dispatchEvent(new Event('change', { bubbles: true })); } }); },
        setButtonLoadingState(button, isLoading, text = 'جاري التحميل...') { if (!button) return; const span = button.querySelector('span'); const originalText = button.dataset.originalText || (span ? span.textContent : ''); if(!button.dataset.originalText && span) button.dataset.originalText = originalText; if (isLoading) { button.disabled = true; button.classList.add('loading'); if(span) span.textContent = text; } else { button.disabled = false; button.classList.remove('loading'); if(span) span.textContent = originalText; }},
        showDragAndDropHints() {
            DragManager.draggableElements.forEach(selector => {
                const el = document.querySelector(selector);
                if (el) { const hint = document.createElement('div'); hint.className = 'dnd-hint'; hint.innerHTML = `<i class="fas fa-arrows-alt" aria-hidden="true"></i>`; el.appendChild(hint); }
            });
            hintTimeout = setTimeout(this.hideDragAndDropHints, 7000);
        },
        hideDragAndDropHints() {
            clearTimeout(hintTimeout);
            document.querySelectorAll('.dnd-hint').forEach(hint => {
                hint.classList.add('is-hidden');
                setTimeout(() => { hint.remove(); }, 500);
            });
        },
    };
    const DragManager = {
        draggableElements: ['#card-logo', '#identity-front', '#phone-buttons-wrapper'],
        init() { this.draggableElements.forEach(selector => this.makeDraggable(selector)); },
        makeDraggable(selector) {
            interact(selector).draggable({ inertia: true, modifiers: [interact.modifiers.restrictRect({ restriction: 'parent', endOnly: true })], autoScroll: false, listeners: { start: this.dragStartListener, move: this.dragMoveListener, end: this.dragEndListener } });
        },
        dragStartListener(event) { UIManager.hideDragAndDropHints(); event.target.classList.add('dragging'); },
        dragMoveListener(event) {
            const target = event.target;
            const x = (parseFloat(target.getAttribute('data-x')) || 0) + event.dx;
            const y = (parseFloat(target.getAttribute('data-y')) || 0) + event.dy;
            target.style.transform = `translate(${x}px, ${y}px)`;
            target.setAttribute('data-x', x);
            target.setAttribute('data-y', y);
        },
        dragEndListener(event) { event.target.classList.remove('dragging'); StateManager.saveDebounced(); },
        resetPositions() {
            this.draggableElements.forEach(selector => {
                const el = document.querySelector(selector);
                if(el) { el.style.transform = 'translate(0px, 0px)'; el.removeAttribute('data-x'); el.removeAttribute('data-y'); }
            });
        }
    };
    const CardManager = {
        frontBgImageUrl: null, backBgImageUrl: null, qrCodeImageUrl: null,
        updateElementFromInput(input) { const { updateTarget, updateProperty, updateUnit = '' } = input.dataset; if (!updateTarget || !updateProperty) return; const targetElement = document.getElementById(updateTarget); if (!targetElement) return; const properties = updateProperty.split('.'); let current = targetElement; for (let i = 0; i < properties.length - 1; i++) { current = current[properties[i]]; } current[properties[properties.length - 1]] = input.value + updateUnit; },
        updatePhoneButtonStyles() { const bgColor = DOMElements.phoneBtnBgColor.value; const textColor = DOMElements.phoneBtnTextColor.value; const fontSize = DOMElements.phoneBtnFontSize.value; const fontFamily = DOMElements.phoneBtnFont.value; const padding = DOMElements.phoneBtnPadding.value; DOMElements.phoneButtonsWrapper.querySelectorAll('.phone-button').forEach(button => { button.style.backgroundColor = bgColor; button.style.color = textColor; button.style.borderColor = (bgColor === 'transparent' || bgColor.includes('rgba(0,0,0,0)')) ? textColor : 'transparent'; button.style.fontSize = `${fontSize}px`; button.style.fontFamily = fontFamily; button.style.padding = `${padding}px ${padding * 2}px`; }); },
        updatePhoneButtonsVisibility() { const isVisible = DOMElements.buttons.togglePhone.checked; DOMElements.phoneButtonsWrapper.classList.toggle('text-only-mode', !isVisible); DOMElements.phoneTextControls.container.classList.toggle('visible', !isVisible); },
        updatePhoneTextStyles() {
            const wrapper = DOMElements.phoneButtonsWrapper; if (!wrapper) return;
            const layout = document.querySelector('input[name="phone-text-layout"]:checked').value; const size = DOMElements.phoneTextControls.size.value; const color = DOMElements.phoneTextControls.color.value; const font = DOMElements.phoneTextControls.font.value;
            wrapper.dataset.layout = layout;
            wrapper.querySelectorAll('.phone-button').forEach(el => { el.style.fontSize = `${size}px`; el.style.color = color; el.style.fontFamily = font; });
        },
        renderPhoneButtons() {
            DOMElements.phoneButtonsWrapper.innerHTML = '';
            DOMElements.phoneNumbersContainer.querySelectorAll('.dynamic-input-group').forEach((group, index) => {
                if (!group.id) { group.id = `phone-group-${index}`; }
                const input = group.querySelector('input[type="tel"]');
                if (input && input.value) {
                    const phoneLink = document.createElement('a'); phoneLink.href = `tel:${input.value.replace(/[^0-9+]/g, '')}`; phoneLink.className = 'phone-button';
                    const icon = document.createElement('i'); icon.className = 'fas fa-phone-alt'; icon.setAttribute('aria-hidden', 'true');
                    const textSpan = document.createElement('span'); textSpan.textContent = input.value;
                    phoneLink.append(icon, textSpan);
                    const copyBtn = document.createElement('button'); copyBtn.className = 'copy-btn no-export'; copyBtn.title = 'نسخ الرقم';
                    const copyIcon = document.createElement('i'); copyIcon.className = 'fas fa-copy'; copyIcon.setAttribute('aria-hidden', 'true'); copyBtn.appendChild(copyIcon);
                    const phoneNumber = input.value;
                    copyBtn.onclick = (e) => { e.preventDefault(); e.stopPropagation(); Utils.copyTextToClipboard(phoneNumber).then(success => { if (success) UIManager.announce('تم نسخ الرقم!'); }); };
                    phoneLink.appendChild(copyBtn);
                    phoneLink.dataset.targetFormId = group.id;
                    phoneLink.addEventListener('click', (e) => { e.preventDefault(); UIManager.navigateToAndHighlight(e.currentTarget.dataset.targetFormId); });
                    DOMElements.phoneButtonsWrapper.appendChild(phoneLink);
                }
            });
            this.updatePhoneButtonStyles(); this.updatePhoneTextStyles();
        },
        createPhoneInput(value = '') { 
            const inputGroup = document.createElement('div'); inputGroup.className = 'dynamic-input-group'; inputGroup.setAttribute('draggable', true);
            const dragHandle = document.createElement('i'); dragHandle.className = 'fas fa-grip-vertical drag-handle'; dragHandle.setAttribute('aria-hidden', 'true');
            const newPhoneInput = document.createElement('input'); newPhoneInput.type = 'tel'; newPhoneInput.value = value; newPhoneInput.placeholder = 'رقم هاتف جديد'; newPhoneInput.style.flexGrow = '1';
            const removeBtn = document.createElement('button'); removeBtn.className = 'remove-btn'; removeBtn.textContent = '×'; removeBtn.setAttribute('aria-label', 'حذف رقم الهاتف'); 
            removeBtn.onclick = () => { inputGroup.remove(); this.renderPhoneButtons(); StateManager.saveDebounced(); };
            newPhoneInput.addEventListener('input', () => { this.renderPhoneButtons(); StateManager.saveDebounced(); }); 
            inputGroup.append(dragHandle, newPhoneInput, removeBtn);
            DOMElements.phoneNumbersContainer.appendChild(inputGroup); 
        },
        updateCardBackgrounds() { const setBg = (cardEl, startId, endId, image, opacityId) => { cardEl.style.setProperty('--bg-gradient', `linear-gradient(135deg, ${document.getElementById(startId).value}, ${document.getElementById(endId).value})`); cardEl.querySelector('.card-background-layer[id$="-image-layer"]').style.backgroundImage = image ? `url(${image})` : 'none'; cardEl.querySelector('.card-background-layer[id$="-gradient-layer"]').style.opacity = document.getElementById(opacityId).value; }; setBg(DOMElements.cardFront, 'front-bg-start', 'front-bg-end', this.frontBgImageUrl, 'front-bg-opacity'); setBg(DOMElements.cardBack, 'back-bg-start', 'back-bg-end', this.backBgImageUrl, 'back-bg-opacity'); },
        
        updateBackCard() {
            const cardContent = DOMElements.cardBackContent;
            cardContent.innerHTML = '';
            const qrSourceRadio = document.querySelector('input[name="qr-source"]:checked');
            if (!qrSourceRadio) return;
            const qrSource = qrSourceRadio.value;
            let qrContentAdded = false;
            const qrWrapper = document.createElement('div');
            qrWrapper.className = 'card-back-qr-image-wrapper';
            qrWrapper.style.width = `${DOMElements.qrSizeSlider.value}%`;
            let qrImageSrc = null;
            if (qrSource === 'custom') {
                qrImageSrc = DOMElements.qrImageUrlInput.value;
            } else if (qrSource === 'upload') {
                qrImageSrc = this.qrCodeImageUrl;
            }
            if (qrImageSrc) {
                const qrImage = document.createElement('img');
                qrImage.src = qrImageSrc;
                qrImage.alt = 'QR Code';
                qrWrapper.appendChild(qrImage);
                qrContentAdded = true;
            }
            if (qrContentAdded) {
                qrWrapper.addEventListener('click', (e) => {
                    e.preventDefault();
                    e.stopPropagation(); 
                    UIManager.navigateToAndHighlight('qr-code-accordion');
                });
                cardContent.appendChild(qrWrapper);
            }
            const contactsWrapper = document.createElement('div');
            contactsWrapper.className = 'contact-icons-wrapper';
            const renderLink = (value, platform, sourceInputId) => {
                let fullUrl = value,
                    displayText = value;
                if (platform.prefix) {
                    if (platform.id === 'email' || platform.id === 'whatsapp') {
                        fullUrl = platform.prefix + value;
                    } else {
                        fullUrl = !/^(https?:\/\/)/i.test(value) ? platform.prefix + value : value;
                    }
                } else if (!/^(https?:\/\/)/i.test(value)) {
                    fullUrl = 'https://' + value;
                }
                if (platform.id !== 'email' && platform.id !== 'whatsapp') {
                    displayText = displayText.replace(/^(https?:\/\/)?(www\.)?/, '').replace(/\/$/, '');
                }
                const link = document.createElement('a');
                link.href = fullUrl;
                link.target = "_blank";
                link.rel = "noopener noreferrer";
                const icon = document.createElement('i');
                icon.className = platform.icon;
                icon.setAttribute('aria-hidden', 'true');
                const text = document.createElement('span');
                text.textContent = displayText;
                link.append(icon, text);
                link.addEventListener('click', (e) => {
                    if (!e.metaKey && !e.ctrlKey) {
                        e.preventDefault();
                        UIManager.navigateToAndHighlight(sourceInputId);
                    }
                });
                const copyBtn = document.createElement('button');
                copyBtn.className = 'copy-btn no-export';
                copyBtn.title = 'نسخ الرابط';
                const copyIcon = document.createElement('i');
                copyIcon.className = 'fas fa-copy';
                copyIcon.setAttribute('aria-hidden', 'true');
                copyBtn.appendChild(copyIcon);
                copyBtn.onclick = (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    Utils.copyTextToClipboard(fullUrl).then(success => {
                        if (success) UIManager.announce('تم نسخ الرابط!');
                    });
                };
                link.appendChild(copyBtn);
                contactsWrapper.appendChild(link);
            };
            Config.STATIC_CONTACT_METHODS.forEach(method => {
                const input = document.getElementById('input-' + method.id);
                if (input && input.value) renderLink(input.value, method, 'input-' + method.id);
            });
            DOMElements.social.container.querySelectorAll('.dynamic-social-link').forEach(linkEl => {
                const platformKey = linkEl.dataset.platform;
                const value = linkEl.dataset.value;
                if (platformKey && value && Config.SOCIAL_PLATFORMS[platformKey]) {
                    renderLink(value, Config.SOCIAL_PLATFORMS[platformKey], 'social-media-input');
                }
            });
            cardContent.appendChild(contactsWrapper);
            const backButtonBgColor = DOMElements.backButtonsBgColor.value;
            const backButtonTextColor = DOMElements.backButtonsTextColor.value;
            const backButtonFont = DOMElements.backButtonsFont.value;
            const backButtonSize = DOMElements.backButtonsSize.value;
            contactsWrapper.querySelectorAll('a').forEach(link => {
                link.style.backgroundColor = backButtonBgColor;
                link.style.color = backButtonTextColor;
                link.style.fontFamily = backButtonFont;
                link.style.fontSize = `${backButtonSize}px`;
                link.style.padding = `${backButtonSize * 0.5}px ${backButtonSize}px`;
            });
        },

        applyTheme(themeKey) { 
            const theme = Config.THEMES[themeKey]; 
            if (!theme) return; 

            UIManager.setActiveThumbnail(themeKey);

            const controlsToUpdate = { 
                'name-color': theme.values.textPrimary, 
                'tagline-color': theme.values.taglineColor, 
                'front-bg-start': theme.gradient[0], 
                'front-bg-end': theme.gradient[1], 
                'back-bg-start': theme.gradient[0], 
                'back-bg-end': theme.gradient[1], 
                'back-buttons-bg-color': theme.values.backButtonBg, 
                'back-buttons-text-color': theme.values.backButtonText, 
                'phone-btn-bg-color': theme.values.phoneBtnBg, 
                'phone-btn-text-color': theme.values.phoneBtnText 
            }; 
            for (const [id, value] of Object.entries(controlsToUpdate)) { 
                const control = document.getElementById(id); 
                if(control) { 
                    control.value = value; 
                    control.dispatchEvent(new Event('input', { bubbles: true })); 
                } 
            } 
            this.frontBgImageUrl = null; 
            this.backBgImageUrl = null; 
            DOMElements.fileInputs.frontBg.value = ''; 
            DOMElements.fileInputs.backBg.value = ''; 
            this.updateCardBackgrounds(); 
            UIManager.announce(`تم تطبيق تصميم ${theme.name}`); 
            StateManager.saveDebounced();
        },
        addSocialLink() { 
            const socialTypeEl = document.getElementById('social-media-type');
            const platformKey = socialTypeEl.value; 
            const value = DOMElements.social.input.value.trim(); 
            if (!value) { UIManager.announce('الرجاء إدخال رابط أو معرف.'); return; } 
            const platform = Config.SOCIAL_PLATFORMS[platformKey]; 
            const linkEl = document.createElement('div'); linkEl.className = 'dynamic-social-link'; linkEl.setAttribute('draggable', true); linkEl.dataset.platform = platformKey; linkEl.dataset.value = value; 
            const dragHandle = document.createElement('i'); dragHandle.className = 'fas fa-grip-vertical drag-handle'; dragHandle.setAttribute('aria-hidden', 'true');
            const icon = document.createElement('i'); icon.className = platform.icon; icon.setAttribute('aria-hidden', 'true');
            const text = document.createElement('span'); text.textContent = value;
            const removeBtn = document.createElement('button'); removeBtn.className = 'remove-btn'; removeBtn.setAttribute('aria-label', 'حذف الرابط'); removeBtn.textContent = '×';
            removeBtn.addEventListener('click', () => { linkEl.remove(); this.updateBackCard(); StateManager.saveDebounced(); }); 
            linkEl.append(dragHandle, icon, text, removeBtn);
            DOMElements.social.container.appendChild(linkEl); 
            DOMElements.social.input.value = ''; 
            this.updateBackCard(); StateManager.saveDebounced(); 
        },
        applyLayout(layoutName) { DOMElements.cardsWrapper.dataset.layout = layoutName; StateManager.saveDebounced(); }
    };

    const StateManager = {
        getStateObject() {
            const state = { inputs: {}, dynamic: { phones: [], social: [] }, imageUrls: {}, positions: {} };
            document.querySelectorAll('input, select, textarea').forEach(input => {
                if (input.type === 'radio') { if (input.checked) { state.inputs[input.name] = input.value; } }
                else if (input.type === 'checkbox') { state.inputs[input.id] = input.checked; }
                else { state.inputs[input.id] = input.value; }
            });
            state.dynamic.phones = [...DOMElements.phoneNumbersContainer.querySelectorAll('input[type="tel"]')].map(p => p.value);
            state.dynamic.social = [...DOMElements.social.container.querySelectorAll('.dynamic-social-link')].map(s => ({ platform: s.dataset.platform, value: s.dataset.value }));
            state.imageUrls.front = CardManager.frontBgImageUrl; state.imageUrls.back = CardManager.backBgImageUrl; state.imageUrls.qrCode = CardManager.qrCodeImageUrl;
            DragManager.draggableElements.forEach(selector => {
                const el = document.querySelector(selector);
                if (el) { const id = el.id; state.positions[id] = { x: parseFloat(el.getAttribute('data-x')) || 0, y: parseFloat(el.getAttribute('data-y')) || 0, }; }
            });
            return state;
        },
        save() { try { const state = this.getStateObject(); localStorage.setItem(Config.LOCAL_STORAGE_KEY, JSON.stringify(state)); } catch (e) { console.error("Failed to save state:", e); } },
        load() { try { const savedState = localStorage.getItem(Config.LOCAL_STORAGE_KEY); if (savedState) { this.applyState(JSON.parse(savedState), false); return true; } return false; } catch(e) { console.error("Failed to load state:", e); return false; } },
        applyState(state, triggerSave = true) {
            if (!state) return;
            if (state.inputs) {
                for (const [key, value] of Object.entries(state.inputs)) {
                    const radioInputs = document.querySelectorAll(`input[name="${key}"][type="radio"]`);
                    if (radioInputs.length > 0) { radioInputs.forEach(radio => radio.checked = radio.value === value); }
                    else {
                        const input = document.getElementById(key);
                        if (input) {
                           if (input.type === 'checkbox') { input.checked = value; }
                           else { input.value = value || ''; }
                        }
                    }
                }
            }
            DOMElements.phoneNumbersContainer.innerHTML = ''; if (state.dynamic && state.dynamic.phones) { state.dynamic.phones.forEach(phone => CardManager.createPhoneInput(phone)); }
            DOMElements.social.container.innerHTML = ''; 
            if(state.dynamic && state.dynamic.social) { 
                const socialTypeEl = document.getElementById('social-media-type');
                state.dynamic.social.forEach(social => { 
                    socialTypeEl.value = social.platform; 
                    DOMElements.social.input.value = social.value; 
                    CardManager.addSocialLink(); 
                }); 
            }
            if(state.imageUrls) {
                CardManager.frontBgImageUrl = state.imageUrls.front; CardManager.backBgImageUrl = state.imageUrls.back; CardManager.qrCodeImageUrl = state.imageUrls.qrCode;
                DOMElements.buttons.removeFrontBg.style.display = state.imageUrls.front ? 'block' : 'none';
                DOMElements.buttons.removeBackBg.style.display = state.imageUrls.back ? 'block' : 'none';
            }
            if (state.positions) {
                for (const [id, pos] of Object.entries(state.positions)) {
                    const el = document.getElementById(id);
                    if (el) { el.style.transform = `translate(${pos.x}px, ${pos.y}px)`; el.setAttribute('data-x', pos.x); el.setAttribute('data-y', pos.y); }
                }
            } else { DragManager.resetPositions(); }
            
            document.querySelectorAll('input, select, textarea').forEach(input => {
                const event = new Event('input', { bubbles: true });
                const changeEvent = new Event('change', { bubbles: true });
                input.dispatchEvent(event);
                input.dispatchEvent(changeEvent);
            });

            if (state.inputs['theme-select-input']) {
                UIManager.setActiveThumbnail(state.inputs['theme-select-input']);
            }

            if (triggerSave) {
                StateManager.saveDebounced();
            }
        },
        reset() { 
            if (confirm('هل أنت متأكد أنك تريد إعادة تعيين التصميم بالكامل؟ سيتم حذف أي بيانات محفوظة.')) { 
                localStorage.removeItem(Config.LOCAL_STORAGE_KEY);
                window.location.reload();
            } 
        },
        saveDebounced: Utils.debounce(() => {
            HistoryManager.pushState(StateManager.getStateObject());
            UIManager.showSaveNotification();
        }, 800)
    };
    const ExportManager = {
        pendingExportTarget: null,
        async captureElement(element, scale = 2) {
            const style = document.createElement('style'); style.innerHTML = '.no-export { display: none !important; }'; document.head.appendChild(style);
            try { return await html2canvas(element, { backgroundColor: null, scale: scale, useCORS: true }); } 
            finally { document.head.removeChild(style); }
        },
        async downloadElement(options) { 
            const {format, quality, scale} = options;
            const element = this.pendingExportTarget === 'front' ? DOMElements.cardFront : DOMElements.cardBack;
            const filename = `card-${this.pendingExportTarget}.${format}`;
            UIManager.showModal(DOMElements.exportLoadingOverlay);
            try { 
                await new Promise(resolve => setTimeout(resolve, 100));
                const canvas = await this.captureElement(element, scale); 
                const link = document.createElement('a'); link.download = filename; link.href = canvas.toDataURL(`image/${format}`, quality); link.click();
            } catch(e) { console.error("Export failed:", e); UIManager.announce("فشل التصدير."); }
            finally { UIManager.hideModal(DOMElements.exportLoadingOverlay); UIManager.hideModal(DOMElements.exportModal.overlay); } 
        },
        async downloadPdf(button) { UIManager.setButtonLoadingState(button, true); try { const { jsPDF } = window.jspdf; const doc = new jsPDF({ orientation: 'landscape', unit: 'px', format: [510, 330] }); const frontCanvas = await this.captureElement(DOMElements.cardFront, 2); doc.addImage(frontCanvas.toDataURL('image/png'), 'PNG', 0, 0, 510, 330); doc.addPage(); const backCanvas = await this.captureElement(DOMElements.cardBack, 2); doc.addImage(backCanvas.toDataURL('image/png'), 'PNG', 0, 0, 510, 330); doc.save('business-card.pdf'); } catch (e) { console.error('PDF export failed:', e); UIManager.announce('فشل تصدير PDF.'); } finally { UIManager.setButtonLoadingState(button, false); } },
        getVCardString() { 
            const name = DOMElements.nameInput.value.replace(/\n/g, ' ').split(' '); const firstName = name.slice(0, -1).join(' '); const lastName = name.slice(-1).join(' '); 
            let vCard = `BEGIN:VCARD\nVERSION:3.0\nN:${lastName};${firstName};;;\nFN:${DOMElements.nameInput.value}\nORG:${DOMElements.taglineInput.value.replace(/\n/g, ' ')}\nTITLE:${DOMElements.taglineInput.value.replace(/\n/g, ' ')}\n`; 
            if (DOMElements.emailInput.value) vCard += `EMAIL;TYPE=PREF,INTERNET:${DOMElements.emailInput.value}\n`; 
            if (DOMElements.websiteInput.value) vCard += `URL:${DOMElements.websiteInput.value}\n`; 
            document.querySelectorAll('#phone-numbers-container input[type="tel"]').forEach((phone, index) => { if (phone.value) vCard += `TEL;TYPE=CELL${index === 0 ? ',PREF' : ''}:${phone.value}\n`; }); 
            DOMElements.social.container.querySelectorAll('.dynamic-social-link').forEach(linkEl => {
                const platformKey = linkEl.dataset.platform; const value = linkEl.dataset.value;
                if(platformKey && value && Config.SOCIAL_PLATFORMS[platformKey]) { let fullUrl = !/^(https?:\/\/)/i.test(value) ? Config.SOCIAL_PLATFORMS[platformKey].prefix + value : value; vCard += `URL;TYPE=${platformKey}:${fullUrl}\n`; }
            });
            vCard += `END:VCARD`; return vCard; 
        },
        downloadVcf() { const vcfData = this.getVCardString(); const blob = new Blob([vcfData], { type: 'text/vcard' }); const url = URL.createObjectURL(blob); const link = document.createElement('a'); link.href = url; link.download = 'contact.vcf'; link.click(); URL.revokeObjectURL(url); },
        async downloadQrCode() {
            UIManager.setButtonLoadingState(DOMElements.buttons.downloadQrCode, true, 'جاري الإنشاء...');
            try {
                const designId = await ShareManager.saveDesign();
                if (!designId) {
                    alert('فشل حفظ التصميم اللازم لإنشاء الرابط.');
                    return;
                }
                
                const viewerUrl = new URL('viewer.html', window.location.href);
                viewerUrl.searchParams.set('id', designId);
                const finalUrl = viewerUrl.href;

                const container = DOMElements.qrCodeContainer;
                container.innerHTML = '';
                new QRCode(container, { text: finalUrl, width: 256, height: 256, correctLevel: QRCode.CorrectLevel.H });

                setTimeout(() => {
                    const canvas = container.querySelector('canvas');
                    if (canvas) {
                        const link = document.createElement('a');
                        link.download = `qrcode-card-link-${designId}.png`;
                        link.href = canvas.toDataURL('image/png');
                        link.click();
                    } else {
                        alert("حدث خطأ أثناء إنشاء QR Code. حاول مرة أخرى.");
                    }
                }, 100);

            } catch (error) {
                console.error("Error generating shareable QR code:", error);
                alert("حدث خطأ. لم نتمكن من إنشاء رابط QR Code.");
            } finally {
                UIManager.setButtonLoadingState(DOMElements.buttons.downloadQrCode, false);
            }
        }
    };
    const GalleryManager = {
        designs: [],
        init() { this.loadDesigns(); },
        loadDesigns() { this.designs = JSON.parse(localStorage.getItem(Config.GALLERY_STORAGE_KEY)) || []; },
        saveDesigns() { localStorage.setItem(Config.GALLERY_STORAGE_KEY, JSON.stringify(this.designs)); },
        async addCurrentDesign() {
            UIManager.setButtonLoadingState(DOMElements.buttons.saveToGallery, true, 'جاري الحفظ...');
            const state = StateManager.getStateObject();
            const thumbnail = await ExportManager.captureElement(DOMElements.cardFront, 0.5).then(canvas => canvas.toDataURL('image/jpeg', 0.5));
            this.designs.push({ name: `تصميم ${this.designs.length + 1}`, timestamp: Date.now(), state, thumbnail });
            this.saveDesigns();
            UIManager.setButtonLoadingState(DOMElements.buttons.saveToGallery, false);
            UIManager.announce('تم حفظ التصميم في المعرض بنجاح!');
        },
        deleteDesign(index) { if (confirm(`هل أنت متأكد من حذف "${this.designs[index].name}"؟`)) { this.designs.splice(index, 1); this.saveDesigns(); this.render(); } },
        loadDesignToEditor(index) { const design = this.designs[index]; if (design) { StateManager.applyState(design.state); UIManager.hideModal(DOMElements.galleryModal.overlay, DOMElements.buttons.showGallery); } },
        toggleRename(itemElement, index) {
            const nameSpan = itemElement.querySelector('.gallery-item-name-span'); const nameInput = itemElement.querySelector('.gallery-item-name-input'); const renameBtn = itemElement.querySelector('.gallery-rename-btn'); const icon = renameBtn.querySelector('i');
            if (nameInput.style.display === 'none') { nameSpan.style.display = 'none'; nameInput.style.display = 'block'; nameInput.value = this.designs[index].name; nameInput.focus(); icon.className = 'fas fa-save'; }
            else {
                const newName = nameInput.value.trim();
                if (newName) { this.designs[index].name = newName; this.saveDesigns(); nameSpan.textContent = newName; }
                nameSpan.style.display = 'block'; nameInput.style.display = 'none'; icon.className = 'fas fa-pencil-alt';
            }
        },
        render() {
            const grid = DOMElements.galleryModal.grid; grid.innerHTML = '';
            if (this.designs.length === 0) { const p = document.createElement('p'); p.textContent = 'المعرض فارغ. قم بحفظ تصميمك الحالي للبدء.'; grid.appendChild(p); return; }
            this.designs.forEach((design, index) => {
                const item = document.createElement('div'); item.className = 'gallery-item';
                const checkbox = document.createElement('input'); checkbox.type = 'checkbox'; checkbox.className = 'gallery-item-select'; checkbox.dataset.index = index; checkbox.onchange = () => this.updateSelectionState();
                const thumbnail = document.createElement('img'); thumbnail.src = design.thumbnail; thumbnail.alt = design.name; thumbnail.className = 'gallery-thumbnail';
                const nameDiv = document.createElement('div'); nameDiv.className = 'gallery-item-name';
                const nameSpan = document.createElement('span'); nameSpan.className = 'gallery-item-name-span'; nameSpan.textContent = design.name;
                const nameInput = document.createElement('input'); nameInput.type = 'text'; nameInput.className = 'gallery-item-name-input'; nameInput.style.display = 'none'; nameInput.onkeydown = (e) => { if (e.key === 'Enter') this.toggleRename(item, index); };
                nameDiv.append(nameSpan, nameInput);
                const actionsDiv = document.createElement('div'); actionsDiv.className = 'gallery-item-actions';
                const createButton = (text, iconClass, clickHandler, isDanger = false) => {
                    const button = document.createElement('button'); const icon = document.createElement('i'); icon.className = iconClass; icon.setAttribute('aria-hidden', 'true');
                    if (text) { button.append(icon, ` ${text}`); } else { button.appendChild(icon); }
                    button.onclick = clickHandler; if (isDanger) button.classList.add('danger'); return button;
                };
                const loadBtn = createButton('تحميل', 'fas fa-edit', () => this.loadDesignToEditor(index));
                const renameBtn = createButton('', 'fas fa-pencil-alt', () => this.toggleRename(item, index)); renameBtn.classList.add('gallery-rename-btn');
                const deleteBtn = createButton('', 'fas fa-trash', () => this.deleteDesign(index), true);
                actionsDiv.append(loadBtn, renameBtn, deleteBtn);
                item.append(checkbox, thumbnail, nameDiv, actionsDiv);
                grid.appendChild(item);
            });
            this.updateSelectionState();
        },
        updateSelectionState() { const selectedCount = DOMElements.galleryModal.grid.querySelectorAll('.gallery-item-select:checked').length; DOMElements.galleryModal.downloadZipBtn.disabled = selectedCount === 0; },
        async downloadSelectedAsZip() {
            const selectedIndices = [...DOMElements.galleryModal.grid.querySelectorAll('.gallery-item-select:checked')].map(cb => parseInt(cb.dataset.index, 10));
            if (selectedIndices.length === 0) return;
            UIManager.setButtonLoadingState(DOMElements.galleryModal.downloadZipBtn, true, 'جاري التجهيز...');
            const originalState = StateManager.getStateObject(); const zip = new JSZip();
            try {
                for (const index of selectedIndices) {
                    const design = this.designs[index]; StateManager.applyState(design.state); await new Promise(resolve => setTimeout(resolve, 50));
                    const frontCanvas = await ExportManager.captureElement(DOMElements.cardFront); const backCanvas = await ExportManager.captureElement(DOMElements.cardBack);
                    const frontBlob = await new Promise(resolve => frontCanvas.toBlob(resolve, 'image/png')); const backBlob = await new Promise(resolve => backCanvas.toBlob(resolve, 'image/png'));
                    zip.file(`${design.name}_Front.png`, frontBlob); zip.file(`${design.name}_Back.png`, backBlob);
                }
                zip.generateAsync({ type: "blob" }).then(content => { const link = document.createElement('a'); link.href = URL.createObjectURL(content); link.download = "Business_Cards_Export.zip"; link.click(); URL.revokeObjectURL(link.href); });
            } catch(e) { console.error("ZIP export failed:", e); UIManager.announce("حدث خطأ أثناء تصدير الملف المضغوط."); }
            finally { StateManager.applyState(originalState); UIManager.setButtonLoadingState(DOMElements.galleryModal.downloadZipBtn, false); }
        }
    };
    
    const ShareManager = {
        async saveDesign() {
            const state = StateManager.getStateObject();
            try {
                const response = await fetch(`${Config.API_BASE_URL}/api/save-design`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(state),
                });
                if (!response.ok) throw new Error('Server responded with an error');
                
                const result = await response.json();
                if (result.success && result.id) {
                    return result.id;
                } else {
                    throw new Error('Invalid response from server');
                }
            } catch (error) {
                console.error("Failed to save design:", error);
                UIManager.announce('فشل حفظ التصميم. حاول مرة أخرى.');
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

            const viewerUrl = new URL('viewer.html', window.location.href);
            viewerUrl.searchParams.set('id', designId);
            
            this.performShare(viewerUrl.href, 'بطاقة عملي الرقمية', 'ألق نظرة على تصميم بطاقتي الجديدة!');
        },

        async shareEditor() {
            UIManager.setButtonLoadingState(DOMElements.buttons.shareEditor, true);
            const designId = await this.saveDesign();
            UIManager.setButtonLoadingState(DOMElements.buttons.shareEditor, false);
            if (!designId) return;
            
            const editorUrl = new URL(window.location.href);
            editorUrl.searchParams.delete('id');
            editorUrl.searchParams.set('id', designId);

            this.performShare(editorUrl.href, 'تعديل بطاقة العمل', 'استخدم هذا الرابط لتعديل تصميم بطاقة العمل.');
        },

        showFallback(url, text) {
            DOMElements.shareModal.email.href = `mailto:?subject=My Business Card&body=${encodeURIComponent(text + '\n' + url)}`;
            DOMElements.shareModal.whatsapp.href = `https://api.whatsapp.com/send?text=${encodeURIComponent(text + '\n' + url)}`;
            DOMElements.shareModal.twitter.href = `https://twitter.com/intent/tweet?url=${encodeURIComponent(url)}&text=${encodeURIComponent(text)}`;
            DOMElements.shareModal.copyLink.onclick = () => { Utils.copyTextToClipboard(url).then(success => { if (success) UIManager.announce('تم نسخ الرابط!'); }); };
            UIManager.showModal(DOMElements.shareModal.overlay);
        },

        async loadFromUrl() {
            const params = new URLSearchParams(window.location.search);
            const designId = params.get('id');

            if (designId) {
                try {
                    const response = await fetch(`${Config.API_BASE_URL}/api/get-design/${designId}`);
                    if (!response.ok) throw new Error('Design not found or server error');
                    
                    const state = await response.json();
                    StateManager.applyState(state, false);
                    UIManager.announce("تم تحميل التصميم من الرابط بنجاح.");
                    
                    const newUrl = new URL(window.location.href);
                    newUrl.searchParams.delete('id');
                    window.history.replaceState({}, document.title, newUrl.pathname + newUrl.search);
                    return true;
                } catch (e) {
                    console.error("Failed to load state from URL:", e);
                    UIManager.announce("فشل تحميل التصميم من الرابط.");
                    window.history.replaceState({}, document.title, window.location.pathname);
                    return false;
                }
            }
            return false;
        }
    };
    
    const EventManager = {
        makeListSortable(container, onSortCallback) {
            let draggedItem = null;
            container.addEventListener('dragstart', e => { draggedItem = e.target; setTimeout(() => e.target.classList.add('dragging'), 0); });
            container.addEventListener('dragend', e => { e.target.classList.remove('dragging'); });
            container.addEventListener('dragover', e => { e.preventDefault(); const afterElement = [...container.children].reduce((closest, child) => { const box = child.getBoundingClientRect(); const offset = e.clientY - box.top - box.height / 2; if (offset < 0 && offset > closest.offset) { return { offset: offset, element: child }; } else { return closest; } }, { offset: Number.NEGATIVE_INFINITY }).element; if (afterElement == null) { container.appendChild(draggedItem); } else { container.insertBefore(draggedItem, afterElement); } });
            container.addEventListener('drop', () => { if (onSortCallback) onSortCallback(); StateManager.saveDebounced(); });
        },
        bindEvents() {
            document.querySelectorAll('input, select, textarea').forEach(input => { 
                const eventType = (input.type === 'range' || input.type === 'color' || input.type === 'checkbox') ? 'change' : 'input';
                input.addEventListener(eventType, () => { 
                    if (document.activeElement === input || input.type === 'checkbox' || input.tagName === 'SELECT') {
                        StateManager.saveDebounced();
                    }
                }); 
                input.addEventListener('input', () => {
                    CardManager.updateElementFromInput(input);
                    if (input.id.includes('phone-btn')) CardManager.updatePhoneButtonStyles();
                    if (input.id.startsWith('back-buttons') || input.id.startsWith('input-')) CardManager.updateBackCard();
                    if (input.id.startsWith('front-bg-') || input.id.startsWith('back-bg-')) CardManager.updateCardBackgrounds();
                    if (input.id === 'qr-size') CardManager.updateBackCard();
                });
                input.addEventListener('focus', () => UIManager.highlightElement(input.dataset.updateTarget, true)); 
                input.addEventListener('blur', () => UIManager.highlightElement(input.dataset.updateTarget, false)); 
            });
            
            DOMElements.qrSourceRadios.forEach(radio => {
                radio.addEventListener('change', () => {
                    const selectedValue = radio.value;
                    DOMElements.qrUrlGroup.style.display = selectedValue === 'custom' ? 'block' : 'none';
                    DOMElements.qrUploadGroup.style.display = selectedValue === 'upload' ? 'block' : 'none';
                    CardManager.updateBackCard();
                    StateManager.saveDebounced();
                });
            });

            DOMElements.fileInputs.logo.addEventListener('change', e => UIManager.handleImageUpload(e, { maxSizeMB: Config.MAX_LOGO_SIZE_MB, errorEl: DOMElements.errors.logoUpload, previewEl: DOMElements.previews.logo, spinnerEl: DOMElements.spinners.logo, onSuccess: imageUrl => { document.getElementById('card-logo').src = imageUrl; document.getElementById('input-logo').value = ''; UIManager.updateFavicon(imageUrl); StateManager.saveDebounced(); } }));
            DOMElements.fileInputs.frontBg.addEventListener('change', e => UIManager.handleImageUpload(e, { maxSizeMB: Config.MAX_BG_SIZE_MB, errorEl: DOMElements.errors.logoUpload, spinnerEl: DOMElements.spinners.frontBg, onSuccess: url => { CardManager.frontBgImageUrl = url; DOMElements.buttons.removeFrontBg.style.display = 'block'; CardManager.updateCardBackgrounds(); StateManager.saveDebounced(); }}));
            DOMElements.fileInputs.backBg.addEventListener('change', e => UIManager.handleImageUpload(e, { maxSizeMB: Config.MAX_BG_SIZE_MB, errorEl: DOMElements.errors.logoUpload, spinnerEl: DOMElements.spinners.backBg, onSuccess: url => { CardManager.backBgImageUrl = url; DOMElements.buttons.removeBackBg.style.display = 'block'; CardManager.updateCardBackgrounds(); StateManager.saveDebounced(); }}));
            DOMElements.fileInputs.qrCode.addEventListener('change', e => UIManager.handleImageUpload(e, { maxSizeMB: Config.MAX_LOGO_SIZE_MB, errorEl: DOMElements.errors.qrUpload, spinnerEl: DOMElements.spinners.qr, onSuccess: imageUrl => { CardManager.qrCodeImageUrl = imageUrl; DOMElements.qrImageUrlInput.value = ''; CardManager.updateBackCard(); StateManager.saveDebounced(); }}));

            DOMElements.themeGallery.addEventListener('click', (e) => {
                const thumbnail = e.target.closest('.theme-thumbnail');
                if (thumbnail) {
                    const themeKey = thumbnail.dataset.themeKey;
                    CardManager.applyTheme(themeKey);
                }
            });

            DOMElements.buttons.addPhone.addEventListener('click', () => { CardManager.createPhoneInput(); });
            DOMElements.buttons.addSocial.addEventListener('click', () => CardManager.addSocialLink());
            DOMElements.buttons.reset.addEventListener('click', () => StateManager.reset());
            DOMElements.layoutSelect.addEventListener('change', e => CardManager.applyLayout(e.target.value));
            DOMElements.buttons.directionToggle.addEventListener('click', UIManager.toggleDirection);
            DOMElements.buttons.shareCard.addEventListener('click', () => ShareManager.shareCard());
            DOMElements.buttons.shareEditor.addEventListener('click', () => ShareManager.shareEditor());

            document.getElementById('card-logo').addEventListener('click', (e) => { e.preventDefault(); e.stopPropagation(); UIManager.navigateToAndHighlight('logo-drop-zone'); });
            document.getElementById('identity-front').addEventListener('click', (e) => { e.preventDefault(); e.stopPropagation(); UIManager.navigateToAndHighlight('input-name'); });
            
            const flipCard = () => { DOMElements.cardsWrapper.classList.toggle('is-flipped'); }
            DOMElements.buttons.mobileFlip.addEventListener('click', (e) => { e.stopPropagation(); flipCard(); });
            DOMElements.buttons.togglePhone.addEventListener('input', () => { CardManager.updatePhoneButtonsVisibility(); });

            const phoneTextControlsList = [...DOMElements.phoneTextControls.layoutRadios, DOMElements.phoneTextControls.size, DOMElements.phoneTextControls.color, DOMElements.phoneTextControls.font];
            phoneTextControlsList.forEach(control => {
                control.addEventListener('input', () => { CardManager.updatePhoneTextStyles(); });
            });
            
            DOMElements.buttons.removeFrontBg.addEventListener('click', () => { CardManager.frontBgImageUrl = null; DOMElements.fileInputs.frontBg.value = ''; DOMElements.frontBgOpacity.value = 1; DOMElements.frontBgOpacity.dispatchEvent(new Event('input')); DOMElements.buttons.removeFrontBg.style.display = 'none'; CardManager.updateCardBackgrounds(); StateManager.saveDebounced(); });
            DOMElements.buttons.removeBackBg.addEventListener('click', () => { CardManager.backBgImageUrl = null; DOMElements.fileInputs.backBg.value = ''; DOMElements.backBgOpacity.value = 1; DOMElements.backBgOpacity.dispatchEvent(new Event('input')); DOMElements.buttons.removeBackBg.style.display = 'none'; CardManager.updateCardBackgrounds(); StateManager.saveDebounced(); });
            
            DOMElements.buttons.downloadPngFront.addEventListener('click', (e) => { ExportManager.pendingExportTarget = 'front'; UIManager.showModal(DOMElements.exportModal.overlay, e.currentTarget); });
            DOMElements.buttons.downloadPngBack.addEventListener('click', (e) => { ExportManager.pendingExportTarget = 'back'; UIManager.showModal(DOMElements.exportModal.overlay, e.currentTarget); });
            DOMElements.buttons.downloadPdf.addEventListener('click', e => ExportManager.downloadPdf(e.currentTarget));
            DOMElements.buttons.downloadVcf.addEventListener('click', () => ExportManager.downloadVcf());
            DOMElements.buttons.downloadQrCode.addEventListener('click', () => ExportManager.downloadQrCode());
            
            DOMElements.buttons.backToTop.addEventListener('click', () => { window.scrollTo({ top: 0, behavior: 'smooth' }); });
            const handleScroll = () => { window.scrollY > 300 ? DOMElements.buttons.backToTop.classList.add('visible') : DOMElements.buttons.backToTop.classList.remove('visible'); };
            window.addEventListener('scroll', Utils.debounce(handleScroll, 100));
            DOMElements.exportModal.overlay.addEventListener('click', (e) => { if (e.target === DOMElements.exportModal.overlay) UIManager.hideModal(DOMElements.exportModal.overlay); });
            DOMElements.exportModal.closeBtn.addEventListener('click', () => UIManager.hideModal(DOMElements.exportModal.overlay));
            DOMElements.exportModal.confirmBtn.addEventListener('click', () => { const options = { format: DOMElements.exportModal.format.value, quality: DOMElements.exportModal.quality.value / 100, scale: parseFloat(DOMElements.exportModal.scaleContainer.querySelector('.selected').dataset.scale) }; ExportManager.downloadElement(options); });
            DOMElements.exportModal.format.addEventListener('input', () => { DOMElements.exportModal.qualityGroup.style.display = DOMElements.exportModal.format.value === 'jpeg' ? 'block' : 'none'; });
            DOMElements.exportModal.quality.addEventListener('input', () => { DOMElements.exportModal.qualityValue.textContent = DOMElements.exportModal.quality.value; });
            DOMElements.exportModal.scaleContainer.addEventListener('click', e => { if (e.target.classList.contains('scale-btn')) { DOMElements.exportModal.scaleContainer.querySelector('.selected').classList.remove('selected'); e.target.classList.add('selected'); } });
            
            DOMElements.buttons.saveToGallery.addEventListener('click', () => GalleryManager.addCurrentDesign());
            DOMElements.buttons.showGallery.addEventListener('click', (e) => { GalleryManager.render(); UIManager.showModal(DOMElements.galleryModal.overlay, e.currentTarget); });
            
            DOMElements.galleryModal.closeBtn.addEventListener('click', () => UIManager.hideModal(DOMElements.galleryModal.overlay));
            DOMElements.galleryModal.selectAllBtn.addEventListener('click', () => DOMElements.galleryModal.grid.querySelectorAll('.gallery-item-select').forEach(cb => { cb.checked = true; cb.closest('.gallery-item').classList.add('selected'); GalleryManager.updateSelectionState(); }));
            DOMElements.galleryModal.deselectAllBtn.addEventListener('click', () => DOMElements.galleryModal.grid.querySelectorAll('.gallery-item-select').forEach(cb => { cb.checked = false; cb.closest('.gallery-item').classList.remove('selected'); GalleryManager.updateSelectionState(); }));
            DOMElements.galleryModal.downloadZipBtn.addEventListener('click', () => GalleryManager.downloadSelectedAsZip());
            DOMElements.galleryModal.grid.addEventListener('change', e => { if (e.target.classList.contains('gallery-item-select')) { e.target.closest('.gallery-item').classList.toggle('selected', e.target.checked); GalleryManager.updateSelectionState(); }});
            DOMElements.shareModal.closeBtn.addEventListener('click', () => UIManager.hideModal(DOMElements.shareModal.overlay));
            DOMElements.shareModal.overlay.addEventListener('click', e => { if(e.target === DOMElements.shareModal.overlay) UIManager.hideModal(DOMElements.shareModal.overlay); });

            DOMElements.buttons.helpBtn.addEventListener('click', (e) => UIManager.showModal(DOMElements.helpModal.overlay, e.currentTarget));
            DOMElements.helpModal.closeBtn.addEventListener('click', () => UIManager.hideModal(DOMElements.helpModal.overlay));
            DOMElements.helpModal.overlay.addEventListener('click', e => { if(e.target === DOMElements.helpModal.overlay) UIManager.hideModal(DOMElements.helpModal.overlay); });
        
            DOMElements.buttons.undoBtn.addEventListener('click', () => HistoryManager.undo());
            DOMElements.buttons.redoBtn.addEventListener('click', () => HistoryManager.redo());
        }
    };
    const App = {
        initResponsiveLayout() {
            const isMobile = window.innerWidth <= 1200;
            const sourceContainer = document.getElementById('ui-elements-source');
            const mobileControlsContainer = document.querySelector('.controls-column');
            const desktopControlsContainer = document.querySelector('.actions-column .desktop-controls-wrapper .tabs-content');
            const desktopActionsContainer = document.querySelector('.controls-column');

            if (isMobile) {
                if (!mobileControlsContainer.querySelector('.mobile-tabs-nav')) {
                    const mobileNav = document.createElement('div');
                    mobileNav.className = 'mobile-tabs-nav';
                    mobileNav.innerHTML = `<button class="mobile-tab-btn active" data-tab-target="tab-front">الواجهة الأمامية</button><button class="mobile-tab-btn" data-tab-target="tab-back">الواجهة الخلفية</button><button class="mobile-tab-btn" data-tab-target="tab-actions">التصاميم والحفظ</button>`;
                    const mobileTabsContent = document.createElement('div');
                    mobileTabsContent.className = 'tabs-content';
                    mobileTabsContent.innerHTML = `<div id="tab-front" class="tab-pane active"></div><div id="tab-back" class="tab-pane"></div><div id="tab-actions" class="tab-pane"></div>`;
                    mobileControlsContainer.innerHTML = '';
                    mobileControlsContainer.appendChild(mobileNav);
                    mobileControlsContainer.appendChild(mobileTabsContent);
                }
                document.querySelectorAll('#ui-elements-source [data-tab-destination]').forEach(group => {
                    const destinationId = group.dataset.tabDestination;
                    const destinationPane = document.getElementById(destinationId);
                    if (destinationPane) Array.from(group.children).forEach(child => destinationPane.appendChild(child));
                });
            } else {
                mobileControlsContainer.innerHTML = '';
                const frontControls = sourceContainer.querySelector('[data-tab-destination="tab-front"]');
                const backControls = sourceContainer.querySelector('[data-tab-destination="tab-back"]');
                const desktopFrontPane = document.createElement('div');
                desktopFrontPane.id = 'tab-front';
                desktopFrontPane.className = 'tab-pane active';
                const desktopBackPane = document.createElement('div');
                desktopBackPane.id = 'tab-back';
                desktopBackPane.className = 'tab-pane';
                if (frontControls) Array.from(frontControls.children).forEach(child => desktopFrontPane.appendChild(child));
                if (backControls) Array.from(backControls.children).forEach(child => desktopBackPane.appendChild(child));
                desktopControlsContainer.innerHTML = '';
                desktopControlsContainer.appendChild(desktopFrontPane);
                desktopControlsContainer.appendChild(desktopBackPane);
                const actionsControls = sourceContainer.querySelector('[data-tab-destination="tab-actions"]');
                if(actionsControls) Array.from(actionsControls.children).forEach(child => desktopActionsContainer.appendChild(child));
            }
        },
        async init() {
            Object.assign(DOMElements, {
                cardFront: document.getElementById('card-front-preview'), cardBack: document.getElementById('card-back-preview'), cardBackContent: document.getElementById('card-back-content'), phoneNumbersContainer: document.getElementById('phone-numbers-container'), phoneButtonsWrapper: document.getElementById('phone-buttons-wrapper'), 
                cardsWrapper: document.getElementById('cards-wrapper'), 
                themeGallery: document.getElementById('theme-gallery'),
                layoutSelect: document.getElementById('layout-select'), liveAnnouncer: document.getElementById('live-announcer'), saveToast: document.getElementById('save-toast'),
                nameInput: document.getElementById('input-name'), taglineInput: document.getElementById('input-tagline'), emailInput: document.getElementById('input-email'), websiteInput: document.getElementById('input-website'), 
                qrImageUrlInput: document.getElementById('input-qr-url'), qrCodeContainer: document.getElementById('qrcode-container'), qrSourceRadios: document.querySelectorAll('input[name="qr-source"]'), qrUrlGroup: document.getElementById('qr-url-group'), qrUploadGroup: document.getElementById('qr-upload-group'), qrSizeSlider: document.getElementById('qr-size'),
                phoneBtnBgColor: document.getElementById('phone-btn-bg-color'), phoneBtnTextColor: document.getElementById('phone-btn-text-color'), phoneBtnFontSize: document.getElementById('phone-btn-font-size'), phoneBtnFont: document.getElementById('phone-btn-font'), backButtonsBgColor: document.getElementById('back-buttons-bg-color'), backButtonsTextColor: document.getElementById('back-buttons-text-color'), backButtonsFont: document.getElementById('back-buttons-font'),
                frontBgOpacity: document.getElementById('front-bg-opacity'), backBgOpacity: document.getElementById('back-bg-opacity'), phoneBtnPadding: document.getElementById('phone-btn-padding'), backButtonsSize: document.getElementById('back-buttons-size'),
                nameColor: document.getElementById('name-color'), nameFontSize: document.getElementById('name-font-size'), nameFont: document.getElementById('name-font'),
                taglineColor: document.getElementById('tagline-color'), taglineFontSize: document.getElementById('tagline-font-size'), taglineFont: document.getElementById('tagline-font'),
                social: { input: document.getElementById('social-media-input'), container: document.getElementById('dynamic-social-links-container') },
                fileInputs: { logo: document.getElementById('input-logo-upload'), frontBg: document.getElementById('front-bg-upload'), backBg: document.getElementById('back-bg-upload'), qrCode: document.getElementById('input-qr-upload') },
                previews: { logo: document.getElementById('logo-preview') }, errors: { logoUpload: document.getElementById('logo-upload-error'), qrUpload: document.getElementById('qr-upload-error') },
                spinners: { logo: document.getElementById('logo-spinner'), frontBg: document.getElementById('front-bg-spinner'), backBg: document.getElementById('back-bg-spinner'), qr: document.getElementById('qr-spinner') },
                sounds: { success: document.getElementById('audio-success'), error: document.getElementById('audio-error') },
                phoneTextControls: { container: document.getElementById('phone-text-controls'), layoutRadios: document.querySelectorAll('input[name="phone-text-layout"]'), size: document.getElementById('phone-text-size'), color: document.getElementById('phone-text-color'), font: document.getElementById('phone-text-font'), },
                exportLoadingOverlay: document.getElementById('export-loading-overlay'),
                exportModal: { overlay: document.getElementById('export-modal-overlay'), closeBtn: document.getElementById('export-modal-close'), confirmBtn: document.getElementById('confirm-export-btn'), format: document.getElementById('export-format'), qualityGroup: document.getElementById('export-quality-group'), quality: document.getElementById('export-quality'), qualityValue: document.getElementById('export-quality-value'), scaleContainer: document.querySelector('.scale-buttons') },
                galleryModal: { overlay: document.getElementById('gallery-modal-overlay'), closeBtn: document.getElementById('gallery-modal-close'), grid: document.getElementById('gallery-grid'), selectAllBtn: document.getElementById('gallery-select-all'), deselectAllBtn: document.getElementById('gallery-deselect-all'), downloadZipBtn: document.getElementById('gallery-download-zip') },
                shareModal: { overlay: document.getElementById('share-fallback-modal-overlay'), closeBtn: document.getElementById('share-fallback-modal-close'), email: document.getElementById('share-email'), whatsapp: document.getElementById('share-whatsapp'), twitter: document.getElementById('share-twitter'), copyLink: document.getElementById('share-copy-link') },
                helpModal: { overlay: document.getElementById('help-modal-overlay'), closeBtn: document.getElementById('help-modal-close') },
                chatbot: { window: document.getElementById('chatbot-window'), toggleBtn: document.getElementById('chatbot-toggle-btn'), closeBtn: document.getElementById('chatbot-close-btn'), messages: document.getElementById('chatbot-messages'), options: document.getElementById('chatbot-options') },
                buttons: { 
                    addPhone: document.getElementById('add-phone-btn'), addSocial: document.getElementById('add-social-btn'), 
                    directionToggle: document.getElementById('direction-toggle-btn'), 
                    removeFrontBg: document.getElementById('remove-front-bg-btn'), removeBackBg: document.getElementById('remove-back-bg-btn'),
                    backToTop: document.getElementById('back-to-top-btn'), mobileFlip: document.getElementById('mobile-flip-btn'), togglePhone: document.getElementById('toggle-phone-buttons'),
                    helpBtn: document.getElementById('help-btn'),
                    saveToGallery: document.getElementById('save-to-gallery-btn'),
                    showGallery: document.getElementById('show-gallery-btn'),
                    shareCard: document.getElementById('share-card-btn'),
                    shareEditor: document.getElementById('share-editor-btn'),
                    downloadPngFront: document.getElementById('download-png-front'),
                    downloadPngBack: document.getElementById('download-png-back'),
                    downloadPdf: document.getElementById('download-pdf'),
                    downloadVcf: document.getElementById('download-vcf'),
                    downloadQrCode: document.getElementById('download-qrcode'),
                    reset: document.getElementById('reset-design-btn'),
                    undoBtn: document.getElementById('undo-btn'),
                    redoBtn: document.getElementById('redo-btn')
                }
            });
            
            this.initResponsiveLayout();
            window.addEventListener('resize', Utils.debounce(() => this.initResponsiveLayout(), 150));
            
            UIManager.init();
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
            
            const initialQrSource = document.querySelector('input[name="qr-source"]:checked')?.value || 'custom';
            DOMElements.qrUrlGroup.style.display = initialQrSource === 'custom' ? 'block' : 'none';
            DOMElements.qrUploadGroup.style.display = initialQrSource === 'upload' ? 'block' : 'none';
            
            CardManager.updatePhoneButtonsVisibility();
            CardManager.updatePhoneTextStyles();
            DragManager.init();
            
            TooltipManager.init();
            TourManager.init();
            ChatbotManager.init();
            
            TabManager.init('.mobile-tabs-nav', '.mobile-tab-btn');
            TabManager.init('.desktop-tabs-nav', '.desktop-tab-btn');

            UIManager.announce("محرر بطاقة الأعمال جاهز للاستخدام.");
            
            if (!localStorage.getItem(Config.DND_HINT_SHOWN_KEY)) {
                UIManager.showDragAndDropHints();
                localStorage.setItem(Config.DND_HINT_SHOWN_KEY, 'true');
            }
        }
    };
    document.addEventListener('DOMContentLoaded', () => App.init());
})();