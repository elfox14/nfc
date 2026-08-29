const fs = require('fs');
const path = require('path');

const rootDir = path.resolve(__dirname, '..');
const htmlFiles = fs.readdirSync(rootDir).filter(f => f.endsWith('.html'));

console.log(`Fixing stylesheet links in ${htmlFiles.length} HTML files...`);

htmlFiles.forEach(file => {
    const filePath = path.join(rootDir, file);
    let html = fs.readFileSync(filePath, 'utf8');

    // Replace async preload links for homepage.css with direct stylesheet links
    html = html.replace(/<link\s+rel=["']preload["']\s+href=["']homepage\.css["']\s+as=["']style["'][^>]*>/gi, '');
    html = html.replace(/<noscript><link\s+rel=["']stylesheet["']\s+href=["']homepage\.css["']><\/noscript>/gi, '');
    
    // Ensure homepage.css and premium-ui.css are loaded directly
    const isEditor = file.startsWith('editor');
    const isViewer = file.startsWith('viewer');
    const isAdmin = file === 'admin.html';

    if (!isEditor && !isViewer && !isAdmin) {
        if (!html.includes('<link rel="stylesheet" href="homepage.css">')) {
            html = html.replace('</head>', '    <link rel="stylesheet" href="homepage.css">\n</head>');
        }
    }

    if (!html.includes('<link rel="stylesheet" href="premium-ui.css">')) {
        html = html.replace('</head>', '    <link rel="stylesheet" href="premium-ui.css">\n</head>');
    }

    // Clean up duplicate navbar or footer comments if any
    html = html.replace(/<!-- Navbar -->\s*<!-- Navbar -->/g, '<!-- Navbar -->');
    html = html.replace(/<!-- Footer -->\s*<!-- Footer -->/g, '<!-- Footer -->');

    fs.writeFileSync(filePath, html, 'utf8');
});

console.log('Fixed all stylesheet links across all HTML files!');
