/**
 * @jest-environment node
 */

'use strict';

const fs = require('fs');
const path = require('path');

describe('Default card layout', () => {
    const css = fs.readFileSync(
        path.join(__dirname, '..', 'editor-default-card.css'),
        'utf8'
    );
    const persistence = fs.readFileSync(
        path.join(__dirname, '..', 'editor-extension-persistence.js'),
        'utf8'
    );

    test('centers the default front face without changing saved designs', () => {
        expect(css).toContain('.card-front-content-layer.editor-default-front-layout');
        expect(css).toContain('justify-content: center');
        expect(css).toContain('align-items: center');
        expect(css).toContain('.phone-button-draggable-wrapper');
    });

    test('centers the default back-face QR independently', () => {
        expect(css).toContain('.card-back-content-layer.editor-default-back-layout');
        expect(css).toContain('place-items: center');
        expect(css).toContain('#qr-code-wrapper');
    });

    test('does not apply the default layout to remote or local saved designs', () => {
        expect(persistence).toContain("params.get('id') || params.get('collabId')");
        expect(persistence).toContain('hasSavedLocalDesign');
        expect(persistence).toContain('!hasRemoteDesign && !hasSavedLocalDesign()');
    });
});
