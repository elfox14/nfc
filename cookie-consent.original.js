/**
 * MC PRIME NFC — Cookie Consent Manager
 * GDPR/CCPA-compliant cookie consent with GTM integration.
 *
 * How it works:
 * 1. On first visit, shows a consent banner
 * 2. If user accepts → fires GTM "consent_update" event with granted status
 * 3. If user rejects → analytics/ads cookies are blocked; only essential cookies remain
 * 4. Decision is saved in localStorage (no cookie needed for consent itself)
 * 5. GTM default mode is "denied" until consent is given (privacy-first)
 */
(function () {
  'use strict';

  const CONSENT_KEY = 'mcprime_cookie_consent'; // localStorage key
  const CONSENT_VERSION = 1; // Bump this to re-ask after policy changes

  // ── Detect language ──────────────────────────────
  const isArabic = document.documentElement.lang === 'ar' || document.documentElement.dir === 'rtl';

  const i18n = {
    ar: {
      message: 'نستخدم ملفات تعريف الارتباط (Cookies) لتحسين تجربتك وتحليل الاستخدام.',
      privacy: 'سياسة الخصوصية',
      accept: 'قبول',
      reject: 'رفض',
    },
    en: {
      message: 'We use cookies to improve your experience and analyze usage.',
      privacy: 'Privacy Policy',
      accept: 'Accept',
      reject: 'Reject',
    },
  };

  const t = isArabic ? i18n.ar : i18n.en;
  const privacyUrl = isArabic ? '/nfc/privacy.html' : '/nfc/privacy-en.html';

  // ── GTM Consent Mode v2 (default denied) ─────────
  window.dataLayer = window.dataLayer || [];
  function gtag() { window.dataLayer.push(arguments); }

  // Set default consent BEFORE GTM loads
  gtag('consent', 'default', {
    analytics_storage: 'denied',
    ad_storage: 'denied',
    ad_user_data: 'denied',
    ad_personalization: 'denied',
    functionality_storage: 'granted',  // essential cookies always OK
    security_storage: 'granted',
  });

  // ── Check saved consent ──────────────────────────
  function getSavedConsent() {
    try {
      const data = JSON.parse(localStorage.getItem(CONSENT_KEY));
      if (data && data.version === CONSENT_VERSION) {
        return data.accepted;
      }
    } catch (e) { /* corrupt data, re-ask */ }
    return null; // no saved decision
  }

  function saveConsent(accepted) {
    localStorage.setItem(CONSENT_KEY, JSON.stringify({
      accepted: accepted,
      version: CONSENT_VERSION,
      timestamp: new Date().toISOString(),
    }));
  }

  function applyConsent(accepted) {
    if (accepted) {
      gtag('consent', 'update', {
        analytics_storage: 'granted',
        ad_storage: 'granted',
        ad_user_data: 'granted',
        ad_personalization: 'granted',
      });
    }
    // If rejected, consent stays "denied" (the default)
  }

  // ── Build and show the banner ────────────────────
  function showBanner() {
    const banner = document.createElement('div');
    banner.className = 'cookie-consent';
    banner.id = 'cookie-consent-banner';
    banner.setAttribute('role', 'dialog');
    banner.setAttribute('aria-label', isArabic ? 'إشعار ملفات تعريف الارتباط' : 'Cookie consent notice');

    banner.innerHTML = `
      <div class="cookie-consent-inner">
        <div class="cookie-consent-text">
          ${t.message} <a href="${privacyUrl}">${t.privacy}</a>
        </div>
        <div class="cookie-consent-actions">
          <button class="cookie-consent-btn reject" id="cookie-reject-btn">${t.reject}</button>
          <button class="cookie-consent-btn accept" id="cookie-accept-btn">${t.accept}</button>
        </div>
      </div>
    `;

    document.body.appendChild(banner);

    // Animate in after DOM paint
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        banner.classList.add('visible');
      });
    });

    // Event listeners
    document.getElementById('cookie-accept-btn').addEventListener('click', () => {
      saveConsent(true);
      applyConsent(true);
      hideBanner(banner);
    });

    document.getElementById('cookie-reject-btn').addEventListener('click', () => {
      saveConsent(false);
      applyConsent(false);
      hideBanner(banner);
    });
  }

  function hideBanner(banner) {
    banner.classList.remove('visible');
    setTimeout(() => banner.remove(), 500);
  }

  // ── Initialize ───────────────────────────────────
  const savedConsent = getSavedConsent();

  if (savedConsent !== null) {
    // User already made a choice — apply it silently
    applyConsent(savedConsent);
  } else {
    // First visit — show banner after a short delay
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => setTimeout(showBanner, 1500));
    } else {
      setTimeout(showBanner, 1500);
    }
  }
})();
