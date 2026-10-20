'use strict';
/**
 * build-variants.js — assemble editor-ready design states (Phase 1).
 *
 * A variant = a deep clone of an existing editor template state
 * (templates.json, same shape the editor's own Templates feature
 * applies via StateManager.applyState) with overrides:
 *  - brand colors from the palette scheme (front/back gradients,
 *    name/tagline colors, back button colors)
 *  - the user's name / company / generated tagline + bio (ar + en)
 *  - logo / photo URLs when provided
 *
 * Nothing is saved server-side: variants are returned to the client,
 * the chosen one is loaded into the editor in-memory, and the user
 * saves/publishes through the normal editor flow. This respects the
 * platform's one-card-per-member model — a member's published card is
 * never touched by generation.
 */

const fs = require('fs');
const path = require('path');

let templatesCache = null;

function loadTemplates(rootDir) {
  if (templatesCache) return templatesCache;
  try {
    const raw = fs.readFileSync(path.join(rootDir, 'templates.json'), 'utf8');
    const parsed = JSON.parse(raw);
    templatesCache = Array.isArray(parsed) && parsed.length ? parsed : null;
  } catch (e) {
    templatesCache = null;
  }
  return templatesCache;
}

/** Minimal blank-ish base if templates.json is unavailable. */
function fallbackBase() {
  return {
    state: {
      currentLanguage: 'ar',
      inputs: {
        'layout-select-visual': 'modern',
        'name-font': "'Cairo', sans-serif",
        'name-font-size': 28,
        'tagline-font-size': 16,
        'photo-shape': 'circle',
        'photo-size': 30,
        'logo-size': 20
      },
      dynamic: { phones: [], social: [], staticSocial: {}, links: [], qr: { enabled: true } },
      imageUrls: {}
    }
  };
}

function clone(obj) { return JSON.parse(JSON.stringify(obj)); }

function buildVariants({ rootDir, schemes, copy, input }) {
  const templates = loadTemplates(rootDir);
  const variants = schemes.map((scheme, i) => {
    const tpl = templates ? templates[i % templates.length] : fallbackBase();
    const state = clone(tpl.state || {});
    state.currentLanguage = input.language === 'en' ? 'en' : 'ar';
    state.inputs = state.inputs || {};
    const inp = state.inputs;

    // Brand colors.
    for (const [k, v] of Object.entries(scheme.colors)) inp[k] = v;

    // Identity + copy.
    if (input.name_ar) inp['input-name_ar'] = input.name_ar;
    if (input.name_en) inp['input-name_en'] = input.name_en;
    if (input.company_ar) inp['input-company_ar'] = input.company_ar;
    if (input.company_en) inp['input-company_en'] = input.company_en;
    inp['input-tagline_ar'] = copy.tagline_ar;
    inp['input-tagline_en'] = copy.tagline_en;
    inp['input-bio_ar'] = copy.bio_ar;
    inp['input-bio_en'] = copy.bio_en;

    // Media.
    if (input.logoUrl) inp['input-logo'] = input.logoUrl;
    if (input.photoUrl) inp['input-photo-url'] = input.photoUrl;

    // Strip the template's demo contacts (example phones/emails).
    // The client merges the user's REAL current dynamic block
    // (phones/social/links from the state already in their editor)
    // into the chosen variant before applying it — panel checkbox,
    // default on — so nobody's actual contacts are ever lost or
    // replaced by template samples.
    state.dynamic = { phones: [], social: [], staticSocial: {}, links: [], qr: { enabled: true } };

    return {
      id: scheme.id,
      label_ar: scheme.label_ar,
      label_en: scheme.label_en,
      preview: {
        'front-bg-start': scheme.colors['front-bg-start'],
        'front-bg-end': scheme.colors['front-bg-end'],
        'name-color': scheme.colors['name-color'],
        'tagline-color': scheme.colors['tagline-color']
      },
      state
    };
  });
  return variants;
}

module.exports = { buildVariants, loadTemplates };
