/**
 * MC PRIME NFC — Editor Premium Enhancements v2.0
 * Uses correct editor.html selectors:
 *   Toolbar:  header.pro-toolbar  |  .toolbar-group.toolbar-start
 *   Sidebar:  aside#panel-design  |  .pro-sidebar-left
 *   Themes:   #theme-gallery      |  #designs-fieldset-source
 *   Colors:   #front-bg-start     |  #front-bg-end
 *             #back-bg-start      |  #back-bg-end
 *   Tagline:  #input-tagline_ar   |  #input-tagline_en
 */
(function () {
    'use strict';

    const isAr = document.documentElement.lang !== 'en';

    // ── Helpers ──────────────────────────────────────────────────────────────
    function toast(msg, color = '#4da6ff', dur = 3000) {
        const el = document.createElement('div');
        el.innerHTML = msg;
        Object.assign(el.style, {
            position:'fixed', top:'70px', left:'50%',
            transform:'translateX(-50%) translateY(-16px)',
            background:'rgba(10,18,30,0.97)', backdropFilter:'blur(16px)',
            border:`1px solid ${color}55`, borderRadius:'50px',
            padding:'10px 24px', color, fontWeight:'700', fontSize:'0.85rem',
            zIndex:'99999', transition:'all .3s cubic-bezier(.34,1.56,.64,1)',
            opacity:'0', pointerEvents:'none', fontFamily:'Tajawal,sans-serif',
            whiteSpace:'nowrap', boxShadow:`0 8px 30px rgba(0,0,0,0.4)`
        });
        document.body.appendChild(el);
        requestAnimationFrame(() => requestAnimationFrame(() => {
            el.style.opacity = '1'; el.style.transform = 'translateX(-50%) translateY(0)';
        }));
        setTimeout(() => { el.style.opacity='0'; setTimeout(()=>el.remove(),350); }, dur);
    }

    function getState() {
        try { return typeof StateManager !== 'undefined' ? StateManager.getStateObject() : null; } catch(e) { return null; }
    }

    function applyColors(startColor, endColor) {
        // Apply to front
        ['front-bg-start','front-bg-end','back-bg-start','back-bg-end'].forEach((id,i) => {
            const el = document.getElementById(id);
            if (!el) return;
            el.value = i % 2 === 0 ? startColor : endColor;
            el.dispatchEvent(new Event('input', { bubbles: true }));
            el.dispatchEvent(new Event('change', { bubbles: true }));
        });
    }

    function addToolbarButton(id, icon, titleAr, titleEn, onClick, colorStyle = '') {
        // Inject into the undo-redo area or toolbar-start
        const toolbar = document.querySelector('.undo-redo-container, .toolbar-group.toolbar-start');
        if (!toolbar || document.getElementById(id)) return;
        const btn = document.createElement('button');
        btn.id = id;
        btn.className = 'btn-icon btn-compact';
        btn.title = isAr ? titleAr : titleEn;
        btn.innerHTML = `<i class="${icon}"></i>`;
        if (colorStyle) btn.style.color = colorStyle;
        btn.addEventListener('click', onClick);
        toolbar.appendChild(btn);
    }

    function createModal(id, titleHtml, bodyHtml) {
        if (document.getElementById(id)) return document.getElementById(id);
        const m = document.createElement('div');
        m.id = id;
        m.className = 'ep-overlay';
        m.innerHTML = `
            <div class="ep-modal">
                <div class="ep-modal-head">${titleHtml}</div>
                <div class="ep-modal-body">${bodyHtml}</div>
            </div>`;
        m.addEventListener('click', e => { if (e.target === m) m.classList.remove('show'); });
        document.body.appendChild(m);
        return m;
    }

    // ════════════════════════════════════════════════════════════════════════
    // 1. COMPLETENESS SCORE — injects above #layout-fieldset-source
    // ════════════════════════════════════════════════════════════════════════
    function initCompletenessScore() {
        const sidebar = document.getElementById('panel-design');
        if (!sidebar || document.getElementById('ep-score-bar')) return;

        const bar = document.createElement('div');
        bar.id = 'ep-score-bar';
        bar.innerHTML = `
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">
                <span style="font-weight:700;font-size:0.82rem;color:var(--text-primary);">
                    <i class="fas fa-tasks" style="color:var(--accent-color);margin-${isAr?'left':'right'}:5px;"></i>
                    ${isAr ? 'اكتمال البطاقة' : 'Card Completeness'}
                </span>
                <span id="ep-score-pct" style="font-weight:800;font-size:0.95rem;color:var(--accent-color);">0%</span>
            </div>
            <div style="height:7px;border-radius:50px;background:rgba(255,255,255,0.1);overflow:hidden;">
                <div id="ep-score-fill" style="height:100%;width:0%;border-radius:50px;background:linear-gradient(90deg,#4da6ff,#2ecc71);transition:width .6s cubic-bezier(.34,1.2,.64,1);"></div>
            </div>
            <div id="ep-score-hint" style="margin-top:6px;font-size:0.73rem;color:var(--text-secondary);"></div>`;
        Object.assign(bar.style, {
            padding:'12px 14px', marginBottom:'10px',
            background:'rgba(255,255,255,0.04)', borderRadius:'10px',
            border:'1px solid rgba(255,255,255,0.08)'
        });
        sidebar.prepend(bar);

        const checks = [
            { label: isAr?'الاسم':'Name',        w:20, test: s => { const v=s?.inputs?.['input-name_ar']||s?.inputs?.['input-name_en']||''; return v&&v!=='اسمك الكامل هنا'&&v!=='Your Full Name Here'; } },
            { label: isAr?'المسمى':'Job Title',   w:15, test: s => { const v=s?.inputs?.['input-tagline_ar']||s?.inputs?.['input-tagline_en']||''; return v&&v!=='المسمى الوظيفي / الشركة'&&v!=='Job Title / Company'; } },
            { label: isAr?'صورة':'Photo',         w:20, test: s => !!(s?.imageUrls?.photo||s?.inputs?.['input-photo-url']) },
            { label: isAr?'هاتف':'Phone',         w:15, test: s => !!(s?.dynamic?.phones?.length&&s.dynamic.phones[0]?.value) },
            { label: 'WhatsApp',                   w:10, test: s => !!(s?.dynamic?.staticSocial?.whatsapp?.value) },
            { label: isAr?'بريد':'Email',          w:10, test: s => !!(s?.dynamic?.staticSocial?.email?.value) },
            { label: isAr?'تواصل':'Social',        w:10, test: s => !!(s?.dynamic?.social?.length) },
        ];

        function update() {
            const s = getState(); if (!s) return;
            let score=0, missing=[];
            checks.forEach(c => { if(c.test(s)) score+=c.w; else missing.push(c.label); });
            const fill=document.getElementById('ep-score-fill');
            const pct=document.getElementById('ep-score-pct');
            const hint=document.getElementById('ep-score-hint');
            if(!fill) return;
            fill.style.width = score+'%';
            pct.textContent  = score+'%';
            const clr = score>=80?'#2ecc71':score>=50?'#f1c40f':'#e74c3c';
            pct.style.color = clr;
            fill.style.background = `linear-gradient(90deg,${clr},${score>=80?'#27ae60':score>=50?'#e67e22':'#c0392b'})`;
            hint.innerHTML = missing.length
                ? `<i class="fas fa-lightbulb" style="color:#f1c40f;"></i> ${isAr?'أضف:':'Missing:'} ${missing.slice(0,3).join(' · ')}${missing.length>3?'...':''}`
                : `<i class="fas fa-check-circle" style="color:#2ecc71;"></i> ${isAr?'بطاقتك مكتملة! 🎉':'Card complete! 🎉'}`;
        }

        update();
        setInterval(update, 2500);
        document.addEventListener('input', ()=>setTimeout(update,400), { passive:true });
        document.addEventListener('change', ()=>setTimeout(update,400), { passive:true });
    }

    // ════════════════════════════════════════════════════════════════════════
    // 2. GRADIENT BUILDER — button after #designs-fieldset-source
    // ════════════════════════════════════════════════════════════════════════
    function initGradientBuilder() {
        const anchor = document.getElementById('designs-fieldset-source')
                    || document.getElementById('backgrounds-accordion');
        if (!anchor || document.getElementById('ep-gradient-btn')) return;

        const triggerBtn = document.createElement('button');
        triggerBtn.id = 'ep-gradient-btn';
        triggerBtn.className = 'btn btn-secondary';
        triggerBtn.style.cssText = 'width:100%;margin-top:8px;font-size:0.82rem;';
        triggerBtn.innerHTML = `<i class="fas fa-paint-brush"></i> ${isAr?'مُنشئ التدرج المخصص':'Custom Gradient Builder'}`;
        anchor.after(triggerBtn);

        let currentDir = '135deg';

        const modal = createModal('ep-gradient-modal',
            `<i class="fas fa-paint-brush" style="color:#4da6ff;"></i> ${isAr?'مُنشئ التدرج':'Gradient Builder'}`,
            `<div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:14px;">
                <div><label class="ep-lbl">${isAr?'لون البداية':'Start'}</label>
                    <input type="color" id="gb-s" value="#2a3d54" style="width:100%;height:40px;border-radius:8px;border:1px solid rgba(255,255,255,0.1);cursor:pointer;"></div>
                <div><label class="ep-lbl">${isAr?'لون النهاية':'End'}</label>
                    <input type="color" id="gb-e" value="#223246" style="width:100%;height:40px;border-radius:8px;border:1px solid rgba(255,255,255,0.1);cursor:pointer;"></div>
            </div>
            <label class="ep-lbl">${isAr?'الاتجاه':'Direction'}</label>
            <div id="gb-dirs" style="display:flex;flex-wrap:wrap;gap:6px;margin-bottom:14px;">
                ${[['135deg','↗'],['to bottom','↓'],['to right','→'],['45deg','↗45°'],['to bottom right','↘']].map(([v,l])=>
                    `<button class="ep-dir" data-v="${v}" style="padding:4px 10px;border-radius:6px;font-size:0.75rem;background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.1);color:var(--text-secondary);cursor:pointer;">${l}</button>`).join('')}
            </div>
            <div id="gb-prev" style="height:70px;border-radius:10px;border:1px solid rgba(255,255,255,0.1);margin-bottom:16px;transition:background .25s;"></div>
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;">
                <button id="gb-front" class="btn btn-primary" style="font-size:0.8rem;">${isAr?'الوجه الأمامي':'Front'}</button>
                <button id="gb-back" class="btn btn-secondary" style="font-size:0.8rem;">${isAr?'الوجه الخلفي':'Back'}</button>
            </div>`
        );

        const preview = () => {
            const s=document.getElementById('gb-s')?.value||'#2a3d54';
            const e=document.getElementById('gb-e')?.value||'#223246';
            const p=document.getElementById('gb-prev');
            if(p) p.style.background=`linear-gradient(${currentDir},${s},${e})`;
        };

        modal.querySelector('#gb-s')?.addEventListener('input', preview);
        modal.querySelector('#gb-e')?.addEventListener('input', preview);
        modal.querySelectorAll('.ep-dir').forEach(b => b.addEventListener('click', ()=>{
            modal.querySelectorAll('.ep-dir').forEach(x=>x.style.borderColor='rgba(255,255,255,0.1)');
            b.style.borderColor='var(--accent-color)'; b.style.color='var(--accent-color)';
            currentDir=b.dataset.v; preview();
        }));

        const applyGrad = (face) => {
            const s=document.getElementById('gb-s')?.value||'#2a3d54';
            const e=document.getElementById('gb-e')?.value||'#223246';
            const sEl=document.getElementById(`${face}-bg-start`);
            const eEl=document.getElementById(`${face}-bg-end`);
            if(sEl){sEl.value=s;sEl.dispatchEvent(new Event('input',{bubbles:true}));}
            if(eEl){eEl.value=e;eEl.dispatchEvent(new Event('input',{bubbles:true}));}
            toast(`✓ ${isAr?'تُطبّق التدرج على':'Gradient applied to'} ${face==='front'?(isAr?'الواجهة الأمامية':'front'):(isAr?'الخلفية':'back')}`, '#2ecc71');
            modal.classList.remove('show');
        };

        modal.querySelector('#gb-front')?.addEventListener('click', ()=>applyGrad('front'));
        modal.querySelector('#gb-back')?.addEventListener('click',  ()=>applyGrad('back'));
        triggerBtn.addEventListener('click', ()=>{ preview(); modal.classList.add('show'); });
    }

    // ════════════════════════════════════════════════════════════════════════
    // 3. ONBOARDING WIZARD — once only
    // ════════════════════════════════════════════════════════════════════════
    function initOnboarding() {
        if (localStorage.getItem('ep_ob_v2')) return;

        const steps = isAr ? [
            { icon:'🎉', t:'مرحباً في محرر بطاقتك الذكية!', b:'سنوجّهك خلال 4 خطوات بسيطة لإنشاء بطاقة أعمال رقمية احترافية.' },
            { icon:'✍️', t:'أدخل اسمك ومسماك الوظيفي', b:'ابحث عن <strong>قسم النص</strong> في الشريط الجانبي الأيسر وأدخل بياناتك.' },
            { icon:'🎨', t:'اختر ثيم يناسبك', b:'في قسم <strong>التصاميم الجاهزة</strong>، أو استخدم <strong>مُنشئ التدرج</strong> لتدرج مخصص.' },
            { icon:'🚀', t:'احفظ وشارك!', b:'اضغط <strong>حفظ ومشاركة</strong> لرؤية بطاقتك وإرسالها للعالم.' },
        ] : [
            { icon:'🎉', t:'Welcome to your Smart Card Editor!', b:'We\'ll guide you through 4 simple steps to create a professional digital business card.' },
            { icon:'✍️', t:'Enter Your Name & Job Title', b:'Find the <strong>Text section</strong> in the left sidebar and fill in your details.' },
            { icon:'🎨', t:'Pick a Theme', b:'Use <strong>Ready Designs</strong>, or click <strong>Gradient Builder</strong> for a custom look.' },
            { icon:'🚀', t:'Save & Share!', b:'Click <strong>Save & Share</strong> to preview your card and send it to the world.' },
        ];

        let step = 0;
        const ov = document.createElement('div');
        ov.id = 'ep-onboard';
        ov.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.85);backdrop-filter:blur(6px);z-index:999999;display:flex;align-items:center;justify-content:center;';

        const render = () => {
            const s = steps[step];
            ov.innerHTML = `
                <div style="background:var(--sidebar-bg,#0d1b2e);border:1px solid rgba(77,166,255,0.25);border-radius:20px;padding:36px 32px;max-width:400px;width:90vw;text-align:center;box-shadow:0 30px 80px rgba(0,0,0,0.6);">
                    <div style="font-size:3rem;margin-bottom:12px;">${s.icon}</div>
                    <h2 style="font-size:1.15rem;font-weight:800;color:var(--text-primary);margin:0 0 10px;">${s.t}</h2>
                    <p style="color:var(--text-secondary);line-height:1.75;margin-bottom:24px;font-size:0.9rem;">${s.b}</p>
                    <div style="display:flex;gap:5px;justify-content:center;margin-bottom:20px;">
                        ${steps.map((_,i)=>`<div style="width:${i===step?'22px':'8px'};height:8px;border-radius:50px;background:${i===step?'#4da6ff':'rgba(255,255,255,0.15)'};transition:all .3s;"></div>`).join('')}
                    </div>
                    <div style="display:flex;gap:8px;justify-content:center;">
                        ${step>0?`<button id="ob-b" class="btn btn-secondary" style="font-size:0.82rem;">${isAr?'السابق':'Back'}</button>`:''}
                        ${step<steps.length-1
                            ? `<button id="ob-n" class="btn btn-primary" style="font-size:0.82rem;">${isAr?'التالي ←':'Next →'}</button>`
                            : `<button id="ob-d" class="btn btn-primary" style="background:linear-gradient(135deg,#2ecc71,#27ae60);font-size:0.82rem;">${isAr?'ابدأ الآن 🚀':'Let\'s Go 🚀'}</button>`}
                        <button id="ob-s" style="background:none;border:none;color:rgba(255,255,255,0.3);font-size:0.75rem;cursor:pointer;font-family:inherit;">${isAr?'تخطي':'Skip'}</button>
                    </div>
                </div>`;
            const done = () => { localStorage.setItem('ep_ob_v2','1'); ov.remove(); };
            ov.querySelector('#ob-n')?.addEventListener('click',()=>{step++;render();});
            ov.querySelector('#ob-b')?.addEventListener('click',()=>{step--;render();});
            ov.querySelector('#ob-d')?.addEventListener('click', done);
            ov.querySelector('#ob-s')?.addEventListener('click', done);
        };

        document.body.appendChild(ov);
        setTimeout(render, 800); // slight delay for page to render
    }

    // ════════════════════════════════════════════════════════════════════════
    // 4. CUSTOM PRESETS — toolbar button
    // ════════════════════════════════════════════════════════════════════════
    function initPresets() {
        const SK = 'ep_presets_v2';
        const load = () => JSON.parse(localStorage.getItem(SK)||'[]');
        const save = p => localStorage.setItem(SK, JSON.stringify(p));

        const modal = createModal('ep-presets-modal',
            `<i class="fas fa-bookmark" style="color:#f1c40f;"></i> ${isAr?'قوالبي المحفوظة':'My Saved Presets'}`,
            `<div id="ep-preset-inner"></div>`);

        const renderInner = () => {
            const presets = load();
            const inner = document.getElementById('ep-preset-inner');
            if (!inner) return;
            inner.innerHTML = `
                <div style="display:flex;gap:8px;margin-bottom:14px;">
                    <input id="ep-pname" placeholder="${isAr?'اسم القالب...':'Preset name...'}"
                        style="flex:1;padding:8px 12px;border-radius:8px;border:1px solid rgba(255,255,255,0.1);background:rgba(255,255,255,0.05);color:var(--text-primary);font-family:inherit;font-size:0.82rem;">
                    <button id="ep-psave" class="btn btn-primary" style="font-size:0.8rem;white-space:nowrap;">${isAr?'حفظ الحالي':'Save Current'}</button>
                </div>
                ${!presets.length
                    ? `<p style="text-align:center;color:var(--text-secondary);padding:20px;font-size:0.85rem;">${isAr?'لا توجد قوالب بعد':'No presets yet'}</p>`
                    : presets.map((p,i)=>`
                        <div style="display:flex;align-items:center;gap:8px;padding:9px 12px;background:rgba(255,255,255,0.04);border-radius:10px;border:1px solid rgba(255,255,255,0.08);margin-bottom:6px;">
                            <div style="width:30px;height:22px;border-radius:5px;background:linear-gradient(135deg,${p.c[0]||'#2a3d54'},${p.c[1]||'#223246'});flex-shrink:0;"></div>
                            <span style="flex:1;font-weight:600;font-size:0.84rem;color:var(--text-primary);">${p.name}</span>
                            <button class="ep-pl btn btn-secondary" data-i="${i}" style="font-size:0.73rem;padding:3px 9px;">${isAr?'تحميل':'Load'}</button>
                            <button class="ep-pd" data-i="${i}" style="background:none;border:none;color:#e74c3c;cursor:pointer;"><i class="fas fa-trash"></i></button>
                        </div>`).join('')}`;

            inner.querySelector('#ep-psave')?.addEventListener('click', () => {
                const name = inner.querySelector('#ep-pname')?.value?.trim();
                if (!name) return toast(isAr?'أدخل اسماً':'Enter a name','#e74c3c');
                const s = getState();
                const c = [s?.inputs?.['front-bg-start']||'#2a3d54', s?.inputs?.['front-bg-end']||'#223246'];
                const presets = load();
                presets.push({ name, c, state:s, date:Date.now() });
                save(presets);
                toast(`✓ ${isAr?`تم حفظ "${name}"`:`"${name}" saved`}`, '#2ecc71');
                renderInner();
            });

            inner.querySelectorAll('.ep-pl').forEach(b => b.addEventListener('click', () => {
                const p = load()[+b.dataset.i];
                if (!p?.state) return;
                try { if(typeof StateManager?.applyState==='function') StateManager.applyState(p.state); } catch(e){}
                toast(`✓ ${isAr?`تم تحميل "${p.name}"`:`"${p.name}" loaded`}`, '#2ecc71');
                modal.classList.remove('show');
            }));

            inner.querySelectorAll('.ep-pd').forEach(b => b.addEventListener('click', () => {
                const presets = load(); presets.splice(+b.dataset.i,1); save(presets); renderInner();
            }));
        };

        setTimeout(() => {
            addToolbarButton('ep-preset-btn','fas fa-bookmark','قوالبي المحفوظة','My Presets', ()=>{ renderInner(); modal.classList.add('show'); }, '#f1c40f');
        }, 800);
    }

    // ════════════════════════════════════════════════════════════════════════
    // 5. AI COLOR SUGGESTIONS — toolbar button + modal
    // ════════════════════════════════════════════════════════════════════════
    function initAIColors() {
        const palettes = [
            { label: isAr?'🩺 طبيب':'🩺 Doctor',       start:'#1a6b5c', end:'#0d3a30' },
            { label: isAr?'⚙️ مهندس':'⚙️ Engineer',    start:'#1a3a6b', end:'#0d1f40' },
            { label: isAr?'🎨 مصمم':'🎨 Designer',      start:'#5b1a8c', end:'#30094f' },
            { label: isAr?'⚖️ محامي':'⚖️ Lawyer',       start:'#3b2009', end:'#1f0e04' },
            { label: isAr?'💰 محاسب':'💰 Accountant',   start:'#0d4a20', end:'#07260f' },
            { label: isAr?'💻 مطور':'💻 Developer',      start:'#0d1f3b', end:'#070d1f' },
            { label: isAr?'📚 معلم':'📚 Teacher',        start:'#1a3270', end:'#0a1840' },
            { label: isAr?'🏠 عقارات':'🏠 Real Estate', start:'#4a2009', end:'#260f04' },
            { label: isAr?'📣 تسويق':'📣 Marketing',    start:'#6b1a1a', end:'#3a0909' },
            { label: isAr?'🏋️ رياضي':'🏋️ Sports',     start:'#1a4d0d', end:'#0a2607' },
            { label: isAr?'🌙 Night':'🌙 Night',         start:'#0d0d1f', end:'#000000' },
            { label: isAr?'🌊 Ocean':'🌊 Ocean',         start:'#0d3b5e', end:'#06182a' },
            { label: isAr?'🔥 Fire':'🔥 Fire',           start:'#6b1a00', end:'#2d0000' },
            { label: isAr?'🌿 Nature':'🌿 Nature',       start:'#1a4d2a', end:'#0a2614' },
            { label: isAr?'🏅 Gold':'🏅 Gold',           start:'#4a3500', end:'#241a00' },
        ];

        const modal = createModal('ep-ai-modal',
            `<i class="fas fa-wand-magic-sparkles" style="color:#a855f7;"></i> ${isAr?'اقتراح ألوان حسب مهنتك':'AI Color Suggestions'}`,
            `<input id="ep-ai-search" placeholder="${isAr?'ابحث عن مهنتك...':'Search profession...'}"
                    style="width:100%;padding:8px 12px;border-radius:8px;border:1px solid rgba(255,255,255,0.1);background:rgba(255,255,255,0.05);color:var(--text-primary);font-family:inherit;font-size:0.82rem;margin-bottom:12px;box-sizing:border-box;">
             <div id="ep-ai-list" style="display:flex;flex-direction:column;gap:6px;max-height:280px;overflow-y:auto;padding-right:4px;">
                ${palettes.map((p,i)=>`
                    <div class="ep-ai-row" data-i="${i}" style="display:flex;align-items:center;gap:10px;padding:9px 12px;background:rgba(255,255,255,0.04);border-radius:10px;border:1px solid rgba(255,255,255,0.08);cursor:pointer;transition:border-color .2s;">
                        <div style="width:38px;height:26px;border-radius:6px;background:linear-gradient(135deg,${p.start},${p.end});flex-shrink:0;"></div>
                        <span style="flex:1;font-weight:600;font-size:0.85rem;color:var(--text-primary);">${p.label}</span>
                        <button class="ep-ai-apply btn btn-primary" style="font-size:0.73rem;padding:3px 10px;">${isAr?'تطبيق':'Apply'}</button>
                    </div>`).join('')}
             </div>`);

        document.getElementById('ep-ai-search')?.addEventListener('input', e => {
            const q = e.target.value.toLowerCase();
            modal.querySelectorAll('.ep-ai-row').forEach(r => {
                r.style.display = !q || r.textContent.toLowerCase().includes(q) ? '' : 'none';
            });
        });

        modal.querySelectorAll('.ep-ai-apply').forEach(btn => btn.addEventListener('click', e => {
            const row = e.target.closest('.ep-ai-row');
            const p = palettes[+row.dataset.i];
            applyColors(p.start, p.end);
            toast(`✓ ${isAr?`تُطبّق لون "${p.label.replace(/^.* /,'')}"`:p.label+' palette applied'}`, '#a855f7');
            modal.classList.remove('show');
        }));

        setTimeout(() => {
            addToolbarButton('ep-ai-btn','fas fa-wand-magic-sparkles','اقتراح ألوان ذكي','AI Colors', ()=>modal.classList.add('show'), '#a855f7');
        }, 900);
    }

    // ════════════════════════════════════════════════════════════════════════
    // 6. CARD QUALITY SCORE — floating circle
    // ════════════════════════════════════════════════════════════════════════
    function initCardScore() {
        if (document.getElementById('ep-score-ring-wrap')) return;
        const wrap = document.createElement('div');
        wrap.id = 'ep-score-ring-wrap';
        wrap.title = isAr ? 'نقاط جودة بطاقتك — انقر للتفاصيل' : 'Card Quality Score — click for details';
        wrap.innerHTML = `
            <svg viewBox="0 0 36 36" style="width:52px;height:52px;transform:rotate(-90deg);">
                <circle cx="18" cy="18" r="15.5" fill="none" stroke="rgba(255,255,255,0.08)" stroke-width="3"/>
                <circle id="ep-ring" cx="18" cy="18" r="15.5" fill="none" stroke="#4da6ff" stroke-width="3"
                    stroke-dasharray="97.4 97.4" stroke-dashoffset="97.4" stroke-linecap="round"
                    style="transition:stroke-dashoffset .8s cubic-bezier(.34,1.2,.64,1),stroke .4s;"/>
            </svg>
            <div style="position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;">
                <span id="ep-ring-num" style="font-weight:800;font-size:0.8rem;color:var(--text-primary);line-height:1;">0</span>
                <span style="font-size:0.52rem;color:var(--text-secondary);">${isAr?'نقطة':'pts'}</span>
            </div>`;
        Object.assign(wrap.style, {
            position:'fixed', bottom:'88px', right:'16px', zIndex:'9500',
            background:'var(--sidebar-bg,#0d1b2e)', border:'1px solid rgba(77,166,255,0.2)',
            borderRadius:'50%', width:'60px', height:'60px',
            cursor:'pointer', boxShadow:'0 4px 20px rgba(0,0,0,0.35)',
            display:'flex', alignItems:'center', justifyContent:'center'
        });

        wrap.addEventListener('click', () => {
            const n = parseInt(document.getElementById('ep-ring-num')?.textContent||'0',10);
            const clr = n>=80?'#2ecc71':n>=50?'#f1c40f':'#e74c3c';
            toast(`${isAr?'جودة البطاقة:':'Card quality:'} ${n}/100 ${n>=80?'🏆':n>=50?'👍':'💡'}`, clr, 4000);
        });

        document.body.appendChild(wrap);

        const update = () => {
            const s = getState(); if (!s) return;
            let sc = 0;
            const v = (k) => s?.inputs?.[k];
            if (v('input-name_ar')&&v('input-name_ar')!=='اسمك الكامل هنا') sc+=20;
            if (v('input-tagline_ar')&&v('input-tagline_ar')!=='المسمى الوظيفي / الشركة') sc+=15;
            if (s.imageUrls?.photo||v('input-photo-url')) sc+=20;
            if (s.dynamic?.phones?.length&&s.dynamic.phones[0]?.value) sc+=10;
            if (s.dynamic?.staticSocial?.whatsapp?.value) sc+=10;
            if (s.dynamic?.staticSocial?.email?.value) sc+=10;
            if (s.dynamic?.social?.length) sc+=10;
            if (s.dynamic?.staticSocial?.website?.value) sc+=5;
            const ring = document.getElementById('ep-ring');
            const num  = document.getElementById('ep-ring-num');
            if (!ring||!num) return;
            ring.style.strokeDashoffset = 97.4 - (97.4*sc/100);
            ring.style.stroke = sc>=80?'#2ecc71':sc>=50?'#f1c40f':'#e74c3c';
            num.textContent = sc;
        };

        update();
        setInterval(update, 3000);
        document.addEventListener('change', ()=>setTimeout(update,500), { passive:true });
    }

    // ════════════════════════════════════════════════════════════════════════
    // 7. BIO ENHANCER — button next to tagline input
    // ════════════════════════════════════════════════════════════════════════
    function initBioEnhancer() {
        const suggestions = isAr ? [
            'متخصص في تقديم أفضل الحلول والخدمات المهنية',
            'خبرة واسعة مع التزام كامل بالجودة والتميز',
            'أحوّل أفكارك إلى نتائج حقيقية وملموسة',
            'شغف لا يتوقف نحو الإتقان والإبداع',
            'أُضيف قيمة حقيقية لكل مشروع أعمل عليه',
        ] : [
            'Delivering excellence in every project',
            'Passionate about results and client satisfaction',
            'Turning ideas into impactful realities',
            'Committed to quality with creative precision',
            'Adding real value to every collaboration',
        ];

        const inject = () => {
            const tagline = document.getElementById('input-tagline_ar') || document.getElementById('input-tagline_en');
            if (!tagline || document.getElementById('ep-bio-btn')) return;

            const btn = document.createElement('button');
            btn.id = 'ep-bio-btn';
            btn.type = 'button';
            btn.innerHTML = `<i class="fas fa-wand-magic-sparkles"></i> ${isAr?'اقتراح نبذة':'Suggest Bio'}`;
            btn.style.cssText = 'display:block;margin-top:5px;font-size:0.73rem;padding:3px 10px;border-radius:50px;background:rgba(168,85,247,.12);border:1px solid rgba(168,85,247,.35);color:#a855f7;cursor:pointer;font-family:inherit;transition:all .2s;';
            btn.onmouseenter = () => btn.style.background='rgba(168,85,247,.22)';
            btn.onmouseleave = () => btn.style.background='rgba(168,85,247,.12)';

            btn.addEventListener('click', () => {
                const pickModal = document.createElement('div');
                pickModal.className = 'ep-overlay show';
                pickModal.innerHTML = `
                    <div class="ep-modal" style="max-width:360px;">
                        <div class="ep-modal-head"><i class="fas fa-wand-magic-sparkles" style="color:#a855f7;"></i> ${isAr?'اقتراحات النبذة':'Bio Suggestions'}</div>
                        <div style="display:flex;flex-direction:column;gap:7px;margin:12px 0;">
                            ${suggestions.map(s=>`<button class="ep-bio-pick" style="padding:9px 12px;background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.08);border-radius:9px;color:var(--text-primary);text-align:${isAr?'right':'left'};cursor:pointer;font-size:0.83rem;line-height:1.5;font-family:inherit;transition:border-color .2s;">${s}</button>`).join('')}
                        </div>
                        <button class="ep-bio-close" style="width:100%;padding:8px;border-radius:8px;background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.1);color:var(--text-secondary);cursor:pointer;font-family:inherit;">${isAr?'إغلاق':'Close'}</button>
                    </div>`;
                document.body.appendChild(pickModal);
                pickModal.querySelectorAll('.ep-bio-pick').forEach(b => {
                    b.onmouseenter = ()=>b.style.borderColor='#a855f7';
                    b.onmouseleave = ()=>b.style.borderColor='rgba(255,255,255,0.08)';
                    b.addEventListener('click', ()=>{
                        tagline.value = b.textContent;
                        tagline.dispatchEvent(new Event('input',{bubbles:true}));
                        toast(`✓ ${isAr?'تم تطبيق النبذة':'Bio applied'}`, '#a855f7');
                        pickModal.remove();
                    });
                });
                pickModal.querySelector('.ep-bio-close').addEventListener('click', ()=>pickModal.remove());
                pickModal.addEventListener('click', e=>{ if(e.target===pickModal) pickModal.remove(); });
            });

            tagline.parentNode.appendChild(btn);
        };

        setTimeout(inject, 1500);
    }

    // ════════════════════════════════════════════════════════════════════════
    // 8. ANALYTICS PANEL
    // ════════════════════════════════════════════════════════════════════════
    function initAnalytics() {
        const params = new URLSearchParams(window.location.search);
        const cardId = params.get('id');
        const views  = cardId ? parseInt(localStorage.getItem(`vc_${cardId}`)||'0',10) : 0;

        const sidebar = document.getElementById('panel-design');
        if (!sidebar || document.getElementById('ep-analytics')) return;

        const panel = document.createElement('div');
        panel.id = 'ep-analytics';
        panel.innerHTML = `
            <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px;">
                <span style="font-weight:700;font-size:0.82rem;color:var(--text-primary);">
                    <i class="fas fa-chart-bar" style="color:#f1c40f;margin-${isAr?'left':'right'}:5px;"></i>
                    ${isAr?'إحصاءات البطاقة':'Card Analytics'}
                </span>
                <span style="font-size:0.68rem;background:rgba(46,204,113,0.15);color:#2ecc71;padding:2px 8px;border-radius:50px;border:1px solid rgba(46,204,113,0.25);">● ${isAr?'مباشر':'Live'}</span>
            </div>
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;">
                <div style="background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.08);border-radius:9px;padding:10px;text-align:center;">
                    <div style="font-size:1.5rem;font-weight:800;color:#4da6ff;">${views}</div>
                    <div style="font-size:0.72rem;color:var(--text-secondary);">${isAr?'مشاهدة':'Views'}</div>
                </div>
                <div style="background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.08);border-radius:9px;padding:10px;text-align:center;">
                    <div style="font-size:1.5rem;font-weight:800;color:#2ecc71;">${cardId?'✓':'—'}</div>
                    <div style="font-size:0.72rem;color:var(--text-secondary);">${isAr?'منشور':'Published'}</div>
                </div>
            </div>
            ${!cardId?`<p style="font-size:0.72rem;color:var(--text-secondary);text-align:center;margin-top:6px;">${isAr?'احفظ البطاقة لرؤية الإحصاءات':'Save card to see analytics'}</p>`:''}`;
        Object.assign(panel.style, {
            padding:'12px 14px', marginBottom:'10px',
            background:'rgba(255,255,255,0.04)', borderRadius:'10px',
            border:'1px solid rgba(255,255,255,0.08)'
        });

        // Insert after completeness bar or at top of sidebar
        const scoreBar = document.getElementById('ep-score-bar');
        if (scoreBar) scoreBar.after(panel);
        else sidebar.prepend(panel);
    }

    // ════════════════════════════════════════════════════════════════════════
    // SHARED CSS
    // ════════════════════════════════════════════════════════════════════════
    function injectCSS() {
        if (document.getElementById('ep-css')) return;
        const s = document.createElement('style');
        s.id = 'ep-css';
        s.textContent = `
        .ep-overlay {
            position:fixed;inset:0;background:rgba(0,0,0,0.75);backdrop-filter:blur(8px);
            z-index:99990;display:flex;align-items:center;justify-content:center;
            opacity:0;pointer-events:none;transition:opacity .3s;
        }
        .ep-overlay.show { opacity:1;pointer-events:all; }
        .ep-modal {
            background:var(--sidebar-bg,#0d1b2e);border:1px solid rgba(77,166,255,0.2);
            border-radius:18px;padding:24px;width:90vw;max-width:420px;
            box-shadow:0 24px 60px rgba(0,0,0,0.6);
            transform:translateY(18px) scale(.97);
            transition:transform .35s cubic-bezier(.34,1.3,.64,1);
            max-height:88vh;overflow-y:auto;
        }
        .ep-overlay.show .ep-modal { transform:translateY(0) scale(1); }
        .ep-modal-head {
            display:flex;align-items:center;gap:10px;font-weight:800;font-size:1.05rem;
            color:var(--text-primary);margin-bottom:16px;
        }
        .ep-modal-body { color:var(--text-primary); }
        .ep-lbl { display:block;font-size:0.76rem;font-weight:600;color:var(--text-secondary);margin-bottom:5px; }
        `;
        document.head.appendChild(s);
    }

    // ════════════════════════════════════════════════════════════════════════
    // INIT
    // ════════════════════════════════════════════════════════════════════════
    const run = () => {
        injectCSS();
        // Sidebar-injected features need the sidebar to exist
        const sidebar = document.getElementById('panel-design');
        if (!sidebar) { setTimeout(run, 500); return; }

        initCompletenessScore();
        initAnalytics();
        initGradientBuilder();
        initPresets();
        initAIColors();
        initCardScore();
        initBioEnhancer();
        // Onboarding last (non-blocking)
        setTimeout(initOnboarding, 1200);
    };

    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', run);
    else run();

})();
