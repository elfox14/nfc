// Hide loading overlay
        document.addEventListener('DOMContentLoaded', function () {
            const loadingOverlay = document.getElementById('loading-overlay');
            if (loadingOverlay) {
                setTimeout(() => {
                    loadingOverlay.classList.add('hidden');
                }, 500);
            }
        });

        // Dynamic footer year
        const footerYear = document.getElementById('footer-year');
        if (footerYear) footerYear.textContent = new Date().getFullYear();

        // Navbar scroll effect
        const navbar = document.getElementById('navbar');
        window.addEventListener('scroll', () => {
            if (window.scrollY > 50) {
                navbar.classList.add('scrolled');
            } else {
                navbar.classList.remove('scrolled');
            }
        });

        // Mobile menu toggle
        const navToggle = document.getElementById('nav-toggle');
        const navLinks = document.getElementById('nav-links');

        if (navToggle) {
            navToggle.setAttribute('aria-expanded', 'false');
            navToggle.addEventListener('click', () => {
                const isActive = navLinks.classList.toggle('active');
                navToggle.setAttribute('aria-expanded', isActive);
            });
        }

        // Close mobile menu on link click
        document.querySelectorAll('.nav-links a').forEach(link => {
            link.addEventListener('click', () => {
                navLinks.classList.remove('active');
            });
        });

        // Smooth scrolling for anchor links
        document.querySelectorAll('a[href^="#"]').forEach(anchor => {
            anchor.addEventListener('click', function (e) {
                const href = this.getAttribute('href');
                if (href && href !== '#') {
                    e.preventDefault();
                    const target = document.querySelector(href);
                    if (target) {
                        const navHeight = navbar.offsetHeight;
                        const targetPosition = target.offsetTop - navHeight - 20;
                        window.scrollTo({
                            top: targetPosition,
                            behavior: 'smooth'
                        });
                        target.setAttribute('tabindex', '-1');
                        target.focus({ preventScroll: true });
                    }
                }
            });
        });

        // Scroll reveal animation
        function revealOnScroll() {
            const reveals = document.querySelectorAll('.reveal, .reveal-left, .reveal-right');

            reveals.forEach(element => {
                const windowHeight = window.innerHeight;
                const elementTop = element.getBoundingClientRect().top;
                const revealPoint = 150;

                if (elementTop < windowHeight - revealPoint) {
                    element.classList.add('active');
                }
            });
        }

        window.addEventListener('scroll', revealOnScroll);
        window.addEventListener('load', () => {
            revealOnScroll();
            setTimeout(() => {
                const reveals = document.querySelectorAll('.reveal, .reveal-left, .reveal-right');
                reveals.forEach(el => el.classList.add('active'));
            }, 1000);
        });

        // Counter animation for statistics
        function animateCounters() {
            const counters = document.querySelectorAll('.stat-number');

            counters.forEach(counter => {
                const target = parseInt(counter.getAttribute('data-target'));
                const duration = 2000;
                const step = target / (duration / 16);
                let current = 0;

                const updateCounter = () => {
                    current += step;
                    if (current < target) {
                        counter.textContent = Math.floor(current).toLocaleString('en-US');
                        requestAnimationFrame(updateCounter);
                    } else {
                        counter.textContent = target.toLocaleString('en-US');
                    }
                };

                const observer = new IntersectionObserver((entries) => {
                    entries.forEach(entry => {
                        if (entry.isIntersecting) {
                            updateCounter();
                            observer.unobserve(entry.target);
                        }
                    });
                }, { threshold: 0.5 });

                observer.observe(counter);
            });
        }

        animateCounters();

        // Accessibility for FAQ
        document.querySelectorAll('.faq-item details').forEach((detail) => {
            const summary = detail.querySelector('summary');
            if (summary) {
                summary.addEventListener('click', () => {
                    const isExpanded = detail.open;
                    summary.setAttribute('aria-expanded', !isExpanded);
                });
            }
        });

        // ========================================
        // INTERACTIVE ENHANCEMENTS
        // ========================================

        // Reading Progress Bar
        const progressBar = document.getElementById('reading-progress');
        const backToTop = document.getElementById('back-to-top');
        const floatingCTA = document.getElementById('floating-cta');
        let isScrolling = false;

        window.addEventListener('scroll', () => {
            if (!isScrolling) {
                window.requestAnimationFrame(() => {
                    const scrollTop = window.scrollY;
                    const docHeight = document.documentElement.scrollHeight - window.innerHeight;
                    const scrollPercent = (scrollTop / docHeight) * 100;
                    if (progressBar) progressBar.style.width = scrollPercent + '%';

                    if (scrollTop > 500) {
                        if (floatingCTA) floatingCTA.classList.add('visible');
                        if (backToTop) backToTop.classList.add('visible');
                    } else {
                        if (floatingCTA) floatingCTA.classList.remove('visible');
                        if (backToTop) backToTop.classList.remove('visible');
                    }
                    isScrolling = false;
                });
                isScrolling = true;
            }
        });

        // Back to Top click
        backToTop.addEventListener('click', () => {
            window.scrollTo({ top: 0, behavior: 'smooth' });
        });

        // Gallery Slider
        const slider = document.getElementById('gallery-slider');
        const prevBtn = document.getElementById('slider-prev');
        const nextBtn = document.getElementById('slider-next');
        const dotsContainer = document.getElementById('slider-dots');

        if (slider && prevBtn && nextBtn) {
            const cards = slider.querySelectorAll('.gallery-preview-card');
            const cardWidth = 280 + 24; // card width + gap
            let currentIndex = 0;
            const maxIndex = Math.max(0, cards.length - Math.floor(slider.parentElement.offsetWidth / cardWidth));

            // Create dots
            cards.forEach((_, i) => {
                if (i <= maxIndex) {
                    const dot = document.createElement('span');
                    dot.className = 'slider-dot' + (i === 0 ? ' active' : '');
                    dot.addEventListener('click', () => slideTo(i));
                    dotsContainer.appendChild(dot);
                }
            });

            function updateDots() {
                dotsContainer.querySelectorAll('.slider-dot').forEach((dot, i) => {
                    dot.classList.toggle('active', i === currentIndex);
                });
            }

            function slideTo(index) {
                currentIndex = Math.max(0, Math.min(index, maxIndex));
                slider.style.transform = `translateX(${-currentIndex * cardWidth}px)`;
                updateDots();
            }

            prevBtn.addEventListener('click', () => slideTo(currentIndex - 1));
            nextBtn.addEventListener('click', () => slideTo(currentIndex + 1));

            // Touch/drag support
            let startX, isDragging = false;
            slider.addEventListener('mousedown', (e) => { startX = e.pageX; isDragging = true; });
            slider.addEventListener('mousemove', (e) => {
                if (!isDragging) return;
                const diff = startX - e.pageX;
                if (Math.abs(diff) > 50) {
                    slideTo(currentIndex + (diff > 0 ? 1 : -1));
                    isDragging = false;
                }
            });
            slider.addEventListener('mouseup', () => isDragging = false);
            slider.addEventListener('mouseleave', () => isDragging = false);

            // Touch events
            slider.addEventListener('touchstart', (e) => { startX = e.touches[0].pageX; });
            slider.addEventListener('touchmove', (e) => {
                const diff = startX - e.touches[0].pageX;
                if (Math.abs(diff) > 50) {
                    slideTo(currentIndex + (diff > 0 ? 1 : -1));
                    startX = e.touches[0].pageX;
                }
            });

            // Auto-slide
            setInterval(() => {
                if (currentIndex >= maxIndex) currentIndex = -1;
                slideTo(currentIndex + 1);
            }, 4000);
        }

        // ========================================
        // THEME TOGGLE (Dark/Light Mode)
        // ========================================
        const themeToggle = document.getElementById('theme-toggle');
        const prefersDarkScheme = window.matchMedia('(prefers-color-scheme: dark)');

        // Check for saved theme preference or use system preference
        const currentTheme = localStorage.getItem('theme');
        if (currentTheme === 'light') {
            document.body.classList.add('light-mode');
        } else if (currentTheme === 'dark') {
            document.body.classList.remove('light-mode');
        } else if (!prefersDarkScheme.matches) {
            document.body.classList.add('light-mode');
        }

        themeToggle.addEventListener('click', () => {
            document.body.classList.toggle('light-mode');
            const theme = document.body.classList.contains('light-mode') ? 'light' : 'dark';
            localStorage.setItem('theme', theme);
        });
