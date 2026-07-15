/**
 * MC PRIME NFC — Publish Gate v1.0
 * Runs smart validation before share/export actions and blocks critical errors.
 */
(function (global) {
    'use strict';

    var document = global.document;
    if (!document || global.EditorPublishGate) return;

    var isAr = document.documentElement.lang !== 'en';
    var dialog = null;
    var pendingTrigger = null;
    var bypass = new WeakSet();
    var lastReport = [];

    function isPublishTrigger(element) {
        if (!element || !element.closest) return null;
        var trigger = element.closest('button, a, [role="button"], [data-editor-command]');
        if (!trigger || trigger.closest('#editor-publish-gate')) return null;
        var key = [
            trigger.id,
            trigger.className,
            trigger.getAttribute('data-editor-command'),
            trigger.getAttribute('data-action'),
            trigger.getAttribute('aria-label'),
            trigger.title,
            trigger.textContent
        ].filter(Boolean).join(' ').toLowerCase();
        return /export|download|publish|share|تصدير|تحميل|نشر|مشاركة|save-share/.test(key) ? trigger : null;
    }

    function summarize(issues) {
        return {
            errors: issues.filter(function (entry) { return entry.severity === 'error'; }),
            warnings: issues.filter(function (entry) { return entry.severity !== 'error'; })
        };
    }

    function validate() {
        if (!global.EditorSmartValidation || typeof global.EditorSmartValidation.run !== 'function') {
            return { issues: [], errors: [], warnings: [], valid: true };
        }
        var issues = global.EditorSmartValidation.run() || [];
        var groups = summarize(issues);
        return { issues: issues, errors: groups.errors, warnings: groups.warnings, valid: groups.errors.length === 0 };
    }

    function buildDialog() {
        if (dialog) return dialog;
        dialog = document.createElement('div');
        dialog.id = 'editor-publish-gate';
        dialog.className = 'epg-overlay';
        dialog.setAttribute('role', 'dialog');
        dialog.setAttribute('aria-modal', 'true');
        dialog.setAttribute('aria-labelledby', 'epg-title');
        dialog.innerHTML =
            '<div class="epg-dialog">' +
                '<div class="epg-head"><div><span>' + (isAr ? 'مراجعة نهائية' : 'Final review') + '</span><h2 id="epg-title">' + (isAr ? 'جاهزية النشر' : 'Publish readiness') + '</h2></div><button type="button" id="epg-close" aria-label="' + (isAr ? 'إغلاق' : 'Close') + '"><i class="fas fa-xmark"></i></button></div>' +
                '<div id="epg-summary" class="epg-summary"></div>' +
                '<div id="epg-checklist" class="epg-checklist"></div>' +
                '<label id="epg-warning-consent" class="epg-consent"><input type="checkbox" id="epg-consent"><span>' + (isAr ? 'راجعت التحذيرات وأرغب في المتابعة.' : 'I reviewed the warnings and want to continue.') + '</span></label>' +
                '<div class="epg-actions"><button type="button" id="epg-review" class="epg-secondary">' + (isAr ? 'مراجعة المشكلات' : 'Review issues') + '</button><button type="button" id="epg-proceed" class="epg-primary">' + (isAr ? 'متابعة النشر' : 'Continue') + '</button></div>' +
            '</div>';
        document.body.appendChild(dialog);
        dialog.querySelector('#epg-close').addEventListener('click', close);
        dialog.querySelector('#epg-review').addEventListener('click', focusFirstIssue);
        dialog.querySelector('#epg-consent').addEventListener('change', syncProceedState);
        dialog.querySelector('#epg-proceed').addEventListener('click', proceed);
        dialog.addEventListener('click', function (event) { if (event.target === dialog) close(); });
        injectStyles();
        return dialog;
    }

    function render(report) {
        buildDialog();
        lastReport = report.issues;
        var summary = dialog.querySelector('#epg-summary');
        var checklist = dialog.querySelector('#epg-checklist');
        var consentWrap = dialog.querySelector('#epg-warning-consent');
        var consent = dialog.querySelector('#epg-consent');

        summary.className = 'epg-summary ' + (report.errors.length ? 'is-error' : report.warnings.length ? 'is-warning' : 'is-ready');
        summary.innerHTML = report.errors.length
            ? '<i class="fas fa-circle-xmark"></i><div><strong>' + (isAr ? 'لا يمكن النشر الآن' : 'Publishing is blocked') + '</strong><span>' + report.errors.length + ' ' + (isAr ? 'أخطاء حرجة تحتاج إلى إصلاح.' : 'critical issue(s) must be fixed.') + '</span></div>'
            : report.warnings.length
                ? '<i class="fas fa-triangle-exclamation"></i><div><strong>' + (isAr ? 'يمكن المتابعة بعد المراجعة' : 'Review before continuing') + '</strong><span>' + report.warnings.length + ' ' + (isAr ? 'تحذيرات تحتاج إلى تأكيد.' : 'warning(s) require confirmation.') + '</span></div>'
                : '<i class="fas fa-circle-check"></i><div><strong>' + (isAr ? 'التصميم جاهز للنشر' : 'Ready to publish') + '</strong><span>' + (isAr ? 'لم يتم اكتشاف مشكلات.' : 'No issues were detected.') + '</span></div>';

        checklist.innerHTML = report.issues.length ? report.issues.map(function (entry, index) {
            var icon = entry.severity === 'error' ? 'fa-circle-xmark' : 'fa-triangle-exclamation';
            return '<button type="button" class="epg-item is-' + entry.severity + '" data-issue-index="' + index + '"><i class="fas ' + icon + '"></i><span>' + entry.message + '</span></button>';
        }).join('') : '<div class="epg-clean"><i class="fas fa-check"></i><span>' + (isAr ? 'اكتملت قائمة التحقق بنجاح.' : 'All checklist items passed.') + '</span></div>';

        checklist.onclick = function (event) {
            var item = event.target.closest('[data-issue-index]');
            if (item) focusIssue(lastReport[Number(item.dataset.issueIndex)]);
        };

        consent.checked = false;
        consentWrap.hidden = report.errors.length > 0 || report.warnings.length === 0;
        dialog.dataset.hasErrors = report.errors.length ? 'true' : 'false';
        dialog.dataset.hasWarnings = report.warnings.length ? 'true' : 'false';
        syncProceedState();
        dialog.classList.add('is-open');
        dialog.querySelector('#epg-close').focus();
    }

    function syncProceedState() {
        if (!dialog) return;
        var proceedButton = dialog.querySelector('#epg-proceed');
        var hasErrors = dialog.dataset.hasErrors === 'true';
        var hasWarnings = dialog.dataset.hasWarnings === 'true';
        var consent = dialog.querySelector('#epg-consent').checked;
        proceedButton.disabled = hasErrors || (hasWarnings && !consent);
    }

    function focusIssue(entry) {
        if (!entry || !entry.target) return;
        var element = document.getElementById(entry.target);
        if (!element) return;
        close();
        if (global.EditorContextInspector && element.closest('.card-face, #card-front, #card-back')) global.EditorContextInspector.select(element);
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
        if (element.focus) element.focus({ preventScroll: true });
        element.classList.add('epg-highlight');
        global.setTimeout(function () { element.classList.remove('epg-highlight'); }, 1600);
    }

    function focusFirstIssue() {
        if (lastReport.length) focusIssue(lastReport[0]);
    }

    function proceed() {
        if (!pendingTrigger || dialog.querySelector('#epg-proceed').disabled) return;
        var trigger = pendingTrigger;
        pendingTrigger = null;
        close();
        bypass.add(trigger);
        trigger.click();
        global.setTimeout(function () { bypass.delete(trigger); }, 0);
        document.dispatchEvent(new global.CustomEvent('editor:publishapproved', { detail: { trigger: trigger, issues: lastReport.slice() } }));
    }

    function close() {
        if (dialog) dialog.classList.remove('is-open');
    }

    function intercept(event) {
        var trigger = isPublishTrigger(event.target);
        if (!trigger || bypass.has(trigger) || trigger.disabled) return;
        event.preventDefault();
        event.stopImmediatePropagation();
        pendingTrigger = trigger;
        render(validate());
    }

    function injectStyles() {
        if (document.getElementById('editor-publish-gate-css')) return;
        var style = document.createElement('style');
        style.id = 'editor-publish-gate-css';
        style.textContent = '.epg-overlay{position:fixed;inset:0;z-index:100050;background:rgba(3,8,18,.78);backdrop-filter:blur(8px);display:flex;align-items:center;justify-content:center;padding:18px;opacity:0;pointer-events:none;transition:opacity .22s}.epg-overlay.is-open{opacity:1;pointer-events:auto}.epg-dialog{width:min(520px,100%);max-height:90vh;overflow:auto;background:var(--sidebar-bg,#0d1b2e);border:1px solid rgba(77,166,255,.22);border-radius:18px;padding:20px;box-shadow:0 30px 80px rgba(0,0,0,.55)}.epg-head{display:flex;align-items:flex-start;justify-content:space-between;gap:12px}.epg-head span{font-size:.68rem;color:var(--text-secondary)}.epg-head h2{font-size:1.15rem;margin:3px 0 0}.epg-head button{border:0;background:rgba(255,255,255,.06);color:var(--text-primary);border-radius:9px;width:34px;height:34px;cursor:pointer}.epg-summary{display:grid;grid-template-columns:24px 1fr;gap:10px;align-items:center;padding:12px;border-radius:11px;margin:16px 0}.epg-summary strong,.epg-summary span{display:block}.epg-summary span{font-size:.72rem;margin-top:3px}.epg-summary.is-error{background:rgba(231,76,60,.12);color:#ff7b70}.epg-summary.is-warning{background:rgba(241,196,15,.12);color:#f1c40f}.epg-summary.is-ready{background:rgba(46,204,113,.12);color:#2ecc71}.epg-checklist{display:flex;flex-direction:column;gap:7px}.epg-item{display:grid;grid-template-columns:18px 1fr;gap:8px;width:100%;padding:10px;text-align:start;border:1px solid rgba(255,255,255,.08);border-radius:9px;background:rgba(255,255,255,.03);color:var(--text-primary);font-family:inherit;cursor:pointer;font-size:.76rem}.epg-item.is-error i{color:#e74c3c}.epg-item.is-warning i{color:#f1c40f}.epg-clean{display:flex;gap:8px;padding:11px;border-radius:9px;background:rgba(46,204,113,.08);color:#2ecc71}.epg-consent{display:flex;gap:9px;align-items:flex-start;margin:15px 0;font-size:.76rem;color:var(--text-secondary)}.epg-actions{display:grid;grid-template-columns:1fr 1fr;gap:9px;margin-top:16px}.epg-actions button{padding:11px;border-radius:10px;font-family:inherit;font-weight:700;cursor:pointer}.epg-secondary{border:1px solid rgba(255,255,255,.12);background:rgba(255,255,255,.04);color:var(--text-primary)}.epg-primary{border:0;background:var(--accent-primary,#4da6ff);color:#fff}.epg-primary:disabled{opacity:.45;cursor:not-allowed}.epg-highlight{animation:epgPulse .8s ease 2}@keyframes epgPulse{50%{box-shadow:0 0 0 5px rgba(231,76,60,.28)}}@media(max-width:600px){.epg-actions{grid-template-columns:1fr}.epg-dialog{padding:16px}}@media(prefers-reduced-motion:reduce){.epg-overlay{transition:none}}';
        document.head.appendChild(style);
    }

    function init() {
        document.addEventListener('click', intercept, true);
        document.addEventListener('keydown', function (event) { if (event.key === 'Escape') close(); });
    }

    global.EditorPublishGate = {
        check: validate,
        open: function (trigger) { pendingTrigger = trigger || null; render(validate()); },
        close: close,
        isPublishTrigger: isPublishTrigger
    };

    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true });
    else init();
}(typeof window !== 'undefined' ? window : globalThis));
