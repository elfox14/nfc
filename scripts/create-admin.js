require('dotenv').config();
const dns = require('dns');
try {
  dns.setServers(['8.8.8.8', '1.1.1.1', '8.8.4.4']);
} catch (e) {
  // Ignore if DNS override is not permitted
}
const { MongoClient } = require('mongodb');
const bcrypt = require('bcryptjs');

async function main() {
  const args = process.argv.slice(2);
  const email = (args[0] || '').trim().toLowerCase();
  const password = (args[1] || '').trim();
  const name = (args[2] || 'مسؤول النظام').trim();

  if (!email || !password) {
    console.log('\n❌ الاستخدام الصحيح:');
    console.log('node scripts/create-admin.js <email> <password> [name]\n');
    console.log('مثال:');
    console.log('node scripts/create-admin.js admin@mcprim.com SecretPassword123 "MC PRIME Admin"\n');
    process.exit(1);
  }

  const mongoUri = process.env.MONGO_URI;
  const dbName = process.env.MONGO_DB || 'mcnfc';
  const usersCollName = process.env.MONGO_USERS_COLL || 'users';

  if (!mongoUri) {
    console.error('❌ خطأ: MONGO_URI غير موجود في ملف .env');
    process.exit(1);
  }

  console.log(`🔌 جارٍ الاتصال بقاعدة البيانات (${dbName})...`);
  const client = new MongoClient(mongoUri);

  try {
    await client.connect();
    const db = client.db(dbName);
    const users = db.collection(usersCollName);

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const existingUser = await users.findOne({ email });

    if (existingUser) {
      // Update existing user to admin
      await users.updateOne(
        { _id: existingUser._id },
        {
          $set: {
            password: hashedPassword,
            role: 'admin',
            isAdmin: true,
            isVerified: true,
            updatedAt: new Date()
          }
        }
      );
      console.log(`\n✅ تم ترقية الحساب بنجاح وتحديث كلمة المرور:`);
      console.log(`👤 الاسم: ${existingUser.name || name}`);
      console.log(`📧 البريد: ${email}`);
      console.log(`👑 الرتبة: admin (مسؤول نظام)`);
    } else {
      // Insert new admin user
      const result = await users.insertOne({
        email,
        password: hashedPassword,
        name,
        role: 'admin',
        isAdmin: true,
        isVerified: true,
        createdAt: new Date(),
        updatedAt: new Date()
      });
      console.log(`\n🎉 تم إنشاء حساب المسؤول الجديد بنجاح:`);
      console.log(`🆔 المعرف: ${result.insertedId}`);
      console.log(`👤 الاسم: ${name}`);
      console.log(`📧 البريد: ${email}`);
      console.log(`👑 الرتبة: admin (مسؤول نظام)`);
    }

    console.log('\n✨ يمكنك الآن تسجيل الدخول فوراً عبر صفحة الإدارة: /nfc/admin.html\n');
  } catch (err) {
    console.error('❌ حدث خطأ أثناء إنشاء الحساب:', err.message);
  } finally {
    await client.close();
  }
}

main();
