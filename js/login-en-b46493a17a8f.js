document.addEventListener('DOMContentLoaded', () => {
            const params = new URLSearchParams(window.location.search);
            const redirectParam = params.get('redirect');

            const getTargetUrl = (defaultUrl) => {
                if (!redirectParam) return defaultUrl;
                // Basic safety check for redirect
                if (redirectParam.startsWith('http') && !redirectParam.includes(window.location.hostname)) {
                    return defaultUrl;
                }
                return redirectParam;
            };

            // ── 1. Handle Google OAuth callback first ──────────────────────
            const googleToken = params.get('google_token');
            const oauthError = params.get('error');

            if (googleToken) {
                document.body.innerHTML = '<div style="display:flex;align-items:center;justify-content:center;height:100vh;flex-direction:column;gap:16px;background:#0f1923;color:#fff;font-family:Tajawal,sans-serif;"><i class="fas fa-spinner fa-spin" style="font-size:2rem;color:#4da6ff;"></i><p>Signing in...</p></div>';
                try {
                    const payloadB64 = googleToken.split('.')[1];
                    let b64 = payloadB64.replace(/-/g, '+').replace(/_/g, '/');
                    while (b64.length % 4) b64 += '=';
                    const decodedStr = decodeURIComponent(escape(atob(b64)));
                    const payload = JSON.parse(decodedStr);
                    console.log('[DEBUG] decoded payload type:', payload?.type);
                    if (payload && payload.token && payload.user) {
                        Auth.setSession(payload.token, payload.user);
                        window.location.replace(getTargetUrl('/nfc/dashboard-en.html'));
                        return;
                    } else {
                        document.body.innerHTML = '<div id="error-box" style="display:flex;align-items:center;justify-content:center;height:100vh;flex-direction:column;gap:16px;background:#0f1923;color:#ff5252;font-family:Tajawal,sans-serif;padding:20px;text-align:center;"><i class="fas fa-exclamation-circle" style="font-size:2rem;"></i><p>Error processing Google token. Please try again.</p><a href="/nfc/login-en.html" style="color:#4da6ff;margin-top:10px;">Return to login</a></div>';
                        console.error('[DEBUG] Unexpected payload:', payload);
                    }
                } catch (e) {
                    console.error('[Auth] Token decode error:', e);
                    document.body.innerHTML = '<div id="error-box" style="display:flex;align-items:center;justify-content:center;height:100vh;flex-direction:column;gap:16px;background:#0f1923;color:#ff5252;font-family:Tajawal,sans-serif;padding:20px;text-align:center;"><i class="fas fa-exclamation-circle" style="font-size:2rem;"></i><p>Error processing Google token. Please try again.</p><a href="/nfc/login-en.html" style="color:#4da6ff;margin-top:10px;">Return to login</a></div>';
                }
                return;
            }

            if (oauthError) {
                const errorBox = document.getElementById('error-box');
                if (errorBox) {
                    let displayError = decodeURIComponent(oauthError);
                    if (displayError === 'AuthNotLoggedIn') {
                        displayError = 'Please login first to access this page.';
                    } else if (displayError === 'SessionExpired') {
                        displayError = 'Your session has expired. Please login again.';
                    }
                    errorBox.textContent = displayError;
                    errorBox.style.display = 'block';
                }
            }

            // ── 2. Login form ──────────────────────────────────────────────
            document.getElementById('login-form').addEventListener('submit', async (e) => {
                e.preventDefault();
                const email = document.getElementById('email').value;
                const password = document.getElementById('password').value;
                const btn = e.target.querySelector('button');
                const errorBox = document.getElementById('error-box');

                btn.disabled = true;
                btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Logging in...';
                errorBox.style.display = 'none';

                const result = await Auth.login(email, password);

                if (result.success) {
                    window.location.href = getTargetUrl('/nfc/dashboard-en.html');
                } else {
                    errorBox.textContent = result.error;
                    errorBox.style.display = 'block';
                    btn.disabled = false;
                    btn.textContent = 'Login';
                }
            });

            // ── 3. Google Sign-In button ────────────────────────────────────
            document.getElementById('google-signin-btn').addEventListener('click', async () => {
                const btn = document.getElementById('google-signin-btn');
                const errorBox = document.getElementById('error-box');

                btn.disabled = true;
                btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Verifying...';
                errorBox.style.display = 'none';

                // Listen for localStorage changes from the popup (cross-tab fallback)
                let storageResolved = false;
                const storageHandler = (e) => {
                    if (e.key === 'authUser' && e.newValue && e.newValue !== 'null') {
                        storageResolved = true;
                        window.removeEventListener('storage', storageHandler);
                        Auth.user = JSON.parse(e.newValue);
                        window.location.href = getTargetUrl('/nfc/dashboard-en.html');
                    }
                };
                window.addEventListener('storage', storageHandler);

                try {
                    const result = await Auth.googleSignIn();
                    window.removeEventListener('storage', storageHandler);
                    if (storageResolved) return;
                    if (result.success) {
                        window.location.href = getTargetUrl('/nfc/dashboard-en.html');
                    } else {
                        throw new Error(result.error || 'Login failed');
                    }
                } catch (err) {
                    if (storageResolved) return;
                    window.removeEventListener('storage', storageHandler);
                    errorBox.textContent = err.message || 'Google Sign-In failed';
                    errorBox.style.display = 'block';
                    btn.disabled = false;
                    btn.innerHTML = '<svg width="20" height="20" viewBox="0 0 24 24" style="min-width: 20px;"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg><span style="flex-grow: 1; text-align: center; font-family: Roboto, arial, sans-serif;">Sign in with Google</span><div style="min-width: 20px;"></div>';
                }
            });
        });
