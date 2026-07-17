/**
 * @jest-environment jsdom
 */

test('contextual transform inspector edits position and appearance through the layer API', () => {
    document.documentElement.lang = 'en';
    document.documentElement.dataset.editorWorkspace = 'ready';
    document.documentElement.removeAttribute('data-editor-properties');
    document.body.innerHTML = `
        <aside id="panel-elements">
            <div class="editor-inspector-heading"></div>
            <details></details>
        </aside>
    `;

    const appearance = { scale: 1, rotation: 0, opacity: 1 };
    window.EditorWorkspace = { getState: () => ({ selectedItem: 'name' }) };
    window.EditorLayers = {
        getTargets: jest.fn(() => [document.createElement('div')]),
        getPosition: jest.fn(() => ({ x: 12, y: -4 })),
        getAppearance: jest.fn(() => ({ ...appearance })),
        getLocks: jest.fn(() => []),
        isVisible: jest.fn(() => true),
        setPosition: jest.fn(),
        setAppearance: jest.fn((id, changes) => Object.assign(appearance, changes)),
        toggleLock: jest.fn(),
        toggleVisibility: jest.fn(),
        resetTransform: jest.fn()
    };

    delete window.EditorProperties;
    jest.resetModules();
    jest.isolateModules(() => require('../editor-properties'));

    const panel = document.querySelector('.editor-transform-panel');
    expect(panel).not.toBeNull();
    expect(panel.hidden).toBe(false);
    expect(document.documentElement.dataset.editorProperties).toBe('ready');
    expect(document.querySelector('[data-transform-position="x"]').value).toBe('12');
    expect(document.querySelector('[data-transform-position="y"]').value).toBe('-4');

    const x = document.querySelector('[data-transform-position="x"]');
    x.value = '24';
    x.dispatchEvent(new Event('input', { bubbles: true }));
    expect(window.EditorLayers.setPosition).toHaveBeenCalledWith('name', 24, -4);

    const scale = document.querySelector('[data-transform-appearance="scale"]');
    scale.value = '125';
    scale.dispatchEvent(new Event('input', { bubbles: true }));
    expect(window.EditorLayers.setAppearance).toHaveBeenCalledWith('name', { scale: 1.25 });
    expect(scale.closest('label').querySelector('output').value).toBe('125%');

    document.querySelector('[data-transform-action="lock"]').click();
    document.querySelector('[data-transform-action="visibility"]').click();
    document.querySelector('[data-transform-action="reset"]').click();
    expect(window.EditorLayers.toggleLock).toHaveBeenCalledWith('name');
    expect(window.EditorLayers.toggleVisibility).toHaveBeenCalledWith('name');
    expect(window.EditorLayers.resetTransform).toHaveBeenCalledWith('name');
});
