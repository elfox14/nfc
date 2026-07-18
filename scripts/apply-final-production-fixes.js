'use strict';

const fs = require('fs');

function read(file) {
  return fs.readFileSync(file, 'utf8');
}

function write(file, content) {
  fs.writeFileSync(file, content, 'utf8');
}

function replaceOnce(content, before, after, label) {
  const count = content.split(before).length - 1;
  if (count !== 1) throw new Error(`${label}: expected one match, found ${count}`);
  return content.replace(before, after);
}

for (const file of ['editor.html', 'editor-en.html']) {
  const cleaned = read(file).replace(
    /^Warning:\s*truncated output[^\r\n]*\r?\nTotal output lines:[^\r\n]*\r?\n\s*/i,
    ''
  );
  if (!cleaned.startsWith('<!DOCTYPE html>')) throw new Error(`${file} does not begin with a doctype`);
  if (/Warning:\s*truncated output|Total output lines:/i.test(cleaned.slice(0, 400))) {
    throw new Error(`${file} still contains injected output metadata`);
  }
  write(file, cleaned);
}

{
  const file = 'view/viewer.js';
  let content = read(file);
  const before = '                const response = await fetch(apiUrl);';
  const after = [
    '                const requestOptions = {',
    "                    credentials: 'include',",
    "                    cache: 'no-store',",
    '                    headers: window.Auth?.getHeader?.() || {}',
    '                };',
    '                const response = window.Auth?.apiFetchWithRefresh',
    '                    ? await window.Auth.apiFetchWithRefresh(apiUrl, requestOptions)',
    '                    : await fetch(apiUrl, requestOptions);'
  ].join('\n');
  if (!content.includes('window.Auth?.apiFetchWithRefresh')) {
    content = replaceOnce(content, before, after, 'viewer authenticated request');
  }
  write(file, content);
}

{
  const file = 'scripts/verify-production-release.js';
  let content = read(file);
  const helperAnchor = [
    '  async function checkUrl(name, url, markers) {',
    '    checks.push(await executeCheck(name, async () => {',
    '      const { response, body } = await requestWithRetry(url, requestOptions);',
    '      assertResponse(response, body, name, markers);',
    '      return { url, bytes: Buffer.byteLength(body) };',
    '    }));',
    '  }'
  ].join('\n');
  const helper = helperAnchor + '\n\n' + [
    '  async function checkEditorDocument(name, url) {',
    '    checks.push(await executeCheck(name, async () => {',
    '      const { response, body } = await requestWithRetry(url, requestOptions);',
    "      assertResponse(response, body, name, ['id=\"pro-toolbar\"', 'runtime-config.js', 'editor-shell.js']);",
    "      const normalized = body.replace(/^\\uFEFF/, '');",
    "      if (!normalized.startsWith('<!DOCTYPE html>')) throw new Error(`${name} does not start with <!DOCTYPE html>`);",
    "      if (/Warning:\\s*truncated output|Total output lines:/i.test(normalized.slice(0, 400))) throw new Error(`${name} contains injected output metadata`);",
    '      return { url, bytes: Buffer.byteLength(body) };',
    '    }));',
    '  }'
  ].join('\n');
  if (!content.includes('async function checkEditorDocument')) {
    content = replaceOnce(content, helperAnchor, helper, 'editor document verifier');
  }

  content = content.replace(
    "  await checkUrl('Arabic editor shell', `${publicOrigin}/nfc/editor.html`, ['id=\"pro-toolbar\"', 'runtime-config.js', 'editor-shell.js']);",
    "  await checkEditorDocument('Arabic editor shell', `${publicOrigin}/nfc/editor.html`);"
  );
  content = content.replace(
    "  await checkUrl('English editor shell', `${publicOrigin}/nfc/editor-en.html`, ['id=\"pro-toolbar\"', 'runtime-config.js', 'editor-shell.js']);",
    "  await checkEditorDocument('English editor shell', `${publicOrigin}/nfc/editor-en.html`);"
  );

  const viewerAnchor = [
    "  await checkUrl('Editor review workflow', `${publicOrigin}${expected.editorReviewWorkflowScript.split('?')[0]}`, [",
    "    \"const VERSION = '11.0.0'\", 'workspace-review-modal', 'submitComment', 'resolveComment'",
    '  ]);'
  ].join('\n');
  const viewerCheck = viewerAnchor + '\n' + [
    "  await checkUrl('Authenticated private viewer support', `${publicOrigin}/nfc/view/viewer.js`, [",
    "    'window.Auth?.apiFetchWithRefresh', \"credentials: 'include'\", \"cache: 'no-store'\"",
    '  ]);'
  ].join('\n');
  if (!content.includes('Authenticated private viewer support')) {
    content = replaceOnce(content, viewerAnchor, viewerCheck, 'viewer production verifier');
  }
  write(file, content);
}

write('test/final-production-fixes.test.js', String.raw`'use strict';

const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');

describe('final production source fixes', () => {
  test.each(['editor.html', 'editor-en.html'])('%s starts with a clean HTML doctype', file => {
    const html = read(file).replace(/^\uFEFF/, '');
    expect(html.startsWith('<!DOCTYPE html>')).toBe(true);
    expect(html.slice(0, 400)).not.toMatch(/Warning:\s*truncated output|Total output lines:/i);
  });

  test('viewer forwards the authenticated session for private workspace previews', () => {
    const viewer = read('view/viewer.js');
    expect(viewer).toContain('window.Auth?.apiFetchWithRefresh');
    expect(viewer).toContain("credentials: 'include'");
    expect(viewer).toContain("cache: 'no-store'");
    expect(viewer).toContain('headers: window.Auth?.getHeader?.() || {}');
    expect(viewer).toContain(': await fetch(apiUrl, requestOptions)');
  });

  test('production verification checks clean editor documents and authenticated viewer support', () => {
    const verifier = read('scripts/verify-production-release.js');
    expect(verifier).toContain('async function checkEditorDocument');
    expect(verifier).toContain('does not start with <!DOCTYPE html>');
    expect(verifier).toContain('contains injected output metadata');
    expect(verifier).toContain('Authenticated private viewer support');
  });
});
`);

write('docs/final-production-fixes.md', `# Final production fixes\n\nThis release completes the remaining Phase 11 production work.\n\n- The Arabic and English editor files now begin directly with the HTML doctype.\n- The viewer forwards the authenticated session when workspace members preview unpublished designs.\n- Production verification rejects injected editor metadata and checks the authenticated viewer bundle.\n- No database migration is required.\n\nAfter deployment, synchronize the updated static files and run \`npm run verify:production\`.\n`);

for (const file of [
  '.github/workflows/finalize-production-fixes.yml',
  '.github/workflows/finalize-production-fixes-pr.yml',
  '.finalize-production-fixes-trigger',
  'scripts/apply-final-production-fixes.js'
]) {
  if (fs.existsSync(file)) fs.unlinkSync(file);
}
