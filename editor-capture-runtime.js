'use strict';

/**
 * Reliable card capture for cloud thumbnails.
 *
 * The legacy path allowed cross-origin images to taint the canvas and relied on
 * one high-resolution PNG encoding attempt. This runtime keeps the editor DOM
 * stable, waits for visible assets, retries at safer scales, and removes only
 * unsafe external imagery on the final fallback attempt.
 */
(function installEditorCaptureRuntime(global) {
  const CAPTURE_TIMEOUT_MS = 12_000;
  const ASSET_WAIT_MS = 2_500;
  const activeCaptures = new Map();

  if (
    typeof ExportManager === 'undefined' ||
    typeof ShareManager === 'undefined' ||
    typeof Utils === 'undefined' ||
    typeof UIManager === 'undefined'
  ) {
    console.error('[EditorCaptureRuntime] Editor capture dependencies are unavailable.');
    return;
  }

  function withTimeout(operation, ms, message) {
    return new Promise((resolve, reject) => {
      const timer = global.setTimeout(() => reject(new Error(message)), ms);
      Promise.resolve(operation).then(
        value => {
          global.clearTimeout(timer);
          resolve(value);
        },
        error => {
          global.clearTimeout(timer);
          reject(error);
        }
      );
    });
  }

  async function waitForAssets(element) {
    const tasks = [];
    if (document.fonts?.ready) tasks.push(Promise.resolve(document.fonts.ready));

    element.querySelectorAll('img').forEach(image => {
      if (image.complete) return;
      tasks.push(new Promise(resolve => {
        image.addEventListener('load', resolve, { once: true });
        image.addEventListener('error', resolve, { once: true });
      }));
    });

    if (!tasks.length) return;
    await Promise.race([
      Promise.allSettled(tasks),
      new Promise(resolve => global.setTimeout(resolve, ASSET_WAIT_MS))
    ]);
  }

  function isExternalUrl(value) {
    if (!value || /^(?:data:|blob:|#)/i.test(value)) return false;
    try {
      return new URL(value, global.location.href).origin !== global.location.origin;
    } catch (_) {
      return false;
    }
  }

  function sanitizeExternalAssets(clonedElement) {
    if (!clonedElement) return;

    clonedElement.querySelectorAll('img').forEach(image => {
      const source = image.currentSrc || image.src;
      if (isExternalUrl(source)) {
        image.removeAttribute('src');
        image.removeAttribute('srcset');
        image.style.visibility = 'hidden';
      }
    });

    const nodes = [clonedElement, ...clonedElement.querySelectorAll('*')];
    nodes.forEach(node => {
      const computed = node.ownerDocument?.defaultView?.getComputedStyle(node);
      const background = computed?.backgroundImage || '';
      const urls = [...background.matchAll(/url\(["']?([^"')]+)["']?\)/g)];
      if (urls.some(match => isExternalUrl(match[1]))) node.style.backgroundImage = 'none';
    });
  }

  function applyCaptureLayout(element) {
    const restore = [];
    const remember = (target, styles) => {
      if (!target) return;
      const previous = {};
      Object.entries(styles).forEach(([property, value]) => {
        previous[property] = {
          value: target.style.getPropertyValue(property),
          priority: target.style.getPropertyPriority(property)
        };
        target.style.setProperty(property, value, 'important');
      });
      restore.push(() => {
        Object.entries(previous).forEach(([property, prior]) => {
          if (prior.value) target.style.setProperty(property, prior.value, prior.priority);
          else target.style.removeProperty(property);
        });
      });
    };

    const noExportStyle = document.createElement('style');
    noExportStyle.textContent = '.no-export { display: none !important; }';
    document.head.appendChild(noExportStyle);
    restore.push(() => noExportStyle.remove());

    remember(document.getElementById('cards-wrapper'), { transform: 'none' });
    remember(element, {
      display: 'block',
      visibility: 'visible',
      opacity: '1',
      'backface-visibility': 'visible',
      '-webkit-backface-visibility': 'visible',
      transform: 'none'
    });

    if (global.MobileUtils?.isMobile?.()) {
      const showBack = element.id === 'card-back-preview';
      remember(document.querySelector('.card-flipper-container'), {
        perspective: 'none',
        'transform-style': 'flat',
        transform: 'none'
      });
      remember(document.querySelector('.card-flipper'), {
        'transform-style': 'flat',
        transform: 'none',
        transition: 'none'
      });
      document.querySelectorAll('.card-face').forEach(face => {
        const visible = face.classList.contains('card-front') ? !showBack : showBack;
        remember(face, {
          'backface-visibility': 'visible',
          '-webkit-backface-visibility': 'visible',
          transform: 'none',
          position: 'absolute',
          top: '0',
          left: '0',
          visibility: visible ? 'visible' : 'hidden',
          'z-index': visible ? '10' : '-1'
        });
      });
    }

    return () => {
      for (let index = restore.length - 1; index >= 0; index -= 1) restore[index]();
    };
  }

  async function renderCanvas(element, scale, stripExternalAssets) {
    if (!element) throw new Error('Card face is unavailable.');
    await Utils.loadScript(Config.SCRIPT_URLS.html2canvas);
    const renderer = global.html2canvas || (typeof html2canvas === 'function' ? html2canvas : null);
    if (!renderer) throw new Error('Card capture renderer is unavailable.');

    const restoreLayout = applyCaptureLayout(element);
    try {
      const nextFrame = global.requestAnimationFrame || (callback => global.setTimeout(callback, 0));
      await new Promise(resolve => nextFrame(() => nextFrame(resolve)));
      return await withTimeout(
        renderer(element, {
          backgroundColor: null,
          scale,
          useCORS: true,
          allowTaint: false,
          imageTimeout: 8_000,
          logging: false,
          scrollX: 0,
          scrollY: 0,
          windowWidth: Math.max(1_400, document.documentElement.clientWidth),
          windowHeight: Math.max(900, document.documentElement.clientHeight),
          onclone: (_clonedDocument, clonedElement) => {
            if (stripExternalAssets) sanitizeExternalAssets(clonedElement);
          }
        }),
        CAPTURE_TIMEOUT_MS,
        'Card capture timed out.'
      );
    } finally {
      restoreLayout();
    }
  }

  function canvasToBlob(canvas) {
    return withTimeout(
      new Promise((resolve, reject) => {
        try {
          canvas.toBlob(blob => {
            if (!blob || !blob.size) reject(new Error('Canvas returned an empty PNG.'));
            else resolve(blob);
          }, 'image/png');
        } catch (error) {
          reject(error);
        }
      }),
      CAPTURE_TIMEOUT_MS,
      'PNG encoding timed out.'
    );
  }

  async function captureBlob(element) {
    const attempts = [
      { scale: 2, stripExternalAssets: false },
      { scale: 1.25, stripExternalAssets: false },
      { scale: 1, stripExternalAssets: true }
    ];
    const failures = [];
    await waitForAssets(element);

    for (const attempt of attempts) {
      try {
        const canvas = await renderCanvas(element, attempt.scale, attempt.stripExternalAssets);
        return await canvasToBlob(canvas);
      } catch (error) {
        failures.push(error);
        console.warn('[EditorCaptureRuntime] Capture attempt failed.', {
          face: element?.id,
          scale: attempt.scale,
          stripExternalAssets: attempt.stripExternalAssets,
          error
        });
      }
    }

    throw new AggregateError(failures, 'All safe card capture attempts failed.');
  }

  async function captureAndUploadCard(element, purpose = null) {
    const key = `${element?.id || 'card'}:${purpose || 'capture'}`;
    if (activeCaptures.has(key)) return activeCaptures.get(key);

    const operation = (async () => {
      const blob = await captureBlob(element);
      const file = new File([blob], `${purpose || 'card-capture'}.png`, { type: 'image/png' });
      return UIManager.uploadImageToServer(file, purpose);
    })();
    activeCaptures.set(key, operation);

    try {
      return await operation;
    } finally {
      activeCaptures.delete(key);
    }
  }

  ExportManager.captureElementSafe = renderCanvas;
  ShareManager.captureAndUploadCard = captureAndUploadCard;

  global.EditorCaptureRuntime = Object.freeze({
    captureAndUploadCard,
    captureBlob,
    canvasToBlob,
    sanitizeExternalAssets
  });
})(window);
