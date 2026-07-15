/**
 * MC PRIME NFC — Smart Snap v1.0
 * Shows alignment guides and snaps dragged elements to card/peer anchors.
 */
(function (global) {
    'use strict';

    var document = global.document;
    if (!document || global.EditorSmartSnap) return;

    var threshold = 6;
    var activeElement = null;
    var card = null;
    var verticalGuide = null;
    var horizontalGuide = null;
    var frameRequested = false;

    function getCard(element) {
        return element && element.closest('.card-face, .business-card, .card-front, .card-back, #card-front, #card-back');
    }

    function getSelectable(target) {
        if (!target || !target.closest) return null;
        var element = target.closest('.draggable, .editable-element, .card-element, [data-element-type], .editor-selected-element');
        if (!element || !getCard(element) || element.dataset.editorLayerLocked === 'true') return null;
        return element;
    }

    function ensureGuides(targetCard) {
        if (verticalGuide && horizontalGuide && verticalGuide.parentElement === targetCard) return;
        removeGuides();
        verticalGuide = document.createElement('div');
        horizontalGuide = document.createElement('div');
        verticalGuide.className = 'editor-snap-guide editor-snap-guide-v';
        horizontalGuide.className = 'editor-snap-guide editor-snap-guide-h';
        verticalGuide.setAttribute('aria-hidden', 'true');
        horizontalGuide.setAttribute('aria-hidden', 'true');
        targetCard.appendChild(verticalGuide);
        targetCard.appendChild(horizontalGuide);
    }

    function removeGuides() {
        if (verticalGuide) verticalGuide.remove();
        if (horizontalGuide) horizontalGuide.remove();
        verticalGuide = null;
        horizontalGuide = null;
    }

    function anchors(rect, originRect) {
        return {
            left: rect.left - originRect.left,
            centerX: rect.left - originRect.left + rect.width / 2,
            right: rect.right - originRect.left,
            top: rect.top - originRect.top,
            centerY: rect.top - originRect.top + rect.height / 2,
            bottom: rect.bottom - originRect.top
        };
    }

    function peerAnchors(targetCard, element, cardRect) {
        var xs = [0, cardRect.width / 2, cardRect.width];
        var ys = [0, cardRect.height / 2, cardRect.height];
        targetCard.querySelectorAll('.draggable, .editable-element, .card-element, [data-element-type]').forEach(function (peer) {
            if (peer === element || global.getComputedStyle(peer).display === 'none') return;
            var a = anchors(peer.getBoundingClientRect(), cardRect);
            xs.push(a.left, a.centerX, a.right);
            ys.push(a.top, a.centerY, a.bottom);
        });
        return { xs: xs, ys: ys };
    }

    function nearest(value, candidates) {
        var best = null;
        candidates.forEach(function (candidate) {
            var distance = Math.abs(candidate - value);
            if (distance <= threshold && (!best || distance < best.distance)) {
                best = { value: candidate, distance: distance };
            }
        });
        return best;
    }

    function resolveSnap(element) {
        var targetCard = getCard(element);
        if (!targetCard) return null;
        var cardRect = targetCard.getBoundingClientRect();
        var elementRect = element.getBoundingClientRect();
        var current = anchors(elementRect, cardRect);
        var peers = peerAnchors(targetCard, element, cardRect);

        var xMatches = [
            { edge: 'left', match: nearest(current.left, peers.xs) },
            { edge: 'centerX', match: nearest(current.centerX, peers.xs) },
            { edge: 'right', match: nearest(current.right, peers.xs) }
        ].filter(function (entry) { return entry.match; }).sort(function (a, b) { return a.match.distance - b.match.distance; });

        var yMatches = [
            { edge: 'top', match: nearest(current.top, peers.ys) },
            { edge: 'centerY', match: nearest(current.centerY, peers.ys) },
            { edge: 'bottom', match: nearest(current.bottom, peers.ys) }
        ].filter(function (entry) { return entry.match; }).sort(function (a, b) { return a.match.distance - b.match.distance; });

        var x = xMatches[0] || null;
        var y = yMatches[0] || null;
        var nextLeft = current.left;
        var nextTop = current.top;

        if (x) {
            if (x.edge === 'centerX') nextLeft = x.match.value - elementRect.width / 2;
            else if (x.edge === 'right') nextLeft = x.match.value - elementRect.width;
            else nextLeft = x.match.value;
        }
        if (y) {
            if (y.edge === 'centerY') nextTop = y.match.value - elementRect.height / 2;
            else if (y.edge === 'bottom') nextTop = y.match.value - elementRect.height;
            else nextTop = y.match.value;
        }

        return {
            card: targetCard,
            left: nextLeft,
            top: nextTop,
            guideX: x ? x.match.value : null,
            guideY: y ? y.match.value : null,
            snappedX: Boolean(x),
            snappedY: Boolean(y)
        };
    }

    function applyResolved(element, result, commitPosition) {
        if (!result) return;
        ensureGuides(result.card);
        verticalGuide.classList.toggle('is-visible', result.snappedX);
        horizontalGuide.classList.toggle('is-visible', result.snappedY);
        if (result.snappedX) verticalGuide.style.left = result.guideX + 'px';
        if (result.snappedY) horizontalGuide.style.top = result.guideY + 'px';

        if (commitPosition) {
            element.style.left = Math.round(result.left) + 'px';
            element.style.top = Math.round(result.top) + 'px';
            document.dispatchEvent(new global.CustomEvent('editor:snap', {
                detail: { element: element, left: result.left, top: result.top, x: result.snappedX, y: result.snappedY }
            }));
        }
    }

    function preview() {
        frameRequested = false;
        if (!activeElement) return;
        applyResolved(activeElement, resolveSnap(activeElement), false);
    }

    function requestPreview() {
        if (frameRequested) return;
        frameRequested = true;
        global.requestAnimationFrame(preview);
    }

    function start(element) {
        activeElement = element;
        card = getCard(element);
        if (card) ensureGuides(card);
    }

    function finish() {
        if (activeElement) applyResolved(activeElement, resolveSnap(activeElement), true);
        activeElement = null;
        card = null;
        removeGuides();
    }

    function cancel() {
        activeElement = null;
        card = null;
        removeGuides();
    }

    function injectStyles() {
        if (document.getElementById('editor-smart-snap-css')) return;
        var style = document.createElement('style');
        style.id = 'editor-smart-snap-css';
        style.textContent = [
            '.card-face,.business-card,.card-front,.card-back,#card-front,#card-back{--editor-guide-color:#ff4db8}',
            '.editor-snap-guide{position:absolute;z-index:9998;pointer-events:none;opacity:0;background:var(--editor-guide-color);box-shadow:0 0 0 1px rgba(255,255,255,.35);transition:opacity .08s ease}',
            '.editor-snap-guide.is-visible{opacity:1}.editor-snap-guide-v{top:0;bottom:0;width:1px}.editor-snap-guide-h{left:0;right:0;height:1px}',
            '@media(prefers-reduced-motion:reduce){.editor-snap-guide{transition:none}}'
        ].join('');
        document.head.appendChild(style);
    }

    function init() {
        injectStyles();
        document.addEventListener('pointerdown', function (event) {
            var element = getSelectable(event.target);
            if (element) start(element);
        }, true);
        document.addEventListener('pointermove', function () {
            if (activeElement) requestPreview();
        }, true);
        document.addEventListener('pointerup', finish, true);
        document.addEventListener('pointercancel', cancel, true);

        // Compatibility hooks for interact.js/custom drag implementations.
        document.addEventListener('editor:dragstart', function (event) {
            if (event.detail && event.detail.element) start(event.detail.element);
        });
        document.addEventListener('editor:dragmove', requestPreview);
        document.addEventListener('editor:dragend', finish);
    }

    global.EditorSmartSnap = {
        resolve: resolveSnap,
        apply: function (element) { applyResolved(element, resolveSnap(element), true); },
        start: start,
        preview: preview,
        finish: finish,
        setThreshold: function (value) { threshold = Math.max(1, Number(value) || 6); }
    };

    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true });
    else init();
}(typeof window !== 'undefined' ? window : globalThis));
