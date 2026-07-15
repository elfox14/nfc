/**
 * MC PRIME NFC — Layers Panel v1.0
 * Safe layer controls for the legacy editor renderer.
 */
(function (global) {
    'use strict';

    var document = global.document;
    if (!document || global.EditorLayersPanel) return;

    var isAr = document.documentElement.lang !== 'en';
    var panel = null;
    var list = null;
    var layerElements = [];
    var selectedElement = null;

    var descriptors = [
        { selector: '#card-logo, #card-logo-img', ar: 'الشعار', en: 'Logo', icon: 'fa-image' },
        { selector: '#card-personal-photo-wrapper, #card-personal-photo, #card-personal-photo-img', ar: 'الصورة الشخصية', en: 'Profile photo', icon: 'fa-user-circle' },
        { selector: '#card-name, [id*="card-name"]', ar: 'الاسم', en: 'Name', icon: 'fa-font' },
        { selector: '#card-tagline, [id*="tagline"]', ar: 'المسمى الوظيفي', en: 'Job title', icon: 'fa-heading' },
        { selector: '#card-qr, #qr-code, [id*="qr-code"]', ar: 'رمز QR', en: 'QR code', icon: 'fa-qrcode' },
        { selector: '#card-phone, [id*="phone"]', ar: 'الهاتف', en: 'Phone', icon: 'fa-phone' },
        { selector: '#card-email, [id*="email"]', ar: 'البريد الإلكتروني', en: 'Email', icon: 'fa-envelope' },
        { selector: '[id*="social-link"], .social-link, .social-icon', ar: 'رابط اجتماعي', en: 'Social link', icon: 'fa-share-nodes', multiple: true }
    ];

    function getRootElement(element) {
        if (!element) return null;
        return element.closest('.draggable, .editable-element, .card-element, [data-element-type]') || element;
    }

    function discoverLayers() {
        var seen = new Set();
        var layers = [];

        descriptors.forEach(function (descriptor) {
            var matches = descriptor.multiple ? document.querySelectorAll(descriptor.selector) : [document.querySelector(descriptor.selector)];
            Array.from(matches).filter(Boolean).forEach(function (match, index) {
                var element = getRootElement(match);
                if (!element || seen.has(element)) return;
                var card = element.closest('.card-face, .business-card, .card-front, .card-back, #card-front, #card-back');
                if (!card) return;
                seen.add(element);
                layers.push({
                    element: element,
                    label: isAr ? descriptor.ar : descriptor.en,
                    icon: descriptor.icon,
                    suffix: descriptor.multiple ? index + 1 : null
                });
            });
        });

        document.querySelectorAll('.card-face .draggable[id], .business-card .draggable[id], .card-front .draggable[id], .card-back .draggable[id]').forEach(function (element) {
            if (seen.has(element)) return;
            seen.add(element);
            layers.push({
                element: element,
                label: element.getAttribute('aria-label') || element.id || (isAr ? 'عنصر' : 'Element'),
                icon: 'fa-layer-group',
                suffix: null
            });
        });

        layerElements = layers;
        return layers;
    }

    function isHidden(element) {
        return element.dataset.editorLayerHidden === 'true' || global.getComputedStyle(element).display === 'none';
    }

    function isLocked(element) {
        return element.dataset.editorLayerLocked === 'true';
    }

    function selectLayer(element) {
        selectedElement = element;
        if (global.EditorContextInspector && typeof global.EditorContextInspector.select === 'function') {
            global.EditorContextInspector.select(element);
        } else {
            document.dispatchEvent(new global.CustomEvent('editor:selectionchange', { detail: { element: element } }));
        }
        render();
    }

    function toggleVisibility(element) {
        var hidden = isHidden(element);
        if (hidden) {
            element.style.display = element.dataset.editorLayerDisplay || '';
            delete element.dataset.editorLayerHidden;
        } else {
            element.dataset.editorLayerDisplay = element.style.display || '';
            element.dataset.editorLayerHidden = 'true';
            element.style.display = 'none';
        }
        document.dispatchEvent(new global.CustomEvent('editor:layerchange', { detail: { element: element, property: 'visible', value: hidden } }));
        render();
    }

    function toggleLock(element) {
        var locked = isLocked(element);
        if (locked) {
            delete element.dataset.editorLayerLocked;
            element.classList.remove('editor-layer-locked');
        } else {
            element.dataset.editorLayerLocked = 'true';
            element.classList.add('editor-layer-locked');
        }
        document.dispatchEvent(new global.CustomEvent('editor:layerchange', { detail: { element: element, property: 'locked', value: !locked } }));
        render();
    }

    function changeStack(element, direction) {
        var current = parseInt(global.getComputedStyle(element).zIndex, 10);
        if (!Number.isFinite(current)) current = 1;
        var next = Math.max(0, current + direction);
        element.style.zIndex = String(next);
        document.dispatchEvent(new global.CustomEvent('editor:layerchange', { detail: { element: element, property: 'zIndex', value: next } }));
        render();
    }

    function createAction(label, icon, action, pressed) {
        return '<button type="button" class="elp-action" data-layer-action="' + action + '" aria-label="' + label + '" title="' + label + '"' +
            (pressed !== undefined ? ' aria-pressed="' + String(pressed) + '"' : '') + '><i class="fas ' + icon + '"></i></button>';
    }

    function render() {
        if (!list) return;
        var layers = discoverLayers();

        if (!layers.length) {
            list.innerHTML = '<p class="elp-empty">' + (isAr ? 'لم يتم اكتشاف عناصر قابلة للتحرير بعد.' : 'No editable layers detected yet.') + '</p>';
            return;
        }

        list.innerHTML = layers.map(function (layer, index) {
            var element = layer.element;
            var hidden = isHidden(element);
            var locked = isLocked(element);
            var active = selectedElement === element || element.classList.contains('editor-selected-element');
            var label = layer.label + (layer.suffix ? ' ' + layer.suffix : '');
            return '<div class="elp-row' + (active ? ' is-active' : '') + (hidden ? ' is-hidden' : '') + '" data-layer-index="' + index + '">' +
                '<button type="button" class="elp-select" data-layer-action="select"><i class="fas ' + layer.icon + '"></i><span>' + label + '</span><small>' + (element.id || element.tagName.toLowerCase()) + '</small></button>' +
                '<div class="elp-actions">' +
                    createAction(hidden ? (isAr ? 'إظهار' : 'Show') : (isAr ? 'إخفاء' : 'Hide'), hidden ? 'fa-eye-slash' : 'fa-eye', 'visibility', !hidden) +
                    createAction(locked ? (isAr ? 'فتح القفل' : 'Unlock') : (isAr ? 'قفل' : 'Lock'), locked ? 'fa-lock' : 'fa-lock-open', 'lock', locked) +
                    createAction(isAr ? 'تقديم' : 'Bring forward', 'fa-chevron-up', 'forward') +
                    createAction(isAr ? 'تأخير' : 'Send backward', 'fa-chevron-down', 'backward') +
                '</div>' +
            '</div>';
        }).join('');
    }

    function handleAction(event) {
        var actionButton = event.target.closest('[data-layer-action]');
        var row = event.target.closest('[data-layer-index]');
        if (!actionButton || !row) return;
        var layer = layerElements[Number(row.dataset.layerIndex)];
        if (!layer) return;
        var element = layer.element;

        switch (actionButton.dataset.layerAction) {
            case 'select': selectLayer(element); break;
            case 'visibility': toggleVisibility(element); break;
            case 'lock': toggleLock(element); break;
            case 'forward': changeStack(element, 1); break;
            case 'backward': changeStack(element, -1); break;
        }
    }

    function buildPanel() {
        var inspector = document.getElementById('editor-context-inspector');
        if (!inspector || document.getElementById('editor-layers-panel')) return false;

        panel = document.createElement('section');
        panel.id = 'editor-layers-panel';
        panel.className = 'editor-layers-panel';
        panel.innerHTML =
            '<div class="elp-header"><div><span>' + (isAr ? 'ترتيب التصميم' : 'Design structure') + '</span><h3>' + (isAr ? 'الطبقات' : 'Layers') + '</h3></div>' +
            '<button type="button" id="elp-refresh" class="elp-refresh" aria-label="' + (isAr ? 'تحديث الطبقات' : 'Refresh layers') + '"><i class="fas fa-rotate"></i></button></div>' +
            '<div id="elp-list" class="elp-list"></div>';
        inspector.appendChild(panel);
        list = panel.querySelector('#elp-list');
        panel.addEventListener('click', handleAction);
        panel.querySelector('#elp-refresh').addEventListener('click', render);
        injectStyles();
        render();
        return true;
    }

    function injectStyles() {
        if (document.getElementById('editor-layers-panel-css')) return;
        var style = document.createElement('style');
        style.id = 'editor-layers-panel-css';
        style.textContent = [
            '.editor-layers-panel{margin-top:20px;padding-top:16px;border-top:1px solid rgba(255,255,255,.08)}',
            '.elp-header{display:flex;align-items:center;justify-content:space-between;margin-bottom:10px}.elp-header span{display:block;font-size:.66rem;color:var(--text-secondary)}.elp-header h3{font-size:.92rem;margin:2px 0 0}.elp-refresh,.elp-action{border:1px solid rgba(255,255,255,.09);background:rgba(255,255,255,.04);color:var(--text-secondary);border-radius:8px;cursor:pointer}.elp-refresh{width:30px;height:30px}.elp-refresh:hover,.elp-action:hover{color:var(--accent-primary,#4da6ff);background:rgba(77,166,255,.1)}',
            '.elp-list{display:flex;flex-direction:column;gap:6px}.elp-row{border:1px solid rgba(255,255,255,.07);border-radius:10px;background:rgba(255,255,255,.025);overflow:hidden}.elp-row.is-active{border-color:rgba(77,166,255,.55);background:rgba(77,166,255,.08)}.elp-row.is-hidden{opacity:.58}',
            '.elp-select{width:100%;display:grid;grid-template-columns:18px minmax(0,1fr);gap:2px 8px;align-items:center;text-align:start;border:0;background:transparent;color:var(--text-primary);padding:9px 10px;font-family:inherit;cursor:pointer}.elp-select i{grid-row:1/3;color:var(--accent-primary,#4da6ff)}.elp-select span{font-size:.76rem;font-weight:700;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.elp-select small{font-size:.61rem;color:var(--text-secondary);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}',
            '.elp-actions{display:grid;grid-template-columns:repeat(4,1fr);gap:4px;padding:0 7px 7px}.elp-action{height:26px}.elp-action[aria-pressed="true"]{color:var(--accent-primary,#4da6ff);background:rgba(77,166,255,.12)}.elp-empty{font-size:.72rem;line-height:1.6;color:var(--text-secondary);text-align:center;padding:12px}',
            '.editor-layer-locked{cursor:not-allowed!important}.editor-layer-locked *{pointer-events:none!important}',
            '@media(max-width:1024px){.editor-layers-panel{display:none}}'
        ].join('');
        document.head.appendChild(style);
    }

    function init() {
        if (!buildPanel()) {
            global.setTimeout(init, 250);
            return;
        }
        document.addEventListener('editor:selectionchange', function (event) {
            selectedElement = event.detail && event.detail.element ? event.detail.element : null;
            render();
        });
        var observer = new MutationObserver(function (mutations) {
            if (mutations.some(function (mutation) { return mutation.type === 'childList'; })) {
                global.clearTimeout(observer.refreshTimer);
                observer.refreshTimer = global.setTimeout(render, 150);
            }
        });
        document.querySelectorAll('.card-face, .business-card, .card-front, .card-back, #card-front, #card-back').forEach(function (card) {
            observer.observe(card, { childList: true, subtree: true });
        });
    }

    global.EditorLayersPanel = {
        refresh: render,
        getLayers: function () { return layerElements.slice(); },
        select: selectLayer
    };

    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true });
    else init();
}(typeof window !== 'undefined' ? window : globalThis));
