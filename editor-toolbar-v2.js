(function (global) {
    'use strict';

    var document = global.document;
    if (!document || global.EditorToolbarV2) return;

    var zoomLevels = [0.75, 0.9, 1, 1.1, 1.25];
    var zoomIndex = 2;

    function isEnglish() { return document.documentElement.lang === 'en'; }

    function cardNameInput() {
        return document.getElementById(isEnglish() ? 'input-name_en' : 'input-name_ar') ||
            document.getElementById('input-name_ar') || document.getElementById('input-name_en');
    }

    function syncTitleFromCard() {
        var title = document.getElementById('toolbar-design-title');
        var source = cardNameInput();
        if (!title || !source || document.activeElement === title) return;
        var nextValue = String(source.value || '').trim();
        if (title.value !== nextValue) title.value = nextValue;
    }

    function bindDesignTitle() {
        var title = document.getElementById('toolbar-design-title');
        var source = cardNameInput();
        if (!title || !source) return;

        syncTitleFromCard();
        source.addEventListener('input', syncTitleFromCard);
        source.addEventListener('change', syncTitleFromCard);
        title.addEventListener('input', function () {
            if (source.value === title.value) return;
            source.value = title.value;
            source.dispatchEvent(new global.Event('input', { bubbles: true }));
        });
        title.addEventListener('change', function () {
            source.dispatchEvent(new global.Event('change', { bubbles: true }));
        });

        // State restoration can set .value without firing an event.
        var checks = 0;
        var timer = global.setInterval(function () {
            syncTitleFromCard();
            checks += 1;
            if (checks >= 20) global.clearInterval(timer);
        }, 250);
    }

    function setActiveFace(face, options) {
        options = options || {};
        var frontButton = document.getElementById('toolbar-face-front');
        var backButton = document.getElementById('toolbar-face-back');
        var frontCard = document.getElementById('card-front-preview');
        var backCard = document.getElementById('card-back-preview');
        var flipper = document.querySelector('.card-flipper');
        var mobileFlipButton = document.getElementById('flip-card-btn-mobile');
        var isBack = face === 'back';

        [frontButton, backButton].forEach(function (button) {
            if (!button) return;
            var active = button === (isBack ? backButton : frontButton);
            button.classList.toggle('is-active', active);
            button.setAttribute('aria-pressed', String(active));
        });

        document.body.dataset.activeCardFace = isBack ? 'back' : 'front';
        if (!options.navigate) return;
        if (global.innerWidth <= 1024 && flipper && mobileFlipButton) {
            var currentlyBack = flipper.classList.contains('is-flipped');
            if (currentlyBack !== isBack) mobileFlipButton.click();
            return;
        }

        var target = isBack ? backCard : frontCard;
        if (target && target.scrollIntoView) {
            target.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'center' });
        }
    }

    function bindFaceSwitch() {
        var frontButton = document.getElementById('toolbar-face-front');
        var backButton = document.getElementById('toolbar-face-back');
        var frontCard = document.getElementById('card-front-preview');
        var backCard = document.getElementById('card-back-preview');
        var flipper = document.querySelector('.card-flipper');

        if (frontButton) frontButton.addEventListener('click', function () { setActiveFace('front', { navigate: true }); });
        if (backButton) backButton.addEventListener('click', function () { setActiveFace('back', { navigate: true }); });
        if (frontCard) frontCard.addEventListener('click', function () { setActiveFace('front'); });
        if (backCard) backCard.addEventListener('click', function () { setActiveFace('back'); });

        if (flipper && global.MutationObserver) {
            new global.MutationObserver(function () {
                setActiveFace(flipper.classList.contains('is-flipped') ? 'back' : 'front');
            }).observe(flipper, { attributes: true, attributeFilter: ['class'] });
        }
        setActiveFace(flipper && flipper.classList.contains('is-flipped') ? 'back' : 'front');
    }

    function applyZoom() {
        var value = zoomLevels[zoomIndex];
        var output = document.getElementById('toolbar-zoom-value');
        var outButton = document.getElementById('toolbar-zoom-out');
        var inButton = document.getElementById('toolbar-zoom-in');
        document.documentElement.style.setProperty('--editor-toolbar-zoom', String(value));
        if (output) output.textContent = Math.round(value * 100) + '%';
        if (outButton) outButton.disabled = zoomIndex === 0;
        if (inButton) inButton.disabled = zoomIndex === zoomLevels.length - 1;
        try { global.sessionStorage.setItem('editorToolbarZoom', String(value)); } catch (error) { /* optional */ }
    }

    function bindZoom() {
        try {
            var saved = Number(global.sessionStorage.getItem('editorToolbarZoom'));
            var savedIndex = zoomLevels.indexOf(saved);
            if (savedIndex >= 0) zoomIndex = savedIndex;
        } catch (error) { /* optional */ }

        var outButton = document.getElementById('toolbar-zoom-out');
        var inButton = document.getElementById('toolbar-zoom-in');
        if (outButton) outButton.addEventListener('click', function () {
            if (zoomIndex > 0) { zoomIndex -= 1; applyZoom(); }
        });
        if (inButton) inButton.addEventListener('click', function () {
            if (zoomIndex < zoomLevels.length - 1) { zoomIndex += 1; applyZoom(); }
        });
        applyZoom();
    }

    function protectExportsFromVisualZoom() {
        if (typeof global.html2canvas !== 'function' || global.html2canvas.__toolbarZoomSafe) return;
        var original = global.html2canvas;
        var wrapped = function (element, options) {
            var isCardCapture = element && element.closest && element.closest('#cards-wrapper');
            if (!isCardCapture) return original.call(this, element, options);

            var previous = document.documentElement.style.getPropertyValue('--editor-toolbar-zoom') || '1';
            document.documentElement.style.setProperty('--editor-toolbar-zoom', '1');
            var result;
            try {
                result = original.call(this, element, options);
            } catch (error) {
                document.documentElement.style.setProperty('--editor-toolbar-zoom', previous);
                throw error;
            }
            return Promise.resolve(result).finally(function () {
                document.documentElement.style.setProperty('--editor-toolbar-zoom', previous);
            });
        };
        wrapped.__toolbarZoomSafe = true;
        global.html2canvas = wrapped;
    }

    function bindLanguageLinks() {
        document.querySelectorAll('[data-toolbar-language-target]').forEach(function (link) {
            link.addEventListener('click', function (event) {
                event.preventDefault();
                global.location.href = link.getAttribute('data-toolbar-language-target') + global.location.search;
            });
        });
    }

    function syncViewControls() {
        var alignment = global.EditorSmartAlignment;
        var gridEnabled = Boolean(alignment && alignment.isGridEnabled && alignment.isGridEnabled());
        var safeEnabled = Boolean(alignment && alignment.isSafeAreaEnabled && alignment.isSafeAreaEnabled());
        [
            ['toolbar-grid-toggle', gridEnabled],
            ['toolbar-grid-toggle-menu', gridEnabled],
            ['toolbar-safe-area-toggle', safeEnabled],
            ['toolbar-safe-area-toggle-menu', safeEnabled]
        ].forEach(function (entry) {
            var button = document.getElementById(entry[0]);
            if (!button) return;
            button.classList.toggle('is-active', entry[1]);
            button.setAttribute('aria-pressed', String(entry[1]));
        });
    }

    function bindViewControls() {
        var grid = document.getElementById('toolbar-grid-toggle');
        var safe = document.getElementById('toolbar-safe-area-toggle');
        var snap = document.getElementById('toolbar-snap-now');

        if (grid) grid.addEventListener('click', function () {
            if (global.EditorSmartAlignment && global.EditorSmartAlignment.toggleGrid) {
                global.EditorSmartAlignment.toggleGrid();
                syncViewControls();
            }
        });
        if (safe) safe.addEventListener('click', function () {
            if (global.EditorSmartAlignment && global.EditorSmartAlignment.toggleSafeArea) {
                global.EditorSmartAlignment.toggleSafeArea();
                syncViewControls();
            }
        });
        if (snap) snap.addEventListener('click', function () {
            if (global.EditorSmartAlignment && global.EditorSmartAlignment.snapSelected) {
                global.EditorSmartAlignment.snapSelected(8);
            }
        });
        syncViewControls();
    }

    function init() {
        var toolbar = document.getElementById('pro-toolbar');
        if (!toolbar || toolbar.dataset.professionalToolbarReady === 'true') return;
        toolbar.dataset.professionalToolbarReady = 'true';
        bindDesignTitle();
        bindFaceSwitch();
        bindZoom();
        bindViewControls();
        protectExportsFromVisualZoom();
        bindLanguageLinks();
    }

    global.EditorToolbarV2 = {
        init: init,
        setActiveFace: setActiveFace,
        syncTitleFromCard: syncTitleFromCard,
        syncViewControls: syncViewControls,
        getZoom: function () { return zoomLevels[zoomIndex]; }
    };

    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true });
    else init();
}(typeof window !== 'undefined' ? window : globalThis));
