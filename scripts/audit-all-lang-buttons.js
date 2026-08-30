const fs = require('fs');
const path = require('path');

const rootDir = path.resolve(__dirname, '..');
const files = fs.readdirSync(rootDir).filter(f => f.endsWith('.html'));

const langSwitcherCode = fs.readFileSync(path.join(rootDir, 'lang-switcher.original.js'), 'utf8');

// Extract PAGE_MAP from lang-switcher.original.js
const mapMatch = langSwitcherCode.match(/var PAGE_MAP = {([\s\S]*?)};/);
const pageMap = {};
if (mapMatch) {
    mapMatch[1].split('\n').forEach(line => {
        const m = line.match(/'([^']+)':\s*'([^']+)'/);
        if (m) {
            pageMap[m[1]] = m[2];
        }
    });
}

console.log('Total HTML files found:', files.length);
console.log('Total PAGE_MAP entries:', Object.keys(pageMap).length);

const issues = [];

files.forEach(file => {
    const filePath = path.join(rootDir, file);
    const content = fs.readFileSync(filePath, 'utf8');
    
    const isEn = file.includes('-en.html') || file.includes('-en');
    const expectedLang = isEn ? 'en' : 'ar';
    const htmlLangMatch = content.match(/<html[^>]*lang=["']([^"']+)["']/i);
    const htmlLang = htmlLangMatch ? htmlLangMatch[1] : 'NOT_FOUND';
    
    const hasLangSwitcherScript = content.includes('lang-switcher.js');
    
    // Find all language buttons or toggles
    const langBtnMatches = content.match(/<[^>]+(?:lang-btn|switchLanguage|switchLang|lang-toggle)[^>]*>[\s\S]*?<\/[^>]+>/gi) || [];
    
    const targetInMap = pageMap[file];
    
    let counterPart = isEn ? file.replace('-en.html', '.html').replace('-en', '') : file.replace('.html', '-en.html');
    if (!fs.existsSync(path.join(rootDir, counterPart))) {
        counterPart = 'NONE';
    }
    
    console.log(`\n--- ${file} (lang: ${htmlLang}) ---`);
    console.log(`  Counterpart file on disk: ${counterPart}`);
    console.log(`  PAGE_MAP entry: ${targetInMap || 'MISSING IN PAGE_MAP'}`);
    console.log(`  has lang-switcher.js: ${hasLangSwitcherScript}`);
    console.log(`  Lang buttons count: ${langBtnMatches.length}`);
    langBtnMatches.forEach((btn, idx) => {
        console.log(`    Btn ${idx + 1}: ${btn.replace(/\s+/g, ' ').substring(0, 120)}`);
    });

    if (!targetInMap && counterPart !== 'NONE') {
        issues.push(`${file} has counterpart ${counterPart} but is MISSING from PAGE_MAP!`);
    }
    if (!hasLangSwitcherScript && file !== 'admin.html') {
        issues.push(`${file} is MISSING <script src="lang-switcher.js">!`);
    }
    if (langBtnMatches.length === 0 && file !== 'admin.html' && file !== '404.html' && file !== '500.html') {
        issues.push(`${file} has NO language button!`);
    }
});

console.log('\n================ ISSUES SUMMARY ================');
if (issues.length === 0) {
    console.log('No issues found!');
} else {
    issues.forEach(iss => console.log('❌ ' + iss));
}
