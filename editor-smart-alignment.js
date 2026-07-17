/**
 * MC PRIME NFC — Smart alignment v1.0
 * Aligns the selected element inside its current card face.
 */
(function (global) {
  'use strict';

  var document = global.document;
  if (!document || global.EditorSmartAlignment) return;

  var isAr = document.documentElement.lang !== 'en';
  var selectedElement = null;
  var panel = null;
  var SAFE_MARGIN = 12;

  function t(ar, en) { return isAr ? ar : en; }

  function selected() {
    if (global.EditorContextInspector && typeof global.EditorContextInspector.getSelected === 'function') {
      return global.EditorContextInspector.getSelected() || selectedElement;
    }
    return selectedElement;
  }

  function currentOffset(element) {
    return {
      x: parseFloat(element.getAttribute('data-x')) || 0,
      y: parseFloat(element.getAttribute('data-y')) || 0
    };
  }

  function applyOffset(element, x, y) {
    element.style.transform = 'translate(' + Math.round(x) + 'px, ' + Math.round(y) + 'px)';
    element.setAttribute('data-x', String(Math.round(x)));
    element.setAttribute('data-y', String(Math.round(y)));
    document.dispatchEvent(new global.CustomEvent('editor:mutation', {
      detail: { type: 'alignment', element: element, position: { x: Math.round(x), y: Math.round(y) } }
    }));
    if (global.StateManager && typeof global.StateManager.saveDebounced === 'function') global.StateManager.saveDebounced();
    if (global.EditorLayersPanel && typeof global.EditorLayersPanel.refresh === 'function') global.EditorLayersPanel.refresh();
  }

  function align(mode) {
    var element = selected();
    if (!element || element.dataset.editorLayerLocked === 'true') return false;
    var parent = element.closest('#card-front-content, #card-back-content, .card-content-layer');
    if (!parent) return false;

    var parentRect = parent.getBoundingClientRect();
    var elementRect = element.getBoundingClientRect();
    if (!parentRect.width || !parentRect.height || !elementRect.width || !elementRect.height) return false;
    var offset = currentOffset(element);
    var x = offset.x;
    var y = offset.y;

    if (mode === 'left') x += parentRect.left + SAFE_MARGIN - elementRect.left;
    if (mode === 'right') x += parentRect.right - SAFE_MARGIN - elementRect.right;
    if (mode === 'center-x') x += parentRect.left + (parentRect.width - elementRect.width) / 2 - elementRect.left;
    if (mode === 'top') y += parentRect.top + SAFE_MARGIN - elementRect.top;
    if (mode === 'bottom') y += parentRect.bottom - SAFE_MARGIN - elementRect.bottom;
    if (mode === 'center-y') y += parentRect.top + (parentRect.height - elementRect.height) / 2 - elementRect.top;

    applyOffset(element, x, y);
    flashGuide(parent, mode);
    return true;
  }

  function flashGuide(parent, mode) {
    var guide = document.createElement('span');
    guide.className = 'esa-guide esa-guide-' + mode;
    guide.setAttribute('aria-hidden', 'true');
    parent.appendChild(guide);
    global.setTimeout(function () { if (guide.parentNode) guide.parentNode.removeChild(guide); }, 650);
  }

  function button(mode, icon, label) {
    return '<button type="button" data-align="' + mode + '" title="' + label + '" aria-label="' + label + '"><i class="fas ' + icon + '"></i></button>';
  }

  function build() {
    if (panel && panel.isConnected) return panel;
    var host = document.getElementById('editor-context-inspector');
    if (!host) return null;
    panel = document.createElement('section');
    panel.id = 'editor-smart-alignment';
    panel.className = 'editor-smart-alignment eci-section';
    panel.hidden = true;
    panel.innerHTML = '<div class="esa-title"><span>' + t('المحاذاة الذكية', 'Smart alignment') + '</span><small>' + t('داخل الوجه الحالي', 'Within current face') + '</small></div><div class="esa-grid">' +
      button('left', 'fa-align-left', t('محاذاة لليسار', 'Align left')) +
      button('center-x', 'fa-arrows-left-right-to-line', t('توسيط أفقي', 'Center horizontally')) +
      button('right', 'fa-align-right', t('محاذاة لليمين', 'Align right')) +
      button('top', 'fa-arrow-up-to-line', t('محاذاة للأعلى', 'Align top')) +
      button('center-y', 'fa-arrows-up-down-to-line', t('توسيط رأسي', 'Center vertically')) +
      button('bottom', 'fa-arrow-down-to-line', t('محاذاة للأسفل', 'Align bottom')) +
      '</div>';
    var advanced = host.querySelector('#eci-advanced');
    if (advanced) host.insertBefore(panel, advanced);
    else host.appendChild(panel);
    panel.addEventListener('click', function (event) {
      var trigger = event.target.closest('[data-align]');
      if (trigger) align(trigger.dataset.align);
    });
    injectStyles();
    return panel;
  }

  function setSelection(element) {
    selectedElement = element || null;
    if (!panel) build();
    if (panel) {
      var canAlign = Boolean(selectedElement && selectedElement.closest && selectedElement.closest('.card-content-layer'));
      panel.hidden = !canAlign;
      panel.querySelectorAll('button').forEach(function (buttonElement) {
        buttonElement.disabled = !canAlign || selectedElement.dataset.editorLayerLocked === 'true';
      });
    }
  }

  function injectStyles() {
    if (document.getElementById('editor-smart-alignment-css')) return;
    var style = document.createElement('style');
    style.id = 'editor-smart-alignment-css';
    style.textContent = '.editor-smart-alignment[hidden]{display:none!important}.esa-title{display:flex;align-items:baseline;justify-content:space-between;gap:8px;margin-bottom:9px}.esa-title span{font-size:.72rem;color:var(--text-secondary)}.esa-title small{font-size:.58rem;color:var(--text-secondary);opacity:.7}.esa-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:5px}.esa-grid button{display:grid;place-items:center;min-height:32px;border:1px solid rgba(255,255,255,.08);border-radius:8px;background:rgba(255,255,255,.035);color:var(--text-secondary)}.esa-grid button:hover:not(:disabled){border-color:rgba(77,166,255,.3);background:rgba(77,166,255,.1);color:#79bdff}.esa-guide{position:absolute;z-index:9999;pointer-events:none;background:#4da6ff;box-shadow:0 0 8px rgba(77,166,255,.7)}.esa-guide-left,.esa-guide-right,.esa-guide-center-x{top:0;bottom:0;width:1px}.esa-guide-left{left:12px}.esa-guide-right{right:12px}.esa-guide-center-x{left:50%}.esa-guide-top,.esa-guide-bottom,.esa-guide-center-y{left:0;right:0;height:1px}.esa-guide-top{top:12px}.esa-guide-bottom{bottom:12px}.esa-guide-center-y{top:50%}';
    document.head.appendChild(style);
  }

  function init() {
    if (!build()) { global.setTimeout(init, 200); return; }
    document.addEventListener('editor:selectionchange', function (event) {
      setSelection(event.detail && event.detail.element);
    });
  }

  global.EditorSmartAlignment = {
    align: align,
    select: setSelection,
    getSelected: selected,
    setSafeMargin: function (value) { SAFE_MARGIN = Math.max(0, Number(value) || 0); return SAFE_MARGIN; }
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true });
  else init();
}(typeof window !== 'undefined' ? window : globalThis));
