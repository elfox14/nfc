/**
 * @jest-environment jsdom
 */
'use strict';

const fs = require('fs');
const path = require('path');

describe('Editor 2 runtime health', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.resetModules();
    delete window.EditorV2Health;
    document.documentElement.lang = 'ar';
    document.documentElement.dataset.editorV2Bootstrap = '20260715.2';
    document.body.innerHTML = '';
  });

  afterEach(() => {
    jest.useRealTimers();
    delete window.EditorV2Health;
    [
      'EditorContextInspector',
      'EditorLayersPanel',
      'EditorSmartAlignment',
      'EditorDesignSystem',
      'EditorOnboarding',
      'EditorSimpleMode',
      'EditorSmartValidation',
      'EditorPublishGate'
    ].forEach((name) => delete window[name]);
  });

  test('reports missing modules and renders a visible warning', () => {
    require('../editor-v2-health');
    document.dispatchEvent(new Event('DOMContentLoaded'));
    jest.advanceTimersByTime(1900);

    const report = window.EditorV2Health.getLastReport();
    expect(report.ready).toBe(false);
    expect(report.missing).toContain('EditorContextInspector');
    expect(document.documentElement.dataset.editorV2Ready).toBe('false');
    expect(document.getElementById('editor-v2-health-banner')).not.toBeNull();
  });

  test('reports ready when every expected module exists', () => {
    [
      'EditorContextInspector',
      'EditorLayersPanel',
      'EditorSmartAlignment',
      'EditorDesignSystem',
      'EditorOnboarding',
      'EditorSimpleMode',
      'EditorSmartValidation',
      'EditorPublishGate'
    ].forEach((name) => { window[name] = {}; });

    require('../editor-v2-health');
    const report = window.EditorV2Health.check();

    expect(report.ready).toBe(true);
    expect(report.missing).toEqual([]);
    expect(document.documentElement.dataset.editorV2Ready).toBe('true');
    expect(document.getElementById('editor-v2-health-banner')).toBeNull();
  });

  test('production bootstrap includes all required P0 module paths', () => {
    const source = fs.readFileSync(path.join(__dirname, '..', 'toolbar-tab-nav.js'), 'utf8');
    expect(source).toContain('editor-layers-panel.js');
    expect(source).toContain('editor-smart-alignment.js');
    expect(source).toContain('editor-smart-validation.js');
    expect(source).toContain('editor-publish-gate.js');
  });

  test('both editor pages load the shared toolbar bootstrap', () => {
    for (const file of ['editor.html', 'editor-en.html']) {
      const source = fs.readFileSync(path.join(__dirname, '..', file), 'utf8');
      expect(source).toContain('<script src="toolbar-tab-nav.js"></script>');
    }
  });
});
