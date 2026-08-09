/**
 * Persists DOM-level editor extensions that are outside the legacy StateManager.
 * Also stabilizes saved card geometry after the editor has finished rendering.
 */
(function (global) {
    'use strict';
    var document = global.document;
    if (!document || global.EditorExtensionPersistence) return;

    var KEY = 'mcprime_editor_extensions_v1';
    var restoreTimer = null;
    var geometryPatchInstalled = false;
    var geometryRunToken = 0;

    function isLocalDraft() {
        var params = new global.URLSearchParams(global.location.search || '');
        return !params.get('id');
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

    function nextFrame() {
        return new Promise(function (resolve) {
            if (typeof global.requestAnimationFrame === 'function') {
                global.requestAnimationFrame(function () { resolve(); });
            } else {
                global.setTimeout(resolve, 16);
            }
        });
    }

    function waitForFonts() {
        if (document.fonts && document.fonts.ready) {
            return Promise.race([
                document.fonts.ready,
                new Promise(function (resolve) { global.setTimeout(resolve, 1200); })
            ]);
        }
        return Promise.resolve();
    }

    function waitForImages() {
        var images = Array.prototype.slice.call(document.querySelectorAll('.card-face img'));
        var pending = images.filter(function (image) { return !image.complete; });
        if (!pending.length) return Promise.resolve();

        return Promise.race([
            Promise.all(pending.map(function (image) {
                return new Promise(function (resolve) {
                    var done = function () {
                        image.removeEventListener('load', done);
                        image.removeEventListener('error', done);
                        resolve();
                    };
                    image.addEventListener('load', done, { once: true });
                    image.addEventListener('error', done, { once: true });
                });
            })),
            new Promise(function (resolve) { global.setTimeout(resolve, 1800); })
        ]);
    }

    function restoreGeometry(state) {
        if (!state || !global.StateManager) return false;

        try {
            // The saved design is authoritative. Restore only the target element
            // geometry; never calculate or move sibling elements.
            if (typeof global.StateManager.restoreGeometry === 'function') {
                global.StateManager.restoreGeometry(state);
            } else {
                if (typeof global.StateManager.applyStoredPositions === 'function') {
                    global.StateManager.applyStoredPositions(state.positions);
                }
                if (typeof global.StateManager.applyStoredAnchors === 'function') {
                    global.StateManager.applyStoredAnchors(state.anchors);
                }
            }

            if (state.anchors && typeof global.StateManager.applyStoredAnchors === 'function') {
                global.StateManager.applyStoredAnchors(state.anchors);
            }
            return true;
        } catch (error) {
            console.warn('[EditorExtensionPersistence] Geometry restore failed:', error);
            return false;
        }
    }

    function stabilizeGeometry(state) {
        if (!state || !global.StateManager) return;

        var token = ++geometryRunToken;
        Promise.resolve()
            .then(waitForFonts)
            .then(waitForImages)
            .then(nextFrame)
            .then(function () {
                if (token !== geometryRunToken) return;

                // Freeze the legacy flow layout before restoring saved coordinates.
                if (global.EditorIndependentLayout && typeof global.EditorIndependentLayout.initialize === 'function') {
                    global.EditorIndependentLayout.initialize();
                }
                restoreGeometry(state);
            })
            .then(nextFrame)
            .then(function () {
                if (token !== geometryRunToken) return;
                restoreGeometry(state);
            })
            .then(nextFrame)
            .then(function () {
                if (token !== geometryRunToken) return;
                restoreGeometry(state);
            })
            .catch(function (error) {
                console.warn('[EditorExtensionPersistence] Geometry stabilization failed:', error);
            });
    }

    function installGeometryPatch() {
        if (geometryPatchInstalled || !global.StateManager || typeof global.StateManager.applyState !== 'function') {
            return;
        }

        var originalApplyState = global.StateManager.applyState;
        if (originalApplyState.__mcprimeGeometryPatched) {
            geometryPatchInstalled = true;
            return;
        }

        function patchedApplyState(state) {
            var result = originalApplyState.apply(this, arguments);
            stabilizeGeometry(state);
            return result;
        }

        patchedApplyState.__mcprimeGeometryPatched = true;
        global.StateManager.applyState = patchedApplyState;
        geometryPatchInstalled = true;
    }

    function stabilizeCurrentState() {
        installGeometryPatch();
        if (!global.StateManager || typeof global.StateManager.getStateObject !== 'function') return;
        try {
            stabilizeGeometry(global.StateManager.getStateObject());
        } catch (error) {
            console.warn('[EditorExtensionPersistence] Current-state geometry restore failed:', error);
        }
    }

    function init() {
        installGeometryPatch();

        if (isLocalDraft()) {
            document.addEventListener('editor:historycommit', save);
            global.addEventListener('beforeunload', save);
            scheduleRestore();
        }

        // The dashboard/edit flow can finish its async state load before this
        // extension's DOMContentLoaded handler runs. Always stabilize the state
        // that is actually present in the editor, including ?id= saved designs.
        global.setTimeout(stabilizeCurrentState, 0);
        global.setTimeout(stabilizeCurrentState, 350);
    }

    global.EditorExtensionPersistence = {
        save: save,
        restore: restore,
        key: KEY,
        isLocalDraft: isLocalDraft,
        stabilizeGeometry: stabilizeGeometry
    };

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init, { once: true });
    } else {
        init();
    }
}(typeof window !== 'undefined' ? window : globalThis));
