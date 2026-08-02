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

  if (process.env.ADMIN_TOKENH) {
    throw new Error('Use ADMIN_TOKEN_SHA256 instead of ADMIN_TOKENH in production.');
  }

  if (!process.env.ADMIN_TOKEN_SHA256) {
    throw new Error('ADMIN_TOKEN_SHA256 must be configured in production.');
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

  const hasCloudinary = [
    'CLOUDINARY_CLOUD_NAME',
    'CLOUDINARY_API_KEY',
    'CLOUDINARY_API_SECRET'
  ].every(name => Boolean(process.env[name]));
  const hasExternalUpload = Boolean(
    process.env.EXTERNAL_UPLOAD_URL && process.env.UPLOAD_SECRET
  );
  if (!hasCloudinary && !hasExternalUpload) {
    throw new Error(
      'Production image storage must configure Cloudinary or EXTERNAL_UPLOAD_URL and UPLOAD_SECRET.'
    );
  }

  const googleOAuthValues = [process.env.GOOGLE_CLIENT_ID, process.env.GOOGLE_CLIENT_SECRET];
  if (googleOAuthValues.some(Boolean) && !googleOAuthValues.every(Boolean)) {
    throw new Error('GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET must be configured together.');
  }
}

module.exports = assertEnv;
