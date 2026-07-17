/**
 * @jest-environment node
 */

const fs = require('fs');
const path = require('path');
const { JSDOM } = require('jsdom');

const editorFiles = ['editor.html', 'editor-en.html'];
const knownCommands = new Set([
    'card.share',
    'cloud.save',
    'collaboration.start',
    'design.reset',
    'design.save-share',
    'editor.share',
    'export.html',
    'export.pdf',
    'export.png.back',
    'export.png.front',
    'export.qr',
    'export.vcf',
    'gallery.open',
    'gallery.save',
    'theme.toggle'
]);

function loadEditor(file) {
    const source = fs.readFileSync(path.join(__dirname, '..', file), 'utf8');
    return { source, document: new JSDOM(source).window.document };
}

describe.each(editorFiles)('%s foundation', (file) => {
    test('uses unique IDs and one autosave status element', () => {
        const { document } = loadEditor(file);
        const ids = Array.from(document.querySelectorAll('[id]'), (element) => element.id);
        const duplicates = ids.filter((id, index) => ids.indexOf(id) !== index);

        expect(duplicates).toEqual([]);
        expect(document.querySelectorAll('#autosave-indicator')).toHaveLength(1);
    });

    test('loads the shared shell, workspace, layers, validation and Design System exactly once', () => {
        const { document } = loadEditor(file);

        expect(document.querySelectorAll('script[src^="editor-shell.js"]')).toHaveLength(1);
        expect(document.querySelectorAll('script[src^="editor-workspace.js"]')).toHaveLength(1);
        expect(document.querySelectorAll('script[src^="editor-layers.js"]')).toHaveLength(1);
        expect(document.querySelectorAll('script[src^="editor-properties.js"]')).toHaveLength(1);
        expect(document.querySelectorAll('script[src^="editor-validation.js"]')).toHaveLength(1);
        expect(document.querySelectorAll('script[src^="editor-preview.js"]')).toHaveLength(1);
        expect(document.querySelectorAll('link[href^="editor-design-system.css"]')).toHaveLength(1);
        expect(document.querySelector('script[src="toolbar-tab-nav.js"]')).toBeNull();
        expect(document.querySelectorAll('style')).toHaveLength(0);
    });

    test('provides stable inspector targets for the logo and photo', () => {
        const { document } = loadEditor(file);

        expect(document.getElementById('logo-accordion')).not.toBeNull();
        expect(document.getElementById('photo-accordion')).not.toBeNull();
    });

    test('uses named commands instead of legacy trigger proxies', () => {
        const { document } = loadEditor(file);
        const triggers = Array.from(document.querySelectorAll('[data-editor-command]'));

        expect(document.querySelector('[data-trigger-id]')).toBeNull();
        expect(triggers.length).toBeGreaterThan(10);
        triggers.forEach((trigger) => {
            expect(knownCommands.has(trigger.dataset.editorCommand)).toBe(true);
        });
    });

    test('connects menu and mobile tab accessibility attributes', () => {
        const { document } = loadEditor(file);

        document.querySelectorAll('[aria-controls]').forEach((trigger) => {
            expect(document.getElementById(trigger.getAttribute('aria-controls'))).not.toBeNull();
        });
        document.querySelectorAll('.mobile-nav-item[data-target]').forEach((trigger) => {
            expect(document.getElementById(trigger.dataset.target)).not.toBeNull();
        });
    });
});

test('legacy enhancement boot no longer starts duplicate save, shortcut or mobile command systems', () => {
    const source = fs.readFileSync(path.join(__dirname, '..', 'editor-enhancements.original.js'), 'utf8');
    const initializer = source.slice(
        source.indexOf('function initEditorEnhancements()'),
        source.indexOf('// ===========================================\n    // BEFORE / AFTER')
    );

    expect(initializer).not.toMatch(/initAutoSave\s*\(/);
    expect(initializer).not.toMatch(/initAutoSaveIndicator\s*\(/);
    expect(initializer).not.toMatch(/initKeyboardShortcuts\s*\(/);
    expect(initializer).not.toMatch(/createMobileBottomToolbar\s*\(/);
    expect(initializer).not.toMatch(/initMoreMenu\s*\(/);
});
