/** @jest-environment jsdom */

function jsonResponse(status, payload) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => payload
  };
}

async function loadManager({ online = true, fetchImpl } = {}) {
  jest.resetModules();
  document.documentElement.lang = 'ar';
  document.documentElement.innerHTML = '<head></head><body><div class="tb-history"><button id="editor-versions-btn">old</button></div></body>';
  window.history.replaceState({}, '', '/nfc/editor.html?id=card123');
  localStorage.clear();
  sessionStorage.setItem('authAccessToken', 'token');
  Object.defineProperty(window.navigator, 'onLine', { configurable: true, value: online });
  window.confirm = jest.fn(() => true);
  window.UIManager = { announce: jest.fn() };
  window.EditorProductionGuard = { markSaved: jest.fn() };
  window.StateManager = {
    getStateObject: jest.fn(() => ({
      inputs: { 'input-name_ar': 'الحالي', 'front-bg-start': '#ffffff' },
      dynamic: { phones: [{ value: '0100' }] },
      placements: { logo: 'front' }
    })),
    applyState: jest.fn(),
    saveDebounced: jest.fn()
  };
  window.fetch = fetchImpl || jest.fn(async () => jsonResponse(200, { success: true, versions: [] }));
  delete window.EditorVersionManager;
  jest.isolateModules(() => require('../editor-version-manager'));
  window.EditorVersionManager.init();
  await new Promise((resolve) => setTimeout(resolve, 0));
  return window.EditorVersionManager;
}

describe('editor cloud version manager', () => {
  test('creates a cloud version while retaining a local fallback copy', async () => {
    const fetchImpl = jest.fn(async (url, options = {}) => {
      if (String(url).endsWith('/api/design/card123/versions') && options.method === 'POST') {
        return jsonResponse(201, {
          success: true,
          version: { id: 'cloud-1', name: 'قبل التعديل', source: 'manual', createdAt: '2026-07-18T12:00:00.000Z' }
        });
      }
      return jsonResponse(200, { success: true, versions: [] });
    });
    const manager = await loadManager({ fetchImpl });

    await manager.createVersion('قبل التعديل');

    const current = manager.getState();
    expect(fetchImpl).toHaveBeenCalledWith(
      expect.stringContaining('/api/design/card123/versions'),
      expect.objectContaining({ method: 'POST' })
    );
    expect(current.localVersions).toHaveLength(1);
    expect(current.localVersions[0]).toMatchObject({ cloudId: 'cloud-1', syncStatus: 'cloud' });
    expect(current.cloudVersions[0]).toMatchObject({ cloudId: 'cloud-1', name: 'قبل التعديل' });
    expect(document.documentElement.dataset.editorVersionState).toBe('cloud');
  });

  test('keeps a checkpoint locally while offline and marks it for later use', async () => {
    const fetchImpl = jest.fn();
    const manager = await loadManager({ online: false, fetchImpl });

    await manager.createVersion('نسخة دون اتصال');

    const current = manager.getState();
    expect(fetchImpl).not.toHaveBeenCalled();
    expect(current.localVersions[0]).toMatchObject({ name: 'نسخة دون اتصال', syncStatus: 'local' });
    expect(document.documentElement.dataset.editorVersionState).toBe('local');
    expect(localStorage.getItem('mcprime-editor-versions-v2:card123:ar')).toContain('نسخة دون اتصال');
  });

  test('summarizes comparison differences by design section', async () => {
    const manager = await loadManager();
    const comparison = manager.compareStates(
      {
        inputs: { 'input-name_ar': 'قديم', 'front-bg-start': '#000000' },
        dynamic: { phones: [{ value: '0111' }] },
        placements: { logo: 'back' }
      },
      {
        inputs: { 'input-name_ar': 'جديد', 'front-bg-start': '#ffffff' },
        dynamic: { phones: [{ value: '0100' }] },
        placements: { logo: 'front' }
      }
    );

    expect(comparison.total).toBeGreaterThanOrEqual(4);
    expect(comparison.groups.inputs).toEqual(expect.arrayContaining(['inputs.input-name_ar', 'inputs.front-bg-start']));
    expect(comparison.groups.dynamic).toContain('dynamic.phones');
    expect(comparison.groups.placements).toContain('placements.logo');
  });

  test('restores a cloud version and marks the editor as cloud-saved', async () => {
    const fetchImpl = jest.fn(async (url, options = {}) => {
      if (String(url).includes('/restore') && options.method === 'POST') {
        return jsonResponse(200, {
          success: true,
          state: { inputs: { 'input-name_ar': 'مستعاد' } },
          restoredVersion: { id: 'cloud-2', name: 'نسخة قديمة' },
          safetyVersion: { id: 'safety-1', name: 'قبل الاستعادة' }
        });
      }
      return jsonResponse(200, {
        success: true,
        versions: [{ id: 'cloud-2', name: 'نسخة قديمة', source: 'manual', createdAt: '2026-07-18T10:00:00.000Z' }]
      });
    });
    const manager = await loadManager({ fetchImpl });
    manager.open();
    await new Promise((resolve) => setTimeout(resolve, 0));
    const restore = document.querySelector('[data-version-action="restore"]');
    expect(restore).not.toBeNull();

    restore.click();
    await new Promise((resolve) => setTimeout(resolve, 20));

    expect(window.StateManager.applyState).toHaveBeenCalledWith({ inputs: { 'input-name_ar': 'مستعاد' } }, true);
    expect(window.EditorProductionGuard.markSaved).toHaveBeenCalled();
  });

  test('replaces the legacy toolbar button with the cloud manager action', async () => {
    const manager = await loadManager();
    const button = document.getElementById('editor-versions-btn');
    expect(button.dataset.versionManager).toBe('cloud');
    button.click();
    expect(document.getElementById('editor-version-popover')).not.toBeNull();
    manager.close();
  });
});
