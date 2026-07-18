/**
 * @jest-environment jsdom
 */

function waitForAsyncWork() {
  return new Promise((resolve) => setTimeout(resolve, 20));
}

describe('editor asset manager', () => {
  let logoInput;
  let photoInput;
  let logoZone;
  let processedEvents;

  beforeAll(() => {
    document.documentElement.lang = 'en';
    document.body.innerHTML = `
      <div id="logo-drop-zone">
        <input id="input-logo-upload" type="file" accept="image/*">
      </div>
      <div id="photo-controls-fieldset">
        <input id="input-photo-upload" type="file" accept="image/*">
      </div>
      <div class="lp-upload-zone-mini">
        <input id="front-bg-upload" type="file" accept="image/*">
      </div>
      <div class="lp-upload-zone-mini">
        <input id="back-bg-upload" type="file" accept="image/*">
      </div>
      <div id="crop-modal-overlay">
        <div id="crop-image-container"></div>
        <div class="modal-footer"></div>
      </div>
    `;

    logoInput = document.getElementById('input-logo-upload');
    photoInput = document.getElementById('input-photo-upload');
    logoZone = document.getElementById('logo-drop-zone');
    [logoInput, photoInput, document.getElementById('front-bg-upload'), document.getElementById('back-bg-upload')]
      .forEach((input) => {
        Object.defineProperty(input, 'files', { configurable: true, writable: true, value: [] });
      });

    class MockDataTransfer {
      constructor() {
        const files = [];
        this.items = { add: (file) => files.push(file) };
        this.files = files;
      }
    }

    window.DataTransfer = MockDataTransfer;
    window.URL.createObjectURL = jest.fn(() => 'blob:asset-test');
    window.URL.revokeObjectURL = jest.fn();
    window.__assetWidth = 1200;
    window.__assetHeight = 1200;
    window.Image = class MockImage {
      set src(_value) {
        this.naturalWidth = window.__assetWidth;
        this.naturalHeight = window.__assetHeight;
        setTimeout(() => this.onload?.(), 0);
      }
    };
    window.UIManager = { announce: jest.fn() };

    HTMLCanvasElement.prototype.getContext = jest.fn(() => ({
      fillStyle: '',
      fillRect: jest.fn(),
      drawImage: jest.fn(),
      imageSmoothingEnabled: false,
      imageSmoothingQuality: 'low'
    }));
    HTMLCanvasElement.prototype.toBlob = function toBlob(callback, type) {
      callback(new Blob([new Uint8Array(900)], { type }));
    };

    processedEvents = [];
    document.addEventListener('editor:assetprocessed', (event) => processedEvents.push(event.detail));
    jest.isolateModules(() => require('../editor-asset-manager'));
    window.EditorAssetManager.init();
  });

  beforeEach(() => {
    processedEvents.length = 0;
    window.__assetWidth = 1200;
    window.__assetHeight = 1200;
    window.UIManager.announce.mockClear();
    [logoInput, photoInput, document.getElementById('front-bg-upload'), document.getElementById('back-bg-upload')]
      .forEach((input) => {
        input.files = [];
        input.value = '';
        delete input.dataset.editorAssetBypass;
        delete input.dataset.assetState;
      });
    document.querySelectorAll('.asset-upload-status').forEach((status) => {
      status.textContent = '';
      status.hidden = true;
      delete status.dataset.state;
    });
  });

  test('optimizes a large image before the legacy upload handler receives it', async () => {
    const legacyHandler = jest.fn();
    logoInput.addEventListener('change', legacyHandler, { once: true });
    const file = new File([new Uint8Array(2 * 1024 * 1024)], 'brand.jpg', { type: 'image/jpeg' });
    logoInput.files = [file];

    logoInput.dispatchEvent(new Event('change', { bubbles: true, cancelable: true }));
    await waitForAsyncWork();

    expect(legacyHandler).toHaveBeenCalledTimes(1);
    expect(logoInput.files[0].name).toBe('brand-optimized.jpg');
    expect(logoInput.files[0].size).toBeLessThan(file.size);
    expect(logoInput.dataset.assetState).toBe('ready');
    expect(processedEvents).toHaveLength(1);
    expect(processedEvents[0]).toMatchObject({
      inputId: 'input-logo-upload',
      kind: 'logo',
      optimized: true,
      lowResolution: false
    });
  });

  test('rejects unsupported image formats before the legacy handler runs', async () => {
    const legacyHandler = jest.fn();
    logoInput.addEventListener('change', legacyHandler, { once: true });
    const file = new File(['<svg></svg>'], 'vector.svg', { type: 'image/svg+xml' });
    logoInput.files = [file];

    logoInput.dispatchEvent(new Event('change', { bubbles: true, cancelable: true }));
    await waitForAsyncWork();

    expect(legacyHandler).not.toHaveBeenCalled();
    expect(logoInput.dataset.assetState).toBe('error');
    expect(window.UIManager.announce).toHaveBeenCalledWith(expect.stringContaining('JPG'));
  });

  test('warns about low-resolution photos without blocking them', async () => {
    window.__assetWidth = 240;
    window.__assetHeight = 240;
    const legacyHandler = jest.fn();
    photoInput.addEventListener('change', legacyHandler, { once: true });
    const file = new File([new Uint8Array(8000)], 'small-photo.jpg', { type: 'image/jpeg' });
    photoInput.files = [file];

    photoInput.dispatchEvent(new Event('change', { bubbles: true, cancelable: true }));
    await waitForAsyncWork();

    expect(legacyHandler).toHaveBeenCalledTimes(1);
    expect(photoInput.dataset.assetState).toBe('warning');
    expect(processedEvents[0]).toMatchObject({ lowResolution: true, optimized: false });
  });

  test('accepts a dropped image and routes it through the existing file input', async () => {
    const legacyHandler = jest.fn();
    logoInput.addEventListener('change', legacyHandler, { once: true });
    const file = new File([new Uint8Array(2 * 1024 * 1024)], 'dropped.jpg', { type: 'image/jpeg' });
    const dropEvent = new Event('drop', { bubbles: true, cancelable: true });
    Object.defineProperty(dropEvent, 'dataTransfer', { value: { files: [file] } });

    logoZone.dispatchEvent(dropEvent);
    await waitForAsyncWork();

    expect(legacyHandler).toHaveBeenCalledTimes(1);
    expect(logoInput.files[0].name).toBe('dropped-optimized.jpg');
    expect(logoZone.classList.contains('asset-is-dragging')).toBe(false);
  });

  test('adds crop rotation, zoom, and reset controls around the existing cropper', () => {
    const container = document.getElementById('crop-image-container');
    container.innerHTML = '<img alt="crop preview">';
    const cropper = { rotate: jest.fn(), zoom: jest.fn(), reset: jest.fn() };
    container.querySelector('img').cropper = cropper;

    document.querySelector('[data-crop-action="rotate-left"]').click();
    document.querySelector('[data-crop-action="rotate-right"]').click();
    document.querySelector('[data-crop-action="zoom-out"]').click();
    document.querySelector('[data-crop-action="zoom-in"]').click();
    document.querySelector('[data-crop-action="reset"]').click();

    expect(cropper.rotate).toHaveBeenNthCalledWith(1, -90);
    expect(cropper.rotate).toHaveBeenNthCalledWith(2, 90);
    expect(cropper.zoom).toHaveBeenNthCalledWith(1, -0.1);
    expect(cropper.zoom).toHaveBeenNthCalledWith(2, 0.1);
    expect(cropper.reset).toHaveBeenCalledTimes(1);
  });
});
