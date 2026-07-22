/**
 * editor-tour.js — Shepherd.js Onboarding Tour for MC PRIME Editor
 * Shows a guided tour on first visit to help new users learn the editor.
 */
(function () {
    'use strict';

    const TOUR_STORAGE_KEY = 'mcprime_editor_tour_completed_v1';

    // Skip if already completed
    if (localStorage.getItem(TOUR_STORAGE_KEY)) return;

    // Detect language from HTML lang attribute
    const isAr = document.documentElement.lang === 'ar';

    // i18n labels
    const t = isAr ? {
        next: 'التالي ←',
        back: '→ السابق',
        done: 'ابدأ التصميم ✨',
        skip: 'تخطي',
        step1Title: 'مرحباً بك في المحرر! 👋',
        step1Text: 'هذه منطقة التصميم حيث ترى البطاقة مباشرة. يمكنك <strong>سحب العناصر</strong> وتحريكها على البطاقة.',
        step2Title: 'اختر التصميم 🎨',
        step2Text: 'من هنا تختار <strong>القالب</strong> وألوان الخلفية والتدرجات. جرّب التصاميم الجاهزة!',
        step3Title: 'حرّر المحتوى ✏️',
        step3Text: 'أضف <strong>اسمك، شعارك، صورتك، وروابط التواصل</strong> من هذا القسم. كل عنصر قابل للتخصيص بالكامل.',
        step4Title: 'معاينة سريعة 👁️',
        step4Text: 'اضغط هنا لرؤية البطاقة بدون أدوات التحرير كما ستبدو للمتلقي.',
        step5Title: 'جاهز؟ احفظ وشارك! 🚀',
        step5Text: 'عند الانتهاء، اضغط هنا <strong>لحفظ بطاقتك ومشاركتها</strong> مع العالم عبر رابط فريد.'
    } : {
        next: 'Next →',
        back: '← Back',
        done: 'Start Designing ✨',
        skip: 'Skip',
        step1Title: 'Welcome to the Editor! 👋',
        step1Text: 'This is your design canvas where you see the card live. You can <strong>drag & drop elements</strong> on the card.',
        step2Title: 'Choose a Design 🎨',
        step2Text: 'Pick a <strong>template</strong>, customize background colors and gradients from here. Try the ready-made designs!',
        step3Title: 'Edit Content ✏️',
        step3Text: 'Add your <strong>name, logo, photo, and contact links</strong> from this panel. Every element is fully customizable.',
        step4Title: 'Quick Preview 👁️',
        step4Text: 'Click here to see the card without editing tools, exactly as recipients will see it.',
        step5Title: 'Ready? Save & Share! 🚀',
        step5Text: 'When you\'re done, click here to <strong>save your card and share it</strong> with the world via a unique link.'
    };

    function initTour() {
        if (typeof Shepherd === 'undefined') {
            setTimeout(initTour, 500);
            return;
        }

        const tour = new Shepherd.Tour({
            useModalOverlay: true,
            defaultStepOptions: {
                classes: 'mcprime-tour-step',
                scrollTo: { behavior: 'smooth', block: 'center' },
                cancelIcon: { enabled: true },
                arrow: true
            }
        });

        // Step 1: Canvas Area
        tour.addStep({
            id: 'step-canvas',
            title: t.step1Title,
            text: t.step1Text,
            attachTo: { element: '#cards-wrapper', on: 'bottom' },
            buttons: [
                { text: t.skip, action: tour.cancel, classes: 'shepherd-button-secondary' },
                { text: t.next, action: tour.next }
            ]
        });

        // Step 2: Design Panel (Left sidebar)
        tour.addStep({
            id: 'step-design',
            title: t.step2Title,
            text: t.step2Text,
            attachTo: { element: '#panel-design', on: isAr ? 'left' : 'right' },
            buttons: [
                { text: t.back, action: tour.back, classes: 'shepherd-button-secondary' },
                { text: t.next, action: tour.next }
            ]
        });

        // Step 3: Elements Panel (Right sidebar)
        tour.addStep({
            id: 'step-content',
            title: t.step3Title,
            text: t.step3Text,
            attachTo: { element: '#panel-elements', on: isAr ? 'right' : 'left' },
            buttons: [
                { text: t.back, action: tour.back, classes: 'shepherd-button-secondary' },
                { text: t.next, action: tour.next }
            ]
        });

        // Step 4: Preview Button
        tour.addStep({
            id: 'step-preview',
            title: t.step4Title,
            text: t.step4Text,
            attachTo: { element: '#preview-mode-btn', on: 'bottom' },
            buttons: [
                { text: t.back, action: tour.back, classes: 'shepherd-button-secondary' },
                { text: t.next, action: tour.next }
            ]
        });

        // Step 5: Save & Share CTA
        tour.addStep({
            id: 'step-save',
            title: t.step5Title,
            text: t.step5Text,
            attachTo: { element: '#save-share-btn', on: 'bottom' },
            buttons: [
                { text: t.back, action: tour.back, classes: 'shepherd-button-secondary' },
                { text: t.done, action: tour.complete }
            ]
        });

        // Mark complete on finish or cancel
        tour.on('complete', () => localStorage.setItem(TOUR_STORAGE_KEY, 'true'));
        tour.on('cancel', () => localStorage.setItem(TOUR_STORAGE_KEY, 'true'));

        // Start after a brief delay so the editor fully loads
        setTimeout(() => tour.start(), 1500);
    }

    // Custom CSS for the tour
    const style = document.createElement('style');
    style.textContent = `
        .mcprime-tour-step .shepherd-content {
            border-radius: 16px !important;
            background: linear-gradient(135deg, rgba(20,25,40,0.97), rgba(30,40,60,0.97)) !important;
            border: 1px solid rgba(77,166,255,0.3) !important;
            box-shadow: 0 20px 60px rgba(0,0,0,0.5), 0 0 40px rgba(77,166,255,0.1) !important;
            backdrop-filter: blur(20px) !important;
            color: #e6f0f7 !important;
            max-width: 380px !important;
        }
        .mcprime-tour-step .shepherd-header {
            background: transparent !important;
            padding: 20px 24px 0 !important;
            border: none !important;
        }
        .mcprime-tour-step .shepherd-title {
            font-family: 'Tajawal', 'Poppins', sans-serif !important;
            font-size: 1.15rem !important;
            font-weight: 700 !important;
            color: #fff !important;
        }
        .mcprime-tour-step .shepherd-text {
            font-family: 'Tajawal', 'Poppins', sans-serif !important;
            font-size: 0.92rem !important;
            line-height: 1.7 !important;
            color: #b0c4de !important;
            padding: 12px 24px !important;
        }
        .mcprime-tour-step .shepherd-text strong {
            color: #4da6ff !important;
        }
        .mcprime-tour-step .shepherd-footer {
            padding: 12px 24px 20px !important;
            border: none !important;
        }
        .mcprime-tour-step .shepherd-button {
            font-family: 'Tajawal', 'Poppins', sans-serif !important;
            font-size: 0.88rem !important;
            font-weight: 600 !important;
            border-radius: 10px !important;
            padding: 8px 20px !important;
            transition: all 0.3s ease !important;
        }
        .mcprime-tour-step .shepherd-button:not(.shepherd-button-secondary) {
            background: linear-gradient(135deg, #4da6ff, #667eea) !important;
            color: #fff !important;
            border: none !important;
            box-shadow: 0 4px 15px rgba(77,166,255,0.3) !important;
        }
        .mcprime-tour-step .shepherd-button:not(.shepherd-button-secondary):hover {
            transform: translateY(-1px) !important;
            box-shadow: 0 6px 20px rgba(77,166,255,0.4) !important;
        }
        .mcprime-tour-step .shepherd-button-secondary {
            background: rgba(255,255,255,0.08) !important;
            color: #8899aa !important;
            border: 1px solid rgba(255,255,255,0.1) !important;
        }
        .mcprime-tour-step .shepherd-button-secondary:hover {
            background: rgba(255,255,255,0.15) !important;
            color: #fff !important;
        }
        .mcprime-tour-step .shepherd-cancel-icon span {
            color: #667788 !important;
            font-size: 1.5rem !important;
        }
        .mcprime-tour-step .shepherd-cancel-icon:hover span {
            color: #ff6b6b !important;
        }
        .shepherd-modal-overlay-container {
            z-index: 9998 !important;
        }
        .shepherd-element {
            z-index: 9999 !important;
        }
        .mcprime-tour-step .shepherd-arrow::before {
            background: rgba(20,25,40,0.97) !important;
            border: 1px solid rgba(77,166,255,0.3) !important;
        }
    `;
    document.head.appendChild(style);

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initTour);
    } else {
        initTour();
    }
})();
