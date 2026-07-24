/**
 * @jest-environment jsdom
 */

'use strict';

describe('Editor extension persistence source isolation', () => {
    const key = 'mcprime_editor_extensions_v1';

    beforeEach(() => {
        jest.useFakeTimers();
        jest.resetModules();
        delete window.EditorExtensionPersistence;
        window.history.replaceState({}, '', '/editor.html');
        window.localStorage.clear();
        window.EditorHistoryBridge = {
            snapshot: jest.fn(() => ({ editorExtensions: { version: 1, elements: [{ key: '#card-logo' }] } })),
            restore: jest.fn()
        };
    });

    afterEach(() => {
        jest.useRealTimers();
        delete window.EditorHistoryBridge;
        delete window.EditorExtensionPersistence;
    });

    test('restores local extension state only for a local draft', () => {
        const extension = { version: 1, elements: [{ key: '#card-logo', style: 'opacity:.5' }] };
        window.localStorage.setItem(key, JSON.stringify(extension));

        require('../editor-extension-persistence');
        document.dispatchEvent(new Event('DOMContentLoaded'));
        jest.advanceTimersByTime(300);

        expect(window.EditorExtensionPersistence.isLocalDraft()).toBe(true);
        expect(window.EditorHistoryBridge.restore).toHaveBeenCalledWith(extension);
    });

    test('never overlays a dashboard design opened by id with stale local styles', () => {
        const stale = { version: 1, elements: [{ key: '#card-logo', style: 'transform:translate(999px,999px)' }] };
        window.localStorage.setItem(key, JSON.stringify(stale));
        window.history.replaceState({}, '', '/editor.html?id=saved-design-123&lang=ar');

        require('../editor-extension-persistence');
        document.dispatchEvent(new Event('DOMContentLoaded'));
        jest.advanceTimersByTime(3000);

        expect(window.EditorExtensionPersistence.isLocalDraft()).toBe(false);
        expect(window.EditorHistoryBridge.restore).not.toHaveBeenCalled();
        expect(window.EditorHistoryBridge.snapshot).not.toHaveBeenCalled();
        expect(jest.getTimerCount()).toBe(0);
    });

    test('does not overwrite the local draft cache while editing a saved design', () => {
        const existing = JSON.stringify({ version: 1, elements: [{ key: '#safe-draft' }] });
        window.localStorage.setItem(key, existing);
        window.history.replaceState({}, '', '/editor-en.html?id=saved-design-456');

        require('../editor-extension-persistence');
        expect(window.EditorExtensionPersistence.save()).toBe(false);
        expect(window.localStorage.getItem(key)).toBe(existing);
    });
});
