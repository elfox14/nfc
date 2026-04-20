/**
 * editor-panels.js — Consolidated Panel Logic for MC PRIME Editor
 * Replaces all inline <script> blocks from editor.html / editor-en.html
 * Uses Event Delegation for efficiency and maintainability.
 */
(function () {
    'use strict';

    // ──────────────────────────────────────────────────────────
    // 1. GLOBAL HELPERS (previously inline global functions)
    // ──────────────────────────────────────────────────────────

    /** Set logo background via swatch buttons */
    window.lpSetBg = function (btn, val) {
        var container = btn.closest('.lp-swatches');
        container.querySelectorAll('.lp-swatch').forEach(function (s) { s.classList.remove('lp-swatch-active'); });
        btn.classList.add('lp-swatch-active');
        var sel = document.getElementById('logo-bg-color');
        if (sel) { sel.value = val; sel.dispatchEvent(new Event('change', { bubbles: true })); }
    };

    /** Set photo border color via swatch buttons */
    window.lpSetBorderColor = function (btn, val) {
        var container = btn.closest('.lp-swatches');
        container.querySelectorAll('.lp-swatch').forEach(function (s) { s.classList.remove('lp-swatch-active'); });
        btn.classList.add('lp-swatch-active');
        var inp = document.getElementById('photo-border-color');
        if (inp) {
            inp.value = val === 'transparent' ? '#000000' : val;
            inp.dataset.transparent = (val === 'transparent');
            inp.dispatchEvent(new Event('input', { bubbles: true }));
            inp.dispatchEvent(new Event('change', { bubbles: true }));
        }
    };

    // ──────────────────────────────────────────────────────────
    // 2. GENERIC D-PAD WIRING (Event Delegation — single handler)
    // ──────────────────────────────────────────────────────────

    function wireAllDpads() {
        document.querySelectorAll('.lp-dpad[data-target-id]:not([data-wired="true"])').forEach(function (dpad) {
            var targetId = dpad.dataset.targetId;
            dpad.querySelectorAll('.move-btn').forEach(function (btn) {
                btn.addEventListener('click', function (e) {
                    e.preventDefault();
                    if (typeof EventManager !== 'undefined' && EventManager.moveElement) {
                        EventManager.moveElement(targetId, btn.dataset.direction);
                    }
                });
            });
            dpad.dataset.wired = 'true';
        });
    }

    // ──────────────────────────────────────────────────────────
    // 3. GENERIC RADIO → ACTIVE CLASS SYNC (Event Delegation)
    // ──────────────────────────────────────────────────────────

    function syncRadioGroup(containerSelector, radioName, activeClass) {
        document.querySelectorAll(containerSelector + ' input[name="' + radioName + '"]').forEach(function (r) {
            r.addEventListener('change', function () {
                document.querySelectorAll(containerSelector + ' input[name="' + radioName + '"]').forEach(function (ir) {
                    var parent = ir.closest('.lp-align-btn') || ir.closest('.lp-place-btn');
                    if (parent) parent.classList.remove(activeClass);
                });
                var myParent = r.closest('.lp-align-btn') || r.closest('.lp-place-btn');
                if (myParent) myParent.classList.add(activeClass);
            });
        });
    }

    // ──────────────────────────────────────────────────────────
    // 4. PANEL-SPECIFIC LOGIC
    // ──────────────────────────────────────────────────────────

    function initLogoPanelLogic() {
        syncRadioGroup('#logo-align-group', 'logo-align', 'lp-align-active');
        syncRadioGroup('', 'placement-logo', 'lp-place-active');
    }

    function initPhotoPanelLogic() {
        syncRadioGroup('#photo-shape-group', 'photo-shape', 'lp-align-active');
        syncRadioGroup('#photo-align-group', 'photo-align', 'lp-align-active');
        syncRadioGroup('', 'placement-photo', 'lp-place-active');

        // Photo upload preview toggle
        var photoUpload = document.getElementById('input-photo-upload');
        if (photoUpload) {
            photoUpload.addEventListener('change', function () {
                var img = document.getElementById('photo-preview');
                var placeholder = document.getElementById('photo-placeholder');
                if (this.files && this.files.length > 0) {
                    if (img) img.style.display = 'block';
                    if (placeholder) placeholder.style.display = 'none';
                }
            });
        }
    }

    function initNameTaglinePanelLogic() {
        // Photo shape visual sync
        document.querySelectorAll('input[name="photo-shape"]').forEach(function (radio) {
            radio.addEventListener('change', function () {
                var shape = this.value;
                var wrapper = document.getElementById('card-personal-photo-wrapper');
                var preview = document.getElementById('card-personal-photo');
                var img = document.getElementById('card-personal-photo-img');

                if (!wrapper && typeof DOMElements !== 'undefined' && DOMElements.draggable) {
                    wrapper = DOMElements.draggable.photo;
                }

                if (wrapper) {
                    wrapper.style.borderRadius = shape === 'circle' ? '50%' : (shape === 'rounded' ? '15%' : '0');
                    wrapper.style.clipPath = shape === 'hexagon' ? 'polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)' : 'none';
                    if (preview) {
                        preview.style.borderRadius = wrapper.style.borderRadius;
                        preview.style.clipPath = wrapper.style.clipPath;
                    }
                    if (img) {
                        img.style.borderRadius = wrapper.style.borderRadius;
                        img.style.clipPath = wrapper.style.clipPath;
                    }
                }
            });
        });

        // Trigger initial shape
        setTimeout(function () {
            var checkedShape = document.querySelector('input[name="photo-shape"]:checked');
            if (checkedShape) checkedShape.dispatchEvent(new Event('change'));
        }, 500);

        // Name & Tagline placement pills
        syncRadioGroup('', 'placement-name', 'lp-place-active');
        syncRadioGroup('', 'placement-tagline', 'lp-place-active');
    }

    function initPhonePanelLogic() {
        document.querySelectorAll('input[name="phone-mode-fake"]').forEach(function (radio) {
            radio.addEventListener('change', function () {
                var isButtonMode = (this.value === 'buttons');

                // Update visual segmented control styling
                var textBtn = document.querySelector('.toggle-phone-text');
                var btnBtn = document.querySelector('.toggle-phone-btn');
                if (textBtn) {
                    textBtn.style.background = isButtonMode ? 'transparent' : 'var(--accent-primary)';
                    textBtn.style.color = isButtonMode ? 'var(--text-secondary)' : '#fff';
                    textBtn.style.boxShadow = isButtonMode ? 'none' : '0 2px 4px rgba(0,0,0,0.2)';
                }
                if (btnBtn) {
                    btnBtn.style.background = isButtonMode ? 'var(--accent-primary)' : 'transparent';
                    btnBtn.style.color = isButtonMode ? '#fff' : 'var(--text-secondary)';
                    btnBtn.style.boxShadow = isButtonMode ? '0 2px 4px rgba(0,0,0,0.2)' : 'none';
                }

                // Toggle panels
                var textControls = document.getElementById('phone-text-controls');
                var btnControls = document.getElementById('phone-btn-controls');
                if (textControls) textControls.style.display = isButtonMode ? 'none' : 'block';
                if (btnControls) btnControls.style.display = isButtonMode ? 'block' : 'none';

                // Sync hidden checkbox
                var checkbox = document.getElementById('toggle-phone-buttons');
                if (checkbox && checkbox.checked !== isButtonMode) {
                    checkbox.checked = isButtonMode;
                    checkbox.dispatchEvent(new Event('input', { bubbles: true }));
                    checkbox.dispatchEvent(new Event('change', { bubbles: true }));
                    if (typeof CardManager !== 'undefined' && CardManager.updatePhoneButtonsVisibility) {
                        CardManager.updatePhoneButtonsVisibility();
                    }
                }
            });
        });

        // Trigger initial state
        var fakeRadio = document.querySelector('input[name="phone-mode-fake"]:checked');
        if (fakeRadio) fakeRadio.dispatchEvent(new Event('change'));

        // Phone text layout align buttons
        syncRadioGroup('', 'phone-text-layout', 'lp-align-active');
    }

    function initQRPanelLogic() {
        var srcBtns = document.querySelectorAll('.lp-qr-src-btn');
        srcBtns.forEach(function (btn) {
            btn.addEventListener('click', function () {
                // Update styles
                srcBtns.forEach(function (b) {
                    b.style.background = 'rgba(255,255,255,0.03)';
                    b.style.borderColor = 'rgba(255,255,255,0.08)';
                    b.style.color = 'var(--text-secondary)';
                });
                btn.style.background = 'rgba(77,166,255,0.15)';
                btn.style.borderColor = 'rgba(77,166,255,0.45)';
                btn.style.color = 'var(--accent-primary)';

                // Select radio
                var radio = btn.querySelector('input[type="radio"]');
                if (radio) {
                    radio.checked = true;
                    radio.dispatchEvent(new Event('change', { bubbles: true }));
                }

                // Show/hide conditional groups
                var val = btn.dataset.val;
                var autoCard = document.getElementById('qr-auto-card-group');
                var urlGroup = document.getElementById('qr-url-group');
                var uploadGroup = document.getElementById('qr-upload-group');
                var customGroup = document.getElementById('qr-customization-group');
                if (autoCard) autoCard.style.display = (val === 'auto-card' || val === 'auto-vcard') ? 'block' : 'none';
                if (urlGroup) urlGroup.style.display = val === 'custom' ? 'block' : 'none';
                if (uploadGroup) uploadGroup.style.display = val === 'upload' ? 'block' : 'none';
                if (customGroup) customGroup.style.display = val === 'upload' ? 'none' : 'block';
            });
        });

        // QR Placement pills
        syncRadioGroup('#qr-placement-btns', 'placement-qr', 'lp-place-active');
    }

    function initSocialPanelLogic() {
        // Social mode segment control
        document.querySelectorAll('input[name="social-mode-fake"]').forEach(function (radio) {
            radio.addEventListener('change', function () {
                var isBtnMode = (this.value === 'buttons');
                // Style pills
                document.querySelectorAll('.social-mode-btn').forEach(function (b) {
                    var isActive = b.dataset.mode === (isBtnMode ? 'buttons' : 'text');
                    b.style.background = isActive ? 'var(--accent-primary)' : 'transparent';
                    b.style.color = isActive ? '#fff' : 'var(--text-secondary)';
                    b.style.boxShadow = isActive ? '0 2px 5px rgba(0,0,0,0.2)' : 'none';
                });
                // Show/hide panels
                var btnStyle = document.getElementById('social-btn-style');
                var textControls = document.getElementById('social-text-controls');
                if (btnStyle) btnStyle.style.display = isBtnMode ? 'block' : 'none';
                if (textControls) textControls.style.display = isBtnMode ? 'none' : 'block';
                // Sync hidden checkbox
                var cb = document.getElementById('toggle-social-buttons');
                if (cb && cb.checked !== isBtnMode) {
                    cb.checked = isBtnMode;
                    cb.dispatchEvent(new Event('input', { bubbles: true }));
                    cb.dispatchEvent(new Event('change', { bubbles: true }));
                }
            });
        });

        // Static field placement pill sync (Event Delegation)
        document.querySelectorAll('.static-place-label').forEach(function (lbl) {
            lbl.addEventListener('click', function () {
                var grp = this.closest('div');
                grp.querySelectorAll('.static-place-label').forEach(function (l) {
                    l.style.background = 'transparent';
                    l.style.color = 'var(--text-secondary)';
                });
                this.style.background = 'var(--accent-primary)';
                this.style.color = '#fff';
                var r = this.querySelector('input[type="radio"]');
                if (r) { r.checked = true; r.dispatchEvent(new Event('change', { bubbles: true })); }
            });
        });
    }

    // ──────────────────────────────────────────────────────────
    // 5. INITIALIZATION
    // ──────────────────────────────────────────────────────────

    function initAllPanels() {
        initLogoPanelLogic();
        initPhotoPanelLogic();
        initNameTaglinePanelLogic();
        initPhonePanelLogic();
        initQRPanelLogic();
        initSocialPanelLogic();

        // Wire all D-pads after a delay (elements may load lazily)
        setTimeout(wireAllDpads, 800);
        // Second pass for any dynamically created D-pads
        setTimeout(wireAllDpads, 2000);
    }

    // Wait for DOM ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initAllPanels);
    } else {
        initAllPanels();
    }
})();
