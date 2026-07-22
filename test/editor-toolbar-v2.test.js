/**
 * @jest-environment jsdom
 */
'use strict';

describe('Professional editor toolbar', () => {
    let originalHtml2canvas;

    beforeEach(() => {
        jest.resetModules();
        jest.useFakeTimers();
        delete window.EditorToolbarV2;
        sessionStorage.clear();
        document.documentElement.lang = 'ar';
        Object.defineProperty(window, 'innerWidth', { value: 1280, writable: true, configurable: true });
        document.body.innerHTML = `
            <header id="pro-toolbar">
                <input id="toolbar-design-title">
                <button id="toolbar-face-front"></button>
                <button id="toolbar-face-back"></button>
                <button id="toolbar-zoom-out"></button>
                <output id="toolbar-zoom-value"></output>
                <button id="toolbar-zoom-in"></button>
                <button id="toolbar-grid-toggle"></button>
                <button id="toolbar-safe-area-toggle"></button>
                <button id="toolbar-snap-now"></button>
                <button id="toolbar-grid-toggle-menu"></button>
                <button id="toolbar-safe-area-toggle-menu"></button>
            </header>
            <textarea id="input-name_ar">بطاقة محمود</textarea>
            <div id="cards-wrapper">
                <div class="card-flipper-container">
                    <div class="card-flipper">
                        <div id="card-front-preview" class="card-face"></div>
                        <div id="card-back-preview" class="card-face"></div>
                    </div>
                </div>
            </div>
            <button id="flip-card-btn-mobile"></button>
        `;
        document.getElementById('card-front-preview').scrollIntoView = jest.fn();
        document.getElementById('card-back-preview').scrollIntoView = jest.fn();
        document.getElementById('flip-card-btn-mobile').addEventListener('click', () => {
            document.querySelector('.card-flipper').classList.toggle('is-flipped');
        });
        originalHtml2canvas = jest.fn(() => Promise.resolve({ ok: true }));
        window.html2canvas = originalHtml2canvas;
        window.EditorSmartAlignment = {
            toggleGrid: jest.fn(),
            toggleSafeArea: jest.fn(),
            snapSelected: jest.fn(),
            isGridEnabled: jest.fn(() => window.EditorSmartAlignment.toggleGrid.mock.calls.length % 2 === 1),
            isSafeAreaEnabled: jest.fn(() => window.EditorSmartAlignment.toggleSafeArea.mock.calls.length % 2 === 1)
        };
        require('../editor-toolbar-v2');
        document.dispatchEvent(new Event('DOMContentLoaded'));
    });

    afterEach(() => {
        jest.runOnlyPendingTimers();
        jest.useRealTimers();
        delete window.html2canvas;
        delete window.EditorSmartAlignment;
    });

    test('keeps the toolbar title synchronized with the card name using one input event', () => {
        const source = document.getElementById('input-name_ar');
        const title = document.getElementById('toolbar-design-title');
        const inputListener = jest.fn();
        source.addEventListener('input', inputListener);

        expect(title.value).toBe('بطاقة محمود');
        title.value = 'بطاقة جديدة';
        title.dispatchEvent(new Event('input', { bubbles: true }));

        expect(source.value).toBe('بطاقة جديدة');
        expect(inputListener).toHaveBeenCalledTimes(1);
    });

    test('selects and scrolls to either card face on desktop', () => {
        const backButton = document.getElementById('toolbar-face-back');
        const backCard = document.getElementById('card-back-preview');

        backButton.click();

        expect(backButton.classList.contains('is-active')).toBe(true);
        expect(backButton.getAttribute('aria-pressed')).toBe('true');
        expect(document.body.dataset.activeCardFace).toBe('back');
        expect(backCard.scrollIntoView).toHaveBeenCalledTimes(1);
    });

    test('uses the existing mobile flipper without adding a second flip implementation', () => {
        window.innerWidth = 800;
        const flipButton = document.getElementById('flip-card-btn-mobile');
        const clickSpy = jest.spyOn(flipButton, 'click');

        document.getElementById('toolbar-face-back').click();

        expect(clickSpy).toHaveBeenCalledTimes(1);
        expect(document.querySelector('.card-flipper').classList.contains('is-flipped')).toBe(true);
    });

    test('changes visual zoom in fixed quality-safe steps', () => {
        expect(document.getElementById('toolbar-zoom-value').textContent).toBe('100%');
        document.getElementById('toolbar-zoom-in').click();
        expect(document.getElementById('toolbar-zoom-value').textContent).toBe('110%');
        expect(document.documentElement.style.getPropertyValue('--editor-toolbar-zoom')).toBe('1.1');
    });

    test('temporarily removes visual zoom while capturing a card', async () => {
        document.getElementById('toolbar-zoom-in').click();
        originalHtml2canvas.mockImplementation(() => {
            expect(document.documentElement.style.getPropertyValue('--editor-toolbar-zoom')).toBe('1');
            return Promise.resolve({ ok: true });
        });

        await window.html2canvas(document.getElementById('card-front-preview'));

        expect(originalHtml2canvas).toHaveBeenCalledTimes(1);
        expect(document.documentElement.style.getPropertyValue('--editor-toolbar-zoom')).toBe('1.1');
    });

    test('reuses smart alignment APIs for grid, safe area and snap controls', () => {
        document.getElementById('toolbar-grid-toggle').click();
        document.getElementById('toolbar-safe-area-toggle').click();
        document.getElementById('toolbar-snap-now').click();

        expect(window.EditorSmartAlignment.toggleGrid).toHaveBeenCalledTimes(1);
        expect(window.EditorSmartAlignment.toggleSafeArea).toHaveBeenCalledTimes(1);
        expect(window.EditorSmartAlignment.snapSelected).toHaveBeenCalledWith(8);
        expect(document.getElementById('toolbar-grid-toggle').getAttribute('aria-pressed')).toBe('true');
        expect(document.getElementById('toolbar-grid-toggle-menu').classList.contains('is-active')).toBe(true);
        expect(document.getElementById('toolbar-safe-area-toggle-menu').classList.contains('is-active')).toBe(true);
    });
});
