/**
 * @jest-environment jsdom
 */

describe('editor production hardening', () => {
    beforeEach(() => {
        jest.resetModules();
        document.documentElement.lang = 'en';
        document.documentElement.removeAttribute('data-editor-shell');
        document.body.innerHTML = `
            <div id="autosave-indicator"><i></i><span id="autosave-status"></span></div>
            <input id="design-name" />
            <button id="undo-btn"></button><button id="redo-btn"></button>
            <button id="preview-mode-btn"></button><button id="save-share-btn"></button>
            <button id="reset-design-btn"></button><button id="save-to-gallery-btn"></button>
            <button id="show-gallery-btn"></button><button id="share-editor-btn"></button>
            <button id="start-collab-btn"></button><button id="theme-toggle-btn"><i></i></button>
            <button id="download-png-front"></button><button id="download-png-back"></button>
            <button id="download-pdf"></button><button id="download-vcf"></button>
            <button id="download-qrcode"></button><button id="flip-card-btn-mobile"></button>
        `;
        delete window.EditorCommands;
        delete window.EditorUIState;
        delete window.EditorProduction;
        delete window.EditorShell;
        jest.isolateModules(() => require('../editor-shell'));
        if (document.documentElement.dataset.editorShell !== 'ready') {
            document.dispatchEvent(new Event('DOMContentLoaded'));
        }
    });

    test('marks form edits as unsaved and exposes the release version', () => {
        const input = document.getElementById('design-name');
        input.value = 'Updated card';
        input.dispatchEvent(new Event('input', { bubbles: true }));

        expect(window.EditorProduction.version).toBe('7.0.0');
        expect(window.EditorProduction.isDirty()).toBe(true);
        expect(document.documentElement.dataset.editorDirty).toBe('true');
        expect(document.getElementById('autosave-indicator').dataset.uiState).toBe('unsaved');
        expect(document.getElementById('autosave-status').textContent).toBe('Unsaved changes');
    });

    test('clears dirty state only after a successful save signal', () => {
        window.EditorProduction.markDirty();
        window.updateAutoSaveIndicator('saving');
        expect(document.getElementById('autosave-indicator').dataset.uiState).toBe('saving');

        window.updateAutoSaveIndicator('saved');
        expect(window.EditorProduction.isDirty()).toBe(false);
        expect(document.documentElement.dataset.editorDirty).toBe('false');
        expect(document.documentElement.dataset.editorLastSavedAt).toBeTruthy();
        expect(document.getElementById('autosave-status').textContent).toBe('Saved to cloud');
    });

    test('deduplicates simultaneous save commands', async () => {
        let resolveSave;
        const handler = jest.fn(() => new Promise((resolve) => { resolveSave = resolve; }));
        window.EditorCommands.register('cloud.save', handler);

        const first = window.EditorCommands.execute('cloud.save');
        const second = window.EditorCommands.execute('cloud.save');
        expect(handler).toHaveBeenCalledTimes(1);

        resolveSave(true);
        await expect(first).resolves.toBe(true);
        await expect(second).resolves.toBe(true);
    });

    test('warns before unload only while changes are dirty', () => {
        const cleanEvent = new Event('beforeunload', { cancelable: true });
        window.dispatchEvent(cleanEvent);
        expect(cleanEvent.defaultPrevented).toBe(false);

        window.EditorProduction.markDirty();
        const dirtyEvent = new Event('beforeunload', { cancelable: true });
        window.dispatchEvent(dirtyEvent);
        expect(dirtyEvent.defaultPrevented).toBe(true);
    });
});
