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

    init() {
        this.updateUserStatus();
        this.bindEvents();
        this.startAutoSave();
        console.log('[EditorUserStatus] Initialized');
    },

    updateUserStatus() {
        const statusText = document.getElementById('user-status-text');
        const loginLink = document.getElementById('user-login-link');
        const logoutBtn = document.getElementById('user-logout-btn');
        const saveBtn = document.getElementById('save-to-cloud-btn');

        if (!statusText || !loginLink || !logoutBtn) return;

        const user = JSON.parse(localStorage.getItem('authUser') || 'null');
        const token = localStorage.getItem('authToken');

        if (token && user) {
            statusText.textContent = user.name || user.email || 'مستخدم';
            statusText.style.color = 'var(--accent-primary)';
            loginLink.style.display = 'none';
            logoutBtn.style.display = 'inline-flex';
            if (saveBtn) {
                saveBtn.querySelector('#save-btn-text').textContent = 'حفظ التصميم';
            }
        } else {
            statusText.textContent = 'غير مسجل';
            statusText.style.color = 'var(--text-secondary)';
            loginLink.style.display = 'inline-flex';
            logoutBtn.style.display = 'none';
            if (saveBtn) {
                saveBtn.querySelector('#save-btn-text').textContent = 'سجّل لحفظ';
            }
        }
    },

    bindEvents() {
        // Logout button
        const logoutBtn = document.getElementById('user-logout-btn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', () => {
                if (confirm('هل تريد تسجيل الخروج؟')) {
                    localStorage.removeItem('authToken');
                    localStorage.removeItem('authUser');
                    this.updateUserStatus();
                    if (typeof UIManager !== 'undefined') {
                        UIManager.announce('تم تسجيل الخروج');
                    }
                }
            });
        }

        // Save to cloud button
        const saveBtn = document.getElementById('save-to-cloud-btn');
        if (saveBtn) {
            // Manual save: Capture images
            saveBtn.addEventListener('click', () => this.saveToCloud(true));
        }
    },

    async saveToCloud(captureImages = false) {
        const token = localStorage.getItem('authToken');
        const saveBtn = document.getElementById('save-to-cloud-btn');
        const saveBtnText = document.getElementById('save-btn-text');

        // If not logged in, redirect to login
        if (!token) {
            const shouldLogin = confirm('يجب تسجيل الدخول لحفظ التصميم في حسابك.\n\nهل تريد تسجيل الدخول الآن؟');
            if (shouldLogin) {
                // Save current state to localStorage before redirecting
                if (typeof StateManager !== 'undefined') {
                    StateManager.saveState();
                }
                window.location.href = 'login.html?redirect=editor.html';
            }
            return;
        }

        if (this.isSaving) return;
        this.isSaving = true;

        // Update button state (visual feedback only for manual save usually)
        if (captureImages && saveBtnText) saveBtnText.textContent = 'جاري المعالجة...';
        if (captureImages && saveBtn) saveBtn.disabled = true;
        if (!captureImages && saveBtnText) saveBtnText.textContent = 'حفظ تلقائي...';

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
                        if (saveBtnText) saveBtnText.textContent = 'جاري التقاط الصور...';

                        // Capture Front
                        console.log('[EditorUserStatus] Capturing front...');
                        const frontImageUrl = await ShareManager.captureAndUploadCard(DOMElements.cardFront);
                        console.log('[EditorUserStatus] Front captured:', frontImageUrl);

                        // Capture Back
                        console.log('[EditorUserStatus] Capturing back...');
                        const backImageUrl = await ShareManager.captureAndUploadCard(DOMElements.cardBack);
                        console.log('[EditorUserStatus] Back captured:', backImageUrl);

                        if (!state.imageUrls) state.imageUrls = {};
                        state.imageUrls.capturedFront = frontImageUrl;
                        state.imageUrls.capturedBack = backImageUrl;

                        if (saveBtnText) saveBtnText.textContent = 'جاري الرفع...';
                        console.log('[EditorUserStatus] Images captured successfully');
                    } catch (captureErr) {
                        console.error('[EditorUserStatus] Image capture failed:', captureErr);
                        alert('فشل التقاط صورة البطاقة: ' + captureErr.message);
                    }
                } else {
                    console.warn('[EditorUserStatus] Cannot capture images - missing dependencies');
                    console.warn('DOMElements.cardFront:', DOMElements?.cardFront);
                }
            }

            const designId = await ShareManager.saveDesign(state);
            if (designId) {
                this.lastSaveTime = new Date();

                if (captureImages) {
                    if (saveBtnText) saveBtnText.textContent = 'تم الحفظ ✓';
                    if (typeof UIManager !== 'undefined') {
                        UIManager.announce('تم حفظ التصميم والصور بنجاح');
                    }
                    setTimeout(() => {
                        if (saveBtnText) saveBtnText.textContent = 'حفظ التصميم';
                    }, 2000);
                } else {
                    // Auto-save silent update or minimal UI
                    if (saveBtnText) saveBtnText.textContent = 'حفظ التصميم';
                }
            } else {
                throw new Error('Failed to save');
            }
        } catch (err) {
            console.error('[EditorUserStatus] Save failed:', err);
            if (captureImages && saveBtnText) saveBtnText.textContent = 'فشل الحفظ';
            if (captureImages && typeof UIManager !== 'undefined') {
                UIManager.announce('فشل حفظ التصميم. حاول مرة أخرى.');
            }
            setTimeout(() => {
                if (saveBtnText) saveBtnText.textContent = 'حفظ التصميم';
            }, 2000);
        } finally {
            this.isSaving = false;
            if (saveBtn) saveBtn.disabled = false;
        }
    },

    startAutoSave() {
        // Only auto-save for logged-in users
        this.autoSaveInterval = setInterval(() => {
            const token = localStorage.getItem('authToken');
            if (token && !this.isSaving) {
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
