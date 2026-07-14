const express = require('express');
const path = require('path');

const PLATFORMS = {
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

function isSafeViewerId(id) {
  return typeof id === 'string' && /^[a-zA-Z0-9_-]{4,30}$/.test(id);
}

function socialUrl(platformKey, rawValue) {
  const platform = PLATFORMS[platformKey];
  if (!platform) return null;

  if (platformKey === 'email') return `${platform.prefix}${rawValue}`;
  if (platformKey === 'whatsapp') return `${platform.prefix}${rawValue.replace(/\D/g, '')}`;
  return /^(https?:\/\/)/i.test(rawValue) ? rawValue : `${platform.prefix}${rawValue}`;
}

function displaySocialValue(rawValue) {
  return rawValue.replace(/^(https?:\/\/)?(www\.)?/, '');
}

function contactLinkHtml({ icon, href, copyValue, label, target = true, copyLabel = 'نسخ الرابط' }) {
  const targetAttrs = target ? ' target="_blank" rel="noopener noreferrer"' : '';
  return `
                <div class="contact-link-wrapper" data-copy-value="${copyValue}">
                    <a href="${href}" class="contact-link"${targetAttrs}>
                        <i class="${icon}"></i>
                        <span>${label}</span>
                    </a>
                    <button class="copy-link-btn" aria-label="${copyLabel}">
                        <i class="fas fa-copy"></i>
                    </button>
                </div>
            `;
}

function buildContactLinksHtml(dynamicData = {}, DOMPurify) {
  const linksHTML = [];
  const staticSocial = dynamicData.staticSocial || {};

  Object.entries(staticSocial).forEach(([key, linkData]) => {
    if (linkData && linkData.value && PLATFORMS[key]) {
      const value = DOMPurify.sanitize(linkData.value);
      const fullUrl = socialUrl(key, value);
      const displayValue = key === 'email' || key === 'whatsapp' ? value : displaySocialValue(value);

      linksHTML.push(contactLinkHtml({
        icon: PLATFORMS[key].icon,
        href: encodeURI(fullUrl),
        copyValue: encodeURI(fullUrl),
        label: displayValue
      }));
    }
  });

  if (dynamicData.phones) {
    dynamicData.phones.forEach(phone => {
      if (phone && phone.value) {
        const sanitizedValue = DOMPurify.sanitize(phone.value);
        const cleanNumber = sanitizedValue.replace(/\D/g, '');
        linksHTML.push(contactLinkHtml({
          icon: 'fas fa-phone',
          href: `tel:${cleanNumber}`,
          copyValue: cleanNumber,
          label: sanitizedValue,
          target: false,
          copyLabel: 'نسخ الرقم'
        }));
      }
    });
  }

  if (dynamicData.social) {
    dynamicData.social.forEach(link => {
      if (link && link.value && link.platform && PLATFORMS[link.platform]) {
        const value = DOMPurify.sanitize(link.value);
        const fullUrl = socialUrl(link.platform, value);
        linksHTML.push(contactLinkHtml({
          icon: PLATFORMS[link.platform].icon,
          href: encodeURI(fullUrl),
          copyValue: encodeURI(fullUrl),
          label: displaySocialValue(value)
        }));
      }
    });
  }

  if (linksHTML.length > 0) {
    return `<div class="links-group">${linksHTML.join('')}</div>`;
  }

  return `
          <div class="no-links-message">
              <i class="fas fa-info-circle"></i>
              <p>لم يقم صاحب البطاقة بإضافة أي معلومات اتصال إضافية.</p>
          </div>
      `;
}

module.exports = function createViewerRouter({
  getDb,
  designsCollectionName,
  rootDir,
  absoluteBaseUrl,
  DOMPurify
}) {
  const router = express.Router();

  router.get(['/nfc/viewer', '/nfc/viewer.html'], async (req, res) => {
    try {
      const db = getDb();
      if (!db) {
        res.setHeader('X-Robots-Tag', 'noindex, noarchive');
        return res.status(500).send('DB not connected');
      }

      const id = String(req.query.id);
      if (!id || id === 'undefined') {
        res.setHeader('X-Robots-Tag', 'noindex, noarchive');
        return res.status(400).send('Card ID is missing. Please provide an ?id= parameter.');
      }

      if (!isSafeViewerId(id)) {
        res.setHeader('X-Robots-Tag', 'noindex, noarchive');
        return res.status(400).send('Invalid card ID format.');
      }

      const doc = await db.collection(designsCollectionName).findOne({ shortId: id });
      if (!doc || !doc.data) {
        res.setHeader('X-Robots-Tag', 'noindex, noarchive');
        return res.status(404).send('Design not found or data is missing');
      }

      db.collection(designsCollectionName).updateOne(
        { shortId: id },
        { $inc: { views: 1 } }
      ).catch(err => console.error(`Failed to increment view count for ${id}:`, err));

      res.setHeader('X-Robots-Tag', 'index, follow');

      const base = absoluteBaseUrl(req);
      const pageUrl = `${base}/nfc/viewer.html?id=${id}`;
      const inputs = doc.data.inputs || {};
      const name = DOMPurify.sanitize(inputs['input-name'] || 'بطاقة عمل رقمية');
      const tagline = DOMPurify.sanitize(inputs['input-tagline'] || '');
      const dynamicData = doc.data.dynamic || {};
      const imageUrls = doc.data.imageUrls || {};

      let ogImage = `${base}/nfc/og-image.png`;
      if (imageUrls.front) {
        ogImage = imageUrls.front.startsWith('http')
          ? imageUrls.front
          : `${base}${imageUrls.front.startsWith('/') ? '' : '/'}${imageUrls.front}`;
      }

      const keywords = [
        'NFC', 'بطاقة عمل ذكية', 'كارت شخصي',
        name,
        ...(tagline ? tagline.split(/\s+/).filter(Boolean) : [])
      ].filter(Boolean).join(', ');

      res.render(path.join(rootDir, 'viewer.ejs'), {
        pageUrl,
        name,
        tagline,
        ogImage,
        keywords,
        design: doc.data,
        canonical: pageUrl,
        contactLinksHtml: buildContactLinksHtml(dynamicData, DOMPurify)
      });
    } catch (e) {
      console.error('Error in /nfc/viewer route:', e);
      res.setHeader('X-Robots-Tag', 'noindex, noarchive');
      res.status(500).send('View failed due to an internal server error.');
    }
  });

  router.get('/nfc/view/:id', async (req, res) => {
    try {
      const id = String(req.params.id);
      if (!id) {
        return res.status(404).send('Not found');
      }
      res.redirect(301, `/nfc/viewer.html?id=${id}`);
    } catch (e) {
      console.error('Error in /nfc/view/:id redirect route:', e);
      res.status(500).send('Redirect failed.');
    }
  });

  return router;
};

module.exports._private = {
  buildContactLinksHtml,
  displaySocialValue,
  isSafeViewerId,
  socialUrl
};
