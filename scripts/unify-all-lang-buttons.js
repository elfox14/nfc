const fs = require('fs');
const path = require('path');

const rootDir = path.resolve(__dirname, '..');

// 1. UPDATE lang-switcher.original.js
const langSwitcherPath = path.join(rootDir, 'lang-switcher.original.js');

const newLangSwitcherContent = `/**
 * MC PRIME Language Switcher
 * Handles automatic language detection and manual language switching across all pages
 */

(function () {
    'use strict';

    var STORAGE_KEY = 'mcprime_lang';
    var SUPPORTED_LANGUAGES = ['ar', 'en'];
    var DEFAULT_LANGUAGE = 'ar';

    // Comprehensive bidirectional mapping between Arabic and English pages (both with .html and clean names)
    var PAGE_MAP = {
        // Core Pages
        'index.html': 'index-en.html',
        'index-en.html': 'index.html',
        'index': 'index-en.html',
        'index-en': 'index.html',
        '': 'index-en.html',

        'editor.html': 'editor-en.html',
        'editor-en.html': 'editor.html',
        'editor': 'editor-en.html',
        'editor-en': 'editor.html',

        'gallery.html': 'gallery-en.html',
        'gallery-en.html': 'gallery.html',
        'gallery': 'gallery-en.html',
        'gallery-en': 'gallery.html',

        'dashboard.html': 'dashboard-en.html',
        'dashboard-en.html': 'dashboard.html',
        'dashboard': 'dashboard-en.html',
        'dashboard-en': 'dashboard.html',

        'contact.html': 'contact-en.html',
        'contact-en.html': 'contact.html',
        'contact': 'contact-en.html',
        'contact-en': 'contact.html',

        'privacy.html': 'privacy-en.html',
        'privacy-en.html': 'privacy.html',
        'privacy': 'privacy-en.html',
        'privacy-en': 'privacy.html',

        'terms.html': 'terms-en.html',
        'terms-en.html': 'terms.html',
        'terms': 'terms-en.html',
        'terms-en': 'terms.html',

        'about.html': 'about-en.html',
        'about-en.html': 'about.html',
        'about': 'about-en.html',
        'about-en': 'about.html',

        'how-to-use-editor.html': 'how-to-use-editor-en.html',
        'how-to-use-editor-en.html': 'how-to-use-editor.html',
        'how-to-use-editor': 'how-to-use-editor-en.html',
        'how-to-use-editor-en': 'how-to-use-editor.html',

        'login.html': 'login-en.html',
        'login-en.html': 'login.html',
        'login': 'login-en.html',
        'login-en': 'login.html',

        'signup.html': 'signup-en.html',
        'signup-en.html': 'signup.html',
        'signup': 'signup-en.html',
        'signup-en': 'signup.html',

        'viewer.html': 'viewer-en.html',
        'viewer-en.html': 'viewer.html',
        'viewer': 'viewer-en.html',
        'viewer-en': 'viewer.html',

        // Blog Hub
        'blog.html': 'blog-en.html',
        'blog-en.html': 'blog.html',
        'blog': 'blog-en.html',
        'blog-en': 'blog.html',

        // Blog Articles
        'blog-nfc-at-events.html': 'blog-nfc-at-events-en.html',
        'blog-nfc-at-events-en.html': 'blog-nfc-at-events.html',
        'blog-nfc-at-events': 'blog-nfc-at-events-en.html',
        'blog-nfc-at-events-en': 'blog-nfc-at-events.html',

        'blog-digital-menus-for-restaurants.html': 'blog-digital-menus-for-restaurants-en.html',
        'blog-digital-menus-for-restaurants-en.html': 'blog-digital-menus-for-restaurants.html',
        'blog-digital-menus-for-restaurants': 'blog-digital-menus-for-restaurants-en.html',
        'blog-digital-menus-for-restaurants-en': 'blog-digital-menus-for-restaurants.html',

        'blog-business-card-mistakes.html': 'blog-business-card-mistakes-en.html',
        'blog-business-card-mistakes-en.html': 'blog-business-card-mistakes.html',
        'blog-business-card-mistakes': 'blog-business-card-mistakes-en.html',
        'blog-business-card-mistakes-en': 'blog-business-card-mistakes.html',

        // Landing Pages / Personas
        'nfc-for-freelancers.html': 'nfc-for-freelancers-en.html',
        'nfc-for-freelancers-en.html': 'nfc-for-freelancers.html',
        'nfc-for-freelancers': 'nfc-for-freelancers-en.html',
        'nfc-for-freelancers-en': 'nfc-for-freelancers.html',

        'nfc-for-companies.html': 'nfc-for-companies-en.html',
        'nfc-for-companies-en.html': 'nfc-for-companies.html',
        'nfc-for-companies': 'nfc-for-companies-en.html',
        'nfc-for-companies-en': 'nfc-for-companies.html',

        'nfc-for-companies-egypt.html': 'nfc-for-companies-egypt-en.html',
        'nfc-for-companies-egypt-en.html': 'nfc-for-companies-egypt.html',
        'nfc-for-companies-egypt': 'nfc-for-companies-egypt-en.html',
        'nfc-for-companies-egypt-en': 'nfc-for-companies-egypt.html',

        'nfc-for-companies-saudi.html': 'nfc-for-companies-saudi-en.html',
        'nfc-for-companies-saudi-en.html': 'nfc-for-companies-saudi.html',
        'nfc-for-companies-saudi': 'nfc-for-companies-saudi-en.html',
        'nfc-for-companies-saudi-en': 'nfc-for-companies-saudi.html',

        'nfc-for-companies-uae.html': 'nfc-for-companies-uae-en.html',
        'nfc-for-companies-uae-en.html': 'nfc-for-companies-uae.html',
        'nfc-for-companies-uae': 'nfc-for-companies-uae-en.html',
        'nfc-for-companies-uae-en': 'nfc-for-companies-uae.html',

        'nfc-for-restaurants.html': 'nfc-for-restaurants-en.html',
        'nfc-for-restaurants-en.html': 'nfc-for-restaurants.html',
        'nfc-for-restaurants': 'nfc-for-restaurants-en.html',
        'nfc-for-restaurants-en': 'nfc-for-restaurants.html',

        // Auth single pages
        'forgot-password.html': 'login-en.html',
        'reset-password.html': 'login-en.html',
        'verify-email.html': 'login-en.html',
        '404.html': 'index-en.html',
        '500.html': 'index-en.html'
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
        if (page.indexOf('-en') !== -1) return true;
        var htmlLang = document.documentElement ? document.documentElement.getAttribute('lang') : null;
        if (htmlLang === 'en') return true;
        if (htmlLang === 'ar') return false;
        return false;
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

        // 1. Direct match in PAGE_MAP
        if (PAGE_MAP[currentPage]) {
            return PAGE_MAP[currentPage];
        }

        // 2. Try with .html extension if clean url
        if (currentPage.indexOf('.html') === -1 && PAGE_MAP[currentPage + '.html']) {
            return PAGE_MAP[currentPage + '.html'];
        }

        // 3. Dynamic resolution
        if (targetLang === 'en') {
            if (currentPage.indexOf('-en') !== -1) {
                return currentPage;
            }
            if (currentPage.indexOf('.html') !== -1) {
                return currentPage.replace('.html', '-en.html');
            }
            return currentPage + '-en.html';
        } else if (targetLang === 'ar') {
            if (currentPage.indexOf('-en.html') !== -1) {
                return currentPage.replace('-en.html', '.html');
            }
            if (currentPage.indexOf('-en') !== -1) {
                return currentPage.replace('-en', '');
            }
            return 'index.html';
        }

        return 'index.html';
    }

    /**
     * Switch language and redirect seamlessly
     */
    function switchLanguage(targetLang) {
        if (!targetLang) {
            targetLang = isEnglishPage() ? 'ar' : 'en';
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
        var buttons = document.querySelectorAll('.lang-btn, [data-action="switch-lang"], #lang-toggle-btn, .tb-lang');
        buttons.forEach(function (btn) {
            btn.addEventListener('click', function (e) {
                var target = btn.getAttribute('data-lang');
                if (!target) {
                    var text = (btn.textContent || '').trim().toLowerCase();
                    if (text.includes('en') || text.includes('english')) {
                        target = 'en';
                    } else if (text.includes('عربي') || text.includes('ar')) {
                        target = 'ar';
                    } else {
                        target = isEnglishPage() ? 'ar' : 'en';
                    }
                }
                saveLanguage(target);
                var targetPage = getTargetPage(target);
                if (targetPage) {
                    e.preventDefault();
                    var search = window.location.search || '';
                    var hash = window.location.hash || '';
                    window.location.href = targetPage + search + hash;
                }
            });
        });
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', setupLangButtons);
    } else {
        setupLangButtons();
    }
})();
`;

fs.writeFileSync(langSwitcherPath, newLangSwitcherContent, 'utf8');
console.log('Updated lang-switcher.original.js with robust routing.');

// 2. AUDIT & UPDATE ALL HTML FILES
const allHtmlFiles = fs.readdirSync(rootDir).filter(f => f.endsWith('.html'));

allHtmlFiles.forEach(file => {
    const filePath = path.join(rootDir, file);
    let content = fs.readFileSync(filePath, 'utf8');
    const isEn = file.includes('-en.html') || file.includes('-en');
    
    // Determine target counterpart file
    let counterpart = '';
    if (isEn) {
        counterpart = file.replace('-en.html', '.html').replace('-en', '');
        if (!fs.existsSync(path.join(rootDir, counterpart))) {
            counterpart = 'index.html';
        }
    } else {
        counterpart = file.replace('.html', '-en.html');
        if (!fs.existsSync(path.join(rootDir, counterpart))) {
            counterpart = 'index-en.html';
        }
    }

    // Skip editor files from navbar replacement (they have special toolbar)
    if (file === 'editor.html' || file === 'editor-en.html') {
        // Ensure script is loaded
        if (!content.includes('lang-switcher.js')) {
            content = content.replace('</head>', '    <script src="lang-switcher.js"></script>\n</head>');
            fs.writeFileSync(filePath, content, 'utf8');
        }
        return;
    }

    const targetLang = isEn ? 'ar' : 'en';
    const label = isEn ? 'عربي' : 'EN';
    const ariaLabel = isEn ? 'التبديل إلى العربية' : 'Switch to English';

    // Standard replacement for language button in navbar
    const standardAnchor = `<a href="${counterpart}" class="lang-btn" aria-label="${ariaLabel}" onclick="if(window.switchLanguage){switchLanguage('${targetLang}');return false;}">${label}</a>`;

    // Replace any old button or anchor in navbar
    let updated = false;

    // Pattern 1: <button onclick="switchLanguage('...')" class="lang-btn"...>...</button>
    const buttonRegex = /<button[^>]*?(?:switchLanguage|lang-btn)[^>]*?>[\s\S]*?<\/button>/gi;
    if (buttonRegex.test(content)) {
        content = content.replace(buttonRegex, standardAnchor);
        updated = true;
    }

    // Pattern 2: <a href="..." class="lang-btn"...>...</a>
    const anchorRegex = /<a[^>]*?class=["'][^"']*lang-btn[^"']*["'][^>]*?>[\s\S]*?<\/a>/gi;
    if (anchorRegex.test(content)) {
        content = content.replace(anchorRegex, standardAnchor);
        updated = true;
    }

    // Ensure lang-switcher.js is in head
    if (!content.includes('lang-switcher.js') && file !== 'admin.html') {
        content = content.replace('</head>', '    <script src="lang-switcher.js" defer></script>\n</head>');
        updated = true;
    }

    if (updated) {
        fs.writeFileSync(filePath, content, 'utf8');
        console.log(`Updated language button in ${file} -> ${counterpart} (${label})`);
    }
});
