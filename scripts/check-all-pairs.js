const fs = require('fs');
const path = require('path');

const rootDir = path.resolve(__dirname, '..');
const allHtmlFiles = fs.readdirSync(rootDir).filter(f => f.endsWith('.html'));

console.log('All HTML files count:', allHtmlFiles.length);

const pairs = {};
allHtmlFiles.forEach(file => {
    if (file.endsWith('-en.html')) {
        const ar = file.replace('-en.html', '.html');
        if (allHtmlFiles.includes(ar)) {
            pairs[ar] = file;
            pairs[file] = ar;
        } else {
            console.log('English file with no Arabic counterpart:', file);
        }
    } else {
        const en = file.replace('.html', '-en.html');
        if (allHtmlFiles.includes(en)) {
            pairs[file] = en;
            pairs[en] = file;
        } else {
            console.log('Arabic file with no English counterpart:', file);
        }
    }
});

console.log('\n--- Complete list of mapped pairs ---');
Object.keys(pairs).sort().forEach(k => {
    console.log(`'${k}': '${pairs[k]}',`);
});
