/**
 * MC PRIME NFC — Layers panel v1.0
 * Provides one reliable view of the elements on each card face.
 */
(function (global) {
  'use strict';

  var document = global.document;
  if (!document || global.EditorLayersPanel) return;

  var isAr = document.documentElement.lang !== 'en';
  var panel = null;
  var observer = null;
  var refreshTimer = null;
  var applyingOrder = false;
  var STORAGE_KEY = 'mcprime-editor-layers-v1';
  var core = {
    'card-logo': { ar: 'الشعار', en: 'Logo', visibility: 'visibility-logo' },
    'card-personal-photo-wrapper': { ar: 'الصورة الشخصية', en: 'Profile photo', visibility: 'visibility-photo' },
    'card-name': { ar: 'الاسم', en: 'Name', visibility: 'visibility-name' },
    'card-tagline': { ar: 'المسمى الوظيفي', en: 'Job title', visibility: 'visibility-tagline' },
    'qr-code-wrapper': { ar: 'رمز QR', en: 'QR code', visibility: 'visibility-qr' }
  };

  function t(ar, en) { return isAr ? ar : en; }

  function storageId() {
    var designId = global.Config && global.Config.currentDesignId;
    return STORAGE_KEY + ':' + (designId || 'draft');
  }

  function readState() {
    try { return JSON.parse(global.localStorage.getItem(storageId()) || '{"locks":{},"order":{}}'); }
    catch (error) { return { locks: {}, order: {} }; }
  }

  function writeState(state) {
    try { global.localStorage.setItem(storageId(), JSON.stringify(state)); }
    catch (error) { /* local persistence is optional */ }
  }

  function getElements(face) {
    var container = document.getElementById(face === 'front' ? 'card-front-content' : 'card-back-content');
    if (!container) return [];
    return Array.from(container.children).filter(function (element) {
      return Boolean(core[element.id]) || element.matches('.phone-button-draggable-wrapper, .draggable-social-link');
    });
  }

  function labelFor(element) {
    if (core[element.id]) return isAr ? core[element.id].ar : core[element.id].en;
    if (element.classList.contains('phone-button-draggable-wrapper')) {
      var phone = element.querySelector('.phone-button');
      return (phone && phone.textContent.trim()) || t('رقم هاتف', 'Phone number');
    }
    if (element.classList.contains('draggable-social-link')) {
      var social = element.querySelector('span');
      return (social && social.textContent.trim()) || t('رابط تواصل', 'Social link');
    }
    return element.id || t('عنصر', 'Element');
  }

  function iconFor(element) {
    if (element.id === 'card-logo') return 'fa-image';
    if (element.id === 'card-personal-photo-wrapper') return 'fa-user-circle';
    if (element.id === 'card-name' || element.id === 'card-tagline') return 'fa-font';
    if (element.id === 'qr-code-wrapper') return 'fa-qrcode';
    if (element.classList.contains('phone-button-draggable-wrapper')) return 'fa-phone';
    return 'fa-link';
  }

  function isVisible(element) {
    var descriptor = core[element.id];
    var control = descriptor && document.getElementById(descriptor.visibility);
    if (control) return control.checked;
    return !element.hidden && element.style.display !== 'none';
  }

  function isLocked(element) {
    return element.dataset.editorLayerLocked === 'true';
  }

  function setVisibility(element, visible) {
    var descriptor = core[element.id];
    var control = descriptor && document.getElementById(descriptor.visibility);
    if (control) {
      control.checked = visible;
      control.dispatchEvent(new global.Event('input', { bubbles: true }));
      control.dispatchEvent(new global.Event('change', { bubbles: true }));
    } else {
      element.hidden = !visible;
      element.style.display = visible ? '' : 'none';
    }
    document.dispatchEvent(new global.CustomEvent('editor:mutation', { detail: { type: 'visibility', element: element, visible: visible } }));
    scheduleRefresh();
    return visible;
  }

  function setLocked(element, locked) {
    element.dataset.editorLayerLocked = locked ? 'true' : 'false';
    element.classList.toggle('editor-layer-locked', locked);
    var state = readState();
    state.locks[element.id] = locked;
    writeState(state);
    document.dispatchEvent(new global.CustomEvent('editor:mutation', { detail: { type: 'lock', element: element, locked: locked } }));
    scheduleRefresh();
    return locked;
  }

  function saveOrder() {
    var state = readState();
    state.order.front = getElements('front').map(function (element) { return element.id; });
    state.order.back = getElements('back').map(function (element) { return element.id; });
    writeState(state);
  }

  function applyStoredState() {
    if (applyingOrder) return;
    applyingOrder = true;
    var state = readState();
    ['front', 'back'].forEach(function (face) {
      var container = document.getElementById(face === 'front' ? 'card-front-content' : 'card-back-content');
      var order = state.order && state.order[face];
      if (container && Array.isArray(order)) {
        order.forEach(function (id) {
          var element = document.getElementById(id);
          if (element && element.parentElement === container) container.appendChild(element);
        });
      }
    });
    Object.keys(state.locks || {}).forEach(function (id) {
      var element = document.getElementById(id);
      if (element) {
        element.dataset.editorLayerLocked = state.locks[id] ? 'true' : 'false';
        element.classList.toggle('editor-layer-locked', Boolean(state.locks[id]));
      }
    });
    applyingOrder = false;
  }

  function move(element, direction) {
    var sibling = direction === 'up' ? element.previousElementSibling : element.nextElementSibling;
    if (!sibling || sibling.parentElement !== element.parentElement) return false;
    if (direction === 'up') element.parentElement.insertBefore(element, sibling);
    else element.parentElement.insertBefore(sibling, element);
    saveOrder();
    document.dispatchEvent(new global.CustomEvent('editor:mutation', { detail: { type: 'order', element: element, direction: direction } }));
    scheduleRefresh();
    return true;
  }

  function select(element) {
    if (global.EditorContextInspector && typeof global.EditorContextInspector.select === 'function') {
      global.EditorContextInspector.select(element);
    } else {
      document.dispatchEvent(new global.CustomEvent('editor:selectionchange', { detail: { element: element } }));
    }
  }

  function row(element) {
    var visible = isVisible(element);
    var locked = isLocked(element);
    return '<li class="elp-row" data-layer-id="' + element.id + '">' +
      '<button type="button" class="elp-select"><i class="fas ' + iconFor(element) + '"></i><span>' + escapeHtml(labelFor(element)) + '</span></button>' +
      '<div class="elp-actions">' +
      '<button type="button" data-layer-action="up" title="' + t('رفع الطبقة', 'Move layer up') + '"><i class="fas fa-arrow-up"></i></button>' +
      '<button type="button" data-layer-action="down" title="' + t('خفض الطبقة', 'Move layer down') + '"><i class="fas fa-arrow-down"></i></button>' +
      '<button type="button" data-layer-action="visibility" aria-pressed="' + (visible ? 'true' : 'false') + '" title="' + t('إظهار أو إخفاء', 'Show or hide') + '"><i class="fas ' + (visible ? 'fa-eye' : 'fa-eye-slash') + '"></i></button>' +
      '<button type="button" data-layer-action="lock" aria-pressed="' + (locked ? 'true' : 'false') + '" title="' + t('قفل أو فتح', 'Lock or unlock') + '"><i class="fas ' + (locked ? 'fa-lock' : 'fa-lock-open') + '"></i></button>' +
      '</div></li>';
  }

  function faceGroup(face) {
    var elements = getElements(face);
    return '<section class="elp-face" data-layer-face="' + face + '"><h3><i class="fas fa-id-card"></i>' +
      (face === 'front' ? t('الوجه الأمامي', 'Front face') : t('الوجه الخلفي', 'Back face')) +
      '<span>' + elements.length + '</span></h3><ol>' +
      (elements.length ? elements.map(row).join('') : '<li class="elp-empty">' + t('لا توجد عناصر', 'No elements') + '</li>') +
      '</ol></section>';
  }

  function escapeHtml(value) {
    return String(value || '').replace(/[&<>"']/g, function (character) {
      return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character];
    });
  }

  function render() {
    if (!panel || !panel.isConnected) return false;
    applyStoredState();
    panel.querySelector('.elp-body').innerHTML = faceGroup('front') + faceGroup('back');
    return true;
  }

  function scheduleRefresh() {
    global.clearTimeout(refreshTimer);
    refreshTimer = global.setTimeout(render, 40);
  }

  function handleClick(event) {
    var rowElement = event.target.closest('.elp-row');
    if (!rowElement) return;
    var element = document.getElementById(rowElement.dataset.layerId);
    if (!element) return;
    var action = event.target.closest('[data-layer-action]');
    if (!action) { select(element); return; }
    if (action.dataset.layerAction === 'visibility') setVisibility(element, !isVisible(element));
    if (action.dataset.layerAction === 'lock') setLocked(element, !isLocked(element));
    if (action.dataset.layerAction === 'up' || action.dataset.layerAction === 'down') move(element, action.dataset.layerAction);
  }

  function build() {
    if (panel && panel.isConnected) return panel;
    var host = document.getElementById('editor-context-inspector') || document.getElementById('panel-elements');
    if (!host) return null;
    panel = document.createElement('section');
    panel.id = 'editor-layers-panel';
    panel.className = 'editor-layers-panel';
    panel.setAttribute('aria-label', t('طبقات البطاقة', 'Card layers'));
    panel.innerHTML = '<header class="elp-header"><div><span>' + t('تنظيم العناصر', 'Element organization') + '</span><h2>' + t('الطبقات', 'Layers') + '</h2></div><button type="button" id="elp-refresh" title="' + t('تحديث الطبقات', 'Refresh layers') + '"><i class="fas fa-rotate"></i></button></header><div class="elp-body"></div>';
    host.appendChild(panel);
    panel.addEventListener('click', handleClick);
    panel.querySelector('#elp-refresh').addEventListener('click', render);
    injectStyles();
    return panel;
  }

  function observe() {
    if (observer || typeof global.MutationObserver !== 'function') return;
    var front = document.getElementById('card-front-content');
    var back = document.getElementById('card-back-content');
    if (!front || !back) return;
    observer = new global.MutationObserver(function () {
      if (!applyingOrder) scheduleRefresh();
    });
    observer.observe(front, { childList: true });
    observer.observe(back, { childList: true });
  }

  function injectStyles() {
    if (document.getElementById('editor-layers-panel-css')) return;
    var style = document.createElement('style');
    style.id = 'editor-layers-panel-css';
    style.textContent = '.editor-layers-panel{margin-top:14px;padding-top:14px;border-top:1px solid rgba(255,255,255,.08)}.elp-header,.elp-face h3,.elp-row,.elp-actions{display:flex;align-items:center}.elp-header{justify-content:space-between;margin-bottom:10px}.elp-header span{font-size:.65rem;color:var(--text-secondary)}.elp-header h2{margin:2px 0 0;font-size:.95rem}.elp-header>button{width:32px;height:32px;border:1px solid rgba(255,255,255,.1);border-radius:8px;background:rgba(255,255,255,.04);color:inherit}.elp-face{margin-bottom:10px}.elp-face h3{gap:6px;margin:0 0 6px;font-size:.7rem;color:var(--text-secondary)}.elp-face h3 span{margin-inline-start:auto;padding:1px 6px;border-radius:999px;background:rgba(255,255,255,.06)}.elp-face ol{display:grid;gap:5px;margin:0;padding:0;list-style:none}.elp-row{gap:5px;padding:5px;border:1px solid rgba(255,255,255,.07);border-radius:9px;background:rgba(255,255,255,.025)}.elp-select{display:flex;align-items:center;gap:7px;min-width:0;flex:1;border:0;background:transparent;color:inherit;text-align:start;font:inherit;font-size:.7rem}.elp-select span{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.elp-actions{gap:2px}.elp-actions button{width:25px;height:25px;padding:0;border:0;border-radius:6px;background:transparent;color:var(--text-secondary);font-size:.62rem}.elp-actions button:hover{background:rgba(77,166,255,.12);color:#79bdff}.elp-empty{padding:8px;text-align:center;color:var(--text-secondary);font-size:.68rem}.editor-layer-locked{cursor:not-allowed!important}.editor-layer-locked::before{content:"";position:absolute;inset:0;z-index:100;pointer-events:auto}@media(max-width:1024px){.editor-layers-panel{margin-bottom:80px}}';
    document.head.appendChild(style);
  }

  function init() {
    if (!build()) { global.setTimeout(init, 200); return; }
    applyStoredState();
    render();
    observe();
  }

  global.EditorLayersPanel = {
    render: render,
    refresh: scheduleRefresh,
    getElements: getElements,
    setVisibility: setVisibility,
    setLocked: setLocked,
    move: move,
    disconnect: function () { if (observer) observer.disconnect(); observer = null; }
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true });
  else init();
}(typeof window !== 'undefined' ? window : globalThis));
