const fs = require('fs');
const path = require('path');

const rootDir = path.resolve(__dirname, '..');
const allHtmlFiles = fs.readdirSync(rootDir).filter(f => f.endsWith('.html'));

// Build explicit full mapping
const completeMap = {
    // Core pages
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

    // Blog
    'blog.html': 'blog-en.html',
    'blog-en.html': 'blog.html',
    'blog-nfc-at-events.html': 'blog-nfc-at-events-en.html',
    'blog-nfc-at-events-en.html': 'blog-nfc-at-events.html',
    'blog-digital-menus-for-restaurants.html': 'blog-digital-menus-for-restaurants-en.html',
    'blog-digital-menus-for-restaurants-en.html': 'blog-digital-menus-for-restaurants.html',
    'blog-business-card-mistakes.html': 'blog-business-card-mistakes-en.html',
    'blog-business-card-mistakes-en.html': 'blog-business-card-mistakes.html',

    // Personas & Landing pages
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

// Check if any HTML files have counterpart without being in mapping
allHtmlFiles.forEach(file => {
    if (!completeMap[file]) {
        if (file.endsWith('-en.html')) {
            const ar = file.replace('-en.html', '.html');
            if (fs.existsSync(path.join(rootDir, ar))) {
                completeMap[file] = ar;
                completeMap[ar] = file;
            }
        } else {
            const en = file.replace('.html', '-en.html');
            if (fs.existsSync(path.join(rootDir, en))) {
                completeMap[file] = en;
                completeMap[en] = file;
            }
        }
    }
});

console.log('Complete map verified. Count of mapped files:', Object.keys(completeMap).length);
