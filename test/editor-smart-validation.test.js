/**
 * @jest-environment jsdom
 */
'use strict';

describe('Editor smart validation', () => {
  beforeEach(() => {
    jest.resetModules();
    delete window.EditorSmartValidation;
    document.documentElement.lang = 'en';
    document.body.innerHTML = `
      <aside id="panel-elements"><details id="name-accordion"><input id="input-name_en"></details>
        <details id="contact-info-accordion"><input id="input-email"></details></aside>
      <input type="checkbox" id="visibility-qr" checked>
      <input type="radio" name="qr-source" value="auto-vcard" checked>
      <input id="qr-size" value="30">
      <input id="qr-dots-color" value="#000000">
      <input id="qr-bg-color" value="#ffffff">
    `;
    Element.prototype.scrollIntoView = jest.fn();
    window.EditorTabs = { activate: jest.fn() };
    require('../editor-smart-validation');
    document.dispatchEvent(new Event('DOMContentLoaded'));
  });

  afterEach(() => {
    delete window.EditorSmartValidation;
    delete window.EditorTabs;
  });

  test('blocks publishing without a name and contact method', () => {
    const result = window.EditorSmartValidation.run();
    expect(result.valid).toBe(false);
    expect(result.issues.map((entry) => entry.code)).toEqual(expect.arrayContaining(['missing-name', 'missing-contact']));
  });

  test('accepts a complete basic card and detects QR contrast problems', () => {
    document.getElementById('input-name_en').value = 'MC PRIME';
    document.getElementById('input-email').value = 'hello@mcprim.com';
    expect(window.EditorSmartValidation.run().valid).toBe(true);

    document.getElementById('qr-dots-color').value = '#ffffff';
    const result = window.EditorSmartValidation.run();
    expect(result.valid).toBe(false);
    expect(result.issues.some((entry) => entry.code === 'qr-low-contrast')).toBe(true);
  });

  test('focuses the matching legacy control for an issue', () => {
    const result = window.EditorSmartValidation.run();
    expect(window.EditorSmartValidation.focusIssue(result.issues[0])).toBe(true);
    expect(document.getElementById('name-accordion').open).toBe(true);
    expect(window.EditorTabs.activate).toHaveBeenCalledWith('tab-content');
  });
});
