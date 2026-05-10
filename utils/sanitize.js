// utils/sanitize.js - Shared sanitization utilities
// Used by both server.js (viewer route) and designs.routes.js (save-design route)

const { JSDOM } = require('jsdom');
const DOMPurifyFactory = require('dompurify');

const window = (new JSDOM('')).window;
const DOMPurify = DOMPurifyFactory(window);

const FIELDS_TO_SANITIZE = [
  'input-name', 'input-name_ar', 'input-name_en',
  'input-tagline', 'input-tagline_ar', 'input-tagline_en',
  'input-bio', 'input-bio_ar', 'input-bio_en',
  'input-availability',
  'input-email', 'input-website',
  'input-whatsapp', 'input-facebook', 'input-linkedin'
];

function sanitizeInputs(inputs) {
  if (!inputs) return {};
  const sanitized = { ...inputs };
  FIELDS_TO_SANITIZE.forEach(k => {
    if (sanitized[k]) {
      sanitized[k] = DOMPurify.sanitize(String(sanitized[k]));
    }
  });
  if (sanitized.dynamic && sanitized.dynamic.social) {
    sanitized.dynamic.social = sanitized.dynamic.social.map(link => ({
      ...link,
      value: link && link.value ? DOMPurify.sanitize(String(link.value)) : ''
    }));
  }
  if (sanitized.dynamic && sanitized.dynamic.phones) {
    sanitized.dynamic.phones = sanitized.dynamic.phones.map(phone => ({
      ...phone,
      value: phone && phone.value ? DOMPurify.sanitize(String(phone.value)) : ''
    }));
  }
  // Sanitize CSS style inputs to prevent CSS injection (UI redressing)
  for (const key in sanitized) {
    if (!FIELDS_TO_SANITIZE.includes(key) && typeof sanitized[key] === 'string') {
      // Basic CSS injection mitigation: remove braces, and limit semicolons if it's a color/size
      if (key.includes('color') || key.includes('size') || key.includes('opacity') || key.includes('bg')) {
        sanitized[key] = sanitized[key].replace(/[;{}]/g, '').trim();
      }
    }
  }

  return sanitized;
}

module.exports = {
  DOMPurify,
  sanitizeInputs
};
