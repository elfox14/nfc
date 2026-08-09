/**
 * @jest-environment jsdom
 */

'use strict';

describe('Editor independent card element layout', () => {
    function rect(left, top, width, height) {
        return {
            left,
            top,
            width,
            height,
            right: left + width,
            bottom: top + height
        };
    }

    beforeEach(() => {
        jest.resetModules();
        delete window.EditorIndependentLayout;
        document.head.innerHTML = '';
        document.body.innerHTML = `
            <div id="card-front-content" class="card-content-layer">
                <div id="card-logo" data-x="0" data-y="0"></div>
                <h1 id="card-name" data-x="0" data-y="0"></h1>
                <h2 id="card-tagline" data-x="0" data-y="0"></h2>
            </div>
            <div id="card-back-content" class="card-content-layer">
                <div id="qr-code-wrapper" data-x="0" data-y="0"></div>
                <div id="social-link-static-website" class="draggable-social-link" data-x="0" data-y="0"></div>
            </div>
        `;

        document.querySelectorAll('.card-content-layer').forEach((card) => {
            card.getBoundingClientRect = () => rect(0, 0, 300, 180);
        });

        const logo = document.getElementById('card-logo');
        const name = document.getElementById('card-name');
        const tagline = document.getElementById('card-tagline');
        const qr = document.getElementById('qr-code-wrapper');
        const social = document.getElementById('social-link-static-website');

        logo.getBoundingClientRect = () => rect(20, 20, 60, 30);
        name.getBoundingClientRect = () => rect(100, 70, 120, 24);
        tagline.getBoundingClientRect = () => rect(100, 105, 120, 20);
        qr.getBoundingClientRect = () => rect(40, 20, 80, 80);
        social.getBoundingClientRect = () => rect(150, 120, 100, 24);

        require('../editor-independent-layout');
    });

    test('normalizes every layer without changing its visual coordinates', () => {
        const logo = document.getElementById('card-logo');
        const name = document.getElementById('card-name');
        const tagline = document.getElementById('card-tagline');

        expect(logo.style.position).toBe('absolute');
        expect(name.style.position).toBe('absolute');
        expect(tagline.style.position).toBe('absolute');
        expect(logo.style.left).toBe('20px');
        expect(logo.style.top).toBe('20px');
        expect(name.style.left).toBe('100px');
        expect(name.style.top).toBe('70px');
        expect(tagline.style.left).toBe('100px');
        expect(tagline.style.top).toBe('105px');
    });

    test('keeps front and back layers independently positioned', () => {
        const frontName = document.getElementById('card-name');
        const backQr = document.getElementById('qr-code-wrapper');
        const backSocial = document.getElementById('social-link-static-website');

        expect(frontName.style.left).toBe('100px');
        expect(backQr.style.left).toBe('40px');
        expect(backSocial.style.left).toBe('150px');
        expect(backSocial.style.top).toBe('120px');
    });

    test('does not rewrite coordinates after an element is moved', () => {
        const name = document.getElementById('card-name');
        name.setAttribute('data-x', '35');
        name.setAttribute('data-y', '-12');
        name.style.transform = 'translate(35px, -12px)';

        window.EditorIndependentLayout.initialize();

        expect(name.style.left).toBe('100px');
        expect(name.style.top).toBe('70px');
        expect(name.getAttribute('data-x')).toBe('35');
        expect(name.getAttribute('data-y')).toBe('-12');
    });

    test('newly rendered layers are normalized independently', () => {
        const card = document.getElementById('card-front-content');
        const newElement = document.createElement('div');
        newElement.id = 'new-card-element';
        newElement.dataset.editorCreated = 'true';
        newElement.dataset.x = '0';
        newElement.dataset.y = '0';
        newElement.getBoundingClientRect = () => rect(180, 30, 50, 25);
        card.appendChild(newElement);

        window.EditorIndependentLayout.initialize();

        expect(newElement.style.position).toBe('absolute');
        expect(newElement.style.left).toBe('180px');
        expect(newElement.style.top).toBe('30px');
    });
});
