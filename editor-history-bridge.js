/**
 * MC PRIME NFC — Editor History Bridge v1.0
 * Extends the legacy StateManager history with DOM-level editor enhancements.
 */
(function (global) {
    'use strict';

    var document = global.document;
    if (!document || global.EditorHistoryBridge) return;

    var debounceTimer = null;
    var applying = false;
    var originalApplyState = null;
    var trackedEvents = [
        'editor:elementaligned',
        'editor:snap',
        'editor:layerchange',
        'editor:multiaction',
        'editor:commandmutation'
    ];

    function cardRoots() {
        return Array.from(document.querySelectorAll('.card-face, #card-front, #card-back'))
            .filter(function (element, index, list) { return list.indexOf(element) === index; });
    }

    function elementKey(element) {
        if (element.id) return '#' + element.id;
        if (!element.dataset.editorHistoryKey) {
            element.dataset.editorHistoryKey = 'editor-node-' + Date.now() + '-' + Math.random().toString(36).slice(2, 8);
        }
        return '[data-editor-history-key="' + element.dataset.editorHistoryKey + '"]';
    }

    function serializeElement(element) {
        return {
            key: elementKey(element),
            html: element.dataset.editorCreated === 'true' ? element.outerHTML : null,
            parent: element.parentElement ? elementKey(element.parentElement) : null,
            style: element.getAttribute('style') || '',
            hidden: element.dataset.editorLayerHidden || null,
            locked: element.dataset.editorLayerLocked || null,
            group: element.dataset.editorGroup || null,
            created: element.dataset.editorCreated === 'true'
        };
    }

    function collectExtensionState() {
        var elements = [];
        cardRoots().forEach(function (root) {
            root.querySelectorAll('[id], [data-editor-history-key], [data-editor-created="true"]')
                .forEach(function (element) {
                    if (element === root) return;
                    var style = element.getAttribute('style') || '';
                    var relevant = style || element.dataset.editorLayerHidden || element.dataset.editorLayerLocked ||
                        element.dataset.editorGroup || element.dataset.editorCreated === 'true';
                    if (relevant) elements.push(serializeElement(element));
                });
        });
        return { version: 1, elements: elements };
    }

    function getBaseState() {
        try {
            if (global.StateManager && typeof global.StateManager.getStateObject === 'function') {
                return global.StateManager.getStateObject();
            }
        } catch (error) {
            console.warn('[EditorHistoryBridge] Failed to read StateManager:', error);
        }
        return {};
    }

    function createSnapshot(reason) {
        var base = getBaseState() || {};
        var snapshot = JSON.parse(JSON.stringify(base));
        snapshot.editorExtensions = collectExtensionState();
        snapshot.editorHistoryMeta = { reason: reason || 'editor-change', timestamp: Date.now() };
        return snapshot;
    }

    function restoreCreatedNodes(records) {
        var expected = new Set(records.filter(function (record) { return record.created; }).map(function (record) { return record.key; }));
        document.querySelectorAll('[data-editor-created="true"]').forEach(function (element) {
            if (!expected.has(elementKey(element))) element.remove();
        });

        records.filter(function (record) { return record.created; }).forEach(function (record) {
            if (document.querySelector(record.key) || !record.html) return;
            var parent = record.parent ? document.querySelector(record.parent) : null;
            if (!parent) parent = cardRoots()[0];
            if (!parent) return;
            var template = document.createElement('template');
            template.innerHTML = record.html.trim();
            var node = template.content.firstElementChild;
            if (node) parent.appendChild(node);
        });
    }

    function restoreExtensionState(extension) {
        if (!extension || !Array.isArray(extension.elements)) return;
        restoreCreatedNodes(extension.elements);
        extension.elements.forEach(function (record) {
            var element = document.querySelector(record.key);
            if (!element) return;
            if (record.style) element.setAttribute('style', record.style);
            else element.removeAttribute('style');
            setDataset(element, 'editorLayerHidden', record.hidden);
            setDataset(element, 'editorLayerLocked', record.locked);
            setDataset(element, 'editorGroup', record.group);
            element.classList.toggle('editor-layer-locked', record.locked === 'true');
        });
        if (global.EditorLayersPanel && global.EditorLayersPanel.refresh) global.EditorLayersPanel.refresh();
    }

    function setDataset(element, key, value) {
        if (value === null || value === undefined || value === '') delete element.dataset[key];
        else element.dataset[key] = value;
    }

    function autosave() {
        if (!global.StateManager) return;
        try {
            if (typeof global.StateManager.saveDebounced === 'function') global.StateManager.saveDebounced();
            else if (typeof global.StateManager.save === 'function') global.StateManager.save();
        } catch (error) {
            console.warn('[EditorHistoryBridge] Autosave failed:', error);
        }
    }

    function commit(reason, immediate) {
        if (applying) return false;
        global.clearTimeout(debounceTimer);
        var run = function () {
            if (global.HistoryManager && typeof global.HistoryManager.pushState === 'function') {
                global.HistoryManager.pushState(createSnapshot(reason));
            }
            autosave();
            document.dispatchEvent(new global.CustomEvent('editor:historycommit', { detail: { reason: reason } }));
        };
        if (immediate) run();
        else debounceTimer = global.setTimeout(run, 120);
        return true;
    }

    function patchApplyState() {
        if (!global.StateManager || typeof global.StateManager.applyState !== 'function' || originalApplyState) return false;
        originalApplyState = global.StateManager.applyState.bind(global.StateManager);
        global.StateManager.applyState = function (state) {
            applying = true;
            try {
                var result = originalApplyState.apply(global.StateManager, arguments);
                var restore = function () {
                    restoreExtensionState(state && state.editorExtensions);
                    applying = false;
                };
                if (result && typeof result.then === 'function') return result.then(function (value) { restore(); return value; }, function (error) { applying = false; throw error; });
                global.setTimeout(restore, 0);
                return result;
            } catch (error) {
                applying = false;
                throw error;
            }
        };
        return true;
    }

    function installListeners() {
        trackedEvents.forEach(function (eventName) {
            document.addEventListener(eventName, function (event) {
                var reason = eventName.replace('editor:', '');
                if (event.detail && event.detail.action) reason += ':' + event.detail.action;
                commit(reason, eventName === 'editor:commandmutation');
            });
        });
        document.addEventListener('input', function (event) {
            if (event.target && event.target.closest && event.target.closest('.card-face, #card-front, #card-back')) commit('card-input', false);
        });
    }

    function init() {
        if (!global.HistoryManager || !global.StateManager) {
            global.setTimeout(init, 250);
            return;
        }
        patchApplyState();
        installListeners();
        if (global.HistoryManager.currentIndex < 0) global.HistoryManager.pushState(createSnapshot('initial'));
    }

    global.EditorHistoryBridge = {
        commit: commit,
        snapshot: createSnapshot,
        restore: restoreExtensionState,
        isApplying: function () { return applying; }
    };

    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true });
    else init();
}(typeof window !== 'undefined' ? window : globalThis));
