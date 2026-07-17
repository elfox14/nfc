/**
 * @jest-environment jsdom
 */
'use strict';

describe('Editor smart alignment', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.resetModules();
    delete window.EditorSmartAlignment;
    document.documentElement.lang = 'en';
    document.body.innerHTML = `
      <aside id="editor-context-inspector"><button id="eci-advanced"></button></aside>
      <div id="card-front-content" class="card-content-layer"><div id="card-logo" data-x="0" data-y="0"></div></div>
    `;
    const parent = document.getElementById('card-front-content');
    const element = document.getElementById('card-logo');
    parent.getBoundingClientRect = () => ({ left: 0, top: 0, right: 500, bottom: 300, width: 500, height: 300 });
    element.getBoundingClientRect = () => ({ left: 100, top: 80, right: 200, bottom: 130, width: 100, height: 50 });
    require('../editor-smart-alignment');
    document.dispatchEvent(new Event('DOMContentLoaded'));
  });

  afterEach(() => {
    delete window.EditorSmartAlignment;
    jest.useRealTimers();
  });

  test('shows contextual controls and centers the selected element', () => {
    const element = document.getElementById('card-logo');
    window.EditorSmartAlignment.select(element);
    expect(document.getElementById('editor-smart-alignment').hidden).toBe(false);
    expect(window.EditorSmartAlignment.align('center-x')).toBe(true);
    expect(element.getAttribute('data-x')).toBe('100');
  });

  test('does not move locked elements', () => {
    const element = document.getElementById('card-logo');
    element.dataset.editorLayerLocked = 'true';
    window.EditorSmartAlignment.select(element);
    expect(window.EditorSmartAlignment.align('left')).toBe(false);
  });
});
