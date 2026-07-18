/** @jest-environment jsdom */

function rect(left, top, width = 50, height = 30) {
  return { left, top, width, height, right: left + width, bottom: top + height, x: left, y: top, toJSON: () => ({}) };
}

async function loadTools() {
  jest.resetModules();
  document.documentElement.lang = 'ar';
  document.documentElement.innerHTML = `
    <head></head>
    <body>
      <div class="editor-canvas-toolbar"></div>
      <div id="cards-wrapper">
        <div id="card-front-preview" class="business-card card-front">
          <div id="logo" data-editor-selectable="logo" data-x="0" data-y="0"></div>
          <div id="name" data-editor-selectable="name" data-x="100" data-y="30"></div>
          <div id="tagline" data-editor-selectable="tagline" data-x="300" data-y="60"></div>
          <div id="qr" data-editor-selectable="qr" data-x="400" data-y="100"></div>
        </div>
        <div id="card-back-preview" class="business-card card-back"></div>
      </div>
      <div class="editor-layer-row" data-layer-id="logo"><button class="editor-layer-item" data-inspector-item="logo">Logo</button></div>
      <div class="editor-layer-row" data-layer-id="name"><button class="editor-layer-item" data-inspector-item="name">Name</button></div>
      <div class="editor-layer-row" data-layer-id="tagline"><button class="editor-layer-item" data-inspector-item="tagline">Tagline</button></div>
      <div class="editor-layer-row" data-layer-id="qr"><button class="editor-layer-item" data-inspector-item="qr">QR</button></div>
      <label><input type="radio" name="placement-logo" value="front" checked></label>
      <label><input type="radio" name="placement-logo" value="back"></label>
      <label><input type="radio" name="placement-name" value="front" checked></label>
      <label><input type="radio" name="placement-name" value="back"></label>
    </body>`;

  const face = { value: 'front' };
  const elements = {
    logo: document.getElementById('logo'),
    name: document.getElementById('name'),
    tagline: document.getElementById('tagline'),
    qr: document.getElementById('qr')
  };
  const sizes = {
    logo: { width: 50, height: 30 }, name: { width: 50, height: 30 },
    tagline: { width: 50, height: 30 }, qr: { width: 40, height: 40 }
  };
  const positions = {
    logo: { x: 0, y: 0 }, name: { x: 100, y: 30 }, tagline: { x: 300, y: 60 }, qr: { x: 400, y: 100 }
  };
  const appearances = {
    logo: { scale: 1, rotation: 0, opacity: 1 }, name: { scale: 1, rotation: 0, opacity: 1 },
    tagline: { scale: 1, rotation: 0, opacity: 1 }, qr: { scale: 1, rotation: 0, opacity: 1 }
  };

  const front = document.getElementById('card-front-preview');
  Object.defineProperty(front, 'offsetWidth', { configurable: true, value: 500 });
  front.getBoundingClientRect = () => rect(0, 0, 500, 300);
  document.getElementById('card-back-preview').getBoundingClientRect = () => rect(0, 0, 500, 300);
  Object.entries(elements).forEach(([id, element]) => {
    element.getBoundingClientRect = () => rect(positions[id].x, positions[id].y, sizes[id].width, sizes[id].height);
  });

  window.UIManager = { announce: jest.fn() };
  window.EditorProductionGuard = { markDirty: jest.fn() };
  window.StateManager = { saveDebounced: jest.fn(), applyState: jest.fn() };
  window.DragManager = {
    dragStartListener: jest.fn(), dragMoveListener: jest.fn(), dragEndListener: jest.fn()
  };
  window.EditorWorkspace = {
    getItems: () => Object.keys(elements).map((id) => ({ id, selectors: [`#${id}`] })),
    getState: () => ({ face: face.value, selectedItem: 'card' }),
    select: jest.fn(),
    setFace: jest.fn((next) => { face.value = next; document.dispatchEvent(new CustomEvent('editor:facechange', { detail: { face: next } })); })
  };
  window.EditorLayers = {
    getTargets: (id) => elements[id] ? [elements[id]] : [],
    getAppearance: (id) => ({ ...appearances[id] }),
    setAppearance: jest.fn((id, changes) => { appearances[id] = { ...appearances[id], ...changes }; return appearances[id]; }),
    setPosition: jest.fn((id, x, y) => {
      positions[id] = { x, y };
      elements[id].dataset.x = String(x);
      elements[id].dataset.y = String(y);
      return true;
    }),
    toggleLock: jest.fn((id) => { elements[id].dataset.layerLocked = elements[id].dataset.layerLocked === 'true' ? 'false' : 'true'; }),
    toggleVisibility: jest.fn(),
    isVisible: jest.fn(() => true)
  };

  localStorage.clear();
  delete window.EditorProductivityTools;
  jest.isolateModules(() => require('../editor-productivity-tools'));
  document.dispatchEvent(new Event('DOMContentLoaded'));
  await new Promise((resolve) => setTimeout(resolve, 0));
  return { manager: window.EditorProductivityTools, elements, positions, appearances, face };
}

describe('advanced editor productivity tools', () => {
  test('persists a group and expands selection when a grouped layer is selected', async () => {
    const { manager } = await loadTools();
    manager.select(['logo', 'name'], { expandGroups: false });

    const group = manager.group();
    expect(group.members).toEqual(['logo', 'name']);
    expect(JSON.parse(document.getElementById('editor-layer-groups').value)[0].members).toEqual(['logo', 'name']);

    manager.clear();
    manager.select(['logo']);
    expect(manager.getState().selected).toEqual(expect.arrayContaining(['logo', 'name']));
    expect(document.documentElement.dataset.editorProductivitySelection).toBe('2');
  });

  test('aligns and distributes multiple unlocked layers', async () => {
    const { manager, positions } = await loadTools();
    manager.select(['logo', 'name', 'tagline'], { expandGroups: false });

    expect(manager.distribute('horizontal')).toBe(true);
    expect(positions.name.x).toBeCloseTo(150, 4);

    expect(manager.align('top')).toBe(true);
    expect(positions.logo.y).toBe(0);
    expect(positions.name.y).toBe(0);
    expect(positions.tagline.y).toBe(0);
  });

  test('skips locked layers during batch alignment', async () => {
    const { manager, elements, positions } = await loadTools();
    elements.name.dataset.layerLocked = 'true';
    manager.select(['logo', 'name'], { expandGroups: false });

    manager.align('left');
    expect(positions.logo.x).toBe(0);
    expect(positions.name.x).toBe(100);
  });

  test('copies and pastes position and appearance between selected layers', async () => {
    const { manager, positions, appearances } = await loadTools();
    appearances.logo = { scale: 1.25, rotation: 18, opacity: 0.72 };
    manager.select(['logo'], { expandGroups: false });
    expect(manager.copy()).toBeTruthy();

    manager.select(['name'], { expandGroups: false });
    expect(manager.paste()).toBe(true);
    expect(positions.name).toEqual({ x: 0, y: 0 });
    expect(appearances.name).toMatchObject({ scale: 1.25, rotation: 18, opacity: 0.72 });
    expect(localStorage.getItem('mcprime-editor-productivity-clipboard-v1')).toContain('logo');
  });

  test('moves supported fixed layers to the opposite card face', async () => {
    const { manager, face } = await loadTools();
    manager.select(['logo'], { expandGroups: false });

    expect(manager.moveToOtherFace()).toBe(true);
    await new Promise((resolve) => setTimeout(resolve, 80));

    expect(document.querySelector('input[name="placement-logo"][value="back"]').checked).toBe(true);
    expect(face.value).toBe('back');
  });
});
