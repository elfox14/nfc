const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const envPath = path.join(__dirname, '..', '.env');
const args = process.argv.slice(2);
const newPassword = (args[0] || '').trim();

if (!newPassword) {
  console.log('\n======================================================');
  console.log('🔑 أداة تعيين وتغيير كلمة مرور المشرف (Admin Password)');
  console.log('======================================================\n');
  console.log('الاستخدام:');
  console.log('  node scripts/set-admin-password.js <كلمة_المرور_الجديدة>\n');
  console.log('مثال:');
  console.log('  node scripts/set-admin-password.js mcprime2026\n');
  process.exit(0);
}

const sha256 = crypto.createHash('sha256').update(newPassword).digest('hex');

if (!fs.existsSync(envPath)) {
  console.error('❌ ملف .env غير موجود!');
  process.exit(1);
}

let envContent = fs.readFileSync(envPath, 'utf8');

// Replace or add ADMIN_TOKEN_SHA256
if (/^ADMIN_TOKEN_SHA256=.*/m.test(envContent)) {
  envContent = envContent.replace(/^ADMIN_TOKEN_SHA256=.*/m, `ADMIN_TOKEN_SHA256=${sha256}`);
} else {
  envContent += `\nADMIN_TOKEN_SHA256=${sha256}\n`;
}

// Replace or add ADMIN_PASSWORD
if (/^ADMIN_PASSWORD=.*/m.test(envContent)) {
  envContent = envContent.replace(/^ADMIN_PASSWORD=.*/m, `ADMIN_PASSWORD=${newPassword}`);
} else {
  envContent += `ADMIN_PASSWORD=${newPassword}\n`;
}

fs.writeFileSync(envPath, envContent, 'utf8');

console.log('\n======================================================');
console.log('✅ تم تحديث كلمة مرور المشرف بنجاح!');
console.log('======================================================');
console.log(`🔑 كلمة المرور الجديدة: ${newPassword}`);
console.log(`🔒 SHA-256 Hash:        ${sha256}`);
console.log('======================================================');
console.log('✨ يمكنك الآن الدخول إلى صفحة الإدارة واستخدام كلمة المرور أعلاه مباشرة.');
console.log('🌐 رابط الإدارة: /nfc/admin.html أو /admin\n');
