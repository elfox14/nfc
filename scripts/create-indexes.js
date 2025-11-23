// scripts/create-indexes.js
/**
 * Database Indexes Creation Script
 * يقوم بإنشاء indexes لتحسين أداء قاعدة البيانات
 * 
 * الاستخدام:
 * node scripts/create-indexes.js
 */

require('dotenv').config();
const { MongoClient } = require('mongodb');

async function createIndexes() {
    console.log('🔧 Starting database indexes creation...\n');

    let client;
    try {
        // الاتصال بـ MongoDB
        const mongoUrl = process.env.MONGO_URI;
        if (!mongoUrl) {
            throw new Error('MONGO_URI is not defined in .env file');
        }

        client = await MongoClient.connect(mongoUrl);
        const dbName = process.env.MONGO_DB || 'nfc_db';
        const db = client.db(dbName);

        console.log(`✅ Connected to database: ${dbName}\n`);

        // --- Users Collection Indexes ---
        console.log('📋 Creating indexes for "users" collection...');
        const usersCollection = db.collection('users');

        await usersCollection.createIndex(
            { username: 1 },
            { unique: true, name: 'username_unique' }
        );
        console.log('  ✓ Created unique index on "username"');

        await usersCollection.createIndex(
            { email: 1 },
            { unique: true, name: 'email_unique' }
        );
        console.log('  ✓ Created unique index on "email"');

        await usersCollection.createIndex(
            { createdAt: -1 },
            { name: 'createdAt_desc' }
        );
        console.log('  ✓ Created index on "createdAt"');

        await usersCollection.createIndex(
            { role: 1 },
            { name: 'role_asc' }
        );
        console.log('  ✓ Created index on "role"');

        // --- Designs Collection Indexes ---
        console.log('\n📋 Creating indexes for "designs" collection...');
        const designsCollection = db.collection('designs');

        await designsCollection.createIndex(
            { shortId: 1 },
            { unique: true, name: 'shortId_unique' }
        );
        console.log('  ✓ Created unique index on "shortId"');

        await designsCollection.createIndex(
            { userId: 1 },
            { name: 'userId_asc' }
        );
        console.log('  ✓ Created index on "userId"');

        await designsCollection.createIndex(
            { createdAt: -1 },
            { name: 'createdAt_desc' }
        );
        console.log('  ✓ Created index on "createdAt" (descending)');

        await designsCollection.createIndex(
            { views: -1 },
            { name: 'views_desc' }
        );
        console.log('  ✓ Created index on "views" (descending)');

        // Compound index للبحث والفلترة
        await designsCollection.createIndex(
            { userId: 1, createdAt: -1 },
            { name: 'userId_createdAt' }
        );
        console.log('  ✓ Created compound index on "userId + createdAt"');

        // Text index للبحث في الاسم والمسمى الوظيفي
        await designsCollection.createIndex(
            {
                'data.inputs.input-name': 'text',
                'data.inputs.input-tagline': 'text'
            },
            { name: 'text_search', default_language: 'arabic' }
        );
        console.log('  ✓ Created text index for search (Arabic)');

        // --- Backgrounds Collection Indexes ---
        console.log('\n📋 Creating indexes for "backgrounds" collection...');
        const backgroundsCollection = db.collection('backgrounds');

        await backgroundsCollection.createIndex(
            { shortId: 1 },
            { unique: true, name: 'shortId_unique' }
        );
        console.log('  ✓ Created unique index on "shortId"');

        await backgroundsCollection.createIndex(
            { category: 1 },
            { name: 'category_asc' }
        );
        console.log('  ✓ Created index on "category"');

        await backgroundsCollection.createIndex(
            { createdAt: -1 },
            { name: 'createdAt_desc' }
        );
        console.log('  ✓ Created index on "createdAt"');

        // Compound index للفلترة
        await backgroundsCollection.createIndex(
            { category: 1, createdAt: -1 },
            { name: 'category_createdAt' }
        );
        console.log('  ✓ Created compound index on "category + createdAt"');

        // --- عرض جميع الـ Indexes ---
        console.log('\n📊 Summary of all indexes:');

        console.log('\nUsers collection:');
        const usersIndexes = await usersCollection.indexes();
        usersIndexes.forEach(idx => {
            console.log(`  - ${idx.name}: ${JSON.stringify(idx.key)}`);
        });

        console.log('\nDesigns collection:');
        const designsIndexes = await designsCollection.indexes();
        designsIndexes.forEach(idx => {
            console.log(`  - ${idx.name}: ${JSON.stringify(idx.key)}`);
        });

        console.log('\nBackgrounds collection:');
        const backgroundsIndexes = await backgroundsCollection.indexes();
        backgroundsIndexes.forEach(idx => {
            console.log(`  - ${idx.name}: ${JSON.stringify(idx.key)}`);
        });

        console.log('\n✅ All indexes created successfully!');
        console.log('🚀 Database is optimized and ready for production.\n');

    } catch (error) {
        console.error('\n❌ Error creating indexes:', error.message);
        console.error(error.stack);
        process.exit(1);
    } finally {
        if (client) {
            await client.close();
            console.log('🔌 Database connection closed.');
        }
    }
}

// تشغيل Script
if (require.main === module) {
    createIndexes();
}

module.exports = createIndexes;
