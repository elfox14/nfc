/**
 * @jest-environment jsdom
 */
'use strict';

describe('Editor publish gate', () => {
  beforeEach(() => {
    jest.resetModules();
    delete window.EditorSmartValidation;
    delete window.EditorPublishGate;
    document.documentElement.lang = 'en';
    document.body.innerHTML = `
      <button id="save-share-btn">Publish</button>
      <input id="input-name_en"><input id="input-email">
      <input type="checkbox" id="visibility-qr" checked>
      <input type="radio" name="qr-source" value="auto-vcard" checked>
      <input id="qr-size" value="30"><input id="qr-dots-color" value="#000000"><input id="qr-bg-color" value="#ffffff">
    `;
    require('../editor-smart-validation');
    require('../editor-publish-gate');
    document.dispatchEvent(new Event('DOMContentLoaded'));
  });

  afterEach(() => {
    delete window.EditorSmartValidation;
    delete window.EditorPublishGate;
  });

  test('blocks the original publish action when required data is missing', () => {
    const originalAction = jest.fn();
    document.getElementById('save-share-btn').addEventListener('click', originalAction);
    document.getElementById('save-share-btn').click();
    expect(originalAction).not.toHaveBeenCalled();
    expect(document.getElementById('editor-publish-gate').classList.contains('is-open')).toBe(true);
    expect(document.querySelectorAll('.epg-item.is-error').length).toBeGreaterThan(0);
  });

  test('allows the original publish action when the card is valid', () => {
    document.getElementById('input-name_en').value = 'MC PRIME';
    document.getElementById('input-email').value = 'hello@mcprim.com';
    const originalAction = jest.fn();
    document.getElementById('save-share-btn').addEventListener('click', originalAction);
    document.getElementById('save-share-btn').click();
    expect(originalAction).toHaveBeenCalledTimes(1);
    expect(document.getElementById('editor-publish-gate').classList.contains('is-open')).toBe(false);
  });
});
