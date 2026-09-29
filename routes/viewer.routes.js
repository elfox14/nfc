const express = require('express');
const path = require('path');
const rateLimit = require('express-rate-limit');
const { selectPublishedDesignData } = require('../utils/published-design');
const { sanitizeDesignState, sanitizeText, sanitizeUrl } = require('../utils/sanitize');

const leadLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: process.env.NODE_ENV === 'test' ? 100 : 15,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests, please try again later.' }
});

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
  return typeof id === 'string' && /^[\p{L}\p{N}_-]{4,30}$/u.test(id);
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
      linksHTML.push(contactLinkHtml({ icon: PLATFORMS[key].icon, href: fullUrl, copyValue: fullUrl, label: displayValue }));
    }
  });

  if (dynamicData.phones) {
    dynamicData.phones.forEach(phone => {
      if (phone && phone.value) {
        const sanitizedValue = sanitizeText(phone.value, 100);
        const cleanNumber = String(phone.value).replace(/\D/g, '').slice(0, 20);
        linksHTML.push(contactLinkHtml({ icon: 'fas fa-phone', href: `tel:${cleanNumber}`, copyValue: cleanNumber, label: sanitizedValue, target: false, copyLabel: 'نسخ الرقم' }));
      }
    });
  }

  if (dynamicData.social) {
    dynamicData.social.forEach(link => {
      if (link && link.value && link.platform && PLATFORMS[link.platform]) {
        const value = sanitizeText(link.value);
        const fullUrl = safeContactUrl(link.platform, value);
        if (!fullUrl) return;
        linksHTML.push(contactLinkHtml({ icon: PLATFORMS[link.platform].icon, href: fullUrl, copyValue: fullUrl, label: displaySocialValue(value) }));
      }
    });
  }

  if (dynamicData.links) {
    dynamicData.links.forEach(link => {
      if (link && link.url) {
        const sanitizedUrl = sanitizeUrl(link.url, { allowRelative: false, allowDataImage: false });
        if (sanitizedUrl) {
          const title = sanitizeText(link.title || link.url);
          linksHTML.push(contactLinkHtml({
            icon: 'fas fa-link',
            href: sanitizedUrl,
            copyValue: sanitizedUrl,
            label: title
          }));
        }
      }
    });
  }

  if (linksHTML.length > 0) return `<div class="links-group">${linksHTML.join('')}</div>`;
  return `
          <div class="no-links-message">
              <i class="fas fa-info-circle"></i>
              <p>لم يقم صاحب البطاقة بإضافة أي معلومات اتصال إضافية.</p>
          </div>
      `;
}

function injectCspNonceIntoRenderedHtml(html, nonce) {
  if (!nonce) return html;
  return html.replace(/<script(?![^>]*\bnonce\s*=)/gi, `<script nonce="${nonce}"`);
}

module.exports = function createViewerRouter({ getDb, designsCollectionName, rootDir, absoluteBaseUrl }) {
  const router = express.Router();

  const handleViewerRender = async (req, res, idOrSlug) => {
    try {
      const db = getDb();
      if (!db) {
        res.setHeader('X-Robots-Tag', 'noindex, noarchive');
        return res.status(500).send('DB not connected');
      }

      const id = String(idOrSlug || '').trim();
      if (!id || id === 'undefined') {
        res.setHeader('X-Robots-Tag', 'noindex, noarchive');
        return res.status(400).send('Card ID is missing. Please provide an ?id= parameter.');
      }
      if (!isSafeViewerId(id)) {
        res.setHeader('X-Robots-Tag', 'noindex, noarchive');
        return res.status(400).send('Invalid card ID format.');
      }

      let doc = await db.collection(designsCollectionName).findOne({ shortId: id });
      if (!doc) {
        doc = await db.collection(designsCollectionName).findOne({ slug: id });
      }

      const publishedRevision = selectPublishedDesignData(doc?.data);
      if (!doc || !publishedRevision) {
        res.setHeader('X-Robots-Tag', 'noindex, noarchive');
        return res.status(404).send('Design not found or data is missing');
      }
      const publishedDesign = sanitizeDesignState(publishedRevision);

      db.collection(designsCollectionName).updateOne({ _id: doc._id }, { $inc: { views: 1 } }).catch(err => console.error(`Failed to increment view count:`, err));

      res.setHeader('X-Robots-Tag', 'index, follow');
      const base = absoluteBaseUrl(req);
      const docSlug = doc.slug || doc.shortId;
      const canonical = `${base}/nfc/c/${encodeURIComponent(docSlug)}`;
      const pageUrl = req.originalUrl.startsWith('/nfc/c/') ? `${base}${req.originalUrl}` : `${base}/nfc/viewer.html?id=${encodeURIComponent(id)}`;

      const inputs = publishedDesign.inputs || {};
      const name = sanitizeText(inputs['input-name_ar'] || inputs['input-name_en'] || inputs['input-name'] || 'بطاقة عمل رقمية');
      const tagline = sanitizeText(inputs['input-tagline_ar'] || inputs['input-tagline_en'] || inputs['input-tagline'] || '');
      const company = sanitizeText(inputs['input-company_ar'] || inputs['input-company_en'] || inputs['input-company'] || '');
      const bio = sanitizeText(inputs['input-bio_ar'] || inputs['input-bio_en'] || inputs['input-bio'] || '');
      const dynamicData = publishedDesign.dynamic || {};
      const imageUrls = publishedDesign.imageUrls || {};

      let ogImage = `${base}/nfc/og-image.png`;
      if (imageUrls.front) {
        ogImage = imageUrls.front.startsWith('http') ? imageUrls.front : `${base}${imageUrls.front.startsWith('/') ? '' : '/'}${imageUrls.front}`;
      }

      const keywords = ['NFC', 'بطاقة عمل ذكية', 'كارت شخصي', name, ...(tagline ? tagline.split(/\s+/).filter(Boolean) : [])].filter(Boolean).join(', ');

      const phones = [];
      if (Array.isArray(dynamicData.phones)) {
        dynamicData.phones.forEach(p => {
          if (p && p.value) {
            const clean = sanitizeText(p.value, 50).trim();
            if (clean && !phones.includes(clean)) phones.push(clean);
          }
        });
      }

      const emails = [];
      if (dynamicData.staticSocial?.email?.value) {
        const em = sanitizeText(dynamicData.staticSocial.email.value, 100).trim();
        if (em && !emails.includes(em)) emails.push(em);
      }
      if (Array.isArray(dynamicData.social)) {
        dynamicData.social.forEach(s => {
          if (s?.platform === 'email' && s?.value) {
            const em = sanitizeText(s.value, 100).trim();
            if (em && !emails.includes(em)) emails.push(em);
          }
        });
      }

      const sameAsUrls = [];
      if (dynamicData.staticSocial) {
        Object.entries(dynamicData.staticSocial).forEach(([k, item]) => {
          if (item && item.value && k !== 'email' && k !== 'phone') {
            const url = safeContactUrl(k, sanitizeText(item.value));
            if (url && !sameAsUrls.includes(url)) sameAsUrls.push(url);
          }
        });
      }
      if (Array.isArray(dynamicData.social)) {
        dynamicData.social.forEach(s => {
          if (s && s.value && s.platform && s.platform !== 'email' && s.platform !== 'phone') {
            const url = safeContactUrl(s.platform, sanitizeText(s.value));
            if (url && !sameAsUrls.includes(url)) sameAsUrls.push(url);
          }
        });
      }

      // Check language: detect Arabic or English predominance
      const hasArabicChars = /[\u0600-\u06FF]/.test(name + tagline + bio + company);
      const initialLang = hasArabicChars ? 'ar' : 'en';
      const initialDir = hasArabicChars ? 'rtl' : 'ltr';

      const personEntity = {
        "@type": "Person",
        "@id": `${canonical}#person`,
        "name": name,
        "jobTitle": tagline || undefined,
        "worksFor": company ? { "@type": "Organization", "name": company } : undefined,
        "description": bio || (tagline ? `${name} - ${tagline}` : 'بطاقة عمل رقمية ذكية'),
        "image": ogImage,
        "url": canonical,
        "telephone": phones.length > 0 ? (phones.length === 1 ? phones[0] : phones) : undefined,
        "email": emails.length > 0 ? (emails.length === 1 ? emails[0] : emails) : undefined,
        "sameAs": sameAsUrls.length > 0 ? sameAsUrls : undefined
      };

      if (phones.length > 0 || emails.length > 0) {
        personEntity.contactPoint = {
          "@type": "ContactPoint",
          "telephone": phones[0] || undefined,
          "email": emails[0] || undefined,
          "contactType": "Personal & Business Inquiries"
        };
      }

      const schemaGraph = [
        {
          "@type": "ProfilePage",
          "@id": `${canonical}#profile`,
          "url": canonical,
          "name": `${name}${tagline ? ' - ' + tagline : ''}`,
          "mainEntity": personEntity
        },
        personEntity,
        {
          "@type": "BreadcrumbList",
          "@id": `${canonical}#breadcrumb`,
          "itemListElement": [
            {
              "@type": "ListItem",
              "position": 1,
              "name": initialLang === 'ar' ? 'الرئيسية' : 'Home',
              "item": `${base}/nfc/`
            },
            {
              "@type": "ListItem",
              "position": 2,
              "name": name,
              "item": canonical
            }
          ]
        }
      ];

      const structuredDataJson = JSON.stringify({
        "@context": "https://schema.org",
        "@graph": schemaGraph
      });

      return res.render(path.join(rootDir, 'viewer.ejs'), {
        pageUrl,
        name,
        tagline,
        company,
        bio,
        phones,
        emails,
        sameAsUrls,
        ogImage,
        keywords,
        design: publishedDesign,
        canonical,
        structuredDataJson,
        contactLinksHtml: buildContactLinksHtml(dynamicData),
        initialLang,
        initialDir,
        cardShortId: doc.shortId || id,
        docSlug
      }, (renderError, html) => {
        if (renderError) throw renderError;
        res.type('html').send(injectCspNonceIntoRenderedHtml(html, res.locals.cspNonce));
      });
    } catch (e) {
      console.error('Error in viewer route:', e);
      res.setHeader('X-Robots-Tag', 'noindex, noarchive');
      res.status(500).send('View failed due to an internal server error.');
    }
  };

  router.get(['/nfc/viewer', '/nfc/viewer.html'], async (req, res) => {
    return handleViewerRender(req, res, req.query.id);
  });

  router.get(['/nfc/c/:slug', '/nfc/card/:slug'], async (req, res) => {
    return handleViewerRender(req, res, req.params.slug);
  });

  router.get('/nfc/view/:id', async (req, res) => {
    try {
      const id = String(req.params.id);
      if (!id) return res.status(404).send('Not found');
      res.redirect(301, `/nfc/c/${encodeURIComponent(id)}`);
    } catch (e) {
      console.error('Error in /nfc/view/:id redirect route:', e);
      res.status(500).send('Redirect failed.');
    }
  });

  // Lead Capture API Endpoint for "Exchange Contact" (تبادل جهات الاتصال)
  const handleLeadCapture = async (req, res) => {
    try {
      const db = getDb();
      if (!db) return res.status(503).json({ error: 'Service unavailable' });

      const id = String(req.params.idOrSlug || '').trim();
      if (!isSafeViewerId(id)) return res.status(400).json({ error: 'Invalid card ID' });

      // Verify that the target card actually exists and is published
      let doc = await db.collection(designsCollectionName).findOne({ shortId: id });
      if (!doc) {
        doc = await db.collection(designsCollectionName).findOne({ slug: id });
      }
      const publishedRevision = selectPublishedDesignData(doc?.data);
      if (!doc || !publishedRevision) {
        return res.status(404).json({ error: 'Card not found or inactive' });
      }

      const { name, phone, email, note } = req.body || {};
      const cleanName = sanitizeText(name, 100).trim();
      const cleanPhone = sanitizeText(phone, 30).trim();
      const cleanEmail = sanitizeText(email, 120).trim();
      const cleanNote = sanitizeText(note, 500).trim();

      if (!cleanName && !cleanPhone && !cleanEmail) {
        return res.status(400).json({ error: 'Please provide at least a name and contact info' });
      }

      const leadDoc = {
        cardId: doc.shortId || id,
        visitorName: cleanName,
        visitorPhone: cleanPhone,
        visitorEmail: cleanEmail,
        visitorNote: cleanNote,
        createdAt: new Date(),
        ip: req.ip || req.headers['x-forwarded-for'] || ''
      };

      await db.collection('leads').insertOne(leadDoc).catch(err => console.error('Failed to insert lead:', err));

      return res.json({ success: true, message: 'Lead received successfully' });
    } catch (err) {
      console.error('Error saving lead:', err);
      return res.status(500).json({ error: 'Failed to submit contact information' });
    }
  };

  router.post('/nfc/api/leads/:idOrSlug', leadLimiter, handleLeadCapture);
  router.post('/api/leads/:idOrSlug', leadLimiter, handleLeadCapture);

  return router;
};

module.exports._private = { buildContactLinksHtml, displaySocialValue, isSafeViewerId, selectPublishedDesignData, socialUrl };
