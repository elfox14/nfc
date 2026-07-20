(function installEditorDesignLoader(global) {
  'use strict';

  /* global Auth, Config, ShareManager, StateManager, UIManager */
  const manager = typeof ShareManager !== 'undefined' ? ShareManager : global.ShareManager;
  if (!manager || manager.__dashboardLoaderInstalled) return;

  const originalLoad = typeof manager.loadFromUrl === 'function'
    ? manager.loadFromUrl.bind(manager)
    : async () => false;

  function normalizeDesignState(payload) {
    const visited = new Set();
    let current = payload;
    for (let depth = 0; depth < 5 && current && typeof current === 'object'; depth += 1) {
      if (visited.has(current)) break;
      visited.add(current);
      if (current.inputs || current.dynamic || current.placements || current.imageUrls) return current;
      current = current.data || current.design || current.result || null;
    }
    return null;
  }

  function setDefaultLayout(active) {
    global.document?.getElementById('card-front-content')
      ?.classList.toggle('editor-default-front-layout', active);
  }

  async function loadFromDashboard() {
    const params = new URLSearchParams(global.location.search);
    const designId = params.get('id');
    if (!designId || params.has('collabId')) return originalLoad();
    if (!/^[A-Za-z0-9_-]{4,64}$/.test(designId)) return false;

    const auth = typeof Auth !== 'undefined' ? Auth : global.Auth;
    const config = typeof Config !== 'undefined' ? Config : global.Config;
    const stateManager = typeof StateManager !== 'undefined' ? StateManager : global.StateManager;
    const ui = typeof UIManager !== 'undefined' ? UIManager : global.UIManager;
    const baseUrl = auth?.getBaseUrl?.() || config?.API_BASE_URL || global.location.origin;
    const url = `${String(baseUrl).replace(/\/+$/, '')}/api/get-design/${encodeURIComponent(designId)}`;
    const options = {
      credentials: 'include',
      cache: 'no-store',
      headers: { Accept: 'application/json', ...(auth?.getHeader?.() || {}) }
    };

    try {
      const response = auth?.apiFetchWithRefresh
        ? await auth.apiFetchWithRefresh(url, options)
        : await global.fetch(url, options);
      if (!response.ok) throw new Error(`Fetch failed with status ${response.status}`);
      const state = normalizeDesignState(await response.json());
      if (!state) throw new Error('Invalid design state');
      if (!stateManager?.applyState) throw new Error('State manager is unavailable');

      setDefaultLayout(false);
      if (config) config.currentDesignId = designId;
      try {
        global.localStorage.setItem('nfc:editingDesignId', designId);
      } catch {
        // The URL remains the authoritative identity when storage is unavailable.
      }
      stateManager.applyState(state, false);
      global.document.dispatchEvent(new global.CustomEvent('editor:designloaded', {
        detail: { id: designId, source: 'dashboard' }
      }));
      return true;
    } catch (error) {
      console.error('[EditorDesignLoader] Failed to load saved design:', error);
      setDefaultLayout(true);
      ui?.announce?.(global.document.documentElement.lang.startsWith('en')
        ? 'Failed to load the saved design.'
        : 'تعذر تحميل التصميم المحفوظ.');
      global.EditorUIState?.set?.('error', error.message);
      return false;
    }
  }

  manager.loadFromUrl = loadFromDashboard;
  manager.__dashboardLoaderInstalled = true;
  global.EditorDesignLoader = { load: loadFromDashboard, normalize: normalizeDesignState };
})(window);
