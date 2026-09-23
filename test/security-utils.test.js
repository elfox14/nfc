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

  beforeEach(() => {
    delete process.env.GOOGLE_CLIENT_ID;
    delete process.env.GOOGLE_CLIENT_SECRET;
    delete process.env.GOOGLE_REDIRECT_URI;
    delete process.env.SITE_BASE_URL;
    delete process.env.RENDER_EXTERNAL_HOSTNAME;
    delete process.env.EXTERNAL_UPLOAD_URL;
    delete process.env.UPLOAD_SECRET;
  });

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

  it('requires durable image storage in production', () => {
    process.env.NODE_ENV = 'production';
    process.env.MONGO_URI = 'mongodb://example';
    process.env.JWT_SECRET = 'a'.repeat(32);
    process.env.TOKEN_HASH_SECRET = 'b'.repeat(32);
    process.env.ALLOWED_ORIGINS = 'https://www.mcprim.com';
    process.env.ADMIN_TOKEN_SHA256 = 'c'.repeat(64);
    process.env.EMAIL_PROVIDER = 'resend';
    process.env.EMAIL_API_KEY = 'email-key';
    delete process.env.CLOUDINARY_CLOUD_NAME;
    delete process.env.CLOUDINARY_API_KEY;
    delete process.env.CLOUDINARY_API_SECRET;
    delete process.env.EXTERNAL_UPLOAD_URL;
    delete process.env.UPLOAD_SECRET;

    expect(() => assertEnv()).toThrow('Production image storage');
  });

  it('purges a plaintext admin token from memory when hash is also configured', () => {
    process.env.NODE_ENV = 'production';
    process.env.MONGO_URI = 'mongodb://example';
    process.env.JWT_SECRET = 'a'.repeat(32);
    process.env.TOKEN_HASH_SECRET = 'b'.repeat(32);
    process.env.COOKIE_SIGNING_SECRET = 'd'.repeat(32);
    process.env.ALLOWED_ORIGINS = 'https://www.mcprim.com';
    process.env.ADMIN_TOKEN_SHA256 = 'c'.repeat(64);
    process.env.ADMIN_TOKENH = 'plaintext-admin-token';
    process.env.EMAIL_PROVIDER = 'sendgrid';
    process.env.EMAIL_API_KEY = 'key';
    process.env.CLOUDINARY_CLOUD_NAME = 'name';
    process.env.CLOUDINARY_API_KEY = 'key';
    process.env.CLOUDINARY_API_SECRET = 'secret';

    expect(() => assertEnv()).not.toThrow();
    expect(process.env.ADMIN_TOKENH).toBeUndefined();
  });

  it('rejects a plaintext admin token when hash is missing', () => {
    process.env.NODE_ENV = 'production';
    process.env.MONGO_URI = 'mongodb://example';
    process.env.JWT_SECRET = 'a'.repeat(32);
    process.env.TOKEN_HASH_SECRET = 'b'.repeat(32);
    process.env.COOKIE_SIGNING_SECRET = 'd'.repeat(32);
    process.env.ALLOWED_ORIGINS = 'https://www.mcprim.com';
    delete process.env.ADMIN_TOKEN_SHA256;
    process.env.ADMIN_TOKENH = 'plaintext-admin-token';

    expect(() => assertEnv()).toThrow('instead of ADMIN_TOKENH');
  });
  it('rejects unsafe external upload endpoints in production', () => {
    process.env.NODE_ENV = 'production';
    process.env.MONGO_URI = 'mongodb://example';
    process.env.JWT_SECRET = 'a'.repeat(32);
    process.env.TOKEN_HASH_SECRET = 'b'.repeat(32);
    process.env.ALLOWED_ORIGINS = 'https://www.mcprim.com';
    process.env.ADMIN_TOKEN_SHA256 = 'c'.repeat(64);
    process.env.EMAIL_PROVIDER = 'resend';
    process.env.EMAIL_API_KEY = 'email-key';
    delete process.env.CLOUDINARY_CLOUD_NAME;
    delete process.env.CLOUDINARY_API_KEY;
    delete process.env.CLOUDINARY_API_SECRET;
    process.env.UPLOAD_SECRET = 'upload-secret';

    process.env.EXTERNAL_UPLOAD_URL = 'http://uploads.example.com/upload';
    expect(() => assertEnv()).toThrow(/EXTERNAL_UPLOAD_URL.*HTTPS/i);

    process.env.EXTERNAL_UPLOAD_URL = 'https://127.0.0.1/upload';
    expect(() => assertEnv()).toThrow(/private|localhost|link-local/i);

    process.env.EXTERNAL_UPLOAD_URL = 'https://user:pass@uploads.example.com/upload';
    expect(() => assertEnv()).toThrow(/credentialed|HTTPS/i);

    process.env.EXTERNAL_UPLOAD_URL = 'https://uploads.example.com/upload';
    expect(() => assertEnv()).not.toThrow();
  });

  it('requires a canonical HTTPS OAuth callback when Google OAuth is enabled', () => {
    process.env.NODE_ENV = 'production';
    process.env.MONGO_URI = 'mongodb://example';
    process.env.JWT_SECRET = 'a'.repeat(32);
    process.env.TOKEN_HASH_SECRET = 'b'.repeat(32);
    process.env.ALLOWED_ORIGINS = 'https://www.mcprim.com';
    process.env.ADMIN_TOKEN_SHA256 = 'c'.repeat(64);
    process.env.EMAIL_PROVIDER = 'resend';
    process.env.EMAIL_API_KEY = 'email-key';
    process.env.CLOUDINARY_CLOUD_NAME = 'cloud';
    process.env.CLOUDINARY_API_KEY = 'key';
    process.env.CLOUDINARY_API_SECRET = 'secret';
    process.env.GOOGLE_CLIENT_ID = 'client';
    process.env.GOOGLE_CLIENT_SECRET = 'client-secret';

    expect(() => assertEnv()).toThrow(/redirect|RENDER_EXTERNAL_HOSTNAME/i);

    process.env.RENDER_EXTERNAL_HOSTNAME = 'nfc-vjy6.onrender.com';
    expect(() => assertEnv()).not.toThrow();
    delete process.env.RENDER_EXTERNAL_HOSTNAME;

    process.env.GOOGLE_REDIRECT_URI = 'http://evil.example/api/auth/google/callback';
    expect(() => assertEnv()).toThrow(/HTTPS/i);

    process.env.GOOGLE_REDIRECT_URI = 'https://www.mcprim.com/api/auth/google/callback';
    expect(() => assertEnv()).not.toThrow();
  });

  it('accepts Cloudinary and rejects a half-configured Google OAuth client', () => {
    process.env.NODE_ENV = 'production';
    process.env.MONGO_URI = 'mongodb://example';
    process.env.JWT_SECRET = 'a'.repeat(32);
    process.env.TOKEN_HASH_SECRET = 'b'.repeat(32);
    process.env.ALLOWED_ORIGINS = 'https://www.mcprim.com';
    process.env.ADMIN_TOKEN_SHA256 = 'c'.repeat(64);
    process.env.EMAIL_PROVIDER = 'resend';
    process.env.EMAIL_API_KEY = 'email-key';
    process.env.CLOUDINARY_CLOUD_NAME = 'cloud';
    process.env.CLOUDINARY_API_KEY = 'key';
    process.env.CLOUDINARY_API_SECRET = 'secret';
    process.env.GOOGLE_CLIENT_ID = 'client';
    delete process.env.GOOGLE_CLIENT_SECRET;

    expect(() => assertEnv()).toThrow('must be configured together');

    process.env.GOOGLE_CLIENT_SECRET = 'client-secret';
    process.env.GOOGLE_REDIRECT_URI = 'https://nfc-vjy6.onrender.com/api/auth/google/callback';
    expect(() => assertEnv()).not.toThrow();
  });
});
