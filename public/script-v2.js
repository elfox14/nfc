/**
 * Editor V2 - Core Controller
 */
class EditorV2 {
    constructor() {
        this.designId = new URLSearchParams(window.location.search).get('id');
        this.designData = null;
        this.currentSide = 'front';
        this.selectedElementId = null;
        this.zoom = 1;
        this.isGridActive = false;
        this.snapSize = 10;
        this.lastSavedData = null;

        // History Stack
        this.history = [];
        this.redoStack = [];

        this.init();
    }

    async init() {
        console.log('Initializing Editor V2...');
        this.bindEvents();
        await this.loadDesign();
        this.saveHistory();
        this.render();
        this.renderIdentityTab();
        this.startAutosave();
        this.showWelcomeHint();
        this.autoOptimizeMobileZoom();
    }

    autoOptimizeMobileZoom() {
        if (window.innerWidth < 900) {
            this.zoom = 0.6; // Start with a smaller zoom on mobile
            this.updateZoom();
        }
    }

    showWelcomeHint() {
        if (localStorage.getItem('v2_hint_seen')) return;
        const hint = document.createElement('div');
        hint.style = "position:fixed; bottom:20px; left:100px; background:var(--accent-primary); color:white; padding:15px; border-radius:12px; z-index:2000; box-shadow:0 10px 30px rgba(0,0,0,0.5); animation: fadeIn 0.5s ease-out;";
        hint.innerHTML = `<strong>نصيحة سريعة:</strong> ابدأ بإضافة نص أو صورة من الشريط الجانبي الأيسر! <br> <button id="close-hint" style="background:white; color:black; border:none; padding:4px 8px; border-radius:4px; margin-top:8px; cursor:pointer;">فهمت</button>`;
        document.body.appendChild(hint);
        document.getElementById('close-hint').onclick = () => {
            hint.remove();
            localStorage.setItem('v2_hint_seen', 'true');
        };
    }

    async loadDesign() {
        if (!this.designId) {
            this.designData = {
                schemaVersion: 2,
                v2: {
                    canvas: { width: 510, height: 330, baseWidth: 510 },
                    sides: {
                        front: {
                            elements: [
                                {
                                    id: 'default-name', type: 'text', preset: 'name',
                                    contentAR: 'إسمك هنا', contentEN: 'Your Name Here', bilingual: true,
                                    transform: { x: 50, y: 140, w: 300, h: 50 },
                                    style: { color: '#000000', fontSize: 28, fontWeight: 'bold', textAlign: 'center' }
                                }
                            ]
                        },
                        back: { elements: [] }
                    }
                }
            };
            this.lastSavedData = JSON.stringify(this.designData);
            return;
        }

        // Check if it's a pre-made template ID
        if (window.V2_TEMPLATES && window.V2_TEMPLATES.some(t => t.id === this.designId)) {
            const template = window.V2_TEMPLATES.find(t => t.id === this.designId);
            this.designData = {
                schemaVersion: 2,
                v2: {
                    canvas: { width: 510, height: 330, baseWidth: 510 },
                    ...JSON.parse(JSON.stringify(template.data))
                }
            };
            this.lastSavedData = JSON.stringify(this.designData);
            return;
        }
        try {
            const response = await fetch(`api/get-design/${this.designId}?v2=true`);
            if (!response.ok) throw new Error('Design not found');
            const data = await response.json();

            if (data && !data.v2 && data.state) {
                console.log('Legacy V1 design detected, migrating...');
                this.designData = this.migrateV1toV2(data);
            } else if (data && data.v2) {
                this.designData = data;
            } else {
                throw new Error('Invalid design data');
            }

            this.lastSavedData = JSON.stringify(this.designData);
            this.render();
        } catch (err) {
            console.error('Load Error:', err);
            // Fallback to default if load fails
            this.designId = null;
            await this.loadDesign();
            this.render();
        }
    }

    migrateV1toV2(oldData) {
        const state = oldData.state || {};
        const inputs = state.inputs || {};
        const isVertical = inputs['layout-select-visual'] === 'vertical';

        const v2Design = {
            schemaVersion: 2,
            v2: {
                canvas: {
                    width: isVertical ? 330 : 510,
                    height: isVertical ? 510 : 330,
                    baseWidth: isVertical ? 330 : 510
                },
                sides: {
                    front: { elements: [] },
                    back: { elements: [] }
                }
            }
        };

        const bgW = isVertical ? 330 : 510;
        const bgH = isVertical ? 510 : 330;

        // Migrate Backgrounds
        if (inputs['front-bg-start']) {
            v2Design.v2.sides.front.elements.push({
                id: 'bg-front', type: 'shape',
                transform: { x: 0, y: 0, w: bgW, h: bgH },
                style: { backgroundColor: inputs['front-bg-start'] }
            });
        }
        if (inputs['back-bg-start']) {
            v2Design.v2.sides.back.elements.push({
                id: 'bg-back', type: 'shape',
                transform: { x: 0, y: 0, w: bgW, h: bgH },
                style: { backgroundColor: inputs['back-bg-start'] }
            });
        }

        // Migrate Name
        if (inputs['input-name_ar'] || inputs['input-name_en']) {
            v2Design.v2.sides.front.elements.push({
                id: 'migrated-name', type: 'text', preset: 'name',
                contentAR: inputs['input-name_ar'] || '',
                contentEN: inputs['input-name_en'] || '',
                bilingual: true,
                transform: { x: 40, y: 100, w: 400, h: 50 },
                style: { color: inputs['name-color'] || '#000000', fontSize: inputs['name-font-size'] || 28, fontWeight: 'bold' }
            });
        }

        // Migrate Job Title
        if (inputs['input-tagline_ar'] || inputs['input-tagline_en']) {
            v2Design.v2.sides.front.elements.push({
                id: 'migrated-job', type: 'text', preset: 'job',
                contentAR: inputs['input-tagline_ar'] || '',
                contentEN: inputs['input-tagline_en'] || '',
                bilingual: true,
                transform: { x: 40, y: 155, w: 400, h: 30 },
                style: { color: inputs['tagline-color'] || '#666666', fontSize: inputs['tagline-font-size'] || 16 }
            });
        }

        // Migrate Logo
        if (inputs['input-logo']) {
            v2Design.v2.sides.front.elements.push({
                id: 'migrated-logo', type: 'image',
                src: inputs['input-logo'],
                transform: { x: 40, y: 30, w: inputs['logo-size'] ? inputs['logo-size'] * 4 : 80, h: inputs['logo-size'] ? inputs['logo-size'] * 4 : 80 }
            });
        }

        // Migrate Photo
        if (inputs['input-photo-url']) {
            v2Design.v2.sides.front.elements.push({
                id: 'migrated-photo', type: 'avatar', preset: 'avatar',
                src: inputs['input-photo-url'],
                transform: { x: 380, y: 30, w: inputs['photo-size'] ? inputs['photo-size'] * 3 : 80, h: inputs['photo-size'] ? inputs['photo-size'] * 3 : 80 },
                style: { borderRadius: inputs['photo-shape'] === 'circle' ? '50%' : '8px' }
            });
        }

        // Migrate Social & Contacts
        let contactY = 220;
        const dynamic = state.dynamic || {};

        // Phones
        if (dynamic.phones) {
            dynamic.phones.forEach((p, idx) => {
                v2Design.v2.sides.front.elements.push({
                    id: `migrated-phone-${idx}`, type: 'text',
                    content: p.value,
                    transform: { x: 40, y: contactY, w: 200, h: 25 },
                    style: { fontSize: 14, color: '#000000' }
                });
                contactY += 30;
            });
        }

        // Static Social (Email, Website)
        if (dynamic.staticSocial) {
            Object.entries(dynamic.staticSocial).forEach(([key, data]) => {
                if (data.value) {
                    v2Design.v2.sides.front.elements.push({
                        id: `migrated-${key}`, type: 'text',
                        content: data.value,
                        transform: { x: 40, y: contactY, w: 300, h: 25 },
                        style: { fontSize: 14, color: '#000000' }
                    });
                    contactY += 30;
                }
            });
        }

        // Add default QR to back
        v2Design.v2.sides.back.elements.push({
            id: 'migrated-qr', type: 'qr', preset: 'qr',
            transform: { x: 180, y: 90, w: 150, h: 150 },
            content: `https://mcprim.com/v/${oldData.shortId || this.designId}`
        });

        // Merge rest of old data (except state and public things that moved to v2)
        const migrated = { ...oldData, ...v2Design };
        return migrated;
    }

    bindEvents() {
        // Tab switching
        document.querySelectorAll('.tab-link').forEach(btn => {
            btn.addEventListener('click', (e) => {
                document.querySelectorAll('.tab-link').forEach(b => b.classList.remove('active'));
                document.querySelectorAll('.tab-content').forEach(c => c.classList.add('hidden'));
                e.target.classList.add('active');
                document.getElementById(`tab-${e.target.dataset.tab}`).classList.remove('hidden');
                if (e.target.dataset.tab === 'layers') this.renderLayers();
                if (e.target.dataset.tab === 'templates') this.renderTemplates();
                if (e.target.dataset.tab === 'identity') this.renderIdentityTab();
            });
        });

        // Side Toggle
        document.querySelectorAll('.side-toggle button').forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.currentSide = e.target.dataset.side;
                document.querySelectorAll('.side-toggle button').forEach(b => b.classList.remove('active'));
                e.target.classList.add('active');
                this.render(); this.deselect();
            });
        });

        // Zoom & History
        document.getElementById('zoom-in').onclick = () => { this.zoom += 0.1; this.updateZoom(); };
        document.getElementById('zoom-out').onclick = () => { this.zoom = Math.max(0.5, this.zoom - 0.1); this.updateZoom(); };
        document.getElementById('btn-undo').onclick = () => this.undo();
        document.getElementById('btn-redo').onclick = () => this.redo();

        // Tools
        const tools = ['add-name', 'add-job', 'text', 'image', 'avatar', 'qr', 'social', 'shape'];
        tools.forEach(t => {
            const btn = document.querySelector(`[data-tool="${t}"]`);
            if (btn) btn.onclick = () => this.addElement(t);
        });

        document.getElementById('tool-layers-toggle').onclick = () => {
            document.querySelector('[data-tab="layers"]').click();
        };

        document.querySelector('[data-tool="grid"]').onclick = (e) => {
            this.isGridActive = !this.isGridActive;
            e.currentTarget.classList.toggle('active', this.isGridActive);
            document.querySelector('.v2-canvas-area').classList.toggle('grid-active', this.isGridActive);
        };

        // Canvas events
        document.getElementById('canvas-viewport').onclick = (e) => {
            if (e.target.id === 'canvas-viewport' || e.target.classList.contains('v2-canvas-area')) this.deselect();
        };

        // Properties
        ['prop-x', 'prop-y', 'prop-w', 'prop-h'].forEach(id => {
            document.getElementById(id).onchange = () => this.saveHistory();
            document.getElementById(id).oninput = (e) => this.handlePropertyChange(e);
        });

        // Mobile Sheet Close
        document.getElementById('close-sheet-btn').onclick = () => this.deselect();
        document.getElementById('mobile-backdrop').onclick = () => this.deselect();

        this.initInteraction();
    }

    initInteraction() {
        const selectionLayer = document.getElementById('canvas-selection-layer');
        selectionLayer.addEventListener('mousedown', (e) => this.handleDragStart(e, true));
        selectionLayer.addEventListener('touchstart', (e) => this.handleDragStart(e.touches[0], true), { passive: false });

        document.getElementById('canvas-elements-layer').addEventListener('mousedown', (e) => this.handleDragStart(e, false));
        document.getElementById('canvas-elements-layer').addEventListener('touchstart', (e) => this.handleDragStart(e.touches[0], false), { passive: false });

        window.addEventListener('mousemove', (e) => this.handleDragMove(e));
        window.addEventListener('touchmove', (e) => this.handleDragMove(e.touches[0]), { passive: false });

        window.addEventListener('mouseup', () => this.handleDragEnd());
        window.addEventListener('touchend', () => this.handleDragEnd());
    }

    handleDragStart(e, isResizingEvent) {
        const handle = e.target.closest('.handle');
        const elNode = e.target.closest('.v2-element');

        if (isResizingEvent && !handle) return;
        if (!isResizingEvent && !elNode) return;

        if (isResizingEvent) {
            this.isResizing = true;
            this.currentHandle = handle.getAttribute('data-handle-type');
        } else {
            const id = elNode.getAttribute('data-v2-id');
            this.selectElement(id);
            this.isDragging = true;
        }

        this.targetEl = this.getSelectedElementData();
        if (!this.targetEl) return;

        this.startX = e.clientX;
        this.startY = e.clientY;
        this.originalTransform = { ...this.targetEl.transform };
    }

    handleDragMove(e) {
        if ((!this.isDragging && !this.isResizing) || !this.targetEl) return;

        const dx = (e.clientX - this.startX) / this.zoom;
        const dy = (e.clientY - this.startY) / this.zoom;

        if (this.isDragging) {
            let newX = this.originalTransform.x + dx;
            let newY = this.originalTransform.y + dy;
            if (this.isGridActive) {
                newX = Math.round(newX / this.snapSize) * this.snapSize;
                newY = Math.round(newY / this.snapSize) * this.snapSize;
            }
            this.targetEl.transform.x = newX;
            this.targetEl.transform.y = newY;
        } else if (this.isResizing) {
            this.handleResize(this.targetEl, this.currentHandle, dx, dy, this.originalTransform);
        }

        this.render();
    }

    handleDragEnd() {
        if (this.isDragging || this.isResizing) {
            this.saveHistory();
            this.isDragging = false;
            this.isResizing = false;
            this.currentHandle = null;
            this.targetEl = null;
        }
    }

    handleResize(el, type, dx, dy, orig) {
        let { x, y, w, h } = orig;

        if (type.includes('r')) w = Math.max(10, w + dx);
        if (type.includes('b')) h = Math.max(10, h + dy);
        if (type.includes('l')) {
            const newW = Math.max(10, w - dx);
            x = x + (w - newW);
            w = newW;
        }
        if (type.includes('t')) {
            const newH = Math.max(10, h - dy);
            y = y + (h - newH);
            h = newH;
        }

        if (this.isGridActive) {
            el.transform.x = Math.round(x / this.snapSize) * this.snapSize;
            el.transform.y = Math.round(y / this.snapSize) * this.snapSize;
            el.transform.w = Math.round(w / this.snapSize) * this.snapSize;
            el.transform.h = Math.round(h / this.snapSize) * this.snapSize;
        } else {
            el.transform.x = x;
            el.transform.y = y;
            el.transform.w = w;
            el.transform.h = h;
        }
    }

    startAutosave() {
        setInterval(() => {
            if (this.designData && JSON.stringify(this.designData) !== this.lastSavedData) {
                console.log('Autosaving...');
                this.saveDesign(true);
            }
        }, 30000); // 30s
    }

    saveHistory() {
        if (!this.designData) return;
        const snapshot = JSON.stringify(this.designData);
        if (this.history.length > 0 && this.history[this.history.length - 1] === snapshot) return;
        this.history.push(snapshot);
        if (this.history.length > 50) this.history.shift();
        this.redoStack = [];
    }

    undo() {
        if (this.history.length <= 1) return;
        this.redoStack.push(this.history.pop());
        this.designData = JSON.parse(this.history[this.history.length - 1]);
        this.render();
    }

    redo() {
        if (this.redoStack.length === 0) return;
        const snapshot = this.redoStack.pop();
        this.history.push(snapshot);
        this.designData = JSON.parse(snapshot);
        this.render();
    }

    render() {
        if (!this.designData?.v2) return;
        const container = document.getElementById('canvas-elements-layer');
        RendererV2.render(this.designData.v2.sides[this.currentSide], container, this.designData.v2.canvas);
        container.querySelectorAll('.v2-element').forEach(el => {
            el.onclick = (e) => { e.stopPropagation(); this.selectElement(el.getAttribute('data-v2-id')); };
        });
        this.updateSelectionUI();
        this.renderLayers();
        this.renderSelectionHandles();
    }

    updateZoom() {
        document.getElementById('v2-card-canvas').style.transform = `scale(${this.zoom})`;
        document.getElementById('zoom-level').innerText = Math.round(this.zoom * 100) + '%';
    }

    selectElement(id) {
        this.selectedElementId = id;
        this.updateSelectionUI();
        this.showProperties();
    }

    deselect() {
        this.selectedElementId = null;
        this.updateSelectionUI();
        document.getElementById('properties-panel').classList.add('hidden');
        document.getElementById('no-selection-msg').classList.remove('hidden');

        // Mobile Sheet Hide
        document.querySelector('.v2-properties-sidebar').classList.remove('active');
        document.getElementById('mobile-backdrop').classList.remove('active');

        this.renderLayers();
    }

    showProperties() {
        document.getElementById('no-selection-msg').classList.add('hidden');
        document.getElementById('properties-panel').classList.remove('hidden');

        // Mobile Sheet Show
        if (window.innerWidth < 900) {
            document.querySelector('.v2-properties-sidebar').classList.add('active');
            document.getElementById('mobile-backdrop').classList.add('active');
        }

        const el = this.getSelectedElementData();
        if (!el) return;

        // Populate basic props
        document.getElementById('prop-x').value = Math.round(el.transform.x);
        document.getElementById('prop-y').value = Math.round(el.transform.y);
        document.getElementById('prop-w').value = Math.round(el.transform.w);
        document.getElementById('prop-h').value = Math.round(el.transform.h);
    }

    renderTemplates() {
        const grid = document.getElementById('templates-v2-grid');
        if (!grid) return;
        grid.innerHTML = '';

        if (!window.V2_TEMPLATES) return;

        window.V2_TEMPLATES.forEach(tmp => {
            const card = document.createElement('div');
            card.className = 'template-v2-card';
            card.innerHTML = `
                <div class="thumb">${tmp.thumbnail}</div>
                <span>${tmp.name}</span>
            `;
            card.onclick = () => this.confirmApplyTemplate(tmp.id);
            grid.appendChild(card);
        });
    }

    confirmApplyTemplate(id) {
        if (confirm('هل أنت متأكد؟ سيتم استبدال التصميم الحالي بالقالب المختار.')) {
            this.applyTemplate(id);
        }
    }

    applyTemplate(id) {
        const template = window.V2_TEMPLATES.find(t => t.id === id);
        if (!template) return;

        // Deep clone template data
        const newData = JSON.parse(JSON.stringify(template.data));

        // Preserve core metadata if editing existing
        if (this.designData && this.designData.v2) {
            this.designData.v2.sides = newData.sides;
        } else {
            this.designData = {
                schemaVersion: 2,
                v2: {
                    canvas: { width: 510, height: 330, baseWidth: 510 },
                    ...newData
                }
            };
        }

        this.saveHistory();
        this.render();

        // Switch to properties tab after applying
        document.querySelector('[data-tab="properties"]').click();
    }

    updateSelectionUI() {
        document.querySelectorAll('.v2-element').forEach(el => {
            el.classList.toggle('selected', el.getAttribute('data-v2-id') === this.selectedElementId);
        });
        this.renderSelectionHandles();
    }

    renderSelectionHandles() {
        const layer = document.getElementById('canvas-selection-layer');
        if (!layer) return;
        layer.innerHTML = '';

        const el = this.getSelectedElementData();
        if (!el || !el.visible) return;

        const box = document.createElement('div');
        box.className = 'selection-box';

        // Transform the box to match element
        const x = el.transform.x;
        const y = el.transform.y;
        box.style.width = el.transform.w + 'px';
        box.style.height = el.transform.h + 'px';
        box.style.transform = `translate(${x}px, ${y}px) rotate(${el.transform.rotation || 0}deg)`;

        // Add handles
        const handleTypes = ['tl', 'tr', 'bl', 'br', 'tm', 'bm', 'lm', 'rm'];
        handleTypes.forEach(type => {
            const h = document.createElement('div');
            h.className = `handle ${type}`;
            h.setAttribute('data-handle-type', type);
            box.appendChild(h);
        });

        layer.appendChild(box);
    }

    addElement(type) {
        const id = 'el_' + Math.random().toString(36).substr(2, 9);
        const defaults = {
            'add-name': { preset: 'name', content: 'الاسم الكريم', contentEN: 'Your Name', bilingual: true, style: { color: '#ffffff', fontSize: 28, fontWeight: 'bold' }, transform: { w: 300, h: 45 } },
            'add-job': { preset: 'job', content: 'المسمى الوظيفي', contentEN: 'Job Title', bilingual: true, style: { color: '#4da6ff', fontSize: 18 }, transform: { w: 250, h: 30 } },
            text: { content: 'نص جديد', style: { color: '#000000', fontSize: 20 }, transform: { w: 150, h: 40 } },
            image: { src: '/placeholder.png', transform: { w: 100, h: 100 } },
            avatar: { preset: 'avatar', src: '/placeholder-user.png', transform: { w: 100, h: 100 }, style: { borderRadius: '50%' } },
            qr: { preset: 'qr', content: 'https://mcprim.com', transform: { w: 80, h: 80 } },
            social: { platform: 'whatsapp', content: 'https://wa.me/xxx', style: { backgroundColor: '#25D366', color: '#ffffff' }, transform: { w: 40, h: 40 } },
            shape: { style: { backgroundColor: '#4da6ff' }, transform: { w: 100, h: 100 } }
        };
        const typeMap = { 'add-name': 'text', 'add-job': 'text' };
        const newType = typeMap[type] || type;

        const newEl = {
            id, type: newType, preset: defaults[type]?.preset, visible: true,
            transform: { x: 50, y: 50, rotation: 0, ...(defaults[type]?.transform || {}) },
            style: defaults[type]?.style || {},
            content: defaults[type]?.content || '',
            contentAR: defaults[type]?.content || '',
            contentEN: defaults[type]?.contentEN || 'New Item',
            bilingual: defaults[type]?.bilingual || false,
            src: defaults[type]?.src || '',
            platform: defaults[type]?.platform || '',
            action: { type: 'url', value: defaults[type]?.content || '' }
        };
        this.designData.v2.sides[this.currentSide].elements.push(newEl);
        this.saveHistory();
        this.render();
        this.selectElement(id);
    }

    renderLayers() {
        const list = document.getElementById('layers-list');
        if (!list) return;
        list.innerHTML = '';
        [...(this.designData.v2.sides[this.currentSide].elements || [])].reverse().forEach(el => {
            const item = document.createElement('div');
            item.className = `layer-item ${el.id === this.selectedElementId ? 'active' : ''}`;
            item.innerHTML = `<div class="layer-info"><i class="${this.getTypeIcon(el.type)}"></i> <span>${el.name || el.type}</span></div>
                <div class="layer-actions">
                    <button class="layer-action-btn" data-action="toggle-vis"><i class="fas fa-eye${el.visible ? '' : '-slash'}"></i></button>
                    <button class="layer-action-btn" data-action="move-up"><i class="fas fa-chevron-up"></i></button>
                    <button class="layer-action-btn" data-action="move-down"><i class="fas fa-chevron-down"></i></button>
                </div>`;
            item.onclick = (e) => { e.stopPropagation(); this.selectElement(el.id); };
            item.querySelector('[data-action="toggle-vis"]').onclick = (e) => { e.stopPropagation(); el.visible = !el.visible; this.render(); this.saveHistory(); };
            item.querySelector('[data-action="move-up"]').onclick = (e) => { e.stopPropagation(); this.moveElement(el.id, 1); };
            item.querySelector('[data-action="move-down"]').onclick = (e) => { e.stopPropagation(); this.moveElement(el.id, -1); };
            list.appendChild(item);
        });
    }

    getTypeIcon(type) {
        const ic = { text: 'fas fa-font', image: 'fas fa-image', avatar: 'fas fa-user-circle', qr: 'fas fa-qrcode', shape: 'fas fa-shapes' };
        return ic[type] || 'fas fa-box';
    }

    moveElement(id, dir) {
        const els = this.designData.v2.sides[this.currentSide].elements;
        const i = els.findIndex(e => e.id === id);
        if (i === -1 || i + dir < 0 || i + dir >= els.length) return;
        [els[i], els[i + dir]] = [els[i + dir], els[i]];
        this.render(); this.saveHistory();
    }

    showProperties() {
        const el = this.getSelectedElementData();
        if (!el) return;
        document.getElementById('no-selection-msg').classList.add('hidden');
        document.getElementById('properties-panel').classList.remove('hidden');
        ['x', 'y', 'w', 'h'].forEach(p => document.getElementById('prop-' + p).value = Math.round(el.transform[p]));
        this.renderDynamicProperties(el);
    }

    getSelectedElementData() { return this.designData.v2.sides[this.currentSide].elements.find(e => e.id === this.selectedElementId); }

    renderDynamicProperties(el) {
        const container = document.getElementById('dynamic-properties');
        container.innerHTML = '';

        if (el.type === 'text') {
            const contentGroup = document.createElement('div');
            contentGroup.className = 'prop-group';
            contentGroup.innerHTML = `<h4>المحتوى</h4>
                <div class="prop-row"><label><input type="checkbox" id="prop-bilingual" ${el.bilingual ? 'checked' : ''}> ثنائي اللغة (AR/EN)</label></div>
                <div id="text-inputs">
                    ${el.bilingual ? `
                        <div class="prop-row"><label>العربية</label><textarea id="prop-content-ar">${el.contentAR || ''}</textarea></div>
                        <div class="prop-row"><label>English</label><textarea id="prop-content-en">${el.contentEN || ''}</textarea></div>
                    ` : `
                        <div class="prop-row"><label>المحتوى</label><textarea id="prop-content">${el.content || ''}</textarea></div>
                    `}
                </div>`;
            container.appendChild(contentGroup);

            const styleGroup = document.createElement('div');
            styleGroup.className = 'prop-group';
            styleGroup.innerHTML = `<h4>التنسيق</h4>
                <div class="prop-row"><label>اللون</label><input type="color" id="prop-color" value="${el.style.color || '#000000'}"></div>
                <div class="prop-row"><label>حجم الخط</label><input type="number" id="prop-font-size" value="${el.style.fontSize || 20}"></div>`;
            container.appendChild(styleGroup);

            const cb = contentGroup.querySelector('#prop-bilingual');
            cb.onchange = (e) => { el.bilingual = e.target.checked; this.renderDynamicProperties(el); this.render(); this.saveHistory(); this.renderIdentityTab(); };

            if (el.bilingual) {
                contentGroup.querySelector('#prop-content-ar').oninput = (e) => { el.contentAR = e.target.value; this.render(); this.renderIdentityTab(); };
                contentGroup.querySelector('#prop-content-ar').onchange = () => this.saveHistory();
                contentGroup.querySelector('#prop-content-en').oninput = (e) => { el.contentEN = e.target.value; this.render(); this.renderIdentityTab(); };
                contentGroup.querySelector('#prop-content-en').onchange = () => this.saveHistory();
            } else {
                contentGroup.querySelector('#prop-content').oninput = (e) => { el.content = e.target.value; this.render(); this.renderIdentityTab(); };
                contentGroup.querySelector('#prop-content').onchange = () => this.saveHistory();
            }
            styleGroup.querySelector('#prop-color').oninput = (e) => { el.style.color = e.target.value; this.render(); };
            styleGroup.querySelector('#prop-color').onchange = () => this.saveHistory();
            styleGroup.querySelector('#prop-font-size').oninput = (e) => { el.style.fontSize = parseInt(e.target.value); this.render(); };
            styleGroup.querySelector('#prop-font-size').onchange = () => this.saveHistory();
        } else if (['image', 'avatar', 'logo'].includes(el.type)) {
            const contentGroup = document.createElement('div');
            contentGroup.className = 'prop-group';
            contentGroup.innerHTML = `<h4>المحتوى</h4>
                <div class="prop-row"><label>الرابط (URL)</label><input type="text" id="prop-src" value="${el.src}"></div>
                <div class="prop-row"><button class="btn-primary" id="btn-upload-image" style="width:100%; padding:8px;"><i class="fas fa-upload"></i> رفع صورة</button></div>
                <input type="file" id="image-file-input" style="display:none" accept="image/*">`;
            container.appendChild(contentGroup);

            const styleGroup = document.createElement('div');
            styleGroup.className = 'prop-group';
            styleGroup.innerHTML = `<h4>المظهر</h4>
                <div class="prop-row"><label>استدارة الأطراف</label><input type="number" id="prop-radius" value="${parseInt(el.style.borderRadius) || 0}"></div>`;
            container.appendChild(styleGroup);

            contentGroup.querySelector('#prop-src').oninput = (e) => { el.src = e.target.value; this.render(); this.renderIdentityTab(); };
            contentGroup.querySelector('#prop-src').onchange = () => this.saveHistory();

            const uploadBtn = contentGroup.querySelector('#btn-upload-image');
            const fileInput = contentGroup.querySelector('#image-file-input');
            uploadBtn.onclick = () => fileInput.click();
            fileInput.onchange = async (e) => {
                const file = e.target.files[0];
                if (!file) return;
                uploadBtn.disabled = true;
                uploadBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> جاري الرفع...';
                try {
                    const formData = new FormData();
                    formData.append('image', file);
                    const res = await fetch('/api/upload', { method: 'POST', body: formData });
                    const data = await res.json();
                    if (data.url) {
                        el.src = data.url;
                        this.render();
                        this.renderDynamicProperties(el);
                        this.saveHistory();
                        this.renderIdentityTab();
                    }
                } catch (err) { console.error(err); alert('فشل الرفع'); }
                uploadBtn.disabled = false;
                uploadBtn.innerHTML = '<i class="fas fa-upload"></i> رفع صورة';
            };

            styleGroup.querySelector('#prop-radius').oninput = (e) => { el.style.borderRadius = e.target.value + 'px'; this.render(); };
            styleGroup.querySelector('#prop-radius').onchange = () => this.saveHistory();
        } else if (el.type === 'qr') {
            const contentGroup = document.createElement('div');
            contentGroup.className = 'prop-group';
            contentGroup.innerHTML = `<h4>محتوى الرمز</h4><div class="prop-row"><label>الرابط وجهة الاتصال</label><input type="text" id="prop-qr-content" value="${el.content}"></div>`;
            container.appendChild(contentGroup);

            contentGroup.querySelector('#prop-qr-content').oninput = (e) => { el.content = e.target.value; this.render(); this.renderIdentityTab(); };
            contentGroup.querySelector('#prop-qr-content').onchange = () => this.saveHistory();
        } else if (el.type === 'social') {
            const platforms = ['WhatsApp', 'Facebook', 'Instagram', 'Twitter', 'LinkedIn', 'TikTok', 'YouTube', 'Email', 'Website'];

            const contentGroup = document.createElement('div');
            contentGroup.className = 'prop-group';
            contentGroup.innerHTML = `<h4>الرابط</h4>
                <div class="prop-row"><label>المنصة</label>
                    <select id="prop-platform">
                        ${platforms.map(p => `<option value="${p.toLowerCase()}" ${el.platform === p.toLowerCase() ? 'selected' : ''}>${p}</option>`).join('')}
                    </select>
                </div>
                <div class="prop-row"><label>الرابط</label><input type="text" id="prop-social-url" value="${el.action?.value || ''}"></div>`;
            container.appendChild(contentGroup);

            const styleGroup = document.createElement('div');
            styleGroup.className = 'prop-group';
            styleGroup.innerHTML = `<h4>المظهر</h4>
                <div class="prop-row"><label>اللون</label><input type="color" id="prop-social-color" value="${el.style.backgroundColor || '#000000'}"></div>`;
            container.appendChild(styleGroup);

            contentGroup.querySelector('#prop-platform').onchange = (e) => {
                el.platform = e.target.value;
                const colors = { whatsapp: '#25D366', facebook: '#1877F2', instagram: '#E4405F', twitter: '#1DA1F2', linkedin: '#0077B5', tiktok: '#000000', youtube: '#FF0000' };
                if (colors[el.platform]) el.style.backgroundColor = colors[el.platform];
                this.render(); this.renderDynamicProperties(el); this.saveHistory();
            };
            contentGroup.querySelector('#prop-social-url').oninput = (e) => { if (!el.action) el.action = {}; el.action.value = e.target.value; this.render(); };
            contentGroup.querySelector('#prop-social-url').onchange = () => this.saveHistory();
            styleGroup.querySelector('#prop-social-color').oninput = (e) => { el.style.backgroundColor = e.target.value; this.render(); };
            styleGroup.querySelector('#prop-social-color').onchange = () => this.saveHistory();
        }
    }

    handlePropertyChange(e) {
        const el = this.getSelectedElementData();
        if (!el) return;
        let val = parseFloat(e.target.value);
        if (this.isGridActive && (e.target.id === 'prop-x' || e.target.id === 'prop-y')) val = Math.round(val / this.snapSize) * this.snapSize;
        el.transform[e.target.id.split('-')[1]] = val;
        this.render();
    }

    renderIdentityTab() {
        const container = document.getElementById('identity-fields-container');
        if (!container) return;
        container.innerHTML = '';

        const primaryElements = [
            { id: 'name', label: 'الاسم الكامل', icon: 'user' },
            { id: 'job', label: 'المسمى الوظيفي', icon: 'briefcase' },
            { id: 'qr', label: 'رابط QR Code', icon: 'qrcode' }
        ];

        primaryElements.forEach(item => {
            const el = this.designData.v2.sides.front.elements.find(e => e.preset === item.id) ||
                this.designData.v2.sides.back.elements.find(e => e.preset === item.id);

            if (!el) return;

            const group = document.createElement('div');
            group.className = 'identity-field-group';
            group.innerHTML = `
                <label><i class="fas fa-${item.icon}"></i> ${item.label}</label>
                ${el.bilingual ? `
                    <input type="text" data-field="ar" placeholder="العربية" value="${el.contentAR || ''}" style="margin-bottom:8px">
                    <input type="text" data-field="en" placeholder="English" value="${el.contentEN || ''}">
                ` : `
                    <input type="text" data-field="val" value="${el.content || el.src || ''}">
                `}
            `;

            const inputs = group.querySelectorAll('input');
            inputs.forEach(input => {
                input.oninput = (e) => {
                    const field = e.target.dataset.field;
                    if (field === 'ar') el.contentAR = e.target.value;
                    else if (field === 'en') el.contentEN = e.target.value;
                    else el.content = e.target.value;

                    this.render();
                };
                input.onchange = () => this.saveHistory();
            });

            container.appendChild(group);
        });

        if (container.innerHTML === '') {
            container.innerHTML = '<p style="text-align:center; opacity:0.6; padding:20px;">أضف عناصر "الاسم" أو "المنصب" من القائمة اليمنى لتظهر هنا.</p>';
        }
    }

    deleteSelected() {
        const els = this.designData.v2.sides[this.currentSide].elements;
        const i = els.findIndex(e => e.id === this.selectedElementId);
        if (i > -1) { els.splice(i, 1); this.deselect(); this.render(); }
    }

    async saveDesign(isAutosave = false) {
        if (!isAutosave) {
            const btn = document.getElementById('btn-save'); btn.disabled = true;
            btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
        }
        try {
            const r = await fetch('api/save-design', {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ shortId: this.designId, data: this.designData })
            });
            const res = await r.json();
            if (res.success) {
                this.lastSavedData = JSON.stringify(this.designData);
                if (!isAutosave) alert('Saved!');
                if (!this.designId && res.id) {
                    this.designId = res.id;
                    window.history.pushState({}, '', `editor-v2?id=${this.designId}`);
                }
            }
        } catch (e) { console.error(e); }
        if (!isAutosave) {
            const btn = document.getElementById('btn-save'); btn.disabled = false;
            btn.innerHTML = '<i class="fas fa-save"></i> حفظ';
        }
    }

    async exportDesign(format) {
        if (!window.html2canvas) return alert('Capture library not loaded');
        const canvas = document.getElementById('v2-card-canvas');
        const oldZoom = this.zoom;
        this.zoom = 1; this.updateZoom();

        try {
            const capture = await html2canvas(canvas, { scale: 2, useCORS: true, backgroundColor: null });
            if (format === 'png') {
                const link = document.createElement('a');
                link.download = `design_${this.currentSide}.png`;
                link.href = capture.toDataURL('image/png');
                link.click();
            } else if (format === 'pdf') {
                const { jsPDF } = window.jspdf;
                const pdf = new jsPDF('l', 'px', [510, 330]);
                pdf.addImage(capture.toDataURL('image/png'), 'PNG', 0, 0, 510, 330);
                pdf.save(`design_${this.currentSide}.pdf`);
            }
        } catch (e) {
            console.error('Export failed:', e);
            alert('Export failed');
        }
        this.zoom = oldZoom; this.updateZoom();
    }
}
window.editor = new EditorV2();
