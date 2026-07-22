/**
 * MC PRIME NFC — Multi Select v1.0
 * Ctrl/Cmd/Shift multi-selection with safe group alignment and distribution.
 */
(function (global) {
    'use strict';

    var document = global.document;
    if (!document || global.EditorMultiSelect) return;

    var selected = [];
    var isAr = document.documentElement.lang !== 'en';

    function isSelectable(element) {
        if (!element || element.dataset.editorLayerLocked === 'true') return false;
        return !!element.closest('.card-face, .business-card, .card-front, .card-back, #card-front, #card-back');
    }

    function normalize(element) {
        if (!element || !element.closest) return null;
        return element.closest('.draggable, .editable-element, .card-element, [data-element-type], [id]');
    }

    function emit() {
        document.dispatchEvent(new global.CustomEvent('editor:multiselectionchange', { detail: { elements: selected.slice() } }));
        syncToolbar();
    }

    function render() {
        document.querySelectorAll('.editor-multi-selected').forEach(function (element) {
            element.classList.remove('editor-multi-selected');
        });
        selected.forEach(function (element) { element.classList.add('editor-multi-selected'); });
    }

    function set(elements) {
        selected = Array.from(new Set((elements || []).map(normalize).filter(isSelectable)));
        render();
        emit();
        return selected.slice();
    }

    function toggle(element) {
        element = normalize(element);
        if (!isSelectable(element)) return selected.slice();
        var index = selected.indexOf(element);
        if (index >= 0) selected.splice(index, 1);
        else selected.push(element);
        render();
        emit();
        return selected.slice();
    }

    function clear() {
        selected = [];
        render();
        emit();
    }

    function rectFor(element) {
        return element.getBoundingClientRect();
    }

    function getCard() {
        return selected[0] && selected[0].closest('.card-face, .business-card, .card-front, .card-back, #card-front, #card-back');
    }

    function position(element, left, top) {
        if (global.getComputedStyle(element).position === 'static') element.style.position = 'absolute';
        if (left !== null) element.style.left = Math.round(left) + 'px';
        if (top !== null) element.style.top = Math.round(top) + 'px';
        element.style.right = 'auto';
        element.style.bottom = 'auto';
        element.dispatchEvent(new global.Event('input', { bubbles: true }));
    }

    function align(mode) {
        if (selected.length < 2) return false;
        var card = getCard();
        if (!card) return false;
        var cardRect = card.getBoundingClientRect();
        var rects = selected.map(rectFor);
        var minLeft = Math.min.apply(null, rects.map(function (r) { return r.left; }));
        var maxRight = Math.max.apply(null, rects.map(function (r) { return r.right; }));
        var minTop = Math.min.apply(null, rects.map(function (r) { return r.top; }));
        var maxBottom = Math.max.apply(null, rects.map(function (r) { return r.bottom; }));
        var centerX = (minLeft + maxRight) / 2;
        var centerY = (minTop + maxBottom) / 2;

        selected.forEach(function (element, index) {
            var rect = rects[index];
            var left = rect.left - cardRect.left;
            var top = rect.top - cardRect.top;
            if (mode === 'left') left = minLeft - cardRect.left;
            if (mode === 'center-x') left = centerX - cardRect.left - rect.width / 2;
            if (mode === 'right') left = maxRight - cardRect.left - rect.width;
            if (mode === 'top') top = minTop - cardRect.top;
            if (mode === 'center-y') top = centerY - cardRect.top - rect.height / 2;
            if (mode === 'bottom') top = maxBottom - cardRect.top - rect.height;
            position(element, left, top);
        });
        emitAction('align', mode);
        return true;
    }

    function distribute(axis) {
        if (selected.length < 3) return false;
        var card = getCard();
        var cardRect = card.getBoundingClientRect();
        var items = selected.map(function (element) { return { element: element, rect: rectFor(element) }; });
        items.sort(function (a, b) { return axis === 'x' ? a.rect.left - b.rect.left : a.rect.top - b.rect.top; });
        var first = items[0].rect;
        var last = items[items.length - 1].rect;
        var totalSize = items.reduce(function (sum, item) { return sum + (axis === 'x' ? item.rect.width : item.rect.height); }, 0);
        var span = axis === 'x' ? last.right - first.left : last.bottom - first.top;
        var gap = (span - totalSize) / (items.length - 1);
        var cursor = axis === 'x' ? first.left : first.top;

        items.forEach(function (item) {
            var left = item.rect.left - cardRect.left;
            var top = item.rect.top - cardRect.top;
            if (axis === 'x') left = cursor - cardRect.left;
            else top = cursor - cardRect.top;
            position(item.element, left, top);
            cursor += (axis === 'x' ? item.rect.width : item.rect.height) + gap;
        });
        emitAction('distribute', axis);
        return true;
    }

    function group() {
        if (selected.length < 2) return false;
        var groupId = 'group-' + Date.now();
        selected.forEach(function (element) { element.dataset.editorGroup = groupId; });
        emitAction('group', groupId);
        return groupId;
    }

    function ungroup() {
        var changed = false;
        selected.forEach(function (element) {
            if (element.dataset.editorGroup) {
                delete element.dataset.editorGroup;
                changed = true;
            }
        });
        if (changed) emitAction('ungroup', null);
        return changed;
    }

    function emitAction(action, value) {
        document.dispatchEvent(new global.CustomEvent('editor:multiaction', { detail: { action: action, value: value, elements: selected.slice() } }));
    }

    function buildToolbar() {
        var inspector = document.getElementById('editor-context-inspector');
        if (!inspector || document.getElementById('eci-multi-section')) return false;
        var section = document.createElement('section');
        section.id = 'eci-multi-section';
        section.className = 'eci-section eci-multi-section';
        section.innerHTML =
            '<div class="eci-multi-head"><span class="eci-label">' + (isAr ? 'التحديد المتعدد' : 'Multi select') + '</span><strong id="eci-multi-count">0</strong></div>' +
            '<div class="eci-multi-grid">' +
                button('align-left', 'fa-align-left', isAr ? 'محاذاة يسار' : 'Align left') +
                button('align-center-x', 'fa-arrows-left-right-to-line', isAr ? 'توسيط أفقي' : 'Center horizontally') +
                button('align-right', 'fa-align-right', isAr ? 'محاذاة يمين' : 'Align right') +
                button('align-top', 'fa-arrow-up', isAr ? 'محاذاة أعلى' : 'Align top') +
                button('align-center-y', 'fa-arrows-up-down-to-line', isAr ? 'توسيط رأسي' : 'Center vertically') +
                button('align-bottom', 'fa-arrow-down', isAr ? 'محاذاة أسفل' : 'Align bottom') +
                button('distribute-x', 'fa-grip-lines-vertical', isAr ? 'توزيع أفقي' : 'Distribute horizontally') +
                button('distribute-y', 'fa-grip-lines', isAr ? 'توزيع رأسي' : 'Distribute vertically') +
                button('group', 'fa-object-group', isAr ? 'تجميع' : 'Group') +
                button('ungroup', 'fa-object-ungroup', isAr ? 'فك التجميع' : 'Ungroup') +
            '</div>';
        var advanced = document.getElementById('eci-advanced');
        inspector.insertBefore(section, advanced || null);
        section.addEventListener('click', function (event) {
            var command = event.target.closest('[data-multi-command]');
            if (!command) return;
            var value = command.dataset.multiCommand;
            if (value.indexOf('align-') === 0) align(value.replace('align-', ''));
            if (value === 'distribute-x') distribute('x');
            if (value === 'distribute-y') distribute('y');
            if (value === 'group') group();
            if (value === 'ungroup') ungroup();
        });
        injectStyles();
        syncToolbar();
        return true;
    }

    function button(command, icon, title) {
        return '<button type="button" data-multi-command="' + command + '" title="' + title + '"><i class="fas ' + icon + '"></i></button>';
    }

    function syncToolbar() {
        var count = document.getElementById('eci-multi-count');
        var section = document.getElementById('eci-multi-section');
        if (count) count.textContent = String(selected.length);
        if (section) section.classList.toggle('is-disabled', selected.length < 2);
    }

    function injectStyles() {
        if (document.getElementById('editor-multi-select-css')) return;
        var style = document.createElement('style');
        style.id = 'editor-multi-select-css';
        style.textContent = [
            '.editor-multi-selected{outline:2px dashed #a855f7!important;outline-offset:4px!important}',
            '.eci-multi-head{display:flex;align-items:center;justify-content:space-between}.eci-multi-head strong{font-size:.72rem;background:rgba(168,85,247,.15);color:#a855f7;border-radius:999px;padding:3px 8px}',
            '.eci-multi-grid{display:grid;grid-template-columns:repeat(5,1fr);gap:6px;margin-top:9px}.eci-multi-grid button{height:32px;border:1px solid rgba(255,255,255,.09);background:rgba(255,255,255,.045);color:var(--text-primary);border-radius:8px;cursor:pointer}.eci-multi-grid button:hover{background:rgba(168,85,247,.15);border-color:rgba(168,85,247,.4)}',
            '.eci-multi-section.is-disabled .eci-multi-grid button{opacity:.45;pointer-events:none}'
        ].join('');
        document.head.appendChild(style);
    }

    function init() {
        if (!buildToolbar()) {
            global.setTimeout(init, 250);
            return;
        }
        document.addEventListener('click', function (event) {
            var element = normalize(event.target);
            if (!isSelectable(element)) return;
            if (event.ctrlKey || event.metaKey || event.shiftKey) {
                event.preventDefault();
                event.stopPropagation();
                toggle(element);
            } else if (!selected.includes(element)) {
                clear();
            }
        }, true);
        document.addEventListener('keydown', function (event) {
            if (event.key === 'Escape' && selected.length) clear();
        });
    }

    global.EditorMultiSelect = {
        set: set,
        toggle: toggle,
        clear: clear,
        getSelected: function () { return selected.slice(); },
        align: align,
        distribute: distribute,
        group: group,
        ungroup: ungroup
    };

    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true });
    else init();
}(typeof window !== 'undefined' ? window : globalThis));
