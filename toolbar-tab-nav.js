/**
 * MC PRIME NFC — Toolbar Tab Navigation v3.0
 * Tabs are in HTML statically — this script ONLY handles:
 *   1. Click events on tabs
 *   2. Show/hide sidebars on tab switch
 *   3. Keyboard shortcuts 1/2/3
 *   4. Settings panel build
 */
(function () {
    'use strict';

    var isAr = document.documentElement.lang !== 'en';

    // ── Run after DOM is ready ────────────────────────────────────────────
    function init() {
        var panelDesign   = document.getElementById('panel-design');
        var panelElements = document.getElementById('panel-elements');
        var pillNav       = document.getElementById('tb-pill-nav');

        if (!panelDesign || !panelElements || !pillNav) {
            setTimeout(init, 250);
            return;
        }

        // Attach click handlers to every tab button
        pillNav.querySelectorAll('.tb-tab').forEach(function (btn) {
            btn.addEventListener('click', function () {
                activateTab(btn.dataset.tab);
            });
        });

        // Keyboard: 1 = design, 2 = content, 3 = settings
        document.addEventListener('keydown', function (e) {
            var tag = (document.activeElement || {}).tagName;
            if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
            if (e.key === '1') activateTab('tab-design');
            if (e.key === '2') activateTab('tab-content');
            if (e.key === '3') activateTab('tab-settings');
        });

        // Build settings panel
        buildSettingsPanel(panelDesign);

        // Start on Design tab
        activateTab('tab-design');
    }

    // ── activateTab ──────────────────────────────────────────────────────
    function activateTab(tabId) {
        var panelDesign   = document.getElementById('panel-design');
        var panelElements = document.getElementById('panel-elements');
        var settingsPanel = document.getElementById('tb-settings-panel');
        var pillNav       = document.getElementById('tb-pill-nav');

        // Update tab button active class
        if (pillNav) {
            pillNav.querySelectorAll('.tb-tab').forEach(function (btn) {
                btn.classList.remove('active-design', 'active-content', 'active-settings');
                if (btn.dataset.tab === tabId) {
                    btn.classList.add(btn.dataset.ac || '');
                }
            });
        }

        // Show/hide panels
        if (panelDesign)   panelDesign.style.display   = tabId === 'tab-design'   ? '' : 'none';
        if (panelElements) panelElements.style.display = tabId === 'tab-content'  ? '' : 'none';
        if (settingsPanel) settingsPanel.style.display = tabId === 'tab-settings' ? '' : 'none';
    }

    // ── Build Settings Panel ──────────────────────────────────────────────
    function buildSettingsPanel(panelDesign) {
        if (document.getElementById('tb-settings-panel')) return;

        var panel = document.createElement('div');
        panel.id = 'tb-settings-panel';
        panel.style.cssText = [
            'display:none',
            'overflow-y:auto',
            'height:100%',
            'padding:20px',
            'background:var(--form-bg,#0d1b2e)',
            'border-right:1px solid var(--accent-secondary,rgba(77,166,255,0.15))',
            'box-sizing:border-box'
        ].join(';');

        panel.innerHTML =
            sect('#4da6ff', 'fa-language', isAr ? 'اللغة والمظهر' : 'Language & Theme',
                row(isAr ? 'لغة البطاقة' : 'Card Language',  '<button class="tbs-btn" onclick="document.getElementById(\'lang-toggle-btn\')?.click()">AR / EN</button>') +
                row(isAr ? 'وضع الإضاءة' : 'Theme Mode',     '<button class="tbs-btn" onclick="document.getElementById(\'theme-toggle-btn\')?.click()"><i class="fas fa-sun"></i> / <i class="fas fa-moon"></i></button>')
            ) +
            sect('#a855f7', 'fa-qrcode', isAr ? 'حجم QR' : 'QR Size',
                '<input type="range" min="15" max="55" value="30" style="width:100%;margin-bottom:6px;"' +
                ' oninput="(function(v){var s=document.getElementById(\'qr-size\');if(s){s.value=v;s.dispatchEvent(new Event(\'input\',{bubbles:true}));}})(this.value)">' +
                '<div style="font-size:.72rem;color:var(--text-secondary);text-align:center;">' + (isAr ? 'حجم صندوق QR بالكارت' : 'QR box size on card') + '</div>'
            ) +
            sect('#2ecc71', 'fa-share-nodes', isAr ? 'مشاركة' : 'Share',
                fullBtn('#f1c40f', 'fa-bookmark', isAr ? 'حفظ في المعرض' : 'Save to Gallery', "document.getElementById('save-to-gallery-btn')?.click()") +
                fullBtn('#4da6ff', 'fa-link',     isAr ? 'نسخ رابط المحرر' : 'Copy Editor Link', "document.getElementById('share-editor-btn')?.click()") +
                fullBtn('#a855f7', 'fa-users',    isAr ? 'تحرير جماعي' : 'Collaborative Edit', "document.getElementById('start-collab-btn')?.click()")
            ) +
            '<div class="tbs-section" style="border-color:rgba(231,76,60,.25);">' +
              '<div class="tbs-title" style="color:#e74c3c;"><i class="fas fa-triangle-exclamation"></i> ' + (isAr ? 'منطقة الخطر' : 'Danger Zone') + '</div>' +
              '<button class="tbs-full-btn tbs-danger-btn" onclick="document.getElementById(\'reset-design-btn\')?.click()">' +
                '<i class="fas fa-trash-alt"></i> ' + (isAr ? 'إعادة تعيين التصميم' : 'Reset Design') +
              '</button>' +
            '</div>';

        // Inject CSS for settings panel elements
        injectSettingsCSS();

        // Place inside pro-layout (same parent as panelDesign)
        var layout = panelDesign.parentElement;
        if (layout) layout.insertBefore(panel, panelDesign);
        else document.body.appendChild(panel);
    }

    // ── Helper builders ──────────────────────────────────────────────────
    function sect(color, icon, title, body) {
        return '<div class="tbs-section">' +
            '<div class="tbs-title"><i class="fas ' + icon + '" style="color:' + color + ';"></i> ' + title + '</div>' +
            body +
        '</div>';
    }
    function row(label, ctrl) {
        return '<div class="tbs-row"><span>' + label + '</span>' + ctrl + '</div>';
    }
    function fullBtn(color, icon, label, onclick) {
        return '<button class="tbs-full-btn" onclick="' + onclick + '">' +
            '<i class="fas ' + icon + '" style="color:' + color + ';"></i> ' + label +
        '</button>';
    }

    // ── Settings panel CSS ────────────────────────────────────────────────
    function injectSettingsCSS() {
        if (document.getElementById('tbs-css')) return;
        var s = document.createElement('style');
        s.id = 'tbs-css';
        s.textContent =
            '.tbs-section{background:rgba(255,255,255,.03);border:1px solid rgba(255,255,255,.07);border-radius:12px;padding:14px;margin-bottom:12px;}' +
            '.tbs-title{font-size:.82rem;font-weight:700;color:var(--text-primary);margin:0 0 12px;display:flex;align-items:center;gap:7px;}' +
            '.tbs-row{display:flex;align-items:center;justify-content:space-between;font-size:.8rem;color:var(--text-primary);margin-bottom:8px;}' +
            '.tbs-btn{padding:4px 11px;border-radius:7px;background:rgba(255,255,255,.07);border:1px solid rgba(255,255,255,.12);color:var(--text-primary);font-size:.75rem;cursor:pointer;font-family:inherit;transition:transform 0.3s cubic-bezier(0.22, 1, 0.36, 1), background 0.3s;}' +
            '.tbs-btn:hover{background:rgba(255,255,255,.14);transform:translateY(-1px);}' +
            '.tbs-btn:active{transform:scale(0.96);}' +
            '.tbs-full-btn{width:100%;padding:8px 12px;border-radius:9px;background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.1);color:var(--text-primary);font-size:.82rem;cursor:pointer;font-family:inherit;text-align:right;display:flex;align-items:center;gap:8px;margin-bottom:7px;transition:transform 0.3s cubic-bezier(0.22, 1, 0.36, 1), background 0.3s;}' +
            '.tbs-full-btn:hover{background:rgba(255,255,255,.1);transform:translateY(-1px);}' +
            '.tbs-full-btn:active{transform:scale(0.98);}' +
            '.tbs-danger-btn{background:rgba(231,76,60,.08)!important;border-color:rgba(231,76,60,.3)!important;color:#e74c3c!important;}';
        document.head.appendChild(s);
    }

    // ── Boot ─────────────────────────────────────────────────────────────
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', function () { setTimeout(init, 200); });
    } else {
        setTimeout(init, 200);
    }

}());
