const fs = require('fs');
const path = require('path');

const source = fs.readFileSync(path.join(__dirname, '..', 'editor-production-guard.js'), 'utf8');

function deferred() {
  let resolve;
  let reject;
  const promise = new Promise((res, rej) => { resolve = res; reject = rej; });
  return { promise, resolve, reject };
}

async function flushMicrotasks(rounds = 6) {
  for (let index = 0; index < rounds; index += 1) await Promise.resolve();
}

function prepareDom() {
  document.documentElement.lang = 'en';
  document.body.innerHTML = '<div id="autosave-indicator"><i></i><span id="autosave-status"></span></div><main class="pro-layout"><input id="input-name_en" value="Initial"></main>';
  Object.defineProperty(window.navigator, 'onLine', { configurable: true, value: true });
  window.navigator.sendBeacon = jest.fn(() => true);
  window.EditorUIState = { set: jest.fn((state, message) => {
    document.getElementById('autosave-status').textContent = message;
    document.getElementById('autosave-indicator').dataset.uiState = state;
  }) };
  window.ShareManager = { saveDesign: jest.fn(async () => 'card-1') };
  const networkFetch = jest.fn(async () => ({ ok: true, status: 200, json: async () => ({ success: true, id: 'card-1' }) }));
  window.fetch = networkFetch;
  return networkFetch;
}

function boot(initialState = { inputs: { name: 'Initial' } }) {
  let currentState = JSON.parse(JSON.stringify(initialState));
  const networkFetch = prepareDom();
  window.StateManager = {
    getStateObject: jest.fn(() => currentState),
    applyState: jest.fn((next) => { currentState = JSON.parse(JSON.stringify(next)); }),
    saveDebounced: jest.fn()
  };

  window.eval(source);
  document.dispatchEvent(new Event('DOMContentLoaded'));
  jest.runOnlyPendingTimers();

  return {
    setState(next) { currentState = JSON.parse(JSON.stringify(next)); },
    guard: window.EditorProductionGuard,
    networkFetch
  };
}

describe('EditorProductionGuard', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    localStorage.clear();
    delete window.EditorProductionGuard;
    delete window.__MC_PRIME_RELEASE;
    delete window.StateManager;
    delete window.StateManagerProxy;
    delete window.editorState;
    delete document.documentElement.dataset.editorWorkspace;
    delete document.documentElement.dataset.editorProduction;
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('initializes with a clean production state', () => {
    const { guard } = boot();
    expect(document.documentElement.dataset.editorProduction).toBe('ready');
    expect(document.documentElement.dataset.editorDirty).toBe('false');
    expect(guard.getState()).toMatchObject({ initialized: true, armed: true, dirty: false });
  });

  it('arms from workspace readiness and stores form state without a global StateManager', () => {
    prepareDom();
    document.documentElement.dataset.editorWorkspace = 'ready';
    window.eval(source);
    document.dispatchEvent(new Event('DOMContentLoaded'));
    jest.advanceTimersByTime(1);

    expect(window.EditorProductionGuard.getState()).toMatchObject({ initialized: true, armed: true });
    const input = document.getElementById('input-name_en');
    input.value = 'Workspace fallback';
    input.dispatchEvent(new Event('input', { bubbles: true }));
    jest.advanceTimersByTime(400);

    const draft = JSON.parse(localStorage.getItem('mcprime:editor-draft:v1:new:en'));
    expect(draft.state.__productionFallback).toBe(true);
    expect(draft.state.fields['input-name_en'].value).toBe('Workspace fallback');
  });

  it('marks changes dirty and stores a recoverable local draft', () => {
    const context = boot();
    context.setState({ inputs: { name: 'Changed' } });
    context.guard.markDirty('test');
    jest.advanceTimersByTime(400);

    expect(context.guard.getState().dirty).toBe(true);
    const draft = JSON.parse(localStorage.getItem('mcprime:editor-draft:v1:new:en'));
    expect(draft.state.inputs.name).toBe('Changed');
    expect(draft.release).toBe('editor-phase7.1');
  });

  it('prevents navigation while changes are dirty', () => {
    const context = boot();
    context.setState({ inputs: { name: 'Changed' } });
    context.guard.markDirty('test');
    jest.advanceTimersByTime(1);

    const event = new Event('beforeunload', { cancelable: true });
    window.dispatchEvent(event);
    expect(event.defaultPrevented).toBe(true);
  });

  it('serializes cloud save requests and clears dirty state after the latest save', async () => {
    const context = boot();
    const first = deferred();
    const second = deferred();
    context.networkFetch.mockReset()
      .mockImplementationOnce(() => first.promise)
      .mockImplementationOnce(() => second.promise);

    context.setState({ inputs: { name: 'Changed' } });
    context.guard.markDirty('test');
    jest.advanceTimersByTime(1);

    const saveOne = window.fetch('/api/save-design', { method: 'POST', body: '{}' });
    const saveTwo = window.fetch('/api/save-design?id=card-1', { method: 'POST', body: '{}' });
    await flushMicrotasks();
    expect(context.networkFetch).toHaveBeenCalledTimes(1);

    first.resolve({ ok: true, status: 200 });
    await saveOne;
    await flushMicrotasks();
    expect(context.networkFetch).toHaveBeenCalledTimes(2);

    second.resolve({ ok: true, status: 200 });
    await saveTwo;
    expect(context.guard.getState().dirty).toBe(false);
    expect(document.getElementById('autosave-status').textContent).toBe('Saved to cloud');
  });

  it('clears dirty state when a delayed duplicate event does not change content', async () => {
    const context = boot();
    const pending = deferred();
    context.networkFetch.mockReset().mockImplementationOnce(() => pending.promise);

    context.setState({ inputs: { name: 'Changed' } });
    context.guard.markDirty('first');
    jest.advanceTimersByTime(1);
    const save = window.fetch('/api/save-design', { method: 'POST', body: '{}' });
    await flushMicrotasks();

    context.guard.markDirty('duplicate-event');
    jest.advanceTimersByTime(1);
    expect(context.guard.getState().revision).toBe(2);

    pending.resolve({ ok: true, status: 200 });
    await save;
    expect(context.guard.getState().dirty).toBe(false);
  });

  it('keeps newer changes dirty when an older save finishes', async () => {
    const context = boot();
    const pending = deferred();
    context.networkFetch.mockReset().mockImplementationOnce(() => pending.promise);

    context.setState({ inputs: { name: 'First change' } });
    context.guard.markDirty('first');
    jest.advanceTimersByTime(1);
    const save = window.fetch('/api/save-design', { method: 'POST', body: '{}' });
    await flushMicrotasks();
    expect(context.networkFetch).toHaveBeenCalledTimes(1);

    context.setState({ inputs: { name: 'Newer change' } });
    context.guard.markDirty('newer');
    jest.advanceTimersByTime(1);
    pending.resolve({ ok: true, status: 200 });
    await save;
    jest.advanceTimersByTime(100);

    expect(context.guard.getState().dirty).toBe(true);
    expect(window.StateManager.saveDebounced).toHaveBeenCalled();
  });

  it('shows an error and preserves the local draft when cloud save fails', async () => {
    const context = boot();
    context.networkFetch.mockReset().mockRejectedValueOnce(new Error('network down'));
    context.setState({ inputs: { name: 'Changed' } });
    context.guard.markDirty('test');
    jest.advanceTimersByTime(1);

    await expect(window.fetch('/api/save-design', { method: 'POST', body: '{}' })).rejects.toThrow('network down');
    jest.advanceTimersByTime(400);

    expect(context.guard.getState()).toMatchObject({ dirty: true, saving: false, lastError: 'network down' });
    expect(document.getElementById('autosave-indicator').dataset.productionState).toBe('save-error');
    expect(localStorage.getItem('mcprime:editor-draft:v1:new:en')).toBeTruthy();
  });

  it('restores a local draft through the recovery banner', () => {
    localStorage.setItem('mcprime:editor-draft:v1:new:en', JSON.stringify({
      version: 1, release: 'previous', designId: 'new', language: 'en', savedAt: Date.now(), revision: 3,
      state: { inputs: { name: 'Recovered' } }
    }));

    const context = boot({ inputs: { name: 'Server version' } });
    jest.advanceTimersByTime(150);
    const restore = document.querySelector('.editor-recovery-restore');
    expect(restore).not.toBeNull();
    restore.click();

    expect(window.StateManager.applyState).toHaveBeenCalledWith({ inputs: { name: 'Recovered' } }, true);
    expect(context.guard.getState().dirty).toBe(true);
    expect(document.querySelector('.editor-recovery-banner')).toBeNull();
  });
});
