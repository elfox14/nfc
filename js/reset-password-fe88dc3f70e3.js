// Get token from URL
        const urlParams = new URLSearchParams(window.location.search);
        const token = urlParams.get('token');

        if (!token) {
            document.getElementById('error-box').textContent = 'رابط غير صالح أو منتهي الصلاحية.';
            document.getElementById('error-box').style.display = 'block';
            document.getElementById('reset-form').style.display = 'none';
        }

        document.getElementById('reset-form').addEventListener('submit', async (e) => {
            e.preventDefault();
            const password = document.getElementById('password').value;
            const confirmPassword = document.getElementById('confirm-password').value;
            const btn = e.target.querySelector('button');
            const errorBox = document.getElementById('error-box');
            const successBox = document.getElementById('success-box');

            // Validate passwords match
            if (password !== confirmPassword) {
                errorBox.textContent = 'كلمتا المرور غير متطابقتين.';
                errorBox.style.display = 'block';
                return;
            }

            btn.disabled = true;
            btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> جاري التحديث...';
            errorBox.style.display = 'none';
            successBox.style.display = 'none';

            try {
                const baseUrl = Auth.getBaseUrl();
                const response = await fetch(`${baseUrl}/api/auth/reset-password`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ token, password })
                });

                const data = await response.json();
                if (data.success) {
                    successBox.innerHTML = 'تم تغيير كلمة المرور بنجاح! <a href="/nfc/login.html">تسجيل الدخول الآن</a>';
                    successBox.style.display = 'block';
                    e.target.style.display = 'none';
                } else {
                    errorBox.textContent = data.error || 'حدث خطأ، حاول مرة أخرى.';
                    errorBox.style.display = 'block';
                    btn.disabled = false;
                    btn.textContent = 'تعيين كلمة المرور';
                }
            } catch (err) {
                console.error('[ResetPassword] Error:', err);
                errorBox.textContent = 'خطأ في الاتصال بالخادم. حاول مرة أخرى.';
                errorBox.style.display = 'block';
                btn.disabled = false;
                btn.textContent = 'تعيين كلمة المرور';
            }
        });
