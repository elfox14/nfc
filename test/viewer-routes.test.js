const {
  buildContactLinksHtml,
  displaySocialValue,
  isSafeViewerId,
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
});
