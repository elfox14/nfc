/**
 * @jest-environment jsdom
 */

'use strict';

describe('Editor multi select', () => {
    let first;
    let second;
    let third;

    beforeEach(() => {
        jest.resetModules();
        delete window.EditorMultiSelect;
        document.documentElement.lang = 'ar';
        document.body.innerHTML = `
            <div class="pro-layout">
                <div id="editor-context-inspector"><button id="eci-advanced"></button></div>
                <div id="card-front" class="card-face">
                    <div id="first" class="draggable"></div>
                    <div id="second" class="draggable"></div>
                    <div id="third" class="draggable"></div>
                </div>
            </div>
        `;
        first = document.getElementById('first');
        second = document.getElementById('second');
        third = document.getElementById('third');
        document.getElementById('card-front').getBoundingClientRect = () => ({ left: 0, top: 0, width: 300, height: 200, right: 300, bottom: 200 });
        first.getBoundingClientRect = () => ({ left: 10, top: 20, width: 30, height: 20, right: 40, bottom: 40 });
        second.getBoundingClientRect = () => ({ left: 100, top: 60, width: 30, height: 20, right: 130, bottom: 80 });
        third.getBoundingClientRect = () => ({ left: 220, top: 120, width: 30, height: 20, right: 250, bottom: 140 });
        require('../editor-multi-select');
    });

    test('stores unique multi-selection', () => {
        window.EditorMultiSelect.set([first, second, first]);
        expect(window.EditorMultiSelect.getSelected()).toEqual([first, second]);
    });

    test('aligns selected elements to the left edge of their group', () => {
        window.EditorMultiSelect.set([first, second]);
        expect(window.EditorMultiSelect.align('left')).toBe(true);
        expect(first.style.left).toBe('10px');
        expect(second.style.left).toBe('10px');
    });

    test('distributes three selected elements horizontally', () => {
        window.EditorMultiSelect.set([first, second, third]);
        expect(window.EditorMultiSelect.distribute('x')).toBe(true);
        expect(first.style.left).toBe('10px');
        expect(third.style.left).toBe('220px');
        expect(second.style.left).toBe('115px');
    });

    test('groups and ungroups selected elements without moving DOM nodes', () => {
        window.EditorMultiSelect.set([first, second]);
        const groupId = window.EditorMultiSelect.group();
        expect(groupId).toMatch(/^group-/);
        expect(first.dataset.editorGroup).toBe(groupId);
        expect(second.dataset.editorGroup).toBe(groupId);
        expect(first.parentElement.id).toBe('card-front');
        expect(window.EditorMultiSelect.ungroup()).toBe(true);
        expect(first.dataset.editorGroup).toBeUndefined();
    });
});
