/**
 * @jest-environment jsdom
 */

function editorMarkup() {
    const details = [
        ['logo-accordion', 'Logo'],
        ['photo-accordion', 'Photo'],
        ['name-accordion', 'Name'],
        ['tagline-accordion', 'Tagline'],
        ['bio-accordion', 'Bio'],
        ['phones-accordion', 'Phones'],
        ['qr-code-accordion', 'QR'],
        ['contact-info-accordion', 'Contact']
    ].map(([id, label]) => `<details id="${id}" class="fieldset-accordion"><summary>${label}</summary></details>`).join('');

    return `
        <div class="pro-layout">
            <aside id="panel-design" class="pro-sidebar">
                <fieldset id="layout-fieldset-source"><legend>Layout</legend></fieldset>
                <fieldset id="designs-fieldset-source"><legend>Templates</legend></fieldset>
                <details id="backgrounds-accordion" class="fieldset-accordion"><summary>Background</summary></details>
            </aside>
            <main class="pro-canvas">
                <section id="cards-wrapper" class="cards-wrapper">
                    <div class="card-flipper-container">
                        <div class="card-flipper">
                            <div id="card-front-preview" class="business-card card-front">
                                <div id="card-logo"><img id="card-logo-img" alt=""></div>
                                <div id="card-personal-photo-wrapper"></div>
                                <h1 id="card-name"></h1>
                                <h2 id="card-tagline"></h2>
                                <div id="phone-buttons-wrapper"></div>
                            </div>
                            <div id="card-back-preview" class="business-card card-back">
                                <div id="card-back-content"><div id="qr-code-wrapper"></div></div>
                            </div>
                        </div>
                    </div>
                </section>
            </main>
            <aside id="panel-elements" class="pro-sidebar">${details}</aside>
            <aside id="panel-share" class="pro-sidebar"></aside>
        </div>
        <nav class="mobile-bottom-nav">
            <button id="flip-card-btn-mobile" type="button"></button>
            <button class="mobile-nav-item" data-target="panel-elements"></button>
            <button class="mobile-nav-item active" data-target="panel-design"></button>
            <button class="mobile-nav-item" data-target="panel-share"></button>
        </nav>
    `;
}

describe('professional editor workspace', () => {
    beforeEach(() => {
        document.documentElement.lang = 'en';
        document.documentElement.removeAttribute('data-editor-workspace');
        document.body.className = '';
        document.body.innerHTML = editorMarkup();
        Object.defineProperty(window, 'innerWidth', { configurable: true, value: 1280 });
        Object.defineProperty(window, 'innerHeight', { configurable: true, value: 800 });

        delete window.EditorWorkspace;
        jest.resetModules();
        jest.isolateModules(() => require('../editor-workspace'));
        if (document.documentElement.dataset.editorWorkspace !== 'ready') {
            document.dispatchEvent(new Event('DOMContentLoaded'));
        }
    });

    test('builds the five-part library and canvas toolbar once', () => {
        expect(document.querySelectorAll('[data-library-tab]')).toHaveLength(5);
        expect(document.querySelectorAll('.editor-canvas-toolbar')).toHaveLength(1);
        expect(document.querySelectorAll('.editor-sheet-handle')).toHaveLength(3);
        expect(document.body.classList.contains('editor-workspace-ready')).toBe(true);
        expect(document.documentElement.dataset.editorWorkspace).toBe('ready');

        window.EditorWorkspace.init();
        expect(document.querySelectorAll('.editor-canvas-toolbar')).toHaveLength(1);
    });

    test('switches library categories without duplicating legacy controls', () => {
        window.EditorWorkspace.setLibraryView('images');

        expect(document.getElementById('backgrounds-accordion').classList.contains('editor-library-section-hidden')).toBe(false);
        expect(document.getElementById('layout-fieldset-source').classList.contains('editor-library-section-hidden')).toBe(true);
        expect(document.querySelectorAll('[data-inspector-item="logo"]')).toHaveLength(1);
        expect(document.querySelectorAll('[data-inspector-item="photo"]')).toHaveLength(1);

        window.EditorWorkspace.setLibraryView('templates');
        expect(document.getElementById('layout-fieldset-source').classList.contains('editor-library-section-hidden')).toBe(false);
        expect(document.querySelectorAll('#layout-fieldset-source')).toHaveLength(1);
    });

    test('shows only the selected element controls and highlights the card element', () => {
        window.EditorWorkspace.select('name');

        expect(document.getElementById('name-accordion').classList.contains('editor-inspector-filtered')).toBe(false);
        expect(document.getElementById('logo-accordion').classList.contains('editor-inspector-filtered')).toBe(true);
        expect(document.getElementById('name-accordion').open).toBe(true);
        expect(document.getElementById('card-name').classList.contains('editor-element-selected')).toBe(true);
        expect(document.getElementById('editor-card-inspector').hidden).toBe(true);
        expect(window.EditorWorkspace.getState().selectedItem).toBe('name');
    });

    test('selects elements directly from the card with keyboard support', () => {
        const logo = document.getElementById('card-logo');
        expect(logo.getAttribute('role')).toBe('button');
        expect(logo.tabIndex).toBe(0);

        logo.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
        expect(window.EditorWorkspace.getState().selectedItem).toBe('logo');
        expect(document.getElementById('logo-accordion').open).toBe(true);
    });

    test('opens properties from a real pointer press on either card face', () => {
        const name = document.getElementById('card-name');
        name.dispatchEvent(new MouseEvent('pointerdown', { button: 0, bubbles: true }));

        expect(window.EditorWorkspace.getState().selectedItem).toBe('name');
        expect(document.getElementById('name-accordion').open).toBe(true);
        expect(name.classList.contains('editor-element-selected')).toBe(true);

        window.EditorWorkspace.setFace('back');
        const qr = document.getElementById('qr-code-wrapper');
        qr.dispatchEvent(new MouseEvent('pointerdown', { button: 0, bubbles: true }));

        expect(window.EditorWorkspace.getState().selectedItem).toBe('qr');
        expect(document.getElementById('qr-code-accordion').open).toBe(true);
        expect(qr.classList.contains('editor-element-selected')).toBe(true);
    });

    test('controls card face, zoom and grid through one workspace state', () => {
        window.EditorWorkspace.setFace('back');
        window.EditorWorkspace.setZoom(1.25);
        window.EditorWorkspace.toggleGrid();

        const canvas = document.querySelector('.pro-canvas');
        expect(canvas.dataset.editorFace).toBe('back');
        expect(canvas.dataset.grid).toBe('true');
        expect(canvas.style.getPropertyValue('--editor-canvas-scale')).toBe('1.25');
        expect(document.querySelector('[data-editor-face="back"]').getAttribute('aria-selected')).toBe('true');
        expect(document.querySelector('[data-canvas-action="grid"]').getAttribute('aria-pressed')).toBe('true');
    });

    test('keeps the mobile card flip synchronized with the active workspace face', () => {
        Object.defineProperty(window, 'innerWidth', { configurable: true, value: 390 });

        document.getElementById('flip-card-btn-mobile').click();
        expect(window.EditorWorkspace.getState().face).toBe('back');
        expect(document.querySelector('.pro-canvas').dataset.editorFace).toBe('back');

        document.getElementById('flip-card-btn-mobile').click();
        expect(window.EditorWorkspace.getState().face).toBe('front');
        expect(document.querySelector('.pro-canvas').dataset.editorFace).toBe('front');
    });

    test('opens the contextual inspector as a mobile bottom sheet', () => {
        Object.defineProperty(window, 'innerWidth', { configurable: true, value: 390 });
        window.EditorWorkspace.select('qr');

        expect(document.getElementById('panel-elements').classList.contains('active-view')).toBe(true);
        expect(document.querySelector('[data-target="panel-elements"]').getAttribute('aria-selected')).toBe('true');

        const handle = document.querySelector('#panel-elements > .editor-sheet-handle');
        handle.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowUp', bubbles: true }));
        expect(document.getElementById('panel-elements').style.getPropertyValue('--editor-sheet-height')).not.toBe('');
    });
});
