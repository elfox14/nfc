const fs = require('fs');
const path = require('path');
const { discoverGeneratedAssetPairs, minifyAsset } = require('./generated-assets');

async function main() {
  const root = path.resolve(__dirname, '..');
  const pairs = discoverGeneratedAssetPairs(root);

  if (pairs.length === 0) {
    throw new Error('No .original.css or .original.js source assets were found.');
  }

  const staleAssets = [];
  for (const pair of pairs) {
    const relativeSource = path.relative(root, pair.sourcePath);
    const relativeGenerated = path.relative(root, pair.generatedPath);

    if (!fs.existsSync(pair.generatedPath)) {
      staleAssets.push(`${relativeGenerated} is missing (source: ${relativeSource})`);
      continue;
    }

    const source = fs.readFileSync(pair.sourcePath, 'utf8');
    const expected = await minifyAsset(source, pair.type, relativeSource);
    const actual = fs.readFileSync(pair.generatedPath, 'utf8').trim();

    if (actual !== expected.trim()) {
      staleAssets.push(`${relativeGenerated} is stale (source: ${relativeSource})`);
    }
  }

  if (staleAssets.length > 0) {
    console.error(staleAssets.join('\n'));
    console.error('Run `npm run build:assets` and commit both source and generated files.');
    process.exit(1);
  }

  console.log(`Generated assets are synchronized (${pairs.length} pairs).`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
