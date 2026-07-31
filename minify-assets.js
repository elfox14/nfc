/**
 * Rebuild every generated CSS/JS asset from its adjacent .original source.
 * The same discovery and minification implementation is used by CI.
 */

const fs = require('fs');
const path = require('path');
const { discoverGeneratedAssetPairs, minifyAsset } = require('./scripts/generated-assets');

function formatBytes(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  return `${(bytes / 1024).toFixed(1)} KB`;
}

async function main() {
  const root = __dirname;
  const pairs = discoverGeneratedAssetPairs(root);

  if (pairs.length === 0) {
    throw new Error('No .original.css or .original.js source assets were found.');
  }

  let totalOriginal = 0;
  let totalMinified = 0;

  for (const pair of pairs) {
    const relativeSource = path.relative(root, pair.sourcePath);
    const relativeGenerated = path.relative(root, pair.generatedPath);
    const source = fs.readFileSync(pair.sourcePath, 'utf8');
    const generated = await minifyAsset(source, pair.type, relativeSource);

    fs.writeFileSync(pair.generatedPath, generated);
    totalOriginal += Buffer.byteLength(source);
    totalMinified += Buffer.byteLength(generated);
    console.log(`${relativeSource} -> ${relativeGenerated}`);
  }

  const saved = totalOriginal - totalMinified;
  const percent = totalOriginal === 0 ? '0.0' : ((saved / totalOriginal) * 100).toFixed(1);
  console.log(
    `Rebuilt ${pairs.length} assets: ${formatBytes(totalOriginal)} -> ${formatBytes(totalMinified)} ` +
      `(${percent}% smaller).`
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
