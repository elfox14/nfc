document.addEventListener('DOMContentLoaded', () => {
    // Only run on mobile or when elements exist
    const mobileNav = document.querySelector('.mobile-bottom-nav');
    if (!mobileNav && window.innerWidth > 768) return;

    // Tab Switching Logic
    const navItems = document.querySelectorAll('.mobile-nav-item');
    const tabContents = {
        'data': document.getElementById('panel-elements'),
        'design': document.getElementById('panel-design'),
        'save': document.getElementById('mobile-save-content')
    };

    function switchTab(tabId) {
        // Update Nav
        navItems.forEach(item => {
            if (item.dataset.tab === tabId) {
                item.classList.add('active');
            } else {
                item.classList.remove('active');
            }
        });

        // Update Content
        for (const [key, element] of Object.entries(tabContents)) {
            if (element) {
                if (key === tabId) {
                    element.classList.add('active-tab-content');
                    // Reset scroll to top when switching tabs
                    element.scrollTop = 0;
                } else {
                    element.classList.remove('active-tab-content');
                }
            }
        }
    }

    navItems.forEach(item => {
        item.addEventListener('click', (e) => {
            const tabId = item.dataset.tab;
            switchTab(tabId);
        });
    });

    // Initialize first tab (Data)
    if (window.innerWidth <= 768) {
        switchTab('data');
    }

    // Flip Card Logic (Mobile Specific)
    const flipFrontBtn = document.getElementById('mobile-flip-front');
    const flipBackBtn = document.getElementById('mobile-flip-back');
    const cardFront = document.getElementById('card-front-preview');
    const cardBack = document.getElementById('card-back-preview');

    function showFront() {
        if (cardFront && cardBack) {
            cardFront.style.display = 'block';
            cardBack.style.display = 'none';
            flipFrontBtn.classList.add('active');
            flipBackBtn.classList.remove('active');
        }
    }

    function showBack() {
        if (cardFront && cardBack) {
            cardFront.style.display = 'none';
            cardBack.style.display = 'block';
            flipFrontBtn.classList.remove('active');
            flipBackBtn.classList.add('active');
        }
    }

    if (flipFrontBtn && flipBackBtn) {
        flipFrontBtn.addEventListener('click', showFront);
        flipBackBtn.addEventListener('click', showBack);
        // Default to front
        showFront();
    }

    // Click to Edit Logic
    const editableElements = [
        { id: 'card-name', targetInput: 'input-name', accordion: 'name-tagline-accordion' },
        { id: 'card-tagline', targetInput: 'input-tagline', accordion: 'name-tagline-accordion' },
        { id: 'card-logo', targetInput: 'input-logo', accordion: null }, // Logo is in first open details usually
        { id: 'phone-buttons-wrapper', targetInput: 'add-phone-btn', accordion: 'phones-accordion' },
        // Add more mappings as needed
    ];

    editableElements.forEach(item => {
        const element = document.getElementById(item.id);
        if (element) {
            element.addEventListener('click', (e) => {
                if (window.innerWidth > 768) return; // Only on mobile

                e.preventDefault();
                e.stopPropagation();

                // Switch to Data Tab
                switchTab('data');

                // Open Accordion if needed
                if (item.accordion) {
                    const accordion = document.getElementById(item.accordion);
                    if (accordion) accordion.open = true;
                }

                // Scroll to Input (Native)
                const input = document.getElementById(item.targetInput);
                if (input) {
                    setTimeout(() => {
                        input.scrollIntoView({ behavior: 'smooth', block: 'center' });
                        input.focus();

                        // Highlight effect with animation class
                        const formGroup = input.closest('.form-group');
                        if (formGroup) {
                            formGroup.classList.remove('form-element-highlighted');
                            void formGroup.offsetWidth; // Trigger reflow
                            formGroup.classList.add('form-element-highlighted');
                            setTimeout(() => formGroup.classList.remove('form-element-highlighted'), 1500);
                        }

                        // Also highlight input border
                        input.style.transition = 'box-shadow 0.3s';
                        input.style.boxShadow = '0 0 0 2px var(--accent-primary)';
                        setTimeout(() => input.style.boxShadow = '', 1500);
                    }, 100);
                }
            });

            // Add visual cue that it's clickable
            element.style.cursor = 'pointer';
        }
    });

    // Wire up Mobile Undo/Redo Buttons
    const mobileUndoBtn = document.getElementById('mobile-undo-btn');
    const mobileRedoBtn = document.getElementById('mobile-redo-btn');
    const desktopUndoBtn = document.getElementById('undo-btn');
    const desktopRedoBtn = document.getElementById('redo-btn');

    if (mobileUndoBtn && desktopUndoBtn) {
        mobileUndoBtn.addEventListener('click', () => {
            desktopUndoBtn.click();
            updateMobileUndoRedoState();
        });
    }

    if (mobileRedoBtn && desktopRedoBtn) {
        mobileRedoBtn.addEventListener('click', () => {
            desktopRedoBtn.click();
            updateMobileUndoRedoState();
        });
    }

    // Sync state between desktop and mobile buttons
    function updateMobileUndoRedoState() {
        if (mobileUndoBtn && desktopUndoBtn) {
            mobileUndoBtn.disabled = desktopUndoBtn.disabled;
        }
        if (mobileRedoBtn && desktopRedoBtn) {
            mobileRedoBtn.disabled = desktopRedoBtn.disabled;
        }
    }

    // Observe changes to desktop buttons to sync state
    if (desktopUndoBtn) {
        const observer = new MutationObserver(updateMobileUndoRedoState);
        observer.observe(desktopUndoBtn, { attributes: true, attributeFilter: ['disabled'] });
        observer.observe(desktopRedoBtn, { attributes: true, attributeFilter: ['disabled'] });
    }

    // Close all accordions except the first one on load (Mobile only)
    if (window.innerWidth <= 768) {
        const accordions = document.querySelectorAll('.fieldset-accordion');
        accordions.forEach((acc, index) => {
            if (index === 0) {
                acc.open = true;
            } else {
                acc.open = false;
            }
        });
    }
});
