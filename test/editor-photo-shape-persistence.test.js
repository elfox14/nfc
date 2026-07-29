/**
 * @jest-environment jsdom
 */

'use strict';

const fs = require('fs');
const path = require('path');

function read(file) {
    return fs.readFileSync(path.join(__dirname, '..', file), 'utf8');
}

describe('Saved personal photo shape restoration', () => {
    beforeEach(() => {
        jest.useFakeTimers();
        jest.resetModules();
        document.body.innerHTML = `
            <div id="photo-shape-group">
                <label class="lp-align-btn lp-align-active">
                    <input type="radio" name="photo-shape" value="circle" checked>
                </label>
                <label class="lp-align-btn">
                    <input type="radio" name="photo-shape" value="rounded">
                </label>
                <label class="lp-align-btn">
                    <input type="radio" name="photo-shape" value="square">
                </label>
                <label class="lp-align-btn">
                    <input type="radio" name="photo-shape" value="hexagon">
                </label>
            </div>
            <div id="card-personal-photo-wrapper"></div>
            <div id="card-personal-photo"></div>
            <img id="card-personal-photo-img">
        `;

        require('../editor-panels.original');
        document.dispatchEvent(new Event('DOMContentLoaded'));
    });

    afterEach(() => {
        jest.clearAllTimers();
        jest.useRealTimers();
        delete window.lpSetBg;
        delete window.lpSetBorderColor;
    });

    test('unchecked restore events cannot replace the saved circle with hexagon', () => {
        const radios = [...document.querySelectorAll('input[name="photo-shape"]')];

        // StateManager.applyState currently emits these events for every radio.
        radios.forEach((radio) => radio.dispatchEvent(new Event('change', { bubbles: true })));

        const wrapper = document.getElementById('card-personal-photo-wrapper');
        expect(wrapper.style.borderRadius).toBe('50%');
        expect(wrapper.style.clipPath).toBe('none');

        const activeLabel = document.querySelector('#photo-shape-group .lp-align-active');
        expect(activeLabel.querySelector('input').value).toBe('circle');
    });

    test('the card style manager resets both radius and clip path from the saved shape', () => {
        const source = read('script-card.original.js');

        expect(source).toContain("clipPath: 'none'");
        expect(source).toContain("wrapper.style.borderRadius = selectedShape.borderRadius;");
        expect(source).toContain("wrapper.style.clipPath = selectedShape.clipPath;");
        expect(source).toContain("preview.style.clipPath = selectedShape.clipPath;");
    });

    test('both editor languages use fresh photo-shape assets', () => {
        ['editor.html', 'editor-en.html'].forEach((file) => {
            const html = read(file);
            expect(html).toContain('script-card.js?v=2.4');
            expect(html).toContain('editor-panels.js?v=1.2');
        });
    });
});
