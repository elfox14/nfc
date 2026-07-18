const express = require('express');

const STATIC_PAGES = [
  '/nfc/',
  '/nfc/gallery-en.html',
  '/nfc/gallery.html',
  '/nfc/blog-en.html',
  '/nfc/blog.html',
  '/nfc/privacy-en.html',
  '/nfc/privacy.html',
  '/nfc/terms-en.html',
  '/nfc/terms.html',
  '/nfc/contact-en.html',
  '/nfc/contact.html'
];

const BLOG_POSTS = [
  '/nfc/blog-nfc-at-events-en.html',
  '/nfc/blog-nfc-at-events.html',
  '/nfc/blog-digital-menus-for-restaurants-en.html',
  '/nfc/blog-digital-menus-for-restaurants.html',
  '/nfc/blog-business-card-mistakes-en.html',
  '/nfc/blog-business-card-mistakes.html',
  '/nfc/nfc-for-freelancers-en.html',
  '/nfc/nfc-for-freelancers.html',
  '/nfc/nfc-for-companies-en.html',
  '/nfc/nfc-for-companies.html',
  '/nfc/nfc-for-companies-egypt-en.html',
  '/nfc/nfc-for-companies-egypt.html',
  '/nfc/nfc-for-companies-saudi-en.html',
  '/nfc/nfc-for-companies-saudi.html',
  '/nfc/nfc-for-companies-uae-en.html',
  '/nfc/nfc-for-companies-uae.html'
];

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

module.exports = function createSeoRouter({ getDb, designsCollectionName, absoluteBaseUrl }) {
  const router = express.Router();

  router.get('/robots.txt', (req, res) => {
    const base = absoluteBaseUrl(req);
    const txt = [
      'User-agent: *',
      'Allow: /nfc/',
      'Allow: /nfc/viewer.html',
      'Disallow: /nfc/view/',
      'Disallow: /nfc/editor',
      'Disallow: /nfc/editor.html',
      'Disallow: /nfc/viewer.ejs',
      `Sitemap: ${base}/sitemap.xml`
    ].join('\n');
    res.type('text/plain').send(txt);
  });

  router.get('/sitemap.xml', async (req, res) => {
    try {
      const base = absoluteBaseUrl(req);
      let designUrls = [];
      const db = getDb();

      if (db) {
        const docs = await db.collection(designsCollectionName)
          .find({
            'data.sharedToGallery': true,
            $or: [
              { 'workflow.enabled': { $ne: true } },
              { 'workflow.status': 'published' }
            ]
          })
          .project({ shortId: 1, createdAt: 1, lastModified: 1 })
          .sort({ createdAt: -1 })
          .limit(5000)
          .toArray();
        designUrls = docs.map(d => ({
          loc: `${base}/nfc/viewer.html?id=${d.shortId}`,
          lastmod: (d.lastModified || d.createdAt)
            ? new Date(d.lastModified || d.createdAt).toISOString().split('T')[0]
            : undefined,
          changefreq: 'monthly',
          priority: '0.8'
        }));
      }

      const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${STATIC_PAGES.map(p => urlTag(`${base}${p}`, { priority: '0.9', changefreq: 'weekly' })).join('')}
${BLOG_POSTS.map(p => urlTag(`${base}${p}`, { priority: '0.7', changefreq: 'monthly' })).join('')}
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
