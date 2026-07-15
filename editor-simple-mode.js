/**
 * MC PRIME NFC — Simple Editor Mode v1.0
 * Provides a task-oriented shell while preserving all existing editor controls.
 */
(function (global) {
    'use strict';

    var document = global.document;
    if (!document || global.EditorSimpleMode) return;

    var STORAGE_KEY = 'mcprime-editor-mode-v1';
    var isAr = document.documentElement.lang !== 'en';
    var activeMode = 'simple';
    var toolbar = null;

    var tasks = [
        { id: 'details', icon: 'fa-address-card', ar: 'البيانات', en: 'Details', tab: 'tab-content', targets: ['personal-info-fieldset', 'contact-info-fieldset', 'panel-elements'] },
        { id: 'media', icon: 'fa-images', ar: 'الصور', en: 'Images', tab: 'tab-design', targets: ['logo-controls-fieldset', 'photo-controls-fieldset', 'image-controls-fieldset'] },
        { id: 'style', icon: 'fa-palette', ar: 'الألوان', en: 'Style', tab: 'tab-design', targets: ['colors-fieldset', 'background-controls-fieldset', 'design-controls-fieldset', 'panel-design'] },
        { id: 'preview', icon: 'fa-eye', ar: 'معاينة', en: 'Preview', command: 'preview.open', targets: ['preview-btn', 'preview-mode-btn', 'mobile-preview-btn'] },
        { id: 'publish', icon: 'fa-paper-plane', ar: 'نشر', en: 'Publish', command: 'editor.save-share', targets: ['save-share-btn', 'share-editor-btn'] }
    ];

    function text(task) { return isAr ? task.ar : task.en; }

    function readMode() {
        try { return global.localStorage.getItem(STORAGE_KEY) || 'simple'; }
        catch (error) { return 'simple'; }
    }

    function writeMode(mode) {
        try { global.localStorage.setItem(STORAGE_KEY, mode); }
        catch (error) { /* storage is optional */ }
    }

    function build() {
        if (toolbar) return toolbar;
        toolbar = document.createElement('nav');
        toolbar.id = 'editor-simple-toolbar';
        toolbar.className = 'est-toolbar';
        toolbar.setAttribute('aria-label', isAr ? 'مهام المحرر المبسط' : 'Simple editor tasks');
        toolbar.innerHTML =
            '<div class="est-brand"><i class="fas fa-wand-magic-sparkles"></i><div><strong>' + (isAr ? 'الوضع المبسط' : 'Simple mode') + '</strong><span>' + (isAr ? 'أنشئ بطاقتك خطوة بخطوة' : 'Build your card step by step') + '</span></div></div>' +
            '<div class="est-tasks">' + tasks.map(function (task) {
                return '<button type="button" class="est-task" data-simple-task="' + task.id + '"><i class="fas ' + task.icon + '"></i><span>' + text(task) + '</span></button>';
            }).join('') + '</div>' +
            '<button type="button" id="est-mode-toggle" class="est-mode-toggle"><i class="fas fa-sliders"></i><span></span></button>';
        document.body.appendChild(toolbar);
        toolbar.addEventListener('click', function (event) {
            var taskButton = event.target.closest('[data-simple-task]');
            if (taskButton) runTask(taskButton.dataset.simpleTask);
            if (event.target.closest('#est-mode-toggle')) setMode(activeMode === 'simple' ? 'advanced' : 'simple');
        });
        injectStyles();
        return toolbar;
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
        global.setTimeout(function () { target.classList.remove('est-highlight'); }, 1400);
        return true;
    }

    function runTask(taskId) {
        var task = tasks.find(function (entry) { return entry.id === taskId; });
        if (!task) return false;
        toolbar.querySelectorAll('.est-task').forEach(function (button) {
            button.classList.toggle('is-active', button.dataset.simpleTask === taskId);
        });
        var result = false;
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
        build();
        document.documentElement.dataset.editorMode = activeMode;
        toolbar.classList.toggle('is-advanced', activeMode === 'advanced');
        var label = toolbar.querySelector('#est-mode-toggle span');
        label.textContent = activeMode === 'simple' ? (isAr ? 'الوضع المتقدم' : 'Advanced mode') : (isAr ? 'العودة للمبسط' : 'Back to simple');
        document.dispatchEvent(new global.CustomEvent('editor:modechange', { detail: { mode: activeMode } }));
    }

    function setMode(mode) {
        activeMode = mode === 'advanced' ? 'advanced' : 'simple';
        writeMode(activeMode);
        syncModeUI();
        return activeMode;
    }

    function injectStyles() {
        if (document.getElementById('editor-simple-mode-css')) return;
        var style = document.createElement('style');
        style.id = 'editor-simple-mode-css';
        style.textContent = [
            '.est-toolbar{position:fixed;left:50%;bottom:18px;transform:translateX(-50%);z-index:100020;width:min(960px,calc(100% - 28px));display:grid;grid-template-columns:auto 1fr auto;align-items:center;gap:14px;padding:10px 12px;border:1px solid rgba(77,166,255,.22);border-radius:16px;background:rgba(10,24,42,.94);backdrop-filter:blur(16px);box-shadow:0 20px 60px rgba(0,0,0,.45);color:var(--text-primary,#fff)}',
            '.est-brand{display:flex;align-items:center;gap:9px;min-width:160px}.est-brand>i{color:var(--accent-primary,#4da6ff)}.est-brand strong,.est-brand span{display:block}.est-brand strong{font-size:.78rem}.est-brand span{font-size:.62rem;color:var(--text-secondary,#9fb0c5);margin-top:2px}',
            '.est-tasks{display:grid;grid-template-columns:repeat(5,1fr);gap:6px}.est-task,.est-mode-toggle{border:1px solid transparent;background:transparent;color:inherit;border-radius:10px;font-family:inherit;cursor:pointer}.est-task{display:flex;align-items:center;justify-content:center;gap:7px;padding:9px 8px;font-size:.74rem}.est-task:hover,.est-task.is-active{background:rgba(77,166,255,.12);border-color:rgba(77,166,255,.25);color:#75bbff}.est-mode-toggle{display:flex;align-items:center;gap:7px;padding:9px 11px;border-color:rgba(255,255,255,.1);font-size:.7rem}',
            'html[data-editor-mode="simple"] #editor-layers-panel,html[data-editor-mode="simple"] #editor-context-inspector{display:none!important}html[data-editor-mode="simple"] .pro-layout{padding-bottom:92px}html[data-editor-mode="advanced"] .est-tasks,html[data-editor-mode="advanced"] .est-brand{opacity:.55}',
            '.est-highlight{animation:estPulse .7s ease 2}@keyframes estPulse{50%{box-shadow:0 0 0 5px rgba(77,166,255,.26)}}',
            '@media(max-width:760px){.est-toolbar{grid-template-columns:1fr auto;bottom:8px;padding:8px}.est-brand{display:none}.est-tasks{grid-column:1/-1;order:2}.est-task{flex-direction:column;gap:3px;font-size:.62rem;padding:7px 4px}.est-mode-toggle span{display:none}}',
            '@media(prefers-reduced-motion:reduce){.est-toolbar,.est-task{transition:none}}'
        ].join('');
        document.head.appendChild(style);
    }

    function init() {
        build();
        activeMode = readMode();
        syncModeUI();
    }

    global.EditorSimpleMode = {
        setMode: setMode,
        getMode: function () { return activeMode; },
        runTask: runTask,
        tasks: tasks.slice()
    };

    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true });
    else init();
}(typeof window !== 'undefined' ? window : globalThis));
