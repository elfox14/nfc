require('dotenv').config();
const { MongoClient } = require('mongodb');

const uri = process.env.MONGO_URI;
console.log('Testing connection to:', uri ? uri.replace(/:([^:@]+)@/, ':****@') : 'UNDEFINED');

if (!uri) {
    console.error('❌ MONGO_URI is missing in .env');
    process.exit(1);
}

const client = new MongoClient(uri, {
    serverSelectionTimeoutMS: 5000, // Timeout after 5 seconds
    connectTimeoutMS: 5000
});

async function run() {
    try {
        console.log('Attempting to connect...');
        await client.connect();
        console.log('✅ Connected successfully to server');

        const db = client.db('nfc_db');
        console.log('✅ Database selected:', db.databaseName);

        // Try a simple operation
        const collections = await db.listCollections().toArray();
        console.log('✅ Collections:', collections.map(c => c.name));

        await client.close();
        console.log('Connection closed.');
    } catch (err) {
        console.error('❌ Connection failed:', err.message);
        if (err.cause) console.error('Cause:', err.cause);
        console.log('\n💡 Troubleshooting tips:');
        console.log('1. Check if your IP is whitelisted in MongoDB Atlas.');
        console.log('2. Check your internet connection.');
        console.log('3. Verify username and password.');
    }
}
run();
