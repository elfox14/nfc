(function installEditorDefaultCard(global) {
  'use strict';

  /* global Config */
  const config = typeof Config !== 'undefined' ? Config : global.Config;
  const state = config?.defaultState;
  if (!state) return;

  const isEnglish = (global.document?.documentElement.lang || '').toLowerCase().startsWith('en');
  state.inputs = {
    ...(state.inputs || {}),
    'layout-select': 'classic',
    'layout-select-visual': 'classic',
    'logo-size': 10,
    'input-name_ar': 'اسمك هنا',
    'input-name_en': 'Your Name Here',
    'input-tagline_ar': 'المسمى الوظيفي / الشركة',
    'input-tagline_en': 'Job Title / Company',
    'toggle-phone-buttons': false
  };
  state.dynamic = {
    ...(state.dynamic || {}),
    phones: [{
      id: 'phone_default',
      value: '01000000000',
      placement: 'front',
      position: { x: 0, y: 0 }
    }]
  };
  state.positions = {
    ...(state.positions || {}),
    'card-logo': { x: 0, y: 0 },
    'card-name': { x: 0, y: 0 },
    'card-tagline': { x: 0, y: 0 },
    'qr-code-wrapper': { x: 0, y: 0 }
  };
  state.placements = {
    ...(state.placements || {}),
    logo: 'front',
    name: 'front',
    tagline: 'front',
    qr: 'back'
  };
  state.visibilities = {
    ...(state.visibilities || {}),
    logo: true,
    name: true,
    tagline: true,
    phones: true,
    qr: true
  };
  state.currentLanguage = isEnglish ? 'en' : 'ar';

  global.EditorDefaultCard = {
    state,
    phone: state.dynamic.phones[0]
  };
})(window);
