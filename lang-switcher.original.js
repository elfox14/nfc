/**
 * MC PRIME Language Switcher
 * Handles automatic language detection and manual language switching
 */

(function () {
    'use strict';

    const STORAGE_KEY = 'mcprime_lang';
    const SUPPORTED_LANGUAGES = ['ar', 'en'];
    const DEFAULT_LANGUAGE = 'ar';

    // Page mapping between Arabic and English versions
    const PAGE_MAP = {
        'index.html': 'index-en.html',
        'index-en.html': 'index.html',
        'editor.html': 'editor-en.html',
        'editor-en.html': 'editor.html',
        'gallery.html': 'gallery-en.html',
        'gallery-en.html': 'gallery.html',
        'blog.html': 'blog-en.html',
        'blog-en.html': 'blog.html',
        'contact.html': 'contact-en.html',
        'contact-en.html': 'contact.html',
        'privacy.html': 'privacy-en.html',
        'privacy-en.html': 'privacy.html',
        'about.html': 'about-en.html',
        'about-en.html': 'about.html',
        'viewer.html': 'viewer-en.html',
        'viewer-en.html': 'viewer.html'
    };

    /**
     * Get the current page filename
     */
    function getCurrentPage() {
        const path = window.location.pathname;
        const filename = path.substring(path.lastIndexOf('/') + 1) || 'index.html';
        return filename;
    }

    /**
     * Check if current page is English version
     */
    function isEnglishPage() {
        return getCurrentPage().includes('-en.html');
    }

    /**
     * Get the browser's preferred language
     */
    function getBrowserLanguage() {
        const lang = navigator.language || navigator.userLanguage;
        const shortLang = lang.split('-')[0].toLowerCase();
        return SUPPORTED_LANGUAGES.includes(shortLang) ? shortLang : DEFAULT_LANGUAGE;
    }

    /**
     * Get the user's saved language preference
     */
    function getSavedLanguage() {
        try {
            return localStorage.getItem(STORAGE_KEY);
        } catch (e) {
            return null;
        }
    }

    /**
     * Save the user's language preference
     */
    function saveLanguage(lang) {
        try {
            localStorage.setItem(STORAGE_KEY, lang);
        } catch (e) {
            console.warn('Could not save language preference');
        }
    }

    /**
     * Get the current effective language
     */
    function getCurrentLanguage() {
        return isEnglishPage() ? 'en' : 'ar';
    }

    /**
     * Get the target page for a language switch
     */
    function getTargetPage(targetLang) {
        const currentPage = getCurrentPage();
        const currentLang = getCurrentLanguage();

        if (currentLang === targetLang) {
            return null; // Already on correct language
        }

        // Check if we have a mapped page
        if (PAGE_MAP[currentPage]) {
            return PAGE_MAP[currentPage];
        }

        // For pages not in the map, try to construct the URL
        if (targetLang === 'en' && !currentPage.includes('-en.html')) {
            return currentPage.replace('.html', '-en.html');
        } else if (targetLang === 'ar' && currentPage.includes('-en.html')) {
            return currentPage.replace('-en.html', '.html');
        }

        return null;
    }

    /**
     * Switch to a different language
     */
    function switchLanguage(targetLang) {
        if (!SUPPORTED_LANGUAGES.includes(targetLang)) {
            console.warn('Unsupported language:', targetLang);
            return;
        }

        saveLanguage(targetLang);

        const targetPage = getTargetPage(targetLang);
        if (targetPage) {
            // Preserve query string and hash
            const queryString = window.location.search;
            const hash = window.location.hash;
            window.location.href = targetPage + queryString + hash;
        }
    }

    /**
     * Initialize language detection and redirect if needed
     */
    function init() {
        const savedLang = getSavedLanguage();
        const currentLang = getCurrentLanguage();

        // If user has already saved a language preference, respect it
        // BUT if they directly navigated to an English page, update their preference
        if (savedLang) {
            // User has a saved preference - update it to match current page
            // This ensures that if user clicks a link to English page, we remember that
            if (savedLang !== currentLang) {
                saveLanguage(currentLang);
            }
            return; // Don't redirect - user has made a choice before
        }

        // Save current language preference (no auto-redirect for performance)
        saveLanguage(currentLang);
    }

    // Expose switchLanguage globally
    window.switchLanguage = switchLanguage;
    window.MCPrimeLang = {
        switch: switchLanguage,
        getCurrent: getCurrentLanguage,
        getSaved: getSavedLanguage,
        getBrowser: getBrowserLanguage
    };

    // Initialize on page load
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
