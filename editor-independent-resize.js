/**
 * MC PRIME NFC — Independent card layer resizing v1.2
 *
 * Keeps every card layer visually anchored while another layer changes size.
 * The legacy editor intentionally keeps the core layers in a flex layout, so
 * changing a width, font size or padding would otherwise reflow its siblings.
 */
(function (global) {
    'use strict';

    var document = global.document;
    if (!document || global.EditorIndependentResize) return;

    var pendingSnapshots = new WeakMap();
    var anonymousLayerSequence = 0;
    var LAYER_SELECTOR = [
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

    function number(value) {
        var parsed = parseFloat(value);
        return Number.isFinite(parsed) ? parsed : 0;
    }

    function rounded(value) {
        var result = Math.round(value * 1000) / 1000;
        return Math.abs(result) < 0.001 ? 0 : result;
    }

    function rectValue(rect, name, fallback) {
        var value = Number(rect && rect[name]);
        return Number.isFinite(value) ? value : fallback;
    }

    function normalizeRect(rect) {
        var left = rectValue(rect, 'left', 0);
        var top = rectValue(rect, 'top', 0);
        var width = rectValue(rect, 'width', 0);
        var height = rectValue(rect, 'height', 0);
        return {
            left: left,
            top: top,
            width: width,
            height: height,
            right: rectValue(rect, 'right', left + width),
            bottom: rectValue(rect, 'bottom', top + height)
        };
    }

    function layerKey(element) {
        var parent = element.closest('.card-content-layer');
        if (!parent) return null;
        if (!element.id && !element.dataset.independentResizeKey) {
            anonymousLayerSequence += 1;
            element.dataset.independentResizeKey = 'layer-' + anonymousLayerSequence;
        }
        var identity = element.id || element.dataset.independentResizeKey;
        return identity ? (parent.id || 'card-content') + '::' + identity : null;
    }

    function collectLayers() {
        return Array.from(document.querySelectorAll('.card-content-layer'))
            .flatMap(function (container) {
                return Array.from(container.children).filter(function (element) {
                    return element.matches(LAYER_SELECTOR);
                });
            });
    }

    function readLayer(element) {
        var key = layerKey(element);
        if (!key || typeof element.getBoundingClientRect !== 'function') return null;
        var rect = normalizeRect(element.getBoundingClientRect());
        if (rect.width <= 0 || rect.height <= 0) return null;
        return {
            key: key,
            id: element.id || element.dataset.independentResizeKey,
            parentId: element.parentElement && element.parentElement.id,
            rect: rect
        };
    }

    function capture() {
        var layers = new Map();
        collectLayers().forEach(function (element) {
            var measurement = readLayer(element);
            if (measurement) layers.set(measurement.key, measurement);
        });
        return layers;
    }

    function viewportScale(element) {
        var container = element.closest('.card-content-layer');
        if (!container || typeof container.getBoundingClientRect !== 'function') {
            return { x: 1, y: 1 };
        }
        var rect = normalizeRect(container.getBoundingClientRect());
        var width = Number(container.offsetWidth);
        var height = Number(container.offsetHeight);
        return {
            x: width > 0 && rect.width > 0 ? rect.width / width : 1,
            y: height > 0 && rect.height > 0 ? rect.height / height : 1
        };
    }

    function translate(element, deltaX, deltaY) {
        if (Math.abs(deltaX) < 0.05 && Math.abs(deltaY) < 0.05) return false;
        var scale = viewportScale(element);
        var x = rounded(number(element.getAttribute('data-x')) + deltaX / (scale.x || 1));
        var y = rounded(number(element.getAttribute('data-y')) + deltaY / (scale.y || 1));
        element.style.transform = 'translate(' + x + 'px, ' + y + 'px)';
        element.setAttribute('data-x', String(x));
        element.setAttribute('data-y', String(y));
        return true;
    }

    function keepInsideCard(element) {
        var container = element.closest('.card-content-layer');
        if (!container) return false;

        var cardRect = normalizeRect(container.getBoundingClientRect());
        var itemRect = normalizeRect(element.getBoundingClientRect());
        if (cardRect.width <= 0 || cardRect.height <= 0) return false;

        var deltaX = 0;
        var deltaY = 0;

        if (itemRect.width > cardRect.width) {
            deltaX = (cardRect.left + cardRect.width / 2) - (itemRect.left + itemRect.width / 2);
        } else if (itemRect.left < cardRect.left) {
            deltaX = cardRect.left - itemRect.left;
        } else if (itemRect.right > cardRect.right) {
            deltaX = cardRect.right - itemRect.right;
        }

        if (itemRect.height > cardRect.height) {
            deltaY = (cardRect.top + cardRect.height / 2) - (itemRect.top + itemRect.height / 2);
        } else if (itemRect.top < cardRect.top) {
            deltaY = cardRect.top - itemRect.top;
        } else if (itemRect.bottom > cardRect.bottom) {
            deltaY = cardRect.bottom - itemRect.bottom;
        }

        return translate(element, deltaX, deltaY);
    }

    function reconcile(snapshot, options) {
        if (!(snapshot instanceof Map) || snapshot.size === 0) {
            return { adjusted: [], resized: [] };
        }

        options = options || {};
        var current = new Map();
        collectLayers().forEach(function (element) {
            var key = layerKey(element);
            if (key) current.set(key, element);
        });

        var adjusted = [];
        var resized = [];

        snapshot.forEach(function (before, key) {
            var element = current.get(key);
            if (!element) return;

            var after = normalizeRect(element.getBoundingClientRect());
            if (after.width <= 0 || after.height <= 0) return;

            var sizeChanged = Math.abs(before.rect.width - after.width) > 0.5 ||
                Math.abs(before.rect.height - after.height) > 0.5;
            var deltaX;
            var deltaY;

            if (sizeChanged) {
                deltaX = (before.rect.left + before.rect.width / 2) - (after.left + after.width / 2);
                deltaY = (before.rect.top + before.rect.height / 2) - (after.top + after.height / 2);
                resized.push(element.id);
            } else {
                deltaX = before.rect.left - after.left;
                deltaY = before.rect.top - after.top;
            }

            var moved = translate(element, deltaX, deltaY);
            if (sizeChanged && options.keepInside !== false) {
                moved = keepInsideCard(element) || moved;
            }
            if (moved) adjusted.push(element.id);
        });

        if (resized.length || adjusted.length) {
            document.dispatchEvent(new global.CustomEvent('editor:independentresize', {
                detail: { adjusted: adjusted.slice(), resized: resized.slice() }
            }));
            document.dispatchEvent(new global.CustomEvent('editor:commandmutation', {
                detail: { action: 'independent-resize', adjusted: adjusted.slice(), resized: resized.slice() }
            }));
        }

        return { adjusted: adjusted, resized: resized };
    }

    function isFormControl(element) {
        return element && element.matches && element.matches('input, select, textarea');
    }

    function scheduleReconcile(event) {
        if (!event.isTrusted || !isFormControl(event.target)) return;
        var snapshot = capture();
        if (!snapshot.size) return;

        pendingSnapshots.set(event, snapshot);
        var defer = global.queueMicrotask || function (callback) {
            global.Promise.resolve().then(callback);
        };
        defer(function () {
            var pending = pendingSnapshots.get(event);
            pendingSnapshots.delete(event);
            if (pending) reconcile(pending);
        });
    }

    function injectStyles() {
        if (document.getElementById('editor-independent-resize-css')) return;
        var style = document.createElement('style');
        style.id = 'editor-independent-resize-css';
        style.textContent = [
            '.card-content-layer>#card-name,.card-content-layer>#card-tagline,.card-content-layer>#qr-code-wrapper,',
            '.card-content-layer>#card-logo,.card-content-layer>#card-personal-photo-wrapper{',
            'transition-property:opacity,box-shadow,filter,color,background-color,border-color!important}',
            '.card-content-layer>#card-logo #card-logo-img,.card-content-layer>#card-logo .logo-front{',
            'transition-property:opacity,filter,background-color,border-color!important}',
            '.card-content-layer>.phone-button-draggable-wrapper .phone-button,',
            '.card-content-layer>.draggable-social-link a{',
            'transition-property:transform,opacity,box-shadow,filter,color,background-color,border-color!important}'
        ].join('');
        document.head.appendChild(style);
    }

    function init() {
        injectStyles();
        document.addEventListener('input', scheduleReconcile, true);
        document.addEventListener('change', scheduleReconcile, true);
    }

    global.EditorIndependentResize = {
        capture: capture,
        reconcile: reconcile,
        collectLayers: collectLayers,
        viewportScale: viewportScale
    };

    init();
}(typeof window !== 'undefined' ? window : globalThis));
