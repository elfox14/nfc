const fs = require('fs');
const path = require('path');

const rootDir = path.join(__dirname, '..');
const files = fs.readdirSync(rootDir).filter(f => f.endsWith('.html') || f.endsWith('.ejs'));

let count = 0;
files.forEach(file => {
    const filePath = path.join(rootDir, file);
    let content = fs.readFileSync(filePath, 'utf8');
    const updated = content
        .replace(/src="https:\/\/(www\.)?mcprim\.com\/nfc\/mc-prime-nfc\.png"/g, 'src="/nfc/mc-prime-nfc.png"')
        .replace(/href="https:\/\/(www\.)?mcprim\.com\/nfc\/mc-prime-nfc\.png"/g, 'href="/nfc/mc-prime-nfc.png"');
    if (content !== updated) {
        fs.writeFileSync(filePath, updated, 'utf8');
        count++;
        console.log('Updated logo URLs in:', file);
    }
});
console.log('Total files updated:', count);
