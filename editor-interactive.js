/**
 * MC PRIME Editor Interactive Enhancements v1.0
 * All 10 features as additive overlay on existing editor.
 */
(function () {
    'use strict';

    // Wait for full DOM + existing scripts to initialize
    document.addEventListener('DOMContentLoaded', function () {
        // Small delay to let existing scripts run first
        setTimeout(initAllEnhancements, 500);
    });

    const IS_EN = document.documentElement.lang === 'en';

    // ==========================================================
    // MAIN INIT
    // ==========================================================
    function initAllEnhancements() {
        console.log('[EditorInteractive] Initializing all enhancements...');
        initAutoOpenPanel();        // Feature 6
        initFloatingToolbar();      // Feature 1
        initInlineTextEditing();    // Feature 2
        initSliderTooltips();       // Feature 4
        initEnhancedColorPicker();  // Feature 5
        initQuickActions();         // Feature 7
        initSidebarTabs();          // Feature 8
        initChangeCounter();        // Feature 9
        initGroupedControls();      // Feature 10
        initDragEnhancements();     // Feature 3
        console.log('[EditorInteractive] All enhancements loaded.');
    }

    // ==========================================================
    // SHARED: Currently selected card element
    // ==========================================================
    let currentSelectedEl = null;
    const CARD_SELECTORS = [
        '#card-logo', '#card-personal-photo-wrapper',
        '#card-name', '#card-tagline',
        '#qr-code-wrapper', '#phone-buttons-wrapper',
        '.phone-button-draggable-wrapper', '.draggable-social-link'
    ];

    function getElementConfig(el) {
        if (!el) return null;
        const id = el.id || '';
        const configs = {
            'card-logo': {
                panelId: 'logo-drop-zone',
                hasColor: false, hasFont: false, hasSize: true,
                sizeInput: 'logo-size', label: IS_EN ? 'Logo' : 'الشعار'
            },
            'card-personal-photo-wrapper': {
                panelId: 'photo-controls-fieldset',
                hasColor: false, hasFont: false, hasSize: true,
                sizeInput: 'photo-size', label: IS_EN ? 'Photo' : 'الصورة'
            },
            'card-name': {
                panelId: 'name-tagline-accordion',
                hasColor: true, hasFont: true, hasSize: true,
                colorInput: 'name-color', fontInput: 'name-font',
                sizeInput: 'name-font-size', label: IS_EN ? 'Name' : 'الاسم'
            },
            'card-tagline': {
                panelId: 'name-tagline-accordion',
                hasColor: true, hasFont: true, hasSize: true,
                colorInput: 'tagline-color', fontInput: 'tagline-font',
                sizeInput: 'tagline-font-size', label: IS_EN ? 'Tagline' : 'المسمى'
            },
            'qr-code-wrapper': {
                panelId: 'qr-code-accordion',
                hasColor: false, hasFont: false, hasSize: true,
                sizeInput: 'qr-size', label: IS_EN ? 'QR Code' : 'QR'
            },
            'phone-buttons-wrapper': {
                panelId: 'phones-accordion',
                hasColor: true, hasFont: false, hasSize: true,
                colorInput: 'phone-btn-bg-color', sizeInput: 'phone-btn-font-size',
                label: IS_EN ? 'Phone' : 'الهاتف'
            }
        };
        return configs[id] || null;
    }

    // ==========================================================
    // FEATURE 6: Auto-open property panel on element click
    // ==========================================================
    function initAutoOpenPanel() {
        document.addEventListener('mousedown', function (e) {
            const target = e.target.closest(CARD_SELECTORS.join(','));
            if (!target) {
                if (!e.target.closest('.pro-sidebar, .pro-toolbar, .floating-prop-bar, .ei-quick-actions, .ei-color-popup')) {
                    deselectAll();
                }
                return;
            }

            // Select the element visually
            selectCardElement(target);

            // Find the associated panel via data-input-target-id
            const panelId = target.getAttribute('data-input-target-id');
            if (panelId) {
                openAndScrollToPanel(panelId);
            } else {
                // Fallback to config-based panel
                const config = getElementConfig(target);
                if (config && config.panelId) {
                    openAndScrollToPanel(config.panelId);
                }
            }
        });
    }

    function selectCardElement(el) {
        deselectAll();
        currentSelectedEl = el;
        el.classList.add('ei-selected');
        showFloatingToolbar(el);
        showQuickActions(el);
    }

    function deselectAll() {
        if (currentSelectedEl) {
            currentSelectedEl.classList.remove('ei-selected');
        }
        currentSelectedEl = null;
        hideFloatingToolbar();
        hideQuickActions();

        // Hide all accordions and show placeholder
        document.querySelectorAll('.pro-sidebar-right .fieldset-accordion').forEach(acc => {
            acc.classList.remove('ei-active-panel');
            acc.open = false;
        });
        const placeholder = document.getElementById('ei-empty-selection');
        if (placeholder) placeholder.classList.remove('hidden');

        // Deactivate all sidebar tabs
        document.querySelectorAll('.ei-sidebar-tab').forEach(t => t.classList.remove('active'));
    }

    function openAndScrollToPanel(panelId) {
        const panel = document.getElementById(panelId);
        if (!panel) return;

        let targetAccordion = null;

        // Walk up to find the <details> accordion
        let current = panel;
        while (current) {
            if (current.tagName === 'DETAILS' && current.classList.contains('fieldset-accordion')) {
                current.open = true;
                targetAccordion = current;
                break;
            }
            current = current.parentElement;
        }

        // If the panel itself is a <details>, open it
        if (!targetAccordion && panel.tagName === 'DETAILS' && panel.classList.contains('fieldset-accordion')) {
            panel.open = true;
            targetAccordion = panel;
        }

        // Hide placeholder
        const placeholder = document.getElementById('ei-empty-selection');
        if (placeholder) placeholder.classList.add('hidden');

        // Manage active accordion class
        const accordions = Array.from(document.querySelectorAll('.pro-sidebar-right .fieldset-accordion'));
        accordions.forEach((acc, index) => {
            if (acc === targetAccordion) {
                acc.classList.add('ei-active-panel');
                acc.open = true;

                // Activate the corresponding tab if it exists
                const tabBar = document.querySelector('.ei-sidebar-tabs');
                if (tabBar && tabBar.children[index]) {
                    Array.from(tabBar.children).forEach(t => t.classList.remove('active'));
                    tabBar.children[index].classList.add('active');
                }
            } else {
                acc.classList.remove('ei-active-panel');
                acc.open = false; // Close others
            }
        });

        // Scroll into view with a nice animation
        setTimeout(() => {
            if (targetAccordion) {
                // targetAccordion.scrollIntoView({ behavior: 'smooth', block: 'start' });
                // We might not even need to scroll if it's the only one visible!
                panel.classList.add('ei-panel-highlight');
                setTimeout(() => panel.classList.remove('ei-panel-highlight'), 1500);
            }
        }, 100);
    }

    // ==========================================================
    // FEATURE 1: Floating Property Toolbar
    // ==========================================================
    let floatingBar = null;

    function initFloatingToolbar() {
        floatingBar = document.createElement('div');
        floatingBar.className = 'floating-prop-bar';
        floatingBar.id = 'floating-prop-bar';
        document.body.appendChild(floatingBar);

        // Reposition on scroll/resize
        window.addEventListener('scroll', repositionFloatingBar, true);
        window.addEventListener('resize', repositionFloatingBar);
    }

    function showFloatingToolbar(el) {
        if (!floatingBar) return;
        const config = getElementConfig(el);
        floatingBar.innerHTML = '';

        // Element label
        const label = document.createElement('span');
        label.className = 'fpb-label';
        label.textContent = config ? config.label : (IS_EN ? 'Element' : 'عنصر');
        floatingBar.appendChild(label);

        floatingBar.appendChild(createDivider());

        if (config) {
            // Color button
            if (config.hasColor && config.colorInput) {
                const colorInput = document.getElementById(config.colorInput);
                if (colorInput) {
                    const swatch = document.createElement('div');
                    swatch.className = 'fpb-color-swatch';
                    swatch.style.backgroundColor = colorInput.value;
                    swatch.title = IS_EN ? 'Color' : 'اللون';

                    const hiddenInput = document.createElement('input');
                    hiddenInput.type = 'color';
                    hiddenInput.className = 'fpb-color-input';
                    hiddenInput.value = colorInput.value;

                    swatch.addEventListener('click', () => hiddenInput.click());
                    hiddenInput.addEventListener('input', (e) => {
                        swatch.style.backgroundColor = e.target.value;
                        colorInput.value = e.target.value;
                        colorInput.dispatchEvent(new Event('input', { bubbles: true }));
                    });

                    floatingBar.appendChild(swatch);
                    floatingBar.appendChild(hiddenInput);
                    floatingBar.appendChild(createDivider());
                }
            }

            // Size adjustment buttons
            if (config.hasSize && config.sizeInput) {
                const sizeInput = document.getElementById(config.sizeInput);
                if (sizeInput) {
                    const minusBtn = createFpbBtn('fa-minus', IS_EN ? 'Decrease' : 'تصغير');
                    const sizeDisplay = document.createElement('span');
                    sizeDisplay.className = 'fpb-size-display';
                    sizeDisplay.textContent = sizeInput.value;
                    const plusBtn = createFpbBtn('fa-plus', IS_EN ? 'Increase' : 'تكبير');

                    minusBtn.addEventListener('click', () => {
                        sizeInput.value = Math.max(parseInt(sizeInput.min) || 0, parseInt(sizeInput.value) - 1);
                        sizeInput.dispatchEvent(new Event('input', { bubbles: true }));
                        sizeDisplay.textContent = sizeInput.value;
                    });

                    plusBtn.addEventListener('click', () => {
                        sizeInput.value = Math.min(parseInt(sizeInput.max) || 100, parseInt(sizeInput.value) + 1);
                        sizeInput.dispatchEvent(new Event('input', { bubbles: true }));
                        sizeDisplay.textContent = sizeInput.value;
                    });

                    floatingBar.appendChild(minusBtn);
                    floatingBar.appendChild(sizeDisplay);
                    floatingBar.appendChild(plusBtn);
                    floatingBar.appendChild(createDivider());
                }
            }

            // Font selector button (for text elements)
            if (config.hasFont && config.fontInput) {
                const fontSelect = document.getElementById(config.fontInput);
                if (fontSelect) {
                    const fontBtn = createFpbBtn('fa-font', IS_EN ? 'Font' : 'الخط');
                    fontBtn.addEventListener('click', () => {
                        // Cycle through font options
                        const options = fontSelect.options;
                        let newIndex = (fontSelect.selectedIndex + 1) % options.length;
                        fontSelect.selectedIndex = newIndex;
                        fontSelect.dispatchEvent(new Event('change', { bubbles: true }));
                    });
                    floatingBar.appendChild(fontBtn);
                }
            }
        }

        // Edit button (for text elements)
        if (el.id === 'card-name' || el.id === 'card-tagline') {
            const editBtn = createFpbBtn('fa-pen', IS_EN ? 'Edit Text' : 'تعديل');
            editBtn.addEventListener('click', () => startInlineEdit(el));
            floatingBar.appendChild(editBtn);
        }

        // Position the bar
        positionFloatingBar(el);

        // Show with animation
        requestAnimationFrame(() => {
            floatingBar.classList.add('visible');
        });
    }

    function hideFloatingToolbar() {
        if (floatingBar) {
            floatingBar.classList.remove('visible');
        }
    }

    function repositionFloatingBar() {
        if (currentSelectedEl && floatingBar && floatingBar.classList.contains('visible')) {
            positionFloatingBar(currentSelectedEl);
        }
    }

    function positionFloatingBar(el) {
        if (!floatingBar) return;
        const rect = el.getBoundingClientRect();
        const barHeight = 44;
        const gap = 12;

        let top = rect.top - barHeight - gap;
        let left = rect.left + (rect.width / 2);

        // If not enough space above, place below
        if (top < 10) {
            top = rect.bottom + gap;
            floatingBar.classList.add('above');
        } else {
            floatingBar.classList.remove('above');
        }

        floatingBar.style.top = top + 'px';
        floatingBar.style.left = left + 'px';
        floatingBar.style.transform = 'translateX(-50%)';
    }

    function createFpbBtn(iconClass, title) {
        const btn = document.createElement('button');
        btn.className = 'fpb-btn';
        btn.title = title;
        btn.type = 'button';
        btn.innerHTML = `<i class="fas ${iconClass}"></i>`;
        return btn;
    }

    function createDivider() {
        const d = document.createElement('div');
        d.className = 'fpb-divider';
        return d;
    }

    // ==========================================================
    // FEATURE 2: Inline Text Editing
    // ==========================================================
    function initInlineTextEditing() {
        const textElements = ['#card-name', '#card-tagline'];

        textElements.forEach(selector => {
            const el = document.querySelector(selector);
            if (!el) return;

            el.addEventListener('dblclick', function (e) {
                e.preventDefault();
                e.stopPropagation();
                startInlineEdit(el);
            });
        });
    }

    function startInlineEdit(el) {
        if (el.classList.contains('inline-editing')) return;

        el.classList.add('inline-editing');
        el.contentEditable = 'true';
        el.focus();

        // Select all text
        const range = document.createRange();
        range.selectNodeContents(el);
        const sel = window.getSelection();
        sel.removeAllRanges();
        sel.addRange(range);

        const finishEdit = () => {
            el.contentEditable = 'false';
            el.classList.remove('inline-editing');
            syncInlineEditToSidebar(el);
            el.removeEventListener('blur', finishEdit);
            el.removeEventListener('keydown', handleKey);
        };

        const handleKey = (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                el.blur();
            }
            if (e.key === 'Escape') {
                el.blur();
            }
        };

        el.addEventListener('blur', finishEdit);
        el.addEventListener('keydown', handleKey);

        // Sync on each keystroke for live preview
        el.addEventListener('input', function onInput() {
            syncInlineEditToSidebar(el);
            if (!el.classList.contains('inline-editing')) {
                el.removeEventListener('input', onInput);
            }
        });
    }

    function syncInlineEditToSidebar(el) {
        const text = el.innerText.trim();
        const langSuffix = IS_EN ? '_en' : '_ar';

        if (el.id === 'card-name') {
            const input = document.getElementById('input-name' + langSuffix);
            if (input) input.value = text;
        } else if (el.id === 'card-tagline') {
            const input = document.getElementById('input-tagline' + langSuffix);
            if (input) input.value = text;
        }
    }

    // ==========================================================
    // FEATURE 3: Drag Enhancements
    // ==========================================================
    function initDragEnhancements() {
        // Add visual snap guides to the card containers
        const cardFaces = document.querySelectorAll('.card-face');
        cardFaces.forEach(face => {
            // Create center snap guides
            const hGuide = document.createElement('div');
            hGuide.className = 'ei-snap-guide horizontal';
            hGuide.style.top = '50%';
            face.appendChild(hGuide);

            const vGuide = document.createElement('div');
            vGuide.className = 'ei-snap-guide vertical';
            vGuide.style.left = '50%';
            face.appendChild(vGuide);

            // Store references
            face._hGuide = hGuide;
            face._vGuide = vGuide;
        });

        // Observe interact.js drag events for snap feedback
        document.addEventListener('dragmove', function (e) {
            const target = e.target;
            if (!target) return;
            const face = target.closest('.card-face');
            if (!face) return;

            const faceRect = face.getBoundingClientRect();
            const elRect = target.getBoundingClientRect();
            const elCenterX = elRect.left + elRect.width / 2 - faceRect.left;
            const elCenterY = elRect.top + elRect.height / 2 - faceRect.top;
            const faceCenterX = faceRect.width / 2;
            const faceCenterY = faceRect.height / 2;
            const snapThreshold = 8;

            // Show/hide horizontal snap guide
            if (Math.abs(elCenterY - faceCenterY) < snapThreshold) {
                face._hGuide && face._hGuide.classList.add('visible');
            } else {
                face._hGuide && face._hGuide.classList.remove('visible');
            }

            // Show/hide vertical snap guide
            if (Math.abs(elCenterX - faceCenterX) < snapThreshold) {
                face._vGuide && face._vGuide.classList.add('visible');
            } else {
                face._vGuide && face._vGuide.classList.remove('visible');
            }
        });

        document.addEventListener('dragend', function () {
            document.querySelectorAll('.ei-snap-guide').forEach(g => g.classList.remove('visible'));
        });
    }

    // ==========================================================
    // FEATURE 4: Slider Live Preview Tooltips
    // ==========================================================
    function initSliderTooltips() {
        const sliders = document.querySelectorAll('.pro-sidebar input[type="range"]');

        sliders.forEach(slider => {
            // Skip if already wrapped
            if (slider.parentElement.classList.contains('ei-slider-wrapper')) return;

            const wrapper = document.createElement('div');
            wrapper.className = 'ei-slider-wrapper';
            wrapper.style.display = 'flex';
            wrapper.style.alignItems = 'center';
            wrapper.style.position = 'relative';

            // Create tooltip
            const tooltip = document.createElement('div');
            tooltip.className = 'ei-slider-tooltip';

            // Create numeric input
            const numInput = document.createElement('input');
            numInput.type = 'number';
            numInput.className = 'ei-numeric-input';
            numInput.min = slider.min;
            numInput.max = slider.max;
            numInput.step = slider.step || '1';
            numInput.value = slider.value;

            // Get unit from data attribute
            const unit = slider.getAttribute('data-update-unit') || '';

            const updateTooltipText = () => {
                tooltip.textContent = slider.value + (unit || '');
            };
            updateTooltipText();

            // Insert wrapper
            slider.parentNode.insertBefore(wrapper, slider);
            wrapper.appendChild(tooltip);
            wrapper.appendChild(slider);
            wrapper.appendChild(numInput);

            // Events
            slider.addEventListener('input', () => {
                numInput.value = slider.value;
                updateTooltipText();
                wrapper.classList.add('active');
            });

            slider.addEventListener('change', () => {
                setTimeout(() => wrapper.classList.remove('active'), 500);
            });

            slider.addEventListener('mousedown', () => wrapper.classList.add('active'));
            slider.addEventListener('mouseup', () => {
                setTimeout(() => wrapper.classList.remove('active'), 500);
            });

            numInput.addEventListener('input', () => {
                let val = parseFloat(numInput.value);
                const min = parseFloat(slider.min);
                const max = parseFloat(slider.max);
                if (isNaN(val)) return;
                val = Math.max(min, Math.min(max, val));
                slider.value = val;
                updateTooltipText();
                slider.dispatchEvent(new Event('input', { bubbles: true }));
            });
        });
    }

    // ==========================================================
    // FEATURE 5: Enhanced Color Picker
    // ==========================================================
    const COLOR_PALETTES = [
        // Modern Professional
        '#1a1a2e', '#16213e', '#0f3460', '#533483', '#e94560',
        '#2a3d54', '#223246', '#4da6ff', '#e6f0f7', '#364f6b',
        // Warm Tones
        '#ff6b6b', '#ffa07a', '#ffd93d', '#6bcb77', '#4d96ff',
        // Neutrals
        '#ffffff', '#f5f5f5', '#e0e0e0', '#9e9e9e', '#424242',
        '#212121', '#000000', '#aab8c2', '#8fa7c0', '#6b8299'
    ];

    const RECENT_COLORS_KEY = 'mcprime_recent_colors';

    function getRecentColors() {
        try {
            return JSON.parse(localStorage.getItem(RECENT_COLORS_KEY)) || [];
        } catch (e) {
            return [];
        }
    }

    function addRecentColor(color) {
        let recent = getRecentColors();
        recent = recent.filter(c => c !== color);
        recent.unshift(color);
        recent = recent.slice(0, 8);
        localStorage.setItem(RECENT_COLORS_KEY, JSON.stringify(recent));
    }

    function initEnhancedColorPicker() {
        const colorInputs = document.querySelectorAll('.pro-sidebar input[type="color"]');

        colorInputs.forEach(input => {
            // Skip if already enhanced
            if (input.parentElement.classList.contains('ei-color-wrapper')) return;
            // Skip hidden inputs inside the floating bar
            if (input.classList.contains('fpb-color-input')) return;

            const wrapper = document.createElement('div');
            wrapper.className = 'ei-color-wrapper';

            const trigger = document.createElement('div');
            trigger.className = 'ei-color-trigger';

            const preview = document.createElement('div');
            preview.className = 'ei-color-preview';
            preview.style.backgroundColor = input.value;

            const hex = document.createElement('span');
            hex.className = 'ei-color-hex';
            hex.textContent = input.value;

            trigger.appendChild(preview);
            trigger.appendChild(hex);

            // Create popup
            const popup = document.createElement('div');
            popup.className = 'ei-color-popup';

            // Suggested colors
            const sugTitle = document.createElement('div');
            sugTitle.className = 'ei-color-popup-title';
            sugTitle.textContent = IS_EN ? '🎨 Suggested Colors' : '🎨 ألوان مقترحة';
            popup.appendChild(sugTitle);

            const swatchGrid = document.createElement('div');
            swatchGrid.className = 'ei-swatches-grid';
            COLOR_PALETTES.forEach(color => {
                const swatch = document.createElement('div');
                swatch.className = 'ei-swatch';
                swatch.style.backgroundColor = color;
                swatch.addEventListener('click', (e) => {
                    e.stopPropagation();
                    applyColor(input, color, preview, hex);
                    addRecentColor(color);
                    popup.classList.remove('visible');
                });
                swatchGrid.appendChild(swatch);
            });
            popup.appendChild(swatchGrid);

            // Recent colors section
            const recentTitle = document.createElement('div');
            recentTitle.className = 'ei-color-popup-title';
            recentTitle.textContent = IS_EN ? '📋 Recent Colors' : '📋 آخر الألوان';
            popup.appendChild(recentTitle);

            const recentContainer = document.createElement('div');
            recentContainer.className = 'ei-recent-colors';
            popup.appendChild(recentContainer);

            popup.appendChild(document.createElement('hr'));

            // Custom color button
            const customBtn = document.createElement('button');
            customBtn.className = 'ei-color-custom-btn';
            customBtn.type = 'button';
            customBtn.textContent = IS_EN ? '🔍 Choose custom color...' : '🔍 اختر لون آخر...';
            customBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                input.click();
                popup.classList.remove('visible');
            });
            popup.appendChild(customBtn);

            // Insert into DOM
            input.parentNode.insertBefore(wrapper, input);
            wrapper.appendChild(trigger);
            wrapper.appendChild(popup);
            wrapper.appendChild(input);
            input.style.position = 'absolute';
            input.style.opacity = '0';
            input.style.width = '0';
            input.style.height = '0';
            input.style.pointerEvents = 'none';

            // Toggle popup
            trigger.addEventListener('click', (e) => {
                e.stopPropagation();
                // Update recent colors
                recentContainer.innerHTML = '';
                getRecentColors().forEach(color => {
                    const swatch = document.createElement('div');
                    swatch.className = 'ei-swatch';
                    swatch.style.backgroundColor = color;
                    swatch.style.width = '24px';
                    swatch.style.height = '24px';
                    swatch.addEventListener('click', (ev) => {
                        ev.stopPropagation();
                        applyColor(input, color, preview, hex);
                        popup.classList.remove('visible');
                    });
                    recentContainer.appendChild(swatch);
                });

                // Close other popups
                document.querySelectorAll('.ei-color-popup.visible').forEach(p => {
                    if (p !== popup) p.classList.remove('visible');
                });
                popup.classList.toggle('visible');
            });

            // Sync when native picker changes
            input.addEventListener('input', () => {
                preview.style.backgroundColor = input.value;
                hex.textContent = input.value;
                addRecentColor(input.value);
            });

            // Close popup on outside click
            document.addEventListener('click', (e) => {
                if (!wrapper.contains(e.target)) {
                    popup.classList.remove('visible');
                }
            });
        });
    }

    function applyColor(input, color, preview, hex) {
        input.value = color;
        preview.style.backgroundColor = color;
        hex.textContent = color;
        input.dispatchEvent(new Event('input', { bubbles: true }));
    }

    // ==========================================================
    // FEATURE 7: Quick Action Buttons
    // ==========================================================
    let quickActionsEl = null;

    function initQuickActions() {
        quickActionsEl = document.createElement('div');
        quickActionsEl.className = 'ei-quick-actions';
        quickActionsEl.id = 'ei-quick-actions';
        document.body.appendChild(quickActionsEl);
    }

    function showQuickActions(el) {
        if (!quickActionsEl) return;
        quickActionsEl.innerHTML = '';

        // Hide button
        const hideBtn = createQABtn('fa-eye-slash', IS_EN ? 'Hide' : 'إخفاء', 'danger');
        hideBtn.addEventListener('click', () => {
            el.style.display = el.style.display === 'none' ? '' : 'none';
            deselectAll();
        });
        quickActionsEl.appendChild(hideBtn);

        // Lock/Unlock button
        const isLocked = el.dataset.eiLocked === 'true';
        const lockBtn = createQABtn(
            isLocked ? 'fa-lock-open' : 'fa-lock',
            isLocked ? (IS_EN ? 'Unlock' : 'فتح القفل') : (IS_EN ? 'Lock' : 'قفل')
        );
        lockBtn.addEventListener('click', () => {
            el.dataset.eiLocked = el.dataset.eiLocked === 'true' ? 'false' : 'true';
            el.style.pointerEvents = el.dataset.eiLocked === 'true' ? 'none' : '';
            showQuickActions(el); // refresh
        });
        quickActionsEl.appendChild(lockBtn);

        // Bring to front / send to back
        const layerUpBtn = createQABtn('fa-layer-group', IS_EN ? 'Bring Forward' : 'للأمام');
        layerUpBtn.addEventListener('click', () => {
            const currentZ = parseInt(getComputedStyle(el).zIndex) || 0;
            el.style.zIndex = currentZ + 1;
        });
        quickActionsEl.appendChild(layerUpBtn);

        // Position
        const rect = el.getBoundingClientRect();
        quickActionsEl.style.position = 'fixed';
        quickActionsEl.style.top = (rect.top - 40) + 'px';
        quickActionsEl.style.left = (rect.left + rect.width / 2) + 'px';
        quickActionsEl.style.transform = 'translateX(-50%)';

        requestAnimationFrame(() => {
            quickActionsEl.classList.add('visible');
        });
    }

    function hideQuickActions() {
        if (quickActionsEl) {
            quickActionsEl.classList.remove('visible');
        }
    }

    function createQABtn(iconClass, title, extraClass) {
        const btn = document.createElement('button');
        btn.className = 'ei-qa-btn' + (extraClass ? ' ' + extraClass : '');
        btn.title = title;
        btn.type = 'button';
        btn.innerHTML = `<i class="fas ${iconClass}"></i>`;
        return btn;
    }

    // ==========================================================
    // FEATURE 8: Sidebar Tab Navigation
    // ==========================================================
    function initSidebarTabs() {
        const rightSidebar = document.getElementById('panel-elements');
        if (!rightSidebar) return;

        const tabs = [
            { icon: 'fa-star', label: IS_EN ? 'Logo' : 'شعار', index: 0 },
            { icon: 'fa-user', label: IS_EN ? 'Photo' : 'صورة', index: 1 },
            { icon: 'fa-font', label: IS_EN ? 'Text' : 'نص', index: 2 },
            { icon: 'fa-phone', label: IS_EN ? 'Phone' : 'هاتف', index: 3 },
            { icon: 'fa-qrcode', label: 'QR', index: 4 },
            { icon: 'fa-link', label: IS_EN ? 'Links' : 'روابط', index: 5 }
        ];

        const tabBar = document.createElement('div');
        tabBar.className = 'ei-sidebar-tabs';

        const accordions = rightSidebar.querySelectorAll(':scope > details.fieldset-accordion');

        tabs.forEach((tab, i) => {
            if (i >= accordions.length) return;

            const tabBtn = document.createElement('button');
            tabBtn.className = 'ei-sidebar-tab';
            tabBtn.type = 'button';
            tabBtn.innerHTML = `<i class="fas ${tab.icon}"></i><span>${tab.label}</span>`;

            tabBtn.addEventListener('click', () => {
                // Remove active from all tabs
                tabBar.querySelectorAll('.ei-sidebar-tab').forEach(t => t.classList.remove('active'));
                tabBtn.classList.add('active');

                // Open the target accordion and close others
                accordions.forEach((acc, j) => {
                    acc.open = (j === i);
                    if (j === i) {
                        acc.classList.add('ei-active-panel');
                    } else {
                        acc.classList.remove('ei-active-panel');
                    }
                });

                // Hide placeholder
                const placeholder = document.getElementById('ei-empty-selection');
                if (placeholder) placeholder.classList.add('hidden');

                // Scroll to it
                if (accordions[i]) {
                    accordions[i].scrollIntoView({ behavior: 'smooth', block: 'start' });
                }
            });

            tabBar.appendChild(tabBtn);
        });

        // Insert tab bar at the top of the right sidebar
        rightSidebar.insertBefore(tabBar, rightSidebar.firstChild);

        // Highlight active tab when user manually opens accordions
        accordions.forEach((acc, i) => {
            acc.addEventListener('toggle', () => {
                if (acc.open) {
                    tabBar.querySelectorAll('.ei-sidebar-tab').forEach(t => t.classList.remove('active'));
                    const matchingTab = tabBar.children[i];
                    if (matchingTab) matchingTab.classList.add('active');
                }
            });
        });
    }

    // ==========================================================
    // FEATURE 9: Change Counter / Undo Indicator
    // ==========================================================
    function initChangeCounter() {
        let changeCount = 0;
        const undoBtn = document.getElementById('undo-btn');
        if (!undoBtn) return;

        // Make the undo button container relative for badge positioning
        undoBtn.style.position = 'relative';

        let badge = null;

        function updateBadge() {
            if (changeCount <= 0) {
                if (badge) badge.remove();
                badge = null;
                return;
            }

            if (!badge) {
                badge = document.createElement('span');
                badge.className = 'ei-change-badge';
                undoBtn.appendChild(badge);
            }

            badge.textContent = changeCount > 9 ? '9+' : changeCount;
        }

        // Listen for input changes in the sidebar
        document.querySelectorAll('.pro-sidebar input, .pro-sidebar select, .pro-sidebar textarea').forEach(input => {
            const eventType = (input.type === 'range' || input.type === 'color') ? 'input' : 'change';
            input.addEventListener(eventType, () => {
                changeCount++;
                updateBadge();
            });
        });

        // Reset on undo click
        undoBtn.addEventListener('click', () => {
            changeCount = Math.max(0, changeCount - 1);
            updateBadge();
        });

        // Reset on save
        const saveBtn = document.getElementById('save-to-cloud-btn');
        if (saveBtn) {
            saveBtn.addEventListener('click', () => {
                changeCount = 0;
                updateBadge();
            });
        }
    }

    // ==========================================================
    // FEATURE 10: Grouped Controls (Visual Enhancement)
    // ==========================================================
    function initGroupedControls() {
        // Find control-grid elements that contain font-related controls and group them visually
        const rightSidebar = document.getElementById('panel-elements');
        if (!rightSidebar) return;

        // Add group styling to existing control-grids
        const controlGrids = rightSidebar.querySelectorAll('.control-grid');
        controlGrids.forEach(grid => {
            // Check if it contains font-related controls
            const hasFontControls = grid.querySelector('[id*="font-size"], [id*="color"], [id*="font"]');
            if (hasFontControls) {
                grid.classList.add('ei-prop-group');

                // Determine the group type
                let iconClass = 'fa-sliders-h';
                let groupLabel = IS_EN ? 'Settings' : 'إعدادات';

                const hasSizeInput = grid.querySelector('[id*="font-size"], [id*="-size"]');
                const hasColorInput = grid.querySelector('[id*="color"]');

                if (hasSizeInput && hasColorInput) {
                    iconClass = 'fa-palette';
                    groupLabel = IS_EN ? 'Style' : 'التنسيق';
                } else if (hasSizeInput) {
                    iconClass = 'fa-text-height';
                    groupLabel = IS_EN ? 'Size' : 'الحجم';
                } else if (hasColorInput) {
                    iconClass = 'fa-palette';
                    groupLabel = IS_EN ? 'Color' : 'اللون';
                }

                // Add title if not already present
                if (!grid.querySelector('.ei-prop-group-title')) {
                    const title = document.createElement('div');
                    title.className = 'ei-prop-group-title';
                    title.innerHTML = `<i class="fas ${iconClass}"></i> ${groupLabel}`;
                    grid.insertBefore(title, grid.firstChild);
                }
            }
        });
    }

})();
