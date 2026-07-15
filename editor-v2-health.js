(function (global) {
  'use strict';

  var document = global.document;
  if (!document || global.EditorV2Health) return;

  var isAr = document.documentElement.lang !== 'en';
  var EXPECTED = [
    'EditorContextInspector',
    'EditorDesignSystem',
    'EditorOnboarding',
    'EditorSimpleMode',
    'EditorSmartValidation',
    'EditorPublishGate'
  ];
  var lastReport = null;
  var banner = null;

  function inspect() {
    var missing = EXPECTED.filter(function (name) { return !global[name]; });
    var report = {
      version: document.documentElement.dataset.editorV2Bootstrap || null,
      ready: missing.length === 0,
      missing: missing,
      checkedAt: new Date().toISOString()
    };
    lastReport = report;
    document.documentElement.dataset.editorV2Ready = report.ready ? 'true' : 'false';
    document.documentElement.dataset.editorV2Missing = missing.join(',');
    document.dispatchEvent(new global.CustomEvent('editor:v2health', { detail: report }));
    return report;
  }

  function removeBanner() {
    if (banner && banner.parentNode) banner.parentNode.removeChild(banner);
    banner = null;
  }

  function render(report) {
    removeBanner();
    if (report.ready) return;

    banner = document.createElement('div');
    banner.id = 'editor-v2-health-banner';
    banner.setAttribute('role', 'alert');
    banner.innerHTML =
      '<div class="evh-copy"><strong>' + (isAr ? 'لم تكتمل تهيئة المحرر الجديد' : 'Editor 2 did not finish loading') + '</strong>' +
      '<span>' + (isAr ? 'أعد تحميل الصفحة. الوحدات المتأثرة: ' : 'Reload the page. Affected modules: ') + report.missing.join(', ') + '</span></div>' +
      '<button type="button" id="evh-reload">' + (isAr ? 'إعادة التحميل' : 'Reload') + '</button>';
    document.body.appendChild(banner);
    banner.querySelector('#evh-reload').addEventListener('click', function () { global.location.reload(); });
    injectStyles();
  }

  function injectStyles() {
    if (document.getElementById('editor-v2-health-css')) return;
    var style = document.createElement('style');
    style.id = 'editor-v2-health-css';
    style.textContent = '#editor-v2-health-banner{position:fixed;z-index:100500;inset-inline:16px;bottom:16px;display:flex;align-items:center;justify-content:space-between;gap:16px;padding:13px 16px;border:1px solid rgba(231,76,60,.45);border-radius:12px;background:rgba(45,12,18,.96);color:#fff;box-shadow:0 18px 50px rgba(0,0,0,.45);font-family:inherit}.evh-copy{display:grid;gap:3px}.evh-copy strong{font-size:.86rem}.evh-copy span{font-size:.72rem;color:rgba(255,255,255,.75);overflow-wrap:anywhere}#evh-reload{border:0;border-radius:9px;padding:9px 13px;background:#fff;color:#8f1f2d;font:inherit;font-weight:700;cursor:pointer;white-space:nowrap}@media(max-width:640px){#editor-v2-health-banner{align-items:stretch;flex-direction:column}#evh-reload{width:100%}}';
    document.head.appendChild(style);
  }

  function check(options) {
    options = options || {};
    var report = inspect();
    if (options.render !== false) render(report);
    return report;
  }

  function schedule() {
    global.setTimeout(function () { check(); }, 1800);
    global.setTimeout(function () {
      var report = check();
      if (!report.ready && global.EditorV2Bootstrap && typeof global.EditorV2Bootstrap.load === 'function') {
        global.EditorV2Bootstrap.load();
        global.setTimeout(function () { check(); }, 1200);
      }
    }, 3500);
  }

  global.EditorV2Health = {
    check: check,
    getLastReport: function () { return lastReport; },
    expected: EXPECTED.slice()
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', schedule, { once: true });
  else schedule();
}(typeof window !== 'undefined' ? window : globalThis));
