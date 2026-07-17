/* global DragManager, StateManager, UIManager */

(function initializeEditorLayers(global) {
    'use strict';

    const document = global.document;
    if (!document) return;

    const isEnglish = document.documentElement.lang.toLowerCase().startsWith('en');
    const copy = isEnglish ? {
        align: 'Align selected layer',
        left: 'Align left',
        center: 'Center horizontally',
        right: 'Align right',
        top: 'Align top',
        middle: 'Center vertically',
        bottom: 'Align bottom',
        lock: 'Lock',
        unlock: 'Unlock',
        hide: 'Hide',
        show: 'Show',
        locked: 'Layer is locked',
        selectLayer: 'Select a layer first',
        bioAvailable: 'Available for work',
        bioFreelance: 'Available for freelance',
        bioBusy: 'Currently busy'
    } : {
        align: 'محاذاة الطبقة المحددة',
        left: 'محاذاة لليسار',
        center: 'توسيط أفقي',
        right: 'محاذاة لليمين',
        top: 'محاذاة للأعلى',
        middle: 'توسيط رأسي',
        bottom: 'محاذاة للأسفل',
        lock: 'قفل',
        unlock: 'إلغاء القفل',
        hide: 'إخفاء',
        show: 'إظهار',
        locked: 'الطبقة مقفلة',
        selectLayer: 'حدد طبقة أولًا',
        bioAvailable: 'متاح للعمل',
        bioFreelance: 'متاح لمشاريع مستقلة',
        bioBusy: 'مشغول حاليًا'
    };

    const definitions = [
        { id: 'logo', selectors: ['#card-logo'], visibilityId: 'visibility-logo' },
        { id: 'photo', selectors: ['#card-personal-photo-wrapper'], visibilityId: 'visibility-photo' },
        { id: 'name', selectors: ['#card-name'], visibilityId: 'visibility-name' },
        { id: 'tagline', selectors: ['#card-tagline'], visibilityId: 'visibility-tagline' },
        { id: 'bio', selectors: ['#card-bio'], visibilityId: 'visibility-bio' },
        { id: 'phones', selectors: ['.phone-button-draggable-wrapper'], visibilityId: 'visibility-phones' },
        { id: 'qr', selectors: ['#qr-code-wrapper'], visibilityId: 'visibility-qr' },
        { id: 'contact', selectors: ['.draggable-social-link'], visibilityId: 'toggle-master-social' }
    ];

    const defaultOrder = definitions.map((definition) => definition.id);
    const inputIds = {
        order: 'editor-layer-order',
        locks: 'editor-layer-locks',
        bioPosition: 'editor-layer-bio-position'
    };

    const state = {
        initialized: false,
        order: [...defaultOrder],
        locks: new Set(),
        draggedRow: null,
        patchedDragManager: false
    };

    let orderInput;
    let locksInput;
    let bioPositionInput;
    let cardsWrapper;
    let bioElement;
    let guideTimer;

    function emit(name, detail) {
        document.dispatchEvent(new global.CustomEvent(name, { detail }));
    }

    function announce(message) {
        if (typeof global.EditorUIState !== 'undefined' && global.EditorUIState.set) {
            global.EditorUIState.set('saved', message);
        } else if (typeof UIManager !== 'undefined' && UIManager.announce) {
            UIManager.announce(message);
        }
    }

    function ensureHiddenInput(id, value) {
        let input = document.getElementById(id);
        if (!input) {
            input = document.createElement('input');
            input.type = 'hidden';
            input.id = id;
            input.value = value;
            document.body.append(input);
        }
        return input;
    }

    function readArray(input, fallback) {
        try {
            const parsed = JSON.parse(input.value);
            if (!Array.isArray(parsed)) return [...fallback];
            const valid = parsed.filter((id) => defaultOrder.includes(id));
            fallback.forEach((id) => {
                if (!valid.includes(id)) valid.push(id);
            });
            return valid;
        } catch (error) {
            return [...fallback];
        }
    }

    function readPosition() {
        try {
            const position = JSON.parse(bioPositionInput.value);
            return {
                x: Number.isFinite(Number(position.x)) ? Number(position.x) : 0,
                y: Number.isFinite(Number(position.y)) ? Number(position.y) : 0
            };
        } catch (error) {
            return { x: 0, y: 0 };
        }
    }

    function writeMetadata(input, value, changeType) {
        input.value = JSON.stringify(value);
        input.dispatchEvent(new global.Event('input', { bubbles: true }));
        emit('editor:layermetadatachange', { type: changeType, value });
        scheduleSave();
    }

    function scheduleSave() {
        if (typeof StateManager !== 'undefined' && StateManager.saveDebounced) {
            StateManager.saveDebounced();
        }
    }

    function getDefinition(id) {
        return definitions.find((definition) => definition.id === id) || null;
    }

    function getTargets(id) {
        const definition = getDefinition(id);
        if (!definition) return [];
        const targets = definition.selectors.flatMap((selector) => Array.from(document.querySelectorAll(selector)));
        return Array.from(new Set(targets));
    }

    function getPrimaryTarget(id) {
        return getTargets(id).find((element) => !element.hidden) || getTargets(id)[0] || null;
    }

    function getVisibilityControl(id) {
        const definition = getDefinition(id);
        return definition ? document.getElementById(definition.visibilityId) : null;
    }

    function isVisible(id) {
        const control = getVisibilityControl(id);
        return control ? control.checked : true;
    }

    function isLockedElement(element) {
        return Boolean(element && (element.dataset.layerLocked === 'true' || element.closest('[data-layer-locked="true"]')));
    }

    function applyOrder() {
        state.order = readArray(orderInput, defaultOrder);
        state.order.forEach((id, index) => {
            const zIndex = String(100 + (state.order.length - index) * 10);
            getTargets(id).forEach((element) => {
                element.style.zIndex = zIndex;
                element.dataset.layerOrder = String(index);
            });
        });
        syncLayerList();
    }

    function applyLocks() {
        state.locks = new Set(readArray(locksInput, []).filter((id) => defaultOrder.includes(id)));
        definitions.forEach(({ id }) => {
            const locked = state.locks.has(id);
            getTargets(id).forEach((element) => {
                element.dataset.layerLocked = locked ? 'true' : 'false';
                element.classList.toggle('editor-layer-locked', locked);
            });
        });
        syncLayerList();
    }

    function applyVisibility(id) {
        const visible = isVisible(id);
        getTargets(id).forEach((element) => {
            element.classList.toggle('editor-layer-hidden', !visible);
            const hasBioContent = id !== 'bio'
                || Boolean(element.querySelector('.editor-card-bio-text')?.textContent.trim())
                || Boolean(element.querySelector('.editor-card-bio-availability')?.textContent.trim());
            element.hidden = !visible || !hasBioContent;
        });
        syncLayerList();
    }

    function applyAllVisibility() {
        definitions.forEach(({ id }) => applyVisibility(id));
    }

    function applyBioPosition() {
        if (!bioElement) return;
        const position = readPosition();
        bioElement.style.transform = `translate(${position.x}px, ${position.y}px)`;
        bioElement.dataset.x = String(position.x);
        bioElement.dataset.y = String(position.y);
    }

    function applyMetadata() {
        applyOrder();
        applyLocks();
        applyAllVisibility();
        applyBioPosition();
    }

    function persistBioPosition() {
        if (!bioElement) return;
        const position = {
            x: Number.parseFloat(bioElement.dataset.x) || 0,
            y: Number.parseFloat(bioElement.dataset.y) || 0
        };
        writeMetadata(bioPositionInput, position, 'bio-position');
    }

    function createBioElement() {
        const backContent = document.getElementById('card-back-content');
        if (!backContent) return;
        bioElement = document.getElementById('card-bio');
        if (!bioElement) {
            bioElement = document.createElement('div');
            bioElement.id = 'card-bio';
            bioElement.className = 'editor-card-bio draggable-on-card';
            bioElement.dataset.cardElement = 'bio';
            bioElement.dataset.x = '0';
            bioElement.dataset.y = '0';

            const text = document.createElement('p');
            text.className = 'editor-card-bio-text';
            const availability = document.createElement('span');
            availability.className = 'editor-card-bio-availability';
            bioElement.append(text, availability);
            backContent.append(bioElement);
        }

        ['input-bio_ar', 'input-bio_en', 'input-availability', 'visibility-bio'].forEach((id) => {
            const input = document.getElementById(id);
            if (!input || input.dataset.bioWired === 'true') return;
            input.dataset.bioWired = 'true';
            input.addEventListener('input', updateBioElement);
            input.addEventListener('change', updateBioElement);
        });

        updateBioElement();
        if (global.EditorWorkspace && global.EditorWorkspace.refreshCanvasElements) {
            global.EditorWorkspace.refreshCanvasElements();
        }
    }

    function updateBioElement() {
        if (!bioElement) return;
        const language = document.documentElement.lang.toLowerCase().startsWith('en') ? 'en' : 'ar';
        const input = document.getElementById(`input-bio_${language}`);
        const availabilityInput = document.getElementById('input-availability');
        const visible = isVisible('bio');
        const value = input ? input.value.trim() : '';
        const availability = availabilityInput ? availabilityInput.value : '';
        const availabilityLabels = {
            available: copy.bioAvailable,
            freelance: copy.bioFreelance,
            busy: copy.bioBusy
        };

        const text = bioElement.querySelector('.editor-card-bio-text');
        const badge = bioElement.querySelector('.editor-card-bio-availability');
        text.textContent = value;
        text.hidden = !value;
        badge.textContent = availabilityLabels[availability] || '';
        badge.dataset.availability = availability;
        badge.hidden = !availability;
        bioElement.hidden = !visible || (!value && !availability);
        bioElement.classList.toggle('editor-layer-hidden', !visible);
        applyMetadata();
    }

    function createAlignmentToolbar(list) {
        const host = list.parentElement;
        if (!host || host.querySelector('.editor-alignment-tools')) return;

        const toolbar = document.createElement('div');
        toolbar.className = 'editor-alignment-tools';
        toolbar.setAttribute('role', 'toolbar');
        toolbar.setAttribute('aria-label', copy.align);

        [
            ['left', 'fa-align-left', copy.left],
            ['center', 'fa-align-center', copy.center],
            ['right', 'fa-align-right', copy.right],
            ['top', 'fa-arrow-up', copy.top],
            ['middle', 'fa-arrows-alt-v', copy.middle],
            ['bottom', 'fa-arrow-down', copy.bottom]
        ].forEach(([action, iconName, label]) => {
            const button = document.createElement('button');
            button.type = 'button';
            button.className = 'editor-align-action';
            button.dataset.alignAction = action;
            button.setAttribute('aria-label', label);
            button.title = label;
            const icon = document.createElement('i');
            icon.className = `fas ${iconName}`;
            icon.setAttribute('aria-hidden', 'true');
            button.append(icon);
            toolbar.append(button);
        });
        host.insertBefore(toolbar, list);
    }

    function setupLayerList() {
        const list = document.querySelector('.editor-layer-list');
        if (!list) return;
        createAlignmentToolbar(list);
        applySavedOrderToList(list);
        syncLayerList();
        if (list.dataset.layersWired === 'true') return;
        list.dataset.layersWired = 'true';

        list.addEventListener('click', (event) => {
            const action = event.target.closest('[data-layer-action]');
            if (!action) return;
            event.preventDefault();
            event.stopPropagation();
            if (action.dataset.layerAction === 'visibility') toggleVisibility(action.dataset.layerId);
            if (action.dataset.layerAction === 'lock') toggleLock(action.dataset.layerId);
        });

        list.addEventListener('dragstart', (event) => {
            const row = event.target.closest('.editor-layer-row');
            if (!row) return;
            state.draggedRow = row;
            row.classList.add('is-dragging');
            if (event.dataTransfer) {
                event.dataTransfer.effectAllowed = 'move';
                event.dataTransfer.setData('text/plain', row.dataset.layerId);
            }
        });

        list.addEventListener('dragover', (event) => {
            if (!state.draggedRow) return;
            event.preventDefault();
            const row = event.target.closest('.editor-layer-row');
            if (!row || row === state.draggedRow) return;
            list.querySelectorAll('.is-drag-over').forEach((item) => item.classList.remove('is-drag-over'));
            row.classList.add('is-drag-over');
            const rect = row.getBoundingClientRect();
            list.insertBefore(state.draggedRow, event.clientY < rect.top + rect.height / 2 ? row : row.nextSibling);
        });

        list.addEventListener('drop', (event) => {
            if (!state.draggedRow) return;
            event.preventDefault();
            persistListOrder(list);
        });

        list.addEventListener('dragend', () => {
            list.querySelectorAll('.editor-layer-row').forEach((row) => row.classList.remove('is-dragging', 'is-drag-over'));
            state.draggedRow = null;
        });

        list.addEventListener('keydown', (event) => {
            const handle = event.target.closest('[data-layer-handle]');
            if (!handle || !['ArrowUp', 'ArrowDown'].includes(event.key)) return;
            event.preventDefault();
            moveLayer(handle.dataset.layerHandle, event.key === 'ArrowUp' ? -1 : 1);
        });
    }

    function applySavedOrderToList(list) {
        const rows = new Map(Array.from(list.querySelectorAll('.editor-layer-row'), (row) => [row.dataset.layerId, row]));
        state.order.forEach((id) => {
            const row = rows.get(id);
            if (row) list.append(row);
        });
        renumberRows(list);
    }

    function renumberRows(list) {
        list.querySelectorAll('.editor-layer-row').forEach((row, index) => {
            const order = row.querySelector('.editor-layer-item small');
            if (order) order.textContent = String(index + 1).padStart(2, '0');
        });
    }

    function persistListOrder(list) {
        const order = Array.from(list.querySelectorAll('.editor-layer-row'), (row) => row.dataset.layerId);
        writeMetadata(orderInput, order, 'order');
        applyOrder();
        renumberRows(list);
    }

    function moveLayer(id, delta) {
        const order = [...state.order];
        const index = order.indexOf(id);
        const next = index + delta;
        if (index < 0 || next < 0 || next >= order.length) return false;
        [order[index], order[next]] = [order[next], order[index]];
        writeMetadata(orderInput, order, 'order');
        applyOrder();
        setupLayerList();
        const handle = document.querySelector(`[data-layer-handle="${id}"]`);
        if (handle) handle.focus();
        return true;
    }

    function toggleVisibility(id) {
        const control = getVisibilityControl(id);
        if (!control) return false;
        control.checked = !control.checked;
        control.dispatchEvent(new global.Event('input', { bubbles: true }));
        control.dispatchEvent(new global.Event('change', { bubbles: true }));
        applyVisibility(id);
        if (id === 'bio') updateBioElement();
        scheduleSave();
        emit('editor:layervisibilitychange', { id, visible: control.checked });
        return control.checked;
    }

    function toggleLock(id) {
        const locks = new Set(state.locks);
        if (locks.has(id)) locks.delete(id);
        else locks.add(id);
        writeMetadata(locksInput, [...locks], 'locks');
        applyLocks();
        emit('editor:layerlockchange', { id, locked: locks.has(id) });
        return locks.has(id);
    }

    function syncLayerList() {
        document.querySelectorAll('.editor-layer-row').forEach((row) => {
            const id = row.dataset.layerId;
            const visible = isVisible(id);
            const locked = state.locks.has(id);
            row.classList.toggle('is-hidden', !visible);
            row.classList.toggle('is-locked', locked);

            const visibility = row.querySelector('[data-layer-action="visibility"]');
            if (visibility) {
                visibility.setAttribute('aria-pressed', visible ? 'false' : 'true');
                visibility.setAttribute('aria-label', visible ? copy.hide : copy.show);
                const icon = visibility.querySelector('i');
                if (icon) icon.className = visible ? 'fas fa-eye' : 'fas fa-eye-slash';
            }

            const lock = row.querySelector('[data-layer-action="lock"]');
            if (lock) {
                lock.setAttribute('aria-pressed', locked ? 'true' : 'false');
                lock.setAttribute('aria-label', locked ? copy.unlock : copy.lock);
                const icon = lock.querySelector('i');
                if (icon) icon.className = locked ? 'fas fa-lock' : 'fas fa-lock-open';
            }
        });
    }

    function patchDragManager() {
        if (state.patchedDragManager || typeof DragManager === 'undefined') return false;
        state.patchedDragManager = true;

        const originalStart = DragManager.dragStartListener;
        const originalMove = DragManager.dragMoveListener;
        const originalEnd = DragManager.dragEndListener;

        DragManager.dragStartListener = function layerDragStart(event) {
            if (isLockedElement(event.target)) {
                if (event.interaction && event.interaction.stop) event.interaction.stop();
                announce(copy.locked);
                return;
            }
            return originalStart.call(this, event);
        };

        DragManager.dragMoveListener = function layerDragMove(event) {
            if (isLockedElement(event.target)) return;
            originalMove.call(this, event);
            snapElement(event.target);
        };

        DragManager.dragEndListener = function layerDragEnd(event) {
            hideGuides();
            if (isLockedElement(event.target)) return;
            if (event.target.id === 'card-bio') persistBioPosition();
            emit('editor:layermove', { id: event.target.id });
            return originalEnd.call(this, event);
        };
        return true;
    }

    function wireBioDrag() {
        if (!bioElement || bioElement.dataset.layerDraggableWired === 'true') return;
        if (typeof DragManager === 'undefined' || typeof global.interact === 'undefined') {
            global.setTimeout(wireBioDrag, 200);
            return;
        }
        bioElement.dataset.layerDraggableWired = 'true';
        DragManager.makeDraggable('#card-bio');
    }

    function getScale(card, cardRect) {
        const width = card.offsetWidth || cardRect.width;
        return width ? cardRect.width / width : 1;
    }

    function getAlignmentCandidates(target, card) {
        const cardRect = card.getBoundingClientRect();
        const targetRect = target.getBoundingClientRect();
        const others = definitions
            .flatMap(({ id }) => getTargets(id))
            .filter((element) => element !== target && !element.hidden && element.closest('.business-card') === card);

        const x = [
            { delta: cardRect.left - targetRect.left, guide: cardRect.left },
            { delta: cardRect.left + cardRect.width / 2 - (targetRect.left + targetRect.width / 2), guide: cardRect.left + cardRect.width / 2 },
            { delta: cardRect.right - targetRect.right, guide: cardRect.right }
        ];
        const y = [
            { delta: cardRect.top - targetRect.top, guide: cardRect.top },
            { delta: cardRect.top + cardRect.height / 2 - (targetRect.top + targetRect.height / 2), guide: cardRect.top + cardRect.height / 2 },
            { delta: cardRect.bottom - targetRect.bottom, guide: cardRect.bottom }
        ];

        others.forEach((element) => {
            const rect = element.getBoundingClientRect();
            x.push(
                { delta: rect.left - targetRect.left, guide: rect.left },
                { delta: rect.left + rect.width / 2 - (targetRect.left + targetRect.width / 2), guide: rect.left + rect.width / 2 },
                { delta: rect.right - targetRect.right, guide: rect.right }
            );
            y.push(
                { delta: rect.top - targetRect.top, guide: rect.top },
                { delta: rect.top + rect.height / 2 - (targetRect.top + targetRect.height / 2), guide: rect.top + rect.height / 2 },
                { delta: rect.bottom - targetRect.bottom, guide: rect.bottom }
            );
        });
        return { x, y, cardRect };
    }

    function closestCandidate(candidates, threshold) {
        return candidates
            .filter((candidate) => Math.abs(candidate.delta) <= threshold)
            .sort((left, right) => Math.abs(left.delta) - Math.abs(right.delta))[0] || null;
    }

    function snapElement(target) {
        const card = target.closest('.business-card');
        if (!card || isLockedElement(target)) return;
        const candidates = getAlignmentCandidates(target, card);
        const scale = getScale(card, candidates.cardRect) || 1;
        const threshold = 7 * scale;
        const xCandidate = closestCandidate(candidates.x, threshold);
        const yCandidate = closestCandidate(candidates.y, threshold);
        if (!xCandidate && !yCandidate) {
            hideGuides();
            return;
        }

        let x = Number.parseFloat(target.dataset.x) || 0;
        let y = Number.parseFloat(target.dataset.y) || 0;
        if (xCandidate) x += xCandidate.delta / scale;
        if (yCandidate) y += yCandidate.delta / scale;
        setElementPosition(target, x, y, false);
        showGuides(card, candidates.cardRect, scale, xCandidate, yCandidate);
    }

    function setElementPosition(target, x, y, save) {
        target.style.transform = `translate(${x}px, ${y}px)`;
        target.dataset.x = String(Math.round(x * 100) / 100);
        target.dataset.y = String(Math.round(y * 100) / 100);
        if (target.id === 'card-bio') {
            bioPositionInput.value = JSON.stringify({ x, y });
        }
        if (save) {
            if (target.id === 'card-bio') persistBioPosition();
            else scheduleSave();
        }
    }

    function ensureGuide(card, axis) {
        let guide = card.querySelector(`.editor-alignment-guide[data-axis="${axis}"]`);
        if (!guide) {
            guide = document.createElement('div');
            guide.className = 'editor-alignment-guide no-export';
            guide.dataset.axis = axis;
            card.append(guide);
        }
        return guide;
    }

    function showGuides(card, cardRect, scale, xCandidate, yCandidate) {
        hideGuides();
        if (xCandidate) {
            const guide = ensureGuide(card, 'x');
            guide.style.left = `${(xCandidate.guide - cardRect.left) / scale}px`;
            guide.hidden = false;
        }
        if (yCandidate) {
            const guide = ensureGuide(card, 'y');
            guide.style.top = `${(yCandidate.guide - cardRect.top) / scale}px`;
            guide.hidden = false;
        }
        global.clearTimeout(guideTimer);
        guideTimer = global.setTimeout(hideGuides, 800);
    }

    function hideGuides() {
        document.querySelectorAll('.editor-alignment-guide').forEach((guide) => { guide.hidden = true; });
    }

    function alignSelected(action) {
        const selected = global.EditorWorkspace ? global.EditorWorkspace.getState().selectedItem : 'card';
        const target = selected !== 'card' ? getPrimaryTarget(selected) : null;
        if (!target) {
            announce(copy.selectLayer);
            return false;
        }
        if (isLockedElement(target)) {
            announce(copy.locked);
            return false;
        }

        const card = target.closest('.business-card');
        if (!card) return false;
        const cardRect = card.getBoundingClientRect();
        const targetRect = target.getBoundingClientRect();
        const scale = getScale(card, cardRect) || 1;
        let deltaX = 0;
        let deltaY = 0;
        let xCandidate = null;
        let yCandidate = null;

        if (action === 'left') deltaX = cardRect.left - targetRect.left;
        if (action === 'center') deltaX = cardRect.left + cardRect.width / 2 - (targetRect.left + targetRect.width / 2);
        if (action === 'right') deltaX = cardRect.right - targetRect.right;
        if (action === 'top') deltaY = cardRect.top - targetRect.top;
        if (action === 'middle') deltaY = cardRect.top + cardRect.height / 2 - (targetRect.top + targetRect.height / 2);
        if (action === 'bottom') deltaY = cardRect.bottom - targetRect.bottom;

        if (['left', 'center', 'right'].includes(action)) {
            const guide = action === 'left' ? cardRect.left : action === 'right' ? cardRect.right : cardRect.left + cardRect.width / 2;
            xCandidate = { delta: deltaX, guide };
        }
        if (['top', 'middle', 'bottom'].includes(action)) {
            const guide = action === 'top' ? cardRect.top : action === 'bottom' ? cardRect.bottom : cardRect.top + cardRect.height / 2;
            yCandidate = { delta: deltaY, guide };
        }

        const x = (Number.parseFloat(target.dataset.x) || 0) + deltaX / scale;
        const y = (Number.parseFloat(target.dataset.y) || 0) + deltaY / scale;
        setElementPosition(target, x, y, true);
        showGuides(card, cardRect, scale, xCandidate, yCandidate);
        emit('editor:layeralign', { id: selected, action, x, y });
        return true;
    }

    function setupGlobalEvents() {
        document.addEventListener('click', (event) => {
            const button = event.target.closest('[data-align-action]');
            if (button) alignSelected(button.dataset.alignAction);
        });

        document.addEventListener('keydown', (event) => {
            if (!['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(event.key)) return;
            const active = document.activeElement;
            if (active && active.matches('input, textarea, select, [contenteditable="true"], [data-layer-handle]')) return;
            const selected = global.EditorWorkspace ? global.EditorWorkspace.getState().selectedItem : 'card';
            const target = selected !== 'card' ? getPrimaryTarget(selected) : null;
            if (!target || isLockedElement(target)) return;
            event.preventDefault();
            const step = event.shiftKey ? 10 : 1;
            let x = Number.parseFloat(target.dataset.x) || 0;
            let y = Number.parseFloat(target.dataset.y) || 0;
            if (event.key === 'ArrowUp') y -= step;
            if (event.key === 'ArrowDown') y += step;
            if (event.key === 'ArrowLeft') x -= step;
            if (event.key === 'ArrowRight') x += step;
            setElementPosition(target, x, y, true);
            emit('editor:layermove', { id: selected, x, y, source: 'keyboard' });
        });

        document.addEventListener('editor:librarychange', (event) => {
            if (event.detail && event.detail.view === 'layers') setupLayerList();
        });

        definitions.forEach(({ id, visibilityId }) => {
            const control = document.getElementById(visibilityId);
            if (!control) return;
            control.addEventListener('input', () => applyVisibility(id));
            control.addEventListener('change', () => applyVisibility(id));
        });

        [orderInput, locksInput, bioPositionInput].forEach((input) => {
            input.addEventListener('input', applyMetadata);
            input.addEventListener('change', applyMetadata);
        });
    }

    function initialize() {
        if (state.initialized) return;
        state.initialized = true;
        cardsWrapper = document.getElementById('cards-wrapper');
        orderInput = ensureHiddenInput(inputIds.order, JSON.stringify(defaultOrder));
        locksInput = ensureHiddenInput(inputIds.locks, '[]');
        bioPositionInput = ensureHiddenInput(inputIds.bioPosition, '{"x":0,"y":0}');
        state.order = readArray(orderInput, defaultOrder);
        state.locks = new Set(readArray(locksInput, []));

        createBioElement();
        setupGlobalEvents();
        patchDragManager();
        wireBioDrag();
        applyMetadata();
        setupLayerList();

        if (cardsWrapper) {
            const observer = new global.MutationObserver(() => {
                applyMetadata();
            });
            observer.observe(cardsWrapper, { childList: true, subtree: true });
        }

        global.setTimeout(() => {
            patchDragManager();
            wireBioDrag();
            applyMetadata();
            updateBioElement();
        }, 500);

        document.documentElement.dataset.editorLayers = 'ready';
        emit('editor:layersready', { order: [...state.order] });
    }

    global.EditorLayers = {
        init: initialize,
        getOrder: () => [...state.order],
        getLocks: () => [...state.locks],
        getTargets,
        move: moveLayer,
        toggleLock,
        toggleVisibility,
        align: alignSelected,
        apply: applyMetadata,
        getBioElement: () => bioElement
    };

    // This script is deferred, so the document is already parsed. Initializing here
    // makes the metadata inputs available before the legacy StateManager restores a design.
    initialize();
}(typeof window !== 'undefined' ? window : globalThis));
