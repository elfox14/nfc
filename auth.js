'use strict';

/**
 * Auth — MC PRIME NFC
 * Handles: login, register, Google sign-in (popup+postMessage), logout, session, nav UI.
 */
const Auth = {

    getBaseUrl() {
        // Use obfuscated Render URL to prevent exposing it in static scans,
        // and ensure the API is hit directly instead of being intercepted by the front-end SPA router.
        return atob('aHR0cHM6Ly9uZmMtdmp5Ni5vbnJlbmRlci5jb20=');
    },

    get API_LOGIN() { return `${this.getBaseUrl()}/api/auth/login`; },
    get API_REGISTER() { return `${this.getBaseUrl()}/api/auth/register`; },
    get API_REFRESH() { return `${this.getBaseUrl()}/api/auth/refresh`; },
    get API_LOGOUT() { return `${this.getBaseUrl()}/api/auth/logout`; },
    get API_DESIGNS() { return `${this.getBaseUrl()}/api/user/designs`; },
    get API_USER_DESIGNS() { return `${this.getBaseUrl()}/api/user/designs`; },

    token: null,
    user: JSON.parse(localStorage.getItem('authUser') || 'null'),

    isLoggedIn() {
        const userStr = localStorage.getItem('authUser');
        return !!(userStr && userStr !== 'null' && userStr !== 'undefined');
    },

    setSession(token, user) {
        console.log('[Auth] Setting session:', { user, token: token ? (token.substring(0, 10) + '...') : null });
        this.token = token;
        this.user = user;
        localStorage.setItem('authUser', JSON.stringify(user));
    },

    clearSession() {
        this.token = null;
        this.user = null;
        localStorage.removeItem('authUser');
    },

    getHeader() {
        return {};
    },

    isEnglish() {
        return document.documentElement.lang.includes('en') ||
            window.location.pathname.includes('-en');
    },

    t(ar, en) {
        return this.isEnglish() ? en : ar;
    },

    async login(email, password) {
        try {
            const res = await fetch(this.API_LOGIN, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ email, password }),
            });

            const data = await res.json();

            if (data.success) {
                this.setSession(data.token, data.user);
                return { success: true };
            }

            return {
                success: false,
                error: data.error || this.t('فشل تسجيل الدخول', 'Login failed')
            };
        } catch (err) {
            console.error('[Auth] login error:', err);
            return {
                success: false,
                error: this.t('خطأ في الشبكة. تحقق من الاتصال.', 'Network error. Check your connection.')
            };
        }
    },

    async register(name, email, password) {
        try {
            const res = await fetch(this.API_REGISTER, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ name, email, password }),
            });

            const data = await res.json();

            if (data.success) {
                this.setSession(data.token, data.user);
                return { success: true };
            }

            return {
                success: false,
                error: data.error || this.t('فشل إنشاء الحساب', 'Registration failed')
            };
        } catch (err) {
            console.error('[Auth] register error:', err);
            return {
                success: false,
                error: this.t('خطأ في الشبكة. تحقق من الاتصال.', 'Network error. Check your connection.')
            };
        }
    },

    async refreshSession() {
        console.log('[Auth] Attempting to refresh session...');
        try {
            const res = await fetch(this.API_REFRESH, {
                method: 'POST',
                credentials: 'include'
            });

            if (!res.ok) {
                console.warn('[Auth] Refresh request failed with status:', res.status);
                // فقط امسح الجلسة إذا كان الخطأ 401 أو 403 (Unauthorized/Forbidden)
                if (res.status === 401 || res.status === 403) {
                    this.clearSession();
                }
                return false;
            }

            const data = await res.json();

            if (data.success && data.token && data.user) {
                console.log('[Auth] Session refreshed successfully');
                this.setSession(data.token, data.user);
                return true;
            } else {
                console.warn('[Auth] Refresh failed:', data.error || 'Unknown error');
            }
        } catch (err) {
            console.error('[Auth] refresh error:', err);
        }
        return false;
    },

    // Singleton promise to prevent concurrent refreshes
    _refreshPromise: null,

    async apiFetchWithRefresh(url, options = {}) {
        // Ensure headers exist
        options.headers = options.headers || {};
        options.credentials = 'include';
        
        // Add Authorization header if we have a token
        if (this.token) {
            options.headers['Authorization'] = `Bearer ${this.token}`;
        }

        try {
            let res = await fetch(url, options);

            // If token expired (401) or forbidden (403)
            if (res.status === 401 || res.status === 403) {
                console.warn('[Auth] Token expired or unauthorized. Attempting refresh...');

                // Ensure only one refresh call happens at a time
                if (!this._refreshPromise) {
                    this._refreshPromise = this.refreshSession().finally(() => {
                        this._refreshPromise = null;
                    });
                }
                
                const refreshed = await this._refreshPromise;

                if (refreshed) {
                    console.log('[Auth] Refresh successful, retrying original request...');
                    // Update header with new token
                    options.headers['Authorization'] = `Bearer ${this.token}`;
                    // Retry original request
                    res = await fetch(url, options);
                } else {
                    console.error('[Auth] Refresh failed, logging out.');
                    this.logout('SessionExpired');
                }
            }

            return res;
        } catch (err) {
            console.error('[Auth] apiFetch error:', err);
            throw err;
        }
    },

    async logout() {
        try {
            await fetch(this.API_LOGOUT, {
                method: 'POST',
                credentials: 'include'
            });
        } catch (err) {
            console.warn('[Auth] logout request failed:', err);
        }

        this.clearSession();

        const en = this.isEnglish();
        const basePath = window.location.pathname.startsWith('/nfc') ? '/nfc' : '';
        window.location.href = en
            ? `${basePath}/login-en.html`
            : `${basePath}/login.html`;
    },

    async googleSignIn() {
        return new Promise((resolve) => {
            const width = 500;
            const height = 600;
            const left = (window.innerWidth - width) / 2;
            const top = (window.innerHeight - height) / 2;

            const popup = window.open(
                `${this.getBaseUrl()}/api/auth/google?lang=${document.documentElement.lang.includes('en') ? 'en' : 'ar'}`,
                'Google Sign In',
                `width=${width},height=${height},left=${left},top=${top}`
            );

            if (!popup || popup.closed) {
                resolve({
                    success: false,
                    error: document.documentElement.lang === 'en'
                        ? 'Popup blocked. Please allow it.'
                        : 'تم حظر النافذة المنبثقة. يرجى السماح بها.'
                });
                return;
            }

            let finished = false;
            let popupCheckInterval = null;

            const finish = (result) => {
                if (finished) return;
                finished = true;
                window.removeEventListener('message', messageHandler);
                if (popupCheckInterval) clearInterval(popupCheckInterval);
                if (popup && !popup.closed) popup.close();
                resolve(result);
            };

            const messageHandler = (event) => {
                if (event.origin !== this.getBaseUrl() && event.origin !== 'https://mcprim.com' && event.origin !== 'https://www.mcprim.com') return;
                if (!event.data || event.data.type !== 'google-auth' || finished) return;

                if (event.data.success) {
                    this.setSession(event.data.token, event.data.user);
                    finish({ success: true });
                } else {
                    finish({
                        success: false,
                        error: event.data.error || (
                            document.documentElement.lang === 'en'
                                ? 'Login failed'
                                : 'فشل تسجيل الدخول'
                        )
                    });
                }
            };

            window.addEventListener('message', messageHandler);

            // Poll for popup closure — primary fallback when postMessage fails
            // (e.g., when Google's COOP headers null out window.opener)
            popupCheckInterval = setInterval(async () => {
                if (finished) return;
                try {
                    if (popup.closed) {
                        console.log('[Auth] Popup closed. Checking session via refresh...');
                        // Popup closed without postMessage — try refreshSession using HttpOnly cookies
                        const refreshed = await this.refreshSession();
                        if (refreshed) {
                            console.log('[Auth] Session recovered via cookie refresh after popup close');
                            finish({ success: true });
                        } else {
                            // Also check if localStorage was updated (e.g., by #gauth redirect)
                            const userStr = localStorage.getItem('authUser');
                            if (userStr && userStr !== 'null') {
                                this.user = JSON.parse(userStr);
                                console.log('[Auth] Session recovered from localStorage after popup close');
                                finish({ success: true });
                            } else {
                                console.warn('[Auth] Popup closed but no session found');
                                finish({
                                    success: false,
                                    error: document.documentElement.lang === 'en'
                                        ? 'Login window closed. Please try again.'
                                        : 'تم إغلاق نافذة تسجيل الدخول. حاول مرة أخرى.'
                                });
                            }
                        }
                    }
                } catch (e) { /* popup.closed may throw if cross-origin */ }
            }, 1000);

            // Safety timeout — 2 minutes max
            setTimeout(() => {
                finish({
                    success: false,
                    error: document.documentElement.lang === 'en'
                        ? 'Timeout. Try again.'
                        : 'انتهت المهلة. حاول مرة أخرى.'
                });
            }, 120000);
        });
    },

    updateNavAuth() {
        const en = this.isEnglish();
        const basePath = window.location.pathname.startsWith('/nfc') ? '/nfc' : '';
        const loginUrl = en ? `${basePath}/login-en.html` : `${basePath}/login.html`;
        const dashboardUrl = en ? `${basePath}/dashboard-en.html` : `${basePath}/dashboard.html`;
        const dashTxt = en ? 'Control Panel' : 'لوحة التحكم';
        const logoutTxt = en ? 'Logout' : 'خروج';
        const loginTxt = en ? 'Login' : 'تسجيل الدخول';

        const navLinks = document.querySelector('.nav-links');
        const ctaBtn = document.querySelector('.nav-cta');
        const navContent = document.querySelector('.nav-content');

        if (navLinks) {
            if (this.isLoggedIn()) {
                document.querySelectorAll('a').forEach(a => {
                    if (/login/.test(a.href) && !/dashboard/.test(a.href)) {
                        if (a.parentElement) a.parentElement.style.display = 'none';
                    }
                });

                if (ctaBtn) ctaBtn.style.display = 'none';

                if (!document.getElementById('nav-user-info')) {
                    const wrap = document.createElement('div');
                    wrap.id = 'nav-user-info';
                    wrap.style.cssText = 'display:flex;gap:12px;align-items:center;margin-inline-start:15px';

                    const name = document.createElement('span');
                    name.textContent = this.user?.name || (en ? 'User' : 'مستخدم');
                    name.style.cssText = 'color:var(--text-primary-color);font-weight:bold;font-size:.9rem';

                    const dash = document.createElement('a');
                    dash.href = dashboardUrl;
                    dash.className = 'btn';
                    dash.style.cssText = 'padding:8px 15px;background:var(--primary-color);color:#fff;border-radius:6px;text-decoration:none;font-weight:bold;font-size:.9rem';
                    dash.textContent = dashTxt;

                    const out = document.createElement('button');
                    out.innerHTML = '<i class="fas fa-sign-out-alt"></i>';
                    out.title = logoutTxt;
                    out.onclick = () => this.logout();
                    out.style.cssText = 'background:transparent;border:none;color:var(--text-secondary-color);cursor:pointer;font-size:1.1rem';

                    wrap.append(name, dash, out);
                    (ctaBtn?.parentNode || navContent)?.insertBefore(wrap, ctaBtn || null);
                }
            } else {
                document.querySelectorAll('a').forEach(a => {
                    if (/login\.html/.test(a.href) && a.parentElement?.style.display === 'none') {
                        a.parentElement.style.display = '';
                    }
                });
                document.getElementById('nav-user-info')?.remove();
                if (ctaBtn) ctaBtn.style.display = '';
            }
        }

        const toolbar = document.querySelector('.toolbar-nav');
        if (toolbar) {
            const existing = toolbar.querySelector('[data-auth-btn]');
            if (existing) existing.remove();

            const a = document.createElement('a');
            a.dataset.authBtn = '';
            a.className = 'btn-icon';
            a.style.fontSize = '12px';

            if (this.isLoggedIn()) {
                a.href = dashboardUrl;
                a.title = dashTxt;
                a.innerHTML = '<i class="fas fa-user-circle"></i>';
            } else {
                a.href = loginUrl;
                a.title = loginTxt;
                a.innerHTML = '<i class="fas fa-sign-in-alt"></i>';
            }
            toolbar.appendChild(a);
        }
    },
};

document.addEventListener('DOMContentLoaded', async () => {
    if (window.location.pathname.includes('dashboard')) {
        // Only refresh if not already logged in (e.g., from #gauth hash or localStorage)
        if (!Auth.isLoggedIn()) {
            await Auth.refreshSession();
        }
    }
    Auth.updateNavAuth();
});
