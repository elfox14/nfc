/**
 * MC PRIME NFC Editor Enhancements
 * Features: Progress Bar, Auto-save, Keyboard Shortcuts, Full Preview
 */

(function () {
    'use strict';

    // Wait for DOM
    document.addEventListener('DOMContentLoaded', initEditorEnhancements);

    function initEditorEnhancements() {
        createProgressBar();
        initAutoSave();
        initKeyboardShortcuts();
        initFullPreviewMode();
        initZoomControls();
        createMobileBottomToolbar();
        enhanceAccordions();
    }

    // ===========================================
    // PROGRESS BAR
    // ===========================================
    const STEPS = [
        { id: 'design', label: 'التصميم', icon: 'fas fa-palette', panels: ['panel-design', 'backgrounds-accordion'] },
        { id: 'content', label: 'المحتوى', icon: 'fas fa-user', panels: ['name-tagline-accordion', 'phones-accordion'] },
        { id: 'contact', label: 'التواصل', icon: 'fas fa-address-book', panels: ['contact-info-accordion', 'qr-code-accordion'] },
        { id: 'share', label: 'المشاركة', icon: 'fas fa-share-alt', panels: [] }
    ];

    let currentStep = 0;

    function createProgressBar() {
        const progressBar = document.createElement('div');
        progressBar.className = 'editor-progress-bar';
        progressBar.innerHTML = `
            <button id="ai-suggest-btn-top" class="btn btn-ai-suggest" title="اقترح تصميمًا ذكيًا">
                <i class="fas fa-magic"></i>
                <span>اقتراح ذكي</span>
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
        indicator.innerHTML = '<i class="fas fa-check"></i><span>تم الحفظ تلقائياً</span>';
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
        indicator.innerHTML = '<i class="fas fa-spinner"></i><span>جاري الحفظ...</span>';
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
                indicator.innerHTML = '<i class="fas fa-check"></i><span>تم الحفظ تلقائياً</span>';
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
            indicator.innerHTML = '<i class="fas fa-exclamation-triangle"></i><span>فشل الحفظ</span>';
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
        const time = new Date(timestamp).toLocaleTimeString('ar-EG');

        // Create prompt
        const prompt = document.createElement('div');
        prompt.className = 'autosave-restore-prompt';
        prompt.innerHTML = `
            <div class="restore-content">
                <i class="fas fa-history"></i>
                <div class="restore-text">
                    <strong>تم العثور على تصميم محفوظ</strong>
                    <span>آخر حفظ: ${time}</span>
                </div>
                <div class="restore-actions">
                    <button class="btn btn-primary restore-yes">استعادة</button>
                    <button class="btn btn-secondary restore-no">تجاهل</button>
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
            showNotification('تم استعادة التصميم', 'success');
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
        { keys: ['Ctrl', 'S'], action: 'حفظ التصميم', handler: () => document.getElementById('save-to-gallery-btn')?.click() },
        { keys: ['Ctrl', 'Z'], action: 'تراجع', handler: () => document.getElementById('undo-btn')?.click() },
        { keys: ['Ctrl', 'Y'], action: 'إعادة', handler: () => document.getElementById('redo-btn')?.click() },
        { keys: ['Ctrl', 'P'], action: 'معاينة كاملة', handler: toggleFullPreview },
        { keys: ['Escape'], action: 'إغلاق النوافذ', handler: closeModals },
        { keys: ['?'], action: 'عرض الاختصارات', handler: toggleShortcutsModal }
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
                    <h3><i class="fas fa-keyboard"></i> اختصارات لوحة المفاتيح</h3>
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
        exitBtn.innerHTML = '<i class="fas fa-compress"></i> الخروج من المعاينة';
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
        const toolbar = document.createElement('div');
        toolbar.className = 'mobile-bottom-toolbar';
        toolbar.innerHTML = `
            <button class="mobile-bottom-btn" data-action="flip" title="تقليب">
                <i class="fas fa-sync-alt"></i>
                <span>تقليب</span>
            </button>
            <button class="mobile-bottom-btn" data-action="undo" title="تراجع">
                <i class="fas fa-undo"></i>
                <span>تراجع</span>
            </button>
            <button class="mobile-bottom-btn primary" data-action="save" title="حفظ">
                <i class="fas fa-save"></i>
                <span>حفظ</span>
            </button>
            <button class="mobile-bottom-btn" data-action="share" title="مشاركة">
                <i class="fas fa-share-alt"></i>
                <span>مشاركة</span>
            </button>
            <button class="mobile-bottom-btn" data-action="download" title="تنزيل">
                <i class="fas fa-download"></i>
                <span>تنزيل</span>
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
