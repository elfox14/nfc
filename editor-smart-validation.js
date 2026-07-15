/**
 * MC PRIME NFC — Smart Validation v1.0
 * Pre-publish checks for content, links, QR, images, contrast and safe area.
 */
(function (global) {
    'use strict';

    var document = global.document;
    if (!document || global.EditorSmartValidation) return;
    var isAr = document.documentElement.lang !== 'en';
    var panel = null;
    var resultsHost = null;

    function issue(code, severity, ar, en, target) {
        return { code: code, severity: severity, message: isAr ? ar : en, target: target || null };
    }

    function value(id) {
        var element = document.getElementById(id);
        return element ? String(element.value || '').trim() : '';
    }

    function visible(element) {
        if (!element) return false;
        var style = global.getComputedStyle(element);
        return style.display !== 'none' && style.visibility !== 'hidden' && Number(style.opacity || 1) > 0;
    }

    function validUrl(raw) {
        if (!raw) return true;
        if (/^(mailto:|tel:|https?:\/\/)/i.test(raw)) {
            if (/^(mailto:|tel:)/i.test(raw)) return raw.length > raw.indexOf(':') + 1;
            try { new URL(raw); return true; } catch (error) { return false; }
        }
        try { new URL('https://' + raw); return true; } catch (error) { return false; }
    }

    function hexToRgb(color) {
        var match = String(color || '').match(/^#([0-9a-f]{6})$/i);
        if (!match) return null;
        var value = parseInt(match[1], 16);
        return { r: (value >> 16) & 255, g: (value >> 8) & 255, b: value & 255 };
    }

    function luminance(rgb) {
        if (!rgb) return null;
        var values = [rgb.r, rgb.g, rgb.b].map(function (channel) {
            var normalized = channel / 255;
            return normalized <= 0.03928 ? normalized / 12.92 : Math.pow((normalized + 0.055) / 1.055, 2.4);
        });
        return 0.2126 * values[0] + 0.7152 * values[1] + 0.0722 * values[2];
    }

    function contrast(a, b) {
        var first = luminance(hexToRgb(a));
        var second = luminance(hexToRgb(b));
        if (first === null || second === null) return null;
        var light = Math.max(first, second);
        var dark = Math.min(first, second);
        return (light + 0.05) / (dark + 0.05);
    }

    function checkRequired() {
        var issues = [];
        var name = value('input-name_ar') || value('input-name_en');
        if (!name) issues.push(issue('missing-name', 'error', 'أضف الاسم قبل النشر.', 'Add a name before publishing.', 'input-name_ar'));
        var hasContact = value('input-email') || value('input-website') || value('input-whatsapp') || value('input-phone') || document.querySelector('[id*="phone_"]');
        if (!hasContact) issues.push(issue('missing-contact', 'warning', 'أضف وسيلة تواصل واحدة على الأقل.', 'Add at least one contact method.'));
        return issues;
    }

    function checkLinks() {
        var issues = [];
        document.querySelectorAll('input[type="url"], input[id^="input-"]').forEach(function (input) {
            var raw = String(input.value || '').trim();
            if (!raw) return;
            var id = input.id.toLowerCase();
            var likelyLink = input.type === 'url' || /website|facebook|linkedin|instagram|tiktok|twitter|telegram|youtube|snapchat|qr-url/.test(id);
            if (likelyLink && !validUrl(raw)) issues.push(issue('invalid-link', 'error', 'رابط غير صالح: ' + raw, 'Invalid link: ' + raw, input.id));
        });
        return issues;
    }

    function checkQr() {
        var issues = [];
        var qr = document.querySelector('#qr-code-wrapper, #card-qr, #qr-code, [id*="qr-code"]');
        var source = value('qr-source');
        var custom = value('input-qr-url');
        if (!qr || !visible(qr)) issues.push(issue('qr-missing', 'warning', 'رمز QR غير ظاهر على البطاقة.', 'QR code is not visible on the card.'));
        if (source === 'custom' && !validUrl(custom)) issues.push(issue('qr-invalid', 'error', 'رابط QR المخصص غير صالح.', 'Custom QR URL is invalid.', 'input-qr-url'));
        if (qr) {
            var rect = qr.getBoundingClientRect();
            if ((rect.width && rect.width < 72) || (rect.height && rect.height < 72)) issues.push(issue('qr-small', 'warning', 'حجم QR صغير وقد يصعب مسحه.', 'QR code may be too small to scan.', qr.id));
        }
        return issues;
    }

    function checkImages() {
        var issues = [];
        document.querySelectorAll('.card-face img, #card-front img, #card-back img').forEach(function (img) {
            if (!visible(img) || !img.src) return;
            var rect = img.getBoundingClientRect();
            if (img.complete && img.naturalWidth && rect.width && img.naturalWidth < rect.width * 1.5) {
                issues.push(issue('low-resolution-image', 'warning', 'صورة منخفضة الجودة: ' + (img.alt || img.id || 'image'), 'Low-resolution image: ' + (img.alt || img.id || 'image'), img.id));
            }
        });
        return issues;
    }

    function checkContrast() {
        var issues = [];
        var pairs = [
            ['name-color', 'front-bg-start', 'name-contrast'],
            ['tagline-color', 'front-bg-start', 'tagline-contrast'],
            ['phone-text-color', 'front-bg-start', 'phone-contrast'],
            ['back-buttons-text-color', 'back-buttons-bg-color', 'button-contrast']
        ];
        pairs.forEach(function (pair) {
            var ratio = contrast(value(pair[0]), value(pair[1]));
            if (ratio !== null && ratio < 4.5) issues.push(issue(pair[2], 'warning', 'تباين الألوان منخفض وقد يصعب قراءة النص.', 'Low color contrast may reduce readability.', pair[0]));
        });
        return issues;
    }

    function checkSafeArea() {
        var issues = [];
        document.querySelectorAll('.card-face, #card-front, #card-back').forEach(function (card) {
            var cardRect = card.getBoundingClientRect();
            if (!cardRect.width || !cardRect.height) return;
            var insetX = cardRect.width * 0.06;
            var insetY = cardRect.height * 0.06;
            card.querySelectorAll('.draggable, .editable-element, .card-element, [data-element-type]').forEach(function (element) {
                if (!visible(element) || element.dataset.editorDeleted === 'true') return;
                var rect = element.getBoundingClientRect();
                var outside = rect.left < cardRect.left + insetX || rect.right > cardRect.right - insetX || rect.top < cardRect.top + insetY || rect.bottom > cardRect.bottom - insetY;
                if (outside) issues.push(issue('outside-safe-area', 'warning', 'عنصر خارج المساحة الآمنة: ' + (element.id || element.tagName.toLowerCase()), 'Element outside safe area: ' + (element.id || element.tagName.toLowerCase()), element.id));
            });
        });
        return issues;
    }

    function run() {
        var issues = [].concat(checkRequired(), checkLinks(), checkQr(), checkImages(), checkContrast(), checkSafeArea());
        render(issues);
        document.dispatchEvent(new global.CustomEvent('editor:validationcomplete', { detail: { issues: issues, valid: !issues.some(function (entry) { return entry.severity === 'error'; }) } }));
        return issues;
    }

    function focusIssue(target) {
        if (!target) return;
        var element = document.getElementById(target);
        if (!element) return;
        if (global.EditorContextInspector && element.closest('.card-face, #card-front, #card-back')) global.EditorContextInspector.select(element);
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
        element.focus && element.focus({ preventScroll: true });
        element.classList.add('esv-highlight');
        global.setTimeout(function () { element.classList.remove('esv-highlight'); }, 1600);
    }

    function render(issues) {
        if (!resultsHost) return;
        if (!issues.length) {
            resultsHost.innerHTML = '<div class="esv-success"><i class="fas fa-circle-check"></i><span>' + (isAr ? 'التصميم جاهز للنشر.' : 'Design is ready to publish.') + '</span></div>';
            return;
        }
        resultsHost.innerHTML = issues.map(function (entry) {
            var icon = entry.severity === 'error' ? 'fa-circle-xmark' : 'fa-triangle-exclamation';
            return '<button type="button" class="esv-result is-' + entry.severity + '" data-validation-target="' + (entry.target || '') + '"><i class="fas ' + icon + '"></i><span>' + entry.message + '</span></button>';
        }).join('');
    }

    function buildPanel() {
        var inspector = document.getElementById('editor-context-inspector');
        if (!inspector || document.getElementById('editor-smart-validation')) return false;
        panel = document.createElement('section');
        panel.id = 'editor-smart-validation';
        panel.className = 'eci-section editor-smart-validation';
        panel.innerHTML = '<div class="esv-head"><div><span class="eci-label">' + (isAr ? 'مراجعة ما قبل النشر' : 'Pre-publish review') + '</span><h3>' + (isAr ? 'التحقق الذكي' : 'Smart validation') + '</h3></div><button type="button" id="esv-run"><i class="fas fa-wand-magic-sparkles"></i><span>' + (isAr ? 'فحص الآن' : 'Run checks') + '</span></button></div><div id="esv-results" class="esv-results"><p>' + (isAr ? 'شغّل الفحص قبل المشاركة أو التصدير.' : 'Run validation before sharing or exporting.') + '</p></div>';
        var advanced = document.getElementById('eci-advanced');
        inspector.insertBefore(panel, advanced || null);
        resultsHost = panel.querySelector('#esv-results');
        panel.querySelector('#esv-run').addEventListener('click', run);
        panel.addEventListener('click', function (event) {
            var item = event.target.closest('[data-validation-target]');
            if (item) focusIssue(item.dataset.validationTarget);
        });
        injectStyles();
        return true;
    }

    function injectStyles() {
        if (document.getElementById('editor-smart-validation-css')) return;
        var style = document.createElement('style');
        style.id = 'editor-smart-validation-css';
        style.textContent = '.esv-head{display:flex;align-items:center;justify-content:space-between;gap:10px}.esv-head h3{font-size:.9rem;margin:2px 0 0}.esv-head button{border:1px solid rgba(77,166,255,.35);background:rgba(77,166,255,.12);color:var(--accent-primary,#4da6ff);border-radius:8px;padding:7px 9px;font-family:inherit;cursor:pointer;display:flex;gap:6px;align-items:center}.esv-results{display:flex;flex-direction:column;gap:6px;margin-top:10px}.esv-results>p{font-size:.7rem;color:var(--text-secondary);line-height:1.5}.esv-result{width:100%;display:grid;grid-template-columns:16px 1fr;gap:8px;text-align:start;border-radius:8px;padding:8px;border:1px solid rgba(255,255,255,.08);background:rgba(255,255,255,.03);color:var(--text-primary);font-family:inherit;cursor:pointer;font-size:.7rem;line-height:1.45}.esv-result.is-error{border-color:rgba(231,76,60,.35)}.esv-result.is-error i{color:#e74c3c}.esv-result.is-warning i{color:#f1c40f}.esv-success{display:flex;gap:8px;align-items:center;padding:9px;border-radius:8px;background:rgba(46,204,113,.1);color:#2ecc71;font-size:.74rem}.esv-highlight{animation:esvPulse .8s ease 2}@keyframes esvPulse{50%{box-shadow:0 0 0 4px rgba(241,196,15,.3)}}';
        document.head.appendChild(style);
    }

    function init() {
        if (!buildPanel()) global.setTimeout(init, 250);
    }

    global.EditorSmartValidation = { run: run, contrast: contrast, validUrl: validUrl };
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true });
    else init();
}(typeof window !== 'undefined' ? window : globalThis));
