/**
 * @jest-environment jsdom
 */
'use strict';

const fs = require('fs');
const path = require('path');

describe('Editor P0 shell', () => {
  const moduleGlobals = [
    'EditorDesignSystem',
    'EditorContextInspector',
    'EditorLayersPanel',
    'EditorSmartAlignment',
    'EditorSmartValidation',
    'EditorPublishGate',
    'EditorOnboarding',
    'EditorSimpleMode'
  ];

  beforeEach(() => {
    jest.resetModules();
    delete window.EditorV2Bootstrap;
    delete window.EditorCommands;
    delete window.EditorTabs;
    moduleGlobals.forEach((name) => { window[name] = {}; });
    document.documentElement.lang = 'ar';
    document.head.innerHTML = '';
    document.body.innerHTML = `
      <header class="pro-toolbar"><div class="tb-zone tb-center"></div></header>
      <div class="pro-layout">
        <aside id="panel-design"></aside>
        <aside id="panel-elements"></aside>
      </div>
      <button id="lang-toggle-btn"></button>
      <button id="theme-toggle-btn"></button>
      <button id="show-gallery-btn"></button>
      <button id="save-to-gallery-btn"></button>
      <button id="start-collab-btn"></button>
      <button id="share-editor-btn"></button>
      <button id="save-share-btn"></button>
      <button id="reset-design-btn"></button>
      <input id="qr-size" value="30">
    `;
    require('../toolbar-tab-nav');
    document.dispatchEvent(new Event('DOMContentLoaded'));
  });

  afterEach(() => {
    moduleGlobals.forEach((name) => { delete window[name]; });
    delete window.EditorV2Bootstrap;
    delete window.EditorCommands;
    delete window.EditorTabs;
  });

  test('contains no unresolved merge conflict and parses as JavaScript', () => {
    const source = fs.readFileSync(path.join(__dirname, '..', 'toolbar-tab-nav.js'), 'utf8');
    expect(source).not.toMatch(/^(<<<<<<<|=======|>>>>>>>)/m);
    expect(() => new Function(source)).not.toThrow();
  });

  test('creates the missing tab navigation and switches panels', () => {
    const nav = document.getElementById('tb-pill-nav');
    expect(nav).not.toBeNull();
    expect(nav.querySelectorAll('[role="tab"]')).toHaveLength(3);
    expect(document.getElementById('panel-design').hidden).toBe(false);

    nav.querySelector('[data-tab="tab-content"]').click();
    expect(document.getElementById('panel-design').hidden).toBe(true);
    expect(document.getElementById('panel-elements').hidden).toBe(false);

    nav.querySelector('[data-tab="tab-settings"]').click();
    expect(document.getElementById('panel-elements').hidden).toBe(true);
    expect(document.getElementById('tb-settings-panel').hidden).toBe(false);
    expect(document.documentElement.dataset.editorActiveTab).toBe('tab-settings');
  });

  test('builds one settings panel and exposes the expected modules', () => {
    expect(document.querySelectorAll('#tb-settings-panel')).toHaveLength(1);
    const modules = window.EditorV2Bootstrap.modules;
    expect(modules).toEqual(expect.arrayContaining([
      'editor-layers-panel.js',
      'editor-smart-alignment.js',
      'editor-smart-validation.js',
      'editor-publish-gate.js'
    ]));
    modules.forEach((file) => expect(fs.existsSync(path.join(__dirname, '..', file))).toBe(true));
  });

  test.each(['editor.html', 'editor-en.html'])('%s loads one onboarding and one mobile action system', (file) => {
    const source = fs.readFileSync(path.join(__dirname, '..', file), 'utf8');
    const parsed = new DOMParser().parseFromString(source, 'text/html');
    const ids = Array.from(parsed.querySelectorAll('[id]'), (element) => element.id);
    const duplicateIds = ids.filter((id, index) => ids.indexOf(id) !== index);
    expect(source).not.toContain('editor-tour.js');
    expect(source).not.toContain('shepherd.js');
    expect(source).not.toContain('Mobile Proxy Bindings');
    expect(source).not.toContain('data-trigger-id="download-html"');
    expect(source.match(/id="autosave-indicator"/g)).toHaveLength(1);
    expect(source.match(/class="mobile-bottom-nav"/g)).toHaveLength(1);
    expect(duplicateIds).toEqual([]);
  });

  test('removes the obsolete autosave and dynamic mobile toolbar implementations', () => {
    const source = fs.readFileSync(path.join(__dirname, '..', 'editor-enhancements.original.js'), 'utf8');
    expect(source).not.toContain('function initAutoSave()');
    expect(source).not.toContain('mcprime_editor_autosave');
    expect(source).not.toContain('function createMobileBottomToolbar()');
    expect(source.match(/function initAutoSaveIndicator\(\)/g)).toHaveLength(1);
  });
});
