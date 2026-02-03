'use strict';

// Language detection for bilingual support (cached once on load)
const _isEnglishUI = document.documentElement.lang === 'en';
const isEnglishUI = () => _isEnglishUI;

// Bilingual strings for dynamic content (computed once at load)
const i18n = {
    // Common strings (direct values, not getters)
    front: _isEnglishUI ? 'Front' : 'أمامي',
    back: _isEnglishUI ? 'Back' : 'خلفي',
    newPhoneNumber: _isEnglishUI ? 'New phone number' : 'رقم هاتف جديد',
    deletePhone: _isEnglishUI ? 'Delete phone number' : 'حذف رقم الهاتف',
    finePosition: _isEnglishUI ? 'Fine position (pixels)' : 'تحريك دقيق (بالبكسل)',
    up: _isEnglishUI ? 'Up' : 'للأعلى',
    down: _isEnglishUI ? 'Down' : 'للأسفل',
    left: _isEnglishUI ? 'Left' : 'لليسار',
    right: _isEnglishUI ? 'Right' : 'لليمين',
    copyNumber: _isEnglishUI ? 'Copy number' : 'نسخ الرقم',
    copyLink: _isEnglishUI ? 'Copy link' : 'نسخ الرابط',
    numberCopied: _isEnglishUI ? 'Number copied!' : 'تم نسخ الرقم!',
    linkCopied: _isEnglishUI ? 'Link copied!' : 'تم نسخ الرابط!',
    saving: _isEnglishUI ? 'Saving...' : 'جاري الحفظ...',
    generating: _isEnglishUI ? 'Generating...' : 'جاري الإنشاء...',
    qrGenerated: _isEnglishUI ? 'QR Code generated successfully.' : 'تم إنشاء QR Code بنجاح.',
    qrError: _isEnglishUI ? 'Error generating QR Code.' : 'حدث خطأ أثناء إنشاء QR Code.',
    saveFailed: _isEnglishUI ? 'Failed to save design.' : 'فشل حفظ التصميم اللازم لإنشاء الرابط.',
    // Social link strings
    enterLinkOrId: _isEnglishUI ? 'Enter link or username here' : 'أدخل الرابط أو المعرف هنا',
    deleteLink: (name) => _isEnglishUI ? `Delete ${name} link` : `حذف رابط ${name}`,
    customStyles: _isEnglishUI ? 'Custom styles (for text)' : 'تنسيقات خاصة (للنص)',
    fontColor: _isEnglishUI ? 'Font Color' : 'لون الخط',
    fontSize: _isEnglishUI ? 'Font Size' : 'حجم الخط',
};

const DragManager = {
    init() {
        const draggableSelectors = ['#card-logo', '#card-personal-photo-wrapper', '#card-name', '#card-tagline', '#qr-code-wrapper'];
        draggableSelectors.forEach(selector => this.makeDraggable(selector));
        this.makeDraggable('.draggable-icon', { clone: true });
        this.setupDropzones();
    },
    makeDraggable(selector, options = {}) {
        const interactable = interact(selector);

        if (options.clone) {
            interactable.draggable({
                inertia: true,
                listeners: {
                    start(event) {
                        const original = event.target;
                        original.classList.add('dragging');
                    },
                    move: this.dragMoveListener,
                    end(event) {
                        event.target.classList.remove('dragging');
                        event.target.style.transform = 'translate(0px, 0px)';
                        event.target.setAttribute('data-x', '0');
                        event.target.setAttribute('data-y', '0');
                    },
                },
            });
        } else {
            interactable.draggable({
                inertia: true,
                modifiers: [interact.modifiers.restrictRect({ restriction: 'parent', endOnly: true })],
                autoScroll: false,
                listeners: {
                    start: this.dragStartListener,
                    move: this.dragMoveListener,
                    end: this.dragEndListener
                }
            });
        }
    },
    setupDropzones() {
        if (typeof MobileUtils !== 'undefined' && MobileUtils.isMobile()) return;

        interact('.card-content-layer').dropzone({
            accept: '.draggable-on-card, .draggable-icon',
            overlap: 0.5,
            ondrop: (event) => {
                const droppedElement = event.relatedTarget;
                const dropzone = event.target;

                if (droppedElement.classList.contains('draggable-icon')) {
                    const platform = droppedElement.dataset.platform;
                    if (platform) {
                        if (Config.STATIC_CONTACT_METHODS.some(m => m.id === platform)) {
                            const input = document.getElementById(`input-${platform}`);
                            if (input && !input.value) {
                                input.focus();
                                UIManager.announce(`تمت إضافة ${platform}. أدخل البيانات.`);
                            } else if (!input) {
                                CardManager.addSocialLink(platform);
                            }
                        } else {
                            CardManager.addSocialLink(platform);
                        }
                        UIManager.announce(`اسحب العنصر الجديد لتغيير مكانه.`);
                    }
                    return;
                }

                const newPlacement = dropzone.classList.contains('card-front-content-layer') ? 'front' : 'back';

                const placementMap = {
                    'card-logo': 'logo',
                    'card-personal-photo-wrapper': 'photo',
                    'card-name': 'name',
                    'card-tagline': 'tagline',
                    'qr-code-wrapper': 'qr'
                };

                let controlName = placementMap[droppedElement.id];
                let radioToSelect;

                if (controlName) {
                    radioToSelect = document.querySelector(`input[name="placement-${controlName}"][value="${newPlacement}"]`);
                } else if (droppedElement.classList.contains('phone-button-draggable-wrapper')) {
                    const phoneId = droppedElement.id;
                    radioToSelect = document.querySelector(`#phone-control-${phoneId} input[name="placement-${phoneId}"][value="${newPlacement}"]`);
                } else if (droppedElement.classList.contains('draggable-social-link')) {
                    const controlId = droppedElement.dataset.controlId;
                    const controlElement = document.getElementById(controlId);
                    if (controlElement) {
                        const radioName = controlElement.querySelector('input[type="radio"]')?.name;
                        if (radioName) {
                            radioToSelect = controlElement.querySelector(`input[name="${radioName}"][value="${newPlacement}"]`);
                        }
                    }
                }

                if (radioToSelect && !radioToSelect.checked) {
                    radioToSelect.checked = true;

                    droppedElement.style.transform = 'translate(0px, 0px)';
                    droppedElement.setAttribute('data-x', '0');
                    droppedElement.setAttribute('data-y', '0');

                    CardManager.renderCardContent();
                }
            },
            ondragenter: (event) => event.target.classList.add('drop-target-active'),
            ondragleave: (event) => event.target.classList.remove('drop-target-active'),
            ondropdeactivate: (event) => event.target.classList.remove('drop-target-active')
        });
    },
    dragStartListener(event) {
        event.target.classList.add('dragging');
    },
    dragMoveListener(event) {
        const target = event.target;
        const x = (parseFloat(target.getAttribute('data-x')) || 0) + event.dx;
        const y = (parseFloat(target.getAttribute('data-y')) || 0) + event.dy;
        target.style.transform = `translate(${x}px, ${y}px)`;
        target.setAttribute('data-x', x);
        target.setAttribute('data-y', y);
    },
    dragEndListener(event) {
        event.target.classList.remove('dragging');
        StateManager.saveDebounced();
    }
};

const CardManager = {
    frontBgImageUrl: null, backBgImageUrl: null, qrCodeImageUrl: null, personalPhotoUrl: null,
    autoGeneratedQrDataUrl: null,
    updateElementFromInput(input) {
        const { updateTarget, updateProperty, updateUnit = '' } = input.dataset;
        if (!updateTarget || !updateProperty) return;
        const targetElement = document.getElementById(updateTarget);
        if (!targetElement) return;
        const properties = updateProperty.split('.');
        let current = targetElement;
        for (let i = 0; i < properties.length - 1; i++) { current = current[properties[i]]; }
        current[properties[properties.length - 1]] = input.value + updateUnit;
    },

    updateCardForLanguageChange(lang) {
        const nameInput = document.getElementById(`input-name_${lang}`);
        const taglineInput = document.getElementById(`input-tagline_${lang}`);

        DOMElements.draggable.name.innerText = nameInput ? nameInput.value : '';
        DOMElements.draggable.tagline.innerText = taglineInput ? taglineInput.value : '';

        const dir = lang === 'ar' ? 'rtl' : 'ltr';
        DOMElements.draggable.name.dir = dir;
        DOMElements.draggable.tagline.dir = dir;
    },

    updateLogoAlignment() {
        const alignValue = document.querySelector('input[name="logo-align"]:checked')?.value || 'center';
        const logoContainer = DOMElements.draggable.logo;
        if (logoContainer) {
            logoContainer.style.justifyContent = alignValue;
        }
    },

    updateLogoBackground() {
        const bgColor = document.getElementById('logo-bg-color').value;
        const logoImg = document.getElementById('card-logo-img');
        if (logoImg) {
            logoImg.style.backgroundColor = bgColor;
        }
    },

    updateLogoShadow() {
        const enabled = document.getElementById('logo-shadow-enabled').checked;
        const controls = document.getElementById('logo-shadow-controls');
        const logoImg = document.getElementById('card-logo-img');

        if (controls) controls.style.display = enabled ? 'grid' : 'none';
        if (!logoImg) return;

        if (enabled) {
            const color = document.getElementById('logo-shadow-color').value;
            const blur = document.getElementById('logo-shadow-blur').value;
            logoImg.style.filter = `drop-shadow(0 4px ${blur}px ${color})`;
        } else {
            logoImg.style.filter = 'none';
        }
    },

    updatePersonalPhotoAlignment() {
        const alignValue = document.querySelector('input[name="photo-align"]:checked')?.value || 'center';
        const photoContainer = DOMElements.draggable.photo;
        if (photoContainer) {
            if (alignValue === 'flex-start') {
                photoContainer.style.marginRight = 'auto';
                photoContainer.style.marginLeft = '0';
            } else if (alignValue === 'flex-end') {
                photoContainer.style.marginRight = '0';
                photoContainer.style.marginLeft = 'auto';
            } else { // center
                photoContainer.style.marginRight = 'auto';
                photoContainer.style.marginLeft = 'auto';
            }
        }
    },

    updatePersonalPhotoShadow() {
        const enabled = document.getElementById('photo-shadow-enabled').checked;
        const controls = document.getElementById('photo-shadow-controls');
        const wrapper = DOMElements.draggable.photo;

        if (controls) controls.style.display = enabled ? 'grid' : 'none';
        if (!wrapper) return;

        if (enabled) {
            const color = document.getElementById('photo-shadow-color').value;
            const blur = document.getElementById('photo-shadow-blur').value;
            wrapper.style.boxShadow = `0 4px ${blur}px ${color}`;
        } else {
            wrapper.style.boxShadow = '';
        }
    },

    updatePersonalPhotoStyles() {
        const wrapper = DOMElements.draggable.photo;
        const preview = DOMElements.previews.photo;
        if (!wrapper) return;

        const imageUrl = DOMElements.photoControls.url.value;
        const size = document.getElementById('photo-size').value;
        const shape = document.querySelector('input[name="photo-shape"]:checked').value;
        const borderColor = DOMElements.photoControls.borderColor.value;
        const borderWidth = DOMElements.photoControls.borderWidth.value;
        const opacity = document.getElementById('photo-opacity').value;

        const safeUrl = (typeof sanitizeURL === 'function') ? sanitizeURL(imageUrl) : imageUrl;

        wrapper.style.width = `${size}%`;
        wrapper.style.paddingBottom = `${size}%`;
        wrapper.style.height = 0;
        wrapper.style.borderRadius = shape === 'circle' ? '50%' : '8px';
        wrapper.style.border = `${borderWidth}px solid ${borderColor}`;
        wrapper.style.backgroundImage = safeUrl ? `url(${safeUrl})` : 'none';
        wrapper.style.display = safeUrl ? 'block' : 'none';
        wrapper.style.opacity = opacity;

        if (preview) {
            preview.style.display = safeUrl ? 'block' : 'none';
            if (safeUrl) {
                preview.src = safeUrl;
            }
            preview.style.borderRadius = shape === 'circle' ? '50%' : '8px';
        }

        this.updatePersonalPhotoAlignment();
        this.updatePersonalPhotoShadow();
    },

    updatePhoneButtonStyles() {
        const bgColor = DOMElements.phoneBtnBgColor.value; const textColor = DOMElements.phoneBtnTextColor.value; const fontSize = DOMElements.phoneBtnFontSize.value; const fontFamily = DOMElements.phoneBtnFont.value; const padding = DOMElements.phoneBtnPadding.value;
        document.querySelectorAll('.phone-button').forEach(button => { button.style.backgroundColor = bgColor; button.style.color = textColor; button.style.borderColor = (bgColor === 'transparent' || bgColor.includes('rgba(0,0,0,0)')) ? textColor : 'transparent'; button.style.fontSize = `${fontSize}px`; button.style.fontFamily = fontFamily; button.style.padding = `${padding}px ${padding * 2}px`; });
    },
    updatePhoneButtonsVisibility() {
        const isVisible = DOMElements.buttons.togglePhone.checked;
        document.querySelectorAll('.phone-button-draggable-wrapper').forEach(wrapper => {
            wrapper.classList.toggle('text-only-mode', !isVisible);
        });
        DOMElements.phoneTextControls.container.classList.toggle('visible', !isVisible);
    },

    updatePhoneTextStyles() {
        const layout = document.querySelector('input[name="phone-text-layout"]:checked').value; const size = DOMElements.phoneTextControls.size.value; const color = DOMElements.phoneTextControls.color.value; const font = DOMElements.phoneTextControls.font.value;
        document.querySelectorAll('.phone-button-draggable-wrapper').forEach(wrapper => {
            wrapper.dataset.layout = layout;
            const button = wrapper.querySelector('.phone-button');
            if (button) {
                button.style.fontSize = `${size}px`; button.style.color = color; button.style.fontFamily = font;
            }
        });
    },

    renderPhoneButtons() {
        document.querySelectorAll('.phone-button-draggable-wrapper').forEach(el => el.remove());

        const state = StateManager.getStateObject();
        const phoneState = state.dynamic.phones || [];

        DOMElements.phoneNumbersContainer.querySelectorAll('.dynamic-input-group').forEach((group) => {
            const phoneId = group.dataset.phoneId;
            const phoneData = phoneState.find(p => p.id === phoneId);
            if (!phoneData || !phoneData.value) return;

            const placement = phoneData.placement || 'front';
            const parentContainer = placement === 'front' ? DOMElements.cardFrontContent : DOMElements.cardBackContent;

            const pos = phoneData.position || { x: 0, y: 0 };

            const wrapper = document.createElement('div');
            wrapper.id = phoneId;
            wrapper.className = 'phone-button-draggable-wrapper draggable-on-card';
            wrapper.dataset.controlId = group.id;
            wrapper.style.position = 'absolute';
            wrapper.style.transform = `translate(${pos.x}px, ${pos.y}px)`;
            wrapper.setAttribute('data-x', pos.x);
            wrapper.setAttribute('data-y', pos.y);

            const phoneLink = document.createElement('a');
            phoneLink.href = `tel:${phoneData.value.replace(/[^0-9+]/g, '')}`;
            phoneLink.className = 'phone-button';

            phoneLink.innerHTML = `
                <i class="fas fa-phone-alt" aria-hidden="true"></i>
                <span>${phoneData.value.replace(/</g, "&lt;").replace(/>/g, "&gt;")}</span>
                <button class="copy-btn no-export" title="نسخ الرقم" aria-label="نسخ الرقم ${phoneData.value.replace(/</g, "&lt;").replace(/>/g, "&gt;")}"><i class="fas fa-copy" aria-hidden="true"></i></button>
            `;

            phoneLink.querySelector('.copy-btn').addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                if (typeof Utils.copyTextToClipboard === 'function') {
                    Utils.copyTextToClipboard(phoneData.value).then(success => { if (success) UIManager.announce('تم نسخ الرقم!'); });
                }
            });

            phoneLink.addEventListener('click', (e) => { e.preventDefault(); UIManager.navigateToAndHighlight(wrapper.dataset.controlId); });

            wrapper.appendChild(phoneLink);

            const hint = document.createElement('i');
            hint.className = 'fas fa-arrows-alt dnd-hover-hint';
            wrapper.appendChild(hint);

            parentContainer.appendChild(wrapper);
            DragManager.makeDraggable(`#${phoneId}`);
        });

        this.updatePhoneButtonStyles();
        this.updatePhoneButtonsVisibility();
        this.updatePhoneTextStyles();
    },

    createPhoneInput(phoneData = {}) {
        const { id = `phone_${Date.now()}`, value = '', placement = 'front' } = phoneData;

        const inputGroup = document.createElement('div');
        inputGroup.className = 'dynamic-input-group';
        inputGroup.id = `phone-control-${id}`;
        inputGroup.dataset.phoneId = id;

        inputGroup.innerHTML = `
            <div style="flex-grow: 1;">
                <div style="display: flex; align-items: center; gap: 10px;">
                    <i class="fas fa-grip-vertical drag-handle" aria-hidden="true"></i>
                    <input type="tel" value="${value.replace(/"/g, "&quot;")}" placeholder="${i18n.newPhoneNumber}" style="flex-grow: 1;">
                    <button class="remove-btn" aria-label="${i18n.deletePhone}">×</button>
                </div>
                <div class="placement-control">
                    <div class="radio-group">
                        <label><input type="radio" name="placement-${id}" value="front" ${placement === 'front' ? 'checked' : ''}> ${i18n.front}</label>
                        <label><input type="radio" name="placement-${id}" value="back" ${placement === 'back' ? 'checked' : ''}> ${i18n.back}</label>
                    </div>
                </div>
                <div class="form-group">
                    <label>${i18n.finePosition}</label>
                    <div class="position-controls-grid" data-target-id="${id}">
                        <button type="button" class="btn-icon move-btn" data-direction="up" title="${i18n.up}"><i class="fas fa-arrow-up"></i></button>
                        <div class="controls-row">
                            <button type="button" class="btn-icon move-btn" data-direction="left" title="${i18n.left}"><i class="fas fa-arrow-left"></i></button>
                            <button type="button" class="btn-icon move-btn" data-direction="right" title="${i18n.right}"><i class="fas fa-arrow-right"></i></button>
                        </div>
                        <button type="button" class="btn-icon move-btn" data-direction="down" title="${i18n.down}"><i class="fas fa-arrow-down"></i></button>
                    </div>
                </div>
            </div>
        `;

        const handleUpdate = () => {
            this.renderPhoneButtons();
        };
        inputGroup.querySelector('.remove-btn').onclick = () => { inputGroup.remove(); handleUpdate(); };
        inputGroup.querySelector('input[type="tel"]').addEventListener('input', () => { handleUpdate(); CardManager.generateVCardQrDebounced(); });
        inputGroup.querySelectorAll('input[type="radio"]').forEach(radio => radio.addEventListener('change', handleUpdate));

        inputGroup.querySelectorAll('.move-btn').forEach(button => {
            button.addEventListener('click', (e) => {
                e.preventDefault();
                EventManager.moveElement(id, button.dataset.direction);
            });
        });

        DOMElements.phoneNumbersContainer.appendChild(inputGroup);
    },

    updateCardBackgrounds() {
        const setBg = (imageLayer, gradientLayer, startId, endId, image, opacityId) => {
            if (!imageLayer || !gradientLayer) return;
            const startColor = document.getElementById(startId).value;
            const endColor = document.getElementById(endId).value;

            let opacity = document.getElementById(opacityId).value;
            const opacityControl = document.getElementById(opacityId).closest('.form-group');

            if (!image) {
                opacity = 1;
                if (opacityControl) opacityControl.style.display = 'none';
            } else {
                if (opacityControl) opacityControl.style.display = 'block';
            }

            const safeBg = (typeof sanitizeURL === 'function' && image) ? sanitizeURL(image) : image;
            imageLayer.style.backgroundImage = safeBg ? `url(${safeBg})` : 'none';

            gradientLayer.style.backgroundImage = `linear-gradient(135deg, ${startColor}, ${endColor})`;
            gradientLayer.style.opacity = opacity;
        };

        setBg(
            document.getElementById('front-bg-image-layer'),
            document.getElementById('front-bg-gradient-layer'),
            'front-bg-start', 'front-bg-end', this.frontBgImageUrl, 'front-bg-opacity'
        );
        setBg(
            document.getElementById('back-bg-image-layer'),
            document.getElementById('back-bg-gradient-layer'),
            'back-bg-start', 'back-bg-end', this.backBgImageUrl, 'back-bg-opacity'
        );
    },

    renderCardContent() {
        const state = StateManager.getStateObject();
        if (!state || !state.placements) return;

        const containers = { front: DOMElements.cardFrontContent, back: DOMElements.cardBackContent };
        const elements = {
            logo: DOMElements.draggable.logo,
            photo: DOMElements.draggable.photo,
            name: DOMElements.draggable.name,
            tagline: DOMElements.draggable.tagline,
            qr: DOMElements.draggable.qr
        };

        Object.values(elements).forEach(el => el.parentNode?.removeChild(el));

        for (const [key, side] of Object.entries(state.placements)) {
            if (elements[key] && containers[side]) {
                elements[key].style.position = 'absolute';
                containers[side].appendChild(elements[key]);
            }
        }

        this.updateCardForLanguageChange(state.currentLanguage || 'ar');

        this.updatePersonalPhotoStyles();
        this.renderPhoneButtons();
        this.updateSocialLinks();
    },

    updateQrCodeDisplay() {
        const qrSourceRadio = document.querySelector('input[name="qr-source"]:checked');
        if (!qrSourceRadio) return;

        const qrSource = qrSourceRadio.value;
        const qrWrapper = DOMElements.draggable.qr;
        qrWrapper.innerHTML = '';

        let qrImage = '';

        if (qrSource === 'custom') {
            qrImage = DOMElements.qrImageUrlInput.value;
        } else if (qrSource === 'upload') {
            qrImage = this.qrCodeImageUrl;
        } else if (qrSource === 'auto-card' || qrSource === 'auto-vcard') {
            qrImage = this.autoGeneratedQrDataUrl;
        }

        if (qrImage) {
            const safeUrl = (typeof sanitizeURL === 'function') ? sanitizeURL(qrImage) : qrImage;

            if (safeUrl) {
                const img = document.createElement('img');
                img.src = safeUrl;
                img.alt = 'QR Code';
                Object.assign(img.style, {
                    width: '100%', height: '100%', borderRadius: '4px', objectFit: 'contain'
                });
                qrWrapper.appendChild(img);
            }
        }

        const hint = document.createElement('i');
        hint.className = 'fas fa-arrows-alt dnd-hover-hint';
        qrWrapper.appendChild(hint);

        qrWrapper.style.width = `${DOMElements.qrSizeSlider.value}%`;
    },

    handleMasterSocialToggle() {
        const isEnabled = DOMElements.buttons.toggleMasterSocial ? DOMElements.buttons.toggleMasterSocial.checked : true;
        if (DOMElements.socialControlsWrapper) {
            DOMElements.socialControlsWrapper.style.display = isEnabled ? 'block' : 'none';
        }
        this.updateSocialLinks();
    },

    updateSocialLinksVisibility() {
        const isVisibleAsButtons = DOMElements.buttons.toggleSocial.checked;
        DOMElements.socialTextControls.container.classList.toggle('visible', !isVisibleAsButtons);
        document.querySelectorAll('.draggable-social-link').forEach(wrapper => {
            wrapper.classList.toggle('text-only-mode', !isVisibleAsButtons);
        });
    },

    updateSocialButtonStyles() {
        const backButtonBgColor = DOMElements.backButtonsBgColor.value;
        const backButtonTextColor = DOMElements.backButtonsTextColor.value;
        const backButtonFont = DOMElements.backButtonsFont.value;
        const backButtonSize = DOMElements.backButtonsSize.value;

        document.querySelectorAll('.draggable-social-link:not(.text-only-mode) a').forEach(link => {
            Object.assign(link.style, {
                backgroundColor: backButtonBgColor,
                color: backButtonTextColor,
                fontFamily: backButtonFont,
                fontSize: `${backButtonSize}px`,
                padding: `${backButtonSize * 0.5}px ${backButtonSize}px`,
            });
            const icon = link.querySelector('i');
            const span = link.querySelector('span');
            if (icon) icon.style.color = '';
            if (span) { span.style.color = ''; span.style.fontSize = ''; span.style.fontFamily = ''; }
        });
    },

    updateSocialTextStyles() {
        const generalSize = DOMElements.socialTextControls.size.value;
        const generalColor = DOMElements.socialTextControls.color.value;
        const generalFont = DOMElements.socialTextControls.font.value;

        document.querySelectorAll('.draggable-social-link.text-only-mode').forEach(wrapper => {
            const link = wrapper.querySelector('a');
            if (!link) return;

            const icon = link.querySelector('i');
            const span = link.querySelector('span');
            const controlId = wrapper.dataset.controlId;

            let specificColor = null;
            let specificSize = null;

            if (controlId && controlId.startsWith('form-group-static-')) {
                const type = controlId.replace('form-group-static-', '');
                specificColor = document.getElementById(`input-static-${type}-color`)?.value;
                specificSize = document.getElementById(`input-static-${type}-size`)?.value;
            } else if (controlId && controlId.startsWith('social-control-dynsocial_')) {
                const id = controlId.replace('social-control-', '');
                specificColor = document.getElementById(`input-${id}-color`)?.value;
                specificSize = document.getElementById(`input-${id}-size`)?.value;
            }

            const finalColor = (specificColor && specificColor !== '#e6f0f7') ? specificColor : generalColor;
            const finalSize = (specificSize && specificSize !== '12') ? specificSize : generalSize;

            Object.assign(link.style, { color: finalColor, backgroundColor: 'transparent', padding: '2px', fontSize: '', fontFamily: '' });
            if (icon) icon.style.color = finalColor;
            if (span) { span.style.fontSize = `${finalSize}px`; span.style.color = finalColor; span.style.fontFamily = generalFont; }
        });
    },

    updateSocialLinks() {
        document.querySelectorAll('.draggable-social-link').forEach(el => el.remove());

        const isMasterEnabled = DOMElements.buttons.toggleMasterSocial ? DOMElements.buttons.toggleMasterSocial.checked : true;
        if (!isMasterEnabled) return;

        const state = StateManager.getStateObject();
        if (!state) return;

        const renderLink = (linkData) => {
            const { id, value, placement, platform, controlId, position } = linkData;
            if (!value) return;

            const parentContainer = placement === 'front' ? DOMElements.cardFrontContent : DOMElements.cardBackContent;
            const elementId = id.startsWith('static-') ? `social-link-${id}` : `social-link-${id.replace(/[^a-zA-Z0-9-]/g, '-')}`;

            const pos = position || { x: 0, y: 0 };

            const linkWrapper = document.createElement('div');
            linkWrapper.id = elementId;
            linkWrapper.className = 'draggable-social-link draggable-on-card';
            linkWrapper.dataset.controlId = controlId;
            linkWrapper.style.position = 'absolute';
            linkWrapper.style.transform = `translate(${pos.x}px, ${pos.y}px)`;
            linkWrapper.setAttribute('data-x', pos.x);
            linkWrapper.setAttribute('data-y', pos.y);

            let fullUrl = value, displayText = value;
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

            const safeUrl = (typeof sanitizeURL === 'function') ? sanitizeURL(fullUrl) : fullUrl;

            const sanitizedDisplayText = displayText.replace(/</g, "&lt;").replace(/>/g, "&gt;");

            const linkElement = document.createElement('a');
            linkElement.href = safeUrl || '#';
            linkElement.target = '_blank';
            linkElement.rel = 'noopener noreferrer';
            linkElement.innerHTML = `
                <i class="${platform.icon}" aria-hidden="true"></i>
                <span>${sanitizedDisplayText}</span>
                <button class="copy-btn no-export" title="نسخ الرابط" aria-label="نسخ الرابط ${sanitizedDisplayText}"><i class="fas fa-copy" aria-hidden="true"></i></button>
            `;

            linkWrapper.appendChild(linkElement);

            const hint = document.createElement('i');
            hint.className = 'fas fa-arrows-alt dnd-hover-hint';
            linkWrapper.appendChild(hint);

            linkElement.querySelector('.copy-btn').addEventListener('click', (e) => {
                e.preventDefault(); e.stopPropagation();
                if (typeof Utils.copyTextToClipboard === 'function') {
                    Utils.copyTextToClipboard(fullUrl).then(success => { if (success) UIManager.announce('تم نسخ الرابط!'); });
                }
            });

            linkElement.addEventListener('click', (e) => {
                if (!e.metaKey && !e.ctrlKey) {
                    e.preventDefault();
                    UIManager.navigateToAndHighlight(controlId);
                }
            });

            parentContainer.appendChild(linkWrapper);
            DragManager.makeDraggable(`#${elementId}`);
        };

        if (state.dynamic.staticSocial) {
            Config.STATIC_CONTACT_METHODS.forEach(method => {
                const socialState = state.dynamic.staticSocial[method.id];
                if (socialState && socialState.value) {
                    renderLink({
                        id: `static-${method.id}`,
                        value: socialState.value,
                        placement: socialState.placement,
                        position: socialState.position,
                        platform: method,
                        controlId: `form-group-static-${method.id}`
                    });
                }
            });
        }

        if (state.dynamic.social) {
            state.dynamic.social.forEach((link, index) => {
                if (link.platform && link.value && Config.SOCIAL_PLATFORMS[link.platform]) {
                    renderLink({
                        id: link.id || `dynamic-${link.platform}-${index}`,
                        value: link.value,
                        placement: link.placement,
                        position: link.position,
                        platform: Config.SOCIAL_PLATFORMS[link.platform],
                        controlId: link.id ? `social-control-${link.id}` : `social-media-input`
                    });
                }
            });
        }

        this.updateSocialLinksVisibility();
        this.updateSocialButtonStyles();
        this.updateSocialTextStyles();
    },

    async generateVCardQr() {
        const qrSource = document.querySelector('input[name="qr-source"]:checked')?.value;
        if (qrSource !== 'auto-vcard') return;

        const vCardData = ExportManager.getVCardString();
        if (vCardData.length < 30) {
            this.autoGeneratedQrDataUrl = null;
            this.updateQrCodeDisplay();
            return;
        }

        try {
            await Utils.loadScript(Config.SCRIPT_URLS.qrCodeStyling);

            const currentLogo = DOMElements.draggable.logoImg.src;
            const isDefaultLogo = currentLogo.includes('mcprime-logo-transparent.png');

            const safeLogo = (typeof sanitizeURL === 'function') ? sanitizeURL(currentLogo) : currentLogo;

            const isUseLogoChecked = document.getElementById('qr-use-logo').checked;
            const dotsColor = document.getElementById('qr-dots-color').value || "#000000";
            const bgColor = document.getElementById('qr-bg-color').value || "#ffffff";
            const dotsType = document.getElementById('qr-dots-type').value || "rounded";
            const cornersType = document.getElementById('qr-corners-type').value || "extra-rounded";

            const qrCode = new QRCodeStyling({
                width: 300,
                height: 300,
                data: vCardData,
                image: (isDefaultLogo || !isUseLogoChecked) ? null : safeLogo,
                dotsOptions: {
                    color: dotsColor,
                    type: dotsType
                },
                backgroundOptions: {
                    color: bgColor,
                },
                imageOptions: {
                    crossOrigin: "anonymous",
                    margin: 10,
                    imageSize: 0.4
                },
                cornersSquareOptions: {
                    type: cornersType,
                    color: dotsColor
                }
            });

            const container = DOMElements.qrCodeTempGenerator;
            container.innerHTML = '';

            await qrCode.append(container);

            setTimeout(() => {
                const canvas = container.querySelector('canvas');
                if (canvas) {
                    this.autoGeneratedQrDataUrl = canvas.toDataURL();
                    this.updateQrCodeDisplay();
                }
                container.innerHTML = '';
            }, 100);

        } catch (error) {
            console.error("Failed to generate Styled QR code:", error);
        }
    },

    async generateCardLinkQr() {
        const button = DOMElements.buttons.generateAutoQr;
        UIManager.setButtonLoadingState(button, true, 'جاري الحفظ...');
        try {
            await Utils.loadScript(Config.SCRIPT_URLS.qrCodeStyling);
            const designId = await ShareManager.saveDesign();
            if (!designId) {
                alert('فشل حفظ التصميم اللازم لإنشاء الرابط.');
                return;
            }

            UIManager.setButtonLoadingState(button, true, 'جاري الإنشاء...');
            const viewerUrl = new URL('viewer.html', window.location.href);
            viewerUrl.searchParams.set('id', designId);
            const finalUrl = viewerUrl.href;

            const currentLogo = DOMElements.draggable.logoImg.src;
            const isDefaultLogo = currentLogo.includes('mcprime-logo-transparent.png');
            const safeLogo = (typeof sanitizeURL === 'function') ? sanitizeURL(currentLogo) : currentLogo;

            const isUseLogoChecked = document.getElementById('qr-use-logo').checked;
            const dotsColor = document.getElementById('qr-dots-color').value || "#000000";
            const bgColor = document.getElementById('qr-bg-color').value || "#ffffff";
            const dotsType = document.getElementById('qr-dots-type').value || "rounded";
            const cornersType = document.getElementById('qr-corners-type').value || "extra-rounded";

            const qrCode = new QRCodeStyling({
                width: 300,
                height: 300,
                data: finalUrl,
                image: (isDefaultLogo || !isUseLogoChecked) ? null : safeLogo,
                dotsOptions: {
                    color: dotsColor,
                    type: dotsType
                },
                backgroundOptions: {
                    color: bgColor,
                },
                imageOptions: {
                    crossOrigin: "anonymous",
                    margin: 10,
                    imageSize: 0.4
                },
                cornersSquareOptions: {
                    type: cornersType,
                    color: dotsColor // Using same color for corners for simplicity
                }
            });

            const container = DOMElements.qrCodeTempGenerator;
            container.innerHTML = '';
            await qrCode.append(container);

            setTimeout(() => {
                const canvas = container.querySelector('canvas');
                if (canvas) {
                    this.autoGeneratedQrDataUrl = canvas.toDataURL();
                    this.updateQrCodeDisplay();
                    UIManager.announce("تم إنشاء QR Code بنجاح.");
                } else {
                    alert("حدث خطأ أثناء إنشاء QR Code.");
                }
                container.innerHTML = '';
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
            if (control) {
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
    },
    addSocialLink(platformKey = null) {
        if (!platformKey) {
            platformKey = DOMElements.social.typeSelect.value;
        }

        const value = platformKey ? '' : DOMElements.social.input.value.trim();
        if (!platformKey && !value) { UIManager.announce('الرجاء إدخال رابط أو معرف.'); return; }

        const allPlatforms = {
            ...Config.SOCIAL_PLATFORMS,
            'email': { name: 'بريد إلكتروني', icon: 'fas fa-envelope' },
            'website': { name: 'موقع ويب', icon: 'fas fa-globe' },
            'whatsapp': { name: 'واتساب', icon: 'fab fa-whatsapp' },
            'facebook': { name: 'فيسبوك', icon: 'fab fa-facebook-f' },
            'linkedin': { name: 'لينكدإن', icon: 'fab fa-linkedin-in' },
        };
        const platform = allPlatforms[platformKey];
        if (!platform) return;

        const id = `dynsocial_${Date.now()}`;

        const linkEl = document.createElement('div');
        linkEl.className = 'dynamic-input-group dynamic-social-link';
        linkEl.id = `social-control-${id}`;
        linkEl.dataset.socialId = id;
        linkEl.dataset.platform = platformKey;

        const elementId = `social-link-${id.replace(/[^a-zA-Z0-9-]/g, '-')}`;

        const platformName = isEnglishUI() ? (platform.nameEn || platform.name) : platform.name;

        linkEl.innerHTML = `
            <div style="flex-grow: 1;">
                <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 10px;">
                    <i class="fas fa-grip-vertical drag-handle"></i>
                    <i class="${platform.icon}" aria-hidden="true"></i>
                    <input type="text" class="dynamic-social-value-input" value="${value.replace(/"/g, "&quot;")}" placeholder="${i18n.enterLinkOrId}" style="flex-grow: 1;">
                    <button class="remove-btn" aria-label="${i18n.deleteLink(platformName)}">×</button>
                </div>
                <div class="placement-control">
                    <div class="radio-group">
                        <label><input type="radio" name="placement-${id}" value="front"> ${i18n.front}</label>
                        <label><input type="radio" name="placement-${id}" value="back" checked> ${i18n.back}</label>
                    </div>
                </div>
                <div class="form-group">
                    <label>${i18n.finePosition}</label>
                    <div class="position-controls-grid" data-target-id="${elementId}"> 
                        <button type="button" class="btn-icon move-btn" data-direction="up" title="${i18n.up}"><i class="fas fa-arrow-up"></i></button>
                        <div class="controls-row">
                            <button type="button" class="btn-icon move-btn" data-direction="left" title="${i18n.left}"><i class="fas fa-arrow-left"></i></button>
                            <button type="button" class="btn-icon move-btn" data-direction="right" title="${i18n.right}"><i class="fas fa-arrow-right"></i></button>
                        </div>
                        <button type="button" class="btn-icon move-btn" data-direction="down" title="${i18n.down}"><i class="fas fa-arrow-down"></i></button>
                    </div>
                </div>
                <details class="fieldset-accordion" style="background-color: var(--page-bg);">
                    <summary style="padding: 8px 12px; font-size: 0.9rem;">${i18n.customStyles}</summary>
                    <div class="fieldset-content" style="padding: 10px;">
                        <div class="control-grid">
                            <div class="form-group">
                                <label for="input-${id}-color">${i18n.fontColor}</label>
                                <input type="color" id="input-${id}-color" value="#e6f0f7">
                            </div>
                            <div class="form-group">
                                <label for="input-${id}-size">${i18n.fontSize}</label>
                                <input type="range" id="input-${id}-size" min="10" max="24" value="12">
                            </div>
                        </div>
                    </div>
                </details>
            </div>
        `;

        const handleUpdate = () => {
            this.updateSocialLinks();
            this.generateVCardQrDebounced();
        };

        linkEl.querySelector('.dynamic-social-value-input').addEventListener('input', (e) => {
            linkEl.dataset.value = e.target.value;
            handleUpdate();
        });

        linkEl.querySelector('.remove-btn').addEventListener('click', () => { linkEl.remove(); handleUpdate(); });
        linkEl.querySelectorAll('input[type="radio"]').forEach(radio => radio.addEventListener('change', handleUpdate));

        linkEl.querySelectorAll('.move-btn').forEach(button => {
            button.addEventListener('click', (e) => {
                e.preventDefault();
                EventManager.moveElement(elementId, button.dataset.direction);
            });
        });

        linkEl.querySelectorAll('details input').forEach(input => {
            input.addEventListener('input', () => {
                this.updateSocialTextStyles();
            });
        });

        DOMElements.social.container.appendChild(linkEl);
        if (!platformKey) DOMElements.social.input.value = '';

        const newInput = linkEl.querySelector('.dynamic-social-value-input');
        if (newInput) newInput.focus();

        handleUpdate();
    },

    applyLayout(layoutName = 'classic') {
        DOMElements.cardsWrapper.dataset.layout = layoutName;
        if (window.MobileUtils && window.MobileUtils.isMobile()) {
            window.MobileUtils.updateMobileCardScale();
        }
    },

    applyBackground(bgUrl) {
        const targetSide = document.querySelector('input[name="bg-gallery-target"]:checked')?.value || 'front';
        const safeUrl = (typeof sanitizeURL === 'function') ? sanitizeURL(bgUrl) : bgUrl;

        if (targetSide === 'front') {
            this.frontBgImageUrl = safeUrl;
            document.getElementById('front-bg-start').value = "#000000";
            document.getElementById('front-bg-end').value = "#000000";
            document.getElementById('front-bg-opacity').value = 0.3;
            DOMElements.buttons.removeFrontBg.style.display = 'block';
        } else {
            this.backBgImageUrl = safeUrl;
            document.getElementById('back-bg-start').value = "#000000";
            document.getElementById('back-bg-end').value = "#000000";
            document.getElementById('back-bg-opacity').value = 0.3;
            DOMElements.buttons.removeBackBg.style.display = 'block';
        }

        this.updateCardBackgrounds();
        UIManager.announce(`تم تطبيق خلفية ${targetSide === 'front' ? 'أمامية' : 'خلفية'} جديدة.`);
    },
};

const StateManager = {
    isApplyingState: false,

    getStateObject() {
        const state = {
            currentLanguage: document.documentElement.lang || 'ar',
            inputs: {},
            dynamic: { phones: [], social: [], staticSocial: {} },
            imageUrls: {},
            positions: {},
            placements: {}
        };

        document.querySelectorAll('input, select, textarea').forEach(input => {
            if (input.classList.contains('dynamic-social-value-input')) return;

            if (input.type === 'radio' && !input.name.startsWith('placement-')) {
                if (input.checked) { state.inputs[input.name] = input.value; }
            } else if (input.type === 'checkbox') {
                state.inputs[input.id] = input.checked;
            } else if (!input.name.startsWith('placement-')) {
                state.inputs[input.id] = input.value;
            }
        });

        DOMElements.phoneNumbersContainer.querySelectorAll('.dynamic-input-group').forEach(group => {
            const phoneId = group.dataset.phoneId;
            const phoneInput = group.querySelector('input[type="tel"]');
            const placementInput = group.querySelector(`input[name="placement-${phoneId}"]:checked`);
            const cardElement = document.getElementById(phoneId);

            if (phoneId && phoneInput) {
                state.dynamic.phones.push({
                    id: phoneId,
                    value: phoneInput.value,
                    placement: placementInput ? placementInput.value : 'front',
                    position: cardElement ? { x: parseFloat(cardElement.getAttribute('data-x')) || 0, y: parseFloat(cardElement.getAttribute('data-y')) || 0 } : { x: 0, y: 0 }
                });
            }
        });

        DOMElements.social.container.querySelectorAll('.dynamic-social-link').forEach(group => {
            const socialId = group.dataset.socialId;
            const valueInput = group.querySelector('.dynamic-social-value-input');
            const placementInput = group.querySelector(`input[name="placement-${socialId}"]:checked`);
            const cardElement = document.getElementById(`social-link-${socialId.replace(/[^a-zA-Z0-9-]/g, '-')}`);

            const colorInput = group.querySelector(`#input-${socialId}-color`);
            const sizeInput = group.querySelector(`#input-${socialId}-size`);

            if (socialId && valueInput) {
                state.dynamic.social.push({
                    id: socialId,
                    platform: group.dataset.platform,
                    value: valueInput.value,
                    placement: placementInput ? placementInput.value : 'back',
                    position: cardElement ? { x: parseFloat(cardElement.getAttribute('data-x')) || 0, y: parseFloat(cardElement.getAttribute('data-y')) || 0 } : { x: 0, y: 0 },
                    color: colorInput ? colorInput.value : '#e6f0f7',
                    size: sizeInput ? sizeInput.value : 12
                });
            }
        });

        Config.STATIC_CONTACT_METHODS.forEach(method => {
            const controlGroup = document.getElementById(`form-group-static-${method.id}`);
            const input = document.getElementById(`input-${method.id}`);
            const placementInput = controlGroup ? controlGroup.querySelector(`input[name="placement-static-${method.id}"]:checked`) : null;
            const cardElement = document.getElementById(`social-link-static-${method.id}`);

            if (input) {
                state.dynamic.staticSocial[method.id] = {
                    value: input.value,
                    placement: placementInput ? placementInput.value : 'back',
                    position: cardElement ? { x: parseFloat(cardElement.getAttribute('data-x')) || 0, y: parseFloat(cardElement.getAttribute('data-y')) || 0 } : { x: 0, y: 0 }
                };
            }
        });

        state.imageUrls.front = CardManager.frontBgImageUrl;
        state.imageUrls.back = CardManager.backBgImageUrl;
        state.imageUrls.qrCode = CardManager.qrCodeImageUrl;
        state.imageUrls.photo = CardManager.personalPhotoUrl;

        const coreElements = ['card-logo', 'card-personal-photo-wrapper', 'card-name', 'card-tagline', 'qr-code-wrapper'];
        coreElements.forEach(id => {
            const el = document.getElementById(id);
            if (el) {
                state.positions[id] = { x: parseFloat(el.getAttribute('data-x')) || 0, y: parseFloat(el.getAttribute('data-y')) || 0 };
            }
        });

        const placementElements = ['logo', 'photo', 'name', 'tagline', 'qr'];
        placementElements.forEach(elName => {
            const checkedRadio = document.querySelector(`input[name="placement-${elName}"]:checked`);
            if (checkedRadio) {
                state.placements[elName] = checkedRadio.value;
            }
        });

        return state;
    },

    save() { try { const state = this.getStateObject(); localStorage.setItem(Config.LOCAL_STORAGE_KEY, JSON.stringify(state)); } catch (e) { console.error("Failed to save state:", e); } },
    load() { try { const savedState = localStorage.getItem(Config.LOCAL_STORAGE_KEY); if (savedState) { this.applyState(JSON.parse(savedState), false); return true; } return false; } catch (e) { console.error("Failed to load state:", e); return false; } },

    applyState(state, triggerSave = true) {
        if (!state) return;

        this.isApplyingState = true;

        if (state.currentLanguage) {
            const lang = state.currentLanguage;
            document.documentElement.lang = lang;
            document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
            if (DOMElements.buttons.langToggle) DOMElements.buttons.langToggle.textContent = lang === 'ar' ? 'EN' : 'AR';

            document.querySelectorAll('[data-lang]').forEach(el => {
                el.style.display = el.dataset.lang === lang ? 'block' : 'none';
            });
        }

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

        CardManager.updateCardForLanguageChange(state.currentLanguage || 'ar');

        DOMElements.phoneNumbersContainer.innerHTML = '';
        if (state.dynamic && state.dynamic.phones) {
            state.dynamic.phones.forEach(phoneData => CardManager.createPhoneInput(phoneData));
        }

        DOMElements.social.container.innerHTML = '';
        if (state.dynamic && state.dynamic.social) {
            state.dynamic.social.forEach(socialData => {
                CardManager.addSocialLink(socialData.platform);
                const newControl = DOMElements.social.container.querySelector(`[data-social-id="${socialData.id}"]`);

                if (newControl) {
                    const valueInput = newControl.querySelector('.dynamic-social-value-input');
                    if (valueInput) valueInput.value = socialData.value;
                    newControl.dataset.value = socialData.value;

                    const placementRadio = newControl.querySelector(`input[value="${socialData.placement}"]`);
                    if (placementRadio) placementRadio.checked = true;

                    const colorInput = newControl.querySelector(`#input-${socialData.id}-color`);
                    const sizeInput = newControl.querySelector(`#input-${socialData.id}-size`);
                    if (colorInput && socialData.color) colorInput.value = socialData.color;
                    if (sizeInput && socialData.size) sizeInput.value = socialData.size;
                }
            });
        }

        if (state.dynamic && state.dynamic.staticSocial) {
            for (const [key, data] of Object.entries(state.dynamic.staticSocial)) {
                const input = document.getElementById(`input-${key}`);
                if (input) input.value = data.value || '';

                const placementRadio = document.querySelector(`input[name="placement-static-${key}"][value="${data.placement}"]`);
                if (placementRadio) placementRadio.checked = true;
            }
        }

        if (state.imageUrls) {
            CardManager.frontBgImageUrl = state.imageUrls.front;
            CardManager.backBgImageUrl = state.imageUrls.back;
            CardManager.qrCodeImageUrl = state.imageUrls.qrCode;
            CardManager.personalPhotoUrl = state.imageUrls.photo;
            if (DOMElements.photoControls.url) DOMElements.photoControls.url.value = state.imageUrls.photo || '';

            DOMElements.buttons.removeFrontBg.style.display = state.imageUrls.front ? 'block' : 'none';
            DOMElements.buttons.removeBackBg.style.display = state.imageUrls.back ? 'block' : 'none';
        }

        if (state.placements) {
            for (const [elName, side] of Object.entries(state.placements)) {
                const radio = document.querySelector(`input[name="placement-${elName}"][value="${side}"]`);
                if (radio) radio.checked = true;
            }
        }

        document.querySelectorAll('input, select, textarea').forEach(input => {
            input.dispatchEvent(new Event('input', { bubbles: true }));
            input.dispatchEvent(new Event('change', { bubbles: true }));
        });

        if (state.positions) {
            for (const [id, pos] of Object.entries(state.positions)) {
                let elementId = id;
                if (id.startsWith('form-group-static-') && !document.getElementById(id)) {
                    elementId = `social-link-static-${id.replace('form-group-static-', '')}`;
                }
                if (id.startsWith('dynsocial_') && !document.getElementById(id)) {
                    elementId = `social-link-${id.replace(/[^a-zA-Z0-9-]/g, '-')}`;
                }

                const targetEl = document.getElementById(elementId);

                if (targetEl && pos) {
                    targetEl.style.transform = `translate(${pos.x}px, ${pos.y}px)`;
                    targetEl.setAttribute('data-x', pos.x);
                    targetEl.setAttribute('data-y', pos.y);
                }
            }
        } else {
            // DragManager.resetPositions(); // You might need to implement this
        }

        if (state.inputs && state.inputs['theme-select-input']) {
            UIManager.setActiveThumbnail(state.inputs['theme-select-input']);
        }

        CardManager.renderCardContent();

        const qrSource = document.querySelector('input[name="qr-source"]:checked')?.value;
        if (qrSource === 'auto-vcard') {
            setTimeout(() => CardManager.generateVCardQr(), 100);
        } else {
            CardManager.autoGeneratedQrDataUrl = null;
            CardManager.updateQrCodeDisplay();
        }

        CardManager.handleMasterSocialToggle();
        this.isApplyingState = false;

        if (!state.inputs || !state.inputs['layout-select-visual']) {
            CardManager.applyLayout('classic');
        } else {
            CardManager.applyLayout(state.inputs['layout-select-visual']);
        }
    },

    reset() {
        if (confirm('هل أنت متأكد أنك تريد إعادة تعيين التصميم بالكامل؟ سيتم حذف أي بيانات محفوظة.')) {
            localStorage.removeItem(Config.LOCAL_STORAGE_KEY);
            window.location.reload();
        }
    },

    saveDebounced: Utils.debounce(() => {
        if (StateManager.isApplyingState) return;

        const currentState = StateManager.getStateObject();
        HistoryManager.pushState(currentState);

        if (typeof CollaborationManager !== 'undefined' && CollaborationManager.isActive) {
            CollaborationManager.sendState(currentState);
        }

        UIManager.showSaveNotification('جاري الحفظ التلقائي...', 'تم الحفظ ✓');
    }, 1500)
};