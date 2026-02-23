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
        const toolbar = document.createElement('div');
        toolbar.className = 'mobile-bottom-toolbar';
        toolbar.innerHTML = `
            <button class="mobile-bottom-btn" data-action="flip" title="Flip">
                <i class="fas fa-sync-alt"></i>
                <span>Flip</span>
            </button>
            <button class="mobile-bottom-btn" data-action="undo" title="Undo">
                <i class="fas fa-undo"></i>
                <span>Undo</span>
            </button>
            <button class="mobile-bottom-btn primary" data-action="save" title="Save">
                <i class="fas fa-save"></i>
                <span>Save</span>
            </button>
            <button class="mobile-bottom-btn" data-action="share" title="Share">
                <i class="fas fa-share-alt"></i>
                <span>Share</span>
            </button>
            <button class="mobile-bottom-btn" data-action="download" title="Download">
                <i class="fas fa-download"></i>
                <span>Download</span>
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
