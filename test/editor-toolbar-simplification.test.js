'use strict';

const fs = require('fs');
const path = require('path');

function read(file) {
    return fs.readFileSync(path.join(__dirname, '..', file), 'utf8');
}

describe.each(['editor.html', 'editor-en.html'])('%s streamlined editor', (file) => {
    test('does not load either onboarding tour', () => {
        const html = read(file);
        expect(html).not.toContain('shepherd.js');
        expect(html).not.toContain('editor-tour.js');
    });

    test('removes More while retaining the primary command surfaces', () => {
        const html = read(file);
        expect(html).not.toContain('id="toolbar-more-btn"');
        expect(html).not.toContain('id="toolbar-more-menu"');
        expect(html).not.toContain('id="toolbar-more-menu-floating"');
        expect(html).toContain('id="tools-menu-btn"');
        expect(html).toContain('id="download-options-btn"');
        expect(html).toContain('id="save-share-btn"');
    });

    test('keeps reset available and removes only the Modern layout option', () => {
        const html = read(file);
        expect(html).toContain('id="reset-design-btn"');
        expect(html).toContain('data-trigger-id="reset-design-btn"');
        expect(html).toContain('name="layout-select-visual" value="classic"');
        expect(html).toContain('name="layout-select-visual" value="vertical"');
        expect(html).not.toContain('name="layout-select-visual" value="modern"');
    });
});

test('legacy tour implementations and startup hooks are removed', () => {
    expect(read('script-ui.original.js')).not.toContain('TourManager');
    expect(read('script-main.original.js')).not.toContain('TourManager.init()');
    expect(read('mobile.original.js')).not.toContain('configureTourSteps');
});

test('reset clears the saved-design identity before loading defaults', () => {
    const source = read('script-card.original.js');
    const resetStart = source.indexOf('\n    reset() {');
    const resetEnd = source.indexOf('\n    saveDebounced:', resetStart);
    const reset = source.slice(resetStart, resetEnd);

    expect(reset).toContain("localStorage.removeItem(Config.LOCAL_STORAGE_KEY)");
    expect(reset).toContain("localStorage.removeItem('nfc:editingDesignId')");
    expect(reset).toContain("localStorage.removeItem('mcprime_editor_extensions_v1')");
    expect(reset).toContain('Config.currentDesignId = null');
    expect(reset).toContain("window.history.replaceState({}, '', window.location.pathname)");
    expect(reset).toContain('window.location.reload()');
});

test('old Modern designs safely fall back to Classic', () => {
    const source = read('script-card.original.js');
    expect(source).toContain("const supportedLayout = layoutName === 'vertical' ? 'vertical' : 'classic'");
    expect(source).toContain("value === 'modern'");
    expect(read('style.original.css')).toMatch(/\.layout-selector-grid\s*\{[^}]*grid-template-columns:\s*repeat\(2,\s*1fr\)/);
});
