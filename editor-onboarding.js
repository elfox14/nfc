/**
 * MC PRIME NFC — Editor Onboarding v1.0
 * Guided first-run flow that reuses the existing editor controls.
 */
(function (global) {
    'use strict';

    var document = global.document;
    if (!document || global.EditorOnboarding) return;

    var STORAGE_KEY = 'mcprime-editor-onboarding-v1';
    var isAr = document.documentElement.lang !== 'en';
    var overlay = null;
    var currentStep = 0;
    var selection = { industry: '', template: '' };

    var industries = [
        ['medical', 'fa-stethoscope', 'طبي', 'Medical'],
        ['business', 'fa-briefcase', 'أعمال', 'Business'],
        ['engineering', 'fa-gears', 'هندسي', 'Engineering'],
        ['real-estate', 'fa-building', 'عقاري', 'Real estate'],
        ['restaurant', 'fa-utensils', 'مطاعم', 'Restaurant'],
        ['personal', 'fa-user', 'شخصي', 'Personal']
    ];

    function t(ar, en) { return isAr ? ar : en; }

    function getInput(ids) {
        return ids.map(function (id) { return document.getElementById(id); }).find(Boolean) || null;
    }

    function setValue(ids, value) {
        var input = getInput(ids);
        if (!input) return false;
        input.value = value;
        input.dispatchEvent(new global.Event('input', { bubbles: true }));
        input.dispatchEvent(new global.Event('change', { bubbles: true }));
        return true;
    }

    function clickTemplate(templateId) {
        var selector = '[data-template-id="' + templateId + '"], [data-template="' + templateId + '"], #' + templateId;
        var target = document.querySelector(selector);
        if (!target) return false;
        target.click();
        return true;
    }

    function build() {
        if (overlay) return overlay;
        overlay = document.createElement('div');
        overlay.id = 'editor-onboarding';
        overlay.className = 'eob-overlay';
        overlay.setAttribute('role', 'dialog');
        overlay.setAttribute('aria-modal', 'true');
        overlay.setAttribute('aria-labelledby', 'eob-title');
        overlay.innerHTML =
            '<div class="eob-shell">' +
                '<header class="eob-header">' +
                    '<div><span class="eob-kicker">MC PRIME EDITOR</span><h1 id="eob-title"></h1><p id="eob-subtitle"></p></div>' +
                    '<button type="button" id="eob-close" aria-label="' + t('إغلاق', 'Close') + '"><i class="fas fa-xmark"></i></button>' +
                '</header>' +
                '<div class="eob-progress" aria-label="' + t('تقدم الإعداد', 'Setup progress') + '"></div>' +
                '<main id="eob-content" class="eob-content"></main>' +
                '<footer class="eob-footer">' +
                    '<button type="button" id="eob-skip" class="eob-link">' + t('الدخول للوضع المتقدم', 'Open advanced editor') + '</button>' +
                    '<div class="eob-actions"><button type="button" id="eob-back" class="eob-secondary">' + t('السابق', 'Back') + '</button><button type="button" id="eob-next" class="eob-primary"></button></div>' +
                '</footer>' +
            '</div>';
        document.body.appendChild(overlay);
        overlay.querySelector('#eob-close').addEventListener('click', dismiss);
        overlay.querySelector('#eob-skip').addEventListener('click', dismiss);
        overlay.querySelector('#eob-back').addEventListener('click', function () { goTo(currentStep - 1); });
        overlay.querySelector('#eob-next').addEventListener('click', next);
        overlay.addEventListener('click', handleChoice);
        injectStyles();
        return overlay;
    }

    function renderProgress() {
        var host = overlay.querySelector('.eob-progress');
        host.innerHTML = [0, 1, 2, 3].map(function (step) {
            return '<span class="' + (step <= currentStep ? 'is-active' : '') + '"></span>';
        }).join('');
    }

    function render() {
        build();
        renderProgress();
        var title = overlay.querySelector('#eob-title');
        var subtitle = overlay.querySelector('#eob-subtitle');
        var content = overlay.querySelector('#eob-content');
        var back = overlay.querySelector('#eob-back');
        var nextButton = overlay.querySelector('#eob-next');

        back.hidden = currentStep === 0;
        nextButton.textContent = currentStep === 3 ? t('ابدأ التصميم', 'Start designing') : t('التالي', 'Next');

        if (currentStep === 0) {
            title.textContent = t('ما مجال بطاقتك؟', 'What is your card for?');
            subtitle.textContent = t('سنرتب البداية والقوالب المناسبة لك.', 'We will tailor the starting point and templates.');
            content.innerHTML = '<div class="eob-choice-grid">' + industries.map(function (item) {
                return '<button type="button" class="eob-choice ' + (selection.industry === item[0] ? 'is-selected' : '') + '" data-industry="' + item[0] + '"><i class="fas ' + item[1] + '"></i><strong>' + (isAr ? item[2] : item[3]) + '</strong></button>';
            }).join('') + '</div>';
        } else if (currentStep === 1) {
            title.textContent = t('اختر نقطة بداية', 'Choose a starting point');
            subtitle.textContent = t('يمكنك تغيير كل شيء لاحقًا.', 'Everything remains editable later.');
            content.innerHTML = '<div class="eob-template-grid">' +
                templateCard('modern', 'fa-sparkles', t('حديث', 'Modern'), t('واضح ومتوازن', 'Clean and balanced')) +
                templateCard('professional', 'fa-briefcase', t('احترافي', 'Professional'), t('مناسب للشركات', 'Built for business')) +
                templateCard('minimal', 'fa-minus', t('بسيط', 'Minimal'), t('تركيز على البيانات', 'Focus on information')) +
                '<button type="button" class="eob-template-card ' + (selection.template === 'blank' ? 'is-selected' : '') + '" data-template-choice="blank"><i class="fas fa-border-none"></i><strong>' + t('تصميم فارغ', 'Blank design') + '</strong><span>' + t('ابدأ من الصفر', 'Start from scratch') + '</span></button>' +
            '</div>';
        } else if (currentStep === 2) {
            title.textContent = t('أدخل البيانات الأساسية', 'Add the essentials');
            subtitle.textContent = t('هذه البيانات ستظهر فورًا على البطاقة.', 'These details will appear on the card immediately.');
            content.innerHTML = '<div class="eob-form">' +
                field('eob-name', t('الاسم', 'Name'), 'text') +
                field('eob-title-field', t('المسمى الوظيفي', 'Job title'), 'text') +
                field('eob-phone', t('رقم الهاتف', 'Phone number'), 'tel') +
                field('eob-email', t('البريد الإلكتروني', 'Email'), 'email') +
            '</div>';
        } else {
            title.textContent = t('جاهز للبدء', 'Ready to start');
            subtitle.textContent = t('يمكنك إضافة الشعار والصورة ثم تخصيص التصميم بالتفصيل.', 'Add your logo and photo, then fine-tune the design.');
            content.innerHTML = '<div class="eob-ready"><div class="eob-ready-icon"><i class="fas fa-wand-magic-sparkles"></i></div><h2>' + t('تم تجهيز مساحة العمل', 'Your workspace is ready') + '</h2><p>' + t('ستجد الخصائص السياقية والطبقات والمحاذاة الذكية داخل المحرر.', 'Contextual properties, layers and smart alignment are available in the editor.') + '</p><ul><li><i class="fas fa-check"></i>' + t('واجهة مبسطة', 'Simplified workflow') + '</li><li><i class="fas fa-check"></i>' + t('حفظ تلقائي', 'Automatic saving') + '</li><li><i class="fas fa-check"></i>' + t('تحقق ذكي قبل النشر', 'Smart pre-publish checks') + '</li></ul></div>';
        }
    }

    function templateCard(id, icon, title, subtitle) {
        return '<button type="button" class="eob-template-card ' + (selection.template === id ? 'is-selected' : '') + '" data-template-choice="' + id + '"><i class="fas ' + icon + '"></i><strong>' + title + '</strong><span>' + subtitle + '</span></button>';
    }

    function field(id, label, type) {
        return '<label for="' + id + '"><span>' + label + '</span><input id="' + id + '" type="' + type + '"></label>';
    }

    function handleChoice(event) {
        var industry = event.target.closest('[data-industry]');
        if (industry) { selection.industry = industry.dataset.industry; render(); return; }
        var template = event.target.closest('[data-template-choice]');
        if (template) { selection.template = template.dataset.templateChoice; render(); }
    }

    function persistForm() {
        setValue(['input-name_ar', 'input-name_en', 'input-name'], valueOf('eob-name'));
        setValue(['input-tagline_ar', 'input-tagline_en', 'input-job-title', 'input-title'], valueOf('eob-title-field'));
        setValue(['input-phone', 'input-phone_1', 'input-whatsapp'], valueOf('eob-phone'));
        setValue(['input-email'], valueOf('eob-email'));
    }

    function valueOf(id) {
        var input = document.getElementById(id);
        return input ? input.value.trim() : '';
    }

    function next() {
        if (currentStep === 0 && !selection.industry) selection.industry = 'business';
        if (currentStep === 1) {
            if (!selection.template) selection.template = 'modern';
            if (selection.template !== 'blank') clickTemplate(selection.template);
        }
        if (currentStep === 2) persistForm();
        if (currentStep === 3) { complete(); return; }
        goTo(currentStep + 1);
    }

    function goTo(step) {
        currentStep = Math.max(0, Math.min(3, step));
        render();
    }

    function open(options) {
        build();
        currentStep = options && Number.isInteger(options.step) ? options.step : 0;
        overlay.classList.add('is-open');
        render();
        overlay.querySelector('#eob-close').focus();
    }

    function close(markComplete) {
        if (!overlay) return;
        overlay.classList.remove('is-open');
        if (markComplete) {
            try { global.localStorage.setItem(STORAGE_KEY, JSON.stringify({ completed: true, industry: selection.industry, template: selection.template })); } catch (error) { /* no-op */ }
        }
    }

    function dismiss() { close(true); }
    function complete() {
        close(true);
        document.dispatchEvent(new global.CustomEvent('editor:onboardingcomplete', { detail: Object.assign({}, selection) }));
    }

    function shouldOpen() {
        try {
            var saved = JSON.parse(global.localStorage.getItem(STORAGE_KEY) || 'null');
            return !(saved && saved.completed);
        } catch (error) { return true; }
    }

    function injectStyles() {
        if (document.getElementById('editor-onboarding-css')) return;
        var style = document.createElement('style');
        style.id = 'editor-onboarding-css';
        style.textContent = ':root{--editor-space-1:4px;--editor-space-2:8px;--editor-space-3:12px;--editor-space-4:16px;--editor-space-5:24px;--editor-radius-sm:8px;--editor-radius-md:12px;--editor-radius-lg:20px;--editor-surface:#0d1b2e;--editor-surface-raised:#13243a;--editor-border:rgba(255,255,255,.1);--editor-focus:#4da6ff}.eob-overlay{position:fixed;inset:0;z-index:100200;display:flex;align-items:center;justify-content:center;padding:20px;background:rgba(2,7,16,.82);backdrop-filter:blur(12px);opacity:0;pointer-events:none;transition:opacity .2s}.eob-overlay.is-open{opacity:1;pointer-events:auto}.eob-shell{width:min(760px,100%);max-height:92vh;overflow:auto;background:var(--editor-surface);border:1px solid rgba(77,166,255,.22);border-radius:var(--editor-radius-lg);box-shadow:0 30px 90px rgba(0,0,0,.6);padding:24px;color:var(--text-primary,#fff)}.eob-header{display:flex;justify-content:space-between;align-items:flex-start;gap:16px}.eob-kicker{font-size:.68rem;letter-spacing:.14em;color:var(--accent-primary,#4da6ff);font-weight:800}.eob-header h1{font-size:1.5rem;margin:6px 0}.eob-header p{margin:0;color:var(--text-secondary,#9fb0c5);font-size:.88rem}.eob-header button{width:38px;height:38px;border:1px solid var(--editor-border);border-radius:10px;background:rgba(255,255,255,.04);color:inherit;cursor:pointer}.eob-progress{display:grid;grid-template-columns:repeat(4,1fr);gap:7px;margin:22px 0}.eob-progress span{height:4px;border-radius:999px;background:rgba(255,255,255,.08)}.eob-progress span.is-active{background:var(--accent-primary,#4da6ff)}.eob-content{min-height:300px}.eob-choice-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:12px}.eob-choice,.eob-template-card{border:1px solid var(--editor-border);background:rgba(255,255,255,.035);color:inherit;border-radius:14px;padding:20px;cursor:pointer;font-family:inherit;transition:.18s}.eob-choice{display:flex;flex-direction:column;align-items:center;gap:10px}.eob-choice i,.eob-template-card>i{font-size:1.35rem;color:var(--accent-primary,#4da6ff)}.eob-choice:hover,.eob-template-card:hover,.eob-choice.is-selected,.eob-template-card.is-selected{border-color:var(--accent-primary,#4da6ff);background:rgba(77,166,255,.1);transform:translateY(-2px)}.eob-template-grid{display:grid;grid-template-columns:repeat(2,1fr);gap:12px}.eob-template-card{display:grid;grid-template-columns:32px 1fr;text-align:start;gap:3px 10px}.eob-template-card i{grid-row:1/3}.eob-template-card strong{font-size:.9rem}.eob-template-card span{font-size:.72rem;color:var(--text-secondary,#9fb0c5)}.eob-form{display:grid;grid-template-columns:1fr 1fr;gap:14px}.eob-form label{display:flex;flex-direction:column;gap:7px;font-size:.76rem;color:var(--text-secondary,#9fb0c5)}.eob-form input{width:100%;box-sizing:border-box;border:1px solid var(--editor-border);background:rgba(255,255,255,.04);color:var(--text-primary,#fff);border-radius:10px;padding:12px;font:inherit}.eob-form input:focus{outline:2px solid var(--editor-focus);outline-offset:2px}.eob-ready{text-align:center;padding:20px}.eob-ready-icon{width:70px;height:70px;display:grid;place-items:center;margin:auto;border-radius:22px;background:rgba(77,166,255,.12);color:var(--accent-primary,#4da6ff);font-size:1.7rem}.eob-ready h2{margin:16px 0 8px}.eob-ready p{color:var(--text-secondary,#9fb0c5)}.eob-ready ul{display:inline-grid;gap:8px;text-align:start;list-style:none;padding:0}.eob-ready li{display:flex;gap:8px;align-items:center}.eob-ready li i{color:#2ecc71}.eob-footer{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-top:18px;padding-top:18px;border-top:1px solid var(--editor-border)}.eob-actions{display:flex;gap:9px}.eob-footer button{font-family:inherit;cursor:pointer}.eob-primary,.eob-secondary{padding:11px 18px;border-radius:10px;font-weight:700}.eob-primary{border:0;background:var(--accent-primary,#4da6ff);color:#fff}.eob-secondary{border:1px solid var(--editor-border);background:transparent;color:inherit}.eob-link{border:0;background:transparent;color:var(--text-secondary,#9fb0c5)}@media(max-width:640px){.eob-shell{padding:18px}.eob-choice-grid{grid-template-columns:repeat(2,1fr)}.eob-template-grid,.eob-form{grid-template-columns:1fr}.eob-footer{align-items:stretch;flex-direction:column-reverse}.eob-actions{display:grid;grid-template-columns:1fr 1fr}.eob-actions button{width:100%}}@media(prefers-reduced-motion:reduce){.eob-overlay,.eob-choice,.eob-template-card{transition:none}}';
        document.head.appendChild(style);
    }

    function init() {
        build();
        if (shouldOpen()) global.setTimeout(function () { open(); }, 350);
    }

    global.EditorOnboarding = { open: open, close: close, complete: complete, shouldOpen: shouldOpen, setValue: setValue };
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true });
    else init();
}(typeof window !== 'undefined' ? window : globalThis));
