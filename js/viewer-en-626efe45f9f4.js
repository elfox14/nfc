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
                const ownerRes = await fetch(`${baseUrl}/api/design-owner/${designId}`);
                const ownerData = await ownerRes.json();
                if (!ownerData.success) return;

                const isLoggedIn = Auth.isLoggedIn();
                const currentUserId = Auth.user?.userId;

                if (isLoggedIn && ownerData.ownerId === currentUserId) {
                    const editBtn = document.getElementById('en-edit-btn');
                    if (editBtn) {
                        editBtn.href = `editor-en.html?id=${designId}`;
                        editBtn.querySelector('span').textContent = 'Edit Card';
                        editBtn.querySelector('i').className = 'fas fa-edit';
                    }
                    return;
                }
                if (ownerData.cardPrivacy === 'deny_all') return;

                section.style.display = 'block';

                if (!isLoggedIn) {
                    btnText.textContent = 'Sign in to save this card';
                    btn.querySelector('i').className = 'fas fa-sign-in-alt';
                    btn.onclick = () => { window.location.href = '/nfc/login-en.html'; };
                    return;
                }

                btn.onclick = async () => {
                    const originalText = btnText.textContent;
                    const originalIconClass = btn.querySelector('i').className;

                    btn.disabled = true;
                    btnText.textContent = 'Saving...';
                    btn.querySelector('i').className = 'fas fa-spinner fa-spin';

                    try {
                        const res = await Auth.apiFetchWithRefresh(`${baseUrl}/api/save-card/${designId}`, {
                            method: 'POST',
                            headers: { ...Auth.getHeader(), 'Content-Type': 'application/json' }
                        });

                        const data = await res.json();

                        if (data.status === 'saved' || data.status === 'already_saved') {
                            btnText.textContent = 'Saved \u2713';
                            btn.querySelector('i').className = 'fas fa-check-circle';
                            btn.style.background = '#2ecc71';
                        } else if (data.status === 'requested' || data.status === 'already_requested') {
                            btnText.textContent = 'Request Sent \u23f3';
                            btn.querySelector('i').className = 'fas fa-clock';
                            btn.style.background = '#f39c12';
                            statusP.textContent = 'The card will be added after the owner approves';
                            statusP.style.display = 'block';
                        } else if (data.status === 'denied') {
                            btnText.textContent = 'Save Not Available';
                            btn.querySelector('i').className = 'fas fa-ban';
                            btn.style.background = '#e74c3c';
                        } else {
                            throw new Error(data.error || 'Save failed');
                        }
                    } catch (err) {
                        console.error('Save card error:', err);
                        btnText.textContent = 'Error, try again';
                        btn.querySelector('i').className = 'fas fa-exclamation-triangle';
                        btn.disabled = false;

                        setTimeout(() => {
                            btnText.textContent = originalText;
                            btn.querySelector('i').className = originalIconClass;
                        }, 2000);
                    }
                };

                try {
                    const checkRes = await Auth.apiFetchWithRefresh(`${baseUrl}/api/saved-cards`, { headers: Auth.getHeader() });
                    if (checkRes.ok) {
                        const checkData = await checkRes.json();
                        if (checkData.savedCards?.some(c => c.designShortId === designId)) {
                            btnText.textContent = 'Already Saved \u2713';
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
