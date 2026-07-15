/**
 * MC PRIME NFC — Editor Onboarding v1.1
 * Guided first-run flow with validation, resumable progress and template filtering.
 */
(function (global) {
    'use strict';

    var document = global.document;
    if (!document || global.EditorOnboarding) return;

    var STORAGE_KEY = 'mcprime-editor-onboarding-v1';
    var DRAFT_KEY = 'mcprime-editor-onboarding-draft-v1';
    var isAr = document.documentElement.lang !== 'en';
    var overlay = null;
    var currentStep = 0;
    var selection = { industry: '', template: '' };
    var formDraft = { name: '', title: '', phone: '', email: '' };

    var industries = [
        ['medical', 'fa-stethoscope', 'طبي', 'Medical'],
        ['business', 'fa-briefcase', 'أعمال', 'Business'],
        ['engineering', 'fa-gears', 'هندسي', 'Engineering'],
        ['real-estate', 'fa-building', 'عقاري', 'Real estate'],
        ['restaurant', 'fa-utensils', 'مطاعم', 'Restaurant'],
        ['personal', 'fa-user', 'شخصي', 'Personal']
    ];

    var templateCatalog = [
        { id: 'modern', icon: 'fa-sparkles', industries: ['medical', 'business', 'engineering', 'personal'], ar: 'حديث', en: 'Modern', subAr: 'واضح ومتوازن', subEn: 'Clean and balanced' },
        { id: 'professional', icon: 'fa-briefcase', industries: ['medical', 'business', 'engineering', 'real-estate'], ar: 'احترافي', en: 'Professional', subAr: 'مناسب للشركات', subEn: 'Built for business' },
        { id: 'minimal', icon: 'fa-minus', industries: ['business', 'personal', 'restaurant'], ar: 'بسيط', en: 'Minimal', subAr: 'تركيز على البيانات', subEn: 'Focus on information' },
        { id: 'blank', icon: 'fa-border-none', industries: ['*'], ar: 'تصميم فارغ', en: 'Blank design', subAr: 'ابدأ من الصفر', subEn: 'Start from scratch' }
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
                '<header class="eob-header"><div><span class="eob-kicker">MC PRIME EDITOR</span><h1 id="eob-title"></h1><p id="eob-subtitle"></p></div><button type="button" id="eob-close" aria-label="' + t('إغلاق', 'Close') + '"><i class="fas fa-xmark"></i></button></header>' +
                '<div class="eob-progress" aria-label="' + t('تقدم الإعداد', 'Setup progress') + '"></div>' +
                '<div id="eob-message" class="eob-message" role="alert" hidden></div>' +
                '<main id="eob-content" class="eob-content"></main>' +
                '<footer class="eob-footer"><button type="button" id="eob-skip" class="eob-link">' + t('الدخول للوضع المتقدم', 'Open advanced editor') + '</button><div class="eob-actions"><button type="button" id="eob-back" class="eob-secondary">' + t('السابق', 'Back') + '</button><button type="button" id="eob-next" class="eob-primary"></button></div></footer>' +
            '</div>';
        document.body.appendChild(overlay);
        overlay.querySelector('#eob-close').addEventListener('click', dismiss);
        overlay.querySelector('#eob-skip').addEventListener('click', dismiss);
        overlay.querySelector('#eob-back').addEventListener('click', function () { captureForm(); goTo(currentStep - 1); });
        overlay.querySelector('#eob-next').addEventListener('click', next);
        overlay.addEventListener('click', handleChoice);
        overlay.addEventListener('input', function () { captureForm(); clearMessage(); saveDraft(); });
        injectStyles();
        return overlay;
    }

    function renderProgress() {
        overlay.querySelector('.eob-progress').innerHTML = [0, 1, 2, 3].map(function (step) {
            return '<span class="' + (step <= currentStep ? 'is-active' : '') + '" aria-label="' + t('الخطوة ', 'Step ') + (step + 1) + '"></span>';
        }).join('');
    }

    function filteredTemplates() {
        return templateCatalog.filter(function (item) {
            return item.industries.indexOf('*') >= 0 || item.industries.indexOf(selection.industry) >= 0;
        });
    }

    function render() {
        build();
        renderProgress();
        clearMessage();
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
            subtitle.textContent = t('تم ترشيح القوالب حسب المجال المختار.', 'Templates are filtered for your selected industry.');
            content.innerHTML = '<div class="eob-template-grid">' + filteredTemplates().map(templateCard).join('') + '</div>';
        } else if (currentStep === 2) {
            title.textContent = t('أدخل البيانات الأساسية', 'Add the essentials');
            subtitle.textContent = t('الاسم مطلوب، ويجب إضافة وسيلة تواصل واحدة على الأقل.', 'Name is required, plus at least one contact method.');
            content.innerHTML = '<div class="eob-form">' +
                field('eob-name', t('الاسم', 'Name'), 'text', formDraft.name, true) +
                field('eob-title-field', t('المسمى الوظيفي', 'Job title'), 'text', formDraft.title, false) +
                field('eob-phone', t('رقم الهاتف', 'Phone number'), 'tel', formDraft.phone, false) +
                field('eob-email', t('البريد الإلكتروني', 'Email'), 'email', formDraft.email, false) +
            '</div>';
        } else {
            title.textContent = t('جاهز للبدء', 'Ready to start');
            subtitle.textContent = t('راجع اختياراتك ثم افتح مساحة العمل.', 'Review your choices and open the workspace.');
            content.innerHTML = '<div class="eob-ready"><div class="eob-ready-icon"><i class="fas fa-wand-magic-sparkles"></i></div><h2>' + escapeHtml(formDraft.name || t('بطاقتك الجديدة', 'Your new card')) + '</h2><p>' + t('المجال: ', 'Industry: ') + escapeHtml(selection.industry) + ' · ' + t('القالب: ', 'Template: ') + escapeHtml(selection.template) + '</p><ul><li><i class="fas fa-check"></i>' + t('واجهة مبسطة', 'Simplified workflow') + '</li><li><i class="fas fa-check"></i>' + t('حفظ تلقائي', 'Automatic saving') + '</li><li><i class="fas fa-check"></i>' + t('تحقق ذكي قبل النشر', 'Smart pre-publish checks') + '</li></ul></div>';
        }
        saveDraft();
    }

    function templateCard(item) {
        return '<button type="button" class="eob-template-card ' + (selection.template === item.id ? 'is-selected' : '') + '" data-template-choice="' + item.id + '"><i class="fas ' + item.icon + '"></i><strong>' + (isAr ? item.ar : item.en) + '</strong><span>' + (isAr ? item.subAr : item.subEn) + '</span></button>';
    }

    function field(id, label, type, value, required) {
        return '<label for="' + id + '"><span>' + label + (required ? ' *' : '') + '</span><input id="' + id + '" type="' + type + '" value="' + escapeAttribute(value) + '" ' + (required ? 'required' : '') + '></label>';
    }

    function escapeHtml(value) {
        return String(value || '').replace(/[&<>"']/g, function (char) { return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]; });
    }

    function escapeAttribute(value) { return escapeHtml(value); }

    function handleChoice(event) {
        var industry = event.target.closest('[data-industry]');
        if (industry) {
            selection.industry = industry.dataset.industry;
            if (!filteredTemplates().some(function (item) { return item.id === selection.template; })) selection.template = '';
            clearMessage(); saveDraft(); render(); return;
        }
        var template = event.target.closest('[data-template-choice]');
        if (template) { selection.template = template.dataset.templateChoice; clearMessage(); saveDraft(); render(); }
    }

    function captureForm() {
        formDraft.name = valueOf('eob-name') || formDraft.name;
        formDraft.title = valueOf('eob-title-field') || formDraft.title;
        formDraft.phone = valueOf('eob-phone') || formDraft.phone;
        formDraft.email = valueOf('eob-email') || formDraft.email;
    }

    function persistForm() {
        captureForm();
        setValue(['input-name_ar', 'input-name_en', 'input-name'], formDraft.name);
        setValue(['input-tagline_ar', 'input-tagline_en', 'input-job-title', 'input-title'], formDraft.title);
        setValue(['input-phone', 'input-phone_1', 'input-whatsapp'], formDraft.phone);
        setValue(['input-email'], formDraft.email);
    }

    function valueOf(id) {
        var input = document.getElementById(id);
        return input ? input.value.trim() : '';
    }

    function validEmail(value) { return !value || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value); }

    function validateStep() {
        captureForm();
        if (currentStep === 0 && !selection.industry) return t('اختر مجال البطاقة للمتابعة.', 'Choose an industry to continue.');
        if (currentStep === 1 && !selection.template) return t('اختر قالبًا أو تصميمًا فارغًا.', 'Choose a template or blank design.');
        if (currentStep === 2) {
            if (!formDraft.name) return t('أدخل الاسم أولًا.', 'Enter a name first.');
            if (!formDraft.phone && !formDraft.email) return t('أضف رقم هاتف أو بريدًا إلكترونيًا واحدًا على الأقل.', 'Add at least a phone number or email address.');
            if (!validEmail(formDraft.email)) return t('صيغة البريد الإلكتروني غير صحيحة.', 'The email address is not valid.');
        }
        return '';
    }

    function showMessage(message) {
        var host = overlay.querySelector('#eob-message');
        host.textContent = message;
        host.hidden = false;
        host.focus && host.focus();
    }

    function clearMessage() {
        if (!overlay) return;
        var host = overlay.querySelector('#eob-message');
        if (host) { host.hidden = true; host.textContent = ''; }
    }

    function next() {
        var error = validateStep();
        if (error) { showMessage(error); return false; }
        if (currentStep === 1 && selection.template !== 'blank') clickTemplate(selection.template);
        if (currentStep === 2) persistForm();
        if (currentStep === 3) { complete(); return true; }
        goTo(currentStep + 1);
        return true;
    }

    function goTo(step) {
        currentStep = Math.max(0, Math.min(3, step));
        render();
    }

    function saveDraft() {
        try { global.localStorage.setItem(DRAFT_KEY, JSON.stringify({ step: currentStep, selection: selection, form: formDraft })); } catch (error) { /* no-op */ }
    }

    function loadDraft() {
        try {
            var saved = JSON.parse(global.localStorage.getItem(DRAFT_KEY) || 'null');
            if (!saved) return;
            currentStep = Number.isInteger(saved.step) ? Math.max(0, Math.min(3, saved.step)) : 0;
            selection = Object.assign(selection, saved.selection || {});
            formDraft = Object.assign(formDraft, saved.form || {});
        } catch (error) { /* no-op */ }
    }

    function open(options) {
        build();
        loadDraft();
        if (options && Number.isInteger(options.step)) currentStep = options.step;
        overlay.classList.add('is-open');
        render();
        overlay.querySelector('#eob-close').focus();
    }

    function close(markComplete) {
        if (!overlay) return;
        captureForm(); saveDraft();
        overlay.classList.remove('is-open');
        if (markComplete) {
            try { global.localStorage.setItem(STORAGE_KEY, JSON.stringify({ completed: true, industry: selection.industry, template: selection.template })); } catch (error) { /* no-op */ }
        }
    }

    function dismiss() { close(true); }

    function complete() {
        persistForm();
        close(true);
        try { global.localStorage.removeItem(DRAFT_KEY); } catch (error) { /* no-op */ }
        document.dispatchEvent(new global.CustomEvent('editor:onboardingcomplete', { detail: { industry: selection.industry, template: selection.template, form: Object.assign({}, formDraft) } }));
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
        style.textContent = ':root{--editor-space-1:4px;--editor-space-2:8px;--editor-space-3:12px;--editor-space-4:16px;--editor-space-5:24px;--editor-radius-sm:8px;--editor-radius-md:12px;--editor-radius-lg:20px;--editor-surface:#0d1b2e;--editor-border:rgba(255,255,255,.1);--editor-focus:#4da6ff}.eob-overlay{position:fixed;inset:0;z-index:100200;display:flex;align-items:center;justify-content:center;padding:20px;background:rgba(2,7,16,.82);backdrop-filter:blur(12px);opacity:0;pointer-events:none}.eob-overlay.is-open{opacity:1;pointer-events:auto}.eob-shell{width:min(760px,100%);max-height:92vh;overflow:auto;background:var(--editor-surface);border:1px solid rgba(77,166,255,.22);border-radius:20px;box-shadow:0 30px 90px rgba(0,0,0,.6);padding:24px;color:var(--text-primary,#fff)}.eob-header,.eob-footer{display:flex;justify-content:space-between;gap:16px}.eob-header h1{font-size:1.5rem;margin:6px 0}.eob-header p,.eob-template-card span,.eob-form label{color:var(--text-secondary,#9fb0c5)}.eob-kicker{font-size:.68rem;letter-spacing:.14em;color:var(--accent-primary,#4da6ff);font-weight:800}.eob-header button{width:38px;height:38px;border:1px solid var(--editor-border);border-radius:10px;background:rgba(255,255,255,.04);color:inherit}.eob-progress{display:grid;grid-template-columns:repeat(4,1fr);gap:7px;margin:22px 0}.eob-progress span{height:4px;border-radius:999px;background:rgba(255,255,255,.08)}.eob-progress span.is-active{background:var(--accent-primary,#4da6ff)}.eob-message{margin:-8px 0 16px;padding:11px 13px;border-radius:10px;background:rgba(231,76,60,.12);color:#ff8a80;font-size:.78rem}.eob-content{min-height:300px}.eob-choice-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:12px}.eob-template-grid,.eob-form{display:grid;grid-template-columns:1fr 1fr;gap:14px}.eob-choice,.eob-template-card{border:1px solid var(--editor-border);background:rgba(255,255,255,.035);color:inherit;border-radius:14px;padding:20px;font-family:inherit}.eob-choice{display:flex;flex-direction:column;align-items:center;gap:10px}.eob-template-card{display:grid;grid-template-columns:32px 1fr;text-align:start;gap:3px 10px}.eob-template-card i{grid-row:1/3}.eob-choice:hover,.eob-template-card:hover,.eob-choice.is-selected,.eob-template-card.is-selected{border-color:var(--accent-primary,#4da6ff);background:rgba(77,166,255,.1)}.eob-form label{display:flex;flex-direction:column;gap:7px;font-size:.76rem}.eob-form input{box-sizing:border-box;border:1px solid var(--editor-border);background:rgba(255,255,255,.04);color:inherit;border-radius:10px;padding:12px;font:inherit}.eob-form input:focus,.eob-footer button:focus-visible,.eob-choice:focus-visible,.eob-template-card:focus-visible{outline:2px solid var(--editor-focus);outline-offset:2px}.eob-ready{text-align:center;padding:20px}.eob-ready-icon{width:70px;height:70px;display:grid;place-items:center;margin:auto;border-radius:22px;background:rgba(77,166,255,.12);color:var(--accent-primary,#4da6ff);font-size:1.7rem}.eob-ready ul{display:inline-grid;gap:8px;text-align:start;list-style:none;padding:0}.eob-ready li i{color:#2ecc71;margin-inline-end:8px}.eob-footer{align-items:center;margin-top:18px;padding-top:18px;border-top:1px solid var(--editor-border)}.eob-actions{display:flex;gap:9px}.eob-primary,.eob-secondary{padding:11px 18px;border-radius:10px;font-weight:700}.eob-primary{border:0;background:var(--accent-primary,#4da6ff);color:#fff}.eob-secondary{border:1px solid var(--editor-border);background:transparent;color:inherit}.eob-link{border:0;background:transparent;color:var(--text-secondary,#9fb0c5)}@media(max-width:640px){.eob-shell{padding:18px}.eob-choice-grid{grid-template-columns:repeat(2,1fr)}.eob-template-grid,.eob-form{grid-template-columns:1fr}.eob-footer{align-items:stretch;flex-direction:column-reverse}.eob-actions{display:grid;grid-template-columns:1fr 1fr}}';
        document.head.appendChild(style);
    }

    function init() {
        build();
        if (shouldOpen()) global.setTimeout(function () { open(); }, 350);
    }

    global.EditorOnboarding = {
        open: open,
        close: close,
        complete: complete,
        shouldOpen: shouldOpen,
        setValue: setValue,
        next: next,
        goTo: goTo,
        validate: validateStep,
        getState: function () { return { step: currentStep, selection: Object.assign({}, selection), form: Object.assign({}, formDraft) }; }
    };

    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true });
    else init();
}(typeof window !== 'undefined' ? window : globalThis));
