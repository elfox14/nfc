(function initializeEditorCreativeTools(global) {
    'use strict';

    const document = global.document;
    if (!document) return;

    const isEnglish = document.documentElement.lang.toLowerCase().startsWith('en');
    const copy = isEnglish ? {
        styles: 'Quick styles', colors: 'Color palettes', type: 'Type systems', assets: 'Recent assets',
        assetsHint: 'Reuse uploaded images without uploading them again.', empty: 'Uploaded logos and photos appear here.',
        logo: 'Use as logo', photo: 'Use as photo', remove: 'Remove asset', versions: 'Versions',
        versionsHint: 'Create a named checkpoint before a major change.', createVersion: 'Create version',
        versionName: 'Version name', restore: 'Restore', noVersions: 'No saved versions yet.', applied: 'Style applied',
        restored: 'Version restored', defaultVersion: 'Checkpoint'
    } : {
        styles: 'أنماط سريعة', colors: 'لوحات الألوان', type: 'أنظمة الخطوط', assets: 'الأصول الأخيرة',
        assetsHint: 'أعد استخدام الصور المرفوعة دون رفعها مرة أخرى.', empty: 'ستظهر الشعارات والصور المرفوعة هنا.',
        logo: 'استخدام كشعار', photo: 'استخدام كصورة', remove: 'حذف الأصل', versions: 'الإصدارات',
        versionsHint: 'أنشئ نقطة محفوظة قبل أي تعديل كبير.', createVersion: 'إنشاء إصدار',
        versionName: 'اسم الإصدار', restore: 'استعادة', noVersions: 'لا توجد إصدارات محفوظة.', applied: 'تم تطبيق النمط',
        restored: 'تمت استعادة الإصدار', defaultVersion: 'نقطة محفوظة'
    };

    const assetKey = 'mcprime-editor-assets-v1';
    const versionKey = 'mcprime-editor-versions-v1';
    const palettes = [
        { name: isEnglish ? 'Executive' : 'تنفيذي', colors: ['#0b172a', '#152d4f', '#f5f8fc', '#54a7ff'] },
        { name: isEnglish ? 'Midnight gold' : 'ذهبي ليلي', colors: ['#08090c', '#1a1b20', '#f5e7b8', '#d6ad55'] },
        { name: isEnglish ? 'Clean studio' : 'استوديو نقي', colors: ['#f7f9fc', '#e8edf4', '#152033', '#246bfd'] },
        { name: isEnglish ? 'Emerald' : 'زمردي', colors: ['#052e2b', '#0b4d46', '#ecfdf5', '#4ade80'] },
        { name: isEnglish ? 'Creative violet' : 'بنفسجي إبداعي', colors: ['#20113d', '#432273', '#ffffff', '#d8b4fe'] },
        { name: isEnglish ? 'Warm editorial' : 'تحريري دافئ', colors: ['#3a241c', '#704536', '#fff7ed', '#fb923c'] }
    ];
    const typeSystems = [
        { name: isEnglish ? 'Modern' : 'حديث', nameFont: 'Cairo, sans-serif', bodyFont: 'Tajawal, sans-serif' },
        { name: isEnglish ? 'Editorial' : 'تحريري', nameFont: 'Amiri, serif', bodyFont: 'Tajawal, sans-serif' },
        { name: isEnglish ? 'Geometric' : 'هندسي', nameFont: 'Changa, sans-serif', bodyFont: 'Readex Pro, sans-serif' },
        { name: isEnglish ? 'International' : 'دولي', nameFont: 'Poppins, sans-serif', bodyFont: 'Poppins, sans-serif' }
    ];

    let initialized = false;

    function readList(key) {
        try {
            const value = JSON.parse(global.localStorage?.getItem(key) || '[]');
            return Array.isArray(value) ? value : [];
        } catch (_error) {
            return [];
        }
    }

    function writeList(key, value) {
        try { global.localStorage?.setItem(key, JSON.stringify(value)); } catch (_error) { /* storage is optional */ }
    }

    function el(tag, className, text) {
        const node = document.createElement(tag);
        if (className) node.className = className;
        if (text) node.textContent = text;
        return node;
    }

    function button(label, className) {
        const node = el('button', className, label);
        node.type = 'button';
        return node;
    }

    function dispatchValue(id, value) {
        const input = document.getElementById(id);
        if (!input) return;
        input.value = value;
        input.dispatchEvent(new global.Event('input', { bubbles: true }));
        input.dispatchEvent(new global.Event('change', { bubbles: true }));
    }

    function saveDesignChange() {
        if (typeof StateManager !== 'undefined' && StateManager.saveDebounced) StateManager.saveDebounced();
        document.dispatchEvent(new global.CustomEvent('editor:creativechange'));
    }

    function announce(message) {
        if (global.UIManager?.announce) global.UIManager.announce(message);
    }

    function applyPalette(palette) {
        dispatchValue('front-bg-start', palette.colors[0]);
        dispatchValue('front-bg-end', palette.colors[1]);
        dispatchValue('back-bg-start', palette.colors[0]);
        dispatchValue('back-bg-end', palette.colors[1]);
        dispatchValue('name-color', palette.colors[2]);
        dispatchValue('tagline-color', palette.colors[3]);
        dispatchValue('back-buttons-bg-color', palette.colors[1]);
        dispatchValue('back-buttons-text-color', palette.colors[2]);
        dispatchValue('social-text-color', palette.colors[2]);
        saveDesignChange();
        announce(copy.applied);
    }

    function applyTypeSystem(system) {
        dispatchValue('name-font', system.nameFont);
        dispatchValue('tagline-font', system.bodyFont);
        dispatchValue('phone-text-font', system.bodyFont);
        dispatchValue('phone-btn-font', system.bodyFont);
        dispatchValue('back-buttons-font', system.bodyFont);
        dispatchValue('social-text-font', system.bodyFont);
        saveDesignChange();
        announce(copy.applied);
    }

    function renderStyles(host) {
        const panel = el('section', 'editor-creative-panel');
        panel.dataset.creativePanel = 'styles';
        panel.append(el('h3', '', copy.styles));

        const paletteTitle = el('p', 'editor-creative-label', copy.colors);
        const paletteGrid = el('div', 'editor-palette-grid');
        palettes.forEach((palette) => {
            const item = button(palette.name, 'editor-palette');
            item.title = palette.name;
            const swatches = el('span', 'editor-palette-swatches');
            palette.colors.forEach((color) => {
                const swatch = el('i');
                swatch.style.background = color;
                swatches.append(swatch);
            });
            item.prepend(swatches);
            item.addEventListener('click', () => applyPalette(palette));
            paletteGrid.append(item);
        });

        const typeTitle = el('p', 'editor-creative-label', copy.type);
        const typeGrid = el('div', 'editor-type-grid');
        typeSystems.forEach((system) => {
            const item = button(system.name, 'editor-type-preset');
            item.style.fontFamily = system.nameFont;
            item.addEventListener('click', () => applyTypeSystem(system));
            typeGrid.append(item);
        });
        panel.append(paletteTitle, paletteGrid, typeTitle, typeGrid);
        host.prepend(panel);
    }

    function rememberAsset(url, kind) {
        if (!url || url.startsWith('data:') || url.endsWith('placeholder')) return;
        const assets = readList(assetKey).filter((item) => item.url !== url);
        assets.unshift({ url, kind, addedAt: Date.now() });
        writeList(assetKey, assets.slice(0, 12));
        if (global.EditorWorkspace?.getState().libraryView === 'images') renderCurrentView('images');
    }

    function applyAsset(url, kind) {
        if (kind === 'logo') {
            dispatchValue('input-logo', url);
            const image = document.getElementById('card-logo-img');
            const preview = document.getElementById('logo-preview-img');
            if (image) image.src = url;
            if (preview) preview.src = url;
        } else {
            dispatchValue('input-photo-url', url);
            if (global.CardManager) global.CardManager.personalPhotoUrl = url;
        }
        saveDesignChange();
    }

    function renderAssets(host) {
        const panel = el('section', 'editor-creative-panel');
        panel.dataset.creativePanel = 'assets';
        panel.append(el('h3', '', copy.assets), el('p', 'editor-creative-hint', copy.assetsHint));
        const assets = readList(assetKey);
        if (!assets.length) panel.append(el('p', 'editor-creative-empty', copy.empty));
        const grid = el('div', 'editor-asset-grid');
        assets.forEach((asset) => {
            const item = el('article', 'editor-asset');
            const image = el('img');
            image.src = asset.url;
            image.alt = '';
            image.loading = 'lazy';
            const actions = el('div', 'editor-asset-actions');
            const use = button(asset.kind === 'photo' ? copy.photo : copy.logo, 'editor-asset-use');
            const remove = button('×', 'editor-asset-remove');
            remove.setAttribute('aria-label', copy.remove);
            use.addEventListener('click', () => applyAsset(asset.url, asset.kind));
            remove.addEventListener('click', () => {
                writeList(assetKey, readList(assetKey).filter((entry) => entry.url !== asset.url));
                renderCurrentView('images');
            });
            actions.append(use, remove);
            item.append(image, actions);
            grid.append(item);
        });
        panel.append(grid);
        host.append(panel);
    }

    function captureState() {
        if (typeof StateManager === 'undefined' || !StateManager.getStateObject) return null;
        return JSON.parse(JSON.stringify(StateManager.getStateObject()));
    }

    function createVersion(name) {
        const state = captureState();
        if (!state) return false;
        const versions = readList(versionKey);
        versions.unshift({ id: String(Date.now()), name: name || copy.defaultVersion, createdAt: Date.now(), state });
        writeList(versionKey, versions.slice(0, 10));
        return true;
    }

    function restoreVersion(id) {
        const version = readList(versionKey).find((item) => item.id === id);
        if (!version || typeof StateManager === 'undefined' || !StateManager.applyState) return false;
        StateManager.applyState(JSON.parse(JSON.stringify(version.state)), true);
        saveDesignChange();
        announce(copy.restored);
        return true;
    }

    function renderVersions() {
        const existing = document.getElementById('editor-version-popover');
        if (existing) existing.remove();
        const panel = el('section', 'editor-version-popover');
        panel.id = 'editor-version-popover';
        panel.setAttribute('role', 'dialog');
        panel.setAttribute('aria-label', copy.versions);
        panel.append(el('h2', '', copy.versions), el('p', '', copy.versionsHint));
        const form = el('form', 'editor-version-form');
        const input = el('input');
        input.type = 'text';
        input.placeholder = copy.versionName;
        input.maxLength = 48;
        const create = button(copy.createVersion, 'btn btn-primary');
        form.append(input, create);
        form.addEventListener('submit', (event) => {
            event.preventDefault();
            if (createVersion(input.value.trim())) renderVersions();
        });
        panel.append(form);
        const list = el('div', 'editor-version-list');
        const versions = readList(versionKey);
        if (!versions.length) list.append(el('p', 'editor-creative-empty', copy.noVersions));
        versions.forEach((version) => {
            const row = el('div', 'editor-version-row');
            const meta = el('div');
            meta.append(el('strong', '', version.name), el('small', '', new Date(version.createdAt).toLocaleString()));
            const restore = button(copy.restore, 'btn btn-secondary');
            restore.addEventListener('click', () => { if (restoreVersion(version.id)) panel.remove(); });
            row.append(meta, restore);
            list.append(row);
        });
        panel.append(list);
        document.body.append(panel);
        return panel;
    }

    function setupVersionButton() {
        const toolbar = document.querySelector('.tb-history');
        if (!toolbar || document.getElementById('editor-versions-btn')) return;
        const versions = button('', 'tb-icon-btn');
        versions.id = 'editor-versions-btn';
        versions.title = copy.versions;
        versions.setAttribute('aria-label', copy.versions);
        const icon = el('i', 'fas fa-history');
        icon.setAttribute('aria-hidden', 'true');
        versions.append(icon);
        versions.addEventListener('click', () => {
            const existing = document.getElementById('editor-version-popover');
            if (existing) existing.remove(); else renderVersions();
        });
        toolbar.append(versions);
    }

    function capHistory() {
        if (typeof HistoryManager === 'undefined' || HistoryManager.__professionalLimit) return;
        HistoryManager.__professionalLimit = true;
        const original = HistoryManager.pushState.bind(HistoryManager);
        HistoryManager.pushState = function pushLimitedState(state) {
            original(state);
            if (this.history.length > 50) {
                const overflow = this.history.length - 50;
                this.history.splice(0, overflow);
                this.currentIndex = Math.max(0, this.currentIndex - overflow);
                this.updateButtonStates();
            }
        };
    }

    function observeImages() {
        [['card-logo-img', 'logo'], ['photo-preview', 'photo']].forEach(([id, kind]) => {
            const image = document.getElementById(id);
            if (!image) return;
            let previous = image.currentSrc || image.src;
            new global.MutationObserver(() => {
                const current = image.currentSrc || image.src;
                if (current && current !== previous) { previous = current; rememberAsset(current, kind); }
            }).observe(image, { attributes: true, attributeFilter: ['src'] });
        });
        const photoUrl = document.getElementById('input-photo-url');
        photoUrl?.addEventListener('change', () => rememberAsset(photoUrl.value.trim(), 'photo'));
        const logoUrl = document.getElementById('input-logo');
        logoUrl?.addEventListener('change', () => rememberAsset(logoUrl.value.trim(), 'logo'));
    }

    function renderCurrentView(view) {
        const host = document.querySelector('.editor-library-shortcuts');
        if (!host) return;
        host.querySelectorAll('[data-creative-panel]').forEach((panel) => panel.remove());
        if (view === 'templates') renderStyles(host);
        if (view === 'images') renderAssets(host);
    }

    function initialize() {
        if (initialized) return;
        initialized = true;
        setupVersionButton();
        capHistory();
        observeImages();
        renderCurrentView(global.EditorWorkspace?.getState().libraryView || 'templates');
        document.addEventListener('editor:librarychange', (event) => renderCurrentView(event.detail?.view));
        document.documentElement.dataset.editorCreativeTools = 'ready';
    }

    global.EditorCreativeTools = { init: initialize, applyPalette, applyTypeSystem, rememberAsset, createVersion, restoreVersion };
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initialize, { once: true });
    else initialize();
}(typeof window !== 'undefined' ? window : globalThis));
