// Never persist the privileged token across browser sessions.
        localStorage.removeItem('adminToken');
        let token = sessionStorage.getItem('adminToken') || '';
        let currentUserPage = 1;
        let searchTimeout = null;

        // Base URL for API
        const getApiUrl = (path) => {
            const baseUrl = (window.__API_BASE_URL || window.location.origin).replace(/\/+$/, '');
            return `${baseUrl}${path}`;
        };

<<<<<<< HEAD
        function getAuthHeaders() {
            return {
                'Authorization': `Bearer ${token}`,
                'x-admin-token': token,
                'Content-Type': 'application/json'
            };
        }

        function togglePasswordVisibility() {
            const pwdInput = document.getElementById('admin-password');
            const toggleIcon = document.getElementById('toggle-pwd');
            if (pwdInput.type === 'password') {
                pwdInput.type = 'text';
                toggleIcon.classList.replace('fa-eye', 'fa-eye-slash');
            } else {
                pwdInput.type = 'password';
                toggleIcon.classList.replace('fa-eye-slash', 'fa-eye');
            }
        }

<<<<<<< HEAD
        // Initialize session on load
=======
        // Initialize
>>>>>>> parent of d9ecc73c (2)
=======
        // Initialize session
>>>>>>> parent of 18f5c95c (Fix admin authentication flow and rate limiting)
        if (token) {
            checkTokenAndLoad();
        }

        async function login() {
<<<<<<< HEAD
<<<<<<< HEAD
            const email = (document.getElementById('admin-email').value || '').trim();
            const password = (document.getElementById('admin-password').value || '').trim();
            const btn = document.getElementById('login-btn');
            const errorBox = document.getElementById('login-error');
            const errorText = document.getElementById('login-error-text');

            if (!email || !password) {
                errorText.textContent = 'يرجى إدخال البريد الإلكتروني وكلمة المرور.';
                errorBox.style.display = 'flex';
                return;
            }

            btn.disabled = true;
            btn.innerHTML = '<div class="loader"></div> جارٍ التحقق...';
            errorBox.style.display = 'none';

=======
            const input = document.getElementById('admin-token').value;
            const btn = document.getElementById('login-btn');
            btn.innerHTML = '<div class="loader"></div>';
            
>>>>>>> parent of 08b7a858 (1)
=======
            const input = (document.getElementById('admin-token').value || '').trim();
            const btn = document.getElementById('login-btn');
            const errorEl = document.getElementById('login-error');
            btn.innerHTML = '<div class="loader"></div>';
            errorEl.style.display = 'none';
            
>>>>>>> parent of d9ecc73c (2)
            try {
                const res = await fetch(getApiUrl('/api/admin/stats'), {
                    headers: { 'x-admin-token': input }
                });
                
                if (res.ok) {
                    token = input;
                    sessionStorage.setItem('adminToken', token);
                    document.getElementById('auth-overlay').style.display = 'none';
                    document.getElementById('app').style.display = 'block';
                    loadDashboard(await res.json());
                } else {
<<<<<<< HEAD
<<<<<<< HEAD
                    errorText.textContent = data.error || 'بيانات الدخول غير صحيحة، يرجى التأكد والمحاولة مرة أخرى.';
                    errorBox.style.display = 'flex';
                }
            } catch (err) {
                errorText.textContent = 'خطأ في الاتصال بالخادم، يرجى التحقق من اتصالك بالإنترنت.';
                errorBox.style.display = 'flex';
=======
                    document.getElementById('login-error').style.display = 'block';
                }
            } catch (err) {
                document.getElementById('login-error').textContent = 'خطأ في الاتصال بالخادم';
                document.getElementById('login-error').style.display = 'block';
>>>>>>> parent of 08b7a858 (1)
=======
                    const data = await res.json().catch(() => ({}));
                    errorEl.textContent = data.error || 'رمز الدخول غير صحيح، يرجى المحاولة مرة أخرى.';
                    errorEl.style.display = 'block';
                }
            } catch (err) {
                errorEl.textContent = 'خطأ في الاتصال بالخادم، تأكد من الاتصال بالإنترنت.';
                errorEl.style.display = 'block';
>>>>>>> parent of d9ecc73c (2)
            } finally {
                btn.innerHTML = 'دخول';
            }
        }

        function logout() {
            token = '';
            sessionStorage.removeItem('adminToken');
            document.getElementById('auth-overlay').style.display = 'flex';
            document.getElementById('app').style.display = 'none';
            document.getElementById('admin-token').value = '';
        }

        async function checkTokenAndLoad() {
            try {
                const res = await fetch(getApiUrl('/api/admin/stats'), {
                    headers: { 'x-admin-token': token }
                });
                if (res.ok) {
                    document.getElementById('auth-overlay').style.display = 'none';
                    document.getElementById('app').style.display = 'block';
                    loadDashboard(await res.json());
                } else {
                    logout();
                }
            } catch (e) {
                console.error(e);
            }
        }

<<<<<<< HEAD
        async function loadDashboardStats() {
            try {
                const res = await fetch(getApiUrl('/api/admin/stats'), {
                    headers: getAuthHeaders()
                });
                if (res.ok) {
                    loadDashboard(await res.json());
                } else if (res.status === 401 || res.status === 403) {
                    logout();
                }
            } catch (e) {
                console.error('Stats loading error:', e);
            }
        }

=======
>>>>>>> parent of d9ecc73c (2)
        function switchView(viewName) {
            document.querySelectorAll('.view').forEach(el => el.classList.remove('active'));
            document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('active'));
            
            document.getElementById(`view-${viewName}`).classList.add('active');
            event.currentTarget.classList.add('active');
            
            const titles = {
                'dashboard': 'نظرة عامة',
                'users': 'المستخدمين',
                'errors': 'سجل الأخطاء'
            };
            document.getElementById('page-title').textContent = titles[viewName];
        }

        function updateTime() {
            const now = new Date();
            document.getElementById('last-update').textContent = `آخر تحديث: ${now.toLocaleTimeString('ar-EG')}`;
        }

        // --- Loaders ---
        function escapeHTML(str) {
            return String(str || '').replace(/[&<>'"]/g, 
                tag => ({
                    '&': '&amp;',
                    '<': '&lt;',
                    '>': '&gt;',
                    "'": '&#39;',
                    '"': '&quot;'
                }[tag] || tag)
            );
        }

        function loadDashboard(data) {
            updateTime();
            
            const statsHtml = `
                <div class="stat-card">
                    <div class="stat-icon icon-blue"><i class="fas fa-users"></i></div>
                    <div class="stat-info">
                        <h3>إجمالي المستخدمين</h3>
                        <p>${data.totalUsers.toLocaleString()}</p>
                    </div>
                </div>
                <div class="stat-card">
                    <div class="stat-icon icon-green"><i class="fas fa-user-check"></i></div>
                    <div class="stat-info">
                        <h3>مستخدمين نشطين (مؤكدين)</h3>
                        <p>${data.verifiedUsers.toLocaleString()}</p>
                    </div>
                </div>
                <div class="stat-card">
                    <div class="stat-icon icon-purple"><i class="fas fa-id-card"></i></div>
                    <div class="stat-info">
                        <h3>إجمالي البطاقات (التصاميم)</h3>
                        <p>${data.totalDesigns.toLocaleString()}</p>
                    </div>
                </div>
            `;
            document.getElementById('stats-container').innerHTML = statsHtml;

            const tbody = document.getElementById('recent-designs-tbody');
            if (data.recentDesigns && data.recentDesigns.length > 0) {
                tbody.innerHTML = data.recentDesigns.map(d => `
                    <tr>
                        <td style="font-family: monospace;">${escapeHTML(d.shortId)}</td>
                        <td>${escapeHTML(d.data?.inputs?.name || 'بدون اسم')}</td>
                        <td>${d.views || 0}</td>
                        <td>${new Date(d.createdAt).toLocaleDateString('ar-EG')}</td>
                    </tr>
                `).join('');
            } else {
                tbody.innerHTML = '<tr><td colspan="4" style="text-align:center;padding:30px;">لا توجد تصاميم بعد</td></tr>';
            }
        }

        async function loadUsers(page = 1) {
            currentUserPage = page;
            const search = document.getElementById('user-search').value;
            const tbody = document.getElementById('users-tbody');
            tbody.innerHTML = '<tr><td colspan="4"><div class="loading-state"><div class="loader"></div></div></td></tr>';
            
            try {
                const res = await fetch(getApiUrl(`/api/admin/users?page=${page}&search=${encodeURIComponent(search)}`), {
                    headers: { 'x-admin-token': token }
                });
                
                if (res.status === 401 || res.status === 403) return logout();
                
                const data = await res.json();
                updateTime();

                if (data.users && data.users.length > 0) {
                    tbody.innerHTML = data.users.map(u => `
                        <tr>
                            <td><strong>${escapeHTML(u.name || 'بدون اسم')}</strong></td>
                            <td style="direction: ltr; text-align: right;">${escapeHTML(u.email)}</td>
                            <td>
                                ${u.isVerified 
                                    ? '<span class="badge success">مُؤكد</span>' 
                                    : '<span class="badge warning">غير مُؤكد</span>'}
                            </td>
                            <td>${new Date(u.createdAt).toLocaleDateString('ar-EG')}</td>
                        </tr>
                    `).join('');
                } else {
                    tbody.innerHTML = '<tr><td colspan="4" style="text-align:center;padding:30px;">لا يوجد مستخدمين</td></tr>';
                }

                // Render Pagination
                const pag = document.getElementById('users-pagination');
                pag.innerHTML = '';
                for (let i = 1; i <= data.pages; i++) {
                    pag.innerHTML += `<button class="page-btn ${i === page ? 'active' : ''}" onclick="loadUsers(${i})">${i}</button>`;
                }

            } catch (e) {
                tbody.innerHTML = `<tr><td colspan="4" style="text-align:center;color:var(--danger);">خطأ في جلب البيانات</td></tr>`;
            }
        }

        function debounceSearch() {
            clearTimeout(searchTimeout);
            searchTimeout = setTimeout(() => {
                loadUsers(1);
            }, 500);
        }

        async function loadErrors() {
            const container = document.getElementById('errors-container');
            container.innerHTML = '<div class="loading-state"><div class="loader"></div></div>';
            
            try {
                const res = await fetch(getApiUrl('/api/admin/errors?limit=50'), {
                    headers: { 'x-admin-token': token }
                });
                
                if (res.status === 401 || res.status === 403) return logout();
                
                const data = await res.json();
                updateTime();

                if (data.errors && data.errors.length > 0) {
                    container.innerHTML = data.errors.map(err => {
                        const date = new Date(err.timestamp).toLocaleString('ar-EG');
                        return `
                        <div class="error-item">
                            <div class="error-meta">
                                <span><i class="fas fa-clock"></i> ${date}</span>
                                <span><i class="fas fa-route"></i> ${escapeHTML(err.context?.route || 'N/A')}</span>
                                ${err.context?.ip ? `<span><i class="fas fa-network-wired"></i> ${escapeHTML(err.context.ip)}</span>` : ''}
                            </div>
                            <div class="error-msg">${escapeHTML(err.message)}</div>
                        </div>
                    `}).join('');
                } else {
                    container.innerHTML = '<div style="padding: 40px; text-align: center; color: var(--success);"><i class="fas fa-check-circle" style="font-size: 2rem; margin-bottom: 10px;"></i><br>لا توجد أخطاء مسجلة!</div>';
                }
            } catch (e) {
                container.innerHTML = `<div style="padding: 40px; text-align: center; color: var(--danger);">خطأ في جلب سجل الأخطاء</div>`;
            }
        }
