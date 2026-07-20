/** @jest-environment jsdom */

describe('editor default card configuration', () => {
  beforeEach(() => {
    jest.resetModules();
    window.history.replaceState({}, '', '/nfc/editor.html');
    window.localStorage.clear();
    document.body.innerHTML = '<div id="card-front-content" class="editor-default-front-layout"></div>';
    const defaultState = {
      inputs: {},
      dynamic: {},
      positions: {},
      placements: {},
      visibilities: {}
    };
    window.Config = { defaultState, LOCAL_STORAGE_KEY: 'editor-test-state' };
    global.Config = window.Config;
  });

  afterEach(() => {
    delete window.EditorDefaultCard;
    delete window.Config;
    delete global.Config;
    window.localStorage.clear();
  });

  test('builds the Arabic default as logo, name, job title and phone on the front', () => {
    document.documentElement.lang = 'ar';
    require('../editor-default-card');
    const state = window.EditorDefaultCard.state;

    expect(state.inputs['input-name_ar']).toBe('اسمك هنا');
    expect(state.inputs['input-tagline_ar']).toBe('المسمى الوظيفي / الشركة');
    expect(state.inputs['toggle-phone-buttons']).toBe(false);
    expect(state.dynamic.phones).toEqual([{
      id: 'phone_default',
      value: '01000000000',
      placement: 'front',
      position: { x: 0, y: 0 }
    }]);
    expect(state.placements).toMatchObject({ logo: 'front', name: 'front', tagline: 'front', qr: 'back' });
    expect(state.visibilities).toMatchObject({ logo: true, name: true, tagline: true, phones: true, qr: true });
    expect(window.EditorDefaultCard.usesCenteredLayout).toBe(true);
    expect(document.getElementById('card-front-content').classList.contains('editor-default-front-layout')).toBe(true);
  });

  test('uses equivalent English placeholder content', () => {
    document.documentElement.lang = 'en';
    require('../editor-default-card');

    expect(window.EditorDefaultCard.state.currentLanguage).toBe('en');
    expect(window.EditorDefaultCard.state.inputs['input-name_en']).toBe('Your Name Here');
    expect(window.EditorDefaultCard.state.inputs['input-tagline_en']).toBe('Job Title / Company');
  });

  test('does not impose the default centering on a design opened from the dashboard', () => {
    window.history.replaceState({}, '', '/nfc/editor.html?id=saved-design');
    require('../editor-default-card');

    expect(window.EditorDefaultCard.usesCenteredLayout).toBe(false);
    expect(document.getElementById('card-front-content').classList.contains('editor-default-front-layout')).toBe(false);
  });

  test('does not impose the default centering when a local design exists', () => {
    window.localStorage.setItem('editor-test-state', '{"inputs":{}}');
    require('../editor-default-card');

    expect(window.EditorDefaultCard.usesCenteredLayout).toBe(false);
    expect(document.getElementById('card-front-content').classList.contains('editor-default-front-layout')).toBe(false);
  });
});
