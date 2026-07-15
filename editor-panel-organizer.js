(function (global) {
  'use strict';

  var document = global.document;
  if (!document || global.EditorPanelOrganizer) return;

  var isAr = document.documentElement.lang !== 'en';
  var STORAGE_KEY = 'mcprime-editor-panel-state-v1';
  var roots = [];

  function getTitle(section) {
    var heading = section.querySelector('summary, legend, h2, h3, h4, .section-title, .fieldset-title');
    return (heading && heading.textContent || section.getAttribute('aria-label') || section.id || '').trim();
  }

  function getSections(root) {
    if (!root) return [];
    return Array.from(root.querySelectorAll(':scope > details, :scope > fieldset, :scope > section, :scope > .ed-section')).filter(function (section) {
      return !section.classList.contains('epo-toolbar') && section.id !== 'editor-design-score';
    });
  }

  function readState() {
    try { return JSON.parse(global.localStorage.getItem(STORAGE_KEY) || '{}'); }
    catch (error) { return {}; }
  }

  function writeState() {
    var state = {};
    roots.forEach(function (root) {
      getSections(root).forEach(function (section) {
        if (!section.id) return;
        state[section.id] = section.tagName === 'DETAILS' ? section.open : !section.hidden;
      });
    });
    try { global.localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); }
    catch (error) { /* optional */ }
  }

  function closeOthers(root, current) {
    getSections(root).forEach(function (section) {
      if (section === current) return;
      if (section.tagName === 'DETAILS') section.open = false;
    });
  }

  function filter(root, query) {
    query = String(query || '').trim().toLocaleLowerCase();
    var matches = 0;
    getSections(root).forEach(function (section) {
      var title = getTitle(section).toLocaleLowerCase();
      var text = section.textContent.toLocaleLowerCase();
      var visible = !query || title.indexOf(query) !== -1 || text.indexOf(query) !== -1;
      section.classList.toggle('epo-filtered-out', !visible);
      if (visible) matches += 1;
    });
    var counter = root.querySelector('.epo-count');
    if (counter) counter.textContent = String(matches);
    return matches;
  }

  function collapseAll(root) {
    getSections(root).forEach(function (section) {
      if (section.tagName === 'DETAILS') section.open = false;
    });
    writeState();
  }

  function expandFirst(root) {
    var first = getSections(root).find(function (section) { return !section.classList.contains('epo-filtered-out'); });
    if (!first) return false;
    if (first.tagName === 'DETAILS') {
      closeOthers(root, first);
      first.open = true;
    }
    if (first.scrollIntoView) first.scrollIntoView({ behavior: 'smooth', block: 'start' });
    writeState();
    return true;
  }

  function buildToolbar(root) {
    if (root.querySelector(':scope > .epo-toolbar')) return;
    var toolbar = document.createElement('div');
    toolbar.className = 'epo-toolbar';
    toolbar.innerHTML =
      '<label class="epo-search"><i class="fas fa-search"></i><input type="search" placeholder="' + (isAr ? 'ابحث في الأدوات' : 'Search tools') + '" aria-label="' + (isAr ? 'البحث في أدوات المحرر' : 'Search editor tools') + '"></label>' +
      '<span class="epo-count" aria-live="polite"></span>' +
      '<button type="button" class="epo-collapse" title="' + (isAr ? 'طي الكل' : 'Collapse all') + '"><i class="fas fa-angles-up"></i></button>';
    root.insertBefore(toolbar, root.firstChild);
    var input = toolbar.querySelector('input');
    input.addEventListener('input', function () { filter(root, input.value); });
    toolbar.querySelector('.epo-collapse').addEventListener('click', function () { collapseAll(root); });
    filter(root, '');
  }

  function organize(root) {
    if (!root || root.dataset.panelOrganized === 'true') return root;
    root.dataset.panelOrganized = 'true';
    root.classList.add('epo-root');
    roots.push(root);
    buildToolbar(root);

    var state = readState();
    var sections = getSections(root);
    sections.forEach(function (section, index) {
      section.classList.add('epo-section');
      if (section.tagName === 'DETAILS') {
        if (Object.prototype.hasOwnProperty.call(state, section.id)) section.open = Boolean(state[section.id]);
        else section.open = index === 0;
        section.addEventListener('toggle', function () {
          if (section.open) closeOthers(root, section);
          writeState();
        });
      }
    });
    return root;
  }

  function injectStyles() {
    if (document.getElementById('editor-panel-organizer-css')) return;
    var style = document.createElement('style');
    style.id = 'editor-panel-organizer-css';
    style.textContent = '.epo-root{display:flex;flex-direction:column;gap:9px}.epo-toolbar{position:sticky;top:0;z-index:8;display:grid;grid-template-columns:1fr auto auto;align-items:center;gap:7px;padding:9px;background:var(--sidebar-bg,#0d1b2e);border-bottom:1px solid rgba(255,255,255,.08)}.epo-search{display:flex;align-items:center;gap:7px;padding:0 10px;border:1px solid rgba(255,255,255,.1);border-radius:10px;background:rgba(255,255,255,.04)}.epo-search input{min-width:0;width:100%;height:34px;border:0!important;background:transparent!important;box-shadow:none!important;padding:0!important}.epo-search i{font-size:.7rem;opacity:.65}.epo-count{min-width:24px;text-align:center;font-size:.68rem;opacity:.68}.epo-collapse{width:34px;height:34px;padding:0!important}.epo-section{margin:0 9px!important}.epo-section[open]{border-color:rgba(77,166,255,.25)!important}.epo-filtered-out{display:none!important}.epo-section>summary{position:sticky;top:53px;z-index:2;background:inherit}@media(max-width:760px){.epo-toolbar{top:0;padding:7px}.epo-section{margin-inline:6px!important}}';
    document.head.appendChild(style);
  }

  function init() {
    injectStyles();
    ['panel-design', 'panel-elements', 'tb-settings-panel'].forEach(function (id) { organize(document.getElementById(id)); });
  }

  global.EditorPanelOrganizer = {
    organize: organize,
    filter: filter,
    collapseAll: collapseAll,
    expandFirst: expandFirst,
    getSections: getSections
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true });
  else init();
}(typeof window !== 'undefined' ? window : globalThis));