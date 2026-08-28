const baseUrl = Auth.getBaseUrl();

        document.querySelectorAll('.sidebar-item[data-section]').forEach(item => {
            item.addEventListener('click', (e) => {
                e.preventDefault();
                document.querySelectorAll('.sidebar-item').forEach(i => i.classList.remove('active'));
                item.classList.add('active');
                document.querySelectorAll('.dashboard-section').forEach(s => s.classList.remove('active'));
                document.getElementById('section-' + item.dataset.section).classList.add('active');
                if (item.dataset.section === 'saved-cards') loadSavedCards();
                if (item.dataset.section === 'card-requests') loadCardRequests();
                if (item.dataset.section === 'privacy-settings') loadPrivacySettings();
            });
        });

        // URL cleanup is moved inside DOMContentLoaded so we can process initToken first

        document.addEventListener('DOMContentLoaded', async () => {
            const urlParams = new URLSearchParams(window.location.hash.replace(/^#/, ''));
            const initToken = urlParams.get('initToken');
            const hasOauthSuccess = urlParams.has('oauthSuccess');
            
            if (initToken || hasOauthSuccess) {
                console.log('[Auth] OAuth redirect detected. Processing token...');
                if (initToken) {
                    await Auth.sessionInit(initToken);
                }
                
                history.replaceState(null, '', window.location.pathname + window.location.search);
            }

            Auth.user = JSON.parse(localStorage.getItem('authUser') || 'null');
            localStorage.removeItem('authToken');
            Auth.token = null;
            
            if (!Auth.isLoggedIn()) {
                await Auth.refreshSession();
            }

            if (!Auth.isLoggedIn()) {
                window.location.href = '/nfc/login-en.html?error=AuthNotLoggedIn';
                return;
            }


            document.getElementById('user-display-name').textContent = Auth.user?.name || 'User';

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

        async function loadMyDesigns() {
            const grid = document.getElementById('designs-grid');
            try {
                const response = await Auth.apiFetchWithRefresh(Auth.API_USER_DESIGNS, { headers: Auth.getHeader() });

                if (!response.ok) {
                    const errText = await response.text().catch(() => '');
                    console.error('[Dashboard] API error:', response.status, errText);
                    throw new Error('Server error: ' + response.status);
                }

                const data = await response.json();
                grid.innerHTML = '';
                if (data.success && data.designs && data.designs.length > 0) {
                    window.myLoadedDesigns = data.designs;
                    data.designs.forEach(design => {
                        const name = design.data?.inputs ? (design.data.inputs['input-name_en'] || design.data.inputs['input-name_ar'] || 'Untitled') : 'Card';
                        const views = design.views || 0;
                        const date = new Date(design.createdAt).toLocaleDateString('en-US');
                        const thumb = design.data?.imageUrls?.capturedFront || design.data?.imageUrls?.front || '';
                        let imgTag = '<i class="fas fa-id-card"></i>';
                        if (thumb) imgTag = `<img src="${thumb}" alt="${name}" loading="lazy">`;
                        const card = document.createElement('div');
                        card.className = 'design-card hover-lift animate-on-scroll';
                        card.innerHTML = `
                            <div class="card-thumb">${imgTag}</div>
                            <div class="card-details">
                                <h3 class="card-title">${escapeHTML(name)}</h3>
                                <div class="card-meta">
                                    <span><i class="far fa-eye"></i> ${views} Views</span>
                                    <span><i class="far fa-calendar"></i> ${date}</span>
                                </div>
                                <div class="card-actions">
                                    <a href="/nfc/viewer-en.html?id=${design.shortId}" class="action-btn btn-view" target="_blank">View</a>
                                    <a href="/nfc/editor-en.html?id=${design.shortId}" class="action-btn btn-edit">Edit</a>
                                    <button class="action-btn btn-signature" onclick="generateSignatureFromDashboard('${design.shortId}')" title="Copy Email Signature"><i class="fas fa-signature"></i></button>
                                    <button class="action-btn btn-remove" onclick="deleteDesign('${design.shortId}')">Delete</button>
                                </div>
                            </div>`;
                        grid.appendChild(card);
                    });
                } else {
                    grid.innerHTML = `<div class="empty-state"><i class="far fa-folder-open"></i><h3>No saved designs yet</h3><p>Start creating your first digital business card now</p><a href="/nfc/editor-en.html" class="btn btn-primary" style="margin-top: 20px;">Create Card</a></div>`;
                }
            } catch (err) {
                console.error('[Dashboard] loadMyDesigns failed:', err);
                grid.innerHTML = `
                    <div class="empty-state">
                        <i class="fas fa-exclamation-triangle" style="color: #ff5252;"></i>
                        <h3>Connection Error</h3>
                        <p>Unable to fetch designs. Please check your connection and try again.</p>
                    </div>`;
            }
        }

        async function deleteDesign(shortId) {
            if (!confirm('Are you sure you want to permanently delete this design? It will also be removed from the gallery.')) return;
            try {
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
            } catch (err) {
                console.error(err);
                alert('An error occurred while deleting the design');
            }
        }

        async function loadRequestCount() {
            try {
                const res = await Auth.apiFetchWithRefresh(`${baseUrl}/api/card-requests/count`, { headers: Auth.getHeader() });
                const data = await res.json();
                const badge = document.getElementById('requests-badge');
                if (data.count > 0) { badge.textContent = data.count; badge.style.display = 'inline'; }
                else { badge.style.display = 'none'; }
            } catch (err) { console.error(err); }
        }

        async function loadSavedCards() {
            const grid = document.getElementById('saved-cards-grid');
            try {
                const res = await Auth.apiFetchWithRefresh(`${baseUrl}/api/saved-cards`, { headers: Auth.getHeader() });

                if (!res.ok) {
                    const text = await res.text();
                    console.error('Saved cards API error:', res.status, text);
                    throw new Error(`Server returned ${res.status}`);
                }

                const data = await res.json();
                grid.innerHTML = '';
                if (data.savedCards && data.savedCards.length > 0) {
                    data.savedCards.forEach(card => {
                        const thumb = card.cardThumb || '';
                        let imgTag = '<i class="fas fa-id-card"></i>';
                        if (thumb) imgTag = `<img src="${thumb}" alt="${card.ownerName || 'Card'}" loading="lazy">`;
                        const date = card.savedAt ? new Date(card.savedAt).toLocaleDateString('en-US') : 'Unknown Date';
                        const el = document.createElement('div');
                        el.className = 'design-card hover-lift animate-on-scroll';
                        el.innerHTML = `
                            <div class="card-thumb">${imgTag}</div>
                            <div class="card-details">
                                <h3 class="card-title">${escapeHTML(card.ownerName || 'Unknown')}</h3>
                                <div class="card-meta"><span><i class="far fa-calendar"></i> ${date}</span></div>
                                <div class="card-actions">
                                    <a href="/nfc/viewer-en.html?id=${card.designShortId}" class="action-btn btn-view" target="_blank">View</a>
                                    <button class="action-btn btn-remove" onclick="removeSavedCard('${card.designShortId}')">Remove</button>
                                </div>
                            </div>`;
                        grid.appendChild(el);
                    });
                } else {
                    grid.innerHTML = `<div class="empty-state"><i class="fas fa-heart" style="opacity: 0.3;"></i><h3>No saved cards</h3><p>You can save other people's cards from the card viewer page</p></div>`;
                }
            } catch (err) {
                console.error('Load saved cards exception:', err);
                grid.innerHTML = `<p style="text-align: center; color: #ff5252;">Error: ${err.message}</p>`;
            }
        }

        async function removeSavedCard(designId) {
            if (!confirm('Remove this card from saved?')) return;
            try { await Auth.apiFetchWithRefresh(`${baseUrl}/api/saved-cards/${designId}`, { method: 'DELETE', headers: Auth.getHeader() }); loadSavedCards(); } catch (err) { console.error(err); }
        }

        async function loadCardRequests() {
            const list = document.getElementById('requests-list');
            try {
                const res = await Auth.apiFetchWithRefresh(`${baseUrl}/api/card-requests`, { headers: Auth.getHeader() });
                const data = await res.json();
                list.innerHTML = '';
                if (data.requests && data.requests.length > 0) {
                    data.requests.forEach(req => {
                        const date = new Date(req.createdAt).toLocaleDateString('en-US');
                        const isPending = req.status === 'pending';
                        const statusText = req.status === 'pending' ? 'Pending' : req.status === 'approved' ? 'Approved' : 'Rejected';
                        const el = document.createElement('div');
                        el.className = 'request-card glass-panel hover-lift animate-on-scroll';
                        el.innerHTML = `
                            <div class="request-info">
                                <h3>${escapeHTML(req.requesterName)}</h3>
                                <p><i class="fas fa-envelope"></i> ${escapeHTML(req.requesterEmail)}</p>
                                <p><i class="fas fa-id-card"></i> Wants to save: ${escapeHTML(req.cardName)}</p>
                                <p><i class="far fa-calendar"></i> ${date}</p>
                                ${!isPending ? `<span class="request-status-badge status-${req.status}">${statusText}</span>` : ''}
                            </div>
                            ${isPending ? `
                                <div class="request-actions">
                                    <button class="btn-approve" onclick="handleRequest('${req._id}', 'approve')"><i class="fas fa-check"></i> Approve</button>
                                    <button class="btn-reject" onclick="handleRequest('${req._id}', 'reject')"><i class="fas fa-times"></i> Reject</button>
                                </div>` : ''}`;
                        list.appendChild(el);
                    });
                } else {
                    list.innerHTML = `<div class="empty-state"><i class="fas fa-bell" style="opacity: 0.3;"></i><h3>No requests</h3><p>Save requests from others will appear here</p></div>`;
                }
            } catch (err) { console.error(err); list.innerHTML = '<p style="text-align: center; color: #ff5252;">Error</p>'; }
        }

        async function handleRequest(requestId, action) {
            try {
                await Auth.apiFetchWithRefresh(`${baseUrl}/api/card-requests/${requestId}`, {
                    method: 'PUT',
                    headers: { ...Auth.getHeader(), 'Content-Type': 'application/json' },
                    body: JSON.stringify({ action })
                });
                loadCardRequests(); loadRequestCount();
            } catch (err) { console.error(err); }
        }

        async function loadPrivacySettings() {
            try {
                const res = await Auth.apiFetchWithRefresh(`${baseUrl}/api/card-privacy`, { headers: Auth.getHeader() });
                const data = await res.json();
                const current = data.cardPrivacy || 'require_approval';
                document.querySelectorAll('.privacy-option').forEach(opt => {
                    opt.classList.toggle('selected', opt.dataset.value === current);
                    opt.querySelector('input').checked = opt.dataset.value === current;
                });
            } catch (err) { console.error(err); }
        }

        document.querySelectorAll('.privacy-option').forEach(opt => {
            opt.addEventListener('click', () => {
                document.querySelectorAll('.privacy-option').forEach(o => o.classList.remove('selected'));
                opt.classList.add('selected');
                opt.querySelector('input').checked = true;
            });
        });

        document.getElementById('save-privacy-btn').addEventListener('click', async () => {
            const selected = document.querySelector('input[name="cardPrivacy"]:checked')?.value;
            if (!selected) return;
            const btn = document.getElementById('save-privacy-btn');
            btn.disabled = true;
            btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving...';
            try {
                await Auth.apiFetchWithRefresh(`${baseUrl}/api/card-privacy`, {
                    method: 'PUT',
                    headers: { ...Auth.getHeader(), 'Content-Type': 'application/json' },
                    body: JSON.stringify({ cardPrivacy: selected })
                });
                btn.innerHTML = '<i class="fas fa-check"></i> Saved successfully';
                btn.style.background = '#2ecc71';
                setTimeout(() => { btn.innerHTML = '<i class="fas fa-save"></i> Save Settings'; btn.style.background = ''; btn.disabled = false; }, 2000);
            } catch (err) { console.error(err); btn.innerHTML = '<i class="fas fa-exclamation-triangle"></i> Error'; btn.disabled = false; }
        });

        document.getElementById('export-account-data-btn').addEventListener('click', async () => {
            const response = await Auth.apiFetchWithRefresh(`${baseUrl}/api/auth/export-data`, {
                headers: Auth.getHeader()
            });
            if (!response.ok) {
                alert('Data export is unavailable right now. Please try again.');
                return;
            }
            const blob = await response.blob();
            const link = document.createElement('a');
            link.href = URL.createObjectURL(blob);
            link.download = `mcprime-data-${Auth.user?.userId || 'account'}.json`;
            link.click();
            URL.revokeObjectURL(link.href);
        });

        document.getElementById('delete-account-btn').addEventListener('click', async () => {
            const confirmation = prompt('This action is permanent. Type DELETE to remove your account and all its data:');
            if (confirmation !== 'DELETE') return;
            if (!confirm('Are you sure you want to permanently delete this account?')) return;

            const response = await Auth.apiFetchWithRefresh(`${baseUrl}/api/auth/account`, {
                method: 'DELETE',
                headers: { ...Auth.getHeader(), 'Content-Type': 'application/json' },
                body: JSON.stringify({ confirmation })
            });
            if (!response.ok) {
                alert('Account deletion failed. Please try again.');
                return;
            }
            localStorage.removeItem('authUser');
            localStorage.removeItem('authToken');
            window.location.replace('/nfc/index-en.html?accountDeleted=1');
        });

        async function generateSignatureFromDashboard(shortId) {
            const design = (window.myLoadedDesigns || []).find(d => d.shortId === shortId);
            if (!design || !design.data) {
                alert('Sorry, cannot generate signature. Data is unavailable.');
                return;
            }

            const data = design.data;
            const inputs = data.inputs || {};
            const dynamicData = data.dynamic || {};
            const staticSocial = dynamicData.staticSocial || {};

            let name = inputs['input-name_en'] || inputs['input-name_ar'] || inputs['input-name'] || 'Name';
            let tagline = inputs['input-tagline_en'] || inputs['input-tagline_ar'] || inputs['input-tagline'] || '';
            const photoUrl = (data.imageUrls && data.imageUrls.photo) || '';
            const logoUrl = inputs['input-logo'] || '';
            const cardUrl = `${window.location.origin}/nfc/viewer-en.html?id=${shortId}`;

            const phone = dynamicData.phones && dynamicData.phones[0] ? dynamicData.phones[0].value : '';
            const email = staticSocial.email ? staticSocial.email.value : '';
            const whatsapp = staticSocial.whatsapp ? staticSocial.whatsapp.value.replace(/\D/g, '') : '';
            const website = staticSocial.website ? staticSocial.website.value : '';
            const linkedin = staticSocial.linkedin ? staticSocial.linkedin.value : '';

            const avatarUrl = photoUrl || logoUrl;
            const avatarShape = photoUrl ? '50%' : '8px';
            const avatarSize = '72';

            const avatarHtml = avatarUrl
                ? `<img src="${avatarUrl}" width="${avatarSize}" height="${avatarSize}" style="width:${avatarSize}px;height:${avatarSize}px;border-radius:${avatarShape};object-fit:cover;display:block;" alt="${name}">`
                : `<div style="width:${avatarSize}px;height:${avatarSize}px;border-radius:${avatarShape};background:linear-gradient(135deg,#4da6ff,#6f42c1);display:flex;align-items:center;justify-content:center;color:white;font-size:28px;font-weight:700;">${name.charAt(0).toUpperCase()}</div>`;

            const socialLinkStyle = (color) => `display:inline-block;font-size:11px;color:${color};text-decoration:none;border:1px solid ${color}33;padding:3px 8px;border-radius:50px;`;

            const socialLinks = [
                phone    ? `<a href="tel:${phone}"    style="${socialLinkStyle('#2ecc71')}"><i>&#9990;</i> ${phone}</a>`    : '',
                email    ? `<a href="mailto:${email}" style="${socialLinkStyle('#e74c3c')}"><i>&#9993;</i> ${email}</a>`    : '',
                whatsapp ? `<a href="https://wa.me/${whatsapp}" style="${socialLinkStyle('#25d366')}">WhatsApp</a>`         : '',
                website  ? `<a href="${website.startsWith('http') ? website : 'https://' + website}" style="${socialLinkStyle('#4da6ff')}"><i>&#127760;</i> ${website.replace(/^https?:\/\//, '')}</a>` : '',
                linkedin ? `<a href="https://linkedin.com/in/${linkedin}" style="${socialLinkStyle('#0077b5')}">LinkedIn</a>` : '',
            ].filter(Boolean).join('\n                    ');

            const signatureHTML = `
<table cellpadding="0" cellspacing="0" border="0" style="font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#1e2d40;max-width:500px;">
  <tr>
    <td style="padding:0 18px 0 0;vertical-align:middle;">
      ${avatarHtml}
    </td>
    <td style="border-left:3px solid #4da6ff;padding-left:18px;vertical-align:middle;">
      <div style="font-size:18px;font-weight:700;color:#1e2d40;margin:0 0 2px;">${name}</div>
      ${tagline ? `<div style="font-size:12px;color:#5a6a7a;margin:0 0 10px;">${tagline}</div>` : ''}
      <div style="display:flex;flex-wrap:wrap;gap:6px;margin-bottom:12px;">
                    ${socialLinks}
      </div>
      <a href="${cardUrl}" style="display:inline-block;background:linear-gradient(135deg,#4da6ff,#6f42c1);color:#fff;text-decoration:none;padding:7px 16px;border-radius:50px;font-size:11px;font-weight:700;letter-spacing:0.04em;">&#127149; View Card</a>
    </td>
  </tr>
</table>`;

            try {
                const blob = new Blob([signatureHTML], { type: 'text/html' });
                const clipboardItem = new ClipboardItem({ 'text/html': blob });
                await navigator.clipboard.write([clipboardItem]);
                alert('✅ Signature copied!\n\nYou can now go to your email settings (Outlook, Gmail) and paste the signature there.');
            } catch (err) {
                console.error('Copy failed:', err);
                alert('Automatic copy failed. Please try from another browser.');
            }
        }
