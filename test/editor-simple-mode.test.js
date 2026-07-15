/**
 * @jest-environment jsdom
 */
'use strict';

describe('Editor simple mode', () => {
    beforeEach(() => {
        jest.useFakeTimers();
        jest.resetModules();
        delete window.EditorSimpleMode;
        localStorage.clear();
        document.documentElement.lang = 'ar';
        document.body.innerHTML = `
            <header class="pro-toolbar"><div class="tb-zone tb-center"></div></header>
            <div class="pro-layout">
                <aside id="panel-design"><details id="colors-fieldset"></details></aside>
                <aside id="panel-elements"><details id="personal-info-fieldset"></details></aside>
                <main id="canvas"></main>
                <aside id="editor-context-inspector"></aside>
                <aside id="editor-layers-panel"></aside>
            </div>
            <button id="preview-btn"></button>
            <button id="save-share-btn"></button>
        `;
        Element.prototype.scrollIntoView = jest.fn();
        window.EditorTabs = { activate: jest.fn() };
        require('../editor-simple-mode');
        document.dispatchEvent(new Event('DOMContentLoaded'));
        jest.runOnlyPendingTimers();
    });

    afterEach(() => {
        jest.useRealTimers();
        delete window.EditorSimpleMode;
        delete window.EditorTabs;
    });

    test('starts in simple mode and creates five ordered tasks', () => {
        expect(window.EditorSimpleMode.getMode()).toBe('simple');
        expect(document.documentElement.dataset.editorMode).toBe('simple');
        expect(document.querySelectorAll('[data-simple-task]').length).toBe(5);
        expect(document.getElementById('editor-simple-toolbar').hidden).toBe(false);
    });

    test('shows one compact segmented mode control in the top toolbar', () => {
        const control = document.getElementById('editor-mode-control');
        expect(control).not.toBeNull();
        expect(control.querySelectorAll('[data-editor-mode-value]')).toHaveLength(2);
        expect(control.querySelector('[data-editor-mode-value="simple"]').classList.contains('is-active')).toBe(true);
        expect(document.getElementById('editor-v2-header-control')).toBeNull();
    });

    test('advanced mode hides the bottom task bar and persists selection', () => {
        document.querySelector('[data-editor-mode-value="advanced"]').click();
        expect(window.EditorSimpleMode.getMode()).toBe('advanced');
        expect(document.documentElement.dataset.editorMode).toBe('advanced');
        expect(localStorage.getItem('mcprime-editor-mode-v1')).toBe('advanced');
        expect(document.getElementById('editor-simple-toolbar').hidden).toBe(true);
        expect(document.querySelector('[data-editor-mode-value="advanced"]').classList.contains('is-active')).toBe(true);
    });

    test('opens the matching legacy controls for a task', () => {
        expect(window.EditorSimpleMode.runTask('details')).toBe(true);
        expect(window.EditorTabs.activate).toHaveBeenCalledWith('tab-content');
        expect(document.getElementById('personal-info-fieldset').open).toBe(true);
        expect(Element.prototype.scrollIntoView).toHaveBeenCalled();
    });

    test('persists advanced mode and can return to simple mode', () => {
        expect(window.EditorSimpleMode.setMode('advanced')).toBe('advanced');
        expect(localStorage.getItem('mcprime-editor-mode-v1')).toBe('advanced');
        expect(window.EditorSimpleMode.setMode('simple')).toBe('simple');
        expect(document.getElementById('editor-simple-toolbar').hidden).toBe(false);
    });

    test('uses existing preview and publish controls', () => {
        const preview = document.getElementById('preview-btn');
        const publish = document.getElementById('save-share-btn');
        preview.click = jest.fn();
        publish.click = jest.fn();
        expect(window.EditorSimpleMode.runTask('preview')).toBe(true);
        expect(window.EditorSimpleMode.runTask('publish')).toBe(true);
        expect(preview.click).toHaveBeenCalledTimes(1);
        expect(publish.click).toHaveBeenCalledTimes(1);
    });
});