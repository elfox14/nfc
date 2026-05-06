const fs = require('fs');
const files = [
  'dashboard-en.html', 'dashboard.html', 'editor-en.html', 'editor.html',
  'gallery-en.html', 'gallery.html', 'index-en.html', 'index.html',
  'login-en.html', 'login.html', 'signup-en.html', 'signup.html',
  'viewer-en.html', 'viewer.html', 'viewer.ejs'
];

files.forEach(file => {
  if (!fs.existsSync(file)) return;
  let html = fs.readFileSync(file, 'utf8');
  let changed = false;

  if (!html.includes('premium-ui.css')) {
    html = html.replace('</head>', '    <link rel="stylesheet" href="/nfc/premium-ui.css">\n</head>');
    changed = true;
  }
  
  if (!html.includes('premium-ui.js')) {
    html = html.replace('</body>', '    <script src="/nfc/premium-ui.js" defer></script>\n</body>');
    changed = true;
  }
  
  if (changed) {
    fs.writeFileSync(file, html);
    console.log('Updated ' + file);
  }
});
