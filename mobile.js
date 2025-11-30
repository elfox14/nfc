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
        MobileUtils.setupCardFlipper(); // The logic inside is now updated
    },

    handleResize: () => {
        const isMobile = MobileUtils.isMobile();
        document.body.classList.toggle('is-mobile', isMobile);

        if (isMobile && !document.querySelector('.active-view')) {
            MobileUtils.switchView('panel-elements');
        }

        if (!isMobile) {
            document.querySelectorAll('.active-view').forEach(el => el.classList.remove('active-view'));
            document.querySelectorAll('.pro-sidebar').forEach(el => el.style.display = '');
            document.querySelector('.pro-canvas').style.display = '';
            document.getElementById('panel-share').style.display = 'none';
            const cardFlipper = document.querySelector('.card-flipper');
            if (cardFlipper) {
                cardFlipper.classList.remove('is-flipped');
            }
            // Reset pointer events for desktop
            document.getElementById('card-front-preview').style.pointerEvents = 'auto';
            document.getElementById('card-back-preview').style.pointerEvents = 'auto';
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

    // --- UPDATED FUNCTION TO FIX CLICKS ---
    setupCardFlipper: () => {
        const flipButton = document.getElementById('flip-card-btn-mobile');
        const cardFlipper = document.querySelector('.card-flipper');
        const cardFront = document.getElementById('card-front-preview');
        const cardBack = document.getElementById('card-back-preview');

        if (flipButton && cardFlipper && cardFront && cardBack) {
            flipButton.addEventListener('click', () => {
                const isFlipped = cardFlipper.classList.toggle('is-flipped');
                
                // **THE FIX**: Explicitly enable/disable clicks on the card faces
                if (isFlipped) {
                    cardFront.style.pointerEvents = 'none'; // Disable clicks on the hidden front face
                    cardBack.style.pointerEvents = 'auto';  // Enable clicks on the visible back face
                } else {
                    cardFront.style.pointerEvents = 'auto';  // Enable clicks on the visible front face
                    cardBack.style.pointerEvents = 'none'; // Disable clicks on the hidden back face
                }
            });
            // Set initial state on page load: only the front is clickable
            cardBack.style.pointerEvents = 'none';
        }
    },

    switchView: (targetId) => {
        const sidebars = document.querySelectorAll('.pro-sidebar');
        sidebars.forEach(view => {
            view.classList.remove('active-view');
            if (window.MobileUtils.isMobile()) {
                view.style.display = 'none';
            }
        });

        const targetView = document.getElementById(targetId);
        if (targetView) {
            targetView.classList.add('active-view');
            targetView.style.display = 'block';
        }

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
        const cardsWrapper = document.getElementById('cards-wrapper');
        if (!cardsWrapper) return;

        cardsWrapper.addEventListener('click', (e) => {
            if (!window.MobileUtils.isMobile()) return;

            const clickableElement = e.target.closest('.draggable-on-card');
            if (!clickableElement) return;

            e.preventDefault();
            e.stopPropagation();

            const targetControlId = clickableElement.dataset.controlId || clickableElement.dataset.inputTargetId;
            if (!targetControlId) return;

            const targetControl = document.getElementById(targetControlId);
            if (!targetControl) return;

            MobileUtils.switchView('panel-elements');

            setTimeout(() => {
                targetControl.scrollIntoView({ behavior: 'smooth', block: 'center' });
                
                const firstInput = targetControl.querySelector('input, textarea, select');
                if(firstInput) firstInput.focus();

                targetControl.classList.add('click-to-edit-highlight');
                setTimeout(() => targetControl.classList.remove('click-to-edit-highlight'), 2000);

                const accordion = targetControl.closest('details');
                if (accordion && !accordion.open) {
                    accordion.open = true;
                }
            }, 100);
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