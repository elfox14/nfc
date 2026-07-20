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
    'logo-size': 16,
    'input-name_ar': 'اسمك هنا',
    'input-name_en': 'Your Name Here',
    'input-tagline_ar': 'المسمى الوظيفي / الشركة',
    'input-tagline_en': 'Job Title / Company',
    'toggle-phone-buttons': false,
    'qr-size': 32
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

  const params = new URLSearchParams(global.location.search);
  const hasRemoteDesign = params.has('id') || params.has('collabId');
  let hasLocalDesign = false;
  try {
    hasLocalDesign = Boolean(global.localStorage.getItem(config.LOCAL_STORAGE_KEY));
  } catch {
    // Storage may be unavailable; the HTML default remains the safe first paint.
  }

  const usesDefaultLayout = !hasRemoteDesign && !hasLocalDesign;
  const front = global.document.getElementById('card-front-content');
  const back = global.document.getElementById('card-back-content');
  front?.classList.toggle('editor-default-front-layout', usesDefaultLayout);
  back?.classList.toggle('editor-default-back-layout', usesDefaultLayout);

  function syncQrPlaceholder() {
    const wrapper = global.document.getElementById('qr-code-wrapper');
    const placeholder = global.document.getElementById('editor-default-qr-preview');
    if (!placeholder) return;
    const hasQr = Boolean(wrapper?.querySelector('canvas, img, svg'));
    placeholder.hidden = !usesDefaultLayout || hasQr;
  }

  const qrWrapper = global.document.getElementById('qr-code-wrapper');
  if (qrWrapper && typeof global.MutationObserver === 'function') {
    new global.MutationObserver(syncQrPlaceholder).observe(qrWrapper, {
      childList: true,
      subtree: true
    });
  }
  syncQrPlaceholder();

  global.EditorDefaultCard = {
    state,
    phone: state.dynamic.phones[0],
    usesCenteredLayout: usesDefaultLayout,
    syncQrPlaceholder
  };
})(window);
