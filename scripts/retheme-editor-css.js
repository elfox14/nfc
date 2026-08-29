const fs = require('fs');
const path = require('path');

const rootDir = path.resolve(__dirname, '..');

const filesToRetheme = [
    'style.original.css',
    'editor-enhancements.original.css',
    'toolbar-enhancements.original.css',
    'logo-panel.original.css',
    'ai-suggestion-panel.original.css',
    'mobile.original.css'
];

const colorMaps = [
    // Hex colors
    { from: /#4da6ff/gi, to: '#c5a059' },
    { from: /#2d86ff/gi, to: '#d4af37' },
    { from: /#1a6bff/gi, to: '#c5a059' },
    { from: /#00e5ff/gi, to: '#d4af37' },
    { from: /#364f6b/gi, to: '#21262d' },
    { from: /#1c2a3b/gi, to: '#0d1117' },
    { from: /#1a2a3b/gi, to: '#0d1117' },
    { from: /#243447/gi, to: '#161b22' },
    { from: /#2c3e50/gi, to: '#161b22' },
    { from: /#34495e/gi, to: '#21262d' },
    { from: /#4a6a8a/gi, to: '#30363d' },
    { from: /#2980b9/gi, to: '#c5a059' },
    { from: /#3498db/gi, to: '#c5a059' },
    { from: /#007bff/gi, to: '#c5a059' },
    { from: /#0056b3/gi, to: '#d4af37' },
    { from: /#1a2634/gi, to: '#0d1117' },
    { from: /#1e2d40/gi, to: '#0d1117' },
    { from: /#0f172a/gi, to: '#0d1117' },
    { from: /#1e293b/gi, to: '#161b22' },
    
    // RGBA variations
    { from: /rgba\(\s*77\s*,\s*166\s*,\s*255\s*,\s*([0-9.]+)\s*\)/gi, to: 'rgba(197, 160, 89, $1)' },
    { from: /rgba\(\s*45\s*,\s*134\s*,\s*255\s*,\s*([0-9.]+)\s*\)/gi, to: 'rgba(212, 175, 55, $1)' },
    { from: /rgba\(\s*0\s*,\s*229\s*,\s*255\s*,\s*([0-9.]+)\s*\)/gi, to: 'rgba(230, 202, 133, $1)' },
    { from: /rgba\(\s*36\s*,\s*52\s*,\s*71\s*,\s*([0-9.]+)\s*\)/gi, to: 'rgba(22, 27, 34, $1)' },
    { from: /rgba\(\s*45\s*,\s*74\s*,\s*106\s*,\s*([0-9.]+)\s*\)/gi, to: 'rgba(22, 27, 34, $1)' },
    { from: /rgba\(\s*54\s*,\s*79\s*,\s*107\s*,\s*([0-9.]+)\s*\)/gi, to: 'rgba(33, 38, 45, $1)' },
    { from: /rgba\(\s*74\s*,\s*106\s*,\s*138\s*,\s*([0-9.]+)\s*\)/gi, to: 'rgba(48, 54, 61, $1)' },
    { from: /rgba\(\s*28\s*,\s*42\s*,\s*59\s*,\s*([0-9.]+)\s*\)/gi, to: 'rgba(22, 27, 34, $1)' },
    { from: /rgba\(\s*28\s*,\s*44\s*,\s*62\s*,\s*([0-9.]+)\s*\)/gi, to: 'rgba(22, 27, 34, $1)' },
    { from: /rgba\(\s*26\s*,\s*42\s*,\s*59\s*,\s*([0-9.]+)\s*\)/gi, to: 'rgba(22, 27, 34, $1)' },
    { from: /rgba\(\s*15\s*,\s*23\s*,\s*42\s*,\s*([0-9.]+)\s*\)/gi, to: 'rgba(13, 17, 23, $1)' }
];

filesToRetheme.forEach(file => {
    const filePath = path.join(rootDir, file);
    if (!fs.existsSync(filePath)) return;
    let css = fs.readFileSync(filePath, 'utf8');

    for (const rule of colorMaps) {
        css = css.replace(rule.from, rule.to);
    }

    fs.writeFileSync(filePath, css, 'utf8');
    console.log(`Rethemed: ${file}`);
});

console.log('All editor stylesheet files rethemed to Obsidian & Champagne Gold!');
