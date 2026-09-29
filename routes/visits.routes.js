/**
 * عداد زيارات الصفحات — MC Prim / ELFOX
 * POST /hit   → تسجيل زيارة (المسار + مصدر الوصول)
 * GET  /count → قراءة إجمالي الزيارات لمسار (ظاهر للزوار)
 */
module.exports = function createVisitsRouter({ getDb }) {
  const router = require('express').Router();
  const COLLECTION = 'page_visits';

  // تصنيف المصدر من الـ referrer
  const SOURCE_PATTERNS = [
    [/((^|\.)facebook\.com$|(^|\.)fb\.com$|(^|\.)fb\.watch$)/, 'فيسبوك'],
    [/((^|\.)instagram\.com$)/, 'انستجرام'],
    [/((^|\.)youtube\.com$|(^|\.)youtu\.be$)/, 'يوتيوب'],
    [/((^|\.)tiktok\.com$)/, 'تيك توك'],
    [/((^|\.)twitter\.com$|(^|\.)x\.com$)/, 'تويتر/X'],
    [/((^|\.)whatsapp\.com$|(^|\.)wa\.me$)/, 'واتساب'],
    [/((^|\.)t\.me$|(^|\.)telegram\.me$|(^|\.)telegram\.org$)/, 'تيليجرام'],
    [/((^|\.)linkedin\.com$)/, 'لينكدإن'],
    [/((^|\.)threads\.com$|(^|\.)threads\.net$)/, 'ثريدز'],
    [/((^|\.)pinterest\.com$)/, 'بينترست'],
    [/((^|\.)snapchat\.com$)/, 'سناب شات'],
    [/((^|\.)kwai\.com$)/, 'كواي'],
    [/(^|\.)google\./, 'جوجل'],
    [/(^|\.)bing\.com$/, 'بينج'],
    [/(^|\.)duckduckgo\.com$/, 'دك دك جو'],
    [/(^|\.)yahoo\.com$/, 'ياهو'],
  ];

  function sourceFromReferrer(ref) {
    if (!ref || typeof ref !== 'string' || !ref.trim()) return 'مباشر';
    try {
      const host = new URL(ref.trim()).hostname.toLowerCase().replace(/^www\./, '');
      if (!host) return 'مباشر';
      for (const [re, label] of SOURCE_PATTERNS) {
        if (re.test(host)) return label;
      }
      return host.slice(0, 60);
    } catch {
      return 'مباشر';
    }
  }

  // أسماء الحقول في MongoDB ممنوع فيها النقطة وعلامة الدولار
  function safeField(s) {
    return String(s).replace(/[.$\0]/g, '_').slice(0, 60);
  }

  function normalizePath(p) {
    if (typeof p !== 'string') return null;
    let path = p.trim().slice(0, 160);
    if (!path.startsWith('/')) return null;
    path = path.replace(/\/index\.html?$/i, '/');
    // الموقع (/nfc) + صفحات الكورس (/elfox) فقط — لمنع التلوث
    if (!path.startsWith('/nfc/') && !path.startsWith('/elfox/')) return null;
    return path;
  }

  function todayKey() {
    return new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Africa/Cairo', year: 'numeric', month: '2-digit', day: '2-digit'
    }).format(new Date());
  }

  // تسجيل زيارة — نرد فورًا والكتابة في الخلفية حتى لا نبطئ الصفحة
  router.post('/hit', (req, res) => {
    res.json({ ok: true });
    try {
      const db = getDb();
      if (!db) return;
      const path = normalizePath(req.body && req.body.path);
      if (!path) return;
      const src = safeField(sourceFromReferrer(req.body && req.body.ref));
      const day = todayKey();
      db.collection(COLLECTION).updateOne(
        { path },
        {
          $inc: { total: 1, [`sources.${src}`]: 1, [`days.${day}`]: 1 },
          $set: { updatedAt: new Date() }
        },
        { upsert: true }
      ).catch(() => {});
    } catch {
      // لا نكسر الصفحة أبدًا بسبب العداد
    }
  });

  // قراءة العداد — ظاهر للزوار
  router.get('/count', async (req, res) => {
    try {
      const db = getDb();
      const path = normalizePath(req.query.path);
      if (!db || !path) return res.json({ path: path || null, total: 0 });
      const doc = await db.collection(COLLECTION).findOne(
        { path }, { projection: { total: 1 } }
      );
      res.json({ path, total: doc && doc.total ? doc.total : 0 });
    } catch {
      res.json({ path: null, total: 0 });
    }
  });

  return router;
};
