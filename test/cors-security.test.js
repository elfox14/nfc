const { isAllowedOrigin } = require('../utils/cors-config');

describe('CORS origin security', () => {
  const originalNodeEnv = process.env.NODE_ENV;

  afterEach(() => {
    process.env.NODE_ENV = originalNodeEnv;
  });

  it('allows an explicitly configured production origin', () => {
    process.env.NODE_ENV = 'production';

    expect(isAllowedOrigin('https://www.mcprim.com', [
      'https://www.mcprim.com',
      'https://mcprim.com'
    ])).toBe(true);
  });

  it('accepts a trailing slash in configured origins', () => {
    process.env.NODE_ENV = 'production';

    expect(isAllowedOrigin('https://www.mcprim.com', [
      'https://www.mcprim.com/'
    ])).toBe(true);
  });

  it('rejects unrelated Render services in production', () => {
    process.env.NODE_ENV = 'production';

    expect(isAllowedOrigin('https://attacker.onrender.com', [
      'https://nfc-api.onrender.com'
    ])).toBe(false);
    expect(isAllowedOrigin('https://attacker.render.com', [
      'https://nfc-api.onrender.com'
    ])).toBe(false);
  });

  it('still permits localhost during development', () => {
    process.env.NODE_ENV = 'development';

    expect(isAllowedOrigin('http://localhost:3000', [])).toBe(true);
    expect(isAllowedOrigin('http://127.0.0.1:3000', [])).toBe(true);
  });

  it('does not permit localhost in production', () => {
    process.env.NODE_ENV = 'production';

    expect(isAllowedOrigin('http://localhost:3000', [])).toBe(false);
  });
});
