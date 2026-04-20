/**
 * MC PRIME NFC — Viewer Premium v2.0 (New Features)
 * Features: VCF Preview Modal, Map Button, Scroll-triggered Animations,
 *           Print Mode, Social Share Sizes shortcut
 */
(function () {
    'use strict';

    const isAr = document.documentElement.lang !== 'en';

    // ── Helper ───────────────────────────────────────────────────────────────
    function waitFor(selector, cb, maxMs = 8000) {
        const start = Date.now();
        const id = setInterval(() => {
            const el = document.querySelector(selector);
            if (el) { clearInterval(id); cb(el); }
            if (Date.now() - start > maxMs) clearInterval(id);
        }, 300);
    }

    // ════════════════════════════════════════════════════════════════════════
    // 1. VCF PREVIEW MODAL — show contact card preview before download
    // ════════════════════════════════════════════════════════════════════════
    function initVCFPreview() {
        // Inject preview modal HTML
        const modal = document.createElement('div');
        modal.id = 'vcf-preview-modal';
        modal.className = 'qr-modal-overlay';
        modal.innerHTML = `
            <div class="qr-modal" style="max-width:340px;">
                <div class="qr-modal-title">
                    <i class="fas fa-address-card"></i>
                    <span>${isAr ? 'معاينة جهة الاتصال' : 'Contact Preview'}</span>
                </div>
                <div id="vcf-preview-card" style="
                    background:linear-gradient(145deg,rgba(77,166,255,0.08),rgba(111,66,193,0.08));
                    border:1px solid rgba(77,166,255,0.2); border-radius:16px;
                    padding:20px; margin:16px 0; text-align:center;">
                    <div id="vcf-prev-avatar" style="width:72px;height:72px;border-radius:50%;background:linear-gradient(135deg,#4da6ff,#6f42c1);margin:0 auto 12px;display:flex;align-items:center;justify-content:center;font-size:1.6rem;font-weight:800;color:#fff;overflow:hidden;"></div>
                    <div id="vcf-prev-name" style="font-size:1.15rem;font-weight:800;color:var(--text-primary);margin-bottom:4px;"></div>
                    <div id="vcf-prev-title" style="font-size:0.85rem;color:#4da6ff;margin-bottom:14px;"></div>
                    <div id="vcf-prev-details" style="text-align:${isAr ? 'right' : 'left'};display:flex;flex-direction:column;gap:7px;"></div>
                </div>
                <div style="display:flex;gap:8px;">
                    <button id="vcf-prev-download" class="btn btn-primary" style="flex:1;">
                        <i class="fas fa-download"></i> ${isAr ? 'حفظ الاتصال' : 'Save Contact'}
                    </button>
                    <button id="vcf-prev-close" class="qr-modal-close" style="flex:1;">
                        <i class="fas fa-times"></i> ${isAr ? 'إغلاق' : 'Close'}
                    </button>
                </div>
            </div>`;
        document.body.appendChild(modal);
        modal.querySelector('#vcf-prev-close').addEventListener('click', () => modal.classList.remove('show'));
        modal.addEventListener('click', e => { if (e.target === modal) modal.classList.remove('show'); });

        // Intercept VCF save button click — show preview first
        waitFor('#save-vcf-btn', (vcfBtn) => {
            const originalClickHandlers = vcfBtn.cloneNode(true);

            vcfBtn.addEventListener('click', (e) => {
                // Populate preview from DOM
                const nameEl = document.getElementById('profile-name');
                const taglineEl = document.getElementById('profile-tagline');
                const imgEl = document.querySelector('#profile-image-container img');
                const links = document.querySelectorAll('#contact-links-container .contact-link, .contact-info-item');

                const name = nameEl?.textContent?.trim() || (isAr ? 'جهة الاتصال' : 'Contact');
                const title = taglineEl?.textContent?.trim() || '';

                // Avatar
                const avatar = document.getElementById('vcf-prev-avatar');
                if (imgEl?.src) {
                    avatar.innerHTML = `<img src="${imgEl.src}" style="width:100%;height:100%;object-fit:cover;">`;
                } else {
                    avatar.textContent = (name[0] || '?').toUpperCase();
                }

                document.getElementById('vcf-prev-name').textContent = name;
                document.getElementById('vcf-prev-title').textContent = title;

                // Details from contact links
                const details = document.getElementById('vcf-prev-details');
                const icons = { phone: 'fa-phone', email: 'fa-envelope', whatsapp: 'fa-whatsapp fab', website: 'fa-globe', linkedin: 'fa-linkedin fab', instagram: 'fa-instagram fab' };
                let detailsHTML = '';
                links.forEach(link => {
                    const text = link.textContent?.trim();
                    const href = link.href || link.querySelector('a')?.href || '';
                    if (!text || text.length < 2) return;
                    let iconClass = 'fas fa-circle';
                    Object.entries(icons).forEach(([k, v]) => { if (href.includes(k) || link.className?.includes(k)) iconClass = `${v.includes('fab') ? '' : 'fas '}${v}`; });
                    detailsHTML += `<div style="display:flex;align-items:center;gap:8px;font-size:0.82rem;color:var(--text-secondary);">
                        <i class="${iconClass.trim()}" style="color:#4da6ff;width:14px;text-align:center;font-size:0.8rem;"></i>
                        <span style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${text.substring(0, 40)}</span>
                    </div>`;
                });
                details.innerHTML = detailsHTML || `<p style="color:var(--text-secondary);font-size:0.8rem;">${isAr ? 'لا توجد تفاصيل' : 'No details available'}</p>`;

                modal.classList.add('show');

                // Hook download button to original VCF action
                const dlBtn = document.getElementById('vcf-prev-download');
                dlBtn.onclick = () => {
                    modal.classList.remove('show');
                    // Re-trigger original VCF button via its own event chain
                    setTimeout(() => {
                        const event = new MouseEvent('click', { bubbles: false });
                        vcfBtn.dispatchEvent(event);
                    }, 100);
                };
            }, true); // capture phase — intercept before other handlers
        });
    }

    // ════════════════════════════════════════════════════════════════════════
    // 2. MAP BUTTON — detect address/location and show map link
    // ════════════════════════════════════════════════════════════════════════
    function initMapButton() {
        // Watch contact links container for location data
        const addMapBtns = () => {
            const container = document.getElementById('contact-links-container');
            if (!container) return;

            // Look for address or location links
            const allLinks = container.querySelectorAll('a, .contact-link');
            allLinks.forEach(link => {
                const href = link.href || '';
                const text = link.textContent?.trim() || '';
                const isMap = href.includes('maps.google') || href.includes('maps.apple') ||
                    href.includes('goo.gl/maps') || link.className?.includes('location') || link.className?.includes('address');
                const looksLikeAddress = /\d+.*st|street|road|ave|blvd|شارع|حي|منطقة/i.test(text);

                if ((isMap || looksLikeAddress) && !link.querySelector('.map-badge')) {
                    const badge = document.createElement('span');
                    badge.className = 'map-badge';
                    badge.innerHTML = ` <i class="fas fa-map-marker-alt" style="color:#e74c3c;font-size:0.75rem;"></i>`;
                    badge.style.cssText = 'margin-right:4px;cursor:pointer;';
                    badge.title = isAr ? 'فتح في الخريطة' : 'Open in Maps';
                    badge.addEventListener('click', (e) => {
                        e.stopPropagation();
                        const query = isMap ? href : `https://maps.google.com/?q=${encodeURIComponent(text)}`;
                        window.open(query, '_blank');
                    });
                    link.prepend(badge);
                }
            });

            // Also add dedicated map button if location link found
            const locationLink = container.querySelector('[class*="location"], [class*="address"], [data-type="location"]');
            if (locationLink && !document.getElementById('viewer-map-btn')) {
                const mapBtn = document.createElement('a');
                mapBtn.id = 'viewer-map-btn';
                mapBtn.className = 'btn btn-secondary';
                mapBtn.target = '_blank';
                mapBtn.rel = 'noopener noreferrer';
                mapBtn.innerHTML = `<i class="fas fa-map-marked-alt" style="color:#e74c3c;"></i> ${isAr ? 'عرض على الخريطة' : 'View on Map'}`;
                mapBtn.style.cssText = 'width:100%;margin-bottom:8px;font-size:0.82rem;';
                mapBtn.href = locationLink.href || `https://maps.google.com/?q=${encodeURIComponent(locationLink.textContent)}`;
                const leftCol = document.getElementById('left-column');
                if (leftCol) {
                    const h2 = leftCol.querySelector('h2');
                    if (h2) h2.after(mapBtn);
                }
            }
        };

        // Run after card loads
        setTimeout(addMapBtns, 2000);
        // Also observe DOM changes
        const obs = new MutationObserver(addMapBtns);
        const container = document.getElementById('contact-links-container');
        if (container) obs.observe(container, { childList: true, subtree: true });
    }

    // ════════════════════════════════════════════════════════════════════════
    // 3. SCROLL-TRIGGERED ANIMATIONS for side columns
    // ════════════════════════════════════════════════════════════════════════
    function initScrollAnimations() {
        // Skip scroll animations on mobile — the tab system handles visibility
        if (window.innerWidth <= 1024) return;

        const style = document.createElement('style');
        style.textContent = `
        @keyframes slideInLeft {
            from { opacity:0; transform:translateX(-24px); }
            to   { opacity:1; transform:translateX(0); }
        }
        @keyframes slideInRight {
            from { opacity:0; transform:translateX(24px); }
            to   { opacity:1; transform:translateX(0); }
        }
        @keyframes popIn {
            from { opacity:0; transform:scale(0.92) translateY(10px); }
            to   { opacity:1; transform:scale(1) translateY(0); }
        }
        .scroll-hidden { opacity:0; }
        .scroll-slide-left  { animation:slideInLeft  0.55s cubic-bezier(.34,1.2,.64,1) forwards; }
        .scroll-slide-right { animation:slideInRight 0.55s cubic-bezier(.34,1.2,.64,1) forwards; }
        .scroll-pop         { animation:popIn        0.5s  cubic-bezier(.34,1.3,.64,1)  forwards; }

        /* Individual contact link items on hover */
        #contact-links-container a,
        #contact-links-container .contact-link {
            transition: transform .2s ease, box-shadow .2s ease !important;
        }
        #contact-links-container a:hover,
        #contact-links-container .contact-link:hover {
            transform: translateX(${isAr ? '-' : ''}4px) !important;
        }
        `;
        document.head.appendChild(style);

        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (!entry.isIntersecting) return;
                const el = entry.target;
                if (el.classList.contains('scroll-animated')) return;
                el.classList.add('scroll-animated');

                if (el.id === 'left-column' || el.classList.contains('save-options')) {
                    const animClass = isAr
                        ? (el.id === 'left-column' ? 'scroll-slide-right' : 'scroll-slide-left')
                        : (el.id === 'left-column' ? 'scroll-slide-left' : 'scroll-slide-right');
                    el.classList.add('scroll-hidden');
                    setTimeout(() => el.classList.add(animClass), 50);
                } else {
                    el.classList.add('scroll-hidden');
                    setTimeout(() => el.classList.add('scroll-pop'), 100);
                }
                observer.unobserve(el);
            });
        }, { threshold: 0.15 });

        // Observe side columns and info boxes
        setTimeout(() => {
            ['#left-column', '#right-column', '.info-box', '.side-column'].forEach(sel => {
                document.querySelectorAll(sel).forEach(el => observer.observe(el));
            });

            // Animate contact links with stagger
            const links = document.querySelectorAll('#contact-links-container a, #contact-links-container .contact-link');
            links.forEach((link, i) => {
                link.style.opacity = '0';
                link.style.transform = 'translateY(12px)';
                link.style.transition = `opacity .4s ${i * 0.06}s ease, transform .4s ${i * 0.06}s ease`;
                setTimeout(() => {
                    link.style.opacity = '1';
                    link.style.transform = 'translateY(0)';
                }, 400 + i * 60);
            });
        }, 1800);
    }

    // ════════════════════════════════════════════════════════════════════════
    // 4. PRINT MODE CSS
    // ════════════════════════════════════════════════════════════════════════
    function initPrintMode() {
        const style = document.createElement('style');
        style.textContent = `
        @media print {
            /* Hide non-essential UI */
            .viewer-nav, .viewer-loader, #loader, #page-progress-bar,
            #view-counter-badge, #pwa-banner, #shortcuts-hint,
            #story-card-modal, #qr-modal-overlay, #shortcuts-modal,
            .mobile-viewer-tabs, #viewer-flip-btn,
            .side-column.save-options { display:none !important; }

            /* Full-width layout */
            body { background:#fff !important; color:#000 !important; }
            .viewer-layout { display:block !important; }
            .center-column { width:100% !important; max-width:100% !important; }
            .cards-wrapper-viewer { max-width:500px !important; margin:0 auto !important; }

            /* Side column minimal */
            .side-column.active {
                border:none !important; background:none !important;
                box-shadow:none !important; padding:16px 0 !important;
            }

            /* Page break */
            .center-column { page-break-after:avoid; }
            .side-column { page-break-before:auto; }
        }

        /* Print button */
        #ep-print-btn {
            display:none;
        }
        @media screen {
            #ep-print-btn { display:inline-flex; }
        }
        `;
        document.head.appendChild(style);

        // Add print button to right column
        waitFor('#right-column', (col) => {
            if (document.getElementById('ep-print-btn')) return;
            const btn = document.createElement('button');
            btn.id = 'ep-print-btn';
            btn.className = 'btn btn-secondary';
            btn.innerHTML = `<i class="fas fa-print"></i> ${isAr ? 'طباعة البطاقة' : 'Print Card'}`;
            btn.style.cssText = 'width:100%;margin-top:10px;font-size:0.82rem;';
            btn.addEventListener('click', () => window.print());
            col.appendChild(btn);
        });
    }

    // ════════════════════════════════════════════════════════════════════════
    // 5. STORY CARD GENERATOR — create Instagram/WhatsApp story-ready images
    // ════════════════════════════════════════════════════════════════════════
    function initStoryGenerator() {
        // Inject Story Generator Modal
        const modal = document.createElement('div');
        modal.id = 'story-generator-modal';
        modal.className = 'qr-modal-overlay';
        modal.innerHTML = `
            <div class="qr-modal" style="max-width:400px;padding:24px;">
                <div class="qr-modal-title">
                    <i class="fab fa-instagram" style="color:#E4405F;"></i>
                    <span>${isAr ? 'مولّد صورة الستوري' : 'Story Image Generator'}</span>
                </div>
                <p class="qr-modal-subtitle" style="margin-bottom:16px;">
                    ${isAr ? 'اختر الثيم وحمّل صورة جاهزة للستوري' : 'Choose a theme and download a story-ready image'}
                </p>
                <div id="story-theme-selector" style="display:flex;gap:8px;margin-bottom:16px;justify-content:center;flex-wrap:wrap;">
                    <button class="story-theme-btn active" data-theme="midnight" style="background:linear-gradient(135deg,#0f0c29,#302b63,#24243e);"></button>
                    <button class="story-theme-btn" data-theme="ocean" style="background:linear-gradient(135deg,#0077b6,#00b4d8,#90e0ef);"></button>
                    <button class="story-theme-btn" data-theme="sunset" style="background:linear-gradient(135deg,#f72585,#b5179e,#7209b7);"></button>
                    <button class="story-theme-btn" data-theme="forest" style="background:linear-gradient(135deg,#132a13,#31572c,#4f772d);"></button>
                    <button class="story-theme-btn" data-theme="gold" style="background:linear-gradient(135deg,#1a1a2e,#c9a227,#f4d03f);"></button>
                    <button class="story-theme-btn" data-theme="minimal" style="background:linear-gradient(135deg,#fafafa,#e0e0e0,#ffffff);border:1px solid #ccc;"></button>
                </div>
                <div id="story-preview-wrapper" style="width:100%;aspect-ratio:9/16;border-radius:16px;overflow:hidden;position:relative;margin-bottom:16px;box-shadow:0 8px 30px rgba(0,0,0,0.3);">
                    <canvas id="story-canvas" style="width:100%;height:100%;display:block;"></canvas>
                </div>
                <div style="display:flex;gap:8px;">
                    <button id="story-download-btn" class="btn btn-primary" style="flex:1;">
                        <i class="fas fa-download"></i> ${isAr ? 'تحميل' : 'Download'}
                    </button>
                    <button id="story-share-btn" class="btn" style="flex:1;background:linear-gradient(45deg,#f09433,#e6683c,#dc2743,#cc2366,#bc1888);">
                        <i class="fas fa-share-alt"></i> ${isAr ? 'مشاركة' : 'Share'}
                    </button>
                </div>
                <button id="story-close-btn" class="qr-modal-close" style="margin-top:12px;width:100%;">
                    <i class="fas fa-times"></i> ${isAr ? 'إغلاق' : 'Close'}
                </button>
            </div>`;
        document.body.appendChild(modal);

        // Inject theme button styles
        const style = document.createElement('style');
        style.textContent = `
            .story-theme-btn {
                width: 40px; height: 40px; border-radius: 50%;
                border: 3px solid transparent; cursor: pointer;
                transition: all 0.2s ease; box-shadow: 0 2px 8px rgba(0,0,0,0.2);
            }
            .story-theme-btn:hover { transform: scale(1.15); }
            .story-theme-btn.active {
                border-color: var(--accent-primary, #4da6ff);
                box-shadow: 0 0 0 3px rgba(77,166,255,0.3), 0 2px 8px rgba(0,0,0,0.2);
                transform: scale(1.1);
            }
        `;
        document.head.appendChild(style);

        const themes = {
            midnight: { bg: ['#0f0c29', '#302b63', '#24243e'], text: '#ffffff', sub: '#a0a0c0', accent: '#4da6ff' },
            ocean:    { bg: ['#0077b6', '#00b4d8', '#90e0ef'], text: '#ffffff', sub: '#d4f1f9', accent: '#00b4d8' },
            sunset:   { bg: ['#f72585', '#b5179e', '#7209b7'], text: '#ffffff', sub: '#f0c0e0', accent: '#f72585' },
            forest:   { bg: ['#132a13', '#31572c', '#4f772d'], text: '#ffffff', sub: '#b0d0a0', accent: '#90be6d' },
            gold:     { bg: ['#1a1a2e', '#16213e', '#0f3460'], text: '#f4d03f', sub: '#c9a227', accent: '#f4d03f' },
            minimal:  { bg: ['#fafafa', '#f0f0f0', '#ffffff'], text: '#1a1a2e', sub: '#666666', accent: '#4da6ff' }
        };

        let currentTheme = 'midnight';
        const canvas = document.getElementById('story-canvas');
        const ctx = canvas.getContext('2d');
        canvas.width = 1080;
        canvas.height = 1920;

        async function renderStory() {
            const theme = themes[currentTheme];

            // Background gradient
            const grad = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
            grad.addColorStop(0, theme.bg[0]);
            grad.addColorStop(0.5, theme.bg[1]);
            grad.addColorStop(1, theme.bg[2]);
            ctx.fillStyle = grad;
            ctx.fillRect(0, 0, canvas.width, canvas.height);

            // Subtle pattern overlay
            ctx.globalAlpha = 0.04;
            for (let i = 0; i < canvas.width; i += 60) {
                for (let j = 0; j < canvas.height; j += 60) {
                    ctx.fillStyle = theme.text;
                    ctx.fillRect(i, j, 1, 1);
                }
            }
            ctx.globalAlpha = 1;

            // Top decoration dots
            ctx.fillStyle = theme.accent;
            ctx.globalAlpha = 0.15;
            ctx.beginPath();
            ctx.arc(150, 200, 180, 0, Math.PI * 2);
            ctx.fill();
            ctx.beginPath();
            ctx.arc(930, 1700, 220, 0, Math.PI * 2);
            ctx.fill();
            ctx.globalAlpha = 1;

            // Card image
            const frontImg = document.querySelector('#card-front-display img');
            if (frontImg && frontImg.complete && frontImg.naturalWidth > 0) {
                const cardW = 860;
                const cardH = cardW / (51 / 33);
                const cardX = (canvas.width - cardW) / 2;
                const cardY = 460;

                // Card shadow
                ctx.save();
                ctx.shadowColor = 'rgba(0,0,0,0.4)';
                ctx.shadowBlur = 60;
                ctx.shadowOffsetY = 20;
                roundRect(ctx, cardX, cardY, cardW, cardH, 24);
                ctx.fillStyle = '#000';
                ctx.fill();
                ctx.restore();

                // Card image with rounded corners
                ctx.save();
                roundRect(ctx, cardX, cardY, cardW, cardH, 24);
                ctx.clip();
                ctx.drawImage(frontImg, cardX, cardY, cardW, cardH);
                ctx.restore();

                // Card border glow
                ctx.save();
                ctx.strokeStyle = theme.accent;
                ctx.globalAlpha = 0.3;
                ctx.lineWidth = 2;
                roundRect(ctx, cardX, cardY, cardW, cardH, 24);
                ctx.stroke();
                ctx.globalAlpha = 1;
                ctx.restore();
            }

            // Text: "Digital Business Card" tag
            ctx.textAlign = 'center';
            ctx.fillStyle = theme.accent;
            ctx.font = '600 28px "Poppins", sans-serif';
            ctx.letterSpacing = '4px';
            ctx.fillText('✦  DIGITAL BUSINESS CARD  ✦', canvas.width / 2, 350);

            // Name
            const name = document.getElementById('profile-name')?.textContent?.trim() ||
                         document.querySelector('#card-name')?.textContent?.trim() || '';
            if (name) {
                ctx.fillStyle = theme.text;
                ctx.font = '800 64px "Cairo", "Tajawal", sans-serif';
                ctx.fillText(name, canvas.width / 2, 1160);
            }

            // Tagline
            const tagline = document.getElementById('profile-tagline')?.textContent?.trim() ||
                            document.querySelector('#card-tagline')?.textContent?.trim() || '';
            if (tagline) {
                ctx.fillStyle = theme.sub;
                ctx.font = '500 36px "Tajawal", "Poppins", sans-serif';
                ctx.fillText(tagline, canvas.width / 2, 1220);
            }

            // QR Code
            const qrApiUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(window.location.href)}&format=png&qzone=1&color=${theme.text === '#ffffff' ? '1e2d40' : 'ffffff'}&bgcolor=${theme.text === '#ffffff' ? 'ffffff' : '1e2d40'}`;
            try {
                const qrImg = await loadImage(qrApiUrl);
                const qrSize = 200;
                const qrX = (canvas.width - qrSize) / 2;
                const qrY = 1320;

                // QR background
                ctx.save();
                ctx.fillStyle = '#ffffff';
                roundRect(ctx, qrX - 16, qrY - 16, qrSize + 32, qrSize + 32, 16);
                ctx.fill();
                ctx.drawImage(qrImg, qrX, qrY, qrSize, qrSize);
                ctx.restore();

                // "Scan to connect" text
                ctx.fillStyle = theme.sub;
                ctx.font = '500 26px "Tajawal", "Poppins", sans-serif';
                ctx.fillText(isAr ? '📱 امسح للتواصل' : '📱 Scan to connect', canvas.width / 2, qrY + qrSize + 60);
            } catch (e) {
                // QR failed to load — skip
            }

            // Branding footer
            ctx.fillStyle = theme.sub;
            ctx.globalAlpha = 0.5;
            ctx.font = '500 24px "Poppins", sans-serif';
            ctx.fillText('Powered by MC PRIME', canvas.width / 2, 1800);
            ctx.globalAlpha = 1;

            // Divider line
            ctx.strokeStyle = theme.accent;
            ctx.globalAlpha = 0.2;
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(340, 1760);
            ctx.lineTo(740, 1760);
            ctx.stroke();
            ctx.globalAlpha = 1;
        }

        function roundRect(ctx, x, y, w, h, r) {
            ctx.beginPath();
            ctx.moveTo(x + r, y);
            ctx.lineTo(x + w - r, y);
            ctx.quadraticCurveTo(x + w, y, x + w, y + r);
            ctx.lineTo(x + w, y + h - r);
            ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
            ctx.lineTo(x + r, y + h);
            ctx.quadraticCurveTo(x, y + h, x, y + h - r);
            ctx.lineTo(x, y + r);
            ctx.quadraticCurveTo(x, y, x + r, y);
            ctx.closePath();
        }

        function loadImage(src) {
            return new Promise((resolve, reject) => {
                const img = new Image();
                img.crossOrigin = 'anonymous';
                img.onload = () => resolve(img);
                img.onerror = reject;
                img.src = src;
            });
        }

        // Theme selection
        modal.querySelectorAll('.story-theme-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                modal.querySelectorAll('.story-theme-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                currentTheme = btn.dataset.theme;
                renderStory();
            });
        });

        // Download
        modal.querySelector('#story-download-btn').addEventListener('click', () => {
            const link = document.createElement('a');
            link.download = 'story_card.png';
            link.href = canvas.toDataURL('image/png', 1.0);
            link.click();
        });

        // Share
        modal.querySelector('#story-share-btn').addEventListener('click', async () => {
            try {
                const blob = await new Promise(r => canvas.toBlob(r, 'image/png'));
                const file = new File([blob], 'story_card.png', { type: 'image/png' });
                if (navigator.canShare && navigator.canShare({ files: [file] })) {
                    await navigator.share({
                        files: [file],
                        title: isAr ? 'بطاقتي الرقمية' : 'My Digital Card',
                        text: isAr ? 'اسحب للأعلى لزيارة بطاقتي!' : 'Swipe up to view my card!'
                    });
                } else {
                    // Fallback: download
                    const link = document.createElement('a');
                    link.download = 'story_card.png';
                    link.href = canvas.toDataURL('image/png', 1.0);
                    link.click();
                }
            } catch (e) {
                if (e.name !== 'AbortError') console.warn('Share failed', e);
            }
        });

        // Close
        modal.querySelector('#story-close-btn').addEventListener('click', () => modal.classList.remove('show'));
        modal.addEventListener('click', e => { if (e.target === modal) modal.classList.remove('show'); });

        // Intercept "Add to Story" button to show generator instead
        waitFor('#add-to-story-btn', (btn) => {
            btn.addEventListener('click', (e) => {
                e.stopImmediatePropagation();
                e.preventDefault();
                modal.classList.add('show');
                renderStory();
            }, true);
        });

        // Also add a dedicated "Story Card" button to the save column if not exists
        waitFor('#right-column', (col) => {
            const existingBtn = document.getElementById('story-card-btn');
            if (existingBtn) return;
            const btn = document.createElement('button');
            btn.id = 'story-card-btn';
            btn.className = 'btn';
            btn.innerHTML = `<i class="fab fa-instagram"></i> ${isAr ? 'إنشاء صورة ستوري' : 'Create Story Image'}`;
            btn.style.cssText = 'width:100%;margin-bottom:12px;background:linear-gradient(45deg,#f09433,#e6683c,#dc2743,#cc2366,#bc1888);border:none;box-shadow:0 4px 15px rgba(247,127,0,0.25);';
            btn.addEventListener('click', () => {
                modal.classList.add('show');
                renderStory();
            });
            // Insert after the existing story button or at the top
            const existingStoryBtn = col.querySelector('#add-to-story-btn');
            if (existingStoryBtn) {
                existingStoryBtn.replaceWith(btn);
            } else {
                const h2 = col.querySelector('h2');
                if (h2) h2.after(btn);
            }
        });
    }

    // ════════════════════════════════════════════════════════════════════════
    // 6. CONTACT CARD INTERACTIONS — copy feedback + pressed states
    // ════════════════════════════════════════════════════════════════════════
    function initContactInteractions() {
        const style = document.createElement('style');
        style.textContent = `
            .contact-link { position: relative; overflow: hidden; }
            .contact-link .copy-ripple {
                position: absolute; inset: 0;
                background: linear-gradient(90deg, transparent, rgba(77,166,255,0.15), transparent);
                transform: translateX(-100%);
                animation: copyRipple 0.6s ease forwards;
                pointer-events: none;
                border-radius: inherit;
            }
            @keyframes copyRipple {
                to { transform: translateX(100%); }
            }
            .contact-link:active {
                transform: scale(0.97) !important;
                transition: transform 0.1s ease !important;
            }
            /* Long-press copy hint */
            .contact-link::after {
                content: '';
                position: absolute;
                bottom: 0; left: 0;
                width: 0%; height: 2px;
                background: var(--accent-primary, #4da6ff);
                transition: width 0.3s ease;
                border-radius: 2px;
            }
            .contact-link.copying::after {
                width: 100%;
            }
        `;
        document.head.appendChild(style);

        // Add copy-on-long-press for contact links
        setTimeout(() => {
            const links = document.querySelectorAll('#contact-links-container .contact-link');
            links.forEach(link => {
                let pressTimer;
                const getText = () => link.querySelector('span')?.textContent?.trim() || '';

                link.addEventListener('touchstart', () => {
                    link.classList.add('copying');
                    pressTimer = setTimeout(() => {
                        const text = getText();
                        if (text) {
                            navigator.clipboard.writeText(text).then(() => {
                                // Show ripple effect
                                const ripple = document.createElement('div');
                                ripple.className = 'copy-ripple';
                                link.appendChild(ripple);
                                setTimeout(() => ripple.remove(), 600);

                                // Show toast
                                const showToast = window.showToast || ((msg) => {
                                    let c = document.getElementById('toast-container');
                                    if (!c) return;
                                    const t = document.createElement('div');
                                    t.className = 'toast toast-success';
                                    t.innerHTML = `<i class="fas fa-check-circle"></i><span>${msg}</span>`;
                                    c.appendChild(t);
                                    requestAnimationFrame(() => requestAnimationFrame(() => t.classList.add('show')));
                                    setTimeout(() => { t.classList.remove('show'); setTimeout(() => t.remove(), 400); }, 2500);
                                });
                                showToast(isAr ? 'تم النسخ 📋' : 'Copied 📋');
                                if ('vibrate' in navigator) navigator.vibrate(15);
                            }).catch(() => {});
                        }
                        link.classList.remove('copying');
                    }, 600);
                }, { passive: true });

                link.addEventListener('touchend', () => {
                    clearTimeout(pressTimer);
                    link.classList.remove('copying');
                });

                link.addEventListener('touchmove', () => {
                    clearTimeout(pressTimer);
                    link.classList.remove('copying');
                });
            });
        }, 3000);
    }

    // ════════════════════════════════════════════════════════════════════════
    // 7. SAVE BUTTON ATTENTION PULSE — periodic pulse on sticky footer CTA
    // ════════════════════════════════════════════════════════════════════════
    function initSaveButtonPulse() {
        // This enhances the VCF save button in the left column with a subtle attention pulse
        const style = document.createElement('style');
        style.textContent = `
            @keyframes attentionPulse {
                0% { box-shadow: 0 4px 15px rgba(46, 204, 113, 0.25); }
                50% { box-shadow: 0 4px 25px rgba(46, 204, 113, 0.5), 0 0 0 6px rgba(46, 204, 113, 0.1); }
                100% { box-shadow: 0 4px 15px rgba(46, 204, 113, 0.25); }
            }
            #save-vcf-btn.pulse-attention {
                animation: attentionPulse 2s ease-in-out 3;
            }
            /* Success state */
            .btn-save-success {
                background: linear-gradient(135deg, #2ecc71, #27ae60) !important;
                transform: scale(1.02);
                transition: all 0.3s ease !important;
            }
            .btn-save-success i {
                animation: checkBounce 0.5s ease;
            }
            @keyframes checkBounce {
                0% { transform: scale(0); }
                50% { transform: scale(1.3); }
                100% { transform: scale(1); }
            }
        `;
        document.head.appendChild(style);

        // Trigger attention pulse after 5 seconds
        waitFor('#save-vcf-btn', (btn) => {
            setTimeout(() => {
                btn.classList.add('pulse-attention');
                btn.addEventListener('animationend', () => {
                    btn.classList.remove('pulse-attention');
                });
            }, 5000);
        });
    }

    // ════════════════════════════════════════════════════════════════════════
    // INIT ALL
    // ════════════════════════════════════════════════════════════════════════
    document.addEventListener('DOMContentLoaded', () => {
        initScrollAnimations();
        initPrintMode();
        initMapButton();
        initContactInteractions();
        initSaveButtonPulse();

        // VCF preview — wait for viewer to load card data
        setTimeout(initVCFPreview, 2500);

        // Story generator — wait for card images
        setTimeout(initStoryGenerator, 3000);
    });

})();
