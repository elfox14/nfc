/**
 * MC PRIME NFC — Independent card element layout v1.3
 *
 * HARD RULE:
 * Every editable layer owns its own geometry. A layer may change size or
 * position without changing the layout position of any other layer on the
 * same face or on the opposite face.
 *
 * The legacy editor contains flex/flow CSS in several places. The previous
 * controller only converted direct children and could therefore leave some
 * layers participating in normal flow. This version converts every top-level
 * editable layer to absolute positioning and applies left/top with CSS
 * priority so legacy rules cannot reintroduce flex reflow.
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
        '[data-editor-created="true"]',
        '[data-independent-card-layer="true"]'
    ].join(',');

    var observer = null;
    var scheduled = false;
    var anonymousLayerSequence = 0;

    function finite(value, fallback) {
        var n = Number(value);
        return Number.isFinite(n) ? n : fallback;
    }

    function round(value) {
        return Math.round(value * 1000) / 1000;
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

    function isLayer(element) {
        return !!(element && element.matches && element.matches(SELECTOR));
    }

    function layerKey(element) {
        if (!element.id && !element.dataset.independentResizeKey) {
            anonymousLayerSequence += 1;
            element.dataset.independentResizeKey = 'layer-' + anonymousLayerSequence;
        }
        return element.id || element.dataset.independentResizeKey || null;
    }

    /**
     * Return only the outermost editable layers in a card face. This prevents
     * an inner icon/image from being treated as a second independent layer
     * when its draggable wrapper is the actual editable object.
     */
    function targets(container) {
        var all = Array.from(container.querySelectorAll(SELECTOR));
        return all.filter(function (element) {
            var parent = element.parentElement;
            while (parent && parent !== container) {
                if (isLayer(parent)) return false;
                parent = parent.parentElement;
            }
            return parent === container;
        });
    }

    function setImportantStyle(element, property, value) {
        element.style.setProperty(property, value, 'important');
    }

    function stabilizeContainer(container) {
        if (!container) return 0;

        var cardRect = rectOf(container);
        if (!cardRect || cardRect.width <= 0 || cardRect.height <= 0) return 0;

        var scale = scaleOf(container, cardRect);
        var sx = scale.x || 1;
        var sy = scale.y || 1;
        var entries = [];

        // IMPORTANT: measure all layers before changing any one layer to
        // absolute positioning. Otherwise the remaining flex/flow children
        // would reflow and we would capture the wrong coordinates.
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

            // These are intentionally !important. The editor has legacy
            // flex/position rules that can otherwise override this controller.
            setImportantStyle(element, 'position', 'absolute');
            setImportantStyle(element, 'left', round(entry.left) + 'px');
            setImportantStyle(element, 'top', round(entry.top) + 'px');
            setImportantStyle(element, 'right', 'auto');
            setImportantStyle(element, 'bottom', 'auto');
            setImportantStyle(element, 'margin', '0');
            setImportantStyle(element, 'flex', 'none');
            setImportantStyle(element, 'float', 'none');
            element.dataset.independentLayoutReady = 'true';
            layerKey(element);
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
            '.card-content-layer{position:relative!important;display:block!important}',
            '.card-content-layer > #card-logo,',
            '.card-content-layer > #card-personal-photo-wrapper,',
            '.card-content-layer > #card-name,',
            '.card-content-layer > #card-tagline,',
            '.card-content-layer > #qr-code-wrapper,',
            '.card-content-layer > .phone-button-draggable-wrapper,',
            '.card-content-layer > .draggable-social-link,',
            '.card-content-layer > .draggable-on-card,',
            '.card-content-layer > .editable-element,',
            '.card-content-layer > .card-element,',
            '.card-content-layer > [data-element-type],',
            '.card-content-layer > [data-editor-created="true"],',
            '.card-content-layer > [data-independent-card-layer="true"]{',
            'position:absolute!important;',
            'margin:0!important;',
            'flex:none!important;',
            'float:none!important;',
            '}',
            '#card-logo #card-logo-img,',
            '#card-logo .logo-front{',
            'transition-property:opacity,filter,background-color,border-color!important;',
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
        selector: SELECTOR,
        version: '1.3'
    };

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init, { once: true });
    } else {
        init();
    }
}(typeof window !== 'undefined' ? window : globalThis));
