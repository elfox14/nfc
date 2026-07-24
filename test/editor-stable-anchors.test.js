/**
 * @jest-environment node
 */

'use strict';

const fs = require('fs');
const path = require('path');

describe('Editor stable card anchors', () => {
    const source = fs.readFileSync(path.join(__dirname, '..', 'script-card.original.js'), 'utf8');

    test('serializes normalized card-relative anchors with the legacy positions', () => {
        expect(source).toContain('anchors: {}');
        expect(source).toContain('state.anchors[id] = {');
        expect(source).toContain('elementRect.left + elementRect.width / 2');
        expect(source).toContain('elementRect.top + elementRect.height / 2');
    });

    test('restores geometry after rendering and activating the saved layout', () => {
        const applyStateStart = source.indexOf('applyState(state, triggerSave = true)');
        const applyStateEnd = source.indexOf('\n    reset() {', applyStateStart);
        const applyState = source.slice(applyStateStart, applyStateEnd);
        const renderIndex = applyState.indexOf('CardManager.renderCardContent(state);');
        const layoutIndex = applyState.indexOf("CardManager.applyLayout(state.inputs['layout-select-visual']);");
        const restoreIndex = applyState.indexOf('this.restoreGeometry(state);');

        expect(renderIndex).toBeGreaterThan(-1);
        expect(layoutIndex).toBeGreaterThan(renderIndex);
        expect(restoreIndex).toBeGreaterThan(layoutIndex);
    });

    test('reapplies stable anchors after layout and asynchronous logo loading settle', () => {
        expect(source).toContain('requestAnimationFrame(() => this.applyStoredAnchors(state.anchors));');
        expect(source).toContain("logoImg.addEventListener('load', () => this.applyStoredAnchors(state.anchors), { once: true });");
    });
});
