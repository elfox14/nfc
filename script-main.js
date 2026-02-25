'use strict';

/**
 * ==========================================
 * Editor Enhancements Implementation Details
 * ==========================================
 * 
 * 1. Snap-to-Grid (DragManager):
 *    - Located in script-main.js -> DragManager.
 *    - Elements automatically align to grid lines (default 20px) when dragged.
 *    - Vertical and horizontal guides visually indicate alignment.
 * 
 * 2. Undo/Redo & Autosave:
 *    - Handled by HistoryManager and StateManager in script-core.js.
 *    - Keybindings Ctrl+Z and Ctrl+Y are intercepted in script-main.js (App.init).
 */

// Language detection and i18n for script-main.js (computed once at load)
const _isEnglishPage = document.documentElement.lang === 'en';

// Custom confirm dialog with نعم/لا (Yes/No) buttons
function customConfirm(message) {
    return new Promise((resolve) => {
        const overlay = document.createElement('div');
        overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.6);z-index:99999;display:flex;align-items:center;justify-content:center;backdrop-filter:blur(4px);';
        const box = document.createElement('div');
        box.style.cssText = 'background:#1c2a3b;border:1px solid rgba(77,166,255,0.2);border-radius:16px;padding:30px;max-width:400px;width:90%;text-align:center;box-shadow:0 20px 60px rgba(0,0,0,0.5);';
        const msg = document.createElement('p');
        msg.textContent = message;
        msg.style.cssText = 'color:#fff;font-size:1.1rem;margin:0 0 25px;line-height:1.6;font-family:Tajawal,sans-serif;';
        const btns = document.createElement('div');
        btns.style.cssText = 'display:flex;gap:12px;justify-content:center;';
        const yesBtn = document.createElement('button');
        yesBtn.textContent = _isEnglishPage ? 'Yes' : 'نعم';
        yesBtn.style.cssText = 'padding:10px 32px;border-radius:10px;border:none;cursor:pointer;font-size:1rem;font-weight:700;font-family:inherit;background:#4da6ff;color:#fff;transition:background 0.2s;';
        yesBtn.onmouseenter = () => yesBtn.style.background = '#3d8fe6';
        yesBtn.onmouseleave = () => yesBtn.style.background = '#4da6ff';
        const noBtn = document.createElement('button');
        noBtn.textContent = _isEnglishPage ? 'No' : 'لا';
        noBtn.style.cssText = 'padding:10px 32px;border-radius:10px;border:1px solid rgba(255,255,255,0.2);cursor:pointer;font-size:1rem;font-weight:700;font-family:inherit;background:transparent;color:#fff;transition:background 0.2s;';
        noBtn.onmouseenter = () => noBtn.style.background = 'rgba(255,255,255,0.1)';
        noBtn.onmouseleave = () => noBtn.style.background = 'transparent';
        btns.appendChild(yesBtn);
        btns.appendChild(noBtn);
        box.appendChild(msg);
        box.appendChild(btns);
        overlay.appendChild(box);
        document.body.appendChild(overlay);
        yesBtn.onclick = () => { overlay.remove(); resolve(true); };
        noBtn.onclick = () => { overlay.remove(); resolve(false); };
    });
}
const i18nMain = {
    galleryPrompt: _isEnglishPage ? 'Would you like to display your design in the gallery page?' : 'هل تريد عرض تصميمك في صفحة المعرض؟',
    capturing: _isEnglishPage ? 'Capturing...' : 'جاري الالتقاط...',
    uploading: _isEnglishPage ? 'Uploading images...' : 'جاري رفع الصور...',
    generating: _isEnglishPage ? 'Generating link...' : 'جاري إنشاء الرابط...',
    captureError: _isEnglishPage ? 'Failed to capture or upload card image. Please try again.' : 'فشل التقاط أو رفع صورة البطاقة. يرجى المحاولة مرة أخرى.',
    saveError: _isEnglishPage ? 'Failed to save design. Please try again.' : 'فشل حفظ التصميم. يرجى المحاولة مرة أخرى.',
    linkCopied: _isEnglishPage ? 'Link copied to clipboard!' : 'تم نسخ الرابط!',
    shareTitle: _isEnglishPage ? 'My Digital Business Card' : 'بطاقة العمل الرقمية الخاصة بي',
    shareText: _isEnglishPage ? 'Check out my digital business card:' : 'اطلع على بطاقتي الرقمية:',
    copyLinkFailed: _isEnglishPage ? 'Could not copy link automatically. Please copy it manually.' : 'لم نتمكن من نسخ الرابط تلقائياً. يرجى نسخه يدوياً.',
};

/**
 * Show brief visual feedback when Undo/Redo is performed.
 * @param {'undo'|'redo'} action
 */
function _showUndoRedoFeedback(action) {
    // Update autosave indicator
    if (window.updateAutoSaveIndicator) window.updateAutoSaveIndicator('saving');
    setTimeout(() => { if (window.updateAutoSaveIndicator) window.updateAutoSaveIndicator('saved'); }, 600);

    // Show a brief toast notification
    const message = action === 'undo'
        ? (_isEnglishPage ? '↩ Undo' : '↩ تراجع')
        : (_isEnglishPage ? '↪ Redo' : '↪ إعادة');

    const toast = document.createElement('div');
    toast.textContent = message;
    Object.assign(toast.style, {
        position: 'fixed', bottom: '20px', left: '50%', transform: 'translateX(-50%)',
        background: 'rgba(30,30,40,0.92)', color: '#fff', padding: '8px 22px',
        borderRadius: '8px', fontSize: '14px', fontWeight: '500',
        zIndex: '99999', pointerEvents: 'none', opacity: '0',
        transition: 'opacity 0.2s ease', boxShadow: '0 4px 16px rgba(0,0,0,0.3)',
        fontFamily: "'Tajawal', 'Poppins', sans-serif"
    });
    document.body.appendChild(toast);
    requestAnimationFrame(() => { toast.style.opacity = '1'; });
    setTimeout(() => {
        toast.style.opacity = '0';
        setTimeout(() => toast.remove(), 250);
    }, 1000);
}

/**
 * Update the global autosave status indicator.
 * @param {'saving'|'saved'|'error'} status 
 */
window.updateAutoSaveIndicator = function (status) {
    let indicator = document.getElementById('global-autosave-indicator');
    if (!indicator) {
        indicator = document.createElement('div');
        indicator.id = 'global-autosave-indicator';
        Object.assign(indicator.style, {
            position: 'fixed', bottom: '20px', right: '20px',
            background: 'rgba(30,30,40,0.92)', color: '#fff', padding: '8px 16px',
            borderRadius: '8px', fontSize: '14px', fontWeight: '500',
            zIndex: '99999', pointerEvents: 'none', opacity: '0',
            transition: 'opacity 0.3s ease', display: 'flex', alignItems: 'center', gap: '8px',
            fontFamily: "'Tajawal', 'Poppins', sans-serif"
        });
        document.body.appendChild(indicator);
    }

    indicator.style.opacity = '1';

    if (status === 'saving') {
        indicator.innerHTML = '<i class="fas fa-spinner fa-spin"></i> <span>' + (_isEnglishPage ? 'Saving...' : 'جاري الحفظ...') + '</span>';
    } else if (status === 'saved') {
        indicator.innerHTML = '<i class="fas fa-check" style="color:#00e676"></i> <span>' + (_isEnglishPage ? 'Saved' : 'تم الحفظ') + '</span>';
        setTimeout(() => { indicator.style.opacity = '0'; }, 2000);
    } else if (status === 'error') {
        indicator.innerHTML = '<i class="fas fa-exclamation-triangle" style="color:#ff3d00"></i> <span>' + (_isEnglishPage ? 'Save failed/Offline' : 'فشل الحفظ/دون اتصال') + '</span>';
        setTimeout(() => { indicator.style.opacity = '0'; }, 3000);
    }
};

/**
 * Check if a local draft exists and prompt the user to restore it.
 */
window.checkAndRestoreDraft = function () {
    const designId = Config.currentDesignId || new URLSearchParams(window.location.search).get('id') || 'draft';
    const storageKey = `mcprime_autosave_${designId}`;

    try {
        const saved = localStorage.getItem(storageKey);
        if (!saved) return;

        const { timestamp, state } = JSON.parse(saved);
        if (!state) return;

        const timeString = new Date(timestamp).toLocaleTimeString(_isEnglishPage ? 'en-US' : 'ar-EG');
        const prompt = document.createElement('div');
        prompt.className = 'autosave-restore-prompt';

        prompt.innerHTML = `
            <div style="display: flex; flex-direction: column; align-items: center; text-align: center;">
                <i class="fas fa-history" style="font-size: 2rem; color: var(--accent-primary); margin-bottom: 10px;"></i>
                <div style="margin-bottom: 15px;">
                    <strong style="display: block; font-size: 1.1rem; color: var(--text-primary); margin-bottom: 5px;">
                        ${_isEnglishPage ? 'Unsaved draft found' : 'تم العثور على مسودة غير محفوظة'}
                    </strong>
                    <span style="font-size: 0.9rem; color: var(--text-secondary);">
                        ${_isEnglishPage ? 'Last local edit:' : 'آخر تعديل محلي:'} ${timeString}
                    </span>
                </div>
                <div style="display: flex; gap: 10px; width: 100%;">
                    <button class="btn btn-primary restore-yes" style="flex: 1; margin:0;">${_isEnglishPage ? 'Restore Draft' : 'استعادة المسودة'}</button>
                    <button class="btn btn-secondary restore-no" style="flex: 1; margin:0;">${_isEnglishPage ? 'Discard' : 'تجاهل'}</button>
                </div>
            </div>
        `;

        Object.assign(prompt.style, {
            position: 'fixed', top: '80px', left: '50%', transform: 'translateX(-50%)',
            background: 'var(--form-bg, #243447)', border: '1px solid var(--accent-primary, #4da6ff)',
            borderRadius: '12px', padding: '20px', zIndex: '99999', boxShadow: '0 10px 40px rgba(0,0,0,0.6)',
            maxWidth: '400px', width: '90%', fontFamily: "'Tajawal', 'Poppins', sans-serif"
        });

        document.body.appendChild(prompt);

        prompt.querySelector('.restore-yes').addEventListener('click', () => {
            StateManager.applyState(state, false);
            HistoryManager.pushState(state);
            prompt.remove();
            localStorage.removeItem(storageKey);
            UIManager.announce(_isEnglishPage ? 'Draft restored' : 'تمت استعادة المسودة');
        });

        prompt.querySelector('.restore-no').addEventListener('click', () => {
            localStorage.removeItem(storageKey);
            prompt.remove();
        });
    } catch (e) {
        console.error('Failed to parse autosave draft:', e);
    }
};

const CollaborationManager = {
    ws: null,
    collabId: null,
    isActive: false,

    init() {
        // 1. تحقق من وجود `collabId` في الرابط عند تحميل الصفحة
        const params = new URLSearchParams(window.location.search);
        this.collabId = params.get('collabId');

        if (this.collabId) {
            // قم بإزالة معرف التصميم العادي لمنع التعارض
            params.delete('id');
            const newUrl = `${window.location.pathname}?${params.toString()} `;
            window.history.replaceState({}, '', newUrl);

            this.connect(this.collabId);
        }

        // 2. ربط الأحداث بالأزرار والمودال
        const startBtn = document.getElementById('start-collab-btn');
        const modalOverlay = document.getElementById('collab-modal-overlay');
        const closeBtn = document.getElementById('collab-modal-close');
        const copyBtn = document.getElementById('copy-collab-link-btn');

        if (startBtn) startBtn.addEventListener('click', () => this.startSession());
        if (closeBtn) closeBtn.addEventListener('click', () => UIManager.hideModal(modalOverlay));
        if (copyBtn) copyBtn.addEventListener('click', () => this.copyLink());
    },

    async startSession() {
        const startBtn = document.getElementById('start-collab-btn');
        UIManager.setButtonLoadingState(startBtn, true, 'جاري الإنشاء...');
        try {
            // 3. احفظ التصميم للحصول على ID فريد
            const designId = await ShareManager.saveDesign();
            if (!designId) {
                throw new Error('فشل حفظ التصميم لإنشاء جلسة.');
            }
            this.collabId = designId;

            // 4. أنشئ الرابط واعرضه في المودال
            const collabUrl = new URL(window.location.origin + window.location.pathname);
            collabUrl.search = `? collabId = ${this.collabId} `;

            document.getElementById('collab-link-input').value = collabUrl.href;
            UIManager.showModal(document.getElementById('collab-modal-overlay'));

            // 5. اتصل بالـ WebSocket
            this.connect(this.collabId);

        } catch (error) {
            console.error("Failed to start collaboration session:", error);
            alert(error.message);
        } finally {
            UIManager.setButtonLoadingState(startBtn, false);
        }
    },

    connect(collabId) {
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            return; // متصل بالفعل
        }

        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const wsUrl = `${protocol}//${window.location.host}?collabId=${collabId}`;

        this.ws = new WebSocket(wsUrl);

        this.ws.onopen = () => {
            console.log('WebSocket connection established for collaboration.');
            this.isActive = true;
            this.updateStatus('متصل');
            document.body.classList.add('collaboration-active');
        };

        this.ws.onmessage = (event) => {
            try {
                const state = JSON.parse(event.data);
                console.log('Received state from collaborator:', state);
                // 6. طبق التحديثات الواردة من الآخرين
                StateManager.applyState(state, false);
            } catch (error) {
                console.error('Error processing incoming message:', error);
            }
        };

        this.ws.onclose = () => {
            console.log('WebSocket connection closed.');
            this.isActive = false;
            this.ws = null;
            this.updateStatus('غير متصل');
            document.body.classList.remove('collaboration-active');
        };

        this.ws.onerror = (error) => {
            console.error('WebSocket error:', error);
            this.isActive = false;
            this.updateStatus('خطأ في الاتصال');
        };
    },

    sendState(state) {
        // 7. أرسل التحديثات إلى الخادم
        if (this.isActive && this.ws && this.ws.readyState === WebSocket.OPEN) {
            this.ws.send(JSON.stringify(state));
        }
    },

    updateStatus(message) {
        const statusEl = document.getElementById('collab-status');
        if (statusEl) statusEl.textContent = `الحالة: ${message}`;
    },

    copyLink() {
        const input = document.getElementById('collab-link-input');
        Utils.copyTextToClipboard(input.value).then(success => {
            if (success) {
                UIManager.announce('تم نسخ رابط الجلسة!');
                const copyBtn = document.getElementById('copy-collab-link-btn');
                const originalText = "نسخ";
                copyBtn.textContent = 'تم النسخ ✓';
                setTimeout(() => { copyBtn.textContent = originalText; }, 2000);
            }
        });
    }
};

const ExportManager = {
    pendingExportTarget: null,

    async captureElement(element, scale = 2) {
        await Utils.loadScript(Config.SCRIPT_URLS.html2canvas);
        const style = document.createElement('style');
        style.innerHTML = '.no-export { display: none !important; }';
        document.head.appendChild(style);

        const isMobile = typeof MobileUtils !== 'undefined' && MobileUtils.isMobile();
        const flipper = isMobile ? document.querySelector('.card-flipper') : null;
        let originalFlippedState = false;

        if (flipper) {
            originalFlippedState = flipper.classList.contains('is-flipped');
            const isCapturingBack = element.id === 'card-back-preview';

            if (isCapturingBack && !originalFlippedState) {
                flipper.classList.add('is-flipped');
            } else if (!isCapturingBack && originalFlippedState) {
                flipper.classList.remove('is-flipped');
            }
            await new Promise(resolve => setTimeout(resolve, 50));
        }

        try {
            return await html2canvas(element, {
                backgroundColor: null,
                scale: scale,
                useCORS: true,
                allowTaint: true,
                logging: false
            });
        }
        finally {
            document.head.removeChild(style);
            if (flipper) {
                if (originalFlippedState) {
                    flipper.classList.add('is-flipped');
                } else {
                    flipper.classList.remove('is-flipped');
                }
            }
        }
    },

    async downloadElement(options) {
        const { format, quality, scale } = options;
        const element = this.pendingExportTarget === 'front' ? DOMElements.cardFront : DOMElements.cardBack;
        const filename = `card-${this.pendingExportTarget}.${format}`;

        UIManager.showModal(DOMElements.exportLoadingOverlay);
        try {
            await new Promise(resolve => setTimeout(resolve, 100));
            const canvas = await this.captureElement(element, scale);
            const link = document.createElement('a');
            link.download = filename;
            link.href = canvas.toDataURL(`image/${format}`, quality);
            link.click();
        } catch (e) {
            console.error("Export failed:", e);
            UIManager.announce("فشل التصدير.");
        }
        finally {
            UIManager.hideModal(DOMElements.exportLoadingOverlay);
            UIManager.hideModal(DOMElements.exportModal.overlay);
        }
    },

    async downloadPdf() {
        await Promise.all([
            Utils.loadScript(Config.SCRIPT_URLS.html2canvas),
            Utils.loadScript(Config.SCRIPT_URLS.jspdf)
        ]);
        try {
            const { jsPDF } = window.jspdf;

            const isVertical = DOMElements.cardsWrapper.dataset.layout === 'vertical';
            const width = isVertical ? 330 : 510;
            const height = isVertical ? 510 : 330;
            const orientation = isVertical ? 'p' : 'l';

            const doc = new jsPDF({
                orientation: orientation,
                unit: 'px',
                format: [width, height]
            });

            const frontCanvas = await this.captureElement(DOMElements.cardFront, 2);
            doc.addImage(frontCanvas.toDataURL('image/png'), 'PNG', 0, 0, width, height);

            doc.addPage([width, height], orientation);

            const backCanvas = await this.captureElement(DOMElements.cardBack, 2);
            doc.addImage(backCanvas.toDataURL('image/png'), 'PNG', 0, 0, width, height);

            doc.save('business-card.pdf');
        } catch (e) {
            console.error('PDF export failed:', e);
            UIManager.announce('فشل تصدير PDF.');
        }
    },

    getVCardString() {
        const state = StateManager.getStateObject();
        const nameInput = document.getElementById('input-name');
        const taglineInput = document.getElementById('input-tagline');

        if (!nameInput || !taglineInput) return '';

        const name = nameInput.value.replace(/\n/g, ' ').split(' ');
        const firstName = name.length > 1 ? name.slice(0, -1).join(' ') : name[0];
        const lastName = name.length > 1 ? name.slice(-1).join(' ') : '';
        let vCard = `BEGIN:VCARD\nVERSION:3.0\nN:${lastName};${firstName};;;\nFN:${nameInput.value}\nORG:${taglineInput.value.replace(/\n/g, ' ')}\nTITLE:${taglineInput.value.replace(/\n/g, ' ')}\n`;

        if (state.dynamic.staticSocial.email && state.dynamic.staticSocial.email.value) {
            vCard += `EMAIL;TYPE=PREF,INTERNET:${state.dynamic.staticSocial.email.value}\n`;
        }
        if (state.dynamic.staticSocial.website && state.dynamic.staticSocial.website.value) {
            vCard += `URL:${state.dynamic.staticSocial.website.value}\n`;
        }

        if (state.dynamic.phones) {
            state.dynamic.phones.forEach((phone, index) => {
                if (phone.value) vCard += `TEL;TYPE=CELL${index === 0 ? ',PREF' : ''}:${phone.value}\n`;
            });
        }

        if (state.dynamic.social) {
            state.dynamic.social.forEach(link => {
                const platformKey = link.platform;
                const value = link.value;
                if (platformKey && value && Config.SOCIAL_PLATFORMS[platformKey]) {
                    let fullUrl = !/^(https?:\/\/)/i.test(value) ? Config.SOCIAL_PLATFORMS[platformKey].prefix + value : value;
                    vCard += `URL;TYPE=${platformKey}:${fullUrl}\n`;
                }
            });
        }

        vCard += `END:VCARD`;
        return vCard;
    },
    downloadVcf() { const vcfData = this.getVCardString(); const blob = new Blob([vcfData], { type: 'text/vcard' }); const url = URL.createObjectURL(blob); const link = document.createElement('a'); link.href = url; link.download = 'contact.vcf'; link.click(); URL.revokeObjectURL(url); },
    async downloadQrCode() {
        try {
            await Utils.loadScript(Config.SCRIPT_URLS.qrcode);
            const designId = await ShareManager.saveDesign();
            if (!designId) {
                throw new Error('فشل حفظ التصميم اللازم لإنشاء الرابط.');
            }

            const viewerUrl = new URL('viewer.html', window.location.href);
            viewerUrl.searchParams.set('id', designId);
            const finalUrl = viewerUrl.href;

            const container = DOMElements.qrCodeContainer;
            container.innerHTML = '';
            new QRCode(container, { text: finalUrl, width: 256, height: 256, correctLevel: QRCode.CorrectLevel.H });

            return new Promise((resolve, reject) => {
                setTimeout(() => {
                    const canvas = container.querySelector('canvas');
                    if (canvas) {
                        const link = document.createElement('a');
                        link.download = `qrcode-card-link-${designId}.png`;
                        link.href = canvas.toDataURL('image/png');
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

    async downloadHtmlPackage() {
        try {
            UIManager.announce(document.documentElement.lang === 'en' ? "Preparing web package... Please wait" : "جاري تحضير ملف الويب... الرجاء الانتظار");

            const isEnglish = document.documentElement.lang === 'en';
            const viewerFile = isEnglish ? 'viewer-en.html' : 'viewer.html';

            // Fetch resources
            const [htmlRes, cssRes, jsRes, langRes] = await Promise.all([
                fetch(viewerFile),
                fetch('viewer.css'),
                fetch('viewer.js'),
                fetch('lang-switcher.js')
            ]);

            let htmlContent = await htmlRes.text();
            const cssContent = await cssRes.text();
            const jsContent = await jsRes.text();
            const langContent = await langRes.text();

            const state = StateManager.getStateObject();

            // Prepare injected scripts
            // We set window.cardData so viewer.js uses it instead of fetching
            const dataScript = `<script>window.cardData = ${JSON.stringify(state)};</script>`;

            // Replace CSS link
            htmlContent = htmlContent.replace(/<link[^>]*href="viewer\.css"[^>]*>/, `<style>\n${cssContent}\n</style>`);

            // Replace JS scripts
            // Replace lang-switcher
            htmlContent = htmlContent.replace(/<script[^>]*src="lang-switcher\.js"[^>]*>[\s\S]*?<\/script>/, `<script>\n${langContent}\n</script>`);

            // Replace viewer.js and inject data before it
            htmlContent = htmlContent.replace(/<script[^>]*src="viewer\.js"[^>]*>[\s\S]*?<\/script>/, `${dataScript}\n<script>\n${jsContent}\n</script>`);

            // Fix relative paths for base images if needed (optional optimization)
            // unique-id generation
            const filenameBase = (state.inputs && state.inputs['input-name'] ? state.inputs['input-name'] : 'card').replace(/[^a-z0-9]/gi, '_').toLowerCase();

            const blob = new Blob([htmlContent], { type: 'text/html' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `${filenameBase}-full.html`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);

            UIManager.announce("تم تنزيل ملف الويب (HTML) بنجاح!");

        } catch (e) {
            console.error("HTML Export Error:", e);
            alert("حدث خطأ أثناء تصدير ملف الويب.");
        }
    }
};
const GalleryManager = {
    designs: [],
    init() { this.loadDesigns(); },
    loadDesigns() { this.designs = JSON.parse(localStorage.getItem(Config.GALLERY_STORAGE_KEY)) || []; },
    saveDesigns() { localStorage.setItem(Config.GALLERY_STORAGE_KEY, JSON.stringify(this.designs)); },
    async addCurrentDesign() {
        try {
            const state = StateManager.getStateObject();
            const thumbnail = await ExportManager.captureElement(DOMElements.cardFront, 0.5).then(canvas => canvas.toDataURL('image/jpeg', 0.5));
            this.designs.push({ name: `تصميم ${this.designs.length + 1}`, timestamp: Date.now(), state, thumbnail });
            this.saveDesigns();
            UIManager.announce('تم حفظ التصميم في المعرض بنجاح!');
        } catch (error) {
            console.error("Failed to add design to gallery:", error);
            alert("فشل حفظ التصميم في المعرض. قد تكون هناك مشكلة في تحميل المكونات اللازمة.");
            throw error;
        }
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
            const thumbnail = document.createElement('img'); thumbnail.src = design.thumbnail;
            thumbnail.alt = `معاينة لتصميم '${design.name}' المحفوظ`;
            thumbnail.className = 'gallery-thumbnail';
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

        try {
            await Promise.all([
                Utils.loadScript(Config.SCRIPT_URLS.html2canvas),
                Utils.loadScript(Config.SCRIPT_URLS.jszip)
            ]);

            const originalState = StateManager.getStateObject();
            const zip = new JSZip();

            for (const index of selectedIndices) {
                const design = this.designs[index];
                StateManager.applyState(design.state, false);
                await new Promise(resolve => setTimeout(resolve, 50));
                const frontCanvas = await ExportManager.captureElement(DOMElements.cardFront);
                const backCanvas = await ExportManager.captureElement(DOMElements.cardBack);
                const frontBlob = await new Promise(resolve => frontCanvas.toBlob(resolve, 'image/png'));
                const backBlob = await new Promise(resolve => backCanvas.toBlob(resolve, 'image/png'));
                zip.file(`${design.name}_Front.png`, frontBlob);
                zip.file(`${design.name}_Back.png`, backBlob);
            }

            const content = await zip.generateAsync({ type: "blob" });
            const link = document.createElement('a');
            link.href = URL.createObjectURL(content);
            link.download = "Business_Cards_Export.zip";
            link.click();
            URL.revokeObjectURL(link.href);
            StateManager.applyState(originalState, false);

        } catch (e) {
            console.error("ZIP export failed:", e);
            UIManager.announce("حدث خطأ أثناء تصدير الملف المضغوط.");
            alert("فشل تصدير الملف المضغوط. قد تكون هناك مشكلة في تحميل المكونات اللازمة.");
            throw e;
        }
    }
};

const ShareManager = {

    async captureAndUploadCard(element) {
        await Utils.loadScript(Config.SCRIPT_URLS.html2canvas);
        const canvas = await ExportManager.captureElement(element, 2);

        return new Promise((resolve, reject) => {
            canvas.toBlob(async (blob) => {
                if (!blob) {
                    return reject(new Error("فشل تحويل canvas إلى blob"));
                }
                try {
                    const file = new File([blob], "card-capture.png", { type: "image/png" });
                    const imageUrl = await UIManager.uploadImageToServer(file);
                    resolve(imageUrl);
                } catch (e) {
                    reject(e);
                }
            }, 'image/png', 0.95);
        });
    },

    async saveDesign(stateToSave = null) {
        const state = stateToSave || StateManager.getStateObject();
        try {
            // Use Auth header if available
            const headers = { 'Content-Type': 'application/json' };
            const token = localStorage.getItem('authToken');
            if (token) headers['Authorization'] = `Bearer ${token}`;

            let url = `${Config.API_BASE_URL}/api/save-design`;
            if (Config.currentDesignId) {
                url += `?id=${Config.currentDesignId}`;
            }

            // Using Auth.fetchWithAuth if available to handle token refreshes automatically
            const fetchFn = (typeof Auth !== 'undefined' && Auth.fetchWithAuth)
                ? Auth.fetchWithAuth.bind(Auth)
                : fetch;

            const response = await fetchFn(url, {
                method: 'POST',
                headers: headers,
                body: JSON.stringify(state),
            });
            if (!response.ok) throw new Error('Server responded with an error');

            const result = await response.json();
            if (result.success && result.id) {
                Config.currentDesignId = result.id;
                return result.id;
            } else {
                throw new Error('Invalid response from server');
            }
        } catch (error) {
            console.error("Failed to save design:", error);
            UIManager.announce(i18nMain.saveFailed || 'فشل حفظ التصميم. حاول مرة أخرى.');
            return null;
        }
    },

    // Save design without auth token (anonymous) - used by shareCard so it doesn't appear in dashboard
    async saveDesignAnonymous(state) {
        try {
            const headers = { 'Content-Type': 'application/json' };
            const url = `${Config.API_BASE_URL}/api/save-design`;

            const response = await fetch(url, {
                method: 'POST',
                headers: headers,
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
            console.error("Failed to save design (anonymous):", error);
            UIManager.announce(i18nMain.saveFailed || 'فشل حفظ التصميم. حاول مرة أخرى.');
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
        UIManager.setButtonLoadingState(DOMElements.buttons.shareCard, true, i18nMain.capturing);

        let frontImageUrl, backImageUrl, shareState;

        try {
            // Deep clone state so modifications don't leak to auto-save
            shareState = JSON.parse(JSON.stringify(StateManager.getStateObject()));
            frontImageUrl = await this.captureAndUploadCard(DOMElements.cardFront);

            UIManager.setButtonLoadingState(DOMElements.buttons.shareCard, true, i18nMain.uploading);
            backImageUrl = await this.captureAndUploadCard(DOMElements.cardBack);

        } catch (error) {
            console.error("Card capture/upload failed:", error);
            alert(i18nMain.captureError);
            UIManager.setButtonLoadingState(DOMElements.buttons.shareCard, false);
            return;
        }

        if (!shareState.imageUrls) shareState.imageUrls = {};
        shareState.imageUrls.capturedFront = frontImageUrl;
        shareState.imageUrls.capturedBack = backImageUrl;
        shareState.imageUrls.front = frontImageUrl;
        shareState.imageUrls.back = backImageUrl;

        // Ask user if they want to display their design in the gallery
        shareState.sharedToGallery = await customConfirm(i18nMain.galleryPrompt);

        UIManager.setButtonLoadingState(DOMElements.buttons.shareCard, true, i18nMain.generating);

        // Save anonymously so shared card does NOT appear in user's dashboard
        const designId = await this.saveDesignAnonymous(shareState);

        UIManager.setButtonLoadingState(DOMElements.buttons.shareCard, false);
        if (!designId) return;

        const viewerUrl = new URL('viewer.html', window.location.href);
        viewerUrl.searchParams.set('id', designId);

        this.performShare(viewerUrl.href, i18nMain.shareTitle, i18nMain.shareText);
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

        // Aggressive Redirection: Direct all legacy editor access to V2
        // If we are on editor.html or editor-en.html, redirect to editor-v2.html
        const isLegacyEditor = window.location.pathname.includes('editor.html') || window.location.pathname.includes('editor-en.html');
        if (isLegacyEditor) {
            const v2Url = new URL('editor-v2.html', window.location.href);
            params.forEach((value, key) => v2Url.searchParams.set(key, value));
            window.location.href = v2Url.href;
            return true;
        }

        // لا تقم بالتحميل إذا كان هناك معرف جلسة تحرير جماعي
        if (params.has('collabId')) {
            return false;
        }

        if (designId) {
            try {
                const response = await fetch(`${Config.API_BASE_URL}/api/get-design/${designId}`);
                if (!response.ok) throw new Error('Design not found or server error');

                const state = await response.json();

                // PR-1: Redirect Spec V2 designs to the new editor
                if (state.schemaVersion === 2 || state.v2) {
                    const editorPage = _isEnglishPage ? 'editor-v2.html' : 'editor-v2.html'; // Both are the same for now, but keeping structure
                    window.location.href = `${editorPage}?id=${designId}`;
                    return true;
                }

                StateManager.applyState(state, false);
                Config.currentDesignId = designId; // Store loaded ID
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
        container.addEventListener('drop', () => {
            if (onSortCallback) onSortCallback();
        });
    },

    moveElement(elementId, direction, step = 5) {
        const target = document.getElementById(elementId);
        if (!target) return;

        let x = parseFloat(target.getAttribute('data-x')) || 0;
        let y = parseFloat(target.getAttribute('data-y')) || 0;

        switch (direction) {
            case 'up': y -= step; break;
            case 'down': y += step; break;
            case 'left': x -= step; break;
            case 'right': x += step; break;
        }

        target.style.transform = `translate(${x}px, ${y}px)`;
        target.setAttribute('data-x', x);
        target.setAttribute('data-y', y);
    },

    bindEvents() {
        document.querySelectorAll('input, select, textarea').forEach(input => {
            const eventType = (input.type === 'range' || input.type === 'color' || input.type === 'checkbox') ? 'change' : 'input';

            input.addEventListener(eventType, () => {
                if (!StateManager.isApplyingState) {
                    if (input.id === 'logo-shadow-enabled') CardManager.updateLogoShadow();
                    if (input.id === 'photo-shadow-enabled') CardManager.updatePersonalPhotoShadow();
                }
            });

            input.addEventListener('input', () => {
                if (input.id.startsWith('input-name_') || input.id.startsWith('input-tagline_')) {
                    const lang = document.body.classList.contains('lang-en') ? 'en' : 'ar';
                    if (input.dataset.lang === lang) {
                        CardManager.updateElementFromInput(input);
                    }
                } else {
                    CardManager.updateElementFromInput(input);
                }

                if (input.id.includes('photo-')) CardManager.updatePersonalPhotoStyles();
                if (input.id.includes('phone-btn')) CardManager.updatePhoneButtonStyles();

                if (input.name === 'logo-align') CardManager.updateLogoAlignment();
                if (input.id === 'logo-bg-color') CardManager.updateLogoBackground();
                if (input.id.startsWith('logo-shadow-')) CardManager.updateLogoShadow();
                if (input.id === 'logo-width' || input.id === 'logo-height' || input.id === 'logo-object-fit') CardManager.updateLogoDimensions();
                if (input.id === 'logo-lazy-load' || input.id === 'logo-alt-text') CardManager.updateLogoAdvanced();

                if (input.name === 'photo-align') CardManager.updatePersonalPhotoAlignment();
                if (input.id.startsWith('photo-shadow-') || input.id === 'photo-opacity') CardManager.updatePersonalPhotoStyles();

                if (input.id.startsWith('back-buttons')) CardManager.updateSocialButtonStyles();
                if (input.id.startsWith('social-text') || input.id.includes('-static-') || input.id.includes('-dynsocial_')) CardManager.updateSocialTextStyles();
                if (input.id.startsWith('input-') && !input.id.includes('-static-') && !input.id.includes('-dynsocial_')) CardManager.updateSocialLinks();
                if (input.id.startsWith('front-bg-') || input.id.startsWith('back-bg-')) CardManager.updateCardBackgrounds();
                if (input.id === 'qr-size') CardManager.updateQrCodeDisplay();

                const vCardFields = ['input-name_ar', 'input-name_en', 'input-tagline_ar', 'input-tagline_en', 'input-email', 'input-website'];
                if (vCardFields.includes(input.id)) CardManager.generateVCardQrDebounced();
                if (input.name.startsWith('placement-static-')) CardManager.updateSocialLinks();
            });
            input.addEventListener('focus', () => {
                let draggableId = input.dataset.updateTarget;
                if (draggableId === 'card-logo-img') draggableId = 'card-logo';
                const parentGroup = input.closest('.form-group');
                if (parentGroup && parentGroup.id.startsWith('form-group-static-')) draggableId = `social-link-static-${parentGroup.id.replace('form-group-static-', '')}`;
                if (draggableId) UIManager.highlightElement(draggableId, true);

            });
            input.addEventListener('blur', () => {
                let draggableId = input.dataset.updateTarget;
                if (draggableId === 'card-logo-img') draggableId = 'card-logo';
                const parentGroup = input.closest('.form-group');
                if (parentGroup && parentGroup.id.startsWith('form-group-static-')) draggableId = `social-link-static-${parentGroup.id.replace('form-group-static-', '')}`;
                if (draggableId) UIManager.highlightElement(draggableId, false);
            });
        });

        document.addEventListener('keydown', (e) => {
            if (e.ctrlKey || e.metaKey) {
                const activeTag = document.activeElement.tagName;
                const isInInput = activeTag === 'INPUT' || activeTag === 'TEXTAREA';

                // When focused in an input/textarea, let the browser handle native undo/redo
                if (isInInput) return;

                const key = e.key.toLowerCase();

                if (key === 'z' && !e.shiftKey) {
                    // Ctrl+Z / Cmd+Z → Undo
                    e.preventDefault();
                    HistoryManager.undo();
                    _showUndoRedoFeedback('undo');
                } else if (key === 'y' || (key === 'z' && e.shiftKey)) {
                    // Ctrl+Y / Cmd+Y / Ctrl+Shift+Z / Cmd+Shift+Z → Redo
                    e.preventDefault();
                    HistoryManager.redo();
                    _showUndoRedoFeedback('redo');
                }
            }
        });

        const previewBtn = DOMElements.buttons.previewMode;
        const exitPreviewBtn = DOMElements.buttons.exitPreview;
        if (previewBtn && exitPreviewBtn) {
            const togglePreview = () => {
                document.body.classList.toggle('preview-mode-active');
                const isActive = document.body.classList.contains('preview-mode-active');
                exitPreviewBtn.style.display = isActive ? 'flex' : 'none';
                previewBtn.setAttribute('aria-pressed', isActive.toString());
            };
            previewBtn.addEventListener('click', togglePreview);
            exitPreviewBtn.addEventListener('click', togglePreview);
            document.addEventListener('keydown', (e) => {
                if (e.key === 'Escape' && document.body.classList.contains('preview-mode-active')) {
                    togglePreview();
                }
            });
        }

        const langToggleBtn = DOMElements.buttons.langToggle;
        if (langToggleBtn) {
            langToggleBtn.addEventListener('click', () => {
                // Use the global switchLanguage function from lang-switcher.js for page redirect
                if (typeof window.switchLanguage === 'function') {
                    const isArabic = document.documentElement.lang === 'ar' || !document.documentElement.lang;
                    const targetLang = isArabic ? 'en' : 'ar';
                    window.switchLanguage(targetLang);
                } else {
                    // Fallback: manual redirect if lang-switcher.js not loaded
                    const currentPage = window.location.pathname.split('/').pop() || 'editor.html';
                    if (currentPage === 'editor.html') {
                        window.location.href = 'editor-en.html';
                    } else if (currentPage === 'editor-en.html') {
                        window.location.href = 'editor.html';
                    }
                }
            });
        }

        const downloadHtmlBtn = document.querySelector('[data-trigger-id="download-html"]');
        if (downloadHtmlBtn) {
            downloadHtmlBtn.addEventListener('click', () => ExportManager.downloadHtmlPackage());
        }

        document.querySelectorAll('input[name="layout-select-visual"]').forEach(radio => {
            radio.addEventListener('change', (e) => {
                CardManager.applyLayout(e.target.value);
                const hiddenInput = document.getElementById('layout-select');
                if (hiddenInput) hiddenInput.value = e.target.value;
            });
        });


        document.querySelectorAll('.position-controls-grid').forEach(grid => {
            grid.querySelectorAll('.move-btn').forEach(button => {
                button.addEventListener('click', (e) => {
                    e.preventDefault();
                    const direction = button.dataset.direction;
                    let targetId = grid.dataset.targetId;
                    if (targetId && targetId.startsWith('form-group-static-')) targetId = `social-link-static-${targetId.replace('form-group-static-', '')}`;
                    if (targetId) EventManager.moveElement(targetId, direction);
                    else console.error("Missing targetId for move button.");
                });
            });
        });

        DOMElements.qrSourceRadios.forEach(radio => {
            radio.addEventListener('change', () => {
                const selectedValue = radio.value;
                DOMElements.qrUrlGroup.style.display = selectedValue === 'custom' ? 'block' : 'none';
                DOMElements.qrUploadGroup.style.display = selectedValue === 'upload' ? 'block' : 'none';
                DOMElements.qrAutoCardGroup.style.display = selectedValue === 'auto-card' ? 'block' : 'none';

                // Show customization only for auto-generated methods
                const customGroup = document.getElementById('qr-customization-group');
                if (customGroup) {
                    customGroup.style.display = (selectedValue === 'auto-card' || selectedValue === 'auto-vcard') ? 'block' : 'none';
                }

                CardManager.autoGeneratedQrDataUrl = null;
                if (selectedValue === 'auto-vcard') CardManager.generateVCardQr();
                else CardManager.updateQrCodeDisplay();
            });
        });

        // QR Customization Listeners
        const qrInputs = ['qr-dots-color', 'qr-bg-color', 'qr-dots-type', 'qr-corners-type', 'qr-use-logo'];
        qrInputs.forEach(id => {
            const el = document.getElementById(id);
            if (el) {
                el.addEventListener('input', () => {
                    const source = document.querySelector('input[name="qr-source"]:checked')?.value;
                    if (source === 'auto-vcard') CardManager.generateVCardQrDebounced();
                    // For auto-card, we might want a manual update or debounced. 
                    // Since auto-card requires saving design, we don't want to spam it.
                    // But maybe we can update preview? No, generateCardLinkQr does everything.
                    // So for auto-card, user has to click "Generate/Update".
                    // But for auto-vcard it's fast.
                });
            }
        });

        document.querySelectorAll('input[name^="placement-"]').forEach(radio => {
            radio.addEventListener('change', () => {
                const elementName = radio.name.replace('placement-', '');
                let elementToReset;

                const staticMatch = elementName.match(/static-(.*)/);
                if (staticMatch) {
                    elementToReset = document.getElementById(`social-link-static-${staticMatch[1]}`);
                } else if (elementName.startsWith('dynsocial_')) {
                    elementToReset = document.getElementById(`social-link-${elementName.replace(/[^a-zA-Z0-9-]/g, '-')}`);
                } else {
                    const elementsMap = { logo: DOMElements.draggable.logo, photo: DOMElements.draggable.photo, name: DOMElements.draggable.name, tagline: DOMElements.draggable.tagline, qr: DOMElements.draggable.qr };
                    elementToReset = elementsMap[elementName];
                }

                if (elementToReset) {
                    elementToReset.style.transform = 'translate(0px, 0px)';
                    elementToReset.setAttribute('data-x', '0');
                    elementToReset.setAttribute('data-y', '0');
                }
                CardManager.renderCardContent();
            });
        });

        DOMElements.buttons.generateAutoQr.addEventListener('click', () => {
            if (typeof gtag === 'function') { gtag('event', 'generate_qr_code'); }
            CardManager.generateCardLinkQr();
        });

        DOMElements.fileInputs.logo.addEventListener('change', e => UIManager.handleImageUpload(e, {
            maxSizeMB: Config.MAX_LOGO_SIZE_MB,
            errorEl: DOMElements.errors.logoUpload,
            spinnerEl: DOMElements.spinners.logo,
            onSuccess: (imageUrl) => {
                DOMElements.draggable.logoImg.src = imageUrl;
                document.getElementById('input-logo').value = imageUrl;
                DOMElements.previews.logo.src = imageUrl;
                UIManager.updateFavicon(imageUrl);
            },
            cropOptions: { aspectRatio: NaN } // Free crop for logos
        }));

        DOMElements.fileInputs.photo.addEventListener('change', e => UIManager.handleImageUpload(e, {
            maxSizeMB: Config.MAX_LOGO_SIZE_MB,
            errorEl: DOMElements.errors.photoUpload,
            spinnerEl: DOMElements.spinners.photo,
            onSuccess: imageUrl => {
                CardManager.personalPhotoUrl = imageUrl;
                DOMElements.photoControls.url.value = imageUrl;
                DOMElements.photoControls.url.dispatchEvent(new Event('input', { bubbles: true }));
            },
            cropOptions: { aspectRatio: 1 / 1 } // Square crop for personal photos
        }));

        DOMElements.fileInputs.frontBg.addEventListener('change', e => UIManager.handleImageUpload(e, {
            maxSizeMB: Config.MAX_BG_SIZE_MB, errorEl: DOMElements.errors.logoUpload, spinnerEl: DOMElements.spinners.frontBg,
            onSuccess: url => {
                CardManager.frontBgImageUrl = url; DOMElements.buttons.removeFrontBg.style.display = 'block';
                CardManager.updateCardBackgrounds();
            },
            // No crop for backgrounds
        }));

        DOMElements.fileInputs.backBg.addEventListener('change', e => UIManager.handleImageUpload(e, {
            maxSizeMB: Config.MAX_BG_SIZE_MB, errorEl: DOMElements.errors.logoUpload, spinnerEl: DOMElements.spinners.backBg,
            onSuccess: url => {
                CardManager.backBgImageUrl = url; DOMElements.buttons.removeBackBg.style.display = 'block';
                CardManager.updateCardBackgrounds();
            },
            // No crop for backgrounds
        }));

        DOMElements.fileInputs.qrCode.addEventListener('change', e => UIManager.handleImageUpload(e, {
            maxSizeMB: Config.MAX_LOGO_SIZE_MB, errorEl: DOMElements.errors.qrUpload, spinnerEl: DOMElements.spinners.qr,
            onSuccess: imageUrl => {
                CardManager.qrCodeImageUrl = imageUrl; DOMElements.qrImageUrlInput.value = imageUrl;
                CardManager.updateQrCodeDisplay();
            },
            // No crop for QR codes
        }));

        DOMElements.themeGallery.addEventListener('click', (e) => {
            const thumbnail = e.target.closest('.theme-thumbnail');
            if (thumbnail) {
                const themeKey = thumbnail.dataset.themeKey;
                CardManager.applyTheme(themeKey);
            }
        });

        DOMElements.buttons.addPhone.addEventListener('click', () => { CardManager.createPhoneInput(); CardManager.renderPhoneButtons(); });
        DOMElements.buttons.addSocial.addEventListener('click', () => CardManager.addSocialLink());
        DOMElements.buttons.reset.addEventListener('click', () => StateManager.reset());
        DOMElements.layoutSelect.addEventListener('change', e => CardManager.applyLayout(e.target.value));

        DOMElements.buttons.shareCard.addEventListener('click', () => {
            if (typeof gtag === 'function') { gtag('event', 'share_card', { 'share_type': 'viewer_link' }); }
            ShareManager.shareCard();
        });

        DOMElements.buttons.shareEditor.addEventListener('click', () => {
            if (typeof gtag === 'function') { gtag('event', 'share_editor'); }
            ShareManager.shareEditor();
        });

        DOMElements.draggable.logo.addEventListener('click', (e) => { e.preventDefault(); e.stopPropagation(); UIManager.navigateToAndHighlight('logo-drop-zone'); });
        DOMElements.draggable.photo.addEventListener('click', (e) => { e.preventDefault(); e.stopPropagation(); UIManager.navigateToAndHighlight('photo-controls-fieldset'); });
        DOMElements.draggable.name.addEventListener('click', (e) => { e.preventDefault(); e.stopPropagation(); UIManager.navigateToAndHighlight('name-tagline-accordion'); });
        DOMElements.draggable.tagline.addEventListener('click', (e) => { e.preventDefault(); e.stopPropagation(); UIManager.navigateToAndHighlight('name-tagline-accordion'); });
        DOMElements.draggable.qr.addEventListener('click', (e) => { e.preventDefault(); e.stopPropagation(); UIManager.navigateToAndHighlight('qr-code-accordion'); });

        const logoAspectLockBtn = document.getElementById('logo-aspect-lock');
        const logoAspectCheckbox = document.getElementById('logo-aspect-lock-checkbox');
        if (logoAspectLockBtn) {
            logoAspectLockBtn.addEventListener('click', (e) => {
                e.preventDefault();
                const isActive = logoAspectLockBtn.classList.toggle('active');
                if (logoAspectCheckbox) logoAspectCheckbox.checked = isActive;
                CardManager.updateLogoDimensions();
                StateManager.saveDebounced();
            });
        }
        if (logoAspectCheckbox) {
            logoAspectCheckbox.addEventListener('change', () => {
                if (logoAspectLockBtn) {
                    logoAspectLockBtn.classList.toggle('active', logoAspectCheckbox.checked);
                }
            });
        }

        DOMElements.buttons.togglePhone.addEventListener('input', () => { CardManager.updatePhoneButtonsVisibility(); });

        DOMElements.buttons.toggleSocial.addEventListener('input', () => {
            CardManager.updateSocialLinksVisibility();
            CardManager.updateSocialButtonStyles();
            CardManager.updateSocialTextStyles();
        });

        if (DOMElements.buttons.toggleMasterSocial) {
            DOMElements.buttons.toggleMasterSocial.addEventListener('input', () => {
                CardManager.handleMasterSocialToggle();
            });
        }

        const phoneTextControlsList = [...DOMElements.phoneTextControls.layoutRadios, DOMElements.phoneTextControls.size, DOMElements.phoneTextControls.color, DOMElements.phoneTextControls.font];
        phoneTextControlsList.forEach(control => {
            control.addEventListener('input', () => { CardManager.updatePhoneTextStyles(); });
        });

        DOMElements.buttons.removeFrontBg.addEventListener('click', () => {
            CardManager.frontBgImageUrl = null;
            DOMElements.fileInputs.frontBg.value = '';
            DOMElements.frontBgOpacity.value = 1;
            DOMElements.frontBgOpacity.dispatchEvent(new Event('input'));
            DOMElements.buttons.removeFrontBg.style.display = 'none';
            CardManager.updateCardBackgrounds();
        });

        DOMElements.buttons.removeBackBg.addEventListener('click', () => {
            CardManager.backBgImageUrl = null;
            DOMElements.fileInputs.backBg.value = '';
            DOMElements.backBgOpacity.value = 1;
            DOMElements.backBgOpacity.dispatchEvent(new Event('input'));
            DOMElements.buttons.removeBackBg.style.display = 'none';
            CardManager.updateCardBackgrounds();
        });

        DOMElements.buttons.downloadOptions.addEventListener('click', (e) => {
            e.stopPropagation();
            DOMElements.downloadMenu.classList.toggle('show');
        });

        window.addEventListener('click', (e) => {
            if (!DOMElements.downloadContainer.contains(e.target)) {
                DOMElements.downloadMenu.classList.remove('show');
            }
        });

        DOMElements.buttons.downloadPngFront.addEventListener('click', (e) => {
            if (typeof gtag === 'function') { gtag('event', 'save_card', { 'file_type': 'png_front' }); }
            ExportManager.pendingExportTarget = 'front'; UIManager.showModal(DOMElements.exportModal.overlay, e.currentTarget);
        });

        DOMElements.buttons.downloadPngBack.addEventListener('click', (e) => {
            if (typeof gtag === 'function') { gtag('event', 'save_card', { 'file_type': 'png_back' }); }
            ExportManager.pendingExportTarget = 'back'; UIManager.showModal(DOMElements.exportModal.overlay, e.currentTarget);
        });

        DOMElements.buttons.downloadPdf.addEventListener('click', async (e) => {
            if (typeof gtag === 'function') { gtag('event', 'save_card', { 'file_type': 'pdf' }); }
            const button = e.currentTarget;
            UIManager.setButtonLoadingState(button, true);
            try { await ExportManager.downloadPdf(); }
            catch (error) { }
            finally { UIManager.setButtonLoadingState(button, false); }
        });

        DOMElements.buttons.downloadVcf.addEventListener('click', () => {
            if (typeof gtag === 'function') { gtag('event', 'save_card', { 'file_type': 'vcf' }); }
            ExportManager.downloadVcf();
        });

        DOMElements.buttons.downloadQrCode.addEventListener('click', async (e) => {
            if (typeof gtag === 'function') { gtag('event', 'save_card', { 'file_type': 'qr_code_link' }); }
            const button = e.currentTarget;
            UIManager.setButtonLoadingState(button, true);
            try { await ExportManager.downloadQrCode(); }
            catch (error) { }
            finally { UIManager.setButtonLoadingState(button, false); }
        });

        DOMElements.buttons.backToTop.addEventListener('click', () => { window.scrollTo({ top: 0, behavior: 'smooth' }); });
        const handleScroll = () => { window.scrollY > 300 ? DOMElements.buttons.backToTop.classList.add('visible') : DOMElements.buttons.backToTop.classList.remove('visible'); };
        window.addEventListener('scroll', Utils.debounce(handleScroll, 100));
        DOMElements.exportModal.overlay.addEventListener('click', (e) => { if (e.target === DOMElements.exportModal.overlay) UIManager.hideModal(DOMElements.exportModal.overlay); });
        DOMElements.exportModal.closeBtn.addEventListener('click', () => UIManager.hideModal(DOMElements.exportModal.overlay));

        DOMElements.exportModal.confirmBtn.addEventListener('click', async () => {
            try {
                const options = { format: DOMElements.exportModal.format.value, quality: DOMElements.exportModal.quality.value / 100, scale: parseFloat(DOMElements.exportModal.scaleContainer.querySelector('.selected').dataset.scale) };
                await ExportManager.downloadElement(options);
            } catch (error) { alert("فشل تحميل أداة الحفظ. يرجى المحاولة مرة أخرى."); }
        });

        DOMElements.exportModal.format.addEventListener('input', () => { DOMElements.exportModal.qualityGroup.style.display = DOMElements.exportModal.format.value === 'jpeg' ? 'block' : 'none'; });
        DOMElements.exportModal.quality.addEventListener('input', () => { DOMElements.exportModal.qualityValue.textContent = DOMElements.exportModal.quality.value; });
        DOMElements.exportModal.scaleContainer.addEventListener('click', e => { if (e.target.classList.contains('scale-btn')) { DOMElements.exportModal.scaleContainer.querySelector('.selected').classList.remove('selected'); e.target.classList.add('selected'); } });

        DOMElements.buttons.saveToGallery.addEventListener('click', async (e) => {
            const button = e.currentTarget;
            UIManager.setButtonLoadingState(button, true, 'جاري الحفظ...');
            try { await GalleryManager.addCurrentDesign(); }
            finally { UIManager.setButtonLoadingState(button, false); }
        });
        DOMElements.buttons.showGallery.addEventListener('click', (e) => { GalleryManager.render(); UIManager.showModal(DOMElements.galleryModal.overlay, e.currentTarget); });

        DOMElements.galleryModal.closeBtn.addEventListener('click', () => UIManager.hideModal(DOMElements.galleryModal.overlay));
        DOMElements.galleryModal.selectAllBtn.addEventListener('click', () => DOMElements.galleryModal.grid.querySelectorAll('.gallery-item-select').forEach(cb => { cb.checked = true; cb.closest('.gallery-item').classList.add('selected'); GalleryManager.updateSelectionState(); }));
        DOMElements.galleryModal.deselectAllBtn.addEventListener('click', () => DOMElements.galleryModal.grid.querySelectorAll('.gallery-item-select').forEach(cb => { cb.checked = false; cb.closest('.gallery-item').classList.remove('selected'); GalleryManager.updateSelectionState(); }));

        DOMElements.galleryModal.downloadZipBtn.addEventListener('click', async (e) => {
            const button = e.currentTarget;
            UIManager.setButtonLoadingState(button, true, 'جاري التجهيز...');
            try { await GalleryManager.downloadSelectedAsZip(); }
            finally { StateManager.applyState(StateManager.getStateObject(), false); UIManager.setButtonLoadingState(button, false); }
        });

        DOMElements.galleryModal.grid.addEventListener('change', e => { if (e.target.classList.contains('gallery-item-select')) { e.target.closest('.gallery-item').classList.toggle('selected', e.target.checked); GalleryManager.updateSelectionState(); } });
        DOMElements.shareModal.closeBtn.addEventListener('click', () => UIManager.hideModal(DOMElements.shareModal.overlay));
        DOMElements.shareModal.overlay.addEventListener('click', e => { if (e.target === DOMElements.shareModal.overlay) UIManager.hideModal(DOMElements.shareModal.overlay); });

        const suggestBtn = document.getElementById('ai-suggest-btn');
        if (suggestBtn) {
            suggestBtn.addEventListener('click', () => {
                if (typeof SuggestionEngine !== 'undefined') {
                    SuggestionEngine.suggestDesign();
                } else {
                    console.error('SuggestionEngine is not defined.');
                }
            });
        }

        // Undo/Redo button handlers are bound in App.init() to include autosave indicator updates

        DOMElements.helpModal.closeBtn.addEventListener('click', () => UIManager.hideModal(DOMElements.helpModal.overlay));
        DOMElements.helpModal.overlay.addEventListener('click', e => {
            if (e.target === DOMElements.helpModal.overlay) UIManager.hideModal(DOMElements.helpModal.overlay);
        });

        DOMElements.helpModal.nav.addEventListener('click', (e) => {
            const button = e.target.closest('.help-tab-btn');
            if (!button) return;

            DOMElements.helpModal.nav.querySelectorAll('.help-tab-btn').forEach(btn => btn.classList.remove('active'));
            DOMElements.helpModal.panes.forEach(pane => pane.classList.remove('active'));

            button.classList.add('active');
            const targetPane = document.getElementById(button.dataset.tabTarget);
            if (targetPane) {
                targetPane.classList.add('active');
            }
        });
    }
};

const UserTemplateManager = {
    init() {
        this.bindEvents();
    },

    bindEvents() {
        const btnOpenTemplate = document.getElementById('open-templates-btn');
        const btnOpenTemplateMenu = document.getElementById('open-templates-btn-menu');
        if (btnOpenTemplate) btnOpenTemplate.addEventListener('click', () => this.openLibraryModal());
        if (btnOpenTemplateMenu) btnOpenTemplateMenu.addEventListener('click', () => {
            document.getElementById('toolbar-more-menu-floating')?.classList.remove('show');
            this.openLibraryModal();
        });

        const btnSaveTemplate = document.getElementById('save-as-template-btn');
        const btnSaveTemplateMenu = document.getElementById('save-as-template-btn-menu');
        if (btnSaveTemplate) btnSaveTemplate.addEventListener('click', () => this.openSaveModal());
        if (btnSaveTemplateMenu) btnSaveTemplateMenu.addEventListener('click', () => {
            document.getElementById('toolbar-more-menu-floating')?.classList.remove('show');
            this.openSaveModal();
        });

        const closeLibraryBtn = document.getElementById('close-templates-library-btn');
        if (closeLibraryBtn) closeLibraryBtn.addEventListener('click', () => this.closeLibraryModal());

        const closeSaveBtn = document.getElementById('cancel-save-template-btn');
        if (closeSaveBtn) closeSaveBtn.addEventListener('click', () => this.closeSaveModal());

        const confirmSaveBtn = document.getElementById('confirm-save-template-btn');
        if (confirmSaveBtn) confirmSaveBtn.addEventListener('click', () => this.saveCurrentAsTemplate());
    },

    async openLibraryModal() {
        const modal = document.getElementById('templates-library-modal-overlay');
        const grid = document.getElementById('templates-grid');
        UIManager.showModal(modal);
        if (grid) grid.innerHTML = '<div class="spinner" style="margin:20px auto;"></div>';

        try {
            const token = localStorage.getItem('accessToken');
            const headers = {};
            if (token) headers['Authorization'] = `Bearer ${token}`;

            const response = await fetch('/api/templates', { headers });
            if (!response.ok) throw new Error('إرجاع القوالب فشل / Failed to fetch templates');
            const data = await response.json();
            this.renderTemplates(data.templates || []);
        } catch (error) {
            console.error('Fetch templates error:', error);
            if (grid) grid.innerHTML = '<p style="color:var(--text-secondary); text-align:center;">تعذر تحميل القوالب. / Failed to load templates.</p>';
        }
    },

    renderTemplates(templates) {
        const grid = document.getElementById('templates-grid');
        if (!grid) return;
        grid.innerHTML = '';
        if (templates.length === 0) {
            grid.innerHTML = '<p style="text-align:center; color:var(--text-secondary); grid-column: 1 / -1;">لا توجد قوالب متاحة حالياً. / No templates available.</p>';
            return;
        }

        templates.forEach(template => {
            const item = document.createElement('div');
            item.className = 'gallery-item';
            item.style.cursor = 'pointer';
            item.style.position = 'relative';

            const bgColor = template.state?.frontBgColor || '#ffffff';
            const primaryColor = template.state?.nameColor || '#333333';
            const taglineColor = template.state?.taglineColor || '#666666';
            const isDarkMode = document.body.classList.contains('dark-mode');
            const borderColor = isDarkMode ? '#444' : '#e2e8f0';

            item.innerHTML = `
                <div class="gallery-item-preview" style="background:${bgColor}; padding: 15px; border-radius: 8px; border: 1px solid ${borderColor}; height: 120px; display:flex; flex-direction:column; justify-content:center; align-items:center;">
                    <div style="width:40px; height:40px; background:${primaryColor}; border-radius:50%; margin-bottom:10px;"></div>
                    <div style="width:60%; height:8px; background:${primaryColor}; margin-bottom:5px; border-radius:4px;"></div>
                    <div style="width:40%; height:6px; background:${taglineColor}; border-radius:4px;"></div>
                </div>
                <div class="gallery-item-details" style="padding:10px 5px; text-align:center;">
                    <h4 style="margin:0; font-size:0.9rem;">${template.name || 'قالب بدون اسم'}</h4>
                    <span style="font-size:0.75rem; color:var(--text-secondary);">${template.isPublic ? 'عام / Public' : 'خاص / Private'}</span>
                </div>
            `;
            item.addEventListener('click', () => {
                const isArabic = document.documentElement.lang === 'ar' || !document.documentElement.lang;
                const msg = isArabic ? 'هل أنت متأكد من تطبيق هذا القالب؟ سيتم تغيير تصميمك الحالي.' : 'Are you sure you want to apply this template? Your current design will be changed.';
                if (confirm(msg)) {
                    this.applyTemplate(template);
                }
            });
            grid.appendChild(item);
        });
    },

    applyTemplate(template) {
        if (!template || !template.state) return;
        StateManager.applyState(template.state, true);
        this.closeLibraryModal();
        const isArabic = document.documentElement.lang === 'ar' || !document.documentElement.lang;
        UIManager.announce(isArabic ? 'تم تطبيق القالب بنجاح.' : 'Template applied successfully.');
        Utils.showToast(isArabic ? 'تم تطبيق القالب!' : 'Template applied!');
        // Update History to recognize this as a new significant state
        HistoryManager.pushState(template.state);
        window.StateManager.saveDebounced();
    },

    openSaveModal() {
        const token = localStorage.getItem('accessToken');
        const isArabic = document.documentElement.lang === 'ar' || !document.documentElement.lang;
        if (!token) {
            alert(isArabic ? 'يجب تسجيل الدخول لحفظ قالب جديد.' : 'You must log in to save a new template.');
            window.location.href = isArabic ? 'login.html' : 'login-en.html';
            return;
        }
        document.getElementById('template-name-input').value = '';
        document.getElementById('template-public-checkbox').checked = false;
        const modal = document.getElementById('save-template-modal-overlay');
        UIManager.showModal(modal);
    },

    closeLibraryModal() {
        UIManager.hideModal(document.getElementById('templates-library-modal-overlay'));
    },

    closeSaveModal() {
        UIManager.hideModal(document.getElementById('save-template-modal-overlay'));
    },

    async saveCurrentAsTemplate() {
        const nameInput = document.getElementById('template-name-input');
        const name = nameInput ? nameInput.value.trim() : '';
        const isArabic = document.documentElement.lang === 'ar' || !document.documentElement.lang;

        if (!name) {
            alert(isArabic ? 'يرجى إدخال اسم القالب.' : 'Please enter a template name.');
            return;
        }

        const isPublic = document.getElementById('template-public-checkbox') ? document.getElementById('template-public-checkbox').checked : false;
        const confirmBtn = document.getElementById('confirm-save-template-btn');
        UIManager.setButtonLoadingState(confirmBtn, true, isArabic ? 'جاري الحفظ...' : 'Saving...');

        try {
            const token = localStorage.getItem('accessToken');
            if (!token) throw new Error('Unauthorized');

            const state = StateManager.getStateObject();

            const payload = {
                name: name,
                state: state,
                isPublic: isPublic
            };

            const response = await fetch('/api/templates', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(payload)
            });

            if (!response.ok) {
                const errData = await response.json();
                throw new Error(errData.error || (isArabic ? 'فشل حفظ القالب' : 'Failed to save template.'));
            }

            this.closeSaveModal();
            UIManager.announce(isArabic ? 'تم حفظ القالب بنجاح.' : 'Template saved successfully.');
            Utils.showToast(isArabic ? 'تم حفظ القالب الخاص بك!' : 'Your template has been saved!');

        } catch (error) {
            console.error('Save template error:', error);
            alert((isArabic ? 'خطأ أثناء حفظ القالب: ' : 'Error saving template: ') + error.message);
        } finally {
            UIManager.setButtonLoadingState(confirmBtn, false);
        }
    }
};

const App = {
    async init() {
        // Initialize Proxy State
        if (window.StateManagerProxy) {
            window.StateManagerProxy.init(Config.defaultState);
        }

        Object.assign(DOMElements, {
            cardFront: document.getElementById('card-front-preview'),
            cardBack: document.getElementById('card-back-preview'),
            cardFrontContent: document.getElementById('card-front-content'),
            cardBackContent: document.getElementById('card-back-content'),
            phoneNumbersContainer: document.getElementById('phone-numbers-container'),
            cardsWrapper: document.getElementById('cards-wrapper'),

            draggable: {
                logo: document.getElementById('card-logo'),
                logoImg: document.getElementById('card-logo-img'),
                photo: document.getElementById('card-personal-photo-wrapper'),
                name: document.getElementById('card-name'),
                tagline: document.getElementById('card-tagline'),
                qr: document.getElementById('qr-code-wrapper')
            },

            photoControls: {
                url: document.getElementById('input-photo-url'),
                shapeRadios: document.querySelectorAll('input[name="photo-shape"]'),
                borderColor: document.getElementById('photo-border-color'),
                borderWidth: document.getElementById('photo-border-width'),
            },

            themeGallery: document.getElementById('theme-gallery'),
            layoutSelect: document.getElementById('layout-select'), liveAnnouncer: document.getElementById('live-announcer'), saveToast: document.getElementById('save-toast'),
            nameInput: document.getElementById('input-name_ar'),
            taglineInput: document.getElementById('input-tagline_ar'),
            qrImageUrlInput: document.getElementById('input-qr-url'),
            qrCodeContainer: document.getElementById('qrcode-container'),
            qrCodeTempGenerator: document.getElementById('qr-code-temp-generator'),
            qrSourceRadios: document.querySelectorAll('input[name="qr-source"]'),
            qrUrlGroup: document.getElementById('qr-url-group'),
            qrUploadGroup: document.getElementById('qr-upload-group'),
            qrAutoCardGroup: document.getElementById('qr-auto-card-group'),
            qrSizeSlider: document.getElementById('qr-size'),
            phoneBtnBgColor: document.getElementById('phone-btn-bg-color'), phoneBtnTextColor: document.getElementById('phone-btn-text-color'), phoneBtnFontSize: document.getElementById('phone-btn-font-size'), phoneBtnFont: document.getElementById('phone-btn-font'), backButtonsBgColor: document.getElementById('back-buttons-bg-color'), backButtonsTextColor: document.getElementById('back-buttons-text-color'), backButtonsFont: document.getElementById('back-buttons-font'),
            frontBgOpacity: document.getElementById('front-bg-opacity'), backBgOpacity: document.getElementById('back-bg-opacity'), phoneBtnPadding: document.getElementById('phone-btn-padding'), backButtonsSize: document.getElementById('back-buttons-size'),
            nameColor: document.getElementById('name-color'), nameFontSize: document.getElementById('name-font-size'), nameFont: document.getElementById('name-font'),
            taglineColor: document.getElementById('tagline-color'), taglineFontSize: document.getElementById('tagline-font-size'), taglineFont: document.getElementById('tagline-font'),
            social: { input: document.getElementById('social-media-input'), container: document.getElementById('dynamic-social-links-container'), typeSelect: document.getElementById('social-media-type') },
            fileInputs: { logo: document.getElementById('input-logo-upload'), photo: document.getElementById('input-photo-upload'), frontBg: document.getElementById('front-bg-upload'), backBg: document.getElementById('back-bg-upload'), qrCode: document.getElementById('input-qr-upload') },
            previews: { logo: document.getElementById('logo-preview'), photo: document.getElementById('photo-preview') },
            errors: { logoUpload: document.getElementById('logo-upload-error'), photoUpload: document.getElementById('photo-upload-error'), qrUpload: document.getElementById('qr-upload-error') },
            spinners: { logo: document.getElementById('logo-spinner'), photo: document.getElementById('photo-spinner'), frontBg: document.getElementById('front-bg-spinner'), backBg: document.getElementById('back-bg-spinner'), qr: document.getElementById('qr-spinner') },
            sounds: { success: document.getElementById('audio-success'), error: document.getElementById('audio-error') },
            phoneTextControls: { container: document.getElementById('phone-text-controls'), layoutRadios: document.querySelectorAll('input[name="phone-text-layout"]'), size: document.getElementById('phone-text-size'), color: document.getElementById('phone-text-color'), font: document.getElementById('phone-text-font'), },
            socialTextControls: { container: document.getElementById('social-text-controls'), size: document.getElementById('social-text-size'), color: document.getElementById('social-text-color'), font: document.getElementById('social-text-font'), },
            socialControlsWrapper: document.getElementById('social-controls-wrapper'),
            exportLoadingOverlay: document.getElementById('export-loading-overlay'),
            exportModal: { overlay: document.getElementById('export-modal-overlay'), closeBtn: document.getElementById('export-modal-close'), confirmBtn: document.getElementById('confirm-export-btn'), format: document.getElementById('export-format'), qualityGroup: document.getElementById('export-quality-group'), quality: document.getElementById('export-quality'), qualityValue: document.getElementById('export-quality-value'), scaleContainer: document.querySelector('.scale-buttons') },
            galleryModal: { overlay: document.getElementById('gallery-modal-overlay'), closeBtn: document.getElementById('gallery-modal-close'), grid: document.getElementById('gallery-grid'), selectAllBtn: document.getElementById('gallery-select-all'), deselectAllBtn: document.getElementById('gallery-deselect-all'), downloadZipBtn: document.getElementById('gallery-download-zip') },
            shareModal: { overlay: document.getElementById('share-fallback-modal-overlay'), closeBtn: document.getElementById('share-fallback-modal-close'), email: document.getElementById('share-email'), whatsapp: document.getElementById('share-whatsapp'), twitter: document.getElementById('share-twitter'), copyLink: document.getElementById('share-copy-link') },
            downloadContainer: document.querySelector('.download-container'),
            downloadMenu: document.getElementById('download-menu'),
            helpModal: {
                overlay: document.getElementById('help-modal-overlay'),
                closeBtn: document.getElementById('help-modal-close'),
                nav: document.querySelector('.help-tabs-nav'),
                panes: document.querySelectorAll('.help-tab-pane')
            },

            buttons: {
                addPhone: document.getElementById('add-phone-btn'), addSocial: document.getElementById('add-social-btn'),
                removeFrontBg: document.getElementById('remove-front-bg-btn'), removeBackBg: document.getElementById('remove-back-bg-btn'),
                backToTop: document.getElementById('back-to-top-btn'),
                togglePhone: document.getElementById('toggle-phone-buttons'),
                toggleSocial: document.getElementById('toggle-social-buttons'),
                toggleMasterSocial: document.getElementById('toggle-master-social'),
                saveToGallery: document.getElementById('save-to-gallery-btn'),
                showGallery: document.getElementById('show-gallery-btn'),
                shareCard: document.getElementById('share-card-btn'),
                shareEditor: document.getElementById('share-editor-btn'),
                downloadOptions: document.getElementById('download-options-btn'),
                downloadPngFront: document.getElementById('download-png-front'),
                downloadPngBack: document.getElementById('download-png-back'),
                downloadPdf: document.getElementById('download-pdf'),
                downloadVcf: document.getElementById('download-vcf'),
                downloadQrCode: document.getElementById('download-qrcode'),
                reset: document.getElementById('reset-design-btn'),
                undoBtn: document.getElementById('undo-btn'),
                redoBtn: document.getElementById('redo-btn'),
                generateAutoQr: document.getElementById('generate-auto-qr-btn'),
                previewMode: document.getElementById('preview-mode-btn'),
                exitPreview: document.getElementById('exit-preview-btn'),
                langToggle: document.getElementById('lang-toggle-btn'),
            }
        });

        Object.values(DOMElements.draggable).forEach(el => {
            if (el && el.id !== 'card-logo-img') {
                el.classList.add('draggable-on-card');
                const hint = document.createElement('i');
                hint.className = 'fas fa-arrows-alt dnd-hover-hint';
                el.appendChild(hint);
            }
        });

        ImageCropper.init();
        UIManager.init();
        UIManager.fetchAndPopulateBackgrounds();
        GalleryManager.init();
        UserTemplateManager.init();
        CollaborationManager.init();
        EventManager.bindEvents();

        const loadedFromUrl = await ShareManager.loadFromUrl();
        if (loadedFromUrl) {
            HistoryManager.pushState(StateManager.getStateObject());
            UIManager.announce("تم تحميل التصميم من الرابط بنجاح.");
            window.checkAndRestoreDraft();
        } else if (!CollaborationManager.isActive) {
            const loadedFromStorage = StateManager.load();
            if (loadedFromStorage) {
                HistoryManager.pushState(StateManager.getStateObject());
                UIManager.announce("تم استعادة التصميم المحفوظ.");
                window.checkAndRestoreDraft();
            } else {
                StateManager.applyState(Config.defaultState, false);
                HistoryManager.pushState(Config.defaultState);
                UIManager.announce("تم تحميل التصميم الافتراضي.");
                window.checkAndRestoreDraft();
            }
        }

        const initialQrSource = document.querySelector('input[name="qr-source"]:checked')?.value || 'auto-card';
        DOMElements.qrUrlGroup.style.display = initialQrSource === 'custom' ? 'block' : 'none';
        DOMElements.qrUploadGroup.style.display = initialQrSource === 'upload' ? 'block' : 'none';
        DOMElements.qrAutoCardGroup.style.display = initialQrSource === 'auto-card' ? 'block' : 'none';


        CardManager.updatePhoneButtonsVisibility();
        CardManager.updatePhoneTextStyles();
        DragManager.init();

        UIManager.announce("محرر بطاقة الأعمال جاهز للاستخدام.");

        TourManager.init();

        // Initialize Undo/Redo buttons (single binding point)
        if (DOMElements.buttons.undoBtn) {
            DOMElements.buttons.undoBtn.addEventListener('click', () => {
                HistoryManager.undo();
                _showUndoRedoFeedback('undo');
            });
        }
        if (DOMElements.buttons.redoBtn) {
            DOMElements.buttons.redoBtn.addEventListener('click', () => {
                HistoryManager.redo();
                _showUndoRedoFeedback('redo');
            });
        }

        // StateManager.saveDebounced handles history push and autosave internally now.
    }
};
document.addEventListener('DOMContentLoaded', () => App.init());