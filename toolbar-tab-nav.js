/**
 * MC PRIME NFC — Editor Shell Foundation v4.0
 *
 * Responsibilities:
 *   1. A single command registry for desktop, mobile and generated controls.
 *   2. Sidebar tab navigation and keyboard shortcuts.
 *   3. A generated settings panel without inline onclick handlers.
 *   4. Runtime diagnostics for duplicate DOM ids.
 *
 * This file intentionally delegates to the current editor controls instead of
 * replacing their business logic. It is the compatibility layer for the
 * gradual editor refactor.
 */
(function (global) {
    'use strict';

    var document = global.document;
    if (!document) return;

    var isAr = document.documentElement.lang !== 'en';
    var commandHandlers = Object.create(null);
    var commandBindingsInstalled = false;

    function registerCommand(name, handler) {
        if (!name || typeof handler !== 'function') {
            throw new TypeError('EditorCommands.register requires a name and handler');
        }
        commandHandlers[name] = handler;
        return function unregisterCommand() {
            if (commandHandlers[name] === handler) delete commandHandlers[name];
        };
    }

    function executeCommand(name, context) {
        var handler = commandHandlers[name];
        if (typeof handler !== 'function') {
            console.warn('[EditorCommands] Unknown command:', name);
            return false;
        }

        try {
            var result = handler(context || {});
            document.dispatchEvent(new global.CustomEvent('editor:command', {
                detail: { name: name, context: context || {}, result: result }
            }));
            return result !== false;
        } catch (error) {
            console.error('[EditorCommands] Command failed:', name, error);
            document.dispatchEvent(new global.CustomEvent('editor:commanderror', {
                detail: { name: name, error: error }
            }));
            return false;
        }
    }

    function clickControl(id) {
        var control = document.getElementById(id);
        if (!control || typeof control.click !== 'function') {
            console.warn('[EditorCommands] Missing target control:', id);
            return false;
        }
        control.click();
        return true;
    }

    function registerProxyCommand(name, targetId) {
        registerCommand(name, function () {
            return clickControl(targetId);
        });
    }

    function installDefaultCommands() {
        registerProxyCommand('language.toggle', 'lang-toggle-btn');
        registerProxyCommand('theme.toggle', 'theme-toggle-btn');
        registerProxyCommand('gallery.open', 'show-gallery-btn');
        registerProxyCommand('gallery.save', 'save-to-gallery-btn');
        registerProxyCommand('collaboration.start', 'start-collab-btn');
        registerProxyCommand('editor.share', 'share-editor-btn');
        registerProxyCommand('editor.save-share', 'save-share-btn');
        registerProxyCommand('design.reset', 'reset-design-btn');

        registerCommand('qr.resize', function (context) {
            var input = document.getElementById('qr-size');
            if (!input || context.value === undefined) return false;
            input.value = context.value;
            input.dispatchEvent(new global.Event('input', { bubbles: true }));
            return true;
        });
    }

    function bindExistingCommandTriggers() {
        var bindings = {
            'theme-toggle-btn-menu': 'theme.toggle',
            'show-gallery-btn-menu': 'gallery.open',
            'save-to-gallery-btn-menu': 'gallery.save',
            'start-collab-btn-menu': 'collaboration.start',
            'share-editor-btn-menu': 'editor.share',
            'reset-design-btn-menu': 'design.reset',
            'reset-design-btn-more': 'design.reset',
            'mobile-save-btn': 'editor.save-share',
            'mobile-share-btn': 'editor.share'
        };

        Object.keys(bindings).forEach(function (id) {
            var element = document.getElementById(id);
            if (element) element.dataset.editorCommand = bindings[id];
        });
    }

    function installCommandDelegation() {
        if (commandBindingsInstalled) return;
        commandBindingsInstalled = true;

        document.addEventListener('click', function (event) {
            var trigger = event.target.closest('[data-editor-command]');
            if (!trigger || trigger.disabled) return;

            // Capture-phase delegation prevents legacy proxy listeners from
            // executing the same command a second time.
            event.preventDefault();
            event.stopPropagation();
            executeCommand(trigger.dataset.editorCommand, {
                trigger: trigger,
                event: event
            });
        }, true);

        document.addEventListener('input', function (event) {
            var trigger = event.target.closest('[data-editor-command-input]');
            if (!trigger || trigger.disabled) return;
            executeCommand(trigger.dataset.editorCommandInput, {
                trigger: trigger,
                event: event,
                value: trigger.value
            });
        }, true);
    }

    function activateTab(tabId) {
        var panelDesign = document.getElementById('panel-design');
        var panelElements = document.getElementById('panel-elements');
        var settingsPanel = document.getElementById('tb-settings-panel');
        var pillNav = document.getElementById('tb-pill-nav');

        if (pillNav) {
            pillNav.querySelectorAll('.tb-tab').forEach(function (button) {
                button.classList.remove('active-design', 'active-content', 'active-settings');
                button.setAttribute('aria-selected', button.dataset.tab === tabId ? 'true' : 'false');
                if (button.dataset.tab === tabId && button.dataset.ac) {
                    button.classList.add(button.dataset.ac);
                }
            });
        }

        setPanelVisibility(panelDesign, tabId === 'tab-design');
        setPanelVisibility(panelElements, tabId === 'tab-content');
        setPanelVisibility(settingsPanel, tabId === 'tab-settings');

        document.dispatchEvent(new global.CustomEvent('editor:tabchange', {
            detail: { tabId: tabId }
        }));
    }

    function setPanelVisibility(panel, visible) {
        if (!panel) return;
        panel.hidden = !visible;
        panel.style.display = visible ? '' : 'none';
        panel.setAttribute('aria-hidden', visible ? 'false' : 'true');
    }

    function createButton(options) {
        return '<button type="button" class="' + options.className + '" data-editor-command="' + options.command + '">' +
            '<i class="fas ' + options.icon + ' ' + (options.iconClass || '') + '"></i>' +
            '<span>' + options.label + '</span>' +
        '</button>';
    }

    function buildSettingsPanel(panelDesign) {
        if (document.getElementById('tb-settings-panel')) return;

        var panel = document.createElement('aside');
        panel.id = 'tb-settings-panel';
        panel.className = 'tb-settings-panel';
        panel.hidden = true;
        panel.setAttribute('aria-label', isAr ? 'إعدادات المحرر' : 'Editor settings');

        panel.innerHTML =
            section('tbs-tone-blue', 'fa-language', isAr ? 'اللغة والمظهر' : 'Language & theme',
                settingsRow(
                    isAr ? 'لغة البطاقة' : 'Card language',
                    createButton({
                        className: 'tbs-btn',
                        command: 'language.toggle',
                        icon: 'fa-language',
                        label: 'AR / EN'
                    })
                ) +
                settingsRow(
                    isAr ? 'وضع الإضاءة' : 'Theme mode',
                    createButton({
                        className: 'tbs-btn',
                        command: 'theme.toggle',
                        icon: 'fa-circle-half-stroke',
                        label: isAr ? 'تبديل' : 'Toggle'
                    })
                )
            ) +
            section('tbs-tone-purple', 'fa-qrcode', isAr ? 'حجم QR' : 'QR size',
                '<label class="tbs-range-label" for="tbs-qr-size">' +
                    '<span>' + (isAr ? 'حجم صندوق QR داخل البطاقة' : 'QR box size on card') + '</span>' +
                    '<output id="tbs-qr-size-output" for="tbs-qr-size">30</output>' +
                '</label>' +
                '<input id="tbs-qr-size" class="tbs-range" type="range" min="15" max="55" value="30" ' +
                    'data-editor-command-input="qr.resize" aria-describedby="tbs-qr-size-output">'
            ) +
            section('tbs-tone-green', 'fa-share-nodes', isAr ? 'المشاركة والنشر' : 'Share and publish',
                createButton({
                    className: 'tbs-full-btn',
                    command: 'gallery.save',
                    icon: 'fa-bookmark',
                    iconClass: 'tbs-icon-gold',
                    label: isAr ? 'حفظ في المعرض' : 'Save to gallery'
                }) +
                createButton({
                    className: 'tbs-full-btn',
                    command: 'editor.share',
                    icon: 'fa-link',
                    iconClass: 'tbs-icon-blue',
                    label: isAr ? 'نسخ رابط المحرر' : 'Copy editor link'
                }) +
                createButton({
                    className: 'tbs-full-btn',
                    command: 'collaboration.start',
                    icon: 'fa-users',
                    iconClass: 'tbs-icon-purple',
                    label: isAr ? 'تحرير جماعي' : 'Collaborative edit'
                })
            ) +
            '<section class="tbs-section tbs-danger-section">' +
                '<h3 class="tbs-title"><i class="fas fa-triangle-exclamation"></i>' +
                    '<span>' + (isAr ? 'منطقة الخطر' : 'Danger zone') + '</span>' +
                '</h3>' +
                createButton({
                    className: 'tbs-full-btn tbs-danger-btn',
                    command: 'design.reset',
                    icon: 'fa-trash-alt',
                    label: isAr ? 'إعادة تعيين التصميم' : 'Reset design'
                }) +
            '</section>';

        var range = panel.querySelector('#tbs-qr-size');
        var output = panel.querySelector('#tbs-qr-size-output');
        if (range && output) {
            range.addEventListener('input', function () {
                output.value = range.value;
                output.textContent = range.value;
            });
        }

        injectSettingsCSS();

        var layout = panelDesign.parentElement;
        if (layout) layout.insertBefore(panel, panelDesign);
        else document.body.appendChild(panel);
    }

    function section(toneClass, icon, title, body) {
        return '<section class="tbs-section ' + toneClass + '">' +
            '<h3 class="tbs-title"><i class="fas ' + icon + '"></i><span>' + title + '</span></h3>' +
            body +
        '</section>';
    }

    function settingsRow(label, control) {
        return '<div class="tbs-row"><span>' + label + '</span>' + control + '</div>';
    }

    function injectSettingsCSS() {
        if (document.getElementById('tbs-css')) return;

        var style = document.createElement('style');
        style.id = 'tbs-css';
        style.textContent = [
            '.tb-settings-panel{display:none;overflow-y:auto;height:100%;padding:20px;background:var(--form-bg,#0d1b2e);border-inline-end:1px solid var(--accent-secondary,rgba(77,166,255,.15));box-sizing:border-box;}',
            '.tbs-section{--tbs-tone:#4da6ff;background:rgba(255,255,255,.03);border:1px solid rgba(255,255,255,.07);border-radius:12px;padding:14px;margin-bottom:12px;}',
            '.tbs-tone-purple{--tbs-tone:#a855f7}.tbs-tone-green{--tbs-tone:#2ecc71}',
            '.tbs-title{font-size:.82rem;font-weight:700;color:var(--text-primary);margin:0 0 12px;display:flex;align-items:center;gap:7px;}',
            '.tbs-title i{color:var(--tbs-tone)}',
            '.tbs-row{display:flex;align-items:center;justify-content:space-between;gap:12px;font-size:.8rem;color:var(--text-primary);margin-bottom:8px;}',
            '.tbs-btn,.tbs-full-btn{border-radius:9px;background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.1);color:var(--text-primary);font-family:inherit;cursor:pointer;transition:transform .3s cubic-bezier(.22,1,.36,1),background .3s;}',
            '.tbs-btn{padding:5px 11px;font-size:.75rem;display:inline-flex;align-items:center;gap:6px;}',
            '.tbs-full-btn{width:100%;padding:9px 12px;font-size:.82rem;text-align:start;display:flex;align-items:center;gap:8px;margin-bottom:7px;}',
            '.tbs-btn:hover,.tbs-full-btn:hover{background:rgba(255,255,255,.1);transform:translateY(-1px)}',
            '.tbs-btn:focus-visible,.tbs-full-btn:focus-visible,.tbs-range:focus-visible{outline:2px solid var(--accent-primary,#4da6ff);outline-offset:2px}',
            '.tbs-btn:active,.tbs-full-btn:active{transform:scale(.98)}',
            '.tbs-range-label{display:flex;justify-content:space-between;gap:10px;font-size:.72rem;color:var(--text-secondary);margin-bottom:6px}',
            '.tbs-range{width:100%;accent-color:var(--tbs-tone)}',
            '.tbs-icon-gold{color:#f1c40f}.tbs-icon-blue{color:#4da6ff}.tbs-icon-purple{color:#a855f7}',
            '.tbs-danger-section{--tbs-tone:#e74c3c;border-color:rgba(231,76,60,.25)}',
            '.tbs-danger-btn{background:rgba(231,76,60,.08)!important;border-color:rgba(231,76,60,.3)!important;color:#e74c3c!important}',
            '@media (prefers-reduced-motion:reduce){.tbs-btn,.tbs-full-btn{transition:none}}'
        ].join('');
        document.head.appendChild(style);
    }

    function auditDuplicateIds() {
        var groups = Object.create(null);
        document.querySelectorAll('[id]').forEach(function (element) {
            if (!groups[element.id]) groups[element.id] = [];
            groups[element.id].push(element);
        });

        var duplicates = Object.keys(groups).filter(function (id) {
            return groups[id].length > 1;
        });

        document.documentElement.dataset.editorDuplicateIdCount = String(duplicates.length);
        if (duplicates.length) {
            console.warn('[EditorShell] Duplicate ids detected:', duplicates);
            document.dispatchEvent(new global.CustomEvent('editor:duplicateids', {
                detail: { ids: duplicates }
            }));
        }
        return duplicates;
    }

    function installTabBindings(pillNav) {
        pillNav.querySelectorAll('.tb-tab').forEach(function (button) {
            button.setAttribute('role', 'tab');
            button.addEventListener('click', function () {
                activateTab(button.dataset.tab);
            });
        });

        document.addEventListener('keydown', function (event) {
            var activeElement = document.activeElement || {};
            var tag = activeElement.tagName;
            if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || activeElement.isContentEditable) return;
            if (event.altKey || event.ctrlKey || event.metaKey) return;

            if (event.key === '1') activateTab('tab-design');
            if (event.key === '2') activateTab('tab-content');
            if (event.key === '3') activateTab('tab-settings');
        });
    }

    function init() {
        var panelDesign = document.getElementById('panel-design');
        var panelElements = document.getElementById('panel-elements');
        var pillNav = document.getElementById('tb-pill-nav');

        if (!panelDesign || !panelElements || !pillNav) {
            global.setTimeout(init, 250);
            return;
        }

        buildSettingsPanel(panelDesign);
        bindExistingCommandTriggers();
        installTabBindings(pillNav);
        auditDuplicateIds();
        activateTab('tab-design');
    }

    installDefaultCommands();
    installCommandDelegation();

    global.EditorCommands = {
        register: registerCommand,
        execute: executeCommand,
        has: function (name) { return typeof commandHandlers[name] === 'function'; },
        list: function () { return Object.keys(commandHandlers); }
    };
    global.EditorTabs = { activate: activateTab };

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', function () {
            global.setTimeout(init, 0);
        }, { once: true });
    } else {
        global.setTimeout(init, 0);
    }
}(typeof window !== 'undefined' ? window : globalThis));
