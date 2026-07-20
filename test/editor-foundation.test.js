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
        expect(document.querySelectorAll('script[src^="editor-creative-tools.js"]')).toHaveLength(1);
        expect(document.querySelectorAll('script[src="/nfc/editor-logo-fit.js"]')).toHaveLength(1);
        expect(document.querySelectorAll('script[src^="/nfc/editor-default-card.js"]')).toHaveLength(1);
        expect(document.querySelectorAll('script[src^="/nfc/editor-design-loader.js"]')).toHaveLength(1);
        expect(document.querySelectorAll('link[href^="editor-design-system.css"]')).toHaveLength(1);
        expect(document.querySelector('script[src="toolbar-tab-nav.js"]')).toBeNull();
        expect(document.querySelectorAll('style')).toHaveLength(0);
    });

    test('first paint matches the hydrated default card', () => {
        const { document } = loadEditor(file);
        const front = document.getElementById('card-front-content');
        const back = document.getElementById('card-back-content');
        const phone = document.getElementById('phone-default-preview');

        expect(front.querySelector('#qr-code-wrapper')).toBeNull();
        expect(back.querySelector('#qr-code-wrapper')).not.toBeNull();
        expect(document.getElementById('card-name').textContent.trim()).not.toBe('');
        expect(document.getElementById('card-tagline').textContent.trim()).not.toBe('');
        expect(phone.textContent.trim()).toBe('01000000000');
        expect(phone.previousElementSibling.id).toBe('card-tagline');
        expect(document.getElementById('toggle-phone-buttons').checked).toBe(false);
        expect(front.classList.contains('editor-default-front-layout')).toBe(true);
        expect(back.classList.contains('editor-default-back-layout')).toBe(true);
        expect(document.getElementById('editor-default-qr-preview')).not.toBeNull();
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

test('legacy duplicate editor systems and source backups are removed', () => {
    const root = path.join(__dirname, '..');
    const legacyFiles = ['editor-enhancements.js', 'editor-tour.js', 'editor-premium-v2.js'];
    legacyFiles.forEach((file) => expect(fs.existsSync(path.join(root, file))).toBe(false));

    const sourceBackups = fs.readdirSync(root).filter((file) => file.includes('.original.'));
    expect(sourceBackups).toEqual([]);
});
