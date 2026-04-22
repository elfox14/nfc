"use strict";

/**
 * Converts a base64 data URL to a File object.
 * @param {string} dataurl - The base64 data URL.
 * @param {string} filename - The desired filename for the new File object.
 * @returns {File}
 */
function dataURLtoFile(dataurl, filename) {
    if (!dataurl || typeof dataurl !== 'string' || !dataurl.includes(',')) {
        return null;
    }

    try {
        const arr = dataurl.split(',');
        const mimeMatch = arr[0].match(/:(.*?);/);
        if (!mimeMatch) return null;

        const mime = mimeMatch[1];
        let base64Data = arr[1];

        // Defensive: Remove any potential whitespace
        base64Data = base64Data.trim();

        // Validation: Ensure it's a valid base64 string
        // Base64 regex: [A-Za-z0-9+/]*={0,2}
        const base64Regex = /^[A-Za-z0-9+/]*={0,2}$/;
        if (!base64Regex.test(base64Data)) {
            console.warn("[script-ui] dataURLtoFile: Invalid base64 sequence detected");
            return null;
        }

        const bstr = typeof safeAtob === 'function' ? safeAtob(base64Data) : atob(base64Data);
        if (!bstr) throw new Error("Decoding failed");
        let n = bstr.length;
        const u8arr = new Uint8Array(n);
        while (n--) {
            u8arr[n] = bstr.charCodeAt(n);
        }
        return new File([u8arr], filename, { type: mime });
    } catch (e) {
        console.error("[script-ui] dataURLtoFile: Decoding failed", { error: e.message, dataPreview: dataurl.substring(0, 30) + '...' });
        return null;
    }
}



const ImageCropper = {
    cropper: null,
    modalOverlay: null,
    confirmBtn: null,
    cancelBtn: null,
    imageElement: null,
    resolvePromise: null,

    init() {
        this.modalOverlay = document.getElementById('crop-modal-overlay');
        this.confirmBtn = document.getElementById('confirm-crop-btn');
        this.cancelBtn = document.getElementById('cancel-crop-btn');

        // استنساخ الأزرار لتنظيف أي مستمعين سابقين (حل لمشكلة تكرار النقر)
        const newConfirm = this.confirmBtn.cloneNode(true);
        const newCancel = this.cancelBtn.cloneNode(true);
        this.confirmBtn.parentNode.replaceChild(newConfirm, this.confirmBtn);
        this.cancelBtn.parentNode.replaceChild(newCancel, this.cancelBtn);

        this.confirmBtn = newConfirm;
        this.cancelBtn = newCancel;

        this.confirmBtn.addEventListener('click', this.handleConfirm.bind(this));
        this.cancelBtn.addEventListener('click', this.handleCancel.bind(this));

        this.modalOverlay.addEventListener('click', (e) => {
            if (e.target === this.modalOverlay) this.handleCancel();
        });
    },

    open(imageUrl, aspectRatio = NaN) {
        return new Promise((resolve) => {
            this.resolvePromise = resolve;

            // 1. تنظيف الذاكرة من أي كائن Cropper سابق
            if (this.cropper) {
                this.cropper.destroy();
                this.cropper = null;
            }

            // 2. إظهار المودال أولاً ليأخذ مكانه في الصفحة
            UIManager.showModal(this.modalOverlay);

            // 3. (الحل الجذري) حذف عنصر الصورة القديم وإنشاء واحد جديد
            // هذا يمنع ظهور الصورة المكسورة أو تداخل الإعدادات السابقة
            const container = document.getElementById('crop-image-container');
            if (container) {
                container.innerHTML = ''; // مسح محتوى الحاوية تماماً

                const newImg = document.createElement('img');
                newImg.id = 'crop-image';
                newImg.src = imageUrl;

                // تنسيقات ضرورية لضمان الظهور
                newImg.style.display = 'block';
                newImg.style.maxWidth = '100%';
                newImg.style.maxHeight = '100%';
                newImg.alt = "صورة للقص";

                container.appendChild(newImg);
                this.imageElement = newImg; // تحديث المرجع للعنصر الجديد

                // 4. تشغيل Cropper بعد تحميل العنصر الجديد
                // استخدام setTimeout يعطي المتصفح وقتاً لرسم المودال قبل حسابات القص
                newImg.onload = () => {
                    setTimeout(() => {
                        this.cropper = new Cropper(newImg, {
                            aspectRatio: aspectRatio,
                            viewMode: 1,
                            dragMode: 'move',
                            autoCropArea: 1,
                            restore: false,
                            modal: true,
                            guides: true,
                            highlight: false,
                            cropBoxMovable: true,
                            cropBoxResizable: true,
                            toggleDragModeOnDblclick: false,
                            background: true,
                            minContainerWidth: 300,
                            minContainerHeight: 300,
                            checkOrientation: false, // تحسين للأداء
                        });
                    }, 100);
                };

                newImg.onerror = () => {
                    console.error("Image source invalid:", imageUrl);
                    alert('حدث خطأ في قراءة ملف الصورة. حاول اختيار ملف آخر.');
                    this.handleCancel();
                };
            } else {
                console.error("Crop container not found!");
                this.handleCancel();
            }
        });
    },

    // === START: ROBUST HANDLE CONFIRM FUNCTION ===
    handleConfirm() {
        if (!this.cropper) return;
        try {
            const canvas = this.cropper.getCroppedCanvas({
                width: 800, // حجم مناسب للأداء والجودة
                height: 800,
                imageSmoothingEnabled: true,
                imageSmoothingQuality: 'high',
            });

            if (!canvas) throw new Error("Failed to create canvas");

            const croppedDataUrl = canvas.toDataURL('image/png');

            if (this.resolvePromise) this.resolvePromise(croppedDataUrl);

            this.close();
        } catch (error) {
            console.error("Error during crop confirmation:", error);
            alert("حدث خطأ أثناء قص الصورة. يرجى المحاولة مرة أخرى.");
            if (this.resolvePromise) this.resolvePromise(null);
            this.close();
        }
    },
    // === END: ROBUST HANDLE CONFIRM FUNCTION ===


    handleCancel() {
        if (this.resolvePromise) this.resolvePromise(null); // Return null if cancelled
        this.close();
    },

    close() {
        if (this.cropper) {
            this.cropper.destroy();
            this.cropper = null;
        }

        // تنظيف الحاوية عند الإغلاق
        const container = document.getElementById('crop-image-container');
        if (container) container.innerHTML = '';

        UIManager.hideModal(this.modalOverlay);
    }
};

const TourManager = {
    TOUR_SHOWN_KEY: "digitalCardTourShown_v6_desktop",
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
                title: "مرحباً بك في محرر MC PRIME",
                text: "تعلم كيفية تصميم بطاقة عمل رقمية احترافية في دقائق معدودة. ستأخذك هذه الجولة السريعة عبر مميزات المحرر.",
                buttons: [{ text: "لنبدأ الجولة!", action() { return this.next(); } }]
            },
            {
                id: "design_panel",
                title: "1. اللوحة اليمنى (التصميم)",
                text: "هذه اللوحة مخصصة للمظهر العام. تحتوي على:\n- **خيارات التخطيط:** اختر من بين 3 تخطيطات مختلفة.\n- **معرض التصاميم:** قوالب جاهزة بألوان متناسقة.\n- **الخلفيات:** تخصيص خلفية البطاقة وألوانها.",
                attachTo: { element: ".pro-sidebar-left", on: "auto" }
            },
            {
                id: "elements_panel",
                title: "2. اللوحة اليسرى (المحتوى)",
                text: "هنا يتم إضافة وتعديل بياناتك:\n- **الشعار والصورة الشخصية:** رفع وتخصيص الصور.\n- **المعلومات:** الاسم والمسمى الوظيفي.\n- **التواصل:** أرقام الهواتف وحسابات التواصل الاجتماعي.",
                attachTo: { element: ".pro-sidebar-right", on: "auto" }
            },
            {
                id: "canvas_drag",
                title: "3. منطقة المعاينة الحية",
                text: "شاهد تصميمك مباشرة أثناء العمل.\n- **تحريك العناصر:** يمكنك سحب الاسم أو الشعار وتغيير مكانه يدوياً.\n- **الوجهين:** استخدم الزر أسفل البطاقة للتبديل بين الوجه الأمامي والخلفي.",
                attachTo: { element: "#cards-wrapper", on: "auto" }
            },
            {
                id: "actions_toolbar",
                title: "4. الحفظ والمشاركة",
                text: "في الشريط العلوي:\n- **حفظ التصميم:** لحفظ عملك في السحابة.\n- **مشاركة:** للحصول على رابط بطاقتك.\n- **تنزيل:** لتحميل البطاقة كصورة أو PDF.",
                attachTo: { element: ".pro-toolbar .toolbar-end", on: "auto" }
            },
            {
                id: "finish",
                title: "أنت جاهز للانطلاق!",
                text: "ابدأ الآن في تصميم بطاقتك الفريدة. لا تنس استخدام زر **'مساعدة'** في الأعلى إذا احتجت للرجوع للشرح الكامل.",
                buttons: [{ text: "إنهاء الجولة", action() { return this.complete(); } }]
            },
        ];

        if (window.MobileUtils) {
            window.MobileUtils.configureTourSteps(steps);
        }
        steps.forEach((step) => this.tour.addStep(step));

        // Auto-start if not shown before
        if (!localStorage.getItem(this.TOUR_SHOWN_KEY)) {
            setTimeout(() => this.start(), 1000); // Slight delay to ensure UI is ready
        }
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
        this.populateDraggableIcons(); // NEW: Call this
    },
    announce: (message) => {
        if (DOMElements.liveAnnouncer)
            DOMElements.liveAnnouncer.textContent = message;
    },

    populateThemeThumbnails() {
        const container = document.getElementById("theme-gallery");
        if (!container) return;
        container.innerHTML = "";
        const isEnglish = document.documentElement.lang === 'en';
        Object.entries(Config.THEMES).forEach(([key, theme]) => {
            const themeName = isEnglish ? (theme.nameEn || theme.name) : theme.name;
            const thumb = document.createElement("div");
            thumb.className = "theme-thumbnail";
            thumb.dataset.themeKey = key;
            thumb.title = themeName;
            thumb.setAttribute("role", "button");
            thumb.setAttribute("tabindex", "0");
            thumb.setAttribute("aria-label", isEnglish ? `Select ${themeName} design` : `اختيار تصميم ${themeName}`);
            const previewDiv = document.createElement("div");
            previewDiv.className = "theme-preview";
            previewDiv.style.background = `linear-gradient(135deg, ${theme.gradient[0]}, ${theme.gradient[1]})`;
            const nameSpan = document.createElement("span");
            nameSpan.className = "theme-name";
            nameSpan.textContent = themeName;
            thumb.append(previewDiv, nameSpan);
            thumb.addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); CardManager.applyTheme(key); } });
            container.appendChild(thumb);
        });
    },

    setActiveThumbnail(themeKey) {
        document.querySelectorAll(".theme-thumbnail").forEach((thumb) => {
            thumb.classList.toggle("active", thumb.dataset.themeKey === themeKey);
        });
        const hiddenInput = document.getElementById("theme-select-input");
        if (hiddenInput) hiddenInput.value = themeKey;
    },

    populateSocialMediaOptions() {
        const select = document.getElementById("social-media-type");
        if (!select) return;
        const isEnglish = document.documentElement.lang === 'en';
        select.innerHTML = Object.entries(Config.SOCIAL_PLATFORMS).map(([key, platform]) => {
            const platformName = isEnglish ? (platform.nameEn || platform.name) : platform.name;
            return `<option value="${key}">${platformName}</option>`;
        }).join("");
    },

    // NEW: Function to create draggable social media icons
    populateDraggableIcons() {
        const palette = document.getElementById('social-icon-palette');
        if (!palette) return;
        const isEnglish = document.documentElement.lang === 'en';

        const staticPlatforms = Config.STATIC_CONTACT_METHODS.reduce((acc, method) => {
            acc[method.id] = { name: method.id.charAt(0).toUpperCase() + method.id.slice(1), icon: method.icon };
            return acc;
        }, {});

        const allPlatforms = {
            ...staticPlatforms,
            ...Config.SOCIAL_PLATFORMS
        };

        palette.innerHTML = '';
        for (const [key, platform] of Object.entries(allPlatforms)) {
            const iconEl = document.createElement('div');
            iconEl.className = 'draggable-icon';
            iconEl.dataset.platform = key;
            iconEl.title = isEnglish ? `Add ${platform.name}` : `إضافة ${platform.name}`;
            iconEl.innerHTML = `<i class="${platform.icon}"></i>`;
            palette.appendChild(iconEl);
        }
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
            thumb.append(previewDiv, nameSpan);
            thumb.addEventListener("click", () => CardManager.applyBackground(bg.url));
            thumb.addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); CardManager.applyBackground(bg.url); } });
            container.appendChild(thumb);
        });
    },

    async fetchAndPopulateBackgrounds() {
        const container = document.getElementById("background-gallery");
        if (!container) return;
        try {
            const response = await fetch(`${Config.API_BASE_URL}/api/gallery/backgrounds`);
            if (!response.ok) throw new Error("Network response was not ok");
            const data = await response.json();
            if (data.success && data.items) {
                this.populateBackgroundGallery(data.items);
            } else {
                throw new Error("API response was not successful");
            }
        } catch (error) {
            console.error("Failed to fetch backgrounds:", error);
            container.innerHTML = '<p style="font-size: 12px; color: var(--text-secondary);">فشل تحميل معرض الخلفيات.</p>';
        }
    },

    async uploadImageToServer(file, purpose = null) {
        const formData = new FormData();
        formData.append("image", file);
        // التغيير هنا: إرسال الطلب مباشرة إلى سيرفر الصور لتجاوز حظر "البوتات" على سيرفر Render
        formData.append("secret", "mcprime_upload_secret_2024_xK9mP2vL");
        // إرسال الغرض من الصورة لاستبدال الصورة القديمة
        if (purpose) {
            formData.append("purpose", purpose);
        }

        try {
            // Try authenticated upload to local server first (supports overwrite)
            const isLoggedIn = (typeof Auth !== 'undefined' && Auth.isLoggedIn()) || !!localStorage.getItem('authUser');
            if (isLoggedIn && purpose) {
                try {
                    console.log(`[Upload] Uploading with purpose: ${purpose} (overwrite mode)`);
                    const localFormData = new FormData();
                    localFormData.append("image", file);
                    localFormData.append("purpose", purpose);

                    const localResponse = await Auth.apiFetchWithRefresh(`${Config.API_BASE_URL}/api/upload-image`, {
                        method: "POST",
                        body: localFormData
                    });
                    const localResult = await localResponse.json();
                    if (localResponse.ok && localResult.url) {
                        console.log(`[Upload] Overwrite upload succeeded:`, localResult.url);
                        return localResult.url;
                    }
                } catch (authUploadErr) {
                    console.warn("[Upload] Authenticated overwrite upload failed, falling back:", authUploadErr.message);
                }
            }

            // Fallback: Direct upload to external server (no overwrite support)
            const uploadUrl = "https://uploads.mcprim.com/upload.php";
            const response = await fetch(uploadUrl, {
                method: "POST",
                body: formData
            });

            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.error || "Server error");
            }

            return result.url;
        } catch (error) {
            console.error("Direct image upload failed:", error);
            // محاولة أخيرة عبر السيرفر المحلي في حال فشل الاتصال المباشر (رغم أنه قد يفشل بسبب الحظر)
            try {
                console.log("Attempting fallback to local server upload...");
                const localResponse = await fetch(`${Config.API_BASE_URL}/api/upload-image`, {
                    method: "POST",
                    body: formData
                });
                const localResult = await localResponse.json();
                return localResult.url;
            } catch (fallbackError) {
                throw new Error("فشل الرفع المباشر والمحلي. تأكد من اتصالك بالإنترنت.");
            }
        }
    },

    async handleImageUpload(event, { maxSizeMB, errorEl, spinnerEl, onSuccess, cropOptions = { aspectRatio: NaN }, purpose = null }) {
        const fileInput = event.target;
        const file = fileInput.files[0];

        if (errorEl) {
            errorEl.textContent = "";
            errorEl.style.display = "none";
        }

        if (!file) return;

        if (!file.type.match(/^image\//)) {
            if (errorEl) {
                errorEl.textContent = "الرجاء اختيار ملف صورة صالح (JPG, PNG).";
                errorEl.style.display = "block";
            } else {
                alert("الرجاء اختيار ملف صورة صالح (JPG, PNG).");
            }
            Utils.playSound("error");
            fileInput.value = '';
            return;
        }
        if (file.size > maxSizeMB * 1024 * 1024) {
            if (errorEl) {
                errorEl.textContent = `يجب أن يكون حجم الملف أقل من ${maxSizeMB} ميجابايت.`;
                errorEl.style.display = "block";
            } else {
                alert(`يجب أن يكون حجم الملف أقل من ${maxSizeMB} ميجابايت.`);
            }
            Utils.playSound("error");
            fileInput.value = '';
            return;
        }

        if (spinnerEl) spinnerEl.style.display = "block";
        try {
            const reader = new FileReader();

            const localDataUrl = await new Promise((resolve, reject) => {
                reader.onload = e => resolve(e.target.result);
                reader.onerror = e => reject(new Error("Failed to read file"));
                reader.readAsDataURL(file);
            });

            let finalDataUrl = localDataUrl;

            if (!cropOptions.skipCrop) {
                const croppedDataUrl = await ImageCropper.open(localDataUrl, cropOptions.aspectRatio);
                if (!croppedDataUrl) {
                    if (spinnerEl) spinnerEl.style.display = "none";
                    fileInput.value = '';
                    return;
                }
                finalDataUrl = croppedDataUrl;
            }

            const fileNameClean = file.name.replace(/(\.[\w\d_-]+)$/i, cropOptions.skipCrop ? '$1' : '_cropped.png');
            const fileToUpload = dataURLtoFile(finalDataUrl, fileNameClean);

            const imageUrl = await this.uploadImageToServer(fileToUpload, purpose);

            if (spinnerEl) spinnerEl.style.display = "none";

            Utils.playSound("success");
            onSuccess(imageUrl);
            this.announce("تم رفع الصورة ومعالجتها بنجاح.");
        } catch (error) {
            console.error("Image processing/upload error:", error);
            if (errorEl) {
                errorEl.textContent = "فشل معالجة الصورة أو رفعها. حاول مرة أخرى.";
                errorEl.style.display = "block";
            } else {
                alert("فشل معالجة الصورة أو رفعها. حاول مرة أخرى.");
            }
            Utils.playSound("error");
        } finally {
            if (spinnerEl) spinnerEl.style.display = "none";
            fileInput.value = '';
        }
    },

    // UPDATED: To accept custom messages for auto-save
    showSaveNotification(startMessage = 'جاري الحفظ...', endMessage = 'تم الحفظ ✓') {
        const toast = DOMElements.saveToast;
        if (!toast) return;
        toast.textContent = startMessage;
        toast.classList.add("show");
        StateManager.save();
        setTimeout(() => {
            toast.textContent = endMessage;
            UIManager.announce(endMessage);
            setTimeout(() => {
                toast.classList.remove("show");
            }, 2000); // Shorter duration for auto-save
        }, 500);
    },

    updateFavicon(url) {
        if (url) document.getElementById("favicon").href = url;
    },

    highlightElement(targetId, state) {
        const targetElement = document.getElementById(targetId);
        if (targetElement) {
            targetElement.classList.toggle("highlighted", state);
            if (targetElement.matches(".phone-button-draggable-wrapper, .draggable-social-link")) {
                targetElement.querySelector("a").classList.toggle("highlighted", state);
            }
        }
    },

    navigateToAndHighlight(elementId) {
        const targetElement = document.getElementById(elementId);
        if (!targetElement) return;

        const parentAccordion = targetElement.closest("details");
        if (parentAccordion && !parentAccordion.open) {
            parentAccordion.open = true;
        }

        setTimeout(() => {
            const highlightTarget = targetElement.closest(".fieldset, .form-group, .dynamic-input-group") || targetElement;
            const scrollContainer = highlightTarget.closest(".pro-sidebar");
            if (scrollContainer) {
                const targetRect = highlightTarget.getBoundingClientRect();
                const containerRect = scrollContainer.getBoundingClientRect();
                const scrollTop = scrollContainer.scrollTop + (targetRect.top - containerRect.top) - 60;
                scrollContainer.scrollTo({ top: scrollTop, behavior: "smooth" });
            } else {
                highlightTarget.scrollIntoView({ behavior: "smooth", block: "center" });
            }
            highlightTarget.classList.add("form-element-highlighted");
            setTimeout(() => { highlightTarget.classList.remove("form-element-highlighted"); }, 2000);
        }, 150);
    },

    trapFocus(modalElement) {
        const focusableElements = modalElement.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
        const firstElement = focusableElements[0];
        const lastElement = focusableElements[focusableElements.length - 1];
        const handleTabKeyPress = (e) => {
            if (e.key !== "Tab") return;
            if (e.shiftKey) { if (document.activeElement === firstElement) { e.preventDefault(); lastElement.focus(); } }
            else { if (document.activeElement === lastElement) { e.preventDefault(); firstElement.focus(); } }
        };
        modalElement.addEventListener("keydown", handleTabKeyPress);
        firstElement?.focus();
        return handleTabKeyPress;
    },

    showModal(modalOverlay, triggerElement) {
        modalOverlay.classList.add("visible");
        if (triggerElement) {
            modalOverlay.dataset.triggerElementId = triggerElement.id;
            triggerElement.setAttribute("aria-expanded", "true");
        }
    },

    hideModal(modalOverlay) {
        modalOverlay.classList.remove("visible");
        const triggerElement = document.getElementById(modalOverlay.dataset.triggerElementId);
        if (triggerElement) {
            triggerElement.setAttribute("aria-expanded", "false");
            triggerElement.focus();
        }
    },

    setupDragDrop(dropZoneId, fileInputId) {
        const dropZone = document.getElementById(dropZoneId);
        const fileInput = document.getElementById(fileInputId);
        if (!dropZone || !fileInput) return;
        ["dragenter", "dragover", "dragleave", "drop"].forEach(eventName => {
            dropZone.addEventListener(eventName, e => { e.preventDefault(); e.stopPropagation(); });
        });
        ["dragenter", "dragover"].forEach(eventName => {
            dropZone.addEventListener(eventName, () => dropZone.classList.add("drag-over"));
        });
        ["dragleave", "drop"].forEach(eventName => {
            dropZone.addEventListener(eventName, () => dropZone.classList.remove("drag-over"));
        });
        dropZone.addEventListener("drop", e => {
            if (e.dataTransfer.files.length) {
                fileInput.files = e.dataTransfer.files;
                fileInput.dispatchEvent(new Event("change", { bubbles: true }));
            }
        });
    },

    setButtonLoadingState(button, isLoading, text = "جاري التحميل...") {
        if (!button) return;
        const span = button.querySelector("span");
        if (span && !button.dataset.originalText) button.dataset.originalText = span.textContent;
        if (isLoading) {
            button.disabled = true;
            button.classList.add("loading");
            if (span) span.textContent = text;
        } else {
            button.disabled = false;
            button.classList.remove("loading");
            if (span) span.textContent = button.dataset.originalText;
        }
    },
};

const SuggestionEngine = {
    currentSuggestion: null,

    // ── Industry → Palette Map ──────────────────────────────
    industryPalettes: {
        technology: [
            { name: 'Cyber Blue', bgStart: '#0a192f', bgEnd: '#020c1b', text: '#64ffda', tagline: '#4da6ff', accent: '#64ffda', btnBg: '#172a45', btnText: '#8892b0' },
            { name: 'Night Terminal', bgStart: '#1a1a2e', bgEnd: '#16213e', text: '#e94560', tagline: '#0f3460', accent: '#e94560', btnBg: '#0f3460', btnText: '#e94560' },
            { name: 'Matrix Green', bgStart: '#0D0D0D', bgEnd: '#1A1A1A', text: '#00ff41', tagline: '#008f11', accent: '#00ff41', btnBg: '#003B00', btnText: '#00ff41' },
        ],
        medical: [
            { name: 'Clinical Pure', bgStart: '#f0f5f9', bgEnd: '#e8eef3', text: '#1b4965', tagline: '#5fa8d3', accent: '#2a9d8f', btnBg: '#1b4965', btnText: '#ffffff' },
            { name: 'Health Blue', bgStart: '#0077b6', bgEnd: '#023e8a', text: '#ffffff', tagline: '#90e0ef', accent: '#ade8f4', btnBg: '#0096c7', btnText: '#ffffff' },
            { name: 'Soft Care', bgStart: '#e0f2f1', bgEnd: '#b2dfdb', text: '#004d40', tagline: '#00897b', accent: '#26a69a', btnBg: '#00695c', btnText: '#ffffff' },
        ],
        business: [
            { name: 'Navy Executive', bgStart: '#141d2b', bgEnd: '#0d1321', text: '#f0f0f0', tagline: '#4da6ff', accent: '#4da6ff', btnBg: '#1e2d40', btnText: '#aab8c2' },
            { name: 'Charcoal Pro', bgStart: '#2d3436', bgEnd: '#1e272e', text: '#dfe6e9', tagline: '#74b9ff', accent: '#0984e3', btnBg: '#353b48', btnText: '#dfe6e9' },
            { name: 'Slate Authority', bgStart: '#1e3a5f', bgEnd: '#0b1d33', text: '#f8f9fa', tagline: '#a8d8ea', accent: '#3d5a80', btnBg: '#293241', btnText: '#e0fbfc' },
        ],
        creative: [
            { name: 'Neon Burst', bgStart: '#ff006e', bgEnd: '#8338ec', text: '#ffffff', tagline: '#fb5607', accent: '#ffbe0b', btnBg: 'rgba(255,255,255,0.15)', btnText: '#ffffff' },
            { name: 'Pastel Dream', bgStart: '#ffeaa7', bgEnd: '#dfe6e9', text: '#2d3436', tagline: '#6c5ce7', accent: '#fd79a8', btnBg: '#6c5ce7', btnText: '#ffffff' },
            { name: 'Gradient Pop', bgStart: '#a29bfe', bgEnd: '#6c5ce7', text: '#ffffff', tagline: '#ffeaa7', accent: '#fd79a8', btnBg: 'rgba(255,255,255,0.2)', btnText: '#ffffff' },
        ],
        education: [
            { name: 'University Navy', bgStart: '#1a237e', bgEnd: '#311b92', text: '#fff9c4', tagline: '#90caf9', accent: '#f48fb1', btnBg: '#283593', btnText: '#bbdefb' },
            { name: 'Scholar Green', bgStart: '#1b5e20', bgEnd: '#2e7d32', text: '#e8f5e9', tagline: '#a5d6a7', accent: '#fff9c4', btnBg: '#388e3c', btnText: '#e8f5e9' },
            { name: 'Bright Academy', bgStart: '#f5f5f5', bgEnd: '#e0e0e0', text: '#212121', tagline: '#1565c0', accent: '#ef6c00', btnBg: '#1565c0', btnText: '#ffffff' },
        ],
        legal: [
            { name: 'Justice Dark', bgStart: '#0a0a0a', bgEnd: '#1c1c1c', text: '#d4af37', tagline: '#c5a83e', accent: '#d4af37', btnBg: '#1c1c1c', btnText: '#d4af37' },
            { name: 'Law Marble', bgStart: '#f8f8f8', bgEnd: '#e8e8e8', text: '#1a1a1a', tagline: '#8b6914', accent: '#b8860b', btnBg: '#2c2c2c', btnText: '#d4af37' },
            { name: 'Counsel Blue', bgStart: '#0d1b2a', bgEnd: '#1b263b', text: '#e0e1dd', tagline: '#778da9', accent: '#415a77', btnBg: '#1b263b', btnText: '#e0e1dd' },
        ],
        realestate: [
            { name: 'Luxury Concrete', bgStart: '#434343', bgEnd: '#000000', text: '#ffffff', tagline: '#d4af37', accent: '#b8860b', btnBg: '#2c2c2c', btnText: '#d4af37' },
            { name: 'Blueprint', bgStart: '#1a3a5c', bgEnd: '#0f2439', text: '#f8f9fa', tagline: '#74bde0', accent: '#4da6ff', btnBg: '#0f2439', btnText: '#74bde0' },
            { name: 'Warm Stone', bgStart: '#d4a373', bgEnd: '#a47148', text: '#ffffff', tagline: '#faedcd', accent: '#fefae0', btnBg: '#bc6c25', btnText: '#fefae0' },
        ],
        food: [
            { name: 'Spice Kitchen', bgStart: '#b91c1c', bgEnd: '#7f1d1d', text: '#fef3c7', tagline: '#fbbf24', accent: '#fef3c7', btnBg: '#991b1b', btnText: '#fef3c7' },
            { name: 'Fresh Green', bgStart: '#065f46', bgEnd: '#064e3b', text: '#ecfdf5', tagline: '#6ee7b7', accent: '#a7f3d0', btnBg: '#047857', btnText: '#ecfdf5' },
            { name: 'Café Latte', bgStart: '#78350f', bgEnd: '#451a03', text: '#fef3c7', tagline: '#fbbf24', accent: '#f59e0b', btnBg: '#92400e', btnText: '#fef3c7' },
        ],
        fitness: [
            { name: 'Energy Red', bgStart: '#dc2626', bgEnd: '#991b1b', text: '#ffffff', tagline: '#fecaca', accent: '#fbbf24', btnBg: 'rgba(0,0,0,0.3)', btnText: '#ffffff' },
            { name: 'Power Dark', bgStart: '#111827', bgEnd: '#000000', text: '#34d399', tagline: '#10b981', accent: '#34d399', btnBg: '#1f2937', btnText: '#34d399' },
            { name: 'Active Blue', bgStart: '#1e40af', bgEnd: '#1e3a8a', text: '#ffffff', tagline: '#93c5fd', accent: '#60a5fa', btnBg: '#1d4ed8', btnText: '#dbeafe' },
        ],
        fashion: [
            { name: 'Haute Couture', bgStart: '#0f0f0f', bgEnd: '#1a1a1a', text: '#fdf2f8', tagline: '#f9a8d4', accent: '#ec4899', btnBg: '#1f1f1f', btnText: '#f9a8d4' },
            { name: 'Blush Rose', bgStart: '#fce7f3', bgEnd: '#fbcfe8', text: '#831843', tagline: '#ec4899', accent: '#be185d', btnBg: '#be185d', btnText: '#fce7f3' },
            { name: 'Velvet Night', bgStart: '#2d1b69', bgEnd: '#1a0b2e', text: '#f5f3ff', tagline: '#c4b5fd', accent: '#a78bfa', btnBg: '#3b2480', btnText: '#ddd6fe' },
        ]
    },

    // ── Mood Modifiers ──────────────────────────────────────
    moodModifiers: {
        modern: {},  // base — no modifications
        elegant: { saturate: 0.85, brightnessShift: -10 },
        bold: { saturate: 1.3, brightnessShift: 15 },
        minimal: { saturate: 0.5, brightnessShift: 30 },
        warm: { hueShift: 15, saturate: 1.1 },
        dark: { brightnessShift: -30, saturate: 0.9 }
    },

    // ── Initialize ──────────────────────────────────────────
    init() {
        // Mood pill interaction
        document.querySelectorAll('.ai-mood-pill').forEach(pill => {
            pill.addEventListener('click', () => {
                document.querySelectorAll('.ai-mood-pill').forEach(p => p.classList.remove('ai-mood-active'));
                pill.classList.add('ai-mood-active');
            });
        });

        // Generate button
        const genBtn = document.getElementById('ai-suggest-btn');
        if (genBtn) {
            genBtn.addEventListener('click', () => this.generate());
        }

        // Shuffle button
        const shuffleBtn = document.getElementById('ai-shuffle-btn');
        if (shuffleBtn) {
            shuffleBtn.addEventListener('click', () => this.generate());
        }

        // Apply button
        const applyBtn = document.getElementById('ai-apply-btn');
        if (applyBtn) {
            applyBtn.addEventListener('click', () => this.applyCurrentSuggestion());
        }
    },

    // ── Generate Suggestion ─────────────────────────────────
    generate() {
        const btn = document.getElementById('ai-suggest-btn');
        const contentEl = btn?.querySelector('.ai-btn-content');
        const loadingEl = btn?.querySelector('.ai-btn-loading');

        // Loading state
        if (contentEl) contentEl.style.display = 'none';
        if (loadingEl) loadingEl.style.display = 'flex';
        btn?.classList.add('is-loading');

        // Simulate brief compute time for premium feel
        setTimeout(() => {
            const industry = this.getIndustry();
            const mood = document.querySelector('input[name="ai-mood"]:checked')?.value || 'modern';

            // Get palettes for industry
            let palettes = this.industryPalettes[industry] || this.industryPalettes.business;

            // Pick a random palette
            const palette = palettes[Math.floor(Math.random() * palettes.length)];

            // Apply mood modifier (subtle color shift)
            this.currentSuggestion = this.applyMood(palette, mood);

            // Show preview
            this.showPreview(this.currentSuggestion);

            // Reset button
            if (contentEl) contentEl.style.display = 'flex';
            if (loadingEl) loadingEl.style.display = 'none';
            btn?.classList.remove('is-loading');
        }, 600);
    },

    // ── Get Industry ────────────────────────────────────────
    getIndustry() {
        const select = document.getElementById('ai-industry-select');
        const selected = select?.value || 'auto';

        if (selected !== 'auto') return selected;

        // Auto-detect from tagline
        const tagline = (
            document.getElementById('input-tagline_ar')?.value ||
            document.getElementById('input-tagline_en')?.value || ''
        ).toLowerCase();

        const keywordMap = {
            technology: ['developer', 'engineer', 'software', 'tech', 'مبرمج', 'مهندس', 'تكنولوجيا', 'برمجة'],
            medical: ['doctor', 'dentist', 'health', 'nurse', 'طبيب', 'دكتور', 'صحة', 'طب'],
            business: ['manager', 'director', 'ceo', 'finance', 'مدير', 'أعمال', 'تمويل', 'محاسب'],
            creative: ['designer', 'artist', 'creative', 'photographer', 'مصمم', 'فنان', 'مصور', 'إبداع'],
            education: ['teacher', 'professor', 'trainer', 'أستاذ', 'معلم', 'مدرب', 'تعليم'],
            legal: ['lawyer', 'attorney', 'legal', 'محامي', 'قانون', 'مستشار قانوني'],
            realestate: ['real estate', 'architect', 'construction', 'عقارات', 'مهندس معماري', 'بناء'],
            food: ['chef', 'restaurant', 'cook', 'طاهي', 'مطعم', 'ضيافة'],
            fitness: ['fitness', 'gym', 'coach', 'trainer', 'رياضة', 'لياقة', 'مدرب'],
            fashion: ['fashion', 'style', 'beauty', 'أزياء', 'جمال', 'موضة']
        };

        for (const [industry, keywords] of Object.entries(keywordMap)) {
            if (keywords.some(kw => tagline.includes(kw))) return industry;
        }

        // Default to random industry
        const industries = Object.keys(this.industryPalettes);
        return industries[Math.floor(Math.random() * industries.length)];
    },

    // ── Apply Mood Modifier ─────────────────────────────────
    applyMood(palette, mood) {
        // Clone palette
        const result = { ...palette };
        const mod = this.moodModifiers[mood];
        if (!mod || Object.keys(mod).length === 0) return result;

        // Apply brightness shift to bgStart/bgEnd
        if (mod.brightnessShift) {
            result.bgStart = this.shiftBrightness(result.bgStart, mod.brightnessShift);
            result.bgEnd = this.shiftBrightness(result.bgEnd, mod.brightnessShift);
        }

        return result;
    },

    shiftBrightness(hex, amount) {
        if (!hex || hex.charAt(0) !== '#') return hex;
        let r = parseInt(hex.slice(1, 3), 16);
        let g = parseInt(hex.slice(3, 5), 16);
        let b = parseInt(hex.slice(5, 7), 16);
        r = Math.min(255, Math.max(0, r + amount));
        g = Math.min(255, Math.max(0, g + amount));
        b = Math.min(255, Math.max(0, b + amount));
        return '#' + [r, g, b].map(v => v.toString(16).padStart(2, '0')).join('');
    },

    // ── Show Preview ────────────────────────────────────────
    showPreview(palette) {
        const card = document.getElementById('ai-preview-card');
        if (!card) return;

        card.style.display = 'block';
        card.classList.remove('applied');

        // Name
        const nameEl = document.getElementById('ai-preview-name');
        if (nameEl) nameEl.textContent = palette.name;

        // Swatches
        const colors = [palette.bgStart, palette.bgEnd, palette.text, palette.tagline, palette.accent];
        colors.forEach((color, i) => {
            const swatch = document.getElementById(`ai-preview-swatch-${i + 1}`);
            if (swatch) swatch.style.background = color;
        });

        // Scroll preview into view
        setTimeout(() => card.scrollIntoView({ behavior: 'smooth', block: 'nearest' }), 100);
    },

    // ── Apply Current Suggestion ────────────────────────────
    applyCurrentSuggestion() {
        if (!this.currentSuggestion) return;
        const p = this.currentSuggestion;

        const controlsToUpdate = {
            'front-bg-start': p.bgStart,
            'front-bg-end': p.bgEnd,
            'back-bg-start': p.bgStart,
            'back-bg-end': p.bgEnd,
            'name-color': p.text,
            'tagline-color': p.tagline,
            'phone-btn-bg-color': p.accent,
            'phone-btn-text-color': p.bgStart,
            'back-buttons-bg-color': p.btnBg,
            'back-buttons-text-color': p.btnText,
        };

        for (const [id, value] of Object.entries(controlsToUpdate)) {
            const control = document.getElementById(id);
            if (control) {
                control.value = value;
                control.dispatchEvent(new Event('input', { bubbles: true }));
            }
        }

        // Update card
        if (typeof CardManager !== 'undefined') {
            CardManager.updateCardBackgrounds();
        }
        if (typeof StateManager !== 'undefined') {
            StateManager.saveDebounced();
        }

        // Visual feedback
        const card = document.getElementById('ai-preview-card');
        if (card) {
            card.classList.add('applied');
        }

        UIManager.announce("تم اقتراح تصميم جديد بنجاح.");

        // Toast
        const isAr = document.documentElement.lang !== 'en';
        const toast = document.createElement('div');
        toast.innerHTML = `<i class="fas fa-check-circle"></i> ${isAr ? `تم تطبيق "${p.name}"` : `"${p.name}" applied`}`;
        Object.assign(toast.style, {
            position: 'fixed', top: '70px', left: '50%',
            transform: 'translateX(-50%) translateY(-16px)',
            background: 'rgba(10,18,30,0.97)', backdropFilter: 'blur(16px)',
            border: '1px solid rgba(46,204,113,0.4)', borderRadius: '50px',
            padding: '10px 24px', color: '#2ecc71', fontWeight: '700', fontSize: '0.85rem',
            zIndex: '99999', transition: 'opacity 0.4s, transform 0.4s',
            opacity: '0', fontFamily: 'Tajawal,sans-serif',
            whiteSpace: 'nowrap', boxShadow: '0 8px 30px rgba(0,0,0,0.4)'
        });
        document.body.appendChild(toast);
        requestAnimationFrame(() => requestAnimationFrame(() => {
            toast.style.opacity = '1';
            toast.style.transform = 'translateX(-50%) translateY(0)';
        }));
        setTimeout(() => {
            toast.style.opacity = '0';
            toast.style.transform = 'translateX(-50%) translateY(-10px)';
            setTimeout(() => toast.remove(), 450);
        }, 3500);
    },

    // ── Legacy compat: suggestDesign (called from old code) ──
    async suggestDesign() {
        this.generate();
    }
};