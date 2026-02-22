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
    get API_REFRESH() { return `${this.getBaseUrl()}/api/auth/refresh`; },
    get API_LOGOUT() { return `${this.getBaseUrl()}/api/auth/logout`; },

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
                        resolve({ success: false, error: event.data.error || (document.documentElement.lang === 'en' ? 'Login failed' : 'فشل تسجيل الدخول') });
                    }
                    if (popup) popup.close();
                }
            };

            window.addEventListener('message', messageHandler);

            // Check if popup was blocked
            if (!popup || popup.closed) {
                resolve({ success: false, error: (document.documentElement.lang === 'en' ? 'Popup blocked. Please allow it.' : 'تم حظر النافذة المنبثقة. يرجى السماح بها.') });
            }

            // Timeout after 2 minutes
            setTimeout(() => {
                window.removeEventListener('message', messageHandler);
                if (popup && !popup.closed) popup.close();
                resolve({ success: false, error: (document.documentElement.lang === 'en' ? 'Timeout. Try again.' : 'انتهت المهلة. حاول مرة أخرى.') });
            }, 120000);
        });
    },

    async logout() {
        try {
            await fetch(this.API_LOGOUT, {
                method: 'POST',
                // Important to send credentials so the cookie is cleared on the backend
                credentials: 'include'
            });
        } catch (err) {
            console.warn('[Auth] Logout API call failed, continuing local clear', err);
        }

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

    // Refresh Token Method
    async refreshToken() {
        try {
            const response = await fetch(this.API_REFRESH, {
                method: 'POST',
                credentials: 'include' // Important to send the HttpOnly cookie
            });

            const data = await response.json();
            if (response.ok && data.success && data.token) {
                this.token = data.token;
                localStorage.setItem('authToken', data.token);
                return { success: true, token: data.token };
            }
            return { success: false };
        } catch (err) {
            console.error('[Auth] Token refresh error:', err);
            return { success: false };
        }
    },

    /**
     * Helper to perform authenticated fetches with automatic token refresh.
     * Use this instead of global fetch whenever passing auth headers.
     */
    async fetchWithAuth(url, options = {}) {
        let headers = {
            ...options.headers,
            ...this.getHeader()
        };

        let response = await fetch(url, { ...options, headers });

        // If access token is expired (401/403)
        if (response.status === 401 || response.status === 403) {
            const refreshResult = await this.refreshToken();
            // If refresh succeeded, retry original request
            if (refreshResult.success) {
                headers = {
                    ...options.headers,
                    ...this.getHeader() // get the new token
                };
                response = await fetch(url, { ...options, headers });
            } else {
                // If refresh failed, force logout
                this.logout();
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

// Auto-run on load to update UI
document.addEventListener('DOMContentLoaded', () => {
    Auth.updateNavAuth();
});
