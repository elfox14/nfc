/**
 * @jest-environment jsdom
 */

'use strict';

describe('Editor layers panel', () => {
    beforeAll(() => {
        jest.useFakeTimers();
        document.documentElement.lang = 'ar';
        document.body.innerHTML = `
            <div class="pro-layout">
                <aside id="editor-context-inspector"></aside>
                <div id="card-front" class="card-face">
                    <div id="card-logo" class="draggable"><img id="card-logo-img"></div>
                    <div id="card-name" class="draggable">Mahmoud</div>
                    <div id="card-qr" class="draggable"></div>
                </div>
            </div>
        `;

        window.EditorContextInspector = {
            select: jest.fn((element) => {
                document.dispatchEvent(new CustomEvent('editor:selectionchange', { detail: { element } }));
            })
        };

        jest.resetModules();
        require('../editor-layers-panel');
        document.dispatchEvent(new Event('DOMContentLoaded'));
        jest.runOnlyPendingTimers();
    });

    afterAll(() => {
        jest.useRealTimers();
    });

    test('discovers core card layers', () => {
        const rows = document.querySelectorAll('.elp-row');
        expect(rows.length).toBeGreaterThanOrEqual(3);
        expect(document.getElementById('editor-layers-panel')).not.toBeNull();
    });

    test('selects a layer through the inspector API', () => {
        document.querySelector('.elp-select').click();
        expect(window.EditorContextInspector.select).toHaveBeenCalled();
    });

    test('toggles layer visibility', () => {
        const row = Array.from(document.querySelectorAll('.elp-row')).find((item) => item.textContent.includes('card-logo'));
        const button = row.querySelector('[data-layer-action="visibility"]');
        button.click();
        expect(document.getElementById('card-logo').style.display).toBe('none');
        button.click();
        expect(document.getElementById('card-logo').style.display).toBe('');
    });

    test('locks and unlocks a layer', () => {
        const row = Array.from(document.querySelectorAll('.elp-row')).find((item) => item.textContent.includes('card-name'));
        const button = row.querySelector('[data-layer-action="lock"]');
        button.click();
        expect(document.getElementById('card-name').dataset.editorLayerLocked).toBe('true');
        button.click();
        expect(document.getElementById('card-name').dataset.editorLayerLocked).toBeUndefined();
    });

    test('changes safe stacking order with z-index', () => {
        const row = Array.from(document.querySelectorAll('.elp-row')).find((item) => item.textContent.includes('card-qr'));
        row.querySelector('[data-layer-action="forward"]').click();
        expect(document.getElementById('card-qr').style.zIndex).toBe('2');
        row.querySelector('[data-layer-action="backward"]').click();
        expect(document.getElementById('card-qr').style.zIndex).toBe('1');
    });
});
