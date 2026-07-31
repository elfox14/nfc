const fs = require('fs');
const path = require('path');
const terser = require('terser');

async function main() {
  const root = path.resolve(__dirname, '..');
  const generatedPairs = [
    ['sw.original.js', 'sw.js'],
    ['script-ui.original.js', 'script-ui.js'],
    ['editor-enhancements.original.js', 'editor-enhancements.js']
  ];

  for (const [sourceName, generatedName] of generatedPairs) {
    const source = fs.readFileSync(path.join(root, sourceName), 'utf8');
    const generated = fs.readFileSync(path.join(root, generatedName), 'utf8').trim();
    const result = await terser.minify(source, { compress: true, mangle: true });

    if (!result.code || result.code.trim() !== generated) {
      console.error(`${generatedName} is stale. Rebuild it from ${sourceName} and commit both files.`);
      process.exit(1);
    }
  }

  console.log('Generated assets are synchronized.');
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
