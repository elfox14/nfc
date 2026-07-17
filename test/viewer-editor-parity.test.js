const fs = require('fs');
const path = require('path');
const ejs = require('ejs');

test('viewer renders editor layer appearance, visibility, localized content and bio', () => {
  const template = fs.readFileSync(path.join(__dirname, '..', 'viewer.ejs'), 'utf8');
  const html = ejs.render(template, {
    name: 'Mona',
    tagline: 'Designer',
    ogImage: '/nfc/og-image.png',
    pageUrl: 'https://example.com/nfc/viewer.html?id=test1234',
    keywords: 'NFC',
    canonical: 'https://example.com/nfc/viewer.html?id=test1234',
    contactLinksHtml: '',
    design: {
      currentLanguage: 'en',
      inputs: {
        'input-name_en': 'Mona Ahmed',
        'input-name_ar': 'منى أحمد',
        'input-tagline_en': 'Product Designer',
        'input-bio_en': 'I design useful products.',
        'input-availability': 'available',
        'visibility-name': true,
        'visibility-tagline': false,
        'visibility-bio': true,
        'visibility-logo': false,
        'visibility-photo': false,
        'visibility-phones': false,
        'visibility-qr': false,
        'editor-layer-order': JSON.stringify(['name', 'bio', 'tagline', 'logo', 'photo', 'phones', 'qr', 'contact']),
        'editor-layer-appearance': JSON.stringify({ name: { scale: 1.25, rotation: 15, opacity: 0.6 } }),
        'editor-layer-bio-position': JSON.stringify({ x: 8, y: -4 })
      },
      positions: { 'card-name': { x: 12, y: 20 } },
      placements: { name: 'front', tagline: 'front' },
      imageUrls: {},
      dynamic: {}
    }
  });

  expect(html).toContain('Mona Ahmed');
  expect(html).not.toContain('Product Designer');
  expect(html).toContain('rotate(15deg) scale(1.25)');
  expect(html).toContain('opacity:0.6');
  expect(html).toContain('I design useful products.');
  expect(html).toContain('translate(8px, -4px)');
});
