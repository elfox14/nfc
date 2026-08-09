/**
 * Persists DOM-level editor extensions that are outside the legacy StateManager.
 * Also restores the intended balanced layout for a brand-new/reset card.
 */
(function (global) {
    'use strict';
    var document = global.document;
    if (!document || global.EditorExtensionPersistence) return;
    var KEY = 'mcprime_editor_extensions_v1';
    var restoreTimer = null;

    function isLocalDraft() {
        var params = new global.URLSearchParams(global.location.search || '');
        return !params.get('id') && !params.get('collabId');
    }

    function hasSavedLocalDesign() {
        try {
            var config = global.Config;
            var storageKey = config && config.LOCAL_STORAGE_KEY;
            return Boolean(storageKey && global.localStorage.getItem(storageKey));
        } catch (error) {
            return false;
        }
    }

    function installDefaultLayoutStyles() {
        if (document.getElementById('editor-default-card-css')) return;
        var link = document.createElement('link');
        link.id = 'editor-default-card-css';
        link.rel = 'stylesheet';
        link.href = 'editor-default-card.css?v=1.0';
        document.head.appendChild(link);
    }

    function applyDefaultCardLayout() {
        var params = new global.URLSearchParams(global.location.search || '');
        var hasRemoteDesign = Boolean(params.get('id') || params.get('collabId'));
        var useDefault = !hasRemoteDesign && !hasSavedLocalDesign();
        var front = document.getElementById('card-front-content');
        var back = document.getElementById('card-back-content');

        installDefaultLayoutStyles();
        if (front) front.classList.toggle('editor-default-front-layout', useDefault);
        if (back) back.classList.toggle('editor-default-back-layout', useDefault);

        return useDefault;
    }

    function save() {
        if (!isLocalDraft()) return false;
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
        if (!isLocalDraft()) return false;
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
        if (!isLocalDraft()) return;
        global.clearTimeout(restoreTimer);
        restoreTimer = global.setTimeout(function () {
            if (!restore()) scheduleRestore();
        }, 300);
    }

    function init() {
        applyDefaultCardLayout();
        if (!isLocalDraft()) return;
        document.addEventListener('editor:historycommit', save);
        global.addEventListener('beforeunload', save);
        scheduleRestore();
    }

    global.EditorExtensionPersistence = {
        save: save,
        restore: restore,
        key: KEY,
        isLocalDraft: isLocalDraft,
        applyDefaultCardLayout: applyDefaultCardLayout
    };
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true });
    else init();
}(typeof window !== 'undefined' ? window : globalThis));
