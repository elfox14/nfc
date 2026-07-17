(function initializeEditorProperties(global) {
    'use strict';

    const document = global.document;
    if (!document) return;

    const isEnglish = document.documentElement.lang.toLowerCase().startsWith('en');
    const copy = isEnglish ? {
        title: 'Transform',
        hint: 'Precise position and appearance for the selected layer.',
        x: 'X position',
        y: 'Y position',
        size: 'Size',
        rotation: 'Rotation',
        opacity: 'Opacity',
        reset: 'Reset transform',
        hide: 'Hide layer',
        show: 'Show layer',
        lock: 'Lock layer',
        unlock: 'Unlock layer'
    } : {
        title: 'التحويل والموضع',
        hint: 'تحكم دقيق في موضع ومظهر الطبقة المحددة.',
        x: 'الموضع الأفقي',
        y: 'الموضع الرأسي',
        size: 'الحجم',
        rotation: 'الدوران',
        opacity: 'الشفافية',
        reset: 'إعادة ضبط التحويل',
        hide: 'إخفاء الطبقة',
        show: 'إظهار الطبقة',
        lock: 'قفل الطبقة',
        unlock: 'إلغاء قفل الطبقة'
    };

    const state = { initialized: false, selected: 'card', syncing: false };
    let panel;
    let xInput;
    let yInput;
    let scaleInput;
    let rotationInput;
    let opacityInput;
    let scaleOutput;
    let rotationOutput;
    let opacityOutput;
    let lockButton;
    let visibilityButton;

    function createIcon(name) {
        const icon = document.createElement('i');
        icon.className = `fas ${name}`;
        icon.setAttribute('aria-hidden', 'true');
        return icon;
    }

    function createNumberField(label, axis) {
        const field = document.createElement('label');
        field.className = 'editor-transform-number';
        const text = document.createElement('span');
        const input = document.createElement('input');
        text.textContent = label;
        input.type = 'number';
        input.step = '1';
        input.dataset.transformPosition = axis;
        input.setAttribute('aria-label', label);
        field.append(text, input);
        return { field, input };
    }

    function createRangeField(label, property, min, max, step, suffix) {
        const field = document.createElement('label');
        field.className = 'editor-transform-range';
        const heading = document.createElement('span');
        const text = document.createElement('span');
        const output = document.createElement('output');
        const input = document.createElement('input');
        text.textContent = label;
        input.type = 'range';
        input.min = String(min);
        input.max = String(max);
        input.step = String(step);
        input.dataset.transformAppearance = property;
        input.setAttribute('aria-label', label);
        output.dataset.suffix = suffix;
        heading.append(text, output);
        field.append(heading, input);
        return { field, input, output };
    }

    function createAction(className, label, iconName, action) {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = className;
        button.dataset.transformAction = action;
        button.setAttribute('aria-label', label);
        button.title = label;
        button.append(createIcon(iconName));
        return button;
    }

    function build() {
        const host = document.getElementById('panel-elements');
        const heading = host?.querySelector('.editor-inspector-heading');
        if (!host || !heading || host.querySelector('.editor-transform-panel')) return false;

        panel = document.createElement('section');
        panel.className = 'editor-transform-panel';
        panel.hidden = true;

        const header = document.createElement('div');
        const headerIcon = createIcon('fa-vector-square');
        const headerText = document.createElement('div');
        const title = document.createElement('h3');
        const hint = document.createElement('p');
        title.textContent = copy.title;
        hint.textContent = copy.hint;
        headerText.append(title, hint);
        header.append(headerIcon, headerText);

        const position = document.createElement('div');
        position.className = 'editor-transform-position';
        const x = createNumberField(copy.x, 'x');
        const y = createNumberField(copy.y, 'y');
        xInput = x.input;
        yInput = y.input;
        position.append(x.field, y.field);

        const ranges = document.createElement('div');
        ranges.className = 'editor-transform-ranges';
        const scale = createRangeField(copy.size, 'scale', 25, 200, 1, '%');
        const rotation = createRangeField(copy.rotation, 'rotation', -180, 180, 1, '°');
        const opacity = createRangeField(copy.opacity, 'opacity', 10, 100, 1, '%');
        scaleInput = scale.input;
        rotationInput = rotation.input;
        opacityInput = opacity.input;
        scaleOutput = scale.output;
        rotationOutput = rotation.output;
        opacityOutput = opacity.output;
        ranges.append(scale.field, rotation.field, opacity.field);

        const actions = document.createElement('div');
        actions.className = 'editor-transform-actions';
        lockButton = createAction('editor-transform-action', copy.lock, 'fa-lock-open', 'lock');
        visibilityButton = createAction('editor-transform-action', copy.hide, 'fa-eye', 'visibility');
        const resetButton = createAction('editor-transform-action editor-transform-reset', copy.reset, 'fa-undo-alt', 'reset');
        const resetLabel = document.createElement('span');
        resetLabel.textContent = copy.reset;
        resetButton.append(resetLabel);
        actions.append(lockButton, visibilityButton, resetButton);

        panel.append(header, position, ranges, actions);
        heading.insertAdjacentElement('afterend', panel);
        bind();
        return true;
    }

    function bind() {
        panel.addEventListener('input', (event) => {
            if (state.syncing || state.selected === 'card' || !global.EditorLayers) return;
            const axis = event.target.dataset.transformPosition;
            if (axis) {
                const x = Number(xInput.value) || 0;
                const y = Number(yInput.value) || 0;
                global.EditorLayers.setPosition(state.selected, x, y);
                return;
            }

            const property = event.target.dataset.transformAppearance;
            if (!property) return;
            const raw = Number(event.target.value);
            const value = property === 'scale' || property === 'opacity' ? raw / 100 : raw;
            global.EditorLayers.setAppearance(state.selected, { [property]: value });
            updateOutputs();
        });

        panel.addEventListener('click', (event) => {
            const action = event.target.closest('[data-transform-action]')?.dataset.transformAction;
            if (!action || state.selected === 'card' || !global.EditorLayers) return;
            if (action === 'lock') global.EditorLayers.toggleLock(state.selected);
            if (action === 'visibility') global.EditorLayers.toggleVisibility(state.selected);
            if (action === 'reset') global.EditorLayers.resetTransform(state.selected);
            sync();
        });
    }

    function updateOutputs() {
        scaleOutput.value = `${scaleInput.value}%`;
        rotationOutput.value = `${rotationInput.value}°`;
        opacityOutput.value = `${opacityInput.value}%`;
    }

    function sync(selected) {
        if (!panel || !global.EditorLayers) return;
        state.selected = selected || global.EditorWorkspace?.getState().selectedItem || 'card';
        const editable = state.selected !== 'card' && Boolean(global.EditorLayers.getTargets(state.selected).length);
        panel.hidden = !editable;
        if (!editable) return;

        const position = global.EditorLayers.getPosition(state.selected) || { x: 0, y: 0 };
        const appearance = global.EditorLayers.getAppearance(state.selected);
        const locks = global.EditorLayers.getLocks();
        const visible = global.EditorLayers.isVisible(state.selected);
        state.syncing = true;
        xInput.value = String(Math.round(position.x * 100) / 100);
        yInput.value = String(Math.round(position.y * 100) / 100);
        scaleInput.value = String(Math.round(appearance.scale * 100));
        rotationInput.value = String(Math.round(appearance.rotation));
        opacityInput.value = String(Math.round(appearance.opacity * 100));
        updateOutputs();

        const locked = locks.includes(state.selected);
        lockButton.classList.toggle('is-active', locked);
        lockButton.setAttribute('aria-pressed', locked ? 'true' : 'false');
        lockButton.setAttribute('aria-label', locked ? copy.unlock : copy.lock);
        lockButton.title = locked ? copy.unlock : copy.lock;
        lockButton.querySelector('i').className = locked ? 'fas fa-lock' : 'fas fa-lock-open';

        visibilityButton.classList.toggle('is-active', !visible);
        visibilityButton.setAttribute('aria-pressed', visible ? 'false' : 'true');
        visibilityButton.setAttribute('aria-label', visible ? copy.hide : copy.show);
        visibilityButton.title = visible ? copy.hide : copy.show;
        visibilityButton.querySelector('i').className = visible ? 'fas fa-eye' : 'fas fa-eye-slash';
        state.syncing = false;
    }

    function initialize() {
        if (state.initialized) return;
        if (!build()) return;
        state.initialized = true;
        ['editor:selectionchange', 'editor:layermove', 'editor:layerappearancechange',
            'editor:layerlockchange', 'editor:layervisibilitychange', 'editor:layertransformreset']
            .forEach((name) => document.addEventListener(name, (event) => sync(event.detail?.id)));
        sync();
        document.documentElement.dataset.editorProperties = 'ready';
        document.dispatchEvent(new global.CustomEvent('editor:propertiesready'));
    }

    global.EditorProperties = { init: initialize, sync, getState: () => ({ ...state }) };
    document.addEventListener('editor:workspaceready', initialize, { once: true });
    if (document.documentElement.dataset.editorWorkspace === 'ready') initialize();
}(typeof window !== 'undefined' ? window : globalThis));
