// config.js — Configuration without external dependencies
// Reads and validates environment variables directly from process.env

const env = {
    NODE_ENV: process.env.NODE_ENV || 'development',
    PORT: parseInt(process.env.PORT, 10) || 3000,
    MONGO_URI: process.env.MONGO_URI,
    MONGO_DB: process.env.MONGO_DB || 'nfc_db',
    MONGO_DESIGNS_COLL: process.env.MONGO_DESIGNS_COLL || 'designs',
    MONGO_BACKGROUNDS_COLL: process.env.MONGO_BACKGROUNDS_COLL || 'backgrounds',
    MONGO_TEMPLATES_COLL: process.env.MONGO_TEMPLATES_COLL || 'templates',
    JWT_SECRET: process.env.JWT_SECRET,
    CLOUDINARY_CLOUD_NAME: process.env.CLOUDINARY_CLOUD_NAME || '',
    CLOUDINARY_API_KEY: process.env.CLOUDINARY_API_KEY || '',
    CLOUDINARY_API_SECRET: process.env.CLOUDINARY_API_SECRET || '',
    PUBLIC_BASE_URL: process.env.PUBLIC_BASE_URL || '',
    SITE_BASE_URL: process.env.SITE_BASE_URL || '',
    EMAIL_PROVIDER: process.env.EMAIL_PROVIDER || 'console',
    EMAIL_API_KEY: process.env.EMAIL_API_KEY || '',
    EMAIL_FROM_ADDRESS: process.env.EMAIL_FROM_ADDRESS || 'noreply@mcprim.com',
    EMAIL_FROM_NAME: process.env.EMAIL_FROM_NAME || 'MC PRIME NFC',
    ALLOWED_ORIGINS: process.env.ALLOWED_ORIGINS || '',
    EXTERNAL_UPLOAD_URL: process.env.EXTERNAL_UPLOAD_URL || '',
    UPLOAD_SECRET: process.env.UPLOAD_SECRET || '',
    TRUST_PROXY: process.env.TRUST_PROXY || 'false',

    // Google OAuth
    GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID || '',
    GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET || '',

    // External Services (Optional)
    SENTRY_DSN: process.env.SENTRY_DSN || '',
    REDIS_URL: process.env.REDIS_URL || ''
};

// Fail-fast for required variables
if (!env.MONGO_URI) {
    throw new Error('FATAL: MONGO_URI environment variable is required');
}
if (!env.JWT_SECRET) {
    throw new Error('FATAL: JWT_SECRET environment variable is required');
}

module.exports = env;
