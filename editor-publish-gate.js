/**
 * MC PRIME NFC — Publish gate v1.0
 * Converts smart validation results into an actionable pre-publish review.
 */
(function (global) {
  'use strict';

  var document = global.document;
  if (!document || global.EditorPublishGate) return;

  var isAr = document.documentElement.lang !== 'en';
  var overlay = null;
  var currentResult = null;
  var publishButton = null;
  var bypassOnce = false;

  function t(ar, en) { return isAr ? ar : en; }

  function escapeHtml(value) {
    return String(value || '').replace(/[&<>"']/g, function (character) {
      return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character];
    });
  }

  function build() {
    if (overlay && overlay.isConnected) return overlay;
    overlay = document.createElement('div');
    overlay.id = 'editor-publish-gate';
    overlay.className = 'epg-overlay';
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-modal', 'true');
    overlay.setAttribute('aria-labelledby', 'epg-title');
    overlay.innerHTML = '<div class="epg-dialog"><header><div><span>' + t('مراجعة أخيرة', 'Final review') + '</span><h2 id="epg-title">' + t('جاهزية البطاقة للنشر', 'Card publishing readiness') + '</h2></div><button type="button" id="epg-close" aria-label="' + t('إغلاق', 'Close') + '"><i class="fas fa-xmark"></i></button></header><p id="epg-summary"></p><ol id="epg-list"></ol><footer><button type="button" id="epg-cancel">' + t('العودة للمحرر', 'Back to editor') + '</button><button type="button" id="epg-recheck"><i class="fas fa-rotate"></i>' + t('إعادة الفحص', 'Check again') + '</button><button type="button" id="epg-continue" class="epg-primary">' + t('متابعة النشر', 'Continue publishing') + '</button></footer></div>';
    document.body.appendChild(overlay);
    overlay.querySelector('#epg-close').addEventListener('click', close);
    overlay.querySelector('#epg-cancel').addEventListener('click', close);
    overlay.querySelector('#epg-recheck').addEventListener('click', checkAndRender);
    overlay.querySelector('#epg-continue').addEventListener('click', continuePublish);
    overlay.querySelector('#epg-list').addEventListener('click', function (event) {
      var item = event.target.closest('[data-issue-index]');
      if (!item || !currentResult) return;
      var selectedIssue = currentResult.issues[Number(item.dataset.issueIndex)];
      close();
      if (global.EditorSmartValidation) global.EditorSmartValidation.focusIssue(selectedIssue);
    });
    overlay.addEventListener('click', function (event) { if (event.target === overlay) close(); });
    injectStyles();
    return overlay;
  }

  function render(result) {
    build();
    currentResult = result;
    var errors = result.issues.filter(function (entry) { return entry.severity === 'error'; });
    var summary = overlay.querySelector('#epg-summary');
    var list = overlay.querySelector('#epg-list');
    var continueButton = overlay.querySelector('#epg-continue');

    if (!result.issues.length) {
      summary.textContent = t('لا توجد ملاحظات مؤثرة. البطاقة جاهزة للنشر.', 'No significant issues were found. The card is ready to publish.');
    } else if (errors.length) {
      summary.textContent = t('أصلح المشكلات الأساسية التالية قبل النشر.', 'Fix the following required items before publishing.');
    } else {
      summary.textContent = t('يمكنك المتابعة، لكن يفضل مراجعة هذه التحسينات.', 'You can continue, but reviewing these suggestions is recommended.');
    }

    list.innerHTML = result.issues.map(function (entry, index) {
      var icon = entry.severity === 'error' ? 'fa-circle-exclamation' : 'fa-triangle-exclamation';
      return '<li class="epg-item ' + (entry.severity === 'error' ? 'is-error' : 'is-warning') + '"><button type="button" data-issue-index="' + index + '"><i class="fas ' + icon + '"></i><span>' + escapeHtml(entry.message) + '</span><i class="fas fa-arrow-left"></i></button></li>';
    }).join('');
    continueButton.disabled = errors.length > 0;
    continueButton.hidden = errors.length > 0;
    overlay.dataset.state = errors.length ? 'blocked' : 'ready';
    return result;
  }

  function open(result) {
    build();
    render(result);
    overlay.classList.add('is-open');
    overlay.querySelector(errorsPresent(result) ? '#epg-recheck' : '#epg-continue').focus();
    return true;
  }

  function close() {
    if (overlay) overlay.classList.remove('is-open');
  }

  function errorsPresent(result) {
    return Boolean(result && result.issues.some(function (entry) { return entry.severity === 'error'; }));
  }

  function check() {
    if (!global.EditorSmartValidation || typeof global.EditorSmartValidation.run !== 'function') {
      return { valid: true, issues: [], checkedAt: new Date().toISOString() };
    }
    return global.EditorSmartValidation.run({ source: 'publish' });
  }

  function checkAndRender() {
    var result = check();
    render(result);
    if (!result.issues.length) overlay.querySelector('#epg-continue').focus();
    return result;
  }

  function continuePublish() {
    if (!currentResult || errorsPresent(currentResult) || !publishButton) return false;
    bypassOnce = true;
    close();
    publishButton.click();
    return true;
  }

  function handlePublish(event) {
    if (bypassOnce) { bypassOnce = false; return; }
    var result = check();
    if (!result.issues.length) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    open(result);
  }

  function injectStyles() {
    if (document.getElementById('editor-publish-gate-css')) return;
    var style = document.createElement('style');
    style.id = 'editor-publish-gate-css';
    style.textContent = '.epg-overlay{position:fixed;inset:0;z-index:100250;display:grid;place-items:center;padding:18px;background:rgba(2,7,16,.82);backdrop-filter:blur(10px);opacity:0;visibility:hidden;pointer-events:none}.epg-overlay.is-open{opacity:1;visibility:visible;pointer-events:auto}.epg-dialog{width:min(600px,100%);max-height:88vh;overflow:auto;padding:22px;border:1px solid rgba(77,166,255,.22);border-radius:18px;background:var(--form-bg,#0d1b2e);box-shadow:0 28px 80px rgba(0,0,0,.6);color:var(--text-primary,#fff)}.epg-dialog header,.epg-dialog footer{display:flex;align-items:center;gap:10px}.epg-dialog header{justify-content:space-between}.epg-dialog header span{font-size:.68rem;color:#79bdff}.epg-dialog h2{margin:3px 0 0;font-size:1.15rem}.epg-dialog header button{width:36px;height:36px;border:1px solid rgba(255,255,255,.1);border-radius:9px;background:transparent;color:inherit}.epg-dialog>p{color:var(--text-secondary);font-size:.8rem}.epg-dialog ol{display:grid;gap:7px;margin:14px 0;padding:0;list-style:none}.epg-item button{display:grid;grid-template-columns:auto 1fr auto;align-items:center;gap:9px;width:100%;padding:11px;border:1px solid rgba(255,255,255,.08);border-radius:10px;background:rgba(255,255,255,.03);color:inherit;text-align:start;font:inherit;font-size:.76rem}.epg-item.is-error button{border-color:rgba(231,76,60,.25);background:rgba(231,76,60,.07)}.epg-item.is-error button>i:first-child{color:#ff7d73}.epg-item.is-warning button>i:first-child{color:#f1c40f}.epg-item button>i:last-child{color:var(--text-secondary);font-size:.65rem}.epg-dialog footer{justify-content:flex-end;padding-top:14px;border-top:1px solid rgba(255,255,255,.08)}.epg-dialog footer button{padding:9px 13px;border:1px solid rgba(255,255,255,.1);border-radius:9px;background:rgba(255,255,255,.04);color:inherit;font:inherit;font-size:.74rem}.epg-dialog footer button i{margin-inline-end:6px}.epg-dialog footer .epg-primary{border:0;background:#4da6ff;color:#fff;font-weight:700}@media(max-width:560px){.epg-dialog footer{align-items:stretch;flex-direction:column}.epg-dialog footer button{width:100%}}';
    document.head.appendChild(style);
  }

  function init() {
    publishButton = document.getElementById('save-share-btn');
    if (!publishButton) { global.setTimeout(init, 200); return; }
    build();
    publishButton.addEventListener('click', handlePublish, true);
  }

  global.EditorPublishGate = {
    check: check,
    open: open,
    close: close,
    continuePublish: continuePublish,
    getCurrent: function () { return currentResult; }
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true });
  else init();
}(typeof window !== 'undefined' ? window : globalThis));
