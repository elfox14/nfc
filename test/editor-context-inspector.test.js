/**
 * @jest-environment jsdom
 */

'use strict';

describe('Context inspector', () => {
    beforeEach(() => {
        jest.resetModules();
        document.documentElement.lang = 'ar';
        document.body.innerHTML = `
            <div class="pro-layout">
                <aside id="panel-design"><div id="logo-controls-fieldset"></div></aside>
                <aside id="panel-elements"></aside>
                <main>
                    <div class="card-face" id="card-front">
                        <div id="card-logo"><img id="card-logo-img" alt=""></div>
                    </div>
                </main>
                <aside id="panel-share"></aside>
            </div>
        `;
        window.EditorTabs = { activate: jest.fn() };
        Element.prototype.scrollIntoView = jest.fn();
        require('../editor-context-inspector');
        document.dispatchEvent(new Event('DOMContentLoaded'));
    });

    test('creates a contextual inspector in the editor layout', () => {
        expect(document.getElementById('editor-context-inspector')).not.toBeNull();
        expect(document.querySelector('.pro-layout').contains(document.getElementById('editor-context-inspector'))).toBe(true);
    });

    test('selects a card element and identifies its type', () => {
        const logo = document.getElementById('card-logo');
        logo.dispatchEvent(new MouseEvent('click', { bubbles: true }));

        expect(logo.classList.contains('editor-selected-element')).toBe(true);
        expect(document.getElementById('eci-title').textContent).toBe('الشعار');
        expect(document.getElementById('eci-type').textContent).toBe('card-logo');
    });

    test('updates selected element opacity', () => {
        const logo = document.getElementById('card-logo');
        window.EditorContextInspector.select(logo);
        const opacity = document.getElementById('eci-opacity');
        opacity.value = '45';
        opacity.dispatchEvent(new Event('input', { bubbles: true }));

        expect(logo.style.opacity).toBe('0.45');
        expect(document.getElementById('eci-opacity-output').textContent).toBe('45%');
    });

    test('opens the legacy advanced controls for the selected element', () => {
        window.EditorContextInspector.select(document.getElementById('card-logo'));
        document.getElementById('eci-advanced').click();

        expect(window.EditorTabs.activate).toHaveBeenCalledWith('tab-design');
        expect(Element.prototype.scrollIntoView).toHaveBeenCalled();
    });
});
