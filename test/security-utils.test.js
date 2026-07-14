const assertEnv = require('../utils/env-validation');
const { redactSensitiveData, redactSensitiveValue } = require('../utils/error-tracking');

describe('Sensitive data redaction', () => {
  it('redacts emails, JWTs, query tokens, and long secrets', () => {
    const value = 'user@example.com token=abc123 secret=abcdefabcdefabcdefabcdefabcdefabcdefabcdefabcdef jwt eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxIn0.signature';

    expect(redactSensitiveValue(value)).not.toContain('user@example.com');
    expect(redactSensitiveValue(value)).not.toContain('abc123');
    expect(redactSensitiveValue(value)).not.toContain('abcdefabcdef');
    expect(redactSensitiveValue(value)).not.toContain('eyJhbGciOiJIUzI1NiJ9');
  });

  it('redacts sensitive object keys recursively', () => {
    expect(redactSensitiveData({ email: 'user@example.com', nested: { accessToken: 'secret' } })).toEqual({
      email: '[redacted]',
      nested: { accessToken: '[redacted]' }
    });
  });
});

describe('Production environment validation', () => {
  const originalEnv = { ...process.env };

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it('requires hashed admin token and real email provider in production', () => {
    process.env.NODE_ENV = 'production';
    process.env.MONGO_URI = 'mongodb://example';
    process.env.JWT_SECRET = 'a'.repeat(32);
    process.env.TOKEN_HASH_SECRET = 'b'.repeat(32);
    process.env.ALLOWED_ORIGINS = 'https://www.mcprim.com';
    delete process.env.ADMIN_TOKEN_SHA256;
    process.env.EMAIL_PROVIDER = 'console';

    expect(() => assertEnv()).toThrow('ADMIN_TOKEN_SHA256');
  });
});
