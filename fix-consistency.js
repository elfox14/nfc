/**
 * MC PRIME — إصلاح مشاكل التناسق تلقائياً
 * 1. إصلاح lang="ar" في الصفحات الإنجليزية
 * 2. إضافة viewport للصفحات الناقصة
 * 3. إضافة favicon للصفحات الناقصة
 */
const fs = require('fs');

let fixes = { lang: 0, viewport: 0, favicon: 0 };
let details = { lang: [], viewport: [], favicon: [] };

const htmlFiles = fs.readdirSync('.').filter(f => f.endsWith('.html'));

htmlFiles.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  let modified = false;

  // === FIX 1: English pages with lang="ar" ===
  if (file.endsWith('-en.html')) {
    // Fix lang="ar" to lang="en"
    if (content.includes('lang="ar"')) {
      content = content.replace(/lang="ar"/g, 'lang="en"');
      modified = true;
      fixes.lang++;
      details.lang.push(file);
    }
    // Fix dir="rtl" to dir="ltr"
    if (content.includes('dir="rtl"')) {
      content = content.replace(/dir="rtl"/g, 'dir="ltr"');
      modified = true;
    }
  }

  // === FIX 2: Add viewport if missing ===
  if (!content.includes('name="viewport"') && content.includes('<head>')) {
    content = content.replace(
      '<meta charset="UTF-8">',
      '<meta charset="UTF-8">\n  <meta name="viewport" content="width=device-width, initial-scale=1.0">'
    );
    // If no charset tag, try after <head>
    if (!content.includes('name="viewport"')) {
      content = content.replace(
        '</head>',
        '  <meta name="viewport" content="width=device-width, initial-scale=1.0">\n</head>'
      );
    }
    if (content.includes('name="viewport"')) {
      modified = true;
      fixes.viewport++;
      details.viewport.push(file);
    }
  }

  // === FIX 3: Add favicon if missing ===
  if (!content.includes('rel="icon"') && content.includes('</head>')) {
    content = content.replace(
      '</head>',
      '  <link rel="icon" href="/nfc/mc-prime-nfc.png" type="image/png">\n</head>'
    );
    modified = true;
    fixes.favicon++;
    details.favicon.push(file);
  }

  if (modified) {
    fs.writeFileSync(file, content, 'utf8');
  }
});

console.log('🔧 إصلاح مشاكل التناسق\n');

console.log(`✅ إصلاح lang في الصفحات الإنجليزية: ${fixes.lang} صفحة`);
if (details.lang.length) details.lang.forEach(f => console.log(`   - ${f}: lang="ar" → lang="en", dir="rtl" → dir="ltr"`));

console.log(`\n✅ إضافة viewport: ${fixes.viewport} صفحة`);
if (details.viewport.length) details.viewport.forEach(f => console.log(`   - ${f}`));

console.log(`\n✅ إضافة favicon: ${fixes.favicon} صفحة`);
if (details.favicon.length) details.favicon.forEach(f => console.log(`   - ${f}`));

console.log(`\n📊 إجمالي الإصلاحات: ${fixes.lang + fixes.viewport + fixes.favicon}`);
