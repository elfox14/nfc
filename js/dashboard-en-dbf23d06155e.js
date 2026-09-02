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
            userDisplay.textContent = (typeof Auth !== 'undefined' && Auth.user?.name) ? Auth.user.name : 'User';
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
            console.log('[Dashboard EN] Auto-refreshing designs from cross-tab event');
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

function showToast(message, type = 'success') {
    const existing = document.getElementById('dashboard-toast');
    if (existing) existing.remove();

    const colors = {
        success: { bg: 'rgba(34,197,94,0.15)', border: 'rgba(34,197,94,0.4)', text: '#22c55e', icon: 'fa-check-circle' },
        error: { bg: 'rgba(239,68,68,0.15)', border: 'rgba(239,68,68,0.4)', text: '#ef4444', icon: 'fa-times-circle' },
        info: { bg: 'rgba(59,130,246,0.15)', border: 'rgba(59,130,246,0.4)', text: '#60b5ff', icon: 'fa-info-circle' }
    };
    const c = colors[type] || colors.info;

    const toast = document.createElement('div');
    toast.id = 'dashboard-toast';
    toast.style.cssText = `position:fixed;bottom:30px;right:30px;z-index:10000;background:${c.bg};border:1px solid ${c.border};border-radius:14px;padding:16px 24px;display:flex;align-items:center;gap:12px;backdrop-filter:blur(12px);box-shadow:0 8px 32px rgba(0,0,0,0.4);animation:slideInRight 0.4s ease-out;font-family:'Poppins',sans-serif;max-width:320px;`;
    toast.innerHTML = `<i class="fas ${c.icon}" style="color:${c.text};font-size:1.3rem;flex-shrink:0;"></i><span style="color:white;font-size:0.95rem;line-height:1.4;">${message}</span>`;
    
    if (!document.getElementById('toast-keyframes')) {
        const style = document.createElement('style');
        style.id = 'toast-keyframes';
        style.textContent = `@keyframes slideInRight{from{opacity:0;transform:translateX(60px)}to{opacity:1;transform:translateX(0)}}`;
        document.head.appendChild(style);
    }

    document.body.appendChild(toast);
    setTimeout(() => {
        toast.style.animation = 'none';
        toast.style.opacity = '0';
        toast.style.transition = 'opacity 0.3s ease';
        setTimeout(() => toast.remove(), 300);
    }, 3500);
}

function getLocalSavedDesigns() {
    const list = [];
    try {
        // 1. Gallery designs
        const galleryRaw = localStorage.getItem('nfc_gallery_designs');
        if (galleryRaw) {
            const parsed = JSON.parse(galleryRaw);
            if (Array.isArray(parsed)) list.push(...parsed);
        }

        // 2. Autosave state
        const autosaveRaw = localStorage.getItem('nfc_autosave_state');
        if (autosaveRaw) {
            const parsed = JSON.parse(autosaveRaw);
            if (parsed && (parsed.inputs || parsed.elements)) {
                list.push({
                    shortId: 'local_autosave',
                    title: parsed.inputs?.['input-name'] || parsed.inputs?.['input-name_en'] || parsed.inputs?.['input-name_ar'] || 'Current Card (Editor)',
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
                    title: parsed.inputs['input-name'] || parsed.inputs['input-name_en'] || parsed.inputs['input-name_ar'] || 'My Smart Card',
                    createdAt: Date.now(),
                    views: 1,
                    data: parsed
                });
            }
        }
    } catch (e) {
        console.warn('[Dashboard EN] Local designs read failed:', e);
    }
    return list;
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
            console.error('[Dashboard EN] loadMyDesigns network exception:', err);
            fetchError = true;
        }
    }

    // If server returned no designs or was offline, fallback to local storage designs
    if (designs.length === 0) {
        designs = getLocalSavedDesigns();
    }

    grid.innerHTML = '';

    if (designs.length > 0) {
        window.myLoadedDesigns = designs;
        designs.forEach((design, idx) => {
            const designId = String(design.shortId || design.id || design._id || `local_${idx}`);
            const inputs = design.data?.inputs || design.inputs || {};
            const name = design.title || inputs['input-name_en'] || inputs['input-name_ar'] || inputs['input-name'] || 'Smart Card';
            const tagline = inputs['input-tagline_en'] || inputs['input-tagline_ar'] || inputs['input-tagline'] || '';
            const views = design.views || 0;
            const date = design.createdAt ? new Date(design.createdAt).toLocaleDateString('en-US') : 'Now';
            const thumb = design.data?.imageUrls?.capturedFront || design.data?.imageUrls?.front || design.imageUrls?.front || '';
            
            let imgTag = '<i class="fas fa-id-card" style="font-size: 3.5rem; color: #c5a059; opacity: 0.9;"></i>';
            if (thumb) {
                imgTag = `<img src="${thumb}" alt="${escapeHTML(name)}" loading="lazy" style="max-height: 160px; object-fit: contain;">`;
            }

            const isRealId = designId && !designId.startsWith('local_') && !designId.startsWith('card_');
            const viewUrl = isRealId ? `viewer-en.html?id=${encodeURIComponent(designId)}` : 'editor-en.html';
            const editUrl = isRealId ? `editor-en.html?id=${encodeURIComponent(designId)}` : 'editor-en.html';

            const card = document.createElement('div');
            card.className = 'design-card hover-lift animate-on-scroll';
            card.dataset.id = designId;
            card.innerHTML = `
                <div class="card-thumb">${imgTag}</div>
                <div class="card-details">
                    <h3 class="card-title">${escapeHTML(name)}</h3>
                    ${tagline ? `<p style="color: #8b949e; font-size: 0.85rem; margin-bottom: 12px;">${escapeHTML(tagline)}</p>` : ''}
                    <div class="card-meta">
                        <span><i class="far fa-eye"></i> ${views} views</span>
                        <span><i class="far fa-calendar"></i> ${date}</span>
                    </div>
                    <div class="card-actions">
                        <a href="${viewUrl}" class="action-btn btn-view" target="_blank">View</a>
                        <a href="${editUrl}" class="action-btn btn-edit">Edit</a>
                        <button type="button" class="action-btn btn-signature" data-id="${escapeHTML(designId)}" onclick="generateSignatureFromDashboard('${escapeHTML(designId)}')" title="Email Signature"><i class="fas fa-signature"></i></button>
                        <button type="button" class="action-btn btn-remove" data-id="${escapeHTML(designId)}" onclick="deleteDesign('${escapeHTML(designId)}')">Delete</button>
                    </div>
                </div>`;

            // Explicit direct event listener attachments
            const sigBtn = card.querySelector('.btn-signature');
            if (sigBtn) {
                sigBtn.addEventListener('click', (e) => {
                    e.preventDefault();
                    generateSignatureFromDashboard(designId);
                });
            }
            const delBtn = card.querySelector('.btn-remove');
            if (delBtn) {
                delBtn.addEventListener('click', (e) => {
                    e.preventDefault();
                    deleteDesign(designId);
                });
            }

            grid.appendChild(card);
        });
    } else {
        grid.innerHTML = `
            <div class="empty-state" style="text-align: center; padding: 60px 20px;">
                <i class="far fa-folder-open" style="font-size: 4rem; color: #c5a059; margin-bottom: 20px; display: inline-block;"></i>
                <h3 style="color: #f0f6fc; font-size: 1.5rem; margin-bottom: 10px;">No Saved Designs Yet</h3>
                <p style="color: #8b949e; margin-bottom: 25px;">Start creating your first luxury NFC digital business card today.</p>
                <a href="editor-en.html" class="btn btn-primary" style="display: inline-flex; align-items: center; gap: 8px;">
                    <i class="fas fa-magic"></i> Create Card Now
                </a>
            </div>`;
    }
}

async function deleteDesign(shortId) {
    if (!confirm('Are you sure you want to delete this design?')) return;

    // Helper to purge any local cached version of this design
    const cleanupLocalCopies = () => {
        try {
            if (!shortId || shortId === 'local_autosave' || shortId === 'local_current' || shortId.startsWith('local_')) {
                localStorage.removeItem('nfc_autosave_state');
                localStorage.removeItem('businessCardState');
            }
            const galleryRaw = localStorage.getItem('nfc_gallery_designs');
            if (galleryRaw) {
                const parsed = JSON.parse(galleryRaw);
                if (Array.isArray(parsed)) {
                    const filtered = parsed.filter(d => d && d.shortId !== shortId && d.id !== shortId && d._id !== shortId);
                    localStorage.setItem('nfc_gallery_designs', JSON.stringify(filtered));
                }
            }
        } catch (e) {
            console.warn('[Dashboard EN] Local purge warning:', e);
        }
    };

    // If local design
    if (!shortId || shortId.startsWith('local_')) {
        cleanupLocalCopies();
        loadMyDesigns();
        showToast('Design deleted successfully', 'success');
        return;
    }

    // Server-side design deletion with local fallback
    try {
        if (typeof Auth !== 'undefined' && Auth.isLoggedIn()) {
            const res = await Auth.apiFetchWithRefresh(`${baseUrl}/api/user/designs/${shortId}`, {
                method: 'DELETE',
                headers: Auth.getHeader()
            });
            const data = await res.json().catch(() => ({}));
            if (res.ok && data.success) {
                cleanupLocalCopies();
                showToast('Design deleted successfully', 'success');
                loadMyDesigns();
                return;
            }
        }
    } catch (err) {
        console.warn('[deleteDesign EN] Server delete failed, removing locally:', err);
    }

    // Local cleanup fallback so the user is never stuck
    cleanupLocalCopies();
    showToast('Design deleted', 'success');
    loadMyDesigns();
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
            const thumb = card.cardThumb || '';
            let imgTag = '<i class="fas fa-id-card" style="font-size: 3.5rem; color: #c5a059;"></i>';
            if (thumb) imgTag = `<img src="${thumb}" alt="${card.ownerName || 'Card'}" loading="lazy">`;
            const date = card.savedAt ? new Date(card.savedAt).toLocaleDateString('en-US') : 'Unknown';
            const el = document.createElement('div');
            el.className = 'design-card hover-lift animate-on-scroll';
            el.innerHTML = `
                <div class="card-thumb">${imgTag}</div>
                <div class="card-details">
                    <h3 class="card-title">${escapeHTML(card.ownerName || 'Unknown')}</h3>
                    <div class="card-meta"><span><i class="far fa-calendar"></i> ${date}</span></div>
                    <div class="card-actions">
                        <a href="viewer-en.html?id=${card.designShortId}" class="action-btn btn-view" target="_blank">View</a>
                        <button type="button" class="action-btn btn-remove" onclick="removeSavedCard('${card.designShortId}')">Remove</button>
                    </div>
                </div>`;

            const remBtn = el.querySelector('.btn-remove');
            if (remBtn) {
                remBtn.addEventListener('click', (e) => {
                    e.preventDefault();
                    removeSavedCard(card.designShortId);
                });
            }

            grid.appendChild(el);
        });
    } else {
        grid.innerHTML = `
            <div class="empty-state" style="text-align: center; padding: 60px 20px;">
                <i class="fas fa-heart" style="font-size: 4rem; color: #e74c3c; opacity: 0.5; margin-bottom: 20px; display: inline-block;"></i>
                <h3 style="color: #f0f6fc; font-size: 1.5rem; margin-bottom: 10px;">No Saved Cards</h3>
                <p style="color: #8b949e; margin-bottom: 25px;">You can save colleagues and business contacts' cards directly from their live viewer.</p>
                <a href="gallery-en.html" class="btn btn-primary">
                    <i class="fas fa-images"></i> Explore Gallery
                </a>
            </div>`;
    }
}

async function removeSavedCard(designId) {
    if (!confirm('Are you sure you want to remove this card?')) return;
    try {
        if (typeof Auth !== 'undefined' && Auth.isLoggedIn()) {
            await Auth.apiFetchWithRefresh(`${baseUrl}/api/saved-cards/${designId}`, {
                method: 'DELETE',
                headers: Auth.getHeader()
            });
            showToast('Card removed from saved cards', 'success');
        }
        loadSavedCards();
    } catch (err) {
        console.error(err);
        showToast('Error removing card', 'error');
    }
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
            const date = new Date(req.createdAt).toLocaleDateString('en-US');
            const isPending = req.status === 'pending';
            const statusClass = `status-${req.status}`;
            const statusText = req.status === 'pending' ? 'Pending' : req.status === 'approved' ? 'Approved' : 'Rejected';

            const el = document.createElement('div');
            el.className = 'request-card glass-panel hover-lift animate-on-scroll';
            el.innerHTML = `
                <div class="request-info">
                    <h3>${escapeHTML(req.requesterName)}</h3>
                    <p><i class="fas fa-envelope"></i> ${escapeHTML(req.requesterEmail)}</p>
                    <p><i class="fas fa-id-card"></i> Requests to save: ${escapeHTML(req.cardName)}</p>
                    <p><i class="far fa-calendar"></i> ${date}</p>
                    ${!isPending ? `<span class="request-status-badge ${statusClass}">${statusText}</span>` : ''}
                </div>
                ${isPending ? `
                    <div class="request-actions">
                        <button class="btn-approve" onclick="handleRequest('${req._id}', 'approve')">
                            <i class="fas fa-check"></i> Approve
                        </button>
                        <button class="btn-reject" onclick="handleRequest('${req._id}', 'reject')">
                            <i class="fas fa-times"></i> Reject
                        </button>
                    </div>` : ''}`;
            list.appendChild(el);
        });
    } else {
        list.innerHTML = `
            <div class="empty-state" style="text-align: center; padding: 60px 20px;">
                <i class="fas fa-bell" style="font-size: 4rem; color: #c5a059; opacity: 0.5; margin-bottom: 20px; display: inline-block;"></i>
                <h3 style="color: #f0f6fc; font-size: 1.5rem; margin-bottom: 10px;">No New Requests</h3>
                <p style="color: #8b949e;">Requests from other users to save your card will appear here.</p>
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
            showToast(`Request ${action}d successfully`, 'success');
        }
        loadCardRequests();
        loadRequestCount();
    } catch (err) {
        console.error(err);
        showToast('Error updating request', 'error');
    }
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
            showToast(data.message || 'Privacy settings saved successfully', 'success');
        } else {
            showToast('Privacy settings saved', 'success');
        }
    } catch (err) {
        console.error(err);
        showToast('Error saving privacy settings', 'error');
    }
});

function generateSignatureFromDashboard(shortId) {
    showSignatureModal(shortId);
}

function showSignatureModal(shortId) {
    // Remove existing modal if any
    const existingModal = document.getElementById('signature-modal');
    if (existingModal) existingModal.remove();

    const isLocal = !shortId || shortId.startsWith('local_');
    const basePath = window.location.pathname.substring(0, window.location.pathname.lastIndexOf('/') + 1);
    const viewerUrl = isLocal
        ? `${window.location.origin}${basePath}editor-en.html`
        : `${window.location.origin}${basePath}viewer-en.html?id=${shortId}`;

    const cardData = (window.myLoadedDesigns || []).find(d => 
        String(d.shortId) === String(shortId) || 
        String(d.id) === String(shortId) || 
        String(d._id) === String(shortId)
    ) || {};
    const inputs = cardData.data?.inputs || cardData.inputs || {};
    const name = cardData.title || inputs['input-name_en'] || inputs['input-name_ar'] || inputs['input-name'] || 'Full Name';
    const tagline = inputs['input-tagline_en'] || inputs['input-tagline_ar'] || inputs['input-tagline'] || 'Job Title';
    const phone = inputs['input-phone'] || inputs['phone'] || '';
    const email = inputs['input-email'] || inputs['email'] || '';
    const thumb = cardData.data?.imageUrls?.capturedFront || cardData.data?.imageUrls?.front || cardData.imageUrls?.front || '';

    const imgHtml = thumb
        ? `<img src="${thumb}" alt="Card Preview" style="max-width:100px;max-height:60px;object-fit:contain;border-radius:8px;border:1px solid rgba(255,255,255,0.1);">`
        : `<div style="width:80px;height:50px;background:linear-gradient(135deg,#c5a059,#a07040);border-radius:8px;display:flex;align-items:center;justify-content:center;"><i class="fas fa-id-card" style="color:white;font-size:1.5rem;"></i></div>`;

    const htmlSig = `<table cellpadding="0" cellspacing="0" border="0" style="font-family:Arial,sans-serif;font-size:14px;color:#333;">
  <tr>
    <td style="padding-left:12px;border-left:3px solid #c5a059;">
      <div style="font-weight:700;font-size:16px;color:#1a1a2e;">${escapeHTML(name)}</div>
      <div style="color:#666;font-size:13px;margin-top:2px;">${escapeHTML(tagline)}</div>
      ${phone ? `<div style="margin-top:4px;color:#555;">📞 ${escapeHTML(phone)}</div>` : ''}
      ${email ? `<div style="color:#555;">✉️ ${escapeHTML(email)}</div>` : ''}
      <div style="margin-top:6px;">
        <a href="${viewerUrl}" style="color:#c5a059;text-decoration:none;font-size:12px;border:1px solid #c5a059;padding:3px 10px;border-radius:20px;">🪪 My Digital Card</a>
      </div>
    </td>
  </tr>
</table>`;

    const modal = document.createElement('div');
    modal.id = 'signature-modal';
    modal.style.cssText = 'position:fixed;inset:0;z-index:999999;display:flex;align-items:center;justify-content:center;';
    modal.innerHTML = `
        <div style="position:fixed;inset:0;background:rgba(0,0,0,0.85);backdrop-filter:blur(8px);z-index:999999;display:flex;align-items:center;justify-content:center;padding:20px;">
            <div style="background:linear-gradient(135deg,#1e293b,#0f172a);border:1px solid rgba(197,160,89,0.3);border-radius:24px;padding:36px;max-width:680px;width:100%;max-height:90vh;overflow-y:auto;position:relative;">
                <button onclick="document.getElementById('signature-modal').remove()" style="position:absolute;top:16px;right:16px;background:rgba(255,255,255,0.1);border:none;color:white;width:32px;height:32px;border-radius:50%;cursor:pointer;font-size:1rem;display:flex;align-items:center;justify-content:center;">✕</button>
                
                <h2 style="color:#c5a059;font-family:'Poppins',sans-serif;margin-bottom:8px;font-size:1.5rem;"><i class="fas fa-signature" style="margin-right:8px;"></i>Professional Email Signature</h2>
                <p style="color:#94a3b8;margin-bottom:28px;font-size:0.9rem;">Copy the code below and paste it in your email signature settings (Gmail, Outlook, etc.).</p>

                <div style="margin-bottom:20px;">
                    <h4 style="color:white;margin-bottom:12px;font-size:0.95rem;"><i class="fas fa-eye" style="color:#a855f7;margin-right:6px;"></i>Signature Preview</h4>
                    <div style="background:white;border-radius:12px;padding:20px;direction:ltr;">
                        <div style="font-family:Arial,sans-serif;font-size:14px;color:#333;">
                            <table cellpadding="0" cellspacing="0" border="0" style="font-family:Arial,sans-serif;font-size:14px;color:#333;">
                              <tr>
                                <td style="padding-left:12px;border-left:3px solid #c5a059;">
                                  <div style="font-weight:700;font-size:16px;color:#1a1a2e;">${escapeHTML(name)}</div>
                                  <div style="color:#666;font-size:13px;margin-top:2px;">${escapeHTML(tagline)}</div>
                                  ${phone ? `<div style="margin-top:4px;color:#555;">📞 ${escapeHTML(phone)}</div>` : ''}
                                  ${email ? `<div style="color:#555;">✉️ ${escapeHTML(email)}</div>` : ''}
                                  <div style="margin-top:6px;">
                                    <a href="${viewerUrl}" style="color:#c5a059;text-decoration:none;font-size:12px;border:1px solid #c5a059;padding:3px 10px;border-radius:20px;">🪪 My Digital Card</a>
                                  </div>
                                </td>
                              </tr>
                            </table>
                        </div>
                    </div>
                </div>

                <div style="margin-bottom:20px;">
                    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;">
                        <h4 style="color:white;font-size:0.95rem;"><i class="fas fa-code" style="color:#3b82f6;margin-right:6px;"></i>HTML Signature Code</h4>
                        <button id="copy-sig-btn" onclick="
                            navigator.clipboard.writeText(document.getElementById('sig-code-area').value).then(()=>{
                                const btn = document.getElementById('copy-sig-btn');
                                btn.innerHTML='<i class=\\'fas fa-check\\'></i> Copied!';
                                btn.style.background='#22c55e';
                                setTimeout(()=>{btn.innerHTML='<i class=\\'fas fa-copy\\'></i> Copy Code';btn.style.background='';},2000);
                            });
                        " style="background:rgba(197,160,89,0.2);color:#c5a059;border:1px solid rgba(197,160,89,0.4);border-radius:10px;padding:8px 16px;cursor:pointer;font-family:'Poppins',sans-serif;font-size:0.85rem;transition:all 0.3s;"><i class="fas fa-copy"></i> Copy Code</button>
                    </div>
                    <textarea id="sig-code-area" readonly style="width:100%;height:150px;background:rgba(0,0,0,0.4);color:#94a3b8;border:1px solid rgba(255,255,255,0.1);border-radius:12px;padding:16px;font-family:monospace;font-size:0.8rem;resize:none;box-sizing:border-box;direction:ltr;">${htmlSig}</textarea>
                </div>

                <div style="background:rgba(168,85,247,0.08);border:1px solid rgba(168,85,247,0.2);border-radius:14px;padding:16px;margin-bottom:24px;">
                    <h4 style="color:#a855f7;margin-bottom:10px;font-size:0.9rem;"><i class="fas fa-info-circle" style="margin-right:6px;"></i>How to Add in Gmail</h4>
                    <ol style="color:#94a3b8;font-size:0.85rem;padding-left:20px;margin:0;line-height:1.8;">
                        <li>Open <strong style="color:white;">Gmail</strong> → click ⚙️ Settings → 'See all settings'</li>
                        <li>Go to <strong style="color:white;">'General'</strong> tab and find the 'Signature' section</li>
                        <li>Click <strong style="color:white;">'Create new signature'</strong> and give it a name</li>
                        <li>In the signature area, press <strong style="color:white;">Ctrl+Shift+V</strong> (Windows) or <strong style="color:white;">Cmd+Shift+V</strong> (Mac) to paste as HTML</li>
                        <li>Save settings</li>
                    </ol>
                </div>

                <div style="display:flex;gap:12px;flex-wrap:wrap;">
                    <a href="${viewerUrl}" target="_blank" style="flex:1;min-width:140px;background:rgba(197,160,89,0.15);color:#c5a059;border:1px solid rgba(197,160,89,0.3);border-radius:12px;padding:12px 20px;text-decoration:none;text-align:center;font-family:'Poppins',sans-serif;font-weight:600;"><i class="fas fa-external-link-alt" style="margin-right:6px;"></i>Open Card Page</a>
                    <button onclick="document.getElementById('signature-modal').remove()" style="flex:1;min-width:140px;background:rgba(255,255,255,0.05);color:#94a3b8;border:1px solid rgba(255,255,255,0.1);border-radius:12px;padding:12px 20px;cursor:pointer;font-family:'Poppins',sans-serif;font-weight:600;">Close</button>
                </div>
            </div>
        </div>`;
    document.body.appendChild(modal);

    // Direct copy button handler fallback
    const copyBtn = modal.querySelector('#copy-sig-btn');
    if (copyBtn) {
        copyBtn.addEventListener('click', () => {
            const area = modal.querySelector('#sig-code-area');
            if (area) {
                navigator.clipboard.writeText(area.value).then(() => {
                    copyBtn.innerHTML = '<i class="fas fa-check"></i> Copied!';
                    copyBtn.style.background = '#22c55e';
                    setTimeout(() => {
                        copyBtn.innerHTML = '<i class="fas fa-copy"></i> Copy Code';
                        copyBtn.style.background = '';
                    }, 2000);
                }).catch(err => {
                    console.error('Clipboard copy failed:', err);
                });
            }
        });
    }

    // Close on backdrop click
    modal.querySelector('div').addEventListener('click', (e) => {
        if (e.target === modal.querySelector('div')) modal.remove();
    });
}

// Expose to global scope for inline onclick handlers
window.deleteDesign = deleteDesign;
window.removeSavedCard = removeSavedCard;
window.handleRequest = handleRequest;
window.generateSignatureFromDashboard = generateSignatureFromDashboard;
window.showSignatureModal = showSignatureModal;
window.showToast = showToast;