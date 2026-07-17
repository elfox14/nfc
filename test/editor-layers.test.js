/**
 * @jest-environment jsdom
 */

const layerIds = ['logo', 'photo', 'name', 'tagline', 'bio', 'phones', 'qr', 'contact'];

function layerRows() {
    return layerIds.map((id, index) => `
        <div class="editor-layer-row" data-layer-id="${id}" draggable="true">
            <button type="button" data-layer-handle="${id}"></button>
            <button type="button" class="editor-layer-item" data-inspector-item="${id}">
                <small>${String(index + 1).padStart(2, '0')}</small><span>${id}</span>
            </button>
            <div class="editor-layer-actions">
                <button type="button" data-layer-action="visibility" data-layer-id="${id}"><i></i></button>
                <button type="button" data-layer-action="lock" data-layer-id="${id}"><i></i></button>
            </div>
        </div>
    `).join('');
}

function visibilityControls() {
    return [
        ['visibility-logo', true], ['visibility-photo', true], ['visibility-name', true],
        ['visibility-tagline', true], ['visibility-bio', true], ['visibility-phones', true],
        ['visibility-qr', true], ['toggle-master-social', true]
    ].map(([id, checked]) => `<input type="checkbox" id="${id}" ${checked ? 'checked' : ''}>`).join('');
}

test('layers manage order, locks, visibility, alignment and the missing bio preview', () => {
    document.documentElement.lang = 'en';
    document.documentElement.removeAttribute('data-editor-layers');
    document.body.innerHTML = `
        ${visibilityControls()}
        <textarea id="input-bio_en">Product designer</textarea>
        <textarea id="input-bio_ar"></textarea>
        <select id="input-availability"><option value="available" selected>Available</option></select>
        <div class="editor-library-shortcuts"><div class="editor-layer-list">${layerRows()}</div></div>
        <section id="cards-wrapper">
            <div id="card-front-preview" class="business-card">
                <div id="card-logo"></div>
                <div id="card-personal-photo-wrapper"></div>
                <h1 id="card-name" data-x="0" data-y="0"></h1>
                <h2 id="card-tagline"></h2>
            </div>
            <div id="card-back-preview" class="business-card">
                <div id="card-back-content">
                    <div class="phone-button-draggable-wrapper"></div>
                    <div class="draggable-social-link"></div>
                    <div id="qr-code-wrapper"></div>
                </div>
            </div>
        </section>
    `;

    window.EditorWorkspace = {
        getState: () => ({ selectedItem: 'name' }),
        refreshCanvasElements: jest.fn()
    };
    delete window.EditorLayers;
    jest.resetModules();
    jest.isolateModules(() => require('../editor-layers'));
    if (document.documentElement.dataset.editorLayers !== 'ready') {
        document.dispatchEvent(new Event('DOMContentLoaded'));
    }

    expect(document.documentElement.dataset.editorLayers).toBe('ready');
    expect(document.querySelectorAll('.editor-alignment-tools')).toHaveLength(1);
    expect(document.getElementById('editor-layer-order')).not.toBeNull();
    expect(document.getElementById('editor-layer-locks')).not.toBeNull();
    expect(document.getElementById('editor-layer-appearance')).not.toBeNull();

    const bio = window.EditorLayers.getBioElement();
    expect(bio).not.toBeNull();
    expect(bio.querySelector('.editor-card-bio-text').textContent).toBe('Product designer');
    expect(bio.querySelector('.editor-card-bio-availability').textContent).toBe('Available for work');
    expect(bio.hidden).toBe(false);

    expect(window.EditorLayers.move('name', -1)).toBe(true);
    expect(window.EditorLayers.getOrder().indexOf('name')).toBe(1);
    expect(JSON.parse(document.getElementById('editor-layer-order').value)[1]).toBe('name');

    expect(window.EditorLayers.toggleLock('name')).toBe(true);
    expect(document.getElementById('card-name').dataset.layerLocked).toBe('true');
    expect(JSON.parse(document.getElementById('editor-layer-locks').value)).toContain('name');
    expect(window.EditorLayers.toggleLock('name')).toBe(false);

    const name = document.getElementById('card-name');
    const card = document.getElementById('card-front-preview');
    Object.defineProperty(card, 'offsetWidth', { configurable: true, value: 300 });
    card.getBoundingClientRect = () => ({ left: 0, top: 0, right: 300, bottom: 180, width: 300, height: 180 });
    name.getBoundingClientRect = () => ({ left: 10, top: 20, right: 110, bottom: 60, width: 100, height: 40 });
    expect(window.EditorLayers.align('center')).toBe(true);
    expect(Number(name.dataset.x)).toBe(90);
    expect(name.style.transform).toBe('translate(90px, 0px) rotate(0deg) scale(1)');

    expect(window.EditorLayers.setAppearance('name', { scale: 1.25, rotation: 15, opacity: 0.5 }))
        .toEqual({ scale: 1.25, rotation: 15, opacity: 0.5 });
    expect(name.style.transform).toBe('translate(90px, 0px) rotate(15deg) scale(1.25)');
    expect(name.style.opacity).toBe('0.5');
    expect(JSON.parse(document.getElementById('editor-layer-appearance').value).name.scale).toBe(1.25);

    expect(window.EditorLayers.toggleVisibility('name')).toBe(false);
    expect(name.hidden).toBe(true);
    expect(document.querySelector('[data-layer-id="name"]').classList.contains('is-hidden')).toBe(true);
});
