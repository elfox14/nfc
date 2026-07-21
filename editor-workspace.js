(function initializeEditorWorkspace(global) {
    'use strict';

    const document = global.document;
    if (!document) return;

    const isEnglish = document.documentElement.lang.toLowerCase().startsWith('en');
    const copy = isEnglish ? {
        libraryTitle: 'Library',
        libraryHint: 'Choose a category, then edit the selected item in Properties.',
        inspectorTitle: 'Properties',
        inspectorHint: 'Only settings for the selected item are shown.',
        sheetLabel: 'Resize properties panel',
        cardSettingsTitle: 'Card settings',
        cardSettingsBody: 'Select an element on the card or from Layers to edit only its settings.',
        openDesign: 'Card design',
        openTemplates: 'Templates',
        canvasLabel: 'Card canvas controls',
        front: 'Front',
        back: 'Back',
        zoomOut: 'Zoom out',
        zoomIn: 'Zoom in',
        fit: 'Reset zoom',
        grid: 'Grid',
        templatesHint: 'Start from a layout or a ready-made design.',
        contentHint: 'Select text and contact content to edit.',
        imagesHint: 'Manage the logo, profile photo and card background.',
        iconsHint: 'Manage QR and contact icons.',
        layersHint: 'Select an element from the card hierarchy.'
    } : {
        libraryTitle: 'المكتبة',
        libraryHint: 'اختر فئة ثم عدّل العنصر المحدد من لوحة الخصائص.',
        inspectorTitle: 'الخصائص',
        inspectorHint: 'تظهر إعدادات العنصر المحدد فقط.',
        sheetLabel: 'تغيير ارتفاع لوحة الخصائص',
        cardSettingsTitle: 'إعدادات البطاقة',
        cardSettingsBody: 'حدد عنصرًا من البطاقة أو من الطبقات لتظهر إعداداته فقط.',
        openDesign: 'تصميم البطاقة',
        openTemplates: 'القوالب',
        canvasLabel: 'أدوات مساحة البطاقة',
        front: 'الأمامي',
        back: 'الخلفي',
        zoomOut: 'تصغير',
        zoomIn: 'تكبير',
        fit: 'إعادة ضبط التكبير',
        grid: 'الشبكة',
        templatesHint: 'ابدأ من تخطيط أو تصميم جاهز.',
        contentHint: 'حدد النصوص وبيانات التواصل لتعديلها.',
        imagesHint: 'تحكم في الشعار والصورة الشخصية وخلفية البطاقة.',
        iconsHint: 'تحكم في رمز QR وأيقونات التواصل.',
        layersHint: 'حدد عنصرًا من التسلسل المرئي للبطاقة.'
    };

    const libraryViews = [
        { id: 'templates', icon: 'fa-th-large', label: isEnglish ? 'Templates' : 'قوالب' },
        { id: 'content', icon: 'fa-font', label: isEnglish ? 'Content' : 'محتوى' },
        { id: 'images', icon: 'fa-image', label: isEnglish ? 'Images' : 'صور' },
        { id: 'icons', icon: 'fa-icons', label: isEnglish ? 'Icons' : 'أيقونات' },
        { id: 'layers', icon: 'fa-layer-group', label: isEnglish ? 'Layers' : 'طبقات' }
    ];

    const inspectorItems = [
        {
            id: 'logo',
            panelId: 'logo-accordion',
            icon: 'fa-image',
            label: isEnglish ? 'Logo' : 'الشعار',
            selectors: ['#card-logo', '#card-logo-img']
        },
        {
            id: 'photo',
            panelId: 'photo-accordion',
            icon: 'fa-user-circle',
            label: isEnglish ? 'Profile photo' : 'الصورة الشخصية',
            selectors: ['#card-personal-photo-wrapper']
        },
        {
            id: 'name',
            panelId: 'name-accordion',
            icon: 'fa-user-tag',
            label: isEnglish ? 'Full name' : 'الاسم الكامل',
            selectors: ['#card-name']
        },
        {
            id: 'tagline',
            panelId: 'tagline-accordion',
            icon: 'fa-briefcase',
            label: isEnglish ? 'Job title' : 'المسمى الوظيفي',
            selectors: ['#card-tagline']
        },
        {
            id: 'bio',
            panelId: 'bio-accordion',
            icon: 'fa-align-left',
            label: isEnglish ? 'Bio' : 'النبذة التعريفية',
            selectors: ['#card-bio', '[data-card-element="bio"]']
        },
        {
            id: 'phones',
            panelId: 'phones-accordion',
            icon: 'fa-phone-alt',
            label: isEnglish ? 'Phone numbers' : 'أرقام الهواتف',
            selectors: ['.phone-button-draggable-wrapper', '#phone-buttons-wrapper'],
            interactiveContainer: true
        },
        {
            id: 'qr',
            panelId: 'qr-code-accordion',
            icon: 'fa-qrcode',
            label: isEnglish ? 'QR code' : 'رمز QR',
            selectors: ['#qr-code-wrapper']
        },
        {
            id: 'contact',
            panelId: 'contact-info-accordion',
            icon: 'fa-address-book',
            label: isEnglish ? 'Contact details' : 'بيانات التواصل',
            selectors: ['.draggable-social-link', '#card-back-content'],
            interactiveContainer: true
        }
    ];

    const viewItems = {
        content: ['name', 'tagline', 'bio', 'phones', 'contact'],
        images: ['logo', 'photo'],
        icons: ['qr', 'contact'],
        layers: inspectorItems.map((item) => item.id)
    };

    const state = {
        initialized: false,
        libraryView: 'templates',
        selectedItem: 'card',
        face: 'front',
        zoom: 1,
        grid: false
    };

    let libraryPanel;
    let inspectorPanel;
    let inspectorDetails = [];
    let inspectorTitle;
    let inspectorIcon;
    let cardInspector;
    let shortcutsHost;
    let canvas;
    let cardsWrapper;
    let zoomOutput;

    function emit(name, detail) {
        document.dispatchEvent(new global.CustomEvent(name, { detail }));
    }

    function createIcon(name) {
        const icon = document.createElement('i');
        icon.className = `fas ${name}`;
        icon.setAttribute('aria-hidden', 'true');
        return icon;
    }

    function createButton(className, label, iconName) {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = className;
        button.setAttribute('aria-label', label);
        if (iconName) button.append(createIcon(iconName));
        return button;
    }

    function createPanelHeading(title, hint) {
        const heading = document.createElement('div');
        heading.className = 'editor-panel-heading';

        const text = document.createElement('div');
        const titleElement = document.createElement('h2');
        const hintElement = document.createElement('p');
        titleElement.textContent = title;
        hintElement.textContent = hint;
        text.append(titleElement, hintElement);
        heading.append(text);
        return { heading, titleElement, hintElement };
    }

    function setupLibrary() {
        libraryPanel = document.getElementById('panel-design');
        if (!libraryPanel) return;

        const nativeSections = [
            { element: document.getElementById('layout-fieldset-source'), view: 'templates' },
            { element: document.getElementById('designs-fieldset-source'), view: 'templates' },
            { element: document.getElementById('backgrounds-accordion'), view: 'images' }
        ].filter((entry) => entry.element);

        const shell = document.createElement('div');
        shell.className = 'editor-library-shell';

        const tabs = document.createElement('div');
        tabs.className = 'editor-library-tabs';
        tabs.setAttribute('role', 'tablist');
        tabs.setAttribute('aria-label', copy.libraryTitle);

        libraryViews.forEach((view, index) => {
            const button = createButton('editor-library-tab', view.label, view.icon);
            const label = document.createElement('span');
            label.textContent = view.label;
            button.append(label);
            button.dataset.libraryTab = view.id;
            button.id = `editor-library-tab-${view.id}`;
            button.setAttribute('role', 'tab');
            button.setAttribute('aria-controls', 'editor-library-content');
            button.setAttribute('aria-selected', index === 0 ? 'true' : 'false');
            button.tabIndex = index === 0 ? 0 : -1;
            tabs.append(button);
        });

        const content = document.createElement('div');
        content.className = 'editor-library-content';
        content.id = 'editor-library-content';
        content.setAttribute('role', 'tabpanel');
        content.setAttribute('aria-labelledby', 'editor-library-tab-templates');

        const panelHeading = createPanelHeading(copy.libraryTitle, copy.libraryHint);
        shortcutsHost = document.createElement('div');
        shortcutsHost.className = 'editor-library-shortcuts';
        shortcutsHost.setAttribute('aria-live', 'polite');

        content.append(panelHeading.heading, shortcutsHost);
        nativeSections.forEach(({ element, view }) => {
            element.dataset.librarySection = view;
            content.append(element);
        });

        shell.append(tabs, content);
        libraryPanel.append(shell);

        tabs.addEventListener('click', (event) => {
            const button = event.target.closest('[data-library-tab]');
            if (button) setLibraryView(button.dataset.libraryTab);
        });

        tabs.addEventListener('keydown', (event) => {
            if (!['ArrowDown', 'ArrowUp', 'ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
            const buttons = Array.from(tabs.querySelectorAll('[data-library-tab]'));
            const current = buttons.indexOf(document.activeElement);
            if (current < 0) return;
            event.preventDefault();
            let next = current;
            if (event.key === 'Home') next = 0;
            else if (event.key === 'End') next = buttons.length - 1;
            else if (event.key === 'ArrowDown' || event.key === 'ArrowRight') next = (current + 1) % buttons.length;
            else next = (current - 1 + buttons.length) % buttons.length;
            buttons[next].focus();
            setLibraryView(buttons[next].dataset.libraryTab);
        });

        setLibraryView('templates');
    }

    function getViewHint(view) {
        return copy[`${view}Hint`] || copy.libraryHint;
    }

    function renderLibraryShortcuts(view) {
        if (!shortcutsHost) return;
        shortcutsHost.replaceChildren();

        const intro = document.createElement('div');
        intro.className = 'editor-library-intro';
        intro.textContent = getViewHint(view);
        shortcutsHost.append(intro);

        if (view === 'templates') return;

        const list = document.createElement('div');
        list.className = view === 'layers' ? 'editor-layer-list' : 'editor-library-grid';

        const ids = viewItems[view] || [];
        ids.forEach((id, index) => {
            const item = inspectorItems.find((candidate) => candidate.id === id);
            if (!item) return;

            if (view === 'layers') {
                const row = document.createElement('div');
                row.className = 'editor-layer-row';
                row.dataset.layerId = item.id;
                row.draggable = true;

                const dragHandle = createButton(
                    'editor-layer-drag-handle',
                    isEnglish ? `Reorder ${item.label}` : `إعادة ترتيب ${item.label}`,
                    'fa-grip-vertical'
                );
                dragHandle.dataset.layerHandle = item.id;

                const button = createButton('editor-layer-item', item.label, item.icon);
                const order = document.createElement('small');
                const label = document.createElement('span');
                order.textContent = String(index + 1).padStart(2, '0');
                label.textContent = item.label;
                button.append(order, label);
                button.dataset.inspectorItem = item.id;

                const actions = document.createElement('div');
                actions.className = 'editor-layer-actions';
                const visibility = createButton(
                    'editor-layer-action',
                    isEnglish ? `Hide ${item.label}` : `إخفاء ${item.label}`,
                    'fa-eye'
                );
                visibility.dataset.layerAction = 'visibility';
                visibility.dataset.layerId = item.id;
                visibility.setAttribute('aria-pressed', 'false');

                const lock = createButton(
                    'editor-layer-action',
                    isEnglish ? `Lock ${item.label}` : `قفل ${item.label}`,
                    'fa-lock-open'
                );
                lock.dataset.layerAction = 'lock';
                lock.dataset.layerId = item.id;
                lock.setAttribute('aria-pressed', 'false');

                actions.append(visibility, lock);
                row.append(dragHandle, button, actions);
                list.append(row);
                return;
            }

            const button = createButton(
                'editor-library-shortcut',
                item.label,
                item.icon
            );
            const label = document.createElement('span');
            label.textContent = item.label;
            button.append(label);
            button.dataset.inspectorItem = item.id;
            list.append(button);
        });

        if (view === 'images') {
            const backgroundButton = createButton(
                'editor-library-shortcut',
                isEnglish ? 'Card background' : 'خلفية البطاقة',
                'fa-fill-drip'
            );
            const label = document.createElement('span');
            label.textContent = isEnglish ? 'Card background' : 'خلفية البطاقة';
            backgroundButton.append(label);
            backgroundButton.dataset.libraryAction = 'background';
            list.prepend(backgroundButton);
        }

        shortcutsHost.append(list);
        shortcutsHost.querySelectorAll('[data-inspector-item]').forEach((button) => {
            button.addEventListener('click', () => selectInspector(button.dataset.inspectorItem));
        });
        const backgroundButton = shortcutsHost.querySelector('[data-library-action="background"]');
        if (backgroundButton) {
            backgroundButton.addEventListener('click', () => {
                const backgrounds = document.getElementById('backgrounds-accordion');
                if (backgrounds) {
                    backgrounds.classList.remove('editor-library-section-hidden');
                    backgrounds.open = true;
                    backgrounds.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }
                selectInspector('card', { activatePanel: false });
            });
        }
        updateSelectionUI();
    }

    function setLibraryView(view) {
        if (!libraryViews.some((candidate) => candidate.id === view)) return false;
        state.libraryView = view;

        document.querySelectorAll('[data-library-tab]').forEach((button) => {
            const selected = button.dataset.libraryTab === view;
            button.setAttribute('aria-selected', selected ? 'true' : 'false');
            button.tabIndex = selected ? 0 : -1;
        });
        const content = document.getElementById('editor-library-content');
        if (content) content.setAttribute('aria-labelledby', `editor-library-tab-${view}`);

        document.querySelectorAll('[data-library-section]').forEach((section) => {
            section.classList.toggle('editor-library-section-hidden', section.dataset.librarySection !== view);
        });
        renderLibraryShortcuts(view);
        emit('editor:librarychange', { view });
        return true;
    }

    function setupInspector() {
        inspectorPanel = document.getElementById('panel-elements');
        if (!inspectorPanel) return;

        inspectorDetails = Array.from(inspectorPanel.children)
            .filter((element) => element.matches('details.fieldset-accordion'));

        const heading = createPanelHeading(copy.inspectorTitle, copy.inspectorHint);
        heading.heading.classList.add('editor-inspector-heading');

        const selected = document.createElement('div');
        selected.className = 'editor-inspector-selection';
        inspectorIcon = createIcon('fa-id-card');
        inspectorTitle = document.createElement('strong');
        inspectorTitle.textContent = copy.cardSettingsTitle;
        selected.append(inspectorIcon, inspectorTitle);
        heading.heading.append(selected);

        cardInspector = document.createElement('section');
        cardInspector.className = 'editor-card-inspector';
        cardInspector.id = 'editor-card-inspector';

        const cardIcon = createIcon('fa-id-card');
        const title = document.createElement('h3');
        const body = document.createElement('p');
        title.textContent = copy.cardSettingsTitle;
        body.textContent = copy.cardSettingsBody;

        const actions = document.createElement('div');
        actions.className = 'editor-card-inspector-actions';
        const designButton = createButton('btn btn-primary', copy.openDesign, 'fa-palette');
        const designLabel = document.createElement('span');
        designLabel.textContent = copy.openDesign;
        designButton.append(designLabel);
        designButton.addEventListener('click', () => openLibraryPanel('images'));

        const templatesButton = createButton('btn btn-secondary', copy.openTemplates, 'fa-th-large');
        const templatesLabel = document.createElement('span');
        templatesLabel.textContent = copy.openTemplates;
        templatesButton.append(templatesLabel);
        templatesButton.addEventListener('click', () => openLibraryPanel('templates'));

        actions.append(designButton, templatesButton);
        cardInspector.append(cardIcon, title, body, actions);
        inspectorPanel.prepend(heading.heading, cardInspector);
    }

    function openLibraryPanel(view) {
        setLibraryView(view);
        activateMobilePanel('panel-design');
        const selectedTab = document.querySelector(`[data-library-tab="${view}"]`);
        if (selectedTab && global.innerWidth > 1024) selectedTab.focus();
    }

    function updateSelectionUI() {
        const item = inspectorItems.find((candidate) => candidate.id === state.selectedItem);
        const label = item ? item.label : copy.cardSettingsTitle;
        const iconName = item ? item.icon : 'fa-id-card';

        if (inspectorTitle) inspectorTitle.textContent = label;
        if (inspectorIcon) inspectorIcon.className = `fas ${iconName}`;

        document.querySelectorAll('[data-inspector-item]').forEach((button) => {
            const selected = button.dataset.inspectorItem === state.selectedItem;
            button.classList.toggle('is-selected', selected);
            button.setAttribute('aria-pressed', selected ? 'true' : 'false');
        });
    }

    function clearCanvasSelection() {
        document.querySelectorAll('.editor-element-selected').forEach((element) => {
            element.classList.remove('editor-element-selected');
            element.removeAttribute('aria-current');
        });
    }

    function elementBelongsToActiveFace(element) {
        if (!element) return false;
        const card = element.closest('.business-card');
        return !card || card.id === `card-${state.face}-preview`;
    }

    function markCanvasSelection(item, preferredElement) {
        clearCanvasSelection();
        if (!item) return;
        if (preferredElement && elementBelongsToActiveFace(preferredElement)) {
            preferredElement.classList.add('editor-element-selected');
            preferredElement.setAttribute('aria-current', 'true');
            return;
        }
        for (const selector of item.selectors) {
            const candidates = Array.from(document.querySelectorAll(selector));
            const element = candidates.find((candidate) => elementBelongsToActiveFace(candidate) && !candidate.hidden)
                || candidates.find((candidate) => !candidate.hidden)
                || candidates[0];
            if (!element) continue;
            element.classList.add('editor-element-selected');
            element.setAttribute('aria-current', 'true');
            break;
        }
    }

    function selectInspector(id, options) {
        const settings = { activatePanel: true, focusPanel: false, ...(options || {}) };
        const item = inspectorItems.find((candidate) => candidate.id === id);
        state.selectedItem = item ? item.id : 'card';

        inspectorDetails.forEach((details) => {
            const selected = item && details.id === item.panelId;
            details.classList.toggle('editor-inspector-filtered', !selected);
            if (selected) details.open = true;
        });
        if (cardInspector) cardInspector.hidden = Boolean(item);

        markCanvasSelection(item, settings.element);
        updateSelectionUI();

        if (settings.activatePanel) activateMobilePanel('panel-elements');
        if (settings.focusPanel && item) {
            const summary = document.querySelector(`#${item.panelId} > summary`);
            if (summary) summary.focus();
        }
        if (inspectorPanel && typeof inspectorPanel.scrollTo === 'function') {
            inspectorPanel.scrollTo({ top: 0, behavior: 'smooth' });
        }
        emit('editor:selectionchange', { id: state.selectedItem, item: item || null });
        return true;
    }

    function annotateCanvasElements() {
        inspectorItems.forEach((item) => {
            const elements = item.selectors.flatMap((selector) => Array.from(document.querySelectorAll(selector)));
            elements.forEach((element, index) => {
                if (!item.interactiveContainer && index === 0) {
                    if (!element.hasAttribute('tabindex')) element.tabIndex = 0;
                    if (!element.hasAttribute('role')) element.setAttribute('role', 'button');
                }
                element.setAttribute('aria-label', `${isEnglish ? 'Edit' : 'تعديل'} ${item.label}`);
                element.dataset.editorSelectable = item.id;
            });
        });
    }

    function makeCanvasElementsSelectable() {
        annotateCanvasElements();

        if (!cardsWrapper) return;
        const selectFromEvent = (event) => {
            const selectable = event.target.closest('[data-editor-selectable]');
            if (selectable) {
                selectInspector(selectable.dataset.editorSelectable, { element: selectable });
                return true;
            }
            if (event.target.closest('.business-card')) {
                selectInspector('card');
                return true;
            }
            return false;
        };

        // Interact.js may consume the trailing click after a drag-ready pointer
        // sequence. Select on pointerdown in the capture phase so the inspector
        // always opens for elements on either face, while leaving the event
        // untouched for dragging, links and native controls.
        cardsWrapper.addEventListener('pointerdown', (event) => {
            if (event.button !== 0) return;
            selectFromEvent(event);
        }, true);
        cardsWrapper.addEventListener('click', (event) => {
            if (selectFromEvent(event)) event.preventDefault();
        });
        cardsWrapper.addEventListener('keydown', (event) => {
            if (!['Enter', ' '].includes(event.key)) return;
            const selectable = event.target.closest('[data-editor-selectable]');
            if (!selectable) return;
            event.preventDefault();
            selectInspector(selectable.dataset.editorSelectable, { focusPanel: true });
        });

        const observer = new global.MutationObserver(() => annotateCanvasElements());
        observer.observe(cardsWrapper, { childList: true, subtree: true });
    }

    function createCanvasToolbar() {
        canvas = document.querySelector('.pro-canvas');
        cardsWrapper = document.getElementById('cards-wrapper');
        if (!canvas || !cardsWrapper) return;

        const toolbar = document.createElement('div');
        toolbar.className = 'editor-canvas-toolbar';
        toolbar.setAttribute('role', 'toolbar');
        toolbar.setAttribute('aria-label', copy.canvasLabel);

        const faces = document.createElement('div');
        faces.className = 'editor-face-switcher';
        faces.setAttribute('role', 'tablist');

        [
            { id: 'front', label: copy.front, icon: 'fa-id-card' },
            { id: 'back', label: copy.back, icon: 'fa-address-card' }
        ].forEach((face, index) => {
            const button = createButton('editor-face-button', face.label, face.icon);
            const label = document.createElement('span');
            label.textContent = face.label;
            button.append(label);
            button.dataset.editorFace = face.id;
            button.setAttribute('role', 'tab');
            button.setAttribute('aria-selected', index === 0 ? 'true' : 'false');
            faces.append(button);
        });

        const tools = document.createElement('div');
        tools.className = 'editor-canvas-tools';

        const gridButton = createButton('editor-canvas-tool', copy.grid, 'fa-border-all');
        gridButton.dataset.canvasAction = 'grid';
        gridButton.setAttribute('aria-pressed', 'false');

        const zoom = document.createElement('div');
        zoom.className = 'editor-zoom-control';
        const zoomOut = createButton('editor-canvas-tool', copy.zoomOut, 'fa-minus');
        zoomOut.dataset.canvasAction = 'zoom-out';
        zoomOutput = createButton('editor-zoom-output', copy.fit);
        zoomOutput.dataset.canvasAction = 'fit';
        zoomOutput.textContent = '100%';
        const zoomIn = createButton('editor-canvas-tool', copy.zoomIn, 'fa-plus');
        zoomIn.dataset.canvasAction = 'zoom-in';
        zoom.append(zoomOut, zoomOutput, zoomIn);

        tools.append(gridButton, zoom);
        toolbar.append(faces, tools);
        canvas.insertBefore(toolbar, cardsWrapper);

        toolbar.addEventListener('click', (event) => {
            const faceButton = event.target.closest('[data-editor-face]');
            if (faceButton) {
                setFace(faceButton.dataset.editorFace);
                return;
            }
            const action = event.target.closest('[data-canvas-action]')?.dataset.canvasAction;
            if (action === 'zoom-out') setZoom(state.zoom - 0.1);
            if (action === 'zoom-in') setZoom(state.zoom + 0.1);
            if (action === 'fit') setZoom(1);
            if (action === 'grid') toggleGrid();
        });

        setFace('front');
        setZoom(1);
    }

    function setFace(face) {
        if (!['front', 'back'].includes(face) || !canvas) return false;
        state.face = face;
        canvas.dataset.editorFace = face;
        document.querySelectorAll('[data-editor-face]').forEach((button) => {
            button.setAttribute('aria-selected', button.dataset.editorFace === face ? 'true' : 'false');
        });
        selectInspector('card', { activatePanel: false });
        emit('editor:facechange', { face });
        return true;
    }

    function setZoom(value) {
        if (!canvas) return false;
        state.zoom = Math.min(1.35, Math.max(0.65, Math.round(value * 20) / 20));
        canvas.style.setProperty('--editor-canvas-scale', String(state.zoom));
        if (zoomOutput) {
            const label = `${Math.round(state.zoom * 100)}%`;
            zoomOutput.textContent = label;
            zoomOutput.setAttribute('aria-label', `${copy.fit}: ${label}`);
        }
        emit('editor:zoomchange', { zoom: state.zoom });
        return true;
    }

    function toggleGrid() {
        if (!canvas) return false;
        state.grid = !state.grid;
        canvas.dataset.grid = state.grid ? 'true' : 'false';
        const button = canvas.querySelector('[data-canvas-action="grid"]');
        if (button) button.setAttribute('aria-pressed', state.grid ? 'true' : 'false');
        emit('editor:gridchange', { enabled: state.grid });
        return state.grid;
    }

    function activateMobilePanel(id) {
        if (global.innerWidth > 1024) return;
        document.querySelectorAll('.pro-sidebar').forEach((panel) => {
            panel.classList.toggle('active-view', panel.id === id);
        });
        document.querySelectorAll('.mobile-nav-item[data-target]').forEach((button) => {
            const selected = button.dataset.target === id;
            button.classList.toggle('active', selected);
            button.setAttribute('aria-selected', selected ? 'true' : 'false');
        });
    }

    function setupSheetHandles() {
        document.querySelectorAll('.pro-sidebar').forEach((panel) => {
            const handle = document.createElement('button');
            handle.type = 'button';
            handle.className = 'editor-sheet-handle';
            handle.setAttribute('role', 'separator');
            handle.setAttribute('aria-orientation', 'horizontal');
            handle.setAttribute('aria-label', copy.sheetLabel);
            handle.setAttribute('aria-valuemin', '35');
            handle.setAttribute('aria-valuemax', '78');
            handle.setAttribute('aria-valuenow', '55');
            panel.prepend(handle);

            handle.addEventListener('pointerdown', (event) => {
                if (global.innerWidth > 1024) return;
                event.preventDefault();
                const startY = event.clientY;
                const startHeight = panel.getBoundingClientRect().height;
                if (typeof handle.setPointerCapture === 'function') handle.setPointerCapture(event.pointerId);

                const move = (moveEvent) => {
                    setSheetHeight(panel, startHeight + startY - moveEvent.clientY, handle);
                };
                const end = () => {
                    handle.removeEventListener('pointermove', move);
                    handle.removeEventListener('pointerup', end);
                    handle.removeEventListener('pointercancel', end);
                };
                handle.addEventListener('pointermove', move);
                handle.addEventListener('pointerup', end);
                handle.addEventListener('pointercancel', end);
            });

            handle.addEventListener('keydown', (event) => {
                if (!['ArrowUp', 'ArrowDown', 'Home', 'End'].includes(event.key)) return;
                event.preventDefault();
                const current = panel.getBoundingClientRect().height || global.innerHeight * 0.55;
                if (event.key === 'Home') setSheetHeight(panel, global.innerHeight * 0.35, handle);
                else if (event.key === 'End') setSheetHeight(panel, global.innerHeight * 0.78, handle);
                else setSheetHeight(panel, current + (event.key === 'ArrowUp' ? 48 : -48), handle);
            });

            handle.addEventListener('dblclick', () => {
                panel.style.removeProperty('--editor-sheet-height');
                handle.setAttribute('aria-valuenow', '55');
            });
        });
    }

    function setSheetHeight(panel, requestedHeight, handle) {
        const viewport = global.innerHeight || 800;
        const height = Math.min(viewport * 0.78, Math.max(viewport * 0.35, requestedHeight));
        const percentage = Math.round((height / viewport) * 100);
        panel.style.setProperty('--editor-sheet-height', `${height}px`);
        handle.setAttribute('aria-valuenow', String(percentage));
    }

    function initialize() {
        if (state.initialized) return;
        state.initialized = true;
        setupLibrary();
        setupInspector();
        createCanvasToolbar();
        makeCanvasElementsSelectable();
        setupSheetHandles();
        selectInspector('card', { activatePanel: false });
        document.body.classList.add('editor-workspace-ready');
        document.documentElement.dataset.editorWorkspace = 'ready';
        emit('editor:workspaceready', { state: { ...state } });
    }

    global.EditorWorkspace = {
        init: initialize,
        select: selectInspector,
        setLibraryView,
        setFace,
        setZoom,
        toggleGrid,
        refreshCanvasElements: annotateCanvasElements,
        getItems: () => inspectorItems.map((item) => ({ ...item, selectors: [...item.selectors] })),
        getState: () => ({ ...state })
    };

    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initialize, { once: true });
    else initialize();
}(typeof window !== 'undefined' ? window : globalThis));
