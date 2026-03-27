'use strict';

const Auth = {
    // API Endpoints
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
            return { success: false, error: 'Network error: Unable to connect to server' };
        }
    },

    async register(name, email, password) {
        try {
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
            return { success: false, error: 'Network error: Unable to connect to server' };
        }
    },

    // Google Sign-In — redirect-based flow (works on mobile & all browsers)
    googleSignIn(lang) {
        const base = this.getBaseUrl();
        const langParam = (lang === 'en') ? 'en' : 'ar';
        window.location.href = `${base}/api/auth/google?lang=${langParam}`;
    },

    // Called by dashboard on load to handle Google OAuth redirect via URL hash (#gauth=...)
    // Server sends: dashboard.html#gauth=BASE64_JSON({token, user})
    handleGoogleHashAuth() {
        const hash = window.location.hash;
        if (!hash || !hash.startsWith('#gauth=')) {
            return { handled: false };
        }
        try {
            const encoded = hash.slice('#gauth='.length);
            let b64 = encoded.replace(/-/g, '+').replace(/_/g, '/');
            while (b64.length % 4) b64 += '=';
            const decodedStr = decodeURIComponent(escape(atob(b64)));
            const decoded = JSON.parse(decodedStr);
            if (decoded && decoded.token && decoded.user) {
                this.setSession(decoded.token, decoded.user);
                // Clean URL hash without triggering a page reload
                if (window.history && window.history.replaceState) {
                    window.history.replaceState(null, '', window.location.pathname + window.location.search);
                }
                return { handled: true, success: true };
            }
        } catch (e) {
            return { handled: true, success: false, error: 'فشل معالجة رمز تسجيل الدخول بجوجل' };
        }
        return { handled: false };
    },

    // Called by login pages on load to check for google_token or error in URL params
    handleGoogleCallback() {
        const params = new URLSearchParams(window.location.search);
        const googleToken = params.get('google_token');
        const error = params.get('error');

        if (googleToken) {
            try {
                // Clean the token from URL immediately to avoid logging/history exposure
                if (window.history && window.history.replaceState) {
                    window.history.replaceState(null, '', window.location.pathname);
                }
                // Decode the one-time JWT payload (server already validated the signature)
                const payloadB64 = googleToken.split('.')[1];
                let b64 = payloadB64.replace(/-/g, '+').replace(/_/g, '/');
                while (b64.length % 4) b64 += '=';
                const decodedStr = decodeURIComponent(escape(atob(b64)));
                const payload = JSON.parse(decodedStr);
                if (payload && payload.token && payload.user) {
                    this.setSession(payload.token, payload.user);
                    const isEnglish = document.documentElement.lang.includes('en') || window.location.pathname.includes('-en');
                    window.location.replace(isEnglish ? '/nfc/dashboard-en.html' : '/nfc/dashboard.html');
                    return { handled: true, success: true };
                }
            } catch (e) {
                return { handled: true, success: false, error: 'فشل معالجة رمز تسجيل الدخول' };
            }
        }

        if (error) {
            const msg = decodeURIComponent(error);
            return { handled: true, success: false, error: msg };
        }

        return { handled: false };
    },

    logout() {
        localStorage.removeItem('authToken');
        localStorage.removeItem('authUser');
        this.token = null;
        this.user = null;
        const isEnglish = document.documentElement.lang.includes('en') || window.location.pathname.includes('-en');
        window.location.href = isEnglish ? '/nfc/login-en.html' : '/nfc/login.html';
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
        const isEnglish = document.documentElement.lang.includes('en') || window.location.pathname.includes('-en');
        const loginUrl = isEnglish ? '/nfc/login-en.html' : '/nfc/login.html';
        const dashboardUrl = isEnglish ? '/nfc/dashboard-en.html' : '/nfc/dashboard.html';
        const loginText = isEnglish ? 'Login' : 'تسجيل الدخول';
        const dashboardText = isEnglish ? 'Control Panel' : 'لوحة التحكم';
        const logoutText = isEnglish ? 'Logout' : 'خروج';

        // 1. Main Website Navbar (.nav-links & .nav-cta)
        const navContainer = document.querySelector('.nav-links');
        const ctaBtn = document.querySelector('.nav-cta');
        const navContent = document.querySelector('.nav-content');

        if (navContainer) {
            if (this.isLoggedIn()) {
                const loginLink = Array.from(document.querySelectorAll('a')).find(a => a.href.includes('login') && !a.href.includes('dashboard'));
                if (loginLink && loginLink.parentNode) loginLink.parentNode.style.display = 'none';

                if (ctaBtn) {
                    ctaBtn.style.display = 'none';
                    let userInfoContainer = document.getElementById('nav-user-info');
                    if (!userInfoContainer) {
                        userInfoContainer = document.createElement('div');
                        userInfoContainer.id = 'nav-user-info';
                        userInfoContainer.style.cssText = 'display: flex; gap: 15px; align-items: center; margin-inline-start: 15px;';

                        const userName = document.createElement('span');
                        userName.textContent = this.user?.name || (isEnglish ? 'User' : 'مستخدم');
                        userName.style.cssText = 'color: var(--text-primary-color); font-weight: bold; font-size: 0.9rem;';

                        const dashboardBtn = document.createElement('a');
                        dashboardBtn.href = dashboardUrl;
                        dashboardBtn.className = 'btn';
                        dashboardBtn.style.cssText = 'padding: 8px 15px; background: var(--primary-color); color: white; border-radius: 6px; text-decoration: none; font-weight: bold; font-size: 0.9rem;';
                        dashboardBtn.textContent = dashboardText;

                        const logoutBtn = document.createElement('button');
                        logoutBtn.innerHTML = '';
                        logoutBtn.title = logoutText;
                        logoutBtn.onclick = () => this.logout();
                        logoutBtn.style.cssText = 'background: transparent; border: none; color: var(--text-secondary-color); cursor: pointer; font-size: 1.1rem;';

                        userInfoContainer.appendChild(userName);
                        userInfoContainer.appendChild(dashboardBtn);
                        userInfoContainer.appendChild(logoutBtn);

                        if (ctaBtn.parentNode) {
                            ctaBtn.parentNode.insertBefore(userInfoContainer, ctaBtn);
                        } else if (navContent) {
                            navContent.appendChild(userInfoContainer);
                        }
                    }
                }
            } else {
                const allLinks = document.querySelectorAll('a');
                allLinks.forEach(link => {
                    if ((link.href.includes('login.html') || link.href.includes('login-en.html')) && link.style.display === 'none') {
                        link.parentNode.style.display = '';
                    }
                });
                const userInfoContainer = document.getElementById('nav-user-info');
                if (userInfoContainer) userInfoContainer.remove();
                if (ctaBtn) {
                    ctaBtn.style.display = '';
                }
            }
        }

        // 2. Editor Toolbar (.toolbar-nav)
        const toolbarNav = document.querySelector('.toolbar-nav');
        if (toolbarNav) {
            if (this.isLoggedIn()) {
                if (!toolbarNav.querySelector(`a[href="${dashboardUrl}"]`)) {
                    const a = document.createElement('a');
                    a.href = dashboardUrl;
                    a.className = "btn-icon";
                    a.title = dashboardText;
                    a.style.fontSize = "12px";
                    a.innerHTML = '';
                    toolbarNav.appendChild(a);
                }
            } else {
                if (!toolbarNav.querySelector(`a[href="${loginUrl}"]`)) {
                    const a = document.createElement('a');
                    a.href = loginUrl;
                    a.className = "btn-icon";
                    a.title = loginText;
                    a.style.fontSize = "12px";
                    a.innerHTML = '';
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
