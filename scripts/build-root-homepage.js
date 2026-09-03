const fs = require('fs');
const path = require('path');

const rootDir = path.resolve(__dirname, '..');
const outDir = path.join(rootDir, 'mcprim_root');

if (!fs.existsSync(outDir)) {
  fs.mkdirSync(outDir, { recursive: true });
}

function adaptForRoot(html, isEn = false) {
  let res = html;

  // 1. Assets in head
  res = res.replace(/src="runtime-config\.js/g, 'src="/nfc/runtime-config.js');
  res = res.replace(/src="js\//g, 'src="/nfc/js/');
  res = res.replace(/href="mc-prime-nfc\.png"/g, 'href="/nfc/mc-prime-nfc.png"');
  res = res.replace(/src="mc-prime-nfc\.png"/g, 'src="/nfc/mc-prime-nfc.png"');
  res = res.replace(/href="homepage-interactive\.css"/g, 'href="/nfc/homepage-interactive.css"');
  res = res.replace(/href="cookie-consent\.css"/g, 'href="/nfc/cookie-consent.css"');
  res = res.replace(/href="premium-ui\.css"/g, 'href="/nfc/premium-ui.css"');
  res = res.replace(/src="lang-switcher\.js"/g, 'src="/nfc/lang-switcher.js"');
  res = res.replace(/src="auth\.js/g, 'src="/nfc/auth.js');
  res = res.replace(/src="premium-ui\.js"/g, 'src="/nfc/premium-ui.js"');

  // 2. Images folder
  res = res.replace(/src="images\//g, 'src="/nfc/images/');

  // 3. SEO / Canonicals / Social
  if (!isEn) {
    res = res.replace(/<link rel="canonical" href="https:\/\/www\.mcprim\.com\/nfc\/" \/>/g, '<link rel="canonical" href="https://www.mcprim.com/" />');
    res = res.replace(/<link rel="alternate" hreflang="ar" href="https:\/\/www\.mcprim\.com\/nfc\/" \/>/g, '<link rel="alternate" hreflang="ar" href="https://www.mcprim.com/" />');
    res = res.replace(/<link rel="alternate" hreflang="en" href="https:\/\/www\.mcprim\.com\/nfc\/index-en\.html" \/>/g, '<link rel="alternate" hreflang="en" href="https://www.mcprim.com/index-en.html" />');
    res = res.replace(/<link rel="alternate" hreflang="x-default" href="https:\/\/www\.mcprim\.com\/nfc\/" \/>/g, '<link rel="alternate" hreflang="x-default" href="https://www.mcprim.com/" />');
    res = res.replace(/content="https:\/\/www\.mcprim\.com\/nfc\/"/g, 'content="https://www.mcprim.com/"');
    res = res.replace(/"url": "https:\/\/www\.mcprim\.com\/nfc\/"/g, '"url": "https://www.mcprim.com/"');
  } else {
    res = res.replace(/<link rel="canonical" href="https:\/\/www\.mcprim\.com\/nfc\/index-en\.html" \/>/g, '<link rel="canonical" href="https://www.mcprim.com/index-en.html" />');
    res = res.replace(/<link rel="alternate" hreflang="ar" href="https:\/\/www\.mcprim\.com\/nfc\/" \/>/g, '<link rel="alternate" hreflang="ar" href="https://www.mcprim.com/" />');
    res = res.replace(/<link rel="alternate" hreflang="en" href="https:\/\/www\.mcprim\.com\/nfc\/index-en\.html" \/>/g, '<link rel="alternate" hreflang="en" href="https://www.mcprim.com/index-en.html" />');
    res = res.replace(/<link rel="alternate" hreflang="x-default" href="https:\/\/www\.mcprim\.com\/nfc\/" \/>/g, '<link rel="alternate" hreflang="x-default" href="https://www.mcprim.com/" />');
    res = res.replace(/content="https:\/\/www\.mcprim\.com\/nfc\/index-en\.html"/g, 'content="https://www.mcprim.com/index-en.html"');
    res = res.replace(/"url": "https:\/\/www\.mcprim\.com\/nfc\/index-en\.html"/g, '"url": "https://www.mcprim.com/index-en.html"');
  }

  // 4. In-page anchor navigation
  if (!isEn) {
    res = res.replace(/href="index\.html#(editor-services|how-it-works|comparison|nfc-articles)"/g, 'href="#$1"');
  } else {
    res = res.replace(/href="index-en\.html#(editor-services|how-it-works|comparison|nfc-articles)"/g, 'href="#$1"');
  }

  // 5. Pages and links to /nfc/
  // Gallery
  res = res.replace(/href="gallery\.html"/g, 'href="/nfc/gallery.html"');
  res = res.replace(/href="gallery-en\.html"/g, 'href="/nfc/gallery-en.html"');
  
  // Blog
  res = res.replace(/href="blog\.html"/g, 'href="/nfc/blog.html"');
  res = res.replace(/href="blog-en\.html"/g, 'href="/nfc/blog-en.html"');

  // Contact
  res = res.replace(/href="contact\.html"/g, 'href="/nfc/contact.html"');
  res = res.replace(/href="contact-en\.html"/g, 'href="/nfc/contact-en.html"');

  // Editor
  res = res.replace(/href="editor\.html"/g, 'href="/nfc/editor.html"');
  res = res.replace(/href="editor-en\.html"/g, 'href="/nfc/editor-en.html"');

  // Dashboard & Guides
  res = res.replace(/href="dashboard\.html"/g, 'href="/nfc/dashboard.html"');
  res = res.replace(/href="how-to-use-editor\.html"/g, 'href="/nfc/how-to-use-editor.html"');
  res = res.replace(/href="how-to-use-editor-en\.html"/g, 'href="/nfc/how-to-use-editor-en.html"');
  res = res.replace(/href="privacy\.html"/g, 'href="/nfc/privacy.html"');
  res = res.replace(/href="terms\.html"/g, 'href="/nfc/terms.html"');

  // Blog articles
  res = res.replace(/href="(blog-nfc-[a-zA-Z0-9_-]+\.html)"/g, 'href="/nfc/$1"');
  res = res.replace(/href="(blog-digital-[a-zA-Z0-9_-]+\.html)"/g, 'href="/nfc/$1"');
  res = res.replace(/href="(nfc-for-[a-zA-Z0-9_-]+\.html)"/g, 'href="/nfc/$1"');

  return res;
}

// Read index.html and index-en.html
const indexAr = fs.readFileSync(path.join(rootDir, 'index.html'), 'utf8');
const indexEn = fs.readFileSync(path.join(rootDir, 'index-en.html'), 'utf8');
const css = fs.readFileSync(path.join(rootDir, 'homepage.css'), 'utf8');

const rootIndexAr = adaptForRoot(indexAr, false);
const rootIndexEn = adaptForRoot(indexEn, true);

fs.writeFileSync(path.join(outDir, 'index.html'), rootIndexAr, 'utf8');
fs.writeFileSync(path.join(outDir, 'index-en.html'), rootIndexEn, 'utf8');
fs.writeFileSync(path.join(outDir, 'homepage.css'), css, 'utf8');

console.log('Successfully generated mcprim_root files:');
console.log('- mcprim_root/index.html');
console.log('- mcprim_root/index-en.html');
console.log('- mcprim_root/homepage.css');
