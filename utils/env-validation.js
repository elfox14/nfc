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
  const required = ['MONGO_URI', 'JWT_SECRET', 'TOKEN_HASH_SECRET'];
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
    if (!process.env.ADMIN_TOKEN_SHA256) {
      throw new Error('Use ADMIN_TOKEN_SHA256 instead of ADMIN_TOKENH in production.');
    }
    console.warn(
      '[Security Warning] ADMIN_TOKENH is set in environment. ' +
      'Removing plaintext token from memory and using ADMIN_TOKEN_SHA256.'
    );
    delete process.env.ADMIN_TOKENH;
  }

  if (process.env.ADMIN_PASSWORD || process.env.ADMIN_TOKEN) {
    console.warn(
      '[Security Warning] Plaintext admin credentials (ADMIN_PASSWORD/ADMIN_TOKEN) found in production. ' +
      'Removing from memory; only ADMIN_TOKEN_SHA256 is permitted.'
    );
    delete process.env.ADMIN_PASSWORD;
    delete process.env.ADMIN_TOKEN;
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
    // Warn but don't crash — email features will be disabled until EMAIL_API_KEY is set
    console.warn(
      '[Warning] EMAIL_API_KEY is not configured. Password reset and email notifications will not work. ' +
      'Set EMAIL_API_KEY in Render Dashboard to enable email features.'
    );
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

  if (googleOAuthValues.every(Boolean)) {
    const explicitRedirect = (process.env.GOOGLE_REDIRECT_URI || '').trim();
    const renderHostname = (process.env.RENDER_EXTERNAL_HOSTNAME || '').trim();
    const redirectCandidate = explicitRedirect ||
      (renderHostname ? `https://${renderHostname}/api/auth/google/callback` : '');

    if (!redirectCandidate) {
      throw new Error(
        'Google OAuth requires GOOGLE_REDIRECT_URI or RENDER_EXTERNAL_HOSTNAME in production.'
      );
    }

    let parsedRedirect;
    try {
      parsedRedirect = new URL(redirectCandidate);
    } catch {
      throw new Error('Google OAuth requires a valid SITE_BASE_URL or GOOGLE_REDIRECT_URI.');
    }

    if (
      parsedRedirect.protocol !== 'https:' ||
      parsedRedirect.username ||
      parsedRedirect.password ||
      parsedRedirect.hash ||
      parsedRedirect.search ||
      parsedRedirect.pathname !== '/api/auth/google/callback'
    ) {
      throw new Error('Google OAuth redirect URI must be an HTTPS /api/auth/google/callback URL.');
    }
  }
}

module.exports = assertEnv;
