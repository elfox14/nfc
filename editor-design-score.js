(function (global) {
  'use strict';
  var document = global.document;
  if (!document || global.EditorDesignScore) return;
  var isAr = document.documentElement.lang !== 'en';
  var panel;
  var current = { score: 100, issues: [] };

  function weight(issue) {
    var severity = String(issue && (issue.severity || issue.type || issue.level) || '').toLowerCase();
    if (severity === 'error' || severity === 'critical') return 18;
    if (severity === 'warning' || severity === 'warn') return 7;
    return 3;
  }

  function calculate(issues) {
    issues = Array.isArray(issues) ? issues : [];
    var penalty = issues.reduce(function (sum, issue) { return sum + weight(issue); }, 0);
    return Math.max(0, Math.min(100, 100 - penalty));
  }

  function grade(score) {
    if (score >= 90) return isAr ? 'ممتاز' : 'Excellent';
    if (score >= 75) return isAr ? 'جيد جدًا' : 'Very good';
    if (score >= 60) return isAr ? 'جيد' : 'Good';
    return isAr ? 'يحتاج تحسين' : 'Needs work';
  }

  function findHost() {
    return document.getElementById('editor-context-inspector') ||
      document.getElementById('tb-settings-panel') ||
      document.getElementById('panel-design');
  }

  function ensurePanel() {
    if (panel && panel.isConnected) return panel;
    var host = findHost();
    if (!host) return null;
    panel = document.createElement('section');
    panel.id = 'editor-design-score';
    panel.className = 'eds-panel ed-section';
    panel.innerHTML =
      '<div class="eds-head"><div><span class="eds-label">' + (isAr ? 'جودة التصميم' : 'Design quality') + '</span><strong class="eds-value">100</strong></div><span class="eds-grade">' + grade(100) + '</span></div>' +
      '<div class="eds-meter" aria-hidden="true"><span></span></div>' +
      '<p class="eds-summary">' + (isAr ? 'التصميم جاهز للمراجعة.' : 'The design is ready for review.') + '</p>' +
      '<details class="eds-details"><summary>' + (isAr ? 'عرض التحسينات' : 'View improvements') + '</summary><ol></ol></details>' +
      '<button type="button" class="eds-run">' + (isAr ? 'تشغيل الفحص الذكي' : 'Run smart check') + '</button>';
    host.insertBefore(panel, host.firstChild || null);
    panel.querySelector('.eds-run').addEventListener('click', function () {
      if (global.EditorSmartValidation && typeof global.EditorSmartValidation.run === 'function') global.EditorSmartValidation.run();
      else document.dispatchEvent(new global.CustomEvent('editor:validationrequest'));
    });
    injectStyles();
    return panel;
  }

  function render(issues) {
    var target = ensurePanel();
    if (!target) return current;
    issues = Array.isArray(issues) ? issues : [];
    var score = calculate(issues);
    current = { score: score, issues: issues.slice() };
    target.querySelector('.eds-value').textContent = String(score);
    target.querySelector('.eds-grade').textContent = grade(score);
    target.querySelector('.eds-meter span').style.width = score + '%';
    target.dataset.grade = score >= 90 ? 'excellent' : score >= 75 ? 'good' : score >= 60 ? 'fair' : 'poor';
    target.querySelector('.eds-summary').textContent = issues.length ?
      (isAr ? issues.length + ' ملاحظات تحتاج مراجعة.' : issues.length + ' items need review.') :
      (isAr ? 'لا توجد مشكلات مؤثرة حاليًا.' : 'No significant issues detected.');
    target.querySelector('.eds-details ol').innerHTML = issues.slice(0, 5).map(function (issue) {
      var message = issue && (issue.message || issue.title || issue.label) || (isAr ? 'مراجعة هذا العنصر' : 'Review this item');
      return '<li>' + message + '</li>';
    }).join('');
    document.dispatchEvent(new global.CustomEvent('editor:designscore', { detail: current }));
    return current;
  }

  function injectStyles() {
    if (document.getElementById('editor-design-score-css')) return;
    var style = document.createElement('style');
    style.id = 'editor-design-score-css';
    style.textContent = [
      '.eds-panel{margin:0 0 12px;padding:13px;border:1px solid rgba(255,255,255,.09);border-radius:12px;background:rgba(255,255,255,.025)}',
      '.eds-head{display:flex;align-items:flex-start;justify-content:space-between;gap:10px}.eds-head>div{display:flex;align-items:baseline;gap:8px}.eds-label{font-size:.72rem;color:var(--text-secondary,#aebcd0)}.eds-value{font-size:1.25rem;line-height:1}.eds-grade{padding:4px 7px;border-radius:999px;background:rgba(46,204,113,.12);color:#5bd98a;font-size:.62rem;font-weight:700}',
      '.eds-meter{height:6px;margin:10px 0 8px;border-radius:999px;background:rgba(255,255,255,.07);overflow:hidden}.eds-meter span{display:block;height:100%;border-radius:inherit;background:#2ecc71;transition:width .25s ease}.eds-panel[data-grade="good"] .eds-meter span{background:#4da6ff}.eds-panel[data-grade="fair"] .eds-meter span{background:#f1c40f}.eds-panel[data-grade="poor"] .eds-meter span{background:#e74c3c}',
      '.eds-summary{margin:0 0 8px;font-size:.7rem;color:var(--text-secondary,#aebcd0)}.eds-details{font-size:.7rem}.eds-details summary{cursor:pointer}.eds-details ol{margin:8px 0;padding-inline-start:18px}.eds-run{width:100%;margin-top:9px;padding:8px;border:1px solid rgba(77,166,255,.22);border-radius:9px;background:rgba(77,166,255,.1);color:#79bdff;font:inherit;font-size:.68rem;cursor:pointer}',
      '@media(max-width:760px){#editor-design-score{display:none}}'
    ].join('');
    document.head.appendChild(style);
  }

  function init() {
    render([]);
    if (!panel) global.setTimeout(function () { render(current.issues); }, 800);
  }

  document.addEventListener('editor:validationcomplete', function (event) { render(event.detail && event.detail.issues); });
  document.addEventListener('editor:designsystemapplied', function () { if (!panel || !panel.isConnected) render(current.issues); });
  global.EditorDesignScore = { calculate: calculate, render: render, getCurrent: function () { return current; } };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true });
  else init();
}(typeof window !== 'undefined' ? window : globalThis));