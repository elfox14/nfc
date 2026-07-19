/** @jest-environment jsdom */

describe('editor default card configuration', () => {
  beforeEach(() => {
    jest.resetModules();
    const defaultState = {
      inputs: {},
      dynamic: {},
      positions: {},
      placements: {},
      visibilities: {}
    };
    window.Config = { defaultState };
    global.Config = window.Config;
  });

  afterEach(() => {
    delete window.EditorDefaultCard;
    delete window.Config;
    delete global.Config;
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
  });

  test('uses equivalent English placeholder content', () => {
    document.documentElement.lang = 'en';
    require('../editor-default-card');

    expect(window.EditorDefaultCard.state.currentLanguage).toBe('en');
    expect(window.EditorDefaultCard.state.inputs['input-name_en']).toBe('Your Name Here');
    expect(window.EditorDefaultCard.state.inputs['input-tagline_en']).toBe('Job Title / Company');
  });
});
