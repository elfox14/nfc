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
    // INIT ALL
    // ════════════════════════════════════════════════════════════════════════
    document.addEventListener('DOMContentLoaded', () => {
        initScrollAnimations();
        initPrintMode();
        initMapButton();

        // VCF preview — wait for viewer to load card data
        setTimeout(initVCFPreview, 2500);
    });

})();
