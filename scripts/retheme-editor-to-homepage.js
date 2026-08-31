const fs = require('fs');
const path = require('path');

const rootDir = path.resolve(__dirname, '..');

// ==========================================
// 1. UPDATE style.original.css
// ==========================================
const styleCssPath = path.join(rootDir, 'style.original.css');
let styleCss = fs.readFileSync(styleCssPath, 'utf8');

// Replace Root Tokens with Executive Obsidian & Gold
styleCss = styleCss.replace(
    /:root\s*\{[\s\S]*?--toolbar-height:\s*60px;\s*\}/,
`:root {
    --text-primary: #f0f6fc;
    --text-secondary: #8b949e;
    --accent-primary: #c5a059;
    --accent-primary-hover: #d4af37;
    --accent-primary-light: #e6ca85;
    --accent-secondary: #21262d;
    --accent-secondary-hover: #30363d;
    --button-text: #0d1117;
    --page-bg: #0d1117;
    --form-bg: #161b22;
    --border-subtle: rgba(240, 246, 252, 0.08);
    --border-accent: rgba(197, 160, 89, 0.25);
    --danger-color: #f85149;
    --success-color: #2ea043;
    --toolbar-height: 60px;
}`
);

styleCss = styleCss.replace(
    /\[data-theme="light"\]\s*\{[\s\S]*?--success-color:\s*#27ae60;\s*\}/,
`[data-theme="light"] {
    --text-primary: #1f2328;
    --text-secondary: #656d76;
    --accent-primary: #9e7a2f;
    --accent-primary-hover: #856322;
    --accent-primary-light: #b38e3e;
    --accent-secondary: #d0d7de;
    --accent-secondary-hover: #afb8c1;
    --button-text: #ffffff;
    --page-bg: #f6f8fa;
    --form-bg: #ffffff;
    --border-subtle: rgba(31, 35, 40, 0.12);
    --border-accent: rgba(158, 122, 47, 0.3);
    --danger-color: #cf222e;
    --success-color: #1a7f37;
    --toolbar-height: 60px;
}`
);

// Replace remaining hardcoded blue tones in style.original.css
styleCss = styleCss
    .replace(/rgba\(77,\s*166,\s*255,\s*0\.([0-9]+)\)/g, 'rgba(197, 160, 89, 0.$1)')
    .replace(/rgba\(77,\s*166,\s*255,\s*1\)/g, 'rgba(197, 160, 89, 1)')
    .replace(/#4da6ff/gi, '#c5a059')
    .replace(/#1a6bff/gi, '#c5a059')
    .replace(/#364f6b/gi, '#21262d')
    .replace(/#4a6a8a/gi, '#30363d')
    .replace(/#243447/gi, '#161b22')
    .replace(/#1c2a3b/gi, '#0d1117');

fs.writeFileSync(styleCssPath, styleCss, 'utf8');
console.log('✓ Updated style.original.css with Obsidian & Gold tokens.');


// ==========================================
// 2. UPDATE logo-panel.original.css
// ==========================================
const logoCssPath = path.join(rootDir, 'logo-panel.original.css');
let logoCss = fs.readFileSync(logoCssPath, 'utf8');

logoCss = logoCss
    .replace(/rgba\(77,\s*166,\s*255,\s*0\.([0-9]+)\)/g, 'rgba(197, 160, 89, 0.$1)')
    .replace(/rgba\(77,\s*166,\s*255,\s*1\)/g, 'rgba(197, 160, 89, 1)')
    .replace(/#4da6ff/gi, '#c5a059')
    .replace(/#1a6bff/gi, '#c5a059')
    .replace(/#3b82f6/gi, '#c5a059')
    .replace(/#2563eb/gi, '#9e7a2f')
    .replace(/#1d4ed8/gi, '#856322')
    .replace(/#60a5fa/gi, '#e6ca85')
    .replace(/#93c5fd/gi, '#f3e5be')
    .replace(/#1e293b/gi, '#161b22')
    .replace(/#0f172a/gi, '#0d1117');

fs.writeFileSync(logoCssPath, logoCss, 'utf8');
console.log('✓ Updated logo-panel.original.css with Obsidian & Gold tokens.');


// ==========================================
// 3. UPDATE toolbar-enhancements.original.css
// ==========================================
const tbCssPath = path.join(rootDir, 'toolbar-enhancements.original.css');
let tbCss = fs.readFileSync(tbCssPath, 'utf8');

tbCss = tbCss
    .replace(/rgba\(77,\s*166,\s*255,\s*0\.([0-9]+)\)/g, 'rgba(197, 160, 89, 0.$1)')
    .replace(/rgba\(77,\s*166,\s*255,\s*1\)/g, 'rgba(197, 160, 89, 1)')
    .replace(/#4da6ff/gi, '#c5a059')
    .replace(/#1a6bff/gi, '#c5a059')
    .replace(/#3b82f6/gi, '#c5a059')
    .replace(/#0d1b2e/gi, '#161b22')
    .replace(/#1e293b/gi, '#161b22')
    .replace(/#0f172a/gi, '#0d1117');

// Ensure active toolbar button has dark text on bright gold
tbCss = tbCss.replace(
    /\.active-design\s*\{[\s\S]*?\}/,
`.active-design {
    background: linear-gradient(135deg, #c5a059, #d4af37) !important;
    color: #0d1117 !important;
    font-weight: 700 !important;
    box-shadow: 0 3px 12px rgba(197, 160, 89, 0.4) !important;
}`
);

fs.writeFileSync(tbCssPath, tbCss, 'utf8');
console.log('✓ Updated toolbar-enhancements.original.css with Obsidian & Gold tokens.');


// ==========================================
// 4. UPDATE editor-enhancements.original.css
// ==========================================
const edCssPath = path.join(rootDir, 'editor-enhancements.original.css');
let edCss = fs.readFileSync(edCssPath, 'utf8');

edCss = edCss
    .replace(/rgba\(77,\s*166,\s*255,\s*0\.([0-9]+)\)/g, 'rgba(197, 160, 89, 0.$1)')
    .replace(/rgba\(77,\s*166,\s*255,\s*1\)/g, 'rgba(197, 160, 89, 1)')
    .replace(/#4da6ff/gi, '#c5a059')
    .replace(/#1a6bff/gi, '#c5a059')
    .replace(/#3b82f6/gi, '#c5a059')
    .replace(/#2563eb/gi, '#9e7a2f')
    .replace(/#1d4ed8/gi, '#856322')
    .replace(/#60a5fa/gi, '#e6ca85')
    .replace(/#93c5fd/gi, '#f3e5be')
    .replace(/#1e293b/gi, '#161b22')
    .replace(/#0f172a/gi, '#0d1117')
    .replace(/#1c2a3b/gi, '#0d1117')
    .replace(/#243447/gi, '#161b22');

fs.writeFileSync(edCssPath, edCss, 'utf8');
console.log('✓ Updated editor-enhancements.original.css with Obsidian & Gold tokens.');


// ==========================================
// 5. UPDATE ai-suggestion-panel.original.css
// ==========================================
const aiCssPath = path.join(rootDir, 'ai-suggestion-panel.original.css');
let aiCss = fs.readFileSync(aiCssPath, 'utf8');

aiCss = aiCss
    .replace(/rgba\(77,\s*166,\s*255,\s*0\.([0-9]+)\)/g, 'rgba(197, 160, 89, 0.$1)')
    .replace(/rgba\(77,\s*166,\s*255,\s*1\)/g, 'rgba(197, 160, 89, 1)')
    .replace(/#4da6ff/gi, '#c5a059')
    .replace(/#1a6bff/gi, '#c5a059')
    .replace(/#3b82f6/gi, '#c5a059')
    .replace(/#667eea/gi, '#c5a059')
    .replace(/#764ba2/gi, '#9e7a2f')
    .replace(/#1e293b/gi, '#161b22')
    .replace(/#0f172a/gi, '#0d1117');

fs.writeFileSync(aiCssPath, aiCss, 'utf8');
console.log('✓ Updated ai-suggestion-panel.original.css with Obsidian & Gold tokens.');


// ==========================================
// 6. UPDATE mobile.original.css
// ==========================================
const mobCssPath = path.join(rootDir, 'mobile.original.css');
let mobCss = fs.readFileSync(mobCssPath, 'utf8');

mobCss = mobCss
    .replace(/rgba\(77,\s*166,\s*255,\s*0\.([0-9]+)\)/g, 'rgba(197, 160, 89, 0.$1)')
    .replace(/rgba\(77,\s*166,\s*255,\s*1\)/g, 'rgba(197, 160, 89, 1)')
    .replace(/#4da6ff/gi, '#c5a059')
    .replace(/#1a6bff/gi, '#c5a059')
    .replace(/#3b82f6/gi, '#c5a059')
    .replace(/#2d86ff/gi, '#d4af37')
    .replace(/#1a2a3b/gi, '#0d1117')
    .replace(/rgba\(15,\s*23,\s*42,/g, 'rgba(13, 17, 23,')
    .replace(/#0f172a/gi, '#0d1117')
    .replace(/#1e293b/gi, '#161b22');

fs.writeFileSync(mobCssPath, mobCss, 'utf8');
console.log('✓ Updated mobile.original.css with Obsidian & Gold tokens.');


// ==========================================
// 7. UPDATE editor.html and editor-en.html inline styles
// ==========================================
['editor.html', 'editor-en.html'].forEach(file => {
    const p = path.join(rootDir, file);
    let html = fs.readFileSync(p, 'utf8');
    
    html = html
        .replace(/color:\s*#4da6ff/gi, 'color: #c5a059')
        .replace(/color:\s*#1a6bff/gi, 'color: #c5a059')
        .replace(/background:\s*linear-gradient\(135deg,\s*#667eea,\s*#764ba2\)/gi, 'background: linear-gradient(135deg, #c5a059, #d4af37); color: #0d1117');
    
    fs.writeFileSync(p, html, 'utf8');
    console.log(`✓ Updated inline colors in ${file}`);
});

console.log('\nAll editor files successfully rethemed to Executive Obsidian & Gold palette!');
