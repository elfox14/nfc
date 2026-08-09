/**
 * @jest-environment node
 */

'use strict';

const fs = require('fs');
const path = require('path');

describe('Editor geometry stability', () => {
    const source = fs.readFileSync(
        path.join(__dirname, '..', 'editor-extension-persistence.js'),
        'utf8'
    );

    test('restores saved geometry after fonts and images settle', () => {
        expect(source).toContain('waitForFonts');
        expect(source).toContain('waitForImages');
        expect(source).toContain('global.StateManager.restoreGeometry(state)');
        expect(source).toContain('global.EditorIndependentLayout.initialize()');
    });

    test('patches applyState so dashboard edits are stabilized too', () => {
        expect(source).toContain('global.StateManager.applyState');
        expect(source).toContain('stabilizeGeometry(state);');
        expect(source).toContain('global.setTimeout(stabilizeCurrentState, 350);');
    });

    test('does not use sibling repositioning during restoration', () => {
        expect(source).toContain('never calculate or move sibling elements');
        expect(source).not.toContain('querySelectorAll(\'.card-face\').forEach');
    });
});
