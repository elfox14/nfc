#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const files = process.argv.filter((arg) => arg.endsWith('.html'));
const targets = files.length ? files : ['editor.html', 'editor-en.html'];
const strict = process.argv.includes('--strict');
const json = process.argv.includes('--json');

function countMatches(source, expression) {
    return (source.match(expression) || []).length;
}

function analyze(fileName) {
    const filePath = path.resolve(root, fileName);
    const source = fs.readFileSync(filePath, 'utf8');
    const ids = new Map();

    for (const match of source.matchAll(/\bid\s*=\s*["']([^"']+)["']/gi)) {
        const id = match[1].trim();
        ids.set(id, (ids.get(id) || 0) + 1);
    }

    const duplicateIds = [...ids.entries()]
        .filter(([, count]) => count > 1)
        .map(([id, count]) => ({ id, count }));

    return {
        file: fileName,
        bytes: Buffer.byteLength(source),
        lines: source.split(/\r?\n/).length,
        buttons: countMatches(source, /<button\b/gi),
        controls: countMatches(source, /<(?:input|select|textarea)\b/gi),
        accordions: countMatches(source, /<details\b/gi),
        inlineStyles: countMatches(source, /\bstyle\s*=\s*["']/gi),
        inlineEventHandlers: countMatches(source, /\bon[a-z]+\s*=\s*["']/gi),
        localScripts: countMatches(source, /<script\b[^>]*\bsrc\s*=\s*["'](?!https?:\/\/|\/\/)/gi),
        externalScripts: countMatches(source, /<script\b[^>]*\bsrc\s*=\s*["'](?:https?:\/\/|\/\/)/gi),
        duplicateIds
    };
}

let reports;
try {
    reports = targets.map(analyze);
} catch (error) {
    console.error(`[editor-audit] ${error.message}`);
    process.exitCode = 1;
    return;
}

if (json) {
    console.log(JSON.stringify(reports, null, 2));
} else {
    for (const report of reports) {
        console.log(`\n${report.file}`);
        console.log(`  ${report.lines} lines, ${report.bytes} bytes`);
        console.log(`  ${report.buttons} buttons, ${report.controls} form controls, ${report.accordions} accordions`);
        console.log(`  ${report.inlineStyles} inline styles, ${report.inlineEventHandlers} inline event handlers`);
        console.log(`  ${report.localScripts} local scripts, ${report.externalScripts} external scripts`);
        if (report.duplicateIds.length) {
            console.log(`  Duplicate ids: ${report.duplicateIds.map(({ id, count }) => `${id} (${count})`).join(', ')}`);
        } else {
            console.log('  Duplicate ids: none');
        }
    }
}

if (strict && reports.some((report) => report.duplicateIds.length > 0)) {
    process.exitCode = 1;
}
