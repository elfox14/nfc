/**
 * @jest-environment node
 */

'use strict';

const fs = require('fs');
const path = require('path');

describe('Editor published-state contract', () => {
    const source = fs.readFileSync(path.join(__dirname, '..', 'script-main.original.js'), 'utf8');
    const editorAr = fs.readFileSync(path.join(__dirname, '..', 'editor.html'), 'utf8');
    const editorEn = fs.readFileSync(path.join(__dirname, '..', 'editor-en.html'), 'utf8');

    test('publishing snapshots the exact state used for both captured faces', () => {
        expect(source).toContain('shareState.publishedState = this.createPublishedState(shareState);');
        expect(source.indexOf('shareState.imageUrls.capturedBack = backImageUrl;'))
            .toBeLessThan(source.indexOf('shareState.publishedState = this.createPublishedState(shareState);'));
        expect(source.indexOf('shareState.publishedState = this.createPublishedState(shareState);'))
            .toBeLessThan(source.indexOf('const designId = await this.saveDesign(shareState);'));
    });

    test('dashboard edit restores the published revision by default', () => {
        expect(source).toContain("const wantsDraft = params.get('mode') === 'draft';");
        expect(source).toContain('const state = !wantsDraft && hasPublishedState');
        expect(source).toContain('? storedState.publishedState');
    });

    test('shared editor links explicitly request the draft revision', () => {
        expect(source).toContain("editorUrl.searchParams.set('mode', 'draft');");
    });

    test('both editor languages load the cache-busted implementation', () => {
        expect(editorAr).toContain('script-main.js?v=2.3');
        expect(editorEn).toContain('script-main.js?v=2.3');
    });
});
