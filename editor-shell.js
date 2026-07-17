(function initializeEditorShell(global) {
    'use strict';

    const document = global.document;
    if (!document || global.EditorShell) return;

    const commands = new Map();
    const menus = new Map();
    let initialized = false;
    const isEnglish = document.documentElement.lang === 'en';
    const statusLabels = {
        idle: isEnglish ? 'Ready' : 'جاهز',
        loading: isEnglish ? 'Working…' : 'جاري التنفيذ…',
        saving: isEnglish ? 'Saving…' : 'جاري الحفظ…',
        saved: isEnglish ? 'Saved' : 'محفوظ',
        success: isEnglish ? 'Done' : 'تم بنجاح',
        error: isEnglish ? 'Something went wrong' : 'حدث خطأ'
    };

    function emit(name, detail) {
        document.dispatchEvent(new global.CustomEvent(name, { detail }));
    }

    function getStatusElements() {
        return {
            root: document.getElementById('autosave-indicator'),
            text: document.getElementById('autosave-status')
        };
    }

    function setStatus(state, message) {
        const normalizedState = statusLabels[state] ? state : 'idle';
        const elements = getStatusElements();
        const label = message || statusLabels[normalizedState];

        if (elements.root) {
            elements.root.dataset.uiState = normalizedState;
            elements.root.classList.toggle('saving', normalizedState === 'saving' || normalizedState === 'loading');
            elements.root.classList.toggle('saved', normalizedState === 'saved' || normalizedState === 'success');
            elements.root.classList.toggle('error', normalizedState === 'error');
            elements.root.setAttribute('aria-busy', normalizedState === 'saving' || normalizedState === 'loading' ? 'true' : 'false');

            const icon = elements.root.querySelector('i');
            if (icon) {
                icon.className = normalizedState === 'error'
                    ? 'fas fa-circle-exclamation'
                    : normalizedState === 'saving' || normalizedState === 'loading'
                        ? 'fas fa-circle-notch'
                        : 'fas fa-cloud-check';
            }
        }

        if (elements.text) elements.text.textContent = label;
        emit('editor:statuschange', { state: normalizedState, message: label });
        return normalizedState;
    }

    function register(name, handler, options) {
        if (!name || typeof handler !== 'function') {
            throw new TypeError('Editor command requires a name and handler');
        }

        commands.set(name, { handler, options: options || {} });
        emit('editor:commandregistered', { name });
        return name;
    }

    function setTriggerState(trigger, state) {
        if (!trigger) return;
        if (state === 'idle') {
            trigger.removeAttribute('aria-busy');
            delete trigger.dataset.commandState;
            return;
        }
        trigger.dataset.commandState = state;
        trigger.setAttribute('aria-busy', state === 'loading' ? 'true' : 'false');
    }

    async function execute(name, context) {
        const command = commands.get(name);
        const commandContext = context || {};
        const trigger = commandContext.trigger || null;

        if (!command) {
            console.warn('[EditorCommands] Unknown command:', name);
            setStatus('error', isEnglish ? 'Action is unavailable' : 'الإجراء غير متاح');
            emit('editor:commanderror', { name, error: new Error('Unknown command') });
            return false;
        }

        if (trigger && (trigger.disabled || trigger.getAttribute('aria-disabled') === 'true')) return false;

        setTriggerState(trigger, 'loading');
        emit('editor:commandstart', { name, context: commandContext });

        try {
            const result = await command.handler(commandContext);
            setTriggerState(trigger, result === false ? 'error' : 'success');
            emit('editor:commandsuccess', { name, context: commandContext, result });
            global.setTimeout(() => setTriggerState(trigger, 'idle'), 900);
            return result !== false;
        } catch (error) {
            console.error('[EditorCommands] Command failed:', name, error);
            setTriggerState(trigger, 'error');
            setStatus('error', error && error.message ? error.message : statusLabels.error);
            emit('editor:commanderror', { name, context: commandContext, error });
            global.setTimeout(() => setTriggerState(trigger, 'idle'), 1600);
            return false;
        }
    }

    function clickElement(id) {
        const element = document.getElementById(id);
        if (!element || typeof element.click !== 'function' || element.disabled) return false;
        element.click();
        return true;
    }

    function registerCoreCommands() {
        const clickCommands = {
            'history.undo': 'undo-btn',
            'history.redo': 'redo-btn',
            'preview.open': 'preview-mode-btn',
            'design.save-share': 'save-share-btn',
            'design.reset': 'reset-design-btn',
            'gallery.save': 'save-to-gallery-btn',
            'gallery.open': 'show-gallery-btn',
            'editor.share': 'share-editor-btn',
            'collaboration.start': 'start-collab-btn',
            'theme.toggle': 'theme-toggle-btn',
            'export.png.front': 'download-png-front',
            'export.png.back': 'download-png-back',
            'export.pdf': 'download-pdf',
            'export.vcf': 'download-vcf',
            'export.qr': 'download-qrcode',
            'card.flip': 'flip-card-btn-mobile'
        };

        Object.entries(clickCommands).forEach(([name, id]) => {
            register(name, () => clickElement(id));
        });

        register('cloud.save', (context) => {
            if (global.MobileUtils && typeof global.MobileUtils.handleMobileSave === 'function') {
                return global.MobileUtils.handleMobileSave(context.trigger);
            }
            return clickElement('save-share-btn');
        });

        register('card.share', (context) => {
            if (global.MobileUtils && typeof global.MobileUtils.handleMobileShare === 'function') {
                return global.MobileUtils.handleMobileShare(context.trigger);
            }
            return clickElement('share-editor-btn');
        });
    }

    function closeMenu(menu, restoreFocus) {
        if (!menu || !menu.open) return;
        menu.open = false;
        menu.trigger.setAttribute('aria-expanded', 'false');
        menu.element.hidden = true;
        menu.element.dataset.open = 'false';
        menu.element.classList.remove('show', 'open');
        if (menu.wrapper) menu.wrapper.classList.remove('open', 'active');
        if (restoreFocus) menu.trigger.focus();
    }

    function closeAllMenus(exceptId, restoreFocus) {
        menus.forEach((menu, id) => {
            if (id !== exceptId) closeMenu(menu, restoreFocus);
        });
    }

    function openMenu(menu) {
        if (!menu) return;
        closeAllMenus(menu.id, false);
        menu.open = true;
        menu.trigger.setAttribute('aria-expanded', 'true');
        menu.element.hidden = false;
        menu.element.dataset.open = 'true';
        menu.element.classList.add('show', 'open');
        if (menu.wrapper) menu.wrapper.classList.add('open', 'active');
    }

    function toggleMenu(id) {
        const menu = menus.get(id);
        if (!menu) return false;
        if (menu.open) closeMenu(menu, false);
        else openMenu(menu);
        return true;
    }

    function registerMenu(triggerId, menuId, wrapperSelector) {
        const trigger = document.getElementById(triggerId);
        const element = document.getElementById(menuId);
        if (!trigger || !element) return false;

        const menu = {
            id: menuId,
            trigger,
            element,
            wrapper: wrapperSelector ? trigger.closest(wrapperSelector) : trigger.parentElement,
            open: false
        };

        trigger.setAttribute('aria-haspopup', 'menu');
        trigger.setAttribute('aria-controls', menuId);
        trigger.setAttribute('aria-expanded', 'false');
        element.setAttribute('role', 'menu');
        element.hidden = true;
        element.dataset.open = 'false';
        element.querySelectorAll('button, a').forEach((item) => {
            if (!item.getAttribute('role')) item.setAttribute('role', 'menuitem');
        });
        menus.set(menuId, menu);
        return true;
    }

    function getMenuItems(menu) {
        return Array.from(menu.element.querySelectorAll('[role="menuitem"]'))
            .filter((item) => !item.hidden && !item.disabled && item.getAttribute('aria-disabled') !== 'true');
    }

    function onDocumentClick(event) {
        const menuTrigger = Array.from(menus.values()).find((menu) => menu.trigger.contains(event.target));
        if (menuTrigger) {
            event.preventDefault();
            event.stopImmediatePropagation();
            toggleMenu(menuTrigger.id);
            return;
        }

        const commandTrigger = event.target.closest && event.target.closest('[data-editor-command]');
        if (commandTrigger) {
            event.preventDefault();
            event.stopImmediatePropagation();
            const name = commandTrigger.dataset.editorCommand;
            closeAllMenus(null, false);
            void execute(name, { trigger: commandTrigger, event });
            return;
        }

        const containingMenu = Array.from(menus.values()).find((menu) => menu.element.contains(event.target));
        if (containingMenu && event.target.closest('a, button')) closeMenu(containingMenu, false);
        else if (!containingMenu) closeAllMenus(null, false);
    }

    function onDocumentKeydown(event) {
        const editable = event.target && event.target.matches && event.target.matches('input, textarea, select, [contenteditable="true"]');

        if (event.key === 'Escape') {
            closeAllMenus(null, true);
            return;
        }

        const activeMenu = Array.from(menus.values()).find((menu) => menu.open && menu.element.contains(event.target));
        if (activeMenu && ['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) {
            const items = getMenuItems(activeMenu);
            if (!items.length) return;
            event.preventDefault();
            const current = items.indexOf(document.activeElement);
            const next = event.key === 'Home'
                ? 0
                : event.key === 'End'
                    ? items.length - 1
                    : event.key === 'ArrowDown'
                        ? (current + 1) % items.length
                        : (current <= 0 ? items.length : current) - 1;
            items[next].focus();
            return;
        }

        const menu = Array.from(menus.values()).find((candidate) => candidate.trigger === event.target);
        if (menu && ['ArrowDown', 'Enter', ' '].includes(event.key)) {
            event.preventDefault();
            openMenu(menu);
            const firstItem = getMenuItems(menu)[0];
            if (firstItem) firstItem.focus();
            return;
        }

        if (editable || !(event.ctrlKey || event.metaKey)) return;

        const key = event.key.toLowerCase();
        let commandName = null;
        if (key === 'z') commandName = event.shiftKey ? 'history.redo' : 'history.undo';
        if (key === 'y') commandName = 'history.redo';
        if (key === 's') commandName = 'design.save-share';
        if (key === 'g') commandName = 'gallery.open';

        if (commandName) {
            event.preventDefault();
            void execute(commandName, { event, source: 'keyboard' });
        }
    }

    function auditDuplicateIds() {
        const counts = new Map();
        document.querySelectorAll('[id]').forEach((element) => {
            counts.set(element.id, (counts.get(element.id) || 0) + 1);
        });
        const duplicates = Array.from(counts.entries())
            .filter((entry) => entry[1] > 1)
            .map((entry) => entry[0]);

        document.documentElement.dataset.editorDuplicateIdCount = String(duplicates.length);
        if (duplicates.length) console.error('[EditorShell] Duplicate IDs:', duplicates);
        emit('editor:idaudit', { duplicates });
        return duplicates;
    }

    function syncMobileNavigation() {
        const buttons = document.querySelectorAll('.mobile-nav-item[data-target]');
        buttons.forEach((button) => {
            const panelId = button.dataset.target;
            button.setAttribute('aria-controls', panelId);
            button.setAttribute('aria-selected', button.classList.contains('active') ? 'true' : 'false');
            button.setAttribute('role', 'tab');
        });

        document.addEventListener('click', (event) => {
            const button = event.target.closest && event.target.closest('.mobile-nav-item[data-target]');
            if (!button) return;
            buttons.forEach((item) => item.setAttribute('aria-selected', item === button ? 'true' : 'false'));
        });
    }

    function initializeLocalizedFields() {
        if (!isEnglish) return;
        global.setTimeout(() => {
            const localizedDefaults = [
                ['input-name_ar', 'Your Full Name Here', 'اسمك الكامل هنا'],
                ['input-tagline_ar', 'Job Title / Company', 'المسمى الوظيفي / الشركة']
            ];

            localizedDefaults.forEach(([id, englishValue, legacyValue]) => {
                const input = document.getElementById(id);
                if (!input) return;
                input.placeholder = englishValue;
                if (!input.value || input.value === legacyValue) input.value = englishValue;
            });
        }, 100);
    }

    function initializeThemeToggle() {
        const button = document.getElementById('theme-toggle-btn');
        if (!button || button.dataset.editorThemeReady === 'true') return;
        const icon = button.querySelector('i');
        const root = document.documentElement;

        function render(theme) {
            const light = theme === 'light';
            root.toggleAttribute('data-theme', light);
            if (light) root.setAttribute('data-theme', 'light');
            if (icon) icon.className = light ? 'fas fa-moon' : 'fas fa-sun';
            button.setAttribute('aria-pressed', light ? 'true' : 'false');
        }

        let savedTheme = 'dark';
        try { savedTheme = global.localStorage?.getItem('theme') || 'dark'; } catch (_error) { /* optional storage */ }
        render(savedTheme);
        button.dataset.editorThemeReady = 'true';
        button.addEventListener('click', () => {
            const next = root.getAttribute('data-theme') === 'light' ? 'dark' : 'light';
            try { global.localStorage?.setItem('theme', next); } catch (_error) { /* optional storage */ }
            render(next);
        });
    }

    function initialize() {
        if (initialized) return;
        initialized = true;
        registerCoreCommands();
        registerMenu('tools-menu-btn', 'tools-dropdown-menu', '.tb-dropdown-wrap');
        registerMenu('download-options-btn', 'download-menu', '.tb-dropdown-wrap');
        registerMenu('toolbar-more-btn', 'toolbar-more-menu-floating', '.toolbar-more-container');
        syncMobileNavigation();
        initializeLocalizedFields();
        initializeThemeToggle();
        const year = document.getElementById('editor-footer-year');
        if (year) year.textContent = String(new Date().getFullYear());
        document.querySelectorAll('details.fieldset-accordion').forEach((details) => {
            details.removeAttribute('open');
        });
        auditDuplicateIds();
        setStatus('saved');

        global.updateAutoSaveIndicator = (state) => setStatus(state);
        document.documentElement.dataset.editorShell = 'ready';
        emit('editor:shellready', { commands: Array.from(commands.keys()) });
    }

    global.EditorCommands = {
        register,
        execute,
        has: (name) => commands.has(name),
        list: () => Array.from(commands.keys())
    };
    global.EditorUIState = { set: setStatus, labels: { ...statusLabels } };
    global.EditorShell = {
        init: initialize,
        auditDuplicateIds,
        closeMenus: () => closeAllMenus(null, false)
    };

    document.addEventListener('click', onDocumentClick, true);
    document.addEventListener('keydown', onDocumentKeydown, true);

    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initialize, { once: true });
    else initialize();
}(typeof window !== 'undefined' ? window : globalThis));
