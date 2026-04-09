/**
 * MC PRIME NFC — Editor Premium v2.0 (New Features)
 * Features: Logo Color Extractor, vCard Import, QR Customization,
 *           Bulk Link Import, Keyboard Shortcuts, Typography Panel,
 *           Social Media Export Sizes
 */
(function () {
    'use strict';

    const isAr = document.documentElement.lang !== 'en';

    // ── Helpers ──────────────────────────────────────────────────────────────
    function toast(msg, color = '#4da6ff', dur = 3000) {
        const el = document.createElement('div');
        el.innerHTML = msg;
        Object.assign(el.style, {
            position: 'fixed', top: '70px', left: '50%',
            transform: 'translateX(-50%) translateY(-16px)',
            background: 'rgba(10,18,30,0.97)', backdropFilter: 'blur(16px)',
            border: `1px solid ${color}55`, borderRadius: '50px',
            padding: '10px 24px', color, fontWeight: '700', fontSize: '0.85rem',
            zIndex: '99999', transition: 'opacity 0.4s cubic-bezier(0.22, 1, 0.36, 1), transform 0.4s cubic-bezier(0.22, 1, 0.36, 1)',
            opacity: '0', pointerEvents: 'none', fontFamily: 'Tajawal,sans-serif',
            whiteSpace: 'nowrap', boxShadow: `0 8px 30px rgba(0,0,0,0.4)`
        });
        document.body.appendChild(el);
        // Reduced motion check
        const isReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        if (isReduced) { el.style.transitionDuration = '0.01ms'; }
        
        requestAnimationFrame(() => requestAnimationFrame(() => {
            el.style.opacity = '1'; el.style.transform = 'translateX(-50%) translateY(0)';
        }));
        setTimeout(() => { el.style.opacity = '0'; el.style.transform = 'translateX(-50%) translateY(-10px)'; setTimeout(() => el.remove(), 450); }, dur);
    }

    function getState() {
        try { return typeof StateManager !== 'undefined' ? StateManager.getStateObject() : null; } catch (e) { return null; }
    }

    function createOverlay(id, titleHtml, bodyHtml) {
        if (document.getElementById(id)) return document.getElementById(id);
        const m = document.createElement('div');
        m.id = id;
        m.className = 'ep2-overlay';
        m.innerHTML = `
            <div class="ep2-modal">
                <div class="ep2-head">${titleHtml}</div>
                <div class="ep2-body">${bodyHtml}</div>
            </div>`;
        m.addEventListener('click', e => { if (e.target === m) m.classList.remove('show'); });
        document.body.appendChild(m);
        return m;
    }

    // ════════════════════════════════════════════════════════════════════════
    // 1. LOGO COLOR EXTRACTOR
    // ════════════════════════════════════════════════════════════════════════
    function initColorExtractor() {
        // Watch for logo image changes — trigger extraction
        const extractColors = (imgEl) => {
            if (!imgEl || !imgEl.src || imgEl.src.includes('mc-prime-nfc')) return;
            try {
                const canvas = document.createElement('canvas');
                const size = 80;
                canvas.width = canvas.height = size;
                const ctx = canvas.getContext('2d');
                const img = new Image();
                img.crossOrigin = 'anonymous';
                img.onload = () => {
                    ctx.drawImage(img, 0, 0, size, size);
                    const data = ctx.getImageData(0, 0, size, size).data;
                    const colorMap = {};
                    for (let i = 0; i < data.length; i += 16) {
                        const r = Math.round(data[i] / 32) * 32;
                        const g = Math.round(data[i + 1] / 32) * 32;
                        const b = Math.round(data[i + 2] / 32) * 32;
                        const a = data[i + 3];
                        if (a < 128) continue; // skip transparent
                        const key = `${r},${g},${b}`;
                        colorMap[key] = (colorMap[key] || 0) + 1;
                    }
                    const sorted = Object.entries(colorMap)
                        .sort((a, b) => b[1] - a[1])
                        .slice(0, 5)
                        .map(([k]) => {
                            const [r, g, b] = k.split(',').map(Number);
                            return '#' + [r, g, b].map(v => v.toString(16).padStart(2, '0')).join('');
                        });
                    showColorSwatch(sorted);
                };
                img.onerror = () => { };
                img.src = imgEl.src;
            } catch (e) { }
        };

        const showColorSwatch = (colors) => {
            if (!colors.length) return;
            const existing = document.getElementById('ep2-color-swatch');
            if (existing) existing.remove();

            const swatch = document.createElement('div');
            swatch.id = 'ep2-color-swatch';
            swatch.innerHTML = `
                <div style="font-size:0.73rem;color:var(--text-secondary);margin-bottom:6px;font-weight:600;">
                    <i class="fas fa-eye-dropper" style="color:#4da6ff;margin-${isAr ? 'left' : 'right'}:4px;"></i>
                    ${isAr ? 'ألوان مستخلصة من الشعار' : 'Colors extracted from logo'}
                </div>
                <div style="display:flex;gap:6px;flex-wrap:wrap;">
                    ${colors.map(c => `
                        <div class="ep2-swatch-color" data-color="${c}" title="${c}"
                            style="width:32px;height:32px;border-radius:7px;background:${c};cursor:pointer;border:2px solid transparent;transition:transform 0.3s cubic-bezier(0.16,1,0.3,1), box-shadow 0.3s;box-shadow:0 2px 8px rgba(0,0,0,0.3);">
                        </div>`).join('')}
                </div>
                <div style="font-size:0.68rem;color:var(--text-secondary);margin-top:5px;">${isAr ? 'انقر للتطبيق على البطاقة' : 'Click to apply to card'}</div>`;
            Object.assign(swatch.style, {
                padding: '10px 12px', marginTop: '8px',
                background: 'rgba(255,255,255,0.04)',
                border: '1px solid rgba(255,255,255,0.08)',
                borderRadius: '10px'
            });

            swatch.querySelectorAll('.ep2-swatch-color').forEach(el => {
                el.onmouseenter = () => el.style.transform = 'scale(1.2)';
                el.onmouseleave = () => el.style.transform = 'scale(1)';
                el.addEventListener('click', () => {
                    const color = el.dataset.color;
                    // Darken color for gradient end
                    const darkened = darkenHex(color, 0.65);
                    ['front-bg-start', 'back-bg-start'].forEach(id => {
                        const inp = document.getElementById(id);
                        if (inp) { inp.value = color; inp.dispatchEvent(new Event('input', { bubbles: true })); }
                    });
                    ['front-bg-end', 'back-bg-end'].forEach(id => {
                        const inp = document.getElementById(id);
                        if (inp) { inp.value = darkened; inp.dispatchEvent(new Event('input', { bubbles: true })); }
                    });
                    toast(`✓ ${isAr ? 'تم تطبيق اللون ' + color : 'Color ' + color + ' applied'}`, color || '#4da6ff');
                });
            });

            // Inject after logo upload section
            const logoSection = document.querySelector('#logo-fieldset, [id*="logo"]');
            if (logoSection) logoSection.appendChild(swatch);
            else {
                const sidebar = document.getElementById('panel-design');
                if (sidebar) sidebar.appendChild(swatch);
            }
        };

        const darkenHex = (hex, factor) => {
            const r = Math.round(parseInt(hex.slice(1, 3), 16) * factor);
            const g = Math.round(parseInt(hex.slice(3, 5), 16) * factor);
            const b = Math.round(parseInt(hex.slice(5, 7), 16) * factor);
            return '#' + [r, g, b].map(v => Math.min(255, v).toString(16).padStart(2, '0')).join('');
        };

        // Watch logo image on the card
        const observer = new MutationObserver(() => {
            const logoImg = document.querySelector('#card-logo img, .card-logo img, img[id*="logo"]');
            if (logoImg) extractColors(logoImg);
        });
        observer.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['src'] });
    }

    // ════════════════════════════════════════════════════════════════════════
    // 2. vCARD IMPORT (fill fields from .vcf file)
    // ════════════════════════════════════════════════════════════════════════
    function initVCardImport() {
        const sidebar = document.getElementById('panel-design');
        if (!sidebar || document.getElementById('ep2-vcf-import')) return;

        const btn = document.createElement('button');
        btn.id = 'ep2-vcf-import';
        btn.className = 'btn btn-secondary';
        btn.style.cssText = 'width:100%;font-size:0.8rem;margin-bottom:8px;';
        btn.innerHTML = `<i class="fas fa-file-import"></i> ${isAr ? 'استيراد من ملف VCF/vCard' : 'Import from VCF/vCard'}`;

        const fileInput = document.createElement('input');
        fileInput.type = 'file';
        fileInput.accept = '.vcf,.vcard';
        fileInput.style.display = 'none';
        document.body.appendChild(fileInput);

        btn.addEventListener('click', () => fileInput.click());
        fileInput.addEventListener('change', () => {
            const file = fileInput.files[0];
            if (!file) return;
            const reader = new FileReader();
            reader.onload = e => parseVCard(e.target.result);
            reader.readAsText(file);
            fileInput.value = '';
        });

        const parseVCard = (text) => {
            const get = (key) => {
                const regex = new RegExp(`^${key}[^:]*:(.+)$`, 'mi');
                const m = text.match(regex);
                return m ? m[1].replace(/\\n/g, ' ').trim() : '';
            };

            const fullName = get('FN') || get('N').replace(';', ' ').trim();
            const org = get('ORG');
            const title = get('TITLE');
            const phone = get('TEL');
            const email = get('EMAIL');
            const url = get('URL');

            let filled = 0;

            const setField = (id, value) => {
                if (!value) return;
                const el = document.getElementById(id);
                if (el) { el.value = value; el.dispatchEvent(new Event('input', { bubbles: true })); filled++; }
            };

            setField('input-name_ar', fullName);
            setField('input-name_en', fullName);
            setField('input-tagline_ar', title || org);
            setField('input-tagline_en', title || org);

            // Try to find phone input
            const phoneInput = document.querySelector('.phone-input, input[data-type="phone"], #phone-0-value');
            if (phoneInput && phone) { phoneInput.value = phone.replace(/[^\d+]/g, ''); phoneInput.dispatchEvent(new Event('input', { bubbles: true })); filled++; }

            // Email, website
            const emailInput = document.getElementById('static-email-value') || document.querySelector('input[data-static="email"]');
            if (emailInput && email) { emailInput.value = email; emailInput.dispatchEvent(new Event('input', { bubbles: true })); filled++; }

            const webInput = document.getElementById('static-website-value') || document.querySelector('input[data-static="website"]');
            if (webInput && url) { webInput.value = url; webInput.dispatchEvent(new Event('input', { bubbles: true })); filled++; }

            toast(`✓ ${isAr ? `تم استيراد ${filled} حقل` : `${filled} fields imported`}`, '#2ecc71', 4000);
        };

        // Insert at top of sidebar
        const firstField = sidebar.querySelector('fieldset, details');
        if (firstField) firstField.before(btn);
        else sidebar.prepend(btn);
    }

    // ════════════════════════════════════════════════════════════════════════
    // 3. BULK LINK IMPORT
    // ════════════════════════════════════════════════════════════════════════
    function initBulkLinkImport() {
        const platformMap = [
            { pattern: /instagram\.com\/([^/?\s]+)/, platform: 'instagram', extract: m => m[1] },
            { pattern: /linkedin\.com\/in\/([^/?\s]+)/, platform: 'linkedin', extract: m => m[1] },
            { pattern: /twitter\.com\/([^/?\s]+)/, platform: 'twitter', extract: m => '@' + m[1] },
            { pattern: /x\.com\/([^/?\s]+)/, platform: 'twitter', extract: m => '@' + m[1] },
            { pattern: /tiktok\.com\/@([^/?\s]+)/, platform: 'tiktok', extract: m => '@' + m[1] },
            { pattern: /youtube\.com\/(channel|c|@)\/([^/?\s]+)/, platform: 'youtube', extract: m => m[2] },
            { pattern: /github\.com\/([^/?\s]+)/, platform: 'github', extract: m => m[1] },
            { pattern: /snapchat\.com\/add\/([^/?\s]+)/, platform: 'snapchat', extract: m => m[1] },
            { pattern: /wa\.me\/(\d+)/, platform: 'whatsapp', extract: m => m[1] },
            { pattern: /facebook\.com\/([^/?\s]+)/, platform: 'facebook', extract: m => m[1] },
            { pattern: /t\.me\/([^/?\s]+)/, platform: 'telegram', extract: m => m[1] },
            { pattern: /behance\.net\/([^/?\s]+)/, platform: 'behance', extract: m => m[1] },
            { pattern: /dribbble\.com\/([^/?\s]+)/, platform: 'dribbble', extract: m => m[1] },
        ];

        const modal = createOverlay('ep2-bulk-modal',
            `<i class="fas fa-link" style="color:#4da6ff;"></i> ${isAr ? 'استيراد روابط دفعة واحدة' : 'Bulk Link Import'}`,
            `<p style="color:var(--text-secondary);font-size:0.82rem;margin-bottom:10px;">
                ${isAr ? 'ألصق روابطك كلها هنا (كل رابط في سطر)' : 'Paste all your links here (one per line)'}
            </p>
            <textarea id="ep2-bulk-input" rows="7" placeholder="https://instagram.com/yourname&#10;https://linkedin.com/in/yourname&#10;https://github.com/yourname"
                style="width:100%;padding:10px;border-radius:10px;border:1px solid rgba(255,255,255,0.1);background:rgba(255,255,255,0.05);color:var(--text-primary);font-family:monospace;font-size:0.78rem;resize:vertical;box-sizing:border-box;margin-bottom:12px;"></textarea>
            <div id="ep2-bulk-preview" style="margin-bottom:12px;"></div>
            <div style="display:flex;gap:8px;">
                <button id="ep2-bulk-detect" class="btn btn-secondary" style="flex:1;font-size:0.82rem;">${isAr ? 'تحليل الروابط' : 'Detect Links'}</button>
                <button id="ep2-bulk-apply" class="btn btn-primary" style="flex:1;font-size:0.82rem;" disabled>${isAr ? 'تطبيق الكل' : 'Apply All'}</button>
            </div>`);

        let detected = [];

        modal.querySelector('#ep2-bulk-detect')?.addEventListener('click', () => {
            const text = modal.querySelector('#ep2-bulk-input')?.value || '';
            const urls = text.split('\n').map(s => s.trim()).filter(Boolean);
            detected = [];
            urls.forEach(url => {
                for (const p of platformMap) {
                    const m = url.match(p.pattern);
                    if (m) { detected.push({ platform: p.platform, value: url, handle: p.extract(m) }); break; }
                }
            });
            const preview = modal.querySelector('#ep2-bulk-preview');
            if (!preview) return;
            if (!detected.length) {
                preview.innerHTML = `<p style="color:#e74c3c;font-size:0.78rem;">${isAr ? 'لم يُعرف أي رابط' : 'No links recognized'}</p>`;
                modal.querySelector('#ep2-bulk-apply').disabled = true;
                return;
            }
            preview.innerHTML = `
                <div style="font-size:0.75rem;color:var(--text-secondary);margin-bottom:6px;">${isAr ? `تم اكتشاف ${detected.length} رابط` : `${detected.length} links detected`}</div>
                <div style="display:flex;flex-direction:column;gap:5px;">
                    ${detected.map(d => `
                        <div style="display:flex;align-items:center;gap:8px;padding:6px 10px;background:rgba(77,166,255,0.08);border-radius:8px;border:1px solid rgba(77,166,255,0.2);">
                            <i class="fab fa-${d.platform}" style="color:#4da6ff;width:16px;text-align:center;font-size:0.9rem;"></i>
                            <span style="font-size:0.78rem;color:var(--text-primary);">${d.handle}</span>
                        </div>`).join('')}
                </div>`;
            modal.querySelector('#ep2-bulk-apply').disabled = false;
        });

        modal.querySelector('#ep2-bulk-apply')?.addEventListener('click', () => {
            // Try calling the app's addSocialLink function or dispatch synthetic clicks
            let added = 0;
            detected.forEach(d => {
                // Try global function first
                if (typeof window.addSocialLink === 'function') {
                    window.addSocialLink(d.platform, d.value); added++; return;
                }
                // Try clicking the platform button and filling value
                const platformBtn = document.querySelector(`[data-platform="${d.platform}"], [data-social="${d.platform}"], #add-${d.platform}-btn`);
                if (platformBtn) {
                    platformBtn.click();
                    setTimeout(() => {
                        const lastInput = document.querySelector('.social-link-input:last-child, [data-social-input]:last-child');
                        if (lastInput) { lastInput.value = d.value; lastInput.dispatchEvent(new Event('input', { bubbles: true })); added++; }
                    }, 100);
                }
            });
            toast(`✓ ${isAr ? `تم إضافة ${detected.length} رابط` : `${detected.length} links processed`}`, '#2ecc71');
            modal.classList.remove('show');
        });

        // Add toolbar button
        setTimeout(() => {
            const toolbar = document.querySelector('.undo-redo-container, .toolbar-group.toolbar-start');
            if (!toolbar || document.getElementById('ep2-bulk-btn')) return;
            const btn = document.createElement('button');
            btn.id = 'ep2-bulk-btn';
            btn.className = 'btn-icon btn-compact';
            btn.title = isAr ? 'استيراد روابط دفعة' : 'Bulk Link Import';
            btn.innerHTML = '<i class="fas fa-layer-group"></i>';
            btn.style.color = '#4da6ff';
            btn.addEventListener('click', () => modal.classList.add('show'));
            toolbar.appendChild(btn);
        }, 1000);
    }

    // ════════════════════════════════════════════════════════════════════════
    // 4. QR CODE CUSTOMIZATION
    // ════════════════════════════════════════════════════════════════════════
    function initQRCustomization() {
        const qrSection = document.getElementById('qr-fieldset') || document.querySelector('[id*="qr"]');
        if (!qrSection || document.getElementById('ep2-qr-custom')) return;

        const panel = document.createElement('div');
        panel.id = 'ep2-qr-custom';
        panel.innerHTML = `
            <div style="font-size:0.78rem;font-weight:700;color:var(--text-primary);margin-bottom:8px;">
                <i class="fas fa-palette" style="color:#4da6ff;margin-${isAr ? 'left' : 'right'}:5px;"></i>
                ${isAr ? 'تخصيص رمز QR' : 'QR Code Style'}
            </div>
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:8px;">
                <div>
                    <label style="font-size:0.72rem;color:var(--text-secondary);display:block;margin-bottom:4px;">${isAr ? 'لون QR' : 'QR Color'}</label>
                    <input type="color" id="ep2-qr-color" value="#1e2d40" style="width:100%;height:36px;border-radius:7px;border:1px solid rgba(255,255,255,0.1);cursor:pointer;">
                </div>
                <div>
                    <label style="font-size:0.72rem;color:var(--text-secondary);display:block;margin-bottom:4px;">${isAr ? 'خلفية QR' : 'QR Background'}</label>
                    <input type="color" id="ep2-qr-bg" value="#ffffff" style="width:100%;height:36px;border-radius:7px;border:1px solid rgba(255,255,255,0.1);cursor:pointer;">
                </div>
            </div>
            <div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:8px;">
                ${[['default','مربع','Square'],['dots','نقاط','Dots'],['rounded','مدور','Rounded']].map(([v, ar, en]) =>
            `<button class="ep2-qr-style btn btn-secondary" data-style="${v}" style="font-size:0.72rem;padding:4px 10px;flex:1;">${isAr ? ar : en}</button>`).join('')}
            </div>
            <button id="ep2-qr-apply" class="btn btn-primary" style="width:100%;font-size:0.8rem;">${isAr ? 'تطبيق على QR' : 'Apply to QR'}</button>`;
        Object.assign(panel.style, {
            padding: '10px 12px', marginTop: '10px',
            background: 'rgba(255,255,255,0.04)',
            border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: '10px'
        });

        let selectedStyle = 'default';
        panel.querySelectorAll('.ep2-qr-style').forEach(b => b.addEventListener('click', () => {
            panel.querySelectorAll('.ep2-qr-style').forEach(x => x.style.borderColor = 'rgba(255,255,255,0.1)');
            b.style.borderColor = 'var(--accent-color, #4da6ff)';
            selectedStyle = b.dataset.style;
        }));

        panel.querySelector('#ep2-qr-apply')?.addEventListener('click', () => {
            const color = document.getElementById('ep2-qr-color')?.value || '#1e2d40';
            const bg = document.getElementById('ep2-qr-bg')?.value || '#ffffff';
            // Store in localStorage for QR generator to pick up
            localStorage.setItem('ep_qr_color', color);
            localStorage.setItem('ep_qr_bg', bg);
            localStorage.setItem('ep_qr_style', selectedStyle);
            // Trigger QR regeneration if function exists
            if (typeof window.renderQRCode === 'function') window.renderQRCode();
            if (typeof window.updateCard === 'function') window.updateCard();
            toast(`✓ ${isAr ? 'تم تطبيق نمط QR' : 'QR style applied'}`, '#4da6ff');
        });

        qrSection.appendChild(panel);
    }

    // ════════════════════════════════════════════════════════════════════════
    // 5. KEYBOARD SHORTCUTS FOR EDITOR
    // ════════════════════════════════════════════════════════════════════════
    function initKeyboardShortcuts() {
        const shortcuts = [
            { key: 's', ctrl: true, action: () => document.getElementById('save-share-btn')?.click(), desc: isAr ? 'حفظ ومشاركة' : 'Save & Share' },
            { key: 'z', ctrl: true, action: () => document.getElementById('undo-btn')?.click(), desc: isAr ? 'تراجع' : 'Undo' },
            { key: 'y', ctrl: true, action: () => document.getElementById('redo-btn')?.click(), desc: isAr ? 'إعادة' : 'Redo' },
            { key: 'p', ctrl: true, action: () => document.getElementById('preview-mode-btn')?.click(), desc: isAr ? 'معاينة' : 'Preview' },
            { key: 'g', ctrl: true, action: () => document.getElementById('show-gallery-btn')?.click(), desc: isAr ? 'المعرض' : 'Gallery' },
            { key: 'd', ctrl: true, action: () => document.getElementById('download-options-btn')?.click(), desc: isAr ? 'تنزيل' : 'Download' },
            { key: '?', ctrl: false, action: () => showShortcutsHelp(), desc: isAr ? 'عرض الاختصارات' : 'Show shortcuts' },
        ];

        document.addEventListener('keydown', (e) => {
            if (['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement?.tagName)) return;
            for (const s of shortcuts) {
                if (
                    e.key.toLowerCase() === s.key &&
                    (!s.ctrl || (e.ctrlKey || e.metaKey))
                ) {
                    if (s.ctrl) e.preventDefault();
                    s.action();
                    return;
                }
            }
        });

        function showShortcutsHelp() {
            const existing = document.getElementById('ep2-shortcuts-modal');
            if (existing) { existing.classList.add('show'); return; }

            const modal = createOverlay('ep2-shortcuts-modal',
                `<i class="fas fa-keyboard" style="color:#4da6ff;"></i> ${isAr ? 'اختصارات لوحة المفاتيح' : 'Keyboard Shortcuts'}`,
                `<div style="display:flex;flex-direction:column;gap:7px;">
                    ${shortcuts.map(s => `
                        <div style="display:flex;align-items:center;justify-content:space-between;padding:7px 10px;background:rgba(255,255,255,0.04);border-radius:8px;">
                            <span style="font-size:0.84rem;color:var(--text-primary);">${s.desc}</span>
                            <kbd style="background:rgba(255,255,255,0.08);border:1px solid rgba(255,255,255,0.15);padding:3px 10px;border-radius:5px;font-family:monospace;font-size:0.75rem;color:#4da6ff;">
                                ${s.ctrl ? (isAr ? 'Ctrl+' : 'Ctrl+') : ''}${s.key.toUpperCase()}
                            </kbd>
                        </div>`).join('')}
                </div>`);
            modal.classList.add('show');
        }

        // Add ? button to toolbar
        setTimeout(() => {
            const toolbar = document.querySelector('.toolbar-group.toolbar-start');
            if (!toolbar || document.getElementById('ep2-help-btn')) return;
            const btn = document.createElement('button');
            btn.id = 'ep2-help-btn';
            btn.className = 'btn-icon btn-compact';
            btn.title = isAr ? 'اختصارات لوحة المفاتيح (?)' : 'Keyboard Shortcuts (?)';
            btn.innerHTML = '<i class="fas fa-keyboard"></i>';
            btn.style.fontSize = '11px';
            btn.addEventListener('click', showShortcutsHelp);
            toolbar.appendChild(btn);
        }, 1100);
    }

    // ════════════════════════════════════════════════════════════════════════
    // 6. TYPOGRAPHY PANEL (show all active fonts)
    // ════════════════════════════════════════════════════════════════════════
    function initTypographyPanel() {
        const modal = createOverlay('ep2-typo-modal',
            `<i class="fas fa-font" style="color:#a855f7;"></i> ${isAr ? 'الخطوط المستخدمة' : 'Typography Panel'}`,
            `<div id="ep2-typo-content"></div>`);

        const refreshTypo = () => {
            const s = getState();
            const content = document.getElementById('ep2-typo-content');
            if (!content || !s) return;

            const fonts = [
                { label: isAr ? 'الاسم' : 'Name', fontKey: 'name-font', sizeKey: 'name-font-size', colorKey: 'name-color', textKey: 'input-name_ar' },
                { label: isAr ? 'المسمى' : 'Tagline', fontKey: 'tagline-font', sizeKey: 'tagline-font-size', colorKey: 'tagline-color', textKey: 'input-tagline_ar' },
                { label: isAr ? 'الهاتف' : 'Phone', fontKey: 'phone-text-font', sizeKey: 'phone-text-size', colorKey: 'phone-text-color', textKey: null },
                { label: isAr ? 'زرار الهاتف' : 'Phone Button', fontKey: 'phone-btn-font', sizeKey: 'phone-btn-font-size', colorKey: 'phone-btn-text-color', textKey: null },
            ];

            content.innerHTML = fonts.map(f => {
                const font = s.inputs?.[f.fontKey] || 'Tajawal, sans-serif';
                const size = s.inputs?.[f.sizeKey] || 14;
                const color = s.inputs?.[f.colorKey] || '#ffffff';
                const text = f.textKey ? (s.inputs?.[f.textKey] || f.label) : f.label;
                return `
                    <div style="padding:12px;background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.08);border-radius:10px;margin-bottom:8px;">
                        <div style="font-size:0.72rem;color:var(--text-secondary);margin-bottom:6px;font-weight:600;">${f.label}</div>
                        <div style="font-family:${font};font-size:${Math.min(size, 22)}px;color:${color};margin-bottom:6px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${text}</div>
                        <div style="display:flex;gap:8px;flex-wrap:wrap;">
                            <span style="font-size:0.68rem;background:rgba(255,255,255,0.06);padding:2px 8px;border-radius:50px;color:var(--text-secondary);">${font.split(',')[0]}</span>
                            <span style="font-size:0.68rem;background:rgba(255,255,255,0.06);padding:2px 8px;border-radius:50px;color:var(--text-secondary);">${size}px</span>
                            <span style="font-size:0.68rem;padding:2px 8px;border-radius:50px;background:${color}22;color:${color};border:1px solid ${color}44;">${color}</span>
                        </div>
                    </div>`;
            }).join('');
        };

        setTimeout(() => {
            const toolbar = document.querySelector('.toolbar-group.toolbar-start');
            if (!toolbar || document.getElementById('ep2-typo-btn')) return;
            const btn = document.createElement('button');
            btn.id = 'ep2-typo-btn';
            btn.className = 'btn-icon btn-compact';
            btn.title = isAr ? 'لوحة الخطوط' : 'Typography Panel';
            btn.innerHTML = '<i class="fas fa-font"></i>';
            btn.style.color = '#a855f7';
            btn.addEventListener('click', () => { refreshTypo(); modal.classList.add('show'); });
            toolbar.appendChild(btn);
        }, 1200);
    }

    // ════════════════════════════════════════════════════════════════════════
    // 7. SOCIAL MEDIA SIZE EXPORT
    // ════════════════════════════════════════════════════════════════════════
    function initSocialExport() {
        const sizes = [
            { label: 'Instagram Post (1:1)', w: 1080, h: 1080, icon: 'fab fa-instagram' },
            { label: 'Instagram Story (9:16)', w: 1080, h: 1920, icon: 'fab fa-instagram' },
            { label: 'LinkedIn Cover', w: 1584, h: 396, icon: 'fab fa-linkedin' },
            { label: 'Twitter Header', w: 1500, h: 500, icon: 'fab fa-twitter' },
            { label: 'WhatsApp DP (1:1)', w: 500, h: 500, icon: 'fab fa-whatsapp' },
            { label: 'Business Card (3.5x2")', w: 1050, h: 600, icon: 'fas fa-id-card' },
        ];

        const modal = createOverlay('ep2-social-export-modal',
            `<i class="fas fa-share-alt" style="color:#2ecc71;"></i> ${isAr ? 'تصدير لمنصات التواصل' : 'Export for Social Media'}`,
            `<p style="color:var(--text-secondary);font-size:0.8rem;margin-bottom:12px;">
                ${isAr ? 'اختر المقاس المناسب للتصدير' : 'Choose the size to export'}
            </p>
            <div style="display:flex;flex-direction:column;gap:7px;" id="ep2-social-sizes"></div>
            <p style="margin-top:10px;font-size:0.72rem;color:var(--text-secondary);">
                ${isAr ? '* سيتم تغيير حجم صورة الواجهة الأمامية للمقاس المحدد' : '* Front card image will be resized to selected dimensions'}
            </p>`);

        const sizeList = modal.querySelector('#ep2-social-sizes');
        if (sizeList) {
            sizeList.innerHTML = sizes.map((s, i) => `
                <div style="display:flex;align-items:center;gap:10px;padding:9px 12px;background:rgba(255,255,255,0.04);border-radius:10px;border:1px solid rgba(255,255,255,0.08);">
                    <i class="${s.icon}" style="color:#4da6ff;width:18px;text-align:center;"></i>
                    <span style="flex:1;font-size:0.82rem;color:var(--text-primary);">${s.label}</span>
                    <span style="font-size:0.68rem;color:var(--text-secondary);">${s.w}×${s.h}</span>
                    <button class="ep2-export-size btn btn-secondary" data-i="${i}" style="font-size:0.73rem;padding:3px 10px;">${isAr ? 'تصدير' : 'Export'}</button>
                </div>`).join('');

            sizeList.querySelectorAll('.ep2-export-size').forEach(btn => btn.addEventListener('click', () => {
                const size = sizes[+btn.dataset.i];
                exportAtSize(size.w, size.h, size.label);
            }));
        }

        const exportAtSize = (w, h, label) => {
            // Get front card canvas image
            const frontImg = document.querySelector('#front-card img, .card-face.front img, #card-front img');
            if (!frontImg) {
                toast(isAr ? 'استخدم حفظ كـ PNG اولاً من قائمة المحرر' : 'Please save as PNG first from the editor menu', '#e74c3c');
                return;
            }
            const canvas = document.createElement('canvas');
            canvas.width = w; canvas.height = h;
            const ctx = canvas.getContext('2d');
            ctx.fillStyle = '#0f1b2d';
            ctx.fillRect(0, 0, w, h);

            const img = new Image();
            img.crossOrigin = 'anonymous';
            img.onload = () => {
                // Center the card image
                const scale = Math.min(w / img.width, h / img.height) * 0.85;
                const dw = img.width * scale, dh = img.height * scale;
                ctx.drawImage(img, (w - dw) / 2, (h - dh) / 2, dw, dh);
                const link = document.createElement('a');
                link.download = `mcprime_${label.replace(/\s+/g, '_')}.png`;
                link.href = canvas.toDataURL('image/png');
                link.click();
                toast(`✓ ${isAr ? `تم تصدير "${label}"` : `"${label}" exported`}`, '#2ecc71');
            };
            img.onerror = () => toast(isAr ? 'تعذّر تصدير الصورة' : 'Could not export image', '#e74c3c');
            img.src = frontImg.src;
        };

        setTimeout(() => {
            const toolbar = document.querySelector('.toolbar-actions-group, .toolbar-group.toolbar-end');
            if (!toolbar || document.getElementById('ep2-social-btn')) return;
            const btn = document.createElement('button');
            btn.id = 'ep2-social-btn';
            btn.className = 'btn-icon btn-compact';
            btn.title = isAr ? 'تصدير لمنصات التواصل' : 'Social Media Export';
            btn.innerHTML = '<i class="fas fa-share-alt"></i>';
            btn.style.color = '#2ecc71';
            btn.addEventListener('click', () => modal.classList.add('show'));
            toolbar.appendChild(btn);
        }, 1300);
    }

    // ════════════════════════════════════════════════════════════════════════
    // SHARED CSS
    // ════════════════════════════════════════════════════════════════════════
    function injectCSS() {
        if (document.getElementById('ep2-css')) return;
        const s = document.createElement('style');
        s.id = 'ep2-css';
        s.textContent = `
        .ep2-overlay {
            position:fixed;inset:0;background:rgba(0,0,0,0.76);backdrop-filter:blur(8px);
            z-index:99992;display:flex;align-items:center;justify-content:center;
            opacity:0;pointer-events:none;transition:opacity .4s cubic-bezier(0.22, 1, 0.36, 1);
        }
        .ep2-overlay.show { opacity:1;pointer-events:all; }
        .ep2-modal {
            background:var(--sidebar-bg,#0d1b2e);border:1px solid rgba(77,166,255,0.18);
            border-radius:18px;padding:24px;width:90vw;max-width:440px;
            box-shadow:0 24px 60px rgba(0,0,0,0.6);
            transform:translateY(18px) scale(.97);
            transition:transform .4s cubic-bezier(0.22, 1, 0.36, 1), opacity .4s cubic-bezier(0.22, 1, 0.36, 1);
            opacity:0;
            max-height:88vh;overflow-y:auto;
        }
        .ep2-overlay.show .ep2-modal { transform:translateY(0) scale(1); opacity:1; }
        @media (prefers-reduced-motion: reduce) {
            .ep2-overlay, .ep2-modal { transition-duration: 0.01ms !important; }
        }
        .ep2-head {
            display:flex;align-items:center;gap:10px;font-weight:800;font-size:1.05rem;
            color:var(--text-primary);margin-bottom:16px;
        }
        .ep2-body { color:var(--text-primary); }
        `;
        document.head.appendChild(s);
    }

    // ════════════════════════════════════════════════════════════════════════
    // INIT
    // ════════════════════════════════════════════════════════════════════════
    const run = () => {
        injectCSS();
        const sidebar = document.getElementById('panel-design');
        if (!sidebar) { setTimeout(run, 600); return; }

        initColorExtractor();
        initVCardImport();
        initBulkLinkImport();
        initQRCustomization();
        initKeyboardShortcuts();
        initTypographyPanel();
        initSocialExport();
    };

    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', run);
    else setTimeout(run, 500);

})();
