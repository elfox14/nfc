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
            saveBtn.addEventListener('click', () => this.saveToCloud());
        }
    },

    async saveToCloud() {
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

        // Update button state
        if (saveBtnText) saveBtnText.textContent = 'جاري الحفظ...';
        if (saveBtn) saveBtn.disabled = true;

        try {
            // Use ShareManager if available
            if (typeof ShareManager !== 'undefined' && ShareManager.saveDesign) {
                const designId = await ShareManager.saveDesign();
                if (designId) {
                    this.lastSaveTime = new Date();
                    if (saveBtnText) saveBtnText.textContent = 'تم الحفظ ✓';
                    if (typeof UIManager !== 'undefined') {
                        UIManager.announce('تم حفظ التصميم بنجاح');
                    }
                    setTimeout(() => {
                        if (saveBtnText) saveBtnText.textContent = 'حفظ التصميم';
                    }, 2000);
                } else {
                    throw new Error('Failed to save');
                }
            } else {
                throw new Error('ShareManager not available');
            }
        } catch (err) {
            console.error('[EditorUserStatus] Save failed:', err);
            if (saveBtnText) saveBtnText.textContent = 'فشل الحفظ';
            if (typeof UIManager !== 'undefined') {
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
                this.saveToCloud();
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
