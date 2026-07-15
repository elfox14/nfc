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

    function rowFor(id) {
        return Array.from(document.querySelectorAll('.elp-row')).find((item) => item.textContent.includes(id));
    }

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
        rowFor('card-logo').querySelector('[data-layer-action="visibility"]').click();
        expect(document.getElementById('card-logo').style.display).toBe('none');
        rowFor('card-logo').querySelector('[data-layer-action="visibility"]').click();
        expect(document.getElementById('card-logo').style.display).toBe('');
    });

    test('locks and unlocks a layer', () => {
        rowFor('card-name').querySelector('[data-layer-action="lock"]').click();
        expect(document.getElementById('card-name').dataset.editorLayerLocked).toBe('true');
        rowFor('card-name').querySelector('[data-layer-action="lock"]').click();
        expect(document.getElementById('card-name').dataset.editorLayerLocked).toBeUndefined();
    });

    test('changes safe stacking order with z-index', () => {
        rowFor('card-qr').querySelector('[data-layer-action="forward"]').click();
        expect(document.getElementById('card-qr').style.zIndex).toBe('2');
        rowFor('card-qr').querySelector('[data-layer-action="backward"]').click();
        expect(document.getElementById('card-qr').style.zIndex).toBe('1');
    });
});
