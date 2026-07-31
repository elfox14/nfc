const fs = require('fs');
const path = require('path');

describe('editor autosave status identifiers', () => {
  test.each(['editor.html', 'editor-en.html'])('%s has one toolbar autosave identifier', (file) => {
    const html = fs.readFileSync(path.join(__dirname, '..', file), 'utf8');
    expect(html.match(/id="autosave-indicator"/g)).toHaveLength(1);
  });

  test('the local-storage autosave helper uses a distinct identifier', () => {
    const source = fs.readFileSync(
      path.join(__dirname, '..', 'editor-enhancements.original.js'),
      'utf8'
    );

    expect(source).toContain("indicator.id = 'local-autosave-indicator'");
    expect(source).toContain("getElementById('local-autosave-indicator')");
  });
});
