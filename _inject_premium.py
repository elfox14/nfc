import sys

tag = '</body>'
script = '\n    <!-- [NEW] Editor Premium Enhancements -->\n    <script src="editor-premium.js" defer></script>\n'

for fname in ['editor.html', 'editor-en.html']:
    path = r'c:\Users\TheFo\Downloads\nfc\\' + fname
    with open(path, 'r', encoding='utf-8') as f:
        c = f.read()
    if 'editor-premium.js' not in c:
        c = c.replace(tag, script + tag, 1)
        with open(path, 'w', encoding='utf-8') as f:
            f.write(c)
        print(f'Updated: {fname}')
    else:
        print(f'Already has it: {fname}')
