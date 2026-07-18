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

  window.__MC_PRIME_RELEASE = window.__MC_PRIME_RELEASE || '2026.07.18-phase8.3';

  const pathname = window.location.pathname || '';
  const isEditor = /(?:^|\/)editor(?:-en)?(?:\.html)?\/?$/i.test(pathname);
  if (!isEditor) return;

  function loadToolbarReleaseStyles() {
    if (document.querySelector('link[data-editor-toolbar-release]')) return;

    const stylesheet = document.createElement('link');
    stylesheet.rel = 'stylesheet';
    stylesheet.href = '/nfc/editor-toolbar-release.css?v=7.2';
    stylesheet.dataset.editorToolbarRelease = 'true';
    stylesheet.addEventListener('load', () => {
      document.documentElement.dataset.editorToolbarRelease = 'ready';
    }, { once: true });
    stylesheet.addEventListener('error', () => {
      document.documentElement.dataset.editorToolbarRelease = 'load-error';
      console.error('[RuntimeConfig] Failed to load editor toolbar release styles.');
    }, { once: true });

    document.documentElement.dataset.editorToolbarRelease = 'loading';
    document.head.appendChild(stylesheet);
  }

  function loadAssetManager() {
    if (!document.querySelector('link[data-editor-asset-manager-style]')) {
      const stylesheet = document.createElement('link');
      stylesheet.rel = 'stylesheet';
      stylesheet.href = '/nfc/editor-asset-manager.css?v=8.1';
      stylesheet.dataset.editorAssetManagerStyle = 'true';
      document.head.appendChild(stylesheet);
    }

    if (document.querySelector('script[data-editor-asset-manager]')) return;
    const script = document.createElement('script');
    script.src = '/nfc/editor-asset-manager.js?v=8.1';
    script.async = false;
    script.dataset.editorAssetManager = 'true';
    script.addEventListener('load', () => {
      document.documentElement.dataset.editorAssetManagerLoader = 'ready';
    }, { once: true });
    script.addEventListener('error', () => {
      document.documentElement.dataset.editorAssetManagerLoader = 'load-error';
      console.error('[RuntimeConfig] Failed to load editor asset manager.');
    }, { once: true });
    document.documentElement.dataset.editorAssetManagerLoader = 'loading';
    document.head.appendChild(script);
  }

  function loadTemplateManager() {
    if (!document.querySelector('link[data-editor-template-manager-style]')) {
      const stylesheet = document.createElement('link');
      stylesheet.rel = 'stylesheet';
      stylesheet.href = '/nfc/editor-template-manager.css?v=8.2';
      stylesheet.dataset.editorTemplateManagerStyle = 'true';
      document.head.appendChild(stylesheet);
    }

    if (document.querySelector('script[data-editor-template-manager]')) return;
    const script = document.createElement('script');
    script.src = '/nfc/editor-template-manager.js?v=8.2';
    script.async = false;
    script.dataset.editorTemplateManager = 'true';
    script.addEventListener('load', () => {
      document.documentElement.dataset.editorTemplateManagerLoader = 'ready';
    }, { once: true });
    script.addEventListener('error', () => {
      document.documentElement.dataset.editorTemplateManagerLoader = 'load-error';
      console.error('[RuntimeConfig] Failed to load editor template manager.');
    }, { once: true });
    document.documentElement.dataset.editorTemplateManagerLoader = 'loading';
    document.head.appendChild(script);
  }

  function loadVersionManager() {
    if (!document.querySelector('link[data-editor-version-manager-style]')) {
      const stylesheet = document.createElement('link');
      stylesheet.rel = 'stylesheet';
      stylesheet.href = '/nfc/editor-version-manager.css?v=8.3';
      stylesheet.dataset.editorVersionManagerStyle = 'true';
      document.head.appendChild(stylesheet);
    }

    if (document.querySelector('script[data-editor-version-manager]')) return;
    const script = document.createElement('script');
    script.src = '/nfc/editor-version-manager.js?v=8.3';
    script.async = false;
    script.dataset.editorVersionManager = 'true';
    script.addEventListener('load', () => {
      document.documentElement.dataset.editorVersionManagerLoader = 'ready';
    }, { once: true });
    script.addEventListener('error', () => {
      document.documentElement.dataset.editorVersionManagerLoader = 'load-error';
      console.error('[RuntimeConfig] Failed to load editor version manager.');
    }, { once: true });
    document.documentElement.dataset.editorVersionManagerLoader = 'loading';
    document.head.appendChild(script);
  }

  loadToolbarReleaseStyles();
  loadAssetManager();
  loadTemplateManager();
  loadVersionManager();

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

  function exposeLegacyEditorGlobals() {
    try {
      if (!window.StateManager && typeof StateManager !== 'undefined') window.StateManager = StateManager;
      if (!window.HistoryManager && typeof HistoryManager !== 'undefined') window.HistoryManager = HistoryManager;
      if (!window.UIManager && typeof UIManager !== 'undefined') window.UIManager = UIManager;
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
    if (document.querySelector('script[data-editor-production-guard]')) return;
    const guard = document.createElement('script');
    guard.src = '/nfc/editor-production-guard.js?v=1.0.3';
    guard.async = false;
    guard.dataset.editorProductionGuard = 'true';
    guard.addEventListener('load', installStableSaveMonitor, { once: true });
    guard.addEventListener('error', () => {
      document.documentElement.dataset.editorProduction = 'load-error';
      console.error('[RuntimeConfig] Failed to load editor production guard.');
    });
    document.head.appendChild(guard);
  }

  function finishEditorBootstrap() {
    ensureLegacyStyleControls();
    installTemplateMobileBridge();
    exposeLegacyEditorGlobals();
    window.setTimeout(loadProductionGuard, 0);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', finishEditorBootstrap, { once: true });
  } else {
    finishEditorBootstrap();
  }
}());
