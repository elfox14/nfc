/**
 * MC PRIME NFC — Context Inspector v1.6
 * Adds a right-side contextual inspector without replacing existing controls.
 */
(function (global) {
    'use strict';
    var document = global.document;
    if (!document || global.EditorContextInspector) return;
    var isAr = document.documentElement.lang !== 'en';
    var selectedElement = null, inspector = null, titleEl = null, typeEl = null, statusEl = null, opacityInput = null, opacityOutput = null, advancedButton = null;
    var elementMap = [
        { match: /logo/i, labelAr: 'الشعار', labelEn: 'Logo', controls: ['logo-fieldset', 'logo-controls-fieldset'] },
        { match: /photo|avatar|profile/i, labelAr: 'الصورة الشخصية', labelEn: 'Profile photo', controls: ['photo-controls-fieldset'] },
        { match: /name/i, labelAr: 'الاسم', labelEn: 'Name', controls: ['name-controls-fieldset', 'text-controls-fieldset'] },
        { match: /tagline|job|title/i, labelAr: 'المسمى الوظيفي', labelEn: 'Job title', controls: ['tagline-controls-fieldset', 'text-controls-fieldset'] },
        { match: /qr/i, labelAr: 'رمز QR', labelEn: 'QR code', controls: ['qr-controls-fieldset'] },
        { match: /phone/i, labelAr: 'الهاتف', labelEn: 'Phone', controls: ['phone-controls-fieldset'] },
        { match: /email/i, labelAr: 'البريد الإلكتروني', labelEn: 'Email', controls: ['email-controls-fieldset'] },
        { match: /social|facebook|instagram|linkedin|twitter|tiktok|youtube|telegram|snapchat/i, labelAr: 'رابط اجتماعي', labelEn: 'Social link', controls: ['social-controls-wrapper'] }
    ];
    function getDescriptor(element) {
        var key = [element.id, element.className, element.getAttribute('data-element-type'), element.getAttribute('aria-label')].filter(Boolean).join(' ');
        return elementMap.find(function (entry) { return entry.match.test(key); }) || { labelAr: element.getAttribute('aria-label') || element.id || 'عنصر', labelEn: element.getAttribute('aria-label') || element.id || 'Element', controls: [] };
    }
    function getSelectable(target) {
        if (!target || !target.closest) return null;
        var card = target.closest('.card-face, .business-card, .card-front, .card-back, #card-front, #card-back');
        if (!card) return null;
        return target.closest('[id], [data-element-type], .draggable, .editable-element, .card-element') || card;
    }
    function setSelected(element) {
        if (!element) return;
        if (selectedElement) selectedElement.classList.remove('editor-selected-element');
        selectedElement = element;
        selectedElement.classList.add('editor-selected-element');
        renderSelection();
        document.dispatchEvent(new global.CustomEvent('editor:selectionchange', { detail: { element: element } }));
    }
    function renderSelection() {
        if (!selectedElement || !inspector) return;
        var descriptor = getDescriptor(selectedElement), computed = global.getComputedStyle(selectedElement);
        var hidden = computed.display === 'none' || computed.visibility === 'hidden' || computed.opacity === '0';
        var opacity = Math.round(parseFloat(computed.opacity || '1') * 100);
        titleEl.textContent = isAr ? descriptor.labelAr : descriptor.labelEn;
        typeEl.textContent = selectedElement.id || selectedElement.getAttribute('data-element-type') || selectedElement.tagName.toLowerCase();
        statusEl.textContent = hidden ? (isAr ? 'مخفي' : 'Hidden') : (isAr ? 'ظاهر' : 'Visible');
        statusEl.dataset.state = hidden ? 'hidden' : 'visible';
        opacityInput.value = String(opacity); opacityOutput.value = opacity + '%'; opacityOutput.textContent = opacity + '%';
        advancedButton.dataset.targets = descriptor.controls.join(',');
    }
    function openAdvancedControls() {
        if (!selectedElement) return;
        var targets = (advancedButton.dataset.targets || '').split(',').filter(Boolean);
        var target = targets.map(function (id) { return document.getElementById(id); }).find(Boolean);
        if (!target) {
            var descriptor = getDescriptor(selectedElement), key = descriptor.labelEn.toLowerCase();
            target = Array.from(document.querySelectorAll('#panel-design details, #panel-elements details, #panel-design fieldset, #panel-elements fieldset')).find(function (panel) { return panel.textContent.toLowerCase().includes(key); });
        }
        if (target) {
            if (target.tagName === 'DETAILS') target.open = true;
            if (global.EditorTabs && typeof global.EditorTabs.activate === 'function') global.EditorTabs.activate(target.closest('#panel-elements') ? 'tab-content' : 'tab-design');
            target.scrollIntoView({ behavior: 'smooth', block: 'start' });
            target.classList.add('editor-inspector-highlight');
            global.setTimeout(function () { target.classList.remove('editor-inspector-highlight'); }, 1600);
        }
    }
    function applyOpacity(value) {
        if (!selectedElement) return;
        selectedElement.style.opacity = String(Number(value) / 100);
        opacityOutput.value = value + '%'; opacityOutput.textContent = value + '%';
        selectedElement.dispatchEvent(new global.Event('input', { bubbles: true }));
    }
    function buildInspector() {
        var layout = document.querySelector('.pro-layout');
        if (!layout || document.getElementById('editor-context-inspector')) return false;
        inspector = document.createElement('aside');
        inspector.id = 'editor-context-inspector'; inspector.className = 'editor-context-inspector';
        inspector.setAttribute('aria-label', isAr ? 'خصائص العنصر المحدد' : 'Selected element properties');
        inspector.innerHTML = '<div class="eci-header"><div><span class="eci-eyebrow">' + (isAr ? 'العنصر المحدد' : 'Selected element') + '</span><h2 id="eci-title">' + (isAr ? 'إعدادات البطاقة' : 'Card settings') + '</h2></div><span id="eci-status" class="eci-status" data-state="visible">' + (isAr ? 'ظاهر' : 'Visible') + '</span></div>' +
            '<div class="eci-section"><span class="eci-label">' + (isAr ? 'المعرف' : 'Identifier') + '</span><code id="eci-type">card</code></div>' +
            '<div class="eci-section"><label class="eci-range-label" for="eci-opacity"><span>' + (isAr ? 'الشفافية' : 'Opacity') + '</span><output id="eci-opacity-output">100%</output></label><input id="eci-opacity" type="range" min="0" max="100" value="100"></div>' +
            '<button id="eci-advanced" type="button" class="eci-primary"><i class="fas fa-sliders-h"></i><span>' + (isAr ? 'فتح الإعدادات المتقدمة' : 'Open advanced settings') + '</span></button>' +
            '<p class="eci-help">' + (isAr ? 'اضغط على أي عنصر داخل البطاقة لعرض خصائصه هنا.' : 'Click any element on the card to inspect it here.') + '</p>';
        var sharePanel = document.getElementById('panel-share');
        if (sharePanel) layout.insertBefore(inspector, sharePanel); else layout.appendChild(inspector);
        titleEl = inspector.querySelector('#eci-title'); typeEl = inspector.querySelector('#eci-type'); statusEl = inspector.querySelector('#eci-status');
        opacityInput = inspector.querySelector('#eci-opacity'); opacityOutput = inspector.querySelector('#eci-opacity-output'); advancedButton = inspector.querySelector('#eci-advanced');
        opacityInput.addEventListener('input', function () { applyOpacity(opacityInput.value); }); advancedButton.addEventListener('click', openAdvancedControls);
        injectStyles(); return true;
    }
    function injectStyles() {
        if (document.getElementById('editor-context-inspector-css')) return;
        var style = document.createElement('style'); style.id = 'editor-context-inspector-css';
        style.textContent = '.editor-context-inspector{width:280px;min-width:260px;max-width:320px;padding:18px;background:var(--sidebar-bg,#0d1b2e);border-inline-start:1px solid rgba(77,166,255,.16);box-sizing:border-box;overflow:auto;color:var(--text-primary)}.eci-header{display:flex;align-items:flex-start;justify-content:space-between;gap:12px;margin-bottom:18px}.eci-eyebrow{display:block;font-size:.68rem;color:var(--text-secondary);margin-bottom:4px}.eci-header h2{font-size:1rem;margin:0}.eci-status{font-size:.68rem;padding:4px 8px;border-radius:999px;background:rgba(46,204,113,.12);color:#2ecc71}.eci-status[data-state="hidden"]{background:rgba(231,76,60,.12);color:#e74c3c}.eci-section{background:rgba(255,255,255,.035);border:1px solid rgba(255,255,255,.07);border-radius:11px;padding:12px;margin-bottom:10px}.eci-label,.eci-range-label{font-size:.72rem;color:var(--text-secondary)}.eci-section code{display:block;margin-top:6px;color:var(--accent-primary,#4da6ff);overflow:hidden;text-overflow:ellipsis}.eci-range-label{display:flex;justify-content:space-between;margin-bottom:8px}.eci-section input[type="range"]{width:100%;accent-color:var(--accent-primary,#4da6ff)}.eci-primary{width:100%;display:flex;align-items:center;justify-content:center;gap:8px;padding:10px 12px;border:0;border-radius:10px;background:var(--accent-primary,#4da6ff);color:#fff;font-family:inherit;font-weight:700;cursor:pointer}.eci-primary:hover{filter:brightness(1.08)}.eci-primary:focus-visible{outline:2px solid #fff;outline-offset:2px}.eci-help{font-size:.72rem;line-height:1.6;color:var(--text-secondary);margin:12px 2px 0}.editor-selected-element{outline:2px solid var(--accent-primary,#4da6ff)!important;outline-offset:3px!important}.editor-inspector-highlight{animation:eciPulse .8s ease 2}@keyframes eciPulse{50%{box-shadow:0 0 0 4px rgba(77,166,255,.25)}}@media(max-width:1024px){.editor-context-inspector{display:none}}';
        document.head.appendChild(style);
    }
    function loadScript(src, marker) {
        if (document.querySelector('script[' + marker + ']')) return;
        var script = document.createElement('script'); script.src = src; script.defer = true; script.setAttribute(marker, 'true'); document.head.appendChild(script);
    }
    function init() {
        if (!buildInspector()) { global.setTimeout(init, 250); return; }
        document.addEventListener('click', function (event) { var element = getSelectable(event.target); if (element && element.dataset.editorLayerLocked !== 'true') setSelected(element); }, true);
        if (!global.EditorLayersPanel) loadScript('editor-layers-panel.js?v=1.0', 'data-editor-layers-loader');
        if (!global.EditorSmartAlignment) loadScript('editor-smart-alignment.js?v=1.0', 'data-editor-alignment-loader');
        if (!global.EditorMultiSelect) loadScript('editor-multi-select.js?v=1.0', 'data-editor-multi-loader');
        if (!global.EditorCommandSurface) loadScript('editor-command-surface.js?v=1.1', 'data-editor-command-surface-loader');
        if (!global.EditorHistoryBridge) loadScript('editor-history-bridge.js?v=1.0', 'data-editor-history-loader');
        if (!global.EditorExtensionPersistence) loadScript('editor-extension-persistence.js?v=1.0', 'data-editor-extension-persistence-loader');
        if (!global.EditorSmartValidation) loadScript('editor-smart-validation.js?v=1.0', 'data-editor-smart-validation-loader');
        if (!global.EditorPublishGate) loadScript('editor-publish-gate.js?v=1.0', 'data-editor-publish-gate-loader');
        if (!global.EditorOnboarding) loadScript('editor-onboarding.js?v=1.0', 'data-editor-onboarding-loader');
    }
    global.EditorContextInspector = { select: setSelected, getSelected: function () { return selectedElement; } };
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true }); else init();
}(typeof window !== 'undefined' ? window : globalThis));
