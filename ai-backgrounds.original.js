/**
 * AI Backgrounds Engine
 * Generates advanced CSS gradients, Mesh gradients, and Data URI SVG patterns
 * Provides a highly interactive live-preview modal UI.
 */

(function () {
    'use strict';

    // State
    const state = {
        currentStyle: 'cyberpunk',
        generatedCss: '',
        generatedColors: { start: '', end: '' },
        isOpen: false
    };

    // AI Generation Prompts & Strategies
    const styles = {
        cyberpunk: {
            generate: () => {
                const hues = [300, 320, 280, 190, 160];
                const h1 = hues[Math.floor(Math.random() * hues.length)];
                const h2 = (h1 + 40 + Math.random() * 60) % 360;
                const h3 = (h1 + 180 + Math.random() * 30) % 360;
                
                const c1 = `hsl(${h1}, 100%, 15%)`;
                const c2 = `hsl(${h2}, 100%, 50%)`;
                const c3 = `hsl(${h3}, 100%, 50%)`;
                
                // SVG Grid Overlay
                const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40"><path d="M0 0h40v40H0z" fill="none"/><path d="M0 39.5h40M39.5 0v40" stroke="rgba(255,255,255,0.07)" stroke-width="1"/></svg>`;
                const dataUri = `url("data:image/svg+xml;base64,${btoa(svg)}")`;

                return {
                    css: `${dataUri}, radial-gradient(circle at ${Math.random()*100}% ${Math.random()*100}%, ${c2} 0%, transparent 60%), radial-gradient(circle at ${Math.random()*100}% ${Math.random()*100}%, ${c3} 0%, transparent 60%), ${c1}`,
                    colors: { start: c1, end: c2 }
                };
            }
        },
        luxury: {
            generate: () => {
                const bases = ['#0a0a0a', '#1a1814', '#0d1b2a', '#2c1e16'];
                const base = bases[Math.floor(Math.random() * bases.length)];
                const angles = [45, 135, 225, 315];
                const angle = angles[Math.floor(Math.random() * angles.length)];
                
                const g1 = `rgba(212, 175, 55, ${0.4 + Math.random()*0.3})`;
                const g2 = `rgba(255, 223, 0, ${0.1 + Math.random()*0.2})`;
                
                return {
                    css: `linear-gradient(${angle}deg, ${g1} 0%, transparent 40%), linear-gradient(${angle + 180}deg, ${g2} 0%, transparent 40%), ${base}`,
                    colors: { start: base, end: '#d4af37' }
                };
            }
        },
        fluid: {
            generate: () => {
                const h = Math.floor(Math.random() * 360);
                const pos1 = `${Math.floor(Math.random()*100)}% ${Math.floor(Math.random()*100)}%`;
                const pos2 = `${Math.floor(Math.random()*100)}% ${Math.floor(Math.random()*100)}%`;
                const pos3 = `${Math.floor(Math.random()*100)}% ${Math.floor(Math.random()*100)}%`;
                const pos4 = `${Math.floor(Math.random()*100)}% ${Math.floor(Math.random()*100)}%`;

                const c1 = `hsl(${h}, 80%, 60%)`;
                const c2 = `hsl(${(h + 40) % 360}, 80%, 60%)`;
                const c3 = `hsl(${(h + 80) % 360}, 80%, 60%)`;
                const c4 = `hsl(${(h + 120) % 360}, 80%, 60%)`;

                return {
                    css: `radial-gradient(circle at ${pos1}, ${c1} 0%, transparent 50%), radial-gradient(circle at ${pos2}, ${c2} 0%, transparent 50%), radial-gradient(circle at ${pos3}, ${c3} 0%, transparent 50%), radial-gradient(circle at ${pos4}, ${c4} 0%, transparent 50%), #0f0f0f`,
                    colors: { start: c1, end: c3 }
                };
            }
        },
        cosmic: {
            generate: () => {
                const c1 = '#090a0f';
                const c2 = '#1b2735';
                const angle = Math.floor(Math.random() * 360);
                
                // SVG Noise
                const noiseSVG = `<svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg"><filter id="noiseFilter"><feTurbulence type="fractalNoise" baseFrequency="0.65" numOctaves="3" stitchTiles="stitch"/></filter><rect width="100%" height="100%" filter="url(#noiseFilter)" opacity="0.08"/></svg>`;
                const noiseUri = `url("data:image/svg+xml;base64,${btoa(noiseSVG)}")`;

                const glowColor = `hsl(${Math.random() > 0.5 ? 280 : 200}, 100%, 60%)`;

                return {
                    css: `${noiseUri}, radial-gradient(ellipse at ${Math.random()*100}% ${Math.random()*100}%, ${glowColor} 0%, transparent 60%), linear-gradient(${angle}deg, ${c1} 0%, ${c2} 100%)`,
                    colors: { start: c1, end: glowColor }
                };
            }
        },
        minimal: {
            generate: () => {
                const h = Math.floor(Math.random() * 360);
                const bg = `hsl(${h}, 15%, 95%)`;
                const s1 = `hsl(${h}, 30%, 85%)`;
                const s2 = `hsl(${(h + 20) % 360}, 20%, 90%)`;

                const angle1 = Math.random() * 360;
                const angle2 = Math.random() * 360;

                return {
                    css: `linear-gradient(${angle1}deg, ${s1} 0%, transparent 40%), linear-gradient(${angle2}deg, ${s2} 0%, transparent 40%), ${bg}`,
                    colors: { start: bg, end: s1 }
                };
            }
        }
    };

    function init() {
        const aiBtn = document.getElementById('ai-backgrounds-btn');
        const modal = document.getElementById('ai-backgrounds-modal');
        const closeBtn = document.getElementById('close-ai-modal');
        
        if (!aiBtn || !modal || !closeBtn) {
            console.warn('AI Backgrounds Modal missing. Ensure updated HTML structures are present.');
            return;
        }

        // Bind Open / Close
        aiBtn.addEventListener('click', () => openModal(modal));
        closeBtn.addEventListener('click', () => closeModal(modal));
        
        // Close on overlay click
        modal.addEventListener('click', (e) => {
            if (e.target === modal) closeModal(modal);
        });

        // Close on Escape
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && state.isOpen) closeModal(modal);
        });

        // Bind Style Chips
        document.querySelectorAll('.ai-vibe-chip').forEach(chip => {
            chip.addEventListener('click', (e) => {
                document.querySelectorAll('.ai-vibe-chip').forEach(c => c.classList.remove('active'));
                chip.classList.add('active');
                state.currentStyle = chip.dataset.style;
                generateVariant();
            });
        });

        // Bind Regenerate
        const regenBtn = document.getElementById('ai-bg-regenerate');
        if (regenBtn) {
            regenBtn.addEventListener('click', () => {
                regenBtn.classList.add('spinning');
                setTimeout(() => regenBtn.classList.remove('spinning'), 500);
                generateVariant();
            });
        }

        // Bind Apply Buttons
        const applyFront = document.getElementById('ai-apply-front');
        const applyBack = document.getElementById('ai-apply-back');
        if (applyFront) applyFront.addEventListener('click', () => applyToCard('front'));
        if (applyBack) applyBack.addEventListener('click', () => applyToCard('back'));

        console.log('AI Premium Backgrounds: Initialized successfully');
    }

    function openModal(modal) {
        state.isOpen = true;
        modal.style.display = 'flex';
        // Auto trigger first generation if blank
        if (!state.generatedCss) {
            generateVariant();
        }
        
        // Force a small reflow to ensure animations play
        requestAnimationFrame(() => {
            modal.classList.add('fade-in');
        });
    }

    function closeModal(modal) {
        state.isOpen = false;
        modal.style.display = 'none';
        modal.classList.remove('fade-in');
    }

    function generateVariant() {
        const styleDef = styles[state.currentStyle] || styles.fluid;
        const result = styleDef.generate();
        
        state.generatedCss = result.css;
        state.generatedColors = result.colors;
        
        // Update live preview in modal
        const previewEl = document.getElementById('ai-bg-preview-canvas');
        if (previewEl) {
            previewEl.style.opacity = '0.5';
            setTimeout(() => {
                previewEl.style.background = state.generatedCss;
                previewEl.style.opacity = '1';
            }, 150);
        }
    }

    function hexToRgba(hex, alpha) {
        if (!hex) return '';
        let r = 0, g = 0, b = 0;
        if (hex.length === 4) {
          r = "0x" + hex[1] + hex[1]; g = "0x" + hex[2] + hex[2]; b = "0x" + hex[3] + hex[3];
        } else if (hex.length === 7) {
          r = "0x" + hex[1] + hex[2]; g = "0x" + hex[3] + hex[4]; b = "0x" + hex[5] + hex[6];
        }
        return `rgba(${+r},${+g},${+b},${alpha})`;
    }

    function hslToHex(hslString) {
        // Fallback or rough conversion simply returning the hsl string 
        // to be injected in CSS inputs where acceptable, or just return the computed style.
        // For standard input[type=color], we usually need HEX.
        return '#000000'; // Real implementation needs element computing or math fallback
    }
    
    // We create a hidden div to compute HSL colors to HEX natively via browser
    function resolveColorToHex(colorStr) {
        if (colorStr.startsWith('#') && colorStr.length === 7) return colorStr;
        const d = document.createElement("div");
        d.style.color = colorStr;
        document.body.appendChild(d);
        const rgb = window.getComputedStyle(d).color;
        document.body.removeChild(d);
        const match = rgb.match(/^rgb\((\d+),\s*(\d+),\s*(\d+)\)$/);
        if (!match) return '#000000';
        function hex(x) { return ("0" + parseInt(x).toString(16)).slice(-2); }
        return "#" + hex(match[1]) + hex(match[2]) + hex(match[3]);
    }

    function applyToCard(side) {
        if (!state.generatedCss) return;

        const isFront = side === 'front';

        // 1. We must inject the complex CSS string directly via a DOM update 
        // because the standard UI only accepts 2 colors.
        // We will hijack the gradient layer.
        
        const layerId = isFront ? 'front-bg-gradient-layer' : 'back-bg-gradient-layer';
        const layerEl = document.getElementById(layerId);
        
        if (layerEl) {
            // Apply immediately to preview
            layerEl.style.background = state.generatedCss;
            layerEl.style.opacity = '1';
        }

        // 2. We also update the basic color pickers to sensible fallbacks so the UI matches closely
        const hexStart = resolveColorToHex(state.generatedColors.start);
        const hexEnd = resolveColorToHex(state.generatedColors.end);
        
        const in_start = document.getElementById(isFront ? 'front-bg-start' : 'back-bg-start');
        const in_end = document.getElementById(isFront ? 'front-bg-end' : 'back-bg-end');
        const in_opc = document.getElementById(isFront ? 'front-bg-opacity' : 'back-bg-opacity');

        if (in_start && in_end) {
            in_start.value = hexStart;
            in_end.value = hexEnd;
            if (in_opc) in_opc.value = 1;

            // Notice we do NOT trigger 'input' event because that would overwrite 
            // our brilliant custom CSS string via CardManager.updateCardBackgrounds().
            // We only update the visual input values.
        }

        // 3. To make it persistent in StateManager, we need to inject the CSS into the state object somehow.
        // For MC PRIME, we'll store the complex CSS string in a data attribute that the save function can read
        // OR we just rely on the DOM saving the inline style in HTML canvas export.
        if (layerEl) {
            layerEl.setAttribute('data-ai-bg', state.generatedCss);
        }

        // 4. Hide old Image layers if any
        const imgLayerId = isFront ? 'front-bg-image-layer' : 'back-bg-image-layer';
        const imgLayerEl = document.getElementById(imgLayerId);
        if (imgLayerEl) {
            imgLayerEl.style.backgroundImage = 'none';
        }
        
        if (typeof CardManager !== 'undefined') {
            if (isFront) {
                CardManager.frontBgImageUrl = '';
                const removeFrontBtn = document.querySelector('[id*="remove-front-bg"]');
                if (removeFrontBtn) removeFrontBtn.style.display = 'none';
            } else {
                CardManager.backBgImageUrl = '';
                const removeBackBtn = document.querySelector('[id*="remove-back-bg"]');
                if (removeBackBtn) removeBackBtn.style.display = 'none';
            }
        }

        // Trigger debounce save
        if (typeof StateManager !== 'undefined' && StateManager.saveDebounced) {
            StateManager.saveDebounced();
        }

        // Notify
        const modal = document.getElementById('ai-backgrounds-modal');
        closeModal(modal);
        
        if (typeof UIManager !== 'undefined' && UIManager.announce) {
            const isAr = document.documentElement.lang !== 'en';
            UIManager.announce(isAr ? `تم تطبيق خلفية ${state.currentStyle} بنجاح` : `Applied ${state.currentStyle} background`);
        }
    }

    // Initialize when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        setTimeout(init, 300);
    }

})();
