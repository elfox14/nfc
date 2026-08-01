const fs = require('fs');
const path = require('path');

describe('styled QR logo generation', () => {
  const source = fs.readFileSync(path.join(__dirname, '..', 'script-card.original.js'), 'utf8');

  test('loads the selected logo as image data before QR rendering', () => {
    expect(source).toContain('async getQrLogoDataUrl()');
    expect(source).toContain("reader.readAsDataURL(blob)");
    expect(source).toContain('const logoDataUrl = await this.getQrLogoDataUrl()');
    expect(source).toContain('image: logoDataUrl');
  });

  test('waits for the QR library export instead of racing logo loading', () => {
    expect(source).toContain("await qrCode.getRawData('png')");
    expect(source).toContain('hideBackgroundDots: true');

    const vCardGenerator = source.slice(
      source.indexOf('async generateVCardQr()'),
      source.indexOf('async generateCardLinkQr()')
    );
    expect(vCardGenerator).not.toContain('setTimeout(');
  });
});
