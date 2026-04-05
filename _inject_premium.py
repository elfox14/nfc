"""Inject new premium v2 scripts into HTML files"""

files_scripts = {
    'editor.html':      '<script src="editor-premium-v2.js" defer></script>',
    'editor-en.html':   '<script src="editor-premium-v2.js" defer></script>',
    'viewer.html':      '<script src="viewer-premium-v2.js" defer></script>',
    'viewer-en.html':   '<script src="viewer-premium-v2.js" defer></script>',
}

for fname, tag in files_scripts.items():
    path = r'c:\Users\TheFo\Downloads\nfc\\' + fname
    try:
        with open(path, 'r', encoding='utf-8') as f:
            c = f.read()
        script_name = tag.split('"')[1]
        if script_name not in c:
            c = c.replace('</body>', tag + '\n</body>', 1)
            with open(path, 'w', encoding='utf-8') as f:
                f.write(c)
            print(f'OK: {fname}')
        else:
            print(f'SKIP (already exists): {fname}')
    except Exception as e:
        print(f'ERROR {fname}: {e}')
