const fs = require('fs');
const path = require('path');
const ejs = require('ejs');

const {
  buildVCard,
  buildViewerCsp,
  buildContactLinksHtml,
  displaySocialValue,
  isSafeViewerId,
  selectPublishedDesignData,
  serializeForInlineScript,
  socialUrl
} = require('../routes/viewer.routes')._private;

const DOMPurify = {
  sanitize: (value) => String(value).replace(/</g, '&lt;').replace(/>/g, '&gt;')
};

describe('Viewer route helpers', () => {
  it('validates public viewer IDs', () => {
    expect(isSafeViewerId('abcd')).toBe(true);
    expect(isSafeViewerId('card_123-Ab')).toBe(true);
    expect(isSafeViewerId('abc')).toBe(false);
    expect(isSafeViewerId('a'.repeat(31))).toBe(false);
    expect(isSafeViewerId('../secret')).toBe(false);
  });

  it('builds platform URLs consistently', () => {
    expect(socialUrl('email', 'user@example.com')).toBe('mailto:user@example.com');
    expect(socialUrl('whatsapp', '+20 100 200')).toBe('https://wa.me/20100200');
    expect(socialUrl('website', 'example.com')).toBe('https://example.com');
    expect(socialUrl('website', 'https://example.com')).toBe('https://example.com');
  });

  it('removes protocol and www from display values', () => {
    expect(displaySocialValue('https://www.example.com/path')).toBe('example.com/path');
  });

  it('renders contact links and sanitizes labels', () => {
    const html = buildContactLinksHtml({
      staticSocial: {
        website: { value: 'example.com' }
      },
      phones: [
        { value: '+20 <script>100</script>' }
      ]
    }, DOMPurify);

    expect(html).toContain('https://example.com');
    expect(html).toContain('tel:20100');
    expect(html).not.toContain('<script>');
  });

  it('renders the empty state when no contact data exists', () => {
    expect(buildContactLinksHtml({}, DOMPurify)).toContain('لم يقم صاحب البطاقة');
  });

  it('escapes vCard control characters and serializes script data safely', () => {
    const vcard = buildVCard(
      {
        'input-name': 'Name\nTEL:injected',
        'input-tagline': 'Role;Admin'
      },
      { phones: [{ value: '+20,100' }] }
    );

    expect(vcard).toContain('FN:Name\\nTEL:injected');
    expect(vcard).toContain('TITLE:Role\\;Admin');
    expect(vcard).toContain('TEL;TYPE=CELL:+20\\,100');
    expect(serializeForInlineScript('</script><script>attack()</script>'))
      .not.toContain('<script>');
  });

  it('uses a nonce-only script policy for the public viewer', () => {
    const policy = buildViewerCsp('test-nonce');
    expect(policy).toContain("script-src 'self' 'nonce-test-nonce'");
    const scriptDirective = policy.split(';').find(part => part.trim().startsWith('script-src'));
    expect(scriptDirective).not.toContain("'unsafe-inline'");
  });

  it('returns the immutable published state instead of the latest draft', () => {
    const result = selectPublishedDesignData({
      inputs: { 'input-name_ar': 'اسم المسودة' },
      dynamic: { phones: [{ value: '01111111111' }] },
      publishedAt: '2026-07-31T12:00:00.000Z',
      publishedState: {
        inputs: { 'input-name_ar': 'الاسم المنشور' },
        dynamic: { phones: [{ value: '01000000000' }] },
        imageUrls: {
          capturedFront: 'https://uploads.example/published-front.webp',
          capturedBack: 'https://uploads.example/published-back.webp'
        }
      }
    });

    expect(result.inputs['input-name_ar']).toBe('الاسم المنشور');
    expect(result.dynamic.phones[0].value).toBe('01000000000');
    expect(result.publishedState).toBeUndefined();
    expect(result.publishedAt).toBe('2026-07-31T12:00:00.000Z');
  });

  it('does not expose a draft-only card', () => {
    expect(selectPublishedDesignData({
      inputs: { 'input-name_ar': 'مسودة خاصة' },
      dynamic: { phones: [{ value: '01111111111' }] }
    })).toBeNull();
  });

  it('keeps legacy published cards that have both captured faces', () => {
    const legacy = selectPublishedDesignData({
      inputs: { 'input-name_ar': 'بطاقة قديمة' },
      imageUrls: {
        capturedFront: 'https://uploads.example/front.webp',
        capturedBack: 'https://uploads.example/back.webp'
      }
    });

    expect(legacy.inputs['input-name_ar']).toBe('بطاقة قديمة');
  });

  it('renders published cards whose dynamic items predate position metadata', () => {
    const template = fs.readFileSync(path.join(__dirname, '..', 'viewer.ejs'), 'utf8');
    const html = ejs.render(template, {
      pageUrl: 'https://example.test/nfc/viewer.html?id=legacy1',
      name: 'Legacy card',
      tagline: 'Still supported',
      ogImage: 'https://example.test/card.png',
      keywords: 'legacy',
      canonical: 'https://example.test/nfc/viewer.html?id=legacy1',
      contactLinksHtml: '',
      cspNonce: 'test-nonce',
      vcardJson: serializeForInlineScript('BEGIN:VCARD\r\nEND:VCARD'),
      viewerScriptDataJson: serializeForInlineScript({
        name: 'Legacy card',
        tagline: 'Still supported'
      }),
      design: {
        inputs: {
          'input-name': 'Legacy card',
          'input-tagline': 'Still supported',
          'qr-source': 'none'
        },
        dynamic: {
          phones: [
            { value: '+201000000000', placement: 'front' },
            { value: '+201111111111', placement: 'back' }
          ],
          social: [{ platform: 'website', value: 'example.test', placement: 'back' }]
        }
      }
    });

    expect(html).toContain('Legacy card');
    expect(html).toContain('transform: translate(0px, 0px);');
    expect(html).not.toMatch(/\sonclick=/i);
  });

  it('never emits card fields as executable EJS source', () => {
    const template = fs.readFileSync(path.join(__dirname, '..', 'viewer.ejs'), 'utf8');
    const payload = '${globalThis.xssProof=1}`</script><script>attack()</script>';
    const html = ejs.render(template, {
      pageUrl: 'https://example.test/nfc/viewer.html?id=safe1',
      name: payload,
      tagline: payload,
      ogImage: 'https://example.test/card.png',
      keywords: 'security',
      canonical: 'https://example.test/nfc/viewer.html?id=safe1',
      contactLinksHtml: '',
      cspNonce: 'test-nonce',
      vcardJson: serializeForInlineScript(buildVCard({ 'input-name': payload }, {})),
      viewerScriptDataJson: serializeForInlineScript({ name: payload, tagline: payload }),
      design: {
        inputs: {
          'input-name': payload,
          'input-tagline': payload,
          'qr-source': 'none'
        },
        dynamic: { phones: [], social: [], staticSocial: {} }
      }
    });

    expect(html).not.toContain('</script><script>attack()');
    expect(html).not.toContain('const vcard = `');
    expect(html).toContain('nonce="test-nonce"');
  });
});
