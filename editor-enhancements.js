/**
 * MC PRIME NFC Editor Enhancements
 * Features: Progress Bar, Auto-save, Keyboard Shortcuts, Full Preview
 */

(function () {
    'use strict';

    // Wait for DOM
    document.addEventListener('DOMContentLoaded', initEditorEnhancements);

    function initEditorEnhancements() {
        // createProgressBar(); // Disabled - user requested removal
        initAutoSave();
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
    // AUTO-SAVE
    // ===========================================
    const AUTOSAVE_KEY = 'mcprime_editor_autosave';
    const AUTOSAVE_INTERVAL = 30000; // 30 seconds
    let autosaveTimer = null;
    let hasUnsavedChanges = false;

    function initAutoSave() {
        // Create indicator
        const indicator = document.createElement('div');
        indicator.className = 'autosave-indicator';
        indicator.id = 'autosave-indicator';
        indicator.innerHTML = '<i class="fas fa-check"></i><span>Saved automatically</span>';
        document.body.appendChild(indicator);

        // Check for existing autosave
        restoreAutosave();

        // Track changes
        trackChanges();

        // Start autosave timer
        startAutosaveTimer();

        // Save before leaving
        window.addEventListener('beforeunload', (e) => {
            if (hasUnsavedChanges) {
                performAutosave();
                e.preventDefault();
                e.returnValue = '';
            }
        });
    }

    function trackChanges() {
        // Track input changes
        const inputs = document.querySelectorAll('input, textarea, select');
        inputs.forEach(input => {
            input.addEventListener('change', () => {
                hasUnsavedChanges = true;
                markSaveButtonUnsaved(true);
            });
            input.addEventListener('input', () => {
                hasUnsavedChanges = true;
                markSaveButtonUnsaved(true);
            });
        });

        // Track when save is complete
        const saveBtn = document.getElementById('save-to-gallery-btn');
        if (saveBtn) {
            saveBtn.addEventListener('click', () => {
                setTimeout(() => {
                    hasUnsavedChanges = false;
                    markSaveButtonUnsaved(false);
                    clearAutosave();
                }, 1000);
            });
        }
    }

    function markSaveButtonUnsaved(unsaved) {
        const saveBtn = document.getElementById('save-to-gallery-btn');
        if (saveBtn) {
            saveBtn.classList.toggle('unsaved', unsaved);
        }
    }

    function startAutosaveTimer() {
        autosaveTimer = setInterval(() => {
            if (hasUnsavedChanges) {
                performAutosave();
            }
        }, AUTOSAVE_INTERVAL);
    }

    function performAutosave() {
        const indicator = document.getElementById('autosave-indicator');

        // Show saving state
        indicator.innerHTML = '<i class="fas fa-spinner"></i><span>Saving...</span>';
        indicator.classList.add('show', 'saving');

        // Collect current state
        const state = collectEditorState();

        // Save to localStorage
        try {
            localStorage.setItem(AUTOSAVE_KEY, JSON.stringify({
                timestamp: Date.now(),
                state: state
            }));

            // Show success
            setTimeout(() => {
                indicator.innerHTML = '<i class="fas fa-check"></i><span>Saved automatically</span>';
                indicator.classList.remove('saving');

                // Hide after 2 seconds
                setTimeout(() => {
                    indicator.classList.remove('show');
                }, 2000);
            }, 500);

            hasUnsavedChanges = false;
            markSaveButtonUnsaved(false);

        } catch (e) {
            console.error('Autosave failed:', e);
            indicator.innerHTML = '<i class="fas fa-exclamation-triangle"></i><span>Save failed</span>';
            indicator.classList.remove('saving');
            setTimeout(() => indicator.classList.remove('show'), 3000);
        }
    }

    function collectEditorState() {
        const state = {};

        // Collect all input values
        const inputs = document.querySelectorAll('input:not([type="file"]), textarea, select');
        inputs.forEach(input => {
            if (input.id) {
                if (input.type === 'checkbox' || input.type === 'radio') {
                    if (input.checked) {
                        state[input.id] = input.value;
                    }
                } else {
                    state[input.id] = input.value;
                }
            }
        });

        return state;
    }

    function restoreAutosave() {
        try {
            const saved = localStorage.getItem(AUTOSAVE_KEY);
            if (saved) {
                const { timestamp, state } = JSON.parse(saved);
                const age = Date.now() - timestamp;

                // Only restore if less than 1 hour old
                if (age < 3600000) {
                    showRestorePrompt(timestamp, state);
                } else {
                    clearAutosave();
                }
            }
        } catch (e) {
            console.error('Failed to restore autosave:', e);
        }
    }

    function showRestorePrompt(timestamp, state) {
        const time = new Date(timestamp).toLocaleTimeString('en-US');

        // Create prompt
        const prompt = document.createElement('div');
        prompt.className = 'autosave-restore-prompt';
        prompt.innerHTML = `
            <div class="restore-content">
                <i class="fas fa-history"></i>
                <div class="restore-text">
                    <strong>Saved design found</strong>
                    <span>Last saved: ${time}</span>
                </div>
                <div class="restore-actions">
                    <button class="btn btn-primary restore-yes">Restore</button>
                    <button class="btn btn-secondary restore-no">Dismiss</button>
                </div>
            </div>
        `;

        // Add styles
        prompt.style.cssText = `
            position: fixed;
            top: 80px;
            left: 50%;
            transform: translateX(-50%);
            background: var(--form-bg, #243447);
            border: 1px solid var(--accent-primary, #4da6ff);
            border-radius: 12px;
            padding: 20px;
            z-index: 2000;
            box-shadow: 0 10px 40px rgba(0,0,0,0.4);
            max-width: 400px;
            width: 90%;
        `;

        document.body.appendChild(prompt);

        // Handle restore
        prompt.querySelector('.restore-yes').addEventListener('click', () => {
            applyState(state);
            prompt.remove();
            showNotification('Design restored', 'success');
        });

        // Handle dismiss
        prompt.querySelector('.restore-no').addEventListener('click', () => {
            clearAutosave();
            prompt.remove();
        });
    }

    function applyState(state) {
        Object.entries(state).forEach(([id, value]) => {
            const element = document.getElementById(id);
            if (element) {
                if (element.type === 'checkbox') {
                    element.checked = value === element.value;
                } else if (element.type === 'radio') {
                    element.checked = value === element.value;
                } else {
                    element.value = value;
                    // Trigger change event
                    element.dispatchEvent(new Event('change', { bubbles: true }));
                }
            }
        });
    }

    function clearAutosave() {
        localStorage.removeItem(AUTOSAVE_KEY);
    }

    function showNotification(message, type = 'info') {
        const notification = document.createElement('div');
        notification.className = `editor-notification ${type}`;
        notification.innerHTML = `<i class="fas fa-${type === 'success' ? 'check' : 'info'}-circle"></i> ${message}`;
        notification.style.cssText = `
            position: fixed;
            top: 80px;
            left: 50%;
            transform: translateX(-50%);
            background: ${type === 'success' ? 'var(--success-color)' : 'var(--accent-primary)'};
            color: white;
            padding: 12px 24px;
            border-radius: 8px;
            z-index: 2000;
            animation: fadeInOut 3s ease forwards;
        `;
        document.body.appendChild(notification);
        setTimeout(() => notification.remove(), 3000);
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
        { keys: ['?'], action: 'Show Shortcuts', handler: toggleShortcutsModal }
    ];

    function initKeyboardShortcuts() {
        // Create modal
        createShortcutsModal();

        // Add keyboard listener
        document.addEventListener('keydown', (e) => {
            // Skip if typing in input
            if (e.target.matches('input, textarea, select')) {
                if (e.key !== 'Escape') return;
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
        // Create exit button
        const exitBtn = document.createElement('button');
        exitBtn.className = 'exit-fullscreen-btn';
        exitBtn.innerHTML = '<i class="fas fa-compress"></i> Exit Preview';
        exitBtn.addEventListener('click', toggleFullPreview);
        document.body.appendChild(exitBtn);

        // Add preview button to toolbar
        const previewBtn = document.getElementById('preview-mode-btn');
        if (previewBtn) {
            previewBtn.addEventListener('click', toggleFullPreview);
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

})();
