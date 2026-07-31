const fs = require('fs');
const path = require('path');
const CleanCSS = require('clean-css');
const terser = require('terser');

const EXCLUDED_DIRECTORIES = new Set([
  '.git',
  'coverage',
  'node_modules',
  'playwright-report',
  'static-build',
  'test-results'
]);

function discoverGeneratedAssetPairs(root) {
  const pairs = [];

  function visit(directory) {
    for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
      if (entry.isDirectory()) {
        if (!EXCLUDED_DIRECTORIES.has(entry.name)) {
          visit(path.join(directory, entry.name));
        }
        continue;
      }

      if (!entry.isFile() || !/\.original\.(?:css|js)$/.test(entry.name)) {
        continue;
      }

      const sourcePath = path.join(directory, entry.name);
      const generatedPath = sourcePath.replace(/\.original\.(css|js)$/, '.$1');
      pairs.push({ sourcePath, generatedPath, type: path.extname(sourcePath).slice(1) });
    }
  }

  visit(root);
  return pairs.sort((left, right) => left.sourcePath.localeCompare(right.sourcePath));
}

async function minifyAsset(source, type, sourcePath) {
  if (type === 'js') {
    const result = await terser.minify(source, { compress: true, mangle: true });
    if (!result.code) {
      throw new Error(`Terser did not emit output for ${sourcePath}`);
    }
    return result.code;
  }

  // Preserve build-tool imports such as Tailwind instead of trying to resolve
  // packages relative to the CSS file during this static minification step.
  const result = new CleanCSS({ inline: ['none'] }).minify(source);
  if (result.errors.length > 0) {
    throw new Error(`${sourcePath}: ${result.errors.join('; ')}`);
  }
  return result.styles;
}

module.exports = {
  discoverGeneratedAssetPairs,
  minifyAsset
};
