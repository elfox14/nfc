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

        // New editor improvements
        initEditorImprovements();
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
            // Don't block intentional redirects (e.g., to login page)
            if (window._intentionalRedirect) return;
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
    // EDITOR IMPROVEMENTS (Active Face, Face Tabs, Fine Position)
    // ===========================================
    function initEditorImprovements() {
        initActiveFaceIndicator();
        initFaceTabs();
        initFinePositionEnhancements();
        initQuickElementsBar();
        initExtendedFonts();
        initThemeHoverPreview();
        initLayersPanel();
        initElementSubTabs();
        initEnhancedSliders();
        initSmartPalette();
        initQuickSwap();
        initSnapGuidelines();
        initKeyboardShortcuts();
        initCardCounter();
        initFocusMode();
        initCopyStyle();
    }

    // ---------- Feature 1: Active Face Indicator ----------
    function initActiveFaceIndicator() {
        const isEnglish = document.documentElement.lang === 'en';
        const frontCard = document.getElementById('card-front-preview');
        const backCard = document.getElementById('card-back-preview');
        if (!frontCard || !backCard) return;

        // Create editing badges
        const frontBadge = document.createElement('span');
        frontBadge.className = 'face-editing-badge';
        frontBadge.textContent = isEnglish ? '🔧 Editing Front' : '🔧 تعديل الأمامي';
        frontCard.style.position = 'relative';
        frontCard.appendChild(frontBadge);

        const backBadge = document.createElement('span');
        backBadge.className = 'face-editing-badge';
        backBadge.textContent = isEnglish ? '🔧 Editing Back' : '🔧 تعديل الخلفي';
        backCard.style.position = 'relative';
        backCard.appendChild(backBadge);

        // Set active face
        window._activeFace = 'front';
        frontCard.classList.add('card-face-active');

        function setActiveFace(face) {
            window._activeFace = face;
            frontCard.classList.toggle('card-face-active', face === 'front');
            backCard.classList.toggle('card-face-active', face === 'back');

            // Sync face tabs if they exist
            const frontTab = document.querySelector('.face-tab[data-face="front"]');
            const backTab = document.querySelector('.face-tab[data-face="back"]');
            if (frontTab && backTab) {
                frontTab.classList.toggle('active', face === 'front');
                backTab.classList.toggle('active', face === 'back');
                filterAccordionsByFace(face);
            }
        }

        // Expose globally for other features
        window.setActiveFace = setActiveFace;

        // Click on card faces
        frontCard.addEventListener('click', (e) => {
            if (e.target.closest('.draggable-on-card')) return; // Don't intercept element clicks
            setActiveFace('front');
        });

        backCard.addEventListener('click', (e) => {
            if (e.target.closest('.draggable-on-card')) return;
            setActiveFace('back');
        });

        // Sync with mobile flip button
        const flipBtn = document.getElementById('flip-card-btn-mobile');
        if (flipBtn) {
            const origHandler = flipBtn.onclick;
            flipBtn.addEventListener('click', () => {
                // After flip animation, toggle active face
                setTimeout(() => {
                    const flipper = document.querySelector('.card-flipper');
                    if (flipper) {
                        const isFlipped = flipper.classList.contains('is-flipped');
                        setActiveFace(isFlipped ? 'back' : 'front');
                    }
                }, 100);
            });
        }
    }

    // ---------- Feature 2: Face Tabs ----------
    function initFaceTabs() {
        const isEnglish = document.documentElement.lang === 'en';
        const rightSidebar = document.getElementById('panel-elements');
        if (!rightSidebar) return;

        // Create tab bar
        const tabBar = document.createElement('div');
        tabBar.className = 'face-tabs-bar';
        tabBar.innerHTML = `
            <button class="face-tab active" data-face="front">
                <i class="fas fa-id-card"></i>
                ${isEnglish ? 'Front' : 'الأمامي'}
                <span class="face-tab-count" data-count="front">0</span>
            </button>
            <button class="face-tab" data-face="back">
                <i class="fas fa-qrcode"></i>
                ${isEnglish ? 'Back' : 'الخلفي'}
                <span class="face-tab-count" data-count="back">0</span>
            </button>
        `;

        // Insert at top of sidebar
        rightSidebar.insertBefore(tabBar, rightSidebar.firstChild);

        // Tab click handlers
        tabBar.querySelectorAll('.face-tab').forEach(tab => {
            tab.addEventListener('click', () => {
                const face = tab.dataset.face;
                tabBar.querySelectorAll('.face-tab').forEach(t => t.classList.remove('active'));
                tab.classList.add('active');

                // Sync with active face indicator
                if (window.setActiveFace) window.setActiveFace(face);

                filterAccordionsByFace(face);
            });
        });

        // Listen for placement radio changes to update filtering
        document.addEventListener('change', (e) => {
            if (e.target.type === 'radio' && e.target.name && e.target.name.startsWith('placement-')) {
                const activeTab = tabBar.querySelector('.face-tab.active');
                if (activeTab) {
                    updateFaceTabCounts();
                    filterAccordionsByFace(activeTab.dataset.face);
                }
            }
        });

        // Initial filter + count
        updateFaceTabCounts();
        filterAccordionsByFace('front');
    }

    // Map accordion IDs to their placement radio names
    const ACCORDION_PLACEMENT_MAP = {
        'logo-drop-zone': 'placement-logo',
        'photo-controls-fieldset': 'placement-photo',
        'name-tagline-accordion': 'placement-name', // also covers tagline
        'phones-accordion': null, // dynamic - check children
        'qr-code-accordion': 'placement-qr',
        'contact-info-accordion': null // always on back (static social)
    };

    function getAccordionFace(accordion) {
        const id = accordion.id;

        // Also check for IDs on child fieldsets (logo-drop-zone, photo-controls-fieldset)
        let effectiveId = id;
        if (!id || !ACCORDION_PLACEMENT_MAP.hasOwnProperty(id)) {
            const childFieldset = accordion.querySelector('fieldset[id]');
            if (childFieldset) effectiveId = childFieldset.id;
        }

        const radioName = ACCORDION_PLACEMENT_MAP[effectiveId];

        if (radioName) {
            const checked = document.querySelector(`input[name="${radioName}"]:checked`);
            return checked ? checked.value : 'front';
        }

        // backgrounds-accordion belongs to both faces - always show
        if (effectiveId === 'backgrounds-accordion') return 'both';

        // phones-accordion: check if ANY phone is on this face
        if (effectiveId === 'phones-accordion') {
            const phoneRadios = accordion.querySelectorAll('input[type="radio"]:checked');
            const faces = new Set();
            phoneRadios.forEach(r => faces.add(r.value));
            if (faces.has('front') && faces.has('back')) return 'both';
            if (faces.has('front')) return 'front';
            if (faces.has('back')) return 'back';
            return 'front'; // default
        }

        // contact-info-accordion: check static social placement radios
        if (effectiveId === 'contact-info-accordion') {
            const radios = accordion.querySelectorAll('input[type="radio"]:checked');
            const faces = new Set();
            radios.forEach(r => {
                if (r.name.startsWith('placement-')) faces.add(r.value);
            });
            if (faces.has('front') && faces.has('back')) return 'both';
            if (faces.has('front')) return 'front';
            if (faces.has('back')) return 'back';
            return 'back'; // default for contact info
        }

        return 'both'; // unknown accordion - show on both
    }

    function filterAccordionsByFace(activeFace) {
        const accordions = document.querySelectorAll('#panel-elements .fieldset-accordion');
        accordions.forEach(accordion => {
            const face = getAccordionFace(accordion);
            if (face === 'both' || face === activeFace) {
                accordion.classList.remove('face-tab-hidden');
            } else {
                accordion.classList.add('face-tab-hidden');
            }
        });
    }

    function updateFaceTabCounts() {
        let frontCount = 0, backCount = 0;
        const accordions = document.querySelectorAll('#panel-elements .fieldset-accordion');
        accordions.forEach(accordion => {
            const face = getAccordionFace(accordion);
            if (face === 'front') frontCount++;
            else if (face === 'back') backCount++;
            else if (face === 'both') { frontCount++; backCount++; }
        });

        const frontCountEl = document.querySelector('.face-tab-count[data-count="front"]');
        const backCountEl = document.querySelector('.face-tab-count[data-count="back"]');
        if (frontCountEl) frontCountEl.textContent = frontCount;
        if (backCountEl) backCountEl.textContent = backCount;
    }

    // ---------- Feature 3: Fine Position Enhancements ----------
    function initFinePositionEnhancements() {
        const isEnglish = document.documentElement.lang === 'en';

        // Track selected element
        let selectedElement = null;

        // Create arrow key hint
        const hint = document.createElement('div');
        hint.className = 'arrow-key-hint';
        hint.innerHTML = isEnglish
            ? 'Use <kbd>↑</kbd><kbd>↓</kbd><kbd>←</kbd><kbd>→</kbd> to move · <kbd>Shift</kbd> for 5px'
            : 'استخدم <kbd>↑</kbd><kbd>↓</kbd><kbd>←</kbd><kbd>→</kbd> للتحريك · <kbd>Shift</kbd> لـ 5px';
        document.body.appendChild(hint);

        // Click on card elements to select them
        document.addEventListener('click', (e) => {
            const draggable = e.target.closest('.draggable-on-card');

            if (draggable) {
                e.stopPropagation();
                selectElement(draggable);
            } else if (!e.target.closest('.position-controls-grid') && !e.target.closest('.btn-reset-position') && !e.target.closest('.position-extras')) {
                deselectElement();
            }
        });

        function selectElement(el) {
            if (selectedElement) selectedElement.classList.remove('element-selected');
            selectedElement = el;
            el.classList.add('element-selected');
            hint.classList.add('visible');

            // Determine which face this element is on
            const frontContent = document.getElementById('card-front-content');
            if (frontContent && frontContent.contains(el)) {
                if (window.setActiveFace) window.setActiveFace('front');
            } else {
                if (window.setActiveFace) window.setActiveFace('back');
            }
        }

        function deselectElement() {
            if (selectedElement) {
                selectedElement.classList.remove('element-selected');
                selectedElement = null;
            }
            hint.classList.remove('visible');
        }

        // Arrow key movement
        document.addEventListener('keydown', (e) => {
            if (!selectedElement) return;
            if (e.target.matches('input, textarea, select')) return;

            const step = e.shiftKey ? 5 : 1;
            let dx = 0, dy = 0;

            switch (e.key) {
                case 'ArrowUp': dy = -step; break;
                case 'ArrowDown': dy = step; break;
                case 'ArrowLeft': dx = -step; break;
                case 'ArrowRight': dx = step; break;
                case 'Escape': deselectElement(); return;
                default: return;
            }

            e.preventDefault();

            const currentX = parseFloat(selectedElement.getAttribute('data-x')) || 0;
            const currentY = parseFloat(selectedElement.getAttribute('data-y')) || 0;
            const newX = currentX + dx;
            const newY = currentY + dy;

            selectedElement.style.transform = `translate(${newX}px, ${newY}px)`;
            selectedElement.setAttribute('data-x', newX);
            selectedElement.setAttribute('data-y', newY);

            // Update position display if exists
            updatePositionDisplays();

            // Trigger save
            if (typeof StateManager !== 'undefined' && StateManager.saveDebounced) {
                StateManager.saveDebounced();
            }
        });

        // Add position displays and reset buttons to all position-controls-grid elements
        addPositionExtras();

        // Also add them to dynamically created ones
        const observer = new MutationObserver((mutations) => {
            mutations.forEach(mutation => {
                mutation.addedNodes.forEach(node => {
                    if (node.nodeType === 1) {
                        const grids = node.querySelectorAll ? node.querySelectorAll('.position-controls-grid') : [];
                        grids.forEach(grid => addExtrasToGrid(grid));
                    }
                });
            });
        });
        observer.observe(document.body, { childList: true, subtree: true });

        function addPositionExtras() {
            document.querySelectorAll('.position-controls-grid').forEach(grid => {
                addExtrasToGrid(grid);
            });
        }

        function addExtrasToGrid(grid) {
            if (grid.dataset.extrasAdded) return;
            grid.dataset.extrasAdded = 'true';

            const targetId = grid.dataset.targetId || grid.getAttribute('data-target-id');
            if (!targetId) return;

            const extras = document.createElement('div');
            extras.className = 'position-extras';

            // Position display
            const posDisplay = document.createElement('span');
            posDisplay.className = 'position-display';
            posDisplay.dataset.targetId = targetId;
            const el = document.getElementById(targetId);
            const x = el ? (parseFloat(el.getAttribute('data-x')) || 0) : 0;
            const y = el ? (parseFloat(el.getAttribute('data-y')) || 0) : 0;
            posDisplay.innerHTML = `<i class="fas fa-crosshairs"></i> X: ${x} Y: ${y}`;

            // Reset button
            const resetBtn = document.createElement('button');
            resetBtn.type = 'button';
            resetBtn.className = 'btn-reset-position';
            resetBtn.innerHTML = `<i class="fas fa-undo"></i> ${isEnglish ? 'Reset' : 'إعادة'}`;
            resetBtn.title = isEnglish ? 'Reset position to center' : 'إعادة ضبط الموضع';
            resetBtn.addEventListener('click', () => {
                const target = document.getElementById(targetId);
                if (target) {
                    target.style.transform = 'translate(0px, 0px)';
                    target.setAttribute('data-x', 0);
                    target.setAttribute('data-y', 0);
                    updatePositionDisplays();

                    if (typeof StateManager !== 'undefined' && StateManager.saveDebounced) {
                        StateManager.saveDebounced();
                    }
                }
            });

            extras.appendChild(posDisplay);
            extras.appendChild(resetBtn);
            grid.parentElement.appendChild(extras);
        }

        // Update all position displays
        function updatePositionDisplays() {
            document.querySelectorAll('.position-display').forEach(display => {
                const targetId = display.dataset.targetId;
                const el = document.getElementById(targetId);
                if (el) {
                    const x = Math.round(parseFloat(el.getAttribute('data-x')) || 0);
                    const y = Math.round(parseFloat(el.getAttribute('data-y')) || 0);
                    display.innerHTML = `<i class="fas fa-crosshairs"></i> X: ${x} Y: ${y}`;
                }
            });
        }

        // Also update displays when move buttons are clicked
        document.addEventListener('click', (e) => {
            if (e.target.closest('.move-btn')) {
                setTimeout(updatePositionDisplays, 50);
            }
        });
    }

    // ===========================================
    // FEATURE 4: QUICK ELEMENTS BAR
    // ===========================================
    function initQuickElementsBar() {
        const isEnglish = document.documentElement.lang === 'en';

        const ELEMENTS = [
            { icon: 'fas fa-certificate', label: isEnglish ? 'Logo' : 'الشعار', targetId: 'logo-drop-zone' },
            { icon: 'fas fa-user-circle', label: isEnglish ? 'Photo' : 'الصورة', targetId: 'photo-controls-fieldset' },
            { icon: 'fas fa-heading', label: isEnglish ? 'Name' : 'الاسم', targetId: 'name-tagline-accordion' },
            { icon: 'fas fa-phone-alt', label: isEnglish ? 'Phone' : 'الهاتف', targetId: 'phones-accordion' },
            { icon: 'fas fa-qrcode', label: 'QR', targetId: 'qr-code-accordion' },
            { icon: 'fas fa-share-alt', label: isEnglish ? 'Social' : 'التواصل', targetId: 'contact-info-accordion' }
        ];

        // Create bars below each card face
        const frontCard = document.getElementById('card-front-preview');
        const backCard = document.getElementById('card-back-preview');

        function createBar(card) {
            if (!card) return;
            const bar = document.createElement('div');
            bar.className = 'quick-elements-bar';

            ELEMENTS.forEach(item => {
                const btn = document.createElement('button');
                btn.type = 'button';
                btn.className = 'quick-element-btn';
                btn.title = item.label;
                btn.innerHTML = `<i class="${item.icon}"></i> ${item.label}`;
                btn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    // Find the target element (could be a details accordion or a fieldset)
                    let targetEl = document.getElementById(item.targetId);
                    if (!targetEl) return;

                    // If target is inside a <details>, open it
                    const parentDetails = targetEl.closest('details');
                    if (parentDetails) {
                        parentDetails.open = true;
                    }
                    // If target IS a details, open it
                    if (targetEl.tagName === 'DETAILS') {
                        targetEl.open = true;
                    }

                    // Scroll to it in the sidebar
                    const sidebar = document.getElementById('panel-elements');
                    if (sidebar) {
                        const scrollTarget = parentDetails || targetEl;
                        sidebar.scrollTo({
                            top: scrollTarget.offsetTop - 60,
                            behavior: 'smooth'
                        });
                    }

                    // Highlight briefly
                    const highlightEl = targetEl.closest('.fieldset') || targetEl;
                    highlightEl.classList.add('form-element-highlighted');
                    setTimeout(() => highlightEl.classList.remove('form-element-highlighted'), 2000);
                });
                bar.appendChild(btn);
            });

            // Insert after the card (inside the flipper)
            card.parentElement.insertBefore(bar, card.nextSibling);
        }

        createBar(frontCard);
        createBar(backCard);
    }

    // ===========================================
    // FEATURE 10: EXTENDED FONT LIBRARY
    // ===========================================
    function initExtendedFonts() {
        const isEnglish = document.documentElement.lang === 'en';

        // Font definitions: value must match CSS font-family format
        const FONTS = [
            // Arabic fonts
            { value: "'Tajawal', sans-serif", label: 'Tajawal', type: 'ar' },
            { value: "'Cairo', sans-serif", label: 'Cairo', type: 'ar' },
            { value: "'Lalezar', cursive", label: 'Lalezar', type: 'ar' },
            { value: "'Almarai', sans-serif", label: 'Almarai', type: 'ar' },
            { value: "'Amiri', serif", label: 'Amiri', type: 'ar' },
            { value: "'Changa', sans-serif", label: 'Changa', type: 'ar' },
            { value: "'IBM Plex Sans Arabic', sans-serif", label: 'IBM Plex Arabic', type: 'ar' },
            // English fonts
            { value: "'Poppins', sans-serif", label: 'Poppins', type: 'en' },
            { value: "'Inter', sans-serif", label: 'Inter', type: 'en' },
            { value: "'Montserrat', sans-serif", label: 'Montserrat', type: 'en' },
            { value: "'Playfair Display', serif", label: 'Playfair Display', type: 'en' },
            { value: "'Oswald', sans-serif", label: 'Oswald', type: 'en' },
            { value: "'Roboto', sans-serif", label: 'Roboto', type: 'en' },
        ];

        // Inject Google Fonts link for new fonts
        const newFonts = [
            'Almarai:wght@400;700',
            'Amiri:wght@400;700',
            'Changa:wght@400;600;700',
            'IBM+Plex+Sans+Arabic:wght@400;500;700',
            'Inter:wght@400;500;600',
            'Montserrat:wght@400;500;600;700',
            'Playfair+Display:wght@400;600;700',
            'Oswald:wght@400;500;600',
            'Roboto:wght@400;500;700'
        ];

        const fontLink = document.createElement('link');
        fontLink.rel = 'stylesheet';
        fontLink.href = `https://fonts.googleapis.com/css2?${newFonts.map(f => 'family=' + f).join('&')}&display=swap`;
        document.head.appendChild(fontLink);

        // Font select IDs to enhance
        const FONT_SELECTS = ['name-font', 'tagline-font', 'phone-text-font', 'phone-btn-font', 'social-text-font'];

        FONT_SELECTS.forEach(selectId => {
            const select = document.getElementById(selectId);
            if (!select) return;

            // Remember current value
            const currentValue = select.value;

            // Clear and repopulate
            select.innerHTML = '';
            select.classList.add('font-select-enhanced');

            // Add Arabic header
            const arHeader = document.createElement('optgroup');
            arHeader.label = isEnglish ? '── Arabic Fonts ──' : '── خطوط عربية ──';
            select.appendChild(arHeader);

            FONTS.filter(f => f.type === 'ar').forEach(font => {
                const opt = document.createElement('option');
                opt.value = font.value;
                opt.textContent = font.label;
                opt.style.fontFamily = font.value;
                select.appendChild(opt);
            });

            // Add English header
            const enHeader = document.createElement('optgroup');
            enHeader.label = isEnglish ? '── English Fonts ──' : '── خطوط إنجليزية ──';
            select.appendChild(enHeader);

            FONTS.filter(f => f.type === 'en').forEach(font => {
                const opt = document.createElement('option');
                opt.value = font.value;
                opt.textContent = font.label;
                opt.style.fontFamily = font.value;
                select.appendChild(opt);
            });

            // Restore selection
            select.value = currentValue;
            // If previous value doesn't exist in new options, default to first
            if (!select.value) {
                select.selectedIndex = 1; // Skip optgroup
            }
        });
    }

    // ===========================================
    // FEATURE 8: THEME HOVER PREVIEW
    // ===========================================
    function initThemeHoverPreview() {
        const isEnglish = document.documentElement.lang === 'en';
        let savedColors = null;
        let hoverTimeout = null;
        let isPreviewActive = false;

        // Color control IDs that themes modify
        const COLOR_CONTROLS = [
            'name-color', 'tagline-color',
            'front-bg-start', 'front-bg-end',
            'back-bg-start', 'back-bg-end',
            'back-buttons-bg-color', 'back-buttons-text-color',
            'phone-btn-bg-color', 'phone-btn-text-color'
        ];

        function saveCurrentColors() {
            const colors = {};
            COLOR_CONTROLS.forEach(id => {
                const el = document.getElementById(id);
                if (el) colors[id] = el.value;
            });
            return colors;
        }

        function applyColorsTemporarily(themeKey) {
            const theme = (typeof Config !== 'undefined') ? Config.THEMES[themeKey] : null;
            if (!theme) return;

            const controlsToUpdate = {
                'name-color': theme.values.textPrimary,
                'tagline-color': theme.values.taglineColor,
                'front-bg-start': theme.gradient[0],
                'front-bg-end': theme.gradient[1],
                'back-bg-start': theme.gradient[0],
                'back-bg-end': theme.gradient[1],
                'back-buttons-bg-color': theme.values.backButtonBg,
                'back-buttons-text-color': theme.values.backButtonText,
                'phone-btn-bg-color': theme.values.phoneBtnBg,
                'phone-btn-text-color': theme.values.phoneBtnText
            };

            for (const [id, value] of Object.entries(controlsToUpdate)) {
                const control = document.getElementById(id);
                if (control) {
                    control.value = value;
                    control.dispatchEvent(new Event('input', { bubbles: true }));
                }
            }

            if (typeof CardManager !== 'undefined' && CardManager.updateCardBackgrounds) {
                CardManager.updateCardBackgrounds();
            }
        }

        function restoreColors(colors) {
            if (!colors) return;
            for (const [id, value] of Object.entries(colors)) {
                const control = document.getElementById(id);
                if (control) {
                    control.value = value;
                    control.dispatchEvent(new Event('input', { bubbles: true }));
                }
            }
            if (typeof CardManager !== 'undefined' && CardManager.updateCardBackgrounds) {
                CardManager.updateCardBackgrounds();
            }
        }

        // Wait a tick for theme thumbnails to be rendered by UIManager
        setTimeout(() => {
            const thumbnails = document.querySelectorAll('.theme-thumbnail');

            thumbnails.forEach(thumb => {
                // Add preview badge
                const badge = document.createElement('span');
                badge.className = 'theme-preview-badge';
                badge.textContent = isEnglish ? 'Preview' : 'معاينة';
                thumb.appendChild(badge);

                thumb.addEventListener('mouseenter', () => {
                    clearTimeout(hoverTimeout);
                    hoverTimeout = setTimeout(() => {
                        if (!isPreviewActive) {
                            savedColors = saveCurrentColors();
                        }
                        isPreviewActive = true;
                        const themeKey = thumb.dataset.themeKey;
                        applyColorsTemporarily(themeKey);
                        thumb.classList.add('previewing');
                    }, 200); // 200ms debounce to avoid flicker
                });

                thumb.addEventListener('mouseleave', () => {
                    clearTimeout(hoverTimeout);
                    thumb.classList.remove('previewing');
                    if (isPreviewActive && savedColors) {
                        restoreColors(savedColors);
                        isPreviewActive = false;
                    }
                });

                // On click: apply permanently (let original handler run, then clear saved)
                thumb.addEventListener('click', () => {
                    isPreviewActive = false;
                    savedColors = null;
                });
            });
        }, 500);
    }

    // ===========================================
    // FEATURE 6: LAYERS PANEL
    // ===========================================
    function initLayersPanel() {
        const isEnglish = document.documentElement.lang === 'en';
        const sidebar = document.getElementById('panel-elements');
        if (!sidebar) return;

        // Layer definitions
        const LAYERS = [
            { id: 'card-logo', icon: 'fas fa-certificate', name: isEnglish ? 'Logo' : 'الشعار', placementName: 'placement-logo' },
            { id: 'card-personal-photo-wrapper', icon: 'fas fa-user-circle', name: isEnglish ? 'Photo' : 'الصورة', placementName: 'placement-photo' },
            { id: 'card-name', icon: 'fas fa-heading', name: isEnglish ? 'Name' : 'الاسم', placementName: 'placement-name' },
            { id: 'card-tagline', icon: 'fas fa-briefcase', name: isEnglish ? 'Tagline' : 'المسمى', placementName: 'placement-tagline' },
            { id: 'qr-code-wrapper', icon: 'fas fa-qrcode', name: 'QR Code', placementName: 'placement-qr' },
            { id: 'phone-buttons-wrapper', icon: 'fas fa-phone-alt', name: isEnglish ? 'Phone' : 'الهاتف', placementName: null }
        ];

        // Create the layers panel accordion
        const accordion = document.createElement('details');
        accordion.className = 'layers-panel-accordion';
        const summary = document.createElement('summary');
        summary.textContent = isEnglish ? 'Layers' : 'الطبقات';
        accordion.appendChild(summary);

        const list = document.createElement('ul');
        list.className = 'layers-list';

        LAYERS.forEach(layer => {
            const li = document.createElement('li');
            li.className = 'layer-item';
            li.dataset.layerId = layer.id;

            // Icon
            const icon = document.createElement('span');
            icon.className = 'layer-item-icon';
            icon.innerHTML = `<i class="${layer.icon}"></i>`;

            // Name
            const name = document.createElement('span');
            name.className = 'layer-item-name';
            name.textContent = layer.name;

            // Face badge
            const faceBadge = document.createElement('span');
            faceBadge.className = 'layer-item-face';
            faceBadge.textContent = getFaceLabel(layer);

            // Hide/show toggle
            const eyeBtn = document.createElement('button');
            eyeBtn.type = 'button';
            eyeBtn.className = 'layer-toggle-btn active';
            eyeBtn.title = isEnglish ? 'Toggle visibility' : 'إظهار/إخفاء';
            eyeBtn.innerHTML = '<i class="fas fa-eye"></i>';
            eyeBtn.addEventListener('click', () => {
                const el = document.getElementById(layer.id);
                if (!el) return;
                const isHidden = li.classList.toggle('element-hidden');
                if (isHidden) {
                    el.style.opacity = '0';
                    el.style.pointerEvents = 'none';
                    eyeBtn.innerHTML = '<i class="fas fa-eye-slash"></i>';
                    eyeBtn.classList.remove('active');
                    eyeBtn.classList.add('hidden-state');
                } else {
                    el.style.opacity = '';
                    el.style.pointerEvents = '';
                    eyeBtn.innerHTML = '<i class="fas fa-eye"></i>';
                    eyeBtn.classList.add('active');
                    eyeBtn.classList.remove('hidden-state');
                }
            });

            // Lock toggle
            const lockBtn = document.createElement('button');
            lockBtn.type = 'button';
            lockBtn.className = 'layer-toggle-btn';
            lockBtn.title = isEnglish ? 'Lock/Unlock position' : 'قفل/فتح الموضع';
            lockBtn.innerHTML = '<i class="fas fa-unlock"></i>';
            lockBtn.addEventListener('click', () => {
                const el = document.getElementById(layer.id);
                if (!el) return;
                const isLocked = li.classList.toggle('element-locked');
                if (isLocked) {
                    el.setAttribute('data-locked', 'true');
                    el.style.cursor = 'default';
                    lockBtn.innerHTML = '<i class="fas fa-lock"></i>';
                    lockBtn.classList.add('locked-state');
                    // Disable interact.js dragging if available
                    if (typeof interact !== 'undefined') {
                        try { interact(el).draggable(false); } catch (e) { }
                    }
                } else {
                    el.removeAttribute('data-locked');
                    el.style.cursor = '';
                    lockBtn.innerHTML = '<i class="fas fa-unlock"></i>';
                    lockBtn.classList.remove('locked-state');
                    // Re-enable interact.js dragging
                    if (typeof interact !== 'undefined') {
                        try { interact(el).draggable(true); } catch (e) { }
                    }
                }
            });

            li.append(icon, name, faceBadge, eyeBtn, lockBtn);
            list.appendChild(li);
        });

        accordion.appendChild(list);

        // Insert at the top of sidebar (after face tabs if present)
        const faceTabs = sidebar.querySelector('.face-tabs-bar');
        if (faceTabs) {
            faceTabs.after(accordion);
        } else {
            sidebar.insertBefore(accordion, sidebar.firstChild);
        }

        // Helper: get face label for a layer
        function getFaceLabel(layer) {
            if (!layer.placementName) {
                return isEnglish ? 'front' : 'أمامي';
            }
            const radio = document.querySelector(`input[name="${layer.placementName}"]:checked`);
            const face = radio ? radio.value : 'front';
            if (face === 'front') return isEnglish ? 'Front' : 'أمامي';
            return isEnglish ? 'Back' : 'خلفي';
        }

        // Listen for placement changes => update face badges
        document.addEventListener('change', (e) => {
            if (e.target.type === 'radio' && e.target.name && e.target.name.startsWith('placement-')) {
                updateFaceBadges();
            }
        });

        function updateFaceBadges() {
            LAYERS.forEach(layer => {
                const li = list.querySelector(`[data-layer-id="${layer.id}"]`);
                if (li) {
                    const badge = li.querySelector('.layer-item-face');
                    if (badge) badge.textContent = getFaceLabel(layer);
                }
            });
        }
    }

    // ===========================================
    // ELEMENT SUB-TABS SYSTEM
    // ===========================================
    function initElementSubTabs() {
        const isEnglish = document.documentElement.lang === 'en';

        // Tab definitions
        const TABS = {
            content: { icon: 'fas fa-image', label: isEnglish ? 'Content' : 'المحتوى' },
            style: { icon: 'fas fa-palette', label: isEnglish ? 'Style' : 'المظهر' },
            effects: { icon: 'fas fa-magic', label: isEnglish ? 'Effects' : 'التأثيرات' },
            position: { icon: 'fas fa-arrows-alt', label: isEnglish ? 'Position' : 'الموضع' }
        };

        // Accordion configurations
        // Each config maps to an accordion identified by fieldset ID or accordion ID
        // 'selectors' are CSS selectors relative to the fieldset/content container
        // They are matched top-to-bottom; each child of the container is tested against each tab's selectors
        const ACCORDION_CONFIGS = [
            {
                // Logo accordion
                find: (acc) => acc.querySelector('#logo-drop-zone'),
                container: '#logo-drop-zone',
                tabs: ['content', 'style', 'effects', 'position'],
                classify: (el) => {
                    // Content: upload, URL, preview, drop-zone overlay, legend
                    if (el.matches('.drop-zone-overlay, legend')) return 'content';
                    if (el.matches('.form-group') && el.querySelector('#input-logo, #input-logo-upload')) return 'content';
                    if (el.matches('.form-group') && el.querySelector('.logo-upload-group')) return 'content';
                    // Effects: shadow fieldset
                    if (el.matches('fieldset') && el.querySelector('#logo-shadow-enabled')) return 'effects';
                    // Position: placement + fine position
                    if (el.matches('.placement-control')) return 'position';
                    if (el.matches('.form-group') && el.querySelector('.position-controls-grid')) return 'position';
                    // Style: everything else (size, align, opacity, bg)
                    if (el.matches('.control-grid')) return 'style';
                    return null; // skip
                }
            },
            {
                // Photo accordion
                find: (acc) => acc.querySelector('#photo-controls-fieldset'),
                container: '#photo-controls-fieldset',
                tabs: ['content', 'style', 'effects', 'position'],
                classify: (el) => {
                    if (el.matches('.drop-zone-overlay, legend')) return 'content';
                    if (el.matches('.form-group') && el.querySelector('#input-photo-url, #input-photo-upload')) return 'content';
                    if (el.matches('.form-group') && el.querySelector('.logo-upload-group')) return 'content';
                    // Effects: shadow fieldset
                    if (el.matches('fieldset') && el.querySelector('#photo-shadow-enabled')) return 'effects';
                    // Position: placement + fine position
                    if (el.matches('.placement-control')) return 'position';
                    if (el.matches('.form-group') && el.querySelector('.position-controls-grid')) return 'position';
                    // Style: size, shape, align, opacity, border
                    if (el.matches('.control-grid, .form-group')) return 'style';
                    return null;
                }
            },
            {
                // Name & Tagline accordion
                find: (acc) => acc.id === 'name-tagline-accordion' ? acc : null,
                container: '.fieldset-content',
                tabs: ['content', 'style', 'position'],
                classify: (el) => {
                    // Content: text inputs (name + tagline textareas)
                    if (el.matches('.form-group') && el.querySelector('textarea')) return 'content';
                    // Position: placement + fine position accordions
                    if (el.matches('.placement-control')) return 'position';
                    if (el.matches('details') && el.querySelector('.position-controls-grid')) return 'position';
                    // Separator — assign to whichever section it logically sits in
                    if (el.matches('hr')) return 'content';
                    // Style: font size, color, font select
                    if (el.matches('.control-grid, .form-group')) return 'style';
                    return null;
                }
            },
            {
                // QR Code accordion
                find: (acc) => acc.id === 'qr-code-accordion' ? acc : null,
                container: '.fieldset-content',
                tabs: ['content', 'style', 'position'],
                classify: (el) => {
                    // Content: source selection, generate button, url/upload groups, autoc card group
                    if (el.matches('.placement-control') && el.querySelector('[name="placement-qr"]')) return 'position';
                    if (el.matches('.form-group') && el.querySelector('[name="qr-source"]')) return 'content';
                    if (el.id === 'qr-auto-card-group' || el.id === 'qr-url-group' || el.id === 'qr-upload-group') return 'content';
                    if (el.matches('#qr-auto-card-group, #qr-url-group, #qr-upload-group')) return 'content';
                    // Style: customization, size
                    if (el.id === 'qr-customization-group') return 'style';
                    if (el.matches('.form-group') && el.querySelector('#qr-size')) return 'style';
                    // Position: fine position details
                    if (el.matches('details') && el.querySelector('.position-controls-grid')) return 'position';
                    if (el.matches('hr')) return null;
                    return 'content';
                }
            }
            // NOTE: Phone Numbers and Contact Info are excluded from sub-tabs
            // because their complex nested structures (#social-controls-wrapper,
            // dynamic phone inputs) break when DOM is restructured.
        ];

        // Process each accordion on the page
        const allAccordions = document.querySelectorAll('#panel-elements > details.fieldset-accordion');

        allAccordions.forEach(accordion => {
            // Find matching config
            let config = null;
            let matchedEl = null;
            for (const cfg of ACCORDION_CONFIGS) {
                matchedEl = cfg.find(accordion);
                if (matchedEl) { config = cfg; break; }
            }
            if (!config) return; // No config for this accordion, skip

            // Find the container element
            const container = accordion.querySelector(config.container);
            if (!container) return;

            // Collect direct children to classify
            const children = Array.from(container.children);

            // Create tab panels
            const panels = {};
            config.tabs.forEach(tabKey => {
                const panel = document.createElement('div');
                panel.className = 'subtab-panel';
                panel.dataset.tab = tabKey;
                panels[tabKey] = panel;
            });

            // Classify each child into a tab
            children.forEach(child => {
                const tab = config.classify(child);
                if (tab && panels[tab]) {
                    panels[tab].appendChild(child);
                }
                // If null or unmapped, put in first tab as fallback
                else if (tab === null) {
                    // Skip (separators, etc.) — don't add to any panel
                } else {
                    panels[config.tabs[0]].appendChild(child);
                }
            });

            // Create tab bar
            const tabBar = document.createElement('div');
            tabBar.className = 'element-subtabs';

            config.tabs.forEach((tabKey, index) => {
                const tabDef = TABS[tabKey];
                const btn = document.createElement('button');
                btn.type = 'button';
                btn.className = 'element-subtab' + (index === 0 ? ' active' : '');
                btn.dataset.tab = tabKey;
                btn.innerHTML = `<i class="${tabDef.icon}"></i><span>${tabDef.label}</span>`;
                btn.addEventListener('click', () => {
                    // Deactivate all tabs
                    tabBar.querySelectorAll('.element-subtab').forEach(t => t.classList.remove('active'));
                    btn.classList.add('active');
                    // Show corresponding panel
                    Object.values(panels).forEach(p => p.classList.remove('active'));
                    panels[tabKey].classList.add('active');
                });
                tabBar.appendChild(btn);
            });

            // Insert tab bar and panels into container
            container.innerHTML = '';
            container.appendChild(tabBar);
            config.tabs.forEach((tabKey, index) => {
                if (index === 0) panels[tabKey].classList.add('active');
                container.appendChild(panels[tabKey]);
            });
        });
    }

    // ===========================================
    // FEATURE: ENHANCED SLIDERS
    // ===========================================
    function initEnhancedSliders() {
        const sliders = document.querySelectorAll('#panel-elements input[type="range"]');
        sliders.forEach(slider => {
            if (slider.closest('.slider-enhanced-wrapper')) return;
            const parent = slider.parentElement;
            const wrapper = document.createElement('div');
            wrapper.className = 'slider-enhanced-wrapper';

            const getUnit = () => {
                const id = slider.id || '';
                if (id.includes('size') || id.includes('font') || id.includes('text-size')) return id.includes('opacity') ? '' : (parseInt(slider.max) > 50 ? 'px' : '%');
                if (id.includes('opacity') || id.includes('blur')) return '';
                return '';
            };

            const badge = document.createElement('span');
            badge.className = 'slider-value-badge';
            badge.textContent = slider.value + getUnit();

            slider.parentNode.insertBefore(wrapper, slider);
            wrapper.appendChild(slider);
            wrapper.appendChild(badge);

            slider.addEventListener('input', () => {
                badge.textContent = slider.value + getUnit();
            });

            // Click badge to edit manually
            badge.addEventListener('click', (e) => {
                e.stopPropagation();
                const input = document.createElement('input');
                input.type = 'number';
                input.className = 'slider-value-input';
                input.value = slider.value;
                input.min = slider.min;
                input.max = slider.max;
                input.step = slider.step || 1;
                badge.replaceWith(input);
                input.focus();
                input.select();

                const finish = () => {
                    let val = parseInt(input.value) || parseInt(slider.min);
                    val = Math.max(parseInt(slider.min), Math.min(parseInt(slider.max), val));
                    slider.value = val;
                    slider.dispatchEvent(new Event('input', { bubbles: true }));
                    badge.textContent = val + getUnit();
                    input.replaceWith(badge);
                };

                input.addEventListener('blur', finish);
                input.addEventListener('keydown', (ev) => {
                    if (ev.key === 'Enter') finish();
                    if (ev.key === 'Escape') { badge.textContent = slider.value + getUnit(); input.replaceWith(badge); }
                });
            });

            // Double-click to reset to default
            badge.addEventListener('dblclick', (e) => {
                e.stopPropagation();
                const def = slider.getAttribute('data-default') || slider.defaultValue;
                if (def !== undefined) {
                    slider.value = def;
                    slider.dispatchEvent(new Event('input', { bubbles: true }));
                    badge.textContent = def + getUnit();
                }
            });
        });
    }

    // ===========================================
    // FEATURE: SMART COLOR PALETTE
    // ===========================================
    function initSmartPalette() {
        const isEnglish = document.documentElement.lang === 'en';
        const colorInputs = document.querySelectorAll('#panel-elements input[type="color"]');
        if (!colorInputs.length) return;

        function getThemeColors() {
            const colors = new Set();
            // Get current theme from card backgrounds
            const frontCard = document.getElementById('card-front-preview');
            if (frontCard) {
                const bg = getComputedStyle(frontCard).background;
                const hexMatches = bg.match(/#[0-9a-fA-F]{6}/g);
                if (hexMatches) hexMatches.forEach(c => colors.add(c));
            }
            // Get colors from Config if available
            if (typeof Config !== 'undefined' && Config.THEMES) {
                const themeSelect = document.getElementById('theme-select');
                const currentTheme = themeSelect ? themeSelect.value : 'deep-sea';
                const theme = Config.THEMES[currentTheme];
                if (theme) {
                    theme.gradient.forEach(c => colors.add(c));
                    Object.values(theme.values).forEach(v => {
                        if (typeof v === 'string' && v.startsWith('#')) colors.add(v);
                    });
                }
            }
            // Add common extras
            colors.add('#ffffff');
            colors.add('#000000');
            colors.add('#e74c3c');
            colors.add('#2ecc71');
            return [...colors].slice(0, 12);
        }

        colorInputs.forEach(input => {
            const palette = document.createElement('div');
            palette.className = 'smart-palette';

            function render() {
                palette.innerHTML = '';
                getThemeColors().forEach(color => {
                    const swatch = document.createElement('div');
                    swatch.className = 'palette-swatch';
                    swatch.style.backgroundColor = color;
                    swatch.title = color;
                    if (input.value.toLowerCase() === color.toLowerCase()) swatch.classList.add('active');
                    swatch.addEventListener('click', () => {
                        input.value = color;
                        input.dispatchEvent(new Event('input', { bubbles: true }));
                        input.dispatchEvent(new Event('change', { bubbles: true }));
                        palette.querySelectorAll('.palette-swatch').forEach(s => s.classList.remove('active'));
                        swatch.classList.add('active');
                    });
                    palette.appendChild(swatch);
                });
            }

            render();
            input.closest('.form-group')?.appendChild(palette);

            // Re-render when theme changes
            const themeSelect = document.getElementById('theme-select');
            if (themeSelect) {
                themeSelect.addEventListener('change', () => setTimeout(render, 100));
            }
        });
    }

    // ===========================================
    // FEATURE: QUICK SWAP
    // ===========================================
    function initQuickSwap() {
        const isEnglish = document.documentElement.lang === 'en';
        const faceTabs = document.querySelector('.face-tabs');
        if (!faceTabs) return;

        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'quick-swap-btn';
        btn.innerHTML = `<i class="fas fa-exchange-alt"></i> ${isEnglish ? 'Swap Front ⟷ Back' : 'تبديل أمامي ⟷ خلفي'}`;

        btn.addEventListener('click', () => {
            // Swap all placement radios
            const placementElements = ['logo', 'photo', 'name', 'tagline', 'qr'];
            placementElements.forEach(elName => {
                const frontRadio = document.querySelector(`input[name="placement-${elName}"][value="front"]`);
                const backRadio = document.querySelector(`input[name="placement-${elName}"][value="back"]`);
                if (frontRadio && backRadio) {
                    if (frontRadio.checked) {
                        backRadio.checked = true;
                    } else {
                        frontRadio.checked = true;
                    }
                    // Trigger change event
                    const active = frontRadio.checked ? frontRadio : backRadio;
                    active.dispatchEvent(new Event('change', { bubbles: true }));
                }
            });

            // Also swap phone and social placements
            document.querySelectorAll('input[name^="placement-"]').forEach(radio => {
                const name = radio.name;
                if (placementElements.some(e => name === `placement-${e}`)) return; // already handled
                if (!radio.checked) return;
                const otherValue = radio.value === 'front' ? 'back' : 'front';
                const otherRadio = document.querySelector(`input[name="${name}"][value="${otherValue}"]`);
                if (otherRadio) {
                    otherRadio.checked = true;
                    otherRadio.dispatchEvent(new Event('change', { bubbles: true }));
                }
            });

            // Visual feedback
            btn.innerHTML = `<i class="fas fa-check"></i> ${isEnglish ? 'Swapped!' : 'تم التبديل!'}`;
            setTimeout(() => {
                btn.innerHTML = `<i class="fas fa-exchange-alt"></i> ${isEnglish ? 'Swap Front ⟷ Back' : 'تبديل أمامي ⟷ خلفي'}`;
            }, 1500);
        });

        faceTabs.parentElement.insertBefore(btn, faceTabs.nextSibling);
    }

    // ===========================================
    // FEATURE: SNAP GUIDELINES
    // ===========================================
    function initSnapGuidelines() {
        const SNAP_THRESHOLD = 8; // px
        let hGuide = null, vGuide = null;

        function ensureGuides(container) {
            if (!hGuide) {
                hGuide = document.createElement('div');
                hGuide.className = 'snap-guide snap-guide-h';
                hGuide.style.display = 'none';
            }
            if (!vGuide) {
                vGuide = document.createElement('div');
                vGuide.className = 'snap-guide snap-guide-v';
                vGuide.style.display = 'none';
            }
            if (hGuide.parentElement !== container) container.appendChild(hGuide);
            if (vGuide.parentElement !== container) container.appendChild(vGuide);
        }

        // Monkey-patch DragManager.dragMoveListener to add snap
        if (typeof DragManager !== 'undefined') {
            const originalMove = DragManager.dragMoveListener;
            DragManager.dragMoveListener = function (event) {
                const target = event.target;
                const container = target.closest('.card-content-layer') || target.parentElement;
                if (!container) { originalMove.call(this, event); return; }

                ensureGuides(container);

                let x = (parseFloat(target.getAttribute('data-x')) || 0) + event.dx;
                let y = (parseFloat(target.getAttribute('data-y')) || 0) + event.dy;

                const containerRect = container.getBoundingClientRect();
                const targetRect = target.getBoundingClientRect();

                // Element center relative to container
                const elCenterX = (targetRect.left - containerRect.left) + targetRect.width / 2 + event.dx;
                const elCenterY = (targetRect.top - containerRect.top) + targetRect.height / 2 + event.dy;

                const containerCenterX = containerRect.width / 2;
                const containerCenterY = containerRect.height / 2;

                // Snap to center X
                if (Math.abs(elCenterX - containerCenterX) < SNAP_THRESHOLD) {
                    x += (containerCenterX - elCenterX);
                    vGuide.style.left = containerCenterX + 'px';
                    vGuide.style.display = 'block';
                } else {
                    vGuide.style.display = 'none';
                }

                // Snap to center Y
                if (Math.abs(elCenterY - containerCenterY) < SNAP_THRESHOLD) {
                    y += (containerCenterY - elCenterY);
                    hGuide.style.top = containerCenterY + 'px';
                    hGuide.style.display = 'block';
                } else {
                    hGuide.style.display = 'none';
                }

                target.style.transform = `translate(${x}px, ${y}px)`;
                target.setAttribute('data-x', x);
                target.setAttribute('data-y', y);
            };

            // Hide guides on drag end
            const originalEnd = DragManager.dragEndListener;
            DragManager.dragEndListener = function (event) {
                if (hGuide) hGuide.style.display = 'none';
                if (vGuide) vGuide.style.display = 'none';
                originalEnd.call(this, event);
            };
        }
    }

    // ===========================================
    // FEATURE: KEYBOARD SHORTCUTS
    // ===========================================
    function initKeyboardShortcuts() {
        const isEnglish = document.documentElement.lang === 'en';

        const SHORTCUTS = [
            { key: 'S', ctrl: true, label: isEnglish ? 'Save' : 'حفظ', action: () => { if (typeof StateManager !== 'undefined') StateManager.save(); } },
            { key: 'P', ctrl: true, label: isEnglish ? 'Preview' : 'معاينة', action: () => { const btn = document.getElementById('preview-btn'); if (btn) btn.click(); } },
            { key: 'Z', ctrl: true, label: isEnglish ? 'Undo' : 'تراجع', action: () => { /* handled natively */ } },
        ];

        // Register shortcuts
        document.addEventListener('keydown', (e) => {
            if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.tagName === 'SELECT') return;

            for (const sc of SHORTCUTS) {
                if (e.key.toUpperCase() === sc.key && e.ctrlKey === !!sc.ctrl && !e.altKey) {
                    e.preventDefault();
                    sc.action();
                    // Flash feedback
                    showShortcutFeedback(sc);
                    return;
                }
            }

            // ? to toggle shortcuts bar
            if (e.key === '?' || e.key === '/') {
                toggleShortcutsBar();
            }
        });

        let shortcutsBarEl = null;
        let shortcutsVisible = false;

        function toggleShortcutsBar() {
            if (shortcutsVisible && shortcutsBarEl) {
                shortcutsBarEl.remove();
                shortcutsBarEl = null;
                shortcutsVisible = false;
                return;
            }

            shortcutsBarEl = document.createElement('div');
            shortcutsBarEl.className = 'shortcuts-bar';
            SHORTCUTS.forEach(sc => {
                const item = document.createElement('span');
                item.className = 'shortcut-item';
                item.innerHTML = `<span class="shortcut-key">${sc.ctrl ? 'Ctrl+' : ''}${sc.key}</span> ${sc.label}`;
                shortcutsBarEl.appendChild(item);
            });

            // Close button
            const close = document.createElement('span');
            close.className = 'shortcut-item';
            close.innerHTML = `<span class="shortcut-key" style="cursor:pointer">✕</span>`;
            close.addEventListener('click', toggleShortcutsBar);
            shortcutsBarEl.appendChild(close);

            document.body.appendChild(shortcutsBarEl);
            shortcutsVisible = true;
        }

        function showShortcutFeedback(sc) {
            const feedback = document.createElement('div');
            feedback.style.cssText = 'position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);background:rgba(0,0,0,0.8);color:#fff;padding:12px 24px;border-radius:10px;font-size:1.1rem;z-index:99999;pointer-events:none;animation:shortcutsSlideUp 0.3s ease';
            feedback.textContent = `${sc.ctrl ? 'Ctrl+' : ''}${sc.key} — ${sc.label}`;
            document.body.appendChild(feedback);
            setTimeout(() => feedback.remove(), 800);
        }

        // Add toggle hint
        const hint = document.createElement('button');
        hint.className = 'shortcuts-toggle';
        hint.innerHTML = `<i class="fas fa-keyboard"></i> ? ${isEnglish ? 'Shortcuts' : 'اختصارات'}`;
        hint.addEventListener('click', toggleShortcutsBar);
        document.body.appendChild(hint);
    }

    // ===========================================
    // FEATURE: CARD ELEMENT COUNTER
    // ===========================================
    function initCardCounter() {
        const isEnglish = document.documentElement.lang === 'en';
        const elementsPanel = document.getElementById('panel-elements');
        if (!elementsPanel) return;

        const MAX_ELEMENTS_PER_FACE = 8; // approximate max for good design

        const counterBar = document.createElement('div');
        counterBar.className = 'card-counter-bar';
        counterBar.innerHTML = `
            <div class="counter-face">
                <div class="counter-label"><span>${isEnglish ? 'Front' : 'أمامي'}</span><span class="counter-value" data-face="front">0</span></div>
                <div class="counter-track"><div class="counter-fill" data-face="front" style="width:0%"></div></div>
            </div>
            <div class="counter-face">
                <div class="counter-label"><span>${isEnglish ? 'Back' : 'خلفي'}</span><span class="counter-value" data-face="back">0</span></div>
                <div class="counter-track"><div class="counter-fill" data-face="back" style="width:0%"></div></div>
            </div>
        `;

        // Insert at top of elements panel
        const firstAccordion = elementsPanel.querySelector('details.fieldset-accordion');
        if (firstAccordion) {
            elementsPanel.insertBefore(counterBar, firstAccordion);
        }

        function updateCounter() {
            const frontContent = document.getElementById('card-front-content');
            const backContent = document.getElementById('card-back-content');

            const frontCount = frontContent ? frontContent.querySelectorAll('.draggable-on-card').length : 0;
            const backCount = backContent ? backContent.querySelectorAll('.draggable-on-card').length : 0;

            ['front', 'back'].forEach(face => {
                const count = face === 'front' ? frontCount : backCount;
                const pct = Math.min(100, (count / MAX_ELEMENTS_PER_FACE) * 100);
                const fill = counterBar.querySelector(`.counter-fill[data-face="${face}"]`);
                const value = counterBar.querySelector(`.counter-value[data-face="${face}"]`);
                if (fill) {
                    fill.style.width = pct + '%';
                    fill.className = 'counter-fill ' + (pct < 50 ? 'low' : pct < 80 ? 'medium' : 'high');
                }
                if (value) value.textContent = count;
            });
        }

        updateCounter();

        // Observe changes to both card faces
        const observer = new MutationObserver(updateCounter);
        ['card-front-content', 'card-back-content'].forEach(id => {
            const el = document.getElementById(id);
            if (el) observer.observe(el, { childList: true, subtree: true });
        });
    }

    // ===========================================
    // FEATURE: FOCUS MODE
    // ===========================================
    function initFocusMode() {
        // Map accordion IDs to card element IDs
        const ACCORDION_MAP = {
            'logo-drop-zone': ['card-logo'],
            'photo-drop-zone': ['card-personal-photo-wrapper'],
            'name-tagline-accordion': ['card-name', 'card-tagline'],
            'qr-code-accordion': ['qr-code-wrapper'],
        };

        // Get the nearest accordion identifier for an element
        function getAccordionKey(accordion) {
            // Check by ID of the accordion itself or its fieldset child
            if (accordion.id && ACCORDION_MAP[accordion.id]) return accordion.id;
            const fieldset = accordion.querySelector('fieldset[id]');
            if (fieldset && ACCORDION_MAP[fieldset.id]) return fieldset.id;
            return null;
        }

        const allAccordions = document.querySelectorAll('#panel-elements > details.fieldset-accordion');

        allAccordions.forEach(accordion => {
            const summary = accordion.querySelector('summary');
            if (!summary) return;

            accordion.addEventListener('toggle', () => {
                const key = getAccordionKey(accordion);
                const cardElementIds = key ? ACCORDION_MAP[key] : null;

                // Clear all focus highlights
                document.querySelectorAll('.focus-highlight').forEach(el => el.classList.remove('focus-highlight'));
                document.querySelectorAll('.focus-badge').forEach(el => el.remove());

                if (accordion.open && cardElementIds) {
                    // Enable focus mode
                    document.querySelectorAll('.card-content-layer').forEach(layer => {
                        layer.classList.add('focus-mode-active');
                    });

                    cardElementIds.forEach(id => {
                        const el = document.getElementById(id);
                        if (el) {
                            el.classList.add('focus-highlight');
                        }
                    });
                } else {
                    // Disable focus mode
                    document.querySelectorAll('.card-content-layer').forEach(layer => {
                        layer.classList.remove('focus-mode-active');
                    });
                }
            });
        });
    }

    // ===========================================
    // FEATURE: COPY ELEMENT STYLE
    // ===========================================
    function initCopyStyle() {
        const isEnglish = document.documentElement.lang === 'en';
        let clipboardStyle = null;

        // Elements that support style copying
        const STYLE_ELEMENTS = {
            'card-name': { inputs: ['name-font-size', 'name-color', 'font-select-name'] },
            'card-tagline': { inputs: ['tagline-font-size', 'tagline-color', 'font-select-tagline'] },
        };

        // Add copy/paste buttons to Name and Tagline accordions
        const accordions = document.querySelectorAll('#panel-elements > details.fieldset-accordion');
        accordions.forEach(accordion => {
            const summary = accordion.querySelector('summary');
            if (!summary) return;

            // Check if this accordion contains name or tagline
            let elementKey = null;
            if (accordion.querySelector('#name-font-size') || accordion.id === 'name-tagline-accordion') {
                // Name/Tagline accordion — add buttons for both
                const nameSection = accordion.querySelector('.form-group:has(#name-font-size)');
                const taglineSection = accordion.querySelector('.form-group:has(#tagline-font-size)');

                if (nameSection) addCopyPasteButtons(nameSection, 'card-name');
                if (taglineSection) addCopyPasteButtons(taglineSection, 'card-tagline');
            }
        });

        function addCopyPasteButtons(container, elementKey) {
            const config = STYLE_ELEMENTS[elementKey];
            if (!config) return;

            const btnGroup = document.createElement('div');
            btnGroup.style.display = 'flex';
            btnGroup.style.gap = '4px';
            btnGroup.style.marginTop = '4px';

            const copyBtn = document.createElement('button');
            copyBtn.type = 'button';
            copyBtn.className = 'copy-style-btn';
            copyBtn.innerHTML = `<i class="fas fa-copy"></i> ${isEnglish ? 'Copy Style' : 'نسخ النمط'}`;

            const pasteBtn = document.createElement('button');
            pasteBtn.type = 'button';
            pasteBtn.className = 'paste-style-btn';
            pasteBtn.innerHTML = `<i class="fas fa-paste"></i> ${isEnglish ? 'Paste Style' : 'لصق النمط'}`;

            copyBtn.addEventListener('click', () => {
                clipboardStyle = {};
                config.inputs.forEach(inputId => {
                    const input = document.getElementById(inputId);
                    if (input) clipboardStyle[inputId.replace(/^(name|tagline)-/, '')] = input.value;
                });
                copyBtn.classList.add('copied');
                copyBtn.innerHTML = `<i class="fas fa-check"></i> ${isEnglish ? 'Copied!' : 'تم النسخ!'}`;
                // Show paste buttons
                document.querySelectorAll('.paste-style-btn').forEach(b => b.classList.add('visible'));
                setTimeout(() => {
                    copyBtn.classList.remove('copied');
                    copyBtn.innerHTML = `<i class="fas fa-copy"></i> ${isEnglish ? 'Copy Style' : 'نسخ النمط'}`;
                }, 2000);
            });

            pasteBtn.addEventListener('click', () => {
                if (!clipboardStyle) return;
                config.inputs.forEach(inputId => {
                    const input = document.getElementById(inputId);
                    const key = inputId.replace(/^(name|tagline)-/, '');
                    if (input && clipboardStyle[key] !== undefined) {
                        input.value = clipboardStyle[key];
                        input.dispatchEvent(new Event('input', { bubbles: true }));
                        input.dispatchEvent(new Event('change', { bubbles: true }));
                    }
                });
                pasteBtn.innerHTML = `<i class="fas fa-check"></i> ${isEnglish ? 'Applied!' : 'تم التطبيق!'}`;
                setTimeout(() => {
                    pasteBtn.innerHTML = `<i class="fas fa-paste"></i> ${isEnglish ? 'Paste Style' : 'لصق النمط'}`;
                }, 1500);
            });

            btnGroup.appendChild(copyBtn);
            btnGroup.appendChild(pasteBtn);
            container.appendChild(btnGroup);
        }
    }

})();
