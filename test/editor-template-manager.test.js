/**
 * @jest-environment jsdom
 */

describe('editor template manager', () => {
  let state;

  beforeEach(() => {
    jest.resetModules();
    localStorage.clear();
    document.documentElement.lang = 'ar';
    document.documentElement.removeAttribute('data-editor-template-manager');
    document.body.innerHTML = `
      <div class="editor-library-shortcuts"><div class="editor-library-intro">Intro</div></div>
      <div id="live-announcer"></div>
      <fieldset id="designs-fieldset-source"></fieldset>
    `;
    state = {
      currentLanguage: 'ar',
      inputs: {
        'input-name_ar': 'محمود ممدوح',
        'input-tagline_ar': 'مدير العمليات',
        'input-logo': 'https://cdn.example/logo.png',
        'input-photo-url': 'https://cdn.example/photo.png',
        'front-bg-start': '#111111',
        'front-bg-end': '#222222',
        'name-color': '#eeeeee',
        'name-font': 'Tajawal, sans-serif',
        'logo-size': '20'
      },
      dynamic: {
        phones: [{ id: 'phone-1', value: '01000000000', placement: 'front' }],
        staticSocial: { email: { value: 'owner@example.com', placement: 'back' } },
        social: []
      },
      placements: { logo: 'front', photo: 'front', name: 'front', tagline: 'front', qr: 'back' },
      visibilities: { logo: true, photo: true, name: true, tagline: true, qr: true }
    };
    window.EditorWorkspace = { getState: () => ({ libraryView: 'templates' }) };
    window.StateManager = {
      getStateObject: jest.fn(() => state),
      applyState: jest.fn(),
      saveDebounced: jest.fn()
    };
    window.HistoryManager = { pushState: jest.fn(), undo: jest.fn() };
    window.UIManager = { announce: jest.fn() };
    window.confirm = jest.fn(() => true);
    delete window.EditorTemplateManager;
  });

  afterEach(() => {
    delete window.EditorWorkspace;
    delete window.StateManager;
    delete window.HistoryManager;
    delete window.UIManager;
    delete window.EditorTemplateManager;
  });

  function loadManager() {
    require('../editor-template-manager');
    document.dispatchEvent(new Event('DOMContentLoaded'));
    window.EditorTemplateManager.mount();
  }

  test('renders industry filters and ready-made templates', () => {
    loadManager();

    expect(document.documentElement.dataset.editorTemplateManager).toBe('ready');
    expect(document.querySelector('#editor-template-manager-panel')).not.toBeNull();
    expect(document.querySelectorAll('[data-template-id]')).toHaveLength(9);
    expect(document.querySelector('[data-template-filter="medical"]')).not.toBeNull();
    expect(document.querySelector('[data-template-filter="personal"]')).not.toBeNull();
  });

  test('applies visual settings while preserving content and contact data', () => {
    loadManager();

    expect(window.EditorTemplateManager.applyTemplate('medical-trust')).toBe(true);
    const applied = window.StateManager.applyState.mock.calls[0][0];

    expect(applied.inputs['front-bg-start']).toBe('#063b46');
    expect(applied.inputs['layout-select-visual']).toBe('modern');
    expect(applied.inputs['input-name_ar']).toBe('محمود ممدوح');
    expect(applied.inputs['input-tagline_ar']).toBe('مدير العمليات');
    expect(applied.inputs['input-logo']).toBe('https://cdn.example/logo.png');
    expect(applied.inputs['input-photo-url']).toBe('https://cdn.example/photo.png');
    expect(applied.dynamic).toEqual(state.dynamic);
    expect(window.HistoryManager.pushState).toHaveBeenCalledTimes(2);
    expect(window.StateManager.saveDebounced).toHaveBeenCalled();
  });

  test('saves a content-safe personal template', () => {
    loadManager();

    const saved = window.EditorTemplateManager.createPersonalTemplate('هويتي الرسمية');
    const stored = JSON.parse(localStorage.getItem('mcprime-editor-personal-templates-v1'));

    expect(saved.name).toBe('هويتي الرسمية');
    expect(stored).toHaveLength(1);
    expect(stored[0].design.inputs['front-bg-start']).toBe('#111111');
    expect(stored[0].design.inputs['logo-size']).toBe('20');
    expect(stored[0].design.inputs['input-name_ar']).toBeUndefined();
    expect(stored[0].design.inputs['input-logo']).toBeUndefined();
    expect(stored[0].design.dynamic).toBeUndefined();
  });

  test('previews without mutating the live design', () => {
    loadManager();

    expect(window.EditorTemplateManager.openPreview('executive-navy')).toBe(true);
    expect(document.querySelector('#editor-template-modal').hidden).toBe(false);
    expect(document.querySelectorAll('.editor-template-modal-face')).toHaveLength(2);
    expect(window.StateManager.applyState).not.toHaveBeenCalled();
  });
});
