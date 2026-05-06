const fs = require('fs');
const path = require('path');

function injectPremiumUI() {
    const rootDir = __dirname;
    const files = fs.readdirSync(rootDir);
    const htmlFiles = files.filter(f => f.endsWith('.html'));

    const cssTag = '    <link rel="stylesheet" href="/nfc/premium-ui.css">\n';
    const jsTag = '    <script src="/nfc/premium-ui.js" defer></script>\n';

    let injectedCount = 0;

    for (const file of htmlFiles) {
        const filePath = path.join(rootDir, file);
        let content = fs.readFileSync(filePath, 'utf8');

        let modified = false;

        // Inject CSS right before </head>
        if (!content.includes('premium-ui.css') && content.includes('</head>')) {
            content = content.replace('</head>', cssTag + '</head>');
            modified = true;
        }

        // Inject JS right before </body>
        if (!content.includes('premium-ui.js') && content.includes('</body>')) {
            content = content.replace('</body>', jsTag + '</body>');
            modified = true;
        }

        if (modified) {
            fs.writeFileSync(filePath, content);
            console.log(`Injected into ${file}`);
            injectedCount++;
        }
    }

    console.log(`Successfully injected Premium UI into ${injectedCount} files.`);
}

injectPremiumUI();
