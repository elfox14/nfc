/**
 * @jest-environment jsdom
 */

'use strict';

describe('Editor command surface', () => {
    let item;

    beforeEach(() => {
        jest.resetModules();
        delete window.EditorCommandSurface;
        document.body.innerHTML = `
            <div class="card-face" id="card-front">
                <div id="card-name" class="draggable" style="position:absolute;left:10px;top:20px;z-index:2">Name</div>
            </div>
        `;
        item = document.getElementById('card-name');
        window.EditorContextInspector = {
            getSelected: jest.fn(() => item),
            select: jest.fn()
        };
        window.EditorMultiSelect = {
            getSelected: jest.fn(() => []),
            clear: jest.fn(),
            set: jest.fn(),
            group: jest.fn(() => 'group-1'),
            ungroup: jest.fn(() => true)
        };
        window.EditorLayersPanel = { refresh: jest.fn() };
        require('../editor-command-surface');
    });

    test('duplicates the selected element with an offset', () => {
        expect(window.EditorCommandSurface.duplicate()).toBe(true);
        const clone = document.querySelector('[id^="card-name-copy-"]');
        expect(clone).not.toBeNull();
        expect(clone.style.left).toBe('22px');
        expect(clone.style.top).toBe('32px');
        expect(clone.dataset.editorCreated).toBe('true');
    });

    test('soft-deletes an unlocked original element for undo support', () => {
        expect(window.EditorCommandSurface.remove()).toBe(true);
        expect(document.getElementById('card-name')).not.toBeNull();
        expect(item.dataset.editorDeleted).toBe('true');
        expect(item.style.display).toBe('none');
    });

    test('does not remove a locked element', () => {
        item.dataset.editorLayerLocked = 'true';
        expect(window.EditorCommandSurface.remove()).toBe(false);
        expect(document.getElementById('card-name')).not.toBeNull();
        expect(item.dataset.editorDeleted).toBeUndefined();
    });

    test('opens a contextual menu inside the viewport', () => {
        window.EditorCommandSurface.showMenu(40, 60);
        const menu = document.getElementById('editor-context-menu');
        expect(menu).not.toBeNull();
        expect(menu.style.display).toBe('block');
        expect(menu.querySelector('[data-surface-action="duplicate"]')).not.toBeNull();
    });
});
