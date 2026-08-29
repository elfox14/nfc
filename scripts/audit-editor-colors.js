const fs = require('fs');
const path = require('path');

const rootDir = process.cwd();

const targetFiles = [
    'editor.html',
    'editor-en.html',
    'style.original.css',
    'editor-enhancements.original.css',
    'toolbar-enhancements.original.css',
    'logo-panel.original.css',
    'ai-suggestion-panel.original.css',
    'mobile.original.css'
];

const patterns = [
    /#4da6ff/gi,
    /#00e5ff/gi,
    /#364f6b/gi,
    /#1c2a3b/gi,
    /#243447/gi,
    /#2c3e50/gi,
    /#34495e/gi,
    /#2980b9/gi,
    /#3498db/gi,
    /#007bff/gi,
    /#0056b3/gi,
    /#4a6a8a/gi,
    /#1a2634/gi,
    /#1e2d40/gi,
    /#0f172a/gi,
    /#1e293b/gi,
    /rgba\(\s*77\s*,\s*166\s*,\s*255/gi,
    /rgba\(\s*0\s*,\s*229\s*,\s*255/gi,
    /rgba\(\s*36\s*,\s*52\s*,\s*71/gi,
    /rgba\(\s*45\s*,\s*74\s*,\s*106/gi,
    /rgba\(\s*54\s*,\s*79\s*,\s*107/gi,
    /rgba\(\s*74\s*,\s*106\s*,\s*138/gi,
    /rgba\(\s*28\s*,\s*42\s*,\s*59/gi,
    /rgba\(\s*28\s*,\s*44\s*,\s*62/gi
];

const report = {};

targetFiles.forEach(file => {
    const filePath = path.join(rootDir, file);
    if (!fs.existsSync(filePath)) return;
    const content = fs.readFileSync(filePath, 'utf8');
    const matches = [];
    patterns.forEach(pat => {
        const found = content.match(pat);
        if (found) {
            matches.push({ pattern: pat.toString(), count: found.length });
        }
    });
    report[file] = matches;
});

console.log(JSON.stringify(report, null, 2));
