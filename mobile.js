// Mobile Specific Logic
window.MobileUtils = {
    isMobile: () => window.innerWidth <= 1024,

    init: () => {
        console.log('Mobile Mode Initialized');
        MobileUtils.handleResize();
        window.addEventListener('resize', MobileUtils.handleResize);
        MobileUtils.setupNavigation();
        MobileUtils.setupActionButtons();
        MobileUtils.setupClickToEdit();
    },

    handleResize: () => {
        const isMobile = MobileUtils.isMobile();
        document.body.classList.toggle('is-mobile', isMobile);

        // If switching to mobile and no view is active, default to Content (panel-elements)
        if (isMobile && !document.querySelector('.active-view')) {
            MobileUtils.switchView('panel-elements');
        }

        // If switching to desktop, reset styles
        if (!isMobile) {
            document.querySelectorAll('.active-view').forEach(el => el.classList.remove('active-view'));
            document.querySelectorAll('.pro-sidebar').forEach(el => el.style.display = '');
            document.querySelector('.pro-canvas').style.display = '';
            document.getElementById('panel-share').style.display = 'none';
        }
    },

    setupNavigation: () => {
        const navItems = document.querySelectorAll('.mobile-nav-item');

        navItems.forEach(item => {
            item.addEventListener('click', (e) => {
                e.preventDefault();
                const targetId = item.getAttribute('data-target');
                MobileUtils.switchView(targetId);

                navItems.forEach(nav => nav.classList.remove('active'));
                item.classList.add('active');
            });
        });
    },

    switchView: (targetId) => {
        // Hide all sidebars
        const sidebars = document.querySelectorAll('.pro-sidebar');
        sidebars.forEach(view => {
            view.classList.remove('active-view');
            if (window.MobileUtils.isMobile()) {
                view.style.display = 'none';
            }
        });

        // Show target sidebar
        const targetView = document.getElementById(targetId);
        if (targetView) {
            targetView.classList.add('active-view');
            targetView.style.display = 'block';
        }

        // Update nav state if called programmatically
        const navItem = document.querySelector(`.mobile-nav-item[data-target="${targetId}"]`);
        if (navItem) {
            document.querySelectorAll('.mobile-nav-item').forEach(nav => nav.classList.remove('active'));
            navItem.classList.add('active');
        }
    },

    setupActionButtons: () => {
        const actionButtons = document.querySelectorAll('.mobile-action-btn');
        actionButtons.forEach(btn => {
            btn.addEventListener('click', (e) => {
                const triggerId = btn.getAttribute('data-trigger-id');
                const originalBtn = document.getElementById(triggerId);
                if (originalBtn) originalBtn.click();
            });
        });
    },

    setupClickToEdit: () => {
        // Map card elements to their input IDs
        const editMap = {
            'card-name': 'input-name',
            'card-tagline': 'input-tagline',
            'card-logo': 'input-logo-upload', // Or input-logo
            'phone-buttons-wrapper': 'phone-repeater-container', // General area
            'qr-code-wrapper': 'qr-source-select'
        };

        Object.keys(editMap).forEach(elementId => {
            const element = document.getElementById(elementId);
            if (element) {
                element.addEventListener('click', (e) => {
                    if (!window.MobileUtils.isMobile()) return;

                    e.stopPropagation(); // Prevent drag interference if any

                    const targetInputId = editMap[elementId];
                    const targetInput = document.getElementById(targetInputId);

                    if (targetInput) {
                        // 1. Switch to Content View
                        MobileUtils.switchView('panel-elements');

                        // 2. Scroll to Input
                        // We need to wait for the view to be visible
                        setTimeout(() => {
                            targetInput.scrollIntoView({ behavior: 'smooth', block: 'center' });
                            targetInput.focus();

                            // 3. Highlight
                            targetInput.classList.add('click-to-edit-highlight');
                            setTimeout(() => targetInput.classList.remove('click-to-edit-highlight'), 2000);

                            // Open accordion if needed
                            const accordion = targetInput.closest('details');
                            if (accordion && !accordion.open) {
                                accordion.open = true;
                            }
                        }, 100);
                    }
                });
            }
        });
    },

    configureTourSteps: (steps) => {
        if (window.MobileUtils.isMobile()) {
            // Mobile tour configuration
        }
    }
};

document.addEventListener('DOMContentLoaded', () => {
    MobileUtils.init();
});
