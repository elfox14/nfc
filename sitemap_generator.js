// sitemap_generator.js
require('dotenv').config();
const { MongoClient } = require('mongodb');
const fs = require('fs');
const path = require('path');

// --- إعدادات ---
// يجب أن يكون هذا هو النطاق الفعلي للموقع
const SITE_BASE_URL = 'https://www.mcprim.com/nfc'; 
const MONGO_URI = process.env.MONGO_URI;
const DB_NAME = process.env.MONGO_DB || 'nfc_db';
const COLLECTION_NAME = process.env.MONGO_DESIGNS_COLL || 'designs';

// مسار حفظ الملف (يفترض أن الملف يتم تشغيله في الجذر ويتم الحفظ في المجلد الحالي الذي يخدمه السيرفر)
const OUTPUT_PATH = path.join(__dirname, 'sitemap.xml');

// قائمة بالصفحات الثابتة في الموقع
const STATIC_PAGES = [
    { loc: '/index.html', priority: '1.0', changefreq: 'weekly' },
    { loc: '/editor.html', priority: '0.9', changefreq: 'monthly' },
    { loc: '/gallery.html', priority: '0.8', changefreq: 'daily' },
    { loc: '/blog.html', priority: '0.8', changefreq: 'weekly' },
    { loc: '/about.html', priority: '0.6', changefreq: 'yearly' },
    { loc: '/contact.html', priority: '0.6', changefreq: 'yearly' },
    { loc: '/privacy.html', priority: '0.5', changefreq: 'yearly' },
    // مقالات المدونة الهامة أو صفحات الهبوط
    { loc: '/nfc-for-freelancers.html', priority: '0.7', changefreq: 'monthly' },
    { loc: '/nfc-for-companies-egypt.html', priority: '0.7', changefreq: 'monthly' },
    { loc: '/nfc-for-companies-saudi.html', priority: '0.7', changefreq: 'monthly' },
    { loc: '/nfc-for-companies-uae.html', priority: '0.7', changefreq: 'monthly' }
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
        xml += `    <loc>${SITE_BASE_URL}${page.loc}</loc>\n`;
        xml += `    <lastmod>${today}</lastmod>\n`;
        xml += `    <changefreq>${page.changefreq}</changefreq>\n`;
        xml += `    <priority>${page.priority}</priority>\n`;
        xml += `  </url>\n`;
    });
    
    // 2. إضافة صفحات البطاقات الديناميكية
    // نستخدم viewer.html?id=ID لأنه الطريقة التي يعمل بها السيرفر حالياً
    ids.forEach(id => {
        xml += `  <url>\n`;
        xml += `    <loc>${SITE_BASE_URL}/viewer.html?id=${id}</loc>\n`;
        xml += `    <priority>0.6</priority>\n`;
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
        // جلب أحدث 5000 تصميم فقط لتجنب ملفات ضخمة جداً في البداية
        const designs = await collection.find({}, { projection: { shortId: 1, _id: 0 } })
                                      .sort({ createdAt: -1 })
                                      .limit(5000)
                                      .toArray();
        
        const ids = designs.map(d => d.shortId).filter(id => id);

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