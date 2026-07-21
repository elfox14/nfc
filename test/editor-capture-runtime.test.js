/** @jest-environment jsdom */
'use strict';

const fs = require('fs');
const path = require('path');

const source = fs.readFileSync(path.join(__dirname, '..', 'editor-capture-runtime.js'), 'utf8');

describe('editor capture runtime', () => {
  beforeEach(() => {
    document.head.innerHTML = '';
    document.body.innerHTML = `
      <div id="cards-wrapper" style="transform: scale(.8)">
        <section id="card-front-preview" class="card-face card-front">
          <img id="remote-logo" src="https://images.example.com/logo.png">
          <div id="remote-background" style="background-image:url('https://images.example.com/bg.png')"></div>
        </section>
      </div>
    `;
    window.history.replaceState({}, '', '/nfc/editor.html');
    window.requestAnimationFrame = callback => callback();

    global.Config = window.Config = { SCRIPT_URLS: { html2canvas: '/nfc/vendor/html2canvas.js' } };
    global.ExportManager = window.ExportManager = {};
    global.ShareManager = window.ShareManager = {};
    global.Utils = window.Utils = { loadScript: jest.fn(async () => {}) };
    global.UIManager = window.UIManager = { uploadImageToServer: jest.fn(async () => '/uploads/card.png') };
    global.MobileUtils = window.MobileUtils = { isMobile: jest.fn(() => false) };
  });

  afterEach(() => {
    [
      'Config', 'ExportManager', 'ShareManager', 'Utils', 'UIManager',
      'MobileUtils', 'html2canvas', 'EditorCaptureRuntime'
    ].forEach(key => {
      delete global[key];
      delete window[key];
    });
  });

  test('retries an empty PNG at a safer scale and deduplicates concurrent captures', async () => {
    Object.defineProperty(document.getElementById('remote-logo'), 'complete', { value: true });
    const emptyCanvas = { toBlob: jest.fn(callback => callback(null)) };
    const validCanvas = {
      toBlob: jest.fn(callback => callback(new Blob(['png'], { type: 'image/png' })))
    };
    window.html2canvas = global.html2canvas = jest.fn()
      .mockResolvedValueOnce(emptyCanvas)
      .mockResolvedValueOnce(validCanvas);

    eval(source);
    const face = document.getElementById('card-front-preview');
    const results = await Promise.all([
      ShareManager.captureAndUploadCard(face, 'capturedFront'),
      ShareManager.captureAndUploadCard(face, 'capturedFront')
    ]);

    expect(results).toEqual(['/uploads/card.png', '/uploads/card.png']);
    expect(html2canvas).toHaveBeenCalledTimes(2);
    expect(html2canvas.mock.calls[0][1]).toMatchObject({
      scale: 2,
      useCORS: true,
      allowTaint: false
    });
    expect(html2canvas.mock.calls[1][1].scale).toBe(1.25);
    expect(UIManager.uploadImageToServer).toHaveBeenCalledTimes(1);
    expect(document.getElementById('cards-wrapper').style.transform).toBe('scale(.8)');
  });

  test('removes only external assets from the final fallback clone', () => {
    window.html2canvas = global.html2canvas = jest.fn();
    eval(source);

    const face = document.getElementById('card-front-preview');
    EditorCaptureRuntime.sanitizeExternalAssets(face);

    expect(document.getElementById('remote-logo').hasAttribute('src')).toBe(false);
    expect(document.getElementById('remote-logo').style.visibility).toBe('hidden');
    expect(document.getElementById('remote-background').style.backgroundImage).toBe('none');
  });
});
