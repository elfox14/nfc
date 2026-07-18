/* global Auth */
(function initializeEditorVersionManager(global) {
  'use strict';

  const document = global.document;
  if (!document || global.EditorVersionManager) return;

  const VERSION = '8.3.0';
  const STORAGE_PREFIX = 'mcprime-editor-versions-v2';
  const LEGACY_STORAGE_KEY = 'mcprime-editor-versions-v1';
  const MAX_LOCAL_VERSIONS = 20;
  const isEnglish = document.documentElement.lang.toLowerCase().startsWith('en');

  const copy = isEnglish ? {
    versions: 'Version history',
    hint: 'Create a named cloud checkpoint, compare it with the current design, or restore it safely.',
    create: 'Create version',
    name: 'Version name',
    defaultName: 'Checkpoint',
    close: 'Close',
    refresh: 'Refresh',
    compare: 'Compare',
    restore: 'Restore',
    remove: 'Delete',
    empty: 'No versions have been saved for this design yet.',
    cloud: 'Saved in cloud',
    local: 'Saved locally',
    pending: 'Waiting to sync',
    failed: 'Cloud sync failed',
    offline: 'Offline',
    online: 'Cloud connected',
    draft: 'Save the design once to enable cloud versions. This checkpoint stays local for now.',
    createdCloud: 'Version saved in the cloud.',
    createdLocal: 'Version saved locally.',
    restoredCloud: 'Cloud version restored. A safety copy was created first.',
    restoredLocal: 'Local version restored. Save the design to update the cloud copy.',
    deleted: 'Version deleted.',
    loadFailed: 'Could not load cloud versions. Local checkpoints remain available.',
    createFailed: 'The checkpoint was kept locally because cloud sync failed.',
    confirmRestore: 'Restore this version? The current design will be preserved as a safety version first.',
    confirmDelete: 'Delete this version permanently?',
    comparing: 'Comparison with current design',
    noChanges: 'No differences from the current design.',
    changes: 'changed values',
    sections: {
      inputs: 'Content and visual settings',
      dynamic: 'Phones and contact links',
      placements: 'Element placement',
      imageUrls: 'Images',
      elements: 'Elements',
      other: 'Other settings'
    },
    sources: { manual: 'Manual', 'local-sync': 'Synced from device', 'pre-restore': 'Safety copy' },
    retry: 'Retry sync',
    safetyName: 'Before restore'
  } : {
    versions: 'سجل الإصدارات',
    hint: 'أنشئ نقطة سحابية باسم واضح، وقارنها بالتصميم الحالي أو استعدها بأمان.',
    create: 'إنشاء إصدار',
    name: 'اسم الإصدار',
    defaultName: 'نقطة محفوظة',
    close: 'إغلاق',
    refresh: 'تحديث',
    compare: 'مقارنة',
    restore: 'استعادة',
    remove: 'حذف',
    empty: 'لم يتم حفظ إصدارات لهذا التصميم حتى الآن.',
    cloud: 'محفوظ سحابيًا',
    local: 'محفوظ محليًا',
    pending: 'بانتظار المزامنة',
    failed: 'فشلت المزامنة السحابية',
    offline: 'دون اتصال',
    online: 'السحابة متصلة',
    draft: 'احفظ التصميم مرة واحدة لتفعيل الإصدارات السحابية. ستبقى هذه النقطة محلية مؤقتًا.',
    createdCloud: 'تم حفظ الإصدار في السحابة.',
    createdLocal: 'تم حفظ الإصدار محليًا.',
    restoredCloud: 'تمت استعادة الإصدار السحابي وإنشاء نسخة أمان أولًا.',
    restoredLocal: 'تمت استعادة الإصدار المحلي. احفظ التصميم لتحديث النسخة السحابية.',
    deleted: 'تم حذف الإصدار.',
    loadFailed: 'تعذر تحميل الإصدارات السحابية، والإصدارات المحلية ما زالت متاحة.',
    createFailed: 'تم الاحتفاظ بالنقطة محليًا بسبب فشل المزامنة السحابية.',
    confirmRestore: 'هل تريد استعادة هذا الإصدار؟ سيتم حفظ التصميم الحالي كنسخة أمان أولًا.',
    confirmDelete: 'هل تريد حذف هذا الإصدار نهائيًا؟',
    comparing: 'المقارنة مع التصميم الحالي',
    noChanges: 'لا توجد اختلافات عن التصميم الحالي.',
    changes: 'قيمة متغيرة',
    sections: {
      inputs: 'المحتوى وإعدادات الشكل',
      dynamic: 'الهواتف وروابط التواصل',
      placements: 'مواضع العناصر',
      imageUrls: 'الصور',
      elements: 'العناصر',
      other: 'إعدادات أخرى'
    },
    sources: { manual: 'يدوي', 'local-sync': 'تمت مزامنته من الجهاز', 'pre-restore': 'نسخة أمان' },
    retry: 'إعادة المزامنة',
    safetyName: 'قبل الاستعادة'
  };

  const state = {
    initialized: false,
    loading: false,
    panel: null,
    cloudVersions: [],
    localVersions: [],
    comparison: null
  };

  function designId() {
    const params = new global.URLSearchParams(global.location.search);
    return params.get('id') || document.documentElement.dataset.designId || null;
  }

  function storageKey() {
    return `${STORAGE_PREFIX}:${designId() || 'draft'}:${isEnglish ? 'en' : 'ar'}`;
  }

  function readJson(key, fallback) {
    try {
      const parsed = JSON.parse(global.localStorage?.getItem(key) || 'null');
      return parsed === null ? fallback : parsed;
    } catch (_error) {
      return fallback;
    }
  }

  function writeLocalVersions(versions) {
    state.localVersions = versions.slice(0, MAX_LOCAL_VERSIONS);
    try {
      global.localStorage?.setItem(storageKey(), JSON.stringify(state.localVersions));
    } catch (_error) {
      // Local storage is an optional fallback.
    }
  }

  function migrateLegacyVersions() {
    const current = readJson(storageKey(), []);
    if (Array.isArray(current) && current.length) return current;
    const legacy = readJson(LEGACY_STORAGE_KEY, []);
    if (!Array.isArray(legacy) || !legacy.length) return [];
    const migrated = legacy.slice(0, 10).map((item) => ({
      localId: `legacy-${item.id || Date.now()}`,
      name: item.name || copy.defaultName,
      createdAt: item.createdAt || Date.now(),
      source: 'manual',
      state: item.state || {},
      syncStatus: 'local'
    }));
    writeLocalVersions(migrated);
    return migrated;
  }

  function captureState() {
    const manager = global.StateManager;
    if (!manager?.getStateObject) return null;
    return JSON.parse(JSON.stringify(manager.getStateObject()));
  }

  function applyState(snapshot, markSaved) {
    const manager = global.StateManager;
    if (!manager?.applyState || !snapshot) return false;
    manager.applyState(JSON.parse(JSON.stringify(snapshot)), true);
    if (markSaved) global.EditorProductionGuard?.markSaved?.();
    else manager.saveDebounced?.();
    document.dispatchEvent(new global.CustomEvent('editor:versionrestored', { detail: { cloud: Boolean(markSaved) } }));
    return true;
  }

  function apiBase() {
    const configured = typeof global.__API_BASE_URL === 'string' ? global.__API_BASE_URL.trim() : '';
    return (configured || global.location.origin).replace(/\/+$/, '');
  }

  async function apiFetch(path, options = {}) {
    const url = `${apiBase()}/api${path}`;
    if (typeof Auth !== 'undefined' && Auth.apiFetchWithRefresh) {
      return Auth.apiFetchWithRefresh(url, options);
    }
    const token = global.sessionStorage?.getItem('authAccessToken');
    const headers = { ...(options.headers || {}) };
    if (token) headers.Authorization = `Bearer ${token}`;
    return global.fetch(url, { ...options, headers, credentials: 'include', cache: 'no-store' });
  }

  function announce(message) {
    if (global.UIManager?.announce) global.UIManager.announce(message);
  }

  function setStatus(value, message) {
    document.documentElement.dataset.editorVersionState = value;
    const status = state.panel?.querySelector('[data-version-status]');
    if (status) {
      status.dataset.state = value;
      status.textContent = message || (value === 'cloud' ? copy.online : copy.offline);
    }
  }

  function localRecord(name, snapshot) {
    return {
      localId: `local-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      name: String(name || copy.defaultName).trim().slice(0, 64) || copy.defaultName,
      source: 'manual',
      createdAt: Date.now(),
      state: snapshot,
      syncStatus: designId() && global.navigator.onLine ? 'pending' : 'local'
    };
  }

  function cloudRecord(record) {
    return {
      id: record.id,
      cloudId: record.id,
      name: record.name,
      source: record.source || 'manual',
      createdAt: new Date(record.createdAt).getTime(),
      createdBy: record.createdBy,
      schemaVersion: record.schemaVersion || 1,
      syncStatus: 'cloud',
      cloud: true
    };
  }

  function mergeVersions() {
    const cloudIds = new Set(state.cloudVersions.map((item) => item.cloudId));
    return [
      ...state.cloudVersions,
      ...state.localVersions.filter((item) => !item.cloudId || !cloudIds.has(item.cloudId))
    ].sort((a, b) => Number(b.createdAt) - Number(a.createdAt));
  }

  async function loadCloudVersions() {
    const id = designId();
    if (!id || !global.navigator.onLine) {
      setStatus('local', id ? copy.offline : copy.draft);
      return false;
    }
    state.loading = true;
    render();
    try {
      const response = await apiFetch(`/design/${encodeURIComponent(id)}/versions`);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const payload = await response.json();
      state.cloudVersions = Array.isArray(payload.versions) ? payload.versions.map(cloudRecord) : [];
      setStatus('cloud', copy.online);
      await syncPendingVersions();
      return true;
    } catch (error) {
      console.warn('[EditorVersionManager] Cloud history unavailable:', error.message);
      setStatus('failed', copy.loadFailed);
      return false;
    } finally {
      state.loading = false;
      render();
    }
  }

  async function createCloudVersion(record) {
    const id = designId();
    if (!id || !global.navigator.onLine) return null;
    const response = await apiFetch(`/design/${encodeURIComponent(id)}/versions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: record.name, source: record.cloudId ? 'local-sync' : 'manual', state: record.state })
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const payload = await response.json();
    return cloudRecord(payload.version);
  }

  async function createVersion(name) {
    const snapshot = captureState();
    if (!snapshot) return false;
    const record = localRecord(name, snapshot);
    writeLocalVersions([record, ...state.localVersions]);
    render();

    if (!designId() || !global.navigator.onLine) {
      setStatus('local', designId() ? copy.offline : copy.draft);
      announce(copy.createdLocal);
      return true;
    }

    try {
      const cloud = await createCloudVersion(record);
      const updated = state.localVersions.map((item) => item.localId === record.localId
        ? { ...item, cloudId: cloud.cloudId, syncStatus: 'cloud' }
        : item);
      writeLocalVersions(updated);
      state.cloudVersions = [cloud, ...state.cloudVersions.filter((item) => item.cloudId !== cloud.cloudId)];
      setStatus('cloud', copy.online);
      announce(copy.createdCloud);
    } catch (error) {
      console.warn('[EditorVersionManager] Version sync failed:', error.message);
      writeLocalVersions(state.localVersions.map((item) => item.localId === record.localId
        ? { ...item, syncStatus: 'failed' }
        : item));
      setStatus('failed', copy.createFailed);
      announce(copy.createFailed);
    }
    render();
    return true;
  }

  async function syncPendingVersions() {
    if (!designId() || !global.navigator.onLine) return;
    const pending = state.localVersions.filter((item) => !item.cloudId && ['pending', 'failed', 'local'].includes(item.syncStatus));
    for (const record of pending) {
      try {
        const cloud = await createCloudVersion({ ...record, cloudId: 'pending' });
        writeLocalVersions(state.localVersions.map((item) => item.localId === record.localId
          ? { ...item, cloudId: cloud.cloudId, syncStatus: 'cloud' }
          : item));
        state.cloudVersions = [cloud, ...state.cloudVersions.filter((item) => item.cloudId !== cloud.cloudId)];
      } catch (_error) {
        writeLocalVersions(state.localVersions.map((item) => item.localId === record.localId
          ? { ...item, syncStatus: 'failed' }
          : item));
      }
    }
    render();
  }

  async function resolveVersionState(version) {
    if (version.state) return JSON.parse(JSON.stringify(version.state));
    if (!version.cloudId || !designId()) return null;
    const response = await apiFetch(`/design/${encodeURIComponent(designId())}/versions/${encodeURIComponent(version.cloudId)}`);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const payload = await response.json();
    return payload.version?.state || null;
  }

  function flatten(value, prefix = '', output = {}) {
    if (Array.isArray(value)) {
      output[prefix] = JSON.stringify(value);
      return output;
    }
    if (value && typeof value === 'object') {
      const keys = Object.keys(value);
      if (!keys.length && prefix) output[prefix] = '{}';
      keys.forEach((key) => flatten(value[key], prefix ? `${prefix}.${key}` : key, output));
      return output;
    }
    output[prefix] = JSON.stringify(value);
    return output;
  }

  function compareStates(snapshot, current) {
    const previous = flatten(snapshot || {});
    const present = flatten(current || {});
    const paths = Array.from(new Set([...Object.keys(previous), ...Object.keys(present)]));
    const changed = paths.filter((path) => previous[path] !== present[path]);
    const groups = {};
    changed.forEach((path) => {
      const first = path.split('.')[0];
      const group = copy.sections[first] ? first : 'other';
      if (!groups[group]) groups[group] = [];
      groups[group].push(path);
    });
    return { total: changed.length, groups };
  }

  async function compareVersion(version) {
    try {
      const snapshot = await resolveVersionState(version);
      state.comparison = {
        versionName: version.name,
        ...compareStates(snapshot, captureState())
      };
      render();
    } catch (error) {
      console.warn('[EditorVersionManager] Compare failed:', error.message);
      setStatus('failed', copy.loadFailed);
    }
  }

  async function restoreVersion(version) {
    if (!global.confirm(copy.confirmRestore)) return false;
    try {
      if (version.cloudId && designId() && global.navigator.onLine) {
        const response = await apiFetch(`/design/${encodeURIComponent(designId())}/versions/${encodeURIComponent(version.cloudId)}/restore`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ safetyName: copy.safetyName })
        });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const payload = await response.json();
        if (!applyState(payload.state, true)) throw new Error('State manager unavailable');
        announce(copy.restoredCloud);
        await loadCloudVersions();
      } else {
        const snapshot = await resolveVersionState(version);
        if (!applyState(snapshot, false)) throw new Error('State manager unavailable');
        announce(copy.restoredLocal);
      }
      closePanel();
      return true;
    } catch (error) {
      console.warn('[EditorVersionManager] Restore failed:', error.message);
      setStatus('failed', copy.loadFailed);
      return false;
    }
  }

  async function deleteVersion(version) {
    if (!global.confirm(copy.confirmDelete)) return false;
    try {
      if (version.cloudId && designId() && global.navigator.onLine) {
        const response = await apiFetch(`/design/${encodeURIComponent(designId())}/versions/${encodeURIComponent(version.cloudId)}`, {
          method: 'DELETE'
        });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        state.cloudVersions = state.cloudVersions.filter((item) => item.cloudId !== version.cloudId);
      }
      writeLocalVersions(state.localVersions.filter((item) => item.localId !== version.localId && item.cloudId !== version.cloudId));
      announce(copy.deleted);
      render();
      return true;
    } catch (error) {
      console.warn('[EditorVersionManager] Delete failed:', error.message);
      setStatus('failed', copy.loadFailed);
      return false;
    }
  }

  function element(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  }

  function actionButton(label, action, className = 'btn btn-secondary') {
    const button = element('button', className, label);
    button.type = 'button';
    button.dataset.versionAction = action;
    return button;
  }

  function statusText(version) {
    if (version.syncStatus === 'cloud') return copy.cloud;
    if (version.syncStatus === 'pending') return copy.pending;
    if (version.syncStatus === 'failed') return copy.failed;
    return copy.local;
  }

  function renderComparison(host) {
    if (!state.comparison) return;
    const box = element('section', 'editor-version-comparison');
    const title = element('h3', '', `${copy.comparing}: ${state.comparison.versionName}`);
    box.append(title);
    if (!state.comparison.total) {
      box.append(element('p', 'editor-version-empty', copy.noChanges));
    } else {
      box.append(element('strong', 'editor-version-change-count', `${state.comparison.total} ${copy.changes}`));
      const list = element('ul');
      Object.entries(state.comparison.groups).forEach(([group, paths]) => {
        const item = element('li');
        item.append(element('strong', '', copy.sections[group] || copy.sections.other));
        item.append(element('span', '', ` ${paths.length}`));
        const sample = paths.slice(0, 3).map((path) => path.split('.').slice(1).join('.') || path).join('، ');
        if (sample) item.append(element('small', '', sample));
        list.append(item);
      });
      box.append(list);
    }
    const close = actionButton(copy.close, 'close-comparison');
    box.append(close);
    host.append(box);
  }

  function render() {
    const panel = state.panel;
    if (!panel?.isConnected) return;
    const list = panel.querySelector('[data-version-list]');
    if (!list) return;
    list.replaceChildren();
    if (state.loading) {
      list.append(element('p', 'editor-version-empty', '…'));
      return;
    }
    const versions = mergeVersions();
    if (!versions.length) list.append(element('p', 'editor-version-empty', copy.empty));
    versions.forEach((version) => {
      const row = element('article', 'editor-cloud-version-row');
      row.dataset.versionId = version.cloudId || version.localId;
      const meta = element('div', 'editor-cloud-version-meta');
      meta.append(element('strong', '', version.name || copy.defaultName));
      const details = element('small', '', new Date(version.createdAt).toLocaleString());
      const source = copy.sources[version.source] || copy.sources.manual;
      details.append(document.createTextNode(` · ${source}`));
      meta.append(details);
      const badge = element('span', 'editor-version-sync-badge', statusText(version));
      badge.dataset.state = version.syncStatus || 'local';
      meta.append(badge);

      const actions = element('div', 'editor-cloud-version-actions');
      const compare = actionButton(copy.compare, 'compare');
      const restore = actionButton(copy.restore, 'restore', 'btn btn-primary');
      const remove = actionButton(copy.remove, 'delete', 'btn btn-ghost');
      [compare, restore, remove].forEach((button) => {
        button.dataset.versionKey = version.cloudId || version.localId;
      });
      actions.append(compare, restore, remove);
      if (version.syncStatus === 'failed') {
        const retry = actionButton(copy.retry, 'retry');
        retry.dataset.versionKey = version.localId;
        actions.prepend(retry);
      }
      row.append(meta, actions);
      list.append(row);
    });

    const comparisonHost = panel.querySelector('[data-version-comparison-host]');
    comparisonHost?.replaceChildren();
    if (comparisonHost) renderComparison(comparisonHost);
  }

  function findVersion(key) {
    return mergeVersions().find((item) => item.cloudId === key || item.localId === key) || null;
  }

  function buildPanel() {
    const panel = element('section', 'editor-cloud-version-popover');
    panel.id = 'editor-version-popover';
    panel.setAttribute('role', 'dialog');
    panel.setAttribute('aria-modal', 'false');
    panel.setAttribute('aria-label', copy.versions);

    const header = element('header', 'editor-cloud-version-header');
    const heading = element('div');
    heading.append(element('h2', '', copy.versions), element('p', '', copy.hint));
    const controls = element('div', 'editor-cloud-version-header-actions');
    const status = element('span', 'editor-version-connection', global.navigator.onLine ? copy.online : copy.offline);
    status.dataset.versionStatus = 'true';
    status.dataset.state = global.navigator.onLine ? 'cloud' : 'local';
    const refresh = actionButton(copy.refresh, 'refresh');
    const close = actionButton(copy.close, 'close', 'btn btn-ghost');
    controls.append(status, refresh, close);
    header.append(heading, controls);

    const form = element('form', 'editor-cloud-version-form');
    const input = element('input');
    input.type = 'text';
    input.maxLength = 64;
    input.placeholder = copy.name;
    input.setAttribute('aria-label', copy.name);
    const create = element('button', 'btn btn-primary', copy.create);
    create.type = 'submit';
    form.append(input, create);

    const list = element('div', 'editor-cloud-version-list');
    list.dataset.versionList = 'true';
    const comparisonHost = element('div');
    comparisonHost.dataset.versionComparisonHost = 'true';
    panel.append(header, form, comparisonHost, list);

    form.addEventListener('submit', async (event) => {
      event.preventDefault();
      create.disabled = true;
      await createVersion(input.value.trim());
      input.value = '';
      create.disabled = false;
      input.focus();
    });

    panel.addEventListener('click', async (event) => {
      const button = event.target.closest('[data-version-action]');
      if (!button) return;
      const action = button.dataset.versionAction;
      if (action === 'close') return closePanel();
      if (action === 'refresh') return loadCloudVersions();
      if (action === 'close-comparison') {
        state.comparison = null;
        render();
        return;
      }
      const version = findVersion(button.dataset.versionKey);
      if (!version) return;
      button.disabled = true;
      if (action === 'compare') await compareVersion(version);
      if (action === 'restore') await restoreVersion(version);
      if (action === 'delete') await deleteVersion(version);
      if (action === 'retry') await syncPendingVersions();
      button.disabled = false;
    });

    return panel;
  }

  function openPanel() {
    closePanel();
    state.comparison = null;
    state.panel = buildPanel();
    document.body.append(state.panel);
    render();
    loadCloudVersions();
    state.panel.querySelector('input')?.focus();
    document.addEventListener('keydown', handleEscape);
    return state.panel;
  }

  function closePanel() {
    document.getElementById('editor-version-popover')?.remove();
    state.panel = null;
    document.removeEventListener('keydown', handleEscape);
  }

  function handleEscape(event) {
    if (event.key === 'Escape') closePanel();
  }

  function setupVersionButton() {
    const toolbar = document.querySelector('.tb-history');
    if (!toolbar) return;
    let button = document.getElementById('editor-versions-btn');
    if (button) {
      const replacement = button.cloneNode(true);
      button.replaceWith(replacement);
      button = replacement;
    } else {
      button = element('button', 'tb-icon-btn');
      button.type = 'button';
      button.id = 'editor-versions-btn';
      const icon = element('i', 'fas fa-history');
      icon.setAttribute('aria-hidden', 'true');
      button.append(icon);
      toolbar.append(button);
    }
    button.title = copy.versions;
    button.setAttribute('aria-label', copy.versions);
    button.dataset.versionManager = 'cloud';
    button.addEventListener('click', () => {
      if (state.panel) closePanel(); else openPanel();
    });
  }

  function initialize() {
    if (state.initialized) return;
    state.initialized = true;
    const local = migrateLegacyVersions();
    state.localVersions = Array.isArray(local) ? local : [];
    global.setTimeout(setupVersionButton, 0);
    global.addEventListener('online', () => {
      setStatus('cloud', copy.online);
      syncPendingVersions();
      if (state.panel) loadCloudVersions();
    });
    global.addEventListener('offline', () => setStatus('local', copy.offline));
    document.documentElement.dataset.editorVersionManager = 'ready';
    document.dispatchEvent(new global.CustomEvent('editor:versionmanagerready', { detail: { version: VERSION } }));
  }

  global.EditorVersionManager = {
    init: initialize,
    open: openPanel,
    close: closePanel,
    createVersion,
    compareStates,
    syncPendingVersions,
    getState: () => ({
      designId: designId(),
      cloudVersions: state.cloudVersions.map((item) => ({ ...item })),
      localVersions: state.localVersions.map((item) => ({ ...item })),
      connection: document.documentElement.dataset.editorVersionState || 'local'
    })
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initialize, { once: true });
  else initialize();
}(typeof window !== 'undefined' ? window : globalThis));
