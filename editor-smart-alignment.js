/**
 * MC PRIME NFC — Smart Alignment v1.0
 * Safe alignment helpers, grid and safe-area overlays for the current editor.
 */
(function (global) {
    'use strict';

    var document = global.document;
    if (!document || global.EditorSmartAlignment) return;

    var isAr = document.documentElement.lang !== 'en';
    var gridEnabled = false;
    var safeAreaEnabled = false;

    function getSelected() {
        return global.EditorContextInspector && global.EditorContextInspector.getSelected
            ? global.EditorContextInspector.getSelected()
            : null;
    }

    function getCard(element) {
        return element && element.closest('.card-face, .business-card, .card-front, .card-back, #card-front, #card-back');
    }

    function ensurePositioned(element) {
        var style = global.getComputedStyle(element);
        if (style.position === 'static') element.style.position = 'absolute';
    }

    function applyPosition(element, left, top) {
        if (!element || element.dataset.editorLocked === 'true') return false;
        ensurePositioned(element);
        if (left !== null) element.style.left = Math.round(left) + 'px';
        if (top !== null) element.style.top = Math.round(top) + 'px';
        element.style.right = 'auto';
        element.style.bottom = 'auto';
        element.dispatchEvent(new global.Event('input', { bubbles: true }));
        document.dispatchEvent(new global.CustomEvent('editor:elementaligned', { detail: { element: element } }));
        return true;
    }

    function align(mode) {
        var element = getSelected();
        var card = getCard(element);
        if (!element || !card || element === card) return false;

        var cardRect = card.getBoundingClientRect();
        var itemRect = element.getBoundingClientRect();
        var left = itemRect.left - cardRect.left;
        var top = itemRect.top - cardRect.top;

        if (mode === 'left') left = 0;
        if (mode === 'center-x') left = (cardRect.width - itemRect.width) / 2;
        if (mode === 'right') left = cardRect.width - itemRect.width;
        if (mode === 'top') top = 0;
        if (mode === 'center-y') top = (cardRect.height - itemRect.height) / 2;
        if (mode === 'bottom') top = cardRect.height - itemRect.height;
        if (mode === 'center') {
            left = (cardRect.width - itemRect.width) / 2;
            top = (cardRect.height - itemRect.height) / 2;
        }

        return applyPosition(element, left, top);
    }

    function snapValue(value, size) {
        return Math.round(value / size) * size;
    }

    function snapSelected(size) {
        var element = getSelected();
        var card = getCard(element);
        size = Number(size || 8);
        if (!element || !card || element === card) return false;

        var cardRect = card.getBoundingClientRect();
        var itemRect = element.getBoundingClientRect();
        return applyPosition(
            element,
            snapValue(itemRect.left - cardRect.left, size),
            snapValue(itemRect.top - cardRect.top, size)
        );
    }

    function cards() {
        return Array.from(document.querySelectorAll('.card-face, #card-front, #card-back'))
            .filter(function (card, index, list) { return list.indexOf(card) === index; });
    }

    function toggleGrid(force) {
        gridEnabled = typeof force === 'boolean' ? force : !gridEnabled;
        cards().forEach(function (card) { card.classList.toggle('editor-grid-enabled', gridEnabled); });
        syncButtons();
        return gridEnabled;
    }

    function toggleSafeArea(force) {
        safeAreaEnabled = typeof force === 'boolean' ? force : !safeAreaEnabled;
        cards().forEach(function (card) { card.classList.toggle('editor-safe-area-enabled', safeAreaEnabled); });
        syncButtons();
        return safeAreaEnabled;
    }

    function button(command, icon, title) {
        return '<button type="button" class="eci-align-btn" data-align-command="' + command + '" title="' + title + '"><i class="fas ' + icon + '"></i></button>';
    }

    function injectInspectorControls() {
        var inspector = document.getElementById('editor-context-inspector');
        if (!inspector || document.getElementById('eci-alignment-section')) return false;

        var section = document.createElement('section');
        section.id = 'eci-alignment-section';
        section.className = 'eci-section eci-alignment-section';
        section.innerHTML =
            '<span class="eci-label">' + (isAr ? 'المحاذاة والموضع' : 'Alignment and position') + '</span>' +
            '<div class="eci-align-grid">' +
                button('left', 'fa-align-left', isAr ? 'محاذاة لليسار' : 'Align left') +
                button('center-x', 'fa-arrows-left-right-to-line', isAr ? 'توسيط أفقي' : 'Center horizontally') +
                button('right', 'fa-align-right', isAr ? 'محاذاة لليمين' : 'Align right') +
                button('top', 'fa-arrow-up', isAr ? 'محاذاة لأعلى' : 'Align top') +
                button('center', 'fa-crosshairs', isAr ? 'توسيط كامل' : 'Center') +
                button('bottom', 'fa-arrow-down', isAr ? 'محاذاة لأسفل' : 'Align bottom') +
            '</div>' +
            '<div class="eci-view-tools">' +
                '<button type="button" id="eci-grid-toggle" class="eci-tool-toggle"><i class="fas fa-border-all"></i><span>' + (isAr ? 'الشبكة' : 'Grid') + '</span></button>' +
                '<button type="button" id="eci-safe-toggle" class="eci-tool-toggle"><i class="fas fa-expand"></i><span>' + (isAr ? 'المساحة الآمنة' : 'Safe area') + '</span></button>' +
                '<button type="button" id="eci-snap-now" class="eci-tool-toggle"><i class="fas fa-magnet"></i><span>' + (isAr ? 'التقاط للشبكة' : 'Snap now') + '</span></button>' +
            '</div>';

        var advanced = document.getElementById('eci-advanced');
        inspector.insertBefore(section, advanced || null);

        section.addEventListener('click', function (event) {
            var alignButton = event.target.closest('[data-align-command]');
            if (alignButton) align(alignButton.dataset.alignCommand);
        });
        section.querySelector('#eci-grid-toggle').addEventListener('click', function () { toggleGrid(); });
        section.querySelector('#eci-safe-toggle').addEventListener('click', function () { toggleSafeArea(); });
        section.querySelector('#eci-snap-now').addEventListener('click', function () { snapSelected(8); });
        return true;
    }

    function syncButtons() {
        var grid = document.getElementById('eci-grid-toggle');
        var safe = document.getElementById('eci-safe-toggle');
        if (grid) grid.classList.toggle('is-active', gridEnabled);
        if (safe) safe.classList.toggle('is-active', safeAreaEnabled);
    }

    function injectStyles() {
        if (document.getElementById('editor-smart-alignment-css')) return;
        var style = document.createElement('style');
        style.id = 'editor-smart-alignment-css';
        style.textContent = [
            '.eci-alignment-section{margin-top:2px}.eci-align-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:6px;margin-top:9px}',
            '.eci-align-btn,.eci-tool-toggle{border:1px solid rgba(255,255,255,.09);background:rgba(255,255,255,.045);color:var(--text-primary);font-family:inherit;cursor:pointer;border-radius:8px}',
            '.eci-align-btn{min-height:34px}.eci-align-btn:hover,.eci-tool-toggle:hover{background:rgba(77,166,255,.13);border-color:rgba(77,166,255,.35)}',
            '.eci-view-tools{display:grid;grid-template-columns:1fr;gap:6px;margin-top:9px}.eci-tool-toggle{display:flex;align-items:center;gap:8px;padding:8px 10px;text-align:start}.eci-tool-toggle.is-active{background:rgba(77,166,255,.18);color:var(--accent-primary,#4da6ff);border-color:rgba(77,166,255,.4)}',
            '.editor-grid-enabled{background-image:linear-gradient(rgba(77,166,255,.12) 1px,transparent 1px),linear-gradient(90deg,rgba(77,166,255,.12) 1px,transparent 1px)!important;background-size:8px 8px!important}',
            '.editor-safe-area-enabled::after{content:"";position:absolute;inset:6%;border:1px dashed rgba(241,196,15,.8);border-radius:inherit;pointer-events:none;z-index:9998;box-sizing:border-box}',
            '.editor-grid-enabled,.editor-safe-area-enabled{position:relative}'
        ].join('');
        document.head.appendChild(style);
    }

    function init() {
        injectStyles();
        if (!injectInspectorControls()) global.setTimeout(init, 250);
    }

    global.EditorSmartAlignment = {
        align: align,
        snapSelected: snapSelected,
        toggleGrid: toggleGrid,
        toggleSafeArea: toggleSafeArea,
        isGridEnabled: function () { return gridEnabled; },
        isSafeAreaEnabled: function () { return safeAreaEnabled; }
    };

    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true });
    else init();
}(typeof window !== 'undefined' ? window : globalThis));
