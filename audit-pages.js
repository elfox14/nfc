/**
 * MC PRIME — فحص تناسق الصفحات + إمكانية الوصول
 */
const fs = require('fs');

const htmlFiles = fs.readdirSync('.').filter(f => f.endsWith('.html'));

const checks = {
  noViewport: [],
  noFavicon: [],
  noGTM: [],
  noDescription: [],
  noCanonical: [],
  noServiceWorker: [],
  noCookieConsent: [],
  wrongLangForEN: [],
  buttonsNoAria: [],
  linksNoText: [],
  imagesNoAlt: [],
};

htmlFiles.forEach(file => {
  const content = fs.readFileSync(file, 'utf8');
  const lines = content.split('\n');

  // Consistency checks
  if (!content.includes('name="viewport"')) checks.noViewport.push(file);
  if (!content.includes('rel="icon"')) checks.noFavicon.push(file);
  if (!content.includes('GTM-PLL5SLNM')) checks.noGTM.push(file);
  if (!content.includes('name="description"')) checks.noDescription.push(file);
  if (!content.includes('rel="canonical"')) checks.noCanonical.push(file);
  if (!content.includes('sw.js')) checks.noServiceWorker.push(file);
  if (!content.includes('cookie-consent')) checks.noCookieConsent.push(file);

  // English pages with wrong lang
  if (file.endsWith('-en.html') && content.includes('lang="ar"')) {
    checks.wrongLangForEN.push(file);
  }

  // Accessibility: buttons without aria-label and without text content
  const buttonRegex = /<button[^>]*>([\s\S]*?)<\/button>/gi;
  let match;
  while ((match = buttonRegex.exec(content)) !== null) {
    const tag = match[0];
    const inner = match[1].replace(/<[^>]+>/g, '').trim();
    if (!tag.includes('aria-label') && inner.length === 0) {
      const lineNum = content.substring(0, match.index).split('\n').length;
      checks.buttonsNoAria.push(`${file}:${lineNum}`);
    }
  }

  // Accessibility: images without alt
  const imgRegex = /<img[^>]+>/gi;
  while ((match = imgRegex.exec(content)) !== null) {
    if (!match[0].includes('alt=')) {
      const lineNum = content.substring(0, match.index).split('\n').length;
      checks.imagesNoAlt.push(`${file}:${lineNum}`);
    }
  }

  // Accessibility: links with only icon (no text, no aria-label)
  const linkRegex = /<a[^>]*>([\s\S]*?)<\/a>/gi;
  while ((match = linkRegex.exec(content)) !== null) {
    const tag = match[0];
    const inner = match[1].replace(/<[^>]+>/g, '').trim();
    if (!tag.includes('aria-label') && inner.length === 0 && tag.includes('<i ')) {
      const lineNum = content.substring(0, match.index).split('\n').length;
      checks.linksNoText.push(`${file}:${lineNum}`);
    }
  }
});

console.log('=== CONSISTENCY & ACCESSIBILITY AUDIT ===\n');
console.log('--- CONSISTENCY ---\n');

const labels = {
  noViewport: '📱 Missing viewport meta',
  noFavicon: '🔗 Missing favicon',
  noGTM: '📊 Missing Google Tag Manager',
  noDescription: '📝 Missing meta description',
  noCanonical: '🔗 Missing canonical link',
  noServiceWorker: '⚙️ Missing Service Worker',
  noCookieConsent: '🍪 Missing Cookie Consent',
  wrongLangForEN: '🌐 English page with lang="ar" (WRONG!)',
};

const a11yLabels = {
  buttonsNoAria: '🔘 Buttons without aria-label & no text',
  imagesNoAlt: '🖼️ Images without alt attribute',
  linksNoText: '🔗 Links with icon-only (no text/aria-label)',
};

Object.entries(labels).forEach(([key, label]) => {
  const files = checks[key];
  if (files.length > 0) {
    console.log(`❌ ${label} (${files.length}):`);
    files.forEach(f => console.log(`   - ${f}`));
  } else {
    console.log(`✅ ${label} — OK`);
  }
});

console.log('\n--- ACCESSIBILITY ---\n');

Object.entries(a11yLabels).forEach(([key, label]) => {
  const items = checks[key];
  if (items.length > 0) {
    console.log(`⚠️  ${label} (${items.length}):`);
    items.slice(0, 15).forEach(f => console.log(`   - ${f}`));
    if (items.length > 15) console.log(`   ... and ${items.length - 15} more`);
  } else {
    console.log(`✅ ${label} — OK`);
  }
});

console.log('\n=== SUMMARY ===');
const totalIssues = Object.values(checks).reduce((sum, arr) => sum + arr.length, 0);
console.log(`Total issues found: ${totalIssues}`);
