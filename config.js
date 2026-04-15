// config.js
const { cleanEnv, str, port, url, bool } = require('envalid');

const env = cleanEnv(process.env, {
    NODE_ENV: str({ choices: ['development', 'production', 'test'], default: 'development' }),
    PORT: port({ default: 3000 }),
    MONGO_URI: str(),
    MONGO_DB: str({ default: 'nfc_db' }),
    MONGO_DESIGNS_COLL: str({ default: 'designs' }),
    MONGO_BACKGROUNDS_COLL: str({ default: 'backgrounds' }),
    MONGO_TEMPLATES_COLL: str({ default: 'templates' }),
    JWT_SECRET: str(),
    CLOUDINARY_CLOUD_NAME: str({ default: '' }),
    CLOUDINARY_API_KEY: str({ default: '' }),
    CLOUDINARY_API_SECRET: str({ default: '' }),
    PUBLIC_BASE_URL: url(),
    SITE_BASE_URL: str({ default: '' }), // Changed to str to permit empty/missing cleanly
    EMAIL_PROVIDER: str({ default: 'sendgrid' }),
    EMAIL_API_KEY: str({ default: '' }),
    EMAIL_FROM_ADDRESS: str({ default: 'noreply@mcprim.com' }),
    EMAIL_FROM_NAME: str({ default: 'MC PRIME NFC' }),
    ALLOWED_ORIGINS: str({ default: '' }),
    EXTERNAL_UPLOAD_URL: str({ default: '' }),
    UPLOAD_SECRET: str({ default: '' }),
    TRUST_PROXY: str({ default: 'false' }),

    // Google OAuth
    GOOGLE_CLIENT_ID: str({ default: '' }),
    GOOGLE_CLIENT_SECRET: str({ default: '' }),

    // External Services (Optional)
    SENTRY_DSN: str({ default: '' }),
    REDIS_URL: str({ default: '' })
});

module.exports = env;
