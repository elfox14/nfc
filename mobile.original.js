// Mobile Specific Logic
window.MobileUtils = {
    isMobile: () => window.innerWidth <= 1024,

    init: () => {
        console.log('Mobile Mode Initialized');
        MobileUtils.handleResize();
        window.addEventListener('resize', MobileUtils.handleResize);
        MobileUtils.setupNavigation();
        MobileUtils.setupActionButtons();
        MobileUtils.setupClickToEdit();
        MobileUtils.setupCardFlipper();
        MobileUtils.updateMobileCardScale(); // Add this line
        // [FIX 2026-10-21] Keep the card scale in sync with the preview
        // area: panels opening/closing used to leave the card cropped.
        if (window.ResizeObserver) {
            const canvasEl = document.querySelector('.pro-canvas');
            if (canvasEl) {
                let rafPending = false;
                new ResizeObserver(() => {
                    if (rafPending) return;
                    rafPending = true;
                    requestAnimationFrame(() => { rafPending = false; MobileUtils.updateMobileCardScale(); });
                }).observe(canvasEl);
            }
        }
    },

    handleResize: () => {
        const isMobile = MobileUtils.isMobile();
        document.body.classList.toggle('is-mobile', isMobile);

        if (isMobile) {
            if (!document.querySelector('.active-view')) {
                MobileUtils.switchView('panel-elements');
            }
            MobileUtils.updateMobileCardScale(); // Add this line
        } else {
            document.querySelectorAll('.active-view').forEach(el => el.classList.remove('active-view'));
            document.querySelectorAll('.pro-sidebar').forEach(el => el.style.display = '');
            document.querySelector('.pro-canvas').style.display = '';
            document.getElementById('panel-share').style.display = 'none';
            const cardFlipper = document.querySelector('.card-flipper');
            if (cardFlipper) {
                cardFlipper.classList.remove('is-flipped');
            }
            document.getElementById('card-front-preview').style.pointerEvents = 'auto';
            document.getElementById('card-back-preview').style.pointerEvents = 'auto';
            // Reset scale on desktop
            const cardsWrapper = document.getElementById('cards-wrapper');
            if (cardsWrapper) cardsWrapper.style.transform = '';
            const flipperContainer = document.querySelector('.card-flipper-container');
            if (flipperContainer) flipperContainer.style.transform = '';
        }
    },

    // --- Dynamically scale the card to fit the preview area ---
    updateMobileCardScale: () => {
        if (!MobileUtils.isMobile()) return;

        const canvas = document.querySelector('.pro-canvas');
        const cardsWrapper = document.getElementById('cards-wrapper');
        const flipperContainer = document.querySelector('.card-flipper-container');
        if (!canvas || !cardsWrapper || !flipperContainer) return;

        const layout = cardsWrapper.dataset.layout || 'classic';

        // Base card dimensions (CSS reference size)
        let cardWidth, cardHeight;
        if (layout === 'vertical') {
            cardWidth = 330;
            cardHeight = 510;
        } else {
            cardWidth = 510;
            cardHeight = 330;
        }

        // Available space: canvas minus padding
        const canvasRect = canvas.getBoundingClientRect();
        const availableWidth = canvasRect.width - 24; // 12px horizontal padding
        const availableHeight = canvasRect.height - 24; // clean breathing room without buttons

        // Calculate scale to fit width, capped at 1.0
        let scale = Math.min(availableWidth / cardWidth, 1.0);
        if (availableHeight > 0) {
            const scaleY = availableHeight / cardHeight;
            scale = Math.min(scale, scaleY, 1.0);
        }

        // Apply scale with top-center origin so it anchors cleanly at top of scroll canvas
        flipperContainer.style.transform = `scale(${scale})`;
        flipperContainer.style.transformOrigin = 'top center';
        
        // Match scroll height to visual scaled height of both stacked cards + gap (24px)
        const unscaledTotalHeight = (cardHeight * 2) + 24;
        flipperContainer.style.height = `${unscaledTotalHeight * scale}px`;
        
        // Reset any old wrapper transform
        cardsWrapper.style.transform = '';
    },

    setupNavigation: () => {
        const navItems = document.querySelectorAll('.mobile-nav-item');
        navItems.forEach(item => {
            item.addEventListener('click', (e) => {
                e.preventDefault();
                const targetId = item.getAttribute('data-target');
                MobileUtils.switchView(targetId);
                navItems.forEach(nav => nav.classList.remove('active'));
                item.classList.add('active');
            });
        });
    },

    setupCardFlipper: () => {
        const flipButton = document.getElementById('flip-card-btn-mobile');
        const frontNavBtn = document.getElementById('mobile-nav-front-btn');
        const backNavBtn = document.getElementById('mobile-nav-back-btn');
        const cardFlipper = document.querySelector('.card-flipper');
        const cardFront = document.getElementById('card-front-preview');
        const cardBack = document.getElementById('card-back-preview');
        const canvas = document.querySelector('.pro-canvas');

        if (cardFront) cardFront.style.pointerEvents = 'auto';
        if (cardBack) cardBack.style.pointerEvents = 'auto';

        const scrollToFace = (face, smooth = true) => {
            const isBack = face === 'back';
            if (cardFlipper) {
                cardFlipper.classList.toggle('is-flipped', isBack);
            }
            if (frontNavBtn) frontNavBtn.classList.toggle('is-active', !isBack);
            if (backNavBtn) backNavBtn.classList.toggle('is-active', isBack);

            const tbFront = document.getElementById('toolbar-face-front');
            const tbBack = document.getElementById('toolbar-face-back');
            if (isBack && tbBack) {
                tbBack.classList.add('is-active');
                tbBack.setAttribute('aria-pressed', 'true');
                if (tbFront) {
                    tbFront.classList.remove('is-active');
                    tbFront.setAttribute('aria-pressed', 'false');
                }
            } else if (!isBack && tbFront) {
                tbFront.classList.add('is-active');
                tbFront.setAttribute('aria-pressed', 'true');
                if (tbBack) {
                    tbBack.classList.remove('is-active');
                    tbBack.setAttribute('aria-pressed', 'false');
                }
            }

            if (canvas) {
                if (!isBack) {
                    canvas.scrollTo({ top: 0, behavior: smooth ? 'smooth' : 'auto' });
                } else if (cardBack) {
                    const canvasRect = canvas.getBoundingClientRect();
                    const backRect = cardBack.getBoundingClientRect();
                    const targetScrollTop = canvas.scrollTop + (backRect.top - canvasRect.top) - 10;
                    canvas.scrollTo({ top: Math.max(0, targetScrollTop), behavior: smooth ? 'smooth' : 'auto' });
                }
            }
        };

        if (frontNavBtn) {
            frontNavBtn.addEventListener('click', () => scrollToFace('front'));
        }

        if (backNavBtn) {
            backNavBtn.addEventListener('click', () => scrollToFace('back'));
        }

        if (flipButton) {
            flipButton.addEventListener('click', () => {
                const isCurrentlyFlipped = cardFlipper ? cardFlipper.classList.contains('is-flipped') : false;
                scrollToFace(isCurrentlyFlipped ? 'front' : 'back');
            });
        }

        if (canvas) {
            let scrollTimer;
            canvas.addEventListener('scroll', () => {
                clearTimeout(scrollTimer);
                scrollTimer = setTimeout(() => {
                    const maxScroll = canvas.scrollHeight - canvas.clientHeight;
                    const isBackVisible = maxScroll > 0 && canvas.scrollTop >= (maxScroll * 0.45);
                    if (cardFlipper) cardFlipper.classList.toggle('is-flipped', isBackVisible);
                    if (frontNavBtn) frontNavBtn.classList.toggle('is-active', !isBackVisible);
                    if (backNavBtn) backNavBtn.classList.toggle('is-active', isBackVisible);
                    const tbFront = document.getElementById('toolbar-face-front');
                    const tbBack = document.getElementById('toolbar-face-back');
                    if (tbFront && tbBack) {
                        tbFront.classList.toggle('is-active', !isBackVisible);
                        tbFront.setAttribute('aria-pressed', String(!isBackVisible));
                        tbBack.classList.toggle('is-active', isBackVisible);
                        tbBack.setAttribute('aria-pressed', String(isBackVisible));
                    }
                }, 50);
            }, { passive: true });
        }
    },

    switchView: (targetId) => {
        const sidebars = document.querySelectorAll('.pro-sidebar');
        sidebars.forEach(view => {
            view.classList.remove('active-view');
            if (window.MobileUtils.isMobile()) {
                view.style.display = 'none';
            }
        });

        const targetView = document.getElementById(targetId);
        if (targetView) {
            targetView.classList.add('active-view');
            targetView.style.display = 'block';
        }

        const navItem = document.querySelector(`.mobile-nav-item[data-target="${targetId}"]`);
        if (navItem) {
            document.querySelectorAll('.mobile-nav-item').forEach(nav => nav.classList.remove('active'));
            navItem.classList.add('active');
        }
        // [FIX 2026-10-21] View switches change the preview area height —
        // recompute the card scale so it is never cropped.
        requestAnimationFrame(() => MobileUtils.updateMobileCardScale());
    },

    // --- إظهار Toast مرئي على الموبايل ---
    showMobileToast: (message, type = 'success') => {
        // Remove existing toast if any
        const existing = document.getElementById('mobile-toast-notification');
        if (existing) existing.remove();

        const toast = document.createElement('div');
        toast.id = 'mobile-toast-notification';
        const bgColor = type === 'success' ? 'linear-gradient(135deg, #10b981, #059669)'
            : type === 'error' ? 'linear-gradient(135deg, #ef4444, #dc2626)'
                : 'linear-gradient(135deg, #d4af37, #c5a059)';
        const icon = type === 'success' ? 'fa-check-circle'
            : type === 'error' ? 'fa-exclamation-circle'
                : 'fa-info-circle';

        toast.style.cssText = `
            position: fixed;
            bottom: 80px;
            left: 50%;
            transform: translateX(-50%) translateY(20px);
            background: ${bgColor};
            color: white;
            padding: 14px 24px;
            border-radius: 50px;
            font-family: 'Tajawal', sans-serif;
            font-size: 0.95rem;
            font-weight: 600;
            z-index: 99999;
            box-shadow: 0 8px 25px rgba(0,0,0,0.3);
            display: flex;
            align-items: center;
            gap: 10px;
            opacity: 0;
            transition: all 0.3s ease;
            max-width: 85vw;
            text-align: center;
            white-space: nowrap;
        `;
        toast.innerHTML = `<i class="fas ${icon}"></i> ${message}`;
        document.body.appendChild(toast);

        // Animate in
        requestAnimationFrame(() => {
            requestAnimationFrame(() => {
                toast.style.opacity = '1';
                toast.style.transform = 'translateX(-50%) translateY(0)';
            });
        });

        // Animate out and remove
        setTimeout(() => {
            toast.style.opacity = '0';
            toast.style.transform = 'translateX(-50%) translateY(20px)';
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    },

    // --- إخفاء panel-share والـ sidebars قبل عرض Modal ---
    hidePanelBeforeModal: () => {
        if (!MobileUtils.isMobile()) return;
        const sidebars = document.querySelectorAll('.pro-sidebar');
        sidebars.forEach(view => {
            view.classList.remove('active-view');
            view.style.display = 'none';
        });
        // Reset nav active state
        document.querySelectorAll('.mobile-nav-item').forEach(nav => nav.classList.remove('active'));
    },

    setupActionButtons: () => {
        const actionButtons = document.querySelectorAll('.mobile-action-btn');

        // Retry if buttons not found yet (may be injected dynamically)
        if (!actionButtons || actionButtons.length === 0) {
            console.warn('[MobileUtils] No .mobile-action-btn found — retrying in 200ms');
            setTimeout(MobileUtils.setupActionButtons, 200);
            return;
        }

        actionButtons.forEach(btn => {
            // Avoid double-binding
            if (btn.dataset.mobileInitialized) return;
            btn.dataset.mobileInitialized = 'true';

            btn.addEventListener('click', (e) => {
                const triggerId = btn.getAttribute('data-trigger-id');
                if (!triggerId) {
                    console.warn('[MobileUtils] mobile-action-btn missing data-trigger-id', btn);
                    return;
                }

                // --- معالجة خاصة لزر الحفظ على الموبايل ---
                if (triggerId === 'save-to-cloud-btn') {
                    MobileUtils.handleMobileSave(btn);
                    return;
                }

                // --- معالجة خاصة لزر المشاركة على الموبايل ---
                if (triggerId === 'share-card-btn') {
                    MobileUtils.handleMobileShare(btn);
                    return;
                }

                // الأزرار الأخرى: تشغيل بشكل عادي
                const originalBtn = document.getElementById(triggerId);
                if (originalBtn) originalBtn.click();
                else console.warn('[MobileUtils] originalBtn not found for triggerId:', triggerId);
            });
        });

        console.log(`[MobileUtils] setupActionButtons: ${actionButtons.length} buttons bound`);
    },

    // --- معالج الحفظ على الموبايل ---
    handleMobileSave: async (proxyBtn) => {
        const isEnglish = document.documentElement.lang.includes('en');

        if (typeof EditorUserStatus === 'undefined' || !EditorUserStatus.saveToCloud) {
            console.warn('[MobileUtils] EditorUserStatus not available — falling back to original btn');
            const originalBtn = document.getElementById('save-to-cloud-btn');
            if (originalBtn) originalBtn.click();
            else MobileUtils.showMobileToast(isEnglish ? 'Save not available' : 'الحفظ غير متاح', 'error');
            return;
        }

        console.log('[MobileUtils] handleMobileSave called');
        try {
            await EditorUserStatus.saveToCloud(true);

            // Notify other tabs (dashboard) that a design was saved so they can refresh
            try {
                if (typeof window.loadMyDesigns === 'function') {
                    window.loadMyDesigns();
                } else {
                    localStorage.setItem('nfc:design_saved', String(Date.now()));
                }
            } catch (notifyErr) {
                console.warn('[MobileUtils] notify dashboard failed', notifyErr);
            }
        } catch (err) {
            console.error('[MobileUtils] Save error:', err);
            MobileUtils.showMobileToast(
                isEnglish ? 'Save failed: ' + err.message : 'فشل الحفظ: ' + err.message,
                'error'
            );
            // Ensure btn is re-enabled
            if (proxyBtn) { proxyBtn.disabled = false; }
        }
    },

    // --- معالج المشاركة على الموبايل ---
    handleMobileShare: async (proxyBtn) => {
        // التحقق من تسجيل الدخول أولاً
        const isLoggedIn = (typeof Auth !== 'undefined' && Auth.isLoggedIn()) || !!localStorage.getItem('authUser');
        if (!isLoggedIn) {
            const isEnglish = document.documentElement.lang.includes('en');
            MobileUtils.showMobileToast(
                isEnglish ? 'Please log in to share your card' : 'يجب تسجيل الدخول لمشاركة بطاقتك',
                'error'
            );
            setTimeout(() => {
                window.location.href = isEnglish ? 'login-en.html?redirect=editor-en.html' : 'login.html?redirect=editor.html';
            }, 1500);
            return;
        }

        if (typeof ShareManager === 'undefined' || !ShareManager.shareCard) {
            const originalBtn = document.getElementById('share-card-btn');
            if (originalBtn) originalBtn.click();
            return;
        }

        // استدعاء المشاركة مباشرة — ShareManager.showFallback يُخفي اللوحات تلقائياً
        try {
            await ShareManager.shareCard();
        } catch (err) {
            console.error('[MobileUtils] Share error:', err);
            MobileUtils.showMobileToast('حدث خطأ أثناء المشاركة. حاول مجدداً.', 'error');
        }
    },

    setupClickToEdit: () => {
        const cardsWrapper = document.getElementById('cards-wrapper');
        if (!cardsWrapper) return;

        cardsWrapper.addEventListener('click', (e) => {
            const clickableElement = e.target.closest('.draggable-on-card');
            if (!clickableElement) return;

            e.preventDefault();
            e.stopPropagation();

            const targetControlId = clickableElement.dataset.controlId || clickableElement.dataset.inputTargetId;
            if (!targetControlId) return;

            const targetControl = document.getElementById(targetControlId);
            if (!targetControl) return;

            if (window.MobileUtils && window.MobileUtils.isMobile()) {
                MobileUtils.switchView('panel-elements');
            } else {
                const navItem = document.querySelector('[data-target="panel-elements"]');
                if (navItem) navItem.click();
            }

            setTimeout(() => {
                targetControl.scrollIntoView({ behavior: 'smooth', block: 'center' });

                const firstInput = targetControl.querySelector('input, textarea, select');
                if (firstInput) firstInput.focus();

                targetControl.classList.add('click-to-edit-highlight');
                setTimeout(() => targetControl.classList.remove('click-to-edit-highlight'), 2000);

                const accordion = targetControl.closest('details');
                if (accordion && !accordion.open) {
                    accordion.open = true;
                }
            }, 100);
        });
    }
};

function _mobileInit() {
    console.log('[MobileUtils] Initializing');
    MobileUtils.init();
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', _mobileInit, { once: true });
} else {
    _mobileInit();
}
