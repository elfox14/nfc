'use strict';

/**
 * Public deployment configuration.
 *
 * mcprim.com serves the static frontend while the API is hosted on Render.
 * Keep this small file as the single place that maps the public frontend to
 * its API. An explicitly injected value always wins for previews and future
 * deployments.
 */
(function configureRuntime() {
  const configuredBase = typeof window.__API_BASE_URL === 'string'
    ? window.__API_BASE_URL.trim()
    : '';

  if (configuredBase) {
    window.__API_BASE_URL = configuredBase.replace(/\/+$/, '');
  } else {
    const hostname = (window.location.hostname || '').toLowerCase().replace(/\.$/, '');
    const publicFrontendHosts = new Set(['mcprim.com', 'www.mcprim.com']);

    if (publicFrontendHosts.has(hostname)) {
      window.__API_BASE_URL = 'https://nfc-vjy6.onrender.com';
    }
  }

  window.__MC_PRIME_RELEASE = window.__MC_PRIME_RELEASE || '2026.07.22-phase19';

  const pathname = window.location.pathname || '';
  const isEditor = /(?:^|\/)editor(?:-en)?(?:\.html)?\/?$/i.test(pathname);
  const isDashboard = /(?:^|\/)dashboard(?:-en)?(?:\.html)?\/?$/i.test(pathname);
  if (!isEditor && !isDashboard) return;

  function loadStyle({ selector, href, datasetKey, readyDataset }) {
    if (document.querySelector(selector)) return;
    const stylesheet = document.createElement('link');
    stylesheet.rel = 'stylesheet';
    stylesheet.href = href;
    stylesheet.dataset[datasetKey] = 'true';
    if (readyDataset) {
      stylesheet.addEventListener('load', () => {
        document.documentElement.dataset[readyDataset] = 'ready';
      }, { once: true });
      stylesheet.addEventListener('error', () => {
        document.documentElement.dataset[readyDataset] = 'load-error';
      }, { once: true });
      document.documentElement.dataset[readyDataset] = 'loading';
    }
    document.head.appendChild(stylesheet);
  }

  function loadScript({ selector, src, datasetKey, readyDataset, onLoad }) {
    if (document.querySelector(selector)) return;
    const script = document.createElement('script');
    script.src = src;
    script.async = false;
    script.dataset[datasetKey] = 'true';
    script.addEventListener('load', () => {
      if (readyDataset) document.documentElement.dataset[readyDataset] = 'ready';
      onLoad?.();
    }, { once: true });
    script.addEventListener('error', () => {
      if (readyDataset) document.documentElement.dataset[readyDataset] = 'load-error';
      console.error(`[RuntimeConfig] Failed to load ${src}.`);
    }, { once: true });
    if (readyDataset) document.documentElement.dataset[readyDataset] = 'loading';
    document.head.appendChild(script);
  }

  function loadSharedBrandKitAssets() {
    loadStyle({
      selector: 'link[data-brand-kit-style]',
      href: '/nfc/brand-kit.css?v=10.0',
      datasetKey: 'brandKitStyle',
      readyDataset: 'brandKitStyleLoader'
    });
    loadScript({
      selector: 'script[data-brand-kit-client]',
      src: '/nfc/brand-kit-client.js?v=10.0',
      datasetKey: 'brandKitClient',
      readyDataset: 'brandKitClientLoader'
    });
  }

  function loadSharedWorkspaceAssets() {
    loadStyle({
      selector: 'link[data-workspace-style]',
      href: '/nfc/workspace.css?v=11.0',
      datasetKey: 'workspaceStyle',
      readyDataset: 'workspaceStyleLoader'
    });
    loadScript({
      selector: 'script[data-workspace-client]',
      src: '/nfc/workspace-client.js?v=11.0',
      datasetKey: 'workspaceClient',
      readyDataset: 'workspaceClientLoader'
    });
  }

  loadSharedBrandKitAssets();
  loadSharedWorkspaceAssets();

  if (isDashboard) {
    loadScript({
      selector: 'script[data-dashboard-brand-kit]',
      src: '/nfc/dashboard-brand-kit.js?v=10.0',
      datasetKey: 'dashboardBrandKit',
      readyDataset: 'dashboardBrandKitLoader'
    });
    loadScript({
      selector: 'script[data-dashboard-workspaces]',
      src: '/nfc/dashboard-workspaces.js?v=11.0',
      datasetKey: 'dashboardWorkspaces',
      readyDataset: 'dashboardWorkspacesLoader'
    });
    return;
  }

  function loadToolbarReleaseStyles() {
    loadStyle({
      selector: 'link[data-editor-toolbar-release]',
      href: '/nfc/editor-toolbar-release.css?v=7.2',
      datasetKey: 'editorToolbarRelease',
      readyDataset: 'editorToolbarRelease'
    });
  }

  function loadAssetManager() {
    loadStyle({ selector: 'link[data-editor-asset-manager-style]', href: '/nfc/editor-asset-manager.css?v=8.1', datasetKey: 'editorAssetManagerStyle' });
    loadScript({
      selector: 'script[data-editor-asset-manager]',
      src: '/nfc/editor-asset-manager.js?v=8.1',
      datasetKey: 'editorAssetManager',
      readyDataset: 'editorAssetManagerLoader'
    });
  }

  function loadTemplateManager() {
    loadStyle({ selector: 'link[data-editor-template-manager-style]', href: '/nfc/editor-template-manager.css?v=8.2', datasetKey: 'editorTemplateManagerStyle' });
    loadScript({
      selector: 'script[data-editor-template-manager]',
      src: '/nfc/editor-template-manager.js?v=8.2',
      datasetKey: 'editorTemplateManager',
      readyDataset: 'editorTemplateManagerLoader'
    });
  }

  function loadVersionManager() {
    loadStyle({ selector: 'link[data-editor-version-manager-style]', href: '/nfc/editor-version-manager.css?v=8.3', datasetKey: 'editorVersionManagerStyle' });
    loadScript({
      selector: 'script[data-editor-version-manager]',
      src: '/nfc/editor-version-manager.js?v=8.3',
      datasetKey: 'editorVersionManager',
      readyDataset: 'editorVersionManagerLoader'
    });
  }

  function loadProductivityTools() {
    loadStyle({ selector: 'link[data-editor-productivity-tools-style]', href: '/nfc/editor-productivity-tools.css?v=9.0', datasetKey: 'editorProductivityToolsStyle' });
    loadScript({
      selector: 'script[data-editor-productivity-tools]',
      src: '/nfc/editor-productivity-tools.js?v=9.0',
      datasetKey: 'editorProductivityTools',
      readyDataset: 'editorProductivityToolsLoader'
    });
  }

  function loadEditorBrandKit() {
    loadScript({
      selector: 'script[data-editor-brand-kit]',
      src: '/nfc/editor-brand-kit.js?v=10.0',
      datasetKey: 'editorBrandKit',
      readyDataset: 'editorBrandKitLoader'
    });
  }

  function loadEditorReviewWorkflow() {
    loadScript({
      selector: 'script[data-editor-review-workflow]',
      src: '/nfc/editor-review-workflow.js?v=11.0',
      datasetKey: 'editorReviewWorkflow',
      readyDataset: 'editorReviewWorkflowLoader'
    });
  }

  loadToolbarReleaseStyles();
  loadAssetManager();
  loadTemplateManager();
  loadVersionManager();
  loadProductivityTools();
  loadEditorBrandKit();
  loadEditorReviewWorkflow();

  function ensureLegacyStyleControls() {
    if (!document.body) return;
    const defaults = [
      ['phone-btn-font', 'Tajawal, sans-serif'],
      ['phone-btn-padding', '6']
    ];
    let host = document.getElementById('editor-legacy-style-controls');
    if (!host) {
      host = document.createElement('div');
      host.id = 'editor-legacy-style-controls';
      host.hidden = true;
      host.setAttribute('aria-hidden', 'true');
      document.body.appendChild(host);
    }
    defaults.forEach(([id, value]) => {
      if (document.getElementById(id)) return;
      const input = document.createElement('input');
      input.type = 'hidden';
      input.id = id;
      input.value = value;
      input.dataset.editorCompatibilityControl = 'true';
      host.appendChild(input);
    });
    document.documentElement.dataset.editorLegacyControls = 'ready';
  }

  function installTemplateMobileBridge() {
    if (window.__EDITOR_TEMPLATE_MOBILE_BRIDGE__) return;
    window.__EDITOR_TEMPLATE_MOBILE_BRIDGE__ = true;
    document.addEventListener('editor:librarychange', (event) => {
      if (event.detail?.view !== 'templates' || window.innerWidth > 1024) return;
      document.querySelectorAll('.pro-sidebar').forEach((panel) => {
        panel.classList.toggle('active-view', panel.id === 'panel-design');
      });
      document.querySelectorAll('.mobile-nav-item[data-target]').forEach((button) => {
        const selected = button.dataset.target === 'panel-design';
        button.classList.toggle('active', selected);
        button.setAttribute('aria-selected', selected ? 'true' : 'false');
      });
      document.documentElement.dataset.editorTemplateMobilePanel = 'active';
    });
  }

  function installVersionRestoreSettlement() {
    if (window.__EDITOR_VERSION_RESTORE_SETTLEMENT__) return;
    window.__EDITOR_VERSION_RESTORE_SETTLEMENT__ = true;

    document.addEventListener('editor:versionrestored', (event) => {
      if (event.detail?.cloud !== true) return;
      const confirmCloudState = () => {
        window.EditorProductionGuard?.markSaved?.();
        window.EditorProduction?.markSaved?.('cloud');
        document.documentElement.dataset.editorVersionRestoreSettled = 'true';
      };

      Promise.resolve().then(confirmCloudState);
      if (typeof window.requestAnimationFrame === 'function') {
        window.requestAnimationFrame(() => window.requestAnimationFrame(confirmCloudState));
      }
      window.setTimeout(confirmCloudState, 180);
    });
  }

  function exposeLegacyEditorGlobals() {
    try {
      if (!window.StateManager && typeof StateManager !== 'undefined') window.StateManager = StateManager;
      if (!window.HistoryManager && typeof HistoryManager !== 'undefined') window.HistoryManager = HistoryManager;
      if (!window.UIManager && typeof UIManager !== 'undefined') window.UIManager = UIManager;
      if (!window.DragManager && typeof DragManager !== 'undefined') window.DragManager = DragManager;
      document.documentElement.dataset.editorLegacyBridge = 'ready';
    } catch (error) {
      document.documentElement.dataset.editorLegacyBridge = 'unavailable';
      console.warn('[RuntimeConfig] Legacy editor globals could not be exposed:', error);
    }
  }

  function isSaveRequest(input, init) {
    const method = String(init?.method || input?.method || 'GET').toUpperCase();
    if (!['POST', 'PUT', 'PATCH'].includes(method)) return false;
    try {
      const raw = typeof input === 'string' ? input : input?.url;
      return /\/api\/save-design\/?$/.test(new URL(raw, window.location.href).pathname);
    } catch (_error) {
      return false;
    }
  }

  function updateSaveMonitorState(value) {
    const root = document.documentElement;
    root.dataset.editorSaveMonitorState = value;
    const count = Number(root.dataset.editorSaveMonitorCount || 0);
    root.dataset.editorSaveMonitorCount = String(count + 1);
  }

  function installStableSaveMonitor() {
    if (window.__EDITOR_STABLE_SAVE_MONITOR__ || typeof window.fetch !== 'function') return;

    let activeFetch = window.fetch.bind(window);
    const monitoredFetch = async function monitoredEditorFetch(input, init) {
      const saveRequest = isSaveRequest(input, init);
      if (saveRequest) updateSaveMonitorState('saving');
      try {
        const response = await activeFetch(input, init);
        if (saveRequest) {
          if (response?.ok) {
            window.EditorProductionGuard?.markSaved?.();
            updateSaveMonitorState('saved');
          } else {
            updateSaveMonitorState(`failed-${response?.status || 'unknown'}`);
          }
        }
        return response;
      } catch (error) {
        if (saveRequest) updateSaveMonitorState('network-error');
        throw error;
      }
    };
    monitoredFetch.__editorStableSaveMonitor = true;

    try {
      Object.defineProperty(window, 'fetch', {
        configurable: true,
        enumerable: true,
        get() {
          return monitoredFetch;
        },
        set(nextFetch) {
          if (typeof nextFetch !== 'function' || nextFetch === monitoredFetch || nextFetch.__editorStableSaveMonitor) return;
          activeFetch = nextFetch.bind(window);
        }
      });
      window.__EDITOR_STABLE_SAVE_MONITOR__ = true;
      document.documentElement.dataset.editorSaveMonitor = 'ready';
      document.documentElement.dataset.editorSaveMonitorCount = '0';
    } catch (error) {
      console.warn('[RuntimeConfig] Stable save monitor unavailable:', error);
    }
  }

  function loadProductionGuard() {
    loadScript({
      selector: 'script[data-editor-production-guard]',
      src: '/nfc/editor-production-guard.js?v=1.0.3',
      datasetKey: 'editorProductionGuard',
      onLoad: installStableSaveMonitor
    });
  }

  function finishEditorBootstrap() {
    ensureLegacyStyleControls();
    installTemplateMobileBridge();
    installVersionRestoreSettlement();
    exposeLegacyEditorGlobals();
    window.setTimeout(loadProductionGuard, 0);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', finishEditorBootstrap, { once: true });
  } else {
    finishEditorBootstrap();
  }
}());
