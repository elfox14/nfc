<<<<<<< Updated upstream
(function() {
    'use strict';
    const Config = {
        LOCAL_STORAGE_KEY: 'digitalCardEditorState_v15',
        GALLERY_STORAGE_KEY: 'digitalCardGallery_v1',
        MAX_LOGO_SIZE_MB: 2, MAX_BG_SIZE_MB: 5, RESIZED_IMAGE_MAX_DIMENSION: 1280,
        THEMES: {
            'deep-sea': { name: 'بحر عميق', gradient: ['#2a3d54', '#223246'], values: { textPrimary: '#e6f0f7', taglineColor: '#4da6ff', backButtonBg: '#364f6b', backButtonText: '#aab8c2', phoneBtnBg: '#4da6ff', phoneBtnText: '#ffffff'}},
            'modern-light': { name: 'أبيض حديث', gradient: ['#e9e99', '#ffffff'], values: { textPrimary: '#121212', taglineColor: '#007BFF', backButtonBg: '#f0f2f5', backButtonText: '#343a40', phoneBtnBg: 'transparent', phoneBtnText: '#007BFF'}},
            'forest-whisper': { name: 'همس الغابة', gradient: ['#234d20', '#364935'], values: { textPrimary: '#f0f3f0', taglineColor: '#77ab59', backButtonBg: '#4a785f', backButtonText: '#f0f3f0', phoneBtnBg: '#77ab59', phoneBtnText: '#f0f3f0'}},
            'sunset-gradient': { name: 'غروب الشمس', gradient: ['#ff8c42', '#c44d56'], values: { textPrimary: '#ffffff', taglineColor: '#ffcc80', backButtonBg: '#8c4356', backButtonText: '#ffffff', phoneBtnBg: 'rgba(255,255,255,0.2)', phoneBtnText: '#ffffff'}},
            'corporate-elegance': { name: 'أناقة الشركات', gradient: ['#f8f9fa', '#e9ecef'], values: { textPrimary: '#212529', taglineColor: '#0056b3', backButtonBg: '#343a40', backButtonText: '#ffffff', phoneBtnBg: '#0056b3', phoneBtnText: '#ffffff'}},
            'nature-warmth': { name: 'دفء الطبيعة', gradient: ['#f5f5dc', '#f0e68c'], values: { textPrimary: '#556b2f', taglineColor: '#8b4513', backButtonBg: '#8fbc8f', backButtonText: '#2f4f4f', phoneBtnBg: '#8b4513', phoneBtnText: '#ffffff'}},
            'night-neon': { name: 'النيون الليلي', gradient: ['#0d0d0d', '#1a1a1a'], values: { textPrimary: '#f0f0f0', taglineColor: '#39ff14', backButtonBg: '#222222', backButtonText: '#00ffdd', phoneBtnBg: 'transparent', phoneBtnText: '#39ff14'}},
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
            if (audioEl) {
                audioEl.currentTime = 0;
                audioEl.play().catch(e => console.error("Audio play failed:", e));
            }
        },
        async copyTextToClipboard(text) { try { if (navigator.clipboard && window.isSecureContext) { await navigator.clipboard.writeText(text); } else { const textArea = document.createElement('textarea'); textArea.value = text; textArea.style.position = 'absolute'; textArea.style.left = '-999999px'; document.body.prepend(textArea); textArea.select(); document.execCommand('copy'); textArea.remove(); } return true; } catch (error) { console.error('فشل النسخ إلى الحافظة:', error); return false; } }
    };
    const UIManager = {
        init() { this.populateThemes(); this.populateSocialMediaOptions(); },
        announce: (message) => { if(DOMElements.liveAnnouncer) DOMElements.liveAnnouncer.textContent = message; },
        populateThemes() { const select = DOMElements.themeSelect; if (!select) return; select.innerHTML = '<option value="">-- اختر تصميم --</option>'; select.innerHTML += Object.entries(Config.THEMES).map(([key, theme]) => `<option value="${key}">${theme.name}</option>`).join(''); },
        populateSocialMediaOptions() { const select = DOMElements.social.type; if (!select) return; select.innerHTML = Object.entries(Config.SOCIAL_PLATFORMS).map(([key, platform]) => `<option value="${key}">${platform.name}</option>`).join(''); },
        
        handleImageUpload(event, { maxSizeMB, errorEl, previewEl, spinnerEl, onSuccess }) {
            const file = event.target.files[0];
            errorEl.textContent = ''; errorEl.style.display = 'none';
            if (!file) return;

            if (!file.type.startsWith('image/')) {
                errorEl.textContent = 'الرجاء اختيار ملف صورة صالح.';
                errorEl.style.display = 'block';
                Utils.playSound('error');
                return;
            }
            if (file.size > maxSizeMB * 1024 * 1024) {
                errorEl.textContent = `يجب أن يكون حجم الملف أقل من ${maxSizeMB} ميجابايت.`;
                errorEl.style.display = 'block';
                Utils.playSound('error');
                return;
            }

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
            const toast = DOMElements.saveToast;
            if (!toast) return;
            toast.textContent = 'جاري الحفظ...';
            toast.classList.add('show');
            
            StateManager.save();
            
            setTimeout(() => {
                toast.textContent = 'تم الحفظ ✓';
                UIManager.announce("تم حفظ التغييرات تلقائيًا");
                setTimeout(() => {
                    toast.classList.remove('show');
                }, 1500);
            }, 500);
        },
        updateFavicon(url) { if(url) document.getElementById('favicon').href = url; },
        highlightElement(targetId, state) { const el = document.getElementById(targetId); if(el) el.classList.toggle('highlighted', state); },
        
        showFormColumn(columnIdToShow) {
            if (!DOMElements.formWrapper) return;
            DOMElements.formWrapper.querySelectorAll('.form-container').forEach(col => {
                col.classList.remove('is-active');
            });
            const columnToShow = document.getElementById(columnIdToShow);
            if (columnToShow) {
                columnToShow.classList.add('is-active');
            }
        },

        navigateToAndHighlight(elementId) {
            const targetElement = document.getElementById(elementId);
            if (!targetElement) {
                console.warn(`MapsToAndHighlight: Element with ID "${elementId}" not found.`);
                return;
            }

            const parentColumn = targetElement.closest('.form-container');
            if (parentColumn) {
                this.showFormColumn(parentColumn.id);
            }
    
            setTimeout(() => {
                const highlightTarget = targetElement.closest('.fieldset') || targetElement.closest('.form-group') || targetElement;
                highlightTarget.scrollIntoView({ behavior: 'smooth', block: 'center' });
                highlightTarget.classList.add('form-element-highlighted');
                setTimeout(() => {
                    highlightTarget.classList.remove('form-element-highlighted');
                }, 2000);
            }, 100);
        },
        
        trapFocus(modalElement) {
            const focusableElements = modalElement.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
            const firstElement = focusableElements[0];
            const lastElement = focusableElements[focusableElements.length - 1];

            const handleTabKeyPress = (e) => {
                if (e.key !== 'Tab') return;
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
            if (triggerElementId) {
                document.getElementById(triggerElementId)?.focus();
            }
            const eventListener = modalOverlay.dataset.focusTrapListener;
            if (eventListener) {
                modalOverlay.removeEventListener('keydown', eventListener);
            }
        },

        toggleDirection() {
            const html = document.documentElement;
            const btn = DOMElements.buttons.directionToggle;
            const span = btn.querySelector('span');
            if (html.dir === 'rtl') {
                html.dir = 'ltr';
                html.classList.add('ltr');
                span.textContent = 'AR';
            } else {
                html.dir = 'rtl';
                html.classList.remove('ltr');
                span.textContent = 'EN';
            }
        },

        setupDragDrop(dropZoneId, fileInputId) { const dropZone = document.getElementById(dropZoneId); const fileInput = document.getElementById(fileInputId); if (!dropZone || !fileInput) return; ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => { dropZone.addEventListener(eventName, e => { e.preventDefault(); e.stopPropagation(); }); }); ['dragenter', 'dragover'].forEach(eventName => { dropZone.addEventListener(eventName, () => dropZone.classList.add('drag-over')); }); ['dragleave', 'drop'].forEach(eventName => { dropZone.addEventListener(eventName, () => dropZone.classList.remove('drag-over')); }); dropZone.addEventListener('drop', e => { if (e.dataTransfer.files.length) { fileInput.files = e.dataTransfer.files; fileInput.dispatchEvent(new Event('change', { bubbles: true })); } }); },
        setButtonLoadingState(button, isLoading, text = 'جاري التحميل...') { if (!button) return; const span = button.querySelector('span'); const originalText = button.dataset.originalText || (span ? span.textContent : ''); if(!button.dataset.originalText && span) button.dataset.originalText = originalText; if (isLoading) { button.disabled = true; button.classList.add('loading'); if(span) span.textContent = text; } else { button.disabled = false; button.classList.remove('loading'); if(span) span.textContent = originalText; }},
    };
    const CardManager = {
        frontBgImageUrl: null, backBgImageUrl: null,
        updateElementFromInput(input) { const { updateTarget, updateProperty, updateUnit = '' } = input.dataset; if (!updateTarget || !updateProperty) return; const targetElement = document.getElementById(updateTarget); if (!targetElement) return; const properties = updateProperty.split('.'); let current = targetElement; for (let i = 0; i < properties.length - 1; i++) { current = current[properties[i]]; } current[properties[properties.length - 1]] = input.value + updateUnit; },
        updatePhoneButtonStyles() { const bgColor = DOMElements.phoneBtnBgColor.value; const textColor = DOMElements.phoneBtnTextColor.value; const fontSize = DOMElements.phoneBtnFontSize.value; const fontFamily = DOMElements.phoneBtnFont.value; const padding = DOMElements.phoneBtnPadding.value; DOMElements.phoneButtonsWrapper.querySelectorAll('.phone-button').forEach(button => { button.style.backgroundColor = bgColor; button.style.color = textColor; button.style.borderColor = (bgColor === 'transparent' || bgColor.includes('rgba(0,0,0,0)')) ? textColor : 'transparent'; button.style.fontSize = `${fontSize}px`; button.style.fontFamily = fontFamily; button.style.padding = `${padding}px ${padding * 2}px`; }); },
        
        renderPhoneButtons() {
            DOMElements.phoneButtonsWrapper.innerHTML = '';
            DOMElements.phoneNumbersContainer.querySelectorAll('.dynamic-input-group').forEach((group, index) => {
                if (!group.id) {
                    group.id = `phone-group-${index}`;
                }
                const input = group.querySelector('input[type="tel"]');
                if (input && input.value) {
                    const phoneLink = document.createElement('a');
                    phoneLink.href = `tel:${input.value.replace(/[^0-9+]/g, '')}`;
                    phoneLink.className = 'phone-button';
                    
                    const icon = document.createElement('i');
                    icon.className = 'fas fa-phone-alt';
                    icon.setAttribute('aria-hidden', 'true');

                    const textSpan = document.createElement('span');
                    textSpan.textContent = input.value;
                    
                    phoneLink.append(icon, textSpan);

                    const copyBtn = document.createElement('button');
                    copyBtn.className = 'copy-btn no-export';
                    copyBtn.title = 'نسخ الرقم';
                    
                    const copyIcon = document.createElement('i');
                    copyIcon.className = 'fas fa-copy';
                    copyIcon.setAttribute('aria-hidden', 'true');
                    copyBtn.appendChild(copyIcon);
                    
                    const phoneNumber = input.value;
                    copyBtn.onclick = (e) => {
                        e.preventDefault(); e.stopPropagation();
                        Utils.copyTextToClipboard(phoneNumber).then(success => {
                            if (success) UIManager.announce('تم نسخ الرقم!');
                        });
                    };
                    phoneLink.appendChild(copyBtn);
                    
                    phoneLink.dataset.targetFormId = group.id;
                    phoneLink.addEventListener('click', (e) => {
                        e.preventDefault();
                        UIManager.navigateToAndHighlight(e.currentTarget.dataset.targetFormId);
                    });

                    DOMElements.phoneButtonsWrapper.appendChild(phoneLink);
                }
            });
            this.updatePhoneButtonStyles();
        },
        createPhoneInput(value = '') { const inputGroup = document.createElement('div'); inputGroup.className = 'dynamic-input-group'; inputGroup.setAttribute('draggable', true); const newPhoneInput = document.createElement('input'); newPhoneInput.type = 'tel'; newPhoneInput.value = value; newPhoneInput.placeholder = 'رقم هاتف جديد'; const removeBtn = document.createElement('button'); removeBtn.className = 'remove-btn'; removeBtn.textContent = '×'; removeBtn.setAttribute('aria-label', 'حذف رقم الهاتف'); removeBtn.onclick = () => { inputGroup.remove(); this.renderPhoneButtons(); StateManager.saveDebounced(); HistoryManager.pushState(); }; newPhoneInput.addEventListener('input', () => { this.renderPhoneButtons(); StateManager.saveDebounced(); }); newPhoneInput.addEventListener('change', HistoryManager.pushStateDebounced); inputGroup.appendChild(newPhoneInput); inputGroup.appendChild(removeBtn); DOMElements.phoneNumbersContainer.appendChild(inputGroup); },
        updateCardBackgrounds() { const setBg = (cardEl, startId, endId, image, opacityId) => { cardEl.style.setProperty('--bg-gradient', `linear-gradient(135deg, ${document.getElementById(startId).value}, ${document.getElementById(endId).value})`); cardEl.querySelector('.card-background-layer[id$="-image-layer"]').style.backgroundImage = image ? `url(${image})` : 'none'; cardEl.querySelector('.card-background-layer[id$="-gradient-layer"]').style.opacity = document.getElementById(opacityId).value; }; setBg(DOMElements.cardFront, 'front-bg-start', 'front-bg-end', this.frontBgImageUrl, 'front-bg-opacity'); setBg(DOMElements.cardBack, 'back-bg-start', 'back-bg-end', this.backBgImageUrl, 'back-bg-opacity'); },
        
        updateBackCard() {
            const cardContent = DOMElements.cardBackContent;
            cardContent.innerHTML = '';

            const qrUrl = DOMElements.qrImageUrlInput.value;
            if (qrUrl) {
                const qrWrapper = document.createElement('div');
                qrWrapper.className = 'card-back-qr-image-wrapper';
                const qrImage = document.createElement('img');
                qrImage.src = qrUrl;
                qrImage.alt = 'QR Code';
                qrWrapper.appendChild(qrImage);
                qrWrapper.addEventListener('click', () => UIManager.navigateToAndHighlight('input-qr-url'));
                cardContent.appendChild(qrWrapper);
            }
            
            const contactsWrapper = document.createElement('div');
            contactsWrapper.className = 'contact-icons-wrapper';
            
            const renderLink = (value, platform, sourceInputId) => {
                let fullUrl = value, displayText = value;
                if (platform.prefix) { if (platform.id === 'email' || platform.id === 'whatsapp') { fullUrl = platform.prefix + value; } else { fullUrl = !/^(https?:\/\/)/i.test(value) ? platform.prefix + value : value; } } else if (!/^(https?:\/\/)/i.test(value)) { fullUrl = 'https://' + value; }
                if (platform.id !== 'email' && platform.id !== 'whatsapp') { displayText = displayText.replace(/^(https?:\/\/)?(www\.)?/, '').replace(/\/$/, ''); }

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
                    e.preventDefault(); e.stopPropagation();
                    Utils.copyTextToClipboard(fullUrl).then(success => {
                        if (success) UIManager.announce('تم نسخ الرابط!');
                    });
                };
                link.appendChild(copyBtn);
                contactsWrapper.appendChild(link);
            };

            Config.STATIC_CONTACT_METHODS.forEach(method => { const input = document.getElementById('input-' + method.id); if (input && input.value) renderLink(input.value, method, 'contact-info-fieldset'); });
            DOMElements.social.container.querySelectorAll('.dynamic-social-link').forEach(linkEl => { const platformKey = linkEl.dataset.platform; const value = linkEl.dataset.value; if(platformKey && value && Config.SOCIAL_PLATFORMS[platformKey]) { renderLink(value, Config.SOCIAL_PLATFORMS[platformKey], 'contact-info-fieldset'); } });
            
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
        applyTheme(themeName) { const theme = Config.THEMES[themeName]; if (!theme) return; const controlsToUpdate = { 'name-color': theme.values.textPrimary, 'tagline-color': theme.values.taglineColor, 'front-bg-start': theme.gradient[0], 'front-bg-end': theme.gradient[1], 'back-bg-start': theme.gradient[0], 'back-bg-end': theme.gradient[1], 'back-buttons-bg-color': theme.values.backButtonBg, 'back-buttons-text-color': theme.values.backButtonText, 'phone-btn-bg-color': theme.values.phoneBtnBg, 'phone-btn-text-color': theme.values.phoneBtnText }; for (const [id, value] of Object.entries(controlsToUpdate)) { const control = document.getElementById(id); if(control) { control.value = value; control.dispatchEvent(new Event('input', { bubbles: true })); } } this.frontBgImageUrl = null; this.backBgImageUrl = null; DOMElements.fileInputs.frontBg.value = ''; DOMElements.fileInputs.backBg.value = ''; this.updateCardBackgrounds(); UIManager.announce(`تم تطبيق تصميم ${theme.name}`); HistoryManager.pushState(); StateManager.save(); },
        
        addSocialLink() { 
            const platformKey = DOMElements.social.type.value; 
            const value = DOMElements.social.input.value.trim(); 
            if (!value) { UIManager.announce('الرجاء إدخال رابط أو معرف.'); return; } 
            
            const platform = Config.SOCIAL_PLATFORMS[platformKey]; 
            const linkEl = document.createElement('div'); 
            linkEl.className = 'dynamic-social-link'; 
            linkEl.setAttribute('draggable', true); 
            linkEl.dataset.platform = platformKey; 
            linkEl.dataset.value = value; 
            
            const icon = document.createElement('i');
            icon.className = platform.icon;
            icon.setAttribute('aria-hidden', 'true');

            const text = document.createElement('span');
            text.textContent = value;
            
            const removeBtn = document.createElement('button');
            removeBtn.className = 'remove-btn';
            removeBtn.setAttribute('aria-label', 'حذف الرابط');
            removeBtn.textContent = '×';
            removeBtn.addEventListener('click', () => { linkEl.remove(); this.updateBackCard(); StateManager.saveDebounced(); HistoryManager.pushState(); }); 

            linkEl.append(icon, text, removeBtn);
            
            DOMElements.social.container.appendChild(linkEl); 
            DOMElements.social.input.value = ''; 
            this.updateBackCard(); 
            StateManager.saveDebounced(); 
            HistoryManager.pushState(); 
        },
        applyLayout(layoutName) { DOMElements.cardsWrapper.dataset.layout = layoutName; StateManager.saveDebounced(); HistoryManager.pushState(); }
    };
    const HistoryManager = {
        undoStack: [],
        redoStack: [],
        historyLimit: 30,
        init() {
            this.pushState();
        },
        pushState() {
            this.undoStack.push(StateManager.getStateObject());
            if (this.undoStack.length > this.historyLimit) {
                this.undoStack.shift();
            }
            this.redoStack = [];
            this.updateButtonStates();
        },
        undo() {
            if (this.undoStack.length > 1) {
                this.redoStack.push(this.undoStack.pop());
                const state = this.undoStack[this.undoStack.length - 1];
                StateManager.applyState(state, false);
                UIManager.announce("تم التراجع");
            }
            this.updateButtonStates();
        },
        redo() {
            if (this.redoStack.length > 0) {
                const state = this.redoStack.pop();
                this.undoStack.push(state);
                StateManager.applyState(state, false);
                UIManager.announce("تمت الإعادة");
            }
            this.updateButtonStates();
        },
        updateButtonStates() {
            DOMElements.buttons.undo.disabled = this.undoStack.length <= 1;
            DOMElements.buttons.redo.disabled = this.redoStack.length === 0;
        },
        pushStateDebounced: Utils.debounce(() => HistoryManager.pushState(), 500)
    };
    const StateManager = {
        getStateObject() {
            const state = { inputs: {}, dynamic: { phones: [], social: [] }, imageUrls: {} };
            document.querySelectorAll('input, select, textarea').forEach(input => {
                if (input.type === 'checkbox') {
                    state.inputs[input.id] = input.checked;
                } else {
                    state.inputs[input.id] = input.value;
                }
            });
            state.dynamic.phones = [...DOMElements.phoneNumbersContainer.querySelectorAll('input[type="tel"]')].map(p => p.value);
            state.dynamic.social = [...DOMElements.social.container.querySelectorAll('.dynamic-social-link')].map(s => ({ platform: s.dataset.platform, value: s.dataset.value }));
            state.imageUrls.front = CardManager.frontBgImageUrl;
            state.imageUrls.back = CardManager.backBgImageUrl;
            return state;
        },
        save() { try { const state = this.getStateObject(); localStorage.setItem(Config.LOCAL_STORAGE_KEY, JSON.stringify(state)); } catch (e) { console.error("Failed to save state:", e); } },
        load() { try { const savedState = localStorage.getItem(Config.LOCAL_STORAGE_KEY); if (savedState) { this.applyState(JSON.parse(savedState), true); UIManager.announce("تم استعادة التصميم المحفوظ."); return true; } return false; } catch(e) { console.error("Failed to load state:", e); return false; } },
        applyState(state, triggerHistoryPush = false) {
            if (!state) return; if(state.inputs) { for (const [id, value] of Object.entries(state.inputs)) { const input = document.getElementById(id); if (input) { if (input.type === 'checkbox') { input.checked = value; } else { input.value = value; } } } }
            DOMElements.phoneNumbersContainer.innerHTML = ''; if (state.dynamic && state.dynamic.phones) { state.dynamic.phones.forEach(phone => CardManager.createPhoneInput(phone)); }
            DOMElements.social.container.innerHTML = ''; if(state.dynamic && state.dynamic.social) { state.dynamic.social.forEach(social => { DOMElements.social.type.value = social.platform; DOMElements.social.input.value = social.value; CardManager.addSocialLink(); }); }
            if(state.imageUrls) {
                CardManager.frontBgImageUrl = state.imageUrls.front;
                CardManager.backBgImageUrl = state.imageUrls.back;
                DOMElements.buttons.removeFrontBg.style.display = state.imageUrls.front ? 'block' : 'none';
                DOMElements.buttons.removeBackBg.style.display = state.imageUrls.back ? 'block' : 'none';
            }
            document.querySelectorAll('input, select, textarea').forEach(input => { if(input.value || input.type === 'checkbox') input.dispatchEvent(new Event('input', { bubbles: true })); });
            if (triggerHistoryPush) HistoryManager.pushState();
        },
        reset() { if (confirm('هل أنت متأكد أنك تريد إعادة تعيين التصميم بالكامل؟ سيتم حذف أي بيانات محفوظة.')) { localStorage.removeItem(Config.LOCAL_STORAGE_KEY); localStorage.removeItem(Config.GALLERY_STORAGE_KEY); window.location.search = ''; } },
        saveDebounced: Utils.debounce(() => UIManager.showSaveNotification(), 1500)
    };
    const ExportManager = {
        pendingExportTarget: null,
        async captureElement(element, scale = 2) {
            const style = document.createElement('style');
            style.innerHTML = '.no-export { display: none !important; }';
            document.head.appendChild(style);
            
            try {
                const canvas = await html2canvas(element, { backgroundColor: null, scale: scale });
                return canvas;
            } finally {
                document.head.removeChild(style);
            }
        },
        async downloadElement(options) { 
            const {format, quality, scale} = options;
            const element = this.pendingExportTarget === 'front' ? DOMElements.cardFront : DOMElements.cardBack;
            const filename = `card-${this.pendingExportTarget}.${format}`;
            
            UIManager.showModal(DOMElements.exportLoadingOverlay);
            try { 
                await new Promise(resolve => setTimeout(resolve, 100)); // Allow modal to render
                const canvas = await this.captureElement(element, scale); 
                const link = document.createElement('a');
                link.download = filename;
                link.href = canvas.toDataURL(`image/${format}`, quality);
                link.click();
            } catch(e) { 
                console.error("Export failed:", e); 
                UIManager.announce("فشل التصدير."); 
            } finally { 
                UIManager.hideModal(DOMElements.exportLoadingOverlay);
                UIManager.hideModal(DOMElements.exportModal.overlay);
            } 
        },
        async downloadPdf(button) { UIManager.setButtonLoadingState(button, true); try { const { jsPDF } = window.jspdf; const doc = new jsPDF({ orientation: 'landscape', unit: 'px', format: [510, 330] }); const frontCanvas = await this.captureElement(DOMElements.cardFront, 2); doc.addImage(frontCanvas.toDataURL('image/png'), 'PNG', 0, 0, 510, 330); doc.addPage(); const backCanvas = await this.captureElement(DOMElements.cardBack, 2); doc.addImage(backCanvas.toDataURL('image/png'), 'PNG', 0, 0, 510, 330); doc.save('business-card.pdf'); } catch (e) { console.error('PDF export failed:', e); UIManager.announce('فشل تصدير PDF.'); } finally { UIManager.setButtonLoadingState(button, false); } },
        getVCardString() { 
            const name = DOMElements.nameInput.value.replace(/\n/g, ' ').split(' ');
            const firstName = name.slice(0, -1).join(' '); 
            const lastName = name.slice(-1).join(' '); 
            let vCard = `BEGIN:VCARD\nVERSION:3.0\nN:${lastName};${firstName};;;\nFN:${DOMElements.nameInput.value}\nORG:${DOMElements.taglineInput.value.replace(/\n/g, ' ')}\nTITLE:${DOMElements.taglineInput.value.replace(/\n/g, ' ')}\n`; 
            if (DOMElements.emailInput.value) vCard += `EMAIL;TYPE=PREF,INTERNET:${DOMElements.emailInput.value}\n`; 
            if (DOMElements.websiteInput.value) vCard += `URL:${DOMElements.websiteInput.value}\n`; 
            document.querySelectorAll('#phone-numbers-container input[type="tel"]').forEach((phone, index) => { 
                if (phone.value) vCard += `TEL;TYPE=CELL${index === 0 ? ',PREF' : ''}:${phone.value}\n`; 
            }); 
             DOMElements.social.container.querySelectorAll('.dynamic-social-link').forEach(linkEl => {
                const platformKey = linkEl.dataset.platform;
                const value = linkEl.dataset.value;
                if(platformKey && value && Config.SOCIAL_PLATFORMS[platformKey]) {
                   let fullUrl = !/^(https?:\/\/)/i.test(value) ? Config.SOCIAL_PLATFORMS[platformKey].prefix + value : value;
                   vCard += `URL;TYPE=${platformKey}:${fullUrl}\n`;
                }
            });
            vCard += `END:VCARD`; 
            return vCard; 
        },
        downloadVcf() { const vcfData = this.getVCardString(); const blob = new Blob([vcfData], { type: 'text/vcard' }); const url = URL.createObjectURL(blob); const link = document.createElement('a'); link.href = url; link.download = 'contact.vcf'; link.click(); URL.revokeObjectURL(url); },
        downloadQrCode() {
            const vcfData = this.getVCardString();
            const container = DOMElements.qrCodeContainer;
            container.innerHTML = '';
            
            new QRCode(container, {
                text: vcfData,
                width: 256,
                height: 256,
                correctLevel: QRCode.CorrectLevel.H
            });
            
            setTimeout(() => {
                const canvas = container.querySelector('canvas');
                if (canvas) {
                    const link = document.createElement('a');
                    link.download = 'contact-qrcode.png';
                    link.href = canvas.toDataURL('image/png');
                    link.click();
                } else {
                    console.error("QR Code canvas not found.");
                    UIManager.announce("فشل توليد QR Code.");
                }
            }, 100);
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
            
            this.designs.push({
                name: `تصميم ${this.designs.length + 1}`,
                timestamp: Date.now(),
                state,
                thumbnail
            });
            this.saveDesigns();
            UIManager.setButtonLoadingState(DOMElements.buttons.saveToGallery, false);
            UIManager.announce('تم حفظ التصميم في المعرض بنجاح!');
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
                StateManager.applyState(design.state, true);
                UIManager.hideModal(DOMElements.galleryModal.overlay, DOMElements.buttons.showGallery);
            }
        },
        toggleRename(itemElement, index) {
            const nameSpan = itemElement.querySelector('.gallery-item-name-span');
            const nameInput = itemElement.querySelector('.gallery-item-name-input');
            const renameBtn = itemElement.querySelector('.gallery-rename-btn');
            const icon = renameBtn.querySelector('i');
        
            if (nameInput.style.display === 'none') {
                nameSpan.style.display = 'none';
                nameInput.style.display = 'block';
                nameInput.value = this.designs[index].name;
                nameInput.focus();
                icon.className = 'fas fa-save';
            } else {
                const newName = nameInput.value.trim();
                if (newName) {
                    this.designs[index].name = newName;
                    this.saveDesigns();
                    nameSpan.textContent = newName;
                }
                nameSpan.style.display = 'block';
                nameInput.style.display = 'none';
                icon.className = 'fas fa-pencil-alt';
            }
        },
        render() {
            const grid = DOMElements.galleryModal.grid;
            grid.innerHTML = '';
            if (this.designs.length === 0) {
                const p = document.createElement('p');
                p.textContent = 'المعرض فارغ. قم بحفظ تصميمك الحالي للبدء.';
                grid.appendChild(p);
                return;
            }
            this.designs.forEach((design, index) => {
                const item = document.createElement('div');
                item.className = 'gallery-item';

                const checkbox = document.createElement('input');
                checkbox.type = 'checkbox';
                checkbox.className = 'gallery-item-select';
                checkbox.dataset.index = index;
                checkbox.onchange = () => this.updateSelectionState();

                const thumbnail = document.createElement('img');
                thumbnail.src = design.thumbnail;
                thumbnail.alt = design.name;
                thumbnail.className = 'gallery-thumbnail';

                const nameDiv = document.createElement('div');
                nameDiv.className = 'gallery-item-name';
                
                const nameSpan = document.createElement('span');
                nameSpan.className = 'gallery-item-name-span';
                nameSpan.textContent = design.name;

                const nameInput = document.createElement('input');
                nameInput.type = 'text';
                nameInput.className = 'gallery-item-name-input';
                nameInput.style.display = 'none';
                nameInput.onkeydown = (e) => { if (e.key === 'Enter') this.toggleRename(item, index); };
                
                nameDiv.append(nameSpan, nameInput);

                const actionsDiv = document.createElement('div');
                actionsDiv.className = 'gallery-item-actions';

                const createButton = (text, iconClass, clickHandler, isDanger = false) => {
                    const button = document.createElement('button');
                    const icon = document.createElement('i');
                    icon.className = iconClass;
                    icon.setAttribute('aria-hidden', 'true');
                    if (text) {
                        button.append(icon, ` ${text}`);
                    } else {
                        button.appendChild(icon);
                    }
                    button.onclick = clickHandler;
                    if (isDanger) button.classList.add('danger');
                    return button;
                };

                const loadBtn = createButton('تحميل', 'fas fa-edit', () => this.loadDesignToEditor(index));
                const renameBtn = createButton('', 'fas fa-pencil-alt', () => this.toggleRename(item, index));
                renameBtn.classList.add('gallery-rename-btn');
                const deleteBtn = createButton('', 'fas fa-trash', () => this.deleteDesign(index), true);

                actionsDiv.append(loadBtn, renameBtn, deleteBtn);
                item.append(checkbox, thumbnail, nameDiv, actionsDiv);
                grid.appendChild(item);
            });
            this.updateSelectionState();
        },
        updateSelectionState() {
            const selectedCount = DOMElements.galleryModal.grid.querySelectorAll('.gallery-item-select:checked').length;
            DOMElements.galleryModal.downloadZipBtn.disabled = selectedCount === 0;
        },
        async downloadSelectedAsZip() {
            const selectedIndices = [...DOMElements.galleryModal.grid.querySelectorAll('.gallery-item-select:checked')].map(cb => parseInt(cb.dataset.index, 10));
            if (selectedIndices.length === 0) return;

            UIManager.setButtonLoadingState(DOMElements.galleryModal.downloadZipBtn, true, 'جاري التجهيز...');
            const originalState = StateManager.getStateObject();
            const zip = new JSZip();

            try {
                for (const index of selectedIndices) {
                    const design = this.designs[index];
                    StateManager.applyState(design.state);
                    await new Promise(resolve => setTimeout(resolve, 50));

                    const frontCanvas = await ExportManager.captureElement(DOMElements.cardFront);
                    const backCanvas = await ExportManager.captureElement(DOMElements.cardBack);

                    const frontBlob = await new Promise(resolve => frontCanvas.toBlob(resolve, 'image/png'));
                    const backBlob = await new Promise(resolve => backCanvas.toBlob(resolve, 'image/png'));

                    zip.file(`${design.name}_Front.png`, frontBlob);
                    zip.file(`${design.name}_Back.png`, backBlob);
                }
                
                zip.generateAsync({ type: "blob" }).then(content => {
                    const link = document.createElement('a');
                    link.href = URL.createObjectURL(content);
                    link.download = "Business_Cards_Export.zip";
                    link.click();
                    URL.revokeObjectURL(link.href);
                });
            } catch(e) {
                console.error("ZIP export failed:", e);
                UIManager.announce("حدث خطأ أثناء تصدير الملف المضغوط.");
            } finally {
                StateManager.applyState(originalState);
                UIManager.setButtonLoadingState(DOMElements.galleryModal.downloadZipBtn, false);
            }
        }
    };
    const ShareManager = {
        // -- دالة جديدة لتحديد المسار الأساسي الصحيح للتطبيق --
        getBasePath() {
            // path will be "/elfox/nfc/index.html" or "/elfox/nfc/"
            const path = window.location.pathname; 
            // We want to get just "/elfox/nfc/"
            return path.substring(0, path.lastIndexOf('/') + 1);
        },

        async generateShareableLink() {
            UIManager.setButtonLoadingState(DOMElements.buttons.share, true, 'جاري إنشاء الرابط...');
            const state = StateManager.getStateObject();
            try {
                const response = await fetch('https://nfc-vjy6.onrender.com/api/save-design', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(state),
                });

                if (!response.ok) {
                    throw new Error('Server responded with an error');
                }

                const result = await response.json();
                if (result.success && result.id) {
                    // -- تم التعديل هنا --
                    // استخدمنا window.location.origin مع المسار الأساسي الصحيح
                    const baseUrl = window.location.origin + this.getBasePath();
                    return `${baseUrl}card/${result.id}`;
                } else {
                    throw new Error('Invalid response from server');
                }
            } catch (error) {
                console.error("Failed to create share link:", error);
                UIManager.announce('فشل إنشاء رابط المشاركة. حاول مرة أخرى.');
                return null;
            } finally {
                UIManager.setButtonLoadingState(DOMElements.buttons.share, false);
            }
        },
        
        async share() {
            const url = await this.generateShareableLink();

            if (!url) return;

            const shareData = {
                title: 'بطاقة عملي الرقمية',
                text: 'ألق نظرة على تصميم بطاقتي الجديدة!',
                url: url,
            };

            if (navigator.share) {
                try {
                    await navigator.share(shareData);
                } catch (e) {
                    console.error("Web Share API failed:", e);
                    this.showFallback(url, shareData.text);
                }
            } else {
                this.showFallback(url, shareData.text);
            }
        },

        showFallback(url, text) {
            DOMElements.shareModal.email.href = `mailto:?subject=My Business Card&body=${encodeURIComponent(text + '\n' + url)}`;
            DOMElements.shareModal.whatsapp.href = `https://api.whatsapp.com/send?text=${encodeURIComponent(text + '\n' + url)}`;
            DOMElements.shareModal.twitter.href = `https://twitter.com/intent/tweet?url=${encodeURIComponent(url)}&text=${encodeURIComponent(text)}`;
            DOMElements.shareModal.copyLink.onclick = () => {
                Utils.copyTextToClipboard(url).then(success => {
                    if (success) UIManager.announce('تم نسخ الرابط!');
                });
            };
            UIManager.showModal(DOMElements.shareModal.overlay, DOMElements.buttons.share);
        },

        async loadFromUrl() {
            const path = window.location.pathname;
            // -- تم التعديل هنا --
            // تم تعديل التعبير النمطي (regex) ليعمل داخل أي مجلد فرعي
            const match = path.match(/\/card\/([a-zA-Z0-9_-]{8})$/);

            if (match && match[1]) {
                const designId = match[1];
                try {
                    const response = await fetch(`https://nfc-vjy6.onrender.com/api/get-design/${designId}`);
                    if (!response.ok) {
                        throw new Error('Design not found or server error');
                    }
                    const state = await response.json();
                    StateManager.applyState(state, true);
                    UIManager.announce("تم تحميل التصميم من الرابط بنجاح.");
                    
                    // -- تم التعديل هنا --
                    // قم بتنظيف الرابط وإعادته إلى المسار الأساسي الصحيح للتطبيق
                    window.history.replaceState({}, document.title, this.getBasePath());
                    return true;
                } catch (e) {
                    console.error("Failed to load state from URL:", e);
                    UIManager.announce("فشل تحميل التصميم من الرابط.");
                    window.history.replaceState({}, document.title, this.getBasePath());
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
            container.addEventListener('drop', () => { if (onSortCallback) onSortCallback(); StateManager.saveDebounced(); HistoryManager.pushState(); });
        },
        bindEvents() {
            document.querySelectorAll('input, select, textarea').forEach(input => { 
                const isSlider = input.type === 'range';
                input.addEventListener(isSlider ? 'input' : 'change', HistoryManager.pushStateDebounced);
                input.addEventListener('input', () => { 
                    CardManager.updateElementFromInput(input); 
                    if (input.id.includes('phone-btn')) CardManager.updatePhoneButtonStyles(); 
                    if (input.id.startsWith('back-buttons') || input.id.startsWith('input-')) {
                        CardManager.updateBackCard();
                    }
                    if (input.id.startsWith('front-bg-') || input.id.startsWith('back-bg-')) CardManager.updateCardBackgrounds(); 
                    StateManager.saveDebounced(); 
                }); 
                input.addEventListener('focus', () => UIManager.highlightElement(input.dataset.updateTarget, true)); 
                input.addEventListener('blur', () => UIManager.highlightElement(input.dataset.updateTarget, false)); 
            });
            
            DOMElements.fileInputs.logo.addEventListener('change', e => UIManager.handleImageUpload(e, { maxSizeMB: Config.MAX_LOGO_SIZE_MB, errorEl: DOMElements.errors.logoUpload, previewEl: DOMElements.previews.logo, spinnerEl: DOMElements.spinners.logo, onSuccess: imageUrl => { document.getElementById('card-logo').src = imageUrl; document.getElementById('input-logo').value = ''; UIManager.updateFavicon(imageUrl); StateManager.saveDebounced(); HistoryManager.pushState(); } }));
            DOMElements.fileInputs.frontBg.addEventListener('change', e => UIManager.handleImageUpload(e, { maxSizeMB: Config.MAX_BG_SIZE_MB, errorEl: DOMElements.errors.logoUpload, spinnerEl: DOMElements.spinners.frontBg, onSuccess: url => { CardManager.frontBgImageUrl = url; DOMElements.buttons.removeFrontBg.style.display = 'block'; CardManager.updateCardBackgrounds(); StateManager.saveDebounced(); HistoryManager.pushState(); }}));
            DOMElements.fileInputs.backBg.addEventListener('change', e => UIManager.handleImageUpload(e, { maxSizeMB: Config.MAX_BG_SIZE_MB, errorEl: DOMElements.errors.logoUpload, spinnerEl: DOMElements.spinners.backBg, onSuccess: url => { CardManager.backBgImageUrl = url; DOMElements.buttons.removeBackBg.style.display = 'block'; CardManager.updateCardBackgrounds(); StateManager.saveDebounced(); HistoryManager.pushState(); }}));
            
            DOMElements.buttons.addPhone.addEventListener('click', () => { CardManager.createPhoneInput(); HistoryManager.pushState(); });
            DOMElements.buttons.addSocial.addEventListener('click', () => CardManager.addSocialLink());
            DOMElements.themeSelect.addEventListener('change', e => { const themeName = e.target.value; if (themeName) { CardManager.applyTheme(themeName); } });
            DOMElements.buttons.reset.addEventListener('click', () => StateManager.reset());
            DOMElements.buttons.undo.addEventListener('click', () => HistoryManager.undo());
            DOMElements.buttons.redo.addEventListener('click', () => HistoryManager.redo());
            DOMElements.layoutSelect.addEventListener('change', e => CardManager.applyLayout(e.target.value));
            DOMElements.buttons.directionToggle.addEventListener('click', UIManager.toggleDirection);

            DOMElements.cardFront.addEventListener('click', (e) => {
                const nameEl = e.target.closest('#card-name');
                const taglineEl = e.target.closest('#card-tagline');
                const logoEl = e.target.closest('#card-logo');
        
                if (nameEl) { e.preventDefault(); UIManager.navigateToAndHighlight('input-name'); return; }
                if (taglineEl) { e.preventDefault(); UIManager.navigateToAndHighlight('input-tagline'); return; }
                if (logoEl) { e.preventDefault(); UIManager.navigateToAndHighlight('logo-drop-zone'); return; }
            });

            const flipCard = () => {
                if (window.innerWidth > 1200) return;
                DOMElements.cardsWrapper.classList.toggle('is-flipped');
            }
            DOMElements.cardsWrapper.addEventListener('click', (e) => {
                const isInteractive = e.target.closest('a, button, #card-name, #card-tagline, #card-logo');
                if (isInteractive) return;
                flipCard();
            });
            DOMElements.cardsWrapper.addEventListener('keydown', (e) => {
                if(e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    flipCard();
                }
            });
            
            DOMElements.buttons.removeFrontBg.addEventListener('click', () => { CardManager.frontBgImageUrl = null; DOMElements.fileInputs.frontBg.value = ''; DOMElements.frontBgOpacity.value = 1; DOMElements.frontBgOpacity.dispatchEvent(new Event('input')); DOMElements.buttons.removeFrontBg.style.display = 'none'; CardManager.updateCardBackgrounds(); StateManager.saveDebounced(); HistoryManager.pushState(); });
            DOMElements.buttons.removeBackBg.addEventListener('click', () => { CardManager.backBgImageUrl = null; DOMElements.fileInputs.backBg.value = ''; DOMElements.backBgOpacity.value = 1; DOMElements.backBgOpacity.dispatchEvent(new Event('input')); DOMElements.buttons.removeBackBg.style.display = 'none'; CardManager.updateCardBackgrounds(); StateManager.saveDebounced(); HistoryManager.pushState(); });

            DOMElements.buttons.downloadPngFront.addEventListener('click', (e) => { ExportManager.pendingExportTarget = 'front'; UIManager.showModal(DOMElements.exportModal.overlay, e.currentTarget); });
            DOMElements.buttons.downloadPngBack.addEventListener('click', (e) => { ExportManager.pendingExportTarget = 'back'; UIManager.showModal(DOMElements.exportModal.overlay, e.currentTarget); });
            
            DOMElements.buttons.downloadPdf.addEventListener('click', e => ExportManager.downloadPdf(e.currentTarget));
            DOMElements.buttons.downloadVcf.addEventListener('click', () => ExportManager.downloadVcf());
            DOMElements.buttons.downloadQrCode.addEventListener('click', () => ExportManager.downloadQrCode());
            DOMElements.buttons.share.addEventListener('click', () => ShareManager.share());

            DOMElements.buttons.backToTop.addEventListener('click', () => {
                window.scrollTo({ top: 0, behavior: 'smooth' });
            });
    
            const handleScroll = () => {
                if (window.scrollY > 300) {
                    DOMElements.buttons.backToTop.classList.add('visible');
                } else {
                    DOMElements.buttons.backToTop.classList.remove('visible');
                }
            };
            window.addEventListener('scroll', Utils.debounce(handleScroll, 100));
            
            DOMElements.exportModal.overlay.addEventListener('click', (e) => { if (e.target === DOMElements.exportModal.overlay) UIManager.hideModal(DOMElements.exportModal.overlay); });
            DOMElements.exportModal.closeBtn.addEventListener('click', () => UIManager.hideModal(DOMElements.exportModal.overlay));
            DOMElements.exportModal.confirmBtn.addEventListener('click', () => {
                const options = {
                    format: DOMElements.exportModal.format.value,
                    quality: DOMElements.exportModal.quality.value / 100,
                    scale: parseFloat(DOMElements.exportModal.scaleContainer.querySelector('.selected').dataset.scale)
                };
                ExportManager.downloadElement(options);
            });
            DOMElements.exportModal.format.addEventListener('input', () => { DOMElements.exportModal.qualityGroup.style.display = DOMElements.exportModal.format.value === 'jpeg' ? 'block' : 'none'; });
            DOMElements.exportModal.quality.addEventListener('input', () => { DOMElements.exportModal.qualityValue.textContent = DOMElements.exportModal.quality.value; });
            DOMElements.exportModal.scaleContainer.addEventListener('click', e => {
                if (e.target.classList.contains('scale-btn')) {
                    DOMElements.exportModal.scaleContainer.querySelector('.selected').classList.remove('selected');
                    e.target.classList.add('selected');
                }
            });

            DOMElements.buttons.saveToGallery.addEventListener('click', () => GalleryManager.addCurrentDesign());
            DOMElements.buttons.showGallery.addEventListener('click', (e) => { GalleryManager.render(); UIManager.showModal(DOMElements.galleryModal.overlay, e.currentTarget); });
            DOMElements.galleryModal.closeBtn.addEventListener('click', () => UIManager.hideModal(DOMElements.galleryModal.overlay));
            DOMElements.galleryModal.selectAllBtn.addEventListener('click', () => DOMElements.galleryModal.grid.querySelectorAll('.gallery-item-select').forEach(cb => { cb.checked = true; cb.closest('.gallery-item').classList.add('selected'); GalleryManager.updateSelectionState(); }));
            DOMElements.galleryModal.deselectAllBtn.addEventListener('click', () => DOMElements.galleryModal.grid.querySelectorAll('.gallery-item-select').forEach(cb => { cb.checked = false; cb.closest('.gallery-item').classList.remove('selected'); GalleryManager.updateSelectionState(); }));
            DOMElements.galleryModal.downloadZipBtn.addEventListener('click', () => GalleryManager.downloadSelectedAsZip());
            DOMElements.galleryModal.grid.addEventListener('change', e => { if (e.target.classList.contains('gallery-item-select')) { e.target.closest('.gallery-item').classList.toggle('selected', e.target.checked); GalleryManager.updateSelectionState(); }});
            DOMElements.shareModal.closeBtn.addEventListener('click', () => UIManager.hideModal(DOMElements.shareModal.overlay));
            DOMElements.shareModal.overlay.addEventListener('click', e => { if(e.target === DOMElements.shareModal.overlay) UIManager.hideModal(DOMElements.shareModal.overlay); });
        }
    };
    const App = {
        async init() {
            Object.assign(DOMElements, {
                cardFront: document.getElementById('card-front-preview'), cardBack: document.getElementById('card-back-preview'), cardBackContent: document.getElementById('card-back-content'), phoneNumbersContainer: document.getElementById('phone-numbers-container'), phoneButtonsWrapper: document.getElementById('phone-buttons-wrapper'), 
                cardsWrapper: document.getElementById('cards-wrapper'),
                formWrapper: document.querySelector('.form-wrapper'),
                themeSelect: document.getElementById('theme-select'),
                layoutSelect: document.getElementById('layout-select'),
                liveAnnouncer: document.getElementById('live-announcer'), 
                saveToast: document.getElementById('save-toast'),
                nameInput: document.getElementById('input-name'), taglineInput: document.getElementById('input-tagline'), emailInput: document.getElementById('input-email'), websiteInput: document.getElementById('input-website'), 
                qrImageUrlInput: document.getElementById('input-qr-url'),
                qrCodeContainer: document.getElementById('qrcode-container'),
                phoneBtnBgColor: document.getElementById('phone-btn-bg-color'), phoneBtnTextColor: document.getElementById('phone-btn-text-color'), phoneBtnFontSize: document.getElementById('phone-btn-font-size'), phoneBtnFont: document.getElementById('phone-btn-font'), backButtonsBgColor: document.getElementById('back-buttons-bg-color'), backButtonsTextColor: document.getElementById('back-buttons-text-color'), backButtonsFont: document.getElementById('back-buttons-font'),
                frontBgOpacity: document.getElementById('front-bg-opacity'), backBgOpacity: document.getElementById('back-bg-opacity'),
                phoneBtnPadding: document.getElementById('phone-btn-padding'),
                backButtonsSize: document.getElementById('back-buttons-size'),
                nameColor: document.getElementById('name-color'), nameFontSize: document.getElementById('name-font-size'), nameFont: document.getElementById('name-font'),
                taglineColor: document.getElementById('tagline-color'), taglineFontSize: document.getElementById('tagline-font-size'), taglineFont: document.getElementById('tagline-font'),
                social: { type: document.getElementById('social-media-type'), input: document.getElementById('social-media-input'), container: document.getElementById('dynamic-social-links-container') },
                fileInputs: { logo: document.getElementById('input-logo-upload'), frontBg: document.getElementById('front-bg-upload'), backBg: document.getElementById('back-bg-upload') },
                previews: { logo: document.getElementById('logo-preview') }, errors: { logoUpload: document.getElementById('logo-upload-error') },
                spinners: { logo: document.getElementById('logo-spinner'), frontBg: document.getElementById('front-bg-spinner'), backBg: document.getElementById('back-bg-spinner') },
                sounds: { success: document.getElementById('audio-success'), error: document.getElementById('audio-error') },
                exportLoadingOverlay: document.getElementById('export-loading-overlay'),
                exportModal: {
                    overlay: document.getElementById('export-modal-overlay'), closeBtn: document.getElementById('export-modal-close'), confirmBtn: document.getElementById('confirm-export-btn'),
                    format: document.getElementById('export-format'), qualityGroup: document.getElementById('export-quality-group'), quality: document.getElementById('export-quality'),
                    qualityValue: document.getElementById('export-quality-value'), scaleContainer: document.querySelector('.scale-buttons')
                },
                galleryModal: {
                    overlay: document.getElementById('gallery-modal-overlay'), closeBtn: document.getElementById('gallery-modal-close'), grid: document.getElementById('gallery-grid'),
                    selectAllBtn: document.getElementById('gallery-select-all'), deselectAllBtn: document.getElementById('gallery-deselect-all'), downloadZipBtn: document.getElementById('gallery-download-zip')
                },
                shareModal: {
                    overlay: document.getElementById('share-fallback-modal-overlay'), closeBtn: document.getElementById('share-fallback-modal-close'),
                    email: document.getElementById('share-email'), whatsapp: document.getElementById('share-whatsapp'),
                    twitter: document.getElementById('share-twitter'), copyLink: document.getElementById('share-copy-link')
                },
                buttons: { addPhone: document.getElementById('add-phone-btn'), addSocial: document.getElementById('add-social-btn'), 
                    reset: document.getElementById('reset-design-btn'),
                    undo: document.getElementById('undo-btn'), redo: document.getElementById('redo-btn'),
                    saveToGallery: document.getElementById('save-to-gallery-btn'), showGallery: document.getElementById('show-gallery-btn'), share: document.getElementById('share-btn'),
                    removeFrontBg: document.getElementById('remove-front-bg-btn'), removeBackBg: document.getElementById('remove-back-bg-btn'),
                    downloadPngFront: document.getElementById('download-png-front'), downloadPngBack: document.getElementById('download-png-back'), downloadPdf: document.getElementById('download-pdf'), downloadVcf: document.getElementById('download-vcf'),
                    downloadQrCode: document.getElementById('download-qrcode'),
                    backToTop: document.getElementById('back-to-top-btn'),
                    directionToggle: document.getElementById('direction-toggle-btn')
                }
            });
            UIManager.init();
            GalleryManager.init();
            EventManager.bindEvents();
            
            const loadedFromUrl = await ShareManager.loadFromUrl();
            if (!loadedFromUrl) {
                const loadedFromStorage = StateManager.load();
                if (!loadedFromStorage) {
                    CardManager.createPhoneInput('01062071741');
                    CardManager.createPhoneInput('01555535154');
                    document.querySelectorAll('input, select, textarea').forEach(input => {
                        if (input.value) input.dispatchEvent(new Event('input', { bubbles: true }));
                    });
                    DOMElements.themeSelect.value = 'deep-sea';
                    CardManager.applyTheme('deep-sea');
                    DOMElements.layoutSelect.value = 'classic';
                    CardManager.applyLayout('classic');
                }
            }
            
            HistoryManager.init();
            UIManager.announce("محرر بطاقة الأعمال جاهز للاستخدام.");
        }
    };
    document.addEventListener('DOMContentLoaded', () => App.init());
=======
(function() {
    'use strict';
    const Config = {
        LOCAL_STORAGE_KEY: 'digitalCardEditorState_v15',
        GALLERY_STORAGE_KEY: 'digitalCardGallery_v1',
        MAX_LOGO_SIZE_MB: 2, MAX_BG_SIZE_MB: 5, RESIZED_IMAGE_MAX_DIMENSION: 1280,
        THEMES: {
            'deep-sea': { name: 'بحر عميق', gradient: ['#2a3d54', '#223246'], values: { textPrimary: '#e6f0f7', taglineColor: '#4da6ff', backButtonBg: '#364f6b', backButtonText: '#aab8c2', phoneBtnBg: '#4da6ff', phoneBtnText: '#ffffff'}},
            'modern-light': { name: 'أبيض حديث', gradient: ['#e9e99', '#ffffff'], values: { textPrimary: '#121212', taglineColor: '#007BFF', backButtonBg: '#f0f2f5', backButtonText: '#343a40', phoneBtnBg: 'transparent', phoneBtnText: '#007BFF'}},
            'forest-whisper': { name: 'همس الغابة', gradient: ['#234d20', '#364935'], values: { textPrimary: '#f0f3f0', taglineColor: '#77ab59', backButtonBg: '#4a785f', backButtonText: '#f0f3f0', phoneBtnBg: '#77ab59', phoneBtnText: '#f0f3f0'}},
            'sunset-gradient': { name: 'غروب الشمس', gradient: ['#ff8c42', '#c44d56'], values: { textPrimary: '#ffffff', taglineColor: '#ffcc80', backButtonBg: '#8c4356', backButtonText: '#ffffff', phoneBtnBg: 'rgba(255,255,255,0.2)', phoneBtnText: '#ffffff'}},
            'corporate-elegance': { name: 'أناقة الشركات', gradient: ['#f8f9fa', '#e9ecef'], values: { textPrimary: '#212529', taglineColor: '#0056b3', backButtonBg: '#343a40', backButtonText: '#ffffff', phoneBtnBg: '#0056b3', phoneBtnText: '#ffffff'}},
            'nature-warmth': { name: 'دفء الطبيعة', gradient: ['#f5f5dc', '#f0e68c'], values: { textPrimary: '#556b2f', taglineColor: '#8b4513', backButtonBg: '#8fbc8f', backButtonText: '#2f4f4f', phoneBtnBg: '#8b4513', phoneBtnText: '#ffffff'}},
            'night-neon': { name: 'النيون الليلي', gradient: ['#0d0d0d', '#1a1a1a'], values: { textPrimary: '#f0f0f0', taglineColor: '#39ff14', backButtonBg: '#222222', backButtonText: '#00ffdd', phoneBtnBg: 'transparent', phoneBtnText: '#39ff14'}},
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
            if (audioEl) {
                audioEl.currentTime = 0;
                audioEl.play().catch(e => console.error("Audio play failed:", e));
            }
        },
        async copyTextToClipboard(text) { try { if (navigator.clipboard && window.isSecureContext) { await navigator.clipboard.writeText(text); } else { const textArea = document.createElement('textarea'); textArea.value = text; textArea.style.position = 'absolute'; textArea.style.left = '-999999px'; document.body.prepend(textArea); textArea.select(); document.execCommand('copy'); textArea.remove(); } return true; } catch (error) { console.error('فشل النسخ إلى الحافظة:', error); return false; } }
    };
    const UIManager = {
        init() { this.populateThemes(); this.populateSocialMediaOptions(); },
        announce: (message) => { if(DOMElements.liveAnnouncer) DOMElements.liveAnnouncer.textContent = message; },
        populateThemes() { const select = DOMElements.themeSelect; if (!select) return; select.innerHTML = '<option value="">-- اختر تصميم --</option>'; select.innerHTML += Object.entries(Config.THEMES).map(([key, theme]) => `<option value="${key}">${theme.name}</option>`).join(''); },
        populateSocialMediaOptions() { const select = DOMElements.social.type; if (!select) return; select.innerHTML = Object.entries(Config.SOCIAL_PLATFORMS).map(([key, platform]) => `<option value="${key}">${platform.name}</option>`).join(''); },
        
        handleImageUpload(event, { maxSizeMB, errorEl, previewEl, spinnerEl, onSuccess }) {
            const file = event.target.files[0];
            errorEl.textContent = ''; errorEl.style.display = 'none';
            if (!file) return;

            if (!file.type.startsWith('image/')) {
                errorEl.textContent = 'الرجاء اختيار ملف صورة صالح.';
                errorEl.style.display = 'block';
                Utils.playSound('error');
                return;
            }
            if (file.size > maxSizeMB * 1024 * 1024) {
                errorEl.textContent = `يجب أن يكون حجم الملف أقل من ${maxSizeMB} ميجابايت.`;
                errorEl.style.display = 'block';
                Utils.playSound('error');
                return;
            }

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
            const toast = DOMElements.saveToast;
            if (!toast) return;
            toast.textContent = 'جاري الحفظ...';
            toast.classList.add('show');
            
            StateManager.save();
            
            setTimeout(() => {
                toast.textContent = 'تم الحفظ ✓';
                UIManager.announce("تم حفظ التغييرات تلقائيًا");
                setTimeout(() => {
                    toast.classList.remove('show');
                }, 1500);
            }, 500);
        },
        updateFavicon(url) { if(url) document.getElementById('favicon').href = url; },
        highlightElement(targetId, state) { const el = document.getElementById(targetId); if(el) el.classList.toggle('highlighted', state); },
        
        showFormColumn(columnIdToShow) {
            if (!DOMElements.formWrapper) return;
            DOMElements.formWrapper.querySelectorAll('.form-container').forEach(col => {
                col.classList.remove('is-active');
            });
            const columnToShow = document.getElementById(columnIdToShow);
            if (columnToShow) {
                columnToShow.classList.add('is-active');
            }
        },

        navigateToAndHighlight(elementId) {
            const targetElement = document.getElementById(elementId);
            if (!targetElement) {
                console.warn(`MapsToAndHighlight: Element with ID "${elementId}" not found.`);
                return;
            }

            const parentColumn = targetElement.closest('.form-container');
            if (parentColumn) {
                this.showFormColumn(parentColumn.id);
            }
    
            setTimeout(() => {
                const highlightTarget = targetElement.closest('.fieldset') || targetElement.closest('.form-group') || targetElement;
                highlightTarget.scrollIntoView({ behavior: 'smooth', block: 'center' });
                highlightTarget.classList.add('form-element-highlighted');
                setTimeout(() => {
                    highlightTarget.classList.remove('form-element-highlighted');
                }, 2000);
            }, 100);
        },
        
        trapFocus(modalElement) {
            const focusableElements = modalElement.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
            const firstElement = focusableElements[0];
            const lastElement = focusableElements[focusableElements.length - 1];

            const handleTabKeyPress = (e) => {
                if (e.key !== 'Tab') return;
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
            if (triggerElementId) {
                document.getElementById(triggerElementId)?.focus();
            }
            const eventListener = modalOverlay.dataset.focusTrapListener;
            if (eventListener) {
                modalOverlay.removeEventListener('keydown', eventListener);
            }
        },

        toggleDirection() {
            const html = document.documentElement;
            const btn = DOMElements.buttons.directionToggle;
            const span = btn.querySelector('span');
            if (html.dir === 'rtl') {
                html.dir = 'ltr';
                html.classList.add('ltr');
                span.textContent = 'AR';
            } else {
                html.dir = 'rtl';
                html.classList.remove('ltr');
                span.textContent = 'EN';
            }
        },

        setupDragDrop(dropZoneId, fileInputId) { const dropZone = document.getElementById(dropZoneId); const fileInput = document.getElementById(fileInputId); if (!dropZone || !fileInput) return; ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => { dropZone.addEventListener(eventName, e => { e.preventDefault(); e.stopPropagation(); }); }); ['dragenter', 'dragover'].forEach(eventName => { dropZone.addEventListener(eventName, () => dropZone.classList.add('drag-over')); }); ['dragleave', 'drop'].forEach(eventName => { dropZone.addEventListener(eventName, () => dropZone.classList.remove('drag-over')); }); dropZone.addEventListener('drop', e => { if (e.dataTransfer.files.length) { fileInput.files = e.dataTransfer.files; fileInput.dispatchEvent(new Event('change', { bubbles: true })); } }); },
        setButtonLoadingState(button, isLoading, text = 'جاري التحميل...') { if (!button) return; const span = button.querySelector('span'); const originalText = button.dataset.originalText || (span ? span.textContent : ''); if(!button.dataset.originalText && span) button.dataset.originalText = originalText; if (isLoading) { button.disabled = true; button.classList.add('loading'); if(span) span.textContent = text; } else { button.disabled = false; button.classList.remove('loading'); if(span) span.textContent = originalText; }},
    };
    const CardManager = {
        frontBgImageUrl: null, backBgImageUrl: null,
        updateElementFromInput(input) { const { updateTarget, updateProperty, updateUnit = '' } = input.dataset; if (!updateTarget || !updateProperty) return; const targetElement = document.getElementById(updateTarget); if (!targetElement) return; const properties = updateProperty.split('.'); let current = targetElement; for (let i = 0; i < properties.length - 1; i++) { current = current[properties[i]]; } current[properties[properties.length - 1]] = input.value + updateUnit; },
        updatePhoneButtonStyles() { const bgColor = DOMElements.phoneBtnBgColor.value; const textColor = DOMElements.phoneBtnTextColor.value; const fontSize = DOMElements.phoneBtnFontSize.value; const fontFamily = DOMElements.phoneBtnFont.value; const padding = DOMElements.phoneBtnPadding.value; DOMElements.phoneButtonsWrapper.querySelectorAll('.phone-button').forEach(button => { button.style.backgroundColor = bgColor; button.style.color = textColor; button.style.borderColor = (bgColor === 'transparent' || bgColor.includes('rgba(0,0,0,0)')) ? textColor : 'transparent'; button.style.fontSize = `${fontSize}px`; button.style.fontFamily = fontFamily; button.style.padding = `${padding}px ${padding * 2}px`; }); },
        
        renderPhoneButtons() {
            DOMElements.phoneButtonsWrapper.innerHTML = '';
            DOMElements.phoneNumbersContainer.querySelectorAll('.dynamic-input-group').forEach((group, index) => {
                if (!group.id) {
                    group.id = `phone-group-${index}`;
                }
                const input = group.querySelector('input[type="tel"]');
                if (input && input.value) {
                    const phoneLink = document.createElement('a');
                    phoneLink.href = `tel:${input.value.replace(/[^0-9+]/g, '')}`;
                    phoneLink.className = 'phone-button';
                    
                    const icon = document.createElement('i');
                    icon.className = 'fas fa-phone-alt';
                    icon.setAttribute('aria-hidden', 'true');

                    const textSpan = document.createElement('span');
                    textSpan.textContent = input.value;
                    
                    phoneLink.append(icon, textSpan);

                    const copyBtn = document.createElement('button');
                    copyBtn.className = 'copy-btn no-export';
                    copyBtn.title = 'نسخ الرقم';
                    
                    const copyIcon = document.createElement('i');
                    copyIcon.className = 'fas fa-copy';
                    copyIcon.setAttribute('aria-hidden', 'true');
                    copyBtn.appendChild(copyIcon);
                    
                    const phoneNumber = input.value;
                    copyBtn.onclick = (e) => {
                        e.preventDefault(); e.stopPropagation();
                        Utils.copyTextToClipboard(phoneNumber).then(success => {
                            if (success) UIManager.announce('تم نسخ الرقم!');
                        });
                    };
                    phoneLink.appendChild(copyBtn);
                    
                    phoneLink.dataset.targetFormId = group.id;
                    phoneLink.addEventListener('click', (e) => {
                        e.preventDefault();
                        UIManager.navigateToAndHighlight(e.currentTarget.dataset.targetFormId);
                    });

                    DOMElements.phoneButtonsWrapper.appendChild(phoneLink);
                }
            });
            this.updatePhoneButtonStyles();
        },
        createPhoneInput(value = '') { const inputGroup = document.createElement('div'); inputGroup.className = 'dynamic-input-group'; inputGroup.setAttribute('draggable', true); const newPhoneInput = document.createElement('input'); newPhoneInput.type = 'tel'; newPhoneInput.value = value; newPhoneInput.placeholder = 'رقم هاتف جديد'; const removeBtn = document.createElement('button'); removeBtn.className = 'remove-btn'; removeBtn.textContent = '×'; removeBtn.setAttribute('aria-label', 'حذف رقم الهاتف'); removeBtn.onclick = () => { inputGroup.remove(); this.renderPhoneButtons(); StateManager.saveDebounced(); HistoryManager.pushState(); }; newPhoneInput.addEventListener('input', () => { this.renderPhoneButtons(); StateManager.saveDebounced(); }); newPhoneInput.addEventListener('change', HistoryManager.pushStateDebounced); inputGroup.appendChild(newPhoneInput); inputGroup.appendChild(removeBtn); DOMElements.phoneNumbersContainer.appendChild(inputGroup); },
        updateCardBackgrounds() { const setBg = (cardEl, startId, endId, image, opacityId) => { cardEl.style.setProperty('--bg-gradient', `linear-gradient(135deg, ${document.getElementById(startId).value}, ${document.getElementById(endId).value})`); cardEl.querySelector('.card-background-layer[id$="-image-layer"]').style.backgroundImage = image ? `url(${image})` : 'none'; cardEl.querySelector('.card-background-layer[id$="-gradient-layer"]').style.opacity = document.getElementById(opacityId).value; }; setBg(DOMElements.cardFront, 'front-bg-start', 'front-bg-end', this.frontBgImageUrl, 'front-bg-opacity'); setBg(DOMElements.cardBack, 'back-bg-start', 'back-bg-end', this.backBgImageUrl, 'back-bg-opacity'); },
        
        updateBackCard() {
            const cardContent = DOMElements.cardBackContent;
            cardContent.innerHTML = '';

            const qrUrl = DOMElements.qrImageUrlInput.value;
            if (qrUrl) {
                const qrWrapper = document.createElement('div');
                qrWrapper.className = 'card-back-qr-image-wrapper';
                const qrImage = document.createElement('img');
                qrImage.src = qrUrl;
                qrImage.alt = 'QR Code';
                qrWrapper.appendChild(qrImage);
                qrWrapper.addEventListener('click', () => UIManager.navigateToAndHighlight('input-qr-url'));
                cardContent.appendChild(qrWrapper);
            }
            
            const contactsWrapper = document.createElement('div');
            contactsWrapper.className = 'contact-icons-wrapper';
            
            const renderLink = (value, platform, sourceInputId) => {
                let fullUrl = value, displayText = value;
                if (platform.prefix) { if (platform.id === 'email' || platform.id === 'whatsapp') { fullUrl = platform.prefix + value; } else { fullUrl = !/^(https?:\/\/)/i.test(value) ? platform.prefix + value : value; } } else if (!/^(https?:\/\/)/i.test(value)) { fullUrl = 'https://' + value; }
                if (platform.id !== 'email' && platform.id !== 'whatsapp') { displayText = displayText.replace(/^(https?:\/\/)?(www\.)?/, '').replace(/\/$/, ''); }

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
                    e.preventDefault(); e.stopPropagation();
                    Utils.copyTextToClipboard(fullUrl).then(success => {
                        if (success) UIManager.announce('تم نسخ الرابط!');
                    });
                };
                link.appendChild(copyBtn);
                contactsWrapper.appendChild(link);
            };

            Config.STATIC_CONTACT_METHODS.forEach(method => { const input = document.getElementById('input-' + method.id); if (input && input.value) renderLink(input.value, method, 'contact-info-fieldset'); });
            DOMElements.social.container.querySelectorAll('.dynamic-social-link').forEach(linkEl => { const platformKey = linkEl.dataset.platform; const value = linkEl.dataset.value; if(platformKey && value && Config.SOCIAL_PLATFORMS[platformKey]) { renderLink(value, Config.SOCIAL_PLATFORMS[platformKey], 'contact-info-fieldset'); } });
            
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
        applyTheme(themeName) { const theme = Config.THEMES[themeName]; if (!theme) return; const controlsToUpdate = { 'name-color': theme.values.textPrimary, 'tagline-color': theme.values.taglineColor, 'front-bg-start': theme.gradient[0], 'front-bg-end': theme.gradient[1], 'back-bg-start': theme.gradient[0], 'back-bg-end': theme.gradient[1], 'back-buttons-bg-color': theme.values.backButtonBg, 'back-buttons-text-color': theme.values.backButtonText, 'phone-btn-bg-color': theme.values.phoneBtnBg, 'phone-btn-text-color': theme.values.phoneBtnText }; for (const [id, value] of Object.entries(controlsToUpdate)) { const control = document.getElementById(id); if(control) { control.value = value; control.dispatchEvent(new Event('input', { bubbles: true })); } } this.frontBgImageUrl = null; this.backBgImageUrl = null; DOMElements.fileInputs.frontBg.value = ''; DOMElements.fileInputs.backBg.value = ''; this.updateCardBackgrounds(); UIManager.announce(`تم تطبيق تصميم ${theme.name}`); HistoryManager.pushState(); StateManager.save(); },
        
        addSocialLink() { 
            const platformKey = DOMElements.social.type.value; 
            const value = DOMElements.social.input.value.trim(); 
            if (!value) { UIManager.announce('الرجاء إدخال رابط أو معرف.'); return; } 
            
            const platform = Config.SOCIAL_PLATFORMS[platformKey]; 
            const linkEl = document.createElement('div'); 
            linkEl.className = 'dynamic-social-link'; 
            linkEl.setAttribute('draggable', true); 
            linkEl.dataset.platform = platformKey; 
            linkEl.dataset.value = value; 
            
            const icon = document.createElement('i');
            icon.className = platform.icon;
            icon.setAttribute('aria-hidden', 'true');

            const text = document.createElement('span');
            text.textContent = value;
            
            const removeBtn = document.createElement('button');
            removeBtn.className = 'remove-btn';
            removeBtn.setAttribute('aria-label', 'حذف الرابط');
            removeBtn.textContent = '×';
            removeBtn.addEventListener('click', () => { linkEl.remove(); this.updateBackCard(); StateManager.saveDebounced(); HistoryManager.pushState(); }); 

            linkEl.append(icon, text, removeBtn);
            
            DOMElements.social.container.appendChild(linkEl); 
            DOMElements.social.input.value = ''; 
            this.updateBackCard(); 
            StateManager.saveDebounced(); 
            HistoryManager.pushState(); 
        },
        applyLayout(layoutName) { DOMElements.cardsWrapper.dataset.layout = layoutName; StateManager.saveDebounced(); HistoryManager.pushState(); }
    };
    const HistoryManager = {
        undoStack: [],
        redoStack: [],
        historyLimit: 30,
        init() {
            this.pushState();
        },
        pushState() {
            this.undoStack.push(StateManager.getStateObject());
            if (this.undoStack.length > this.historyLimit) {
                this.undoStack.shift();
            }
            this.redoStack = [];
            this.updateButtonStates();
        },
        undo() {
            if (this.undoStack.length > 1) {
                this.redoStack.push(this.undoStack.pop());
                const state = this.undoStack[this.undoStack.length - 1];
                StateManager.applyState(state, false);
                UIManager.announce("تم التراجع");
            }
            this.updateButtonStates();
        },
        redo() {
            if (this.redoStack.length > 0) {
                const state = this.redoStack.pop();
                this.undoStack.push(state);
                StateManager.applyState(state, false);
                UIManager.announce("تمت الإعادة");
            }
            this.updateButtonStates();
        },
        updateButtonStates() {
            DOMElements.buttons.undo.disabled = this.undoStack.length <= 1;
            DOMElements.buttons.redo.disabled = this.redoStack.length === 0;
        },
        pushStateDebounced: Utils.debounce(() => HistoryManager.pushState(), 500)
    };
    const StateManager = {
        getStateObject() {
            const state = { inputs: {}, dynamic: { phones: [], social: [] }, imageUrls: {} };
            document.querySelectorAll('input, select, textarea').forEach(input => {
                if (input.type === 'checkbox') {
                    state.inputs[input.id] = input.checked;
                } else {
                    state.inputs[input.id] = input.value;
                }
            });
            state.dynamic.phones = [...DOMElements.phoneNumbersContainer.querySelectorAll('input[type="tel"]')].map(p => p.value);
            state.dynamic.social = [...DOMElements.social.container.querySelectorAll('.dynamic-social-link')].map(s => ({ platform: s.dataset.platform, value: s.dataset.value }));
            state.imageUrls.front = CardManager.frontBgImageUrl;
            state.imageUrls.back = CardManager.backBgImageUrl;
            return state;
        },
        save() { try { const state = this.getStateObject(); localStorage.setItem(Config.LOCAL_STORAGE_KEY, JSON.stringify(state)); } catch (e) { console.error("Failed to save state:", e); } },
        load() { try { const savedState = localStorage.getItem(Config.LOCAL_STORAGE_KEY); if (savedState) { this.applyState(JSON.parse(savedState), true); UIManager.announce("تم استعادة التصميم المحفوظ."); return true; } return false; } catch(e) { console.error("Failed to load state:", e); return false; } },
        applyState(state, triggerHistoryPush = false) {
            if (!state) return; if(state.inputs) { for (const [id, value] of Object.entries(state.inputs)) { const input = document.getElementById(id); if (input) { if (input.type === 'checkbox') { input.checked = value; } else { input.value = value; } } } }
            DOMElements.phoneNumbersContainer.innerHTML = ''; if (state.dynamic && state.dynamic.phones) { state.dynamic.phones.forEach(phone => CardManager.createPhoneInput(phone)); }
            DOMElements.social.container.innerHTML = ''; if(state.dynamic && state.dynamic.social) { state.dynamic.social.forEach(social => { DOMElements.social.type.value = social.platform; DOMElements.social.input.value = social.value; CardManager.addSocialLink(); }); }
            if(state.imageUrls) {
                CardManager.frontBgImageUrl = state.imageUrls.front;
                CardManager.backBgImageUrl = state.imageUrls.back;
                DOMElements.buttons.removeFrontBg.style.display = state.imageUrls.front ? 'block' : 'none';
                DOMElements.buttons.removeBackBg.style.display = state.imageUrls.back ? 'block' : 'none';
            }
            document.querySelectorAll('input, select, textarea').forEach(input => { if(input.value || input.type === 'checkbox') input.dispatchEvent(new Event('input', { bubbles: true })); });
            if (triggerHistoryPush) HistoryManager.pushState();
        },
        reset() { if (confirm('هل أنت متأكد أنك تريد إعادة تعيين التصميم بالكامل؟ سيتم حذف أي بيانات محفوظة.')) { localStorage.removeItem(Config.LOCAL_STORAGE_KEY); localStorage.removeItem(Config.GALLERY_STORAGE_KEY); window.location.search = ''; } },
        saveDebounced: Utils.debounce(() => UIManager.showSaveNotification(), 1500)
    };
    const ExportManager = {
        pendingExportTarget: null,
        async captureElement(element, scale = 2) {
            const style = document.createElement('style');
            style.innerHTML = '.no-export { display: none !important; }';
            document.head.appendChild(style);
            
            try {
                const canvas = await html2canvas(element, { backgroundColor: null, scale: scale });
                return canvas;
            } finally {
                document.head.removeChild(style);
            }
        },
        async downloadElement(options) { 
            const {format, quality, scale} = options;
            const element = this.pendingExportTarget === 'front' ? DOMElements.cardFront : DOMElements.cardBack;
            const filename = `card-${this.pendingExportTarget}.${format}`;
            
            UIManager.showModal(DOMElements.exportLoadingOverlay);
            try { 
                await new Promise(resolve => setTimeout(resolve, 100)); // Allow modal to render
                const canvas = await this.captureElement(element, scale); 
                const link = document.createElement('a');
                link.download = filename;
                link.href = canvas.toDataURL(`image/${format}`, quality);
                link.click();
            } catch(e) { 
                console.error("Export failed:", e); 
                UIManager.announce("فشل التصدير."); 
            } finally { 
                UIManager.hideModal(DOMElements.exportLoadingOverlay);
                UIManager.hideModal(DOMElements.exportModal.overlay);
            } 
        },
        async downloadPdf(button) { UIManager.setButtonLoadingState(button, true); try { const { jsPDF } = window.jspdf; const doc = new jsPDF({ orientation: 'landscape', unit: 'px', format: [510, 330] }); const frontCanvas = await this.captureElement(DOMElements.cardFront, 2); doc.addImage(frontCanvas.toDataURL('image/png'), 'PNG', 0, 0, 510, 330); doc.addPage(); const backCanvas = await this.captureElement(DOMElements.cardBack, 2); doc.addImage(backCanvas.toDataURL('image/png'), 'PNG', 0, 0, 510, 330); doc.save('business-card.pdf'); } catch (e) { console.error('PDF export failed:', e); UIManager.announce('فشل تصدير PDF.'); } finally { UIManager.setButtonLoadingState(button, false); } },
        getVCardString() { 
            const name = DOMElements.nameInput.value.replace(/\n/g, ' ').split(' ');
            const firstName = name.slice(0, -1).join(' '); 
            const lastName = name.slice(-1).join(' '); 
            let vCard = `BEGIN:VCARD\nVERSION:3.0\nN:${lastName};${firstName};;;\nFN:${DOMElements.nameInput.value}\nORG:${DOMElements.taglineInput.value.replace(/\n/g, ' ')}\nTITLE:${DOMElements.taglineInput.value.replace(/\n/g, ' ')}\n`; 
            if (DOMElements.emailInput.value) vCard += `EMAIL;TYPE=PREF,INTERNET:${DOMElements.emailInput.value}\n`; 
            if (DOMElements.websiteInput.value) vCard += `URL:${DOMElements.websiteInput.value}\n`; 
            document.querySelectorAll('#phone-numbers-container input[type="tel"]').forEach((phone, index) => { 
                if (phone.value) vCard += `TEL;TYPE=CELL${index === 0 ? ',PREF' : ''}:${phone.value}\n`; 
            }); 
             DOMElements.social.container.querySelectorAll('.dynamic-social-link').forEach(linkEl => {
                const platformKey = linkEl.dataset.platform;
                const value = linkEl.dataset.value;
                if(platformKey && value && Config.SOCIAL_PLATFORMS[platformKey]) {
                   let fullUrl = !/^(https?:\/\/)/i.test(value) ? Config.SOCIAL_PLATFORMS[platformKey].prefix + value : value;
                   vCard += `URL;TYPE=${platformKey}:${fullUrl}\n`;
                }
            });
            vCard += `END:VCARD`; 
            return vCard; 
        },
        downloadVcf() { const vcfData = this.getVCardString(); const blob = new Blob([vcfData], { type: 'text/vcard' }); const url = URL.createObjectURL(blob); const link = document.createElement('a'); link.href = url; link.download = 'contact.vcf'; link.click(); URL.revokeObjectURL(url); },
        downloadQrCode() {
            const vcfData = this.getVCardString();
            const container = DOMElements.qrCodeContainer;
            container.innerHTML = '';
            
            new QRCode(container, {
                text: vcfData,
                width: 256,
                height: 256,
                correctLevel: QRCode.CorrectLevel.H
            });
            
            setTimeout(() => {
                const canvas = container.querySelector('canvas');
                if (canvas) {
                    const link = document.createElement('a');
                    link.download = 'contact-qrcode.png';
                    link.href = canvas.toDataURL('image/png');
                    link.click();
                } else {
                    console.error("QR Code canvas not found.");
                    UIManager.announce("فشل توليد QR Code.");
                }
            }, 100);
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
            
            this.designs.push({
                name: `تصميم ${this.designs.length + 1}`,
                timestamp: Date.now(),
                state,
                thumbnail
            });
            this.saveDesigns();
            UIManager.setButtonLoadingState(DOMElements.buttons.saveToGallery, false);
            UIManager.announce('تم حفظ التصميم في المعرض بنجاح!');
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
                StateManager.applyState(design.state, true);
                UIManager.hideModal(DOMElements.galleryModal.overlay, DOMElements.buttons.showGallery);
            }
        },
        toggleRename(itemElement, index) {
            const nameSpan = itemElement.querySelector('.gallery-item-name-span');
            const nameInput = itemElement.querySelector('.gallery-item-name-input');
            const renameBtn = itemElement.querySelector('.gallery-rename-btn');
            const icon = renameBtn.querySelector('i');
        
            if (nameInput.style.display === 'none') {
                nameSpan.style.display = 'none';
                nameInput.style.display = 'block';
                nameInput.value = this.designs[index].name;
                nameInput.focus();
                icon.className = 'fas fa-save';
            } else {
                const newName = nameInput.value.trim();
                if (newName) {
                    this.designs[index].name = newName;
                    this.saveDesigns();
                    nameSpan.textContent = newName;
                }
                nameSpan.style.display = 'block';
                nameInput.style.display = 'none';
                icon.className = 'fas fa-pencil-alt';
            }
        },
        render() {
            const grid = DOMElements.galleryModal.grid;
            grid.innerHTML = '';
            if (this.designs.length === 0) {
                const p = document.createElement('p');
                p.textContent = 'المعرض فارغ. قم بحفظ تصميمك الحالي للبدء.';
                grid.appendChild(p);
                return;
            }
            this.designs.forEach((design, index) => {
                const item = document.createElement('div');
                item.className = 'gallery-item';

                const checkbox = document.createElement('input');
                checkbox.type = 'checkbox';
                checkbox.className = 'gallery-item-select';
                checkbox.dataset.index = index;
                checkbox.onchange = () => this.updateSelectionState();

                const thumbnail = document.createElement('img');
                thumbnail.src = design.thumbnail;
                thumbnail.alt = design.name;
                thumbnail.className = 'gallery-thumbnail';

                const nameDiv = document.createElement('div');
                nameDiv.className = 'gallery-item-name';
                
                const nameSpan = document.createElement('span');
                nameSpan.className = 'gallery-item-name-span';
                nameSpan.textContent = design.name;

                const nameInput = document.createElement('input');
                nameInput.type = 'text';
                nameInput.className = 'gallery-item-name-input';
                nameInput.style.display = 'none';
                nameInput.onkeydown = (e) => { if (e.key === 'Enter') this.toggleRename(item, index); };
                
                nameDiv.append(nameSpan, nameInput);

                const actionsDiv = document.createElement('div');
                actionsDiv.className = 'gallery-item-actions';

                const createButton = (text, iconClass, clickHandler, isDanger = false) => {
                    const button = document.createElement('button');
                    const icon = document.createElement('i');
                    icon.className = iconClass;
                    icon.setAttribute('aria-hidden', 'true');
                    if (text) {
                        button.append(icon, ` ${text}`);
                    } else {
                        button.appendChild(icon);
                    }
                    button.onclick = clickHandler;
                    if (isDanger) button.classList.add('danger');
                    return button;
                };

                const loadBtn = createButton('تحميل', 'fas fa-edit', () => this.loadDesignToEditor(index));
                const renameBtn = createButton('', 'fas fa-pencil-alt', () => this.toggleRename(item, index));
                renameBtn.classList.add('gallery-rename-btn');
                const deleteBtn = createButton('', 'fas fa-trash', () => this.deleteDesign(index), true);

                actionsDiv.append(loadBtn, renameBtn, deleteBtn);
                item.append(checkbox, thumbnail, nameDiv, actionsDiv);
                grid.appendChild(item);
            });
            this.updateSelectionState();
        },
        updateSelectionState() {
            const selectedCount = DOMElements.galleryModal.grid.querySelectorAll('.gallery-item-select:checked').length;
            DOMElements.galleryModal.downloadZipBtn.disabled = selectedCount === 0;
        },
        async downloadSelectedAsZip() {
            const selectedIndices = [...DOMElements.galleryModal.grid.querySelectorAll('.gallery-item-select:checked')].map(cb => parseInt(cb.dataset.index, 10));
            if (selectedIndices.length === 0) return;

            UIManager.setButtonLoadingState(DOMElements.galleryModal.downloadZipBtn, true, 'جاري التجهيز...');
            const originalState = StateManager.getStateObject();
            const zip = new JSZip();

            try {
                for (const index of selectedIndices) {
                    const design = this.designs[index];
                    StateManager.applyState(design.state);
                    await new Promise(resolve => setTimeout(resolve, 50));

                    const frontCanvas = await ExportManager.captureElement(DOMElements.cardFront);
                    const backCanvas = await ExportManager.captureElement(DOMElements.cardBack);

                    const frontBlob = await new Promise(resolve => frontCanvas.toBlob(resolve, 'image/png'));
                    const backBlob = await new Promise(resolve => backCanvas.toBlob(resolve, 'image/png'));

                    zip.file(`${design.name}_Front.png`, frontBlob);
                    zip.file(`${design.name}_Back.png`, backBlob);
                }
                
                zip.generateAsync({ type: "blob" }).then(content => {
                    const link = document.createElement('a');
                    link.href = URL.createObjectURL(content);
                    link.download = "Business_Cards_Export.zip";
                    link.click();
                    URL.revokeObjectURL(link.href);
                });
            } catch(e) {
                console.error("ZIP export failed:", e);
                UIManager.announce("حدث خطأ أثناء تصدير الملف المضغوط.");
            } finally {
                StateManager.applyState(originalState);
                UIManager.setButtonLoadingState(DOMElements.galleryModal.downloadZipBtn, false);
            }
        }
    };
    const ShareManager = {
        // -- دالة جديدة لتحديد المسار الأساسي الصحيح للتطبيق --
        getBasePath() {
            // path will be "/elfox/nfc/index.html" or "/elfox/nfc/"
            const path = window.location.pathname; 
            // We want to get just "/elfox/nfc/"
            return path.substring(0, path.lastIndexOf('/') + 1);
        },

        async generateShareableLink() {
            UIManager.setButtonLoadingState(DOMElements.buttons.share, true, 'جاري إنشاء الرابط...');
            const state = StateManager.getStateObject();
            try {
                const response = await fetch('https://nfc-vjy6.onrender.com/api/save-design', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(state),
                });

                if (!response.ok) {
                    throw new Error('Server responded with an error');
                }

                const result = await response.json();
                if (result.success && result.id) {
                    // -- تم التعديل هنا --
                    // استخدمنا window.location.origin مع المسار الأساسي الصحيح
                    const baseUrl = window.location.origin + this.getBasePath();
                    return `${baseUrl}card/${result.id}`;
                } else {
                    throw new Error('Invalid response from server');
                }
            } catch (error) {
                console.error("Failed to create share link:", error);
                UIManager.announce('فشل إنشاء رابط المشاركة. حاول مرة أخرى.');
                return null;
            } finally {
                UIManager.setButtonLoadingState(DOMElements.buttons.share, false);
            }
        },
        
        async share() {
            const url = await this.generateShareableLink();

            if (!url) return;

            const shareData = {
                title: 'بطاقة عملي الرقمية',
                text: 'ألق نظرة على تصميم بطاقتي الجديدة!',
                url: url,
            };

            if (navigator.share) {
                try {
                    await navigator.share(shareData);
                } catch (e) {
                    console.error("Web Share API failed:", e);
                    this.showFallback(url, shareData.text);
                }
            } else {
                this.showFallback(url, shareData.text);
            }
        },

        showFallback(url, text) {
            DOMElements.shareModal.email.href = `mailto:?subject=My Business Card&body=${encodeURIComponent(text + '\n' + url)}`;
            DOMElements.shareModal.whatsapp.href = `https://api.whatsapp.com/send?text=${encodeURIComponent(text + '\n' + url)}`;
            DOMElements.shareModal.twitter.href = `https://twitter.com/intent/tweet?url=${encodeURIComponent(url)}&text=${encodeURIComponent(text)}`;
            DOMElements.shareModal.copyLink.onclick = () => {
                Utils.copyTextToClipboard(url).then(success => {
                    if (success) UIManager.announce('تم نسخ الرابط!');
                });
            };
            UIManager.showModal(DOMElements.shareModal.overlay, DOMElements.buttons.share);
        },

        async loadFromUrl() {
            const path = window.location.pathname;
            // -- تم التعديل هنا --
            // تم تعديل التعبير النمطي (regex) ليعمل داخل أي مجلد فرعي
            const match = path.match(/\/card\/([a-zA-Z0-9_-]{8})$/);

            if (match && match[1]) {
                const designId = match[1];
                try {
                    const response = await fetch(`https://nfc-vjy6.onrender.com/api/get-design/${designId}`);
                    if (!response.ok) {
                        throw new Error('Design not found or server error');
                    }
                    const state = await response.json();
                    StateManager.applyState(state, true);
                    UIManager.announce("تم تحميل التصميم من الرابط بنجاح.");
                    
                    // -- تم التعديل هنا --
                    // قم بتنظيف الرابط وإعادته إلى المسار الأساسي الصحيح للتطبيق
                    window.history.replaceState({}, document.title, this.getBasePath());
                    return true;
                } catch (e) {
                    console.error("Failed to load state from URL:", e);
                    UIManager.announce("فشل تحميل التصميم من الرابط.");
                    window.history.replaceState({}, document.title, this.getBasePath());
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
            container.addEventListener('drop', () => { if (onSortCallback) onSortCallback(); StateManager.saveDebounced(); HistoryManager.pushState(); });
        },
        bindEvents() {
            document.querySelectorAll('input, select, textarea').forEach(input => { 
                const isSlider = input.type === 'range';
                input.addEventListener(isSlider ? 'input' : 'change', HistoryManager.pushStateDebounced);
                input.addEventListener('input', () => { 
                    CardManager.updateElementFromInput(input); 
                    if (input.id.includes('phone-btn')) CardManager.updatePhoneButtonStyles(); 
                    if (input.id.startsWith('back-buttons') || input.id.startsWith('input-')) {
                        CardManager.updateBackCard();
                    }
                    if (input.id.startsWith('front-bg-') || input.id.startsWith('back-bg-')) CardManager.updateCardBackgrounds(); 
                    StateManager.saveDebounced(); 
                }); 
                input.addEventListener('focus', () => UIManager.highlightElement(input.dataset.updateTarget, true)); 
                input.addEventListener('blur', () => UIManager.highlightElement(input.dataset.updateTarget, false)); 
            });
            
            DOMElements.fileInputs.logo.addEventListener('change', e => UIManager.handleImageUpload(e, { maxSizeMB: Config.MAX_LOGO_SIZE_MB, errorEl: DOMElements.errors.logoUpload, previewEl: DOMElements.previews.logo, spinnerEl: DOMElements.spinners.logo, onSuccess: imageUrl => { document.getElementById('card-logo').src = imageUrl; document.getElementById('input-logo').value = ''; UIManager.updateFavicon(imageUrl); StateManager.saveDebounced(); HistoryManager.pushState(); } }));
            DOMElements.fileInputs.frontBg.addEventListener('change', e => UIManager.handleImageUpload(e, { maxSizeMB: Config.MAX_BG_SIZE_MB, errorEl: DOMElements.errors.logoUpload, spinnerEl: DOMElements.spinners.frontBg, onSuccess: url => { CardManager.frontBgImageUrl = url; DOMElements.buttons.removeFrontBg.style.display = 'block'; CardManager.updateCardBackgrounds(); StateManager.saveDebounced(); HistoryManager.pushState(); }}));
            DOMElements.fileInputs.backBg.addEventListener('change', e => UIManager.handleImageUpload(e, { maxSizeMB: Config.MAX_BG_SIZE_MB, errorEl: DOMElements.errors.logoUpload, spinnerEl: DOMElements.spinners.backBg, onSuccess: url => { CardManager.backBgImageUrl = url; DOMElements.buttons.removeBackBg.style.display = 'block'; CardManager.updateCardBackgrounds(); StateManager.saveDebounced(); HistoryManager.pushState(); }}));
            
            DOMElements.buttons.addPhone.addEventListener('click', () => { CardManager.createPhoneInput(); HistoryManager.pushState(); });
            DOMElements.buttons.addSocial.addEventListener('click', () => CardManager.addSocialLink());
            DOMElements.themeSelect.addEventListener('change', e => { const themeName = e.target.value; if (themeName) { CardManager.applyTheme(themeName); } });
            DOMElements.buttons.reset.addEventListener('click', () => StateManager.reset());
            DOMElements.buttons.undo.addEventListener('click', () => HistoryManager.undo());
            DOMElements.buttons.redo.addEventListener('click', () => HistoryManager.redo());
            DOMElements.layoutSelect.addEventListener('change', e => CardManager.applyLayout(e.target.value));
            DOMElements.buttons.directionToggle.addEventListener('click', UIManager.toggleDirection);

            DOMElements.cardFront.addEventListener('click', (e) => {
                const nameEl = e.target.closest('#card-name');
                const taglineEl = e.target.closest('#card-tagline');
                const logoEl = e.target.closest('#card-logo');
        
                if (nameEl) { e.preventDefault(); UIManager.navigateToAndHighlight('input-name'); return; }
                if (taglineEl) { e.preventDefault(); UIManager.navigateToAndHighlight('input-tagline'); return; }
                if (logoEl) { e.preventDefault(); UIManager.navigateToAndHighlight('logo-drop-zone'); return; }
            });

            const flipCard = () => {
                if (window.innerWidth > 1200) return;
                DOMElements.cardsWrapper.classList.toggle('is-flipped');
            }
            DOMElements.cardsWrapper.addEventListener('click', (e) => {
                const isInteractive = e.target.closest('a, button, #card-name, #card-tagline, #card-logo');
                if (isInteractive) return;
                flipCard();
            });
            DOMElements.cardsWrapper.addEventListener('keydown', (e) => {
                if(e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    flipCard();
                }
            });
            
            DOMElements.buttons.removeFrontBg.addEventListener('click', () => { CardManager.frontBgImageUrl = null; DOMElements.fileInputs.frontBg.value = ''; DOMElements.frontBgOpacity.value = 1; DOMElements.frontBgOpacity.dispatchEvent(new Event('input')); DOMElements.buttons.removeFrontBg.style.display = 'none'; CardManager.updateCardBackgrounds(); StateManager.saveDebounced(); HistoryManager.pushState(); });
            DOMElements.buttons.removeBackBg.addEventListener('click', () => { CardManager.backBgImageUrl = null; DOMElements.fileInputs.backBg.value = ''; DOMElements.backBgOpacity.value = 1; DOMElements.backBgOpacity.dispatchEvent(new Event('input')); DOMElements.buttons.removeBackBg.style.display = 'none'; CardManager.updateCardBackgrounds(); StateManager.saveDebounced(); HistoryManager.pushState(); });

            DOMElements.buttons.downloadPngFront.addEventListener('click', (e) => { ExportManager.pendingExportTarget = 'front'; UIManager.showModal(DOMElements.exportModal.overlay, e.currentTarget); });
            DOMElements.buttons.downloadPngBack.addEventListener('click', (e) => { ExportManager.pendingExportTarget = 'back'; UIManager.showModal(DOMElements.exportModal.overlay, e.currentTarget); });
            
            DOMElements.buttons.downloadPdf.addEventListener('click', e => ExportManager.downloadPdf(e.currentTarget));
            DOMElements.buttons.downloadVcf.addEventListener('click', () => ExportManager.downloadVcf());
            DOMElements.buttons.downloadQrCode.addEventListener('click', () => ExportManager.downloadQrCode());
            DOMElements.buttons.share.addEventListener('click', () => ShareManager.share());

            DOMElements.buttons.backToTop.addEventListener('click', () => {
                window.scrollTo({ top: 0, behavior: 'smooth' });
            });
    
            const handleScroll = () => {
                if (window.scrollY > 300) {
                    DOMElements.buttons.backToTop.classList.add('visible');
                } else {
                    DOMElements.buttons.backToTop.classList.remove('visible');
                }
            };
            window.addEventListener('scroll', Utils.debounce(handleScroll, 100));
            
            DOMElements.exportModal.overlay.addEventListener('click', (e) => { if (e.target === DOMElements.exportModal.overlay) UIManager.hideModal(DOMElements.exportModal.overlay); });
            DOMElements.exportModal.closeBtn.addEventListener('click', () => UIManager.hideModal(DOMElements.exportModal.overlay));
            DOMElements.exportModal.confirmBtn.addEventListener('click', () => {
                const options = {
                    format: DOMElements.exportModal.format.value,
                    quality: DOMElements.exportModal.quality.value / 100,
                    scale: parseFloat(DOMElements.exportModal.scaleContainer.querySelector('.selected').dataset.scale)
                };
                ExportManager.downloadElement(options);
            });
            DOMElements.exportModal.format.addEventListener('input', () => { DOMElements.exportModal.qualityGroup.style.display = DOMElements.exportModal.format.value === 'jpeg' ? 'block' : 'none'; });
            DOMElements.exportModal.quality.addEventListener('input', () => { DOMElements.exportModal.qualityValue.textContent = DOMElements.exportModal.quality.value; });
            DOMElements.exportModal.scaleContainer.addEventListener('click', e => {
                if (e.target.classList.contains('scale-btn')) {
                    DOMElements.exportModal.scaleContainer.querySelector('.selected').classList.remove('selected');
                    e.target.classList.add('selected');
                }
            });

            DOMElements.buttons.saveToGallery.addEventListener('click', () => GalleryManager.addCurrentDesign());
            DOMElements.buttons.showGallery.addEventListener('click', (e) => { GalleryManager.render(); UIManager.showModal(DOMElements.galleryModal.overlay, e.currentTarget); });
            DOMElements.galleryModal.closeBtn.addEventListener('click', () => UIManager.hideModal(DOMElements.galleryModal.overlay));
            DOMElements.galleryModal.selectAllBtn.addEventListener('click', () => DOMElements.galleryModal.grid.querySelectorAll('.gallery-item-select').forEach(cb => { cb.checked = true; cb.closest('.gallery-item').classList.add('selected'); GalleryManager.updateSelectionState(); }));
            DOMElements.galleryModal.deselectAllBtn.addEventListener('click', () => DOMElements.galleryModal.grid.querySelectorAll('.gallery-item-select').forEach(cb => { cb.checked = false; cb.closest('.gallery-item').classList.remove('selected'); GalleryManager.updateSelectionState(); }));
            DOMElements.galleryModal.downloadZipBtn.addEventListener('click', () => GalleryManager.downloadSelectedAsZip());
            DOMElements.galleryModal.grid.addEventListener('change', e => { if (e.target.classList.contains('gallery-item-select')) { e.target.closest('.gallery-item').classList.toggle('selected', e.target.checked); GalleryManager.updateSelectionState(); }});
            DOMElements.shareModal.closeBtn.addEventListener('click', () => UIManager.hideModal(DOMElements.shareModal.overlay));
            DOMElements.shareModal.overlay.addEventListener('click', e => { if(e.target === DOMElements.shareModal.overlay) UIManager.hideModal(DOMElements.shareModal.overlay); });
        }
    };
    const App = {
        async init() {
            Object.assign(DOMElements, {
                cardFront: document.getElementById('card-front-preview'), cardBack: document.getElementById('card-back-preview'), cardBackContent: document.getElementById('card-back-content'), phoneNumbersContainer: document.getElementById('phone-numbers-container'), phoneButtonsWrapper: document.getElementById('phone-buttons-wrapper'), 
                cardsWrapper: document.getElementById('cards-wrapper'),
                formWrapper: document.querySelector('.form-wrapper'),
                themeSelect: document.getElementById('theme-select'),
                layoutSelect: document.getElementById('layout-select'),
                liveAnnouncer: document.getElementById('live-announcer'), 
                saveToast: document.getElementById('save-toast'),
                nameInput: document.getElementById('input-name'), taglineInput: document.getElementById('input-tagline'), emailInput: document.getElementById('input-email'), websiteInput: document.getElementById('input-website'), 
                qrImageUrlInput: document.getElementById('input-qr-url'),
                qrCodeContainer: document.getElementById('qrcode-container'),
                phoneBtnBgColor: document.getElementById('phone-btn-bg-color'), phoneBtnTextColor: document.getElementById('phone-btn-text-color'), phoneBtnFontSize: document.getElementById('phone-btn-font-size'), phoneBtnFont: document.getElementById('phone-btn-font'), backButtonsBgColor: document.getElementById('back-buttons-bg-color'), backButtonsTextColor: document.getElementById('back-buttons-text-color'), backButtonsFont: document.getElementById('back-buttons-font'),
                frontBgOpacity: document.getElementById('front-bg-opacity'), backBgOpacity: document.getElementById('back-bg-opacity'),
                phoneBtnPadding: document.getElementById('phone-btn-padding'),
                backButtonsSize: document.getElementById('back-buttons-size'),
                nameColor: document.getElementById('name-color'), nameFontSize: document.getElementById('name-font-size'), nameFont: document.getElementById('name-font'),
                taglineColor: document.getElementById('tagline-color'), taglineFontSize: document.getElementById('tagline-font-size'), taglineFont: document.getElementById('tagline-font'),
                social: { type: document.getElementById('social-media-type'), input: document.getElementById('social-media-input'), container: document.getElementById('dynamic-social-links-container') },
                fileInputs: { logo: document.getElementById('input-logo-upload'), frontBg: document.getElementById('front-bg-upload'), backBg: document.getElementById('back-bg-upload') },
                previews: { logo: document.getElementById('logo-preview') }, errors: { logoUpload: document.getElementById('logo-upload-error') },
                spinners: { logo: document.getElementById('logo-spinner'), frontBg: document.getElementById('front-bg-spinner'), backBg: document.getElementById('back-bg-spinner') },
                sounds: { success: document.getElementById('audio-success'), error: document.getElementById('audio-error') },
                exportLoadingOverlay: document.getElementById('export-loading-overlay'),
                exportModal: {
                    overlay: document.getElementById('export-modal-overlay'), closeBtn: document.getElementById('export-modal-close'), confirmBtn: document.getElementById('confirm-export-btn'),
                    format: document.getElementById('export-format'), qualityGroup: document.getElementById('export-quality-group'), quality: document.getElementById('export-quality'),
                    qualityValue: document.getElementById('export-quality-value'), scaleContainer: document.querySelector('.scale-buttons')
                },
                galleryModal: {
                    overlay: document.getElementById('gallery-modal-overlay'), closeBtn: document.getElementById('gallery-modal-close'), grid: document.getElementById('gallery-grid'),
                    selectAllBtn: document.getElementById('gallery-select-all'), deselectAllBtn: document.getElementById('gallery-deselect-all'), downloadZipBtn: document.getElementById('gallery-download-zip')
                },
                shareModal: {
                    overlay: document.getElementById('share-fallback-modal-overlay'), closeBtn: document.getElementById('share-fallback-modal-close'),
                    email: document.getElementById('share-email'), whatsapp: document.getElementById('share-whatsapp'),
                    twitter: document.getElementById('share-twitter'), copyLink: document.getElementById('share-copy-link')
                },
                buttons: { addPhone: document.getElementById('add-phone-btn'), addSocial: document.getElementById('add-social-btn'), 
                    reset: document.getElementById('reset-design-btn'),
                    undo: document.getElementById('undo-btn'), redo: document.getElementById('redo-btn'),
                    saveToGallery: document.getElementById('save-to-gallery-btn'), showGallery: document.getElementById('show-gallery-btn'), share: document.getElementById('share-btn'),
                    removeFrontBg: document.getElementById('remove-front-bg-btn'), removeBackBg: document.getElementById('remove-back-bg-btn'),
                    downloadPngFront: document.getElementById('download-png-front'), downloadPngBack: document.getElementById('download-png-back'), downloadPdf: document.getElementById('download-pdf'), downloadVcf: document.getElementById('download-vcf'),
                    downloadQrCode: document.getElementById('download-qrcode'),
                    backToTop: document.getElementById('back-to-top-btn'),
                    directionToggle: document.getElementById('direction-toggle-btn')
                }
            });
            UIManager.init();
            GalleryManager.init();
            EventManager.bindEvents();
            
            const loadedFromUrl = await ShareManager.loadFromUrl();
            if (!loadedFromUrl) {
                const loadedFromStorage = StateManager.load();
                if (!loadedFromStorage) {
                    CardManager.createPhoneInput('01062071741');
                    CardManager.createPhoneInput('01555535154');
                    document.querySelectorAll('input, select, textarea').forEach(input => {
                        if (input.value) input.dispatchEvent(new Event('input', { bubbles: true }));
                    });
                    DOMElements.themeSelect.value = 'deep-sea';
                    CardManager.applyTheme('deep-sea');
                    DOMElements.layoutSelect.value = 'classic';
                    CardManager.applyLayout('classic');
                }
            }
            
            HistoryManager.init();
            UIManager.announce("محرر بطاقة الأعمال جاهز للاستخدام.");
        }
    };
    document.addEventListener('DOMContentLoaded', () => App.init());
>>>>>>> Stashed changes
})();