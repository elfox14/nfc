/**
 * MC PRIME NFC - Premium Viewer Enhancements
 * Features: 3D Tilt, Skeleton Loader, View Counter, Confetti,
 *           Story Card, PWA Prompt, Keyboard Shortcuts, Before/After
 * Version: 2.0
 */

(function () {
    'use strict';

    // Detect language from html[lang] attribute
    const isAr = document.documentElement.lang !== 'en';
    const t = {
        skeleton_loading:   isAr ? 'جاري التحميل...'              : 'Loading...',
        view_count:         isAr ? 'مشاهدة'                        : 'views',
        confetti_vcf:       isAr ? 'تم الحفظ!'                     : 'Saved!',
        story_title:        isAr ? 'Story للمشاركة'                : 'Share Story',
        story_subtitle:     isAr ? 'صورة احترافية جاهزة للنشر'    : 'Ready to share on your Stories',
        story_btn:          isAr ? 'إنشاء Story للمشاركة'          : 'Create Story Image',
        story_download:     isAr ? 'تحميل'                         : 'Download',
        story_close:        isAr ? 'إغلاق'                         : 'Close',
        story_card_label:   isAr ? '📇 بطاقة رقمية ذكية'          : '📇 Smart Digital Card',
        pwa_title:          isAr ? 'أضف البطاقة لشاشتك الرئيسية'  : 'Add this card to your home screen',
        pwa_sub:            isAr ? 'وصول فوري بدون متصفح'         : 'Instant access without a browser',
        pwa_install:        isAr ? 'تثبيت'                         : 'Install',
        pwa_later:          isAr ? 'لاحقاً'                        : 'Later',
        shortcuts_title:    isAr ? 'اختصارات لوحة المفاتيح'       : 'Keyboard Shortcuts',
        shortcuts_close:    isAr ? 'إغلاق'                         : 'Close',
        shortcuts_hint:     isAr ? 'اختصارات'                      : 'Shortcuts',
        shortcuts: isAr ? [
            ['S', 'حفظ جهة الاتصال (VCF)'],
            ['C', 'نسخ رابط البطاقة'],
            ['Q', 'عرض رمز QR'],
            ['?', 'عرض هذه النافذة'],
            ['Esc', 'إغلاق النوافذ المفتوحة'],
        ] : [
            ['S', 'Save Contact (VCF)'],
            ['C', 'Copy card link'],
            ['Q', 'Show QR Code'],
            ['?', 'Show this window'],
            ['Esc', 'Close open modals'],
        ]
    };

    // ================================================================
    // 1. SKELETON LOADING — Replace boring spinner with a rich skeleton
    // ================================================================
    function initSkeletonLoader() {
        const loader = document.getElementById('loader');
        if (!loader) return;

        loader.innerHTML = `
            <div class="skeleton-wrapper">
                <!-- Card skeleton -->
                <div class="skeleton-card">
                    <div class="skeleton-block sk-w60 sk-h8 sk-round" style="margin-bottom:12px;"></div>
                    <div class="skeleton-block sk-w40 sk-h6 sk-round" style="margin-bottom:24px;"></div>
                    <div class="skeleton-block sk-w80 sk-h4" style="margin-bottom:8px;"></div>
                    <div class="skeleton-block sk-w60 sk-h4" style="margin-bottom:8px;"></div>
                    <div class="skeleton-block sk-w70 sk-h4"></div>
                </div>
                <!-- Left column skeleton -->
                <div class="skeleton-column">
                    <div class="skeleton-avatar"></div>
                    <div class="skeleton-block sk-w70 sk-h6 sk-round" style="margin: 12px auto 8px;"></div>
                    <div class="skeleton-block sk-w50 sk-h4 sk-round" style="margin: 0 auto 20px;"></div>
                    <div class="skeleton-link"></div>
                    <div class="skeleton-link" style="width:75%;"></div>
                    <div class="skeleton-link" style="width:85%;"></div>
                    <div class="skeleton-link" style="width:65%;"></div>
                </div>
            </div>
        `;
    }


    // ================================================================
    // 2. 3D TILT EFFECT — wraps card-wrapper in outer tilt container
    //    so the flip transform is NOT overwritten
    // ================================================================
    function init3DTilt() {
        const wrapper = document.getElementById('cards-wrapper-viewer');
        if (!wrapper || wrapper.parentElement.id === 'tilt-wrapper') return;

        // Create outer tilt container
        const tiltDiv = document.createElement('div');
        tiltDiv.id = 'tilt-wrapper';
        Object.assign(tiltDiv.style, {
            display: 'block',
            width: '100%',
            maxWidth: '510px',
            margin: '0 auto',
            perspective: '1000px',
            cursor: 'grab',
        });

        // Move wrapper inside tiltDiv
        wrapper.parentNode.insertBefore(tiltDiv, wrapper);
        tiltDiv.appendChild(wrapper);
        // Reset any conflicting width/maxWidth on inner wrapper
        wrapper.style.maxWidth = '100%';
        wrapper.style.margin = '0';

        let raf = null;
        let isTiltActive = false;

        tiltDiv.addEventListener('mousemove', (e) => {
            // Don't tilt when card is flipped (back face showing)
            if (wrapper.classList.contains('is-flipped')) return;
            isTiltActive = true;
            cancelAnimationFrame(raf);
            raf = requestAnimationFrame(() => {
                const rect = tiltDiv.getBoundingClientRect();
                const cx = rect.left + rect.width / 2;
                const cy = rect.top + rect.height / 2;
                const dx = (e.clientX - cx) / (rect.width / 2);
                const dy = (e.clientY - cy) / (rect.height / 2);

                const rotateY = dx * 7;
                const rotateX = -dy * 4;
                const shine = `radial-gradient(circle at ${50 + dx * 30}% ${50 + dy * 30}%, rgba(255,255,255,0.13) 0%, transparent 65%)`;

                tiltDiv.style.transform = `rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale(1.015)`;
                tiltDiv.style.transition = 'transform 0.06s ease';

                // Shine overlay on the front card only
                const front = document.getElementById('card-front-display');
                if (front) {
                    let shineEl = front.querySelector('.tilt-shine');
                    if (!shineEl) {
                        shineEl = document.createElement('div');
                        shineEl.className = 'tilt-shine';
                        Object.assign(shineEl.style, {
                            position: 'absolute', inset: '0', borderRadius: '15px',
                            pointerEvents: 'none', zIndex: '10', transition: 'background 0.06s ease'
                        });
                        front.style.position = 'relative';
                        front.appendChild(shineEl);
                    }
                    shineEl.style.background = shine;
                }
            });
        });

        tiltDiv.addEventListener('mouseleave', () => {
            cancelAnimationFrame(raf);
            isTiltActive = false;
            // Clear transform entirely — identity rotates still create a stacking context
            tiltDiv.style.transition = 'transform 0.55s cubic-bezier(0.34,1.2,0.64,1)';
            tiltDiv.style.transform = '';
            const shineEl = document.querySelector('#card-front-display .tilt-shine');
            if (shineEl) shineEl.style.background = 'transparent';
        });

        tiltDiv.style.transformStyle = 'preserve-3d';
        tiltDiv.style.willChange = 'transform';
    }


    // ================================================================
    // 3. LIVE VIEW COUNTER (localStorage-based with session tracking)
    // ================================================================
    function initViewCounter() {
        if (document.getElementById('view-counter-badge')) return; // Prevent duplicates

        const cardId = getCardId();
        if (!cardId) return;

        const storageKey = `vc_${cardId}`;
        const sessionKey = `vs_${cardId}`;

        // Increment only once per session
        if (!sessionStorage.getItem(sessionKey)) {
            sessionStorage.setItem(sessionKey, '1');
            const count = parseInt(localStorage.getItem(storageKey) || '0', 10) + 1;
            localStorage.setItem(storageKey, count);
        }

        const count = parseInt(localStorage.getItem(storageKey) || '1', 10);

        // Create counter badge
        const badge = document.createElement('div');
        badge.id = 'view-counter-badge';
        badge.innerHTML = `<i class="fas fa-eye"></i> <span id="view-count-num">${count}</span> ${t.view_count}`;
        Object.assign(badge.style, {
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            padding: '6px 14px',
            borderRadius: '50px',
            background: 'var(--glass-bg)',
            backdropFilter: 'blur(10px)',
            border: '1px solid var(--glass-border)',
            color: 'var(--text-secondary)',
            fontSize: '0.82rem',
            fontWeight: '600',
            margin: '0 auto 20px',
            width: 'fit-content',
        });

        // Inject below the card
        const centerCol = document.querySelector('.center-column');
        if (centerCol) {
            const btn = document.getElementById('viewer-flip-btn');
            if (btn) btn.insertAdjacentElement('afterend', badge);
            else centerCol.appendChild(badge);
        }

        // Animate the count up
        animateCount(Math.max(1, count - 3), count, document.getElementById('view-count-num'));
    }

    function animateCount(from, to, el) {
        if (!el || from >= to) return;
        let current = from;
        const step = Math.ceil((to - from) / 20);
        const timer = setInterval(() => {
            current = Math.min(current + step, to);
            el.textContent = current;
            if (current >= to) clearInterval(timer);
        }, 40);
    }

    function getCardId() {
        const pathSegments = window.location.pathname.split('/').filter(Boolean);
        const viewIdx = pathSegments.findIndex(s => s.toLowerCase() === 'view');
        if (viewIdx !== -1 && pathSegments[viewIdx + 1]) return pathSegments[viewIdx + 1];
        return new URLSearchParams(window.location.search).get('id');
    }


    // ================================================================
    // 4. CONFETTI ON VCF SAVE
    // ================================================================
    function initConfettiOnSave() {
        // Patch the VCF button after a short delay to ensure it's rendered
        const patchInterval = setInterval(() => {
            const vcfBtn = document.getElementById('save-vcf-btn');
            if (!vcfBtn) return;
            clearInterval(patchInterval);

            vcfBtn.addEventListener('click', () => {
                // Check if confetti already loaded
                if (window.confetti) {
                    launchConfetti();
                } else {
                    loadConfettiScript(() => launchConfetti());
                }
            }, { capture: true });
        }, 500);
    }

    function loadConfettiScript(callback) {
        const s = document.createElement('script');
        s.src = 'https://cdn.jsdelivr.net/npm/canvas-confetti@1.9.2/dist/confetti.browser.min.js';
        s.onload = callback;
        document.head.appendChild(s);
    }

    function launchConfetti() {
        const btn = document.getElementById('save-vcf-btn');
        if (!btn) { window.confetti && window.confetti({ particleCount: 120, spread: 80, origin: { y: 0.6 } }); return; }

        const rect = btn.getBoundingClientRect();
        const origin = {
            x: (rect.left + rect.width / 2) / window.innerWidth,
            y: (rect.top + rect.height / 2) / window.innerHeight
        };

        window.confetti({ particleCount: 80, spread: 70, origin, colors: ['#4da6ff', '#2ecc71', '#6f42c1', '#f1c40f'] });
        setTimeout(() => window.confetti({ particleCount: 40, spread: 90, origin, startVelocity: 20 }), 200);
    }


    // ================================================================
    // 5. STORY CARD GENERATOR (Canvas-based share image)
    // ================================================================
    function initStoryCardGenerator() {
        // Add button to the sharing section
        const rightCol = document.getElementById('right-column');
        if (!rightCol) return;

        const qrBtn = document.getElementById('show-qr-btn');
        if (!qrBtn) return;

        const storyBtn = document.createElement('button');
        storyBtn.id = 'story-card-btn';
        storyBtn.className = 'btn';
        storyBtn.innerHTML = `<i class="fas fa-camera"></i> ${t.story_btn}`;
        Object.assign(storyBtn.style, {
            width: '100%',
            marginBottom: '12px',
            background: 'linear-gradient(135deg, #f77f00, #d62828)',
            color: 'white',
            boxShadow: '0 4px 15px rgba(247,127,0,0.25)'
        });

        qrBtn.insertAdjacentElement('afterend', storyBtn);

        // Create modal
        const modal = document.createElement('div');
        modal.id = 'story-card-modal';
        modal.className = 'qr-modal-overlay';
        modal.innerHTML = `
            <div class="qr-modal" style="max-width: 360px;">
                <div class="qr-modal-title">
                    <i class="fas fa-camera" style="color:#f77f00;"></i>
                    <span>${t.story_title}</span>
                </div>
                <p class="qr-modal-subtitle">${t.story_subtitle}</p>
                <div id="story-card-preview" style="border-radius:12px;overflow:hidden;margin-bottom:20px;box-shadow:0 8px 30px rgba(0,0,0,0.3);">
                    <canvas id="story-canvas" style="width:100%;display:block;"></canvas>
                </div>
                <div style="display:flex;gap:8px;">
                    <button id="story-download-btn" class="btn btn-primary" style="flex:1;">
                        <i class="fas fa-download"></i> ${t.story_download}
                    </button>
                    <button class="qr-modal-close" id="story-modal-close" style="flex:1;">
                        <i class="fas fa-times"></i> ${t.story_close}
                    </button>
                </div>
            </div>
        `;
        document.body.appendChild(modal);

        const closeStory = () => modal.classList.remove('show');
        document.getElementById('story-modal-close').addEventListener('click', closeStory);
        modal.addEventListener('click', e => { if (e.target === modal) closeStory(); });

        storyBtn.addEventListener('click', () => {
            modal.classList.add('show');
            generateStoryCard();
        });

        document.getElementById('story-download-btn').addEventListener('click', () => {
            const canvas = document.getElementById('story-canvas');
            if (!canvas) return;
            const link = document.createElement('a');
            link.download = 'story_card.png';
            link.href = canvas.toDataURL('image/png');
            link.click();
        });
    }

    function generateStoryCard() {
        const canvas = document.getElementById('story-canvas');
        if (!canvas) return;

        const W = 540, H = 960;
        canvas.width = W;
        canvas.height = H;
        canvas.style.width = '100%';

        const ctx = canvas.getContext('2d');

        // Background gradient
        const grad = ctx.createLinearGradient(0, 0, W, H);
        grad.addColorStop(0, '#0f1b2d');
        grad.addColorStop(0.5, '#1a2d4f');
        grad.addColorStop(1, '#111a26');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, W, H);

        // Grid pattern
        ctx.strokeStyle = 'rgba(77,166,255,0.06)';
        ctx.lineWidth = 1;
        for (let x = 0; x < W; x += 40) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke(); }
        for (let y = 0; y < H; y += 40) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); }

        // Glow circle
        const glow = ctx.createRadialGradient(W / 2, H * 0.35, 10, W / 2, H * 0.35, 250);
        glow.addColorStop(0, 'rgba(77,166,255,0.3)');
        glow.addColorStop(1, 'transparent');
        ctx.fillStyle = glow;
        ctx.fillRect(0, 0, W, H);

        // Card data from the page
        const nameEl = document.getElementById('profile-name');
        const taglineEl = document.getElementById('profile-tagline');
        const name = nameEl ? nameEl.textContent.trim() : '';
        const tagline = taglineEl ? taglineEl.textContent.trim() : '';
        const url = window.location.href;

        // Avatar from profile image container
        const imgEl = document.querySelector('#profile-image-container img');

        const drawText = (text, x, y, font, color, align = 'center') => {
            ctx.font = font;
            ctx.fillStyle = color;
            ctx.textAlign = align;
            ctx.fillText(text, x, y);
        };

        const drawAvatar = (avatarSrc, cx, cy, r) => {
            return new Promise(resolve => {
                const img = new Image();
                img.crossOrigin = 'anonymous';
                img.onload = () => {
                    ctx.save();
                    ctx.beginPath();
                    ctx.arc(cx, cy, r, 0, Math.PI * 2);
                    ctx.clip();
                    ctx.drawImage(img, cx - r, cy - r, r * 2, r * 2);
                    ctx.restore();

                    // Border
                    ctx.beginPath();
                    ctx.arc(cx, cy, r + 3, 0, Math.PI * 2);
                    ctx.strokeStyle = 'rgba(77,166,255,0.8)';
                    ctx.lineWidth = 3;
                    ctx.stroke();

                    resolve();
                };
                img.onerror = () => {
                    // Initials fallback
                    const ig = ctx.createLinearGradient(cx - r, cy - r, cx + r, cy + r);
                    ig.addColorStop(0, '#4da6ff');
                    ig.addColorStop(1, '#6f42c1');
                    ctx.beginPath();
                    ctx.arc(cx, cy, r, 0, Math.PI * 2);
                    ctx.fillStyle = ig;
                    ctx.fill();
                    ctx.font = `bold ${r * 0.7}px Tajawal, Arial`;
                    ctx.fillStyle = '#fff';
                    ctx.textAlign = 'center';
                    ctx.textBaseline = 'middle';
                    ctx.fillText((name[0] || '?').toUpperCase(), cx, cy);
                    ctx.textBaseline = 'alphabetic';
                    resolve();
                };
                img.src = avatarSrc || '';
            });
        };

        const renderAll = async () => {
            // Avatar
            await drawAvatar(imgEl ? imgEl.src : '', W / 2, H * 0.32, 80);

            // Name
            ctx.font = 'bold 42px Tajawal, Arial';
            ctx.fillStyle = '#e6f0f7';
            ctx.textAlign = 'center';
            ctx.fillText(name || 'بطاقة أعمال', W / 2, H * 0.52);

            // Tagline
            if (tagline) {
                ctx.font = '26px Tajawal, Arial';
                ctx.fillStyle = '#4da6ff';
                ctx.fillText(tagline, W / 2, H * 0.57);
            }

            // Separator
            ctx.strokeStyle = 'rgba(77,166,255,0.4)';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(W * 0.2, H * 0.62);
            ctx.lineTo(W * 0.8, H * 0.62);
            ctx.stroke();

            // Card icon below
            ctx.font = '22px Tajawal, Arial';
            ctx.fillStyle = 'rgba(255,255,255,0.5)';
            ctx.fillText('📇 بطاقة رقمية ذكية', W / 2, H * 0.66);

            // QR Code
            try {
                const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=${encodeURIComponent(url)}&format=png&qzone=1&color=1e2d40&bgcolor=ffffff`;
                await new Promise((resolve) => {
                    const qrImg = new Image();
                    qrImg.crossOrigin = 'anonymous';
                    qrImg.onload = () => {
                        const qrSize = 130, qrX = W / 2 - qrSize / 2, qrY = H * 0.7;
                        // White rounded background
                        ctx.fillStyle = 'white';
                        roundRect(ctx, qrX - 8, qrY - 8, qrSize + 16, qrSize + 16, 12);
                        ctx.fill();
                        ctx.drawImage(qrImg, qrX, qrY, qrSize, qrSize);
                        resolve();
                    };
                    qrImg.onerror = resolve;
                    qrImg.src = qrUrl;
                });
            } catch (e) { /* skip QR if error */ }

            // URL text at bottom-ish
            ctx.font = '18px monospace';
            ctx.fillStyle = 'rgba(255,255,255,0.3)';
            ctx.fillText(url.replace(/^https?:\/\//, '').substring(0, 40), W / 2, H * 0.92);

            // Branding
            ctx.font = 'bold 16px Poppins, Arial';
            ctx.fillStyle = 'rgba(77,166,255,0.6)';
            ctx.fillText('MC PRIME NFC', W / 2, H * 0.96);
        };

        renderAll();
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


    // ================================================================
    // 6. PWA ADD TO HOMESCREEN PROMPT
    // ================================================================
    function initPWAPrompt() {
        let deferredPrompt = null;

        window.addEventListener('beforeinstallprompt', (e) => {
            e.preventDefault();
            deferredPrompt = e;

            // Show prompt banner after 5 seconds
            setTimeout(() => {
                if (!deferredPrompt) return;
                showPWABanner(deferredPrompt);
            }, 5000);
        });
    }

    function showPWABanner(deferredPrompt) {
        const banner = document.createElement('div');
        banner.id = 'pwa-banner';
        banner.innerHTML = `
            <div style="display:flex;align-items:center;gap:12px;flex:1;">
                <i class="fas fa-mobile-alt" style="font-size:1.5rem;color:var(--accent-primary);"></i>
                <div>
                    <div style="font-weight:700;font-size:0.9rem;">${t.pwa_title}</div>
                    <div style="font-size:0.75rem;color:var(--text-secondary);">${t.pwa_sub}</div>
                </div>
            </div>
            <div style="display:flex;gap:8px;">
                <button id="pwa-install-btn" style="padding:7px 16px;border-radius:50px;background:var(--accent-primary);color:white;border:none;font-size:0.82rem;font-weight:700;cursor:pointer;">${t.pwa_install}</button>
                <button id="pwa-dismiss-btn" style="padding:7px 12px;border-radius:50px;background:transparent;border:1px solid var(--border-color);color:var(--text-secondary);font-size:0.82rem;cursor:pointer;">${t.pwa_later}</button>
            </div>
        `;
        Object.assign(banner.style, {
            position: 'fixed',
            bottom: '20px',
            left: '50%',
            transform: 'translateX(-50%) translateY(80px)',
            background: 'var(--glass-bg)',
            backdropFilter: 'blur(20px)',
            border: '1px solid var(--glass-border)',
            borderRadius: '16px',
            padding: '16px 20px',
            display: 'flex',
            alignItems: 'center',
            gap: '16px',
            zIndex: '9997',
            boxShadow: '0 12px 40px rgba(0,0,0,0.3)',
            maxWidth: '420px',
            width: '90vw',
            transition: 'transform 0.4s cubic-bezier(0.34,1.56,0.64,1)',
            fontFamily: 'Tajawal, sans-serif'
        });
        document.body.appendChild(banner);

        setTimeout(() => { banner.style.transform = 'translateX(-50%) translateY(0)'; }, 50);

        document.getElementById('pwa-install-btn').addEventListener('click', async () => {
            banner.style.transform = 'translateX(-50%) translateY(80px)';
            setTimeout(() => banner.remove(), 400);
            deferredPrompt.prompt();
            const { outcome } = await deferredPrompt.userChoice;
            deferredPrompt = null;
        });

        document.getElementById('pwa-dismiss-btn').addEventListener('click', () => {
            banner.style.transform = 'translateX(-50%) translateY(80px)';
            setTimeout(() => banner.remove(), 400);
        });
    }


    // ================================================================
    // 7. KEYBOARD SHORTCUTS MODAL for VIEWER
    // ================================================================
    function initKeyboardShortcuts() {
        // Add shortcut button to nav or right column
        document.addEventListener('keydown', (e) => {
            if (e.key === '?' || (e.key === '/' && e.shiftKey)) showShortcutsModal();
            if (e.key === 'c' && !e.ctrlKey && !e.metaKey && !['INPUT','TEXTAREA'].includes(document.activeElement.tagName)) {
                document.getElementById('copy-link-btn') && document.getElementById('copy-link-btn').click();
            }
            if (e.key === 'q') document.getElementById('show-qr-btn') && document.getElementById('show-qr-btn').click();
            if (e.key === 's') document.getElementById('save-vcf-btn') && document.getElementById('save-vcf-btn').click();
        });
    }

    function showShortcutsModal() {
        if (document.getElementById('shortcuts-modal')) { document.getElementById('shortcuts-modal').classList.add('show'); return; }

        const m = document.createElement('div');
        m.id = 'shortcuts-modal';
        m.className = 'qr-modal-overlay';
        m.innerHTML = `
            <div class="qr-modal" style="max-width:380px;text-align:${isAr ? 'right' : 'left'};">
                <div class="qr-modal-title" style="justify-content:${isAr ? 'flex-end' : 'flex-start'};">
                    <i class="fas fa-keyboard"></i>
                    <span>${t.shortcuts_title}</span>
                </div>
                <div style="display:flex;flex-direction:column;gap:10px;margin:20px 0;">
                    ${t.shortcuts.map(([key, desc]) => `
                        <div style="display:flex;align-items:center;justify-content:space-between;padding:8px 12px;background:var(--button-secondary-bg);border-radius:8px;border:1px solid var(--border-color);">
                            <span style="font-size:0.9rem;color:var(--text-primary);">${desc}</span>
                            <kbd style="background:var(--glass-bg);border:1px solid var(--border-color);padding:3px 10px;border-radius:6px;font-family:monospace;font-size:0.82rem;color:var(--accent-primary);">${key}</kbd>
                        </div>
                    `).join('')}
                </div>
                <button class="qr-modal-close" id="shortcuts-close">
                    <i class="fas fa-times"></i> ${t.shortcuts_close}
                </button>
            </div>
        `;
        document.body.appendChild(m);

        document.getElementById('shortcuts-close').addEventListener('click', () => m.classList.remove('show'));
        m.addEventListener('click', e => { if (e.target === m) m.classList.remove('show'); });
        setTimeout(() => m.classList.add('show'), 10);
    }


    // ================================================================
    // INIT ALL on DOM ready (and after card renders)
    // ================================================================
    document.addEventListener('DOMContentLoaded', () => {
        initSkeletonLoader();
        initPWAPrompt();
        initKeyboardShortcuts();
        initConfettiOnSave();
        initStoryCardGenerator();

        // Delay tilt and counter until card is rendered
        const waitForCard = setInterval(() => {
            const cardDisplay = document.getElementById('card-front-display');
            if (cardDisplay && cardDisplay.querySelector('img')) {
                clearInterval(waitForCard);
                init3DTilt();
                initViewCounter();
            }
        }, 300);

        // Safety: init after 8 seconds regardless
        setTimeout(() => {
            clearInterval(waitForCard);
            init3DTilt();
            initViewCounter();
        }, 8000);
    });

})();
