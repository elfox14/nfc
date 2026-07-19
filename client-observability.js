(function initObservability(global) {
  'use strict';

  const apiBase = String(global.__API_BASE_URL || global.location.origin).replace(/\/+$/, '');
  const endpoint = `${apiBase}/api/observability`;
  const queue = [];
  const startedAt = Date.now();
  const release = String(global.__MC_PRIME_RELEASE || document.documentElement.dataset.release || 'unknown')
    .toLowerCase().replace(/[^a-z0-9._-]/g, '').slice(0, 48) || 'unknown';
  const path = location.pathname.toLowerCase();
  const page = path.includes('editor') ? 'editor' : path.includes('dashboard') ? 'dashboard' :
    path.includes('viewer') || path.includes('/view/') ? 'viewer' : path.includes('login') ? 'login' : 'other';
  const width = Math.max(screen.width || 0, innerWidth || 0);
  const device = width < 768 ? 'mobile' : width < 1100 ? 'tablet' : 'desktop';

  function add(kind, name, value) {
    queue.push({ kind, name, page, device, release, ...(Number.isFinite(value) ? { value } : {}) });
    if (queue.length >= 10) flush();
  }

  function flush() {
    if (!queue.length) return;
    const payload = JSON.stringify({ entries: queue.splice(0, 30) });
    if (!navigator.sendBeacon || !navigator.sendBeacon(endpoint, new Blob([payload], { type: 'application/json' }))) {
      fetch(endpoint, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: payload, keepalive: true }).catch(() => {});
    }
  }

  function observe(type, handler, options) {
    try {
      const observer = new PerformanceObserver((list) => handler(list.getEntries()));
      observer.observe({ type, buffered: true, ...options });
    } catch (_) { /* unsupported performance entry type */ }
  }

  add('event', 'page_view');
  if (page === 'editor') {
    document.addEventListener('DOMContentLoaded', () => add('event', 'editor_ready', Date.now() - startedAt), { once: true });
    document.addEventListener('editor:cloudsavestart', () => add('event', 'save_started'));
    document.addEventListener('editor:cloudsavesuccess', () => add('event', 'save_succeeded'));
    document.addEventListener('editor:cloudsaveerror', () => add('event', 'save_failed'));
    document.addEventListener('editor:previewopen', () => add('event', 'preview_opened'));
    document.addEventListener('editor:validationcomplete', (event) => {
      add('event', 'validation_completed');
      if ((event.detail?.blocking || 0) > 0 || event.detail?.ready === false) add('event', 'validation_blocked');
    });
  }

  const navigation = performance.getEntriesByType?.('navigation')?.[0];
  if (navigation) add('metric', 'ttfb', navigation.responseStart);
  observe('paint', (entries) => entries.forEach((entry) => entry.name === 'first-contentful-paint' && add('metric', 'fcp', entry.startTime)));
  observe('largest-contentful-paint', (entries) => {
    const last = entries[entries.length - 1];
    if (last) add('metric', 'lcp', last.startTime);
  });
  let cls = 0;
  observe('layout-shift', (entries) => entries.forEach((entry) => { if (!entry.hadRecentInput) cls += entry.value; }));
  let inp = 0;
  observe('event', (entries) => entries.forEach((entry) => { if (entry.interactionId) inp = Math.max(inp, entry.duration); }), { durationThreshold: 40 });

  let finalized = false;
  function finalize() {
    if (finalized) return;
    finalized = true;
    if (cls > 0) add('metric', 'cls', Math.round(cls * 1000));
    if (inp > 0) add('metric', 'inp', inp);
    flush();
  }
  document.addEventListener('visibilitychange', () => document.visibilityState === 'hidden' && finalize());
  global.addEventListener('pagehide', finalize, { once: true });
  global.MCPrimeObservability = { event: (name) => add('event', name), flush };
})(window);
