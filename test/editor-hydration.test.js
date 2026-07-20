/** @jest-environment jsdom */

describe('editor first-paint hydration gate', () => {
  beforeEach(() => {
    jest.resetModules();
    document.documentElement.dataset.editorHydrated = 'false';
    document.documentElement.dataset.editorHydration = 'pending';
    document.body.innerHTML = `
      <section id="cards-wrapper" aria-busy="true">
        <div id="editor-card-hydration-placeholder"></div>
        <div class="card-flipper"></div>
      </section>`;
    window.requestAnimationFrame = (callback) => callback();
  });

  afterEach(() => {
    delete window.EditorHydration;
    delete window.requestAnimationFrame;
    delete document.documentElement.dataset.editorHydrated;
    delete document.documentElement.dataset.editorHydration;
  });

  test('keeps the card busy until hydration is explicitly completed', async () => {
    const hydrated = jest.fn();
    document.addEventListener('editor:hydrated', hydrated, { once: true });

    require('../editor-hydration');

    expect(document.documentElement.dataset.editorHydrated).toBe('false');
    expect(document.getElementById('cards-wrapper').getAttribute('aria-busy')).toBe('true');

    await window.EditorHydration.reveal({ timeoutMs: 10 });

    expect(document.documentElement.dataset.editorHydrated).toBe('true');
    expect(document.documentElement.dataset.editorHydration).toBe('ready');
    expect(document.getElementById('cards-wrapper').getAttribute('aria-busy')).toBe('false');
    expect(hydrated).toHaveBeenCalledTimes(1);
  });

  test('deduplicates simultaneous reveal calls', async () => {
    const hydrated = jest.fn();
    document.addEventListener('editor:hydrated', hydrated);
    require('../editor-hydration');

    await Promise.all([
      window.EditorHydration.reveal({ timeoutMs: 10 }),
      window.EditorHydration.reveal({ timeoutMs: 10 })
    ]);

    expect(hydrated).toHaveBeenCalledTimes(1);
    document.removeEventListener('editor:hydrated', hydrated);
  });
});
