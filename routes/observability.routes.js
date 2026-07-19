const express = require('express');
const rateLimit = require('express-rate-limit');

const EVENTS = new Set([
  'page_view', 'editor_ready', 'save_started', 'save_succeeded', 'save_failed',
  'preview_opened', 'validation_completed', 'validation_blocked'
]);
const METRICS = new Set(['ttfb', 'fcp', 'lcp', 'cls', 'inp']);
const PAGES = new Set(['editor', 'dashboard', 'viewer', 'login', 'other']);
const DEVICES = new Set(['mobile', 'tablet', 'desktop']);

function cleanToken(value, fallback, max = 48) {
  const token = String(value || '').trim().toLowerCase();
  return /^[a-z0-9._-]+$/.test(token) && token.length <= max ? token : fallback;
}

function normalizeEntry(raw) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
  const kind = raw.kind === 'metric' ? 'metric' : 'event';
  const name = cleanToken(raw.name, '', 32);
  if ((kind === 'event' && !EVENTS.has(name)) || (kind === 'metric' && !METRICS.has(name))) return null;

  const page = cleanToken(raw.page, 'other', 20);
  const device = cleanToken(raw.device, 'desktop', 12);
  const release = cleanToken(raw.release, 'unknown', 48);
  const value = Number(raw.value);

  return {
    kind,
    name,
    page: PAGES.has(page) ? page : 'other',
    device: DEVICES.has(device) ? device : 'desktop',
    release,
    value: kind === 'metric' && Number.isFinite(value) ? Math.max(0, Math.min(value, 600000)) : null
  };
}

module.exports = function createObservabilityRouter({ getDb, collectionName = 'observabilityHourly' }) {
  const router = express.Router();
  const limiter = rateLimit({
    windowMs: 60 * 1000,
    max: process.env.NODE_ENV === 'test' ? 500 : 120,
    standardHeaders: true,
    legacyHeaders: false,
    message: ''
  });

  router.post('/', limiter, express.json({ limit: '12kb' }), async (req, res) => {
    const entries = (Array.isArray(req.body?.entries) ? req.body.entries : [req.body])
      .slice(0, 30)
      .map(normalizeEntry)
      .filter(Boolean);
    if (!entries.length) return res.status(400).json({ error: 'No valid telemetry entries' });

    const db = getDb();
    if (!db) return res.status(503).json({ error: 'Telemetry unavailable' });

    const now = new Date();
    const bucket = new Date(now);
    bucket.setUTCMinutes(0, 0, 0);
    const expiresAt = new Date(bucket.getTime() + 30 * 24 * 60 * 60 * 1000);
    const collection = db.collection(collectionName);

    try {
      await collection.bulkWrite(entries.map((entry) => ({
        updateOne: {
          filter: { bucket, kind: entry.kind, name: entry.name, page: entry.page, device: entry.device, release: entry.release },
          update: {
            $inc: {
              count: 1,
              ...(entry.value === null ? {} : { valueSum: entry.value, valueCount: 1 })
            },
            ...(entry.value === null ? {} : { $max: { valueMax: entry.value } }),
            $set: { updatedAt: now, expiresAt },
            $setOnInsert: { createdAt: now }
          },
          upsert: true
        }
      })), { ordered: false });
      return res.status(202).json({ accepted: entries.length });
    } catch (error) {
      console.error('[Observability] aggregate write failed:', error.message);
      return res.status(503).json({ error: 'Telemetry unavailable' });
    }
  });

  return router;
};

module.exports.normalizeEntry = normalizeEntry;
module.exports.EVENTS = EVENTS;
module.exports.METRICS = METRICS;
