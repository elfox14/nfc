/** @jest-environment jsdom */

describe('editor saved design loader', () => {
  let originalLoad;
  let applyState;

  beforeEach(() => {
    jest.resetModules();
    window.history.replaceState({}, '', '/nfc/editor.html?id=saved-123');
    window.localStorage.clear();
    document.documentElement.lang = 'ar';
    document.body.innerHTML = `
      <section id="cards-wrapper">
        <div id="card-front-content" class="editor-default-front-layout"></div>
        <div id="card-back-content" class="editor-default-back-layout"></div>
      </section>`;

    originalLoad = jest.fn(async () => false);
    applyState = jest.fn();
    window.ShareManager = { loadFromUrl: originalLoad };
    window.Config = { API_BASE_URL: 'https://fallback.example' };
    window.StateManager = { applyState };
    window.UIManager = { announce: jest.fn() };
    window.Auth = {
      getBaseUrl: jest.fn(() => 'https://api.example'),
      getHeader: jest.fn(() => ({ 'X-Editor-Test': 'session' })),
      apiFetchWithRefresh: jest.fn()
    };
    global.ShareManager = window.ShareManager;
    global.Config = window.Config;
    global.StateManager = window.StateManager;
    global.UIManager = window.UIManager;
    global.Auth = window.Auth;
  });

  afterEach(() => {
    delete window.EditorDesignLoader;
    delete window.ShareManager;
    delete window.Config;
    delete window.StateManager;
    delete window.UIManager;
    delete window.Auth;
    delete global.ShareManager;
    delete global.Config;
    delete global.StateManager;
    delete global.UIManager;
    delete global.Auth;
    window.localStorage.clear();
    delete document.documentElement.dataset.editorDesignLoad;
    jest.restoreAllMocks();
  });

  test('loads a dashboard design through the authenticated session and preserves its state', async () => {
    const savedState = {
      inputs: { 'input-name_ar': 'بطاقتي المحفوظة' },
      placements: { logo: 'back' },
      positions: { 'card-name': { x: 21, y: -8 } }
    };
    window.Auth.apiFetchWithRefresh.mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ success: true, data: { data: savedState } })
    });
    const loadedEvent = jest.fn();
    document.addEventListener('editor:designloaded', loadedEvent, { once: true });

    require('../editor-design-loader');
    const result = await window.ShareManager.loadFromUrl();

    expect(result).toBe(true);
    expect(window.Auth.apiFetchWithRefresh).toHaveBeenCalledWith(
      'https://api.example/api/get-design/saved-123',
      expect.objectContaining({
        credentials: 'include',
        cache: 'no-store',
        headers: { Accept: 'application/json', 'X-Editor-Test': 'session' }
      })
    );
    expect(applyState).toHaveBeenCalledWith(expect.objectContaining(savedState), false);
    expect(window.Config.currentDesignId).toBe('saved-123');
    expect(window.localStorage.getItem('nfc:editingDesignId')).toBe('saved-123');
    expect(document.getElementById('card-front-content').classList.contains('editor-default-front-layout')).toBe(false);
    expect(document.getElementById('card-back-content').classList.contains('editor-default-back-layout')).toBe(false);
    expect(document.documentElement.dataset.editorDesignLoad).toBe('loaded');
    expect(document.getElementById('editor-design-load-status')).toBeNull();
    expect(loadedEvent).toHaveBeenCalledTimes(1);
    expect(originalLoad).not.toHaveBeenCalled();
  });

  test('returns to the centered default when the requested design cannot be loaded', async () => {
    jest.spyOn(console, 'error').mockImplementation(() => {});
    window.Auth.apiFetchWithRefresh.mockResolvedValue({ ok: false, status: 404 });

    require('../editor-design-loader');
    const result = await window.ShareManager.loadFromUrl();

    expect(result).toBe(false);
    expect(applyState).not.toHaveBeenCalled();
    expect(document.getElementById('card-front-content').classList.contains('editor-default-front-layout')).toBe(false);
    expect(document.getElementById('card-back-content').classList.contains('editor-default-back-layout')).toBe(false);
    expect(document.documentElement.dataset.editorDesignLoad).toBe('error');
    expect(document.getElementById('editor-design-load-status').textContent).toContain('لم يتم استبدال بياناتك');
    expect(document.querySelector('.editor-design-load-retry')).toBeTruthy();
    expect(window.UIManager.announce).toHaveBeenCalledWith('تعذر تحميل التصميم المحفوظ.');
  });


  test('repairs legacy dynamic collections before applying a directly returned state', async () => {
    const legacyState = {
      inputs: { 'input-name_ar': 'بطاقة قديمة' },
      dynamic: {
        phones: [{ value: 1020304050, placement: 'unexpected' }],
        social: null,
        staticSocial: []
      },
      positions: null,
      placements: { qr: 'back' }
    };
    window.Auth.apiFetchWithRefresh.mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => legacyState
    });

    require('../editor-design-loader');
    const result = await window.ShareManager.loadFromUrl();

    expect(result).toBe(true);
    expect(applyState).toHaveBeenCalledWith(expect.objectContaining({
      inputs: legacyState.inputs,
      dynamic: expect.objectContaining({
        phones: [{
          id: 'phone_saved_1',
          value: '1020304050',
          placement: 'front',
          position: { x: 0, y: 0 }
        }],
        social: [],
        staticSocial: {}
      }),
      positions: {}
    }), false);
  });

  test('retries a transient API failure before showing an error', async () => {
    window.Auth.apiFetchWithRefresh
      .mockResolvedValueOnce({ ok: false, status: 503 })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ inputs: { 'input-name_ar': 'عاد الاتصال' } })
      });

    require('../editor-design-loader');
    const result = await window.ShareManager.loadFromUrl();

    expect(result).toBe(true);
    expect(window.Auth.apiFetchWithRefresh).toHaveBeenCalledTimes(2);
    expect(applyState).toHaveBeenCalledWith(expect.objectContaining({
      inputs: { 'input-name_ar': 'عاد الاتصال' }
    }), false);
  });

  test('deduplicates concurrent dashboard loads into one successful request', async () => {
    window.Auth.apiFetchWithRefresh.mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ inputs: { 'input-name_ar': 'طلب واحد' } })
    });

    require('../editor-design-loader');
    const [first, second] = await Promise.all([
      window.ShareManager.loadFromUrl(),
      window.ShareManager.loadFromUrl()
    ]);

    expect(first).toBe(true);
    expect(second).toBe(true);
    expect(window.Auth.apiFetchWithRefresh).toHaveBeenCalledTimes(1);
    expect(applyState).toHaveBeenCalledTimes(1);
  });

  test('delegates collaboration links to the existing collaboration loader', async () => {
    window.history.replaceState({}, '', '/nfc/editor.html?collabId=room-1');
    require('../editor-design-loader');

    await window.ShareManager.loadFromUrl();

    expect(originalLoad).toHaveBeenCalledTimes(1);
    expect(window.Auth.apiFetchWithRefresh).not.toHaveBeenCalled();
  });
});
