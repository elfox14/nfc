// test-connection.js
// اختبار سريع للاتصال بـ MongoDB Atlas

require('dotenv').config();
const { MongoClient } = require('mongodb');

async function testConnection() {
    console.log('🔍 Testing MongoDB Atlas connection...\n');

    const uri = process.env.MONGO_URI;
    console.log('Connection URI:', uri.replace(/\/\/([^:]+):([^@]+)@/, '//$1:****@'));

    let client;
    try {
        console.log('\n⏳ Connecting...');
        client = await MongoClient.connect(uri, {
            serverSelectionTimeoutMS: 10000,
            socketTimeoutMS: 10000,
        });

        console.log('✅ Connected successfully!\n');

        const db = client.db(process.env.MONGO_DB || 'nfc_db');

        // اختبار write
        console.log('📝 Testing write operation...');
        await db.collection('test').insertOne({ test: true, timestamp: new Date() });
        console.log('✅ Write successful!\n');

        // اختبار read
        console.log('📖 Testing read operation...');
        const doc = await db.collection('test').findOne({ test: true });
        console.log('✅ Read successful!');
        console.log('Document:', doc);

        // cleanup
        await db.collection('test').deleteMany({ test: true });

        console.log('\n🎉 All tests passed! MongoDB Atlas is working correctly.\n');

    } catch (error) {
        console.error('\n❌ Connection failed:');
        console.error('Error:', error.message);
        console.error('\n💡 Possible causes:');
        console.error('   1. IP not whitelisted in MongoDB Atlas Network Access');
        console.error('   2. Incorrect username/password');
        console.error('   3. DNS resolution issues (VPN/Firewall)');
        console.error('   4. Network connectivity problems');

    } finally {
        if (client) {
            await client.close();
            console.log('\n🔌 Connection closed.');
        }
    }
}

testConnection();
