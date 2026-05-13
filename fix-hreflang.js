/**
 * MC PRIME — إصلاح وسوم hreflang في الصفحات الإنجليزية
 */
const fs = require('fs');

const htmlFiles = fs.readdirSync('.').filter(f => f.endsWith('-en.html'));
let fixedCount = 0;

htmlFiles.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  let originalContent = content;

  // We are looking for lines like:
  // <link rel="alternate" hreflang="en" href="https://www.mcprim.com/nfc/index.html" />
  // where the href does NOT end with -en.html. This should be hreflang="ar"

  // Regex to match hreflang="en" where href points to a non-EN html file
  const regex = /<link\s+rel="alternate"\s+hreflang="en"\s+href="(https?:\/\/[^"]+\/([a-zA-Z0-9_-]+)(?<!-en)\.html|https?:\/\/[^"]+\/nfc\/)"\s*\/>/g;
  
  content = content.replace(regex, (match, url) => {
    return `<link rel="alternate" hreflang="ar" href="${url}" />`;
  });

  if (content !== originalContent) {
    fs.writeFileSync(file, content, 'utf8');
    fixedCount++;
    console.log(`✅ تم إصلاح hreflang في: ${file}`);
  }
});

console.log(`\n🎉 إجمالي الملفات التي تم إصلاحها: ${fixedCount}`);
