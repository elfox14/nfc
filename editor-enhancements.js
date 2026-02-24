/**
 * MC PRIME NFC Editor Enhancements
 * Features: Progress Bar, Auto-save, Keyboard Shortcuts, Full Preview
 */

(function () {
    'use strict';

    // Wait for DOM
    document.addEventListener('DOMContentLoaded', initEditorEnhancements);

    function initEditorEnhancements() {
        // createProgressBar();
        initKeyboardShortcuts();
        initFullPreviewMode();
        initZoomControls();
        createMobileBottomToolbar();
        enhanceAccordions();
        initTrialBanner();
        initMoreMenu();
        initAutoSaveIndicator();

        init3DPreview();
        initThemeToggle();

        // Initialize Properties Panel
        PropertiesPanel.init();
    }

    // ===========================================
    // THEME TOGGLE
    // ===========================================
    function initThemeToggle() {
        const btn = document.getElementById('theme-toggle-btn');
        const icon = btn ? btn.querySelector('i') : null;
        const html = document.documentElement;

        // Load saved theme
        const savedTheme = localStorage.getItem('theme') || 'dark';
        if (savedTheme === 'light') {
            html.setAttribute('data-theme', 'light');
            if (icon) { icon.classList.remove('fa-sun'); icon.classList.add('fa-moon'); }
        }

        if (btn) {
            btn.addEventListener('click', () => {
                const currentTheme = html.getAttribute('data-theme');
                if (currentTheme === 'light') {
                    // Switch to Dark
                    html.removeAttribute('data-theme');
                    localStorage.setItem('theme', 'dark');
                    if (icon) { icon.classList.remove('fa-moon'); icon.classList.add('fa-sun'); }
                } else {
                    // Switch to Light
                    html.setAttribute('data-theme', 'light');
                    localStorage.setItem('theme', 'light');
                    if (icon) { icon.classList.remove('fa-sun'); icon.classList.add('fa-moon'); }
                }
            });
        }
    }

    // ===========================================
    // 3D PREVIEW
    // ===========================================
    function init3DPreview() {
        const btn = document.getElementById('preview-3d-btn');
        const wrapper = document.querySelector('.cards-wrapper');
        const frontCard = document.querySelector('.card-face.card-front');
        const backCard = document.querySelector('.card-face.card-back');

        if (!btn || !wrapper) return;

        let is3DMode = false;
        let isDragging = false;
        let startX, currentRotationY = 0;

        btn.addEventListener('click', () => {
            is3DMode = !is3DMode;
            wrapper.classList.toggle('mode-3d', is3DMode);
            btn.classList.toggle('active', is3DMode);

            if (is3DMode) {
                // Initial Flip Animation
                setTimeout(() => wrapper.classList.add('flipped'), 500);
                setTimeout(() => wrapper.classList.remove('flipped'), 1500);
            } else {
                // Reset state
                wrapper.classList.remove('flipped', 'interactive');
                if (frontCard) frontCard.style.transform = '';
                if (backCard) backCard.style.transform = '';
                currentRotationY = 0;
            }
        });

        // Interactive Drag to Rotate
        wrapper.addEventListener('mousedown', (e) => {
            if (!is3DMode) return;
            isDragging = true;
            startX = e.pageX;
            wrapper.classList.add('interactive');
        });

        window.addEventListener('mousemove', (e) => {
            if (!isDragging || !is3DMode) return;
            const deltaX = e.pageX - startX;
            const rotationY = currentRotationY + (deltaX * 0.5); // Sensitivity

            if (frontCard) frontCard.style.transform = `translate(-50%, -50%) rotateY(${rotationY}deg)`;
            if (backCard) backCard.style.transform = `translate(-50%, -50%) rotateY(${rotationY + 180}deg)`;
        });

        window.addEventListener('mouseup', (e) => {
            if (!isDragging || !is3DMode) return;
            isDragging = false;
            currentRotationY += (e.pageX - startX) * 0.5;
            wrapper.classList.remove('interactive');
        });

        // Touch support for mobile
        wrapper.addEventListener('touchstart', (e) => {
            if (!is3DMode) return;
            isDragging = true;
            startX = e.touches[0].pageX;
            wrapper.classList.add('interactive');
        });

        window.addEventListener('touchmove', (e) => {
            if (!isDragging || !is3DMode) return;
            const deltaX = e.touches[0].pageX - startX;
            const rotationY = currentRotationY + (deltaX * 0.5);

            if (frontCard) frontCard.style.transform = `translate(-50%, -50%) rotateY(${rotationY}deg)`;
            if (backCard) backCard.style.transform = `translate(-50%, -50%) rotateY(${rotationY + 180}deg)`;
        });

        window.addEventListener('touchend', (e) => {
            if (!isDragging || !is3DMode) return;
            isDragging = false;
            // Approximate delta since we don't have changedTouches easily accessible here usually in same way, 
            // but for simplicity we rely on last move. Improved logic would track lastX.
            wrapper.classList.remove('interactive');
            // For better UX, snap to nearest 180
        });
    }

    // ===========================================
    // AUTO-SAVE INDICATOR
    // ===========================================
    function initAutoSaveIndicator() {
        const indicator = document.getElementById('autosave-indicator');
        const statusText = document.getElementById('autosave-status');

        if (!indicator || !statusText) return;

        // Update indicator when design changes
        let saveTimeout;

        // Listen for any input changes in the sidebar
        document.querySelectorAll('.right-sidebar input, .right-sidebar select, .right-sidebar textarea').forEach(el => {
            el.addEventListener('input', () => {
                // Show "saving" state
                indicator.classList.remove('error');
                indicator.classList.add('saving');
                statusText.textContent = 'جاري الحفظ...';

                // Clear previous timeout
                clearTimeout(saveTimeout);

                // After 1.5 seconds, show "saved" state
                saveTimeout = setTimeout(() => {
                    indicator.classList.remove('saving');
                    statusText.textContent = 'محفوظ';

                    // Add timestamp
                    const now = new Date();
                    const time = now.toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' });
                    indicator.title = `آخر حفظ: ${time}`;
                }, 1500);
            });
        });

        // Expose function to update indicator from other scripts
        window.updateAutoSaveIndicator = function (status) {
            if (status === 'saving') {
                indicator.classList.remove('error');
                indicator.classList.add('saving');
                statusText.textContent = 'جاري الحفظ...';
            } else if (status === 'saved') {
                indicator.classList.remove('saving', 'error');
                statusText.textContent = 'محفوظ';
            } else if (status === 'error') {
                indicator.classList.remove('saving');
                indicator.classList.add('error');
                statusText.textContent = 'خطأ في الحفظ';
            }
        };
    }

    // ===========================================
    // TRIAL BANNER
    // ===========================================
    function initTrialBanner() {
        const banner = document.getElementById('trial-banner');
        const closeBtn = document.getElementById('close-trial-banner');

        if (!banner || !closeBtn) return;

        // Check if user dismissed the banner before
        const dismissed = localStorage.getItem('trial_banner_dismissed');
        if (dismissed) {
            banner.style.display = 'none';
            return;
        }

        closeBtn.addEventListener('click', () => {
            banner.style.display = 'none';
            localStorage.setItem('trial_banner_dismissed', 'true');
        });
    }

    // ===========================================
    // MORE MENU (Toolbar)
    // ===========================================
    // ===========================================
    // MORE MENU (Toolbar)
    // ===========================================
    function initMoreMenu() {
        const moreBtn = document.getElementById('toolbar-more-btn');
        const moreMenu = document.getElementById('toolbar-more-menu-floating');

        // Toggle menu
        if (moreBtn && moreMenu) {
            moreBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                moreMenu.classList.toggle('open');
            });

            // Close when clicking outside
            document.addEventListener('click', () => {
                moreMenu.classList.remove('open');
            });

            // Prevent menu from closing when clicking inside
            moreMenu.addEventListener('click', (e) => {
                e.stopPropagation();
            });
        }

        // === Link new menu buttons to original functionality ===

        // Theme Toggle
        const themeBtn = document.getElementById('theme-toggle-btn-menu');
        if (themeBtn) {
            themeBtn.addEventListener('click', () => {
                if (moreMenu) moreMenu.classList.remove('open');
                const originalBtn = document.getElementById('theme-toggle-btn');
                if (originalBtn) originalBtn.click();
            });
        }

        // Collaborative editing
        const collabBtn = document.getElementById('start-collab-btn-menu');
        if (collabBtn) {
            collabBtn.addEventListener('click', () => {
                if (moreMenu) moreMenu.classList.remove('open');
                const originalBtn = document.getElementById('start-collab-btn');
                if (originalBtn) originalBtn.click();
            });
        }

        // Show Gallery
        const galleryBtn = document.getElementById('show-gallery-btn-menu');
        if (galleryBtn) {
            galleryBtn.addEventListener('click', () => {
                if (moreMenu) moreMenu.classList.remove('open');
                const originalBtn = document.getElementById('show-gallery-btn');
                if (originalBtn) originalBtn.click();
            });
        }

        // Save to Gallery
        const saveGalleryBtn = document.getElementById('save-to-gallery-btn-menu');
        if (saveGalleryBtn) {
            saveGalleryBtn.addEventListener('click', () => {
                if (moreMenu) moreMenu.classList.remove('open');
                const originalBtn = document.getElementById('save-to-gallery-btn');
                if (originalBtn) originalBtn.click();
            });
        }

        // Share Editor Link
        const shareEditorBtn = document.getElementById('share-editor-btn-menu');
        if (shareEditorBtn) {
            shareEditorBtn.addEventListener('click', () => {
                if (moreMenu) moreMenu.classList.remove('open');
                const originalBtn = document.getElementById('share-editor-btn');
                if (originalBtn) originalBtn.click();
            });
        }

        // Reset Design
        const resetBtn = document.getElementById('reset-design-btn-menu');
        if (resetBtn) {
            resetBtn.addEventListener('click', () => {
                if (moreMenu) moreMenu.classList.remove('open');
                const originalBtn = document.getElementById('reset-design-btn');
                if (originalBtn) originalBtn.click();
            });
        }
    }

    // ===========================================
    // PROGRESS BAR
    // ===========================================
    const STEPS = [
        { id: 'design', label: 'Design', icon: 'fas fa-palette', panels: ['panel-design', 'backgrounds-accordion'] },
        { id: 'content', label: 'Content', icon: 'fas fa-user', panels: ['name-tagline-accordion', 'phones-accordion'] },
        { id: 'contact', label: 'Contact', icon: 'fas fa-address-book', panels: ['contact-info-accordion', 'qr-code-accordion'] },
        { id: 'share', label: 'Share', icon: 'fas fa-share-alt', panels: [] }
    ];

    let currentStep = 0;

    function createProgressBar() {
        const progressBar = document.createElement('div');
        progressBar.className = 'editor-progress-bar';
        progressBar.innerHTML = `
            <button id="ai-suggest-btn-top" class="btn btn-ai-suggest" title="Smart Design Suggestion">
                <i class="fas fa-magic"></i>
                <span>Smart Suggestion</span>
            </button>
            <div class="progress-steps">
                ${STEPS.map((step, index) => `
                    <div class="progress-step ${index === 0 ? 'active' : ''}" data-step="${index}">
                        <div class="step-circle">
                            <i class="${step.icon}"></i>
                        </div>
                        <span class="step-label">${step.label}</span>
                    </div>
                `).join('')}
            </div>
        `;

        // Insert after toolbar
        const toolbar = document.querySelector('.pro-toolbar');
        if (toolbar) {
            toolbar.after(progressBar);
            document.body.classList.add('has-progress-bar');
        }

        // Add click handlers for steps
        progressBar.querySelectorAll('.progress-step').forEach(step => {
            step.addEventListener('click', () => {
                const stepIndex = parseInt(step.dataset.step);
                goToStep(stepIndex);
            });
        });

        // AI Suggest button click handler
        const aiSuggestBtnTop = progressBar.querySelector('#ai-suggest-btn-top');
        if (aiSuggestBtnTop) {
            aiSuggestBtnTop.addEventListener('click', () => {
                // Trigger the original AI suggest button
                const originalBtn = document.getElementById('ai-suggest-btn');
                if (originalBtn) {
                    originalBtn.click();
                }
            });
        }

        // Track panel interactions
        trackPanelInteractions();
    }

    function goToStep(stepIndex) {
        // Mark previous steps as completed
        const steps = document.querySelectorAll('.progress-step');
        steps.forEach((step, index) => {
            step.classList.remove('active');
            if (index < stepIndex) {
                step.classList.add('completed');
            } else if (index === stepIndex) {
                step.classList.add('active');
            }
        });

        currentStep = stepIndex;

        // Open relevant panels
        const targetPanels = STEPS[stepIndex].panels;
        if (targetPanels.length > 0) {
            // Close all accordions first
            document.querySelectorAll('.fieldset-accordion').forEach(acc => {
                acc.removeAttribute('open');
            });

            // Open target panels
            targetPanels.forEach(panelId => {
                const panel = document.getElementById(panelId);
                if (panel && panel.tagName === 'DETAILS') {
                    panel.setAttribute('open', '');
                    panel.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }
            });
        }

        // If last step (share), trigger share button
        if (stepIndex === STEPS.length - 1) {
            const shareBtn = document.getElementById('share-card-btn');
            if (shareBtn) {
                shareBtn.focus();
                shareBtn.classList.add('pulse-highlight');
                setTimeout(() => shareBtn.classList.remove('pulse-highlight'), 2000);
            }
        }
    }

    function trackPanelInteractions() {
        // Track which panels are being used
        document.querySelectorAll('.fieldset-accordion').forEach(accordion => {
            accordion.addEventListener('toggle', () => {
                if (accordion.open) {
                    const panelId = accordion.id;
                    // Find which step this panel belongs to
                    STEPS.forEach((step, index) => {
                        if (step.panels.includes(panelId) && index > currentStep) {
                            updateStepProgress(index);
                        }
                    });
                }
            });
        });
    }

    function updateStepProgress(newStep) {
        // Mark steps as completed up to newStep
        const steps = document.querySelectorAll('.progress-step');
        steps.forEach((step, index) => {
            step.classList.remove('active');
            if (index < newStep) {
                step.classList.add('completed');
            } else if (index === newStep) {
                step.classList.add('active');
            }
        });
        currentStep = newStep;
    }

    // ===========================================
    // KEYBOARD SHORTCUTS
    // ===========================================
    const SHORTCUTS = [
        { keys: ['Ctrl', 'S'], action: 'Save Design', handler: () => document.getElementById('save-to-gallery-btn')?.click() },
        { keys: ['Ctrl', 'Z'], action: 'Undo', handler: () => document.getElementById('undo-btn')?.click() },
        { keys: ['Ctrl', 'Y'], action: 'Redo', handler: () => document.getElementById('redo-btn')?.click() },
        { keys: ['Ctrl', 'P'], action: 'Full Preview', handler: toggleFullPreview },
        { keys: ['Escape'], action: 'Close Windows', handler: closeModals },
        { keys: ['?'], action: 'Show Shortcuts', handler: toggleShortcutsModal },
        { keys: ['Arrows'], action: 'Move Element', handler: () => { } }, // Handled specially in listener
        { keys: ['Delete'], action: 'Delete Element', handler: deleteSelectedElement }
    ];

    let selectedElement = null;

    function initElementSelection() {
        const cardElements = [
            '#card-logo', '#card-personal-photo-wrapper', '#card-name', '#card-tagline', '#qr-code-wrapper',
            '.phone-button-draggable-wrapper', '.draggable-social-link'
        ];

        document.addEventListener('mousedown', (e) => {
            const target = e.target.closest(cardElements.join(','));
            if (target) {
                selectElement(target);
            } else if (!e.target.closest('.pro-sidebar, .pro-toolbar, .shortcuts-modal')) {
                deselectElement();
            }
        });
    }

    function selectElement(el) {
        deselectElement();
        selectedElement = el;
        selectedElement.classList.add('element-selected');

        // Add visual indicator style if not exists
        if (!document.getElementById('selection-styles')) {
            const style = document.createElement('style');
            style.id = 'selection-styles';
            style.textContent = `
                .element-selected { outline: 2px solid var(--accent-primary) !important; outline-offset: 4px; }
                .element-selected::after { content: 'Selected'; position: absolute; top: -25px; left: 0; background: var(--accent-primary); color: white; font-size: 10px; padding: 2px 6px; border-radius: 4px; pointer-events: none; }
            `;
            document.head.appendChild(style);
        }

        if (typeof PropertiesPanel !== 'undefined') {
            PropertiesPanel.show(el);
        }
    }

    function deselectElement() {
        if (selectedElement) {
            selectedElement.classList.remove('element-selected');
            selectedElement = null;
        }

        if (typeof PropertiesPanel !== 'undefined') {
            PropertiesPanel.hide();
        }
    }

    function deleteSelectedElement() {
        if (!selectedElement) return;

        // Logic to find the delete button for this element and click it
        let deleteBtn = null;
        if (selectedElement.classList.contains('phone-button-draggable-wrapper')) {
            const phoneId = selectedElement.id;
            deleteBtn = document.querySelector(`#phone-control-${phoneId} .btn-delete-phone`);
        } else if (selectedElement.classList.contains('draggable-social-link')) {
            const controlId = selectedElement.dataset.controlId;
            deleteBtn = document.querySelector(`#${controlId} .btn-delete-social`);
        }

        if (deleteBtn) {
            deleteBtn.click();
            deselectElement();
        }
    }

    function moveSelectedElement(dx, dy) {
        if (!selectedElement) return;

        const x = (parseFloat(selectedElement.getAttribute('data-x')) || 0) + dx;
        const y = (parseFloat(selectedElement.getAttribute('data-y')) || 0) + dy;

        selectedElement.style.transform = `translate(${x}px, ${y}px)`;
        selectedElement.setAttribute('data-x', x);
        selectedElement.setAttribute('data-y', y);

        // Trigger save
        if (window.StateManager && window.StateManager.saveDebounced) {
            window.StateManager.saveDebounced();
        }
    }

    function initKeyboardShortcuts() {
        // Create modal
        createShortcutsModal();

        // Add keyboard listener
        document.addEventListener('keydown', (e) => {
            // Skip if typing in input
            if (e.target.matches('input, textarea, select')) {
                if (e.key !== 'Escape') return;
            }

            // Handle Arrow Keys for moving elements
            if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key) && selectedElement) {
                e.preventDefault();
                const step = e.shiftKey ? 10 : 1;
                let dx = 0, dy = 0;
                if (e.key === 'ArrowUp') dy = -step;
                if (e.key === 'ArrowDown') dy = step;
                if (e.key === 'ArrowLeft') dx = -step;
                if (e.key === 'ArrowRight') dx = step;
                moveSelectedElement(dx, dy);
                return;
            }

            SHORTCUTS.forEach(shortcut => {
                const ctrlMatch = shortcut.keys.includes('Ctrl') ? (e.ctrlKey || e.metaKey) : true;
                const shiftMatch = shortcut.keys.includes('Shift') ? e.shiftKey : true;
                const keyMatch = shortcut.keys.some(k => k.toLowerCase() === e.key.toLowerCase() && k !== 'Ctrl' && k !== 'Shift');

                if (ctrlMatch && shiftMatch && keyMatch) {
                    e.preventDefault();
                    shortcut.handler();
                }
            });
        });
    }

    function createShortcutsModal() {
        const modal = document.createElement('div');
        modal.className = 'shortcuts-modal-overlay';
        modal.id = 'shortcuts-modal';
        modal.innerHTML = `
            <div class="shortcuts-modal">
                <div class="shortcuts-modal-header">
                    <h3><i class="fas fa-keyboard"></i> Keyboard Shortcuts</h3>
                    <button class="shortcuts-modal-close">&times;</button>
                </div>
                <div class="shortcuts-modal-body">
                    ${SHORTCUTS.map(s => `
                        <div class="shortcut-item">
                            <span class="shortcut-action">${s.action}</span>
                            <div class="shortcut-keys">
                                ${s.keys.map(k => `<span class="shortcut-key">${k}</span>`).join('')}
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;

        document.body.appendChild(modal);

        // Close handlers
        modal.querySelector('.shortcuts-modal-close').addEventListener('click', () => {
            modal.classList.remove('show');
        });

        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.classList.remove('show');
            }
        });
    }

    function toggleShortcutsModal() {
        const modal = document.getElementById('shortcuts-modal');
        modal?.classList.toggle('show');
    }

    function closeModals() {
        document.querySelectorAll('.shortcuts-modal-overlay, .modal-overlay').forEach(m => {
            m.classList.remove('show');
        });

        // Exit fullscreen if active
        if (document.body.classList.contains('fullscreen-preview')) {
            toggleFullPreview();
        }
    }

    // ===========================================
    // FULL PREVIEW MODE
    // ===========================================
    function initFullPreviewMode() {
        // Create exit button if not exists
        if (!document.querySelector('.exit-fullscreen-btn')) {
            const exitBtn = document.createElement('button');
            exitBtn.className = 'exit-fullscreen-btn';
            exitBtn.innerHTML = '<i class="fas fa-compress"></i> Exit Preview';
            exitBtn.addEventListener('click', toggleFullPreview);
            document.body.appendChild(exitBtn);
        }

        // Add preview button to toolbar
        const previewBtn = document.getElementById('preview-mode-btn');
        if (previewBtn) {
            // Remove old listeners to prevent stacking
            const newBtn = previewBtn.cloneNode(true);
            previewBtn.parentNode.replaceChild(newBtn, previewBtn);
            newBtn.addEventListener('click', toggleFullPreview);
        }
    }

    function toggleFullPreview() {
        document.body.classList.toggle('fullscreen-preview');
    }

    // ===========================================
    // ZOOM CONTROLS (DISABLED)
    // ===========================================
    function initZoomControls() {
        // Zoom controls disabled
    }

    // ===========================================
    // MOBILE BOTTOM TOOLBAR
    // ===========================================
    function createMobileBottomToolbar() {
        const isEnglish = document.documentElement.lang === 'en';
        const toolbar = document.createElement('div');
        toolbar.className = 'mobile-bottom-toolbar';

        const labels = {
            flip: isEnglish ? 'Flip' : 'قلب البطاقة',
            undo: isEnglish ? 'Undo' : 'تراجع',
            save: isEnglish ? 'Save' : 'حفظ',
            share: isEnglish ? 'Share' : 'مشاركة',
            download: isEnglish ? 'Download' : 'تنزيل'
        };

        toolbar.innerHTML = `
            <button class="mobile-bottom-btn" data-action="flip" title="${labels.flip}">
                <i class="fas fa-sync-alt"></i>
                <span>${labels.flip}</span>
            </button>
            <button class="mobile-bottom-btn" data-action="undo" title="${labels.undo}">
                <i class="fas fa-undo"></i>
                <span>${labels.undo}</span>
            </button>
            <button class="mobile-bottom-btn primary" data-action="save" title="${labels.save}">
                <i class="fas fa-save"></i>
                <span>${labels.save}</span>
            </button>
            <button class="mobile-bottom-btn" data-action="share" title="${labels.share}">
                <i class="fas fa-share-alt"></i>
                <span>${labels.share}</span>
            </button>
            <button class="mobile-bottom-btn" data-action="download" title="${labels.download}">
                <i class="fas fa-download"></i>
                <span>${labels.download}</span>
            </button>
        `;

        document.body.appendChild(toolbar);

        // Handle clicks
        toolbar.querySelectorAll('.mobile-bottom-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const action = btn.dataset.action;
                switch (action) {
                    case 'flip':
                        document.getElementById('flip-card-btn-mobile')?.click();
                        break;
                    case 'undo':
                        document.getElementById('undo-btn')?.click();
                        break;
                    case 'save':
                        document.getElementById('save-to-gallery-btn')?.click();
                        break;
                    case 'share':
                        document.getElementById('share-card-btn')?.click();
                        break;
                    case 'download':
                        document.getElementById('download-options-btn')?.click();
                        break;
                }
            });
        });
    }

    // ===========================================
    // ENHANCED ACCORDIONS
    // ===========================================
    function enhanceAccordions() {
        const icons = {
            'backgrounds-accordion': 'fas fa-paint-brush',
            'logo-drop-zone': 'fas fa-image',
            'photo-controls-fieldset': 'fas fa-user-circle',
            'name-tagline-accordion': 'fas fa-id-badge',
            'phones-accordion': 'fas fa-phone-alt',
            'qr-code-accordion': 'fas fa-qrcode',
            'contact-info-accordion': 'fas fa-address-card'
        };

        document.querySelectorAll('.fieldset-accordion').forEach(accordion => {
            const summary = accordion.querySelector('summary');
            const iconClass = icons[accordion.id];

            if (summary && iconClass) {
                const icon = document.createElement('i');
                icon.className = `section-icon ${iconClass}`;
                summary.insertBefore(icon, summary.firstChild);
            }
        });
    }

    // Add CSS animation for notifications
    const style = document.createElement('style');
    style.textContent = `
        @keyframes fadeInOut {
            0% { opacity: 0; transform: translate(-50%, -20px); }
            15% { opacity: 1; transform: translate(-50%, 0); }
            85% { opacity: 1; transform: translate(-50%, 0); }
            100% { opacity: 0; transform: translate(-50%, -20px); }
        }
        
        .pulse-highlight {
            animation: pulse-highlight 0.5s ease 3;
        }
        
        @keyframes pulse-highlight {
            0%, 100% { transform: scale(1); }
            50% { transform: scale(1.05); }
        }
        
        .restore-content {
            display: flex;
            flex-wrap: wrap;
            align-items: center;
            gap: 15px;
        }
        
        .restore-content > i {
            font-size: 2rem;
            color: var(--accent-primary, #4da6ff);
        }
        
        .restore-text {
            flex: 1;
            min-width: 150px;
        }
        
        .restore-text strong {
            display: block;
            color: var(--text-primary, #e6f0f7);
            margin-bottom: 5px;
        }
        
        .restore-text span {
            font-size: 0.85rem;
            color: var(--text-secondary, #bcc9d4);
        }
        
        .restore-actions {
            display: flex;
            gap: 10px;
            width: 100%;
            margin-top: 10px;
        }
        
        .restore-actions .btn {
            flex: 1;
            margin: 0;
        }
    `;
    document.head.appendChild(style);

    // ===========================================
    // PROPERTIES PANEL
    // ===========================================
    window.PropertiesPanel = {
        panel: null,
        currentElement: null,
        debounceMap: new Map(),
        pendingChanges: {},

        init() {
            this.panel = document.getElementById('properties-panel');
            if (!this.panel) return;

            document.getElementById('close-properties-panel')?.addEventListener('click', () => this.hide());

            // Tabs
            const tabs = document.querySelectorAll('.prop-tab-btn');
            tabs.forEach(tab => {
                tab.addEventListener('click', (e) => {
                    tabs.forEach(t => t.classList.remove('active'));
                    document.querySelectorAll('.prop-tab-pane').forEach(p => p.classList.remove('active'));
                    e.target.classList.add('active');
                    document.getElementById(e.target.dataset.tab)?.classList.add('active');
                });
            });

            // Generic Map bindings
            this.bindInput('prop-x', 'x', 'px');
            this.bindInput('prop-y', 'y', 'px');
            this.bindInput('prop-w', 'width', 'px');
            this.bindInput('prop-h', 'height', 'px');
            this.bindInput('prop-rotation', 'rotation', 'deg');
            this.bindInput('prop-zindex', 'zIndex', '');

            // Text Styles
            this.bindInput('prop-fontFamily', 'fontFamily', '');
            this.bindInput('prop-fontSize', 'fontSize', 'px');
            this.bindInput('prop-color', 'color', '');
            this.bindInput('prop-lineHeight', 'lineHeight', '');
            this.bindInput('prop-letterSpacing', 'letterSpacing', 'px');

            // Image Styles
            this.bindInput('prop-objectFit', 'objectFit', '');
            this.bindInput('prop-borderRadius', 'borderRadius', 'px');
            this.bindInput('prop-borderWidth', 'borderWidth', 'px');
            // Filter
            const filterGrayscale = document.getElementById('prop-filter-grayscale');
            if (filterGrayscale) {
                filterGrayscale.addEventListener('input', (e) => this.updateProperty('filter', `grayscale(${e.target.value}%)`, ''));
            }

            // Button Styles
            this.bindInput('prop-btn-bg', 'backgroundColor', '');
            this.bindInput('prop-btn-radius', 'borderRadius', 'px');
            this.bindInput('prop-btn-padding', 'padding', 'px');

            // Button Action
            this.bindInput('prop-btn-actionType', 'actionType', '');
            this.bindInput('prop-btn-actionValue', 'actionValue', '');

            // Toggles
            document.getElementById('prop-visible')?.addEventListener('change', (e) => {
                this.updateProperty('visible', e.target.checked);
            });
            document.getElementById('prop-lock')?.addEventListener('change', (e) => {
                this.updateProperty('locked', e.target.checked);
            });

            // Radio Groups
            document.querySelectorAll('#prop-textAlign .prop-icon-btn').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    document.querySelectorAll('#prop-textAlign .prop-icon-btn').forEach(b => b.classList.remove('active'));
                    e.currentTarget.classList.add('active');
                    this.updateProperty('textAlign', e.currentTarget.dataset.value);
                });
            });
        },

        show(element) {
            this.currentElement = element;
            if (this.panel) this.panel.classList.remove('hidden');
            this.populate();
        },

        hide() {
            this.currentElement = null;
            if (this.panel) this.panel.classList.add('hidden');
        },

        populate() {
            if (!this.currentElement) return;
            const el = this.currentElement;
            const computedStyles = window.getComputedStyle(el);

            // Position/Size fallback
            let x = parseFloat(el.getAttribute('data-x')) || 0;
            let y = parseFloat(el.getAttribute('data-y')) || 0;

            // Check translation in transform if data attributes don't exist
            if (x === 0 && y === 0 && el.style.transform.includes('translate')) {
                const match = el.style.transform.match(/translate\(([^p]+)px,\s*([^p]+)px\)/);
                if (match) {
                    x = parseFloat(match[1]);
                    y = parseFloat(match[2]);
                }
            }

            // Populate generic inputs safely
            const setVal = (id, val) => { const el = document.getElementById(id); if (el) el.value = val; };
            const setCheck = (id, val) => { const el = document.getElementById(id); if (el) el.checked = val; };

            setVal('prop-x', Math.round(x));
            setVal('prop-y', Math.round(y));
            setVal('prop-w', el.offsetWidth);
            setVal('prop-h', el.offsetHeight);
            setVal('prop-zindex', computedStyles.zIndex === 'auto' ? 1 : computedStyles.zIndex);

            let rotation = 0;
            const rotMatch = el.style.transform.match(/rotate\(([^d]+)deg\)/);
            if (rotMatch) rotation = parseFloat(rotMatch[1]);
            setVal('prop-rotation', rotation);

            setCheck('prop-visible', computedStyles.display !== 'none');
            setCheck('prop-lock', el.classList.contains('locked'));

            // Reset Sub-groups
            document.querySelectorAll('.style-group').forEach(g => g.classList.add('hidden'));

            // Determine Element Type
            const isImage = el.tagName === 'IMG' || el.querySelector('img');
            const isButton = el.tagName === 'BUTTON' || el.classList.contains('btn') || el.classList.contains('phone-button-draggable-wrapper');

            if (isImage) {
                document.getElementById('style-image-controls')?.classList.remove('hidden');

                const targetImg = el.tagName === 'IMG' ? el : el.querySelector('img');
                if (targetImg) {
                    const imgComputed = window.getComputedStyle(targetImg);
                    setVal('prop-objectFit', imgComputed.objectFit);
                    setVal('prop-borderRadius', parseInt(imgComputed.borderRadius) || 0);
                    setVal('prop-borderWidth', parseInt(imgComputed.borderWidth) || 0);

                    const filter = imgComputed.filter;
                    if (filter.includes('grayscale')) {
                        const m = filter.match(/grayscale\(([^%]+)%\)/);
                        setVal('prop-filter-grayscale', m ? parseFloat(m[1]) : 0);
                    } else {
                        setVal('prop-filter-grayscale', 0);
                    }
                }
            } else if (isButton) {
                document.getElementById('style-button-controls')?.classList.remove('hidden');

                // Fetch button specific styling
                const targetBtn = el.tagName === 'BUTTON' ? el : (el.querySelector('button') || el.querySelector('.btn') || el);
                const btnComputed = window.getComputedStyle(targetBtn);
                setVal('prop-btn-bg', this.rgbToHex(btnComputed.backgroundColor));
                setVal('prop-btn-radius', parseInt(btnComputed.borderRadius) || 0);
                setVal('prop-btn-padding', parseInt(btnComputed.padding) || 0);

                // Fallbacks for action types
                setVal('prop-btn-actionType', el.dataset.actionType || 'link');
                setVal('prop-btn-actionValue', el.dataset.actionValue || el.href || '');
            } else {
                // Must be Text-focused Element
                document.getElementById('style-text-controls')?.classList.remove('hidden');

                const fontFamilyRaw = computedStyles.fontFamily;
                setVal('prop-fontFamily', fontFamilyRaw.includes('Tajawal') ? "'Tajawal', sans-serif" :
                    fontFamilyRaw.includes('Cairo') ? "'Cairo', sans-serif" :
                        fontFamilyRaw.includes('Lalezar') ? "'Lalezar', cursive" :
                            fontFamilyRaw.includes('Poppins') ? "'Poppins', sans-serif" : "'Tajawal', sans-serif");

                setVal('prop-fontSize', parseInt(computedStyles.fontSize) || 16);
                setVal('prop-color', this.rgbToHex(computedStyles.color));
                setVal('prop-lineHeight', parseFloat(computedStyles.lineHeight) || 1.5);
                setVal('prop-letterSpacing', parseInt(computedStyles.letterSpacing) || 0);

                const align = computedStyles.textAlign || 'center';
                document.querySelectorAll('#prop-textAlign .prop-icon-btn').forEach(btn => {
                    btn.classList.toggle('active', btn.dataset.value === align);
                });
            }
        },

        bindInput(id, property, unit) {
            const input = document.getElementById(id);
            if (!input) return;
            input.addEventListener('input', (e) => {
                this.updateProperty(property, e.target.value, unit);
            });
        },

        updateProperty(property, value, unit = '') {
            if (!this.currentElement) return;
            const el = this.currentElement;
            const targetEl = (el.tagName === 'IMG' || el.tagName === 'BUTTON' || el.classList.contains('phone-button-draggable-wrapper')) && property !== 'x' && property !== 'y' && property !== 'rotation' && property !== 'zIndex' && property !== 'visible' && property !== 'locked' ? (el.querySelector('img') || el.querySelector('button') || el.querySelector('.btn') || el) : el;

            let changes = {};

            if (property === 'x' || property === 'y') {
                const x = property === 'x' ? value : (parseFloat(el.getAttribute('data-x')) || 0);
                const y = property === 'y' ? value : (parseFloat(el.getAttribute('data-y')) || 0);

                const rotMatch = el.style.transform.match(/rotate\(([^d]+)deg\)/);
                const rotation = rotMatch ? `rotate(${rotMatch[1]}deg)` : '';

                el.style.transform = `translate(${x}px, ${y}px) ${rotation}`;
                el.setAttribute('data-x', x);
                el.setAttribute('data-y', y);
                changes.position = { x: parseFloat(x), y: parseFloat(y) };
            } else if (property === 'rotation') {
                const x = parseFloat(el.getAttribute('data-x')) || 0;
                const y = parseFloat(el.getAttribute('data-y')) || 0;
                el.style.transform = `translate(${x}px, ${y}px) rotate(${value}deg)`;
                changes.rotation = parseFloat(value);
            } else if (property === 'width' || property === 'height' || property === 'fontSize' || property === 'fontFamily' || property === 'color' || property === 'backgroundColor' || property === 'textAlign' || property === 'zIndex' || property === 'lineHeight' || property === 'letterSpacing' || property === 'objectFit' || property === 'borderRadius' || property === 'borderWidth' || property === 'padding' || property === 'filter') {

                targetEl.style[property] = `${value}${unit}`;
                changes.style = changes.style || {};
                changes.style[property] = property === 'zIndex' || property.includes('Width') || property.includes('Radius') || property.includes('Height') || property.includes('padding') || property.includes('Size') ? parseFloat(value) : value;

                // RTL auto-detect logic for text changes
                if (property === 'innerText' || property === 'textContent') {
                    if (/[\u0600-\u06FF]/.test(value)) {
                        targetEl.style.direction = 'rtl';
                        targetEl.style.textAlign = 'right';
                        changes.style.direction = 'rtl';
                        changes.style.textAlign = 'right';
                    } else {
                        targetEl.style.direction = 'ltr';
                        targetEl.style.textAlign = 'left';
                        changes.style.direction = 'ltr';
                        changes.style.textAlign = 'left';
                    }
                }
            } else if (property === 'visible') {
                el.style.display = value ? '' : 'none';
                el.style.opacity = value ? '1' : '0.5'; // visual cue for editor
                changes.visible = value;
            } else if (property === 'locked') {
                if (value) el.classList.add('locked');
                else el.classList.remove('locked');
                changes.locked = value;
            } else if (property === 'actionType' || property === 'actionValue') {
                targetEl.dataset[property] = value;
                changes.settings = changes.settings || {};
                changes.settings[property] = value;
            }

            const elementId = el.id || el.dataset.controlId || el.dataset.elementId;
            if (elementId) {
                this.debouncedSaveElement(elementId, changes);
            }
        },

        debouncedSaveElement(elementId, changes) {
            // merge pending changes
            if (!this.pendingChanges[elementId]) this.pendingChanges[elementId] = {};
            this.pendingChanges[elementId] = {
                ...this.pendingChanges[elementId],
                ...changes,
                style: { ...(this.pendingChanges[elementId]?.style || {}), ...(changes.style || {}) },
                settings: { ...(this.pendingChanges[elementId]?.settings || {}), ...(changes.settings || {}) }
            };

            if (this.debounceMap.has(elementId)) {
                clearTimeout(this.debounceMap.get(elementId));
            }

            const timer = setTimeout(() => {
                this.saveElementToBackend(elementId, this.pendingChanges[elementId]);
                delete this.pendingChanges[elementId];
                this.debounceMap.delete(elementId);
            }, 800);

            this.debounceMap.set(elementId, timer);
        },

        async saveElementToBackend(elementId, changes) {
            // Check if fallback save exists, call it to keep full UI state healthy mapping
            if (window.StateManager && window.StateManager.saveDebounced) {
                window.StateManager.saveDebounced();
            }

            const getDesignId = () => typeof window.Config !== 'undefined' ? window.Config.currentDesignId : new URLSearchParams(window.location.search).get('id');
            const designId = getDesignId() || 'draft';

            if (designId === 'draft') return;

            try {
                const token = localStorage.getItem('token');
                if (!token) return;

                const res = await fetch(`/ api / design / ${designId} / element / ${elementId}`, {
                    method: 'PATCH',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    },
                    body: JSON.stringify(changes)
                });

                if (!res.ok) {
                    const data = await res.json();
                    console.error('PATCH element failed', data);
                }
            } catch (e) {
                console.error('Network Error PATCHing element:', e);
            }
        },

        rgbToHex(rgb) {
            if (!rgb) return '#000000';
            if (rgb.startsWith('#')) return rgb;
            const result = rgb.match(/\d+/g);
            if (!result || result.length < 3) return '#000000';
            return "#" + ((1 << 24) + (parseInt(result[0]) << 16) + (parseInt(result[1]) << 8) + parseInt(result[2])).toString(16).slice(1);
        }
    };

})();
