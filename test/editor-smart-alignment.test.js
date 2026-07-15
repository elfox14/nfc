/**
 * @jest-environment jsdom
 */

'use strict';

describe('Editor smart alignment', () => {
    beforeEach(() => {
        jest.resetModules();
        document.body.innerHTML = `
            <div id="editor-context-inspector"><button id="eci-advanced"></button></div>
            <div id="card-front" class="card-face"><div id="card-logo" class="draggable"></div></div>
        `;
        const card = document.getElementById('card-front');
        const logo = document.getElementById('card-logo');
        card.getBoundingClientRect = () => ({ left: 0, top: 0, width: 300, height: 180, right: 300, bottom: 180 });
        logo.getBoundingClientRect = () => ({ left: 20, top: 30, width: 60, height: 40, right: 80, bottom: 70 });
        window.EditorContextInspector = { getSelected: () => logo };
        require('../editor-smart-alignment');
    });

    test('centers selected element inside card', () => {
        const logo = document.getElementById('card-logo');
        expect(window.EditorSmartAlignment.align('center')).toBe(true);
        expect(logo.style.left).toBe('120px');
        expect(logo.style.top).toBe('70px');
    });

    test('snaps selected element to 8px grid', () => {
        const logo = document.getElementById('card-logo');
        window.EditorSmartAlignment.snapSelected(8);
        expect(logo.style.left).toBe('24px');
        expect(logo.style.top).toBe('32px');
    });

    test('toggles grid and safe area overlays', () => {
        const card = document.getElementById('card-front');
        window.EditorSmartAlignment.toggleGrid(true);
        window.EditorSmartAlignment.toggleSafeArea(true);
        expect(card.classList.contains('editor-grid-enabled')).toBe(true);
        expect(card.classList.contains('editor-safe-area-enabled')).toBe(true);
    });
});
