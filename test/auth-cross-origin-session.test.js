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
    const fetchImpl = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        success: true,
        accessToken: 'short-lived-access-token',
        user: { userId: 'u1', email: 'user@example.com', name: 'User' }
      })
    });
    const { auth, localStorage, sessionStorage } = loadAuth(fetchImpl);

    await expect(auth.sessionInit('one-time-init-token')).resolves.toBe(true);
    expect(sessionStorage.getItem('authAccessToken')).toBe('short-lived-access-token');
    expect(localStorage.getItem('authToken')).toBeNull();
    expect(auth.getHeader()).toEqual({ Authorization: 'Bearer short-lived-access-token' });
  });

  it('deduplicates concurrent refreshes so token rotation cannot race itself', async () => {
    const fetchImpl = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        success: true,
        accessToken: 'rotated-access-token',
        user: { userId: 'u1', email: 'user@example.com', name: 'User' }
      })
    });
    const { auth } = loadAuth(fetchImpl);

    await expect(Promise.all([
      auth.refreshSession(), auth.refreshSession(), auth.refreshSession()
    ])).resolves.toEqual([true, true, true]);
    expect(fetchImpl).toHaveBeenCalledTimes(1);
    expect(auth.getHeader()).toEqual({ Authorization: 'Bearer rotated-access-token' });
  });

  it('clears the tab-scoped bearer token with the session', () => {
    const { auth, sessionStorage } = loadAuth(jest.fn());
    auth.setSession('temporary-access-token', { userId: 'u1' });
    auth.clearSession();
    expect(sessionStorage.getItem('authAccessToken')).toBeNull();
    expect(auth.getHeader()).toEqual({});
  });
});
