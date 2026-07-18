'use strict';

const brandKitRoutes = require('../routes/brand-kits.routes');
const {
  canAccess,
  cleanFontFamily,
  cleanHex,
  cleanUrl,
  identityPatch,
  membershipFor,
  sanitizeTemplateDesign
} = brandKitRoutes._test;

describe('cloud brand kit route helpers', () => {
  const kit = {
    ownerId: 'owner-1',
    members: [
      { userId: 'admin-1', role: 'admin' },
      { userId: 'editor-1', role: 'editor' },
      { userId: 'viewer-1', role: 'viewer' }
    ]
  };

  test('enforces the owner, admin, editor, and viewer hierarchy', () => {
    expect(membershipFor(kit, 'owner-1')).toEqual({ userId: 'owner-1', role: 'owner' });
    expect(canAccess(kit, 'owner-1', 'owner')).toBe(true);
    expect(canAccess(kit, 'admin-1', 'admin')).toBe(true);
    expect(canAccess(kit, 'admin-1', 'owner')).toBe(false);
    expect(canAccess(kit, 'editor-1', 'editor')).toBe(true);
    expect(canAccess(kit, 'editor-1', 'admin')).toBe(false);
    expect(canAccess(kit, 'viewer-1', 'viewer')).toBe(true);
    expect(canAccess(kit, 'viewer-1', 'editor')).toBe(false);
    expect(canAccess(kit, 'outsider', 'viewer')).toBe(false);
  });

  test('keeps only visual template fields and strips personal content', () => {
    const result = sanitizeTemplateDesign({
      inputs: {
        'front-bg-start': '#123456',
        'name-font': 'Cairo, sans-serif',
        'editor-layer-groups': '{"front":[["name","tagline"]]}',
        'input-name_ar': 'اسم شخصي لا يجب حفظه',
        'input-phone': '01000000000',
        unknown: 'unsupported markup value'
      },
      placements: { logo: 'back', name: 'front', unsupported: 'front', qr: 'side' },
      visibilities: { logo: true, name: false, 'bad key': true }
    });

    expect(result.inputs).toEqual({
      'front-bg-start': '#123456',
      'name-font': 'Cairo, sans-serif',
      'editor-layer-groups': '{"front":[["name","tagline"]]}'
    });
    expect(result.inputs).not.toHaveProperty('input-name_ar');
    expect(result.inputs).not.toHaveProperty('input-phone');
    expect(result.placements).toEqual({ logo: 'back', name: 'front' });
    expect(result.visibilities).toEqual({ logo: true, name: false });
  });

  test('maps semantic brand roles to editor design fields', () => {
    const patch = identityPatch({
      logos: [{ variant: 'primary', url: 'https://cdn.example.com/logo.webp' }],
      colors: [
        { role: 'primary', value: '#112233' },
        { role: 'secondary', value: '#223344' },
        { role: 'accent', value: '#44aacc' },
        { role: 'background', value: '#f5f5f5' },
        { role: 'text', value: '#ffffff' }
      ],
      fonts: [
        { role: 'heading', family: 'Cairo, sans-serif' },
        { role: 'body', family: 'Tajawal, sans-serif' },
        { role: 'accent', family: 'Poppins, sans-serif' }
      ]
    });

    expect(patch).toMatchObject({
      'data.inputs.front-bg-start': '#112233',
      'data.inputs.front-bg-end': '#223344',
      'data.inputs.back-bg-start': '#f5f5f5',
      'data.inputs.name-color': '#ffffff',
      'data.inputs.tagline-color': '#44aacc',
      'data.inputs.name-font': 'Cairo, sans-serif',
      'data.inputs.phone-btn-font': 'Tajawal, sans-serif',
      'data.inputs.tagline-font': 'Poppins, sans-serif',
      'data.inputs.input-logo': 'https://cdn.example.com/logo.webp'
    });
  });

  test('supports selective application and rejects malformed asset values', () => {
    const identity = {
      logos: [{ variant: 'primary', url: 'https://cdn.example.com/logo.webp' }],
      colors: [{ role: 'primary', value: '#112233' }],
      fonts: [{ role: 'heading', family: 'Cairo, sans-serif' }]
    };
    const patch = identityPatch(identity, { colors: false, fonts: true, logo: false });
    expect(patch).toEqual({ 'data.inputs.name-font': 'Cairo, sans-serif' });
    expect(cleanHex('#AABBCC')).toBe('#aabbcc');
    expect(cleanHex('red')).toBe('');
    expect(cleanUrl('not-a-url')).toBe('');
    expect(cleanUrl('https://cdn.example.com/logo.svg')).toBe('https://cdn.example.com/logo.svg');
    expect(cleanFontFamily('Cairo, sans-serif')).toBe('Cairo, sans-serif');
    expect(cleanFontFamily('Cairo:unsupported')).toBe('');
  });
});
