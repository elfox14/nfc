'use strict';

/**
 * Auth — MC PRIME NFC
 * Handles: login, register, Google sign-in (popup+postMessage), logout, session, nav UI.
 */
const Auth = {

    // ─── Config ────────────────────────────────────────────────────────────────

    getBaseUrl() {
        const p = window.location.protocol;
        const h = window.location.hostname;
        if (p === 'file:')                          return 'https://nfc-vjy6.onrender.com';
        if (h === 'localhost' || h === '127.0.0.1') return 'http://localhost:3000';
        return 'https://nfc-vjy6.onrender.com';
    },

    get API_LOGIN()    { return `${this.getBaseUrl()}/api/auth/login`; },
    get API_REGISTER() { return `${this.getBaseUrl()}/api/auth/register`; },
    get API_DESIGNS()  { return `${this.getBaseUrl()}/api/user/designs`; },

    // ─── Session ───────────────────────────────────────────────────────────────

    token: localStorage.getItem('authToken'),
    user:  JSON.parse(localStorage.getItem('authUser') || 'null'),

    isLoggedIn() { return !!this.token; },

    setSession(token, user) {
        this.token = token;
        this.user  = user;
        localStorage.setItem('authToken', token);
        localStorage.setItem('authUser',  JSON.stringify(user));
    },

    clearSession() {
        this.token = null;
        this.user  = null;
        localStorage.removeItem('authToken');
        localStorage.removeItem('authUser');
    },

    getHeader() {
        return this.token ? { Authorization: `Bearer ${this.token}` } : {};
    },

    // ─── Language helpers ──────────────────────────────────────────────────────

    isEnglish() {
        return document.documentElement.lang.includes('en')
            || window.location.pathname.includes('-en');
    },

    t(ar, en) {
        return this.isEnglish() ? en : ar;
    },

    // ─── Login ─────────────────────────────────────────────────────────────────

    async login(email, password) {
        try {
            const res  = await fetch(this.API_LOGIN, {
                method:  'POST',
                headers: { 'Content-Type': 'application/json' },
                body:    JSON.stringify({ email, password }),
            });
            const data = await res.json();
            if (data.success) {
                this.setSession(data.token, data.user);
                return { success: true };
            }
            return { success: false, error: data.error || this.t('فشل تسجيل الدخول', 'Login failed') };
        } catch (err) {
            console.error('[Auth] login error:', err);
            return { success: false, error: this.t('خطأ في الشبكة. تحقق من الاتصال.', 'Network error. Check your connection.') };
        }
    },

    // ─── Register ──────────────────────────────────────────────────────────────

    async register(name, email, password) {
        try {
            const res  = await fetch(this.API_REGISTER, {
                method:  'POST',
                headers: { 'Content-Type': 'application/json' },
                body:    JSON.stringify({ name, email, password }),
            });
            const data = await res.json();
            if (data.success) {
                this.setSession(data.token, data.user);
                return { success: true };
            }
            return { success: false, error: data.error || this.t('فشل إنشاء الحساب', 'Registration failed') };
        } catch (err) {
            console.error('[Auth] register error:', err);
            return { success: false, error: this.t('خطأ في الشبكة. تحقق من الاتصال.', 'Network error. Check your connection.') };
        }
    },

    // ─── Google Sign-In (popup + postMessage) ──────────────────────────────────

    googleSignIn() {
        return new Promise((resolve) => {
            const W = 500, H = 600;
            const left = Math.round((window.innerWidth  - W) / 2);
            const top  = Math.round((window.innerHeight - H) / 2);
            const lang = this.isEnglish() ? 'en' : 'ar';

            const popup = window.open(
                `${this.getBaseUrl()}/api/auth/google?lang=${lang}`,
                'google-auth',
                `width=${W},height=${H},left=${left},top=${top},resizable=yes,scrollbars=yes`
            );

            // Popup blocked
            if (!popup || popup.closed) {
                return resolve({
                    success: false,
                    error: this.t(
                        'تم حظر النافذة المنبثقة. يرجى السماح بها من إعدادات المتصفح.',
                        'Popup blocked. Please allow popups for this site.'
                    ),
                });
            }

            let done = false;

            const finish = (result) => {
                if (done) return;
                done = true;
                window.removeEventListener('message', onMessage);
                clearTimeout(timer);
                if (popup && !popup.closed) popup.close();
                resolve(result);
            };

            const onMessage = (event) => {
                // Security: only accept messages from our backend
                const allowedOrigin = this.getBaseUrl();
                if (event.origin !== allowedOrigin) return;
                if (!event.data || event.data.type !== 'google-auth') return;

                if (event.data.success) {
                    this.setSession(event.data.token, event.data.user);
                    finish({ success: true });
                } else {
                    finish({
                        success: false,
                        error: event.data.error || this.t('فشل تسجيل الدخول', 'Login failed'),
                    });
                }
            };

            window.addEventListener('message', onMessage);

            // Timeout after 2 minutes
            const timer = setTimeout(() => {
                finish({
                    success: false,
                    error: this.t('انتهت المهلة. يرجى المحاولة مجدداً.', 'Timed out. Please try again.'),
                });
            }, 120_000);

            // Also detect if user closes popup manually
            const pollClosed = setInterval(() => {
                if (done) { clearInterval(pollClosed); return; }
                if (popup.closed) {
                    clearInterval(pollClosed);
                    finish({
                        success: false,
                        error: this.t('أُغلقت نافذة Google. يرجى المحاولة مجدداً.', 'Google window closed. Please try again.'),
                    });
                }
            }, 500);
        });
    },

    // ─── Logout ────────────────────────────────────────────────────────────────

    logout() {
        this.clearSession();
        const base = window.location.pathname.includes('/nfc/') ? '/nfc' : '';
        window.location.href = this.isEnglish()
            ? `${base}/login-en.html`
            : `${base}/login.html`;
    },

    // ─── Nav UI ────────────────────────────────────────────────────────────────

    updateNavAuth() {
        const en           = this.isEnglish();
        const loginUrl     = en ? '/nfc/login-en.html'     : '/nfc/login.html';
        const dashboardUrl = en ? '/nfc/dashboard-en.html' : '/nfc/dashboard.html';
        const dashTxt      = en ? 'Control Panel'          : 'لوحة التحكم';
        const logoutTxt    = en ? 'Logout'                 : 'خروج';
        const loginTxt     = en ? 'Login'                  : 'تسجيل الدخول';

        // ── Main navbar ────────────────────────────────────────────────────────
        const navLinks = document.querySelector('.nav-links');
        const ctaBtn   = document.querySelector('.nav-cta');
        const navContent = document.querySelector('.nav-content');

        if (navLinks) {
            if (this.isLoggedIn()) {
                // Hide any raw login links inside nav
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
                // Logged-out: restore hidden links
                document.querySelectorAll('a').forEach(a => {
                    if (/login\.html/.test(a.href) && a.parentElement?.style.display === 'none') {
                        a.parentElement.style.display = '';
                    }
                });
                document.getElementById('nav-user-info')?.remove();
                if (ctaBtn) ctaBtn.style.display = '';
            }
        }

        // ── Editor toolbar ─────────────────────────────────────────────────────
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

document.addEventListener('DOMContentLoaded', () => Auth.updateNavAuth());
