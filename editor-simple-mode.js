/**
 * MC PRIME NFC — Simple Editor Mode v1.2
 * Keeps one compact mode switch in the main toolbar and shows task navigation only in simple mode.
 */
(function (global) {
    'use strict';

    var document = global.document;
    if (!document || global.EditorSimpleMode) return;

    var STORAGE_KEY = 'mcprime-editor-mode-v1';
    var isAr = document.documentElement.lang !== 'en';
    var activeMode = 'simple';
    var toolbar = null;
    var modeControl = null;

    var tasks = [
        { id: 'details', icon: 'fa-address-card', ar: 'البيانات', en: 'Details', tab: 'tab-content', targets: ['personal-info-fieldset', 'contact-info-fieldset', 'panel-elements'] },
        { id: 'media', icon: 'fa-images', ar: 'الصور', en: 'Images', tab: 'tab-design', targets: ['logo-controls-fieldset', 'photo-controls-fieldset', 'image-controls-fieldset'] },
        { id: 'style', icon: 'fa-palette', ar: 'التصميم', en: 'Design', tab: 'tab-design', targets: ['colors-fieldset', 'background-controls-fieldset', 'design-controls-fieldset', 'panel-design'] },
        { id: 'preview', icon: 'fa-eye', ar: 'المعاينة', en: 'Preview', command: 'preview.open', targets: ['preview-btn', 'preview-mode-btn', 'mobile-preview-btn'] },
        { id: 'publish', icon: 'fa-paper-plane', ar: 'النشر', en: 'Publish', command: 'editor.save-share', targets: ['save-share-btn', 'share-editor-btn'] }
    ];

    function text(task) { return isAr ? task.ar : task.en; }

    function readMode() {
        try { return global.localStorage.getItem(STORAGE_KEY) || 'simple'; }
        catch (error) { return 'simple'; }
    }

    function writeMode(mode) {
        try { global.localStorage.setItem(STORAGE_KEY, mode); }
        catch (error) { /* local storage is optional */ }
    }

    function buildTaskBar() {
        if (toolbar) return toolbar;
        toolbar = document.createElement('nav');
        toolbar.id = 'editor-simple-toolbar';
        toolbar.className = 'est-toolbar';
        toolbar.setAttribute('aria-label', isAr ? 'خطوات إنشاء البطاقة' : 'Card creation steps');
        toolbar.innerHTML = '<div class="est-tasks">' + tasks.map(function (task, index) {
            return '<button type="button" class="est-task" data-simple-task="' + task.id + '">' +
                '<span class="est-step">' + (index + 1) + '</span><i class="fas ' + task.icon + '"></i><span>' + text(task) + '</span></button>';
        }).join('') + '</div>';
        document.body.appendChild(toolbar);
        toolbar.addEventListener('click', function (event) {
            var taskButton = event.target.closest('[data-simple-task]');
            if (taskButton) runTask(taskButton.dataset.simpleTask);
        });
        injectStyles();
        return toolbar;
    }

    function buildModeControl() {
        if (modeControl) return modeControl;
        var host = document.querySelector('.tb-zone.tb-center') || document.querySelector('.pro-toolbar');
        if (!host) return null;
        modeControl = document.createElement('div');
        modeControl.id = 'editor-mode-control';
        modeControl.className = 'emc-control';
        modeControl.setAttribute('role', 'group');
        modeControl.setAttribute('aria-label', isAr ? 'وضع المحرر' : 'Editor mode');
        modeControl.innerHTML =
            '<button type="button" data-editor-mode-value="simple"><i class="fas fa-wand-magic-sparkles"></i><span>' + (isAr ? 'مبسّط' : 'Simple') + '</span></button>' +
            '<button type="button" data-editor-mode-value="advanced"><i class="fas fa-sliders"></i><span>' + (isAr ? 'متقدم' : 'Advanced') + '</span></button>';
        host.appendChild(modeControl);
        modeControl.addEventListener('click', function (event) {
            var button = event.target.closest('[data-editor-mode-value]');
            if (button) setMode(button.dataset.editorModeValue);
        });
        injectStyles();
        return modeControl;
    }

    function findTarget(ids) {
        return ids.map(function (id) { return document.getElementById(id); }).find(Boolean) || null;
    }

    function clickFirst(ids) {
        var target = findTarget(ids);
        if (!target || typeof target.click !== 'function') return false;
        target.click();
        return true;
    }

    function openControls(task) {
        if (task.tab && global.EditorTabs && typeof global.EditorTabs.activate === 'function') global.EditorTabs.activate(task.tab);
        var target = findTarget(task.targets || []);
        if (!target) return false;
        if (target.tagName === 'DETAILS') target.open = true;
        target.hidden = false;
        target.style.display = '';
        if (target.scrollIntoView) target.scrollIntoView({ behavior: 'smooth', block: 'start' });
        target.classList.add('est-highlight');
        global.setTimeout(function () { target.classList.remove('est-highlight'); }, 900);
        return true;
    }

    function runTask(taskId) {
        var task = tasks.find(function (entry) { return entry.id === taskId; });
        if (!task) return false;
        buildTaskBar().querySelectorAll('.est-task').forEach(function (button) {
            button.classList.toggle('is-active', button.dataset.simpleTask === taskId);
        });
        var result;
        if (task.command && global.EditorCommands && global.EditorCommands.has && global.EditorCommands.has(task.command)) {
            result = global.EditorCommands.execute(task.command, { source: 'simple-mode' });
        } else if (task.command) {
            result = clickFirst(task.targets || []);
        } else {
            result = openControls(task);
        }
        document.dispatchEvent(new global.CustomEvent('editor:simpletask', { detail: { task: taskId, success: Boolean(result) } }));
        return Boolean(result);
    }

    function syncModeUI() {
        buildTaskBar();
        buildModeControl();
        document.documentElement.dataset.editorMode = activeMode;
        toolbar.hidden = activeMode !== 'simple';
        toolbar.setAttribute('aria-hidden', activeMode === 'simple' ? 'false' : 'true');
        if (modeControl) {
            modeControl.querySelectorAll('[data-editor-mode-value]').forEach(function (button) {
                var selected = button.dataset.editorModeValue === activeMode;
                button.classList.toggle('is-active', selected);
                button.setAttribute('aria-pressed', selected ? 'true' : 'false');
            });
        }
        document.dispatchEvent(new global.CustomEvent('editor:modechange', { detail: { mode: activeMode } }));
    }

    function setMode(mode) {
        activeMode = mode === 'advanced' ? 'advanced' : 'simple';
        writeMode(activeMode);
        syncModeUI();
        return activeMode;
    }

    function toggleMode() { return setMode(activeMode === 'simple' ? 'advanced' : 'simple'); }

    function injectStyles() {
        if (document.getElementById('editor-simple-mode-css')) return;
        var style = document.createElement('style');
        style.id = 'editor-simple-mode-css';
        style.textContent = [
            '.emc-control{display:inline-flex;align-items:center;padding:3px;border:1px solid rgba(255,255,255,.1);border-radius:10px;background:rgba(255,255,255,.035)}',
            '.emc-control button{display:flex;align-items:center;gap:5px;padding:6px 9px;border:0;border-radius:7px;background:transparent;color:var(--text-secondary,#aebcd0);font:inherit;font-size:.68rem;cursor:pointer}',
            '.emc-control button.is-active{background:var(--accent-primary,#4da6ff);color:#07111f;font-weight:700;box-shadow:0 3px 10px rgba(77,166,255,.2)}',
            '.est-toolbar{position:fixed;left:50%;bottom:16px;transform:translateX(-50%);z-index:100020;width:min(720px,calc(100% - 28px));padding:7px;border:1px solid rgba(255,255,255,.1);border-radius:15px;background:rgba(9,20,35,.94);backdrop-filter:blur(16px);box-shadow:0 16px 42px rgba(0,0,0,.38);color:var(--text-primary,#fff)}',
            '.est-toolbar[hidden]{display:none!important}.est-tasks{display:grid;grid-template-columns:repeat(5,1fr);gap:5px}',
            '.est-task{position:relative;display:flex;align-items:center;justify-content:center;gap:6px;min-height:40px;padding:7px 8px;border:1px solid transparent;border-radius:10px;background:transparent;color:inherit;font:inherit;font-size:.72rem;cursor:pointer}',
            '.est-task:hover,.est-task.is-active{background:rgba(77,166,255,.11);border-color:rgba(77,166,255,.23);color:#79bdff}.est-step{display:grid;place-items:center;width:18px;height:18px;border-radius:50%;background:rgba(255,255,255,.08);font-size:.58rem}',
            'html[data-editor-mode="simple"] #editor-layers-panel,html[data-editor-mode="simple"] #editor-context-inspector{display:none!important}html[data-editor-mode="simple"] .pro-layout{padding-bottom:76px}',
            '.est-highlight{animation:estPulse .45s ease 2}@keyframes estPulse{50%{box-shadow:0 0 0 4px rgba(77,166,255,.22)}}',
            '@media(max-width:760px){.emc-control button{padding:6px}.emc-control button span{display:none}.est-toolbar{bottom:7px;width:calc(100% - 14px);padding:5px}.est-task{flex-direction:column;gap:2px;min-height:48px;padding:5px 2px;font-size:.58rem}.est-step{display:none}}',
            '@media(prefers-reduced-motion:reduce){.est-task{transition:none}}'
        ].join('');
        document.head.appendChild(style);
    }

    function init() {
        buildTaskBar();
        buildModeControl();
        activeMode = readMode();
        syncModeUI();
    }

    global.EditorSimpleMode = {
        setMode: setMode,
        toggleMode: toggleMode,
        getMode: function () { return activeMode; },
        runTask: runTask,
        tasks: tasks.slice()
    };

    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true });
    else init();
}(typeof window !== 'undefined' ? window : globalThis));