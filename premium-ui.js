/**
 * PREMIUM UI/UX ENHANCEMENTS SCRIPT
 * Handles scroll animations, skeleton loading replacement, and global UI polish.
 */

document.addEventListener('DOMContentLoaded', () => {
    // 1. Setup Scroll Animations (AOS)
    setupScrollAnimations();
    
    // 2. Setup Glass Navbar effect on scroll
    setupGlassNavbar();
    
    // 3. Apply Micro-animations to buttons and cards
    setupMicroAnimations();
});

function setupScrollAnimations() {
    // Select elements to animate on scroll (you can add more selectors here)
    const elementsToAnimate = document.querySelectorAll(
        '.feature-card, .pricing-card, .dashboard-card, section h2, .tutorial-step'
    );
    
    // Add the base class to them if they don't have it
    elementsToAnimate.forEach(el => {
        if (!el.classList.contains('animate-on-scroll')) {
            el.classList.add('animate-on-scroll');
        }
    });

    const observer = new IntersectionObserver((entries) => {
        entries.forEach((entry, index) => {
            if (entry.isIntersecting) {
                // Add staggered delay based on index for siblings
                setTimeout(() => {
                    entry.target.classList.add('is-visible');
                }, index * 100);
                
                // Optional: stop observing once it has animated
                // observer.unobserve(entry.target);
            } else {
                // Optional: remove class to animate again when scrolling up
                // entry.target.classList.remove('is-visible');
            }
        });
    }, {
        threshold: 0.1,
        rootMargin: "0px 0px -50px 0px"
    });

    document.querySelectorAll('.animate-on-scroll').forEach(el => {
        observer.observe(el);
    });
}

function setupGlassNavbar() {
    const navbar = document.querySelector('nav') || document.querySelector('header');
    if (!navbar) return;

    // Apply base glass nav class
    navbar.classList.add('glass-nav');
    
    // Optional: make it even more glassy on scroll
    window.addEventListener('scroll', () => {
        if (window.scrollY > 50) {
            navbar.style.boxShadow = '0 4px 30px rgba(0, 0, 0, 0.1)';
        } else {
            navbar.style.boxShadow = 'none';
        }
    });
}

function setupMicroAnimations() {
    // Add hover-lift to interactive cards
    const cards = document.querySelectorAll('.card, .design-card, .pricing-plan');
    cards.forEach(card => card.classList.add('hover-lift'));

    // Add btn-glow to primary buttons
    const buttons = document.querySelectorAll('.btn-primary, .cta-button, button.primary');
    buttons.forEach(btn => btn.classList.add('btn-glow'));
}

/**
 * Utility Function: Show Skeleton Loader
 * Usage: const skeleton = showSkeleton(containerEl, 'skeleton-card');
 */
window.showSkeleton = function(container, typeClass = 'skeleton-card') {
    if (!container) return null;
    const skeleton = document.createElement('div');
    skeleton.className = `skeleton ${typeClass}`;
    container.innerHTML = '';
    container.appendChild(skeleton);
    return skeleton;
};

/**
 * Utility Function: Remove Skeleton Loader
 */
window.removeSkeleton = function(container) {
    if (!container) return;
    const skeletons = container.querySelectorAll('.skeleton');
    skeletons.forEach(s => s.remove());
};
