document.addEventListener('DOMContentLoaded', async () => {
            const params = new URLSearchParams(window.location.search);
            const designId = params.get('id');
            if (!designId) return;

            const section = document.getElementById('save-card-section');
            const btn = document.getElementById('save-card-btn');
            const btnText = document.getElementById('save-card-text');
            const statusP = document.getElementById('save-card-status');
            const baseUrl = Auth.getBaseUrl();

            try {
                // Get design owner info
                const ownerRes = await fetch(`${baseUrl}/api/design-owner/${designId}`);
                const ownerData = await ownerRes.json();
                if (!ownerData.success) return;

                const isLoggedIn = Auth.isLoggedIn();
                const currentUserId = Auth.user?.userId;

                // Hide if own card
                if (isLoggedIn && ownerData.ownerId === currentUserId) {
                    const editBtn = document.getElementById('ar-edit-btn');
                    if (editBtn) {
                        editBtn.href = `editor.html?id=${designId}`;
                        editBtn.querySelector('span').textContent = 'تعديل البطاقة';
                        editBtn.querySelector('i').className = 'fas fa-edit';
                    }
                    return;
                }

                // Hide if deny_all
                if (ownerData.cardPrivacy === 'deny_all') return;

                // Show the section
                section.style.display = 'block';

                if (!isLoggedIn) {
                    btnText.textContent = 'سجل دخول لحفظ البطاقة';
                    btn.querySelector('i').className = 'fas fa-sign-in-alt';
                    btn.onclick = () => { window.location.href = '/nfc/login.html'; };
                    return;
                }

                // 1. Assign Click Handler IMMEDIATELY
                btn.onclick = async () => {
                    const originalText = btnText.textContent;
                    const originalIconClass = btn.querySelector('i').className;

                    btn.disabled = true;
                    btnText.textContent = 'جاري الحفظ...';
                    btn.querySelector('i').className = 'fas fa-spinner fa-spin';

                    try {
                        const res = await Auth.apiFetchWithRefresh(`${baseUrl}/api/save-card/${designId}`, {
                            method: 'POST',
                            headers: { ...Auth.getHeader(), 'Content-Type': 'application/json' }
                        });

                        const data = await res.json();

                        if (data.status === 'saved' || data.status === 'already_saved') {
                            btnText.textContent = 'تم الحفظ ✓';
                            btn.querySelector('i').className = 'fas fa-check-circle';
                            btn.style.background = '#2ecc71';
                        } else if (data.status === 'requested' || data.status === 'already_requested') {
                            btnText.textContent = 'تم إرسال الطلب ⏳';
                            btn.querySelector('i').className = 'fas fa-clock';
                            btn.style.background = '#f39c12';
                            statusP.textContent = 'سيتم إضافة البطاقة بعد موافقة صاحبها';
                            statusP.style.display = 'block';
                        } else if (data.status === 'denied') {
                            btnText.textContent = 'الحفظ غير متاح';
                            btn.querySelector('i').className = 'fas fa-ban';
                            btn.style.background = '#e74c3c';
                        } else {
                            throw new Error(data.error || 'فشل الحفظ');
                        }
                    } catch (err) {
                        console.error('Save card error:', err);
                        btnText.textContent = 'حدث خطأ، حاول مجدداً';
                        btn.querySelector('i').className = 'fas fa-exclamation-triangle';
                        btn.disabled = false;

                        setTimeout(() => {
                            btnText.textContent = originalText;
                            btn.querySelector('i').className = originalIconClass;
                        }, 2000);
                    }
                };

                // 2. Then check if already saved (Non-blocking UI update)
                try {
                    const checkRes = await Auth.apiFetchWithRefresh(`${baseUrl}/api/saved-cards`, {
                        headers: Auth.getHeader()
                    });
                    if (checkRes.ok) {
                        const checkData = await checkRes.json();
                        if (checkData.savedCards?.some(c => c.designShortId === designId)) {
                            btnText.textContent = 'تم الحفظ مسبقاً ✓';
                            btn.querySelector('i').className = 'fas fa-check-circle';
                            btn.style.background = '#2ecc71';
                            btn.disabled = true;
                        }
                    }
                } catch (e) {
                    console.warn('Failed to check saved status:', e);
                }
            } catch (err) {
                console.error('Save card init error:', err);
            }
        });
