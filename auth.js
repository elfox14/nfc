'use strict';

const Auth = {
    // API Endpoints
    // Determine Base URL:
    // 1. If 'file:' protocol, default to Render live server.
    // 2. If 'localhost' or '127.0.0.1', point to http://localhost:3000
    // 3. For production (mcprim.com), point to Render backend
    getBaseUrl() {
        if (window.location.protocol === 'file:') {
            return 'https://nfc-vjy6.onrender.com';
        }

        const hostname = window.location.hostname;
        if (hostname === 'localhost' || hostname === '127.0.0.1') {
            return 'http://localhost:3000';
        }

        // Production - use Render backend
        return 'https://nfc-vjy6.onrender.com';
    },

    get API_LOGIN() { return `${this.getBaseUrl()}/api/auth/login`; },
    get API_REGISTER() { return `${this.getBaseUrl()}/api/auth/register`; },
    get API_USER_DESIGNS() { return `${this.getBaseUrl()}/api/user/designs`; },

    // State
    token: localStorage.getItem('authToken'),
    user: JSON.parse(localStorage.getItem('authUser') || 'null'),

    // Methods
    isLoggedIn() {
        return !!this.token;
    },

    async login(email, password) {
        try {
            console.log(`[Auth] Attempting login to: ${this.API_LOGIN}`);
            const response = await fetch(this.API_LOGIN, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password })
            });

            const data = await response.json();
            if (data.success) {
                this.setSession(data.token, data.user);
                return { success: true };
            } else {
                return { success: false, error: data.error || 'Login failed' };
            }
        } catch (err) {
            console.error('[Auth] Login Error:', err);
            return { success: false, error: `Network error: Failed to connect to ${this.API_LOGIN}` };
        }
    },

    async register(name, email, password) {
        try {
            console.log(`[Auth] Attempting register to: ${this.API_REGISTER}`);
            const response = await fetch(this.API_REGISTER, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name, email, password })
            });

            const data = await response.json();
            if (data.success) {
                this.setSession(data.token, data.user);
                return { success: true };
            } else {
                return { success: false, error: data.error || 'Registration failed' };
            }
        } catch (err) {
            console.error('[Auth] Register Error:', err);
            return { success: false, error: `Network error: Failed to connect to ${this.API_REGISTER}` };
        }
    },

    // Google Sign-In using popup flow
    async googleSignIn() {
        return new Promise((resolve) => {
            // Open popup to backend Google OAuth endpoint
            const width = 500;
            const height = 600;
            const left = (window.innerWidth - width) / 2;
            const top = (window.innerHeight - height) / 2;

            const popup = window.open(
                `${this.getBaseUrl()}/api/auth/google`,
                'Google Sign In',
                `width=${width},height=${height},left=${left},top=${top}`
            );

            // Listen for message from popup
            const messageHandler = (event) => {
                if (event.data && event.data.type === 'google-auth') {
                    window.removeEventListener('message', messageHandler);
                    if (event.data.success) {
                        this.setSession(event.data.token, event.data.user);
                        resolve({ success: true });
                    } else {
                        resolve({ success: false, error: event.data.error || 'فشل تسجيل الدخول' });
                    }
                    if (popup) popup.close();
                }
            };

            window.addEventListener('message', messageHandler);

            // Check if popup was blocked
            if (!popup || popup.closed) {
                resolve({ success: false, error: 'تم حظر النافذة المنبثقة. يرجى السماح بها.' });
            }

            // Timeout after 2 minutes
            setTimeout(() => {
                window.removeEventListener('message', messageHandler);
                if (popup && !popup.closed) popup.close();
                resolve({ success: false, error: 'انتهت المهلة. حاول مرة أخرى.' });
            }, 120000);
        });
    },

    logout() {
        localStorage.removeItem('authToken');
        localStorage.removeItem('authUser');
        this.token = null;
        this.user = null;
        window.location.href = '/nfc/login.html';
    },

    setSession(token, user) {
        this.token = token;
        this.user = user;
        localStorage.setItem('authToken', token);
        localStorage.setItem('authUser', JSON.stringify(user));
    },

    getHeader() {
        return this.token ? { 'Authorization': `Bearer ${this.token}` } : {};
    },

    // UI Helpers
    updateNavAuth() {
        // Detect Language
        const isEnglish = document.documentElement.lang === 'en' || window.location.pathname.includes('-en.html');
        const loginUrl = isEnglish ? '/nfc/login-en.html' : '/nfc/login.html';
        const dashboardUrl = isEnglish ? '/nfc/dashboard-en.html' : '/nfc/dashboard.html';
        // If we create dashboard-en.html later, we update this. Current request implies "return to English version" after auth.
        // But dashboard is the landing after auth. 
        // For now, let's keep dashboard as is, but ensuring the "Logout" button there redirects to correct login page?
        // Actually dashboard.html has its own logout logic.

        // 1. Main Website Navbar (.nav-links)
        const navContainer = document.querySelector('.nav-links');
        if (navContainer) {
            // Remove existing auth links to prevent duplicates if re-run
            const existingLinks = navContainer.querySelectorAll('li a[href*="login"], li a[href*="dashboard"]');
            existingLinks.forEach(el => el.parentElement.remove());

            if (this.isLoggedIn()) {
                const li = document.createElement('li');
                li.innerHTML = `<a href="${dashboardUrl}">${isEnglish ? 'Dashboard' : 'لوحة التحكم'}</a>`;
                navContainer.appendChild(li);

                const ctaBtn = document.querySelector('.nav-cta');
                if (ctaBtn) {
                    ctaBtn.textContent = isEnglish ? 'Dashboard' : 'لوحة التحكم';
                    ctaBtn.href = dashboardUrl;
                }
            } else {
                const li = document.createElement('li');
                li.innerHTML = `<a href="${loginUrl}">${isEnglish ? 'Login' : 'تسجيل الدخول'}</a>`;
                navContainer.appendChild(li);
            }
        }

        // 2. Editor Toolbar (.toolbar-nav)
        const toolbarNav = document.querySelector('.toolbar-nav');
        if (toolbarNav) {
            // Remove existing to avoid dupes
            const existingAuth = toolbarNav.querySelectorAll('.auth-link-dynamic');
            existingAuth.forEach(el => el.remove());

            if (this.isLoggedIn()) {
                if (!toolbarNav.querySelector(`a[href="${dashboardUrl}"]`)) {
                    const a = document.createElement('a');
                    a.href = dashboardUrl;
                    a.className = "btn-icon auth-link-dynamic";
                    a.title = isEnglish ? "Dashboard" : "لوحة التحكم";
                    a.style.fontSize = "12px";
                    a.innerHTML = '<i class="fas fa-user-circle"></i>';
                    toolbarNav.appendChild(a);
                }
            } else {
                if (!toolbarNav.querySelector(`a[href="${loginUrl}"]`)) {
                    const a = document.createElement('a');
                    a.href = loginUrl;
                    a.className = "btn-icon auth-link-dynamic";
                    a.title = isEnglish ? "Login" : "تسجيل الدخول";
                    a.style.fontSize = "12px";
                    a.innerHTML = '<i class="fas fa-sign-in-alt"></i>';
                    toolbarNav.appendChild(a);
                }
            }
        }

        // 3. Mobile Auth Button (.mobile-auth-btn)
        const mobileAuthBtn = document.getElementById('mobile-auth-btn');
        if (mobileAuthBtn) {
            if (this.isLoggedIn()) {
                mobileAuthBtn.href = dashboardUrl;
                mobileAuthBtn.innerHTML = `<i class="fas fa-user-circle"></i> <span>${isEnglish ? 'My Account' : 'حسابي'}</span>`;
                mobileAuthBtn.classList.remove('btn-secondary');
                mobileAuthBtn.classList.add('btn-primary');
            } else {
                mobileAuthBtn.href = loginUrl;
                mobileAuthBtn.innerHTML = `<i class="fas fa-sign-in-alt"></i> <span>${isEnglish ? 'Login' : 'دخول'}</span>`;
                mobileAuthBtn.classList.remove('btn-primary');
                mobileAuthBtn.classList.add('btn-secondary');
            }
        }
    }
};

// Auto-run on load to update UI
document.addEventListener('DOMContentLoaded', () => {
    Auth.updateNavAuth();
});
