/**
 * MC PRIME NFC — Editor shell bootstrap v4.0
 * Owns toolbar commands, panel navigation and deterministic Editor V2 loading.
 */
(function (global) {
  'use strict';

  var document = global.document;
  if (!document || global.EditorV2Bootstrap) return;

  var isAr = document.documentElement.lang !== 'en';
  var commands = Object.create(null);
  var delegated = false;
  var initialized = false;
  var EDITOR_V2_VERSION = '20260717.1';
  var MODULES = [
    ['editor-design-system.js', 'EditorDesignSystem'],
    ['editor-context-inspector.js', 'EditorContextInspector'],
    ['editor-layers-panel.js', 'EditorLayersPanel'],
    ['editor-smart-alignment.js', 'EditorSmartAlignment'],
    ['editor-smart-validation.js', 'EditorSmartValidation'],
    ['editor-publish-gate.js', 'EditorPublishGate'],
    ['editor-onboarding.js', 'EditorOnboarding'],
    ['editor-simple-mode.js', 'EditorSimpleMode']
  ];

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

  function closeMobileMenu(trigger) {
    var menu = trigger && trigger.closest ? trigger.closest('#toolbar-more-menu-floating') : null;
    if (menu) menu.classList.remove('open', 'show');
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
      closeMobileMenu(trigger);
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

  function buildTabNavigation() {
    var existing = document.getElementById('tb-pill-nav');
    if (existing) return existing;
    var host = document.querySelector('.tb-zone.tb-center');
    if (!host) return null;

    var nav = document.createElement('div');
    nav.id = 'tb-pill-nav';
    nav.className = 'tb-pill-nav';
    nav.setAttribute('role', 'tablist');
    nav.setAttribute('aria-label', isAr ? 'أقسام المحرر' : 'Editor sections');
    nav.innerHTML =
      '<button type="button" class="tb-tab" data-tab="tab-design" data-ac="active-design" role="tab" aria-controls="panel-design"><i class="fas fa-palette"></i><span>' + (isAr ? 'التصميم' : 'Design') + '</span></button>' +
      '<button type="button" class="tb-tab" data-tab="tab-content" data-ac="active-content" role="tab" aria-controls="panel-elements"><i class="fas fa-pen"></i><span>' + (isAr ? 'المحتوى' : 'Content') + '</span></button>' +
      '<button type="button" class="tb-tab" data-tab="tab-settings" data-ac="active-settings" role="tab" aria-controls="tb-settings-panel"><i class="fas fa-sliders"></i><span>' + (isAr ? 'الإعدادات' : 'Settings') + '</span></button>';
    host.insertBefore(nav, host.firstChild || null);
    return nav;
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
      button.tabIndex = active ? 0 : -1;
      if (active && button.dataset.ac) button.classList.add(button.dataset.ac);
    });

    setVisible(design, tabId === 'tab-design');
    setVisible(content, tabId === 'tab-content');
    setVisible(settings, tabId === 'tab-settings');
    document.documentElement.dataset.editorActiveTab = tabId;
    document.dispatchEvent(new global.CustomEvent('editor:tabchange', { detail: { tabId: tabId } }));
    return true;
  }

  function settingsButton(command, icon, label, className) {
    return '<button type="button" class="' + (className || 'tbs-full-btn') + '" data-editor-command="' + command + '">' +
      '<i class="fas ' + icon + '"></i><span>' + label + '</span></button>';
  }

  function buildSettingsPanel() {
    var existing = document.getElementById('tb-settings-panel');
    if (existing) return existing;
    var design = document.getElementById('panel-design');
    if (!design) return null;

    var panel = document.createElement('aside');
    panel.id = 'tb-settings-panel';
    panel.className = 'tb-settings-panel';
    panel.setAttribute('role', 'tabpanel');
    panel.hidden = true;
    panel.innerHTML =
      '<section class="tbs-section"><h3 class="tbs-title"><i class="fas fa-sliders-h"></i><span>' + (isAr ? 'إعدادات المحرر' : 'Editor settings') + '</span></h3>' +
      settingsButton('language.toggle', 'fa-language', 'AR / EN') +
      settingsButton('theme.toggle', 'fa-circle-half-stroke', isAr ? 'تبديل المظهر' : 'Toggle theme') + '</section>' +
      '<section class="tbs-section"><label class="tbs-range-label" for="tbs-qr-size"><span>' + (isAr ? 'حجم QR' : 'QR size') + '</span><output id="tbs-qr-size-output">30</output></label>' +
      '<input id="tbs-qr-size" class="tbs-range" type="range" min="15" max="55" value="30" data-editor-command-input="qr.resize"></section>' +
      '<section class="tbs-section">' +
      settingsButton('gallery.save', 'fa-bookmark', isAr ? 'حفظ في المعرض' : 'Save to gallery') +
      settingsButton('editor.share', 'fa-link', isAr ? 'مشاركة رابط المحرر' : 'Share editor link') +
      settingsButton('collaboration.start', 'fa-users', isAr ? 'تحرير جماعي' : 'Collaborative edit') + '</section>' +
      '<section class="tbs-section">' + settingsButton('design.reset', 'fa-trash-alt', isAr ? 'إعادة تعيين التصميم' : 'Reset design', 'tbs-full-btn tbs-danger-btn') + '</section>';

    var layout = design.parentElement;
    if (layout) layout.insertBefore(panel, design);
    else document.body.appendChild(panel);

    var range = panel.querySelector('#tbs-qr-size');
    var output = panel.querySelector('#tbs-qr-size-output');
    if (range && output) range.addEventListener('input', function () { output.textContent = range.value; });
    return panel;
  }

  function installStyles() {
    if (document.getElementById('tbs-css')) return;
    var style = document.createElement('style');
    style.id = 'tbs-css';
    style.textContent = '.tb-settings-panel{width:340px;min-width:340px;overflow:auto;height:100%;padding:18px;background:var(--form-bg,#0d1b2e);border-inline-end:1px solid rgba(77,166,255,.15);border-radius:20px;box-sizing:border-box}.tb-settings-panel[hidden]{display:none!important}.tbs-section{padding:14px;margin-bottom:12px;border:1px solid rgba(255,255,255,.08);border-radius:12px;background:rgba(255,255,255,.03)}.tbs-title{display:flex;align-items:center;gap:8px;margin:0 0 12px;font-size:.85rem}.tbs-full-btn{width:100%;display:flex;align-items:center;gap:8px;margin-bottom:7px;padding:10px 12px;border:1px solid rgba(255,255,255,.1);border-radius:9px;background:rgba(255,255,255,.05);color:inherit;font:inherit;cursor:pointer}.tbs-danger-btn{color:#e74c3c}.tbs-range-label{display:flex;justify-content:space-between;font-size:.75rem;margin-bottom:8px}.tbs-range{width:100%}@media(max-width:1024px){.tb-settings-panel{width:100%;min-width:0}}';
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
    return duplicates;
  }

  function loadModule(module) {
    var src = module[0];
    var globalName = module[1];
    if (global[globalName]) return Promise.resolve(globalName);
    var existing = document.querySelector('script[data-editor-v2-module="' + src + '"]');
    if (existing) {
      return new Promise(function (resolve, reject) {
        existing.addEventListener('load', function () { resolve(globalName); }, { once: true });
        existing.addEventListener('error', function () { reject(new Error('Failed to load ' + src)); }, { once: true });
      });
    }
    return new Promise(function (resolve, reject) {
      var script = document.createElement('script');
      script.src = src + '?v=' + EDITOR_V2_VERSION;
      script.async = false;
      script.dataset.editorV2Module = src;
      script.onload = function () { resolve(globalName); };
      script.onerror = function () {
        console.error('[EditorV2] Failed to load', src);
        reject(new Error('Failed to load ' + src));
      };
      document.head.appendChild(script);
    });
  }

  function loadEditorV2() {
    var chain = Promise.resolve();
    MODULES.forEach(function (module) {
      chain = chain.then(function () { return loadModule(module); });
    });
    return chain.then(function () {
      document.documentElement.dataset.editorV2Bootstrap = EDITOR_V2_VERSION;
      document.dispatchEvent(new global.CustomEvent('editor:v2bootstrap', { detail: { version: EDITOR_V2_VERSION } }));
      return true;
    }).catch(function (error) {
      document.documentElement.dataset.editorV2BootstrapError = error.message;
      return false;
    });
  }

  function init() {
    if (initialized) return true;
    var design = document.getElementById('panel-design');
    var content = document.getElementById('panel-elements');
    if (!design || !content) return false;

    initialized = true;
    var nav = buildTabNavigation();
    buildSettingsPanel();
    installStyles();
    bindProxies();
    if (nav) nav.querySelectorAll('.tb-tab').forEach(function (button) {
      button.addEventListener('click', function () { activateTab(button.dataset.tab); });
    });
    auditDuplicateIds();
    activateTab('tab-design');
    loadEditorV2();
    return true;
  }

  function scheduleInit() {
    if (init()) return;
    global.setTimeout(scheduleInit, 200);
  }

  installCommands();
  installDelegation();
  global.EditorCommands = {
    register: register,
    execute: execute,
    has: function (name) { return typeof commands[name] === 'function'; },
    list: function () { return Object.keys(commands); }
  };
  global.EditorTabs = { activate: activateTab };
  global.EditorV2Bootstrap = {
    init: init,
    load: loadEditorV2,
    version: EDITOR_V2_VERSION,
    modules: MODULES.map(function (module) { return module[0]; }),
    auditDuplicateIds: auditDuplicateIds
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', scheduleInit, { once: true });
  else scheduleInit();
}(typeof window !== 'undefined' ? window : globalThis));
