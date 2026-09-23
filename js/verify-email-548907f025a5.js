async function verifyEmail() {
            // Fragment tokens are not sent in the initial HTTP request. Keep
            // query-string fallback only for already-issued legacy emails.
            const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ''));
            const queryParams = new URLSearchParams(window.location.search);
            const token = hashParams.get('token') || queryParams.get('token');

            if (token && window.history && typeof window.history.replaceState === 'function') {
                window.history.replaceState(null, '', window.location.pathname);
            }

            const loadingState = document.getElementById('loading-state');
            const successState = document.getElementById('success-state');
            const errorState = document.getElementById('error-state');
            const errorMessage = document.getElementById('error-message');

            if (!token) {
                loadingState.style.display = 'none';
                errorState.style.display = 'block';
                errorMessage.textContent = 'رابط التحقق غير صالح.';
                return;
            }

            try {
                const baseUrl = Auth.getBaseUrl();
                const response = await fetch(`${baseUrl}/api/auth/verify-email`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ token })
                });

                const data = await response.json();
                loadingState.style.display = 'none';

                if (data.success) {
                    successState.style.display = 'block';
                } else {
                    errorState.style.display = 'block';
                    errorMessage.textContent = data.error || 'رابط التحقق غير صالح أو منتهي الصلاحية.';
                }
            } catch (err) {
                console.error('[VerifyEmail] Error:', err);
                loadingState.style.display = 'none';
                errorState.style.display = 'block';
                errorMessage.textContent = 'خطأ في الاتصال بالخادم. حاول مرة أخرى.';
            }
        }

        // Start verification on page load
        verifyEmail();
