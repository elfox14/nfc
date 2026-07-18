/* global DragManager, StateManager */
(function initializeEditorProductivityTools(global) {
  'use strict';

  const document = global.document;
  if (!document || global.EditorProductivityTools) return;

  const VERSION = '9.0.0';
  const GROUP_INPUT_ID = 'editor-layer-groups';
  const CLIPBOARD_KEY = 'mcprime-editor-productivity-clipboard-v1';
  const FIXED_PLACEMENT_IDS = new Set(['logo', 'photo', 'name', 'tagline', 'qr']);
  const isEnglish = document.documentElement.lang.toLowerCase().startsWith('en');

  const copy = isEnglish ? {
    selected: 'selected', clear: 'Clear selection', group: 'Group', ungroup: 'Ungroup',
    copy: 'Copy layout', paste: 'Paste layout', otherFace: 'Move to other face',
    alignLeft: 'Align left', alignCenter: 'Align horizontal centers', alignRight: 'Align right',
    alignTop: 'Align top', alignMiddle: 'Align vertical centers', alignBottom: 'Align bottom',
    distributeH: 'Distribute horizontally', distributeV: 'Distribute vertically',
    lock: 'Lock selection', hide: 'Hide selection', selectTwo: 'Select at least two layers first.',
    selectThree: 'Select at least three layers first.', sameFace: 'Selected layers must be on the same card face.',
    grouped: 'Layers grouped.', ungrouped: 'Group removed.', copied: 'Layout copied.',
    pasted: 'Layout pasted.', clipboardEmpty: 'Copy a layer layout first.', movedFace: 'Layers moved to the other face.',
    unsupportedFace: 'Only logo, photo, name, job title, and QR can be moved between faces.',
    context: 'Selection actions', marquee: 'Drag to select multiple elements', locked: 'Locked layers were skipped.'
  } : {
    selected: 'محدد', clear: 'إلغاء التحديد', group: 'تجميع', ungroup: 'فك التجميع',
    copy: 'نسخ التخطيط', paste: 'لصق التخطيط', otherFace: 'نقل للوجه الآخر',
    alignLeft: 'محاذاة لليسار', alignCenter: 'توسيط أفقي', alignRight: 'محاذاة لليمين',
    alignTop: 'محاذاة للأعلى', alignMiddle: 'توسيط رأسي', alignBottom: 'محاذاة للأسفل',
    distributeH: 'توزيع أفقي', distributeV: 'توزيع رأسي',
    lock: 'قفل المحدد', hide: 'إخفاء المحدد', selectTwo: 'حدد طبقتين على الأقل أولًا.',
    selectThree: 'حدد ثلاث طبقات على الأقل أولًا.', sameFace: 'يجب أن تكون الطبقات المحددة على الوجه نفسه.',
    grouped: 'تم تجميع الطبقات.', ungrouped: 'تم فك التجميع.', copied: 'تم نسخ التخطيط.',
    pasted: 'تم لصق التخطيط.', clipboardEmpty: 'انسخ تخطيط طبقة أولًا.', movedFace: 'تم نقل الطبقات إلى الوجه الآخر.',
    unsupportedFace: 'يمكن نقل الشعار والصورة والاسم والمسمى وQR فقط بين الوجهين.',
    context: 'إجراءات التحديد', marquee: 'اسحب لتحديد عدة عناصر', locked: 'تم تجاهل الطبقات المقفلة.'
  };

  const state = {
    initialized: false,
    selected: new Set(),
    primary: null,
    groups: [],
    clipboard: null,
    toolbar: null,
    contextMenu: null,
    marquee: null,
    drag: null,
    suppressWorkspaceSelection: false,
    patchedDragManager: false,
    patchedStateManager: false
  };

  let groupsInput;
  let cardsWrapper;

  function emit(name, detail) {
    document.dispatchEvent(new global.CustomEvent(name, { detail }));
  }

  function announce(message) {
    if (global.UIManager?.announce) global.UIManager.announce(message);
    else if (global.EditorUIState?.set) global.EditorUIState.set('success', message);
  }

  function createIcon(name) {
    const icon = document.createElement('i');
    icon.className = `fas ${name}`;
    icon.setAttribute('aria-hidden', 'true');
    return icon;
  }

  function createButton(action, label, iconName, className = 'editor-productivity-action') {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = className;
    button.dataset.productivityAction = action;
    button.title = label;
    button.setAttribute('aria-label', label);
    button.append(createIcon(iconName));
    return button;
  }

  function ensureHiddenInput() {
    let input = document.getElementById(GROUP_INPUT_ID);
    if (!input) {
      input = document.createElement('input');
      input.type = 'hidden';
      input.id = GROUP_INPUT_ID;
      input.value = '[]';
      input.dataset.editorProductivityMetadata = 'true';
      document.body.append(input);
    }
    return input;
  }

  function workspaceItems() {
    return global.EditorWorkspace?.getItems?.() || [];
  }

  function validIds() {
    return new Set(workspaceItems().map((item) => item.id));
  }

  function currentFace() {
    return global.EditorWorkspace?.getState?.().face || 'front';
  }

  function cardForFace(face = currentFace()) {
    return document.getElementById(`card-${face}-preview`) ||
      document.querySelector(`.business-card.card-${face}, .business-card[data-face="${face}"]`);
  }

  function getIdFromElement(element) {
    if (!element) return null;
    const selectable = element.closest?.('[data-editor-selectable]');
    if (selectable?.dataset.editorSelectable) return selectable.dataset.editorSelectable;
    for (const item of workspaceItems()) {
      if ((global.EditorLayers?.getTargets?.(item.id) || []).some((target) => target === element || target.contains?.(element))) {
        return item.id;
      }
    }
    return null;
  }

  function primaryElement(id, face = currentFace()) {
    const card = cardForFace(face);
    const targets = global.EditorLayers?.getTargets?.(id) || [];
    return targets.find((element) => !element.hidden && (!card || element.closest('.business-card') === card)) ||
      targets.find((element) => !element.hidden) || targets[0] || null;
  }

  function isLocked(id) {
    const target = primaryElement(id);
    return Boolean(target && (target.dataset.layerLocked === 'true' || target.closest('[data-layer-locked="true"]')));
  }

  function getGroupForId(id, face = currentFace()) {
    return state.groups.find((group) => group.face === face && group.members.includes(id)) || null;
  }

  function sanitizeGroups(value) {
    const ids = validIds();
    if (!Array.isArray(value)) return [];
    return value.map((group, index) => ({
      id: String(group?.id || `group-${index + 1}`).slice(0, 80),
      name: String(group?.name || `Group ${index + 1}`).slice(0, 80),
      face: group?.face === 'back' ? 'back' : 'front',
      members: Array.from(new Set(Array.isArray(group?.members) ? group.members.filter((id) => ids.has(id)) : []))
    })).filter((group) => group.members.length >= 2);
  }

  function readGroups() {
    try { return sanitizeGroups(JSON.parse(groupsInput?.value || '[]')); }
    catch (_error) { return []; }
  }

  function writeGroups(groups, reason) {
    state.groups = sanitizeGroups(groups);
    if (groupsInput) {
      groupsInput.value = JSON.stringify(state.groups);
      groupsInput.dispatchEvent(new global.Event('input', { bubbles: true }));
      groupsInput.dispatchEvent(new global.Event('change', { bubbles: true }));
    }
    global.StateManager?.saveDebounced?.();
    syncGroupBadges();
    emit('editor:productivitygroupschange', { groups: state.groups.map((group) => ({ ...group, members: [...group.members] })), reason });
  }

  function readClipboard() {
    try {
      const parsed = JSON.parse(global.localStorage?.getItem(CLIPBOARD_KEY) || 'null');
      return parsed && Array.isArray(parsed.items) ? parsed : null;
    } catch (_error) { return null; }
  }

  function writeClipboard(value) {
    state.clipboard = value;
    try { global.localStorage?.setItem(CLIPBOARD_KEY, JSON.stringify(value)); }
    catch (_error) { /* optional storage */ }
  }

  function expandedSelection(ids, face = currentFace()) {
    const expanded = new Set(ids);
    Array.from(expanded).forEach((id) => {
      const group = getGroupForId(id, face);
      group?.members.forEach((member) => expanded.add(member));
    });
    return expanded;
  }

  function selectableOnFace(id, face = currentFace()) {
    const element = primaryElement(id, face);
    return Boolean(element && !element.hidden && element.closest('.business-card') === cardForFace(face));
  }

  function renderSelection() {
    const face = currentFace();
    document.querySelectorAll('.editor-productivity-selected').forEach((element) => {
      element.classList.remove('editor-productivity-selected');
      element.removeAttribute('aria-selected');
    });
    document.querySelectorAll('.editor-layer-row.is-multi-selected').forEach((row) => row.classList.remove('is-multi-selected'));

    state.selected.forEach((id) => {
      const element = primaryElement(id, face);
      if (element) {
        element.classList.add('editor-productivity-selected');
        element.setAttribute('aria-selected', 'true');
      }
      const row = document.querySelector(`.editor-layer-row[data-layer-id="${global.CSS?.escape ? global.CSS.escape(id) : id}"]`);
      row?.classList.add('is-multi-selected');
    });

    const count = state.selected.size;
    document.documentElement.dataset.editorProductivitySelection = String(count);
    document.documentElement.dataset.editorProductivityGrouped = state.primary && getGroupForId(state.primary) ? 'true' : 'false';
    if (state.toolbar) {
      state.toolbar.hidden = count === 0;
      const output = state.toolbar.querySelector('[data-productivity-count]');
      if (output) output.textContent = `${count} ${copy.selected}`;
      state.toolbar.querySelectorAll('[data-min-selection]').forEach((button) => {
        button.disabled = count < Number(button.dataset.minSelection || 1);
      });
      const pasteButton = state.toolbar.querySelector('[data-productivity-action="paste"]');
      if (pasteButton) pasteButton.disabled = !state.clipboard || count === 0;
    }
    syncGroupBadges();
  }

  function setSelection(ids, options = {}) {
    const settings = { expandGroups: true, syncWorkspace: true, primary: null, ...options };
    const face = currentFace();
    let next = new Set(Array.from(ids || []).filter((id) => validIds().has(id) && selectableOnFace(id, face)));
    if (settings.expandGroups) next = expandedSelection(next, face);
    state.selected = next;
    state.primary = settings.primary && next.has(settings.primary) ? settings.primary : next.values().next().value || null;

    if (settings.syncWorkspace && state.primary && global.EditorWorkspace?.select) {
      state.suppressWorkspaceSelection = true;
      global.EditorWorkspace.select(state.primary, { activatePanel: false });
      state.suppressWorkspaceSelection = false;
    }
    renderSelection();
    emit('editor:productivityselectionchange', { ids: [...state.selected], primary: state.primary, face });
    return [...state.selected];
  }

  function toggleSelection(id) {
    const next = new Set(state.selected);
    const group = getGroupForId(id);
    const members = group ? group.members : [id];
    const removing = members.every((member) => next.has(member));
    members.forEach((member) => removing ? next.delete(member) : next.add(member));
    return setSelection(next, { expandGroups: false, primary: removing ? null : id });
  }

  function clearSelection() {
    state.selected.clear();
    state.primary = null;
    renderSelection();
    closeContextMenu();
    emit('editor:productivityselectionchange', { ids: [], primary: null, face: currentFace() });
  }

  function selectionGeometry() {
    const face = currentFace();
    const card = cardForFace(face);
    if (!card) return [];
    const cardRect = card.getBoundingClientRect();
    const scale = (card.offsetWidth || cardRect.width) ? cardRect.width / (card.offsetWidth || cardRect.width) : 1;
    return [...state.selected].map((id) => {
      const element = primaryElement(id, face);
      if (!element || element.hidden || element.closest('.business-card') !== card) return null;
      const rect = element.getBoundingClientRect();
      return {
        id, element, rect, card, cardRect, scale,
        x: Number.parseFloat(element.dataset.x) || 0,
        y: Number.parseFloat(element.dataset.y) || 0
      };
    }).filter(Boolean);
  }

  function applyDirectPosition(id, element, x, y) {
    if (!element) return;
    const appearance = global.EditorLayers?.getAppearance?.(id) || { scale: 1, rotation: 0, opacity: 1 };
    element.dataset.x = String(Math.round(x * 100) / 100);
    element.dataset.y = String(Math.round(y * 100) / 100);
    element.style.transform = `translate(${x}px, ${y}px) rotate(${appearance.rotation || 0}deg) scale(${appearance.scale || 1})`;
    element.style.opacity = String(appearance.opacity ?? 1);
  }

  function commitPositions(entries, source) {
    let changed = 0;
    entries.forEach(({ id, x, y }) => {
      if (isLocked(id)) return;
      if (global.EditorLayers?.setPosition?.(id, x, y)) changed += 1;
    });
    if (changed) {
      emit('editor:productivitymove', { ids: entries.map((entry) => entry.id), source });
      global.EditorProductionGuard?.markDirty?.(`productivity:${source}`);
    }
    return changed;
  }

  function alignSelection(action) {
    const items = selectionGeometry().filter((item) => !isLocked(item.id));
    if (items.length < 2) { announce(copy.selectTwo); return false; }
    const bounds = {
      left: Math.min(...items.map((item) => item.rect.left)),
      right: Math.max(...items.map((item) => item.rect.right)),
      top: Math.min(...items.map((item) => item.rect.top)),
      bottom: Math.max(...items.map((item) => item.rect.bottom))
    };
    const centerX = (bounds.left + bounds.right) / 2;
    const centerY = (bounds.top + bounds.bottom) / 2;
    const changes = items.map((item) => {
      let dx = 0; let dy = 0;
      if (action === 'left') dx = bounds.left - item.rect.left;
      if (action === 'center') dx = centerX - (item.rect.left + item.rect.width / 2);
      if (action === 'right') dx = bounds.right - item.rect.right;
      if (action === 'top') dy = bounds.top - item.rect.top;
      if (action === 'middle') dy = centerY - (item.rect.top + item.rect.height / 2);
      if (action === 'bottom') dy = bounds.bottom - item.rect.bottom;
      return { id: item.id, x: item.x + dx / item.scale, y: item.y + dy / item.scale };
    });
    commitPositions(changes, `align-${action}`);
    return true;
  }

  function distributeSelection(axis) {
    const items = selectionGeometry().filter((item) => !isLocked(item.id));
    if (items.length < 3) { announce(copy.selectThree); return false; }
    const horizontal = axis === 'horizontal';
    const sorted = [...items].sort((a, b) => {
      const ac = horizontal ? a.rect.left + a.rect.width / 2 : a.rect.top + a.rect.height / 2;
      const bc = horizontal ? b.rect.left + b.rect.width / 2 : b.rect.top + b.rect.height / 2;
      return ac - bc;
    });
    const firstCenter = horizontal
      ? sorted[0].rect.left + sorted[0].rect.width / 2
      : sorted[0].rect.top + sorted[0].rect.height / 2;
    const last = sorted[sorted.length - 1];
    const lastCenter = horizontal ? last.rect.left + last.rect.width / 2 : last.rect.top + last.rect.height / 2;
    const step = (lastCenter - firstCenter) / (sorted.length - 1);
    const changes = sorted.slice(1, -1).map((item, index) => {
      const expected = firstCenter + step * (index + 1);
      const current = horizontal ? item.rect.left + item.rect.width / 2 : item.rect.top + item.rect.height / 2;
      return {
        id: item.id,
        x: item.x + (horizontal ? (expected - current) / item.scale : 0),
        y: item.y + (horizontal ? 0 : (expected - current) / item.scale)
      };
    });
    commitPositions(changes, `distribute-${axis}`);
    return true;
  }

  function groupSelection() {
    const members = [...state.selected];
    if (members.length < 2) { announce(copy.selectTwo); return false; }
    const face = currentFace();
    if (members.some((id) => !selectableOnFace(id, face))) { announce(copy.sameFace); return false; }
    const memberSet = new Set(members);
    const remaining = state.groups.map((group) => ({ ...group, members: group.members.filter((id) => !memberSet.has(id)) }))
      .filter((group) => group.members.length >= 2);
    const group = {
      id: `group-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      name: `${isEnglish ? 'Group' : 'مجموعة'} ${remaining.length + 1}`,
      face,
      members
    };
    writeGroups([group, ...remaining], 'group');
    setSelection(members, { expandGroups: false, primary: members[0] });
    announce(copy.grouped);
    return group;
  }

  function ungroupSelection() {
    const selected = new Set(state.selected);
    const next = state.groups.filter((group) => !group.members.some((id) => selected.has(id)));
    if (next.length === state.groups.length) return false;
    writeGroups(next, 'ungroup');
    setSelection(selected, { expandGroups: false, primary: state.primary });
    announce(copy.ungrouped);
    return true;
  }

  function copySelection() {
    const items = selectionGeometry().map((item) => ({
      id: item.id,
      face: currentFace(),
      position: { x: item.x, y: item.y },
      appearance: global.EditorLayers?.getAppearance?.(item.id) || { scale: 1, rotation: 0, opacity: 1 }
    }));
    if (!items.length) return false;
    const clipboard = { version: 1, copiedAt: Date.now(), items };
    writeClipboard(clipboard);
    renderSelection();
    announce(copy.copied);
    emit('editor:productivitycopy', { count: items.length, face: currentFace() });
    return clipboard;
  }

  function pasteSelection() {
    const clipboard = state.clipboard || readClipboard();
    const targets = selectionGeometry().filter((item) => !isLocked(item.id));
    if (!clipboard?.items?.length) { announce(copy.clipboardEmpty); return false; }
    if (!targets.length) return false;
    targets.forEach((target, index) => {
      const source = clipboard.items[index] || clipboard.items[0];
      const offset = source.id === target.id && source.face === currentFace() ? 12 : 0;
      global.EditorLayers?.setAppearance?.(target.id, { ...source.appearance });
      global.EditorLayers?.setPosition?.(target.id, Number(source.position?.x || 0) + offset, Number(source.position?.y || 0) + offset);
    });
    announce(copy.pasted);
    emit('editor:productivitypaste', { ids: targets.map((item) => item.id), sourceFace: clipboard.items[0].face, targetFace: currentFace() });
    return true;
  }

  function moveToOtherFace() {
    const selected = [...state.selected].filter((id) => FIXED_PLACEMENT_IDS.has(id));
    if (!selected.length) { announce(copy.unsupportedFace); return false; }
    const targetFace = currentFace() === 'front' ? 'back' : 'front';
    selected.forEach((id) => {
      const radio = document.querySelector(`input[name="placement-${id}"][value="${targetFace}"]`);
      if (!radio) return;
      document.querySelectorAll(`input[name="placement-${id}"]`).forEach((input) => {
        input.checked = input === radio;
        input.closest('label')?.classList.toggle('lp-place-active', input === radio);
      });
      radio.dispatchEvent(new global.Event('input', { bubbles: true }));
      radio.dispatchEvent(new global.Event('change', { bubbles: true }));
    });
    global.StateManager?.saveDebounced?.();
    global.setTimeout(() => {
      global.EditorWorkspace?.setFace?.(targetFace);
      setSelection(selected, { expandGroups: false, primary: selected[0] });
    }, 60);
    announce(copy.movedFace);
    emit('editor:productivityfacechange', { ids: selected, face: targetFace });
    return true;
  }

  function lockSelection() {
    [...state.selected].forEach((id) => { if (!isLocked(id)) global.EditorLayers?.toggleLock?.(id); });
    renderSelection();
    return true;
  }

  function hideSelection() {
    const ids = [...state.selected];
    ids.forEach((id) => { if (global.EditorLayers?.isVisible?.(id)) global.EditorLayers?.toggleVisibility?.(id); });
    clearSelection();
    return true;
  }

  function runAction(action) {
    const actions = {
      clear: clearSelection,
      group: groupSelection,
      ungroup: ungroupSelection,
      copy: copySelection,
      paste: pasteSelection,
      'other-face': moveToOtherFace,
      lock: lockSelection,
      hide: hideSelection,
      'align-left': () => alignSelection('left'),
      'align-center': () => alignSelection('center'),
      'align-right': () => alignSelection('right'),
      'align-top': () => alignSelection('top'),
      'align-middle': () => alignSelection('middle'),
      'align-bottom': () => alignSelection('bottom'),
      'distribute-horizontal': () => distributeSelection('horizontal'),
      'distribute-vertical': () => distributeSelection('vertical')
    };
    const result = actions[action]?.();
    closeContextMenu();
    return result ?? false;
  }

  function createToolbar() {
    const canvasToolbar = document.querySelector('.editor-canvas-toolbar');
    if (!canvasToolbar || document.getElementById('editor-productivity-toolbar')) return;
    const toolbar = document.createElement('div');
    toolbar.id = 'editor-productivity-toolbar';
    toolbar.className = 'editor-productivity-toolbar';
    toolbar.setAttribute('role', 'toolbar');
    toolbar.setAttribute('aria-label', copy.context);
    toolbar.hidden = true;

    const count = document.createElement('span');
    count.className = 'editor-productivity-count';
    count.dataset.productivityCount = 'true';
    toolbar.append(count);

    [
      ['align-left', copy.alignLeft, 'fa-align-left', 2],
      ['align-center', copy.alignCenter, 'fa-arrows-left-right-to-line', 2],
      ['align-right', copy.alignRight, 'fa-align-right', 2],
      ['align-top', copy.alignTop, 'fa-arrow-up', 2],
      ['align-middle', copy.alignMiddle, 'fa-arrows-up-down', 2],
      ['align-bottom', copy.alignBottom, 'fa-arrow-down', 2],
      ['distribute-horizontal', copy.distributeH, 'fa-arrows-left-right', 3],
      ['distribute-vertical', copy.distributeV, 'fa-arrows-up-down', 3],
      ['group', copy.group, 'fa-object-group', 2],
      ['ungroup', copy.ungroup, 'fa-object-ungroup', 1],
      ['copy', copy.copy, 'fa-copy', 1],
      ['paste', copy.paste, 'fa-paste', 1],
      ['other-face', copy.otherFace, 'fa-repeat', 1],
      ['clear', copy.clear, 'fa-xmark', 1]
    ].forEach(([action, label, icon, minimum]) => {
      const button = createButton(action, label, icon);
      button.dataset.minSelection = String(minimum);
      toolbar.append(button);
    });

    toolbar.addEventListener('click', (event) => {
      const button = event.target.closest('[data-productivity-action]');
      if (button && !button.disabled) runAction(button.dataset.productivityAction);
    });
    canvasToolbar.append(toolbar);
    state.toolbar = toolbar;
  }

  function createContextMenu() {
    if (document.getElementById('editor-productivity-context-menu')) return;
    const menu = document.createElement('div');
    menu.id = 'editor-productivity-context-menu';
    menu.className = 'editor-productivity-context-menu';
    menu.setAttribute('role', 'menu');
    menu.hidden = true;
    [
      ['copy', copy.copy, 'fa-copy'], ['paste', copy.paste, 'fa-paste'],
      ['group', copy.group, 'fa-object-group'], ['ungroup', copy.ungroup, 'fa-object-ungroup'],
      ['distribute-horizontal', copy.distributeH, 'fa-arrows-left-right'],
      ['distribute-vertical', copy.distributeV, 'fa-arrows-up-down'],
      ['other-face', copy.otherFace, 'fa-repeat'], ['lock', copy.lock, 'fa-lock'],
      ['hide', copy.hide, 'fa-eye-slash'], ['clear', copy.clear, 'fa-xmark']
    ].forEach(([action, label, icon]) => {
      const button = createButton(action, label, icon, 'editor-productivity-context-action');
      button.setAttribute('role', 'menuitem');
      const span = document.createElement('span');
      span.textContent = label;
      button.append(span);
      menu.append(button);
    });
    menu.addEventListener('click', (event) => {
      const button = event.target.closest('[data-productivity-action]');
      if (button) runAction(button.dataset.productivityAction);
    });
    document.body.append(menu);
    state.contextMenu = menu;
  }

  function openContextMenu(x, y) {
    createContextMenu();
    const menu = state.contextMenu;
    if (!menu) return;
    menu.hidden = false;
    menu.style.left = `${Math.min(x, global.innerWidth - 250)}px`;
    menu.style.top = `${Math.min(y, global.innerHeight - 360)}px`;
    menu.querySelector('[data-productivity-action="paste"]').disabled = !state.clipboard;
    menu.querySelector('[data-productivity-action="group"]').disabled = state.selected.size < 2;
    menu.querySelector('[data-productivity-action="distribute-horizontal"]').disabled = state.selected.size < 3;
    menu.querySelector('[data-productivity-action="distribute-vertical"]').disabled = state.selected.size < 3;
    menu.querySelector('button:not(:disabled)')?.focus();
  }

  function closeContextMenu() {
    if (state.contextMenu) state.contextMenu.hidden = true;
  }

  function syncGroupBadges() {
    document.querySelectorAll('[data-productivity-group-badge]').forEach((badge) => badge.remove());
    document.querySelectorAll('.editor-layer-row[data-layer-id]').forEach((row) => {
      const group = getGroupForId(row.dataset.layerId, currentFace());
      if (!group) return;
      const badge = document.createElement('span');
      badge.className = 'editor-productivity-group-badge';
      badge.dataset.productivityGroupBadge = group.id;
      badge.title = group.name;
      badge.append(createIcon('fa-link'));
      row.querySelector('.editor-layer-item')?.append(badge);
    });
  }

  function beginMarquee(event, card) {
    if (event.button !== 0 || event.pointerType === 'touch') return;
    if (event.target.closest('[data-editor-selectable],button,a,input,textarea,select')) return;
    const overlay = document.createElement('div');
    overlay.className = 'editor-selection-marquee';
    overlay.setAttribute('aria-label', copy.marquee);
    document.body.append(overlay);
    state.marquee = { startX: event.clientX, startY: event.clientY, x: event.clientX, y: event.clientY, overlay, card, moved: false };
    if (event.currentTarget?.setPointerCapture) event.currentTarget.setPointerCapture(event.pointerId);
  }

  function updateMarquee(event) {
    if (!state.marquee) return;
    state.marquee.x = event.clientX;
    state.marquee.y = event.clientY;
    const left = Math.min(state.marquee.startX, state.marquee.x);
    const top = Math.min(state.marquee.startY, state.marquee.y);
    const width = Math.abs(state.marquee.x - state.marquee.startX);
    const height = Math.abs(state.marquee.y - state.marquee.startY);
    state.marquee.moved = state.marquee.moved || width > 5 || height > 5;
    Object.assign(state.marquee.overlay.style, { left: `${left}px`, top: `${top}px`, width: `${width}px`, height: `${height}px` });
  }

  function finishMarquee(event) {
    if (!state.marquee) return;
    updateMarquee(event);
    const marquee = state.marquee;
    marquee.overlay.remove();
    state.marquee = null;
    if (!marquee.moved) { clearSelection(); return; }
    const box = {
      left: Math.min(marquee.startX, marquee.x), right: Math.max(marquee.startX, marquee.x),
      top: Math.min(marquee.startY, marquee.y), bottom: Math.max(marquee.startY, marquee.y)
    };
    const ids = workspaceItems().filter((item) => {
      const element = primaryElement(item.id, currentFace());
      if (!element || element.hidden || element.closest('.business-card') !== marquee.card) return false;
      const rect = element.getBoundingClientRect();
      return rect.right >= box.left && rect.left <= box.right && rect.bottom >= box.top && rect.top <= box.bottom;
    }).map((item) => item.id);
    setSelection(ids, { expandGroups: true, primary: ids[0] });
  }

  function setupSelectionEvents() {
    cardsWrapper = document.getElementById('cards-wrapper');
    if (!cardsWrapper) return;

    cardsWrapper.addEventListener('click', (event) => {
      const selectable = event.target.closest('[data-editor-selectable]');
      const id = getIdFromElement(selectable);
      if (!id) return;
      const modifier = event.ctrlKey || event.metaKey || event.shiftKey;
      if (modifier || (state.selected.size > 1 && state.selected.has(id))) {
        event.preventDefault();
        event.stopImmediatePropagation();
        if (modifier) toggleSelection(id);
        else setSelection(state.selected, { expandGroups: false, primary: id });
      } else {
        setSelection([id], { expandGroups: true, syncWorkspace: false, primary: id });
      }
    }, true);

    document.addEventListener('click', (event) => {
      const rowButton = event.target.closest('.editor-layer-item[data-inspector-item]');
      if (!rowButton) return;
      const id = rowButton.dataset.inspectorItem;
      const modifier = event.ctrlKey || event.metaKey || event.shiftKey;
      if (modifier || (state.selected.size > 1 && state.selected.has(id))) {
        event.preventDefault();
        event.stopImmediatePropagation();
        if (modifier) toggleSelection(id);
        else setSelection(state.selected, { expandGroups: false, primary: id });
      }
    }, true);

    cardsWrapper.addEventListener('contextmenu', (event) => {
      const id = getIdFromElement(event.target);
      if (!id) return;
      event.preventDefault();
      if (!state.selected.has(id)) setSelection([id], { expandGroups: true, primary: id });
      openContextMenu(event.clientX, event.clientY);
    }, true);

    cardsWrapper.addEventListener('pointerdown', (event) => {
      const card = event.target.closest('.business-card');
      if (card) beginMarquee(event, card);
    }, true);
    global.addEventListener('pointermove', updateMarquee, true);
    global.addEventListener('pointerup', finishMarquee, true);
    global.addEventListener('pointercancel', finishMarquee, true);

    document.addEventListener('editor:selectionchange', (event) => {
      if (state.suppressWorkspaceSelection) return;
      const id = event.detail?.id;
      if (!id || id === 'card') clearSelection();
      else setSelection([id], { expandGroups: true, syncWorkspace: false, primary: id });
    });
    document.addEventListener('editor:facechange', () => clearSelection());
    document.addEventListener('editor:librarychange', () => global.setTimeout(syncGroupBadges, 0));
    document.addEventListener('click', (event) => {
      if (!event.target.closest('#editor-productivity-context-menu')) closeContextMenu();
    });
  }

  function setupKeyboard() {
    document.addEventListener('keydown', (event) => {
      const editable = event.target?.matches?.('input,textarea,select,[contenteditable="true"]');
      if (event.key === 'Escape') { closeContextMenu(); if (!editable) clearSelection(); return; }
      if (editable) return;
      const modifier = event.ctrlKey || event.metaKey;
      if (modifier && event.key.toLowerCase() === 'c' && state.selected.size) {
        event.preventDefault(); copySelection(); return;
      }
      if (modifier && event.key.toLowerCase() === 'v' && state.selected.size) {
        event.preventDefault(); pasteSelection(); return;
      }
      if (modifier && event.key.toLowerCase() === 'g' && state.selected.size) {
        event.preventDefault(); if (event.shiftKey) ungroupSelection(); else groupSelection(); return;
      }
      if (!['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(event.key) || state.selected.size < 2) return;
      event.preventDefault();
      event.stopImmediatePropagation();
      const step = event.shiftKey ? 10 : 1;
      const changes = selectionGeometry().filter((item) => !isLocked(item.id)).map((item) => ({
        id: item.id,
        x: item.x + (event.key === 'ArrowLeft' ? -step : event.key === 'ArrowRight' ? step : 0),
        y: item.y + (event.key === 'ArrowUp' ? -step : event.key === 'ArrowDown' ? step : 0)
      }));
      commitPositions(changes, 'keyboard');
    }, true);
  }

  function patchDragManager() {
    if (state.patchedDragManager || !global.DragManager) return false;
    state.patchedDragManager = true;
    const originalStart = global.DragManager.dragStartListener;
    const originalMove = global.DragManager.dragMoveListener;
    const originalEnd = global.DragManager.dragEndListener;

    global.DragManager.dragStartListener = function productivityDragStart(event) {
      const result = originalStart?.call(this, event);
      const id = getIdFromElement(event.target);
      if (!id) return result;
      if (!state.selected.has(id)) setSelection([id], { expandGroups: true, primary: id });
      const items = selectionGeometry().filter((item) => !isLocked(item.id));
      const target = items.find((item) => item.id === id);
      if (target && items.length > 1) {
        state.drag = {
          targetId: id,
          targetStart: { x: target.x, y: target.y },
          items: items.map((item) => ({ id: item.id, element: item.element, x: item.x, y: item.y }))
        };
      }
      return result;
    };

    global.DragManager.dragMoveListener = function productivityDragMove(event) {
      const result = originalMove?.call(this, event);
      if (!state.drag || getIdFromElement(event.target) !== state.drag.targetId) return result;
      const targetX = Number.parseFloat(event.target.dataset.x) || 0;
      const targetY = Number.parseFloat(event.target.dataset.y) || 0;
      const dx = targetX - state.drag.targetStart.x;
      const dy = targetY - state.drag.targetStart.y;
      state.drag.items.forEach((item) => {
        if (item.id === state.drag.targetId) return;
        applyDirectPosition(item.id, item.element, item.x + dx, item.y + dy);
      });
      return result;
    };

    global.DragManager.dragEndListener = function productivityDragEnd(event) {
      const drag = state.drag;
      const result = originalEnd?.call(this, event);
      state.drag = null;
      if (!drag || getIdFromElement(event.target) !== drag.targetId) return result;
      const targetX = Number.parseFloat(event.target.dataset.x) || 0;
      const targetY = Number.parseFloat(event.target.dataset.y) || 0;
      const dx = targetX - drag.targetStart.x;
      const dy = targetY - drag.targetStart.y;
      commitPositions(drag.items.filter((item) => item.id !== drag.targetId).map((item) => ({
        id: item.id, x: item.x + dx, y: item.y + dy
      })), 'drag');
      return result;
    };
    return true;
  }

  function patchStateManager() {
    if (state.patchedStateManager || !global.StateManager?.applyState) return false;
    state.patchedStateManager = true;
    const original = global.StateManager.applyState;
    global.StateManager.applyState = function productivityAwareApplyState(...args) {
      const result = original.apply(this, args);
      global.setTimeout(() => {
        state.groups = readGroups();
        clearSelection();
        syncGroupBadges();
      }, 0);
      return result;
    };
    return true;
  }

  function initializeWhenReady(attempt = 0) {
    if (state.initialized) return;
    if ((!global.EditorWorkspace || !global.EditorLayers) && attempt < 40) {
      global.setTimeout(() => initializeWhenReady(attempt + 1), 100);
      return;
    }
    state.initialized = true;
    groupsInput = ensureHiddenInput();
    state.groups = readGroups();
    state.clipboard = readClipboard();
    createToolbar();
    createContextMenu();
    setupSelectionEvents();
    setupKeyboard();
    patchDragManager();
    patchStateManager();
    syncGroupBadges();

    groupsInput.addEventListener('input', () => { state.groups = readGroups(); syncGroupBadges(); });
    groupsInput.addEventListener('change', () => { state.groups = readGroups(); syncGroupBadges(); });
    const observer = cardsWrapper ? new global.MutationObserver(() => {
      renderSelection();
      syncGroupBadges();
    }) : null;
    observer?.observe(cardsWrapper, { childList: true, subtree: true });
    global.setTimeout(() => { patchDragManager(); patchStateManager(); createToolbar(); }, 500);

    document.documentElement.dataset.editorProductivityTools = 'ready';
    emit('editor:productivityready', { version: VERSION });
  }

  global.EditorProductivityTools = {
    init: initializeWhenReady,
    select: (ids, options) => setSelection(ids, options),
    clear: clearSelection,
    group: groupSelection,
    ungroup: ungroupSelection,
    align: alignSelection,
    distribute: distributeSelection,
    copy: copySelection,
    paste: pasteSelection,
    moveToOtherFace,
    run: runAction,
    getState: () => ({
      version: VERSION,
      selected: [...state.selected],
      primary: state.primary,
      groups: state.groups.map((group) => ({ ...group, members: [...group.members] })),
      clipboard: state.clipboard ? JSON.parse(JSON.stringify(state.clipboard)) : null,
      face: currentFace()
    })
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => initializeWhenReady(), { once: true });
  else initializeWhenReady();
}(typeof window !== 'undefined' ? window : globalThis));
