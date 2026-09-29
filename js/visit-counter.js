/* عداد زيارات MC Prim — شارة ظاهرة بعدد زيارات الصفحة + تسجيل مصدر الوصول */
(function () {
  'use strict';
  if (typeof window === 'undefined' || typeof document === 'undefined') return;
  if (!/^https?:$/.test(window.location.protocol)) return;

  var path = window.location.pathname || '/';
  // صفحات الإدارة والحسابات لا تُحتسب ولا يظهر عليها العداد
  var DENY = /^\/nfc\/(admin|login|signup|forgot-password|reset-password|verify-email|editor|dashboard|offline|404|500|proposals-preview)(\.html)?$/i;
  if (DENY.test(path)) return;

  // تجاهل البوتات
  var ua = navigator.userAgent || '';
  if (/bot|crawl|spider|slurp|mediapartners|baidu|yandex|sogou|exabot|facebot|ia_archiver|ahrefs|semrush|mj12bot|dotbot|gptbot/i.test(ua)) return;

  var isAr = (document.documentElement.lang || 'ar').toLowerCase().indexOf('ar') === 0;
  var label = isAr ? 'مشاهدة' : 'views';
  function fmt(n) {
    try { return Number(n || 0).toLocaleString(isAr ? 'ar-EG' : 'en-US'); }
    catch (e) { return String(n || 0); }
  }

  var BASES = ['/nfc/api/visits', '/api/visits'];
  var apiBase = null;
  function apiUrl(p) { return (apiBase || BASES[0]) + p; }

  function tryBases(urlPath, options) {
    var i = apiBase ? 0 : 0;
    function attempt(idx) {
      var base = apiBase || BASES[idx];
      return fetch(base + urlPath, options).then(function (r) {
        if (!r.ok && !apiBase && idx < BASES.length - 1 && (r.status === 404 || r.status === 0)) {
          return attempt(idx + 1);
        }
        if (r.ok && !apiBase) apiBase = base;
        return r;
      }).catch(function () {
        if (!apiBase && idx < BASES.length - 1) return attempt(idx + 1);
        throw new Error('unreachable');
      });
    }
    return attempt(i);
  }

  // تسجيل الزيارة — مرة واحدة لكل جلسة لكل صفحة
  var sessKey = 'mcprim_vc_' + path;
  var counted = false;
  try { counted = !!window.sessionStorage.getItem(sessKey); } catch (e) {}
  if (!counted) {
    try {
      tryBases('/hit', {
        method: 'POST',
        keepalive: true,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path: path, ref: document.referrer || '' })
      }).catch(function () {});
      try { window.sessionStorage.setItem(sessKey, '1'); } catch (e) {}
    } catch (e) {}
  }

  function render(total) {
    var txt = fmt(total);
    // أماكن مخصصة داخل الصفحة
    var spots = document.querySelectorAll('[data-visit-counter]');
    for (var i = 0; i < spots.length; i++) spots[i].textContent = txt;
    // لو مفيش مكان مخصص → شارة عائمة صغيرة
    if (!spots.length) showBadge(txt);
  }

  function showBadge(txt) {
    var hideKey = 'mcprim_vc_hide_' + path;
    try { if (window.sessionStorage.getItem(hideKey)) return; } catch (e) {}
    var b = document.createElement('div');
    b.setAttribute('dir', isAr ? 'rtl' : 'ltr');
    b.style.cssText = 'position:fixed;bottom:16px;inset-inline-start:16px;z-index:99999;' +
      'background:rgba(17,17,17,.92);color:#fff;font-size:12.5px;line-height:1;' +
      'padding:9px 12px;border-radius:999px;display:flex;align-items:center;gap:7px;' +
      'box-shadow:0 4px 18px rgba(0,0,0,.28);font-family:inherit;backdrop-filter:blur(4px);';
    var eye = document.createElement('span'); eye.textContent = '👁️';
    var num = document.createElement('b'); num.textContent = txt; num.style.fontWeight = '700';
    var lbl = document.createElement('span'); lbl.textContent = label; lbl.style.opacity = '.75';
    var x = document.createElement('span');
    x.textContent = '×'; x.style.cssText = 'cursor:pointer;opacity:.55;font-size:15px;margin-inline-start:2px;';
    x.setAttribute('role', 'button'); x.setAttribute('aria-label', 'إغلاق');
    x.onclick = function () {
      try { window.sessionStorage.setItem(hideKey, '1'); } catch (e) {}
      if (b.parentNode) b.parentNode.removeChild(b);
    };
    b.appendChild(eye); b.appendChild(num); b.appendChild(lbl); b.appendChild(x);
    document.body.appendChild(b);
  }

  // قراءة العدد وعرضه
  function ready(fn) {
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', fn);
    else fn();
  }
  ready(function () {
    var settled = false;
    tryBases('/count?path=' + encodeURIComponent(path), { method: 'GET' })
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (d) {
        if (settled || !d || typeof d.total !== 'number') return;
        settled = true;
        render(d.total);
      })
      .catch(function () { /* العداد مش متاح — لا نظهر شيئًا */ });
  });
})();
