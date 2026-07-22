/**
 * @jest-environment jsdom
 */

'use strict';

const fs = require('fs');
const path = require('path');

function read(file) {
    return fs.readFileSync(path.join(__dirname, '..', file), 'utf8');
}

function toolbarScript(html) {
    const match = html.match(/<script>\s*\/\/ ── Toolbar Dropdowns:[\s\S]*?<\/script>/);
    if (!match) throw new Error('Toolbar dropdown script was not found');
    return match[0].replace(/^<script>|<\/script>$/g, '');
}

describe.each(['editor.html', 'editor-en.html'])('%s more menu', (file) => {
    test('is closed by default and uses a fresh asset version', () => {
        const html = read(file);
        expect(html).toMatch(/id="toolbar-more-menu-floating"[^>]*\shidden(?:\s|>)/);
        expect(html).toContain('aria-hidden="true"');
        expect(html).toContain('aria-controls="toolbar-more-menu-floating"');
        expect(html).toContain('toolbar-enhancements.css?v=4.3');
        expect(html).toContain('editor-panels.js?v=1.1');
        expect(html).toContain('editor-toolbar-v2.css?v=1.1');
        expect(html).toContain('editor-toolbar-v2.js?v=1.0');
        expect(html).not.toContain("moreMenu.classList.toggle('show')");
    });

    test('keeps save and download commands available in the three-dots menu', () => {
        const html = read(file);
        [
            'save-share-btn-menu',
            'download-png-front-menu',
            'download-png-back-menu',
            'download-pdf-menu',
            'download-vcf-menu',
            'download-qrcode-menu'
        ].forEach((id) => expect(html).toContain(`id="${id}"`));
    });

    test('renders the professional title, face switch and zoom controls exactly once', () => {
        const html = read(file);
        [
            'toolbar-design-title',
            'toolbar-face-front',
            'toolbar-face-back',
            'toolbar-zoom-out',
            'toolbar-zoom-value',
            'toolbar-zoom-in'
        ].forEach((id) => {
            const exactId = new RegExp(`(?:^|\\s)id="${id}"`, 'g');
            expect(html.match(exactId)).toHaveLength(1);
        });
        expect(html).toContain('data-toolbar-language-target');
        expect(html).toContain('id="preview-mode-btn-menu"');
    });

    test('keeps the editor guide available when desktop tools collapse', () => {
        const html = read(file);
        expect(html).toMatch(/href="how-to-use-editor(?:-en)?\.html"[^>]*class="menu-item-link"/);
    });

});

test('more menu opens only from the trigger and closes from outside or Escape', () => {
    document.body.innerHTML = `
        <button id="toolbar-more-btn" aria-expanded="false"></button>
        <div id="toolbar-more-menu-floating" hidden aria-hidden="true">
            <button type="button">Action</button>
        </div>
    `;

    Function(toolbarScript(read('editor.html')))();
    document.dispatchEvent(new Event('DOMContentLoaded'));

    const trigger = document.getElementById('toolbar-more-btn');
    const menu = document.getElementById('toolbar-more-menu-floating');
    expect(menu.hidden).toBe(true);

    trigger.click();
    expect(menu.hidden).toBe(false);
    expect(menu.classList.contains('open')).toBe(true);
    expect(trigger.getAttribute('aria-expanded')).toBe('true');

    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    expect(menu.hidden).toBe(true);

    trigger.click();
    document.body.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    expect(menu.hidden).toBe(true);
});

test('context inspector stays off-layout while extension modules remain available', () => {
    expect(read('editor-panels.js')).toContain('editor-context-inspector.js?v=1.1');
    expect(read('editor-context-inspector.js')).toContain("inspector.hidden = true");
});

test('closed floating menu is excluded from layout even if other styles set display', () => {
    expect(read('toolbar-enhancements.original.css')).toMatch(
        /#toolbar-more-menu-floating\[hidden\]\s*\{[^}]*display:\s*none\s*!important/
    );
});

test('mobile more menu is presented as a bottom sheet', () => {
    const css = read('editor-toolbar-v2.css');
    expect(css).toMatch(/@media \(max-width: 768px\)[\s\S]*#toolbar-more-menu-floating[\s\S]*bottom:/);
    expect(css).toContain('max-height: min(68vh, 620px)');
});

test('desktop commands use responsive priority instead of being globally removed', () => {
    const css = read('editor-toolbar-v2.css');
    expect(css).toMatch(/\.pro-toolbar #theme-toggle-btn,[\s\S]*#lang-toggle-btn \{ display: inline-flex !important; \}/);
    expect(css).toContain('.pro-toolbar #tools-dropdown-wrap { display: block !important; }');
    expect(css).toMatch(/@media \(max-width: 1760px\)[\s\S]*\.tb-nav-icons \{ display: none !important; \}/);
    expect(css).toMatch(/@media \(max-width: 1460px\)[\s\S]*#tools-dropdown-wrap,[\s\S]*#lang-toggle-btn \{ display: none !important; \}/);
});

test('mobile toolbar retains a compact save-state indicator', () => {
    const css = read('editor-toolbar-v2.css');
    expect(css).toMatch(/@media \(max-width: 768px\)[\s\S]*\.autosave-indicator \{[\s\S]*display: inline-flex !important;/);
    expect(css).toMatch(/\.autosave-indicator span \{ display: none !important; \}/);
});
