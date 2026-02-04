/**
 * AI Backgrounds Feature
 * Generates AI-style backgrounds with patterns for the card editor
 */

(function () {
    'use strict';

    // State
    let selectedPattern = 'gradient';
    let selectedColor = '#667eea';

    // Color pairs for each base color
    const colorPairs = {
        '#667eea': '#764ba2',
        '#f5576c': '#f093fb',
        '#4facfe': '#00f2fe',
        '#00f2fe': '#4facfe',
        '#43e97b': '#38f9d7',
        '#fa709a': '#fee140',
        '#fee140': '#fa709a',
        '#30cfd0': '#330867'
    };

    // Helper function to get complementary color
    function getComplementaryColor(color) {
        return colorPairs[color] || adjustColor(color, 40);
    }

    // Helper function to adjust color
    function adjustColor(color, amount) {
        const hex = color.replace('#', '');
        const r = Math.min(255, Math.max(0, parseInt(hex.substr(0, 2), 16) + amount));
        const g = Math.min(255, Math.max(0, parseInt(hex.substr(2, 2), 16) + amount));
        const b = Math.min(255, Math.max(0, parseInt(hex.substr(4, 2), 16) + amount));
        return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
    }

    // Initialize the AI backgrounds feature
    function init() {
        const aiBtn = document.getElementById('ai-backgrounds-btn');
        const modal = document.getElementById('ai-backgrounds-modal');
        const closeBtn = document.getElementById('close-ai-modal');
        const patternCards = document.querySelectorAll('.ai-pattern-card');
        const colorBtns = document.querySelectorAll('.ai-color-btn');
        const applyFrontBtn = document.getElementById('ai-apply-front');
        const applyBackBtn = document.getElementById('ai-apply-back');

        if (!aiBtn || !modal) {
            console.log('AI Backgrounds: Elements not found, skipping initialization');
            return;
        }

        // Open modal
        aiBtn.addEventListener('click', () => {
            modal.style.display = 'flex';
            document.body.style.overflow = 'hidden';
        });

        // Close modal
        closeBtn.addEventListener('click', closeModal);
        modal.addEventListener('click', (e) => {
            if (e.target === modal) closeModal();
        });

        // Escape key to close
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && modal.style.display === 'flex') {
                closeModal();
            }
        });

        function closeModal() {
            modal.style.display = 'none';
            document.body.style.overflow = '';
        }

        // Pattern selection
        patternCards.forEach(card => {
            card.addEventListener('click', () => {
                patternCards.forEach(c => c.classList.remove('selected'));
                card.classList.add('selected');
                selectedPattern = card.dataset.pattern;
            });
        });

        // Color selection
        colorBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                colorBtns.forEach(b => b.classList.remove('selected'));
                btn.classList.add('selected');
                selectedColor = btn.dataset.color;
            });
        });

        // Select first pattern and color by default
        if (patternCards[0]) patternCards[0].classList.add('selected');
        if (colorBtns[0]) colorBtns[0].classList.add('selected');

        // Apply to front
        applyFrontBtn.addEventListener('click', () => {
            applyBackground('front');
            closeModal();
            showNotification('تم تطبيق الخلفية على الواجهة الأمامية');
        });

        // Apply to back
        applyBackBtn.addEventListener('click', () => {
            applyBackground('back');
            closeModal();
            showNotification('تم تطبيق الخلفية على الواجهة الخلفية');
        });

        console.log('AI Backgrounds: Initialized successfully');
    }

    // Apply background to card using CardManager
    function applyBackground(side) {
        const color1 = selectedColor;
        const color2 = getComplementaryColor(color1);

        // Get the color input elements
        const startColorInput = document.getElementById(side === 'front' ? 'front-bg-start' : 'back-bg-start');
        const endColorInput = document.getElementById(side === 'front' ? 'front-bg-end' : 'back-bg-end');
        const opacityInput = document.getElementById(side === 'front' ? 'front-bg-opacity' : 'back-bg-opacity');

        if (startColorInput && endColorInput) {
            // Set the gradient colors
            startColorInput.value = color1;
            endColorInput.value = color2;

            // Set opacity to 1 for full visibility
            if (opacityInput) {
                opacityInput.value = 1;
            }

            // Trigger input events to update the UI
            startColorInput.dispatchEvent(new Event('input', { bubbles: true }));
            endColorInput.dispatchEvent(new Event('input', { bubbles: true }));
            if (opacityInput) {
                opacityInput.dispatchEvent(new Event('input', { bubbles: true }));
            }

            // Clear any background image if exists
            if (typeof CardManager !== 'undefined') {
                if (side === 'front') {
                    CardManager.frontBgImageUrl = '';
                    const removeFrontBtn = document.querySelector('[id*="remove-front-bg"]');
                    if (removeFrontBtn) removeFrontBtn.style.display = 'none';
                } else {
                    CardManager.backBgImageUrl = '';
                    const removeBackBtn = document.querySelector('[id*="remove-back-bg"]');
                    if (removeBackBtn) removeBackBtn.style.display = 'none';
                }

                // Update the card backgrounds
                if (CardManager.updateCardBackgrounds) {
                    CardManager.updateCardBackgrounds();
                }

                // Save state if available
                if (typeof StateManager !== 'undefined' && StateManager.saveState) {
                    StateManager.saveState();
                }
            }

            console.log(`AI Backgrounds: Applied ${selectedPattern} pattern with colors ${color1} -> ${color2} to ${side}`);
        } else {
            console.error('AI Backgrounds: Color inputs not found');
            // Fallback: Try to directly manipulate the card elements
            applyBackgroundFallback(side, color1, color2);
        }
    }

    // Fallback function if inputs not found
    function applyBackgroundFallback(side, color1, color2) {
        // Try to find card elements directly
        const cardSelector = side === 'front' ? '.nfc-card-front' : '.nfc-card-back';
        const cardElement = document.querySelector(cardSelector);

        if (cardElement) {
            const bgLayer = cardElement.querySelector('.card-background-layer');
            if (bgLayer) {
                bgLayer.style.background = `linear-gradient(135deg, ${color1}, ${color2})`;
                bgLayer.style.opacity = '1';
            } else {
                cardElement.style.background = `linear-gradient(135deg, ${color1}, ${color2})`;
            }
        }
    }

    // Show notification
    function showNotification(message) {
        // Check if there's an existing notification system
        if (typeof showToast === 'function') {
            showToast(message, 'success');
        } else if (typeof UIManager !== 'undefined' && UIManager.announce) {
            UIManager.announce(message);
        } else {
            // Create a simple notification
            const notification = document.createElement('div');
            notification.className = 'ai-notification';
            notification.innerHTML = `<i class="fas fa-check-circle"></i> ${message}`;
            notification.style.cssText = `
                position: fixed;
                bottom: 20px;
                left: 50%;
                transform: translateX(-50%);
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                color: white;
                padding: 12px 24px;
                border-radius: 10px;
                font-size: 14px;
                z-index: 10000;
                display: flex;
                align-items: center;
                gap: 10px;
                box-shadow: 0 5px 20px rgba(102, 126, 234, 0.4);
                animation: slideUp 0.3s ease;
            `;
            document.body.appendChild(notification);

            setTimeout(() => {
                notification.style.opacity = '0';
                notification.style.transform = 'translateX(-50%) translateY(10px)';
                notification.style.transition = 'all 0.3s ease';
                setTimeout(() => notification.remove(), 300);
            }, 3000);
        }
    }

    // Initialize when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        // Wait a bit for other scripts to load
        setTimeout(init, 500);
    }
})();
