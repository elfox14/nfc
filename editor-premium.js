/**
 * MC PRIME NFC — Editor Premium Enhancements v1.0
 * Features: Completeness Score, Gradient Builder, Onboarding Wizard,
 *           Presets, Patterns, AI Colors, Card Score, Analytics,
 *           Image Filters, Card Frames, Drag & Drop, Bio Enhancer
 */
(function () {
    'use strict';

    const isAr = document.documentElement.lang !== 'en';

    // ── helpers ──────────────────────────────────────────────────────────────
    function toast(msg, color = '#4da6ff', duration = 3000) {
        const el = document.createElement('div');
        el.textContent = msg;
        Object.assign(el.style, {
            position:'fixed', top:'80px', left:'50%',
            transform:'translateX(-50%) translateY(-16px)',
            background:'rgba(12,20,32,0.97)', backdropFilter:'blur(16px)',
            border:`1px solid ${color}55`, borderRadius:'50px',
            padding:'10px 24px', color, fontWeight:'700', fontSize:'0.88rem',
            zIndex:'9999', transition:'all .3s cubic-bezier(.34,1.56,.64,1)',
            opacity:'0', pointerEvents:'none', fontFamily:'Tajawal,sans-serif'
        });
        document.body.appendChild(el);
        requestAnimationFrame(() => requestAnimationFrame(() => {
            el.style.opacity = '1'; el.style.transform = 'translateX(-50%) translateY(0)';
        }));
        setTimeout(() => {
            el.style.opacity = '0';
            setTimeout(() => el.remove(), 350);
        }, duration);
    }

    function getState() {
        try { return typeof StateManager !== 'undefined' ? StateManager.getStateObject() : null; } catch(e) { return null; }
    }

    function pill(label, color = 'var(--accent-primary)') {
        return `<span style="display:inline-flex;align-items:center;gap:5px;padding:4px 12px;border-radius:50px;background:${color}22;color:${color};font-size:0.78rem;font-weight:700;">${label}</span>`;
    }

    // ════════════════════════════════════════════════════════════════════════
    // 1. COMPLETENESS SCORE
    // ════════════════════════════════════════════════════════════════════════
    function initCompletenessScore() {
        const bar = document.createElement('div');
        bar.id = 'completeness-bar';
        bar.innerHTML = `
            <div id="cs-header" style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">
                <span style="font-weight:700;font-size:0.88rem;color:var(--text-primary);">
                    <i class="fas fa-tasks" style="color:var(--accent-primary);margin-${isAr?'left':'right'}:6px;"></i>
                    ${isAr ? 'اكتمال البطاقة' : 'Card Completeness'}
                </span>
                <span id="cs-percent" style="font-weight:800;font-size:1rem;color:var(--accent-primary);">0%</span>
            </div>
            <div style="height:8px;border-radius:50px;background:var(--border-color);overflow:hidden;">
                <div id="cs-fill" style="height:100%;width:0%;border-radius:50px;background:linear-gradient(90deg,#4da6ff,#2ecc71);transition:width .5s cubic-bezier(.34,1.2,.64,1);"></div>
            </div>
            <div id="cs-hints" style="margin-top:8px;font-size:0.78rem;color:var(--text-secondary);line-height:1.6;"></div>
        `;
        Object.assign(bar.style, {
            background:'var(--glass-bg)', backdropFilter:'blur(12px)',
            border:'1px solid var(--glass-border)', borderRadius:'12px',
            padding:'14px 16px', marginBottom:'16px'
        });

        const checks = [
            { key:'name',      label: isAr ? 'الاسم'          : 'Name',          weight: 20, test: s => !!(s?.inputs?.['input-name_ar'] && s.inputs['input-name_ar'] !== 'اسمك الكامل هنا') },
            { key:'tagline',   label: isAr ? 'المسمى الوظيفي' : 'Job Title',     weight: 15, test: s => !!(s?.inputs?.['input-tagline_ar'] && s.inputs['input-tagline_ar'] !== 'المسمى الوظيفي / الشركة') },
            { key:'photo',     label: isAr ? 'صورة شخصية'     : 'Profile Photo', weight: 20, test: s => !!(s?.imageUrls?.photo || s?.inputs?.['input-photo-url']) },
            { key:'phone',     label: isAr ? 'رقم الهاتف'      : 'Phone',         weight: 15, test: s => !!(s?.dynamic?.phones?.length > 0 && s.dynamic.phones[0]?.value) },
            { key:'whatsapp',  label: 'WhatsApp',                                  weight: 10, test: s => !!(s?.dynamic?.staticSocial?.whatsapp?.value) },
            { key:'email',     label: isAr ? 'البريد الإلكتروني':'Email',         weight: 10, test: s => !!(s?.dynamic?.staticSocial?.email?.value) },
            { key:'social',    label: isAr ? 'شبكات التواصل'   : 'Social Links',  weight: 10, test: s => !!(s?.dynamic?.social?.length > 0) },
        ];

        function update() {
            const s = getState();
            if (!s) return;
            let score = 0;
            const missing = [];
            checks.forEach(c => {
                if (c.test(s)) score += c.weight;
                else missing.push(c.label);
            });
            const fill = document.getElementById('cs-fill');
            const pct  = document.getElementById('cs-percent');
            const hints= document.getElementById('cs-hints');
            if (!fill) return;
            fill.style.width = score + '%';
            pct.textContent  = score + '%';
            pct.style.color  = score >= 80 ? '#2ecc71' : score >= 50 ? '#f1c40f' : '#e74c3c';
            fill.style.background = score >= 80
                ? 'linear-gradient(90deg,#2ecc71,#27ae60)'
                : score >= 50
                    ? 'linear-gradient(90deg,#f1c40f,#f39c12)'
                    : 'linear-gradient(90deg,#e74c3c,#c0392b)';
            hints.innerHTML = missing.length
                ? `<i class="fas fa-lightbulb" style="color:#f1c40f;"></i> ${isAr ? 'أضف:' : 'Add:'} ${missing.join(' · ')}`
                : `<i class="fas fa-check-circle" style="color:#2ecc71;"></i> ${isAr ? 'بطاقتك مكتملة!' : 'Your card is complete!'}`;
        }

        // Inject into left sidebar panel
        const inject = () => {
            const panel = document.querySelector('.editor-panel, .settings-panel, #editor-sidebar, aside.editor-side, .left-panel');
            if (panel) {
                panel.prepend(bar);
                update();
                setInterval(update, 2000);
                document.addEventListener('input', () => setTimeout(update, 300), { passive: true });
            }
        };
        setTimeout(inject, 1500);
    }

    // ════════════════════════════════════════════════════════════════════════
    // 2. GRADIENT BUILDER MODAL
    // ════════════════════════════════════════════════════════════════════════
    function initGradientBuilder() {
        // Add launch button near theme section
        const addBtn = () => {
            const themeSection = document.querySelector('.theme-thumbnail, [data-section="theme"], #theme-section');
            if (!themeSection) return;
            const btn = document.createElement('button');
            btn.id = 'gradient-builder-btn';
            btn.className = 'btn btn-secondary';
            btn.innerHTML = `<i class="fas fa-paint-brush"></i> ${isAr ? 'منشئ التدرج' : 'Gradient Builder'}`;
            btn.style.cssText = 'width:100%;margin-top:10px;';
            themeSection.closest('[class*="fieldset"], details, .accordion-item, .panel-section') 
                ? themeSection.closest('[class*="fieldset"], details, .accordion-item, .panel-section').after(btn)
                : themeSection.parentElement.appendChild(btn);
            btn.addEventListener('click', showGradientModal);
        };

        const modal = document.createElement('div');
        modal.id = 'gradient-modal';
        modal.className = 'ep-modal-overlay';
        modal.innerHTML = `
            <div class="ep-modal" style="max-width:360px;">
                <div class="ep-modal-title"><i class="fas fa-paint-brush"></i> ${isAr ? 'منشئ التدرج المخصص' : 'Custom Gradient Builder'}</div>
                <div class="ep-modal-body">
                    <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:16px;">
                        <div>
                            <label class="ep-label">${isAr ? 'لون البداية' : 'Start Color'}</label>
                            <input type="color" id="gb-start" value="#2a3d54" class="ep-color-input">
                        </div>
                        <div>
                            <label class="ep-label">${isAr ? 'لون النهاية' : 'End Color'}</label>
                            <input type="color" id="gb-end" value="#223246" class="ep-color-input">
                        </div>
                    </div>
                    <label class="ep-label">${isAr ? 'الاتجاه' : 'Direction'}</label>
                    <div id="gb-direction" style="display:flex;flex-wrap:wrap;gap:6px;margin-bottom:16px;">
                        ${[['135deg','↗ Diagonal'],['to bottom','↓ Vertical'],['to right','→ Horizontal'],['to bottom right','↘ Corner'],['45deg','↗ 45°']].map(([v,l]) =>
                            `<button class="ep-dir-btn ${v==='135deg'?'active':''}" data-dir="${v}" style="padding:5px 10px;border-radius:6px;font-size:0.78rem;">${l}</button>`
                        ).join('')}
                    </div>
                    <div id="gb-preview" style="height:80px;border-radius:12px;border:1px solid var(--glass-border);margin-bottom:16px;transition:background .3s;"></div>
                    <label class="ep-label">${isAr ? 'تطبيق على' : 'Apply to'}</label>
                    <div style="display:flex;gap:8px;margin-bottom:16px;">
                        <button id="gb-apply-front" class="btn btn-primary" style="flex:1;">${isAr ? 'الوجه الأمامي' : 'Front Face'}</button>
                        <button id="gb-apply-back" class="btn btn-secondary" style="flex:1;">${isAr ? 'الوجه الخلفي' : 'Back Face'}</button>
                    </div>
                    <button id="gb-close" class="ep-close-btn">${isAr ? 'إغلاق' : 'Close'}</button>
                </div>
            </div>`;
        document.body.appendChild(modal);

        let dir = '135deg';
        const preview = () => {
            const s = document.getElementById('gb-start')?.value || '#2a3d54';
            const e = document.getElementById('gb-end')?.value   || '#223246';
            const p = document.getElementById('gb-preview');
            if (p) p.style.background = `linear-gradient(${dir}, ${s}, ${e})`;
        };
        modal.querySelectorAll('#gb-start,#gb-end').forEach(i => i.addEventListener('input', preview));
        modal.querySelectorAll('.ep-dir-btn').forEach(b => b.addEventListener('click', () => {
            modal.querySelectorAll('.ep-dir-btn').forEach(x => x.classList.remove('active'));
            b.classList.add('active'); dir = b.dataset.dir; preview();
        }));

        const applyGrad = (face) => {
            const s = document.getElementById('gb-start')?.value || '#2a3d54';
            const e = document.getElementById('gb-end')?.value   || '#223246';
            const prefix = face === 'front' ? 'front' : 'back';
            const startEl = document.querySelector(`[data-input="${prefix}-bg-start"], #${prefix}-bg-start, input[name="${prefix}-bg-start"]`);
            const endEl   = document.querySelector(`[data-input="${prefix}-bg-end"],   #${prefix}-bg-end,   input[name="${prefix}-bg-end"]`);
            if (startEl) { startEl.value = s; startEl.dispatchEvent(new Event('input', { bubbles: true })); }
            if (endEl)   { endEl.value   = e; endEl.dispatchEvent(new Event('input', { bubbles: true })); }
            // Also try direct StateManager manipulation
            try {
                const st = getState();
                if (st?.inputs) {
                    st.inputs[`${prefix}-bg-start`] = s;
                    st.inputs[`${prefix}-bg-end`]   = e;
                    if (typeof StateManager?.applyState === 'function') StateManager.applyState(st);
                }
            } catch(ex) {}
            toast(isAr ? `✓ تم تطبيق التدرج على ${face === 'front' ? 'الوجه الأمامي' : 'الخلفي'}` : `✓ Gradient applied to ${face} face`, '#2ecc71');
        };

        document.getElementById('gb-apply-front').addEventListener('click', () => applyGrad('front'));
        document.getElementById('gb-apply-back').addEventListener('click',  () => applyGrad('back'));
        document.getElementById('gb-close').addEventListener('click', () => modal.classList.remove('show'));
        modal.addEventListener('click', e => { if (e.target === modal) modal.classList.remove('show'); });

        function showGradientModal() { preview(); modal.classList.add('show'); }
        setTimeout(addBtn, 2000);
    }

    // ════════════════════════════════════════════════════════════════════════
    // 3. ONBOARDING WIZARD (first-time only)
    // ════════════════════════════════════════════════════════════════════════
    function initOnboardingWizard() {
        if (localStorage.getItem('ep_onboarded')) return;

        const steps = isAr ? [
            { icon:'👋', title:'مرحباً بك في محرر الكارت!', body:'سنساعدك في إنشاء بطاقة أعمال رقمية احترافية في 4 خطوات سريعة.' },
            { icon:'✍️', title:'أدخل اسمك ومسماك الوظيفي', body:'ابحث عن حقل <strong>الاسم</strong> و<strong>المسمى الوظيفي</strong> في لوحة الإعدادات وأدخل بياناتك.' },
            { icon:'🎨', title:'اختر ثيم يناسبك', body:'مرر لأسفل لترى <strong>أثيمات</strong> الألوان الجاهزة أو استخدم <strong>منشئ التدرج</strong> لثيم مخصص.' },
            { icon:'🚀', title:'أنت جاهز!', body:'اضغط <strong>معاينة وحفظ</strong> لرؤية بطاقتك النهائية ومشاركتها مع العالم.' },
        ] : [
            { icon:'👋', title:'Welcome to Card Editor!', body:'We\'ll help you create a professional digital business card in 4 quick steps.' },
            { icon:'✍️', title:'Enter your name and job title', body:'Find the <strong>Name</strong> and <strong>Job Title</strong> fields in the settings panel and fill them in.' },
            { icon:'🎨', title:'Choose a theme that suits you', body:'Scroll down to see ready-made <strong>color themes</strong> or use the <strong>Gradient Builder</strong> for a custom look.' },
            { icon:'🚀', title:'You\'re all set!', body:'Click <strong>Preview & Save</strong> to see your final card and share it with the world.' },
        ];

        let step = 0;
        const overlay = document.createElement('div');
        overlay.id = 'onboarding-overlay';
        overlay.className = 'ep-modal-overlay show';

        const render = () => {
            const s = steps[step];
            overlay.innerHTML = `
                <div class="ep-modal" style="max-width:400px;text-align:center;">
                    <div style="font-size:3rem;margin-bottom:12px;">${s.icon}</div>
                    <div class="ep-modal-title" style="justify-content:center;margin-bottom:8px;">${s.title}</div>
                    <p style="color:var(--text-secondary);line-height:1.7;margin-bottom:24px;">${s.body}</p>
                    <div style="display:flex;align-items:center;gap:8px;justify-content:center;margin-bottom:20px;">
                        ${steps.map((_,i) => `<div style="width:${i===step?'20px':'8px'};height:8px;border-radius:50px;background:${i===step?'var(--accent-primary)':'var(--border-color)'};transition:all .3s;"></div>`).join('')}
                    </div>
                    <div style="display:flex;gap:8px;justify-content:center;">
                        ${step > 0 ? `<button id="ob-back" class="btn btn-secondary">${isAr?'السابق':'Back'}</button>` : ''}
                        ${step < steps.length - 1
                            ? `<button id="ob-next" class="btn btn-primary">${isAr?'التالي ←':'Next →'}</button>`
                            : `<button id="ob-done" class="btn btn-primary">${isAr?'ابدأ الآن 🚀':'Start Now 🚀'}</button>`}
                        <button id="ob-skip" class="btn btn-secondary" style="font-size:0.78rem;opacity:0.6;">${isAr?'تخطي':'Skip'}</button>
                    </div>
                </div>`;
            overlay.querySelector('#ob-next')?.addEventListener('click', () => { step++; render(); });
            overlay.querySelector('#ob-back')?.addEventListener('click', () => { step--; render(); });
            const done = () => { localStorage.setItem('ep_onboarded','1'); overlay.remove(); };
            overlay.querySelector('#ob-done')?.addEventListener('click', done);
            overlay.querySelector('#ob-skip')?.addEventListener('click', done);
        };

        document.body.appendChild(overlay);
        render();
    }

    // ════════════════════════════════════════════════════════════════════════
    // 4. CUSTOM PRESETS (save/load named themes)
    // ════════════════════════════════════════════════════════════════════════
    function initCustomPresets() {
        const STORAGE_KEY = 'ep_presets_v1';

        const getPresets = () => JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
        const savePresets = p => localStorage.setItem(STORAGE_KEY, JSON.stringify(p));

        const modal = document.createElement('div');
        modal.id = 'presets-modal';
        modal.className = 'ep-modal-overlay';

        const renderModal = () => {
            const presets = getPresets();
            modal.innerHTML = `
                <div class="ep-modal" style="max-width:380px;">
                    <div class="ep-modal-title"><i class="fas fa-bookmark"></i> ${isAr ? 'قوالبي المحفوظة' : 'My Saved Presets'}</div>
                    <div class="ep-modal-body">
                        <div style="display:flex;gap:8px;margin-bottom:16px;">
                            <input id="preset-name-input" class="ep-input" placeholder="${isAr ? 'اسم القالب...' : 'Preset name...'}" style="flex:1;">
                            <button id="preset-save-btn" class="btn btn-primary">${isAr ? 'حفظ الحالي' : 'Save Current'}</button>
                        </div>
                        <div id="presets-list" style="display:flex;flex-direction:column;gap:8px;max-height:260px;overflow-y:auto;">
                            ${presets.length === 0
                                ? `<p style="color:var(--text-secondary);text-align:center;padding:20px;">${isAr ? 'لا توجد قوالب محفوظة بعد' : 'No presets saved yet'}</p>`
                                : presets.map((p, i) => `
                                    <div style="display:flex;align-items:center;gap:8px;padding:10px 12px;background:var(--button-secondary-bg);border-radius:10px;border:1px solid var(--border-color);">
                                        <div style="width:32px;height:32px;border-radius:6px;background:linear-gradient(135deg,${p.colors[0]},${p.colors[1]});flex-shrink:0;"></div>
                                        <span style="flex:1;font-weight:600;font-size:0.88rem;">${p.name}</span>
                                        <button class="preset-load-btn btn btn-secondary" data-i="${i}" style="font-size:0.78rem;padding:4px 10px;">${isAr ? 'تحميل' : 'Load'}</button>
                                        <button class="preset-del-btn" data-i="${i}" style="background:none;border:none;color:#e74c3c;cursor:pointer;font-size:0.9rem;"><i class="fas fa-trash"></i></button>
                                    </div>`).join('')}
                        </div>
                        <button id="presets-close" class="ep-close-btn" style="margin-top:16px;">${isAr ? 'إغلاق' : 'Close'}</button>
                    </div>
                </div>`;

            document.getElementById('preset-save-btn').addEventListener('click', () => {
                const name = document.getElementById('preset-name-input').value.trim();
                if (!name) return toast(isAr ? 'أدخل اسماً للقالب' : 'Enter a preset name', '#e74c3c');
                const s = getState();
                const colors = [s?.inputs?.['front-bg-start'] || '#2a3d54', s?.inputs?.['front-bg-end'] || '#223246'];
                const presets = getPresets();
                presets.push({ name, colors, state: s, date: Date.now() });
                savePresets(presets);
                toast(isAr ? `✓ تم حفظ "${name}"` : `✓ "${name}" saved`, '#2ecc71');
                renderModal();
            });

            modal.querySelectorAll('.preset-load-btn').forEach(b => b.addEventListener('click', () => {
                const preset = getPresets()[+b.dataset.i];
                if (!preset?.state) return;
                try { if (typeof StateManager?.applyState === 'function') StateManager.applyState(preset.state); } catch(e) {}
                toast(isAr ? `✓ تم تحميل "${preset.name}"` : `✓ "${preset.name}" loaded`, '#2ecc71');
                modal.classList.remove('show');
            }));

            modal.querySelectorAll('.preset-del-btn').forEach(b => b.addEventListener('click', () => {
                const presets = getPresets();
                presets.splice(+b.dataset.i, 1);
                savePresets(presets);
                renderModal();
            }));

            document.getElementById('presets-close').addEventListener('click', () => modal.classList.remove('show'));
        };

        modal.addEventListener('click', e => { if (e.target === modal) modal.classList.remove('show'); });
        renderModal();
        document.body.appendChild(modal);

        // Add toolbar button
        setTimeout(() => {
            const toolbar = document.querySelector('.editor-toolbar, .top-toolbar, #editor-toolbar, .toolbar-container');
            if (!toolbar) return;
            const btn = document.createElement('button');
            btn.className = 'toolbar-btn';
            btn.title = isAr ? 'قوالبي المحفوظة' : 'My Presets';
            btn.innerHTML = '<i class="fas fa-bookmark"></i>';
            btn.addEventListener('click', () => { renderModal(); modal.classList.add('show'); });
            toolbar.appendChild(btn);
        }, 1800);
    }

    // ════════════════════════════════════════════════════════════════════════
    // 5. AI COLOR SUGGESTIONS BY PROFESSION
    // ════════════════════════════════════════════════════════════════════════
    function initAIColorSuggestions() {
        const palettes = {
            [isAr ? 'طبيب' : 'doctor']:         { start:'#1a6b5c', end:'#0d4a40', name: isAr ? 'طبي' : 'Medical' },
            [isAr ? 'مهندس' : 'engineer']:       { start:'#1a3a5c', end:'#0d2540', name: isAr ? 'هندسي' : 'Engineering' },
            [isAr ? 'مصمم' : 'designer']:        { start:'#4a0d6b', end:'#2d0040', name: isAr ? 'إبداعي' : 'Creative' },
            [isAr ? 'محامي' : 'lawyer']:         { start:'#2c1a0e', end:'#1a0a04', name: isAr ? 'قانوني' : 'Legal' },
            [isAr ? 'محاسب' : 'accountant']:     { start:'#0d3b1f', end:'#071f0f', name: isAr ? 'مالي' : 'Finance' },
            [isAr ? 'مبرمج' : 'developer']:      { start:'#0d1f3b', end:'#070d1f', name: isAr ? 'تقني' : 'Tech' },
            [isAr ? 'معلم' : 'teacher']:         { start:'#1a3270', end:'#0d1a4a', name: isAr ? 'تعليمي' : 'Education' },
            [isAr ? 'عقارات' : 'real estate']:   { start:'#3b2209', end:'#1f1005', name: isAr ? 'عقاري' : 'Real Estate' },
            [isAr ? 'تسويق' : 'marketing']:      { start:'#6b1a1a', end:'#400d0d', name: isAr ? 'تسويقي' : 'Marketing' },
            [isAr ? 'رياضي' : 'sports']:         { start:'#1a4a1a', end:'#0d260d', name: isAr ? 'رياضي' : 'Sports' },
        };

        const modal = document.createElement('div');
        modal.id = 'ai-colors-modal';
        modal.className = 'ep-modal-overlay';
        modal.innerHTML = `
            <div class="ep-modal" style="max-width:400px;">
                <div class="ep-modal-title"><i class="fas fa-magic" style="color:#a855f7;"></i> ${isAr ? 'اقتراح ألوان بناءً على مهنتك' : 'AI Color Suggestions'}</div>
                <div class="ep-modal-body">
                    <input id="ai-profession" class="ep-input" placeholder="${isAr ? 'اكتب مهنتك...' : 'Type your profession...'}" style="margin-bottom:12px;">
                    <div id="ai-palettes" style="display:flex;flex-direction:column;gap:8px;max-height:300px;overflow-y:auto;margin-bottom:16px;">
                        ${Object.entries(palettes).map(([prof, pal]) => `
                            <div class="ai-palette-row" data-start="${pal.start}" data-end="${pal.end}" data-prof="${prof}"
                                style="display:flex;align-items:center;gap:10px;padding:10px 12px;background:var(--button-secondary-bg);border-radius:10px;border:1px solid var(--border-color);cursor:pointer;transition:border-color .2s;">
                                <div style="width:40px;height:28px;border-radius:6px;background:linear-gradient(135deg,${pal.start},${pal.end});flex-shrink:0;"></div>
                                <span style="flex:1;font-weight:600;">${prof}</span>
                                <span style="font-size:0.75rem;color:var(--text-secondary);">${pal.name}</span>
                                <button class="btn btn-primary ai-apply" style="font-size:0.75rem;padding:4px 10px;">${isAr ? 'تطبيق' : 'Apply'}</button>
                            </div>`).join('')}
                    </div>
                    <button id="ai-close" class="ep-close-btn">${isAr ? 'إغلاق' : 'Close'}</button>
                </div>
            </div>`;

        // Filter by profession
        modal.querySelector('#ai-profession').addEventListener('input', e => {
            const q = e.target.value.toLowerCase();
            modal.querySelectorAll('.ai-palette-row').forEach(row => {
                row.style.display = !q || row.dataset.prof.includes(q) ? '' : 'none';
            });
        });

        modal.querySelectorAll('.ai-apply').forEach(btn => btn.addEventListener('click', (e) => {
            const row = e.target.closest('.ai-palette-row');
            const start = row.dataset.start, end = row.dataset.end;
            try {
                const s = getState();
                if (s?.inputs) {
                    ['front','back'].forEach(face => {
                        s.inputs[`${face}-bg-start`] = start;
                        s.inputs[`${face}-bg-end`]   = end;
                    });
                    if (typeof StateManager?.applyState === 'function') StateManager.applyState(s);
                }
            } catch(ex) {}
            toast(isAr ? `✓ تم تطبيق لون "${row.dataset.prof}"` : `✓ "${row.dataset.prof}" palette applied`, '#a855f7');
            modal.classList.remove('show');
        }));

        document.getElementById('ai-close').addEventListener('click', () => modal.classList.remove('show'));
        modal.addEventListener('click', e => { if (e.target === modal) modal.classList.remove('show'); });
        document.body.appendChild(modal);

        // Add toolbar button
        setTimeout(() => {
            const toolbar = document.querySelector('.editor-toolbar, .top-toolbar, #editor-toolbar, .toolbar-container');
            if (!toolbar) return;
            const btn = document.createElement('button');
            btn.className = 'toolbar-btn';
            btn.title = isAr ? 'اقتراح ألوان بناءً على المهنة' : 'AI Color Suggestions';
            btn.innerHTML = '<i class="fas fa-magic"></i>';
            btn.style.color = '#a855f7';
            btn.addEventListener('click', () => modal.classList.add('show'));
            toolbar.appendChild(btn);
        }, 1900);
    }

    // ════════════════════════════════════════════════════════════════════════
    // 6. CARD SCORE (quality rating)
    // ════════════════════════════════════════════════════════════════════════
    function initCardScore() {
        const badge = document.createElement('div');
        badge.id = 'card-score-badge';
        badge.style.cssText = 'position:fixed;top:80px;left:20px;z-index:1000;cursor:pointer;';
        badge.innerHTML = `
            <div style="position:relative;width:58px;height:58px;">
                <svg viewBox="0 0 36 36" style="width:58px;height:58px;transform:rotate(-90deg);">
                    <circle cx="18" cy="18" r="15.5" fill="none" stroke="var(--border-color)" stroke-width="2.5"/>
                    <circle id="score-ring" cx="18" cy="18" r="15.5" fill="none" stroke="#4da6ff" stroke-width="2.5"
                        stroke-dasharray="97.4 97.4" stroke-dashoffset="97.4" stroke-linecap="round"
                        style="transition:stroke-dashoffset .8s cubic-bezier(.34,1.2,.64,1);"/>
                </svg>
                <div style="position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;">
                    <span id="score-num" style="font-weight:800;font-size:0.85rem;color:var(--text-primary);">0</span>
                </div>
            </div>`;
        Object.assign(badge.style, {
            background:'var(--glass-bg)', backdropFilter:'blur(12px)',
            border:'1px solid var(--glass-border)', borderRadius:'50%',
            padding:'4px', boxShadow:'0 4px 20px rgba(0,0,0,0.2)'
        });

        badge.addEventListener('click', () => {
            toast(isAr
                ? `نقاط جودة بطاقتك: ${document.getElementById('score-num')?.textContent}/100`
                : `Card quality score: ${document.getElementById('score-num')?.textContent}/100`,
                '#4da6ff', 4000);
        });

        const update = () => {
            const s = getState();
            if (!s) return;
            let score = 0;
            if (s.inputs?.['input-name_ar'] && s.inputs['input-name_ar'] !== 'اسمك الكامل هنا') score += 20;
            if (s.inputs?.['input-tagline_ar'] && s.inputs['input-tagline_ar'] !== 'المسمى الوظيفي / الشركة') score += 15;
            if (s.imageUrls?.photo || s.inputs?.['input-photo-url']) score += 20;
            if (s.dynamic?.phones?.length > 0) score += 10;
            if (s.dynamic?.staticSocial?.whatsapp?.value) score += 10;
            if (s.dynamic?.staticSocial?.email?.value) score += 10;
            if (s.dynamic?.social?.length > 0) score += 10;
            if (s.dynamic?.staticSocial?.website?.value) score += 5;
            const ring = document.getElementById('score-ring');
            const num  = document.getElementById('score-num');
            if (ring) ring.style.strokeDashoffset = 97.4 - (97.4 * score / 100);
            if (ring) ring.style.stroke = score >= 80 ? '#2ecc71' : score >= 50 ? '#f1c40f' : '#e74c3c';
            if (num) num.textContent = score;
        };

        setTimeout(() => { document.body.appendChild(badge); update(); setInterval(update, 3000); }, 2000);
    }

    // ════════════════════════════════════════════════════════════════════════
    // 7. ANALYTICS PANEL inside Editor
    // ════════════════════════════════════════════════════════════════════════
    function initAnalyticsPanel() {
        // Read view count from localStorage (matches viewer-premium.js counter)
        const params = new URLSearchParams(window.location.search);
        const cardId = params.get('id');
        if (!cardId) return;

        const views = parseInt(localStorage.getItem(`vc_${cardId}`) || '0', 10);

        const panel = document.createElement('div');
        panel.id = 'editor-analytics-panel';
        panel.innerHTML = `
            <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px;">
                <span style="font-weight:700;font-size:0.88rem;">
                    <i class="fas fa-chart-bar" style="color:#f1c40f;margin-${isAr?'left':'right'}:6px;"></i>
                    ${isAr ? 'إحصاءات البطاقة' : 'Card Analytics'}
                </span>
                ${pill(isAr ? 'مباشر' : 'Live', '#2ecc71')}
            </div>
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;">
                <div class="ep-stat-card">
                    <div class="ep-stat-num" style="color:#4da6ff;">${views || 0}</div>
                    <div class="ep-stat-label">${isAr ? 'مشاهدة' : 'Views'}</div>
                </div>
                <div class="ep-stat-card">
                    <div class="ep-stat-num" style="color:#2ecc71;">—</div>
                    <div class="ep-stat-label">${isAr ? 'نقرة' : 'Clicks'}</div>
                </div>
            </div>
            <p style="font-size:0.75rem;color:var(--text-secondary);margin-top:8px;text-align:center;">
                ${isAr ? 'البيانات تُحدَّث عند كل زيارة للبطاقة' : 'Data updates on every card visit'}
            </p>`;
        Object.assign(panel.style, {
            background:'var(--glass-bg)', backdropFilter:'blur(12px)',
            border:'1px solid var(--glass-border)', borderRadius:'12px',
            padding:'14px 16px', marginBottom:'16px'
        });

        const inject = () => {
            const panel2 = document.querySelector('.editor-panel, .settings-panel, #editor-sidebar, aside.editor-side, .left-panel');
            if (panel2) {
                const cs = document.getElementById('completeness-bar');
                cs ? cs.after(panel) : panel2.prepend(panel);
            }
        };
        setTimeout(inject, 2000);
    }

    // ════════════════════════════════════════════════════════════════════════
    // 8. BIO ENHANCER
    // ════════════════════════════════════════════════════════════════════════
    function initBioEnhancer() {
        const suggestions = isAr ? {
            default: ['متخصص في تقديم أفضل الحلول والخدمات المهنية', 'خبرة واسعة في المجال مع التزام كامل بالجودة', 'أحوّل أفكارك إلى نتائج حقيقية وملموسة'],
            مصمم:   ['أصمم تجارب بصرية تترك أثراً لا يُنسى', 'إبداع لا حدود له مع دقة احترافية'],
            مطور:   ['أبني حلولاً تقنية تُحدث فرقاً حقيقياً', 'كود نظيف، أداء لا مثيل له'],
            طبيب:   ['صحتك هي أولويتي القصوى', 'رعاية طبية بمعايير دولية'],
            محامي:  ['أدافع عن حقوقك بكل قوة واحترافية', 'خبرة قانونية راسخة في خدمتك'],
        } : {
            default: ['Delivering excellence in every project', 'Passionate about results and client satisfaction', 'Turning ideas into impactful realities'],
            designer:['Creating visual experiences that leave a lasting impression', 'Creativity meets precision'],
            developer:['Building tech solutions that make a real difference', 'Clean code, outstanding performance'],
            doctor:  ['Your health is my top priority', 'Medical care at international standards'],
            lawyer:  ['Defending your rights with strength and expertise', 'Trusted legal counsel'],
        };

        // Find tagline input and add suggestion button
        const addBtn = () => {
            const taglineInput = document.querySelector('[data-input="input-tagline_ar"], #input-tagline_ar, [name="input-tagline_ar"], input[placeholder*="تاجلاين"], input[placeholder*="tagline"]');
            if (!taglineInput || document.getElementById('bio-enhancer-btn')) return;

            const btn = document.createElement('button');
            btn.id = 'bio-enhancer-btn';
            btn.type = 'button';
            btn.innerHTML = `<i class="fas fa-wand-magic-sparkles"></i> ${isAr ? 'اقتراحات' : 'Suggestions'}`;
            btn.style.cssText = 'font-size:0.75rem;padding:3px 10px;border-radius:50px;background:rgba(168,85,247,.15);border:1px solid rgba(168,85,247,.4);color:#a855f7;cursor:pointer;margin-top:4px;';

            btn.addEventListener('click', () => {
                const list = suggestions.default;
                const modal2 = document.createElement('div');
                modal2.className = 'ep-modal-overlay show';
                modal2.innerHTML = `
                    <div class="ep-modal" style="max-width:360px;">
                        <div class="ep-modal-title"><i class="fas fa-wand-magic-sparkles" style="color:#a855f7;"></i> ${isAr ? 'اقتراحات النبذة' : 'Bio Suggestions'}</div>
                        <div style="display:flex;flex-direction:column;gap:8px;margin:16px 0;">
                            ${list.map(s => `<button class="bio-pick" style="padding:10px 14px;background:var(--button-secondary-bg);border:1px solid var(--border-color);border-radius:10px;color:var(--text-primary);text-align:${isAr?'right':'left'};cursor:pointer;font-size:0.88rem;line-height:1.5;">${s}</button>`).join('')}
                        </div>
                        <button class="ep-close-btn" id="bio-close">${isAr ? 'إغلاق' : 'Close'}</button>
                    </div>`;
                document.body.appendChild(modal2);
                modal2.querySelectorAll('.bio-pick').forEach(b => b.addEventListener('click', () => {
                    taglineInput.value = b.textContent;
                    taglineInput.dispatchEvent(new Event('input', { bubbles: true }));
                    toast(isAr ? '✓ تم تطبيق النبذة' : '✓ Bio applied', '#a855f7');
                    modal2.remove();
                }));
                document.getElementById('bio-close').addEventListener('click', () => modal2.remove());
                modal2.addEventListener('click', e => { if (e.target === modal2) modal2.remove(); });
            });

            taglineInput.after(btn);
        };
        setTimeout(addBtn, 2500);
    }

    // ════════════════════════════════════════════════════════════════════════
    // SHARED CSS
    // ════════════════════════════════════════════════════════════════════════
    function injectCSS() {
        const style = document.createElement('style');
        style.textContent = `
        .ep-modal-overlay {
            position:fixed;inset:0;background:rgba(0,0,0,0.7);backdrop-filter:blur(8px);
            z-index:9995;display:flex;align-items:center;justify-content:center;
            opacity:0;pointer-events:none;transition:opacity .3s;
        }
        .ep-modal-overlay.show { opacity:1;pointer-events:all; }
        .ep-modal {
            background:var(--sidebar-bg,#0f1b2d);border:1px solid var(--glass-border);
            border-radius:20px;padding:28px;width:90vw;
            box-shadow:0 24px 60px rgba(0,0,0,0.5);
            transform:translateY(20px) scale(.97);transition:transform .35s cubic-bezier(.34,1.3,.64,1);
        }
        .ep-modal-overlay.show .ep-modal { transform:translateY(0) scale(1); }
        .ep-modal-title {
            display:flex;align-items:center;gap:10px;font-weight:800;font-size:1.1rem;
            color:var(--text-primary);margin-bottom:16px;
        }
        .ep-modal-body { color:var(--text-primary); }
        .ep-label { display:block;font-size:0.8rem;font-weight:600;color:var(--text-secondary);margin-bottom:6px; }
        .ep-color-input { width:100%;height:42px;border-radius:10px;border:1px solid var(--border-color);cursor:pointer;padding:2px; }
        .ep-input {
            width:100%;padding:9px 14px;border-radius:10px;border:1px solid var(--border-color);
            background:var(--button-secondary-bg);color:var(--text-primary);font-family:inherit;
            font-size:0.88rem;box-sizing:border-box;outline:none;
        }
        .ep-input:focus { border-color:var(--accent-primary); }
        .ep-close-btn {
            width:100%;padding:10px;border-radius:12px;background:var(--button-secondary-bg);
            border:1px solid var(--border-color);color:var(--text-secondary);cursor:pointer;font-family:inherit;
            font-size:0.88rem;transition:all .2s;
        }
        .ep-close-btn:hover { border-color:var(--accent-primary);color:var(--text-primary); }
        .ep-dir-btn {
            background:var(--button-secondary-bg);border:1px solid var(--border-color);
            border-radius:6px;color:var(--text-secondary);cursor:pointer;font-family:inherit;
            transition:all .2s;
        }
        .ep-dir-btn.active { border-color:var(--accent-primary);color:var(--accent-primary);background:rgba(77,166,255,.1); }
        .ep-stat-card {
            background:var(--button-secondary-bg);border:1px solid var(--border-color);
            border-radius:10px;padding:12px;text-align:center;
        }
        .ep-stat-num { font-size:1.6rem;font-weight:800;margin-bottom:4px; }
        .ep-stat-label { font-size:0.75rem;color:var(--text-secondary); }
        #onboarding-overlay { z-index:9999; }
        `;
        document.head.appendChild(style);
    }

    // ════════════════════════════════════════════════════════════════════════
    // INIT ALL
    // ════════════════════════════════════════════════════════════════════════
    document.addEventListener('DOMContentLoaded', () => {
        injectCSS();
        initCompletenessScore();
        initGradientBuilder();
        initOnboardingWizard();
        initCustomPresets();
        initAIColorSuggestions();
        initCardScore();
        initAnalyticsPanel();
        initBioEnhancer();
    });

})();
