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

  function ensurePanel() {
    if (panel) return panel;
    panel = document.createElement('section');
    panel.id = 'editor-design-score';
    panel.className = 'eds-panel';
    panel.innerHTML = '<button type="button" class="eds-summary" aria-expanded="false"><span class="eds-ring"><strong>100</strong></span><span><b>' + (isAr ? 'تقييم التصميم' : 'Design score') + '</b><small>' + grade(100) + '</small></span><i class="fas fa-chevron-down"></i></button><div class="eds-details" hidden><p></p><ol></ol><button type="button" class="eds-run">' + (isAr ? 'فحص الآن' : 'Run check') + '</button></div>';
    var host = document.querySelector('.tb-center') || document.getElementById('pro-toolbar') || document.body;
    host.appendChild(panel);
    panel.querySelector('.eds-summary').addEventListener('click', function () {
      var details = panel.querySelector('.eds-details');
      details.hidden = !details.hidden;
      this.setAttribute('aria-expanded', details.hidden ? 'false' : 'true');
    });
    panel.querySelector('.eds-run').addEventListener('click', function () {
      if (global.EditorSmartValidation && typeof global.EditorSmartValidation.run === 'function') global.EditorSmartValidation.run();
      else document.dispatchEvent(new global.CustomEvent('editor:validationrequest'));
    });
    injectStyles();
    return panel;
  }

  function render(issues) {
    ensurePanel();
    issues = Array.isArray(issues) ? issues : [];
    var score = calculate(issues);
    current = { score: score, issues: issues.slice() };
    panel.querySelector('.eds-ring strong').textContent = String(score);
    panel.querySelector('.eds-summary small').textContent = grade(score);
    panel.dataset.grade = score >= 90 ? 'excellent' : score >= 75 ? 'good' : score >= 60 ? 'fair' : 'poor';
    panel.querySelector('.eds-details p').textContent = issues.length ? (isAr ? 'أهم التحسينات المقترحة:' : 'Top recommended improvements:') : (isAr ? 'لا توجد مشكلات مؤثرة حاليًا.' : 'No significant issues detected.');
    panel.querySelector('.eds-details ol').innerHTML = issues.slice(0, 5).map(function (issue) {
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
    style.textContent = '.eds-panel{position:relative;margin-inline:8px}.eds-summary{display:flex;align-items:center;gap:8px;border:1px solid rgba(255,255,255,.12);border-radius:12px;background:rgba(255,255,255,.04);color:inherit;padding:5px 9px;font:inherit;cursor:pointer}.eds-summary span:nth-child(2){display:grid;text-align:start}.eds-summary b{font-size:.7rem}.eds-summary small{font-size:.6rem;opacity:.72}.eds-ring{width:34px;height:34px;border-radius:50%;display:grid;place-items:center;border:3px solid #2ecc71;background:rgba(46,204,113,.1)}.eds-ring strong{font-size:.68rem}.eds-panel[data-grade="good"] .eds-ring{border-color:#4da6ff}.eds-panel[data-grade="fair"] .eds-ring{border-color:#f1c40f}.eds-panel[data-grade="poor"] .eds-ring{border-color:#e74c3c}.eds-details{position:absolute;top:calc(100% + 10px);inset-inline-end:0;width:280px;padding:14px;border:1px solid rgba(255,255,255,.12);border-radius:14px;background:var(--sidebar-bg,#0d1b2e);box-shadow:0 18px 50px rgba(0,0,0,.45);z-index:100050}.eds-details p{margin:0 0 8px;font-size:.76rem}.eds-details ol{margin:0 0 10px;padding-inline-start:18px;font-size:.72rem}.eds-run{width:100%;padding:8px;border:0;border-radius:9px;background:#4da6ff;color:#08111f;font-weight:700;cursor:pointer}@media(max-width:900px){.eds-summary span:nth-child(2),.eds-summary>i{display:none}.eds-details{position:fixed;left:14px;right:14px;top:76px;width:auto}}';
    document.head.appendChild(style);
  }

  document.addEventListener('editor:validationcomplete', function (event) { render(event.detail && event.detail.issues); });
  global.EditorDesignScore = { calculate: calculate, render: render, getCurrent: function () { return current; } };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', function () { render([]); }, { once: true });
  else render([]);
}(typeof window !== 'undefined' ? window : globalThis));