/**
 * MC PRIME NFC — Command Surface v1.1
 * Keyboard shortcuts and contextual menu backed by the shared editor state.
 */
(function (global) {
    'use strict';

    var document = global.document;
    if (!document || global.EditorCommandSurface) return;
    var isAr = document.documentElement.lang !== 'en';
    var clipboard = [];
    var menu = null;

    function selected() {
        if (global.EditorMultiSelect && global.EditorMultiSelect.getSelected) {
            var many = global.EditorMultiSelect.getSelected();
            if (many && many.length) return many;
        }
        var single = global.EditorContextInspector && global.EditorContextInspector.getSelected ? global.EditorContextInspector.getSelected() : null;
        return single ? [single] : [];
    }

    function canEdit(element) {
        return element && element.dataset.editorLayerLocked !== 'true' && element.dataset.editorLocked !== 'true';
    }

    function markCreated(element) {
        element.dataset.editorCreated = 'true';
        element.dataset.editorHistoryKey = 'editor-node-' + Date.now() + '-' + Math.random().toString(36).slice(2, 8);
        return element;
    }

    function cloneElement(element, offset) {
        var clone = markCreated(element.cloneNode(true));
        if (clone.id) clone.id = clone.id + '-copy-' + Date.now() + '-' + Math.floor(Math.random() * 1000);
        clone.querySelectorAll('[id]').forEach(function (node) { node.id = node.id + '-copy-' + Math.floor(Math.random() * 100000); });
        clone.classList.remove('editor-selected-element', 'editor-multi-selected');
        clone.style.position = global.getComputedStyle(element).position === 'static' ? 'absolute' : global.getComputedStyle(element).position;
        clone.style.left = (parseFloat(element.style.left || 0) + offset) + 'px';
        clone.style.top = (parseFloat(element.style.top || 0) + offset) + 'px';
        element.parentNode.insertBefore(clone, element.nextSibling);
        return clone;
    }

    function copySelection() {
        clipboard = selected().map(function (element) { return element.cloneNode(true); });
        return clipboard.length > 0;
    }

    function pasteSelection() {
        var anchor = selected()[0];
        if (!anchor || !clipboard.length) return false;
        var parent = anchor.parentNode;
        var pasted = clipboard.map(function (template, index) {
            var clone = markCreated(template.cloneNode(true));
            if (clone.id) clone.id = clone.id + '-paste-' + Date.now() + '-' + index;
            clone.querySelectorAll('[id]').forEach(function (node, nodeIndex) { node.id = node.id + '-paste-' + Date.now() + '-' + nodeIndex; });
            clone.classList.remove('editor-selected-element', 'editor-multi-selected');
            clone.style.left = (parseFloat(template.style.left || 0) + 12) + 'px';
            clone.style.top = (parseFloat(template.style.top || 0) + 12) + 'px';
            parent.appendChild(clone);
            return clone;
        });
        if (global.EditorMultiSelect && global.EditorMultiSelect.set) global.EditorMultiSelect.set(pasted);
        else if (global.EditorContextInspector && pasted[0]) global.EditorContextInspector.select(pasted[0]);
        refreshLayers();
        return true;
    }

    function duplicateSelection() {
        var elements = selected().filter(canEdit);
        if (!elements.length) return false;
        var clones = elements.map(function (element) { return cloneElement(element, 12); });
        if (global.EditorMultiSelect && global.EditorMultiSelect.set) global.EditorMultiSelect.set(clones);
        else if (global.EditorContextInspector && clones[0]) global.EditorContextInspector.select(clones[0]);
        refreshLayers();
        return true;
    }

    function deleteSelection() {
        var elements = selected().filter(canEdit);
        if (!elements.length) return false;
        elements.forEach(function (element) {
            if (element.dataset.editorCreated === 'true') element.remove();
            else {
                element.dataset.editorDeleted = 'true';
                element.dataset.editorDeletedDisplay = element.style.display || '';
                element.style.display = 'none';
            }
        });
        if (global.EditorMultiSelect && global.EditorMultiSelect.clear) global.EditorMultiSelect.clear();
        refreshLayers();
        return true;
    }

    function toggleLock() {
        var elements = selected();
        if (!elements.length) return false;
        var shouldLock = elements.some(function (element) { return element.dataset.editorLayerLocked !== 'true'; });
        elements.forEach(function (element) {
            if (shouldLock) { element.dataset.editorLayerLocked = 'true'; element.classList.add('editor-layer-locked'); }
            else { delete element.dataset.editorLayerLocked; element.classList.remove('editor-layer-locked'); }
        });
        refreshLayers();
        return true;
    }

    function changeStack(delta) {
        var elements = selected().filter(canEdit);
        if (!elements.length) return false;
        elements.forEach(function (element) {
            var current = parseInt(global.getComputedStyle(element).zIndex, 10);
            if (!Number.isFinite(current)) current = 1;
            element.style.zIndex = String(Math.max(0, current + delta));
        });
        refreshLayers();
        return true;
    }

    function groupSelection() { return global.EditorMultiSelect && global.EditorMultiSelect.group ? global.EditorMultiSelect.group() : false; }
    function ungroupSelection() { return global.EditorMultiSelect && global.EditorMultiSelect.ungroup ? global.EditorMultiSelect.ungroup() : false; }
    function refreshLayers() { if (global.EditorLayersPanel && global.EditorLayersPanel.refresh) global.EditorLayersPanel.refresh(); }

    function execute(action) {
        var actions = {
            copy: copySelection, paste: pasteSelection, duplicate: duplicateSelection, delete: deleteSelection,
            lock: toggleLock, forward: function () { return changeStack(1); }, backward: function () { return changeStack(-1); },
            group: groupSelection, ungroup: ungroupSelection
        };
        if (!actions[action]) return false;
        var result = actions[action]();
        document.dispatchEvent(new global.CustomEvent('editor:surfacecommand', { detail: { action: action, result: result } }));
        if (result && action !== 'copy') document.dispatchEvent(new global.CustomEvent('editor:commandmutation', { detail: { action: action } }));
        hideMenu();
        return result;
    }

    function buildMenu() {
        if (menu) return menu;
        menu = document.createElement('div');
        menu.id = 'editor-context-menu';
        menu.className = 'editor-context-menu';
        menu.setAttribute('role', 'menu');
        menu.innerHTML = [
            item('duplicate', 'fa-clone', isAr ? 'تكرار' : 'Duplicate', 'Ctrl+D'),
            item('copy', 'fa-copy', isAr ? 'نسخ' : 'Copy', 'Ctrl+C'),
            item('paste', 'fa-paste', isAr ? 'لصق' : 'Paste', 'Ctrl+V'), divider(),
            item('forward', 'fa-arrow-up', isAr ? 'تقديم للأمام' : 'Bring forward', ']'),
            item('backward', 'fa-arrow-down', isAr ? 'إرسال للخلف' : 'Send backward', '['),
            item('lock', 'fa-lock', isAr ? 'قفل / فتح' : 'Lock / unlock', 'Ctrl+L'), divider(),
            item('group', 'fa-object-group', isAr ? 'تجميع' : 'Group', 'Ctrl+G'),
            item('ungroup', 'fa-object-ungroup', isAr ? 'فك التجميع' : 'Ungroup', 'Ctrl+Shift+G'), divider(),
            item('delete', 'fa-trash', isAr ? 'حذف' : 'Delete', 'Del', true)
        ].join('');
        menu.addEventListener('click', function (event) { var button = event.target.closest('[data-surface-action]'); if (button) execute(button.dataset.surfaceAction); });
        document.body.appendChild(menu);
        injectStyles();
        return menu;
    }

    function item(action, icon, label, shortcut, danger) {
        return '<button type="button" role="menuitem" class="ecm-item' + (danger ? ' is-danger' : '') + '" data-surface-action="' + action + '"><i class="fas ' + icon + '"></i><span>' + label + '</span><kbd>' + shortcut + '</kbd></button>';
    }
    function divider() { return '<div class="ecm-divider" role="separator"></div>'; }
    function showMenu(x, y) {
        buildMenu(); menu.style.display = 'block';
        var width = menu.offsetWidth || 220, height = menu.offsetHeight || 300;
        menu.style.left = Math.max(8, Math.min(x, global.innerWidth - width - 8)) + 'px';
        menu.style.top = Math.max(8, Math.min(y, global.innerHeight - height - 8)) + 'px';
    }
    function hideMenu() { if (menu) menu.style.display = 'none'; }
    function isTyping() { var active = document.activeElement; return !!active && (active.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(active.tagName)); }

    function onKeydown(event) {
        if (isTyping()) return;
        var mod = event.ctrlKey || event.metaKey, action = null;
        if (mod && event.key.toLowerCase() === 'c') action = 'copy';
        else if (mod && event.key.toLowerCase() === 'v') action = 'paste';
        else if (mod && event.key.toLowerCase() === 'd') action = 'duplicate';
        else if (mod && event.key.toLowerCase() === 'l') action = 'lock';
        else if (mod && event.shiftKey && event.key.toLowerCase() === 'g') action = 'ungroup';
        else if (mod && event.key.toLowerCase() === 'g') action = 'group';
        else if (event.key === 'Delete' || event.key === 'Backspace') action = 'delete';
        else if (event.key === ']') action = 'forward';
        else if (event.key === '[') action = 'backward';
        if (action) { event.preventDefault(); execute(action); }
    }

    function injectStyles() {
        if (document.getElementById('editor-command-surface-css')) return;
        var style = document.createElement('style'); style.id = 'editor-command-surface-css';
        style.textContent = '.editor-context-menu{position:fixed;z-index:100000;display:none;min-width:220px;padding:7px;background:rgba(10,18,30,.98);border:1px solid rgba(77,166,255,.2);border-radius:12px;box-shadow:0 18px 45px rgba(0,0,0,.5);backdrop-filter:blur(14px)}.ecm-item{width:100%;display:grid;grid-template-columns:20px minmax(0,1fr) auto;gap:8px;align-items:center;padding:8px 9px;border:0;border-radius:8px;background:transparent;color:#e8eef6;text-align:start;font-family:inherit;cursor:pointer}.ecm-item:hover{background:rgba(77,166,255,.12)}.ecm-item i{color:#4da6ff}.ecm-item kbd{font-size:.62rem;color:#8fa0b4}.ecm-item.is-danger,.ecm-item.is-danger i{color:#e74c3c}.ecm-divider{height:1px;background:rgba(255,255,255,.08);margin:5px 2px}';
        document.head.appendChild(style);
    }

    function init() {
        buildMenu(); document.addEventListener('keydown', onKeydown);
        document.addEventListener('contextmenu', function (event) {
            var target = event.target.closest('.draggable, .editable-element, .card-element, [data-element-type], .card-face [id]');
            if (!target || !target.closest('.card-face, #card-front, #card-back')) return;
            event.preventDefault(); if (global.EditorContextInspector) global.EditorContextInspector.select(target); showMenu(event.clientX, event.clientY);
        });
        document.addEventListener('click', function (event) { if (menu && !menu.contains(event.target)) hideMenu(); });
        global.addEventListener('blur', hideMenu);
    }

    global.EditorCommandSurface = { execute: execute, copy: copySelection, paste: pasteSelection, duplicate: duplicateSelection, remove: deleteSelection, toggleLock: toggleLock, showMenu: showMenu, hideMenu: hideMenu };
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true }); else init();
}(typeof window !== 'undefined' ? window : globalThis));
