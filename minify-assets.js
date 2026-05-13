/**
 * MC PRIME — CSS & JS Minification Script
 * يضغط ملفات CSS و JS لتحسين أداء الموقع
 * 
 * الاستخدام: node minify-assets.js
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// ملفات CSS المستهدفة للضغط
const cssFiles = [
  'style.css',
  'homepage.css',
  'mobile.css',
  'gallery.css',
  'viewer.css',
  'editor-enhancements.css',
  'toolbar-enhancements.css',
  'logo-panel.css',
  'ai-suggestion-panel.css',
  'premium-ui.css',
  'cookie-consent.css',
  'toast.css',
  'card-page.css',
  'index.css',
];

// ملفات JS المستهدفة للضغط (فقط ملفات الفرونت إند)
const jsFiles = [
  'script-main.js',
  'script-core.js',
  'script-ui.js',
  'script-card.js',
  'editor-enhancements.js',
  'editor-panels.js',
  'editor-tour.js',
  'editor-user-status.js',
  'ai-backgrounds.js',
  'mobile.js',
  'viewer.js',
  'viewer-premium-v2.js',
  'editor-premium-v2.js',
  'lang-switcher.js',
  'cookie-consent.js',
  'error-reporter.js',
  'premium-ui.js',
  'security-utils.js',
  'state-manager-proxy.js',
  'sw.js',
];

let totalOriginal = 0;
let totalMinified = 0;
let results = [];

console.log('🚀 بدء ضغط ملفات الموقع...\n');

// ═══ ضغط CSS ═══
console.log('═══ ضغط ملفات CSS ═══');
cssFiles.forEach(file => {
  if (!fs.existsSync(file)) {
    console.log(`  ⚠️  ${file} — غير موجود`);
    return;
  }

  const originalSize = fs.statSync(file).size;
  
  // إنشاء نسخة احتياطية
  const backupFile = file.replace('.css', '.original.css');
  if (!fs.existsSync(backupFile)) {
    fs.copyFileSync(file, backupFile);
  }

  try {
    execSync(`npx cleancss -o "${file}" "${backupFile}"`, { stdio: 'pipe' });
    const minifiedSize = fs.statSync(file).size;
    const saved = originalSize - minifiedSize;
    const percent = ((saved / originalSize) * 100).toFixed(1);

    totalOriginal += originalSize;
    totalMinified += minifiedSize;
    results.push({ file, originalSize, minifiedSize, saved, percent });

    console.log(`  ✅ ${file}: ${formatBytes(originalSize)} → ${formatBytes(minifiedSize)} (وفرنا ${percent}%)`);
  } catch (err) {
    console.log(`  ❌ ${file} — خطأ في الضغط`);
    // استرجاع النسخة الأصلية في حالة الخطأ
    if (fs.existsSync(backupFile)) {
      fs.copyFileSync(backupFile, file);
    }
  }
});

console.log('\n═══ ضغط ملفات JS ═══');
jsFiles.forEach(file => {
  if (!fs.existsSync(file)) {
    console.log(`  ⚠️  ${file} — غير موجود`);
    return;
  }

  const originalSize = fs.statSync(file).size;
  
  // إنشاء نسخة احتياطية
  const backupFile = file.replace('.js', '.original.js');
  if (!fs.existsSync(backupFile)) {
    fs.copyFileSync(file, backupFile);
  }

  try {
    execSync(`npx terser "${backupFile}" -o "${file}" --compress --mangle`, { stdio: 'pipe' });
    const minifiedSize = fs.statSync(file).size;
    const saved = originalSize - minifiedSize;
    const percent = ((saved / originalSize) * 100).toFixed(1);

    totalOriginal += originalSize;
    totalMinified += minifiedSize;
    results.push({ file, originalSize, minifiedSize, saved, percent });

    console.log(`  ✅ ${file}: ${formatBytes(originalSize)} → ${formatBytes(minifiedSize)} (وفرنا ${percent}%)`);
  } catch (err) {
    console.log(`  ❌ ${file} — خطأ في الضغط`);
    if (fs.existsSync(backupFile)) {
      fs.copyFileSync(backupFile, file);
    }
  }
});

// ═══ ملخص ═══
const totalSaved = totalOriginal - totalMinified;
const totalPercent = ((totalSaved / totalOriginal) * 100).toFixed(1);

console.log('\n════════════════════════════════════════');
console.log(`📊 الملخص:`);
console.log(`   الحجم الأصلي:  ${formatBytes(totalOriginal)}`);
console.log(`   الحجم المضغوط: ${formatBytes(totalMinified)}`);
console.log(`   تم توفير:      ${formatBytes(totalSaved)} (${totalPercent}%)`);
console.log('════════════════════════════════════════');
console.log('\n💡 ملاحظة: النسخ الأصلية محفوظة بامتداد .original.css / .original.js');
console.log('   لاسترجاعها: أعد تسمية الملفات الأصلية وامسح المضغوطة.');

function formatBytes(bytes) {
  if (bytes < 1024) return bytes + ' B';
  return (bytes / 1024).toFixed(1) + ' KB';
}
