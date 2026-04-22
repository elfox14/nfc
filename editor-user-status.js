'use strict';

/**
 * Editor User Status & Cloud Save Module
 * Handles user authentication display and cloud save functionality
 */
const EditorUserStatus = {
    autoSaveInterval: null,
    autoSaveDelay: 30000, // 30 seconds
    lastSaveTime: null,
    isSaving: false,

    async init() {
        // Restore session via refresh cookie if token is missing/expired
        if (typeof Auth !== 'undefined' && !Auth.isLoggedIn()) {
            await Auth.refreshSession();
        }
        this.updateUserStatus();
        this.bindEvents();
        this.startAutoSave();
        this.loadExistingDesignId();
        console.log('[EditorUserStatus] Initialized');
    },

    // جلب ID التصميم المحفوظ للمستخدم من الخادم عند بدء التشغيل
    async loadExistingDesignId() {
        const isLoggedIn = (typeof Auth !== 'undefined' && Auth.isLoggedIn()) || !!localStorage.getItem('authUser');
        if (!isLoggedIn) return; // لا يوجد توكن = غير مسجل

        // إذا كان URL يحتوي على ?id= فلا داعي للجلب
        const urlParams = new URLSearchParams(window.location.search);
        const urlId = urlParams.get('id');
        if (urlId) {
            if (typeof Config !== 'undefined') Config.currentDesignId = urlId;
            return;
        }

        // إذا كان Config.currentDesignId موجوداً بالفعل فلا داعي للجلب
        if (typeof Config !== 'undefined' && Config.currentDesignId) return;

        try {
            const baseUrl = (typeof Config !== 'undefined' && Config.API_BASE_URL)
                ? Config.API_BASE_URL
                : 'https://nfc-vjy6.onrender.com';

            const response = await Auth.apiFetchWithRefresh(`${baseUrl}/api/user/designs`, {
                headers: Auth.getHeader()
            });

            if (!response.ok) return;

            const data = await response.json();
            if (data.success && data.designs && data.designs.length > 0) {
                const existingId = data.designs[0].shortId;
                if (typeof Config !== 'undefined') {
                    Config.currentDesignId = existingId;
                    console.log('[EditorUserStatus] Restored existing design ID:', existingId);
                }
            }
        } catch (err) {
            console.warn('[EditorUserStatus] Could not restore design ID:', err.message);
        }
    },

    updateUserStatus() {
        const isEnglish = document.documentElement.lang.includes('en') || window.location.pathname.includes('-en');
        const statusBar = document.getElementById('user-status-bar');
        const saveBtn = document.getElementById('save-share-btn');

        if (!statusBar) return;

        const user = JSON.parse(localStorage.getItem('authUser') || 'null');
        const isLoggedIn = (typeof Auth !== 'undefined' && Auth.isLoggedIn()) || !!user;

        // Mobile Menu Elements (Floating menu)
        const mobUserText = document.getElementById('mobile-menu-user-text');
        const mobDashboard = document.getElementById('mobile-menu-dashboard-link');
        const mobLogin = document.getElementById('mobile-menu-login-link');
        const mobSignup = document.getElementById('mobile-menu-signup-link');
        const mobLogout = document.getElementById('mobile-menu-logout-btn');

        if (isLoggedIn && user) {
            // AUTHENTICATED STATE
            const userName = user.name || user.email || (isEnglish ? 'User' : 'مستخدم');
            const dashboardUrl = isEnglish ? 'dashboard-en.html' : 'dashboard.html';
            const logoutText = isEnglish ? 'Logout' : 'خروج';

            // Desktop Injection
            statusBar.innerHTML = `
                <a href="${dashboardUrl}" id="user-status-text" class="tb-user-pill" title="${isEnglish ? 'Dashboard' : 'لوحة التحكم'}">
                    <i class="fas fa-user-circle"></i>
                    <span class="tb-user-name">${userName}</span>
                </a>
                <button id="user-logout-btn" class="tb-pill-btn">${logoutText}</button>
            `;

            // Bind logout event
            const logoutBtn = document.getElementById('user-logout-btn');
            if (logoutBtn) logoutBtn.onclick = () => this.handleLogout();

            // Mobile Menu
            if (mobUserText) mobUserText.textContent = userName;
            if (mobDashboard) mobDashboard.style.display = 'block';
            if (mobLogin) mobLogin.style.display = 'none';
            if (mobSignup) mobSignup.style.display = 'none';
            if (mobLogout) {
                mobLogout.style.display = 'block';
                mobLogout.onclick = () => this.handleLogout();
            }

            if (saveBtn) {
                const saveTxt = saveBtn.querySelector('#save-btn-text');
                if (saveTxt) saveTxt.textContent = isEnglish ? 'Save & Share' : 'حفظ و مشاركة';
            }
        } else {
            // GUEST STATE
            const loginUrl = isEnglish ? 'login-en.html' : 'login.html';
            const loginText = isEnglish ? 'Login' : 'تسجيل دخول';

            // Desktop Injection
            statusBar.innerHTML = `
                <a href="${loginUrl}" id="user-login-link" class="tb-pill-btn">${loginText}</a>
            `;
            
            // Mobile Menu
            if (mobUserText) mobUserText.textContent = isEnglish ? 'Guest' : 'زائر';
            if (mobDashboard) mobDashboard.style.display = 'none';
            if (mobLogin) mobLogin.style.display = 'block';
            if (mobSignup) mobSignup.style.display = 'block';
            if (mobLogout) mobLogout.style.display = 'none';

            if (saveBtn) {
                const saveTxt = saveBtn.querySelector('#save-btn-text');
                if (saveTxt) saveTxt.textContent = isEnglish ? 'Login to Save' : 'سجّل لحفظ ومشاركة';
            }
        }
    },

    bindEvents() {
        const isEnglish = document.documentElement.lang.includes('en') || window.location.pathname.includes('-en');
        // Logout handling helper function
        const handleLogout = () => {
            if (confirm(isEnglish ? 'Are you sure you want to logout?' : 'هل تريد تسجيل الخروج؟')) {
                localStorage.removeItem('authToken');
                sessionStorage.removeItem('authToken');
                localStorage.removeItem('authUser');
                this.updateUserStatus();
                if (typeof UIManager !== 'undefined') {
                    UIManager.announce(isEnglish ? 'Logged out successfully' : 'تم تسجيل الخروج');
                }
            }
        };

        // Desktop Logout
        const logoutBtn = document.getElementById('user-logout-btn');
        if (logoutBtn) logoutBtn.addEventListener('click', handleLogout);

        // Mobile Menu Logout
        const mobileMenuLogoutBtn = document.getElementById('mobile-menu-logout-btn');
        if (mobileMenuLogoutBtn) mobileMenuLogoutBtn.addEventListener('click', handleLogout);

        // Mobile Sidebar Logout
        const mobileUserLogoutBtn = document.getElementById('mobile-user-logout-btn');
        if (mobileUserLogoutBtn) {
            mobileUserLogoutBtn.addEventListener('click', (e) => {
                e.preventDefault();
                handleLogout();
            });
        }

        // Save to cloud button
        const saveBtn = document.getElementById('save-share-btn');
        if (saveBtn) {
            // Manual save: Capture images
            saveBtn.addEventListener('click', () => this.saveToCloud(true));
        }

        // Mobile quick-action buttons (visible only on mobile toolbar)
        const mobileSaveBtn = document.getElementById('mobile-save-btn');
        if (mobileSaveBtn) {
            mobileSaveBtn.addEventListener('click', () => this.saveToCloud(true));
        }

        const mobileShareBtn = document.getElementById('mobile-share-btn');
        if (mobileShareBtn) {
            mobileShareBtn.addEventListener('click', () => {
                const designId = (typeof Config !== 'undefined' && Config.currentDesignId) ? Config.currentDesignId : null;
                if (designId && typeof ShareManager !== 'undefined' && ShareManager.performShare) {
                    const viewerUrl = new URL('viewer.html', window.location.href);
                    viewerUrl.searchParams.set('id', designId);
                    const isEnglish = document.documentElement.lang.includes('en') || window.location.pathname.includes('-en');
                    ShareManager.performShare(
                        viewerUrl.href,
                        isEnglish ? 'Check out my digital business card!' : 'شاهد بطاقة عملي الرقمية!',
                        isEnglish ? 'Made with MC PRIME' : 'مصنوعة بواسطة MC PRIME'
                    );
                } else {
                    // Design not saved yet — save first
                    this.saveToCloud(true);
                }
            });
        }
    },

    async saveToCloud(captureImages = false) {
        const isEnglish = document.documentElement.lang.includes('en') || window.location.pathname.includes('-en');
        const isLoggedIn = (typeof Auth !== 'undefined' && Auth.isLoggedIn()) || !!localStorage.getItem('authUser');
        const saveBtn = document.getElementById('save-share-btn');
        const saveBtnText = document.getElementById('save-btn-text');
        // Mobile proxy button in panel-share
        const mobileSaveProxyBtn = document.querySelector('.mobile-action-btn[data-trigger-id="save-share-btn"]');
        const mobileSaveProxyOrigHTML = mobileSaveProxyBtn ? mobileSaveProxyBtn.innerHTML : '';
        // Mobile quick-action save button (in toolbar)
        const mqaSaveBtn = document.getElementById('mobile-save-btn');

        // If not logged in, redirect to login
        if (!isLoggedIn) {
            const confirmMsg = isEnglish
                ? 'You must be logged in to save your design.\n\nDo you want to login now?'
                : 'يجب تسجيل الدخول لحفظ التصميم في حسابك.\n\nهل تريد تسجيل الدخول الآن؟';

            const shouldLogin = confirm(confirmMsg);
            console.log('[EditorUserStatus] shouldLogin:', shouldLogin);
            if (shouldLogin) {
                // Save current state to localStorage before redirecting
                try {
                    if (typeof StateManager !== 'undefined') {
                        StateManager.saveState();
                    }
                } catch (e) {
                    console.warn('[EditorUserStatus] saveState failed, continuing to redirect:', e);
                }
                // Set flag so beforeunload handlers don't block the redirect
                window._intentionalRedirect = true;
                const redirectUrl = isEnglish ? 'login-en?redirect=editor-en' : 'login?redirect=editor';
                console.log('[EditorUserStatus] Redirecting to:', redirectUrl);
                window.location.href = redirectUrl;
            }
            return;
        }

        if (this.isSaving) return;
        this.isSaving = true;

        // Update button state (visual feedback only for manual save usually)
        if (captureImages && saveBtnText) saveBtnText.textContent = isEnglish ? 'Processing...' : 'جاري المعالجة...';
        if (captureImages && saveBtn) saveBtn.disabled = true;
        if (captureImages && mobileSaveProxyBtn) { mobileSaveProxyBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> ' + (isEnglish ? 'Processing...' : 'جاري المعالجة...'); mobileSaveProxyBtn.disabled = true; }
        if (captureImages && mqaSaveBtn) { mqaSaveBtn.classList.add('saving'); mqaSaveBtn.querySelector('span').textContent = isEnglish ? 'Saving...' : 'جاري...'; }
        if (!captureImages && saveBtnText) saveBtnText.textContent = isEnglish ? 'Auto-saving...' : 'حفظ تلقائي...';

        try {
            // Use ShareManager if available
            if (typeof ShareManager === 'undefined' || !ShareManager.saveDesign) {
                throw new Error('ShareManager not available');
            }

            let state = StateManager.getStateObject();

            // Capture Images if requested (Manual Save)
            if (captureImages) {
                console.log('[EditorUserStatus] Attempting to capture images...');
                console.log('[EditorUserStatus] DOMElements:', typeof DOMElements !== 'undefined' ? 'defined' : 'undefined');
                console.log('[EditorUserStatus] ShareManager.captureAndUploadCard:', typeof ShareManager.captureAndUploadCard);

                if (typeof DOMElements !== 'undefined' && DOMElements.cardFront && ShareManager.captureAndUploadCard) {
                    try {
                        if (saveBtnText) saveBtnText.textContent = isEnglish ? 'Capturing images...' : 'جاري التقاط الصور...';

                        // Capture Front
                        console.log('[EditorUserStatus] Capturing front...');
                        const frontImageUrl = await ShareManager.captureAndUploadCard(DOMElements.cardFront, 'capturedFront');
                        console.log('[EditorUserStatus] Front captured:', frontImageUrl);

                        // Capture Back
                        console.log('[EditorUserStatus] Capturing back...');
                        const backImageUrl = await ShareManager.captureAndUploadCard(DOMElements.cardBack, 'capturedBack');
                        console.log('[EditorUserStatus] Back captured:', backImageUrl);

                        if (!state.imageUrls) state.imageUrls = {};
                        state.imageUrls.capturedFront = frontImageUrl;
                        state.imageUrls.capturedBack = backImageUrl;

                        if (saveBtnText) saveBtnText.textContent = isEnglish ? 'Uploading...' : 'جاري الرفع...';
                        console.log('[EditorUserStatus] Images captured successfully');
                    } catch (captureErr) {
                        console.error('[EditorUserStatus] Image capture failed:', captureErr);
                        const captureFailMsg = isEnglish ? 'Failed to capture card image: ' + captureErr.message : 'فشل التقاط صورة البطاقة: ' + captureErr.message;
                        // Show error toast on mobile, alert on desktop
                        if (typeof MobileUtils !== 'undefined' && MobileUtils.isMobile()) {
                            MobileUtils.showMobileToast(captureFailMsg, 'error');
                        } else {
                            alert(captureFailMsg);
                        }
                        // Reset button state and STOP — don't save without a thumbnail
                        this.isSaving = false;
                        if (saveBtn) saveBtn.disabled = false;
                        if (saveBtnText) saveBtnText.textContent = isEnglish ? 'Save & Share' : 'حفظ و مشاركة';
                        if (mobileSaveProxyBtn) { mobileSaveProxyBtn.innerHTML = mobileSaveProxyOrigHTML; mobileSaveProxyBtn.disabled = false; }
                        if (mqaSaveBtn) { mqaSaveBtn.classList.remove('saving'); mqaSaveBtn.querySelector('span').textContent = isEnglish ? 'Save' : 'حفظ'; }
                        return;
                    }
                } else {
                    console.warn('[EditorUserStatus] Cannot capture images - missing dependencies');
                    console.warn('DOMElements.cardFront:', DOMElements?.cardFront);
                }
            }

            // Ask about gallery BEFORE saving (manual save only) so we save once
            if (captureImages) {
                const galleryPromptMsg = isEnglish
                    ? 'Would you like to display your design in the gallery page?'
                    : 'هل تريد عرض تصميمك في صفحة المعرض؟';
                state.sharedToGallery = await customConfirm(galleryPromptMsg);
            } else {
                // Auto-save: don't overwrite previously captured card images
                // getStateObject() sets imageUrls.front/back to background URLs, not captured images
                // Removing these prevents auto-save from clearing the dashboard thumbnail
                if (state.imageUrls) {
                    delete state.imageUrls.capturedFront;
                    delete state.imageUrls.capturedBack;
                }
            }

            const designId = await ShareManager.saveDesign(state);
            if (designId) {
                this.lastSaveTime = new Date();

                if (captureImages) {
                    const savedMsg = state.sharedToGallery
                        ? (isEnglish ? 'Design saved and added to gallery!' : 'تم حفظ التصميم وإضافته للمعرض!')
                        : (isEnglish ? 'Design and images saved successfully' : 'تم حفظ التصميم والصور بنجاح');
                    if (saveBtnText) saveBtnText.textContent = isEnglish ? 'Saved ✓' : 'تم الحفظ ✓';

                    // AFTER SUCCESSFUL MANUAL SAVE: Trigger Sharing
                    const viewerUrl = new URL('viewer.html', window.location.href);
                    viewerUrl.searchParams.set('id', designId);
                    if (typeof ShareManager !== 'undefined' && ShareManager.performShare) {
                        ShareManager.performShare(viewerUrl.href, i18nMain.shareTitle, i18nMain.shareText);
                    }
                    if (mobileSaveProxyBtn) { mobileSaveProxyBtn.innerHTML = '<i class="fas fa-check"></i> ' + (isEnglish ? 'Saved ✓' : 'تم الحفظ ✓'); mobileSaveProxyBtn.disabled = false; }
                    if (mqaSaveBtn) { mqaSaveBtn.classList.remove('saving'); mqaSaveBtn.classList.add('saved'); mqaSaveBtn.querySelector('span').textContent = isEnglish ? 'Saved ✓' : 'تم ✓'; }
                    if (typeof UIManager !== 'undefined') {
                        UIManager.announce(savedMsg);
                    }
                    // إظهار Toast مرئي على الموبايل
                    if (typeof MobileUtils !== 'undefined' && MobileUtils.isMobile()) {
                        MobileUtils.showMobileToast(savedMsg, 'success');
                    }

                    setTimeout(() => {
                        if (saveBtnText) saveBtnText.textContent = isEnglish ? 'Save & Share' : 'حفظ و مشاركة';
                        if (mobileSaveProxyBtn) mobileSaveProxyBtn.innerHTML = mobileSaveProxyOrigHTML;
                        if (mqaSaveBtn) { mqaSaveBtn.classList.remove('saved'); mqaSaveBtn.querySelector('span').textContent = isEnglish ? 'Save' : 'حفظ'; }
                    }, 2500);
                } else {
                    // Auto-save silent update or minimal UI
                    if (saveBtnText) saveBtnText.textContent = isEnglish ? 'Save Design' : 'حفظ التصميم';
                }
            } else {
                throw new Error('Failed to save');
            }
        } catch (err) {
            console.error('[EditorUserStatus] Save failed:', err);
            if (captureImages && saveBtnText) saveBtnText.textContent = isEnglish ? 'Save Failed' : 'فشل الحفظ';
            const failMsg = isEnglish ? 'Failed to save design. Please try again.' : 'فشل حفظ التصميم. حاول مرة أخرى.';
            if (captureImages && typeof UIManager !== 'undefined') {
                UIManager.announce(failMsg);
            }
            // إظهار Toast مرئي على الموبايل عند الفشل
            if (typeof MobileUtils !== 'undefined' && MobileUtils.isMobile()) {
                MobileUtils.showMobileToast(failMsg, 'error');
            }
            setTimeout(() => {
                if (saveBtnText) saveBtnText.textContent = isEnglish ? 'Save & Share' : 'حفظ و مشاركة';
            }, 2000);
        } finally {
            this.isSaving = false;
            if (saveBtn) saveBtn.disabled = false;
            if (mobileSaveProxyBtn) { mobileSaveProxyBtn.disabled = false; }
            if (mqaSaveBtn) { mqaSaveBtn.classList.remove('saving'); }
        }
    },

    startAutoSave() {
        // Only auto-save for logged-in users who already have a saved design
        this.autoSaveInterval = setInterval(() => {
            const isLoggedIn = (typeof Auth !== 'undefined' && Auth.isLoggedIn()) || !!localStorage.getItem('authUser');
            // Only auto-save if user is logged in AND design was previously saved
            // This prevents creating new empty designs on the dashboard
            if (isLoggedIn && !this.isSaving && typeof Config !== 'undefined' && Config.currentDesignId) {
                console.log('[EditorUserStatus] Auto-saving...');
                // Auto-save: Do NOT capture images (too heavy)
                this.saveToCloud(false);
            }
        }, this.autoSaveDelay);
    },

    stopAutoSave() {
        if (this.autoSaveInterval) {
            clearInterval(this.autoSaveInterval);
            this.autoSaveInterval = null;
        }
    }
};

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    // Wait a bit for other scripts to initialize
    setTimeout(() => {
        EditorUserStatus.init();
    }, 500);
});
