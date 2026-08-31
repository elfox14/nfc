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

function getLocalSavedDesigns() {
    const list = [];
    try {
        const galleryRaw = localStorage.getItem('nfc_gallery_designs');
        if (galleryRaw) {
            const parsed = JSON.parse(galleryRaw);
            if (Array.isArray(parsed)) list.push(...parsed);
        }

        const autosaveRaw = localStorage.getItem('nfc_autosave_state');
        if (autosaveRaw) {
            const parsed = JSON.parse(autosaveRaw);
            if (parsed && (parsed.inputs || parsed.elements)) {
                list.push({
                    shortId: 'local_autosave',
                    title: parsed.inputs?.['input-name'] || parsed.inputs?.['input-name_en'] || 'Current Card (Editor)',
                    createdAt: parsed.timestamp || Date.now(),
                    views: 1,
                    data: parsed
                });
            }
        }

        const bcRaw = localStorage.getItem('businessCardState');
        if (bcRaw) {
            const parsed = JSON.parse(bcRaw);
            if (parsed && parsed.inputs && !list.some(d => d.shortId === 'local_autosave')) {
                list.push({
                    shortId: 'local_current',
                    title: parsed.inputs['input-name'] || parsed.inputs['input-name_en'] || 'My Smart Card',
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

    if (designs.length === 0) {
        designs = getLocalSavedDesigns();
    }

    grid.innerHTML = '';

    if (designs.length > 0) {
        window.myLoadedDesigns = designs;
        designs.forEach(design => {
            const inputs = design.data?.inputs || {};
            const name = design.title || inputs['input-name_en'] || inputs['input-name_ar'] || inputs['input-name'] || 'Smart Card';
            const tagline = inputs['input-tagline_en'] || inputs['input-tagline_ar'] || inputs['input-tagline'] || '';
            const views = design.views || 0;
            const date = design.createdAt ? new Date(design.createdAt).toLocaleDateString('en-US') : 'Now';
            const thumb = design.data?.imageUrls?.capturedFront || design.data?.imageUrls?.front || '';
            
            let imgTag = '<i class="fas fa-id-card" style="font-size: 3.5rem; color: #c5a059; opacity: 0.9;"></i>';
            if (thumb) {
                imgTag = `<img src="${thumb}" alt="${escapeHTML(name)}" loading="lazy" style="max-height: 160px; object-fit: contain;">`;
            }

            const viewUrl = design.shortId && !design.shortId.startsWith('local_') ? `viewer-en.html?id=${design.shortId}` : 'editor-en.html';
            const editUrl = design.shortId && !design.shortId.startsWith('local_') ? `editor-en.html?id=${design.shortId}` : 'editor-en.html';

            const card = document.createElement('div');
            card.className = 'design-card hover-lift animate-on-scroll';
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
                        <button class="action-btn btn-signature" onclick="generateSignatureFromDashboard('${design.shortId}')" title="Email Signature"><i class="fas fa-signature"></i></button>
                        <button class="action-btn btn-remove" onclick="deleteDesign('${design.shortId}')">Delete</button>
                    </div>
                </div>`;
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
    
    if (shortId && shortId.startsWith('local_')) {
        localStorage.removeItem('nfc_autosave_state');
        localStorage.removeItem('businessCardState');
        loadMyDesigns();
        return;
    }

    try {
        if (typeof Auth !== 'undefined' && Auth.isLoggedIn()) {
            const res = await Auth.apiFetchWithRefresh(`${baseUrl}/api/user/designs/${shortId}`, {
                method: 'DELETE',
                headers: Auth.getHeader()
            });
            const data = await res.json();
            if (data.success) {
                loadMyDesigns();
            } else {
                alert(data.error || 'Failed to delete design');
            }
        } else {
            loadMyDesigns();
        }
    } catch (err) {
        console.error(err);
        alert('Error deleting design');
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
                        <button class="action-btn btn-remove" onclick="removeSavedCard('${card.designShortId}')">Remove</button>
                    </div>
                </div>`;
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
        }
        loadSavedCards();
    } catch (err) { console.error(err); }
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
            alert(data.message || 'Privacy settings saved successfully');
        } else {
            alert('Settings saved');
        }
    } catch (err) {
        console.error(err);
        alert('Error saving privacy settings');
    }
});

function generateSignatureFromDashboard(shortId) {
    if (!shortId) {
        window.location.href = 'editor-en.html';
        return;
    }
    window.open(`viewer-en.html?id=${shortId}#signature`, '_blank');
}