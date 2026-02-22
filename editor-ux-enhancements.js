/**
 * MC PRIME NFC Editor – UX Enhancements
 * ─────────────────────────────────────
 * Features added on top of the existing editor-enhancements.js:
 *   1. Floating property toolbar (appears near selected element)
 *   2. Inline text editing (double-click to edit h1/h2 on card)
 *   3. Live preview for sliders & color inputs
 *   4. Quick-action buttons (align center, reset)
 *   5. Snap-guide lines during drag
 *   6. Before / After preview toggle
 */

(function () {
    'use strict';

    document.addEventListener('DOMContentLoaded', initUXEnhancements);

    /* ── Language helpers ── */
    const _en = document.documentElement.lang === 'en';
    const t = (ar, en) => _en ? en : ar;

    /* ═══════════════════════════════════════════════════════════
       0.  BOOTSTRAP
       ═══════════════════════════════════════════════════════════ */
    function initUXEnhancements() {
        injectFloatingToolbar();
        initInlineEditing();
        initLivePreview();
        initSnapGuides();
        initBeforeAfterToggle();
        hookElementSelection();
    }

    /* ═══════════════════════════════════════════════════════════
       1.  FLOATING TOOLBAR
       ═══════════════════════════════════════════════════════════ */
    let floatingToolbar = null;

    function injectFloatingToolbar() {
        // Create the toolbar element
        const tb = document.createElement('div');
        tb.id = 'floating-toolbar';
        tb.className = 'floating-toolbar hidden';
        tb.innerHTML = `
            <button class="ft-btn" id="ft-align-center" title="${t('توسيط', 'Center')}">
                <i class="fas fa-align-center"></i>
            </button>
            <button class="ft-btn" id="ft-edit-text" title="${t('تحرير النص', 'Edit Text')}">
                <i class="fas fa-pencil-alt"></i>
            </button>
            <button class="ft-btn" id="ft-reset" title="${t('إعادة تعيين', 'Reset')}">
                <i class="fas fa-undo"></i>
            </button>
            <span class="ft-separator"></span>
            <label class="ft-color-wrap" title="${t('لون الخط', 'Font Color')}">
                <i class="fas fa-palette"></i>
                <input type="color" id="ft-font-color" class="ft-color-input">
            </label>
            <label class="ft-size-wrap" title="${t('حجم الخط', 'Font Size')}">
                <i class="fas fa-text-height"></i>
                <input type="range" id="ft-font-size" min="8" max="60" value="16" class="ft-range-input">
            </label>
        `;
        document.body.appendChild(tb);
        floatingToolbar = tb;

        /* ── Button handlers ── */
        document.getElementById('ft-align-center').addEventListener('click', actionAlignCenter);
        document.getElementById('ft-edit-text').addEventListener('click', actionEditText);
        document.getElementById('ft-reset').addEventListener('click', actionReset);
        document.getElementById('ft-font-color').addEventListener('input', actionFontColor);
        document.getElementById('ft-font-size').addEventListener('input', actionFontSize);
    }

    /** Position the toolbar above the given element */
    function showToolbar(el) {
        if (!floatingToolbar || !el) return;
        const rect = el.getBoundingClientRect();
        const tbHeight = 44;
        let top = rect.top - tbHeight - 8 + window.scrollY;
        if (top < 4) top = rect.bottom + 8 + window.scrollY;

        floatingToolbar.style.top = top + 'px';
        floatingToolbar.style.left = (rect.left + rect.width / 2) + 'px';
        floatingToolbar.classList.remove('hidden');

        // Sync font-size slider and color to current element
        const cs = getComputedStyle(el);
        document.getElementById('ft-font-size').value = parseInt(cs.fontSize, 10) || 16;
        document.getElementById('ft-font-color').value = rgbToHex(cs.color);

        // Show/hide text-only controls
        const isText = ['H1', 'H2', 'P', 'SPAN'].includes(el.tagName);
        document.getElementById('ft-edit-text').style.display = isText ? '' : 'none';
        document.getElementById('ft-font-color').closest('.ft-color-wrap').style.display = isText ? '' : 'none';
        document.getElementById('ft-font-size').closest('.ft-size-wrap').style.display = isText ? '' : 'none';
    }

    function hideToolbar() {
        if (floatingToolbar) floatingToolbar.classList.add('hidden');
    }

    /* ── Quick actions ── */
    function getSelected() {
        return document.querySelector('.element-selected');
    }

    function actionAlignCenter() {
        const el = getSelected();
        if (!el) return;
        el.style.transform = 'translate(0px, 0px)';
        el.setAttribute('data-x', '0');
        el.setAttribute('data-y', '0');
        el.style.textAlign = 'center';
        if (el.parentElement) {
            el.parentElement.style.display = 'flex';
            el.parentElement.style.justifyContent = 'center';
        }
        if (typeof StateManager !== 'undefined') StateManager.saveDebounced();
    }

    function actionEditText() {
        const el = getSelected();
        if (!el) return;
        startInlineEdit(el);
    }

    function actionReset() {
        const el = getSelected();
        if (!el) return;
        el.style.cssText = '';
        el.style.transform = 'translate(0px, 0px)';
        el.setAttribute('data-x', '0');
        el.setAttribute('data-y', '0');
        if (typeof StateManager !== 'undefined') StateManager.saveDebounced();
        showToolbar(el); // refresh toolbar values
    }

    function actionFontColor(e) {
        const el = getSelected();
        if (!el) return;
        el.style.color = e.target.value;
        // Sync sidebar input if it exists
        syncSidebarColor(el, e.target.value);
        if (typeof StateManager !== 'undefined') StateManager.saveDebounced();
    }

    function actionFontSize(e) {
        const el = getSelected();
        if (!el) return;
        el.style.fontSize = e.target.value + 'px';
        // Sync sidebar range if it exists
        syncSidebarFontSize(el, e.target.value);
        if (typeof StateManager !== 'undefined') StateManager.saveDebounced();
    }

    function syncSidebarColor(el, color) {
        const sidebarMap = {
            'card-name': 'name-color',
            'card-tagline': 'tagline-color'
        };
        const inputId = sidebarMap[el.id];
        if (inputId) {
            const inp = document.getElementById(inputId);
            if (inp) inp.value = color;
        }
    }

    function syncSidebarFontSize(el, size) {
        const sidebarMap = {
            'card-name': 'name-font-size',
            'card-tagline': 'tagline-font-size'
        };
        const inputId = sidebarMap[el.id];
        if (inputId) {
            const inp = document.getElementById(inputId);
            if (inp) inp.value = size;
        }
    }

    /* ── Hook into the existing selectElement / deselectElement ── */
    function hookElementSelection() {
        // Patch the existing selectElement to also show floating toolbar
        const origSelect = window.selectElement || (typeof selectElement === 'function' ? selectElement : null);
        const origDeselect = window.deselectElement || (typeof deselectElement === 'function' ? deselectElement : null);

        // Since selectElement / deselectElement are inside an IIFE, we hook via
        // a MutationObserver on the element-selected class
        const observer = new MutationObserver((mutations) => {
            for (const m of mutations) {
                if (m.type === 'attributes' && m.attributeName === 'class') {
                    const target = m.target;
                    if (target.classList.contains('element-selected')) {
                        showToolbar(target);
                        showPropertiesPanel(target);
                    }
                }
            }
        });

        // Observe all candidate elements for class changes
        const selectors = '#card-logo, #card-personal-photo-wrapper, #card-name, #card-tagline, #qr-code-wrapper';
        document.querySelectorAll(selectors).forEach(el => {
            observer.observe(el, { attributes: true, attributeFilter: ['class'] });
        });

        // Also observe dynamically-added phone/social elements
        const contentLayers = document.querySelectorAll('.card-content-layer');
        contentLayers.forEach(layer => {
            const childObserver = new MutationObserver(() => {
                layer.querySelectorAll('.phone-button-draggable-wrapper, .draggable-social-link').forEach(child => {
                    observer.observe(child, { attributes: true, attributeFilter: ['class'] });
                });
            });
            childObserver.observe(layer, { childList: true, subtree: true });
        });

        // Hide toolbar when clicking outside
        document.addEventListener('mousedown', (e) => {
            if (!e.target.closest('.element-selected, .floating-toolbar')) {
                hideToolbar();
            }
        });
    }

    /* ── Auto-show properties panel on element selection ── */
    function showPropertiesPanel(el) {
        const panelId = el.dataset && el.dataset.inputTargetId;
        if (!panelId) return;
        const panel = document.getElementById(panelId);
        if (!panel) return;

        // Open the <details> accordion
        const accordion = panel.closest('details.fieldset-accordion');
        if (accordion) {
            accordion.open = true;
            accordion.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }

        // Show the right sidebar
        const sidebar = document.getElementById('panel-elements');
        if (sidebar) sidebar.classList.add('active');
    }

    /* ═══════════════════════════════════════════════════════════
       2.  INLINE TEXT EDITING
       ═══════════════════════════════════════════════════════════ */
    function initInlineEditing() {
        const editableIds = ['card-name', 'card-tagline'];
        editableIds.forEach(id => {
            const el = document.getElementById(id);
            if (!el) return;
            el.addEventListener('dblclick', () => startInlineEdit(el));
        });
    }

    function startInlineEdit(el) {
        if (el.contentEditable === 'true') return; // already editing
        el.contentEditable = 'true';
        el.focus();
        el.classList.add('inline-editing');

        // Select all text
        const range = document.createRange();
        range.selectNodeContents(el);
        const sel = window.getSelection();
        sel.removeAllRanges();
        sel.addRange(range);

        const finish = () => {
            el.contentEditable = 'false';
            el.classList.remove('inline-editing');
            // Sync back to sidebar input
            syncInlineToSidebar(el);
            if (typeof StateManager !== 'undefined') StateManager.saveDebounced();
        };

        el.addEventListener('blur', finish, { once: true });
        el.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') { e.preventDefault(); el.blur(); }
            if (e.key === 'Escape') { el.blur(); }
        });
    }

    function syncInlineToSidebar(el) {
        const lang = document.getElementById('language-toggle')?.checked ? 'en' : 'ar';
        const map = {
            'card-name': `input-name_${lang}`,
            'card-tagline': `input-tagline_${lang}`
        };
        const inputId = map[el.id];
        if (inputId) {
            const inp = document.getElementById(inputId);
            if (inp) inp.value = el.innerText;
        }
    }

    /* ═══════════════════════════════════════════════════════════
       3.  LIVE PREVIEW FOR SLIDERS & INPUTS
       ═══════════════════════════════════════════════════════════ */
    function initLivePreview() {
        // Listen on *all* inputs/ranges with data-update-target
        document.querySelectorAll('[data-update-target]').forEach(input => {
            const eventType = (input.type === 'range' || input.type === 'color') ? 'input' : 'input';
            input.addEventListener(eventType, () => {
                if (typeof CardManager !== 'undefined' && CardManager.updateElementFromInput) {
                    CardManager.updateElementFromInput(input);
                }
            });
        });

        // Add value tooltips for range sliders
        document.querySelectorAll('input[type="range"]').forEach(slider => {
            const tooltip = document.createElement('span');
            tooltip.className = 'slider-value-tooltip';
            tooltip.textContent = slider.value;
            slider.parentElement.style.position = 'relative';
            slider.parentElement.appendChild(tooltip);

            slider.addEventListener('input', () => {
                tooltip.textContent = slider.value;
                const pct = (slider.value - slider.min) / (slider.max - slider.min);
                tooltip.style.left = `calc(${pct * 100}% - 12px)`;
                tooltip.classList.add('visible');
            });

            slider.addEventListener('change', () => {
                setTimeout(() => tooltip.classList.remove('visible'), 800);
            });
        });
    }

    /* ═══════════════════════════════════════════════════════════
       4.  SNAP-GUIDE LINES DURING DRAG
       ═══════════════════════════════════════════════════════════ */
    function initSnapGuides() {
        if (typeof interact === 'undefined') return;

        // Create guide lines container
        const guideContainer = document.createElement('div');
        guideContainer.id = 'snap-guides';
        guideContainer.className = 'snap-guides';
        const cardWrapper = document.getElementById('cards-wrapper');
        if (cardWrapper) {
            cardWrapper.style.position = 'relative';
            cardWrapper.appendChild(guideContainer);
        }

        // Patch DragManager's dragMoveListener to add snap detection
        if (typeof DragManager !== 'undefined') {
            const origMove = DragManager.dragMoveListener;
            DragManager.dragMoveListener = function (event) {
                origMove.call(this, event);
                updateSnapGuides(event.target);
            };

            const origEnd = DragManager.dragEndListener;
            DragManager.dragEndListener = function (event) {
                origEnd.call(this, event);
                clearSnapGuides();
            };
        }
    }

    function updateSnapGuides(draggedEl) {
        const container = document.getElementById('snap-guides');
        if (!container) return;
        container.innerHTML = '';

        const card = draggedEl.closest('.business-card');
        if (!card) return;

        const cardRect = card.getBoundingClientRect();
        const elRect = draggedEl.getBoundingClientRect();
        const centerX = elRect.left + elRect.width / 2 - cardRect.left;
        const centerY = elRect.top + elRect.height / 2 - cardRect.top;
        const cardCenterX = cardRect.width / 2;
        const cardCenterY = cardRect.height / 2;

        const threshold = 6; // px

        // Show vertical center guide
        if (Math.abs(centerX - cardCenterX) < threshold) {
            const line = document.createElement('div');
            line.className = 'snap-guide snap-guide-v';
            line.style.left = cardCenterX + 'px';
            container.appendChild(line);
        }

        // Show horizontal center guide
        if (Math.abs(centerY - cardCenterY) < threshold) {
            const line = document.createElement('div');
            line.className = 'snap-guide snap-guide-h';
            line.style.top = cardCenterY + 'px';
            container.appendChild(line);
        }
    }

    function clearSnapGuides() {
        const container = document.getElementById('snap-guides');
        if (container) container.innerHTML = '';
    }

    /* ═══════════════════════════════════════════════════════════
       5.  BEFORE / AFTER PREVIEW TOGGLE
       ═══════════════════════════════════════════════════════════ */
    let originalSnapshot = null;

    function initBeforeAfterToggle() {
        // Add toggle button near the card area
        const wrapper = document.querySelector('.pro-canvas');
        if (!wrapper) return;

        const toggleBtn = document.createElement('button');
        toggleBtn.id = 'before-after-toggle';
        toggleBtn.className = 'btn btn-outline before-after-btn';
        toggleBtn.innerHTML = `<i class="fas fa-exchange-alt"></i> ${t('قبل / بعد', 'Before / After')}`;
        toggleBtn.title = t('مقارنة التصميم الأصلي بالتعديلات', 'Compare original design with edits');
        wrapper.insertBefore(toggleBtn, wrapper.firstChild);

        // Capture initial state after a short delay for rendering
        setTimeout(() => {
            captureSnapshot();
        }, 2000);

        let showingBefore = false;
        toggleBtn.addEventListener('click', () => {
            showingBefore = !showingBefore;
            if (showingBefore) {
                showBeforeSnapshot();
                toggleBtn.classList.add('active');
                toggleBtn.innerHTML = `<i class="fas fa-exchange-alt"></i> ${t('عرض الحالي', 'Show Current')}`;
            } else {
                hideBeforeSnapshot();
                toggleBtn.classList.remove('active');
                toggleBtn.innerHTML = `<i class="fas fa-exchange-alt"></i> ${t('قبل / بعد', 'Before / After')}`;
            }
        });
    }

    function captureSnapshot() {
        const front = document.getElementById('card-front-preview');
        const back = document.getElementById('card-back-preview');
        if (front) originalSnapshot = { front: front.cloneNode(true), back: back ? back.cloneNode(true) : null };
    }

    function showBeforeSnapshot() {
        if (!originalSnapshot) return;
        const front = document.getElementById('card-front-preview');
        const back = document.getElementById('card-back-preview');

        if (front) {
            front.dataset.currentHtml = front.innerHTML;
            front.innerHTML = originalSnapshot.front.innerHTML;
            front.classList.add('showing-before');
        }
        if (back && originalSnapshot.back) {
            back.dataset.currentHtml = back.innerHTML;
            back.innerHTML = originalSnapshot.back.innerHTML;
            back.classList.add('showing-before');
        }
    }

    function hideBeforeSnapshot() {
        const front = document.getElementById('card-front-preview');
        const back = document.getElementById('card-back-preview');

        if (front && front.dataset.currentHtml) {
            front.innerHTML = front.dataset.currentHtml;
            front.classList.remove('showing-before');
            delete front.dataset.currentHtml;
        }
        if (back && back.dataset.currentHtml) {
            back.innerHTML = back.dataset.currentHtml;
            back.classList.remove('showing-before');
            delete back.dataset.currentHtml;
        }
    }

    /* ═══════════════════════════════════════════════════════════
       6.  TABBED PROPERTY CONTROLS
       ═══════════════════════════════════════════════════════════ */
    function initTabs() {
        const rightSidebar = document.getElementById('panel-elements');
        if (!rightSidebar) return;

        // Gather all top-level <details> accordion sections in the right sidebar
        const accordions = rightSidebar.querySelectorAll(':scope > details.fieldset-accordion');
        if (accordions.length === 0) return;

        // Define tab metadata with AR/EN labels and icons
        const tabDefs = [
            { icon: 'fa-image', labelAr: 'الشعار', labelEn: 'Logo' },
            { icon: 'fa-user', labelAr: 'الصورة الشخصية', labelEn: 'Photo' },
            { icon: 'fa-font', labelAr: 'الاسم والعنوان', labelEn: 'Text' },
            { icon: 'fa-phone', labelAr: 'الهاتف', labelEn: 'Phone' },
            { icon: 'fa-share-alt', labelAr: 'الروابط', labelEn: 'Links' },
            { icon: 'fa-qrcode', labelAr: 'QR', labelEn: 'QR' },
            { icon: 'fa-cog', labelAr: 'إعدادات', labelEn: 'Settings' },
        ];

        // Create tab navigation bar
        const tabBar = document.createElement('div');
        tabBar.className = 'sidebar-tab-bar';

        // Create tab panels container
        const panelsContainer = document.createElement('div');
        panelsContainer.className = 'sidebar-tab-panels';

        accordions.forEach((acc, i) => {
            const def = tabDefs[i] || { icon: 'fa-cog', labelAr: acc.querySelector('summary')?.textContent || '', labelEn: acc.querySelector('summary')?.textContent || '' };

            // Create tab button
            const tabBtn = document.createElement('button');
            tabBtn.className = 'sidebar-tab-btn' + (i === 0 ? ' active' : '');
            tabBtn.dataset.tabIndex = i;
            tabBtn.innerHTML = `<i class="fas ${def.icon}"></i><span>${_en ? def.labelEn : def.labelAr}</span>`;
            tabBtn.title = _en ? def.labelEn : def.labelAr;
            tabBar.appendChild(tabBtn);

            // Create tab panel wrapping the accordion content
            const panel = document.createElement('div');
            panel.className = 'sidebar-tab-panel' + (i === 0 ? ' active' : '');
            panel.dataset.tabIndex = i;

            // Move accordion inner content (the fieldset-content div) into the panel
            const content = acc.querySelector('.fieldset-content');
            if (content) {
                panel.appendChild(content);
            } else {
                // Fallback: move all children except summary
                Array.from(acc.children).forEach(child => {
                    if (child.tagName !== 'SUMMARY') panel.appendChild(child);
                });
            }
            panelsContainer.appendChild(panel);
        });

        // Remove original accordions
        accordions.forEach(acc => acc.remove());

        // Insert tab bar and panels into sidebar
        rightSidebar.insertBefore(panelsContainer, rightSidebar.firstChild);
        rightSidebar.insertBefore(tabBar, rightSidebar.firstChild);

        // Tab click handler
        tabBar.addEventListener('click', (e) => {
            const btn = e.target.closest('.sidebar-tab-btn');
            if (!btn) return;
            const idx = btn.dataset.tabIndex;

            tabBar.querySelectorAll('.sidebar-tab-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');

            panelsContainer.querySelectorAll('.sidebar-tab-panel').forEach(p => p.classList.remove('active'));
            const targetPanel = panelsContainer.querySelector(`.sidebar-tab-panel[data-tab-index="${idx}"]`);
            if (targetPanel) targetPanel.classList.add('active');
        });
    }

    /* ═══════════════════════════════════════════════════════════
       7.  PICKR COLOR PICKER INTEGRATION
       ═══════════════════════════════════════════════════════════ */
    const pickrInstances = [];

    function initPickrColorPickers() {
        if (typeof Pickr === 'undefined') {
            console.warn('Pickr library not loaded, skipping enhanced color pickers.');
            return;
        }

        // Map of color input IDs to upgrade
        const colorInputIds = [
            'name-color',
            'tagline-color',
            'front-bg-start',
            'front-bg-end',
            'back-bg-start',
            'back-bg-end',
            'photo-border-color',
            'logo-shadow-color',
            'photo-shadow-color',
            'name-glow-color',
            'tagline-glow-color',
            'ft-font-color'
        ];

        colorInputIds.forEach(id => {
            const input = document.getElementById(id);
            if (!input || input.type !== 'color') return;

            // Create a Pickr anchor element next to the original input
            const anchor = document.createElement('div');
            anchor.className = 'pickr-anchor';
            input.parentElement.insertBefore(anchor, input.nextSibling);

            // Hide the original input
            input.style.display = 'none';

            try {
                const pickr = Pickr.create({
                    el: anchor,
                    theme: 'nano',
                    default: input.value || '#000000',
                    swatches: [
                        '#e6f0f7', '#4da6ff', '#ffffff', '#000000',
                        '#ff6b6b', '#ffd93d', '#6bcb77', '#4d96ff',
                        '#845ec2', '#f9f871', '#ff9671', '#00c9a7'
                    ],
                    components: {
                        preview: true,
                        opacity: false,
                        hue: true,
                        interaction: {
                            hex: true,
                            input: true,
                            save: true
                        }
                    }
                });

                pickr.on('save', (color) => {
                    if (color) {
                        const hex = color.toHEXA().toString();
                        input.value = hex;
                        input.dispatchEvent(new Event('input', { bubbles: true }));
                    }
                    pickr.hide();
                });

                pickr.on('change', (color) => {
                    if (color) {
                        const hex = color.toHEXA().toString();
                        input.value = hex;
                        input.dispatchEvent(new Event('input', { bubbles: true }));
                    }
                });

                pickrInstances.push({ id, pickr, input });
            } catch (err) {
                console.warn('Failed to init Pickr for', id, err);
                input.style.display = '';  // Show original input as fallback
            }
        });
    }

    /* ═══════════════════════════════════════════════════════════
       8.  AR / EN LANGUAGE SUPPORT FOR NEW UI STRINGS
       ═══════════════════════════════════════════════════════════ */
    const uiStrings = {
        'ft-align-center': { ar: 'توسيط', en: 'Center' },
        'ft-edit-text': { ar: 'تحرير النص', en: 'Edit Text' },
        'ft-reset': { ar: 'إعادة تعيين', en: 'Reset' },
        'ft-font-color': { ar: 'لون الخط', en: 'Font Color' },
        'ft-font-size': { ar: 'حجم الخط', en: 'Font Size' },
    };

    function applyI18n() {
        // Update floating toolbar button titles
        Object.entries(uiStrings).forEach(([id, labels]) => {
            const el = document.getElementById(id);
            if (el) {
                el.title = _en ? labels.en : labels.ar;
                // For wrapper labels
                const wrap = el.closest('[title]');
                if (wrap && wrap !== el) {
                    wrap.title = _en ? labels.en : labels.ar;
                }
            }
        });

        // Update before/after button text
        const baBtn = document.getElementById('before-after-toggle');
        if (baBtn && !baBtn.classList.contains('active')) {
            baBtn.innerHTML = `<i class="fas fa-exchange-alt"></i> ${t('قبل / بعد', 'Before / After')}`;
        }

        // Update tab button labels if tabs were initialized
        const tabBtns = document.querySelectorAll('.sidebar-tab-btn');
        const tabDefs = [
            { labelAr: 'الشعار', labelEn: 'Logo' },
            { labelAr: 'الصورة الشخصية', labelEn: 'Photo' },
            { labelAr: 'الاسم والعنوان', labelEn: 'Text' },
            { labelAr: 'الهاتف', labelEn: 'Phone' },
            { labelAr: 'الروابط', labelEn: 'Links' },
            { labelAr: 'QR', labelEn: 'QR' },
            { labelAr: 'إعدادات', labelEn: 'Settings' },
        ];
        tabBtns.forEach((btn, i) => {
            const def = tabDefs[i];
            if (def) {
                const span = btn.querySelector('span');
                if (span) span.textContent = _en ? def.labelEn : def.labelAr;
                btn.title = _en ? def.labelEn : def.labelAr;
            }
        });
    }

    /* ── Update bootstrap to include new features ── */
    const _origInit = initUXEnhancements;
    function initUXEnhancementsExtended() {
        _origInit();
        initTabs();
        initPickrColorPickers();
        applyI18n();
    }
    // Override the DOMContentLoaded listener
    document.removeEventListener('DOMContentLoaded', initUXEnhancements);
    document.addEventListener('DOMContentLoaded', initUXEnhancementsExtended);

    /* ═══════════════════════════════════════════════════════════
       UTILITIES
       ═══════════════════════════════════════════════════════════ */
    function rgbToHex(rgb) {
        if (!rgb || rgb.startsWith('#')) return rgb || '#000000';
        const result = rgb.match(/\d+/g);
        if (!result || result.length < 3) return '#000000';
        return '#' + result.slice(0, 3).map(x => {
            const hex = parseInt(x, 10).toString(16);
            return hex.length === 1 ? '0' + hex : hex;
        }).join('');
    }

})();
