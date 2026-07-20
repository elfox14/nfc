(function installEditorHydration(global) {
  'use strict';

  if (global.EditorHydration) return;

  const document = global.document;
  const root = document?.documentElement;
  let revealPromise = null;

  function getStage() {
    return document?.getElementById('cards-wrapper') || null;
  }

  function setBusy(busy) {
    const stage = getStage();
    if (stage) stage.setAttribute('aria-busy', busy ? 'true' : 'false');
  }

  function markPending() {
    if (root) {
      root.dataset.editorHydrated = 'false';
      root.dataset.editorHydration = 'pending';
    }
    setBusy(true);
  }

  function waitForFrame() {
    return new Promise((resolve) => {
      if (typeof global.requestAnimationFrame === 'function') {
        global.requestAnimationFrame(() => resolve());
      } else {
        global.setTimeout(resolve, 0);
      }
    });
  }

  async function waitForImage(image) {
    if (!image || image.complete) {
      try {
        await image?.decode?.();
      } catch {
        // A failed optional preview must not keep the editor hidden.
      }
      return;
    }

    await new Promise((resolve) => {
      const done = () => resolve();
      image.addEventListener('load', done, { once: true });
      image.addEventListener('error', done, { once: true });
    });
  }

  async function settleAssets({ timeoutMs = 1400 } = {}) {
    const stage = getStage();
    const images = stage ? Array.from(stage.querySelectorAll('img[src]')) : [];
    const fontsReady = document?.fonts?.ready || Promise.resolve();
    const assetsReady = Promise.allSettled([
      fontsReady,
      ...images.map((image) => waitForImage(image))
    ]);

    await new Promise((resolve) => {
      const timeout = global.setTimeout(resolve, timeoutMs);
      assetsReady.finally(() => {
        global.clearTimeout(timeout);
        resolve();
      });
    });
    await waitForFrame();
    await waitForFrame();
  }

  async function reveal(options = {}) {
    if (root?.dataset.editorHydrated === 'true') return true;
    if (revealPromise) return revealPromise;

    revealPromise = (async () => {
      await settleAssets(options);
      if (root) {
        root.dataset.editorHydrated = 'true';
        root.dataset.editorHydration = 'ready';
      }
      setBusy(false);
      document?.dispatchEvent(new global.CustomEvent('editor:hydrated'));
      return true;
    })();

    try {
      return await revealPromise;
    } finally {
      revealPromise = null;
    }
  }

  markPending();
  global.EditorHydration = { markPending, reveal, settleAssets };
})(window);
