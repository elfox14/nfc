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
                        // Set focus to the target section for accessibility
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

        // Counter animation for hero statistics
        function animateHeroCounters() {
            const counters = document.querySelectorAll('.hero-stat-number[data-target]');

            counters.forEach(counter => {
                const target = parseInt(counter.getAttribute('data-target'));
                if (!target) return;
                const duration = 2000;
                const step = target / (duration / 16);
                let current = 0;

                const updateCounter = () => {
                    current += step;
                    if (current < target) {
                        counter.textContent = '+' + Math.floor(current).toLocaleString('ar-EG');
                        requestAnimationFrame(updateCounter);
                    } else {
                        counter.textContent = '+' + target.toLocaleString('ar-EG');
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

        animateHeroCounters();

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
            const cardWidth = 280 + 24;
            let currentIndex = 0;
            const maxIndex = Math.max(0, cards.length - Math.floor(slider.parentElement.offsetWidth / cardWidth));

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
                slider.style.transform = `translateX(${currentIndex * cardWidth}px)`;
                updateDots();
            }

            prevBtn.addEventListener('click', () => slideTo(currentIndex - 1));
            nextBtn.addEventListener('click', () => slideTo(currentIndex + 1));

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

            slider.addEventListener('touchstart', (e) => { startX = e.touches[0].pageX; });
            slider.addEventListener('touchmove', (e) => {
                const diff = startX - e.touches[0].pageX;
                if (Math.abs(diff) > 50) {
                    slideTo(currentIndex + (diff > 0 ? 1 : -1));
                    startX = e.touches[0].pageX;
                }
            });

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

        // ========================================
        // NFC TAP SIMULATION
        // ========================================
        (function initNFCSimulation() {
            const sim = document.getElementById('nfc-simulation');
            const card = document.getElementById('nfc-card');
            const particleContainer = document.getElementById('particle-container');
            if (!sim || !card) return;

            let isTapped = false;

            function createParticles() {
                if (!particleContainer) return;
                particleContainer.innerHTML = '';
                const colors = ['#4da6ff', '#a78bfa', '#34d399', '#fbbf24', '#f87171'];
                for (let i = 0; i < 20; i++) {
                    const p = document.createElement('div');
                    p.className = 'particle';
                    const angle = (Math.PI * 2 / 20) * i;
                    const dist = 60 + Math.random() * 80;
                    p.style.setProperty('--tx', `${Math.cos(angle) * dist}px`);
                    p.style.setProperty('--ty', `${Math.sin(angle) * dist}px`);
                    p.style.background = colors[i % colors.length];
                    p.style.width = (4 + Math.random() * 4) + 'px';
                    p.style.height = p.style.width;
                    particleContainer.appendChild(p);
                }
            }

            function triggerTap() {
                if (isTapped) return;
                isTapped = true;
                card.classList.add('tapped');
                createParticles();
                sim.classList.add('burst');

                setTimeout(() => {
                    sim.classList.remove('burst');
                }, 1000);

                setTimeout(() => {
                    card.classList.remove('tapped');
                    isTapped = false;
                }, 3000);
            }

            // Click to trigger
            sim.addEventListener('click', triggerTap);

            // Auto-trigger synced with phone animation (3.5s cycle, tap at ~55%)
            function autoTapLoop() {
                setTimeout(() => {
                    triggerTap();
                    setTimeout(autoTapLoop, 3500);
                }, 1925); // 55% of 3500ms
            }
            autoTapLoop();
        })();

        // ========================================
        // JOURNEY STRIP — PARALLAX AUTO-CYCLE
        // ========================================
        (function initJourneyStrip() {
            const steps = document.querySelectorAll('.journey-step');
            const connectors = [document.getElementById('jc1'), document.getElementById('jc2')];
            if (steps.length < 3) return;

            let currentStep = 0;

            function setStep(index) {
                steps.forEach((s, i) => {
                    s.classList.toggle('active', i <= index);
                });
                connectors.forEach((c, i) => {
                    if (c) c.classList.toggle('filled', i < index);
                });
                currentStep = index;
            }

            // Auto-cycle every 2 seconds
            setInterval(() => {
                const next = (currentStep + 1) % 3;
                setStep(next);
            }, 2000);

            // Also trigger on scroll (parallax)
            const strip = document.getElementById('journey-strip');
            if (strip) {
                const observer = new IntersectionObserver((entries) => {
                    entries.forEach(entry => {
                        if (entry.isIntersecting) {
                            setStep(0);
                            setTimeout(() => setStep(1), 600);
                            setTimeout(() => setStep(2), 1200);
                        }
                    });
                }, { threshold: 0.5 });
                observer.observe(strip);
            }
        })();

        // ========================================
        // INTERACTIVE DEMO TABS
        // ========================================
        (function initDemoTabs() {
            const tabs = document.querySelectorAll('.demo-tab');
            const panels = document.querySelectorAll('.demo-panel');
            if (!tabs.length || !panels.length) return;

            tabs.forEach(tab => {
                tab.addEventListener('click', () => {
                    const panelId = tab.getAttribute('data-panel');

                    // Update tabs
                    tabs.forEach(t => {
                        t.classList.remove('active');
                        t.setAttribute('aria-selected', 'false');
                    });
                    tab.classList.add('active');
                    tab.setAttribute('aria-selected', 'true');

                    // Update panels
                    panels.forEach(p => p.classList.remove('active'));
                    const target = document.getElementById(panelId);
                    if (target) target.classList.add('active');
                });
            });

            // Parallax: auto-advance tabs when section scrolls into view
            const section = document.querySelector('.interactive-demo-section');
            if (section) {
                let hasTriggered = false;
                const observer = new IntersectionObserver((entries) => {
                    entries.forEach(entry => {
                        if (entry.isIntersecting && !hasTriggered) {
                            hasTriggered = true;
                            // Auto-advance through tabs
                            setTimeout(() => {
                                tabs[1]?.click();
                                setTimeout(() => {
                                    tabs[2]?.click();
                                    setTimeout(() => {
                                        tabs[0]?.click();
                                        hasTriggered = false;
                                    }, 3000);
                                }, 3000);
                            }, 3000);
                        }
                    });
                }, { threshold: 0.4 });
                observer.observe(section);
            }
        })();

        // ========================================
        // COLOR PICKER — DESIGN DEMO
        // ========================================
        (function initColorPicker() {
            const colorDots = document.querySelectorAll('#color-picker .color-dot');
            const miniCard = document.getElementById('mini-card-preview');
            if (!colorDots.length || !miniCard) return;

            colorDots.forEach(dot => {
                dot.addEventListener('click', () => {
                    colorDots.forEach(d => d.classList.remove('selected'));
                    dot.classList.add('selected');

                    const bg = dot.getAttribute('data-bg');
                    const border = dot.getAttribute('data-border');
                    miniCard.style.background = bg;
                    miniCard.style.borderColor = border;

                    // Bounce animation
                    miniCard.style.transform = 'scale(0.95)';
                    setTimeout(() => { miniCard.style.transform = 'scale(1)'; }, 200);
                });
            });

            // Template selector
            const templateOptions = document.querySelectorAll('#template-selector .template-option');
            templateOptions.forEach(opt => {
                opt.addEventListener('click', () => {
                    templateOptions.forEach(o => o.classList.remove('selected'));
                    opt.classList.add('selected');

                    miniCard.style.transform = 'rotateY(10deg) scale(0.9)';
                    setTimeout(() => { miniCard.style.transform = 'rotateY(0deg) scale(1)'; }, 400);
                });
            });
        })();

        // ========================================
        // PERSONA SWITCHER
        // ========================================
        (function initPersonaSwitcher() {
            const tabs = document.querySelectorAll('.persona-tab');
            const cards = document.querySelectorAll('.persona-card-wrapper');
            if (!tabs.length || !cards.length) return;

            tabs.forEach(tab => {
                tab.addEventListener('click', () => {
                    const persona = tab.getAttribute('data-persona');

                    tabs.forEach(t => t.classList.remove('active'));
                    tab.classList.add('active');

                    cards.forEach(c => c.classList.remove('active'));
                    const target = document.querySelector(`.persona-card-wrapper[data-persona="${persona}"]`);
                    if (target) {
                        setTimeout(() => target.classList.add('active'), 50);
                    }
                });
            });

            // Parallax: auto-cycle personas when section enters viewport
            const section = document.querySelector('.persona-switcher-section');
            if (section) {
                let cycleStarted = false;
                const observer = new IntersectionObserver((entries) => {
                    entries.forEach(entry => {
                        if (entry.isIntersecting && !cycleStarted) {
                            cycleStarted = true;
                            let idx = 0;
                            const interval = setInterval(() => {
                                idx = (idx + 1) % tabs.length;
                                tabs[idx]?.click();
                                if (idx === 0) {
                                    clearInterval(interval);
                                    cycleStarted = false;
                                }
                            }, 2500);
                        }
                    });
                }, { threshold: 0.3 });
                observer.observe(section);
            }
        })();
