/**
 * MC PRIME NFC — Independent card element layout v1.1
 *
 * Converts editable card layers from flow/flex positioning to independent
 * absolute positioning while preserving their current visual coordinates.
 * Every layer keeps its own position and size; resizing or moving one layer
 * cannot reflow its siblings.
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

    var observer = null;
    var scheduled = false;

    function finite(value, fallback) {
        var n = Number(value);
        return Number.isFinite(n) ? n : fallback;
    }

    function rectOf(element) {
        if (!element || typeof element.getBoundingClientRect !== 'function') return null;
        var r = element.getBoundingClientRect();
        var left = finite(r.left, 0);
        var top = finite(r.top, 0);
        var width = Math.max(0, finite(r.width, 0));
        var height = Math.max(0, finite(r.height, 0));
        return {
            left: left,
            top: top,
            width: width,
            height: height,
            right: finite(r.right, left + width),
            bottom: finite(r.bottom, top + height)
        };
    }

    function scaleOf(container, cardRect) {
        var width = finite(container && container.offsetWidth, 0);
        var height = finite(container && container.offsetHeight, 0);
        return {
            x: width > 0 && cardRect.width > 0 ? cardRect.width / width : 1,
            y: height > 0 && cardRect.height > 0 ? cardRect.height / height : 1
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

    function stabilizeContainer(container) {
        if (!container) return 0;

        var cardRect = rectOf(container);
        if (!cardRect || cardRect.width <= 0 || cardRect.height <= 0) return 0;

        var scale = scaleOf(container, cardRect);
        var sx = scale.x || 1;
        var sy = scale.y || 1;
        var entries = [];

        // IMPORTANT: measure every sibling before changing any one element to
        // absolute positioning. Otherwise removing one flex item can move the
        // remaining items and we would accidentally save the wrong coordinates.
        targets(container).forEach(function (element) {
            if (element.dataset.independentLayoutReady === 'true') return;
            var itemRect = rectOf(element);
            if (!itemRect || itemRect.width <= 0 || itemRect.height <= 0) return;

            var transform = localTransform(element);
            entries.push({
                element: element,
                left: (itemRect.left - cardRect.left) / sx - transform.x,
                top: (itemRect.top - cardRect.top) / sy - transform.y
            });
        });

        entries.forEach(function (entry) {
            var element = entry.element;
            element.style.position = 'absolute';
            element.style.left = round(entry.left) + 'px';
            element.style.top = round(entry.top) + 'px';
            element.style.right = 'auto';
            element.style.bottom = 'auto';
            element.style.margin = '0';
            element.style.flex = 'none';
            element.dataset.independentLayoutReady = 'true';
        });

        return entries.length;
    }

    function initialize() {
        var changed = 0;
        document.querySelectorAll('.card-content-layer').forEach(function (container) {
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
        if (observer || typeof global.MutationObserver !== 'function' || !document.body) return;
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
