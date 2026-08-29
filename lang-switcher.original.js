/**
 * MC PRIME Language Switcher
 * Handles automatic language detection and manual language switching across all pages
 */

(function () {
    'use strict';

    var STORAGE_KEY = 'mcprime_lang';
    var SUPPORTED_LANGUAGES = ['ar', 'en'];
    var DEFAULT_LANGUAGE = 'ar';

    // Comprehensive bidirectional mapping between Arabic and English pages
    var PAGE_MAP = {
        // Core Pages
        'index.html': 'index-en.html',
        'index-en.html': 'index.html',
        'editor.html': 'editor-en.html',
        'editor-en.html': 'editor.html',
        'gallery.html': 'gallery-en.html',
        'gallery-en.html': 'gallery.html',
        'dashboard.html': 'dashboard-en.html',
        'dashboard-en.html': 'dashboard.html',
        'contact.html': 'contact-en.html',
        'contact-en.html': 'contact.html',
        'privacy.html': 'privacy-en.html',
        'privacy-en.html': 'privacy.html',
        'terms.html': 'terms-en.html',
        'terms-en.html': 'terms.html',
        'about.html': 'about-en.html',
        'about-en.html': 'about.html',
        'how-to-use-editor.html': 'how-to-use-editor-en.html',
        'how-to-use-editor-en.html': 'how-to-use-editor.html',
        'login.html': 'login-en.html',
        'login-en.html': 'login.html',
        'signup.html': 'signup-en.html',
        'signup-en.html': 'signup.html',
        'viewer.html': 'viewer-en.html',
        'viewer-en.html': 'viewer.html',

        // Blog Hub
        'blog.html': 'blog-en.html',
        'blog-en.html': 'blog.html',

        // Blog Articles
        'blog-nfc-at-events.html': 'blog-nfc-at-events-en.html',
        'blog-nfc-at-events-en.html': 'blog-nfc-at-events.html',
        'blog-digital-menus-for-restaurants.html': 'blog-digital-menus-for-restaurants-en.html',
        'blog-digital-menus-for-restaurants-en.html': 'blog-digital-menus-for-restaurants.html',
        'blog-business-card-mistakes.html': 'blog-business-card-mistakes-en.html',
        'blog-business-card-mistakes-en.html': 'blog-business-card-mistakes.html',

        // Landing Pages / Personas
        'nfc-for-freelancers.html': 'nfc-for-freelancers-en.html',
        'nfc-for-freelancers-en.html': 'nfc-for-freelancers.html',
        'nfc-for-companies.html': 'nfc-for-companies-en.html',
        'nfc-for-companies-en.html': 'nfc-for-companies.html',
        'nfc-for-companies-egypt.html': 'nfc-for-companies-egypt-en.html',
        'nfc-for-companies-egypt-en.html': 'nfc-for-companies-egypt.html',
        'nfc-for-companies-saudi.html': 'nfc-for-companies-saudi-en.html',
        'nfc-for-companies-saudi-en.html': 'nfc-for-companies-saudi.html',
        'nfc-for-companies-uae.html': 'nfc-for-companies-uae-en.html',
        'nfc-for-companies-uae-en.html': 'nfc-for-companies-uae.html',
        'nfc-for-restaurants.html': 'nfc-for-restaurants-en.html',
        'nfc-for-restaurants-en.html': 'nfc-for-restaurants.html'
    };

    /**
     * Get the current page filename from window.location
     */
    function getCurrentPage() {
        var path = window.location.pathname || '';
        if (!path || path === '/' || path.endsWith('/')) {
            return 'index.html';
        }
        var filename = path.substring(path.lastIndexOf('/') + 1);
        if (!filename || filename === 'nfc') {
            return 'index.html';
        }
        return filename;
    }

    /**
     * Check if current page is English version
     */
    function isEnglishPage() {
        var page = getCurrentPage();
        var htmlLang = document.documentElement ? document.documentElement.getAttribute('lang') : null;
        if (htmlLang === 'en') return true;
        if (htmlLang === 'ar') return false;
        return page.indexOf('-en.html') !== -1 || page.indexOf('-en') !== -1;
    }

    /**
     * Get current language ('ar' or 'en')
     */
    function getCurrentLanguage() {
        return isEnglishPage() ? 'en' : 'ar';
    }

    /**
     * Get user saved language preference
     */
    function getSavedLanguage() {
        try {
            return localStorage.getItem(STORAGE_KEY);
        } catch (e) {
            return null;
        }
    }

    /**
     * Save user language preference
     */
    function saveLanguage(lang) {
        try {
            localStorage.setItem(STORAGE_KEY, lang);
        } catch (e) {
            console.warn('Could not save language preference');
        }
    }

    /**
     * Calculate the destination URL for the requested language
     */
    function getTargetPage(targetLang) {
        var currentPage = getCurrentPage();
        var currentLang = getCurrentLanguage();

        if (currentLang === targetLang) {
            return null; // Already in target language
        }

        // 1. Direct match in PAGE_MAP
        if (PAGE_MAP[currentPage]) {
            return PAGE_MAP[currentPage];
        }

        // 2. Dynamic resolution
        if (targetLang === 'en') {
            if (currentPage.indexOf('-en.html') !== -1) {
                return currentPage;
            }
            if (currentPage.indexOf('.html') !== -1) {
                return currentPage.replace('.html', '-en.html');
            }
            return 'index-en.html';
        } else if (targetLang === 'ar') {
            if (currentPage.indexOf('-en.html') !== -1) {
                return currentPage.replace('-en.html', '.html');
            }
            return 'index.html';
        }

        return null;
    }

    /**
     * Switch language and redirect seamlessly
     */
    function switchLanguage(targetLang) {
        if (!targetLang) {
            targetLang = getCurrentLanguage() === 'ar' ? 'en' : 'ar';
        }
        targetLang = targetLang.toLowerCase();

        if (!SUPPORTED_LANGUAGES.includes(targetLang)) {
            console.warn('Unsupported language:', targetLang);
            return;
        }

        saveLanguage(targetLang);

        var targetPage = getTargetPage(targetLang);
        if (targetPage) {
            var search = window.location.search || '';
            var hash = window.location.hash || '';
            window.location.href = targetPage + search + hash;
        }
    }

    // Expose functions globally immediately
    window.switchLanguage = switchLanguage;
    window.switchLang = switchLanguage; // Alias for backward compatibility
    window.MCPrimeLang = {
        switch: switchLanguage,
        getCurrent: getCurrentLanguage,
        getSaved: getSavedLanguage,
        getPageMap: function() { return PAGE_MAP; }
    };

    /**
     * Attach click handlers to any language buttons without inline onclick
     */
    function setupLangButtons() {
        var buttons = document.querySelectorAll('.lang-btn, [data-action="switch-lang"], #lang-toggle-btn');
        buttons.forEach(function (btn) {
            if (!btn.getAttribute('onclick')) {
                btn.addEventListener('click', function (e) {
                    e.preventDefault();
                    var target = btn.getAttribute('data-lang') || (getCurrentLanguage() === 'ar' ? 'en' : 'ar');
                    switchLanguage(target);
                });
            }
        });
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', setupLangButtons);
    } else {
        setupLangButtons();
    }
})();
