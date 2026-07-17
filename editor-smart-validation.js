/**
 * MC PRIME NFC — Smart validation v1.0
 * Runs deterministic, actionable checks before a card is published.
 */
(function (global) {
  'use strict';

  var document = global.document;
  if (!document || global.EditorSmartValidation) return;

  var isAr = document.documentElement.lang !== 'en';
  var lastResult = { valid: true, issues: [], checkedAt: null };

  function t(ar, en) { return isAr ? ar : en; }

  function value(id) {
    var input = document.getElementById(id);
    return input ? String(input.value || '').trim() : '';
  }

  function issue(code, severity, message, targetId, face) {
    return { code: code, severity: severity, message: message, targetId: targetId || null, face: face || null };
  }

  function hasContact() {
    var selectors = [
      '#input-email', '#input-website', '#input-whatsapp', '#input-facebook', '#input-linkedin',
      '#input-instagram', '#input-tiktok', '#input-twitter', '#input-telegram', '#input-youtube',
      '#input-snapchat', '#phone-numbers-container input', '.dynamic-social-value-input'
    ];
    return selectors.some(function (selector) {
      return Array.from(document.querySelectorAll(selector)).some(function (input) { return String(input.value || '').trim(); });
    });
  }

  function validEmail(email) {
    return !email || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  }

  function validUrl(url) {
    if (!url) return true;
    try {
      var parsed = new global.URL(url);
      return parsed.protocol === 'http:' || parsed.protocol === 'https:';
    } catch (error) { return false; }
  }

  function hexToRgb(color) {
    var normalized = String(color || '').trim();
    if (/^#[0-9a-f]{3}$/i.test(normalized)) {
      normalized = '#' + normalized.slice(1).split('').map(function (character) { return character + character; }).join('');
    }
    if (!/^#[0-9a-f]{6}$/i.test(normalized)) return null;
    return {
      r: parseInt(normalized.slice(1, 3), 16),
      g: parseInt(normalized.slice(3, 5), 16),
      b: parseInt(normalized.slice(5, 7), 16)
    };
  }

  function luminance(color) {
    var rgb = hexToRgb(color);
    if (!rgb) return null;
    var channels = [rgb.r, rgb.g, rgb.b].map(function (channel) {
      var value = channel / 255;
      return value <= 0.03928 ? value / 12.92 : Math.pow((value + 0.055) / 1.055, 2.4);
    });
    return channels[0] * 0.2126 + channels[1] * 0.7152 + channels[2] * 0.0722;
  }

  function contrastRatio(first, second) {
    var a = luminance(first);
    var b = luminance(second);
    if (a === null || b === null) return null;
    return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
  }

  function checkIdentity(issues) {
    var nameId = isAr ? 'input-name_ar' : 'input-name_en';
    var name = value(nameId) || value(isAr ? 'input-name_en' : 'input-name_ar');
    if (!name) issues.push(issue('missing-name', 'error', t('أضف الاسم قبل النشر.', 'Add a name before publishing.'), nameId, 'front'));
    if (!hasContact()) issues.push(issue('missing-contact', 'error', t('أضف وسيلة تواصل واحدة على الأقل.', 'Add at least one contact method.'), 'contact-info-accordion', 'back'));

    var email = value('input-email');
    if (!validEmail(email)) issues.push(issue('invalid-email', 'error', t('صيغة البريد الإلكتروني غير صحيحة.', 'The email address is not valid.'), 'input-email', 'back'));

    ['input-website', 'input-facebook', 'input-linkedin', 'input-youtube'].forEach(function (id) {
      var url = value(id);
      if (url && !validUrl(url)) issues.push(issue('invalid-url-' + id, 'warning', t('أكمل الرابط باستخدام https://.', 'Use a complete link beginning with https://.'), id, 'back'));
    });
  }

  function checkQr(issues) {
    var visibility = document.getElementById('visibility-qr');
    if (visibility && !visibility.checked) return;
    var source = document.querySelector('input[name="qr-source"]:checked');
    if (source && source.value === 'custom' && !value('input-qr-url')) {
      issues.push(issue('missing-qr-url', 'error', t('أدخل رابط QR المخصص.', 'Enter the custom QR link.'), 'input-qr-url'));
    }
    var size = Number(value('qr-size') || 30);
    if (size < 20) issues.push(issue('qr-too-small', 'warning', t('كبّر رمز QR لضمان سهولة قراءته.', 'Increase the QR size so it scans reliably.'), 'qr-size'));
    var ratio = contrastRatio(value('qr-dots-color') || '#1e2d40', value('qr-bg-color') || '#ffffff');
    if (ratio !== null && ratio < 3) {
      issues.push(issue('qr-low-contrast', 'error', t('التباين بين رمز QR وخلفيته ضعيف.', 'The QR code does not have enough contrast.'), 'qr-dots-color'));
    }
  }

  function checkTextOverflow(issues) {
    [
      ['card-name', 'name-font-size', t('الاسم يتجاوز المساحة المتاحة.', 'The name overflows its available space.')],
      ['card-tagline', 'tagline-font-size', t('المسمى الوظيفي يتجاوز المساحة المتاحة.', 'The job title overflows its available space.')]
    ].forEach(function (entry) {
      var element = document.getElementById(entry[0]);
      if (!element || !element.clientWidth || !element.clientHeight) return;
      if (element.scrollWidth > element.clientWidth + 1 || element.scrollHeight > element.clientHeight + 1) {
        issues.push(issue('overflow-' + entry[0], 'warning', entry[2], entry[1], element.closest('#card-back-content') ? 'back' : 'front'));
      }
    });
  }

  function checkSafeArea(issues) {
    var elements = document.querySelectorAll('#card-logo, #card-personal-photo-wrapper, #card-name, #card-tagline, #qr-code-wrapper, .phone-button-draggable-wrapper, .draggable-social-link');
    elements.forEach(function (element) {
      if (element.hidden || element.style.display === 'none') return;
      var face = element.closest('.card-content-layer');
      if (!face) return;
      var faceRect = face.getBoundingClientRect();
      var elementRect = element.getBoundingClientRect();
      if (!faceRect.width || !faceRect.height || !elementRect.width || !elementRect.height) return;
      var margin = 6;
      if (elementRect.left < faceRect.left + margin || elementRect.top < faceRect.top + margin || elementRect.right > faceRect.right - margin || elementRect.bottom > faceRect.bottom - margin) {
        issues.push(issue('unsafe-edge-' + element.id, 'warning', t('يوجد عنصر قريب جدًا من حافة الكارت.', 'An element is too close to the card edge.'), element.dataset.inputTargetId || element.id, face.id === 'card-back-content' ? 'back' : 'front'));
      }
    });
  }

  function run(options) {
    options = options || {};
    var issues = [];
    checkIdentity(issues);
    checkQr(issues);
    checkTextOverflow(issues);
    checkSafeArea(issues);
    lastResult = {
      valid: !issues.some(function (entry) { return entry.severity === 'error'; }),
      issues: issues,
      checkedAt: new Date().toISOString(),
      source: options.source || 'manual'
    };
    document.dispatchEvent(new global.CustomEvent('editor:validationcomplete', { detail: lastResult }));
    return lastResult;
  }

  function focusIssue(entry) {
    if (!entry) return false;
    var target = entry.targetId && document.getElementById(entry.targetId);
    if (!target) return false;
    var panel = target.closest('#panel-design, #panel-elements, #tb-settings-panel');
    if (global.EditorTabs && typeof global.EditorTabs.activate === 'function') {
      if (panel && panel.id === 'panel-design') global.EditorTabs.activate('tab-design');
      else if (panel && panel.id === 'tb-settings-panel') global.EditorTabs.activate('tab-settings');
      else global.EditorTabs.activate('tab-content');
    }
    var details = target.closest('details');
    if (details) details.open = true;
    if (target.scrollIntoView) target.scrollIntoView({ behavior: 'smooth', block: 'center' });
    if (/^(INPUT|SELECT|TEXTAREA|BUTTON)$/.test(target.tagName) && target.focus) target.focus();
    target.classList.add('editor-validation-focus');
    global.setTimeout(function () { target.classList.remove('editor-validation-focus'); }, 1200);
    return true;
  }

  function init() {
    document.addEventListener('editor:validationrequest', function () { run({ source: 'request' }); });
  }

  global.EditorSmartValidation = {
    run: run,
    focusIssue: focusIssue,
    getLastResult: function () { return lastResult; },
    contrastRatio: contrastRatio,
    validEmail: validEmail,
    validUrl: validUrl
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true });
  else init();
}(typeof window !== 'undefined' ? window : globalThis));
