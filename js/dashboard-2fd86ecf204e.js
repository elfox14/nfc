const baseUrl = (typeof Auth !== 'undefined' && Auth.getBaseUrl) ? Auth.getBaseUrl() : window.location.origin;

// Tab switching
document.querySelectorAll('.sidebar-item[data-section]').forEach(item => {
    item.addEventListener('click', (e) => {
        e.preventDefault();
        document.querySelectorAll('.sidebar-item').forEach(i => i.classList.remove('active'));
        item.classList.add('active');
        document.querySelectorAll('.dashboard-section').forEach(s => s.classList.remove('active'));
        const sectionId = 'section-' + item.dataset.section;
        const targetSection = document.getElementById(sectionId);
        if (targetSection) targetSection.classList.add('active');

        // Lazy load sections
        if (item.dataset.section === 'saved-cards') loadSavedCards();
        if (item.dataset.section === 'card-requests') loadCardRequests();
        if (item.dataset.section === 'privacy-settings') loadPrivacySettings();
        if (item.dataset.section === 'my-designs') loadMyDesigns();
    });
});

document.addEventListener('DOMContentLoaded', async () => {
    try {
        const urlParams = new URLSearchParams(window.location.hash.replace(/^#/, ''));
        const initToken = urlParams.get('initToken');
        const hasOauthSuccess = urlParams.has('oauthSuccess');
        
        if (typeof Auth !== 'undefined' && (initToken || hasOauthSuccess)) {
            console.log('[Auth] OAuth redirect detected. Processing token...');
            if (initToken) {
                await Auth.sessionInit(initToken);
            }
            history.replaceState(null, '', window.location.pathname + window.location.search);
        }

        if (typeof Auth !== 'undefined') {
            Auth.user = JSON.parse(localStorage.getItem('authUser') || 'null');
            localStorage.removeItem('authToken');
            Auth.token = null;
            
            if (!Auth.isLoggedIn()) {
                await Auth.refreshSession();
            }
        }

        const userDisplay = document.getElementById('user-display-name');
        if (userDisplay) {
            userDisplay.textContent = (typeof Auth !== 'undefined' && Auth.user?.name) ? Auth.user.name : 'مستخدم';
        }

        // Check URL params for tab
        const tabParams = new URLSearchParams(window.location.search);
        const tab = tabParams.get('tab');
        if (tab) {
            const sidebarItem = document.querySelector(`.sidebar-item[data-section="${tab}"]`);
            if (sidebarItem) {
                sidebarItem.click();
            } else {
                loadMyDesigns();
            }
        } else {
            loadMyDesigns();
        }

        loadRequestCount();
    } catch (err) {
        console.error('[Dashboard Init Error]', err);
        loadMyDesigns();
    }
});

// Listen for save events from Editor tab to auto-refresh designs
window.addEventListener('storage', (e) => {
    if (e.key === 'nfc:design_saved') {
        const section = document.getElementById('section-my-designs');
        if (section && section.classList.contains('active')) {
            console.log('[Dashboard] Auto-refreshing designs from cross-tab event');
            loadMyDesigns();
        }
    }
});

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

function getLocalSavedDesigns() {
    const list = [];
    try {
        // 1. Gallery designs
        const galleryRaw = localStorage.getItem('nfc_gallery_designs');
        if (galleryRaw) {
            const parsed = JSON.parse(galleryRaw);
            if (Array.isArray(parsed)) {
                parsed.forEach((d, idx) => {
                    const id = d.shortId || d.id || ('local_gallery_' + idx);
                    list.push({
                        shortId: id,
                        title: d.title || d.name || d.data?.inputs?.['input-name'] || d.data?.inputs?.['input-name_ar'] || 'بطاقة محفوظة',
                        createdAt: d.createdAt || d.timestamp || Date.now(),
                        views: d.views || 0,
                        data: d.data || d
                    });
                });
            }
        }

        // 2. Autosave state
        const autosaveRaw = localStorage.getItem('nfc_autosave_state');
        if (autosaveRaw) {
            const parsed = JSON.parse(autosaveRaw);
            if (parsed && (parsed.inputs || parsed.elements)) {
                list.push({
                    shortId: 'local_autosave',
                    title: parsed.inputs?.['input-name'] || parsed.inputs?.['input-name_ar'] || 'البطاقة الحالية (المحرر)',
                    createdAt: parsed.timestamp || Date.now(),
                    views: 1,
                    data: parsed
                });
            }
        }

        // 3. Business Card State
        const bcRaw = localStorage.getItem('businessCardState');
        if (bcRaw) {
            const parsed = JSON.parse(bcRaw);
            if (parsed && parsed.inputs && !list.some(d => d.shortId === 'local_autosave')) {
                list.push({
                    shortId: 'local_current',
                    title: parsed.inputs['input-name'] || parsed.inputs['input-name_ar'] || 'بطاقتي الشخصية',
                    createdAt: Date.now(),
                    views: 1,
                    data: parsed
                });
            }
        }
    } catch (e) {
        console.warn('[Dashboard] Local designs read failed:', e);
    }
    return list;
}

function removeDesignFromLocalStorage(id) {
    if (!id) return;
    try {
        // 1. Remove from nfc_gallery_designs
        const galleryRaw = localStorage.getItem('nfc_gallery_designs');
        if (galleryRaw) {
            let parsed = JSON.parse(galleryRaw);
            if (Array.isArray(parsed)) {
                parsed = parsed.filter(d => d.shortId !== id && d.id !== id && d._id !== id);
                localStorage.setItem('nfc_gallery_designs', JSON.stringify(parsed));
            }
        }
        // 2. Remove autosave if matched
        if (id === 'local_autosave' || id === 'local_current' || id.startsWith('local_')) {
            localStorage.removeItem('nfc_autosave_state');
            localStorage.removeItem('businessCardState');
        }
        // 3. Clear editingDesignId if matching
        if (localStorage.getItem('nfc:editingDesignId') === id) {
            localStorage.removeItem('nfc:editingDesignId');
        }
    } catch(e) {
        console.warn('[Dashboard] Error removing design from localStorage:', e);
    }
}

async function loadMyDesigns() {
    const grid = document.getElementById('designs-grid');
    if (!grid) return;

    let designs = [];
    let fetchError = false;

    if (typeof Auth !== 'undefined' && Auth.isLoggedIn()) {
        try {
            const response = await Auth.apiFetchWithRefresh(Auth.API_USER_DESIGNS, { headers: Auth.getHeader() });
            if (response.ok) {
                const data = await response.json();
                if (data.success && Array.isArray(data.designs)) {
                    designs = data.designs;
                }
            } else {
                fetchError = true;
            }
        } catch (err) {
            console.error('[Dashboard] loadMyDesigns network exception:', err);
            fetchError = true;
        }
    }

    // If server returned no designs or was offline, fallback to local storage designs
    if (designs.length === 0) {
        designs = getLocalSavedDesigns();
    }

    // Strictly 1 card design per member
    if (designs.length > 1) {
        designs = [designs[0]];
    }

    grid.innerHTML = '';

    // Update sidebar create link based on 1-card quota
    const sidebarCreateLink = document.querySelector('.sidebar-menu a[href*="editor.html"]');

    if (designs.length > 0) {
        window.myLoadedDesigns = designs;
        const firstDesign = designs[0];
        const firstDesignId = firstDesign.shortId || firstDesign.id || firstDesign._id || 'local_0';
        const isLocalFirst = !firstDesign.shortId || firstDesign.shortId.startsWith('local_');
        const firstEditUrl = !isLocalFirst ? `editor.html?id=${encodeURIComponent(firstDesign.shortId)}` : 'editor.html';

        if (sidebarCreateLink) {
            sidebarCreateLink.href = firstEditUrl;
            sidebarCreateLink.innerHTML = '<i class="fas fa-edit"></i> <span>تعديل بطاقتي</span>';
            sidebarCreateLink.title = 'تعديل بطاقتك الذكية الوحيدة';
        }

        // Single Card Quota Banner
        const banner = document.createElement('div');
        banner.className = 'single-card-banner';
        banner.innerHTML = `
            <div style="display: flex; align-items: center; gap: 12px; color: #e2e8f0; font-size: 0.95rem;">
                <i class="fas fa-check-circle" style="color: #c5a059; font-size: 1.3rem;"></i>
                <div>
                    <strong style="color: #f8fafc;">بطاقتك الرقمية النشطة (1 من 1)</strong>
                    <div style="color: #94a3b8; font-size: 0.85rem; margin-top: 2px;">يتمتع كل حساب بتصميم بطاقة ذكية رئيسية واحدة قابلة للتعديل والمشاركة في أي وقت.</div>
                </div>
            </div>
            <a href="${firstEditUrl}" class="btn btn-primary" style="padding: 7px 16px; font-size: 0.85rem; display: inline-flex; align-items: center; gap: 6px;">
                <i class="fas fa-edit"></i> تعديل البطاقة
            </a>
        `;
        grid.appendChild(banner);

        designs.forEach((design, index) => {
            const designId = design.shortId || design.id || design._id || ('local_' + index);
            const inputs = design.data?.inputs || {};
            const name = design.title || inputs['input-name_ar'] || inputs['input-name_en'] || inputs['input-name'] || 'بطاقة رقمية';
            const tagline = inputs['input-tagline_ar'] || inputs['input-tagline_en'] || inputs['input-tagline'] || '';
            const views = design.views || 0;
            const date = design.createdAt ? new Date(design.createdAt).toLocaleDateString('ar-EG') : 'الآن';
            const thumb = design.data?.imageUrls?.capturedFront || design.data?.imageUrls?.front || '';
            
            let imgTag = '<i class="fas fa-id-card" style="font-size: 3.5rem; color: #c5a059; opacity: 0.9;"></i>';
            if (thumb) {
                imgTag = `<img src="${thumb}" alt="${escapeHTML(name)}" loading="lazy" style="max-height: 160px; object-fit: contain;">`;
            }

            const isLocal = !design.shortId || design.shortId.startsWith('local_');
            const viewUrl = !isLocal ? `viewer.html?id=${encodeURIComponent(design.shortId)}` : 'editor.html';
            const editUrl = !isLocal ? `editor.html?id=${encodeURIComponent(design.shortId)}` : 'editor.html';

            const card = document.createElement('div');
            card.className = 'design-card hover-lift animate-on-scroll';
            card.innerHTML = `
                <div class="card-thumb">${imgTag}</div>
                <div class="card-details">
                    <h3 class="card-title">${escapeHTML(name)}</h3>
                    ${tagline ? `<p style="color: #8b949e; font-size: 0.85rem; margin-bottom: 12px;">${escapeHTML(tagline)}</p>` : ''}
                    <div class="card-meta">
                        <span><i class="far fa-eye"></i> ${views} مشاهدة</span>
                        <span><i class="far fa-calendar"></i> ${date}</span>
                    </div>
                    <div class="card-actions">
                        <a href="${viewUrl}" class="action-btn btn-view" target="_blank">عرض</a>
                        <a href="${editUrl}" class="action-btn btn-edit">تعديل</a>
                        <button type="button" class="action-btn btn-signature" onclick="generateSignatureFromDashboard('${escapeHTML(designId)}')" title="توقيع الإيميل"><i class="fas fa-signature"></i> توقيع</button>
                        <button type="button" class="action-btn btn-remove" onclick="deleteDesign('${escapeHTML(designId)}')" title="حذف التصميم"><i class="fas fa-trash-alt"></i> حذف</button>
                    </div>
                </div>`;
            grid.appendChild(card);
        });
    } else {
        if (sidebarCreateLink) {
            sidebarCreateLink.href = 'editor.html';
            sidebarCreateLink.innerHTML = '<i class="fas fa-magic"></i> <span>أنشئ بطاقة جديدة</span>';
        }
        grid.innerHTML = `
            <div class="empty-state" style="text-align: center; padding: 60px 20px;">
                <i class="far fa-folder-open" style="font-size: 4rem; color: #c5a059; margin-bottom: 20px; display: inline-block;"></i>
                <h3 style="color: #f0f6fc; font-size: 1.5rem; margin-bottom: 10px;">لا توجد بطاقة محفوظة بعد</h3>
                <p style="color: #8b949e; margin-bottom: 25px;">ابدأ بإنشاء وتخصيص بطاقة عملك الرقمية الرئيسية الآن بكل سهولة</p>
                <a href="editor.html" class="btn btn-primary" style="display: inline-flex; align-items: center; gap: 8px;">
                    <i class="fas fa-magic"></i> أنشئ بطاقتك الآن
                </a>
            </div>`;
    }
}

async function deleteDesign(shortId) {
    if (!shortId || shortId === 'undefined') {
        alert('معرّف البطاقة غير محدد.');
        return;
    }

    if (!confirm('هل أنت متأكد أنك تريد حذف هذا التصميم نهائياً؟')) return;
    
    let isDeleted = false;

    // If local
    if (shortId.startsWith('local_')) {
        removeDesignFromLocalStorage(shortId);
        loadMyDesigns();
        return;
    }

    try {
        if (typeof Auth !== 'undefined' && Auth.isLoggedIn()) {
            const endpoint = `${baseUrl}/api/user/designs/${encodeURIComponent(shortId)}`;
            const res = await Auth.apiFetchWithRefresh(endpoint, {
                method: 'DELETE',
                headers: Auth.getHeader()
            });

            if (res.ok) {
                const data = await res.json().catch(() => ({ success: true }));
                if (data.success) {
                    isDeleted = true;
                } else {
                    alert(data.error || 'فشل حذف التصميم');
                }
            } else if (res.status === 404) {
                // Not found on server, clean up locally
                isDeleted = true;
            } else {
                const data = await res.json().catch(() => ({}));
                alert(data.error || 'حدث خطأ في الخادم أثناء حذف التصميم');
            }
        } else {
            isDeleted = true;
        }
    } catch (err) {
        console.error('[Dashboard Delete Error]', err);
        isDeleted = true;
    }

    if (isDeleted) {
        removeDesignFromLocalStorage(shortId);
        loadMyDesigns();
    }
}

async function loadRequestCount() {
    try {
        if (typeof Auth !== 'undefined' && Auth.isLoggedIn()) {
            const res = await Auth.apiFetchWithRefresh(`${baseUrl}/api/card-requests/count`, { headers: Auth.getHeader() });
            const data = await res.json();
            const badge = document.getElementById('requests-badge');
            if (badge) {
                if (data.count > 0) {
                    badge.textContent = data.count;
                    badge.style.display = 'inline';
                } else {
                    badge.style.display = 'none';
                }
            }
        }
    } catch (err) { console.error(err); }
}

async function loadSavedCards() {
    const grid = document.getElementById('saved-cards-grid');
    if (!grid) return;

    let savedCards = [];
    if (typeof Auth !== 'undefined' && Auth.isLoggedIn()) {
        try {
            const res = await Auth.apiFetchWithRefresh(`${baseUrl}/api/saved-cards`, { headers: Auth.getHeader() });
            if (res.ok) {
                const data = await res.json();
                if (data.savedCards && Array.isArray(data.savedCards)) {
                    savedCards = data.savedCards;
                }
            }
        } catch (err) {
            console.error('Load saved cards exception:', err);
        }
    }

    grid.innerHTML = '';
    if (savedCards.length > 0) {
        savedCards.forEach(card => {
            const cardId = card.designShortId || card.shortId || card.designId || card._id || '';
            const thumb = card.cardThumb || '';
            let imgTag = '<i class="fas fa-id-card" style="font-size: 3.5rem; color: #c5a059;"></i>';
            if (thumb) imgTag = `<img src="${thumb}" alt="${escapeHTML(card.ownerName || 'Card')}" loading="lazy">`;
            const date = card.savedAt ? new Date(card.savedAt).toLocaleDateString('ar-EG') : 'تاريخ غير معروف';
            const el = document.createElement('div');
            el.className = 'design-card hover-lift animate-on-scroll';
            el.innerHTML = `
                <div class="card-thumb">${imgTag}</div>
                <div class="card-details">
                    <h3 class="card-title">${escapeHTML(card.ownerName || 'غير معروف')}</h3>
                    <div class="card-meta"><span><i class="far fa-calendar"></i> ${date}</span></div>
                    <div class="card-actions">
                        <a href="viewer.html?id=${encodeURIComponent(cardId)}" class="action-btn btn-view" target="_blank">عرض</a>
                        <button type="button" class="action-btn btn-remove" onclick="removeSavedCard('${escapeHTML(cardId)}')"><i class="fas fa-trash-alt"></i> إزالة</button>
                    </div>
                </div>`;
            grid.appendChild(el);
        });
    } else {
        grid.innerHTML = `
            <div class="empty-state" style="text-align: center; padding: 60px 20px;">
                <i class="fas fa-heart" style="font-size: 4rem; color: #e74c3c; opacity: 0.5; margin-bottom: 20px; display: inline-block;"></i>
                <h3 style="color: #f0f6fc; font-size: 1.5rem; margin-bottom: 10px;">لا توجد بطاقات محفوظة</h3>
                <p style="color: #8b949e; margin-bottom: 25px;">يمكنك حفظ بطاقات الآخرين والزملاء من صفحة عرض البطاقة للوصول السريع إليها</p>
                <a href="gallery.html" class="btn btn-primary">
                    <i class="fas fa-images"></i> تصفح المعرض
                </a>
            </div>`;
    }
}

async function removeSavedCard(designId) {
    if (!designId) {
        alert('معرّف البطاقة غير محدد.');
        return;
    }
    if (!confirm('هل تريد إزالة هذه البطاقة من قائمة المحفوظات؟')) return;
    try {
        if (typeof Auth !== 'undefined' && Auth.isLoggedIn()) {
            const res = await Auth.apiFetchWithRefresh(`${baseUrl}/api/saved-cards/${encodeURIComponent(designId)}`, {
                method: 'DELETE',
                headers: Auth.getHeader()
            });
            const data = await res.json().catch(() => ({ success: true }));
            if (!res.ok && !data.success) {
                console.warn('[Dashboard] removeSavedCard server returned error:', data.error);
            }
        }
    } catch (err) {
        console.error('[Dashboard] removeSavedCard error:', err);
    }
    
    // Also clean up local storage cache if any
    try {
        const localSaved = localStorage.getItem('nfc_saved_cards');
        if (localSaved) {
            let parsed = JSON.parse(localSaved);
            if (Array.isArray(parsed)) {
                parsed = parsed.filter(c => (c.designShortId !== designId && c.shortId !== designId && c.designId !== designId && c._id !== designId));
                localStorage.setItem('nfc_saved_cards', JSON.stringify(parsed));
            }
        }
    } catch(e) {}
    
    await loadSavedCards();
}

async function loadCardRequests() {
    const list = document.getElementById('requests-list');
    if (!list) return;

    let requests = [];
    if (typeof Auth !== 'undefined' && Auth.isLoggedIn()) {
        try {
            const res = await Auth.apiFetchWithRefresh(`${baseUrl}/api/card-requests`, { headers: Auth.getHeader() });
            const data = await res.json();
            if (data.requests && Array.isArray(data.requests)) {
                requests = data.requests;
            }
        } catch (err) { console.error(err); }
    }

    list.innerHTML = '';
    if (requests.length > 0) {
        requests.forEach(req => {
            const date = new Date(req.createdAt).toLocaleDateString('ar-EG');
            const isPending = req.status === 'pending';
            const statusClass = `status-${req.status}`;
            const statusText = req.status === 'pending' ? 'قيد الانتظار' : req.status === 'approved' ? 'موافق عليه' : 'مرفوض';

            const el = document.createElement('div');
            el.className = 'request-card glass-panel hover-lift animate-on-scroll';
            el.innerHTML = `
                <div class="request-info">
                    <h3>${escapeHTML(req.requesterName)}</h3>
                    <p><i class="fas fa-envelope"></i> ${escapeHTML(req.requesterEmail)}</p>
                    <p><i class="fas fa-id-card"></i> يطلب حفظ: ${escapeHTML(req.cardName)}</p>
                    <p><i class="far fa-calendar"></i> ${date}</p>
                    ${!isPending ? `<span class="request-status-badge ${statusClass}">${statusText}</span>` : ''}
                </div>
                ${isPending ? `
                    <div class="request-actions">
                        <button class="btn-approve" onclick="handleRequest('${req._id}', 'approve')">
                            <i class="fas fa-check"></i> موافقة
                        </button>
                        <button class="btn-reject" onclick="handleRequest('${req._id}', 'reject')">
                            <i class="fas fa-times"></i> رفض
                        </button>
                    </div>` : ''}`;
            list.appendChild(el);
        });
    } else {
        list.innerHTML = `
            <div class="empty-state" style="text-align: center; padding: 60px 20px;">
                <i class="fas fa-bell" style="font-size: 4rem; color: #c5a059; opacity: 0.5; margin-bottom: 20px; display: inline-block;"></i>
                <h3 style="color: #f0f6fc; font-size: 1.5rem; margin-bottom: 10px;">لا توجد طلبات جديدة</h3>
                <p style="color: #8b949e;">ستظهر هنا طلبات حفظ بطاقاتك من المستخدمين الآخرين</p>
            </div>`;
    }
}

async function handleRequest(requestId, action) {
    try {
        if (typeof Auth !== 'undefined' && Auth.isLoggedIn()) {
            await Auth.apiFetchWithRefresh(`${baseUrl}/api/card-requests/${requestId}`, {
                method: 'PUT',
                headers: { ...Auth.getHeader(), 'Content-Type': 'application/json' },
                body: JSON.stringify({ action })
            });
        }
        loadCardRequests();
        loadRequestCount();
    } catch (err) { console.error(err); }
}

async function loadPrivacySettings() {
    try {
        if (typeof Auth !== 'undefined' && Auth.isLoggedIn()) {
            const res = await Auth.apiFetchWithRefresh(`${baseUrl}/api/privacy-settings`, { headers: Auth.getHeader() });
            const data = await res.json();
            if (data.cardPrivacy) {
                const radio = document.querySelector(`input[name="cardPrivacy"][value="${data.cardPrivacy}"]`);
                if (radio) {
                    radio.checked = true;
                    document.querySelectorAll('.privacy-option').forEach(opt => opt.classList.remove('selected'));
                    radio.closest('.privacy-option')?.classList.add('selected');
                }
            }
        }
    } catch (err) { console.error(err); }
}

document.getElementById('save-privacy-btn')?.addEventListener('click', async () => {
    const selected = document.querySelector('input[name="cardPrivacy"]:checked')?.value;
    if (!selected) return;
    try {
        if (typeof Auth !== 'undefined' && Auth.isLoggedIn()) {
            const res = await Auth.apiFetchWithRefresh(`${baseUrl}/api/privacy-settings`, {
                method: 'PUT',
                headers: { ...Auth.getHeader(), 'Content-Type': 'application/json' },
                body: JSON.stringify({ cardPrivacy: selected })
            });
            const data = await res.json();
            alert(data.message || 'تم حفظ إعدادات الخصوصية بنجاح');
        } else {
            alert('تم حفظ الإعدادات');
        }
    } catch (err) {
        console.error(err);
        alert('حدث خطأ أثناء حفظ الإعدادات');
    }
});

// Delete Account Button Handler
document.getElementById('delete-account-btn')?.addEventListener('click', async () => {
    const confirmation = prompt('تحذير: سيتم حذف حسابك وجميع بطاقاتك نهائياً بدون إمكانية للاسترجاع.\nلتأكيد الحذف، اكتب كلمة DELETE في المربع أدناه:');
    if (confirmation !== 'DELETE') {
        if (confirmation !== null) {
            alert('لم يتم تأكيد الحذف. يجب كتابة كلمة DELETE بالأحرف الكبيرة بالضبط.');
        }
        return;
    }

    try {
        if (typeof Auth !== 'undefined' && Auth.isLoggedIn()) {
            const res = await Auth.apiFetchWithRefresh(`${baseUrl}/api/auth/account`, {
                method: 'DELETE',
                headers: { ...Auth.getHeader(), 'Content-Type': 'application/json' },
                body: JSON.stringify({ confirmation: 'DELETE' })
            });
            const data = await res.json().catch(() => ({}));
            if (res.ok && data.success) {
                alert('تم حذف حسابك وكافة البيانات المرتبطة به بنجاح.');
                localStorage.clear();
                window.location.href = 'index.html';
            } else {
                alert(data.error || 'فشل حذف الحساب. يرجى المحاولة لاحقاً.');
            }
        } else {
            localStorage.clear();
            window.location.href = 'index.html';
        }
    } catch (err) {
        console.error('[Dashboard Delete Account Error]', err);
        alert('حدث خطأ أثناء حذف الحساب.');
    }
});

// Export Account Data Handler
document.getElementById('export-account-data-btn')?.addEventListener('click', async () => {
    try {
        const exportData = {
            platform: 'MC PRIME NFC',
            exportedAt: new Date().toISOString(),
            user: (typeof Auth !== 'undefined' && Auth.user) ? Auth.user : null,
            designs: window.myLoadedDesigns || getLocalSavedDesigns()
        };

        const jsonStr = JSON.stringify(exportData, null, 2);
        const blob = new Blob([jsonStr], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `mcprime-account-data-${Date.now()}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    } catch (err) {
        console.error('[Dashboard Export Error]', err);
        alert('حدث خطأ أثناء تصدير البيانات.');
    }
});

// --- Email / Digital Signature Generator Modal ---
async function openSignatureModal(designId) {
    let design = (window.myLoadedDesigns || []).find(d => (d.shortId === designId || d.id === designId || d._id === designId));
    
    // If not found in loaded array, attempt to fetch from server
    if (!design && designId && !designId.startsWith('local_')) {
        try {
            const res = await fetch(`${baseUrl}/api/get-design/${encodeURIComponent(designId)}`);
            if (res.ok) {
                const fetchedData = await res.json();
                const cleanState = fetchedData.publishedState || fetchedData.data || fetchedData;
                design = { shortId: designId, data: cleanState };
            }
        } catch(e) {
            console.warn('[Dashboard] Could not fetch design for signature:', e);
        }
    }
    
    if (!design) {
        design = getLocalSavedDesigns().find(d => d.shortId === designId) || {
            shortId: designId,
            data: { inputs: { 'input-name': 'عضو MC PRIME' } }
        };
    }

    const data = design.data || {};
    const inputs = data.inputs || {};
    const dynamic = data.dynamic || {};
    const staticSocial = dynamic.staticSocial || {};
    const imageUrls = data.imageUrls || {};

    const isAr = document.documentElement.lang !== 'en';
    const name = design.title || inputs['input-name_ar'] || inputs['input-name_en'] || inputs['input-name'] || 'عضو MC PRIME';
    const tagline = inputs['input-tagline_ar'] || inputs['input-tagline_en'] || inputs['input-tagline'] || '';
    const photo = imageUrls.photo || inputs['input-photo-url'] || imageUrls.capturedFront || imageUrls.front || '';
    const logo = inputs['input-logo'] || '';
    const phone = (dynamic.phones && dynamic.phones[0] && dynamic.phones[0].value) || inputs['input-phone-url'] || '';
    const email = (staticSocial.email && staticSocial.email.value) || (typeof Auth !== 'undefined' && Auth.user?.email) || '';
    const whatsapp = (staticSocial.whatsapp && staticSocial.whatsapp.value) ? staticSocial.whatsapp.value.replace(/\D/g, '') : '';
    const website = (staticSocial.website && staticSocial.website.value) || '';
    const linkedin = (staticSocial.linkedin && staticSocial.linkedin.value) || '';
    
    const cardViewerUrl = (!designId || designId.startsWith('local_')) 
        ? `${window.location.origin}/editor.html` 
        : `${window.location.origin}/viewer.html?id=${encodeURIComponent(designId)}`;

    const avatarSrc = photo || logo;
    const avatarShape = photo ? '50%' : '10px';
    const avatarHtml = avatarSrc
        ? `<img src="${avatarSrc}" width="75" height="75" style="width:75px;height:75px;border-radius:${avatarShape};object-fit:cover;display:block;border:2px solid #c5a059;" alt="${escapeHTML(name)}">`
        : `<div style="width:75px;height:75px;border-radius:${avatarShape};background:linear-gradient(135deg,#c5a059,#8a6b2d);display:flex;align-items:center;justify-content:center;color:#ffffff;font-size:28px;font-weight:bold;font-family:Arial,sans-serif;">${escapeHTML(name.charAt(0).toUpperCase())}</div>`;

    const contactPills = [];
    if (phone) {
        contactPills.push(`<a href="tel:${phone}" style="display:inline-block;padding:4px 10px;margin:2px 4px 2px 0;background:#f8fafc;color:#0f172a;text-decoration:none;border-radius:15px;font-size:12px;border:1px solid #cbd5e1;">📞 ${escapeHTML(phone)}</a>`);
    }
    if (email) {
        contactPills.push(`<a href="mailto:${email}" style="display:inline-block;padding:4px 10px;margin:2px 4px 2px 0;background:#f8fafc;color:#0f172a;text-decoration:none;border-radius:15px;font-size:12px;border:1px solid #cbd5e1;">✉️ ${escapeHTML(email)}</a>`);
    }
    if (whatsapp) {
        contactPills.push(`<a href="https://wa.me/${whatsapp}" style="display:inline-block;padding:4px 10px;margin:2px 4px 2px 0;background:#ecfdf5;color:#047857;text-decoration:none;border-radius:15px;font-size:12px;border:1px solid #a7f3d0;">💬 واتساب</a>`);
    }
    if (website) {
        const webHref = website.startsWith('http') ? website : `https://${website}`;
        contactPills.push(`<a href="${webHref}" style="display:inline-block;padding:4px 10px;margin:2px 4px 2px 0;background:#f8fafc;color:#0284c7;text-decoration:none;border-radius:15px;font-size:12px;border:1px solid #cbd5e1;">🌐 ${escapeHTML(website.replace(/^https?:\/\//, ''))}</a>`);
    }
    if (linkedin) {
        const liHref = linkedin.startsWith('http') ? linkedin : `https://linkedin.com/in/${linkedin}`;
        contactPills.push(`<a href="${liHref}" style="display:inline-block;padding:4px 10px;margin:2px 4px 2px 0;background:#eff6ff;color:#1d4ed8;text-decoration:none;border-radius:15px;font-size:12px;border:1px solid #bfdbfe;">💼 لينكد إن</a>`);
    }

    const signatureTableHtml = `
<table cellpadding="0" cellspacing="0" border="0" style="font-family:Arial,Helvetica,sans-serif;font-size:13px;color:#1e293b;max-width:520px;line-height:1.4;background:#ffffff;padding:14px;border-radius:12px;border:1px solid #e2e8f0;">
  <tr>
    <td style="padding-left:16px;vertical-align:middle;width:80px;">
      ${avatarHtml}
    </td>
    <td style="border-right:3px solid #c5a059;padding-right:16px;vertical-align:middle;text-align:right;" dir="rtl">
      <div style="font-size:17px;font-weight:bold;color:#0f172a;margin-bottom:2px;">${escapeHTML(name)}</div>
      ${tagline ? `<div style="font-size:13px;color:#64748b;margin-bottom:8px;font-weight:500;">${escapeHTML(tagline)}</div>` : ''}
      <div style="margin-bottom:10px;font-size:12px;line-height:1.8;">
        ${contactPills.join(' ')}
      </div>
      <a href="${cardViewerUrl}" target="_blank" style="display:inline-block;background:linear-gradient(135deg,#c5a059,#9a7836);color:#ffffff !important;text-decoration:none;padding:6px 14px;border-radius:20px;font-size:11px;font-weight:bold;letter-spacing:0.5px;box-shadow:0 2px 6px rgba(0,0,0,0.15);">
        💳 عرض بطاقة العمل الذكية (NFC)
      </a>
    </td>
  </tr>
</table>`.trim();

    let modal = document.getElementById('signature-generator-modal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'signature-generator-modal';
        modal.className = 'sig-modal-overlay';
        document.body.appendChild(modal);
    }

    modal.innerHTML = `
        <div class="sig-modal-card glass-panel animate-on-scroll">
            <div class="sig-modal-header">
                <div style="display: flex; align-items: center; gap: 10px;">
                    <i class="fas fa-signature" style="color: #c5a059; font-size: 1.4rem;"></i>
                    <h2 style="margin: 0; font-size: 1.3rem; color: #f0f6fc;">توقيع البريد الإلكتروني الذكي</h2>
                </div>
                <button type="button" class="sig-close-btn" onclick="closeSignatureModal()">&times;</button>
            </div>
            <div class="sig-modal-body">
                <p style="color: #94a3b8; font-size: 0.9rem; margin-bottom: 16px;">
                    انسخ التوقيع المنسق والصقه مباشرة في إعدادات بريدك الإلكتروني (Gmail، Outlook، Apple Mail) ليظهر بأسلوب فاخر ومباشر مع بطاقتك الذكية.
                </p>
                
                <div class="sig-preview-container" id="sig-preview-container" style="background: #f8fafc; padding: 20px; border-radius: 14px; margin-bottom: 20px; overflow-x: auto; box-shadow: inset 0 2px 6px rgba(0,0,0,0.05); border: 1px solid #e2e8f0;">
                    ${signatureTableHtml}
                </div>

                <div class="sig-actions-row">
                    <button type="button" class="btn btn-primary" id="btn-copy-rich-sig" style="flex: 1; display: flex; align-items: center; justify-content: center; gap: 8px;">
                        <i class="fas fa-copy"></i> نسخ التوقيع المنسق (موصى به)
                    </button>
                    <button type="button" class="btn" id="btn-copy-html-sig" style="background: rgba(255,255,255,0.08); color: #f0f6fc; border: 1px solid rgba(255,255,255,0.15); display: flex; align-items: center; justify-content: center; gap: 8px;">
                        <i class="fas fa-code"></i> نسخ كود HTML
                    </button>
                </div>

                <div class="sig-instructions-box" style="margin-top: 20px; background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.08); border-radius: 12px; padding: 14px;">
                    <h4 style="color: #c5a059; font-size: 0.95rem; margin-bottom: 8px; display: flex; align-items: center; gap: 6px;">
                        <i class="fas fa-info-circle"></i> طريقة الاستخدام السريعة:
                    </h4>
                    <ol style="color: #94a3b8; font-size: 0.85rem; padding-right: 20px; padding-left: 20px; margin: 0; line-height: 1.6;">
                        <li>انقر على زر <strong>"نسخ التوقيع المنسق"</strong> أعلاه.</li>
                        <li>افتح إعدادات بريدك (في Gmail: الإعدادات ⚙️ -> كل الإعدادات -> عام -> التوقيع) أو (في Outlook: خيارات -> البريد -> التوقيعات).</li>
                        <li>الصق التوقيع بالضغط على <strong>(Ctrl + V)</strong> أو <strong>(Cmd + V)</strong> ثم احفظ التغييرات.</li>
                    </ol>
                </div>
            </div>
        </div>
    `;

    modal.style.display = 'flex';

    // Copy formatted rich HTML
    document.getElementById('btn-copy-rich-sig')?.addEventListener('click', async () => {
        const copyBtn = document.getElementById('btn-copy-rich-sig');
        try {
            const blob = new Blob([signatureTableHtml], { type: 'text/html' });
            const textBlob = new Blob([`${name} - ${tagline}\n${cardViewerUrl}`], { type: 'text/plain' });
            if (navigator.clipboard && window.ClipboardItem) {
                await navigator.clipboard.write([
                    new ClipboardItem({
                        'text/html': blob,
                        'text/plain': textBlob
                    })
                ]);
            } else {
                const container = document.getElementById('sig-preview-container');
                const range = document.createRange();
                range.selectNodeContents(container);
                const selection = window.getSelection();
                selection.removeAllRanges();
                selection.addRange(range);
                document.execCommand('copy');
                selection.removeAllRanges();
            }
            if (copyBtn) {
                const orig = copyBtn.innerHTML;
                copyBtn.innerHTML = '<i class="fas fa-check"></i> تم نسخ التوقيع بنجاح!';
                copyBtn.style.background = '#10b981';
                setTimeout(() => {
                    copyBtn.innerHTML = orig;
                    copyBtn.style.background = '';
                }, 2500);
            }
            alert('✅ تم نسخ التوقيع المنسق بنجاح!\n\nيمكنك الآن الذهاب إلى إعدادات بريدك الإلكتروني (Gmail أو Outlook) ولصقه هناك مباشرة (Ctrl + V).');
        } catch (err) {
            console.error('Signature copy error:', err);
            try {
                const container = document.getElementById('sig-preview-container');
                const range = document.createRange();
                range.selectNodeContents(container);
                const selection = window.getSelection();
                selection.removeAllRanges();
                selection.addRange(range);
                document.execCommand('copy');
                selection.removeAllRanges();
                alert('✅ تم نسخ التوقيع بنجاح!');
            } catch(e) {
                alert('تعذر النسخ التلقائي. يرجى تظليل التوقيع من المعاينة ونسخه.');
            }
        }
    });

    // Copy raw HTML
    document.getElementById('btn-copy-html-sig')?.addEventListener('click', async () => {
        try {
            await navigator.clipboard.writeText(signatureTableHtml);
            alert('تم نسخ كود HTML التوقيع إلى الحافظة.');
        } catch (err) {
            console.error(err);
        }
    });
}

function closeSignatureModal() {
    const modal = document.getElementById('signature-generator-modal');
    if (modal) modal.style.display = 'none';
}

function generateSignatureFromDashboard(shortId) {
    if (!shortId) {
        window.location.href = 'editor.html';
        return;
    }
    openSignatureModal(shortId);
}

// Global Window Bindings for inline onclick attributes
window.deleteDesign = deleteDesign;
window.removeSavedCard = removeSavedCard;
window.handleRequest = handleRequest;
window.loadMyDesigns = loadMyDesigns;
window.loadSavedCards = loadSavedCards;
window.loadCardRequests = loadCardRequests;
window.loadPrivacySettings = loadPrivacySettings;
window.generateSignatureFromDashboard = generateSignatureFromDashboard;
window.openSignatureModal = openSignatureModal;
window.closeSignatureModal = closeSignatureModal;