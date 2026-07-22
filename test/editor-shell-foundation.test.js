/**
 * @jest-environment jsdom
 */

'use strict';

describe('Editor shell foundation', () => {
    let canonicalSave;
    let canonicalShare;

    beforeAll(() => {
        jest.useFakeTimers();
        document.documentElement.lang = 'ar';
        document.body.innerHTML = `
            <nav id="tb-pill-nav">
                <button class="tb-tab" data-tab="tab-design" data-ac="active-design"></button>
                <button class="tb-tab" data-tab="tab-content" data-ac="active-content"></button>
                <button class="tb-tab" data-tab="tab-settings" data-ac="active-settings"></button>
            </nav>
            <aside id="panel-design"></aside>
            <aside id="panel-elements"></aside>
            <button id="lang-toggle-btn"></button>
            <button id="theme-toggle-btn"></button>
            <button id="show-gallery-btn"></button>
            <button id="save-to-gallery-btn"></button>
            <button id="start-collab-btn"></button>
            <button id="share-editor-btn"></button>
            <button id="save-share-btn"></button>
            <button id="reset-design-btn"></button>
            <button id="mobile-save-btn"></button>
            <button id="mobile-share-btn"></button>
            <input id="qr-size" value="30">
        `;

        canonicalSave = document.getElementById('save-share-btn');
        canonicalShare = document.getElementById('share-editor-btn');
        canonicalSave.click = jest.fn();
        canonicalShare.click = jest.fn();

        jest.resetModules();
        require('../toolbar-tab-nav');
        document.dispatchEvent(new Event('DOMContentLoaded'));
        jest.runOnlyPendingTimers();
    });

    afterAll(() => {
        jest.useRealTimers();
    });

    test('registers a stable command API', () => {
        expect(window.EditorCommands).toBeDefined();
        expect(window.EditorCommands.has('editor.save-share')).toBe(true);
        expect(window.EditorCommands.has('design.reset')).toBe(true);
    });

    test('routes mobile actions to one canonical command target', () => {
        document.getElementById('mobile-save-btn').click();
        document.getElementById('mobile-share-btn').click();
        expect(canonicalSave.click).toHaveBeenCalledTimes(1);
        expect(canonicalShare.click).toHaveBeenCalledTimes(1);
    });

    test('builds settings controls without inline event handlers', () => {
        const settings = document.getElementById('tb-settings-panel');
        expect(settings).not.toBeNull();
        expect(settings.querySelectorAll('[onclick]').length).toBe(0);
        expect(settings.querySelectorAll('[data-editor-command]').length).toBeGreaterThan(0);
    });

    test('updates QR size through the command bus', () => {
        const slider = document.getElementById('tbs-qr-size');
        const qrSize = document.getElementById('qr-size');
        const onInput = jest.fn();
        qrSize.addEventListener('input', onInput);
        slider.value = '42';
        slider.dispatchEvent(new Event('input', { bubbles: true }));
        expect(qrSize.value).toBe('42');
        expect(onInput).toHaveBeenCalledTimes(1);
    });

    test('switches to the contextual settings panel', () => {
        window.EditorTabs.activate('tab-settings');
        expect(document.getElementById('tb-settings-panel').hidden).toBe(false);
        expect(document.getElementById('panel-design').hidden).toBe(true);
        expect(document.getElementById('panel-elements').hidden).toBe(true);
    });
});
