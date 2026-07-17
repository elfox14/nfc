/**
 * @jest-environment jsdom
 */

describe('editor creative tools', () => {
    beforeEach(() => {
        jest.resetModules();
        localStorage.clear();
        document.documentElement.lang = 'en';
        document.documentElement.removeAttribute('data-editor-creative-tools');
        document.body.innerHTML = `
            <div class="tb-history"><button id="undo-btn"></button><button id="redo-btn"></button></div>
            <aside id="panel-design"><div class="editor-library-shortcuts"></div></aside>
            <input id="front-bg-start" value="#000000"><input id="front-bg-end" value="#000000">
            <input id="back-bg-start" value="#000000"><input id="back-bg-end" value="#000000">
            <input id="name-color" value="#000000"><input id="tagline-color" value="#000000">
            <input id="back-buttons-bg-color" value="#000000"><input id="back-buttons-text-color" value="#000000">
            <input id="social-text-color" value="#000000"><input id="input-logo" value="">
            <input id="input-photo-url" value=""><img id="card-logo-img" src=""><img id="photo-preview" src="">
            <select id="name-font"><option value="Cairo, sans-serif">Cairo</option></select>
            <select id="tagline-font"><option value="Tajawal, sans-serif">Tajawal</option></select>
        `;
        window.EditorWorkspace = { getState: () => ({ libraryView: 'templates' }) };
        global.StateManager = {
            getStateObject: jest.fn(() => ({ name: 'Mona' })),
            applyState: jest.fn(),
            saveDebounced: jest.fn()
        };
        global.HistoryManager = {
            history: [], currentIndex: -1, updateButtonStates: jest.fn(),
            pushState(state) { this.history.push(state); this.currentIndex += 1; }
        };
        delete window.EditorCreativeTools;
    });

    afterEach(() => {
        delete global.StateManager;
        delete global.HistoryManager;
    });

    test('applies presets, remembers assets and restores named versions', () => {
        require('../editor-creative-tools');
        if (document.documentElement.dataset.editorCreativeTools !== 'ready') document.dispatchEvent(new Event('DOMContentLoaded'));

        expect(document.querySelectorAll('.editor-palette')).toHaveLength(6);
        document.querySelector('.editor-palette').click();
        expect(document.getElementById('front-bg-start').value).toBe('#0b172a');
        expect(global.StateManager.saveDebounced).toHaveBeenCalled();

        window.EditorCreativeTools.rememberAsset('https://cdn.example/logo.png', 'logo');
        expect(JSON.parse(localStorage.getItem('mcprime-editor-assets-v1'))).toHaveLength(1);

        expect(window.EditorCreativeTools.createVersion('Before redesign')).toBe(true);
        const version = JSON.parse(localStorage.getItem('mcprime-editor-versions-v1'))[0];
        expect(window.EditorCreativeTools.restoreVersion(version.id)).toBe(true);
        expect(global.StateManager.applyState).toHaveBeenCalledWith({ name: 'Mona' }, true);
    });
});
