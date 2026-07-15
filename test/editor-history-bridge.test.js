/**
 * @jest-environment jsdom
 */
'use strict';

describe('Editor history bridge', () => {
    beforeEach(() => {
        jest.useFakeTimers();
        document.body.innerHTML = '<div class="card-face" id="card-front"><div id="item" style="position:absolute;left:10px;top:20px"></div></div>';
        global.HistoryManager = { history: [], currentIndex: -1, pushState: jest.fn(function (state) { this.history.push(state); this.currentIndex = this.history.length - 1; }) };
        global.StateManager = {
            getStateObject: jest.fn(() => ({ inputs: { name: 'x' } })),
            applyState: jest.fn(),
            saveDebounced: jest.fn()
        };
        jest.resetModules();
        require('../editor-history-bridge');
        document.dispatchEvent(new Event('DOMContentLoaded'));
        jest.runOnlyPendingTimers();
    });

    afterEach(() => {
        jest.useRealTimers();
        delete global.EditorHistoryBridge;
        delete global.HistoryManager;
        delete global.StateManager;
    });

    test('commits extended state and autosaves after editor mutation', () => {
        document.getElementById('item').style.left = '42px';
        document.dispatchEvent(new CustomEvent('editor:elementaligned', { detail: { element: document.getElementById('item') } }));
        jest.advanceTimersByTime(150);
        expect(global.HistoryManager.pushState).toHaveBeenCalled();
        expect(global.StateManager.saveDebounced).toHaveBeenCalled();
        const snapshot = global.HistoryManager.pushState.mock.calls.at(-1)[0];
        expect(snapshot.editorExtensions.elements.some((entry) => entry.key === '#item')).toBe(true);
    });

    test('restores created nodes from an extension snapshot', () => {
        const extension = {
            version: 1,
            elements: [{
                key: '[data-editor-history-key="new-node"]',
                parent: '#card-front',
                html: '<div data-editor-created="true" data-editor-history-key="new-node" id="copy"></div>',
                style: 'position:absolute;left:22px',
                hidden: null,
                locked: null,
                group: 'group-1',
                created: true
            }]
        };
        global.EditorHistoryBridge.restore(extension);
        expect(document.getElementById('copy')).not.toBeNull();
        expect(document.getElementById('copy').dataset.editorGroup).toBe('group-1');
    });
});
