/** @jest-environment jsdom */
'use strict';

function jsonResponse(status, payload) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => payload
  };
}

function loadClient(fetchImpl) {
  jest.resetModules();
  document.documentElement.innerHTML = '<head></head><body></body>';
  window.history.replaceState({}, '', '/nfc/dashboard.html');
  sessionStorage.setItem('authAccessToken', 'access-token');
  window.fetch = fetchImpl;
  delete window.Auth;
  delete window.BrandKitClient;
  jest.isolateModules(() => require('../brand-kit-client'));
  return window.BrandKitClient;
}

describe('Brand Kit browser client', () => {
  test('builds authenticated JSON requests for cloud operations', async () => {
    const fetchImpl = jest.fn(async (url, options = {}) => jsonResponse(201, {
      success: true,
      received: { url, options }
    }));
    const client = loadClient(fetchImpl);

    await client.addColor('kit 1', { name: 'Primary', value: '#112233', role: 'primary' });

    expect(fetchImpl).toHaveBeenCalledWith(
      expect.stringContaining('/api/brand-kits/kit%201/colors'),
      expect.objectContaining({
        method: 'POST',
        credentials: 'include',
        cache: 'no-store',
        headers: expect.objectContaining({
          Authorization: 'Bearer access-token',
          'Content-Type': 'application/json'
        }),
        body: JSON.stringify({ name: 'Primary', value: '#112233', role: 'primary' })
      })
    );
  });

  test('normalizes known font families to the editor select values', async () => {
    const fetchImpl = jest.fn(async () => jsonResponse(201, { success: true }));
    const client = loadClient(fetchImpl);

    await client.addFont('kit-1', { name: 'Heading', family: 'Cairo, sans-serif', role: 'heading' });

    expect(client.normalizeEditorFontFamily('Tajawal, sans-serif')).toBe("'Tajawal', sans-serif");
    expect(client.normalizeEditorFontFamily("'Poppins', sans-serif")).toBe("'Poppins', sans-serif");
    expect(fetchImpl).toHaveBeenCalledWith(
      expect.stringContaining('/api/brand-kits/kit-1/fonts'),
      expect.objectContaining({
        body: JSON.stringify({ name: 'Heading', family: "'Cairo', sans-serif", role: 'heading' })
      })
    );
  });

  test('surfaces API errors with their status and payload', async () => {
    const client = loadClient(jest.fn(async () => jsonResponse(403, { error: 'Insufficient permission' })));

    await expect(client.remove('kit-1')).rejects.toMatchObject({
      message: 'Insufficient permission',
      status: 403,
      payload: { error: 'Insufficient permission' }
    });
  });

  test('turns primary form controls into reliable submit actions', () => {
    loadClient(jest.fn());
    document.body.innerHTML = `
      <div class="brand-kit-workspace">
        <form id="brand-form">
          <button type="button" class="brand-kit-primary">Save</button>
        </form>
      </div>`;
    const form = document.getElementById('brand-form');
    const submitted = jest.fn(event => event.preventDefault());
    form.addEventListener('submit', submitted);

    form.querySelector('button').click();

    expect(submitted).toHaveBeenCalledTimes(1);
  });

  test('does not hijack explicit Brand Kit action buttons', () => {
    loadClient(jest.fn());
    document.body.innerHTML = `
      <div class="brand-kit-modal">
        <form id="brand-form">
          <button type="button" class="brand-kit-primary" data-brand-editor-action="apply-all">Apply</button>
        </form>
      </div>`;
    const form = document.getElementById('brand-form');
    const submitted = jest.fn(event => event.preventDefault());
    form.addEventListener('submit', submitted);

    form.querySelector('button').click();

    expect(submitted).not.toHaveBeenCalled();
  });
});
