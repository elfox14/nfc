/**
 * MC PRIME NFC Editor - Proxy-based State Management
 * Automatically triggers UI updates and saves when state changes.
 */

const StateManagerProxy = (function() {
    'use strict';

    let _state = {};
    let _isBatchUpdating = false;

    const handler = {
        get(target, prop) {
            const value = target[prop];
            if (value && typeof value === 'object') {
                return new Proxy(value, handler);
            }
            return value;
        },
        set(target, prop, value) {
            if (target[prop] === value) return true;
            
            target[prop] = value;
            
            if (!_isBatchUpdating) {
                triggerUpdate();
            }
            return true;
        }
    };

    function triggerUpdate() {
        if (window.StateManager && window.StateManager.isApplyingState) return;

        // 1. Update CSS Variables for real-time visual changes
        updateCSSVariables();

        // 2. Update UI (Render Card) - Debounced or conditional
        if (window.CardManager && window.CardManager.renderCardContent) {
            window.CardManager.renderCardContent();
        }

        // 3. Save State
        if (window.StateManager && window.StateManager.saveDebounced) {
            window.StateManager.saveDebounced();
        }
    }

    function updateCSSVariables() {
        const root = document.documentElement;
        const inputs = _state.inputs || {};

        // Map state inputs to CSS variables
        const mappings = {
            'name-color': '--card-name-color',
            'name-font-size': '--card-name-size',
            'name-font': '--card-name-font',
            'tagline-color': '--card-tagline-color',
            'tagline-font-size': '--card-tagline-size',
            'tagline-font': '--card-tagline-font',
            'logo-size': '--card-logo-size',
            'photo-size': '--card-photo-size',
            'front-bg-start': '--card-front-bg-start',
            'front-bg-end': '--card-front-bg-end'
        };

        for (const [stateKey, cssVar] of Object.entries(mappings)) {
            if (inputs[stateKey] !== undefined) {
                let value = inputs[stateKey];
                if (stateKey.includes('size')) value += 'px';
                root.style.setProperty(cssVar, value);
            }
        }
    }

    return {
        init(initialState) {
            _state = new Proxy(JSON.parse(JSON.stringify(initialState)), handler);
            window.editorState = _state;
            console.log('[StateManagerProxy] Initialized with Proxy');
            return _state;
        },
        
        batch(fn) {
            _isBatchUpdating = true;
            fn(_state);
            _isBatchUpdating = false;
            triggerUpdate();
        },

        get state() {
            return _state;
        }
    };
})();
