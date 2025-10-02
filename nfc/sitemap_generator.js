// sitemap_generator.js
require('dotenv').config();
const { MongoClient } = require('mongodb');
const fs = require('fs');
const path = require('path');

// --- إعدادات ---
// تأكد من أن هذا الرابط هو الرابط الصحيح لموقعك
const SITE_URL = 'https://www.mcprim.com/nfc'; 
const MONGO_URI = process.env.MONGO_URI;
const DB_NAME = 'nfc_db';
const COLLECTION_NAME = 'designs';
const OUTPUT_PATH = path.join(__dirname, 'public', 'sitemap.xml');

/**
 * دالة لتوليد محتوى ملف sitemap.xml
 * @param {Array<string>} ids - مصفوفة تحتوي على معرفات البطاقات
 * @returns {string} - محتوى XML لخريطة الموقع
 */
function generateSitemapXml(ids) {
    let xml = `<?xml version="1.0" encoding="UTF-8"?>\n`;
    xml += `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n`;

    // 1. إضافة الصفحة الرئيسية
    xml += `  <url>\n`;
    xml += `    <loc>${SITE_URL}/</loc>\n`;
    xml += `    <lastmod>${new Date().toISOString().split('T')[0]}</lastmod>\n`;
    xml += `    <priority>1.00</priority>\n`;
    xml += `  </url>\n`;
    
    // 2. إضافة صفحات البطاقات
    ids.forEach(id => {
        xml += `  <url>\n`;
        xml += `    <loc>${SITE_URL}/card/${id}</loc>\n`;
        // يمكنك إضافة تاريخ آخر تعديل للبطاقة هنا إذا كان متوفراً
        // <lastmod>YYYY-MM-DD</lastmod>
        xml += `    <priority>0.80</priority>\n`;
        xml += `  </url>\n`;
    });

    xml += `</urlset>`;
    return xml;
}

/**
 * الدالة الرئيسية لتشغيل السكربت
 */
async function main() {
    let client;
    try {
        console.log('Connecting to MongoDB...');
        client = await MongoClient.connect(MONGO_URI);
        const db = client.db(DB_NAME);
        const collection = db.collection(COLLECTION_NAME);

        console.log('Fetching card IDs from the database...');
        // جلب فقط حقل shortId لتخفيف الحمل على قاعدة البيانات
        const designs = await collection.find({}, { projection: { shortId: 1, _id: 0 } }).toArray();
        const ids = designs.map(d => d.shortId).filter(id => id); // فلترة أي قيم فارغة

        if (ids.length === 0) {
            console.warn('No card IDs found. Sitemap will only contain the homepage.');
        } else {
            console.log(`Found ${ids.length} card IDs.`);
        }

        console.log('Generating sitemap.xml content...');
        const sitemapContent = generateSitemapXml(ids);

        console.log(`Writing sitemap to: ${OUTPUT_PATH}`);
        fs.writeFileSync(OUTPUT_PATH, sitemapContent, 'utf8');

        console.log('✅ Sitemap generated successfully!');

    } catch (error) {
        console.error('❌ An error occurred while generating the sitemap:', error);
    } finally {
        if (client) {
            await client.close();
            console.log('MongoDB connection closed.');
        }
    }
}

// تشغيل السكربت
main();
