'use strict';

/**
 * Mobile Smart Palette Interface
 * Provides a context-aware mobile interface for the editor
 */

const MobileInterface = {
    // State
    selectedElement: null,
    isPreviewMode: false,

    // DOM Elements  
    controlPalette: null,
    contextBar: null,
    fabButton: null,
    fabOverlay: null,

    // Configuration: Selectable elements and their properties
    selectableElements: {
        'card-logo': {
            name: 'الشعار',
            icon: 'fas fa-image',
            controls: ['logo-upload', 'logo-size', 'logo-opacity']
        },
        'card-name': {
            name: 'الاسم',
            icon: 'fas fa-user',
            controls: ['name-text', 'name-size', 'name-color', 'name-font']
        },
        'card-tagline': {
            name: 'المسمى الوظيفي',
            icon: 'fas fa-briefcase',
            controls: ['tagline-text', 'tagline-size', 'tagline-color', 'tagline-font']
        },
        'card-personal-photo-wrapper': {
            name: 'الصورة الشخصية',
            icon: 'fas fa-portrait',
            controls: ['photo-upload', 'photo-size', 'photo-shape']
        },
        'qr-code-wrapper': {
            name: 'رمز QR',
            icon: 'fas fa-qrcode',
            controls: ['qr-size', 'qr-source']
        }
    },

    /**
     * Initialize the mobile interface
     */
    init() {
        // Only initialize on mobile devices
        if (window.innerWidth > 768) {
            console.log('Mobile Interface: Desktop detected, skipping initialization');
            return;
        }

        console.log('Mobile Interface: Initializing...');

        // Get DOM elements
        this.controlPalette = document.getElementById('mobile-control-palette');
        this.contextBar = document.getElementById('mobile-context-bar');
        this.fabButton = document.getElementById('fab-menu-button');
        this.fabOverlay = document.getElementById('fab-menu-overlay');

        if (!this.controlPalette || !this.contextBar || !this.fabButton) {
            console.error('Mobile Interface: Required DOM elements not found');
            return;
        }

        // Bind events
        this.bindEvents();

        console.log('Mobile Interface: Initialized successfully');
    },

    /**
     * Bind all event listeners  
     */
    bindEvents() {
        // Click on card elements to select them
        Object.keys(this.selectableElements).forEach(elementId => {
            const element = document.getElementById(elementId);
            if (element) {
                element.addEventListener('click', (e) => {
                    e.stopPropagation();
                    this.selectElement(elementId);
                });
            }
        });

        // FAB button
        this.fabButton.addEventListener('click', () => {
            this.toggleFabMenu();
        });

        // FAB menu overlay (click outside to close)
        this.fabOverlay.addEventListener('click', (e) => {
            if (e.target === this.fabOverlay) {
                this.closeFabMenu();
            }
        });

        // FAB menu items
        document.querySelectorAll('.fab-menu-item').forEach(item => {
            item.addEventListener('click', () => {
                const action = item.dataset.action;
                this.handleFabAction(action);
            });
        });

        // FAB close button
        const fabCloseBtn = document.getElementById('fab-menu-close');
        if (fabCloseBtn) {
            fabCloseBtn.addEventListener('click', () => this.closeFabMenu());
        }

        // Palette close button
        const paletteCloseBtn = document.getElementById('palette-close-btn');
        if (paletteCloseBtn) {
            paletteCloseBtn.addEventListener('click', () => {
                this.hideControlPalette();
                this.deselectElement();
            });
        }

        // Click outside to deselect
        document.addEventListener('click', (e) => {
            // Don't deselect if clicking on palette or context bar
            if (!this.controlPalette.contains(e.target) &&
                !this.contextBar.contains(e.target)) {
                this.deselectElement();
            }
        });
    },

    /**
     * Select an element on the card
     */
    selectElement(elementId) {
        const elementConfig = this.selectableElements[elementId];
        if (!elementConfig) return;

        // Remove previous selection
        if (this.selectedElement) {
            const prevElement = document.getElementById(this.selectedElement);
            if (prevElement) {
                prevElement.classList.remove('mobile-selected');
            }
        }

        // Select new element
        this.selectedElement = elementId;
        const element = document.getElementById(elementId);
        if (element) {
            element.classList.add('mobile-selected');
        }

        // Update context bar
        this.updateContextBar(elementConfig);

        // Update control palette
        this.updateControlPalette(elementConfig);

        // Show UI elements
        this.showContextBar();
        this.showControlPalette();

        // Haptic feedback
        this.triggerHaptic('selection');
    },

    /**
     * Deselect current element
     */
    deselectElement() {
        if (this.selectedElement) {
            const element = document.getElementById(this.selectedElement);
            if (element) {
                element.classList.remove('mobile-selected');
            }
            this.selectedElement = null;
        }

        this.hideContextBar();
        this.hideControlPalette();
    },

    /**
     * Update context bar with element info
     */
    updateContextBar(config) {
        const nameElement = document.getElementById('context-element-name');
        if (nameElement) {
            nameElement.innerHTML = `<i class="${config.icon}"></i> ${config.name}`;
        }

        // Add quick action buttons
        const actionsContainer = document.getElementById('context-actions');
        if (actionsContainer) {
            actionsContainer.innerHTML = `
                <button class="context-action-btn" onclick="MobileInterface.deleteCurrentElement()">
                    <i class="fas fa-trash"></i> حذف
                </button>
                <button class="context-action-btn" onclick="MobileInterface.togglePlacement()">
                    <i class="fas fa-exchange-alt"></i> تبديل الوجه
                </button>
            `;
        }
    },

    /**
     * Update control palette with element-specific controls
     */
    updateControlPalette(config) {
        const paletteContent = document.getElementById('palette-content');
        if (!paletteContent) return;

        paletteContent.innerHTML = '';

        // Create control sections based on element type
        config.controls.forEach(controlType => {
            const controlHTML = this.getControlHTML(controlType);
            if (controlHTML) {
                paletteContent.innerHTML += controlHTML;
            }
        });

        // Rebind events for new controls
        this.rebindControlEvents();
    },

    /**
     * Get HTML for specific control type
     */
    getControlHTML(controlType) {
        const templates = {
            'logo-upload': `
                <div class="palette-section">
                    <div class="palette-section-title">رفع شعار جديد</div>
                    <button class="btn btn-secondary" onclick="document.getElementById('input-logo-upload').click()">
                        <i class="fas fa-upload"></i> تغيير الشعار
                    </button>
                </div>
            `,
            'logo-size': `
                <div class="palette-section">
                    <div class="palette-section-title">حجم الشعار</div>
                    <input type="range" id="mobile-logo-size" min="10" max="80" value="25" class="form-control">
                </div>
            `,
            'logo-opacity': `
                <div class="palette-section">
                    <div class="palette-section-title">شفافية الشعار</div>
                    <input type="range" id="mobile-logo-opacity" min="0" max="1" step="0.05" value="1" class="form-control">
                </div>
            `,
            'name-text': `
                <div class="palette-section">
                    <div class="palette-section-title">نص الاسم</div>
                    <textarea id="mobile-name-text" rows="2" class="form-control"></textarea>
                </div>
            `,
            'name-size': `
                <div class="palette-section">
                    <div class="palette-section-title">حجم الخط</div>
                    <input type="range" id="mobile-name-size" min="16" max="48" value="22" class="form-control">
                </div>
            `,
            'name-color': `
                <div class="palette-section">
                    <div class="palette-section-title">لون الخط</div>
                    <input type="color" id="mobile-name-color" value="#e6f0f7" class="form-control">
                </div>
            `
            // Add more control templates as needed
        };

        return templates[controlType] || '';
    },

    /**
     * Rebind events for dynamically created controls
     */
    rebindControlEvents() {
        // Logo size
        const logoSize = document.getElementById('mobile-logo-size');
        if (logoSize) {
            logoSize.addEventListener('input', (e) => {
                const logo = document.getElementById('card-logo');
                if (logo) {
                    logo.style.maxWidth = e.target.value + '%';
                    // Also update the desktop control
                    const desktopControl = document.getElementById('logo-size');
                    if (desktopControl) desktopControl.value = e.target.value;
                }
            });
        }

        // Logo opacity
        const logoOpacity = document.getElementById('mobile-logo-opacity');
        if (logoOpacity) {
            logoOpacity.addEventListener('input', (e) => {
                const logo = document.getElementById('card-logo');
                if (logo) {
                    logo.style.opacity = e.target.value;
                    const desktopControl = document.getElementById('logo-opacity');
                    if (desktopControl) desktopControl.value = e.target.value;
                }
            });
        }

        // Name text
        const nameText = document.getElementById('mobile-name-text');
        if (nameText) {
            // Get current value
            const cardName = document.getElementById('card-name');
            if (cardName) {
                nameText.value = cardName.innerText;
            }

            nameText.addEventListener('input', (e) => {
                if (cardName) {
                    cardName.innerText = e.target.value;
                    const desktopControl = document.getElementById('input-name');
                    if (desktopControl) desktopControl.value = e.target.value;
                }
            });
        }

        // Name size
        const nameSize = document.getElementById('mobile-name-size');
        if (nameSize) {
            nameSize.addEventListener('input', (e) => {
                const cardName = document.getElementById('card-name');
                if (cardName) {
                    cardName.style.fontSize = e.target.value + 'px';
                    const desktopControl = document.getElementById('name-font-size');
                    if (desktopControl) desktopControl.value = e.target.value;
                }
            });
        }

        // Name color
        const nameColor = document.getElementById('mobile-name-color');
        if (nameColor) {
            nameColor.addEventListener('input', (e) => {
                const cardName = document.getElementById('card-name');
                if (cardName) {
                    cardName.style.color = e.target.value;
                    const desktopControl = document.getElementById('name-color');
                    if (desktopControl) desktopControl.value = e.target.value;
                }
            });
        }
    },

    /**
     * Handle FAB menu actions
     */
    handleFabAction(action) {
        this.closeFabMenu();

        const actions = {
            'layout': () => this.showLayoutControls(),
            'themes': () => this.showThemeGallery(),
            'backgrounds': () => this.showBackgroundControls(),
            'preview': () => this.enterPreviewMode()
        };

        if (actions[action]) {
            actions[action]();
        }
    },

    /**
     * Show layout controls in palette
     */
    showLayoutControls() {
        const layoutSource = document.getElementById('layout-fieldset-source');
        if (layoutSource) {
            const paletteContent = document.getElementById('palette-content');
            if (paletteContent) {
                paletteContent.innerHTML = layoutSource.outerHTML;
                this.showControlPalette();

                // Rebind layout radio buttons
                document.querySelectorAll('input[name="layout-select-visual"]').forEach(radio => {
                    radio.addEventListener('change', (e) => {
                        // Trigger the existing layout change logic
                        const desktopRadio = document.querySelector(`input[name="layout-select-visual"][value="${e.target.value}"]`);
                        if (desktopRadio && desktopRadio !== e.target) {
                            desktopRadio.click();
                        }
                    });
                });
            }
        }
    },

    /**
     * Show theme gallery in palette
     */
    showThemeGallery() {
        const themesSource = document.getElementById('designs-fieldset-source');
        if (themesSource) {
            const paletteContent = document.getElementById('palette-content');
            if (paletteContent) {
                paletteContent.innerHTML = themesSource.outerHTML;
                this.showControlPalette();
            }
        }
    },

    /**
     * Show background controls in palette
     */
    showBackgroundControls() {
        const bgSource = document.getElementById('backgrounds-accordion');
        if (bgSource) {
            const paletteContent = document.getElementById('palette-content');
            if (paletteContent) {
                const content = bgSource.querySelector('.fieldset-content');
                if (content) {
                    paletteContent.innerHTML = content.innerHTML;
                    this.showControlPalette();
                }
            }
        }
    },

    /**
     * Enter preview mode (hide all controls)
     */
    enterPreviewMode() {
        this.isPreviewMode = true;
        this.hideContextBar();
        this.hideControlPalette();
        this.fabButton.style.display = 'none';

        // Add exit button
        const exitBtn = document.createElement('button');
        exitBtn.className = 'preview-exit-btn';
        exitBtn.innerHTML = '<i class="fas fa-times"></i> إنهاء المعاينة';
        exitBtn.onclick = () => this.exitPreviewMode();
        document.body.appendChild(exitBtn);

        this.triggerHaptic('success');
    },

    /**
     * Exit preview mode
     */
    exitPreviewMode() {
        this.isPreviewMode = false;
        document.querySelector('.preview-exit-btn')?.remove();
        this.fabButton.style.display = '';
    },

    /**
     * Toggle FAB menu
     */
    toggleFabMenu() {
        this.fabOverlay.classList.toggle('active');
        this.fabButton.classList.toggle('active');
    },

    /**
     * Close FAB menu
     */
    closeFabMenu() {
        this.fabOverlay.classList.remove('active');
        this.fabButton.classList.remove('active');
    },

    /**
     * Show context bar
     */
    showContextBar() {
        this.contextBar.classList.remove('hidden');
    },

    /**
     * Hide context bar
     */
    hideContextBar() {
        this.contextBar.classList.add('hidden');
    },

    /**
     * Show control palette
     */
    showControlPalette() {
        this.controlPalette.classList.add('active');
    },

    /**
     * Hide control palette
     */
    hideControlPalette() {
        this.controlPalette.classList.remove('active');
    },

    /**
     * Delete currently selected element (placeholder)
     */
    deleteCurrentElement() {
        if (this.selectedElement) {
            console.log('Delete element:', this.selectedElement);
            // Implement deletion logic here
            this.triggerHaptic('impact');
        }
    },

    /**
     * Toggle element placement between front and back
     */
    togglePlacement() {
        if (this.selectedElement) {
            console.log('Toggle placement for:', this.selectedElement);
            // Implement toggle logic here
            this.triggerHaptic('success');
        }
    },

    /**
     * Trigger haptic feedback (vibration)
     */
    triggerHaptic(type) {
        if ('vibrate' in navigator) {
            const patterns = {
                'selection': [10],
                'impact': [20],
                'success': [10, 50, 10]
            };
            navigator.vibrate(patterns[type] || [10]);
        }
    }
};

// Initialize on DOM ready (only on mobile)
document.addEventListener('DOMContentLoaded', () => {
    if (window.innerWidth <= 768) {
        MobileInterface.init();
    }
});

// Re-initialize on resize if switching to mobile
window.addEventListener('resize', () => {
    if (window.innerWidth <= 768 && !MobileInterface.controlPalette) {
        MobileInterface.init();
    }
});
