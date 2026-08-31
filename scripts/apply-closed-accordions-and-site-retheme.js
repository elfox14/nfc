const fs = require('fs');
const path = require('path');

const rootDir = path.resolve(__dirname, '..');

// 1. UPDATE editor.html and editor-en.html: CLOSE ALL ACCORDIONS BY DEFAULT
['editor.html', 'editor-en.html'].forEach(filename => {
    const filePath = path.join(rootDir, filename);
    if (!fs.existsSync(filePath)) return;
    let html = fs.readFileSync(filePath, 'utf8');

    // Replace details open tags to closed
    html = html.replace(/<details([^>]*?)\bopen\b([^>]*?)>/gi, (match, p1, p2) => {
        const cleaned = `<details${p1}${p2}>`.replace(/\s{2,}/g, ' ');
        return cleaned;
    });

    fs.writeFileSync(filePath, html, 'utf8');
    console.log(`✓ Closed all default accordions in ${filename}`);
});

// 2. ENHANCE script-ui.original.js UIManager.navigateToAndHighlight
const scriptUiPath = path.join(rootDir, 'script-ui.original.js');
let scriptUi = fs.readFileSync(scriptUiPath, 'utf8');

const oldNavigate = `    navigateToAndHighlight(elementId) {
        const targetElement = document.getElementById(elementId);
        if (!targetElement) return;

        const parentAccordion = targetElement.closest("details");
        if (parentAccordion && !parentAccordion.open) {
            parentAccordion.open = true;
        }

        setTimeout(() => {
            const highlightTarget = targetElement.closest(".fieldset, .form-group, .dynamic-input-group") || targetElement;
            const scrollContainer = highlightTarget.closest(".pro-sidebar");
            if (scrollContainer) {
                const targetRect = highlightTarget.getBoundingClientRect();
                const containerRect = scrollContainer.getBoundingClientRect();
                const scrollTop = scrollContainer.scrollTop + (targetRect.top - containerRect.top) - 60;
                scrollContainer.scrollTo({ top: scrollTop, behavior: "smooth" });
            } else {
                highlightTarget.scrollIntoView({ behavior: "smooth", block: "center" });
            }
            highlightTarget.classList.add("form-element-highlighted");
            setTimeout(() => { highlightTarget.classList.remove("form-element-highlighted"); }, 2000);
        }, 150);
    },`;

const newNavigate = `    navigateToAndHighlight(elementId) {
        const targetElement = document.getElementById(elementId);
        if (!targetElement) return;

        // Find parent accordion (or if target itself is details)
        const parentAccordion = targetElement.tagName === 'DETAILS' ? targetElement : targetElement.closest("details");
        if (parentAccordion) {
            // Close other top-level accordions in the same sidebar for a clean single-open accordion feel
            const sidebar = parentAccordion.closest(".pro-sidebar");
            if (sidebar) {
                sidebar.querySelectorAll("details.accordion-card, details.fieldset-accordion").forEach(d => {
                    if (d !== parentAccordion) d.open = false;
                });
            }
            parentAccordion.open = true;
        }

        setTimeout(() => {
            const highlightTarget = targetElement.closest(".fieldset, .form-group, .dynamic-input-group, .accordion-card") || targetElement;
            const scrollContainer = highlightTarget.closest(".pro-sidebar");
            if (scrollContainer) {
                const targetRect = highlightTarget.getBoundingClientRect();
                const containerRect = scrollContainer.getBoundingClientRect();
                const scrollTop = scrollContainer.scrollTop + (targetRect.top - containerRect.top) - 60;
                scrollContainer.scrollTo({ top: scrollTop, behavior: "smooth" });
            } else {
                highlightTarget.scrollIntoView({ behavior: "smooth", block: "center" });
            }
            highlightTarget.classList.add("form-element-highlighted");
            setTimeout(() => { highlightTarget.classList.remove("form-element-highlighted"); }, 2000);
        }, 150);
    },`;

if (scriptUi.includes(oldNavigate)) {
    scriptUi = scriptUi.replace(oldNavigate, newNavigate);
    fs.writeFileSync(scriptUiPath, scriptUi, 'utf8');
    console.log('✓ Enhanced UIManager.navigateToAndHighlight in script-ui.original.js');
}

// 3. ENHANCE script-main.original.js card click listeners
const scriptMainPath = path.join(rootDir, 'script-main.original.js');
let scriptMain = fs.readFileSync(scriptMainPath, 'utf8');

const targetSection = `        if (DOMElements.draggable.logo) DOMElements.draggable.logo.addEventListener('click', (e) => navigateToTarget(e, 'logo-drop-zone'));
        if (DOMElements.draggable.photo) DOMElements.draggable.photo.addEventListener('click', (e) => navigateToTarget(e, 'photo-controls-fieldset'));
        if (DOMElements.draggable.name) DOMElements.draggable.name.addEventListener('click', (e) => navigateToTarget(e, 'name-accordion'));
        if (DOMElements.draggable.tagline) DOMElements.draggable.tagline.addEventListener('click', (e) => navigateToTarget(e, 'tagline-accordion'));
        if (DOMElements.draggable.qr) DOMElements.draggable.qr.addEventListener('click', (e) => navigateToTarget(e, 'qr-code-accordion'));`;

const enhancedSection = `        if (DOMElements.draggable.logo) DOMElements.draggable.logo.addEventListener('click', (e) => navigateToTarget(e, 'accordion-section-logo'));
        if (DOMElements.draggable.photo) DOMElements.draggable.photo.addEventListener('click', (e) => navigateToTarget(e, 'accordion-section-photo'));
        if (DOMElements.draggable.name) DOMElements.draggable.name.addEventListener('click', (e) => navigateToTarget(e, 'name-accordion'));
        if (DOMElements.draggable.tagline) DOMElements.draggable.tagline.addEventListener('click', (e) => navigateToTarget(e, 'tagline-accordion'));
        if (DOMElements.draggable.qr) DOMElements.draggable.qr.addEventListener('click', (e) => navigateToTarget(e, 'qr-code-accordion'));

        // Additional card elements click to open properties
        const cardPhones = document.getElementById('card-phones');
        if (cardPhones) cardPhones.addEventListener('click', (e) => navigateToTarget(e, 'phones-accordion'));

        const cardSocial = document.getElementById('card-social-links') || document.getElementById('card-social');
        if (cardSocial) cardSocial.addEventListener('click', (e) => navigateToTarget(e, 'social-accordion'));

        const cardBio = document.getElementById('card-bio');
        if (cardBio) cardBio.addEventListener('click', (e) => navigateToTarget(e, 'bio-accordion'));

        // Card Face Direct Click Handlers (Front & Back)
        const frontPreviewEl = document.getElementById('card-front-preview');
        if (frontPreviewEl) {
            frontPreviewEl.addEventListener('click', (e) => {
                if (e.target === frontPreviewEl || e.target.id === 'card-front-content' || e.target.classList.contains('card-face') || e.target.classList.contains('card-content-layer')) {
                    UIManager.navigateToAndHighlight('accordion-section-logo');
                }
            });
        }

        const backPreviewEl = document.getElementById('card-back-preview');
        if (backPreviewEl) {
            backPreviewEl.addEventListener('click', (e) => {
                if (e.target === backPreviewEl || e.target.id === 'card-back-content' || e.target.classList.contains('card-face') || e.target.classList.contains('card-content-layer')) {
                    UIManager.navigateToAndHighlight('qr-code-accordion');
                }
            });
        }`;

if (scriptMain.includes(targetSection)) {
    scriptMain = scriptMain.replace(targetSection, enhancedSection);
    fs.writeFileSync(scriptMainPath, scriptMain, 'utf8');
    console.log('✓ Added comprehensive card face & element click listeners in script-main.original.js');
}

// 4. Retheme ALL remaining legacy blue colors in CSS
const cssFiles = [
    'gallery.original.css',
    'viewer.original.css',
    'cookie-consent.original.css',
    'card-page.original.css',
    'style.original.css',
    'editor-enhancements.original.css',
    'toolbar-enhancements.original.css',
    'logo-panel.original.css',
    'ai-suggestion-panel.original.css',
    'mobile.original.css'
];

cssFiles.forEach(file => {
    const fPath = path.join(rootDir, file);
    if (!fs.existsSync(fPath)) return;
    let css = fs.readFileSync(fPath, 'utf8');
    css = css
        .replace(/rgba\(77,\s*166,\s*255,\s*([\d\.]+)\)/gi, 'rgba(197, 160, 89, $1)')
        .replace(/rgba\(59,\s*130,\s*246,\s*([\d\.]+)\)/gi, 'rgba(197, 160, 89, $1)')
        .replace(/rgba\(37,\s*99,\s*235,\s*([\d\.]+)\)/gi, 'rgba(197, 160, 89, $1)')
        .replace(/#4da6ff/gi, '#c5a059')
        .replace(/#60a5fa/gi, '#d4af37')
        .replace(/#93c5fd/gi, '#e6ca85')
        .replace(/#3b82f6/gi, '#c5a059')
        .replace(/#2563eb/gi, '#d4af37')
        .replace(/#1a6bff/gi, '#c5a059')
        .replace(/#0077ff/gi, '#d4af37');
    fs.writeFileSync(fPath, css, 'utf8');
    console.log(`✓ Rethemed ${file} to Executive Obsidian & Gold`);
});

// 5. Retheme HTML files (dashboard, blog, login, signup, admin, etc.)
const htmlFiles = [
    'dashboard.html', 'dashboard-en.html',
    'blog.html', 'blog-en.html',
    'blog-business-card-mistakes.html', 'blog-business-card-mistakes-en.html',
    'blog-digital-menus-for-restaurants.html', 'blog-digital-menus-for-restaurants-en.html',
    'blog-nfc-at-events.html', 'blog-nfc-at-events-en.html',
    'admin.html', 'admin-en.html',
    'login.html', 'login-en.html',
    'signup.html', 'signup-en.html',
    'forgot-password.html', 'reset-password.html', 'verify-email.html',
    'how-to-use-editor.html', 'how-to-use-editor-en.html',
    'contact.html', 'contact-en.html',
    'about.html', 'about-en.html',
    'privacy.html', 'terms.html',
    'nfc-for-consultants.html', 'nfc-for-doctors.html', 'nfc-for-engineers.html',
    'nfc-for-lawyers.html', 'nfc-for-restaurants.html', 'nfc-for-students.html'
];

htmlFiles.forEach(file => {
    const fPath = path.join(rootDir, file);
    if (!fs.existsSync(fPath)) return;
    let h = fs.readFileSync(fPath, 'utf8');
    h = h
        .replace(/rgba\(77,\s*166,\s*255,\s*([\d\.]+)\)/gi, 'rgba(197, 160, 89, $1)')
        .replace(/rgba\(59,\s*130,\s*246,\s*([\d\.]+)\)/gi, 'rgba(197, 160, 89, $1)')
        .replace(/rgba\(37,\s*99,\s*235,\s*([\d\.]+)\)/gi, 'rgba(197, 160, 89, $1)')
        .replace(/#4da6ff/gi, '#c5a059')
        .replace(/#60a5fa/gi, '#d4af37')
        .replace(/#93c5fd/gi, '#e6ca85')
        .replace(/#3b82f6/gi, '#c5a059')
        .replace(/#2563eb/gi, '#d4af37')
        .replace(/#1a6bff/gi, '#c5a059')
        .replace(/#0077ff/gi, '#d4af37')
        .replace(/--primary:\s*#1a73e8/gi, '--primary: #c5a059')
        .replace(/--primary-dark:\s*#1e70bf/gi, '--primary-dark: #9e7a2f')
        .replace(/--accent:\s*#00d2ff/gi, '--accent: #d4af37')
        .replace(/--bg-card:\s*rgba\(22,\s*34,\s*50,\s*0\.75\)/gi, '--bg-card: rgba(22, 27, 34, 0.75)')
        .replace(/--bg-card-hover:\s*rgba\(30,\s*47,\s*70,\s*0\.9\)/gi, '--bg-card-hover: rgba(33, 38, 45, 0.9)');
    fs.writeFileSync(fPath, h, 'utf8');
    console.log(`✓ Rethemed inline styles in ${file}`);
});
