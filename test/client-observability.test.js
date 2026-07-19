/** @jest-environment jsdom */

describe('client observability', () => {
  beforeEach(() => {
    jest.resetModules();
    window.__MC_PRIME_RELEASE = '2026.07.20-phase12.0';
    window.__API_BASE_URL = 'https://api.example.com';
    Object.defineProperty(window, 'PerformanceObserver', { configurable: true, value: class { observe() {} } });
    Object.defineProperty(window.performance, 'getEntriesByType', { configurable: true, value: jest.fn(() => []) });
    Object.defineProperty(window.navigator, 'sendBeacon', { configurable: true, value: jest.fn(() => true) });
  });

  test('reports allowlisted editor lifecycle events and never reads local storage', () => {
    const storageSpy = jest.spyOn(Storage.prototype, 'getItem');
    history.replaceState({}, '', '/nfc/editor.html?id=sensitive-design-id');
    require('../client-observability');
    document.dispatchEvent(new CustomEvent('editor:cloudsavesuccess', { detail: { designId: 'sensitive-design-id' } }));
    window.MCPrimeObservability.flush();

    expect(storageSpy).not.toHaveBeenCalled();
    expect(navigator.sendBeacon).toHaveBeenCalled();
    expect(navigator.sendBeacon.mock.calls.at(-1)[0]).toBe('https://api.example.com/api/observability');
    const blob = navigator.sendBeacon.mock.calls.at(-1)[1];
    expect(blob.type).toBe('application/json');
    delete window.__MC_PRIME_RELEASE;
    delete window.__API_BASE_URL;
  });
});
