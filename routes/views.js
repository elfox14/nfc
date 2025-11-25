const express = require('express');
const router = express.Router();
const path = require('path');
const { absoluteBaseUrl, DOMPurify } = require('../utils/helpers');

module.exports = function (db, rootDir, designsCollectionName) {

    // --- صفحة عرض SEO الجديدة (صيغة Query) ---
    // *** تم وضع هذا المسار قبل معالج الملفات الثابتة لضمان تنفيذه ***
    router.get(['/nfc/viewer', '/nfc/viewer.html'], async (req, res) => {
        try {
            const db = req.db;
            if (!db) {
                res.setHeader('X-Robots-Tag', 'noindex, noarchive');
                return res.status(500).send('DB not connected');
            }

            // *** التغيير الرئيسي: جلب الـ ID من الـ Query String ***
            const id = String(req.query.id);

            if (!id || id === 'undefined') { // التحقق من عدم وجود ID
                res.setHeader('X-Robots-Tag', 'noindex, noarchive');
                return res.status(400).send('Card ID is missing. Please provide an ?id= parameter.');
            }

            // --- باقي الكود منسوخ من المسار القديم ---
            const doc = await db.collection(designsCollectionName).findOne({ shortId: id });

            if (!doc || !doc.data) { // التحقق من وجود doc.data
                res.setHeader('X-Robots-Tag', 'noindex, noarchive');
                return res.status(404).send('Design not found or data is missing');
            }

            // Increment the view count
            db.collection(designsCollectionName).updateOne(
                { shortId: id },
                { $inc: { views: 1 } }
            ).catch(err => console.error(`Failed to increment view count for ${id}:`, err));

            res.setHeader('X-Robots-Tag', 'index, follow');

            const base = absoluteBaseUrl(req);
            // *** التغيير الرئيسي: تحديث الرابط الأساسي ***
            const pageUrl = `${base}/nfc/viewer.html?id=${id}`;

            // استخدام البيانات بعد التأكد من وجودها
            const inputs = doc.data.inputs || {}; // التأكد من وجود inputs
            const name = DOMPurify.sanitize(inputs['input-name'] || 'بطاقة عمل رقمية'); // استرجاع الاسم
            const tagline = DOMPurify.sanitize(inputs['input-tagline'] || ''); // استرجاع المسمى (يمكن أن يكون فارغاً)

            // كود توليد HTML للروابط (منسوخ بالكامل)
            let contactLinksHtml = '';
            const platforms = {
                whatsapp: { icon: 'fab fa-whatsapp', prefix: 'https://wa.me/' },
                email: { icon: 'fas fa-envelope', prefix: 'mailto:' },
                website: { icon: 'fas fa-globe', prefix: 'https://' },
                facebook: { icon: 'fab fa-facebook-f', prefix: 'https://facebook.com/' },
                linkedin: { icon: 'fab fa-linkedin-in', prefix: 'https://linkedin.com/in/' },
                instagram: { icon: 'fab fa-instagram', prefix: 'https://instagram.com/' },
                x: { icon: 'fab fa-xing', prefix: 'https://x.com/' },
                telegram: { icon: 'fab fa-telegram', prefix: 'https://t.me/' },
                tiktok: { icon: 'fab fa-tiktok', prefix: 'https://tiktok.com/@' },
                snapchat: { icon: 'fab fa-snapchat', prefix: 'https://snapchat.com/add/' },
                youtube: { icon: 'fab fa-youtube', prefix: 'https://youtube.com/' },
                pinterest: { icon: 'fab fa-pinterest', prefix: 'https://pinterest.com/' }
            };

            const linksHTML = [];
            const dynamicData = doc.data.dynamic || {}; // التأكد من وجود dynamic
            const staticSocial = dynamicData.staticSocial || {};

            Object.entries(staticSocial).forEach(([key, linkData]) => {
                if (linkData && linkData.value && platforms[key]) {
                    const platform = platforms[key];
                    const value = DOMPurify.sanitize(linkData.value);
                    let displayValue = value;
                    let fullUrl = value;
                    if (key === 'email') { fullUrl = `${platform.prefix}${value}`; }
                    else if (key === 'whatsapp') { fullUrl = `${platform.prefix}${value.replace(/\D/g, '')}`; }
                    else if (key === 'website') { fullUrl = !/^(https?:\/\/)/i.test(value) ? `${platform.prefix}${value}` : value; displayValue = value.replace(/^(https?:\/\/)?(www\.)?/, ''); }
                    else { fullUrl = !/^(https?:\/\/)/i.test(value) ? `${platform.prefix}${value}` : value; displayValue = value.replace(/^(https?:\/\/)?(www\.)?/, ''); }

                    linksHTML.push(`
                        <div class="contact-link-wrapper" data-copy-value="${encodeURI(fullUrl)}">
                            <a href="${encodeURI(fullUrl)}" class="contact-link" target="_blank" rel="noopener noreferrer">
                                <i class="${platform.icon}"></i>
                                <span>${displayValue}</span>
                            </a>
                            <button class="copy-link-btn" aria-label="نسخ الرابط">
                                <i class="fas fa-copy"></i>
                            </button>
                        </div>
                    `);
                }
            });

            if (dynamicData.phones) {
                dynamicData.phones.forEach(phone => {
                    if (phone && phone.value) {
                        const sanitizedValue = DOMPurify.sanitize(phone.value);
                        const cleanNumber = sanitizedValue.replace(/\D/g, '');
                        const fullUrl = `tel:${cleanNumber}`;
                        linksHTML.push(`
                            <div class="contact-link-wrapper" data-copy-value="${cleanNumber}">
                                <a href="${fullUrl}" class="contact-link">
                                    <i class="fas fa-phone"></i>
                                    <span>${sanitizedValue}</span>
                                </a>
                                <button class="copy-link-btn" aria-label="نسخ الرقم">
                                    <i class="fas fa-copy"></i>
                                </button>
                            </div>
                        `);
                    }
                });
            }

            if (dynamicData.social) {
                dynamicData.social.forEach(link => {
                    if (link && link.value && link.platform && platforms[link.platform]) {
                        const platform = platforms[link.platform];
                        const value = DOMPurify.sanitize(link.value);
                        let displayValue = value;
                        let fullUrl = value;
                        fullUrl = !/^(https?:\/\/)/i.test(value) ? `${platform.prefix}${value}` : value;
                        displayValue = value.replace(/^(https?:\/\/)?(www\.)?/, '');
                        linksHTML.push(`
                            <div class="contact-link-wrapper" data-copy-value="${encodeURI(fullUrl)}">
                                <a href="${encodeURI(fullUrl)}" class="contact-link" target="_blank" rel="noopener noreferrer">
                                    <i class="${platform.icon}"></i>
                                    <span>${displayValue}</span>
                                </a>
                                <button class="copy-link-btn" aria-label="نسخ الرابط">
                                    <i class="fas fa-copy"></i>
                                </button>
                            </div>
                        `);
                    }
                });
            }

            if (linksHTML.length > 0) {
                contactLinksHtml = `<div class="links-group">${linksHTML.join('')}</div>`;
            } else {
                contactLinksHtml = `
                <div class="no-links-message">
                    <i class="fas fa-info-circle"></i>
                    <p>لم يقم صاحب البطاقة بإضافة أي معلومات اتصال إضافية.</p>
                </div>
            `;
            }

            // تحديد الصورة OG مع التحقق من وجود imageUrls
            const imageUrls = doc.data.imageUrls || {};
            let ogImage = `${base}/nfc/og-image.png`; // Default
            if (imageUrls.front) {
                ogImage = imageUrls.front.startsWith('http')
                    ? imageUrls.front
                    : `${base}${imageUrls.front.startsWith('/') ? '' : '/'}${imageUrls.front}`; // التأكد من وجود /
            }

            const keywords = [
                'NFC', 'بطاقة عمل ذكية', 'كارت شخصي',
                name,
                ...(tagline ? tagline.split(/\s+/).filter(Boolean) : []) // Check if tagline exists before splitting
            ].filter(Boolean).join(', ');

            res.render(path.join(rootDir, 'viewer.ejs'), {
                pageUrl,
                name: name, // <-- تمرير name
                tagline: tagline, // <-- تمرير tagline
                ogImage,
                keywords,
                design: doc.data,
                canonical: pageUrl,
                contactLinksHtml: contactLinksHtml // <-- تمرير HTML المٌنشأ
            });
        } catch (e) {
            console.error('Error in /nfc/viewer route:', e);
            res.setHeader('X-Robots-Tag', 'noindex, noarchive');
            res.status(500).send('View failed due to an internal server error.');
        }
    });

    // --- صفحة عرض SEO لكل بطاقة: /nfc/view/:id ---
    // *** تم التعديل: هذا المسار الآن يعيد التوجيه إلى الصيغة الجديدة ?id= ***
    router.get('/nfc/view/:id', async (req, res) => {
        try {
            const id = String(req.params.id);
            if (!id) {
                return res.status(404).send('Not found');
            }
            // إعادة توجيه دائمة (301) إلى الصيغة المفضلة
            res.redirect(301, `/nfc/viewer.html?id=${id}`);
        } catch (e) {
            console.error('Error in /nfc/view/:id redirect route:', e);
            res.status(500).send('Redirect failed.');
        }
    });

    // robots.txt
    router.get('/robots.txt', (req, res) => {
        const base = absoluteBaseUrl(req);
        const txt = [
            'User-agent: *',
            'Allow: /nfc/',
            'Allow: /nfc/viewer.html', // السماح بالمسار الجديد
            'Disallow: /nfc/view/', // حظر المسار القديم
            'Disallow: /nfc/editor',
            'Disallow: /nfc/editor.html',
            'Disallow: /nfc/viewer.ejs', // حظر ملف القالب نفسه
            `Sitemap: ${base}/sitemap.xml`
        ].join('\n');
        res.type('text/plain').send(txt);
    });

    // --- sitemap.xml (ديناميكي) ---
    router.get('/sitemap.xml', async (req, res) => {
        try {
            const base = absoluteBaseUrl(req);
            const staticPages = [
                '/nfc/',
                '/nfc/gallery',
                '/nfc/blog',
                '/nfc/privacy'
            ];
            const blogPosts = [];

            let designUrls = [];
            const db = req.db;
            if (db) {
                const docs = await db.collection(designsCollectionName)
                    .find({})
                    .project({ shortId: 1, createdAt: 1 })
                    .sort({ createdAt: -1 })
                    .limit(5000)
                    .toArray();

                designUrls = docs.map(d => ({
                    loc: `${base}/nfc/viewer.html?id=${d.shortId}`, // *** تحديث الرابط هنا ***
                    lastmod: d.createdAt ? new Date(d.createdAt).toISOString().split('T')[0] : undefined,
                    changefreq: 'monthly',
                    priority: '0.8'
                }));
            }

            function urlTag(loc, { lastmod, changefreq = 'weekly', priority = '0.7' } = {}) {
                if (!loc) return '';
                const lastmodTag = lastmod ? `<lastmod>${lastmod}</lastmod>` : '';
                const changefreqTag = changefreq ? `<changefreq>${changefreq}</changefreq>` : '';
                const priorityTag = priority ? `<priority>${priority}</priority>` : '';
                return `
        <url>
            <loc>${loc}</loc>${lastmodTag}${changefreqTag}${priorityTag}
        </url>`;
            }

            const xml = `<?xml version="1.0" encoding="UTF-8"?>
        <urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
        ${staticPages.map(p => urlTag(`${base}${p}`, { priority: '0.9', changefreq: 'weekly' })).join('')}
        ${blogPosts.map(p => urlTag(`${base}${p}`, { priority: '0.7', changefreq: 'monthly' })).join('')}
        ${designUrls.map(u => urlTag(u.loc, { lastmod: u.lastmod, changefreq: u.changefreq, priority: u.priority })).join('')}
        </urlset>`;

            res.type('application/xml').send(xml);
        } catch (e) {
            console.error('Sitemap generation error:', e);
            res.status(500).send('Sitemap failed');
        }
    });

    return router;
};
