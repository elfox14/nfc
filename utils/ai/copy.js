'use strict';
/**
 * copy.js — copywriting for the AI Card Designer (Phase 1).
 *
 * buildCopy(input) returns { tagline_ar, tagline_en, bio_ar, bio_en, source }.
 *
 * Provider strategy:
 *  - If AI_API_KEY is set, call an OpenAI-compatible chat completions
 *    endpoint (AI_API_BASE, default https://api.openai.com/v1;
 *    AI_MODEL, default gpt-4o-mini) and ask for strict JSON.
 *  - Any failure / missing key → hand-written profession templates
 *    (professions.js). The feature NEVER fails because of copy.
 *
 * Copy rules baked into both paths (Mahmoud's standing content rule):
 * natural human tone, no canned AI/marketing phrases, no exclamation
 * spam, concrete and specific.
 */

const { getProfession } = require('./professions');

const MAX = { tagline: 60, bio: 320 };

function fill(template, vars) {
  return String(template || '')
    .replace(/\{name\}/g, vars.name || '')
    .replace(/\{company\}/g, vars.company || '')
    .replace(/\{tagline\}/g, vars.tagline || '')
    .replace(/\{line\}/g, vars.line || '')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

function pick(arr, seed) {
  if (!arr || !arr.length) return '';
  return arr[Math.abs(seed) % arr.length];
}

function fallbackCopy(input, prof) {
  const seed = (String(input.name_ar || input.name_en || 'x').length * 7)
    + String(input.profession || '').length;
  const tagline_ar = fill(pick(prof.tagline_ar, seed), { line: input.line || prof.label_ar });
  const tagline_en = fill(pick(prof.tagline_en, seed), { line: input.line || prof.label_en });
  const varsAr = { name: input.name_ar || input.name_en || '', company: input.company_ar || input.company_en || '', tagline: tagline_ar };
  const varsEn = { name: input.name_en || input.name_ar || '', company: input.company_en || input.company_ar || '', tagline: tagline_en };
  let bio_ar = fill(pick(prof.bio_ar, seed), varsAr);
  let bio_en = fill(pick(prof.bio_en, seed), varsEn);
  // If the user gave a free line and the template didn't already use it
  // as the tagline, weave it into the Arabic bio once.
  if (input.line && !bio_ar.includes(input.line) && prof.tagline_ar[0].indexOf('{line}') === -1) {
    bio_ar = bio_ar + ' ' + input.line.trim();
  }
  return {
    tagline_ar: tagline_ar.slice(0, MAX.tagline),
    tagline_en: tagline_en.slice(0, MAX.tagline),
    bio_ar: bio_ar.slice(0, MAX.bio),
    bio_en: bio_en.slice(0, MAX.bio),
    source: 'template'
  };
}

async function llmCopy(input, prof) {
  const key = process.env.AI_API_KEY;
  if (!key) return null;
  const base = (process.env.AI_API_BASE || 'https://api.openai.com/v1').replace(/\/+$/, '');
  const model = process.env.AI_MODEL || 'gpt-4o-mini';
  const prompt = [
    'You write short professional profile copy for a digital business card.',
    'Return ONLY a JSON object with keys: tagline_ar, tagline_en, bio_ar, bio_en.',
    'Rules: natural human tone, like a real person wrote it. No marketing cliches, no "in today\'s fast-paced world", no exclamation marks, no superlatives. Arabic in clear Modern Standard Arabic with a light professional feel; English plain and direct.',
    'Limits: tagline <= 60 chars each; bio 2 short sentences, <= 300 chars each.',
    'Person data:',
    '- Arabic name: ' + (input.name_ar || ''),
    '- English name: ' + (input.name_en || ''),
    '- Profession: ' + prof.label_en + ' / ' + prof.label_ar,
    '- Company: ' + (input.company_en || input.company_ar || ''),
    '- Their own line about themselves (may be empty): ' + (input.line || '')
  ].join('\n');
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 15000);
    const res = await fetch(base + '/chat/completions', {
      method: 'POST',
      signal: controller.signal,
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + key },
      body: JSON.stringify({
        model,
        messages: [{ role: 'user', content: prompt }],
        response_format: { type: 'json_object' },
        temperature: 0.7
      })
    });
    clearTimeout(timer);
    if (!res.ok) return null;
    const data = await res.json();
    const text = data && data.choices && data.choices[0] && data.choices[0].message
      ? data.choices[0].message.content : '';
    const parsed = JSON.parse(text);
    const clean = (v, max) => (typeof v === 'string' ? v.replace(/\s+/g, ' ').trim().slice(0, max) : '');
    const out = {
      tagline_ar: clean(parsed.tagline_ar, MAX.tagline),
      tagline_en: clean(parsed.tagline_en, MAX.tagline),
      bio_ar: clean(parsed.bio_ar, MAX.bio),
      bio_en: clean(parsed.bio_en, MAX.bio),
      source: 'llm'
    };
    // Require at least the taglines; otherwise treat as failure.
    if (!out.tagline_ar && !out.tagline_en) return null;
    return out;
  } catch (e) {
    return null;
  }
}

async function buildCopy(input) {
  const prof = getProfession(input.profession);
  const llm = await llmCopy(input, prof);
  if (llm) {
    // Fill any gaps from the fallback so every field is present.
    const fb = fallbackCopy(input, prof);
    return {
      tagline_ar: llm.tagline_ar || fb.tagline_ar,
      tagline_en: llm.tagline_en || fb.tagline_en,
      bio_ar: llm.bio_ar || fb.bio_ar,
      bio_en: llm.bio_en || fb.bio_en,
      source: 'llm'
    };
  }
  return fallbackCopy(input, prof);
}

module.exports = { buildCopy, fallbackCopy };
