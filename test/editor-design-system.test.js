/**
 * @jest-environment jsdom
 */
'use strict';

describe('Editor design system', () => {
    beforeEach(() => {
        jest.resetModules();
        delete window.EditorDesignSystem;
        document.documentElement.className = '';
        document.head.innerHTML = '';
        document.body.innerHTML = `
            <aside class="editor-context-inspector">
                <button class="eci-primary">Save</button>
                <input id="name-input">
                <fieldset><legend>Details</legend></fieldset>
            </aside>
        `;
        require('../editor-design-system');
        document.dispatchEvent(new Event('DOMContentLoaded'));
    });

    afterEach(() => {
        if (window.EditorDesignSystem) window.EditorDesignSystem.disconnect();
        delete window.EditorDesignSystem;
    });

    test('loads the shared stylesheet once', () => {
        expect(document.querySelectorAll('link[data-editor-design-system]').length).toBe(1);
        window.EditorDesignSystem.enhance(document);
        expect(document.querySelectorAll('link[data-editor-design-system]').length).toBe(1);
    });

    test('applies shared classes to legacy controls', () => {
        expect(document.documentElement.classList.contains('editor-ui-v2')).toBe(true);
        expect(document.querySelector('.editor-context-inspector').classList.contains('ed-panel')).toBe(true);
        expect(document.querySelector('.eci-primary').classList.contains('ed-btn--primary')).toBe(true);
        expect(document.getElementById('name-input').classList.contains('ed-control')).toBe(true);
        expect(document.querySelector('fieldset').classList.contains('ed-section')).toBe(true);
    });

    test('enhances dynamically-added editor UI', async () => {
        const button = document.createElement('button');
        button.textContent = 'New action';
        document.body.appendChild(button);
        await Promise.resolve();
        expect(button.classList.contains('ed-btn')).toBe(true);
    });
});
