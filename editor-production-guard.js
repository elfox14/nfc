(function initializeEditorProductionGuard(global) {
  'use strict';

  const document = global.document;
  if (!document || global.EditorProductionGuard) return;

  const english = document.documentElement.lang.toLowerCase().startsWith('en');
  const release = String(global.__MC_PRIME_RELEASE || 'editor-phase7.1');
  const text = english ? {
    ready: 'Ready', dirty: 'Unsaved changes', saving: 'Saving to cloud…', cloud: 'Saved to cloud',
    local: 'Saved locally — offline', failed: 'Cloud save failed', retry: 'Retry save',
    found: 'Unsaved local changes were found.', hint: 'Restore them or discard the local backup.',
    restore: 'Restore changes', discard: 'Discard backup', restored: 'Local changes restored',
    leave: 'You have unsaved changes.', reconnect: 'Connection restored — retrying save…'
  } : {
    ready: 'جاهز', dirty: 'تغييرات غير محفوظة', saving: 'جاري الحفظ سحابيًا…', cloud: 'محفوظ سحابيًا',
    local: 'محفوظ محليًا — لا يوجد اتصال', failed: 'فشل الحفظ السحابي', retry: 'إعادة محاولة الحفظ',
    found: 'تم العثور على تغييرات محلية غير محفوظة.', hint: 'يمكنك استعادتها أو حذف النسخة المحلية.',
    restore: 'استعادة التغييرات', discard: 'حذف النسخة', restored: 'تمت استعادة التغييرات المحلية',
    leave: 'لديك تغييرات غير محفوظة.', reconnect: 'عاد الاتصال — تجري إعادة محاولة الحفظ…'
  };

  const trackedEvents = [
    'editor:layermetadatachange', 'editor:layerappearancechange', 'editor:layertransformreset',
    'editor:layermove', 'editor:layeralign', 'editor:creativechange'
  ];
  const state = {
    initialized: false, armed: false, dirty: false, saving: false,
    offline: global.navigator ? global.navigator.onLine === false : false,
    revision: 0, savedRevision: 0, activeSaves: 0, lastSavedAt: null, lastError: null
  };

  let started = false;
  let draftTimer;
  let dirtyTimer;
  let saveSequence = 0;
  let saveQueue = Promise.resolve();
  let savedFingerprint = '';
  let recoveryBanner;
  let telemetryCount = 0;

  function emit(name, detail) {
    document.dispatchEvent(new global.CustomEvent(name, { detail }));
  }

  function clone(value) {
    return value == null ? null : JSON.parse(JSON.stringify(value));
  }

  function captureFormFallback() {
    const fields = {};
    document.querySelectorAll('.pro-layout input[id],.pro-layout textarea[id],.pro-layout select[id]').forEach((input) => {
      if (['button', 'submit', 'reset', 'file'].includes(String(input.type || '').toLowerCase())) return;
      fields[input.id] = {
        value: input.value,
        checked: Boolean(input.checked),
        type: String(input.type || input.tagName || '').toLowerCase()
      };
    });
    return Object.keys(fields).length ? { __productionFallback: true, fields } : null;
  }

  function snapshot() {
    try {
      if (typeof global.StateManager?.getStateObject === 'function') {
        const value = global.StateManager.getStateObject();
        return value ? clone(value) : null;
      }
      if (global.editorState && typeof global.editorState === 'object' && Object.keys(global.editorState).length) {
        return clone(global.editorState);
      }
      return captureFormFallback();
    } catch (error) {
      report(error, 'capture-state');
      return captureFormFallback();
    }
  }

  function restoreSnapshot(savedState) {
    const value = clone(savedState);
    if (!value) return false;
    try {
      if (typeof global.StateManager?.applyState === 'function') {
        global.StateManager.applyState(value, true);
        return true;
      }
      if (!value.__productionFallback && typeof global.StateManagerProxy?.batch === 'function') {
        global.StateManagerProxy.batch((current) => {
          Object.keys(current).forEach((key) => { delete current[key]; });
          Object.assign(current, value);
        });
        return true;
      }
      if (!value.__productionFallback && global.editorState && typeof global.editorState === 'object') {
        Object.keys(global.editorState).forEach((key) => { delete global.editorState[key]; });
        Object.assign(global.editorState, value);
        document.dispatchEvent(new global.CustomEvent('editor:state-restored'));
        return true;
      }
      const fields = value.fields || value.inputs;
      if (!fields || typeof fields !== 'object') return false;
      Object.entries(fields).forEach(([id, entry]) => {
        const input = document.getElementById(id);
        if (!input) return;
        const normalized = entry && typeof entry === 'object' && Object.hasOwn(entry, 'value')
          ? entry
          : { value: entry };
        if ('checked' in normalized && ('checked' in input)) input.checked = Boolean(normalized.checked);
        if ('value' in normalized) input.value = normalized.value == null ? '' : String(normalized.value);
        input.dispatchEvent(new global.Event('input', { bubbles: true }));
        input.dispatchEvent(new global.Event('change', { bubbles: true }));
      });
      return true;
    } catch (error) {
      report(error, 'restore-state');
      return false;
    }
  }

  function fingerprint(value) {
    try { return value ? JSON.stringify(value) : ''; } catch (_error) { return ''; }
  }

  function identity() {
    const params = new URLSearchParams(global.location ? global.location.search : '');
    return params.get('id') || params.get('collabId') || 'new';
  }

  function draftKey() {
    return `mcprime:editor-draft:v1:${identity()}:${english ? 'en' : 'ar'}`;
  }

  function syncRoot() {
    const root = document.documentElement;
    root.dataset.editorProduction = state.initialized ? 'ready' : 'loading';
    root.dataset.editorDirty = state.dirty ? 'true' : 'false';
    root.dataset.editorSaving = state.saving ? 'true' : 'false';
    root.dataset.editorOffline = state.offline ? 'true' : 'false';
    root.dataset.editorRelease = release;
  }

  function setStatus(uiState, message, productionState) {
    if (global.EditorUIState && typeof global.EditorUIState.set === 'function') {
      global.EditorUIState.set(uiState, message);
    } else {
      const status = document.getElementById('autosave-status');
      if (status) status.textContent = message;
    }
    const indicator = document.getElementById('autosave-indicator');
    if (!indicator) return;
    indicator.dataset.productionState = productionState;
    let retry = indicator.querySelector('.editor-save-retry');
    if (!retry) {
      retry = document.createElement('button');
      retry.type = 'button';
      retry.className = 'editor-save-retry';
      retry.textContent = text.retry;
      retry.addEventListener('click', () => { void flush(true); });
      indicator.append(retry);
    }
    retry.hidden = !(state.dirty && !state.saving && (state.offline || state.lastError));
    retry.disabled = state.offline || state.saving;
  }

  function renderStatus() {
    if (state.saving) setStatus('saving', text.saving, 'saving-cloud');
    else if (state.dirty && state.offline) setStatus('saved', text.local, 'saved-local');
    else if (state.lastError) setStatus('error', text.failed, 'save-error');
    else if (state.dirty) setStatus('idle', text.dirty, 'unsaved');
    else if (state.lastSavedAt) setStatus('saved', text.cloud, 'saved-cloud');
    else setStatus('saved', text.ready, 'ready');
  }

  function installStyles() {
    if (document.getElementById('editor-production-guard-styles')) return;
    const style = document.createElement('style');
    style.id = 'editor-production-guard-styles';
    style.textContent = '.editor-save-retry{margin-inline-start:.45rem;border:0;border-radius:999px;padding:.25rem .55rem;background:rgba(255,255,255,.12);color:inherit;font:inherit;font-size:.72rem;cursor:pointer}.editor-recovery-banner{position:fixed;inset-inline:1rem;top:5.5rem;z-index:10050;max-width:760px;margin-inline:auto;display:flex;align-items:center;gap:1rem;padding:1rem;border:1px solid rgba(245,158,11,.45);border-radius:14px;background:#151f2e;color:#fff;box-shadow:0 16px 44px rgba(0,0,0,.34)}.editor-recovery-copy{flex:1}.editor-recovery-copy span{display:block;color:#b9c5d4;font-size:.88rem}.editor-recovery-actions{display:flex;gap:.55rem}.editor-recovery-actions button{border:0;border-radius:9px;padding:.55rem .8rem;font:inherit;font-weight:700;cursor:pointer}.editor-recovery-restore{background:#4da6ff;color:#07111f}.editor-recovery-discard{background:rgba(255,255,255,.1);color:#fff}@media(max-width:680px){.editor-recovery-banner{top:4.6rem;flex-direction:column;align-items:stretch}}';
    document.head.append(style);
  }

  function persistDraft() {
    if (!state.dirty) return false;
    const value = snapshot();
    if (!value) return false;
    try {
      const serialized = JSON.stringify({
        version: 1, release, designId: identity(), language: english ? 'en' : 'ar',
        savedAt: Date.now(), revision: state.revision, state: value
      });
      if (serialized.length > 2 * 1024 * 1024) throw new Error('Draft exceeds local storage limit');
      global.localStorage?.setItem(draftKey(), serialized);
      emit('editor:draftstored', { revision: state.revision, bytes: serialized.length });
      return true;
    } catch (error) {
      report(error, 'persist-draft');
      return false;
    }
  }

  function removeDraft() {
    try { global.localStorage?.removeItem(draftKey()); } catch (_error) { /* optional storage */ }
  }

  function scheduleDraft() {
    global.clearTimeout(draftTimer);
    draftTimer = global.setTimeout(persistDraft, 350);
  }

  function computeDirty(reason) {
    if (!state.armed) return;
    const current = fingerprint(snapshot());
    if (current && current === savedFingerprint) {
      state.dirty = false;
      removeDraft();
    } else {
      state.revision += 1;
      state.dirty = true;
      state.lastError = null;
      scheduleDraft();
    }
    syncRoot();
    renderStatus();
    emit('editor:dirtychange', { dirty: state.dirty, reason, revision: state.revision });
  }

  function markDirty(reason) {
    global.clearTimeout(dirtyTimer);
    dirtyTimer = global.setTimeout(() => computeDirty(reason || 'change'), 0);
  }

  function beginSave(source) {
    const token = { id: ++saveSequence, revision: state.revision, source };
    state.activeSaves += 1;
    state.saving = true;
    state.lastError = null;
    syncRoot();
    renderStatus();
    emit('editor:cloudsavestart', token);
    return token;
  }

  function finishSave(token) {
    state.activeSaves = Math.max(0, state.activeSaves - 1);
    state.saving = state.activeSaves > 0;
    state.lastSavedAt = Date.now();
    state.lastError = null;
    if (token.revision >= state.revision) {
      state.savedRevision = state.revision;
      state.dirty = false;
      savedFingerprint = fingerprint(snapshot());
      removeDraft();
    } else {
      state.dirty = true;
      scheduleDraft();
      if (!state.saving && !state.offline) global.setTimeout(() => { void flush(false); }, 80);
    }
    syncRoot();
    renderStatus();
    emit('editor:cloudsavesuccess', { ...token, dirty: state.dirty, savedAt: state.lastSavedAt });
  }

  function failSave(token, error) {
    state.activeSaves = Math.max(0, state.activeSaves - 1);
    state.saving = state.activeSaves > 0;
    state.dirty = true;
    state.lastError = error instanceof Error ? error : new Error(String(error || text.failed));
    scheduleDraft();
    syncRoot();
    renderStatus();
    report(state.lastError, `cloud-save:${token.source}`);
    emit('editor:cloudsaveerror', { ...token, error: state.lastError });
  }

  function isSaveRequest(input, init) {
    const method = String(init?.method || input?.method || 'GET').toUpperCase();
    if (!['POST', 'PUT', 'PATCH'].includes(method)) return false;
    try {
      const raw = typeof input === 'string' ? input : input?.url;
      return /\/api\/save-design\/?$/.test(new URL(raw, global.location?.href || 'https://invalid.local').pathname);
    } catch (_error) { return false; }
  }

  function patchFetch() {
    if (typeof global.fetch !== 'function' || global.fetch.__editorProductionGuard) return;
    const originalFetch = global.fetch.bind(global);
    const guardedFetch = function guardedFetch(input, init) {
      if (!isSaveRequest(input, init)) return originalFetch(input, init);
      const run = async () => {
        const token = beginSave('fetch');
        try {
          const response = await originalFetch(input, init);
          if (response && response.ok) finishSave(token);
          else failSave(token, new Error(`Save failed with HTTP ${response ? response.status : 'unknown'}`));
          return response;
        } catch (error) {
          failSave(token, error);
          throw error;
        }
      };
      const queued = saveQueue.catch(() => undefined).then(run);
      saveQueue = queued.then(() => undefined, () => undefined);
      return queued;
    };
    guardedFetch.__editorProductionGuard = true;
    global.fetch = guardedFetch;
  }

  async function flush(forceCloud) {
    if (!state.dirty || state.saving) return !state.dirty;
    if (state.offline || global.navigator?.onLine === false) {
      state.offline = true;
      persistDraft();
      syncRoot();
      renderStatus();
      return false;
    }
    try {
      if (forceCloud && global.ShareManager?.saveDesign) return Boolean(await global.ShareManager.saveDesign());
      if (global.StateManager?.saveDebounced) {
        global.StateManager.saveDebounced();
        return true;
      }
      if (global.ShareManager?.saveDesign) return Boolean(await global.ShareManager.saveDesign());
    } catch (error) {
      state.lastError = error instanceof Error ? error : new Error(String(error));
      state.dirty = true;
      scheduleDraft();
      renderStatus();
      report(state.lastError, 'flush');
    }
    return false;
  }

  function readDraft() {
    try {
      const value = JSON.parse(global.localStorage?.getItem(draftKey()) || 'null');
      return value && value.version === 1 && value.state ? value : null;
    } catch (_error) { return null; }
  }

  function showRecovery(draft) {
    if (recoveryBanner || !draft) return;
    recoveryBanner = document.createElement('aside');
    recoveryBanner.className = 'editor-recovery-banner';
    recoveryBanner.setAttribute('role', 'status');
    recoveryBanner.innerHTML = `<div class="editor-recovery-copy"><strong>${text.found}</strong><span>${text.hint}</span></div><div class="editor-recovery-actions"><button type="button" class="editor-recovery-restore">${text.restore}</button><button type="button" class="editor-recovery-discard">${text.discard}</button></div>`;
    document.body.append(recoveryBanner);
    recoveryBanner.querySelector('.editor-recovery-restore').addEventListener('click', () => {
      if (!restoreSnapshot(draft.state)) return;
      state.revision = Math.max(state.revision + 1, Number(draft.revision) || 1);
      state.dirty = true;
      state.lastError = null;
      scheduleDraft();
      syncRoot();
      setStatus('idle', text.restored, 'restored-local');
      emit('editor:draftrestored', { savedAt: draft.savedAt, revision: state.revision });
      recoveryBanner.remove();
      recoveryBanner = null;
    });
    recoveryBanner.querySelector('.editor-recovery-discard').addEventListener('click', () => {
      removeDraft();
      recoveryBanner.remove();
      recoveryBanner = null;
      emit('editor:draftdiscarded', { savedAt: draft.savedAt });
    });
  }

  function inspectRecovery() {
    const draft = readDraft();
    if (!draft) return;
    if (fingerprint(draft.state) === fingerprint(snapshot())) return removeDraft();
    showRecovery(draft);
  }

  function shouldTrack(target) {
    if (!target?.matches || target.closest('.editor-recovery-banner,[data-production-ignore="true"]')) return false;
    if (!target.matches('input,textarea,select,[contenteditable="true"]')) return false;
    if (['button', 'submit', 'reset', 'file'].includes(String(target.type || '').toLowerCase())) return false;
    return Boolean(target.closest('.pro-layout,.modal-overlay,.ai-modal-overlay') || target.id?.startsWith('editor-layer-'));
  }

  function setupEvents() {
    document.addEventListener('input', (event) => { if (shouldTrack(event.target)) markDirty(`input:${event.target.id || 'field'}`); }, true);
    document.addEventListener('change', (event) => { if (shouldTrack(event.target)) markDirty(`change:${event.target.id || 'field'}`); }, true);
    trackedEvents.forEach((name) => document.addEventListener(name, () => markDirty(name)));
    global.addEventListener('offline', () => {
      state.offline = true;
      if (state.dirty) persistDraft();
      syncRoot();
      renderStatus();
      emit('editor:networkchange', { online: false });
    });
    global.addEventListener('online', () => {
      state.offline = false;
      syncRoot();
      if (state.dirty) {
        setStatus('saving', text.reconnect, 'reconnecting');
        global.setTimeout(() => { void flush(true); }, 200);
      } else renderStatus();
      emit('editor:networkchange', { online: true });
    });
    global.addEventListener('beforeunload', (event) => {
      if (!state.dirty && !state.saving) return undefined;
      persistDraft();
      event.preventDefault();
      event.returnValue = text.leave;
      return text.leave;
    });
    global.addEventListener('pagehide', () => { if (state.dirty) persistDraft(); });
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden' && state.dirty) persistDraft();
    });
  }

  function report(error, context) {
    if (telemetryCount++ >= 5) return;
    try {
      const body = JSON.stringify({
        message: error?.message || String(error || 'Editor production error'),
        source: 'editor-production-guard', stack: error?.stack || '', url: global.location?.href || '',
        userAgent: String(global.navigator?.userAgent || '').slice(0, 120), timestamp: new Date().toISOString(),
        release, context
      });
      const apiBase = String(global.__API_BASE_URL || '').replace(/\/+$/, '');
      const endpoint = `${apiBase}/api/client-error`;
      if (global.navigator?.sendBeacon) global.navigator.sendBeacon(endpoint, new Blob([body], { type: 'application/json' }));
      else global.fetch?.(endpoint, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body, keepalive: true }).catch(() => undefined);
    } catch (_error) { /* telemetry must never break editing */ }
  }

  function hasSerializableState() {
    return typeof global.StateManager?.getStateObject === 'function' ||
      Boolean(global.editorState && typeof global.editorState === 'object' && Object.keys(global.editorState).length);
  }

  function arm(attempt) {
    const workspaceReady = document.documentElement.dataset.editorWorkspace === 'ready';
    const stateReady = hasSerializableState();
    if (stateReady || workspaceReady || attempt >= 30) {
      savedFingerprint = fingerprint(snapshot());
      state.armed = true;
      state.initialized = true;
      syncRoot();
      renderStatus();
      global.setTimeout(inspectRecovery, stateReady ? 120 : 500);
      emit('editor:productionready', { release, degraded: !stateReady });
      return;
    }
    global.setTimeout(() => arm(attempt + 1), 100);
  }

  function initialize() {
    if (started) return;
    started = true;
    installStyles();
    patchFetch();
    setupEvents();
    syncRoot();
    arm(0);
  }

  global.EditorProductionGuard = {
    init: initialize, markDirty, flush, persistDraft, discardDraft: removeDraft,
    markSaved: () => finishSave({ id: ++saveSequence, revision: state.revision, source: 'manual' }),
    getState: () => ({
      initialized: state.initialized, armed: state.armed, dirty: state.dirty, saving: state.saving,
      offline: state.offline, revision: state.revision, savedRevision: state.savedRevision,
      lastSavedAt: state.lastSavedAt, lastError: state.lastError ? state.lastError.message : null, release
    })
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initialize, { once: true });
  else initialize();
}(typeof window !== 'undefined' ? window : globalThis));
