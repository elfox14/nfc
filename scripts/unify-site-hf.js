const fs = require('fs');
const path = require('path');

const rootDir = path.resolve(__dirname, '..');

const AR_NAV = `    <!-- Navbar -->
    <nav class="navbar" id="navbar">
        <div class="container nav-content">
            <a href="index.html" class="nav-logo" aria-label="الرئيسية - MC PRIME">
                <img src="mc-prime-nfc.png" alt="MC PRIME - بطاقات العمل الذكية" loading="eager" width="60" height="60" style="height: 48px; width: auto;">
            </a>
            <ul class="nav-links" id="nav-links">
                <li><a href="index.html#features">المميزات</a></li>
                <li><a href="index.html#how-it-works">كيف يعمل</a></li>
                <li><a href="gallery.html">المعرض</a></li>
                <li><a href="blog.html">المدونة</a></li>
                <li><a href="dashboard.html">لوحة التحكم</a></li>
                <li><a href="contact.html">اتصل بنا</a></li>
            </ul>
            <div style="display: flex; align-items: center; gap: 0.75rem;">
                <button onclick="switchLanguage('en')" class="lang-btn" aria-label="Switch to English">EN</button>
                <a href="editor.html" class="btn btn-primary nav-cta">ابدأ الآن</a>
            </div>
            <div class="nav-toggle" id="nav-toggle" aria-label="فتح القائمة">
                <span></span>
                <span></span>
                <span></span>
            </div>
        </div>
    </nav>`;

const EN_NAV = `    <!-- Navbar -->
    <nav class="navbar" id="navbar">
        <div class="container nav-content">
            <a href="index-en.html" class="nav-logo" aria-label="Home - MC PRIME">
                <img src="mc-prime-nfc.png" alt="MC PRIME - Smart Business Cards" loading="eager" width="60" height="60" style="height: 48px; width: auto;">
            </a>
            <ul class="nav-links" id="nav-links">
                <li><a href="index-en.html#features">Features</a></li>
                <li><a href="index-en.html#how-it-works">How It Works</a></li>
                <li><a href="gallery-en.html">Gallery</a></li>
                <li><a href="blog-en.html">Blog</a></li>
                <li><a href="dashboard-en.html">Dashboard</a></li>
                <li><a href="contact-en.html">Contact</a></li>
            </ul>
            <div style="display: flex; align-items: center; gap: 0.75rem;">
                <button onclick="switchLanguage('ar')" class="lang-btn" aria-label="التبديل إلى العربية">عربي</button>
                <a href="editor-en.html" class="btn btn-primary nav-cta">Get Started</a>
            </div>
            <div class="nav-toggle" id="nav-toggle" aria-label="Open menu">
                <span></span>
                <span></span>
                <span></span>
            </div>
        </div>
    </nav>`;

const AR_FOOTER = `    <!-- Footer -->
    <footer class="site-footer" role="contentinfo">
        <div class="container">
            <div class="footer-content">
                <div class="footer-section">
                    <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 1rem;">
                        <img src="mc-prime-nfc.png" alt="MC PRIME Logo" style="height: 40px; width: auto;">
                        <span style="font-family: var(--font-headings); font-weight: 800; font-size: 1.3rem; color: var(--text-primary-color, #f0f6fc);">MC PRIME</span>
                    </div>
                    <p>نقدم أرقى حلول بطاقات العمل الذكية NFC و QR Code بتصميم تنفيذي فاخر وتكنولوجيا متطورة تليق بعلامتك التجارية.</p>
                </div>
                <div class="footer-section">
                    <h3>روابط سريعة</h3>
                    <ul role="list">
                        <li><a href="index.html">الرئيسية</a></li>
                        <li><a href="gallery.html">معرض القوالب</a></li>
                        <li><a href="blog.html">المدونة والمقالات</a></li>
                        <li><a href="dashboard.html">لوحة التحكم</a></li>
                        <li><a href="editor.html">محرر البطاقات</a></li>
                    </ul>
                </div>
                <div class="footer-section">
                    <h3>الحلول والخدمات</h3>
                    <ul role="list">
                        <li><a href="nfc-for-companies.html">بطاقات الشركات</a></li>
                        <li><a href="nfc-for-freelancers.html">بطاقات المستقلين</a></li>
                        <li><a href="nfc-for-restaurants.html">قوائم المطاعم الذكية</a></li>
                        <li><a href="how-to-use-editor.html">دليل استخدام المحرر</a></li>
                    </ul>
                </div>
                <div class="footer-section">
                    <h3>الدعم والقانونية</h3>
                    <ul role="list">
                        <li><a href="contact.html">اتصل بنا</a></li>
                        <li><a href="privacy.html">سياسة الخصوصية</a></li>
                        <li><a href="terms.html">شروط الاستخدام</a></li>
                        <li><a href="about.html">من نحن</a></li>
                    </ul>
                    <div class="social-links" style="margin-top: 1.2rem;">
                        <a href="https://facebook.com/mcprime" target="_blank" rel="noopener noreferrer" aria-label="فيسبوك" title="فيسبوك">
                            <i class="fab fa-facebook-f" aria-hidden="true"></i>
                        </a>
                        <a href="https://instagram.com/mcprime" target="_blank" rel="noopener noreferrer" aria-label="إنستغرام" title="إنستغرام">
                            <i class="fab fa-instagram" aria-hidden="true"></i>
                        </a>
                        <a href="https://linkedin.com/company/mcprime" target="_blank" rel="noopener noreferrer" aria-label="لينكد إن" title="لينكد إن">
                            <i class="fab fa-linkedin-in" aria-hidden="true"></i>
                        </a>
                    </div>
                </div>
            </div>
            <div class="footer-bottom">
                <p>&copy; <span id="footer-year">2026</span> MC PRIME. جميع الحقوق محفوظة.</p>
            </div>
        </div>
    </footer>`;

const EN_FOOTER = `    <!-- Footer -->
    <footer class="site-footer" role="contentinfo">
        <div class="container">
            <div class="footer-content">
                <div class="footer-section">
                    <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 1rem;">
                        <img src="mc-prime-nfc.png" alt="MC PRIME Logo" style="height: 40px; width: auto;">
                        <span style="font-family: var(--font-headings); font-weight: 800; font-size: 1.3rem; color: var(--text-primary-color, #f0f6fc);">MC PRIME</span>
                    </div>
                    <p>Elevate your professional identity with luxury executive NFC & QR digital smart business cards.</p>
                </div>
                <div class="footer-section">
                    <h3>Quick Links</h3>
                    <ul role="list">
                        <li><a href="index-en.html">Home</a></li>
                        <li><a href="gallery-en.html">Template Gallery</a></li>
                        <li><a href="blog-en.html">Blog & Insights</a></li>
                        <li><a href="dashboard-en.html">Dashboard</a></li>
                        <li><a href="editor-en.html">Card Editor</a></li>
                    </ul>
                </div>
                <div class="footer-section">
                    <h3>Solutions</h3>
                    <ul role="list">
                        <li><a href="nfc-for-companies-en.html">For Companies</a></li>
                        <li><a href="nfc-for-freelancers-en.html">For Freelancers</a></li>
                        <li><a href="nfc-for-restaurants-en.html">For Restaurants</a></li>
                        <li><a href="how-to-use-editor-en.html">Editor Guide</a></li>
                    </ul>
                </div>
                <div class="footer-section">
                    <h3>Support & Legal</h3>
                    <ul role="list">
                        <li><a href="contact-en.html">Contact Us</a></li>
                        <li><a href="privacy-en.html">Privacy Policy</a></li>
                        <li><a href="terms-en.html">Terms of Service</a></li>
                        <li><a href="about-en.html">About Us</a></li>
                    </ul>
                    <div class="social-links" style="margin-top: 1.2rem;">
                        <a href="https://facebook.com/mcprime" target="_blank" rel="noopener noreferrer" aria-label="Facebook" title="Facebook">
                            <i class="fab fa-facebook-f" aria-hidden="true"></i>
                        </a>
                        <a href="https://instagram.com/mcprime" target="_blank" rel="noopener noreferrer" aria-label="Instagram" title="Instagram">
                            <i class="fab fa-instagram" aria-hidden="true"></i>
                        </a>
                        <a href="https://linkedin.com/company/mcprime" target="_blank" rel="noopener noreferrer" aria-label="LinkedIn" title="LinkedIn">
                            <i class="fab fa-linkedin-in" aria-hidden="true"></i>
                        </a>
                    </div>
                </div>
            </div>
            <div class="footer-bottom">
                <p>&copy; <span id="footer-year">2026</span> MC PRIME. All rights reserved.</p>
            </div>
        </div>
    </footer>`;

// Color replacements map
const colorReplacements = [
    { from: /#4da6ff/gi, to: '#c5a059' },
    { from: /#00e5ff/gi, to: '#d4af37' },
    { from: /#364f6b/gi, to: '#21262d' },
    { from: /#0b131e/gi, to: '#0d1117' },
    { from: /#1c2a3b/gi, to: '#0d1117' },
    { from: /#243447/gi, to: '#161b22' },
    { from: /rgba\(\s*77\s*,\s*166\s*,\s*255\s*,\s*([0-9.]+)\s*\)/gi, to: 'rgba(197, 160, 89, $1)' },
    { from: /rgba\(\s*0\s*,\s*229\s*,\s*255\s*,\s*([0-9.]+)\s*\)/gi, to: 'rgba(212, 175, 55, $1)' },
    { from: /rgba\(\s*36\s*,\s*52\s*,\s*71\s*,\s*([0-9.]+)\s*\)/gi, to: 'rgba(22, 27, 34, $1)' },
    { from: /rgba\(\s*28\s*,\s*42\s*,\s*59\s*,\s*([0-9.]+)\s*\)/gi, to: 'rgba(22, 27, 34, $1)' }
];

function replaceColors(str) {
    let res = str;
    for (const r of colorReplacements) {
        res = res.replace(r.from, r.to);
    }
    return res;
}

const htmlFiles = fs.readdirSync(rootDir).filter(f => f.endsWith('.html'));

htmlFiles.forEach(file => {
    // Skip special non-page files if any
    const filePath = path.join(rootDir, file);
    let html = fs.readFileSync(filePath, 'utf8');
    const isEn = file.includes('-en');
    const isEditor = file.startsWith('editor');
    const isViewer = file.startsWith('viewer');
    const isOffline = file === 'offline.html';
    const isAdmin = file === 'admin.html';

    // 1. Replace old inline neon colors with Obsidian & Gold
    html = replaceColors(html);

    // 2. Ensure Font Awesome and core styles are linked if missing
    if (!html.includes('all.min.css') && !html.includes('font-awesome')) {
        html = html.replace('</head>', '    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.2/css/all.min.css">\n</head>');
    }
    if (!html.includes('homepage.css') && !isEditor && !isViewer && !isAdmin) {
        html = html.replace('</head>', '    <link rel="stylesheet" href="homepage.css">\n</head>');
    }
    if (!html.includes('premium-ui.css')) {
        html = html.replace('</head>', '    <link rel="stylesheet" href="premium-ui.css">\n</head>');
    }
    if (!html.includes('lang-switcher.js') && !isEditor && !isViewer && !isAdmin) {
        html = html.replace('</head>', '    <script src="lang-switcher.js" defer></script>\n</head>');
    }

    // 3. Navbar injection / unification
    if (!isEditor && !isViewer && !isAdmin && !isOffline) {
        const targetNav = isEn ? EN_NAV : AR_NAV;
        // Check if page already has <nav ...> or <header ...>
        if (html.includes('<nav class="navbar"') || html.includes('<nav id="navbar"') || html.includes('<nav class="header"') || html.includes('<header class="navbar"')) {
            // Replace existing navbar with standard navbar
            html = html.replace(/<nav[^>]*class=["'][^"']*navbar[^"']*["'][^>]*>[\s\S]*?<\/nav>/i, targetNav);
        } else if (html.includes('<nav')) {
            html = html.replace(/<nav[\s\S]*?<\/nav>/i, targetNav);
        } else {
            // Insert after <body> or after noscript / progress bars
            if (html.includes('<main')) {
                html = html.replace('<main', `${targetNav}\n    <main`);
            } else if (html.includes('<div class="container"')) {
                html = html.replace('<div class="container"', `${targetNav}\n    <div class="container"`);
            } else if (html.includes('<body>')) {
                html = html.replace('<body>', `<body>\n${targetNav}`);
            }
        }
    }

    // 4. Footer injection / unification
    if (!isViewer && !isAdmin && !isOffline) {
        const targetFooter = isEn ? EN_FOOTER : AR_FOOTER;
        if (html.includes('<footer')) {
            html = html.replace(/<footer[\s\S]*?<\/footer>/i, targetFooter);
        } else {
            // Insert before </body> or before scripts
            if (html.includes('</body>')) {
                html = html.replace('</body>', `${targetFooter}\n</body>`);
            }
        }
    }

    // 5. Ensure core helper scripts are loaded before </body>
    if (!html.includes('premium-ui.js')) {
        html = html.replace('</body>', '    <script src="premium-ui.js" defer></script>\n</body>');
    }
    if (!html.includes('cookie-consent.js') && !isEditor && !isViewer && !isAdmin) {
        html = html.replace('</body>', '    <script src="cookie-consent.js" defer></script>\n</body>');
    }

    fs.writeFileSync(filePath, html, 'utf8');
    console.log(`Updated: ${file}`);
});

console.log('All HTML files standardized successfully!');
