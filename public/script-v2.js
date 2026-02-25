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
        this.startAutosave();
        this.showWelcomeHint();
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
                v2: { canvas: { width: 510, height: 330, baseWidth: 510 }, sides: { front: { elements: [] }, back: { elements: [] } } }
            };
            this.lastSavedData = JSON.stringify(this.designData);
            return;
        }
        try {
            const response = await fetch(`/api/get-design/${this.designId}?v2=true`);
            const data = await response.json();
            this.designData = data;
            this.lastSavedData = JSON.stringify(data);
        } catch (err) { console.error(err); }
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
        const tools = ['text', 'image', 'avatar', 'qr', 'social', 'shape'];
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

        this.initInteraction();
    }

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
    this.renderLayers();
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
        text: { content: 'نص جديد', style: { color: '#000000', fontSize: 20 }, transform: { w: 150, h: 40 } },
        image: { src: '/placeholder.png', transform: { w: 100, h: 100 } },
        avatar: { src: '/placeholder-user.png', transform: { w: 80, h: 80 } },
        qr: { content: 'https://mcprim.com', transform: { w: 80, h: 80 } },
        social: { platform: 'whatsapp', content: 'https://wa.me/xxx', style: { backgroundColor: '#25D366', color: '#ffffff' }, transform: { w: 40, h: 40 } },
        shape: { style: { backgroundColor: '#4da6ff' }, transform: { w: 100, h: 100 } }
    };
    const newEl = {
        id, type, visible: true,
        transform: { x: 100, y: 100, rotation: 0, ...(defaults[type]?.transform || {}) },
        style: defaults[type]?.style || {},
        content: defaults[type]?.content || '',
        contentAR: defaults[type]?.content || '',
        contentEN: 'New Text',
        bilingual: false,
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
        container.innerHTML = `<div class="panel-section"><h3>خصائص النص</h3>
                <div class="prop-row"><label><input type="checkbox" id="prop-bilingual" ${el.bilingual ? 'checked' : ''}> ثنائي اللغة (AR/EN)</label></div>
                <div id="text-inputs">
                    ${el.bilingual ? `
                        <div class="prop-row"><label>العربية</label><textarea id="prop-content-ar">${el.contentAR || ''}</textarea></div>
                        <div class="prop-row"><label>English</label><textarea id="prop-content-en">${el.contentEN || ''}</textarea></div>
                    ` : `
                        <div class="prop-row"><label>المحتوى</label><textarea id="prop-content">${el.content || ''}</textarea></div>
                    `}
                </div>
                <div class="prop-row"><label>اللون</label><input type="color" id="prop-color" value="${el.style.color || '#000000'}"></div>
            </div>`;

        const cb = container.querySelector('#prop-bilingual');
        cb.onchange = (e) => { el.bilingual = e.target.checked; this.renderDynamicProperties(el); this.render(); this.saveHistory(); };

        if (el.bilingual) {
            container.querySelector('#prop-content-ar').oninput = (e) => { el.contentAR = e.target.value; this.render(); };
            container.querySelector('#prop-content-ar').onchange = () => this.saveHistory();
            container.querySelector('#prop-content-en').oninput = (e) => { el.contentEN = e.target.value; this.render(); };
            container.querySelector('#prop-content-en').onchange = () => this.saveHistory();
        } else {
            container.querySelector('#prop-content').oninput = (e) => { el.content = e.target.value; this.render(); };
            container.querySelector('#prop-content').onchange = () => this.saveHistory();
        }
        container.querySelector('#prop-color').oninput = (e) => { el.style.color = e.target.value; this.render(); };
        container.querySelector('#prop-color').onchange = () => this.saveHistory();
    } else if (['image', 'avatar', 'logo'].includes(el.type)) {
        container.innerHTML = `<div class="panel-section"><h3>خصائص الصورة</h3>
                <div class="prop-row"><label>الرابط</label><input type="text" id="prop-src" value="${el.src}"></div>
                <div class="prop-row"><button class="btn-primary" id="btn-upload-image" style="width:100%; padding:8px;"><i class="fas fa-upload"></i> رفع صورة</button></div>
                <input type="file" id="image-file-input" style="display:none" accept="image/*">
            </div>`;
        container.querySelector('#prop-src').oninput = (e) => { el.src = e.target.value; this.render(); };
        container.querySelector('#prop-src').onchange = () => this.saveHistory();

        const uploadBtn = container.querySelector('#btn-upload-image');
        const fileInput = container.querySelector('#image-file-input');
        uploadBtn.onclick = () => fileInput.click();
        fileInput.onchange = async (e) => {
            const file = e.target.files[0];
            if (!file) return;
            uploadBtn.disabled = true;
            uploadBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> جاري الرفع...';
            try {
                const formData = new FormData();
                formData.append('image', file);
                const res = await fetch('/api/upload', {
                    method: 'POST',
                    body: formData
                });
                const data = await res.json();
                if (data.url) {
                    el.src = data.url;
                    this.render();
                    this.renderDynamicProperties(el);
                    this.saveHistory();
                }
            } catch (err) { console.error(err); alert('فشل الرفع'); }
            uploadBtn.disabled = false;
            uploadBtn.innerHTML = '<i class="fas fa-upload"></i> رفع صورة';
        };
    } else if (el.type === 'qr') {
        container.innerHTML = `<div class="panel-section"><h3>خصائص QR</h3><div class="prop-row"><label>المحتوى</label><input type="text" id="prop-qr-content" value="${el.content}"></div></div>`;
        container.querySelector('#prop-qr-content').oninput = (e) => { el.content = e.target.value; this.render(); };
        container.querySelector('#prop-qr-content').onchange = () => this.saveHistory();
    } else if (el.type === 'social') {
        const platforms = ['WhatsApp', 'Facebook', 'Instagram', 'Twitter', 'LinkedIn', 'TikTok', 'YouTube', 'Email', 'Website'];
        container.innerHTML = `<div class="panel-section"><h3>خصائص التواصل</h3>
                <div class="prop-row"><label>المنصة</label>
                    <select id="prop-platform">
                        ${platforms.map(p => `<option value="${p.toLowerCase()}" ${el.platform === p.toLowerCase() ? 'selected' : ''}>${p}</option>`).join('')}
                    </select>
                </div>
                <div class="prop-row"><label>الرابط</label><input type="text" id="prop-social-url" value="${el.action?.value || ''}"></div>
                <div class="prop-row"><label>اللون</label><input type="color" id="prop-social-color" value="${el.style.backgroundColor || '#000000'}"></div>
            </div>`;
        container.querySelector('#prop-platform').onchange = (e) => {
            el.platform = e.target.value;
            // Auto-color based on platform
            const colors = { whatsapp: '#25D366', facebook: '#1877F2', instagram: '#E4405F', twitter: '#1DA1F2', linkedin: '#0077B5', tiktok: '#000000', youtube: '#FF0000' };
            if (colors[el.platform]) el.style.backgroundColor = colors[el.platform];
            this.render(); this.renderDynamicProperties(el); this.saveHistory();
        };
        container.querySelector('#prop-social-url').oninput = (e) => { if (!el.action) el.action = {}; el.action.value = e.target.value; this.render(); };
        container.querySelector('#prop-social-url').onchange = () => this.saveHistory();
        container.querySelector('#prop-social-color').oninput = (e) => { el.style.backgroundColor = e.target.value; this.render(); };
        container.querySelector('#prop-social-color').onchange = () => this.saveHistory();
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
        const r = await fetch('/api/save-design', {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ shortId: this.designId, data: this.designData })
        });
        const res = await r.json();
        if (res.success) {
            this.lastSavedData = JSON.stringify(this.designData);
            if (!isAutosave) alert('Saved!');
            if (!this.designId && res.id) {
                this.designId = res.id;
                window.history.pushState({}, '', `editor-v2.html?id=${this.designId}`);
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
