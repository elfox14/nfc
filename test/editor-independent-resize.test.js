/**
 * @jest-environment jsdom
 */

'use strict';

const fs = require('fs');
const path = require('path');

describe('Editor independent card layer resizing', () => {
    function rect(left, top, width, height) {
        return {
            left: left,
            top: top,
            width: width,
            height: height,
            right: left + width,
            bottom: top + height
        };
    }

    function translatedRect(element, base) {
        var x = parseFloat(element.getAttribute('data-x')) || 0;
        var y = parseFloat(element.getAttribute('data-y')) || 0;
        return rect(base.left + x, base.top + y, base.width, base.height);
    }

    beforeEach(() => {
        jest.resetModules();
        delete window.EditorIndependentResize;
        document.head.innerHTML = '';
        document.body.innerHTML = `
            <div id="card-front-content" class="card-content-layer">
                <h1 id="card-name" data-x="0" data-y="0"></h1>
                <h2 id="card-tagline" data-x="0" data-y="0"></h2>
            </div>
            <div id="card-back-content" class="card-content-layer">
                <div id="qr-code-wrapper" data-x="0" data-y="0"></div>
                <div id="social-link-static-website" class="draggable-social-link" data-x="0" data-y="0"></div>
            </div>
        `;

        document.getElementById('card-front-content').getBoundingClientRect =
            () => rect(0, 0, 300, 180);
        document.getElementById('card-back-content').getBoundingClientRect =
            () => rect(0, 220, 300, 180);

        require('../editor-independent-resize');
    });

    test('keeps the resized layer centered and leaves its sibling in place', () => {
        var name = document.getElementById('card-name');
        var tagline = document.getElementById('card-tagline');
        var phase = 'before';

        name.getBoundingClientRect = () => translatedRect(
            name,
            phase === 'before' ? rect(100, 40, 100, 20) : rect(90, 40, 120, 40)
        );
        tagline.getBoundingClientRect = () => translatedRect(
            tagline,
            phase === 'before' ? rect(120, 80, 60, 20) : rect(120, 100, 60, 20)
        );

        var snapshot = window.EditorIndependentResize.capture();
        phase = 'after';
        var result = window.EditorIndependentResize.reconcile(snapshot);

        expect(name.getAttribute('data-x')).toBe('0');
        expect(name.getAttribute('data-y')).toBe('-10');
        expect(tagline.getAttribute('data-x')).toBe('0');
        expect(tagline.getAttribute('data-y')).toBe('-20');
        expect(result.resized).toEqual(['card-name']);
        expect(result.adjusted).toEqual(expect.arrayContaining(['card-name', 'card-tagline']));
    });

    test('handles both card faces in the same resize operation', () => {
        var qr = document.getElementById('qr-code-wrapper');
        var social = document.getElementById('social-link-static-website');
        var phase = 'before';

        qr.getBoundingClientRect = () => translatedRect(
            qr,
            phase === 'before' ? rect(110, 250, 80, 80) : rect(100, 240, 100, 100)
        );
        social.getBoundingClientRect = () => translatedRect(
            social,
            phase === 'before' ? rect(105, 350, 90, 24) : rect(105, 370, 90, 24)
        );

        var snapshot = window.EditorIndependentResize.capture();
        phase = 'after';
        window.EditorIndependentResize.reconcile(snapshot);

        expect(qr.getAttribute('data-x')).toBe('0');
        expect(qr.getAttribute('data-y')).toBe('0');
        expect(social.getAttribute('data-y')).toBe('-20');
    });

    test('matches a dynamically re-rendered layer by card face and id', () => {
        var social = document.getElementById('social-link-static-website');
        social.getBoundingClientRect = () => translatedRect(social, rect(105, 350, 90, 24));
        var snapshot = window.EditorIndependentResize.capture();

        var replacement = social.cloneNode(true);
        replacement.getBoundingClientRect = () => translatedRect(replacement, rect(105, 372, 90, 24));
        social.replaceWith(replacement);

        window.EditorIndependentResize.reconcile(snapshot);
        expect(replacement.getAttribute('data-y')).toBe('-22');
    });

    test('supports newly created custom layers without an id', () => {
        var custom = document.createElement('div');
        custom.dataset.editorCreated = 'true';
        custom.setAttribute('data-x', '0');
        custom.setAttribute('data-y', '0');
        custom.getBoundingClientRect = () => translatedRect(custom, rect(30, 120, 40, 20));
        document.getElementById('card-front-content').appendChild(custom);

        var snapshot = window.EditorIndependentResize.capture();
        expect(custom.dataset.independentResizeKey).toMatch(/^layer-/);
        expect(snapshot.size).toBeGreaterThan(0);
    });

    test('keeps an enlarged layer inside its card without moving other layers', () => {
        var name = document.getElementById('card-name');
        var tagline = document.getElementById('card-tagline');
        var phase = 'before';

        name.getBoundingClientRect = () => translatedRect(
            name,
            phase === 'before' ? rect(240, 40, 50, 20) : rect(240, 40, 100, 20)
        );
        tagline.getBoundingClientRect = () => translatedRect(tagline, rect(80, 100, 80, 20));

        var snapshot = window.EditorIndependentResize.capture();
        phase = 'after';
        window.EditorIndependentResize.reconcile(snapshot);

        expect(parseFloat(name.getAttribute('data-x'))).toBe(-40);
        expect(tagline.getAttribute('data-x')).toBe('0');
        expect(tagline.getAttribute('data-y')).toBe('0');
    });

    test('converts viewport movement into local card coordinates when the canvas is scaled', () => {
        var card = document.getElementById('card-front-content');
        var name = document.getElementById('card-name');
        var phase = 'before';

        Object.defineProperty(card, 'offsetWidth', { configurable: true, value: 600 });
        Object.defineProperty(card, 'offsetHeight', { configurable: true, value: 360 });
        card.getBoundingClientRect = () => rect(0, 0, 300, 180);
        name.getBoundingClientRect = () => {
            var localY = parseFloat(name.getAttribute('data-y')) || 0;
            var base = phase === 'before' ? rect(100, 60, 100, 20) : rect(100, 40, 100, 20);
            return rect(base.left, base.top + localY * 0.5, base.width, base.height);
        };

        var snapshot = window.EditorIndependentResize.capture();
        phase = 'after';
        window.EditorIndependentResize.reconcile(snapshot);

        expect(name.getAttribute('data-y')).toBe('40');
        expect(window.EditorIndependentResize.viewportScale(name)).toEqual({ x: 0.5, y: 0.5 });
    });

    test('installs once and emits one history mutation per reconciliation', () => {
        var name = document.getElementById('card-name');
        var phase = 'before';
        name.getBoundingClientRect = () => translatedRect(
            name,
            phase === 'before' ? rect(100, 40, 100, 20) : rect(90, 40, 120, 20)
        );
        var mutation = jest.fn();
        document.addEventListener('editor:commandmutation', mutation);

        var snapshot = window.EditorIndependentResize.capture();
        phase = 'after';
        window.EditorIndependentResize.reconcile(snapshot);

        expect(document.querySelectorAll('#editor-independent-resize-css')).toHaveLength(1);
        expect(mutation).toHaveBeenCalledTimes(1);
        expect(mutation.mock.calls[0][0].detail.action).toBe('independent-resize');
    });

    test('disables geometry transitions on the logo image itself', () => {
        var styles = document.getElementById('editor-independent-resize-css').textContent;
        expect(styles).toContain('#card-logo #card-logo-img');
        expect(styles).toContain('#card-logo .logo-front');
    });

    test.each(['editor.html', 'editor-en.html'])('loads the fresh controller directly in %s', (file) => {
        var html = fs.readFileSync(path.join(__dirname, '..', file), 'utf8');
        expect((html.match(/editor-independent-resize\.js\?v=1\.2/g) || [])).toHaveLength(1);
        expect((html.match(/editor-extension-persistence\.js\?v=1\.1/g) || [])).toHaveLength(1);
        expect((html.match(/script-card\.js\?v=2\.3/g) || [])).toHaveLength(1);
    });
});
