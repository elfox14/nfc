'use strict';

(function installInteractFallback(global) {
  if (typeof global.interact === 'function') return;

  function createNoopInteraction() {
    return {
      draggable() { return this; },
      dropzone() { return this; },
      unset() { return this; }
    };
  }

  createNoopInteraction.modifiers = {
    restrictRect() { return {}; }
  };

  global.interact = createNoopInteraction;
  document.documentElement.dataset.editorDragMode = 'controls-only';
  console.warn('[Editor] Drag library unavailable; precise movement controls remain enabled.');
})(window);
