/**
 * MC PRIME NFC — Editor Design System Adapter v1.1
 * Applies shared design-system classes to legacy and dynamically-created UI.
 */
(function (global) {
    'use strict';

    var document = global.document;
    if (!document || global.EditorDesignSystem) return;

    var observer = null;
    var rules = [
        { selector: '.editor-context-inspector, .editor-layers-panel, .tb-settings-panel, .eob-shell, .esm-bar, .epg-dialog, .editor-brand-kit', classes: ['ed-panel'] },
        { selector: 'button:not(.card-face button):not(.business-card button):not(.card-front button):not(.card-back button)', classes: ['ed-btn'] },
        { selector: '.eci-primary, .eob-primary, .epg-primary, #ebk-save', classes: ['ed-btn--primary'] },
        { selector: '.tbs-danger-btn, .epg-item.is-error', classes: ['ed-btn--danger'] },
        { selector: 'input:not([type="checkbox"]):not([type="radio"]), select, textarea', classes: ['ed-control'] },
        { selector: 'fieldset, .eci-section, .tbs-section, .editor-brand-kit', classes: ['ed-section'] }
    ];

    function addClasses(element, classes) {
        if (!element || !element.classList) return;
        classes.forEach(function (className) { element.classList.add(className); });
    }

    function applyRule(root, rule) {
        if (root.nodeType !== 1 && root.nodeType !== 9 && root.nodeType !== 11) return;
        if (root.matches && root.matches(rule.selector)) addClasses(root, rule.classes);
        if (root.querySelectorAll) {
            root.querySelectorAll(rule.selector).forEach(function (element) {
                addClasses(element, rule.classes);
            });
        }
    }

    function enhance(root) {
        root = root || document;
        rules.forEach(function (rule) { applyRule(root, rule); });
        if (document.documentElement) document.documentElement.classList.add('editor-ui-v2');
        document.dispatchEvent(new global.CustomEvent('editor:designsystemapplied', { detail: { root: root } }));
        return root;
    }

    function ensureStylesheet() {
        if (document.querySelector('link[data-editor-design-system]')) return;
        var link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = 'editor-design-system.css?v=1.0';
        link.setAttribute('data-editor-design-system', 'true');
        document.head.appendChild(link);
    }

    function loadScript(src, marker) {
        if (document.querySelector('script[' + marker + ']')) return;
        var script = document.createElement('script');
        script.src = src;
        script.defer = true;
        script.setAttribute(marker, 'true');
        document.head.appendChild(script);
    }

    function observe() {
        if (observer || typeof global.MutationObserver !== 'function') return;
        observer = new global.MutationObserver(function (mutations) {
            mutations.forEach(function (mutation) {
                mutation.addedNodes.forEach(function (node) {
                    if (node.nodeType === 1) enhance(node);
                });
            });
        });
        observer.observe(document.body, { childList: true, subtree: true });
    }

    function getToken(name) {
        return global.getComputedStyle(document.documentElement).getPropertyValue(name).trim();
    }

    function init() {
        ensureStylesheet();
        enhance(document);
        observe();
        if (!global.EditorBrandKit) loadScript('editor-brand-kit.js?v=1.0', 'data-editor-brand-kit-loader');
    }

    global.EditorDesignSystem = {
        enhance: enhance,
        getToken: getToken,
        rules: rules.slice(),
        disconnect: function () {
            if (observer) observer.disconnect();
            observer = null;
        }
    };

    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true });
    else init();
}(typeof window !== 'undefined' ? window : globalThis));
