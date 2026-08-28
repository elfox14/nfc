document.getElementById('forgot-form').addEventListener('submit', async (e) => {
            e.preventDefault();
            const email = document.getElementById('email').value;
            const btn = e.target.querySelector('button');
            const errorBox = document.getElementById('error-box');
            const successBox = document.getElementById('success-box');

            btn.disabled = true;
            btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> جاري الإرسال...';
            errorBox.style.display = 'none';
            successBox.style.display = 'none';

            try {
                const baseUrl = Auth.getBaseUrl();
                const response = await fetch(`${baseUrl}/api/auth/forgot-password`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email })
                });

                const data = await response.json();
                if (data.success) {
                    successBox.textContent = 'تم إرسال رابط الاستعادة إلى بريدك الإلكتروني. تحقق من صندوق الوارد.';
                    successBox.style.display = 'block';
                    e.target.style.display = 'none';
                } else {
                    errorBox.textContent = data.error || 'حدث خطأ، حاول مرة أخرى.';
                    errorBox.style.display = 'block';
                    btn.disabled = false;
                    btn.textContent = 'إرسال رابط الاستعادة';
                }
            } catch (err) {
                console.error('[ForgotPassword] Error:', err);
                errorBox.textContent = 'خطأ في الاتصال بالخادم. حاول مرة أخرى.';
                errorBox.style.display = 'block';
                btn.disabled = false;
                btn.textContent = 'إرسال رابط الاستعادة';
            }
        });
