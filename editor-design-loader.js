(function installEditorDesignLoader(global) {
  'use strict';

  /* global Auth, Config, ShareManager, StateManager, UIManager */
  const manager = typeof ShareManager !== 'undefined' ? ShareManager : global.ShareManager;
  if (!manager || manager.__dashboardLoaderInstalled) return;

  const originalLoad = typeof manager.loadFromUrl === 'function'
    ? manager.loadFromUrl.bind(manager)
    : async () => false;
  const retryableStatuses = new Set([408, 425, 429, 500, 502, 503, 504]);
  let activeLoad = null;

  function isObject(value) {
    return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
  }

  function normalizeDesignState(payload) {
    const visited = new Set();
    let current = payload;
    for (let depth = 0; depth < 7 && isObject(current); depth += 1) {
      if (visited.has(current)) break;
      visited.add(current);
      if (current.inputs || current.dynamic || current.placements || current.imageUrls || current.positions) {
        return current;
      }
      current = current.data || current.design || current.state || current.result || null;
    }
    return null;
  }

  function prepareDesignState(payload) {
    const state = normalizeDesignState(payload);
    if (!state) return null;

    const dynamic = isObject(state.dynamic) ? state.dynamic : {};
    const phones = Array.isArray(dynamic.phones) ? dynamic.phones : [];
    const social = Array.isArray(dynamic.social) ? dynamic.social : [];

    return {
      ...state,
      inputs: isObject(state.inputs) ? state.inputs : {},
      dynamic: {
        ...dynamic,
        phones: phones
          .filter(isObject)
          .map((phone, index) => ({
            ...phone,
            id: phone.id || `phone_saved_${index + 1}`,
            value: phone.value == null ? '' : String(phone.value),
            placement: phone.placement === 'back' ? 'back' : 'front',
            position: isObject(phone.position) ? phone.position : { x: 0, y: 0 }
          })),
        social: social
          .filter(isObject)
          .map((link, index) => ({
            ...link,
            id: link.id || `social_saved_${index + 1}`,
            value: link.value == null ? '' : String(link.value),
            placement: link.placement === 'front' ? 'front' : 'back',
            position: isObject(link.position) ? link.position : { x: 0, y: 0 }
          })),
        staticSocial: isObject(dynamic.staticSocial) ? dynamic.staticSocial : {}
      },
      imageUrls: isObject(state.imageUrls) ? state.imageUrls : {},
      positions: isObject(state.positions) ? state.positions : {},
      placements: isObject(state.placements) ? state.placements : {},
      visibilities: isObject(state.visibilities) ? state.visibilities : {}
    };
  }

  function setDefaultLayout(active) {
    global.document?.getElementById('card-front-content')
      ?.classList.toggle('editor-default-front-layout', active);
    global.document?.getElementById('card-back-content')
      ?.classList.toggle('editor-default-back-layout', active);
  }

  function setLoadState(status, message = '') {
    const root = global.document?.documentElement;
    if (root) root.dataset.editorDesignLoad = status;

    const stage = global.document?.getElementById('cards-wrapper');
    if (!stage) return;
    let panel = global.document.getElementById('editor-design-load-status');

    if (status === 'loaded' || status === 'idle') {
      panel?.remove();
      return;
    }

    if (!panel) {
      panel = global.document.createElement('div');
      panel.id = 'editor-design-load-status';
      panel.className = 'editor-design-load-status';
      panel.setAttribute('role', 'status');
      panel.setAttribute('aria-live', 'polite');
      stage.appendChild(panel);
    }

    panel.replaceChildren();
    const icon = global.document.createElement('i');
    icon.className = status === 'loading' ? 'fas fa-circle-notch fa-spin' : 'fas fa-triangle-exclamation';
    icon.setAttribute('aria-hidden', 'true');
    const text = global.document.createElement('span');
    text.textContent = message;
    panel.append(icon, text);

    if (status === 'error') {
      const retry = global.document.createElement('button');
      retry.type = 'button';
      retry.className = 'btn btn-primary editor-design-load-retry';
      retry.textContent = global.document.documentElement.lang.startsWith('en') ? 'Retry' : 'إعادة المحاولة';
      retry.addEventListener('click', () => loadFromDashboard({ force: true }));
      panel.appendChild(retry);
    }
  }

  function wait(milliseconds) {
    return new Promise((resolve) => global.setTimeout(resolve, milliseconds));
  }

  async function fetchDesign(url, options, auth) {
    let lastResponse = null;
    let lastError = null;

    for (let attempt = 0; attempt < 2; attempt += 1) {
      try {
        lastResponse = auth?.apiFetchWithRefresh
          ? await auth.apiFetchWithRefresh(url, { ...options, headers: { ...options.headers } })
          : await global.fetch(url, { ...options, headers: { ...options.headers } });

        if (lastResponse.ok || !retryableStatuses.has(lastResponse.status) || attempt === 1) {
          return lastResponse;
        }
      } catch (error) {
        lastError = error;
        if (attempt === 1) throw error;
      }
      await wait(150);
    }

    if (lastResponse) return lastResponse;
    throw lastError || new Error('Design request failed');
  }

  async function performDashboardLoad() {
    const params = new URLSearchParams(global.location.search);
    const designId = params.get('id');
    if (!designId || params.has('collabId')) return originalLoad();
    if (!/^[A-Za-z0-9_-]{3,64}$/.test(designId)) return false;

    const english = global.document.documentElement.lang.startsWith('en');
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

    setDefaultLayout(false);
    setLoadState('loading', english ? 'Loading your saved card…' : 'جاري تحميل الكارت المحفوظ…');

    try {
      const response = await fetchDesign(url, options, auth);
      if (!response.ok) throw new Error(`Fetch failed with status ${response.status}`);
      const state = prepareDesignState(await response.json());
      if (!state) throw new Error('Invalid design state');
      if (!stateManager?.applyState) throw new Error('State manager is unavailable');

      if (config) config.currentDesignId = designId;
      global.document.documentElement.dataset.editorDesignId = designId;
      try {
        global.localStorage.setItem('nfc:editingDesignId', designId);
      } catch {
        // The URL remains the authoritative identity when storage is unavailable.
      }

      stateManager.applyState(state, false);
      setLoadState('loaded');
      global.document.dispatchEvent(new global.CustomEvent('editor:designloaded', {
        detail: { id: designId, source: 'dashboard' }
      }));
      return true;
    } catch (error) {
      console.error('[EditorDesignLoader] Failed to load saved design:', error);
      delete global.document.documentElement.dataset.editorDesignId;
      setDefaultLayout(false);
      setLoadState('error', english
        ? 'The saved card could not be loaded. Your saved data was not replaced.'
        : 'تعذر تحميل الكارت المحفوظ. لم يتم استبدال بياناتك.');
      ui?.announce?.(english
        ? 'Failed to load the saved design.'
        : 'تعذر تحميل التصميم المحفوظ.');
      global.EditorUIState?.set?.('error', error.message);
      return false;
    }
  }

  async function loadFromDashboard({ force = false } = {}) {
    if (!force && activeLoad) return activeLoad;
    activeLoad = performDashboardLoad();
    try {
      return await activeLoad;
    } finally {
      activeLoad = null;
    }
  }

  manager.loadFromUrl = loadFromDashboard;
  manager.__dashboardLoaderInstalled = true;
  global.EditorDesignLoader = {
    load: loadFromDashboard,
    normalize: normalizeDesignState,
    prepare: prepareDesignState
  };
})(window);
