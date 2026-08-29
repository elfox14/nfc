const fs = require('fs');
const path = require('path');

const dir = path.resolve(__dirname, '..');
const files = fs.readdirSync(dir).filter(f => f.startsWith('nfc-for-') && f.endsWith('.html'));

console.log('Found persona files:', files);

files.forEach(file => {
    const filePath = path.join(dir, file);
    let content = fs.readFileSync(filePath, 'utf8');
    const isEn = file.includes('-en.html');

    if (!content.includes('switchLanguage')) {
        const topBar = isEn
            ? `  <div style="max-width: 800px; margin: 20px auto 0; display: flex; justify-content: space-between; align-items: center; padding: 0 15px;">\n    <a href="index-en.html" style="color: #6ec1ff; text-decoration: none; font-weight: bold;"><i class="fas fa-arrow-left"></i> Home</a>\n    <button onclick="switchLanguage('ar')" class="lang-btn" style="background: rgba(77, 166, 255, 0.2); border: 1px solid #4da6ff; color: #4da6ff; padding: 0.4rem 0.8rem; border-radius: 6px; cursor: pointer; font-weight: 600; font-size: 0.85rem;">عربي</button>\n  </div>\n`
            : `  <div style="max-width: 800px; margin: 20px auto 0; display: flex; justify-content: space-between; align-items: center; padding: 0 15px;">\n    <a href="index.html" style="color: #6ec1ff; text-decoration: none; font-weight: bold;"><i class="fas fa-arrow-right"></i> الرئيسية</a>\n    <button onclick="switchLanguage('en')" class="lang-btn" style="background: rgba(77, 166, 255, 0.2); border: 1px solid #4da6ff; color: #4da6ff; padding: 0.4rem 0.8rem; border-radius: 6px; cursor: pointer; font-weight: 600; font-size: 0.85rem;">EN</button>\n  </div>\n`;

        // Insert right after <body> or <!-- End Google Tag Manager (noscript) -->
        if (content.includes('<!-- End Google Tag Manager (noscript) -->')) {
            content = content.replace('<!-- End Google Tag Manager (noscript) -->', '<!-- End Google Tag Manager (noscript) -->\n' + topBar);
        } else if (content.includes('<body>')) {
            content = content.replace('<body>', '<body>\n' + topBar);
        }

        fs.writeFileSync(filePath, content, 'utf8');
        console.log('Added top bar to:', file);
    }
});
