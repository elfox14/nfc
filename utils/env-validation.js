function isProduction() {
  return process.env.NODE_ENV === 'production';
}

function assertLongSecret(name, minLength = 32) {
  const value = process.env[name];
  if (!value || value.length < minLength) {
    throw new Error(`${name} must be set to at least ${minLength} characters.`);
  }
}

function assertEnv() {
  const required = ['MONGO_URI', 'JWT_SECRET'];
  const missing = required.filter(name => !process.env[name]);
  if (missing.length > 0) {
    throw new Error(`Missing required env vars: ${missing.join(', ')}`);
  }

  if (!isProduction()) return;

  assertLongSecret('JWT_SECRET', 32);
  assertLongSecret('TOKEN_HASH_SECRET', 32);

  if (process.env.JWT_SECRET === process.env.TOKEN_HASH_SECRET) {
    throw new Error('JWT_SECRET and TOKEN_HASH_SECRET must be different in production.');
  }

  if (!process.env.ALLOWED_ORIGINS) {
    throw new Error('ALLOWED_ORIGINS must be configured in production.');
  }

  if (!process.env.ADMIN_TOKEN_SHA256) {
    throw new Error('ADMIN_TOKEN_SHA256 must be configured in production.');
  }

  if (!process.env.ADMIN_TOKEN_SHA256 && process.env.ADMIN_TOKENH) {
    throw new Error('Use ADMIN_TOKEN_SHA256 instead of ADMIN_TOKENH in production.');
  }

  if (process.env.ADMIN_TOKEN_SHA256 && !/^[a-f0-9]{64}$/i.test(process.env.ADMIN_TOKEN_SHA256)) {
    throw new Error('ADMIN_TOKEN_SHA256 must be a valid SHA-256 hex digest.');
  }

  if ((process.env.EMAIL_PROVIDER || 'console') === 'console') {
    throw new Error('EMAIL_PROVIDER must not be "console" in production.');
  }

  if (!process.env.EMAIL_API_KEY) {
    throw new Error('EMAIL_API_KEY must be configured in production.');
  }
}

module.exports = assertEnv;
