(function (global) {
  'use strict';

  var document = global.document;
  if (!document) return;

  var isAr = document.documentElement.lang !== 'en';
  var commands = Object.create(null);
  var delegated = false;
  var EDITOR_V2_VERSION = '20260715.2';

  function register(name, handler) {
    if (!name || typeof handler !== 'function') return false;
    commands[name] = handler;
    return true;
  }

  function execute(name, context) {
    var handler = commands[name];
    if (typeof handler !== 'function') {
      console.warn('[EditorCommands] Unknown command:', name);
      return false;
    }
    try {
      var result = handler(context || {});
      document.dispatchEvent(new global.CustomEvent('editor:command', {
        detail: { name: name, context: context || {}, result: result }
      }));
      return result !== false;
    } catch (error) {
      console.error('[EditorCommands] Command failed:', name, error);
      return false;
    }
  }

  function click(id) {
    var element = document.getElementById(id);
    if (!element || typeof element.click !== 'function') return false;
    element.click();
    return true;
  }

  function proxy(name, id) {
    register(name, function () { return click(id); });
  }

  function installCommands() {
    proxy('language.toggle', 'lang-toggle-btn');
    proxy('theme.toggle', 'theme-toggle-btn');
    proxy('gallery.open', 'show-gallery-btn');
    proxy('gallery.save', 'save-to-gallery-btn');
    proxy('collaboration.start', 'start-collab-btn');
    proxy('editor.share', 'share-editor-btn');
    proxy('editor.save-share', 'save-share-btn');
    proxy('design.reset', 'reset-design-btn');
    register('qr.resize', function (context) {
      var input = document.getElementById('qr-size');
      if (!input || context.value === undefined) return false;
      input.value = context.value;
      input.dispatchEvent(new global.Event('input', { bubbles: true }));
      return true;
    });
  }

  function bindProxies() {
    var bindings = {
      'theme-toggle-btn-menu': 'theme.toggle',
      'show-gallery-btn-menu': 'gallery.open',
      'save-to-gallery-btn-menu': 'gallery.save',
      'start-collab-btn-menu': 'collaboration.start',
      'share-editor-btn-menu': 'editor.share',
      'reset-design-btn-menu': 'design.reset',
      'reset-design-btn-more': 'design.reset',
      'mobile-save-btn': 'editor.save-share',
      'mobile-share-btn': 'editor.share'
    };
    Object.keys(bindings).forEach(function (id) {
      var element = document.getElementById(id);
      if (element) element.dataset.editorCommand = bindings[id];
    });
  }

  function installDelegation() {
    if (delegated) return;
    delegated = true;
    document.addEventListener('click', function (event) {
      var trigger = event.target.closest && event.target.closest('[data-editor-command]');
      if (!trigger || trigger.disabled) return;
      event.preventDefault();
      event.stopPropagation();
      execute(trigger.dataset.editorCommand, { trigger: trigger, event: event });
    }, true);
    document.addEventListener('input', function (event) {
      var trigger = event.target.closest && event.target.closest('[data-editor-command-input]');
      if (!trigger || trigger.disabled) return;
      execute(trigger.dataset.editorCommandInput, {
        trigger: trigger,
        event: event,
        value: trigger.value
      });
    }, true);
  }

  function setVisible(element, visible) {
    if (!element) return;
    element.hidden = !visible;
    element.style.display = visible ? '' : 'none';
    element.setAttribute('aria-hidden', visible ? 'false' : 'true');
  }

  function activateTab(tabId) {
    var design = document.getElementById('panel-design');
    var content = document.getElementById('panel-elements');
    var settings = document.getElementById('tb-settings-panel');
    var nav = document.getElementById('tb-pill-nav');

    if (nav) nav.querySelectorAll('.tb-tab').forEach(function (button) {
      var active = button.dataset.tab === tabId;
      button.classList.remove('active-design', 'active-content', 'active-settings');
      button.setAttribute('aria-selected', active ? 'true' : 'false');
      if (active && button.dataset.ac) button.classList.add(button.dataset.ac);
    });

    setVisible(design, tabId === 'tab-design');
    setVisible(content, tabId === 'tab-content');
    setVisible(settings, tabId === 'tab-settings');
    document.dispatchEvent(new global.CustomEvent('editor:tabchange', { detail: { tabId: tabId } }));
  }

  function settingsButton(command, icon, label, className) {
    return '<button type="button" class="' + (className || 'tbs-full-btn') + '" data-editor-command="' + command + '">' +
      '<i class="fas ' + icon + '"></i><span>' + label + '</span></button>';
  }

  function buildSettingsPanel() {
    if (document.getElementById('tb-settings-panel')) return;
    var design = document.getElementById('panel-design');
    if (!design) return;

    var panel = document.createElement('aside');
    panel.id = 'tb-settings-panel';
    panel.className = 'tb-settings-panel';
    panel.hidden = true;
    panel.innerHTML =
      '<section class="tbs-section"><h3 class="tbs-title"><i class="fas fa-sliders-h"></i><span>' + (isAr ? 'إعدادات المحرر' : 'Editor settings') + '</span></h3>' +
      settingsButton('language.toggle', 'fa-language', 'AR / EN') +
      settingsButton('theme.toggle', 'fa-circle-half-stroke', isAr ? 'تبديل المظهر' : 'Toggle theme') + '</section>' +
      '<section class="tbs-section"><label class="tbs-range-label" for="tbs-qr-size"><span>' + (isAr ? 'حجم QR' : 'QR size') + '</span><output id="tbs-qr-size-output">30</output></label>' +
      '<input id="tbs-qr-size" class="tbs-range" type="range" min="15" max="55" value="30" data-editor-command-input="qr.resize"></section>' +
      '<section class="tbs-section">' +
      settingsButton('gallery.save', 'fa-bookmark', isAr ? 'حفظ في المعرض' : 'Save to gallery') +
      settingsButton('editor.share', 'fa-link', isAr ? 'مشاركة الرابط' : 'Share editor link') +
      settingsButton('collaboration.start', 'fa-users', isAr ? 'تحرير جماعي' : 'Collaborative edit') + '</section>' +
      '<section class="tbs-section">' + settingsButton('design.reset', 'fa-trash-alt', isAr ? 'إعادة تعيين التصميم' : 'Reset design', 'tbs-full-btn tbs-danger-btn') + '</section>';

    var layout = design.parentElement;
    if (layout) layout.insertBefore(panel, design);
    else document.body.appendChild(panel);

    var range = panel.querySelector('#tbs-qr-size');
    var output = panel.querySelector('#tbs-qr-size-output');
    if (range && output) range.addEventListener('input', function () { output.textContent = range.value; });
  }

  function installStyles() {
    if (document.getElementById('tbs-css')) return;
    var style = document.createElement('style');
    style.id = 'tbs-css';
    style.textContent = '.tb-settings-panel{display:none;overflow:auto;height:100%;padding:18px;background:var(--form-bg,#0d1b2e);border-inline-end:1px solid rgba(77,166,255,.15);box-sizing:border-box}.tbs-section{padding:14px;margin-bottom:12px;border:1px solid rgba(255,255,255,.08);border-radius:12px;background:rgba(255,255,255,.03)}.tbs-title{display:flex;align-items:center;gap:8px;margin:0 0 12px;font-size:.85rem}.tbs-full-btn{width:100%;display:flex;align-items:center;gap:8px;margin-bottom:7px;padding:10px 12px;border:1px solid rgba(255,255,255,.1);border-radius:9px;background:rgba(255,255,255,.05);color:inherit;font:inherit;cursor:pointer}.tbs-danger-btn{color:#e74c3c}.tbs-range-label{display:flex;justify-content:space-between;font-size:.75rem;margin-bottom:8px}.tbs-range{width:100%}';
    document.head.appendChild(style);
  }

  function auditDuplicateIds() {
    var seen = Object.create(null);
    document.querySelectorAll('[id]').forEach(function (element) {
      seen[element.id] = (seen[element.id] || 0) + 1;
    });
    var duplicates = Object.keys(seen).filter(function (id) { return seen[id] > 1; });
    document.documentElement.dataset.editorDuplicateIdCount = String(duplicates.length);
    if (duplicates.length) console.warn('[EditorShell] Duplicate ids detected:', duplicates);
  }

  function loadEditorV2() {
    var modules = [
      ['editor-context-inspector.js', 'EditorContextInspector'],
      ['editor-design-system.js', 'EditorDesignSystem'],
      ['editor-onboarding.js', 'EditorOnboarding'],
      ['editor-simple-mode.js', 'EditorSimpleMode'],
      ['editor-smart-validation.js', 'EditorSmartValidation'],
      ['editor-publish-gate.js', 'EditorPublishGate']
    ];

    modules.forEach(function (module) {
      if (global[module[1]] || document.querySelector('script[data-editor-v2-module="' + module[0] + '"]')) return;
      var script = document.createElement('script');
      script.src = module[0] + '?v=' + EDITOR_V2_VERSION;
      script.defer = true;
      script.dataset.editorV2Module = module[0];
      script.onerror = function () { console.error('[EditorV2] Failed to load', module[0]); };
      document.head.appendChild(script);
    });

    document.documentElement.dataset.editorV2Bootstrap = EDITOR_V2_VERSION;
    document.dispatchEvent(new global.CustomEvent('editor:v2bootstrap', { detail: { version: EDITOR_V2_VERSION } }));
  }

  function init() {
    var design = document.getElementById('panel-design');
    var content = document.getElementById('panel-elements');
    var nav = document.getElementById('tb-pill-nav');
    if (!design || !content || !nav) {
      global.setTimeout(init, 200);
      return;
    }

    buildSettingsPanel();
    installStyles();
    bindProxies();
    nav.querySelectorAll('.tb-tab').forEach(function (button) {
      button.setAttribute('role', 'tab');
      button.addEventListener('click', function () { activateTab(button.dataset.tab); });
    });
    auditDuplicateIds();
    activateTab('tab-design');
    loadEditorV2();
  }

  installCommands();
  installDelegation();
  global.EditorCommands = { register: register, execute: execute, has: function (name) { return typeof commands[name] === 'function'; }, list: function () { return Object.keys(commands); } };
  global.EditorTabs = { activate: activateTab };
  global.EditorV2Bootstrap = { load: loadEditorV2, version: EDITOR_V2_VERSION };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true });
  else init();
}(typeof window !== 'undefined' ? window : globalThis));
