/**
 * @jest-environment node
 */
const fs = require('fs');
const path = require('path');
const vm = require('vm');

function createStorage(initial = {}) {
  const values = new Map(Object.entries(initial));
  return {
    getItem: key => values.has(key) ? values.get(key) : null,
    setItem: (key, value) => values.set(key, String(value)),
    removeItem: key => values.delete(key)
  };
}

function jsonResponse(body, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
    clone: () => jsonResponse(body, status)
  };
}

function authFetch(responseBody) {
  return jest.fn().mockImplementation(url => Promise.resolve(
    url.endsWith('/api/csrf-token')
      ? jsonResponse({ csrfToken: 'csrf-token' })
      : jsonResponse(responseBody)
  ));
}

function loadAuth(fetchImpl) {
  const source = fs.readFileSync(path.join(__dirname, '..', 'auth.js'), 'utf8');
  const localStorage = createStorage();
  const sessionStorage = createStorage();
  const document = { addEventListener: () => {}, documentElement: { lang: 'ar' } };
  const window = {
    location: { origin: 'https://mcprim.com', hostname: 'mcprim.com', pathname: '/nfc/dashboard.html', search: '' },
    __API_BASE_URL: 'https://nfc-vjy6.onrender.com',
    innerWidth: 1280
  };
  const context = vm.createContext({
    window, document, navigator: { userAgent: 'Desktop Browser' },
    localStorage, sessionStorage, fetch: fetchImpl, console,
    setTimeout, clearTimeout, setInterval, clearInterval, URL, URLSearchParams
  });
  vm.runInContext(`${source}\n;globalThis.__authUnderTest = Auth;`, context);
  return { auth: context.__authUnderTest, localStorage, sessionStorage };
}

describe('Cross-origin auth fallback', () => {
  it('stores the short-lived access token only for the current tab', async () => {
    const fetchImpl = authFetch({
      success: true,
      accessToken: 'short-lived-access-token',
      user: { userId: 'u1', email: 'user@example.com', name: 'User' }
    });
    const { auth, localStorage, sessionStorage } = loadAuth(fetchImpl);

    await expect(auth.sessionInit('one-time-init-token')).resolves.toBe(true);
    expect(sessionStorage.getItem('authAccessToken')).toBe('short-lived-access-token');
    expect(localStorage.getItem('authToken')).toBeNull();
    expect(auth.getHeader()).toEqual({ Authorization: 'Bearer short-lived-access-token' });
  });

  it('deduplicates concurrent refreshes so token rotation cannot race itself', async () => {
    const fetchImpl = authFetch({
      success: true,
      accessToken: 'rotated-access-token',
      user: { userId: 'u1', email: 'user@example.com', name: 'User' }
    });
    const { auth } = loadAuth(fetchImpl);

    await expect(Promise.all([
      auth.refreshSession(), auth.refreshSession(), auth.refreshSession()
    ])).resolves.toEqual([true, true, true]);
    expect(fetchImpl).toHaveBeenCalledTimes(2);
    expect(auth.getHeader()).toEqual({ Authorization: 'Bearer rotated-access-token' });
  });

  it('adds a CSRF header to unsafe requests and reuses the fetched token', async () => {
    const fetchImpl = jest.fn()
      .mockResolvedValueOnce(jsonResponse({ csrfToken: 'csrf-token' }))
      .mockResolvedValue(jsonResponse({ success: true }));
    const { auth } = loadAuth(fetchImpl);

    await auth.csrfFetch('https://nfc-vjy6.onrender.com/api/one', { method: 'POST' });
    await auth.csrfFetch('https://nfc-vjy6.onrender.com/api/two', { method: 'PATCH' });

    expect(fetchImpl).toHaveBeenCalledTimes(3);
    expect(fetchImpl.mock.calls[1][1].headers['X-CSRF-Token']).toBe('csrf-token');
    expect(fetchImpl.mock.calls[2][1].headers['X-CSRF-Token']).toBe('csrf-token');
  });

  it('refreshes the CSRF token once when the server rejects an expired token', async () => {
    const fetchImpl = jest.fn()
      .mockResolvedValueOnce(jsonResponse({ csrfToken: 'old-token' }))
      .mockResolvedValueOnce(jsonResponse({ code: 'INVALID_CSRF_TOKEN' }, 403))
      .mockResolvedValueOnce(jsonResponse({ csrfToken: 'new-token' }))
      .mockResolvedValueOnce(jsonResponse({ success: true }));
    const { auth } = loadAuth(fetchImpl);

    const response = await auth.csrfFetch('https://nfc-vjy6.onrender.com/api/mutate', { method: 'DELETE' });

    expect(response.ok).toBe(true);
    expect(fetchImpl).toHaveBeenCalledTimes(4);
    expect(fetchImpl.mock.calls[3][1].headers['X-CSRF-Token']).toBe('new-token');
  });

  it.each([
    'https://evil.example/api/auth/logout',
    'https://nfc-vjy6.onrender.com/api/user/../auth/account',
    'https://nfc-vjy6.onrender.com/not-api/auth/logout'
  ])('rejects untrusted or endpoint-confusing API URLs: %s', async (url) => {
    const fetchImpl = jest.fn();
    const { auth } = loadAuth(fetchImpl);

    await expect(auth.csrfFetch(url, { method: 'POST' })).rejects.toThrow(
      'Refusing to send credentials to an untrusted API URL'
    );
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it('rebuilds trusted API query parameters through URI encoding', () => {
    const { auth } = loadAuth(jest.fn());

    expect(auth.getTrustedApiUrl(
      'https://nfc-vjy6.onrender.com/api/gallery?search=launch card&sortBy=createdAt'
    )).toBe(
      'https://nfc-vjy6.onrender.com/api/gallery?search=launch%20card&sortBy=createdAt'
    );
  });

  it('clears the tab-scoped bearer token with the session', () => {
    const { auth, sessionStorage } = loadAuth(jest.fn());
    auth.setSession('temporary-access-token', { userId: 'u1' });
    auth.clearSession();
    expect(sessionStorage.getItem('authAccessToken')).toBeNull();
    expect(auth.getHeader()).toEqual({});
  });
});
