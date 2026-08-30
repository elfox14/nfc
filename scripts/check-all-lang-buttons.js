const fs = require('fs');
const path = require('path');

const rootDir = path.resolve(__dirname, '..');
const files = fs.readdirSync(rootDir).filter(f => f.endsWith('.html'));

const results = [];

files.forEach(file => {
    const filePath = path.join(rootDir, file);
    const content = fs.readFileSync(filePath, 'utf8');
    
    // Check for lang attribute on html tag
    const langMatch = content.match(/<html[^>]*\blang=["']([^"']+)["']/i);
    const docLang = langMatch ? langMatch[1] : 'NONE';
    
    // Check for lang-switcher.js script tag
    const hasScript = content.includes('lang-switcher.js');
    
    // Find all elements with lang-btn, lang-toggle-btn, or switchLanguage
    const buttonRegex = /<(?:button|a)[^>]*?(?:lang-btn|lang-toggle-btn|switchLanguage|switchLang)[^>]*?>([\s\S]*?)<\/(?:button|a)>/gi;
    const buttons = [];
    let match;
    while ((match = buttonRegex.exec(content)) !== null) {
        buttons.push(match[0].trim());
    }
    
    results.push({
        file,
        docLang,
        hasScript,
        buttons
    });
});

console.log('=== DETAILED AUDIT OF ALL 52 HTML FILES ===');
results.forEach(r => {
    console.log(`\n📄 ${r.file} (HTML lang="${r.docLang}", has lang-switcher.js: ${r.hasScript})`);
    if (r.buttons.length === 0) {
        console.log(`   ⚠️ NO LANGUAGE BUTTON FOUND!`);
    } else {
        r.buttons.forEach((b, i) => {
            console.log(`   [${i+1}] ${b.replace(/\s+/g, ' ')}`);
        });
    }
});
