/**
 * @jest-environment jsdom
 */

describe('editor interact fallback', () => {
  beforeEach(() => {
    jest.resetModules();
    delete window.interact;
    delete document.documentElement.dataset.editorDragMode;
  });

  test('keeps editor rendering functional when the drag CDN is unavailable', () => {
    require('../editor-interact-fallback');

    expect(typeof window.interact).toBe('function');
    expect(window.interact.modifiers.restrictRect()).toEqual({});
    expect(window.interact('#card-name').draggable().dropzone().unset()).toBeDefined();
    expect(document.documentElement.dataset.editorDragMode).toBe('controls-only');
  });

  test('does not replace a loaded interact implementation', () => {
    const realInteract = jest.fn();
    window.interact = realInteract;

    require('../editor-interact-fallback');

    expect(window.interact).toBe(realInteract);
    expect(document.documentElement.dataset.editorDragMode).toBeUndefined();
  });
});
