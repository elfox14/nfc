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
    // Access token is stored in both sessionStorage (same-tab) and localStorage (cross-script compat)
    // sessionStorage survives page navigations within same tab; localStorage used by editor scripts
    token: sessionStorage.getItem('authToken') || localStorage.getItem('authToken') || null,
    user: JSON.parse(localStorage.getItem('authUser') || 'null'),

    // Methods
    isTokenExpired() {
        if (!this.token) return true;
        try {
            const payload = JSON.parse(atob(this.token.split('.')[1]));
            // Consider expired if less than 30 seconds remaining
            return (payload.exp * 1000) < (Date.now() + 30000);
        } catch (e) {
            return true;
        }
    },

    isLoggedIn() {
        return !!this.token && !this.isTokenExpired();
    },

    // Ensure we have a valid (non-expired) token, refreshing if needed
    async ensureAuth() {
        if (this.isLoggedIn()) return true;
        return await this.refreshAccessToken();
    },

    // Re-obtain an access token from the server using the httpOnly refresh cookie.
    // Call this once on page load to restore auth state without localStorage.
    async refreshAccessToken() {
        try {
            const response = await fetch(`${this.getBaseUrl()}/api/auth/refresh`, {
                method: 'POST',
                credentials: 'include',  // sends httpOnly refreshToken cookie
                headers: { 'Content-Type': 'application/json' }
            });
            if (response.ok) {
                const data = await response.json();
                if (data.token && data.user) {
                    this.setSession(data.token, data.user);
                    return true;
                }
            }
        } catch (err) {
            console.warn('[Auth] refreshAccessToken failed:', err);
        }
        return false;
    },

    async login(email, password) {
        try {
            console.log(`[Auth] Attempting login to: ${this.API_LOGIN}`);
            const response = await fetch(this.API_LOGIN, {
                method: 'POST',
                credentials: 'include',  // receive httpOnly refreshToken cookie
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
                credentials: 'include',  // receive httpOnly refreshToken cookie
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

    // Google Sign-In — redirect-based flow (works on mobile & all browsers)
    googleSignIn(lang) {
        const base = this.getBaseUrl();
        // Only pass the language (ar/en) — the server builds the full redirect URL from PUBLIC_BASE_URL
        const langParam = (lang === 'en') ? 'en' : 'ar';
        window.location.href = `${base}/api/auth/google?lang=${langParam}`;
    },

    // Called by login pages on load to check for google_token or error in URL params
    handleGoogleCallback() {
        const params = new URLSearchParams(window.location.search);
        const googleToken = params.get('google_token');
        const error = params.get('error');

        if (googleToken) {
            try {
                // Decode the one-time JWT payload (we don't verify on frontend, server already validated)
                const payloadB64 = googleToken.split('.')[1];
                const payload = JSON.parse(atob(payloadB64.replace(/-/g, '+').replace(/_/g, '/')));
                if (payload.type === 'google-onetime' && payload.token && payload.user) {
                    this.setSession(payload.token, payload.user);
                    // Clean the URL and redirect to dashboard
                    const isEnglish = document.documentElement.lang.includes('en') || window.location.pathname.includes('-en');
                    window.location.replace(isEnglish ? '/nfc/dashboard-en' : '/nfc/dashboard');
                    return { handled: true, success: true };
                }
            } catch (e) {
                console.error('[Auth] Failed to decode google_token:', e);
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
        // Clear token from memory and sessionStorage
        this.token = null;
        this.user = null;
        sessionStorage.removeItem('authToken');
        localStorage.removeItem('authToken');
        localStorage.removeItem('authUser');
        // Ask server to clear the httpOnly refreshToken cookie
        fetch(`${this.getBaseUrl()}/api/auth/logout`, {
            method: 'POST',
            credentials: 'include'
        }).catch(() => {/* ignore errors during logout */ });
        const isEnglish = document.documentElement.lang.includes('en') || window.location.pathname.includes('-en');
        window.location.href = isEnglish ? '/nfc/login-en.html' : '/nfc/login.html';
    },

    setSession(token, user) {
        this.token = token;
        this.user = user;
        // Save token in sessionStorage so it survives same-tab page navigations (login → dashboard)
        // sessionStorage is tab-scoped and cleared when the tab closes — safer than localStorage
        if (token) {
            sessionStorage.setItem('authToken', token);
            localStorage.setItem('authToken', token);  // for editor-user-status.js + other scripts
        } else {
            sessionStorage.removeItem('authToken');
            localStorage.removeItem('authToken');
        }
        // User display info (not a secret) saved for UI across page loads
        localStorage.setItem('authUser', JSON.stringify(user));
    },

    getHeader() {
        return this.token ? { 'Authorization': `Bearer ${this.token}` } : {};
    },

    // Wrapper around fetch that auto-refreshes the access token on 401
    async fetchWithAuth(url, options = {}) {
        // Proactively refresh if token is expired before making the request
        if (this.isTokenExpired()) {
            await this.refreshAccessToken();
        }

        // Ensure auth header is set with the (possibly refreshed) token
        options.headers = { ...this.getHeader(), ...(options.headers || {}) };
        let response = await fetch(url, options);

        // Safety net: if still 401, try refreshing one more time and retry
        if (response.status === 401) {
            const refreshed = await this.refreshAccessToken();
            if (refreshed) {
                options.headers = { ...this.getHeader(), ...(options.headers || {}) };
                response = await fetch(url, options);
            }
        }
        return response;
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
        const navContent = document.querySelector('.nav-content'); // Container for positioning

        if (navContainer) {
            if (this.isLoggedIn()) {
                // Hide Login Link in Nav
                const loginLink = Array.from(document.querySelectorAll('a')).find(a => a.href.includes('login') && !a.href.includes('dashboard'));
                if (loginLink && loginLink.parentNode) loginLink.parentNode.style.display = 'none';

                // We want to replace the CTA with: User Name + Control Panel Button
                if (ctaBtn) {
                    ctaBtn.style.display = 'none'; // Hide default CTA

                    // Check if we already added the user info container
                    let userInfoContainer = document.getElementById('nav-user-info');
                    if (!userInfoContainer) {
                        userInfoContainer = document.createElement('div');
                        userInfoContainer.id = 'nav-user-info';
                        userInfoContainer.style.cssText = 'display: flex; gap: 15px; align-items: center; margin-inline-start: 15px;';

                        // User Name
                        const userName = document.createElement('span');
                        userName.textContent = this.user?.name || (isEnglish ? 'User' : 'مستخدم');
                        userName.style.cssText = 'color: var(--text-primary-color); font-weight: bold; font-size: 0.9rem;';

                        // Control Panel Button
                        const dashboardBtn = document.createElement('a');
                        dashboardBtn.href = dashboardUrl;
                        dashboardBtn.className = 'btn';
                        // Reuse styling from nav-cta but maybe adjust slightly or add specific class
                        dashboardBtn.style.cssText = 'padding: 8px 15px; background: var(--primary-color); color: white; border-radius: 6px; text-decoration: none; font-weight: bold; font-size: 0.9rem;';
                        dashboardBtn.textContent = dashboardText;

                        // Logout Icon/Button (Optional but good UX)
                        const logoutBtn = document.createElement('button');
                        logoutBtn.innerHTML = '<i class="fas fa-sign-out-alt"></i>';
                        logoutBtn.title = logoutText;
                        logoutBtn.onclick = () => this.logout();
                        logoutBtn.style.cssText = 'background: transparent; border: none; color: var(--text-secondary-color); cursor: pointer; font-size: 1.1rem;';

                        userInfoContainer.appendChild(userName);
                        userInfoContainer.appendChild(dashboardBtn);
                        userInfoContainer.appendChild(logoutBtn);

                        // Insert where CTA was (handle nested containers safely)
                        if (ctaBtn.parentNode) {
                            ctaBtn.parentNode.insertBefore(userInfoContainer, ctaBtn);
                        } else if (navContent) {
                            // Fallback if ctaBtn is somehow detached or we want to append to main nav
                            navContent.appendChild(userInfoContainer);
                        }
                    }
                }

            } else {
                // Logged Out State: Ensure standard Login/CTA is visible
                const loginLink = Array.from(document.querySelectorAll('a')).find(a => a.href.includes('login') && !a.href.includes('user'));
                // Note: user-login-link in editor might match, but we are in nav-links loop usually. 
                // Using specific check to be safe:
                const allLinks = document.querySelectorAll('a');
                allLinks.forEach(link => {
                    if ((link.href.includes('login.html') || link.href.includes('login-en.html')) && link.style.display === 'none') {
                        link.parentNode.style.display = ''; // Show li if hidden
                    }
                });

                // Remove user info if exists
                const userInfoContainer = document.getElementById('nav-user-info');
                if (userInfoContainer) userInfoContainer.remove();

                if (ctaBtn) {
                    ctaBtn.style.display = ''; // Show default CTA
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
                    a.innerHTML = '<i class="fas fa-user-circle"></i>';
                    toolbarNav.appendChild(a);
                }
            } else {
                if (!toolbarNav.querySelector(`a[href="${loginUrl}"]`)) {
                    const a = document.createElement('a');
                    a.href = loginUrl;
                    a.className = "btn-icon";
                    a.title = loginText;
                    a.style.fontSize = "12px";
                    a.innerHTML = '<i class="fas fa-sign-in-alt"></i>';
                    toolbarNav.appendChild(a);
                }
            }
        }
    }
};

// Auto-run on load to update UI — restore session if needed
document.addEventListener('DOMContentLoaded', async () => {
    if (!Auth.isLoggedIn()) {
        await Auth.refreshAccessToken();
    }
    Auth.updateNavAuth();
});
