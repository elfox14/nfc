/**
 * Premium UI Scripts (Scroll Animations & Enhancements)
 */
document.addEventListener('DOMContentLoaded', () => {
    // 1. Intersection Observer for Animate On Scroll
    const observerOptions = {
        root: null,
        rootMargin: '0px',
        threshold: 0.1
    };

    const scrollObserver = new IntersectionObserver((entries, observer) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('is-visible');
                // Optional: Stop observing once animated if we only want it to animate once
                observer.unobserve(entry.target);
            }
        });
    }, observerOptions);

    const animatedElements = document.querySelectorAll('.animate-on-scroll');
    animatedElements.forEach(el => scrollObserver.observe(el));

    // 2. Add 'glass-nav' class to navbars automatically if not present
    const navbars = document.querySelectorAll('nav, .navbar, .top-nav');
    navbars.forEach(nav => {
        if (!nav.classList.contains('glass-nav')) {
            nav.classList.add('glass-nav');
        }
    });

    // 3. Optional: Smooth out any button clicks with the 'btn-premium' effect
    const primaryBtns = document.querySelectorAll('.btn-primary, .btn-submit, button[type="submit"]');
    primaryBtns.forEach(btn => {
        if (!btn.classList.contains('btn-premium')) {
            btn.classList.add('btn-premium');
        }
    });
});
