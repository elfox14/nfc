const express = require('express');
const path = require('path');
const { selectPublishedDesignData } = require('../utils/published-design');
const { sanitizeDesignState, sanitizeText, sanitizeUrl } = require('../utils/sanitize');
const { serializeForInlineScript } = require('../utils/inline-script');

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

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function escapeVCardValue(value) {
  return sanitizeText(value)
    .replace(/\\/g, '\\\\')
    .replace(/\r\n|\r|\n/g, '\\n')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,');
}

function buildVCard(inputs = {}, dynamicData = {}) {
  const lines = [
    'BEGIN:VCARD',
    'VERSION:3.0',
    `FN:${escapeVCardValue(inputs['input-name'] || '')}`,
    `TITLE:${escapeVCardValue(inputs['input-tagline'] || '')}`
  ];

  for (const phone of dynamicData.phones || []) {
    if (phone?.value) lines.push(`TEL;TYPE=CELL:${escapeVCardValue(phone.value)}`);
  }

  const email = dynamicData.staticSocial?.email?.value;
  if (email) lines.push(`EMAIL:${escapeVCardValue(email)}`);

  const website = dynamicData.staticSocial?.website?.value;
  if (website) lines.push(`URL:${escapeVCardValue(website)}`);

  lines.push('END:VCARD');
  return lines.join('\r\n');
}

function buildViewerCsp(nonce) {
  return [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}'`,
    "style-src 'self' 'unsafe-inline' https://cdnjs.cloudflare.com https://fonts.googleapis.com",
    "font-src 'self' https://fonts.gstatic.com https://cdnjs.cloudflare.com",
    "img-src 'self' data: https:",
    "connect-src 'self' https:",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'"
  ].join('; ');
}

function safeContactUrl(platformKey, rawValue) {
  if (platformKey === 'email') {
    const email = sanitizeText(rawValue, 254).trim();
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? `mailto:${email}` : null;
  }
  if (platformKey === 'whatsapp') {
    const number = String(rawValue || '').replace(/\D/g, '').slice(0, 20);
    return number ? `https://wa.me/${number}` : null;
  }
  const fullUrl = socialUrl(platformKey, sanitizeText(rawValue));
  return fullUrl ? sanitizeUrl(fullUrl, { allowRelative: false, allowDataImage: false }) : null;
}

function contactLinkHtml({ icon, href, copyValue, label, target = true, copyLabel = 'نسخ الرابط' }) {
  const targetAttrs = target ? ' target="_blank" rel="noopener noreferrer"' : '';
  return `
                <div class="contact-link-wrapper" data-copy-value="${escapeHtml(copyValue)}">
                    <a href="${escapeHtml(href)}" class="contact-link"${targetAttrs}>
                        <i class="${icon}"></i>
                        <span>${escapeHtml(label)}</span>
                    </a>
                    <button class="copy-link-btn" aria-label="${escapeHtml(copyLabel)}">
                        <i class="fas fa-copy"></i>
                    </button>
                </div>
            `;
}

function buildContactLinksHtml(dynamicData = {}) {
  const linksHTML = [];
  const staticSocial = dynamicData.staticSocial || {};

  Object.entries(staticSocial).forEach(([key, linkData]) => {
    if (linkData && linkData.value && PLATFORMS[key]) {
      const value = sanitizeText(linkData.value);
      const fullUrl = safeContactUrl(key, value);
      if (!fullUrl) return;
      const displayValue = key === 'email' || key === 'whatsapp' ? value : displaySocialValue(value);

      linksHTML.push(contactLinkHtml({
        icon: PLATFORMS[key].icon,
        href: fullUrl,
        copyValue: fullUrl,
        label: displayValue
      }));
    }
  });

  if (dynamicData.phones) {
    dynamicData.phones.forEach(phone => {
      if (phone && phone.value) {
        const sanitizedValue = sanitizeText(phone.value, 100);
        const cleanNumber = String(phone.value).replace(/\D/g, '').slice(0, 20);
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
        const value = sanitizeText(link.value);
        const fullUrl = safeContactUrl(link.platform, value);
        if (!fullUrl) return;
        linksHTML.push(contactLinkHtml({
          icon: PLATFORMS[link.platform].icon,
          href: fullUrl,
          copyValue: fullUrl,
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
      const publishedRevision = selectPublishedDesignData(doc?.data);
      if (!doc || !publishedRevision) {
        res.setHeader('X-Robots-Tag', 'noindex, noarchive');
        return res.status(404).send('Design not found or data is missing');
      }
      const publishedDesign = sanitizeDesignState(publishedRevision);

      db.collection(designsCollectionName).updateOne(
        { shortId: id },
        { $inc: { views: 1 } }
      ).catch(err => console.error(`Failed to increment view count for ${id}:`, err));

      res.setHeader('X-Robots-Tag', 'index, follow');

      const base = absoluteBaseUrl(req);
      const pageUrl = `${base}/nfc/viewer.html?id=${id}`;
      const inputs = publishedDesign.inputs || {};
      const name = sanitizeText(inputs['input-name'] || 'بطاقة عمل رقمية');
      const tagline = sanitizeText(inputs['input-tagline'] || '');
      const dynamicData = publishedDesign.dynamic || {};
      const imageUrls = publishedDesign.imageUrls || {};
      const cspNonce = res.locals.cspNonce;

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

      // The public viewer has one server-rendered inline script. Give it a
      // route-specific nonce and serialize all card data as JavaScript data,
      // never as executable template source.
      res.setHeader('Content-Security-Policy', buildViewerCsp(cspNonce));

      res.render(path.join(rootDir, 'viewer.ejs'), {
        pageUrl,
        name,
        tagline,
        ogImage,
        keywords,
        design: publishedDesign,
        canonical: pageUrl,
        contactLinksHtml: buildContactLinksHtml(dynamicData),
        cspNonce,
        vcardJson: serializeForInlineScript(buildVCard(inputs, dynamicData)),
        viewerScriptDataJson: serializeForInlineScript({ name, tagline })
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
  buildVCard,
  buildViewerCsp,
  buildContactLinksHtml,
  displaySocialValue,
  escapeVCardValue,
  isSafeViewerId,
  selectPublishedDesignData,
  serializeForInlineScript,
  socialUrl
};
