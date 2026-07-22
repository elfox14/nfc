/**
 * Persists DOM-level editor extensions that are outside the legacy StateManager.
 */
(function (global) {
    'use strict';
    var document = global.document;
    if (!document || global.EditorExtensionPersistence) return;
    var KEY = 'mcprime_editor_extensions_v1';
    var restoreTimer = null;

    function save() {
        if (!global.EditorHistoryBridge || !global.EditorHistoryBridge.snapshot) return false;
        try {
            var snapshot = global.EditorHistoryBridge.snapshot('autosave');
            global.localStorage.setItem(KEY, JSON.stringify(snapshot.editorExtensions || { version: 1, elements: [] }));
            return true;
        } catch (error) {
            console.warn('[EditorExtensionPersistence] Save failed:', error);
            return false;
        }
    }

    function restore() {
        if (!global.EditorHistoryBridge || !global.EditorHistoryBridge.restore) return false;
        try {
            var raw = global.localStorage.getItem(KEY);
            if (!raw) return false;
            global.EditorHistoryBridge.restore(JSON.parse(raw));
            return true;
        } catch (error) {
            console.warn('[EditorExtensionPersistence] Restore failed:', error);
            return false;
        }
    }

    function scheduleRestore() {
        global.clearTimeout(restoreTimer);
        restoreTimer = global.setTimeout(function () {
            if (!restore()) scheduleRestore();
        }, 300);
    }

    function init() {
        document.addEventListener('editor:historycommit', save);
        global.addEventListener('beforeunload', save);
        scheduleRestore();
    }

    global.EditorExtensionPersistence = { save: save, restore: restore, key: KEY };
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true });
    else init();
}(typeof window !== 'undefined' ? window : globalThis));
