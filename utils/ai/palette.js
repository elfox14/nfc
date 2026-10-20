'use strict';
/**
 * palette.js — brand palette extraction + harmony schemes for the AI
 * Card Designer (Phase 1).
 *
 * Pure parts (no dependencies, unit-testable):
 *  - extractDominantColors(pixels, sampleCount): quantize RGB pixels,
 *    rank buckets by count weighted with a saturation bonus.
 *  - schemesFromColors(colors, mood): build the 3 design schemes the
 *    designer returns (rich dark / clean light / bold), each carrying
 *    every color key the editor state needs.
 *
 * Server adapter:
 *  - paletteFromImageBuffer(buffer): uses sharp (already a project
 *    dependency) to downscale + read raw pixels, then the pure parts.
 */

// ---------- basic color helpers (hex <-> rgb <-> hsl) ----------

function clamp(v, min, max) { return Math.min(max, Math.max(min, v)); }

function rgbToHex(r, g, b) {
  const h = (n) => clamp(Math.round(n), 0, 255).toString(16).padStart(2, '0');
  return ('#' + h(r) + h(g) + h(b)).toUpperCase();
}

function hexToRgb(hex) {
  const m = /^#?([0-9a-f]{6})$/i.exec(String(hex || '').trim());
  if (!m) return { r: 0, g: 0, b: 0 };
  const n = parseInt(m[1], 16);
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
}

function rgbToHsl(r, g, b) {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  const l = (max + min) / 2;
  if (max === min) return { h: 0, s: 0, l };
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h;
  if (max === r) h = (g - b) / d + (g < b ? 6 : 0);
  else if (max === g) h = (b - r) / d + 2;
  else h = (r - g) / d + 4;
  return { h: h / 6, s, l };
}

function hslToRgb(h, s, l) {
  h = ((h % 1) + 1) % 1;
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((h * 6) % 2) - 1));
  const m = l - c / 2;
  let r = 0, g = 0, b = 0;
  if (h < 1 / 6) { r = c; g = x; }
  else if (h < 2 / 6) { r = x; g = c; }
  else if (h < 3 / 6) { g = c; b = x; }
  else if (h < 4 / 6) { g = x; b = c; }
  else if (h < 5 / 6) { r = x; b = c; }
  else { r = c; b = x; }
  return { r: (r + m) * 255, g: (g + m) * 255, b: (b + m) * 255 };
}

function hexToHsl(hex) { const { r, g, b } = hexToRgb(hex); return rgbToHsl(r, g, b); }
function hslToHex(h, s, l) { const { r, g, b } = hslToRgb(h, s, l); return rgbToHex(r, g, b); }

function luminance(hex) {
  const { r, g, b } = hexToRgb(hex);
  const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); };
  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
}

/** Pick readable text color for a background. */
function readableOn(bgHex, darkHex, lightHex) {
  return luminance(bgHex) > 0.35 ? darkHex : lightHex;
}

// ---------- dominant color extraction (pure) ----------

/**
 * pixels: Uint8Array/Buffer of RGB triplets (already downscaled).
 * Returns up to `count` hex colors, most brand-relevant first.
 * Near-pure-white / near-pure-black buckets are deprioritized unless
 * they truly dominate (logos often sit on white).
 */
function extractDominantColors(pixels, count = 3) {
  const buckets = new Map();
  const step = 3;
  for (let i = 0; i + 2 < pixels.length; i += step) {
    const r = pixels[i], g = pixels[i + 1], b = pixels[i + 2];
    const key = ((r >> 5) << 6) | ((g >> 5) << 3) | (b >> 5);
    let bk = buckets.get(key);
    if (!bk) { bk = { r: 0, g: 0, b: 0, n: 0 }; buckets.set(key, bk); }
    bk.r += r; bk.g += g; bk.b += b; bk.n += 1;
  }
  const total = Math.max(1, Array.from(buckets.values()).reduce((a, b) => a + b.n, 0));
  const scored = [];
  for (const bk of buckets.values()) {
    const r = bk.r / bk.n, g = bk.g / bk.n, b = bk.b / bk.n;
    const { s, l } = rgbToHsl(r, g, b);
    const share = bk.n / total;
    let weight = share * (0.55 + 0.9 * s); // saturation bonus: brand colors beat greys
    if (l > 0.96 || l < 0.03) weight *= 0.15; // background whites/blacks
    scored.push({ hex: rgbToHex(r, g, b), weight, share, s, l });
  }
  scored.sort((a, b) => b.weight - a.weight);
  // De-duplicate near-identical hues.
  const out = [];
  for (const c of scored) {
    const hsl = hexToHsl(c.hex);
    const dup = out.some((o) => {
      const oh = hexToHsl(o);
      return Math.abs(oh.h - hsl.h) < 0.04 && Math.abs(oh.l - hsl.l) < 0.12 && Math.abs(oh.s - hsl.s) < 0.18;
    });
    if (!dup) out.push(c.hex);
    if (out.length >= count) break;
  }
  return out;
}

// ---------- harmony schemes ----------

function schemeFromBase(baseHex, mode) {
  const { h, s, l } = hexToHsl(baseHex);
  const sat = clamp(s, 0.25, 0.85);
  if (mode === 'dark') {
    const start = hslToHex(h, sat, clamp(l * 0.55, 0.10, 0.30));
    const end = hslToHex(h, clamp(sat * 0.9, 0.2, 0.8), clamp(l * 0.32, 0.05, 0.18));
    const accent = hslToHex(h, clamp(sat, 0.3, 0.9), 0.78);
    return {
      'front-bg-start': start, 'front-bg-end': end,
      'back-bg-start': '#F4F5F7', 'back-bg-end': '#E4E7EC',
      'back-buttons-bg-color': start, 'back-buttons-text-color': '#FFFFFF',
      'name-color': '#FFFFFF', 'tagline-color': accent
    };
  }
  if (mode === 'light') {
    const start = hslToHex(h, clamp(sat * 0.5, 0.12, 0.5), 0.93);
    const end = hslToHex(h, clamp(sat * 0.65, 0.15, 0.6), 0.82);
    const deep = hslToHex(h, sat, clamp(l * 0.6, 0.16, 0.34));
    const mid = hslToHex(h, clamp(sat * 0.8, 0.2, 0.7), clamp(l * 0.75, 0.28, 0.45));
    return {
      'front-bg-start': start, 'front-bg-end': end,
      'back-bg-start': '#FFFFFF', 'back-bg-end': '#EFF1F4',
      'back-buttons-bg-color': deep, 'back-buttons-text-color': '#FFFFFF',
      'name-color': deep, 'tagline-color': mid
    };
  }
  // bold: saturated brand color + analogous shift
  const start = hslToHex(h, sat, clamp(l, 0.32, 0.52));
  const end = hslToHex(h + 0.06, clamp(sat * 0.95, 0.25, 0.85), clamp(l * 0.62, 0.16, 0.34));
  return {
    'front-bg-start': start, 'front-bg-end': end,
    'back-bg-start': hslToHex(h, clamp(sat * 0.4, 0.1, 0.45), 0.12),
    'back-bg-end': hslToHex(h, clamp(sat * 0.4, 0.1, 0.45), 0.07),
    'back-buttons-bg-color': '#FFFFFF', 'back-buttons-text-color': start,
    'name-color': '#FFFFFF', 'tagline-color': hslToHex(h, clamp(sat * 0.7, 0.2, 0.8), 0.85)
  };
}

/**
 * Build the 3 designer schemes from extracted (or seed) colors.
 * mood: 'formal' | 'bold' | 'calm' — only reorders/emphasizes.
 */
function schemesFromColors(colors, mood) {
  const base = (colors && colors[0]) || '#2F3E63';
  const secondary = (colors && colors[1]) || base;
  const dark = schemeFromBase(base, 'dark');
  const light = schemeFromBase(base, 'light');
  const bold = schemeFromBase(secondary, 'bold');
  const all = [
    { id: 'rich', label_ar: 'داكن فاخر', label_en: 'Rich dark', colors: dark },
    { id: 'clean', label_ar: 'فاتح نظيف', label_en: 'Clean light', colors: light },
    { id: 'bold', label_ar: 'جريء ملوّن', label_en: 'Bold color', colors: bold }
  ];
  if (mood === 'calm') return [all[1], all[0], all[2]];
  if (mood === 'bold') return [all[2], all[0], all[1]];
  return all; // formal default
}

// ---------- server adapter (sharp) ----------

/**
 * Extract a palette from an image buffer using sharp (project dep).
 * Falls back to null on any error — caller then uses profession seeds.
 */
async function paletteFromImageBuffer(buffer) {
  let sharp;
  try { sharp = require('sharp'); } catch (e) { return null; }
  try {
    const { data } = await sharp(buffer)
      .resize(48, 48, { fit: 'inside' })
      .removeAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });
    const colors = extractDominantColors(data, 3);
    return colors.length ? colors : null;
  } catch (e) {
    return null;
  }
}

/** Fetch an image URL (logo) and extract its palette. SSRF-lite: http(s) only, size/time capped. */
async function paletteFromImageUrl(url) {
  try {
    if (!/^https:\/\//i.test(String(url || ''))) return null;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 6000);
    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timer);
    if (!res.ok) return null;
    const len = Number(res.headers.get('content-length') || 0);
    if (len > 5 * 1024 * 1024) return null;
    const buf = Buffer.from(await res.arrayBuffer());
    if (buf.length > 5 * 1024 * 1024) return null;
    return paletteFromImageBuffer(buf);
  } catch (e) {
    return null;
  }
}

module.exports = {
  extractDominantColors,
  schemesFromColors,
  schemeFromBase,
  paletteFromImageBuffer,
  paletteFromImageUrl,
  hexToRgb, rgbToHex, hexToHsl, hslToHex, luminance, readableOn
};
