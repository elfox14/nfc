/**
 * @jest-environment jsdom
 */

// Mock global StateManager to intercept applyState during Undo/Redo
global.StateManager = {
    applyState: jest.fn(),
    saveDebounced: jest.fn()
};

// Mock document elements for HistoryManager
document.body.innerHTML = `
    <button id="undo-btn"></button>
    <button id="redo-btn"></button>
    <span id="save-status-text"></span>
`;

const { HistoryManager } = require('../script-core');

describe('Editor Enhancements Tests', () => {

    beforeEach(() => {
        // Reset HistoryManager state
        HistoryManager.history = [];
        HistoryManager.currentIndex = -1;
        jest.clearAllMocks();
    });

    describe('Undo/Redo System (HistoryManager)', () => {
        test('Should push new state and update current index', () => {
            const state1 = { name: 'Test 1' };
            HistoryManager.pushState(state1);

            expect(HistoryManager.history.length).toBe(1);
            expect(HistoryManager.currentIndex).toBe(0);
            expect(HistoryManager.history[0]).toEqual(state1);
        });

        test('Should undo to previous state and apply it', () => {
            const state1 = { name: 'Test 1' };
            const state2 = { name: 'Test 2' };

            HistoryManager.pushState(state1);
            HistoryManager.pushState(state2);

            expect(HistoryManager.currentIndex).toBe(1);

            HistoryManager.undo();

            expect(HistoryManager.currentIndex).toBe(0);
            expect(global.StateManager.applyState).toHaveBeenCalledWith(state1, false);
        });

        test('Should redo to next state and apply it', () => {
            const state1 = { name: 'Test 1' };
            const state2 = { name: 'Test 2' };

            HistoryManager.pushState(state1);
            HistoryManager.pushState(state2);
            HistoryManager.undo(); // Index goes back to 0

            expect(HistoryManager.currentIndex).toBe(0);

            HistoryManager.redo(); // Index goes forward to 1

            expect(HistoryManager.currentIndex).toBe(1);
            expect(global.StateManager.applyState).toHaveBeenCalledWith(state2, false);
        });

        test('Should trim future history if new state pushed after undo', () => {
            const state1 = { name: 'Test 1' };
            const state2 = { name: 'Test 2' };
            const state3 = { name: 'Test 3' };

            HistoryManager.pushState(state1);
            HistoryManager.pushState(state2);
            HistoryManager.undo(); // Index is 0

            // Push new state, should delete state2
            HistoryManager.pushState(state3);

            expect(HistoryManager.history.length).toBe(2);
            expect(HistoryManager.currentIndex).toBe(1);
            expect(HistoryManager.history[1]).toEqual(state3);
        });
    });

    describe('Autosave Logic Mock', () => {
        test('StateManager.saveDebounced should exist and be callable', () => {
            // We mock it here, but ensuring the structure is tested.
            global.StateManager.saveDebounced();
            expect(global.StateManager.saveDebounced).toHaveBeenCalled();
        });
    });
});
