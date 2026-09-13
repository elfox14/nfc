// MC PRIME Admin Application Client Script
// Tab-scoped admin credentials (never persisted to localStorage)
localStorage.removeItem('adminToken');
let token = sessionStorage.getItem('adminToken') || '';
let currentView = 'dashboard';

// State Management
let usersState = { page: 1, filter: 'all', search: '', pages: 1 };
let designsState = { page: 1, search: '', pages: 1 };
let ordersState = { page: 1, status: 'all', search: '', pages: 1 };
let searchDebounceTimer = null;
let currentModalConfirmAction = null;
let selectedOrderId = null;

// Helpers
const getApiUrl = (path) => {
    const baseUrl = (window.__API_BASE_URL || window.location.origin).replace(/\/+$/, '');
    return `${baseUrl}${path}`;
};

function getAuthHeaders() {
    return {
        'Authorization': `Bearer ${token}`,
        'x-admin-token': token,
        'Content-Type': 'application/json'
    };
}

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

// Toast Notifications
function showToast(message, type = 'info') {
    const container = document.getElementById('toast-container');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    const iconMap = {
        success: 'fa-check-circle',
        error: 'fa-exclamation-circle',
        info: 'fa-info-circle'
    };
    toast.innerHTML = `
        <i class="fas ${iconMap[type] || 'fa-info-circle'}"></i>
        <span>${escapeHTML(message)}</span>
    `;

    container.appendChild(toast);
    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateX(-20px)';
        toast.style.transition = 'all 0.3s ease';
        setTimeout(() => toast.remove(), 300);
    }, 3500);
}

// ==========================================
// AUTHENTICATION FLOW
// ==========================================
function setAuthMode(mode) {
    const tokenForm = document.getElementById('token-form');
    const credsForm = document.getElementById('creds-form');
    const tabTokenBtn = document.getElementById('tab-token-btn');
    const tabLoginBtn = document.getElementById('tab-login-btn');
    const errorMsg = document.getElementById('auth-error-msg');
    if (errorMsg) errorMsg.style.display = 'none';

    if (mode === 'token') {
        tokenForm.style.display = 'block';
        credsForm.style.display = 'none';
        tabTokenBtn.classList.add('active');
        tabLoginBtn.classList.remove('active');
    } else {
        tokenForm.style.display = 'none';
        credsForm.style.display = 'block';
        tabTokenBtn.classList.remove('active');
        tabLoginBtn.classList.add('active');
    }
}

async function submitTokenLogin() {
    const input = (document.getElementById('admin-token').value || '').trim();
    const btn = document.getElementById('token-submit-btn');
    const errorEl = document.getElementById('auth-error-msg');
    if (!input) return;

    btn.innerHTML = '<div class="spinner"></div>';
    btn.disabled = true;
    errorEl.style.display = 'none';

    try {
        const res = await fetch(getApiUrl('/api/admin/login'), {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ token: input })
        });

        const data = await res.json().catch(() => ({}));
        if (res.ok && data.success) {
            token = data.token || input;
            sessionStorage.setItem('adminToken', token);
            setAdminProfile(data.admin);
            enterDashboard();
        } else {
            errorEl.textContent = data.error || 'رمز الإدارة السري غير صحيح، يرجى المحاولة مجدداً.';
            errorEl.style.display = 'block';
        }
    } catch (err) {
        errorEl.textContent = 'تعذر الاتصال بالخادم، يرجى التأكد من اتصال الإنترنت.';
        errorEl.style.display = 'block';
    } finally {
        btn.innerHTML = '<span>دخول إلى لوحة التحكم</span> <i class="fas fa-arrow-left"></i>';
        btn.disabled = false;
    }
}

async function submitCredsLogin() {
    const email = (document.getElementById('admin-email').value || '').trim();
    const password = (document.getElementById('admin-password').value || '');
    const btn = document.getElementById('creds-submit-btn');
    const errorEl = document.getElementById('auth-error-msg');
    if (!email || !password) return;

    btn.innerHTML = '<div class="spinner"></div>';
    btn.disabled = true;
    errorEl.style.display = 'none';

    try {
        const res = await fetch(getApiUrl('/api/admin/login'), {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });

        const data = await res.json().catch(() => ({}));
        if (res.ok && data.success) {
            token = data.token;
            sessionStorage.setItem('adminToken', token);
            setAdminProfile(data.admin);
            enterDashboard();
        } else {
            errorEl.textContent = data.error || 'بيانات المشرف غير صحيحة، أو الحساب لا يملك صلاحية إدارة.';
            errorEl.style.display = 'block';
        }
    } catch (err) {
        errorEl.textContent = 'تعذر الاتصال بالخادم، يرجى المحاولة لاحقاً.';
        errorEl.style.display = 'block';
    } finally {
        btn.innerHTML = '<span>تسجيل الدخول</span> <i class="fas fa-arrow-left"></i>';
        btn.disabled = false;
    }
}

function setAdminProfile(admin) {
    if (!admin) return;
    const nameEl = document.getElementById('admin-display-name');
    const roleEl = document.getElementById('admin-display-role');
    const avatarEl = document.getElementById('admin-avatar-icon');

    const name = admin.name || 'المسؤول';
    if (nameEl) nameEl.textContent = name;
    if (roleEl) roleEl.textContent = admin.type === 'master' ? 'المسؤول الرئيسي' : 'مشرف معتمد';
    if (avatarEl) avatarEl.textContent = name.charAt(0).toUpperCase();
}

function enterDashboard() {
    document.getElementById('auth-overlay').style.display = 'none';
    document.getElementById('app').style.display = 'block';
    switchNav('dashboard');
}

function logoutAdmin() {
    token = '';
    sessionStorage.removeItem('adminToken');
    document.getElementById('auth-overlay').style.display = 'flex';
    document.getElementById('app').style.display = 'none';
    const input = document.getElementById('admin-token');
    if (input) input.value = '';
    showToast('تم تسجيل الخروج بنجاح', 'info');
}

async function verifyActiveSession() {
    if (!token) return;
    try {
        const res = await fetch(getApiUrl('/api/admin/me'), {
            headers: getAuthHeaders()
        });

        if (res.ok) {
            const data = await res.json();
            setAdminProfile(data.admin);
            enterDashboard();
        } else {
            token = '';
            sessionStorage.removeItem('adminToken');
        }
    } catch (err) {
        console.warn('[Admin Init] Error validating session:', err);
    }
}

// ==========================================
// NAVIGATION & VIEWS
// ==========================================
const viewTitles = {
    'dashboard': 'لوحة المؤشرات العامة',
    'users': 'إدارة المستخدمين',
    'designs': 'البطاقات الرقمية والتصاميم',
    'card-requests': 'طلبات البطاقات المطبوعة',
    'errors': 'سجل أخطاء النظام',
    'system': 'صحة الخادم والمؤشرات'
};

function switchNav(viewName) {
    currentView = viewName;

    // Update nav classes
    document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('active'));
    document.querySelectorAll('.view-section').forEach(el => el.classList.remove('active'));

    const navLink = Array.from(document.querySelectorAll('.nav-item')).find(el => 
        el.getAttribute('onclick') && el.getAttribute('onclick').includes(viewName)
    );
    if (navLink) navLink.classList.add('active');

    const viewSec = document.getElementById(`view-${viewName}`);
    if (viewSec) viewSec.classList.add('active');

    const titleEl = document.getElementById('top-nav-title');
    if (titleEl && viewTitles[viewName]) {
        titleEl.textContent = viewTitles[viewName];
    }

    // Load content for active view
    if (viewName === 'dashboard') loadDashboard();
    else if (viewName === 'users') loadUsers();
    else if (viewName === 'designs') loadDesigns();
    else if (viewName === 'card-requests') loadCardRequests();
    else if (viewName === 'errors') loadErrors();
    else if (viewName === 'system') loadSystemMetrics();

    // Close mobile sidebar if open
    const sidebar = document.getElementById('sidebar');
    if (sidebar) sidebar.classList.remove('open');
}

function refreshCurrentView() {
    switchNav(currentView);
    showToast('تم تحديث البيانات', 'info');
}

function toggleSidebar() {
    const sidebar = document.getElementById('sidebar');
    if (sidebar) sidebar.classList.toggle('open');
}

// ==========================================
// 1. DASHBOARD OVERVIEW
// ==========================================
async function loadDashboard() {
    try {
        const res = await fetch(getApiUrl('/api/admin/stats'), { headers: getAuthHeaders() });
        if (res.status === 401) return logoutAdmin();

        const data = await res.json();

        // Update sidebar badges
        document.getElementById('badge-users-count').textContent = data.totalUsers || 0;
        document.getElementById('badge-designs-count').textContent = data.totalDesigns || 0;
        document.getElementById('badge-orders-count').textContent = data.pendingCardRequests || 0;

        // Render Stats Grid
        const statsGrid = document.getElementById('dashboard-stats-grid');
        if (statsGrid) {
            statsGrid.innerHTML = `
                <div class="stat-card">
                    <div class="stat-icon theme-gold"><i class="fas fa-users"></i></div>
                    <div class="stat-info">
                        <h3>إجمالي المستخدمين</h3>
                        <div class="stat-value">${(data.totalUsers || 0).toLocaleString()}</div>
                        <div class="stat-hint">${data.verifiedUsers || 0} مؤكد · ${data.unverifiedUsers || 0} بانتظار التأكيد</div>
                    </div>
                </div>
                <div class="stat-card">
                    <div class="stat-icon theme-purple"><i class="fas fa-id-card"></i></div>
                    <div class="stat-info">
                        <h3>البطاقات والتصاميم</h3>
                        <div class="stat-value">${(data.totalDesigns || 0).toLocaleString()}</div>
                        <div class="stat-hint">إجمالي التصاميم المنشورة في المنصة</div>
                    </div>
                </div>
                <div class="stat-card">
                    <div class="stat-icon theme-blue"><i class="fas fa-eye"></i></div>
                    <div class="stat-info">
                        <h3>مشاهدات البطاقات</h3>
                        <div class="stat-value">${(data.totalViews || 0).toLocaleString()}</div>
                        <div class="stat-hint">إجمالي الزيارات والمسحات التفاعلية</div>
                    </div>
                </div>
                <div class="stat-card">
                    <div class="stat-icon theme-green"><i class="fas fa-truck-fast"></i></div>
                    <div class="stat-info">
                        <h3>طلبات بطاقات NFC</h3>
                        <div class="stat-value">${(data.totalCardRequests || 0).toLocaleString()}</div>
                        <div class="stat-hint">${data.pendingCardRequests || 0} قيد الانتظار · ${data.completedCardRequests || 0} مكتملة</div>
                    </div>
                </div>
            `;
        }

        // Render Recent Users
        const usersTbody = document.getElementById('dash-recent-users-tbody');
        if (usersTbody) {
            if (data.recentUsers && data.recentUsers.length > 0) {
                usersTbody.innerHTML = data.recentUsers.map(u => `
                    <tr>
                        <td><strong>${escapeHTML(u.name || 'بدون اسم')}</strong></td>
                        <td style="direction: ltr; text-align: right;">${escapeHTML(u.email)}</td>
                        <td>${u.isVerified ? '<span class="badge badge-success">مؤكد</span>' : '<span class="badge badge-warning">غير مؤكد</span>'}</td>
                        <td>${new Date(u.createdAt).toLocaleDateString('ar-EG')}</td>
                    </tr>
                `).join('');
            } else {
                usersTbody.innerHTML = '<tr><td colspan="4" style="text-align:center;padding:25px;color:var(--text-muted);">لا يوجد مستخدمين مسجلين بعد</td></tr>';
            }
        }

        // Render Recent Designs
        const designsTbody = document.getElementById('dash-recent-designs-tbody');
        if (designsTbody) {
            if (data.recentDesigns && data.recentDesigns.length > 0) {
                designsTbody.innerHTML = data.recentDesigns.map(d => `
                    <tr>
                        <td><code style="color:var(--accent); font-family: 'JetBrains Mono', monospace;">${escapeHTML(d.shortId)}</code></td>
                        <td><strong>${escapeHTML(d.data?.inputs?.name || 'بطاقة رقمية')}</strong></td>
                        <td>${(d.views || 0).toLocaleString()}</td>
                        <td>
                            <a href="/card/${escapeHTML(d.shortId)}" target="_blank" class="btn-action" title="معاينة حية">
                                <i class="fas fa-external-link-alt"></i>
                            </a>
                        </td>
                    </tr>
                `).join('');
            } else {
                designsTbody.innerHTML = '<tr><td colspan="4" style="text-align:center;padding:25px;color:var(--text-muted);">لا توجد بطاقات منشورة بعد</td></tr>';
            }
        }

    } catch (err) {
        console.error('Error loading dashboard stats:', err);
    }
}

// ==========================================
// 2. USERS MANAGEMENT
// ==========================================
function setUserFilter(filter) {
    usersState.filter = filter;
    usersState.page = 1;
    document.querySelectorAll('#user-filter-pills .filter-pill').forEach(btn => btn.classList.remove('active'));
    if (window.event && window.event.target) window.event.target.classList.add('active');
    loadUsers();
}

function onUserSearch() {
    clearTimeout(searchDebounceTimer);
    searchDebounceTimer = setTimeout(() => {
        usersState.search = (document.getElementById('user-search-input').value || '').trim();
        usersState.page = 1;
        loadUsers();
    }, 400);
}

async function loadUsers(page = usersState.page) {
    usersState.page = page;
    const tbody = document.getElementById('users-tbody');
    if (!tbody) return;

    tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;padding:40px;"><div class="spinner"></div></td></tr>';

    try {
        const queryParams = new URLSearchParams({
            page: usersState.page,
            limit: 20,
            search: usersState.search,
            filter: usersState.filter
        });

        const res = await fetch(getApiUrl(`/api/admin/users?${queryParams.toString()}`), {
            headers: getAuthHeaders()
        });

        if (res.status === 401) return logoutAdmin();

        const data = await res.json();
        usersState.pages = data.pages || 1;

        if (data.users && data.users.length > 0) {
            tbody.innerHTML = data.users.map(u => {
                const isAdmin = u.role === 'admin' || u.isAdmin;
                return `
                    <tr>
                        <td>
                            <strong>${escapeHTML(u.name || 'بدون اسم')}</strong>
                            <div style="font-size:0.75rem; color:var(--text-muted); font-family:monospace;">${escapeHTML(u.userId)}</div>
                        </td>
                        <td style="direction: ltr; text-align: right;">${escapeHTML(u.email)}</td>
                        <td>
                            ${isAdmin ? '<span class="badge badge-gold"><i class="fas fa-crown"></i> مشرف</span>' : '<span class="badge badge-info">مستخدم</span>'}
                        </td>
                        <td>
                            ${u.isVerified 
                                ? '<span class="badge badge-success"><i class="fas fa-check"></i> مؤكد</span>' 
                                : '<span class="badge badge-warning"><i class="fas fa-clock"></i> بانتظار التأكيد</span>'}
                        </td>
                        <td>${new Date(u.createdAt).toLocaleDateString('ar-EG')}</td>
                        <td>
                            <div class="action-btns">
                                <button class="btn-action ${u.isVerified ? '' : 'btn-success'}" title="${u.isVerified ? 'إلغاء التأكيد' : 'تأكيد الحساب'}" onclick="toggleUserVerify('${escapeHTML(u.userId)}', ${!u.isVerified})">
                                    <i class="fas ${u.isVerified ? 'fa-user-xmark' : 'fa-user-check'}"></i>
                                </button>
                                <button class="btn-action" title="${isAdmin ? 'إلغاء صلاحية المشرف' : 'ترقية إلى مشرف'}" onclick="toggleUserRole('${escapeHTML(u.userId)}', '${isAdmin ? 'user' : 'admin'}')">
                                    <i class="fas ${isAdmin ? 'fa-shield-slash' : 'fa-shield'}"></i>
                                </button>
                                <button class="btn-action btn-danger" title="حذف المستخدم" onclick="confirmDeleteUser('${escapeHTML(u.userId)}', '${escapeHTML(u.name || u.email)}')">
                                    <i class="fas fa-trash-can"></i>
                                </button>
                            </div>
                        </td>
                    </tr>
                `;
            }).join('');
        } else {
            tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;padding:40px;color:var(--text-muted);">لا توجد نتائج مطابقة</td></tr>';
        }

        // Pagination
        renderPagination('users', data.total, usersState.page, usersState.pages);

    } catch (err) {
        tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;padding:30px;color:var(--danger);">خطأ في تحميل المستخدمين</td></tr>';
    }
}

async function toggleUserVerify(userId, isVerified) {
    try {
        const res = await fetch(getApiUrl(`/api/admin/users/${userId}`), {
            method: 'PATCH',
            headers: getAuthHeaders(),
            body: JSON.stringify({ isVerified })
        });
        if (res.ok) {
            showToast(isVerified ? 'تم تأكيد حساب المستخدم' : 'تم إلغاء تأكيد الحساب', 'success');
            loadUsers();
        } else {
            showToast('فشل تحديث حالة الحساب', 'error');
        }
    } catch (err) {
        showToast('خطأ في الاتصال', 'error');
    }
}

async function toggleUserRole(userId, role) {
    try {
        const res = await fetch(getApiUrl(`/api/admin/users/${userId}`), {
            method: 'PATCH',
            headers: getAuthHeaders(),
            body: JSON.stringify({ role })
        });
        if (res.ok) {
            showToast(role === 'admin' ? 'تمت الترقية إلى مشرف بنجاح' : 'تم تخفيض الصلاحية إلى مستخدم', 'success');
            loadUsers();
        } else {
            showToast('فشل تعديل صلاحية المستخدم', 'error');
        }
    } catch (err) {
        showToast('خطأ في الاتصال', 'error');
    }
}

function confirmDeleteUser(userId, userName) {
    openModal({
        title: 'حذف المستخدم',
        body: `هل أنت متأكد من رغبتك في حذف المستخدم <strong>${escapeHTML(userName)}</strong>؟ سيتم أيضاً حذف كافة بطاقاته وتصاميمه. هذا الإجراء لا يمكن التراجع عنه.`,
        onConfirm: async () => {
            try {
                const res = await fetch(getApiUrl(`/api/admin/users/${userId}`), {
                    method: 'DELETE',
                    headers: getAuthHeaders()
                });
                if (res.ok) {
                    showToast('تم حذف المستخدم بنجاح', 'success');
                    closeModal();
                    loadUsers();
                } else {
                    showToast('فشل في حذف المستخدم', 'error');
                }
            } catch (err) {
                showToast('خطأ أثناء عملية الحذف', 'error');
            }
        }
    });
}

// ==========================================
// 3. DESIGNS MANAGEMENT
// ==========================================
function onDesignSearch() {
    clearTimeout(searchDebounceTimer);
    searchDebounceTimer = setTimeout(() => {
        designsState.search = (document.getElementById('design-search-input').value || '').trim();
        designsState.page = 1;
        loadDesigns();
    }, 400);
}

async function loadDesigns(page = designsState.page) {
    designsState.page = page;
    const tbody = document.getElementById('designs-tbody');
    if (!tbody) return;

    tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;padding:40px;"><div class="spinner"></div></td></tr>';

    try {
        const queryParams = new URLSearchParams({
            page: designsState.page,
            limit: 20,
            search: designsState.search
        });

        const res = await fetch(getApiUrl(`/api/admin/designs?${queryParams.toString()}`), {
            headers: getAuthHeaders()
        });

        if (res.status === 401) return logoutAdmin();

        const data = await res.json();
        designsState.pages = data.pages || 1;

        if (data.designs && data.designs.length > 0) {
            tbody.innerHTML = data.designs.map(d => `
                <tr>
                    <td>
                        <code style="color:var(--accent); font-family: 'JetBrains Mono', monospace;">${escapeHTML(d.shortId)}</code>
                    </td>
                    <td>
                        <strong>${escapeHTML(d.data?.inputs?.name || 'بدون اسم')}</strong>
                    </td>
                    <td>
                        <div>${escapeHTML(d.data?.inputs?.title || '—')}</div>
                        <div style="font-size:0.75rem; color:var(--text-muted);">${escapeHTML(d.data?.inputs?.company || '')}</div>
                    </td>
                    <td>
                        <span class="badge badge-info"><i class="fas fa-eye"></i> ${(d.views || 0).toLocaleString()}</span>
                    </td>
                    <td>${new Date(d.createdAt).toLocaleDateString('ar-EG')}</td>
                    <td>
                        <div class="action-btns">
                            <a href="/card/${escapeHTML(d.shortId)}" target="_blank" class="btn-action" title="معاينة حية">
                                <i class="fas fa-external-link-alt"></i>
                            </a>
                            <button class="btn-action btn-danger" title="حذف البطاقة" onclick="confirmDeleteDesign('${escapeHTML(d.shortId)}')">
                                <i class="fas fa-trash-can"></i>
                            </button>
                        </div>
                    </td>
                </tr>
            `).join('');
        } else {
            tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;padding:40px;color:var(--text-muted);">لا توجد بطاقات رقمية</td></tr>';
        }

        renderPagination('designs', data.total, designsState.page, designsState.pages);

    } catch (err) {
        tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;padding:30px;color:var(--danger);">خطأ في تحميل البطاقات</td></tr>';
    }
}

function confirmDeleteDesign(shortId) {
    openModal({
        title: 'حذف البطاقة الرقمية',
        body: `هل أنت متأكد من حذف البطاقة ذات المعرف <strong>${escapeHTML(shortId)}</strong>؟ لن يتمكن الزوار أو صاحب البطاقة من الوصول إليها مجدداً.`,
        onConfirm: async () => {
            try {
                const res = await fetch(getApiUrl(`/api/admin/designs/${shortId}`), {
                    method: 'DELETE',
                    headers: getAuthHeaders()
                });
                if (res.ok) {
                    showToast('تم حذف البطاقة بنجاح', 'success');
                    closeModal();
                    loadDesigns();
                } else {
                    showToast('فشل في حذف البطاقة', 'error');
                }
            } catch (err) {
                showToast('خطأ أثناء عملية الحذف', 'error');
            }
        }
    });
}

// ==========================================
// 4. CARD REQUESTS (ORDERS)
// ==========================================
function setOrderFilter(status) {
    ordersState.status = status;
    ordersState.page = 1;
    document.querySelectorAll('#order-filter-pills .filter-pill').forEach(btn => btn.classList.remove('active'));
    if (window.event && window.event.target) window.event.target.classList.add('active');
    loadCardRequests();
}

function onOrderSearch() {
    clearTimeout(searchDebounceTimer);
    searchDebounceTimer = setTimeout(() => {
        ordersState.search = (document.getElementById('order-search-input').value || '').trim();
        ordersState.page = 1;
        loadCardRequests();
    }, 400);
}

async function loadCardRequests(page = ordersState.page) {
    ordersState.page = page;
    const tbody = document.getElementById('orders-tbody');
    if (!tbody) return;

    tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;padding:40px;"><div class="spinner"></div></td></tr>';

    try {
        const queryParams = new URLSearchParams({
            page: ordersState.page,
            limit: 20,
            search: ordersState.search,
            status: ordersState.status !== 'all' ? ordersState.status : ''
        });

        const res = await fetch(getApiUrl(`/api/admin/card-requests?${queryParams.toString()}`), {
            headers: getAuthHeaders()
        });

        if (res.status === 401) return logoutAdmin();

        const data = await res.json();
        ordersState.pages = data.pages || 1;

        const statusBadges = {
            'pending': '<span class="badge badge-warning"><i class="fas fa-clock"></i> قيد الانتظار</span>',
            'processing': '<span class="badge badge-info"><i class="fas fa-cog fa-spin"></i> جاري المعالجة</span>',
            'completed': '<span class="badge badge-success"><i class="fas fa-check-double"></i> مكتمل</span>',
            'cancelled': '<span class="badge badge-danger"><i class="fas fa-times"></i> ملغي</span>'
        };

        if (data.requests && data.requests.length > 0) {
            tbody.innerHTML = data.requests.map(r => `
                <tr>
                    <td>
                        <strong>${escapeHTML(r.requesterName || 'عميل')}</strong>
                        <div style="font-size:0.75rem; color:var(--text-muted);">${escapeHTML(r.address || '')}</div>
                    </td>
                    <td style="direction: ltr; text-align: right;">${escapeHTML(r.requesterPhone || '—')}</td>
                    <td style="direction: ltr; text-align: right;">${escapeHTML(r.requesterEmail || '—')}</td>
                    <td>
                        ${r.designShortId ? `
                            <a href="/card/${escapeHTML(r.designShortId)}" target="_blank" style="color:var(--accent); text-decoration:none; font-family:monospace;">
                                ${escapeHTML(r.designShortId)} <i class="fas fa-arrow-up-right-from-square" style="font-size:0.75rem;"></i>
                            </a>
                        ` : '—'}
                    </td>
                    <td>${statusBadges[r.status] || r.status}</td>
                    <td>${new Date(r.createdAt || r._id).toLocaleDateString('ar-EG')}</td>
                    <td>
                        <button class="btn-action" title="تحديث حالة الطلب" onclick="openOrderModal('${escapeHTML(r._id)}', '${escapeHTML(r.status)}', '${escapeHTML(r.adminNotes || '')}')">
                            <i class="fas fa-pen-to-square"></i>
                        </button>
                    </td>
                </tr>
            `).join('');
        } else {
            tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;padding:40px;color:var(--text-muted);">لا توجد طلبات بطاقات مطبوعة</td></tr>';
        }

        renderPagination('orders', data.total, ordersState.page, ordersState.pages);

    } catch (err) {
        tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;padding:30px;color:var(--danger);">خطأ في تحميل طلبات البطاقات</td></tr>';
    }
}

function openOrderModal(id, currentStatus, currentNotes) {
    selectedOrderId = id;
    const statusSelect = document.getElementById('modal-order-status');
    const notesText = document.getElementById('modal-order-notes');
    if (statusSelect) statusSelect.value = currentStatus || 'pending';
    if (notesText) notesText.value = currentNotes || '';
    document.getElementById('order-modal').style.display = 'flex';
}

function closeOrderModal() {
    selectedOrderId = null;
    document.getElementById('order-modal').style.display = 'none';
}

async function saveOrderStatus() {
    if (!selectedOrderId) return;
    const status = document.getElementById('modal-order-status').value;
    const adminNotes = document.getElementById('modal-order-notes').value;
    const saveBtn = document.getElementById('order-save-btn');

    saveBtn.disabled = true;
    saveBtn.textContent = 'جاري الحفظ...';

    try {
        const res = await fetch(getApiUrl(`/api/admin/card-requests/${selectedOrderId}`), {
            method: 'PATCH',
            headers: getAuthHeaders(),
            body: JSON.stringify({ status, adminNotes })
        });

        if (res.ok) {
            showToast('تم تحديث حالة الطلب بنجاح', 'success');
            closeOrderModal();
            loadCardRequests();
        } else {
            showToast('فشل تحديث حالة الطلب', 'error');
        }
    } catch (err) {
        showToast('خطأ في الاتصال بالخادم', 'error');
    } finally {
        saveBtn.disabled = false;
        saveBtn.textContent = 'حفظ التغييرات';
    }
}

// ==========================================
// 5. SYSTEM ERRORS & LOGS
// ==========================================
async function loadErrors() {
    const container = document.getElementById('errors-container');
    if (!container) return;
    container.innerHTML = '<div style="text-align:center;padding:40px;"><div class="spinner"></div></div>';

    try {
        const res = await fetch(getApiUrl('/api/admin/errors?limit=50'), {
            headers: getAuthHeaders()
        });

        if (res.status === 401) return logoutAdmin();

        const data = await res.json();
        if (data.errors && data.errors.length > 0) {
            container.innerHTML = data.errors.map(err => {
                const date = new Date(err.timestamp).toLocaleString('ar-EG');
                return `
                    <div class="error-log-card">
                        <div class="error-meta">
                            <span><i class="fas fa-clock"></i> ${date}</span>
                            <span><i class="fas fa-route"></i> ${escapeHTML(err.context?.route || 'System/Server')}</span>
                            ${err.context?.ip ? `<span><i class="fas fa-network-wired"></i> ${escapeHTML(err.context.ip)}</span>` : ''}
                        </div>
                        <div class="error-message-box">${escapeHTML(err.message)}</div>
                    </div>
                `;
            }).join('');
        } else {
            container.innerHTML = `
                <div style="padding: 50px; text-align: center; color: var(--success);">
                    <i class="fas fa-circle-check" style="font-size: 2.5rem; margin-bottom: 12px; display: block;"></i>
                    <h3 style="font-size: 1.2rem; font-weight: 700;">لا توجد أي أخطاء مسجلة!</h3>
                    <p style="color: var(--text-secondary); margin-top: 6px;">يعمل الخادم بكل كفاءة وسلاسة.</p>
                </div>
            `;
        }
    } catch (err) {
        container.innerHTML = '<div style="padding:40px; text-align:center; color:var(--danger);">خطأ في جلب سجل الأخطاء</div>';
    }
}

function confirmClearErrors() {
    openModal({
        title: 'مسح سجل الأخطاء',
        body: 'هل أنت متأكد من تفريغ سجل الأخطاء بالكامل من ذاكرة الخادم؟',
        onConfirm: async () => {
            try {
                const res = await fetch(getApiUrl('/api/admin/errors'), {
                    method: 'DELETE',
                    headers: getAuthHeaders()
                });
                if (res.ok) {
                    showToast('تم مسح سجل الأخطاء بنجاح', 'success');
                    closeModal();
                    loadErrors();
                } else {
                    showToast('فشل مسح الأخطاء', 'error');
                }
            } catch (err) {
                showToast('خطأ أثناء عملية المسح', 'error');
            }
        }
    });
}

// ==========================================
// 6. SYSTEM HEALTH METRICS
// ==========================================
async function loadSystemMetrics() {
    const grid = document.getElementById('system-metrics-grid');
    if (!grid) return;
    grid.innerHTML = '<div style="text-align:center;padding:40px;grid-column: 1 / -1;"><div class="spinner"></div></div>';

    try {
        const res = await fetch(getApiUrl('/api/admin/system'), {
            headers: getAuthHeaders()
        });

        if (res.status === 401) return logoutAdmin();

        const data = await res.json();
        grid.innerHTML = `
            <div class="system-card">
                <h3><i class="fas fa-server"></i> بيئة الخادم والنظام</h3>
                <div class="system-item">
                    <span>بيئة التشغيل (NODE_ENV)</span>
                    <span class="badge ${data.environment === 'production' ? 'badge-success' : 'badge-warning'}">${data.environment}</span>
                </div>
                <div class="system-item">
                    <span>إصدار Node.js</span>
                    <span>${data.nodeVersion || 'N/A'}</span>
                </div>
                <div class="system-item">
                    <span>نظام التشغيل المنفذ</span>
                    <span>${data.platform || 'N/A'}</span>
                </div>
                <div class="system-item">
                    <span>وقت تشغيل الخادم (Uptime)</span>
                    <span>${data.uptimeFormatted || 'N/A'}</span>
                </div>
            </div>

            <div class="system-card">
                <h3><i class="fas fa-memory"></i> استهلاك الذاكرة (RAM)</h3>
                <div class="system-item">
                    <span>الذاكرة المستخدمة (Heap Used)</span>
                    <span>${data.memory?.heapUsedMB} MB</span>
                </div>
                <div class="system-item">
                    <span>الذاكرة المخصصة (Heap Total)</span>
                    <span>${data.memory?.heapTotalMB} MB</span>
                </div>
                <div class="system-item">
                    <span>إجمالي الذاكرة المحجوزة (RSS)</span>
                    <span>${data.memory?.rssMB} MB</span>
                </div>
            </div>

            <div class="system-card">
                <h3><i class="fas fa-database"></i> قاعدة البيانات ومكونات الربط</h3>
                <div class="system-item">
                    <span>حالة اتصال MongoDB</span>
                    <span class="badge ${data.database === 'connected' ? 'badge-success' : 'badge-danger'}">
                        ${data.database === 'connected' ? 'متصل بنجاح' : 'غير متصل'}
                    </span>
                </div>
                <div class="system-item">
                    <span>نظام توثيق المشرف</span>
                    <span class="badge badge-gold">JWT + Master Token</span>
                </div>
                <div class="system-item">
                    <span>حماية Rate Limit</span>
                    <span class="badge badge-success">مفعلة ونشطة</span>
                </div>
            </div>
        `;
    } catch (err) {
        grid.innerHTML = '<div style="padding:40px; text-align:center; color:var(--danger); grid-column: 1 / -1;">خطأ في جلب بيانات صحة النظام</div>';
    }
}

// ==========================================
// PAGINATION HELPER
// ==========================================
function renderPagination(type, total, currentPage, totalPages) {
    const infoEl = document.getElementById(`${type}-pagination-info`);
    const pagesEl = document.getElementById(`${type}-pagination-pages`);
    if (!infoEl || !pagesEl) return;

    infoEl.textContent = `إجمالي: ${(total || 0).toLocaleString()} (صفحة ${currentPage} من ${totalPages})`;

    pagesEl.innerHTML = '';
    if (totalPages <= 1) return;

    const startPage = Math.max(1, currentPage - 2);
    const endPage = Math.min(totalPages, currentPage + 2);

    if (currentPage > 1) {
        pagesEl.innerHTML += `<button class="page-btn" onclick="goToPage('${type}', ${currentPage - 1})"><i class="fas fa-chevron-right"></i></button>`;
    }

    for (let i = startPage; i <= endPage; i++) {
        pagesEl.innerHTML += `
            <button class="page-btn ${i === currentPage ? 'active' : ''}" onclick="goToPage('${type}', ${i})">${i}</button>
        `;
    }

    if (currentPage < totalPages) {
        pagesEl.innerHTML += `<button class="page-btn" onclick="goToPage('${type}', ${currentPage + 1})"><i class="fas fa-chevron-left"></i></button>`;
    }
}

function goToPage(type, page) {
    if (type === 'users') loadUsers(page);
    else if (type === 'designs') loadDesigns(page);
    else if (type === 'orders') loadCardRequests(page);
}

// ==========================================
// MODAL CONTROLS
// ==========================================
function openModal({ title, body, onConfirm }) {
    document.getElementById('modal-title').textContent = title || 'تأكيد';
    document.getElementById('modal-body').innerHTML = body || '';
    currentModalConfirmAction = onConfirm;
    document.getElementById('action-modal').style.display = 'flex';
}

function closeModal() {
    currentModalConfirmAction = null;
    document.getElementById('action-modal').style.display = 'none';
}

const confirmBtn = document.getElementById('modal-confirm-btn');
if (confirmBtn) {
    confirmBtn.onclick = () => {
        if (typeof currentModalConfirmAction === 'function') {
            currentModalConfirmAction();
        }
    };
}

// Initialize session check on boot
if (token) {
    verifyActiveSession();
}
