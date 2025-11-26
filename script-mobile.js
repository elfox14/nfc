'use strict';

/**
 * Mobile Smart Palette Interface
 * Provides a context-aware mobile interface for the editor
 */

const MobileInterface = {
    // State
    selectedElement: null,
    isPreviewMode: false,

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
            return;
        }

        console.log('Mobile Interface: Initializing New Layout...');

        // 1. Inject Tab Bar
        this.injectTabBar();

        // 2. Initialize Tabs
        this.initTabs();

        // 3. Initialize Flip System with new scaling
        this.initFlipSystem();

        // 4. Add Flip Button (Updated location)
        this.addFlipButton();

        // 5. Bind Events
        this.bindEvents();

        // 6. Init Touch Gestures
        this.initTouchGestures();

        console.log('Mobile Interface: Initialized successfully');
    },

    /**
     * Inject Tab Bar HTML
     */
    injectTabBar() {
        // Check if already injected
        if (document.querySelector('.mobile-tab-bar')) return;

        const tabBarHTML = `
            <div class="mobile-tab-bar">
                <button class="mobile-tab-btn active" data-target="panel-elements">
                    <i class="fas fa-layer-group"></i>
                    <span>المحتوى</span>
                </button>
                <button class="mobile-tab-btn" data-target="panel-design">
                    <i class="fas fa-paint-brush"></i>
                    <span>التصميم</span>
                </button>
            </div>
        `;

        // Insert after .pro-layout (which contains sidebars and canvas)
        const layout = document.querySelector('.pro-layout');
        if (layout) {
            layout.insertAdjacentHTML('afterend', tabBarHTML);
        }
    },

    /**
     * Initialize Tab Switching Logic
     */
    initTabs() {
        const tabs = document.querySelectorAll('.mobile-tab-btn');
        const sidebars = document.querySelectorAll('.pro-sidebar');

        // Set initial state (Content tab active)
        const contentPanel = document.getElementById('panel-elements');
        if (contentPanel) contentPanel.classList.add('active-tab-content');

        tabs.forEach(tab => {
            tab.addEventListener('click', () => {
                // 1. Update Tab Styles
                tabs.forEach(t => t.classList.remove('active'));
                tab.classList.add('active');

                // 2. Show Target Sidebar
                const targetId = tab.dataset.target;
                sidebars.forEach(sidebar => {
                    if (sidebar.id === targetId) {
                        sidebar.classList.add('active-tab-content');
                    } else {
                        sidebar.classList.remove('active-tab-content');
                    }
                });
            });
        });
    },

    /**
     * Add a visible Flip Button
     */
    addFlipButton() {
        // Remove existing if any
        const existingBtn = document.querySelector('.mobile-flip-btn');
        if (existingBtn) existingBtn.remove();

        const canvas = document.querySelector('.pro-canvas');
        if (canvas) {
            const flipBtn = document.createElement('button');
            flipBtn.className = 'mobile-flip-btn';
            flipBtn.innerHTML = '<i class="fas fa-sync-alt"></i> تقليب البطاقة';
            flipBtn.onclick = () => this.toggleCardFlip(null);
            canvas.appendChild(flipBtn);
        }
    },

    /**
     * Bind all event listeners  
     */
    bindEvents() {
        // Click on card elements to select them (Optional now with tabs, but good for focus)
        Object.keys(this.selectableElements).forEach(elementId => {
            const element = document.getElementById(elementId);
            if (element) {
                element.addEventListener('click', (e) => {
                    // e.stopPropagation(); // Let it bubble so we don't block other interactions
                    // Maybe switch to Content tab if not active?
                    const contentTab = document.querySelector('.mobile-tab-btn[data-target="panel-elements"]');
                    if (contentTab && !contentTab.classList.contains('active')) {
                        contentTab.click();
                    }

                    // Scroll to specific control? (Advanced)
                });
            }
        });

        // Window resize (debounced)
        let resizeTimer;
        window.addEventListener('resize', () => {
            clearTimeout(resizeTimer);
            resizeTimer = setTimeout(() => {
                if (window.innerWidth <= 768) {
                    // Re-check scaling if needed
                }
            }, 250);
        });
    },

    /**
     * Initialize Flip System (Scaling)
     */
    initFlipSystem() {
        const cardWrapper = document.getElementById('cards-wrapper');
        if (!cardWrapper) return;

        const updateScale = () => {
            if (window.innerWidth <= 768) {
                // Available dimensions (35vh height, full width)
                const containerHeight = window.innerHeight * 0.35;
                const containerWidth = window.innerWidth - 20; // 10px padding each side

                const cardWidth = 510;
                const cardHeight = 330;

                // Calculate scale to fit BOTH width and height
                // We subtract some buffer from height for the flip button
                const scaleX = containerWidth / cardWidth;
                const scaleY = (containerHeight - 50) / cardHeight;

                const scale = Math.min(scaleX, scaleY, 1); // Don't scale up > 1

                cardWrapper.style.transform = `scale(${scale})`;

                // Ensure parent container centers the scaled card
                // No need to set minHeight on parent as .pro-canvas has fixed 35vh
            } else {
                cardWrapper.style.transform = '';
            }
        };

        window.addEventListener('resize', updateScale);
        // Call immediately
        setTimeout(updateScale, 100);
    },

    /**
     * Toggle Card Flip State
     */
    toggleCardFlip(showBack = null) {
        const cardWrapper = document.getElementById('cards-wrapper');
        if (!cardWrapper) return;

        if (showBack === null) {
            cardWrapper.classList.toggle('flipped');
        } else if (showBack) {
            cardWrapper.classList.add('flipped');
        } else {
            cardWrapper.classList.remove('flipped');
        }

        this.triggerHaptic('impact');
    },

    /**
     * Initialize touch gestures (Swipe & Long Press & Multi-touch)
     */
    initTouchGestures() {
        const cardWrapper = document.getElementById('cards-wrapper');
        if (!cardWrapper) return;

        // Swipe to Flip
        let touchStartX = 0;
        let touchEndX = 0;

        // Multi-touch detection
        let touchCount = 0;
        let longPressTimer;

        cardWrapper.addEventListener('touchstart', (e) => {
            touchCount = e.touches.length;
            touchStartX = e.changedTouches[0].screenX;

            if (touchCount === 2) {
                // Potential Undo
                e.preventDefault();
            } else if (touchCount === 3) {
                // Potential Redo
                e.preventDefault();
            }

            if (e.target.closest('.business-card') && touchCount === 1) {
                // Long Press Logic
                longPressTimer = setTimeout(() => {
                    this.triggerHaptic('success');
                }, 500);
            }
        }, { passive: false });

        cardWrapper.addEventListener('touchend', (e) => {
            touchEndX = e.changedTouches[0].screenX;

            // Handle Swipe (only single touch)
            if (touchCount === 1) {
                this.handleSwipe(touchStartX, touchEndX);
            }

            // Handle Multi-touch Taps
            if (touchCount === 2) {
                if (typeof HistoryManager !== 'undefined') {
                    HistoryManager.undo();
                    this.showToast('تراجع', 'fas fa-undo');
                    this.triggerHaptic('selection');
                }
            } else if (touchCount === 3) {
                if (typeof HistoryManager !== 'undefined') {
                    HistoryManager.redo();
                    this.showToast('إعادة', 'fas fa-redo');
                    this.triggerHaptic('selection');
                }
            }

            clearTimeout(longPressTimer);
            touchCount = 0;
        }, { passive: true });

        cardWrapper.addEventListener('touchmove', () => {
            clearTimeout(longPressTimer);
        });
    },

    /**
     * Handle swipe gestures
     */
    handleSwipe(startX, endX) {
        const threshold = 50;
        if (startX - endX > threshold) {
            // Swipe Left -> Show Back
            this.toggleCardFlip(true);
        } else if (endX - startX > threshold) {
            // Swipe Right -> Show Front
            this.toggleCardFlip(false);
        }
    },

    /**
     * Show a temporary toast message
     */
    showToast(message, icon) {
        // Create toast if not exists
        let toast = document.getElementById('save-toast');
        if (!toast) {
            toast = document.createElement('div');
            toast.id = 'save-toast';
            toast.className = 'toast';
            document.body.appendChild(toast);
        }

        toast.innerHTML = `<i class="${icon}"></i> ${message}`;
        toast.className = 'toast show';
        setTimeout(() => toast.className = toast.className.replace('show', ''), 2000);
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

// Re-initialize on resize if switching to mobile (Debounced)
let resizeTimer;
window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
        if (window.innerWidth <= 768) {
            // Check if tabs are injected, if not init
            if (!document.querySelector('.mobile-tab-bar')) {
                MobileInterface.init();
            }
        }
    }, 250);
});
