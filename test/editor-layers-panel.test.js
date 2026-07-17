/**
 * @jest-environment jsdom
 */
'use strict';

describe('Editor layers panel', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.resetModules();
    delete window.EditorLayersPanel;
    localStorage.clear();
    document.documentElement.lang = 'ar';
    document.body.innerHTML = `
      <aside id="editor-context-inspector"></aside>
      <input type="checkbox" id="visibility-logo" checked>
      <input type="checkbox" id="visibility-name" checked>
      <div id="card-front-content" class="card-content-layer card-front-content-layer">
        <div id="card-logo"></div><h1 id="card-name">Name</h1>
      </div>
      <div id="card-back-content" class="card-content-layer card-back-content-layer">
        <div id="social-link-test" class="draggable-social-link"><span>LinkedIn</span></div>
      </div>
    `;
    window.EditorContextInspector = { select: jest.fn() };
    require('../editor-layers-panel');
    document.dispatchEvent(new Event('DOMContentLoaded'));
    jest.runOnlyPendingTimers();
  });

  afterEach(() => {
    if (window.EditorLayersPanel) window.EditorLayersPanel.disconnect();
    delete window.EditorLayersPanel;
    delete window.EditorContextInspector;
    jest.useRealTimers();
  });

  test('renders elements grouped by card face', () => {
    expect(document.querySelectorAll('#editor-layers-panel .elp-face')).toHaveLength(2);
    expect(document.querySelectorAll('[data-layer-id]')).toHaveLength(3);
    expect(document.querySelector('[data-layer-face="front"]').textContent).toContain('الاسم');
    expect(document.querySelector('[data-layer-face="back"]').textContent).toContain('LinkedIn');
  });

  test('selects, hides and locks a layer using the canonical controls', () => {
    document.querySelector('[data-layer-id="card-logo"] .elp-select').click();
    expect(window.EditorContextInspector.select).toHaveBeenCalledWith(document.getElementById('card-logo'));

    document.querySelector('[data-layer-id="card-logo"] [data-layer-action="visibility"]').click();
    expect(document.getElementById('visibility-logo').checked).toBe(false);

    window.EditorLayersPanel.setLocked(document.getElementById('card-logo'), true);
    expect(document.getElementById('card-logo').dataset.editorLayerLocked).toBe('true');
  });

  test('reorders layers and persists their order', () => {
    expect(window.EditorLayersPanel.move(document.getElementById('card-name'), 'up')).toBe(true);
    expect(document.getElementById('card-front-content').firstElementChild.id).toBe('card-name');
    const storageKeys = Array.from(
      { length: localStorage.length },
      (_, index) => localStorage.key(index)
    );
    expect(storageKeys.some((key) => key && key.startsWith('mcprime-editor-layers-v1'))).toBe(true);
  });
});
