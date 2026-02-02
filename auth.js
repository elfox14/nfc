'use strict';

const Auth = {
    // API Endpoints
    // Determine Base URL:
    // 1. If 'file:' protocol, default to Render live server.
    // 2. If 'localhost' or '127.0.0.1':
    //    - If port is 3000, use relative paths.
    //    - If port is NOT 3000 (e.g. Live Server 5500), point to http://localhost:3000.
    // 3. Otherwise (production domain), use relative paths.
    getBaseUrl() {
        if (window.location.protocol === 'file:') {
            return 'https://nfc-vjy6.onrender.com';
        }

        const hostname = window.location.hostname;
        if (hostname === 'localhost' || hostname === '127.0.0.1') {
            if (window.location.port !== '3000') {
                // Creating a cross-origin request to the backend server
                return 'http://localhost:3000';
            }
        }

        return ''; // Use relative path
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
        // 1. Main Website Navbar (.nav-links)
        const navContainer = document.querySelector('.nav-links');
        if (navContainer) {
            if (this.isLoggedIn()) {
                const loginLink = Array.from(document.querySelectorAll('a')).find(a => a.href.includes('login.html'));
                if (loginLink && loginLink.parentNode) loginLink.parentNode.style.display = 'none';

                if (!document.querySelector('a[href="/nfc/dashboard.html"]')) {
                    const li = document.createElement('li');
                    li.innerHTML = `<a href="/nfc/dashboard.html">لوحة التحكم</a>`;
                    navContainer.appendChild(li);
                }

                const ctaBtn = document.querySelector('.nav-cta');
                if (ctaBtn) {
                    ctaBtn.textContent = 'لوحة التحكم';
                    ctaBtn.href = '/nfc/dashboard.html';
                }
            } else {
                if (!document.querySelector('a[href="/nfc/login.html"]')) {
                    const li = document.createElement('li');
                    li.innerHTML = `<a href="/nfc/login.html">تسجيل الدخول</a>`;
                    navContainer.appendChild(li);
                }
            }
        }

        // 2. Editor Toolbar (.toolbar-nav)
        const toolbarNav = document.querySelector('.toolbar-nav');
        if (toolbarNav) {
            if (this.isLoggedIn()) {
                if (!toolbarNav.querySelector('a[href="/nfc/dashboard.html"]')) {
                    const a = document.createElement('a');
                    a.href = "/nfc/dashboard.html";
                    a.className = "btn-icon";
                    a.title = "لوحة التحكم";
                    a.style.fontSize = "12px";
                    a.innerHTML = '<i class="fas fa-user-circle"></i>';
                    toolbarNav.appendChild(a);
                }
            } else {
                if (!toolbarNav.querySelector('a[href="/nfc/login.html"]')) {
                    const a = document.createElement('a');
                    a.href = "/nfc/login.html";
                    a.className = "btn-icon";
                    a.title = "تسجيل الدخول";
                    a.style.fontSize = "12px";
                    a.innerHTML = '<i class="fas fa-sign-in-alt"></i>';
                    toolbarNav.appendChild(a);
                }
            }
        }
    }
};

// Auto-run on load to update UI
document.addEventListener('DOMContentLoaded', () => {
    Auth.updateNavAuth();
});
