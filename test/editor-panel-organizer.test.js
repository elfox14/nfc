/**
 * @jest-environment jsdom
 */
'use strict';

describe('Editor panel organizer', () => {
  beforeEach(() => {
    jest.resetModules();
    delete window.EditorPanelOrganizer;
    localStorage.clear();
    document.documentElement.lang = 'ar';
    document.body.innerHTML = `
      <aside id="panel-design">
        <details id="colors"><summary>الألوان</summary><p>لون أساسي</p></details>
        <details id="images" open><summary>الصور</summary><p>الشعار</p></details>
        <details id="background"><summary>الخلفية</summary><p>تدرج</p></details>
      </aside>`;
    Element.prototype.scrollIntoView = jest.fn();
    require('../editor-panel-organizer');
    document.dispatchEvent(new Event('DOMContentLoaded'));
  });

  afterEach(() => {
    delete window.EditorPanelOrganizer;
  });

  test('adds one search toolbar and opens only the first section by default', () => {
    expect(document.querySelectorAll('.epo-toolbar')).toHaveLength(1);
    expect(document.getElementById('colors').open).toBe(true);
    expect(document.getElementById('images').open).toBe(false);
    expect(document.getElementById('background').open).toBe(false);
  });

  test('filters sections by title and content', () => {
    const root = document.getElementById('panel-design');
    expect(window.EditorPanelOrganizer.filter(root, 'شعار')).toBe(1);
    expect(document.getElementById('images').classList.contains('epo-filtered-out')).toBe(false);
    expect(document.getElementById('colors').classList.contains('epo-filtered-out')).toBe(true);
  });

  test('keeps accordion behavior and stores section state', () => {
    const images = document.getElementById('images');
    images.open = true;
    images.dispatchEvent(new Event('toggle'));
    expect(document.getElementById('colors').open).toBe(false);
    const saved = JSON.parse(localStorage.getItem('mcprime-editor-panel-state-v1'));
    expect(saved.images).toBe(true);
  });

  test('collapses all sections', () => {
    const root = document.getElementById('panel-design');
    window.EditorPanelOrganizer.collapseAll(root);
    expect(Array.from(root.querySelectorAll('details')).every(details => !details.open)).toBe(true);
  });
});