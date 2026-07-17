(function initializeEditorValidation(global) {
    'use strict';

    const document = global.document;
    if (!document) return;

    const isEnglish = document.documentElement.lang.toLowerCase().startsWith('en');
    const copy = isEnglish ? {
        title: 'Design check',
        description: 'Checks content, readability and elements outside the card.',
        open: 'Check design',
        close: 'Close design check',
        recheck: 'Check again',
        ready: 'Ready to publish',
        needsWork: 'Needs attention',
        score: 'Design score',
        noIssues: 'No blocking issues found. The card is ready for preview and publishing.',
        fix: 'Review setting',
        missingName: 'Add a real name instead of the default placeholder.',
        hiddenName: 'The name is hidden from the card.',
        longName: 'The name is long and may wrap on smaller cards.',
        longTagline: 'The job title is long and may reduce readability.',
        missingContact: 'Add at least one phone number or contact method.',
        qrMissing: 'QR is enabled but no code is visible yet.',
        lowNameContrast: 'The name has low contrast with part of the front background.',
        lowTaglineContrast: 'The job title has low contrast with part of the front background.',
        outsideCard: 'An element extends outside the card boundary.',
        emptyBio: 'Bio is enabled but contains no text or availability status.',
        errors: 'errors',
        warnings: 'warnings'
    } : {
        title: 'فحص التصميم',
        description: 'يفحص المحتوى والوضوح والعناصر الخارجة عن البطاقة.',
        open: 'فحص التصميم',
        close: 'إغلاق فحص التصميم',
        recheck: 'إعادة الفحص',
        ready: 'جاهز للنشر',
        needsWork: 'يحتاج مراجعة',
        score: 'درجة التصميم',
        noIssues: 'لم نجد مشكلات مانعة. البطاقة جاهزة للمعاينة والنشر.',
        fix: 'مراجعة الإعداد',
        missingName: 'أضف اسمًا حقيقيًا بدل النص الافتراضي.',
        hiddenName: 'الاسم مخفي من البطاقة.',
        longName: 'الاسم طويل وقد يلتف على البطاقات الصغيرة.',
        longTagline: 'المسمى الوظيفي طويل وقد يقلل وضوح القراءة.',
        missingContact: 'أضف رقم هاتف أو وسيلة تواصل واحدة على الأقل.',
        qrMissing: 'رمز QR مفعّل لكنه غير ظاهر حتى الآن.',
        lowNameContrast: 'تباين الاسم ضعيف مع جزء من الخلفية الأمامية.',
        lowTaglineContrast: 'تباين المسمى الوظيفي ضعيف مع جزء من الخلفية الأمامية.',
        outsideCard: 'يوجد عنصر يتجاوز حدود البطاقة.',
        emptyBio: 'النبذة مفعّلة لكنها لا تحتوي نصًا أو حالة توفر.',
        errors: 'أخطاء',
        warnings: 'تنبيهات'
    };

    const placeholders = [
        'اسمك الكامل هنا',
        'اسمك هنا',
        'your full name here',
        'your name here',
        'name'
    ];

    const state = {
        initialized: false,
        open: false,
        result: { score: 100, errors: 0, warnings: 0, issues: [] },
        restoreFocus: null
    };

    let overlay;
    let dialog;
    let issuesList;
    let scoreOutput;
    let statusOutput;
    let triggerBadge;
    let inspectorBadge;
    let refreshTimer;

    function emit(name, detail) {
        document.dispatchEvent(new global.CustomEvent(name, { detail }));
    }

    function getLocalizedValue(baseId) {
        const language = document.documentElement.lang.toLowerCase().startsWith('en') ? 'en' : 'ar';
        const localized = document.getElementById(`${baseId}_${language}`);
        const fallback = document.getElementById(baseId);
        return (localized || fallback)?.value?.trim() || '';
    }

    function isPlaceholder(value) {
        return placeholders.includes(value.toLowerCase().trim());
    }

    function hasContactMethod() {
        const phone = Array.from(document.querySelectorAll('#phone-numbers-container input[type="tel"]'))
            .some((input) => input.value.trim());
        const staticContactIds = [
            'input-email', 'input-website', 'input-whatsapp', 'input-facebook', 'input-linkedin',
            'input-instagram', 'input-tiktok', 'input-twitter', 'input-telegram', 'input-youtube', 'input-snapchat'
        ];
        const staticContact = staticContactIds.some((id) => document.getElementById(id)?.value?.trim());
        const dynamicContact = Array.from(document.querySelectorAll('.dynamic-social-value-input'))
            .some((input) => input.value.trim());
        return phone || staticContact || dynamicContact;
    }

    function parseHexColor(value) {
        if (!value || typeof value !== 'string') return null;
        let hex = value.trim().replace('#', '');
        if (/^[0-9a-f]{3}$/i.test(hex)) hex = hex.split('').map((character) => character + character).join('');
        if (!/^[0-9a-f]{6}$/i.test(hex)) return null;
        return [0, 2, 4].map((index) => Number.parseInt(hex.slice(index, index + 2), 16));
    }

    function luminance(rgb) {
        const channels = rgb.map((channel) => {
            const value = channel / 255;
            return value <= 0.03928 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
        });
        return 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2];
    }

    function contrastRatio(first, second) {
        const firstRgb = parseHexColor(first);
        const secondRgb = parseHexColor(second);
        if (!firstRgb || !secondRgb) return null;
        const lighter = Math.max(luminance(firstRgb), luminance(secondRgb));
        const darker = Math.min(luminance(firstRgb), luminance(secondRgb));
        return (lighter + 0.05) / (darker + 0.05);
    }

    function minimumContrast(foreground, backgrounds) {
        const ratios = backgrounds.map((background) => contrastRatio(foreground, background)).filter(Number.isFinite);
        return ratios.length ? Math.min(...ratios) : null;
    }

    function findOverflowingElements() {
        const overflow = [];
        document.querySelectorAll('.business-card').forEach((card) => {
            const cardRect = card.getBoundingClientRect();
            if (!cardRect.width || !cardRect.height) return;
            card.querySelectorAll('[data-editor-selectable]').forEach((element) => {
                if (element.hidden || element.classList.contains('editor-layer-hidden')) return;
                const rect = element.getBoundingClientRect();
                if (!rect.width || !rect.height) return;
                const tolerance = 2;
                if (rect.left < cardRect.left - tolerance || rect.top < cardRect.top - tolerance
                    || rect.right > cardRect.right + tolerance || rect.bottom > cardRect.bottom + tolerance) {
                    overflow.push(element.dataset.editorSelectable || element.id);
                }
            });
        });
        return Array.from(new Set(overflow));
    }

    function issue(severity, code, message, itemId) {
        return { severity, code, message, itemId: itemId || null };
    }

    function run() {
        const issues = [];
        const name = getLocalizedValue('input-name');
        const tagline = getLocalizedValue('input-tagline');
        const nameVisible = document.getElementById('visibility-name')?.checked !== false;
        const qrVisible = document.getElementById('visibility-qr')?.checked !== false;
        const bioVisible = document.getElementById('visibility-bio')?.checked !== false;
        const bio = getLocalizedValue('input-bio');
        const availability = document.getElementById('input-availability')?.value || '';

        if (!name || isPlaceholder(name)) issues.push(issue('error', 'missing-name', copy.missingName, 'name'));
        else if (!nameVisible) issues.push(issue('error', 'hidden-name', copy.hiddenName, 'name'));
        if (name.length > 50) issues.push(issue('warning', 'long-name', copy.longName, 'name'));
        if (tagline.length > 80) issues.push(issue('warning', 'long-tagline', copy.longTagline, 'tagline'));
        if (!hasContactMethod()) issues.push(issue('error', 'missing-contact', copy.missingContact, 'contact'));

        if (qrVisible) {
            const qrSource = document.querySelector('input[name="qr-source"]:checked')?.value;
            const qrHasImage = Boolean(document.querySelector('#qr-code-wrapper img, #qr-code-wrapper canvas'));
            const customQr = qrSource === 'custom' && document.getElementById('input-qr-url')?.value?.trim();
            const uploadedQr = qrSource === 'upload' && document.getElementById('input-qr-upload')?.files?.length;
            if (!qrHasImage && !customQr && !uploadedQr) {
                issues.push(issue('warning', 'qr-missing', copy.qrMissing, 'qr'));
            }
        }

        if (bioVisible && !bio && !availability) {
            issues.push(issue('warning', 'empty-bio', copy.emptyBio, 'bio'));
        }

        const backgrounds = [
            document.getElementById('front-bg-start')?.value,
            document.getElementById('front-bg-end')?.value
        ].filter(Boolean);
        const nameContrast = minimumContrast(document.getElementById('name-color')?.value, backgrounds);
        const taglineContrast = minimumContrast(document.getElementById('tagline-color')?.value, backgrounds);
        if (nameContrast !== null && nameContrast < 4.5) {
            issues.push(issue('warning', 'name-contrast', copy.lowNameContrast, 'name'));
        }
        if (taglineContrast !== null && taglineContrast < 3) {
            issues.push(issue('warning', 'tagline-contrast', copy.lowTaglineContrast, 'tagline'));
        }

        findOverflowingElements().forEach((itemId) => {
            issues.push(issue('warning', `overflow-${itemId}`, copy.outsideCard, itemId));
        });

        const errors = issues.filter((item) => item.severity === 'error').length;
        const warnings = issues.filter((item) => item.severity === 'warning').length;
        const score = Math.max(0, 100 - errors * 22 - warnings * 7);
        state.result = { score, errors, warnings, issues };
        updateBadges();
        emit('editor:validationcomplete', { ...state.result, issues: [...issues] });
        return { ...state.result, issues: [...issues] };
    }

    function createButton(className, label, iconName) {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = className;
        button.setAttribute('aria-label', label);
        if (iconName) {
            const icon = document.createElement('i');
            icon.className = `fas ${iconName}`;
            icon.setAttribute('aria-hidden', 'true');
            button.append(icon);
        }
        return button;
    }

    function createTriggers() {
        const canvasTools = document.querySelector('.editor-canvas-tools');
        if (canvasTools && !canvasTools.querySelector('.editor-validation-trigger')) {
            const trigger = createButton('editor-canvas-tool editor-validation-trigger', copy.open, 'fa-shield-alt');
            trigger.setAttribute('aria-haspopup', 'dialog');
            trigger.setAttribute('aria-controls', 'editor-validation-dialog');
            trigger.setAttribute('aria-expanded', 'false');
            triggerBadge = document.createElement('span');
            triggerBadge.className = 'editor-validation-count';
            trigger.append(triggerBadge);
            trigger.addEventListener('click', () => open(trigger));
            canvasTools.prepend(trigger);
        }

        const inspectorHeading = document.querySelector('.editor-inspector-heading');
        if (inspectorHeading && !inspectorHeading.querySelector('.editor-validation-inspector-trigger')) {
            const trigger = createButton('editor-validation-inspector-trigger', copy.open, 'fa-shield-alt');
            const label = document.createElement('span');
            inspectorBadge = document.createElement('strong');
            label.textContent = copy.open;
            inspectorBadge.className = 'editor-validation-inspector-count';
            trigger.append(label, inspectorBadge);
            trigger.setAttribute('aria-haspopup', 'dialog');
            trigger.setAttribute('aria-controls', 'editor-validation-dialog');
            trigger.addEventListener('click', () => open(trigger));
            inspectorHeading.append(trigger);
        }
    }

    function createDialog() {
        overlay = document.createElement('div');
        overlay.className = 'editor-validation-overlay';
        overlay.hidden = true;

        dialog = document.createElement('section');
        dialog.className = 'editor-validation-dialog';
        dialog.id = 'editor-validation-dialog';
        dialog.setAttribute('role', 'dialog');
        dialog.setAttribute('aria-modal', 'true');
        dialog.setAttribute('aria-labelledby', 'editor-validation-title');

        const header = document.createElement('header');
        const headingGroup = document.createElement('div');
        const title = document.createElement('h2');
        const description = document.createElement('p');
        title.id = 'editor-validation-title';
        title.textContent = copy.title;
        description.textContent = copy.description;
        headingGroup.append(title, description);
        const closeButton = createButton('editor-validation-close', copy.close, 'fa-times');
        closeButton.addEventListener('click', close);
        header.append(headingGroup, closeButton);

        const summary = document.createElement('div');
        summary.className = 'editor-validation-summary';
        const scoreGroup = document.createElement('div');
        const scoreLabel = document.createElement('span');
        scoreOutput = document.createElement('strong');
        scoreLabel.textContent = copy.score;
        scoreGroup.append(scoreLabel, scoreOutput);
        statusOutput = document.createElement('span');
        statusOutput.className = 'editor-validation-status';
        summary.append(scoreGroup, statusOutput);

        issuesList = document.createElement('div');
        issuesList.className = 'editor-validation-issues';

        const footer = document.createElement('footer');
        const recheck = createButton('btn btn-primary', copy.recheck, 'fa-sync-alt');
        const recheckLabel = document.createElement('span');
        recheckLabel.textContent = copy.recheck;
        recheck.append(recheckLabel);
        recheck.addEventListener('click', render);
        footer.append(recheck);

        dialog.append(header, summary, issuesList, footer);
        overlay.append(dialog);
        document.body.append(overlay);

        overlay.addEventListener('click', (event) => {
            if (event.target === overlay) close();
        });
        dialog.addEventListener('click', (event) => {
            const review = event.target.closest('[data-validation-item]');
            if (!review) return;
            reviewIssue(review.dataset.validationItem);
        });
    }

    function updateBadges() {
        const count = state.result.errors + state.result.warnings;
        if (triggerBadge) {
            triggerBadge.textContent = String(count);
            triggerBadge.hidden = count === 0;
            triggerBadge.dataset.severity = state.result.errors ? 'error' : 'warning';
        }
        if (inspectorBadge) {
            inspectorBadge.textContent = count ? String(count) : '✓';
            inspectorBadge.dataset.severity = state.result.errors ? 'error' : count ? 'warning' : 'success';
        }
    }

    function render() {
        const result = run();
        scoreOutput.textContent = `${result.score}/100`;
        statusOutput.textContent = result.errors ? copy.needsWork : copy.ready;
        statusOutput.dataset.status = result.errors ? 'error' : 'success';
        issuesList.replaceChildren();

        if (!result.issues.length) {
            const empty = document.createElement('div');
            empty.className = 'editor-validation-empty';
            const icon = document.createElement('i');
            icon.className = 'fas fa-check-circle';
            icon.setAttribute('aria-hidden', 'true');
            const text = document.createElement('p');
            text.textContent = copy.noIssues;
            empty.append(icon, text);
            issuesList.append(empty);
            return result;
        }

        result.issues.forEach((item) => {
            const row = document.createElement('article');
            row.className = 'editor-validation-issue';
            row.dataset.severity = item.severity;
            const icon = document.createElement('i');
            icon.className = item.severity === 'error' ? 'fas fa-times-circle' : 'fas fa-exclamation-triangle';
            icon.setAttribute('aria-hidden', 'true');
            const message = document.createElement('p');
            message.textContent = item.message;
            row.append(icon, message);
            if (item.itemId) {
                const review = createButton('editor-validation-review', copy.fix, 'fa-arrow-right');
                review.dataset.validationItem = item.itemId;
                review.title = copy.fix;
                row.append(review);
            }
            issuesList.append(row);
        });
        return result;
    }

    function open(trigger) {
        state.restoreFocus = trigger || document.activeElement;
        state.open = true;
        overlay.hidden = false;
        document.body.classList.add('editor-validation-open');
        document.querySelectorAll('[aria-controls="editor-validation-dialog"]').forEach((button) => {
            button.setAttribute('aria-expanded', 'true');
        });
        render();
        dialog.querySelector('.editor-validation-close').focus();
    }

    function close() {
        if (!overlay) return;
        state.open = false;
        overlay.hidden = true;
        document.body.classList.remove('editor-validation-open');
        document.querySelectorAll('[aria-controls="editor-validation-dialog"]').forEach((button) => {
            button.setAttribute('aria-expanded', 'false');
        });
        if (state.restoreFocus && typeof state.restoreFocus.focus === 'function') state.restoreFocus.focus();
    }

    function reviewIssue(itemId) {
        const backItems = ['bio', 'qr', 'contact'];
        if (global.EditorWorkspace) {
            if (backItems.includes(itemId)) global.EditorWorkspace.setFace('back');
            global.EditorWorkspace.select(itemId, { focusPanel: true });
        }
        close();
    }

    function scheduleRefresh() {
        global.clearTimeout(refreshTimer);
        refreshTimer = global.setTimeout(() => {
            if (state.open) render();
            else run();
        }, 250);
    }

    function setupEvents() {
        document.addEventListener('input', scheduleRefresh);
        document.addEventListener('change', scheduleRefresh);
        ['editor:layermove', 'editor:layervisibilitychange', 'editor:facechange'].forEach((name) => {
            document.addEventListener(name, scheduleRefresh);
        });
        document.addEventListener('keydown', (event) => {
            if (event.key === 'Escape' && state.open) close();
        });
    }

    function initialize() {
        if (state.initialized) return;
        state.initialized = true;
        createTriggers();
        createDialog();
        setupEvents();
        run();

        if (global.EditorCommands && global.EditorCommands.register) {
            global.EditorCommands.register('design.validate', () => open(document.activeElement));
        }

        document.documentElement.dataset.editorValidation = 'ready';
        emit('editor:validationready', { result: { ...state.result } });
    }

    global.EditorValidation = {
        init: initialize,
        run,
        open,
        close,
        getResult: () => ({ ...state.result, issues: [...state.result.issues] })
    };

    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initialize, { once: true });
    else initialize();
}(typeof window !== 'undefined' ? window : globalThis));
