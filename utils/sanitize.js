// Shared, context-aware sanitization for persisted card state.
// Public viewers must still render defensively; this module is the server-side boundary.

const { TextDecoder, TextEncoder } = require('util');

// Jest's jsdom environment does not expose Node's WHATWG encoders globally,
// while the server-side jsdom dependency expects them during module loading.
if (!global.TextEncoder) global.TextEncoder = TextEncoder;
if (!global.TextDecoder) global.TextDecoder = TextDecoder;

const { JSDOM } = require('jsdom');
const DOMPurifyFactory = require('dompurify');

const window = (new JSDOM('')).window;
const DOMPurify = DOMPurifyFactory(window);

const MAX_TEXT_LENGTH = 2048;
const MAX_STATE_ITEMS = 30;
const MAX_DATA_URL_LENGTH = 8 * 1024 * 1024;
const SAFE_KEY = /^[A-Za-z0-9_-]{1,80}$/;
const SAFE_TOKEN = /^[\p{L}\p{N} _.,()+/-]{0,120}$/u;
const SAFE_CSS_VALUE = /^[\p{L}\p{N}\s#(),.%+/'-]{0,160}$/u;
const SAFE_COLOR = /^(?:#[0-9a-f]{3,8}|rgba?\(\s*[\d.%]+\s*,\s*[\d.%]+\s*,\s*[\d.%]+(?:\s*,\s*[\d.]+)?\s*\)|hsla?\(\s*[\d.]+(?:deg)?\s*,\s*[\d.]+%\s*,\s*[\d.]+%(?:\s*,\s*[\d.]+)?\s*\)|transparent)$/i;
const IMAGE_DATA_URL = /^data:image\/(?:png|jpeg|jpg|webp|gif);base64,[a-z0-9+/=\s]+$/i;
const URL_INPUT_KEYS = new Set(['input-logo', 'input-photo-url', 'input-qr-url']);

function isPlainObject(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function sanitizeText(value, maxLength = MAX_TEXT_LENGTH) {
  return DOMPurify.sanitize(String(value ?? ''), {
    ALLOWED_TAGS: [],
    ALLOWED_ATTR: []
  }).split('\u0000').join('').slice(0, maxLength);
}

function sanitizeToken(value, fallback = '') {
  const token = sanitizeText(value, 120).trim();
  return SAFE_TOKEN.test(token) ? token : fallback;
}

function sanitizeCssValue(value, fallback = '') {
  const cssValue = sanitizeText(value, 160).trim();
  return SAFE_CSS_VALUE.test(cssValue) && !/[;{}<>"`\\]/.test(cssValue)
    ? cssValue
    : fallback;
}

function sanitizeColor(value, fallback = '') {
  const color = sanitizeText(value, 80).trim();
  return SAFE_COLOR.test(color) ? color : fallback;
}

function sanitizeNumber(value, min = -5000, max = 5000) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return 0;
  return Math.min(max, Math.max(min, numeric));
}

function sanitizeUrl(value, { allowRelative = true, allowDataImage = true } = {}) {
  if (typeof value !== 'string') return '';
  const candidate = value.trim();
  if (!candidate || candidate.length > MAX_DATA_URL_LENGTH) return '';

  if (allowDataImage && candidate.startsWith('data:')) {
    return IMAGE_DATA_URL.test(candidate) ? candidate.replace(/\s/g, '') : '';
  }
  if (/["'<>`(){};\\]/.test(candidate)) return '';

  try {
    const parsed = new URL(candidate, 'https://local.invalid/');
    const isRelative = parsed.origin === 'https://local.invalid';
    if (isRelative && !allowRelative) return '';
    if (!isRelative && !['http:', 'https:'].includes(parsed.protocol)) return '';
    if (parsed.username || parsed.password) return '';

    if (isRelative) {
      const hasControlCharacter = [...candidate].some(character => character.charCodeAt(0) < 32);
      if (/^(?:\/\/|\\)/.test(candidate) || hasControlCharacter || candidate.split('/').includes('..')) return '';
      return candidate;
    }
    return parsed.href;
  } catch {
    return '';
  }
}

function sanitizeInputValue(key, value) {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'number') return sanitizeNumber(value);
  if (value === null || value === undefined) return '';

  if (URL_INPUT_KEYS.has(key)) return sanitizeUrl(String(value));
  if (/color|(?:^|-)bg-(?:start|end)$/.test(key)) return sanitizeColor(value);
  if (/font$|font-family/.test(key)) return sanitizeCssValue(value);
  if (/size|opacity|radius|padding|spacing|line-height|border-width|filter-/.test(key)) {
    const min = key.includes('opacity') ? 0 : -5000;
    const max = key.includes('opacity') ? 1 : 5000;
    return sanitizeNumber(value, min, max);
  }
  if (/^(?:layout|theme|photo-shape|qr-source|phone-text-layout|.*-style)$/.test(key)) {
    return sanitizeToken(value);
  }
  return sanitizeText(value);
}

function sanitizeInputs(inputs) {
  if (!isPlainObject(inputs)) return {};
  const sanitized = {};
  for (const [key, value] of Object.entries(inputs).slice(0, 250)) {
    if (!SAFE_KEY.test(key)) continue;
    sanitized[key] = sanitizeInputValue(key, value);
  }
  return sanitized;
}

function sanitizePoint(value, { normalized = false } = {}) {
  if (!isPlainObject(value)) return { x: 0, y: 0 };
  const min = normalized ? 0 : -5000;
  const max = normalized ? 1 : 5000;
  return {
    x: sanitizeNumber(value.x, min, max),
    y: sanitizeNumber(value.y, min, max)
  };
}

function sanitizeKeyedObject(value, sanitizer) {
  if (!isPlainObject(value)) return {};
  const result = {};
  for (const [key, item] of Object.entries(value).slice(0, 100)) {
    if (!SAFE_KEY.test(key)) continue;
    result[key] = sanitizer(item, key);
  }
  return result;
}

function sanitizeDynamicItem(item, { social = false } = {}) {
  if (!isPlainObject(item)) return null;
  const result = {
    id: SAFE_KEY.test(String(item.id || '')) ? String(item.id) : undefined,
    value: sanitizeText(item.value, social ? MAX_TEXT_LENGTH : 100),
    placement: item.placement === 'back' ? 'back' : 'front',
    position: sanitizePoint(item.position)
  };
  if (social) {
    result.platform = SAFE_KEY.test(String(item.platform || '')) ? String(item.platform) : '';
    if (item.color !== undefined) result.color = sanitizeColor(item.color);
    if (item.size !== undefined) result.size = sanitizeNumber(item.size, 6, 200);
  }
  if (!result.id) delete result.id;
  return result;
}

function sanitizeDynamic(dynamic) {
  if (!isPlainObject(dynamic)) return {};
  const phones = Array.isArray(dynamic.phones)
    ? dynamic.phones.slice(0, MAX_STATE_ITEMS).map(item => sanitizeDynamicItem(item)).filter(Boolean)
    : [];
  const social = Array.isArray(dynamic.social)
    ? dynamic.social.slice(0, MAX_STATE_ITEMS).map(item => sanitizeDynamicItem(item, { social: true })).filter(Boolean)
    : [];
  const staticSocial = sanitizeKeyedObject(dynamic.staticSocial, item =>
    sanitizeDynamicItem(item, { social: true }) || { value: '', placement: 'back', position: { x: 0, y: 0 } }
  );
  return {
    phones,
    social,
    staticSocial,
    qr: isPlainObject(dynamic.qr) ? { enabled: dynamic.qr.enabled !== false } : undefined
  };
}

function sanitizeDesignState(designState) {
  if (!isPlainObject(designState)) return {};
  const sanitized = {
    currentLanguage: designState.currentLanguage === 'en' ? 'en' : 'ar',
    inputs: sanitizeInputs(designState.inputs),
    dynamic: sanitizeDynamic(designState.dynamic),
    imageUrls: sanitizeKeyedObject(designState.imageUrls, value => sanitizeUrl(value)),
    positions: sanitizeKeyedObject(designState.positions, value => sanitizePoint(value)),
    anchors: sanitizeKeyedObject(designState.anchors, value => sanitizePoint(value, { normalized: true })),
    placements: sanitizeKeyedObject(designState.placements, value => value === 'back' ? 'back' : 'front'),
    visibilities: sanitizeKeyedObject(designState.visibilities, value => value !== false)
  };

  for (const [key, value] of Object.entries(sanitized)) {
    if (value === undefined) delete sanitized[key];
  }
  return sanitized;
}

module.exports = {
  DOMPurify,
  sanitizeColor,
  sanitizeDesignState,
  sanitizeInputs,
  sanitizeText,
  sanitizeUrl
};
