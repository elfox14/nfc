/**
 * @jest-environment jsdom
 */

'use strict';

describe('Editor smart snap', () => {
    let card;
    let item;

    beforeAll(() => {
        document.body.innerHTML = `
            <div id="card-front" class="card-face">
                <div id="item" class="draggable"></div>
                <div id="peer" class="draggable"></div>
            </div>
        `;

        card = document.getElementById('card-front');
        item = document.getElementById('item');
        const peer = document.getElementById('peer');

        card.getBoundingClientRect = () => ({ left: 0, top: 0, right: 300, bottom: 180, width: 300, height: 180 });
        item.getBoundingClientRect = () => ({ left: 126, top: 78, right: 176, bottom: 108, width: 50, height: 30 });
        peer.getBoundingClientRect = () => ({ left: 20, top: 20, right: 70, bottom: 50, width: 50, height: 30 });

        jest.resetModules();
        require('../editor-smart-snap');
    });

    test('resolves snapping to the card center', () => {
        const result = window.EditorSmartSnap.resolve(item);
        expect(result.snappedX).toBe(true);
        expect(result.snappedY).toBe(true);
        expect(result.left).toBe(125);
        expect(result.top).toBe(75);
    });

    test('applies snapped coordinates', () => {
        window.EditorSmartSnap.apply(item);
        expect(item.style.left).toBe('125px');
        expect(item.style.top).toBe('75px');
    });

    test('does not select locked layers for pointer snapping', () => {
        item.dataset.editorLayerLocked = 'true';
        const event = new Event('pointerdown', { bubbles: true });
        item.dispatchEvent(event);
        expect(document.querySelector('.editor-snap-guide')).toBeNull();
        delete item.dataset.editorLayerLocked;
    });

    test('allows changing the snap threshold', () => {
        expect(() => window.EditorSmartSnap.setThreshold(10)).not.toThrow();
    });
});
