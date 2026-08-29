const fs = require('fs');
const path = require('path');

const rootDir = path.resolve(__dirname, '..');
const htmlFiles = fs.readdirSync(rootDir).filter(f => f.endsWith('.html'));

console.log(`Verifying links in ${htmlFiles.length} HTML files...`);

let totalBroken = 0;
const report = [];

htmlFiles.forEach(file => {
    const filePath = path.join(rootDir, file);
    const content = fs.readFileSync(filePath, 'utf8');

    // Extract all href and src
    const hrefMatches = [...content.matchAll(/href=["']([^"']+)["']/gi)];
    const srcMatches = [...content.matchAll(/src=["']([^"']+)["']/gi)];

    const brokenLinks = [];

    // Check hrefs
    hrefMatches.forEach(m => {
        const link = m[1].trim();
        // Ignore external urls, tel, mailto, javascript, pure anchors
        if (
            link.startsWith('http://') ||
            link.startsWith('https://') ||
            link.startsWith('//') ||
            link.startsWith('mailto:') ||
            link.startsWith('tel:') ||
            link.startsWith('javascript:') ||
            link.startsWith('#') ||
            link === ''
        ) {
            return;
        }

        // Split link and anchor/query
        const [cleanLink] = link.split('#');
        const [filePart] = cleanLink.split('?');

        if (filePart) {
            const targetPath = path.join(rootDir, filePart);
            if (!fs.existsSync(targetPath)) {
                brokenLinks.push({ type: 'href', target: link, filePart });
            }
        }
    });

    // Check srcs
    srcMatches.forEach(m => {
        const link = m[1].trim();
        if (
            link.startsWith('http://') ||
            link.startsWith('https://') ||
            link.startsWith('//') ||
            link.startsWith('data:') ||
            link === ''
        ) {
            return;
        }

        const [filePart] = link.split('?');
        if (filePart) {
            const targetPath = path.join(rootDir, filePart);
            if (!fs.existsSync(targetPath)) {
                brokenLinks.push({ type: 'src', target: link, filePart });
            }
        }
    });

    if (brokenLinks.length > 0) {
        totalBroken += brokenLinks.length;
        report.push({ file, brokenLinks });
    }
});

if (totalBroken === 0) {
    console.log(`✓ All internal links and resources in all ${htmlFiles.length} HTML files are valid!`);
} else {
    console.error(`Found ${totalBroken} broken links/resources:`, JSON.stringify(report, null, 2));
    process.exit(1);
}
