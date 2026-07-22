/**
 * @jest-environment jsdom
 */
'use strict';

describe('Editor smart validation', () => {
    beforeEach(() => {
        jest.resetModules();
        delete window.EditorSmartValidation;
        document.documentElement.lang = 'en';
        document.body.innerHTML = `
            <div id="editor-context-inspector"><button id="eci-advanced"></button></div>
            <input id="input-name_en" value="">
            <input id="input-website" type="url" value="not a url">
            <input id="input-qr-url" value="bad url">
            <input id="input-static-website-color" type="color" value="#e6f0f7">
            <input id="input-static-facebook-color" type="color" value="#e6f0f7">
            <input id="input-static-linkedin-color" type="color" value="#e6f0f7">
            <select id="qr-source"><option value="custom" selected>custom</option></select>
            <input id="name-color" value="#777777">
            <input id="front-bg-start" value="#777777">
            <div id="card-front" class="card-face">
                <div id="qr-code-wrapper" class="draggable"></div>
                <div id="card-name" class="draggable"></div>
            </div>
        `;
        document.getElementById('card-front').getBoundingClientRect = () => ({ left: 0, top: 0, right: 340, bottom: 200, width: 340, height: 200 });
        document.getElementById('qr-code-wrapper').getBoundingClientRect = () => ({ left: 10, top: 10, right: 60, bottom: 60, width: 50, height: 50 });
        document.getElementById('card-name').getBoundingClientRect = () => ({ left: 2, top: 2, right: 100, bottom: 30, width: 98, height: 28 });
        require('../editor-smart-validation');
    });

    test('detects missing name and invalid links', () => {
        const issues = window.EditorSmartValidation.run();
        expect(issues.some((entry) => entry.code === 'missing-name')).toBe(true);
        expect(issues.some((entry) => entry.code === 'invalid-link')).toBe(true);
        expect(issues.some((entry) => entry.code === 'qr-invalid')).toBe(true);
        expect(issues.filter((entry) => entry.code === 'invalid-link')).toHaveLength(1);
        expect(issues.some((entry) => /static-(website|facebook|linkedin)-color/.test(entry.target || ''))).toBe(false);
    });

    test('detects small QR and unsafe placement', () => {
        const issues = window.EditorSmartValidation.run();
        expect(issues.some((entry) => entry.code === 'qr-small')).toBe(true);
        expect(issues.some((entry) => entry.code === 'outside-safe-area')).toBe(true);
    });

    test('calculates contrast ratios', () => {
        expect(window.EditorSmartValidation.contrast('#000000', '#ffffff')).toBeGreaterThan(20);
        expect(window.EditorSmartValidation.contrast('#777777', '#777777')).toBe(1);
    });

    test('renders a validation report in the inspector', () => {
        window.EditorSmartValidation.run();
        expect(document.querySelectorAll('.esv-result').length).toBeGreaterThan(0);
    });
});
