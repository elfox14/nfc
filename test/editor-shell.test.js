/**
 * @jest-environment jsdom
 */

describe('editor shell foundation', () => {
    beforeAll(() => {
        document.documentElement.lang = 'en';
        document.body.innerHTML = `
            <div id="autosave-indicator"><i></i><span id="autosave-status"></span></div>
            <button id="undo-btn"></button>
            <button id="redo-btn"></button>
            <button id="preview-mode-btn"></button>
            <button id="save-share-btn"></button>
            <button id="reset-design-btn"></button>
            <button id="save-to-gallery-btn"></button>
            <button id="show-gallery-btn"></button>
            <button id="share-editor-btn"></button>
            <button id="start-collab-btn"></button>
            <button id="theme-toggle-btn"></button>
            <button id="download-png-front"></button>
            <button id="download-png-back"></button>
            <button id="download-pdf"></button>
            <button id="download-vcf"></button>
            <button id="download-qrcode"></button>
            <button id="flip-card-btn-mobile"></button>

            <div class="tb-dropdown-wrap">
                <button id="tools-menu-btn"></button>
                <div id="tools-dropdown-menu"><button id="tool-item">Tool</button></div>
            </div>
            <div class="tb-dropdown-wrap">
                <button id="download-options-btn"></button>
                <div id="download-menu"><button>Download</button></div>
            </div>
            <div class="toolbar-more-container">
                <button id="toolbar-more-btn"></button>
            </div>
            <div id="toolbar-more-menu-floating"><button>More</button></div>

            <nav class="mobile-bottom-nav">
                <button class="mobile-nav-item active" data-target="panel-elements"></button>
                <button class="mobile-nav-item" data-target="panel-design"></button>
            </nav>
            <section id="panel-elements"></section>
            <section id="panel-design"></section>
            <details class="fieldset-accordion" open><summary>Open</summary></details>
            <button id="command-proxy" data-editor-command="test.action">Run</button>
        `;

        delete window.EditorCommands;
        delete window.EditorUIState;
        delete window.EditorShell;
        jest.isolateModules(() => require('../editor-shell'));
        if (document.documentElement.dataset.editorShell !== 'ready') {
            document.dispatchEvent(new Event('DOMContentLoaded'));
        }
    });

    beforeEach(() => {
        window.EditorShell.closeMenus();
    });

    test('executes declarative commands through one registry', async () => {
        const handler = jest.fn();
        window.EditorCommands.register('test.action', handler);

        document.getElementById('command-proxy').click();
        await Promise.resolve();

        expect(handler).toHaveBeenCalledTimes(1);
        expect(handler.mock.calls[0][0].trigger.id).toBe('command-proxy');
    });

    test('manages loading, success and error status accessibly', () => {
        const root = document.getElementById('autosave-indicator');
        const text = document.getElementById('autosave-status');

        window.EditorUIState.set('saving');
        expect(root.dataset.uiState).toBe('saving');
        expect(root.getAttribute('aria-busy')).toBe('true');
        expect(text.textContent).toBe('Saving…');

        window.EditorUIState.set('error', 'Network unavailable');
        expect(root.dataset.uiState).toBe('error');
        expect(root.getAttribute('aria-busy')).toBe('false');
        expect(text.textContent).toBe('Network unavailable');
    });

    test('opens and closes menus with ARIA state and Escape', () => {
        const trigger = document.getElementById('tools-menu-btn');
        const menu = document.getElementById('tools-dropdown-menu');

        trigger.click();
        expect(trigger.getAttribute('aria-expanded')).toBe('true');
        expect(menu.hidden).toBe(false);

        document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
        expect(trigger.getAttribute('aria-expanded')).toBe('false');
        expect(menu.hidden).toBe(true);
    });

    test('keeps keyboard shortcuts in the command system', async () => {
        const gallery = document.getElementById('show-gallery-btn');
        const listener = jest.fn();
        gallery.addEventListener('click', listener, { once: true });

        document.dispatchEvent(new KeyboardEvent('keydown', {
            key: 'g',
            ctrlKey: true,
            bubbles: true
        }));
        await Promise.resolve();

        expect(listener).toHaveBeenCalledTimes(1);
    });

    test('audits duplicate IDs and exposes the result', () => {
        const first = document.createElement('div');
        const second = document.createElement('div');
        first.id = 'duplicate-runtime-id';
        second.id = 'duplicate-runtime-id';
        document.body.append(first, second);
        const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

        expect(window.EditorShell.auditDuplicateIds()).toContain('duplicate-runtime-id');
        expect(document.documentElement.dataset.editorDuplicateIdCount).toBe('1');

        errorSpy.mockRestore();
        first.remove();
        second.remove();
    });

    test('adds mobile tab semantics and closes legacy accordions', () => {
        const firstTab = document.querySelector('.mobile-nav-item');
        const accordion = document.querySelector('details.fieldset-accordion');

        expect(firstTab.getAttribute('role')).toBe('tab');
        expect(firstTab.getAttribute('aria-controls')).toBe('panel-elements');
        expect(firstTab.getAttribute('aria-selected')).toBe('true');
        expect(accordion.open).toBe(false);
    });

    test('initialization is idempotent', () => {
        const commands = window.EditorCommands.list();
        window.EditorShell.init();
        expect(window.EditorCommands.list()).toEqual(commands);
    });
});
