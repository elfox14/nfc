/** @jest-environment jsdom */
'use strict';

function loadEditorBrandKit() {
  jest.resetModules();
  document.documentElement.lang = 'ar';
  document.documentElement.innerHTML = '<head></head><body><div id="pro-toolbar"><div class="tb-history"></div></div></body>';
  window.history.replaceState({}, '', '/nfc/editor.html');
  window.UIManager = { announce: jest.fn() };
  window.HistoryManager = { pushState: jest.fn() };
  window.StateManager = {
    getStateObject: jest.fn(() => ({
      inputs: {
        'input-name_ar': 'بيانات شخصية محفوظة',
        'input-phone': '01000000000',
        'front-bg-start': '#000000',
        'name-font': 'Arial, sans-serif'
      },
      placements: { logo: 'front' },
      dynamic: { phones: [{ value: '01000000000' }] }
    })),
    applyState: jest.fn(),
    saveDebounced: jest.fn()
  };
  window.BrandKitClient = { list: jest.fn(async () => ({ success: true, kits: [] })) };
  delete window.EditorBrandKit;
  jest.isolateModules(() => require('../editor-brand-kit'));
  window.EditorBrandKit.init();
  return window.EditorBrandKit;
}

const kit = {
  kitId: 'kit-1',
  name: 'MC PRIME',
  identity: {
    logos: [{ variant: 'primary', url: 'https://cdn.example.com/logo.webp' }],
    colors: [
      { role: 'primary', value: '#123456' },
      { role: 'secondary', value: '#234567' },
      { role: 'accent', value: '#45aacc' },
      { role: 'background', value: '#f4f7fa' },
      { role: 'text', value: '#ffffff' }
    ],
    fonts: [
      { role: 'heading', family: 'Cairo, sans-serif' },
      { role: 'body', family: 'Tajawal, sans-serif' },
      { role: 'accent', family: 'Poppins, sans-serif' }
    ]
  }
};

describe('editor cloud Brand Kit manager', () => {
  test('mounts a Brand Kit action in the professional toolbar', () => {
    const manager = loadEditorBrandKit();
    const launcher = document.getElementById('editor-brand-kit-btn');

    expect(manager.version).toBe('10.0.0');
    expect(launcher).not.toBeNull();
    expect(launcher.textContent).toContain('هوية الشركة');
    expect(document.documentElement.dataset.editorBrandKit).toBe('ready');
  });

  test('maps semantic identity roles to editor input fields', () => {
    const manager = loadEditorBrandKit();

    expect(manager.buildIdentityInputs(kit, { colors: true, fonts: true, logo: true })).toMatchObject({
      'front-bg-start': '#123456',
      'front-bg-end': '#234567',
      'back-bg-start': '#f4f7fa',
      'name-color': '#ffffff',
      'tagline-color': '#45aacc',
      'name-font': 'Cairo, sans-serif',
      'phone-btn-font': 'Tajawal, sans-serif',
      'tagline-font': 'Poppins, sans-serif',
      'input-logo': 'https://cdn.example.com/logo.webp'
    });
  });

  test('applies visual identity without replacing personal content', () => {
    const manager = loadEditorBrandKit();

    const result = manager.applyIdentity(kit, { colors: true, fonts: true, logo: true });

    expect(result).toBe(true);
    expect(window.StateManager.applyState).toHaveBeenCalledTimes(1);
    const next = window.StateManager.applyState.mock.calls[0][0];
    expect(next.inputs['input-name_ar']).toBe('بيانات شخصية محفوظة');
    expect(next.inputs['input-phone']).toBe('01000000000');
    expect(next.dynamic.phones).toEqual([{ value: '01000000000' }]);
    expect(next.inputs['front-bg-start']).toBe('#123456');
    expect(next.inputs['input-logo']).toBe('https://cdn.example.com/logo.webp');
    expect(next.brandKitId).toBe('kit-1');
    expect(window.HistoryManager.pushState).toHaveBeenCalledTimes(2);
    expect(window.StateManager.saveDebounced).toHaveBeenCalledTimes(1);
  });

  test('supports applying only one identity category', () => {
    const manager = loadEditorBrandKit();
    manager.applyIdentity(kit, { colors: false, fonts: true, logo: false });

    const next = window.StateManager.applyState.mock.calls[0][0];
    expect(next.inputs['front-bg-start']).toBe('#000000');
    expect(next.inputs['name-font']).toBe('Cairo, sans-serif');
    expect(next.inputs['input-logo']).toBeUndefined();
  });
});
