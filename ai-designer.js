/*!
 * ai-designer.js — AI Card Designer panel for the MC PRIME editor (Phase 1).
 *
 * Self-contained: injects its own button + modal, talks to
 * POST /api/ai/design-card, and applies the chosen variant through the
 * editor's own StateManager.applyState (the same path the built-in
 * Templates feature uses). It never saves anything by itself — the
 * user reviews in the editor and saves/publishes normally.
 */
(function () {
  'use strict';
  if (window.__aiDesignerLoaded) return;
  window.__aiDesignerLoaded = true;

  var PROFESSIONS = [
    ['medical', 'طبيب / عيادة'], ['realestate', 'عقارات'], ['sales', 'مبيعات وتسويق'],
    ['food', 'مطعم / كافيه'], ['services', 'خدمات / صيانة'], ['business', 'شركة / أعمال'],
    ['beauty', 'تجميل / صالون'], ['other', 'أخرى / عام']
  ];
  var STAGES = ['بنقرأ ألوان اللوجو…', 'بنكتب نبذتك…', 'بنركّب ٣ نسخ…', 'بنظبط التفاصيل الأخيرة…'];

  var state = { variants: [], suggestions: [], usage: null, stageTimer: null };

  function apiBase() {
    return (window.Config && window.Config.API_BASE_URL) || '';
  }
  function apiFetch(url, options) {
    if (window.Auth && typeof window.Auth.apiFetchWithRefresh === 'function') {
      return window.Auth.apiFetchWithRefresh(url, options);
    }
    options = options || {};
    options.credentials = 'include';
    return fetch(url, options);
  }
  function currentEditorState() {
    try {
      if (window.StateManager && typeof window.StateManager.getStateObject === 'function') {
        return window.StateManager.getStateObject();
      }
    } catch (e) { /* noop */ }
    return null;
  }
  function el(html) {
    var t = document.createElement('template');
    t.innerHTML = html.trim();
    return t.content.firstElementChild;
  }
  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  /* ---------------- button ---------------- */
  var btn = el('<button type="button" class="aid-fab" aria-label="المصمم الذكي">' +
    '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3v3M12 18v3M3 12h3M18 12h3M5.6 5.6l2.1 2.1M16.3 16.3l2.1 2.1M18.4 5.6l-2.1 2.1M7.7 16.3l-2.1 2.1"/><circle cx="12" cy="12" r="3.2"/></svg>' +
    '<span>ابنِ كارتك بالذكاء الاصطناعي</span></button>');
  document.body.appendChild(btn);

  /* ---------------- modal ---------------- */
  var overlay = el('<div class="aid-overlay" hidden><div class="aid-modal" role="dialog" aria-modal="true" dir="rtl">' +
    '<div class="aid-head"><h3>المصمم الذكي</h3><button type="button" class="aid-x" aria-label="إغلاق">×</button></div>' +
    '<div class="aid-body"></div>' +
    '</div></div>');
  document.body.appendChild(overlay);
  var body = overlay.querySelector('.aid-body');

  function openModal() {
    overlay.hidden = false;
    renderForm();
    refreshUsage();
  }
  function closeModal() {
    overlay.hidden = true;
    if (state.stageTimer) { clearInterval(state.stageTimer); state.stageTimer = null; }
  }
  btn.addEventListener('click', openModal);
  overlay.querySelector('.aid-x').addEventListener('click', closeModal);
  overlay.addEventListener('click', function (e) { if (e.target === overlay) closeModal(); });

  function refreshUsage() {
    apiFetch(apiBase() + '/api/ai/usage', { method: 'GET' })
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (u) {
        state.usage = u;
        var slot = body.querySelector('.aid-usage');
        if (slot && u) slot.textContent = 'التوليدات هذا الشهر: ' + u.used + ' من ' + u.limit;
      })
      .catch(function () { /* usage line is informational only */ });
  }

  function renderForm() {
    var cur = currentEditorState();
    var inp = (cur && cur.inputs) || {};
    var profOptions = PROFESSIONS.map(function (p) {
      return '<option value="' + p[0] + '">' + p[1] + '</option>';
    }).join('');
    body.innerHTML =
      '<p class="aid-intro">ادّي المصمم ٣ حاجات ويرجع لك ٣ نسخ كارت شبه جاهزة تختار منها. كارتك الحالي مش هيتلمس — النسخة اللي تعجبك بتتفتح في المحرر وانت اللي تحفظ.</p>' +
      '<div class="aid-grid">' +
      '  <label>المهنة<select class="aid-f-prof">' + profOptions + '</select></label>' +
      '  <label>مزاج التصميم<select class="aid-f-mood"><option value="formal">رسمي</option><option value="bold">عصري جريء</option><option value="calm">هادي بسيط</option></select></label>' +
      '  <label>الاسم بالعربي<input class="aid-f-name-ar" value="' + esc(inp['input-name_ar'] || '') + '" placeholder="اسمك الكامل"></label>' +
      '  <label>الاسم بالإنجليزية<input class="aid-f-name-en" value="' + esc(inp['input-name_en'] || '') + '" placeholder="Your full name"></label>' +
      '  <label>الشركة بالعربي<input class="aid-f-comp-ar" value="' + esc(inp['input-company_ar'] || '') + '" placeholder="اختياري"></label>' +
      '  <label>الشركة بالإنجليزية<input class="aid-f-comp-en" value="' + esc(inp['input-company_en'] || '') + '" placeholder="Optional"></label>' +
      '</div>' +
      '<label class="aid-wide">سطر واحد عن نفسك (اختياري — أي كلام، وهنصيغه)<input class="aid-f-line" placeholder="مثال: بشتغل في تسويق العيادات من ٥ سنين"></label>' +
      '<label class="aid-wide">رابط اللوجو (اختياري — بنقرأ منه ألوان البراند)<input class="aid-f-logo" value="' + esc(inp['input-logo'] || '') + '" placeholder="https://…"></label>' +
      '<div class="aid-row"><span class="aid-usage"></span>' +
      '<button type="button" class="aid-go">ولّد ٣ نسخ</button></div>' +
      '<p class="aid-err" hidden></p>';
    body.querySelector('.aid-go').addEventListener('click', generate);
    refreshUsage();
  }

  function showError(msg) {
    var e = body.querySelector('.aid-err');
    if (e) { e.hidden = false; e.textContent = msg; }
  }

  function renderLoading() {
    body.innerHTML = '<div class="aid-loading"><div class="aid-spinner"></div><p class="aid-stage">' + STAGES[0] + '</p></div>';
    var i = 0;
    var stageEl = body.querySelector('.aid-stage');
    state.stageTimer = setInterval(function () {
      i = Math.min(i + 1, STAGES.length - 1);
      if (stageEl) stageEl.textContent = STAGES[i];
    }, 2600);
  }

  function generate() {
    var payload = {
      profession: body.querySelector('.aid-f-prof').value,
      mood: body.querySelector('.aid-f-mood').value,
      name_ar: body.querySelector('.aid-f-name-ar').value,
      name_en: body.querySelector('.aid-f-name-en').value,
      company_ar: body.querySelector('.aid-f-comp-ar').value,
      company_en: body.querySelector('.aid-f-comp-en').value,
      line: body.querySelector('.aid-f-line').value,
      logoUrl: body.querySelector('.aid-f-logo').value,
      language: 'ar'
    };
    var cur = currentEditorState();
    if (cur && cur.inputs && cur.inputs['input-photo-url'] && !payload.photoUrl) {
      payload.photoUrl = cur.inputs['input-photo-url'];
    }
    renderLoading();
    apiFetch(apiBase() + '/api/ai/design-card', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    })
      .then(function (r) { return r.json().then(function (j) { return { ok: r.ok, j: j }; }); })
      .then(function (res) {
        if (state.stageTimer) { clearInterval(state.stageTimer); state.stageTimer = null; }
        if (!res.ok) {
          renderForm();
          showError((res.j && res.j.error) || 'حصلت مشكلة في التوليد — حاول تاني');
          return;
        }
        state.variants = res.j.variants || [];
        state.suggestions = res.j.suggestions || [];
        state.usage = res.j.usage || state.usage;
        renderResults(res.j);
      })
      .catch(function () {
        if (state.stageTimer) { clearInterval(state.stageTimer); state.stageTimer = null; }
        renderForm();
        showError('الاتصال وقع أثناء التوليد — حاول تاني');
      });
  }

  function renderResults(data) {
    var name = (data.variants[0] && data.variants[0].state.inputs['input-name_ar']) || '';
    var cards = data.variants.map(function (v, idx) {
      var p = v.preview;
      var tag = v.state.inputs['input-tagline_ar'] || '';
      var logo = v.state.inputs['input-logo']
        ? '<img class="aid-pv-logo" src="' + esc(v.state.inputs['input-logo']) + '" alt="">' : '';
      return '<div class="aid-card" data-idx="' + idx + '">' +
        '<div class="aid-pv" style="background:linear-gradient(135deg,' + esc(p['front-bg-start']) + ',' + esc(p['front-bg-end']) + ')">' +
        logo +
        '<div class="aid-pv-name" style="color:' + esc(p['name-color']) + '">' + esc(name) + '</div>' +
        '<div class="aid-pv-tag" style="color:' + esc(p['tagline-color']) + '">' + esc(tag) + '</div>' +
        '</div>' +
        '<div class="aid-card-foot"><span>' + esc(v.label_ar) + '</span>' +
        '<button type="button" class="aid-apply" data-idx="' + idx + '">افتح في المحرر</button></div></div>';
    }).join('');

    var bio = data.copy ? '<div class="aid-bio"><b>النبذة المولّدة:</b><p>' + esc(data.copy.bio_ar || '') + '</p></div>' : '';

    var sugg = '';
    if (state.suggestions.length) {
      sugg = '<div class="aid-sugg"><b>روابط مقترحة حسب مهنتك</b><p class="aid-sugg-note">حط الرابط وعلّم على اللي يعجبك — هيتضافوا للنسخة اللي تفتحها.</p>' +
        state.suggestions.map(function (s, i) {
          return '<label class="aid-sugg-row"><input type="checkbox" class="aid-sugg-check" data-i="' + i + '">' +
            '<span>' + esc(s.title_ar) + '</span>' +
            '<input class="aid-sugg-url" data-i="' + i + '" placeholder="' + esc(s.hint_ar || 'https://…') + '"></label>';
        }).join('') + '</div>';
    }

    body.innerHTML =
      '<div class="aid-cards">' + cards + '</div>' + bio + sugg +
      '<label class="aid-keep"><input type="checkbox" class="aid-keep-check" checked> احتفظ ببيانات التواصل الحالية (تليفونات وروابطي اللي في المحرر)</label>' +
      '<div class="aid-row"><span class="aid-usage">' +
      (state.usage ? 'التوليدات هذا الشهر: ' + state.usage.used + ' من ' + state.usage.limit : '') +
      '</span><button type="button" class="aid-again">ولّد نسخ تانية</button></div>';

    body.querySelectorAll('.aid-apply').forEach(function (b) {
      b.addEventListener('click', function () { applyVariant(Number(b.getAttribute('data-idx'))); });
    });
    body.querySelector('.aid-again').addEventListener('click', renderForm);
  }

  function applyVariant(idx) {
    var v = state.variants[idx];
    if (!v || !window.StateManager || typeof window.StateManager.applyState !== 'function') {
      showError('المحرر مش جاهز دلوقتي — حدّث الصفحة وحاول تاني');
      return;
    }
    var st = JSON.parse(JSON.stringify(v.state));
    var keep = body.querySelector('.aid-keep-check');
    var cur = currentEditorState();
    if (keep && keep.checked && cur && cur.dynamic) {
      st.dynamic = JSON.parse(JSON.stringify(cur.dynamic));
    }
    if (!st.dynamic) st.dynamic = { phones: [], social: [], staticSocial: {}, links: [] };
    if (!Array.isArray(st.dynamic.links)) st.dynamic.links = [];
    body.querySelectorAll('.aid-sugg-check').forEach(function (chk) {
      if (!chk.checked) return;
      var i = Number(chk.getAttribute('data-i'));
      var urlInput = body.querySelector('.aid-sugg-url[data-i="' + i + '"]');
      var url = urlInput ? urlInput.value.trim() : '';
      var s = state.suggestions[i];
      if (s && /^https?:\/\//i.test(url)) {
        st.dynamic.links.push({ id: 'ai_link_' + i, title: s.title_ar, url: url });
      }
    });
    window.StateManager.applyState(st, false);
    closeModal();
    if (typeof window.showToast === 'function') {
      window.showToast('اتحمّل تصميم المصمم الذكي في المحرر — راجعه واحفظ لما يعجبك');
    }
  }
})();
