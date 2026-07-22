/**
 * @jest-environment node
 */
const fs = require('fs');
const path = require('path');
const vm = require('vm');

function loadAuthRuntime({ origin = 'https://nfc-new.onrender.com', configuredBase } = {}) {
  const source = fs.readFileSync(path.join(__dirname, '..', 'auth.js'), 'utf8');
  const localStorage = {
    getItem: () => null,
    setItem: () => {},
    removeItem: () => {}
  };
  const window = {
    location: { origin, pathname: '/nfc/login' },
    __API_BASE_URL: configuredBase,
    innerWidth: 1280,
    open: () => null
  };
  const document = {
    addEventListener: () => {},
    documentElement: { lang: 'en' }
  };
  const context = vm.createContext({
    window,
    document,
    navigator: { userAgent: 'Desktop Browser' },
    localStorage,
    console,
    setTimeout,
    clearTimeout,
    setInterval,
    clearInterval,
    URL,
    URLSearchParams
  });

  vm.runInContext(`${source}\n;globalThis.__authUnderTest = Auth;`, context);
  return { auth: context.__authUnderTest, window };
}

function loadAuth(options) {
  return loadAuthRuntime(options).auth;
}

describe('Auth API base URL', () => {
  it('uses the current deployment origin by default', () => {
    const auth = loadAuth();

    expect(auth.getBaseUrl()).toBe('https://nfc-new.onrender.com');
    expect(auth.API_LOGIN).toBe('https://nfc-new.onrender.com/api/auth/login');
  });

  it('supports an explicit runtime override and removes trailing slashes', () => {
    const auth = loadAuth({ configuredBase: 'https://api.example.com///' });

    expect(auth.getBaseUrl()).toBe('https://api.example.com');
  });

  it('does not retain the retired Render hostname in active client assets', () => {
    const activeAssets = [
      'auth.js',
      'script-core.js',
      'viewer.js',
      'admin.html',
      'gallery.html',
      'gallery-en.html',
      'view/viewer.js'
    ];

    for (const asset of activeAssets) {
      const contents = fs.readFileSync(path.join(__dirname, '..', asset), 'utf8');
      expect(contents).not.toContain('nfc-vjy6.onrender.com');
    }
  });

  it('uses a full-page Google redirect when the API is cross-origin', () => {
    const { auth, window } = loadAuthRuntime({
      origin: 'https://www.mcprim.com',
      configuredBase: 'https://nfc-api.onrender.com'
    });

    auth.googleSignIn();

    expect(window.location.href).toBe('https://nfc-api.onrender.com/api/auth/google?lang=en');
  });
});
