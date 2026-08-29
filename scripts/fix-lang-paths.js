const fs = require('fs');
const path = require('path');

const dir = path.resolve(__dirname, '..');
const files = fs.readdirSync(dir).filter(f => f.endsWith('.html'));

console.log(`Found ${files.length} HTML files to inspect.`);

let updatedCount = 0;

files.forEach(file => {
    const filePath = path.join(dir, file);
    let content = fs.readFileSync(filePath, 'utf8');
    const original = content;
    const isEn = file.includes('-en.html');

    // 1. Fix static assets & scripts with leading /nfc/
    content = content.replace(/src=["']\/nfc\/([^"']+)["']/g, 'src="$1"');
    content = content.replace(/href=["']\/nfc\/([^"']+\.(css|png|jpg|jpeg|svg|ico|webp))["']/g, 'href="$1"');

    // 2. Fix navigation links pointing to /nfc/ or /nfc/#
    content = content.replace(/href=["']\/nfc\/["']/g, isEn ? 'href="index-en.html"' : 'href="index.html"');
    content = content.replace(/href=["']\/nfc\/#([^"']*)["']/g, (m, hash) => isEn ? `href="index-en.html#${hash}"` : `href="index.html#${hash}"`);

    // 3. Fix /nfc/*.html links
    content = content.replace(/href=["']\/nfc\/([a-zA-Z0-9_-]+\.html(?:#[^"']*)?)["']/g, 'href="$1"');

    // 4. Standardize onclick="switchLang('...')" to switchLanguage('...')
    content = content.replace(/switchLang\(/g, 'switchLanguage(');

    // 5. Ensure lang-switcher.js is included
    if (!content.includes('lang-switcher.js')) {
        if (content.includes('</head>')) {
            content = content.replace('</head>', '    <script src="lang-switcher.js" defer></script>\n</head>');
        } else if (content.includes('</body>')) {
            content = content.replace('</body>', '    <script src="lang-switcher.js" defer></script>\n</body>');
        }
    }

    if (content !== original) {
        fs.writeFileSync(filePath, content, 'utf8');
        console.log(`Updated: ${file}`);
        updatedCount++;
    }
});

console.log(`Successfully sanitized ${updatedCount} HTML files.`);
