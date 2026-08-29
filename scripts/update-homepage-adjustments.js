const fs = require('fs');
const path = require('path');

const rootDir = path.resolve(__dirname, '..');

// 1. UPDATE homepage.original.css to include all 3D card and story styles
const homepageCssPath = path.join(rootDir, 'homepage.original.css');
let homepageCss = fs.readFileSync(homepageCssPath, 'utf8');

const cardStoryStyles = `
/* ============================================================
   STORY-DRIVEN & 2-SIDED LIVE 3D CARD STYLES
   ============================================================ */
.hero-story-container {
    padding-top: 120px;
    padding-bottom: 70px;
    min-height: 85vh;
    display: flex;
    align-items: center;
}

.hero-story-split {
    display: grid;
    grid-template-columns: 1.15fr 0.85fr;
    gap: 50px;
    align-items: center;
    width: 100%;
}

.hero-story-badge {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    padding: 6px 18px;
    background: rgba(197, 160, 89, 0.12);
    border: 1px solid rgba(197, 160, 89, 0.35);
    border-radius: 50px;
    color: #c5a059;
    font-size: 0.85rem;
    font-weight: 700;
    margin-bottom: 20px;
    box-shadow: 0 4px 15px rgba(197, 160, 89, 0.1);
}

.hero-story-title {
    font-family: 'Cairo', sans-serif;
    font-size: 3rem;
    font-weight: 900;
    line-height: 1.25;
    margin-bottom: 20px;
    color: #ffffff;
}

.hero-story-title .gold-accent {
    background: linear-gradient(135deg, #ffffff 10%, #d4af37 60%, #c5a059 100%);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    display: inline-block;
}

.hero-story-desc {
    color: #8b949e;
    font-size: 1.15rem;
    line-height: 1.75;
    margin-bottom: 28px;
    max-width: 540px;
}

.hero-live-try-box {
    background: rgba(22, 27, 34, 0.85);
    border: 1px solid rgba(197, 160, 89, 0.3);
    border-radius: 16px;
    padding: 14px 18px;
    display: flex;
    gap: 12px;
    max-width: 520px;
    margin-bottom: 25px;
    box-shadow: 0 10px 30px rgba(0, 0, 0, 0.4);
    backdrop-filter: blur(10px);
}

.hero-live-try-box input {
    background: rgba(255, 255, 255, 0.04);
    border: 1px solid rgba(240, 246, 252, 0.1);
    border-radius: 10px;
    padding: 12px 16px;
    color: #ffffff;
    font-family: inherit;
    font-size: 0.95rem;
    flex: 1;
    outline: none;
    transition: border-color 0.3s;
}

.hero-live-try-box input:focus {
    border-color: #c5a059;
}

.hero-live-try-box button {
    background: linear-gradient(135deg, #d4af37, #c5a059);
    border: none;
    color: #0d1117;
    font-weight: 800;
    padding: 12px 24px;
    border-radius: 10px;
    cursor: pointer;
    font-family: 'Cairo', sans-serif;
    white-space: nowrap;
    transition: transform 0.2s, box-shadow 0.2s;
}

.hero-live-try-box button:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 15px rgba(197, 160, 89, 0.4);
}

.hero-trust-bullets {
    display: flex;
    gap: 20px;
    align-items: center;
    font-size: 0.88rem;
    color: #8b949e;
    flex-wrap: wrap;
}

.hero-trust-bullets span {
    display: flex;
    align-items: center;
    gap: 6px;
}

.hero-trust-bullets i {
    color: #c5a059;
}

/* 3D Interactive Card Stage */
.card-3d-interactive-stage {
    perspective: 1200px;
    -webkit-perspective: 1200px;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    position: relative;
    user-select: none;
}

.card-3d-flipper {
    width: 360px;
    height: 220px;
    position: relative;
    transform-style: preserve-3d;
    -webkit-transform-style: preserve-3d;
    transition: transform 0.7s cubic-bezier(0.4, 0, 0.2, 1);
    cursor: pointer;
}

.card-3d-flipper.flipped {
    transform: rotateY(180deg);
    -webkit-transform: rotateY(180deg);
}

.card-face {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    border-radius: 20px;
    backface-visibility: hidden;
    -webkit-backface-visibility: hidden;
    box-sizing: border-box;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    padding: 22px;
    box-shadow: 0 25px 60px rgba(0, 0, 0, 0.8), 0 0 40px rgba(197, 160, 89, 0.15);
    border: 1px solid rgba(197, 160, 89, 0.4);
}

.card-face-front {
    background: linear-gradient(145deg, #1a2029 0%, #0d1117 100%);
    transform: rotateY(0deg);
    -webkit-transform: rotateY(0deg);
    z-index: 2;
}

.card-top-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
}

.card-gold-chip {
    width: 44px;
    height: 32px;
    background: linear-gradient(135deg, #d4af37, #9b782b);
    border-radius: 6px;
    display: flex;
    align-items: center;
    justify-content: center;
    color: #0d1117;
    font-size: 0.85rem;
    box-shadow: inset 0 0 6px rgba(0, 0, 0, 0.4);
}

.card-brand-logo {
    font-family: 'Cairo', sans-serif;
    font-weight: 900;
    color: #c5a059;
    letter-spacing: 1.5px;
    font-size: 1.15rem;
    display: flex;
    align-items: center;
    gap: 6px;
}

.card-brand-logo img {
    height: 24px;
    width: auto;
}

.card-center-info {
    margin-top: auto;
    margin-bottom: auto;
}

.card-person-name {
    font-size: 1.25rem;
    font-weight: 800;
    color: #ffffff;
    margin-bottom: 2px;
    line-height: 1.2;
}

.card-person-title {
    color: #c5a059;
    font-size: 0.82rem;
    font-weight: 600;
}

.card-bottom-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    border-top: 1px solid rgba(240, 246, 252, 0.08);
    padding-top: 10px;
    font-size: 0.75rem;
    color: #8b949e;
}

.card-website-tag {
    color: #c5a059;
    font-weight: 700;
    letter-spacing: 0.5px;
}

.card-touch-indicator {
    display: flex;
    align-items: center;
    gap: 5px;
    color: #8b949e;
}

/* Back Face */
.card-face-back {
    background: linear-gradient(145deg, #141820 0%, #0d1117 100%);
    transform: rotateY(180deg);
    -webkit-transform: rotateY(180deg);
    z-index: 1;
    align-items: center;
    text-align: center;
    padding: 16px 20px;
}

.card-back-header {
    display: flex;
    justify-content: space-between;
    width: 100%;
    align-items: center;
    font-size: 0.78rem;
    color: #8b949e;
}

.card-back-qr-box {
    background: #ffffff;
    padding: 6px;
    border-radius: 12px;
    box-shadow: 0 8px 25px rgba(0, 0, 0, 0.5);
    display: flex;
    align-items: center;
    justify-content: center;
    margin: 4px 0;
}

.card-back-qr-box img {
    width: 74px;
    height: 74px;
    display: block;
}

.card-back-socials {
    display: flex;
    gap: 10px;
    justify-content: center;
    margin-top: 4px;
}

.card-back-social-icon {
    width: 28px;
    height: 28px;
    border-radius: 50%;
    background: rgba(197, 160, 89, 0.12);
    border: 1px solid rgba(197, 160, 89, 0.3);
    display: flex;
    align-items: center;
    justify-content: center;
    color: #c5a059;
    font-size: 0.78rem;
}

.card-flip-action-bar {
    margin-top: 18px;
    display: flex;
    gap: 12px;
    align-items: center;
}

.card-flip-btn {
    background: rgba(22, 27, 34, 0.9);
    border: 1px solid rgba(197, 160, 89, 0.35);
    color: #c5a059;
    padding: 9px 20px;
    border-radius: 50px;
    font-size: 0.85rem;
    font-weight: 700;
    cursor: pointer;
    display: inline-flex;
    align-items: center;
    gap: 8px;
    transition: all 0.3s;
    font-family: inherit;
    text-decoration: none;
}

.card-flip-btn:hover {
    background: #c5a059;
    color: #0d1117;
    box-shadow: 0 4px 15px rgba(197, 160, 89, 0.3);
}

/* 3-Step Story Journey */
.story-journey-section {
    padding: 70px 0;
    border-top: 1px solid rgba(240, 246, 252, 0.08);
}

.story-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 25px;
    margin-top: 40px;
}

.story-step-card {
    background: #161b22;
    border: 1px solid rgba(240, 246, 252, 0.08);
    border-radius: 20px;
    padding: 35px 28px;
    position: relative;
    transition: transform 0.3s, border-color 0.3s;
}

.story-step-card:hover {
    transform: translateY(-6px);
    border-color: rgba(197, 160, 89, 0.4);
    box-shadow: 0 15px 35px rgba(0, 0, 0, 0.4);
}

.story-step-num {
    position: absolute;
    top: 20px;
    left: 20px;
    font-family: 'Cairo', sans-serif;
    font-size: 2.2rem;
    font-weight: 900;
    color: rgba(197, 160, 89, 0.2);
}

[dir="ltr"] .story-step-num {
    left: auto;
    right: 20px;
}

.story-step-icon {
    width: 56px;
    height: 56px;
    border-radius: 14px;
    background: rgba(197, 160, 89, 0.12);
    border: 1px solid rgba(197, 160, 89, 0.3);
    color: #c5a059;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 1.5rem;
    margin-bottom: 22px;
}

.story-step-card h3 {
    font-family: 'Cairo', sans-serif;
    font-size: 1.35rem;
    font-weight: 800;
    margin-bottom: 12px;
    color: #ffffff;
}

.story-step-card p {
    color: #8b949e;
    font-size: 0.95rem;
    line-height: 1.65;
}

/* ROI & Comparison Matrix */
.roi-matrix-section {
    padding: 70px 0;
    border-top: 1px solid rgba(240, 246, 252, 0.08);
}

.comparison-table-wrapper {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 30px;
    margin-top: 40px;
}

.comparison-box {
    border-radius: 20px;
    padding: 35px 30px;
    position: relative;
}

.comparison-box.old-paper {
    background: rgba(22, 27, 34, 0.5);
    border: 1px solid rgba(239, 68, 68, 0.2);
}

.comparison-box.mc-prime {
    background: linear-gradient(145deg, rgba(197, 160, 89, 0.08) 0%, rgba(22, 27, 34, 0.9) 100%);
    border: 1px solid rgba(197, 160, 89, 0.4);
    box-shadow: 0 15px 40px rgba(0, 0, 0, 0.5);
}

.comparison-box h3 {
    font-family: 'Cairo', sans-serif;
    font-size: 1.5rem;
    font-weight: 800;
    margin-bottom: 20px;
    display: flex;
    align-items: center;
    gap: 10px;
}

.comparison-list {
    list-style: none;
    padding: 0;
    margin: 0;
    display: flex;
    flex-direction: column;
    gap: 14px;
}

.comparison-list li {
    display: flex;
    align-items: flex-start;
    gap: 10px;
    font-size: 0.95rem;
    color: #8b949e;
    line-height: 1.5;
}

.comparison-list li i.fa-times { color: #ef4444; margin-top: 3px; }
.comparison-list li i.fa-check { color: #10b981; margin-top: 3px; }

@media (max-width: 960px) {
    .hero-story-split {
        grid-template-columns: 1fr;
        text-align: center;
    }
    .hero-story-desc {
        margin-left: auto;
        margin-right: auto;
    }
    .hero-live-try-box {
        margin-left: auto;
        margin-right: auto;
    }
    .hero-trust-bullets {
        justify-content: center;
    }
    .story-grid {
        grid-template-columns: 1fr;
    }
    .comparison-table-wrapper {
        grid-template-columns: 1fr;
    }
}
`;

if (!homepageCss.includes('.hero-story-container')) {
    homepageCss += '\n' + cardStoryStyles;
    fs.writeFileSync(homepageCssPath, homepageCss, 'utf8');
}

// 2. ARABIC HOMEPAGE (index.html)
const arabicHtml = `<!DOCTYPE html>
<html lang="ar" dir="rtl">

<head>
    <script src="runtime-config.js?v=1.0"></script>
    <!-- SEO: Canonical + Hreflang -->
    <link rel="canonical" href="https://www.mcprim.com/nfc/" />
    <link rel="alternate" hreflang="ar" href="https://www.mcprim.com/nfc/" />
    <link rel="alternate" hreflang="en" href="https://www.mcprim.com/nfc/index-en.html" />
    <link rel="alternate" hreflang="x-default" href="https://www.mcprim.com/nfc/" />
    <!-- Google tag (gtag.js) -->
    <script async src="https://www.googletagmanager.com/gtag/js?id=G-E7G4KFZKYG"></script>
    <script src="js/gtag-config.js"></script>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Cairo:wght@600;700;800;900&family=Tajawal:wght@400;500;700;800&display=swap" rel="stylesheet">
    
    <!-- Google Tag Manager -->
    <script src="js/gtm-bootstrap.js"></script>
    <!-- End Google Tag Manager -->
    <title>بطاقة عمل NFC الذكية - صمم بطاقتك الرقمية مجانًا | MC PRIME</title>
    <meta name="description"
        content="صمم بطاقة عمل NFC الذكية مجاناً مع MC PRIME. استبدل الكروت الورقية ببطاقة ذكية فاخرة تدعم NFC و QR Code لمشاركة كافة بياناتك بلمسة واحدة.">
    <meta name="keywords"
        content="بطاقة عمل NFC, كارت NFC مصر, بطاقة عمل رقمية مجانية, تصميم كارت شخصي اونلاين, NFC business card, بطاقات ذكية, QR code بطاقة, كروت رقمية, MC PRIME">

    <meta property="og:type" content="website">
    <meta property="og:url" content="https://www.mcprim.com/nfc/">
    <meta property="og:title" content="بطاقة عمل NFC الذكية - صمم بطاقتك الرقمية مجانًا | MC PRIME">
    <meta property="og:description"
        content="صمم بطاقة عمل NFC الذكية مجاناً مع MC PRIME. إنشاء كروت رقمية احترافية بلمسة واحدة.">
    <meta property="og:image" content="https://www.mcprim.com/nfc/og-image.png">
    <meta property="og:site_name" content="MC PRIME">
    <meta property="og:locale" content="ar_AR">

    <meta property="twitter:card" content="summary_large_image">
    <meta property="twitter:url" content="https://www.mcprim.com/nfc/">
    <meta property="twitter:title" content="بطاقة عمل NFC الذكية - صمم بطاقتك الرقمية مجانًا | MC PRIME">
    <meta property="twitter:description"
        content="صمم بطاقة عمل NFC الذكية مجاناً مع MC PRIME. كروت ذكية بلمسة واحدة.">
    <meta property="twitter:image" content="https://www.mcprim.com/nfc/og-image.png">

    <script type="application/ld+json">
    {
        "@context": "https://schema.org",
        "@graph": [
            {
                "@type": "WebSite",
                "name": "MC PRIME",
                "url": "https://www.mcprim.com/nfc/"
            },
            {
                "@type": "SoftwareApplication",
                "name": "MC PRIME NFC Card Designer",
                "applicationCategory": "BusinessApplication",
                "operatingSystem": "Web",
                "offers": {
                    "@type": "Offer",
                    "price": "0",
                    "priceCurrency": "USD"
                }
            }
        ]
    }
    </script>
    <link rel="icon" id="favicon" href="mc-prime-nfc.png" type="image/png">
    <link rel="apple-touch-icon" href="mc-prime-nfc.png">

    <!-- Font Awesome -->
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.2/css/all.min.css">

    <!-- Stylesheets -->
    <link rel="stylesheet" href="homepage.css">
    <link rel="stylesheet" href="homepage-interactive.css">
    <link rel="stylesheet" href="cookie-consent.css">
    <link rel="stylesheet" href="premium-ui.css">

    <!-- Scripts -->
    <script src="lang-switcher.js" defer></script>
    <script src="auth.js?v=3.5" defer></script>
    <script src="premium-ui.js" defer></script>
</head>

<body>
    <!-- Reading Progress Bar -->
    <div class="reading-progress" id="reading-progress"></div>

    <!-- Floating CTA Button -->
    <a href="editor.html" class="floating-cta" id="floating-cta">
        <i class="fas fa-rocket"></i>
        <span>جرّب مجاناً الآن</span>
    </a>

    <!-- Back to Top Button -->
    <button class="back-to-top" id="back-to-top" aria-label="العودة للأعلى">
        <i class="fas fa-arrow-up"></i>
    </button>

    <!-- Navbar -->
    <nav class="navbar" id="navbar">
        <div class="container nav-content">
            <a href="index.html" class="nav-logo" aria-label="الرئيسية - MC PRIME">
                <img src="mc-prime-nfc.png" alt="MC PRIME - بطاقات العمل الذكية" loading="eager" width="60" height="60" style="height: 44px; width: auto;">
            </a>
            <ul class="nav-links" id="nav-links">
                <li><a href="index.html#how-it-works">كيف يعمل</a></li>
                <li><a href="index.html#comparison">المقارنة والتوفير</a></li>
                <li><a href="index.html#features">المميزات</a></li>
                <li><a href="gallery.html">المعرض</a></li>
                <li><a href="blog.html">المدونة</a></li>
                <li><a href="contact.html">اتصل بنا</a></li>
            </ul>
            <div style="display: flex; align-items: center; gap: 0.75rem;">
                <a href="index-en.html" class="lang-btn" aria-label="Switch to English" onclick="if(window.switchLanguage){switchLanguage('en');return false;}">EN</a>
                <a href="editor.html" class="btn btn-primary nav-cta">ابدأ مجاناً</a>
            </div>
            <div class="nav-toggle" id="nav-toggle" aria-label="فتح القائمة">
                <span></span>
                <span></span>
                <span></span>
            </div>
        </div>
    </nav>

    <main id="main-content" role="main">

        <!-- ===========================================
             HERO SECTION: STORY & LIVE 2-SIDED 3D CARD
             =========================================== -->
        <section id="hero" class="hero-story-container" aria-labelledby="hero-title">
            <div class="container">
                <div class="hero-story-split">
                    
                    <!-- Right Column: Story Copy & Quick Try -->
                    <div class="hero-story-copy">
                        <div class="hero-story-badge">
                            <i class="fas fa-wifi"></i> الجيل الجديد من بطاقات الأعمال الذكية
                        </div>
                        <h1 id="hero-title" class="hero-story-title">
                            بطاقة واحدة.. تصنع الفرق في <span class="gold-accent">كل لقاء عمل</span>
                        </h1>
                        <p class="hero-story-desc">
                            استبدل مئات الكروت الورقية المهملة ببطاقة ذكية فاخرة تدعم NFC و QR Code، تتيح لك مشاركة كافة بياناتك وموقعك وروابطك بلمسة واحدة على أي هاتف ذكي.
                        </p>

                        <!-- Live Interactive Name Input -->
                        <div class="hero-live-try-box">
                            <input type="text" id="live-card-input" placeholder="اكتب اسمك هنا لتجربة البطاقة فوراً..." value="" oninput="updateLiveCardName(this.value)">
                            <button onclick="window.location.href='editor.html'">صمم الآن مجاناً</button>
                        </div>

                        <!-- Trust Bullets -->
                        <div class="hero-trust-bullets">
                            <span><i class="fas fa-check-circle"></i> تصميم فوري 100% مجاناً</span>
                            <span><i class="fas fa-check-circle"></i> يعمل بدون أي تطبيق</span>
                            <span><i class="fas fa-check-circle"></i> متوافق مع Apple &amp; Android</span>
                        </div>
                    </div>

                    <!-- Left Column: 3D Two-Sided Interactive Live Card -->
                    <div class="card-3d-interactive-stage">
                        <div class="card-3d-flipper" id="live-flipper-card" onclick="toggleCardFlip()" title="انقر لقلب البطاقة">
                            
                            <!-- Front Face -->
                            <div class="card-face card-face-front">
                                <div class="card-top-row">
                                    <div class="card-gold-chip"><i class="fas fa-microchip"></i></div>
                                    <div class="card-brand-logo">
                                        <img src="mc-prime-nfc.png" alt="MC PRIME">
                                        <span>MC PRIME</span>
                                    </div>
                                </div>
                                <div class="card-center-info">
                                    <div class="card-person-name" id="card-front-name">اسمك الكامل هنا</div>
                                    <div class="card-person-title" id="card-front-title">المسمى الوظيفي / الشركة</div>
                                </div>
                                <div class="card-bottom-row">
                                    <span class="card-website-tag">www.mcprim.com</span>
                                    <span class="card-touch-indicator"><i class="fas fa-wifi"></i> Touch &amp; Connect</span>
                                </div>
                            </div>

                            <!-- Back Face -->
                            <div class="card-face card-face-back">
                                <div class="card-back-header">
                                    <span>MC PRIME NFC</span>
                                    <span style="color:var(--primary-color); font-weight:700;">#MC-88290</span>
                                </div>
                                <div class="card-back-qr-box">
                                    <img src="https://api.qrserver.com/v1/create-qr-code/?size=150x150&amp;data=https://www.mcprim.com/nfc/editor.html" alt="Scan QR Code to Open Editor" loading="eager">
                                </div>
                                <span style="font-size:0.75rem; color:#8b949e; margin-bottom:2px;">امسح الكود لتجربة المحرر فوراً</span>
                                <span class="card-website-tag" style="font-size:0.8rem;">www.mcprim.com</span>
                                <div class="card-back-socials">
                                    <div class="card-back-social-icon"><i class="fab fa-whatsapp"></i></div>
                                    <div class="card-back-social-icon"><i class="fab fa-linkedin-in"></i></div>
                                    <div class="card-back-social-icon"><i class="fab fa-instagram"></i></div>
                                    <div class="card-back-social-icon"><i class="fab fa-x-twitter"></i></div>
                                </div>
                            </div>

                        </div>

                        <!-- Card Action Controls -->
                        <div class="card-flip-action-bar">
                            <button type="button" class="card-flip-btn" id="flip-btn-action" onclick="toggleCardFlip(); return false;">
                                <i class="fas fa-sync-alt"></i> اقلب البطاقة (الوجه الخلفي / الأمامي)
                            </button>
                            <a href="editor.html" class="card-flip-btn" style="background:linear-gradient(135deg, #d4af37, #c5a059); color:#0d1117; border:none;">
                                <i class="fas fa-magic"></i> افتح في المحرر
                            </a>
                        </div>
                    </div>

                </div>
            </div>
        </section>

        <!-- ===========================================
             THE 3-STEP STORY JOURNEY
             =========================================== -->
        <section id="how-it-works" class="story-journey-section" aria-labelledby="how-it-works-title">
            <div class="container">
                <div style="text-align:center; max-width:700px; margin:0 auto 20px;">
                    <div class="hero-story-badge"><i class="fas fa-route"></i> قصة نجاح تواصلك المهني</div>
                    <h2 id="how-it-works-title" style="font-family:'Cairo'; font-size:2.4rem; font-weight:800; color:#fff;">
                        كيف تُحدث بطاقة NFC الفارق في كل لقاء عمل؟
                    </h2>
                    <p style="color:#8b949e; font-size:1.05rem;">3 لحظات بسيطة ترفع من احترافيتك وتضمن عدم ضياع أي فرصة أو عميل محتمل</p>
                </div>

                <div class="story-grid">
                    <div class="story-step-card">
                        <span class="story-step-num">01</span>
                        <div class="story-step-icon"><i class="fas fa-handshake"></i></div>
                        <h3>لحظة اللقاء الأولى</h3>
                        <p>في المؤتمرات أو الاجتماعات، أخرج بطاقتك الأنيقة والمس بها هاتف عميلك أو شريكك الجديد، دون الحاجة لتبادل أوراق تقليدية قد تُفقد أو تُهمل.</p>
                    </div>

                    <div class="story-step-card">
                        <span class="story-step-num">02</span>
                        <div class="story-step-icon"><i class="fas fa-mobile-alt"></i></div>
                        <h3>التفاعل الفوري الرقمي</h3>
                        <p>تفتح صفحة بروفايلك الرقمي فوراً في متصفح هاتف العميل بكامل روابطك وموقعك ومعرض أعمالك وبدون الحاجة لتثبيت أي برامج أو تطبيقات إضافية.</p>
                    </div>

                    <div class="story-step-card">
                        <span class="story-step-num">03</span>
                        <div class="story-step-icon"><i class="fas fa-user-check"></i></div>
                        <h3>بقاء جهة الاتصال للأبد</h3>
                        <p>يحفظ العميل رقمك وبياناتك مباشرة في سجل هاتفه بنقرة واحدة (vCard)، وكلما قمت بتحديث بياناتك ستتجدد تلقائياً لديه في أي وقت.</p>
                    </div>
                </div>
            </div>
        </section>

        <!-- ===========================================
             ROI & COMPARISON MATRIX
             =========================================== -->
        <section id="comparison" class="roi-matrix-section" aria-labelledby="comparison-title">
            <div class="container">
                <div style="text-align:center; max-width:700px; margin:0 auto 20px;">
                    <div class="hero-story-badge"><i class="fas fa-balance-scale"></i> المقارنة الذكية</div>
                    <h2 id="comparison-title" style="font-family:'Cairo'; font-size:2.4rem; font-weight:800; color:#fff;">
                        الكروت الورقية القديمة مقابل بطاقة MC PRIME
                    </h2>
                    <p style="color:#8b949e; font-size:1.05rem;">لماذا يتحول كبار التنفيذيين والشركات إلى الكروت الرقمية الذكية؟</p>
                </div>

                <div class="comparison-table-wrapper">
                    <!-- Old Paper Card -->
                    <div class="comparison-box old-paper">
                        <h3 style="color:#ef4444;"><i class="fas fa-times-circle"></i> الكروت الورقية التقليدية</h3>
                        <ul class="comparison-list">
                            <li><i class="fas fa-times"></i> <span><strong>تكاليف متكررة:</strong> طباعة مستمرة لآلاف الكروت التي تنفد سريعاً.</span></li>
                            <li><i class="fas fa-times"></i> <span><strong>تُرمى وتُفقد:</strong> 88% من الكروت الورقية تُرمى في سلة المهملات خلال أسبوع.</span></li>
                            <li><i class="fas fa-times"></i> <span><strong>صعوبة التحديث:</strong> أي تغيير في رقم أو مسمى يتطلب إعادة طباعة الدفعة بالكامل.</span></li>
                            <li><i class="fas fa-times"></i> <span><strong>إدخال يدوي ممل:</strong> يضطر العميل لكتابة أرقامك يدوياً مما يسبب فقدان التواصل.</span></li>
                            <li><i class="fas fa-times"></i> <span><strong>أثر بيئي سلبي:</strong> استهلاك كبير للأوراق والأحبار والموارد.</span></li>
                        </ul>
                    </div>

                    <!-- MC PRIME Smart Card -->
                    <div class="comparison-box mc-prime">
                        <h3 style="color:var(--primary-color);"><i class="fas fa-check-circle"></i> بطاقة MC PRIME NFC الذكية</h3>
                        <ul class="comparison-list">
                            <li><i class="fas fa-check"></i> <span><strong>بطاقة واحدة مدى الحياة:</strong> توفير أكثر من 90% من ميزانية الطباعة السنوية.</span></li>
                            <li><i class="fas fa-check"></i> <span><strong>حفظ فوري للأرقام:</strong> حفظ جهة الاتصال في الهاتف بنقرة واحدة (vCard Direct).</span></li>
                            <li><i class="fas fa-check"></i> <span><strong>تعديل فوري وسحابي:</strong> عدل رقمك أو بريدك في أي وقت ليتحدث على نفس البطاقة فوراً.</span></li>
                            <li><i class="fas fa-check"></i> <span><strong>إحصائيات وتحليلات:</strong> تعرف على عدد الزيارات والتفاعلات لبطاقتك بدقة.</span></li>
                            <li><i class="fas fa-check"></i> <span><strong>صديقة للبيئة 100%:</strong> صفر استهلاك للورق وتجربة عصرية تعكس تميزك.</span></li>
                        </ul>
                    </div>
                </div>
            </div>
        </section>

        <!-- ===========================================
             FEATURES (LUXURY BENTO GRID)
             =========================================== -->
        <section id="features" class="bento-section" style="padding:70px 0;" aria-labelledby="features-title">
            <div class="container">
                <div style="text-align:center; max-width:700px; margin:0 auto 35px;">
                    <div class="hero-story-badge"><i class="fas fa-sparkles"></i> المزايا المتكاملة</div>
                    <h2 id="features-title" style="font-family:'Cairo'; font-size:2.4rem; font-weight:800; color:#fff;">
                        كل ما يلزمك للتألق في عالم الأعمال
                    </h2>
                </div>

                <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(280px, 1fr)); gap:22px;">
                    <div class="story-step-card">
                        <div class="story-step-icon"><i class="fas fa-address-book"></i></div>
                        <h3>حفظ جهة الاتصال بنقرة واحدة</h3>
                        <p>تنزيل ملف vCard وحفظ كافة تفاصيل الاتصال (الهواتف، البريد، الروابط، والموقع) مباشرة في دفتر عناوين الهاتف.</p>
                    </div>

                    <div class="story-step-card">
                        <div class="story-step-icon"><i class="fas fa-qrcode"></i></div>
                        <h3>رمز QR عالي الدقة دائم</h3>
                        <p>رمز QR ديناميكي جاهز ومدمج يعمل كبديل سريع للأجهزة التي لا تدعم NFC، مع إمكانية وضعه في توقيع إيميلك.</p>
                    </div>

                    <div class="story-step-card">
                        <div class="story-step-icon"><i class="fas fa-cloud-upload-alt"></i></div>
                        <h3>تحديث فوري وسحابي</h3>
                        <p>لوحة تحكم سهلة وسريعة تمكنك من تعديل أي معلومة أو رابط ليظهر فوراً لجميع عملائك بدون أي تكلفة إضافية.</p>
                    </div>

                    <div class="story-step-card">
                        <div class="story-step-icon"><i class="fas fa-chart-pie"></i></div>
                        <h3>لوحة تحليلات وإحصائيات</h3>
                        <p>راقب أداء بطاقتك وتعرف على عدد الأشخاص الذين تصفحوا كارتك وتفاعلوا مع حساباتك الاجتماعية وموقعك.</p>
                    </div>
                </div>
            </div>
        </section>

        <!-- ===========================================
             FAQ SECTION (ACCORDION)
             =========================================== -->
        <section id="faq" style="padding:70px 0; border-top:1px solid rgba(240, 246, 252, 0.08);" aria-labelledby="faq-title">
            <div class="container" style="max-width:850px;">
                <div style="text-align:center; margin-bottom:35px;">
                    <div class="hero-story-badge"><i class="fas fa-question-circle"></i> الأسئلة الشائعة</div>
                    <h2 id="faq-title" style="font-family:'Cairo'; font-size:2.2rem; font-weight:800; color:#fff;">
                        كل ما تود معرفته عن بطاقات MC PRIME
                    </h2>
                </div>

                <div style="display:flex; flex-direction:column; gap:14px;">
                    <details class="story-step-card" style="padding:20px 25px; cursor:pointer;">
                        <summary style="font-weight:700; font-size:1.1rem; color:#fff; list-style:none; display:flex; justify-content:space-between; align-items:center;">
                            <span>هل يحتاج الشخص الآخر إلى تحميل أي تطبيق لقراءة بطاقتي؟</span>
                            <i class="fas fa-chevron-down" style="color:var(--primary-color); font-size:0.9rem;"></i>
                        </summary>
                        <p style="margin-top:12px; color:#8b949e; font-size:0.95rem; line-height:1.6;">
                            لا على الإطلاق! بطاقات MC PRIME تعمل مباشرة عبر تقنية NFC المدمجة في كافة هواتف iPhone و Android الحديثة. بمجرد ملامسة البطاقة يفتح الرابط تلقائياً في المتصفح. كما يتوفر رمز QR مدمج دائماً كبديل.
                        </p>
                    </details>

                    <details class="story-step-card" style="padding:20px 25px; cursor:pointer;">
                        <summary style="font-weight:700; font-size:1.1rem; color:#fff; list-style:none; display:flex; justify-content:space-between; align-items:center;">
                            <span>هل يمكنني تعديل بياناتي بعد حفظ البطاقة؟</span>
                            <i class="fas fa-chevron-down" style="color:var(--primary-color); font-size:0.9rem;"></i>
                        </summary>
                        <p style="margin-top:12px; color:#8b949e; font-size:0.95rem; line-height:1.6;">
                            نعم بكل تأكيد! الرابط المبرمج في شريحة الـ NFC سحابي، مما يعني أنه يمكنك تحديث أرقامك، بريدك، موقعك، أو منصاتك الاجتماعية في أي وقت عبر المحرر وستتحدث فوراً على نفس البطاقة دون الحاجة لإعادة طباعتها.
                        </p>
                    </details>

                    <details class="story-step-card" style="padding:20px 25px; cursor:pointer;">
                        <summary style="font-weight:700; font-size:1.1rem; color:#fff; list-style:none; display:flex; justify-content:space-between; align-items:center;">
                            <span>كيف أطلب بطاقة NFC فعلية مطبوعة؟</span>
                            <i class="fas fa-chevron-down" style="color:var(--primary-color); font-size:0.9rem;"></i>
                        </summary>
                        <p style="margin-top:12px; color:#8b949e; font-size:0.95rem; line-height:1.6;">
                            بعد تصميم بطاقتك وحفظ رابطك، يمكنك الانتقال إلى صفحة <a href="contact.html" style="color:var(--primary-color); text-decoration:none; font-weight:700;">اتصل بنا</a> وتحديد الكمية وسنقوم ببرمجة وشحن بطاقتك إلى باب منزلك مع ضمان استبدال مجاني.
                        </p>
                    </details>
                </div>
            </div>
        </section>

        <!-- ===========================================
             FINAL CTA BANNER
             =========================================== -->
        <section style="padding:80px 0; background:linear-gradient(135deg, rgba(197, 160, 89, 0.12) 0%, rgba(13, 17, 23, 0.95) 100%); border-top:1px solid rgba(197, 160, 89, 0.25); text-align:center;">
            <div class="container" style="max-width:750px;">
                <div class="hero-story-badge"><i class="fas fa-rocket"></i> انضم إلى الآلاف من رواد الأعمال</div>
                <h2 style="font-family:'Cairo'; font-size:2.6rem; font-weight:900; color:#fff; margin-bottom:16px;">
                    جاهز لترك انطباع مهني لا يُنسى؟
                </h2>
                <p style="color:#8b949e; font-size:1.15rem; margin-bottom:30px;">
                    صمم بطاقتك الذكية الآن مجاناً في أقل من دقيقتين وشارك بياناتك باحترافية تفوق التوقعات.
                </p>
                <div style="display:flex; gap:16px; justify-content:center; flex-wrap:wrap;">
                    <a href="editor.html" class="btn btn-primary btn-lg" style="font-size:1.1rem; padding:15px 35px;">
                        <i class="fas fa-paint-brush"></i> ابدأ التصميم الآن مجاناً
                    </a>
                    <a href="contact.html" class="btn btn-secondary btn-lg" style="font-size:1.1rem; padding:15px 35px;">
                        <i class="fas fa-envelope"></i> طلب بطاقة فعلية
                    </a>
                </div>
            </div>
        </section>

    </main>

    <!-- Unified Footer -->
    <footer class="site-footer">
        <div class="container footer-content">
            <div class="footer-col footer-about">
                <div class="footer-logo">
                    <img src="mc-prime-nfc.png" alt="MC PRIME" loading="lazy" width="40" height="40" style="height: 36px; width: auto;">
                    <span>MC PRIME</span>
                </div>
                <p>المنصة الرائدة لتصميم وإدارة بطاقات العمل الذكية NFC و QR Code. حلول رقمية ذكية للتواصل المهني الحديث في الوطن العربي.</p>
            </div>
            <div class="footer-col">
                <h4>روابط سريعة</h4>
                <ul>
                    <li><a href="index.html">الرئيسية</a></li>
                    <li><a href="editor.html">المحرر الذكي</a></li>
                    <li><a href="gallery.html">معرض التصاميم</a></li>
                    <li><a href="blog.html">المدونة والمقالات</a></li>
                    <li><a href="dashboard.html">لوحة التحكم</a></li>
                </ul>
            </div>
            <div class="footer-col">
                <h4>الدعم والمساعدة</h4>
                <ul>
                    <li><a href="how-to-use-editor.html">دليل استخدام المحرر</a></li>
                    <li><a href="contact.html">اتصل بنا</a></li>
                    <li><a href="privacy.html">سياسة الخصوصية</a></li>
                    <li><a href="terms.html">الشروط والأحكام</a></li>
                </ul>
            </div>
            <div class="footer-col">
                <h4>تواصل معنا</h4>
                <p style="font-size:0.85rem; color:var(--text-secondary-color); margin-bottom:12px;">نحن هنا لمساعدتك في إنشاء هويتك الرقمية الفاخرة.</p>
                <div class="social-links">
                    <a href="https://facebook.com/mcprime" target="_blank" rel="noopener noreferrer" aria-label="Facebook"><i class="fab fa-facebook-f"></i></a>
                    <a href="https://instagram.com/mcprime" target="_blank" rel="noopener noreferrer" aria-label="Instagram"><i class="fab fa-instagram"></i></a>
                    <a href="https://linkedin.com/company/mcprime" target="_blank" rel="noopener noreferrer" aria-label="LinkedIn"><i class="fab fa-linkedin-in"></i></a>
                    <a href="https://x.com/mcprime" target="_blank" rel="noopener noreferrer" aria-label="X (Twitter)"><i class="fab fa-x-twitter"></i></a>
                </div>
            </div>
        </div>
        <div class="footer-bottom">
            <div class="container" style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:10px;">
                <p>&copy; <span id="footer-year">2026</span> MC PRIME. جميع الحقوق محفوظة.</p>
                <p style="font-size:0.8rem; color:var(--text-muted-color);">www.mcprim.com</p>
            </div>
        </div>
    </footer>

    <!-- Interactive Scripts for Hero 3D Card -->
    <script>
        function toggleCardFlip(e) {
            if (e && e.stopPropagation) e.stopPropagation();
            var flipper = document.getElementById('live-flipper-card');
            if (flipper) {
                flipper.classList.toggle('flipped');
            }
        }

        function updateLiveCardName(val) {
            var nameElem = document.getElementById('card-front-name');
            if (nameElem) {
                nameElem.textContent = val.trim() || 'اسمك الكامل هنا';
            }
        }

        document.addEventListener('DOMContentLoaded', function() {
            var flipper = document.getElementById('live-flipper-card');
            if (flipper) {
                flipper.addEventListener('click', function(e) {
                    // Avoid double flipping when clicking button inside
                    if (e.target.closest('.card-flip-btn')) return;
                    toggleCardFlip();
                });
            }
            var flipBtn = document.getElementById('flip-btn-action');
            if (flipBtn) {
                flipBtn.addEventListener('click', function(e) {
                    e.preventDefault();
                    e.stopPropagation();
                    toggleCardFlip();
                });
            }
        });
    </script>
</body>
</html>`;

fs.writeFileSync(path.join(rootDir, 'index.html'), arabicHtml, 'utf8');
console.log('Updated index.html without stats, materials, and with fixed EN and flip buttons!');

// 3. ENGLISH HOMEPAGE (index-en.html)
const englishHtml = `<!DOCTYPE html>
<html lang="en" dir="ltr">

<head>
    <script src="runtime-config.js?v=1.0"></script>
    <!-- SEO: Canonical + Hreflang -->
    <link rel="canonical" href="https://www.mcprim.com/nfc/index-en.html" />
    <link rel="alternate" hreflang="ar" href="https://www.mcprim.com/nfc/" />
    <link rel="alternate" hreflang="en" href="https://www.mcprim.com/nfc/index-en.html" />
    <link rel="alternate" hreflang="x-default" href="https://www.mcprim.com/nfc/" />
    <!-- Google tag (gtag.js) -->
    <script async src="https://www.googletagmanager.com/gtag/js?id=G-E7G4KFZKYG"></script>
    <script src="js/gtag-config.js"></script>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Cairo:wght@600;700;800;900&family=Tajawal:wght@400;500;700;800&display=swap" rel="stylesheet">
    
    <!-- Google Tag Manager -->
    <script src="js/gtm-bootstrap.js"></script>
    <!-- End Google Tag Manager -->
    <title>Smart NFC Business Card - Design Your Digital Card Free | MC PRIME</title>
    <meta name="description"
        content="Design smart NFC business cards for free with MC PRIME. Replace paper cards with a luxury contactless smart card supporting NFC and QR code.">
    <meta name="keywords"
        content="NFC business card, smart business card, digital business card free, vCard, QR code card, MC PRIME">

    <meta property="og:type" content="website">
    <meta property="og:url" content="https://www.mcprim.com/nfc/index-en.html">
    <meta property="og:title" content="Smart NFC Business Card - Design Your Digital Card Free | MC PRIME">
    <meta property="og:description"
        content="Design smart NFC business cards for free with MC PRIME. Contactless digital cards with one tap.">
    <meta property="og:image" content="https://www.mcprim.com/nfc/og-image.png">
    <meta property="og:site_name" content="MC PRIME">
    <meta property="og:locale" content="en_US">

    <meta property="twitter:card" content="summary_large_image">
    <meta property="twitter:url" content="https://www.mcprim.com/nfc/index-en.html">
    <meta property="twitter:title" content="Smart NFC Business Card - Design Your Digital Card Free | MC PRIME">
    <meta property="twitter:description"
        content="Design smart NFC business cards for free with MC PRIME. Contactless digital cards with one tap.">
    <meta property="twitter:image" content="https://www.mcprim.com/nfc/og-image.png">

    <link rel="icon" id="favicon" href="mc-prime-nfc.png" type="image/png">
    <link rel="apple-touch-icon" href="mc-prime-nfc.png">

    <!-- Font Awesome -->
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.2/css/all.min.css">

    <!-- Stylesheets -->
    <link rel="stylesheet" href="homepage.css">
    <link rel="stylesheet" href="homepage-interactive.css">
    <link rel="stylesheet" href="cookie-consent.css">
    <link rel="stylesheet" href="premium-ui.css">

    <!-- Scripts -->
    <script src="lang-switcher.js" defer></script>
    <script src="auth.js?v=3.5" defer></script>
    <script src="premium-ui.js" defer></script>
</head>

<body>
    <!-- Reading Progress Bar -->
    <div class="reading-progress" id="reading-progress"></div>

    <!-- Floating CTA Button -->
    <a href="editor-en.html" class="floating-cta" id="floating-cta">
        <i class="fas fa-rocket"></i>
        <span>Try Free Now</span>
    </a>

    <!-- Back to Top Button -->
    <button class="back-to-top" id="back-to-top" aria-label="Back to Top">
        <i class="fas fa-arrow-up"></i>
    </button>

    <!-- Navbar -->
    <nav class="navbar" id="navbar">
        <div class="container nav-content">
            <a href="index-en.html" class="nav-logo" aria-label="Home - MC PRIME">
                <img src="mc-prime-nfc.png" alt="MC PRIME - Smart Business Cards" loading="eager" width="60" height="60" style="height: 44px; width: auto;">
            </a>
            <ul class="nav-links" id="nav-links">
                <li><a href="index-en.html#how-it-works">How It Works</a></li>
                <li><a href="index-en.html#comparison">Comparison</a></li>
                <li><a href="index-en.html#features">Features</a></li>
                <li><a href="gallery-en.html">Gallery</a></li>
                <li><a href="blog-en.html">Blog</a></li>
                <li><a href="contact-en.html">Contact</a></li>
            </ul>
            <div style="display: flex; align-items: center; gap: 0.75rem;">
                <a href="index.html" class="lang-btn" aria-label="التبديل إلى العربية" onclick="if(window.switchLanguage){switchLanguage('ar');return false;}">عربي</a>
                <a href="editor-en.html" class="btn btn-primary nav-cta">Get Started Free</a>
            </div>
            <div class="nav-toggle" id="nav-toggle" aria-label="Open Menu">
                <span></span>
                <span></span>
                <span></span>
            </div>
        </div>
    </nav>

    <main id="main-content" role="main">

        <!-- HERO SECTION -->
        <section id="hero" class="hero-story-container" aria-labelledby="hero-title">
            <div class="container">
                <div class="hero-story-split">
                    
                    <!-- Copy Column -->
                    <div class="hero-story-copy">
                        <div class="hero-story-badge">
                            <i class="fas fa-wifi"></i> Next-Gen Smart Networking
                        </div>
                        <h1 id="hero-title" class="hero-story-title">
                            One Smart Card.. <span class="gold-accent">Infinite Connections</span>
                        </h1>
                        <p class="hero-story-desc">
                            Replace hundreds of discarded paper cards with one executive NFC smart card. Share your contact details, website, and portfolio with a single tap on any smartphone.
                        </p>

                        <!-- Live Name Input -->
                        <div class="hero-live-try-box">
                            <input type="text" id="live-card-input" placeholder="Type your name to preview live..." value="" oninput="updateLiveCardName(this.value)">
                            <button onclick="window.location.href='editor-en.html'">Design Free</button>
                        </div>

                        <!-- Trust Bullets -->
                        <div class="hero-trust-bullets">
                            <span><i class="fas fa-check-circle"></i> 100% Free to Design</span>
                            <span><i class="fas fa-check-circle"></i> No App Required</span>
                            <span><i class="fas fa-check-circle"></i> Apple &amp; Android Compatible</span>
                        </div>
                    </div>

                    <!-- 3D 2-Sided Card Studio -->
                    <div class="card-3d-interactive-stage">
                        <div class="card-3d-flipper" id="live-flipper-card" onclick="toggleCardFlip()" title="Click to flip card">
                            
                            <!-- Front Face -->
                            <div class="card-face card-face-front">
                                <div class="card-top-row">
                                    <div class="card-gold-chip"><i class="fas fa-microchip"></i></div>
                                    <div class="card-brand-logo">
                                        <img src="mc-prime-nfc.png" alt="MC PRIME">
                                        <span>MC PRIME</span>
                                    </div>
                                </div>
                                <div class="card-center-info">
                                    <div class="card-person-name" id="card-front-name">Your Full Name Here</div>
                                    <div class="card-person-title" id="card-front-title">Job Title / Company</div>
                                </div>
                                <div class="card-bottom-row">
                                    <span class="card-website-tag">www.mcprim.com</span>
                                    <span class="card-touch-indicator"><i class="fas fa-wifi"></i> Touch &amp; Connect</span>
                                </div>
                            </div>

                            <!-- Back Face -->
                            <div class="card-face card-face-back">
                                <div class="card-back-header">
                                    <span>MC PRIME NFC</span>
                                    <span style="color:var(--primary-color); font-weight:700;">#MC-88290</span>
                                </div>
                                <div class="card-back-qr-box">
                                    <img src="https://api.qrserver.com/v1/create-qr-code/?size=150x150&amp;data=https://www.mcprim.com/nfc/editor-en.html" alt="Scan QR Code" loading="eager">
                                </div>
                                <span style="font-size:0.75rem; color:#8b949e; margin-bottom:2px;">Scan to open live editor</span>
                                <span class="card-website-tag" style="font-size:0.8rem;">www.mcprim.com</span>
                                <div class="card-back-socials">
                                    <div class="card-back-social-icon"><i class="fab fa-whatsapp"></i></div>
                                    <div class="card-back-social-icon"><i class="fab fa-linkedin-in"></i></div>
                                    <div class="card-back-social-icon"><i class="fab fa-instagram"></i></div>
                                    <div class="card-back-social-icon"><i class="fab fa-x-twitter"></i></div>
                                </div>
                            </div>

                        </div>

                        <!-- Card Action Controls -->
                        <div class="card-flip-action-bar">
                            <button type="button" class="card-flip-btn" id="flip-btn-action" onclick="toggleCardFlip(); return false;">
                                <i class="fas fa-sync-alt"></i> Flip Card (Front / Back)
                            </button>
                            <a href="editor-en.html" class="card-flip-btn" style="background:linear-gradient(135deg, #d4af37, #c5a059); color:#0d1117; border:none;">
                                <i class="fas fa-magic"></i> Open in Editor
                            </a>
                        </div>
                    </div>

                </div>
            </div>
        </section>

        <!-- THE 3-STEP STORY JOURNEY -->
        <section id="how-it-works" class="story-journey-section" aria-labelledby="how-it-works-title">
            <div class="container">
                <div style="text-align:center; max-width:700px; margin:0 auto 20px;">
                    <div class="hero-story-badge"><i class="fas fa-route"></i> Seamless Networking Story</div>
                    <h2 id="how-it-works-title" style="font-family:'Cairo'; font-size:2.4rem; font-weight:800; color:#fff;">
                        How NFC Makes Every Business Encounter Count
                    </h2>
                    <p style="color:#8b949e; font-size:1.05rem;">3 simple moments that elevate your professional presence</p>
                </div>

                <div class="story-grid">
                    <div class="story-step-card">
                        <span class="story-step-num">01</span>
                        <div class="story-step-icon"><i class="fas fa-handshake"></i></div>
                        <h3>The First Touch</h3>
                        <p>At conferences or meetings, tap your sleek card against your client's phone without exchanging fragile paper cards.</p>
                    </div>

                    <div class="story-step-card">
                        <span class="story-step-num">02</span>
                        <div class="story-step-icon"><i class="fas fa-mobile-alt"></i></div>
                        <h3>Instant Digital Profile</h3>
                        <p>Your complete digital portfolio and contact channels open directly in their browser without installing any apps.</p>
                    </div>

                    <div class="story-step-card">
                        <span class="story-step-num">03</span>
                        <div class="story-step-icon"><i class="fas fa-user-check"></i></div>
                        <h3>Connected Forever</h3>
                        <p>Your client saves your vCard contact with one tap. Whenever you update your info, it reflects automatically on their end.</p>
                    </div>
                </div>
            </div>
        </section>

        <!-- COMPARISON MATRIX -->
        <section id="comparison" class="roi-matrix-section" aria-labelledby="comparison-title">
            <div class="container">
                <div style="text-align:center; max-width:700px; margin:0 auto 20px;">
                    <div class="hero-story-badge"><i class="fas fa-balance-scale"></i> Smart Comparison</div>
                    <h2 id="comparison-title" style="font-family:'Cairo'; font-size:2.4rem; font-weight:800; color:#fff;">
                        Traditional Paper Cards vs MC PRIME Smart Cards
                    </h2>
                    <p style="color:#8b949e; font-size:1.05rem;">Why executives and companies are making the switch to digital smart cards</p>
                </div>

                <div class="comparison-table-wrapper">
                    <!-- Paper Card -->
                    <div class="comparison-box old-paper">
                        <h3 style="color:#ef4444;"><i class="fas fa-times-circle"></i> Traditional Paper Cards</h3>
                        <ul class="comparison-list">
                            <li><i class="fas fa-times"></i> <span><strong>Recurring Costs:</strong> Constant re-printing for boxes that run out fast.</span></li>
                            <li><i class="fas fa-times"></i> <span><strong>88% Discarded:</strong> Most paper cards end up in the trash within one week.</span></li>
                            <li><i class="fas fa-times"></i> <span><strong>Outdated Info:</strong> Changing a phone or title requires tossing the entire batch.</span></li>
                            <li><i class="fas fa-times"></i> <span><strong>Manual Typing:</strong> Clients must type your number manually, causing lost leads.</span></li>
                            <li><i class="fas fa-times"></i> <span><strong>Environmental Waste:</strong> Massive paper and chemical ink footprint.</span></li>
                        </ul>
                    </div>

                    <!-- MC PRIME -->
                    <div class="comparison-box mc-prime">
                        <h3 style="color:var(--primary-color);"><i class="fas fa-check-circle"></i> MC PRIME Smart NFC Card</h3>
                        <ul class="comparison-list">
                            <li><i class="fas fa-check"></i> <span><strong>One Card for Life:</strong> Over 90% annual savings on business printing costs.</span></li>
                            <li><i class="fas fa-check"></i> <span><strong>1-Tap Save:</strong> Saves your complete contact info into their phone (vCard Direct).</span></li>
                            <li><i class="fas fa-check"></i> <span><strong>Real-Time Cloud Updates:</strong> Edit your phone or bio anytime without reprint.</span></li>
                            <li><i class="fas fa-check"></i> <span><strong>Analytics &amp; Insights:</strong> Track visits and social interactions in real-time.</span></li>
                            <li><i class="fas fa-check"></i> <span><strong>100% Eco-Friendly:</strong> Zero paper waste with an ultra-modern premium aesthetic.</span></li>
                        </ul>
                    </div>
                </div>
            </div>
        </section>

        <!-- FEATURES BENTO GRID -->
        <section id="features" class="bento-section" style="padding:70px 0;" aria-labelledby="features-title">
            <div class="container">
                <div style="text-align:center; max-width:700px; margin:0 auto 35px;">
                    <div class="hero-story-badge"><i class="fas fa-sparkles"></i> Comprehensive Features</div>
                    <h2 id="features-title" style="font-family:'Cairo'; font-size:2.4rem; font-weight:800; color:#fff;">
                        Everything You Need for Executive Networking
                    </h2>
                </div>

                <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(280px, 1fr)); gap:22px;">
                    <div class="story-step-card">
                        <div class="story-step-icon"><i class="fas fa-address-book"></i></div>
                        <h3>1-Tap Direct Contact Save</h3>
                        <p>Downloads your vCard with phone, email, website, and socials directly into their smartphone's native address book.</p>
                    </div>

                    <div class="story-step-card">
                        <div class="story-step-icon"><i class="fas fa-qrcode"></i></div>
                        <h3>Dynamic High-Res QR Code</h3>
                        <p>Scannable QR code integrated for devices without NFC, perfect for email signatures and presentations.</p>
                    </div>

                    <div class="story-step-card">
                        <div class="story-step-icon"><i class="fas fa-cloud-upload-alt"></i></div>
                        <h3>Real-Time Cloud Updates</h3>
                        <p>Update links, social profiles, and phone numbers instantly without reprinting physical cards.</p>
                    </div>

                    <div class="story-step-card">
                        <div class="story-step-icon"><i class="fas fa-chart-pie"></i></div>
                        <h3>Live Analytics Dashboard</h3>
                        <p>Track views, taps, and engagement with rich statistics to optimize your marketing outreach.</p>
                    </div>
                </div>
            </div>
        </section>

        <!-- FINAL CTA -->
        <section style="padding:80px 0; background:linear-gradient(135deg, rgba(197, 160, 89, 0.12) 0%, rgba(13, 17, 23, 0.95) 100%); border-top:1px solid rgba(197, 160, 89, 0.25); text-align:center;">
            <div class="container" style="max-width:750px;">
                <div class="hero-story-badge"><i class="fas fa-rocket"></i> Join Thousands of Professionals</div>
                <h2 style="font-family:'Cairo'; font-size:2.6rem; font-weight:900; color:#fff; margin-bottom:16px;">
                    Ready to Make an Unforgettable Impression?
                </h2>
                <p style="color:#8b949e; font-size:1.15rem; margin-bottom:30px;">
                    Design your smart digital card now in under 2 minutes for free.
                </p>
                <div style="display:flex; gap:16px; justify-content:center; flex-wrap:wrap;">
                    <a href="editor-en.html" class="btn btn-primary btn-lg" style="font-size:1.1rem; padding:15px 35px;">
                        <i class="fas fa-paint-brush"></i> Start Designing Free
                    </a>
                    <a href="contact-en.html" class="btn btn-secondary btn-lg" style="font-size:1.1rem; padding:15px 35px;">
                        <i class="fas fa-envelope"></i> Order Physical Card
                    </a>
                </div>
            </div>
        </section>

    </main>

    <!-- Unified Footer -->
    <footer class="site-footer">
        <div class="container footer-content">
            <div class="footer-col footer-about">
                <div class="footer-logo">
                    <img src="mc-prime-nfc.png" alt="MC PRIME" loading="lazy" width="40" height="40" style="height: 36px; width: auto;">
                    <span>MC PRIME</span>
                </div>
                <p>The premier platform for designing and managing smart NFC &amp; QR business cards. Modern digital networking solutions.</p>
            </div>
            <div class="footer-col">
                <h4>Quick Links</h4>
                <ul>
                    <li><a href="index-en.html">Home</a></li>
                    <li><a href="editor-en.html">Smart Editor</a></li>
                    <li><a href="gallery-en.html">Design Gallery</a></li>
                    <li><a href="blog-en.html">Blog &amp; Articles</a></li>
                    <li><a href="dashboard.html">Dashboard</a></li>
                </ul>
            </div>
            <div class="footer-col">
                <h4>Support</h4>
                <ul>
                    <li><a href="how-to-use-editor-en.html">Editor Guide</a></li>
                    <li><a href="contact-en.html">Contact Us</a></li>
                    <li><a href="privacy.html">Privacy Policy</a></li>
                    <li><a href="terms.html">Terms &amp; Conditions</a></li>
                </ul>
            </div>
            <div class="footer-col">
                <h4>Connect With Us</h4>
                <p style="font-size:0.85rem; color:var(--text-secondary-color); margin-bottom:12px;">We are here to help build your executive digital identity.</p>
                <div class="social-links">
                    <a href="https://facebook.com/mcprime" target="_blank" rel="noopener noreferrer" aria-label="Facebook"><i class="fab fa-facebook-f"></i></a>
                    <a href="https://instagram.com/mcprime" target="_blank" rel="noopener noreferrer" aria-label="Instagram"><i class="fab fa-instagram"></i></a>
                    <a href="https://linkedin.com/company/mcprime" target="_blank" rel="noopener noreferrer" aria-label="LinkedIn"><i class="fab fa-linkedin-in"></i></a>
                    <a href="https://x.com/mcprime" target="_blank" rel="noopener noreferrer" aria-label="X (Twitter)"><i class="fab fa-x-twitter"></i></a>
                </div>
            </div>
        </div>
        <div class="footer-bottom">
            <div class="container" style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:10px;">
                <p>&copy; <span id="footer-year">2026</span> MC PRIME. All rights reserved.</p>
                <p style="font-size:0.8rem; color:var(--text-muted-color);">www.mcprim.com</p>
            </div>
        </div>
    </footer>

    <!-- Interactive Scripts for Hero 3D Card -->
    <script>
        function toggleCardFlip(e) {
            if (e && e.stopPropagation) e.stopPropagation();
            var flipper = document.getElementById('live-flipper-card');
            if (flipper) {
                flipper.classList.toggle('flipped');
            }
        }

        function updateLiveCardName(val) {
            var nameElem = document.getElementById('card-front-name');
            if (nameElem) {
                nameElem.textContent = val.trim() || 'Your Full Name Here';
            }
        }

        document.addEventListener('DOMContentLoaded', function() {
            var flipper = document.getElementById('live-flipper-card');
            if (flipper) {
                flipper.addEventListener('click', function(e) {
                    if (e.target.closest('.card-flip-btn')) return;
                    toggleCardFlip();
                });
            }
            var flipBtn = document.getElementById('flip-btn-action');
            if (flipBtn) {
                flipBtn.addEventListener('click', function(e) {
                    e.preventDefault();
                    e.stopPropagation();
                    toggleCardFlip();
                });
            }
        });
    </script>
</body>
</html>`;

fs.writeFileSync(path.join(rootDir, 'index-en.html'), englishHtml, 'utf8');
console.log('Updated index-en.html successfully!');
