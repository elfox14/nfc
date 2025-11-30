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
        MobileUtils.setupCardFlipper();
        MobileUtils.updateMobileCardScale(); // Add this line
    },

    handleResize: () => {
        const isMobile = MobileUtils.isMobile();
        document.body.classList.toggle('is-mobile', isMobile);

        if (isMobile) {
            if (!document.querySelector('.active-view')) {
                MobileUtils.switchView('panel-elements');
            }
            MobileUtils.updateMobileCardScale(); // Add this line
        } else {
            document.querySelectorAll('.active-view').forEach(el => el.classList.remove('active-view'));
            document.querySelectorAll('.pro-sidebar').forEach(el => el.style.display = '');
            document.querySelector('.pro-canvas').style.display = '';
            document.getElementById('panel-share').style.display = 'none';
            const cardFlipper = document.querySelector('.card-flipper');
            if (cardFlipper) {
                cardFlipper.classList.remove('is-flipped');
            }
            document.getElementById('card-front-preview').style.pointerEvents = 'auto';
            document.getElementById('card-back-preview').style.pointerEvents = 'auto';
             // Reset scale on desktop
            const cardsWrapper = document.getElementById('cards-wrapper');
            if(cardsWrapper) cardsWrapper.style.transform = '';
        }
    },
    
    // --- NEW FUNCTION TO DYNAMICALLY SCALE THE CARD ---
    updateMobileCardScale: () => {
        if (!MobileUtils.isMobile()) return;

        const canvas = document.querySelector('.pro-canvas');
        const cardsWrapper = document.getElementById('cards-wrapper');
        const flipperContainer = document.querySelector('.card-flipper-container');
        if (!canvas || !cardsWrapper || !flipperContainer) return;

        const layout = cardsWrapper.dataset.layout || 'classic';

        // Get the base dimensions of the card
        let cardWidth, cardHeight;
        if (layout === 'vertical') {
            cardWidth = 330;
            cardHeight = 510;
        } else {
            cardWidth = 510;
            cardHeight = 330;
        }
        
        // Get the available dimensions of the canvas area, with some padding
        const canvasPadding = 20; // 10px on each side
        const availableWidth = canvas.clientWidth - canvasPadding;
        const availableHeight = canvas.clientHeight - canvasPadding;

        // Calculate the scale ratio needed for width and height
        const scaleX = availableWidth / cardWidth;
        const scaleY = availableHeight / cardHeight;
        
        // Use the smaller of the two ratios to ensure the card fits completely
        const scale = Math.min(scaleX, scaleY);

        // Apply the calculated scale
        cardsWrapper.style.transform = `scale(${scale})`;
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

    setupCardFlipper: () => {
        const flipButton = document.getElementById('flip-card-btn-mobile');
        const cardFlipper = document.querySelector('.card-flipper');
        const cardFront = document.getElementById('card-front-preview');
        const cardBack = document.getElementById('card-back-preview');

        if (flipButton && cardFlipper && cardFront && cardBack) {
            flipButton.addEventListener('click', () => {
                const isFlipped = cardFlipper.classList.toggle('is-flipped');
                
                if (isFlipped) {
                    cardFront.style.pointerEvents = 'none';
                    cardBack.style.pointerEvents = 'auto';
                } else {
                    cardFront.style.pointerEvents = 'auto';
                    cardBack.style.pointerEvents = 'none';
                }
            });
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