/**
 * MC PRIME NFC — Independent card element layout v1.0
 *
 * Converts editable card layers from flow/flex positioning to independent
 * absolute positioning while preserving their current visual coordinates.
 * A layer may be resized or moved without reflowing its siblings.
 *
 * This controller deliberately works on each face independently. Rendering or
 * moving an element between front/back is therefore unable to move unrelated
 * elements on either face.
 */
(function (global) {
    'use strict';

    var document = global.document;
    if (!document || global.EditorIndependentLayout) return;

    var SELECTOR = [
        '#card-logo',
        '#card-personal-photo-wrapper',
        '#card-name',
        '#card-tagline',
        '#qr-code-wrapper',
        '.phone-button-draggable-wrapper',
        '.draggable-social-link',
        '.draggable-on-card',
        '.editable-element',
        '.card-element',
        '[data-element-type]',
        '[data-editor-created="true"]'
    ].join(',');

    var initialized = new WeakSet();
    var observer = null;
    var scheduled = false;

    function finite(value, fallback) {
        var n = Number(value);
        return Number.isFinite(n) ? n : fallback;
    }

    function rectOf(element) {
        if (!element || typeof element.getBoundingClientRect !== 'function') return null;
        var r = element.getBoundingClientRect();
        return {
            left: finite(r.left, 0),
            top: finite(r.top, 0),
            width: Math.max(0, finite(r.width, 0)),
            height: Math.max(0, finite(r.height, 0)),
            right: finite(r.right, finite(r.left, 0) + finite(r.width, 0)),
            bottom: finite(r.bottom, finite(r.top, 0) + finite(r.height, 0))
        };
    }

    function scaleOf(container) {
        var rect = rectOf(container);
        var width = finite(container && container.offsetWidth, 0);
        var height = finite(container && container.offsetHeight, 0);
        return {
            x: width > 0 && rect && rect.width > 0 ? rect.width / width : 1,
            y: height > 0 && rect && rect.height > 0 ? rect.height / height : 1
        };
    }

    function localTransform(element) {
        return {
            x: finite(element.getAttribute('data-x'), 0),
            y: finite(element.getAttribute('data-y'), 0)
        };
    }

    function round(value) {
        return Math.round(value * 1000) / 1000;
    }

    function targets(container) {
        return Array.from(container.children).filter(function (element) {
            return element.matches && element.matches(SELECTOR);
        });
    }

    function stabilize(container, element) {
        if (!element || !element.parentElement || element.parentElement !== container) return false;
        if (!element.matches(SELECTOR)) return false;

        var cardRect = rectOf(container);
        var itemRect = rectOf(element);
        if (!cardRect || !itemRect || cardRect.width <= 0 || cardRect.height <= 0) return false;

        var scale = scaleOf(container);
        var transform = localTransform(element);
        var sx = scale.x || 1;
        var sy = scale.y || 1;

        // Compute the element's untransformed anchor from its current visual
        // position. This preserves existing saved data-x/data-y exactly.
        var left = (itemRect.left - cardRect.left) / sx - transform.x;
        var top = (itemRect.top - cardRect.top) / sy - transform.y;

        if (!element.dataset.independentLayoutReady) {
            element.style.position = 'absolute';
            element.style.left = round(left) + 'px';
            element.style.top = round(top) + 'px';
            element.style.right = 'auto';
            element.style.bottom = 'auto';
            element.style.margin = '0';
            element.style.flex = 'none';
            element.dataset.independentLayoutReady = 'true';
            return true;
        }

        return false;
    }

    function stabilizeContainer(container) {
        if (!container) return 0;
        var changed = 0;
        targets(container).forEach(function (element) {
            if (stabilize(container, element)) changed += 1;
        });
        return changed;
    }

    function initialize() {
        var containers = document.querySelectorAll('.card-content-layer');
        var changed = 0;
        containers.forEach(function (container) {
            if (!initialized.has(container)) initialized.add(container);
            changed += stabilizeContainer(container);
        });
        return changed;
    }

    function schedule() {
        if (scheduled) return;
        scheduled = true;
        var run = function () {
            scheduled = false;
            initialize();
        };
        if (typeof global.requestAnimationFrame === 'function') {
            global.requestAnimationFrame(run);
        } else {
            global.setTimeout(run, 0);
        }
    }

    function installStyles() {
        if (document.getElementById('editor-independent-layout-css')) return;
        var style = document.createElement('style');
        style.id = 'editor-independent-layout-css';
        style.textContent = [
            '.card-content-layer{position:relative!important}',
            '.card-content-layer>#card-logo,',
            '.card-content-layer>#card-personal-photo-wrapper,',
            '.card-content-layer>#card-name,',
            '.card-content-layer>#card-tagline,',
            '.card-content-layer>#qr-code-wrapper,',
            '.card-content-layer>.phone-button-draggable-wrapper,',
            '.card-content-layer>.draggable-social-link,',
            '.card-content-layer>.draggable-on-card,',
            '.card-content-layer>.editable-element,',
            '.card-content-layer>.card-element,',
            '.card-content-layer>[data-element-type],',
            '.card-content-layer>[data-editor-created="true"]{',
            'position:absolute!important;right:auto!important;bottom:auto!important;',
            'margin:0!important;flex:none!important;',
            '}'
        ].join('');
        document.head.appendChild(style);
    }

    function installObserver() {
        if (observer || typeof global.MutationObserver !== 'function') return;
        observer = new global.MutationObserver(function (mutations) {
            var relevant = mutations.some(function (mutation) {
                if (mutation.type === 'childList') return true;
                if (mutation.type === 'attributes') {
                    return mutation.attributeName === 'style' ||
                        mutation.attributeName === 'class' ||
                        mutation.attributeName === 'data-x' ||
                        mutation.attributeName === 'data-y';
                }
                return false;
            });
            if (relevant) schedule();
        });
        observer.observe(document.body, {
            subtree: true,
            childList: true,
            attributes: true,
            attributeFilter: ['style', 'class', 'data-x', 'data-y']
        });
    }

    function init() {
        installStyles();
        initialize();
        installObserver();
    }

    global.EditorIndependentLayout = {
        initialize: initialize,
        stabilizeContainer: stabilizeContainer,
        selector: SELECTOR
    };

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init, { once: true });
    } else {
        init();
    }
}(typeof window !== 'undefined' ? window : globalThis));
