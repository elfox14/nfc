'use strict';

const ExportManager = {
    pendingExportTarget: null,
    
    async captureElement(element, scale = 2) {
        await Utils.loadScript(Config.SCRIPT_URLS.html2canvas);
        const style = document.createElement('style'); 
        style.innerHTML = '.no-export { display: none !important; }'; 
        document.head.appendChild(style);
        
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
        }
    },

    async downloadElement(options) { 
        const {format, quality, scale} = options;
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
        } catch(e) { 
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
        const name = DOMElements.nameInput.value.replace(/\n/g, ' ').split(' '); const firstName = name.slice(0, -1).join(' '); const lastName = name.slice(-1).join(' ');
        let vCard = `BEGIN:VCARD\nVERSION:3.0\nN:${lastName};${firstName};;;\nFN:${DOMElements.nameInput.value}\nORG:${DOMElements.taglineInput.value.replace(/\n/g, ' ')}\nTITLE:${DOMElements.taglineInput.value.replace(/\n/g, ' ')}\n`;
    
        const state = StateManager.getStateObject();
    
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

        } catch(e) { 
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
        UIManager.setButtonLoadingState(DOMElements.buttons.shareCard, true, 'جاري الالتقاط...');
        
        let frontImageUrl, backImageUrl, state;
        
        try {
            state = StateManager.getStateObject();
            frontImageUrl = await this.captureAndUploadCard(DOMElements.cardFront);
            
            UIManager.setButtonLoadingState(DOMElements.buttons.shareCard, true, 'جاري رفع الصور...');
            backImageUrl = await this.captureAndUploadCard(DOMElements.cardBack);

        } catch (error) {
            console.error("Card capture/upload failed:", error);
            alert("فشل التقاط أو رفع صورة البطاقة. يرجى المحاولة مرة أخرى.");
            UIManager.setButtonLoadingState(DOMElements.buttons.shareCard, false);
            return;
        }

        if (!state.imageUrls) state.imageUrls = {};
        state.imageUrls.capturedFront = frontImageUrl;
        state.imageUrls.capturedBack = backImageUrl;

        UIManager.setButtonLoadingState(DOMElements.buttons.shareCard, true, 'جاري الحفظ...');
        
        const designId = await this.saveDesign(state); 
        
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
        container.addEventListener('drop', () => { if (onSortCallback) onSortCallback(); 
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
                }
            }); 

            input.addEventListener('input', () => {
                CardManager.updateElementFromInput(input);
                if (input.id.includes('photo-')) CardManager.updatePersonalPhotoStyles();
                if (input.id.includes('phone-btn')) CardManager.updatePhoneButtonStyles();
                
                if (input.id.startsWith('back-buttons')) {
                    CardManager.updateSocialButtonStyles();
                }
                if (input.id.startsWith('social-text') || input.id.includes('-static-') || input.id.includes('-dynsocial_')) {
                    CardManager.updateSocialTextStyles();
                }

                if (input.id.startsWith('input-') && !input.id.includes('-static-') && !input.id.includes('-dynsocial_')) CardManager.updateSocialLinks();
                if (input.id.startsWith('front-bg-') || input.id.startsWith('back-bg-')) CardManager.updateCardBackgrounds();
                if (input.id === 'qr-size') CardManager.updateQrCodeDisplay();
                
                const vCardFields = ['input-name', 'input-tagline', 'input-email', 'input-website'];
                if (vCardFields.includes(input.id)) {
                    CardManager.generateVCardQrDebounced();
                }

                if(input.name.startsWith('placement-static-')) {
                    CardManager.updateSocialLinks();
                }
            });
            input.addEventListener('focus', () => {
                let draggableId = input.dataset.updateTarget;
                const parentGroup = input.closest('.form-group');
                if (parentGroup && parentGroup.id.startsWith('form-group-static-')) {
                    draggableId = `social-link-static-${parentGroup.id.replace('form-group-static-', '')}`;
                }
                if (draggableId) UIManager.highlightElement(draggableId, true);
                
            }); 
            input.addEventListener('blur', () => {
                let draggableId = input.dataset.updateTarget;
                const parentGroup = input.closest('.form-group');
                if (parentGroup && parentGroup.id.startsWith('form-group-static-')) {
                    draggableId = `social-link-static-${parentGroup.id.replace('form-group-static-', '')}`;
                }
                if (draggableId) UIManager.highlightElement(draggableId, false);
            }); 
        });
        
        document.querySelectorAll('input[name="layout-select-visual"]').forEach(radio => {
            radio.addEventListener('change', (e) => {
                CardManager.applyLayout(e.target.value);
                const hiddenInput = document.getElementById('layout-select');
                if(hiddenInput) hiddenInput.value = e.target.value;
            });
        });

        document.querySelectorAll('.position-controls-grid').forEach(grid => {
            grid.querySelectorAll('.move-btn').forEach(button => {
                button.addEventListener('click', (e) => {
                    e.preventDefault();
                    const direction = button.dataset.direction;
                    let targetId = grid.dataset.targetId;
                    
                    if (targetId && targetId.startsWith('form-group-static-')) {
                         targetId = `social-link-static-${targetId.replace('form-group-static-', '')}`;
                    }
                    
                    if (targetId) {
                        EventManager.moveElement(targetId, direction);
                    } else {
                        console.error("Missing targetId for move button.");
                    }
                });
            });
        });

        DOMElements.qrSourceRadios.forEach(radio => {
            radio.addEventListener('change', () => {
                const selectedValue = radio.value;
                DOMElements.qrUrlGroup.style.display = selectedValue === 'custom' ? 'block' : 'none';
                DOMElements.qrUploadGroup.style.display = selectedValue === 'upload' ? 'block' : 'none';
                DOMElements.qrAutoCardGroup.style.display = selectedValue === 'auto-card' ? 'block' : 'none';
                
                CardManager.autoGeneratedQrDataUrl = null;
                
                if (selectedValue === 'auto-vcard') {
                    CardManager.generateVCardQr();
                } else {
                    CardManager.updateQrCodeDisplay();
                }
            });
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
                    const elementsMap = {
                        logo: DOMElements.draggable.logo,
                        photo: DOMElements.draggable.photo,
                        name: DOMElements.draggable.name,
                        tagline: DOMElements.draggable.tagline,
                        qr: DOMElements.draggable.qr
                    };
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
            maxSizeMB: Config.MAX_LOGO_SIZE_MB, errorEl: DOMElements.errors.logoUpload, spinnerEl: DOMElements.spinners.logo, 
            onSuccess: imageUrl => { 
                DOMElements.draggable.logo.src = imageUrl;
                document.getElementById('input-logo').value = imageUrl; 
                UIManager.updateFavicon(imageUrl); 
            } 
        }));

        DOMElements.fileInputs.photo.addEventListener('change', e => UIManager.handleImageUpload(e, {
            maxSizeMB: Config.MAX_LOGO_SIZE_MB, errorEl: DOMElements.errors.photoUpload, spinnerEl: DOMElements.spinners.photo,
            onSuccess: imageUrl => {
                CardManager.personalPhotoUrl = imageUrl;
                DOMElements.photoControls.url.value = imageUrl;
                DOMElements.photoControls.url.dispatchEvent(new Event('input', { bubbles: true }));
            }
        }));
        
        DOMElements.fileInputs.frontBg.addEventListener('change', e => UIManager.handleImageUpload(e, { 
            maxSizeMB: Config.MAX_BG_SIZE_MB, errorEl: DOMElements.errors.logoUpload, spinnerEl: DOMElements.spinners.frontBg,
            onSuccess: url => { 
                CardManager.frontBgImageUrl = url; DOMElements.buttons.removeFrontBg.style.display = 'block'; 
                CardManager.updateCardBackgrounds(); 
            }
        }));
        
        DOMElements.fileInputs.backBg.addEventListener('change', e => UIManager.handleImageUpload(e, { 
            maxSizeMB: Config.MAX_BG_SIZE_MB, errorEl: DOMElements.errors.logoUpload, spinnerEl: DOMElements.spinners.backBg,
            onSuccess: url => { 
                CardManager.backBgImageUrl = url; DOMElements.buttons.removeBackBg.style.display = 'block'; 
                CardManager.updateCardBackgrounds(); 
            }
        }));
        
        DOMElements.fileInputs.qrCode.addEventListener('change', e => UIManager.handleImageUpload(e, {
            maxSizeMB: Config.MAX_LOGO_SIZE_MB, errorEl: DOMElements.errors.qrUpload, spinnerEl: DOMElements.spinners.qr, 
            onSuccess: imageUrl => { 
                CardManager.qrCodeImageUrl = imageUrl; DOMElements.qrImageUrlInput.value = imageUrl;
                CardManager.updateQrCodeDisplay(); 
            }
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
        DOMElements.draggable.name.addEventListener('click', (e) => { e.preventDefault(); e.stopPropagation(); UIManager.navigateToAndHighlight('input-name'); });
        DOMElements.draggable.tagline.addEventListener('click', (e) => { e.preventDefault(); e.stopPropagation(); UIManager.navigateToAndHighlight('input-tagline'); });
        DOMElements.draggable.qr.addEventListener('click', (e) => { e.preventDefault(); e.stopPropagation(); UIManager.navigateToAndHighlight('qr-code-accordion'); });
        
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
            catch (error) {} 
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
            catch (error) {} 
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

        DOMElements.galleryModal.grid.addEventListener('change', e => { if (e.target.classList.contains('gallery-item-select')) { e.target.closest('.gallery-item').classList.toggle('selected', e.target.checked); GalleryManager.updateSelectionState(); }});
        DOMElements.shareModal.closeBtn.addEventListener('click', () => UIManager.hideModal(DOMElements.shareModal.overlay));
        DOMElements.shareModal.overlay.addEventListener('click', e => { if(e.target === DOMElements.shareModal.overlay) UIManager.hideModal(DOMElements.shareModal.overlay); });
    
        DOMElements.buttons.undoBtn.addEventListener('click', () => HistoryManager.undo());
        DOMElements.buttons.redoBtn.addEventListener('click', () => HistoryManager.redo());
        
        DOMElements.helpModal.closeBtn.addEventListener('click', () => UIManager.hideModal(DOMElements.helpModal.overlay));
        DOMElements.helpModal.overlay.addEventListener('click', e => { 
            if(e.target === DOMElements.helpModal.overlay) UIManager.hideModal(DOMElements.helpModal.overlay); 
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
const App = {
    async init() {
        Object.assign(DOMElements, {
            cardFront: document.getElementById('card-front-preview'), 
            cardBack: document.getElementById('card-back-preview'), 
            cardFrontContent: document.getElementById('card-front-content'),
            cardBackContent: document.getElementById('card-back-content'),
            phoneNumbersContainer: document.getElementById('phone-numbers-container'), 
            cardsWrapper: document.getElementById('cards-wrapper'), 
            
            draggable: {
                logo: document.getElementById('card-logo'),
                photo: document.getElementById('card-personal-photo-wrapper'),
                name: document.getElementById('card-name'),
                tagline: document.getElementById('card-tagline'),
                qr: document.getElementById('qr-code-wrapper')
            },

            photoControls: {
                url: document.getElementById('input-photo-url'),
                size: document.getElementById('photo-size'),
                shapeRadios: document.querySelectorAll('input[name="photo-shape"]'),
                borderColor: document.getElementById('photo-border-color'),
                borderWidth: document.getElementById('photo-border-width'),
            },

            themeGallery: document.getElementById('theme-gallery'),
            layoutSelect: document.getElementById('layout-select'), liveAnnouncer: document.getElementById('live-announcer'), saveToast: document.getElementById('save-toast'),
            nameInput: document.getElementById('input-name'), taglineInput: document.getElementById('input-tagline'),
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
            previews: { logo: document.getElementById('logo-preview') }, errors: { logoUpload: document.getElementById('logo-upload-error'), photoUpload: document.getElementById('photo-upload-error'), qrUpload: document.getElementById('qr-upload-error') },
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
            }
        });
        
        Object.values(DOMElements.draggable).forEach(el => {
            if (el) {
                el.classList.add('draggable-on-card');
                const hint = document.createElement('i');
                hint.className = 'fas fa-arrows-alt dnd-hover-hint';
                el.appendChild(hint);
            }
        });

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
        
        const initialQrSource = document.querySelector('input[name="qr-source"]:checked')?.value || 'auto-card';
        DOMElements.qrUrlGroup.style.display = initialQrSource === 'custom' ? 'block' : 'none';
        DOMElements.qrUploadGroup.style.display = initialQrSource === 'upload' ? 'block' : 'none';
        DOMElements.qrAutoCardGroup.style.display = initialQrSource === 'auto-card' ? 'block' : 'none';

        
        CardManager.updatePhoneButtonsVisibility();
        CardManager.updatePhoneTextStyles();
        DragManager.init();
        
        UIManager.announce("محرر بطاقة الأعمال جاهز للاستخدام.");
        
        TourManager.init();
    }
};
document.addEventListener('DOMContentLoaded', () => App.init());