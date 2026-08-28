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

function getAuthHeaders() {
    return {
        'Authorization': `Bearer ${token}`,
        'x-admin-token': token,
        'Content-Type': 'application/json'
    };
}

// Initialize session on load
if (token) {
    checkTokenAndLoad();
}

async function login() {
    const input = (document.getElementById('admin-token').value || '').trim();
    const btn = document.getElementById('login-btn');
    const errorEl = document.getElementById('login-error');
    btn.innerHTML = '<div class="loader"></div>';
    errorEl.style.display = 'none';
    
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
            const data = await res.json().catch(() => ({}));
            errorEl.textContent = data.error || 'رمز الدخول غير صحيح، يرجى المحاولة مرة أخرى.';
            errorEl.style.display = 'block';
        }
    } catch (err) {
        errorEl.textContent = 'خطأ في الاتصال بالخادم، تأكد من الاتصال بالإنترنت.';
        errorEl.style.display = 'block';
    } finally {
        btn.innerHTML = 'دخول';
    }
}

function logout() {
    token = '';
    sessionStorage.removeItem('adminToken');
    document.getElementById('auth-overlay').style.display = 'flex';
    document.getElementById('app').style.display = 'none';
    const tokenInput = document.getElementById('admin-token');
    if (tokenInput) tokenInput.value = '';
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

function switchView(viewName) {
    document.querySelectorAll('.view').forEach(el => el.classList.remove('active'));
    document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('active'));
    
    const targetView = document.getElementById(`view-${viewName}`);
    if (targetView) targetView.classList.add('active');
    if (window.event && window.event.currentTarget) {
        window.event.currentTarget.classList.add('active');
    }
    
    const titles = {
        'dashboard': 'نظرة عامة',
        'users': 'المستخدمين',
        'errors': 'سجل الأخطاء'
    };
    const pageTitle = document.getElementById('page-title');
    if (pageTitle && titles[viewName]) {
        pageTitle.textContent = titles[viewName];
    }
}

function updateTime() {
    const now = new Date();
    const lastUpdate = document.getElementById('last-update');
    if (lastUpdate) {
        lastUpdate.textContent = `آخر تحديث: ${now.toLocaleTimeString('ar-EG')}`;
    }
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
                <p>${(data.totalUsers || 0).toLocaleString()}</p>
            </div>
        </div>
        <div class="stat-card">
            <div class="stat-icon icon-green"><i class="fas fa-user-check"></i></div>
            <div class="stat-info">
                <h3>مستخدمين نشطين (مؤكدين)</h3>
                <p>${(data.verifiedUsers || 0).toLocaleString()}</p>
            </div>
        </div>
        <div class="stat-card">
            <div class="stat-icon icon-purple"><i class="fas fa-id-card"></i></div>
            <div class="stat-info">
                <h3>إجمالي البطاقات (التصاميم)</h3>
                <p>${(data.totalDesigns || 0).toLocaleString()}</p>
            </div>
        </div>
    `;
    const statsContainer = document.getElementById('stats-container');
    if (statsContainer) statsContainer.innerHTML = statsHtml;

    const tbody = document.getElementById('recent-designs-tbody');
    if (tbody) {
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
}

async function loadUsers(page = 1) {
    currentUserPage = page;
    const searchInput = document.getElementById('user-search');
    const search = searchInput ? searchInput.value : '';
    const tbody = document.getElementById('users-tbody');
    if (!tbody) return;
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
        if (pag) {
            pag.innerHTML = '';
            for (let i = 1; i <= (data.pages || 1); i++) {
                pag.innerHTML += `<button class="page-btn ${i === page ? 'active' : ''}" onclick="loadUsers(${i})">${i}</button>`;
            }
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
    if (!container) return;
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
