// sitemap_generator.js
require('dotenv').config();
const { MongoClient } = require('mongodb');
const fs = require('fs');
const path = require('path');

// --- إعدادات ---
const SITE_URL = 'https://www.mcprim.com/nfc'; 
const MONGO_URI = process.env.MONGO_URI;
const DB_NAME = process.env.MONGO_DB || 'nfc_db';
const COLLECTION_NAME = process.env.MONGO_DESIGNS_COLL || 'designs';
const OUTPUT_PATH = path.join(__dirname, 'public', 'sitemap.xml');

// قائمة بالصفحات الثابتة في الموقع مع إعداداتها
const STATIC_PAGES = [
    { loc: '/', priority: '1.00', changefreq: 'weekly' },
    { loc: '/gallery.html', priority: '0.90', changefreq: 'daily' },
    { loc: '/about.html', priority: '0.70', changefreq: 'yearly' },
    { loc: '/contact.html', priority: '0.70', changefreq: 'yearly' },
    { loc: '/privacy.html', priority: '0.50', changefreq: 'yearly' },
    { loc: '/blog.html', priority: '0.80', changefreq: 'weekly' }
    // أضف أي صفحات ثابتة أخرى هنا
];


/**
 * دالة لتوليد محتوى ملف sitemap.xml
 * @param {Array<string>} ids - مصفوفة تحتوي على معرفات البطاقات
 * @returns {string} - محتوى XML لخريطة الموقع
 */
function generateSitemapXml(ids) {
    const today = new Date().toISOString().split('T')[0];
    let xml = `<?xml version="1.0" encoding="UTF-8"?>\n`;
    xml += `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n`;

    // 1. إضافة الصفحات الثابتة من المصفوفة
    STATIC_PAGES.forEach(page => {
        xml += `  <url>\n`;
        xml += `    <loc>${SITE_URL}${page.loc}</loc>\n`;
        xml += `    <lastmod>${today}</lastmod>\n`;
        xml += `    <changefreq>${page.changefreq}</changefreq>\n`;
        xml += `    <priority>${page.priority}</priority>\n`;
        xml += `  </url>\n`;
    });
    
    // 2. إضافة صفحات البطاقات الديناميكية
    ids.forEach(id => {
        xml += `  <url>\n`;
        xml += `    <loc>${SITE_URL}/card/${id}</loc>\n`;
        // يمكنك إضافة تاريخ آخر تعديل للبطاقة هنا إذا كان متوفراً
        // <lastmod>YYYY-MM-DD</lastmod>
        xml += `    <priority>0.80</priority>\n`;
        xml += `    <changefreq>monthly</changefreq>\n`;
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
            console.warn('No card IDs found. Sitemap will only contain static pages.');
        } else {
            console.log(`Found ${ids.length} card IDs to add to the sitemap.`);
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