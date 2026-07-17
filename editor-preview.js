(function initializeProfessionalPreview(global) {
    'use strict';

    const document = global.document;
    if (!document) return;

    const isEnglish = document.documentElement.lang.toLowerCase().startsWith('en');
    const copy = isEnglish ? {
        title: 'Card preview',
        subtitle: 'Review both faces and check publishing readiness.',
        open: 'Preview card',
        close: 'Close preview',
        desktop: 'Both faces',
        mobile: 'Focus mode',
        front: 'Front',
        back: 'Back',
        ready: 'Ready to publish',
        blocked: 'Fix required items before publishing',
        score: 'Design score',
        review: 'Review issues',
        publish: 'Save and share',
        exportPdf: 'Export PDF'
    } : {
        title: 'معاينة البطاقة',
        subtitle: 'راجع الوجهين وتأكد من جاهزية التصميم للنشر.',
        open: 'معاينة البطاقة',
        close: 'إغلاق المعاينة',
        desktop: 'عرض الوجهين',
        mobile: 'وضع التركيز',
        front: 'الوجه الأمامي',
        back: 'الوجه الخلفي',
        ready: 'جاهز للنشر',
        blocked: 'عالج العناصر المطلوبة قبل النشر',
        score: 'درجة التصميم',
        review: 'مراجعة المشكلات',
        publish: 'حفظ ومشاركة',
        exportPdf: 'تصدير PDF'
    };

    const state = {
        initialized: false,
        open: false,
        device: 'desktop',
        face: 'front',
        restoreFocus: null,
        movedCards: []
    };

    let overlay;
    let dialog;
    let stage;
    let scoreOutput;
    let readinessOutput;
    let publishButton;
    let reviewButton;

    function icon(name) {
        const element = document.createElement('i');
        element.className = `fas ${name}`;
        element.setAttribute('aria-hidden', 'true');
        return element;
    }

    function button(className, label, iconName) {
        const element = document.createElement('button');
        element.type = 'button';
        element.className = className;
        element.setAttribute('aria-label', label);
        if (iconName) element.append(icon(iconName));
        return element;
    }

    function labeledButton(className, label, iconName) {
        const element = button(className, label, iconName);
        const text = document.createElement('span');
        text.textContent = label;
        element.append(text);
        return element;
    }

    function createSegment(label, value, iconName, group) {
        const element = labeledButton('editor-preview-segment', label, iconName);
        element.dataset[group] = value;
        element.setAttribute('aria-pressed', 'false');
        return element;
    }

    function build() {
        overlay = document.createElement('div');
        overlay.className = 'editor-preview-overlay';
        overlay.id = 'editor-professional-preview';
        overlay.hidden = true;

        dialog = document.createElement('section');
        dialog.className = 'editor-preview-dialog';
        dialog.setAttribute('role', 'dialog');
        dialog.setAttribute('aria-modal', 'true');
        dialog.setAttribute('aria-labelledby', 'editor-preview-title');

        const header = document.createElement('header');
        const heading = document.createElement('div');
        const title = document.createElement('h2');
        const subtitle = document.createElement('p');
        title.id = 'editor-preview-title';
        title.textContent = copy.title;
        subtitle.textContent = copy.subtitle;
        heading.append(title, subtitle);

        const controls = document.createElement('div');
        controls.className = 'editor-preview-header-controls';
        const devices = document.createElement('div');
        devices.className = 'editor-preview-segments';
        devices.setAttribute('role', 'group');
        devices.setAttribute('aria-label', copy.open);
        devices.append(
            createSegment(copy.desktop, 'desktop', 'fa-columns', 'previewDevice'),
            createSegment(copy.mobile, 'mobile', 'fa-mobile-alt', 'previewDevice')
        );
        const closeButton = button('editor-preview-close', copy.close, 'fa-times');
        closeButton.addEventListener('click', close);
        controls.append(devices, closeButton);
        header.append(heading, controls);

        const toolbar = document.createElement('div');
        toolbar.className = 'editor-preview-toolbar';
        const faces = document.createElement('div');
        faces.className = 'editor-preview-segments editor-preview-face-controls';
        faces.setAttribute('role', 'group');
        faces.append(
            createSegment(copy.front, 'front', 'fa-id-card', 'previewFace'),
            createSegment(copy.back, 'back', 'fa-address-card', 'previewFace')
        );
        const summary = document.createElement('div');
        summary.className = 'editor-preview-readiness';
        const scoreLabel = document.createElement('span');
        scoreOutput = document.createElement('strong');
        readinessOutput = document.createElement('span');
        scoreLabel.textContent = copy.score;
        summary.append(scoreLabel, scoreOutput, readinessOutput);
        toolbar.append(faces, summary);

        stage = document.createElement('div');
        stage.className = 'editor-preview-stage';
        stage.dataset.device = state.device;
        stage.dataset.face = state.face;

        const footer = document.createElement('footer');
        reviewButton = labeledButton('btn btn-secondary editor-preview-review', copy.review, 'fa-shield-alt');
        const exportButton = labeledButton('btn btn-secondary', copy.exportPdf, 'fa-file-pdf');
        publishButton = labeledButton('btn btn-primary editor-preview-publish', copy.publish, 'fa-paper-plane');
        reviewButton.addEventListener('click', reviewIssues);
        exportButton.addEventListener('click', () => runExistingAction('download-pdf'));
        publishButton.addEventListener('click', publish);
        footer.append(reviewButton, exportButton, publishButton);

        dialog.append(header, toolbar, stage, footer);
        overlay.append(dialog);
        document.body.append(overlay);

        overlay.addEventListener('click', (event) => {
            if (event.target === overlay) close();
        });
        dialog.addEventListener('click', (event) => {
            const device = event.target.closest('[data-preview-device]')?.dataset.previewDevice;
            const face = event.target.closest('[data-preview-face]')?.dataset.previewFace;
            if (device) setDevice(device);
            if (face) setFace(face);
        });
    }

    function moveCardsIntoPreview() {
        state.movedCards = [];
        ['card-front-preview', 'card-back-preview'].forEach((id) => {
            const card = document.getElementById(id);
            if (!card || !card.parentNode) return;
            const marker = document.createComment(`preview:${id}`);
            card.parentNode.insertBefore(marker, card);
            state.movedCards.push({ card, marker });
            stage.append(card);
        });
    }

    function restoreCards() {
        state.movedCards.forEach(({ card, marker }) => {
            if (marker.parentNode) marker.parentNode.insertBefore(card, marker);
            marker.remove();
        });
        state.movedCards = [];
    }

    function updateControls() {
        dialog.querySelectorAll('[data-preview-device]').forEach((element) => {
            element.setAttribute('aria-pressed', element.dataset.previewDevice === state.device ? 'true' : 'false');
        });
        dialog.querySelectorAll('[data-preview-face]').forEach((element) => {
            element.setAttribute('aria-pressed', element.dataset.previewFace === state.face ? 'true' : 'false');
        });
        stage.dataset.device = state.device;
        stage.dataset.face = state.face;
    }

    function setDevice(device) {
        if (!['desktop', 'mobile'].includes(device)) return false;
        state.device = device;
        updateControls();
        return true;
    }

    function setFace(face) {
        if (!['front', 'back'].includes(face)) return false;
        state.face = face;
        updateControls();
        return true;
    }

    function updateReadiness() {
        const result = global.EditorValidation?.run() || { score: 100, errors: 0, warnings: 0 };
        const blocked = result.errors > 0;
        scoreOutput.textContent = `${result.score}/100`;
        readinessOutput.textContent = blocked ? copy.blocked : copy.ready;
        readinessOutput.dataset.status = blocked ? 'error' : 'success';
        publishButton.disabled = blocked;
        publishButton.setAttribute('aria-disabled', blocked ? 'true' : 'false');
        reviewButton.hidden = !result.errors && !result.warnings;
        return result;
    }

    function open(trigger) {
        if (state.open) return;
        state.restoreFocus = trigger || document.activeElement;
        state.open = true;
        document.body.classList.remove('fullscreen-preview');
        moveCardsIntoPreview();
        updateControls();
        overlay.hidden = false;
        document.body.classList.add('editor-preview-open');
        updateReadiness();
        dialog.querySelector('.editor-preview-close').focus();
        document.dispatchEvent(new global.CustomEvent('editor:previewopen'));
    }

    function close() {
        if (!state.open) return;
        state.open = false;
        overlay.hidden = true;
        document.body.classList.remove('editor-preview-open');
        restoreCards();
        if (state.restoreFocus?.focus) state.restoreFocus.focus();
        document.dispatchEvent(new global.CustomEvent('editor:previewclose'));
    }

    function reviewIssues() {
        const trigger = reviewButton;
        close();
        global.EditorValidation?.open(trigger);
    }

    function runExistingAction(id) {
        const action = document.getElementById(id);
        close();
        if (action && typeof action.click === 'function') action.click();
    }

    function publish() {
        const result = updateReadiness();
        if (result.errors) return false;
        runExistingAction('save-share-btn');
        return true;
    }

    function replaceLegacyTrigger() {
        const legacy = document.getElementById('preview-mode-btn');
        if (!legacy) return;
        const trigger = legacy.cloneNode(true);
        trigger.setAttribute('aria-haspopup', 'dialog');
        trigger.setAttribute('aria-controls', overlay.id);
        trigger.setAttribute('aria-label', copy.open);
        legacy.replaceWith(trigger);
        trigger.addEventListener('click', () => open(trigger));
        document.querySelectorAll('.exit-fullscreen-btn, #exit-preview-btn').forEach((element) => {
            element.hidden = true;
            element.style.display = 'none';
        });
    }

    function initialize() {
        if (state.initialized) return;
        state.initialized = true;
        build();
        replaceLegacyTrigger();
        document.addEventListener('keydown', (event) => {
            if (event.key === 'Escape' && state.open) close();
        });
        if (global.EditorCommands?.register) global.EditorCommands.register('preview.open', ({ trigger }) => open(trigger));
        document.documentElement.dataset.editorPreview = 'ready';
    }

    global.EditorPreview = {
        init: initialize,
        open,
        close,
        setDevice,
        setFace,
        publish,
        getState: () => ({ ...state, movedCards: [...state.movedCards] })
    };

    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initialize, { once: true });
    else initialize();
}(typeof window !== 'undefined' ? window : globalThis));
