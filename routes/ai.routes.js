'use strict';
/**
 * ai.routes.js — AI Card Designer endpoints (Phase 1).
 *
 * POST /api/ai/design-card  → generate 3 design variants (auth required)
 * GET  /api/ai/usage        → caller's generation usage for this month
 *
 * Design decisions:
 *  - Generation NEVER writes designs: variants are returned to the
 *    client and loaded into the editor in-memory (StateManager
 *    .applyState) exactly like the built-in Templates feature. The
 *    user's saved/published card is untouched until they save.
 *  - Usage is metered in half-units in the `ai_usage` collection
 *    (a full generation = 2 halves) so Phase 2 partial regenerations
 *    can cost 1 half without a schema change.
 *  - Copy falls back to hand-written profession templates when no LLM
 *    provider is configured (see utils/ai/copy.js), and palette falls
 *    back to profession seed colors when no logo is given or the logo
 *    cannot be read — the endpoint only fails on bad input/auth/quota.
 */

const express = require('express');
const rateLimit = require('express-rate-limit');
const { createVerifyToken } = require('../auth-middleware');
const palette = require('../utils/ai/palette');
const { buildCopy } = require('../utils/ai/copy');
const { buildVariants } = require('../utils/ai/build-variants');
const { getProfession, PROFESSION_KEYS } = require('../utils/ai/professions');

const USAGE_COLLECTION = 'ai_usage';
const FULL_GENERATION_HALVES = 2;

function monthlyLimitHalves() {
  const n = parseInt(process.env.AI_MONTHLY_LIMIT || '5', 10);
  return (Number.isFinite(n) && n > 0 ? n : 5) * 2;
}

function currentMonth() {
  const d = new Date();
  return d.getUTCFullYear() + '-' + String(d.getUTCMonth() + 1).padStart(2, '0');
}

function cleanText(v, max) {
  return typeof v === 'string' ? v.replace(/\s+/g, ' ').trim().slice(0, max) : '';
}

module.exports = function createAiRouter({ getDb, usersCollectionName, rootDir }) {
  const router = express.Router();
  const verifyToken = createVerifyToken({ getDb, usersCollectionName });

  const aiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 30,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'طلبات كثيرة — حاول بعد قليل', code: 'AI_RATE_LIMIT' }
  });

  async function getUsageHalves(userId) {
    const doc = await getDb().collection(USAGE_COLLECTION)
      .findOne({ _id: userId + ':' + currentMonth() });
    return doc ? doc.halves || 0 : 0;
  }

  async function addUsageHalves(userId, halves) {
    await getDb().collection(USAGE_COLLECTION).updateOne(
      { _id: userId + ':' + currentMonth() },
      { $inc: { halves }, $set: { userId, month: currentMonth(), updatedAt: new Date() } },
      { upsert: true }
    );
  }

  router.get('/ai/usage', verifyToken, async (req, res) => {
    try {
      if (!getDb()) return res.status(500).json({ error: 'DB not connected' });
      const halves = await getUsageHalves(req.user.userId);
      res.json({ used: halves / 2, limit: monthlyLimitHalves() / 2, month: currentMonth() });
    } catch (e) {
      console.error('AI usage error:', e);
      res.status(500).json({ error: 'Usage check failed' });
    }
  });

  router.post('/ai/design-card', verifyToken, aiLimiter, async (req, res) => {
    try {
      if (!getDb()) return res.status(500).json({ error: 'DB not connected' });
      const body = req.body || {};
      const input = {
        profession: PROFESSION_KEYS.includes(body.profession) ? body.profession : 'other',
        name_ar: cleanText(body.name_ar, 80),
        name_en: cleanText(body.name_en, 80),
        company_ar: cleanText(body.company_ar, 80),
        company_en: cleanText(body.company_en, 80),
        line: cleanText(body.line, 140),
        language: body.language === 'en' ? 'en' : 'ar',
        mood: ['formal', 'bold', 'calm'].includes(body.mood) ? body.mood : 'formal',
        logoUrl: cleanText(body.logoUrl, 500),
        photoUrl: cleanText(body.photoUrl, 500)
      };
      if (!input.name_ar && !input.name_en) {
        return res.status(400).json({ error: 'الاسم مطلوب لتوليد الكارت', code: 'NAME_REQUIRED' });
      }

      // Quota.
      const limitHalves = monthlyLimitHalves();
      const usedHalves = await getUsageHalves(req.user.userId);
      if (usedHalves + FULL_GENERATION_HALVES > limitHalves) {
        return res.status(429).json({
          error: 'وصلت لحد التوليدات الشهرية — هيتجدد أول الشهر الجاي',
          code: 'AI_QUOTA_EXCEEDED',
          usage: { used: usedHalves / 2, limit: limitHalves / 2 }
        });
      }

      // Palette: logo → profession seed fallback.
      const prof = getProfession(input.profession);
      let colors = null;
      if (input.logoUrl) colors = await palette.paletteFromImageUrl(input.logoUrl);
      if (!colors || !colors.length) colors = prof.seed;

      const schemes = palette.schemesFromColors(colors, input.mood);
      const copy = await buildCopy(input);
      const variants = buildVariants({ rootDir, schemes, copy, input });

      await addUsageHalves(req.user.userId, FULL_GENERATION_HALVES);

      res.json({
        success: true,
        variants,
        copy,
        copySource: copy.source,
        suggestions: prof.links,
        palette: colors,
        usage: { used: (usedHalves + FULL_GENERATION_HALVES) / 2, limit: limitHalves / 2 }
      });
    } catch (e) {
      console.error('AI design-card error:', e);
      if (!res.headersSent) res.status(500).json({ error: 'Generation failed' });
    }
  });

  return router;
};
