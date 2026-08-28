(function() {
        'use strict';

        // --- Haptic Feedback on Card Flip ---
        function initHapticFlip() {
            const wrapper = document.getElementById('cards-wrapper-viewer');
            if (!wrapper) return;
            const origHandler = wrapper.onclick;
            wrapper.addEventListener('click', () => {
                if ('vibrate' in navigator) navigator.vibrate(25);
            });
        }

        // --- 3D Tilt Effect on Desktop ---
        function init3DTilt() {
            if (window.innerWidth < 1024) return; // Skip on mobile/tablet
            const wrapper = document.getElementById('cards-wrapper-viewer');
            if (!wrapper) return;

            let tiltActive = true;
            const maxTilt = 8;

            wrapper.addEventListener('mouseenter', () => { tiltActive = true; });

            wrapper.addEventListener('mousemove', (e) => {
                if (!tiltActive || wrapper.classList.contains('is-flipped')) return;
                const rect = wrapper.getBoundingClientRect();
                const x = (e.clientX - rect.left) / rect.width - 0.5;
                const y = (e.clientY - rect.top) / rect.height - 0.5;

                wrapper.style.transition = 'transform 0.1s ease-out';
                wrapper.style.transform = `perspective(800px) rotateX(${-y * maxTilt}deg) rotateY(${x * maxTilt}deg)`;
            });

            wrapper.addEventListener('mouseleave', () => {
                tiltActive = false;
                wrapper.style.transition = 'transform 0.5s cubic-bezier(0.4, 0, 0.2, 1)';
                wrapper.style.transform = '';
            });

            // Disable tilt when flipped
            const flipBtn = document.getElementById('viewer-flip-btn');
            if (flipBtn) {
                flipBtn.addEventListener('click', () => {
                    wrapper.style.transition = 'transform 0.7s cubic-bezier(0.68, -0.55, 0.27, 1.55)';
                });
            }
        }

        // --- Smooth Theme Transition ---
        function initSmoothTheme() {
            const style = document.createElement('style');
            style.textContent = `
                body, .viewer-nav, .side-column, .viewer-container,
                .contact-link, .btn, .info-box, .mobile-tab-btn,
                .cards-wrapper-viewer, .business-card-viewer {
                    transition: background-color 0.4s ease,
                                color 0.3s ease,
                                border-color 0.3s ease,
                                box-shadow 0.3s ease;
                }
            `;
            document.head.appendChild(style);
        }

        // Init all after DOM is ready
        function initWhenReady() {
            initSmoothTheme();
            // Wait for viewer to display before attaching tilt/haptic
            const observer = new MutationObserver(() => {
                const container = document.querySelector('.viewer-container');
                if (container && container.style.display !== 'none') {
                    initHapticFlip();
                    init3DTilt();
                    observer.disconnect();
                }
            });
            observer.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['style'] });
            // Fallback: init after 5s regardless
            setTimeout(() => { initHapticFlip(); init3DTilt(); }, 5000);
        }

        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', initWhenReady);
        } else {
            initWhenReady();
        }
    })();
