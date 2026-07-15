/**
 * @jest-environment jsdom
 */
'use strict';

describe('Editor Brand Kit', () => {
    beforeEach(() => {
        jest.useFakeTimers();
        jest.resetModules();
        delete window.EditorBrandKit;
        localStorage.clear();
        document.documentElement.lang = 'en';
        document.body.innerHTML = `
            <div id="tb-settings-panel"></div>
            <input id="primary-color" value="#112233">
            <input id="secondary-color" value="#445566">
            <input id="name-color" value="#ffffff">
            <select id="font-family"><option value="Inter" selected>Inter</option></select>
            <input id="logo-url" value="https://example.com/logo.png">
        `;
        require('../editor-brand-kit');
        document.dispatchEvent(new Event('DOMContentLoaded'));
        jest.runOnlyPendingTimers();
    });

    afterEach(() => {
        jest.useRealTimers();
        delete window.EditorBrandKit;
    });

    test('captures and saves the current brand identity', () => {
        const kit = window.EditorBrandKit.save('MC PRIME');
        expect(kit.name).toBe('MC PRIME');
        expect(kit.primary).toBe('#112233');
        expect(window.EditorBrandKit.list()).toHaveLength(1);
    });

    test('applies a saved brand to editor controls', () => {
        const kit = window.EditorBrandKit.save('MC PRIME');
        document.getElementById('primary-color').value = '#000000';
        document.getElementById('font-family').value = '';

        expect(window.EditorBrandKit.apply(kit.id)).toBe(true);
        expect(document.getElementById('primary-color').value).toBe('#112233');
        expect(document.getElementById('font-family').value).toBe('Inter');
    });

    test('imports valid kits and exports JSON', () => {
        const count = window.EditorBrandKit.import(JSON.stringify([{ name: 'Imported', primary: '#abcdef' }]));
        expect(count).toBe(1);
        expect(JSON.parse(window.EditorBrandKit.export())[0].name).toBe('Imported');
    });

    test('removes a saved kit', () => {
        const kit = window.EditorBrandKit.save('Temporary');
        expect(window.EditorBrandKit.remove(kit.id)).toBe(true);
        expect(window.EditorBrandKit.list()).toHaveLength(0);
    });

    test('renders the Brand Kit panel in editor settings', () => {
        expect(document.getElementById('editor-brand-kit')).not.toBeNull();
        expect(document.getElementById('ebk-save')).not.toBeNull();
    });
});
