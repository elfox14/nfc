'use strict';

/**
 * Auth — MC PRIME NFC
 * Handles: login, register, Google sign-in (popup+postMessage), logout, session, nav UI.
 */
const Auth = {

    getBaseUrl() {
        const configuredBase = typeof window.__API_BASE_URL === 'string'
            ? window.__API_BASE_URL.trim()
            : '';

        // The frontend and API are served by the same Render service by default.
        // Keeping requests same-origin lets Fetch Metadata and HttpOnly cookies work
        // without coupling the deployment to a retired Render hostname.
        return (configuredBase || window.location.origin).replace(/\/+$/, '');
    },

    get API_LOGIN() { return `${this.getBaseUrl()}/api/auth/login`; },
    get API_REGISTER() { return `${this.getBaseUrl()}/api/auth/register`; },
    get API_REFRESH() { return `${this.getBaseUrl()}/api/auth/refresh`; },
    get API_LOGOUT() { return `${this.getBaseUrl()}/api/auth/logout`; },
    get API_DESIGNS() { return `${this.getBaseUrl()}/api/user/designs`; },
    get API_USER_DESIGNS() { return `${this.getBaseUrl()}/api/user/designs`; },
    get API_SESSION_INIT() { return `${this.getBaseUrl()}/api/auth/session-init`; },

    token: null, // Legacy placeholder; browser auth uses HttpOnly cookies only.
    user: JSON.parse(localStorage.getItem('authUser') || 'null'),

    isLoggedIn() {
        const userStr = localStorage.getItem('authUser');
        return !!(userStr && userStr !== 'null' && userStr !== 'undefined');
    },

    setSession(token, user) {
        console.log('[Auth] Setting session:', { user: user?.email });
        this.user = user;
        localStorage.setItem('authUser', JSON.stringify(user));
        this.token = null;
        localStorage.removeItem('authToken');
    },

    clearSession() {
        this.user = null;
        localStorage.removeItem('authUser');
        localStorage.removeItem('authToken'); // Clean up legacy token if present
    },

    getHeader() {
        localStorage.removeItem('authToken');
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
                if (data.warning === 'email_not_verified') {
                    setTimeout(() => this._showVerificationBanner(), 1000);
                }
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
                // Only clear session if 401/403 AND no valid token in localStorage
                // (Don't clear if session was set via #gauth redirect but cookies are blocked)
                if (res.status === 401 || res.status === 403) {
                    if (!localStorage.getItem('authUser')) {
                        this.clearSession();
                    }
                }
                return false;
            }

            const data = await res.json();

            if (data.success && data.user) {
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

    async sessionInit(token) {
        console.log('[Auth] Initializing session via token...');
        try {
            const res = await fetch(this.API_SESSION_INIT, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ initToken: token }),
            });

            if (!res.ok) {
                console.warn('[Auth] sessionInit failed with status:', res.status);
                this.lastInitError = `HTTP ${res.status}`;
                return false;
            }

            const data = await res.json();
            if (data.success) {
                console.log('[Auth] Session initialized successfully via token');
                if (data.user) this.setSession(data.token, data.user);
                return true;
            }
        } catch (err) {
            console.error('[Auth] sessionInit error:', err);
            this.lastInitError = err.message || 'Network Error';
        }
        return false;
    },

    // Variable to store the last error for UI feedback
    lastInitError: null,

    // Singleton promise to prevent concurrent refreshes
    _refreshPromise: null,

    async apiFetchWithRefresh(url, options = {}) {
        // Ensure headers exist and inject auth token
        options.headers = { ...(options.headers || {}), ...this.getHeader() };
        // SECURITY: Auth is handled by HttpOnly cookies (where supported)
        options.credentials = 'include';
        // Prevent API caching in browser
        options.cache = 'no-store';

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
                    // Update headers with the NEW token
                    options.headers = { ...options.headers, ...this.getHeader() };
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
            const authUrl = `${this.getBaseUrl()}/api/auth/google?lang=${document.documentElement.lang.includes('en') ? 'en' : 'ar'}`;
            
            // On mobile or in-app browsers, popups are often blocked or fail. Use direct redirect.
            const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || window.innerWidth <= 768;
            if (isMobile) {
                window.location.href = authUrl;
                return; // Page will unload, promise won't resolve here
            }

            const width = 500;
            const height = 600;
            const left = (window.innerWidth - width) / 2;
            const top = (window.innerHeight - height) / 2;

            const popup = window.open(
                authUrl,
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
                if (bc) bc.close();
                resolve(result);
            };

            // BroadcastChannel fallback for when COOP blocks window.opener
            let bc = null;
            try {
                bc = new BroadcastChannel('mcprime-auth');
                bc.onmessage = async (event) => {
                    if (finished || !event.data || event.data.type !== 'google-auth') return;
                    if (event.data.success && event.data.initToken) {
                        const initialized = await this.sessionInit(event.data.initToken);
                        if (initialized) {
                            finish({ success: true });
                        }
                    }
                };
            } catch (e) { /* BroadcastChannel not supported, fallback to polling */ }

            const messageHandler = async (event) => {
                // SECURITY: Verify the origin is either the API URL or your frontends
                const allowed = [this.getBaseUrl(), 'https://mcprim.com', 'https://www.mcprim.com'];
                const isAllowed = allowed.some(origin => {
                    if (event.origin === origin) return true;
                    // Flexible matching (www vs non-www)
                    const cleanEvent = event.origin.replace(/^https?:\/\/(www\.)?/, '').toLowerCase();
                    const cleanOrigin = origin.replace(/^https?:\/\/(www\.)?/, '').toLowerCase();
                    return cleanEvent === cleanOrigin;
                });

                if (!isAllowed) {
                    console.warn('[Auth] Blocked message from unknown origin:', event.origin);
                    return;
                }

                if (!event.data || event.data.type !== 'google-auth' || finished) return;

                if (event.data.success) {
                    // SECURITY: Try to initialize via one-time token first (bypasses third-party cookie blocking)
                    // If no token, fallback to refreshSession which relies on cookies.
                    let initialized = false;
                    if (event.data.initToken) {
                        initialized = await this.sessionInit(event.data.initToken);
                    }

                    if (!initialized) {
                        console.log('[Auth] No init token or init failed, trying cookie-based refresh...');
                        initialized = await this.refreshSession();
                    }

                    if (initialized) {
                        finish({ success: true });
                    } else {
                        const errorReason = this.lastInitError ? ` (${this.lastInitError})` : '';
                        finish({
                            success: false,
                            error: document.documentElement.lang === 'en'
                                ? `Authentication succeeded but session could not be established${errorReason}. Please try again.`
                                : `نجحت المصادقة لكن لم نتمكن من إنشاء الجلسة${errorReason}. حاول مرة أخرى.`
                        });
                    }
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

            // Storage event listener — catches when popup/redirect writes to localStorage
            const storageHandler = (e) => {
                if (finished) return;
                if (e.key === 'authUser' && e.newValue && e.newValue !== 'null') {
                    console.log('[Auth] User detected via storage event');
                    this.user = JSON.parse(e.newValue);
                    window.removeEventListener('storage', storageHandler);
                    finish({ success: true });
                }
            };
            window.addEventListener('storage', storageHandler);

            // Poll for popup closure OR localStorage changes
            // COOP headers from Google may block popup.closed, so we also check localStorage
            let popupClosedRetries = 0;
            popupCheckInterval = setInterval(async () => {
                if (finished) return;

                // Check 1: Did localStorage get a user? (from redirect in popup)
                const storedUser = localStorage.getItem('authUser');
                if (storedUser && storedUser !== 'null') {
                    console.log('[Auth] User found in localStorage (from popup redirect)');
                    this.user = JSON.parse(storedUser);
                    window.removeEventListener('storage', storageHandler);
                    finish({ success: true });
                    return;
                }

                // Check 2: Try popup.closed (may throw due to COOP)
                let popupClosed = false;
                try { popupClosed = popup.closed; } catch (e) { /* COOP blocks this */ }

                if (popupClosed) {
                    popupClosedRetries++;
                    console.log(`[Auth] Popup closed detected (attempt ${popupClosedRetries}). Trying session recovery...`);

                    // Wait a bit on first detection — cookies may still be in-flight
                    if (popupClosedRetries === 1) {
                        return; // Skip this cycle, try on next poll
                    }

                    // Try refreshSession (uses HttpOnly cookies set during OAuth callback)
                    const refreshed = await this.refreshSession();
                    if (refreshed) {
                        console.log('[Auth] Session recovered via cookie refresh');
                        window.removeEventListener('storage', storageHandler);
                        finish({ success: true });
                    } else {
                        // Re-check localStorage one more time
                        const userNow = localStorage.getItem('authUser');
                        if (userNow && userNow !== 'null') {
                            this.user = JSON.parse(userNow);
                            window.removeEventListener('storage', storageHandler);
                            finish({ success: true });
                        } else if (popupClosedRetries >= 3) {
                            // Give up after 3 retries
                            console.warn('[Auth] Popup closed but no session found after retries');
                            window.removeEventListener('storage', storageHandler);
                            finish({
                                success: false,
                                error: document.documentElement.lang === 'en'
                                    ? 'Login window closed. Please try again.'
                                    : 'تم إغلاق نافذة تسجيل الدخول. حاول مرة أخرى.'
                            });
                        }
                        // else: wait for next poll cycle
                    }
                }
            }, 2000);

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

    _showVerificationBanner() {
        if (document.getElementById('email-verify-banner')) return;
        const en = this.isEnglish();
        const banner = document.createElement('div');
        banner.id = 'email-verify-banner';
        banner.style.cssText = 'position:fixed;bottom:0;left:0;right:0;z-index:99998;background:linear-gradient(135deg,#f59e0b,#d97706);color:#1a1a1a;padding:12px 20px;display:flex;align-items:center;justify-content:center;gap:12px;font-family:Inter,sans-serif;font-size:14px;font-weight:500;box-shadow:0 -2px 12px rgba(0,0,0,.15)';
        banner.innerHTML = `
            <span>${en ? '⚠️ Your email is not verified. Some features may be limited.' : '⚠️ بريدك الإلكتروني غير مُتحقق. بعض الميزات قد تكون محدودة.'}</span>
            <button id="verify-resend-btn" style="padding:6px 16px;background:#1a1a1a;color:#f59e0b;border:none;border-radius:6px;cursor:pointer;font-weight:600;font-size:13px;white-space:nowrap">${en ? 'Resend Email' : 'إعادة الإرسال'}</button>
            <button onclick="this.parentElement.remove()" style="background:none;border:none;color:#1a1a1a;cursor:pointer;font-size:18px;padding:0 4px;opacity:.6">✕</button>
        `;
        document.body.appendChild(banner);
        document.getElementById('verify-resend-btn').addEventListener('click', async (e) => {
            e.target.disabled = true;
            e.target.textContent = en ? 'Sending...' : 'جارٍ الإرسال...';
            try {
                const res = await this.apiFetchWithRefresh(`${this.getBaseUrl()}/api/auth/resend-verification`, { method: 'POST' });
                const data = await res.json();
                e.target.textContent = data.success ? (en ? '✓ Sent!' : '✓ تم الإرسال!') : (en ? 'Failed' : 'فشل');
            } catch (err) {
                e.target.textContent = en ? 'Error' : 'خطأ';
            }
        });
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
