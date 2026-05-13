/**
 * MC PRIME — ضغط الصور الكبيرة إلى WebP
 * يحول الصور المتبقية إلى WebP لتقليل حجمها
 * 
 * الاستخدام: node optimize-images.js
 */

const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const imagesToConvert = [
  'mcprime-social-1200x630.png',
  'mcprime_qr.png',
];

async function optimizeImages() {
  console.log('🖼️  بدء ضغط الصور...\n');

  let totalSaved = 0;

  for (const file of imagesToConvert) {
    if (!fs.existsSync(file)) {
      console.log(`  ⚠️  ${file} — غير موجود`);
      continue;
    }

    const originalSize = fs.statSync(file).size;
    const webpFile = file.replace(/\.(png|jpg|jpeg)$/i, '.webp');

    try {
      // Skip if WebP already exists
      if (fs.existsSync(webpFile)) {
        console.log(`  ⏩ ${webpFile} — موجود مسبقاً`);
        continue;
      }

      await sharp(file)
        .webp({ quality: 85 })
        .toFile(webpFile);

      const newSize = fs.statSync(webpFile).size;
      const saved = originalSize - newSize;
      const percent = ((saved / originalSize) * 100).toFixed(1);
      totalSaved += saved;

      console.log(`  ✅ ${file} → ${webpFile}`);
      console.log(`     ${formatBytes(originalSize)} → ${formatBytes(newSize)} (وفرنا ${percent}%)`);
    } catch (err) {
      console.log(`  ❌ ${file} — خطأ: ${err.message}`);
    }
  }

  console.log(`\n📊 إجمالي التوفير: ${formatBytes(totalSaved)}`);
}

function formatBytes(bytes) {
  if (bytes < 1024) return bytes + ' B';
  return (bytes / 1024).toFixed(1) + ' KB';
}

optimizeImages();
