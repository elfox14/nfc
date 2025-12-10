"use strict";

/**
 * Converts a base64 data URL to a File object.
 * @param {string} dataurl - The base64 data URL.
 * @param {string} filename - The desired filename for the new File object.
 * @returns {File}
 */
function dataURLtoFile(dataurl, filename) {
    let arr = dataurl.split(','),
        mime = arr[0].match(/:(.*?);/)[1],
        bstr = atob(arr[1]),
        n = bstr.length,
        u8arr = new Uint8Array(n);
    while (n--) {
        u8arr[n] = bstr.charCodeAt(n);
    }
    return new File([u8arr], filename, { type: mime });
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
        if(container) container.innerHTML = '';
        
        UIManager.hideModal(this.modalOverlay);
    }
};

const TourManager = {
  TOUR_SHOWN_KEY: "digitalCardTourShown_v5_desktop",
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
      { id: "welcome", title: "مرحباً بك في المحرر!", text: "أهلاً بك في واجهة MC PRIME الاحترافية. لنبدأ جولة سريعة.", buttons: [{ text: "لنبدأ!", action() { return this.next(); }}]},
      { id: "elements_panel", title: "1. لوحة العناصر", text: "هذه هي لوحتك الرئيسية. هنا يمكنك إضافة وتعديل *محتوى* بطاقتك (مثل اسمك، شعارك، وأرقام الهواتف).", attachTo: { element: ".pro-sidebar-right", on: "left" }},
      { id: "design_panel", title: "2. لوحة التصميم", text: "هنا يمكنك تغيير *الشكل العام* للبطاقة، مثل اختيار التصاميم الجاهزة، تغيير الخلفيات، أو تعديل التخطيط.", attachTo: { element: ".pro-sidebar-left", on: "right" }},
      { id: "canvas_drag", title: "3. منطقة المعاينة", text: "هنا تظهر بطاقتك. يمكنك النقر على أي عنصر (مثل الاسم) لتعديله، أو سحبه مباشرة لتغيير مكانه.", attachTo: { element: "#cards-wrapper", on: "top" }},
      { id: "actions_toolbar", title: "4. شريط الأدوات", text: "عندما يصبح تصميمك جاهزاً، استخدم هذا الشريط العلوي لحفظ التصميم في المعرض، تنزيله كصورة، أو مشاركة رابط الكارت.", attachTo: { element: ".pro-toolbar .toolbar-end", on: "bottom" }},
      { id: "finish", title: "أنت الآن جاهز!", text: "هذه هي الأساسيات. استمتع بتصميم بطاقتك الاحترافية.", buttons: [{ text: "إنهاء", action() { return this.complete(); }}]},
    ];

    if (window.MobileUtils) {
      window.MobileUtils.configureTourSteps(steps);
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
        Object.entries(Config.THEMES).forEach(([key, theme]) => {
        const thumb = document.createElement("div");
        thumb.className = "theme-thumbnail";
        thumb.dataset.themeKey = key;
        thumb.title = theme.name;
        thumb.setAttribute("role", "button");
        thumb.setAttribute("tabindex", "0");
        thumb.setAttribute("aria-label", `اختيار تصميم ${theme.name}`);
        const previewDiv = document.createElement("div");
        previewDiv.className = "theme-preview";
        previewDiv.style.background = `linear-gradient(135deg, ${theme.gradient[0]}, ${theme.gradient[1]})`;
        const nameSpan = document.createElement("span");
        nameSpan.className = "theme-name";
        nameSpan.textContent = theme.name;
        thumb.append(previewDiv, nameSpan);
        thumb.addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); CardManager.applyTheme(key); }});
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
        select.innerHTML = Object.entries(Config.SOCIAL_PLATFORMS).map(([key, platform]) => `<option value="${key}">${platform.name}</option>`).join("");
    },
    
    // NEW: Function to create draggable social media icons
    populateDraggableIcons() {
        const palette = document.getElementById('social-icon-palette');
        if (!palette) return;

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
            iconEl.title = `إضافة ${platform.name}`;
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
        thumb.addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); CardManager.applyBackground(bg.url); }});
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

    async uploadImageToServer(file) {
        const formData = new FormData();
        formData.append("image", file);
        try {
        const response = await fetch(`${Config.API_BASE_URL}/api/upload-image`, { method: "POST", body: formData });
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || "Server error");
        }
        return await response.json().then(result => result.url);
        } catch (error) {
        console.error("Image upload failed:", error);
        throw error;
        }
    },

    async handleImageUpload(event, { maxSizeMB, errorEl, spinnerEl, onSuccess, cropOptions = { aspectRatio: NaN } }) {
        const fileInput = event.target;
        const file = fileInput.files[0];
        
        errorEl.textContent = "";
        errorEl.style.display = "none";
        
        if (!file) return;

        if (!file.type.match(/^image\//)) {
            errorEl.textContent = "الرجاء اختيار ملف صورة صالح (JPG, PNG).";
            errorEl.style.display = "block";
            Utils.playSound("error");
            fileInput.value = '';
            return;
        }
        if (file.size > maxSizeMB * 1024 * 1024) {
            errorEl.textContent = `يجب أن يكون حجم الملف أقل من ${maxSizeMB} ميجابايت.`;
            errorEl.style.display = "block";
            Utils.playSound("error");
            fileInput.value = '';
            return;
        }

        spinnerEl.style.display = "block";
        try {
            const reader = new FileReader();
            
            const localDataUrl = await new Promise((resolve, reject) => {
                reader.onload = e => resolve(e.target.result);
                reader.onerror = e => reject(new Error("Failed to read file"));
                reader.readAsDataURL(file);
            });

            const croppedDataUrl = await ImageCropper.open(localDataUrl, cropOptions.aspectRatio);

            if (!croppedDataUrl) {
                spinnerEl.style.display = "none";
                fileInput.value = ''; 
                return; 
            }
            
            const fileNameClean = file.name.replace(/(\.[\w\d_-]+)$/i, '_cropped.png');
            const fileToUpload = dataURLtoFile(croppedDataUrl, fileNameClean);
            
            const imageUrl = await this.uploadImageToServer(fileToUpload);
            
            Utils.playSound("success");
            onSuccess(imageUrl);
            this.announce("تم رفع الصورة ومعالجتها بنجاح.");
        } catch (error) {
            console.error("Image processing/upload error:", error);
            errorEl.textContent = "فشل معالجة الصورة أو رفعها. حاول مرة أخرى.";
            errorEl.style.display = "block";
            Utils.playSound("error");
        } finally {
            spinnerEl.style.display = "none";
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
            scrollContainer.scrollTo({ top: highlightTarget.offsetTop - 60, behavior: "smooth" });
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
        if (e.shiftKey) { if (document.activeElement === firstElement) { e.preventDefault(); lastElement.focus(); }} 
        else { if (document.activeElement === lastElement) { e.preventDefault(); firstElement.focus(); }}
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
    // هام: يجب استبدال هذا المفتاح بمفتاحك الخاص من Unsplash
    UNSPLASH_API_KEY: 'YOUR_UNSPLASH_ACCESS_KEY', 
    
    palettes: [
        { name: 'Professional Dark', bgStart: '#1D2B3C', bgEnd: '#111827', textPrimary: '#F9FAFB', textSecondary: '#9CA3AF', accent: '#3B82F6' },
        { name: 'Modern Light', bgStart: '#FFFFFF', bgEnd: '#F3F4F6', textPrimary: '#1F2937', textSecondary: '#4B5563', accent: '#10B981' },
        { name: 'Vibrant Creative', bgStart: '#4F46E5', bgEnd: '#7C3AED', textPrimary: '#FFFFFF', textSecondary: '#E5E7EB', accent: '#F59E0B' },
        { name: 'Elegant Gold', bgStart: '#000000', bgEnd: '#212121', textPrimary: '#D4AF37', textSecondary: '#F5F5F5', accent: '#B8860B' },
        { name: 'Natural Earth', bgStart: '#3A5A40', bgEnd: '#1E2F23', textPrimary: '#DAD7CD', textSecondary: '#A3B18A', accent: '#DAD7CD' }
    ],

    async suggestDesign() {
        const button = document.getElementById('ai-suggest-btn');
        const spinner = document.getElementById('ai-spinner');
        
        UIManager.setButtonLoadingState(button, true, 'جاري البحث...');
        spinner.style.display = 'block';

        try {
            const taglineAR = document.getElementById('input-tagline_ar')?.value || '';
            const taglineEN = document.getElementById('input-tagline_en')?.value || '';
            
            // استخدم المسمى الوظيفي العربي أو الإنجليزي، أيهما موجود
            const searchTerm = this.getSearchTerm(taglineAR || taglineEN);

            const imageUrl = await this.fetchImage(searchTerm);
            
            if (imageUrl) {
                this.applySuggestion(imageUrl);
                UIManager.announce("تم اقتراح تصميم جديد بنجاح.");
            } else {
                 throw new Error("لم يتم العثور على صورة مناسبة.");
            }

        } catch (error) {
            console.error('AI Suggestion Error:', error);
            UIManager.announce(`فشل اقتراح التصميم: ${error.message}`);
        } finally {
            UIManager.setButtonLoadingState(button, false);
            spinner.style.display = 'none';
        }
    },

    getSearchTerm(tagline) {
        if (!tagline || tagline.trim() === '') return 'business professional';
        
        // كلمات مفتاحية بسيطة لاستخراجها
        const keywords = ['developer', 'designer', 'marketing', 'doctor', 'engineer', 'consultant', 'real estate', 'finance', 'technology', 'art', 'health', 'lawyer'];
        const foundKeyword = keywords.find(kw => tagline.toLowerCase().includes(kw));
        
        return foundKeyword || tagline.split(' ')[0] || 'professional';
    },

    async fetchImage(query) {
        if (this.UNSPLASH_API_KEY === 'YOUR_UNSPLASH_ACCESS_KEY') {
            console.error("Please replace 'YOUR_UNSPLASH_ACCESS_KEY' with your actual Unsplash API key in script-ui.js");
            // استخدام صورة احتياطية في حالة عدم وجود مفتاح
            return 'https://images.unsplash.com/photo-1554147090-e1221a04a025?q=80&w=2070&auto=format&fit=crop';
        }

        const url = `https://api.unsplash.com/photos/random?query=${encodeURIComponent(query)}&orientation=landscape&client_id=${this.UNSPLASH_API_KEY}`;
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`Unsplash API error: ${response.statusText}`);
        }
        const data = await response.json();
        return data.urls.regular;
    },

    applySuggestion(imageUrl) {
        // 1. اختر لوحة ألوان عشوائية
        const palette = this.palettes[Math.floor(Math.random() * this.palettes.length)];

        // 2. طبق الخلفية الجديدة (للواجهتين)
        CardManager.frontBgImageUrl = imageUrl;
        CardManager.backBgImageUrl = imageUrl;
        document.getElementById('front-bg-upload').value = '';
        document.getElementById('back-bg-upload').value = '';
        DOMElements.buttons.removeFrontBg.style.display = 'block';
        DOMElements.buttons.removeBackBg.style.display = 'block';

        // 3. طبق شفافية لضمان وضوح النص فوق الصورة
        const opacityControl = document.getElementById('front-bg-opacity');
        opacityControl.value = 0.5;
        opacityControl.dispatchEvent(new Event('input', { bubbles: true }));
        const backOpacityControl = document.getElementById('back-bg-opacity');
        backOpacityControl.value = 0.5;
        backOpacityControl.dispatchEvent(new Event('input', { bubbles: true }));


        // 4. طبق الألوان الجديدة عن طريق تحديث حقول الإدخال
        const controlsToUpdate = {
            'front-bg-start': palette.bgStart,
            'front-bg-end': palette.bgEnd,
            'back-bg-start': palette.bgStart,
            'back-bg-end': palette.bgEnd,
            'name-color': palette.textPrimary,
            'tagline-color': palette.accent,
            'phone-btn-bg-color': palette.accent,
            'phone-btn-text-color': palette.bgStart,
            'back-buttons-bg-color': palette.bgStart,
            'back-buttons-text-color': palette.textSecondary,
        };

        for (const [id, value] of Object.entries(controlsToUpdate)) {
            const control = document.getElementById(id);
            if (control) {
                control.value = value;
                // إطلاق حدث "input" يحاكي إدخال المستخدم ويضمن تحديث كل شيء
                control.dispatchEvent(new Event('input', { bubbles: true }));
            }
        }
        
        // 5. تحديث فوري
        CardManager.updateCardBackgrounds();
        StateManager.saveDebounced();
    }
};