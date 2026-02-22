// config.js
const { cleanEnv, str, port, url, bool } = require('envalid');

const env = cleanEnv(process.env, {
    NODE_ENV: str({ choices: ['development', 'production', 'test'], default: 'development' }),
    PORT: port({ default: 3000 }),
    MONGO_URI: str(),
    MONGO_DB: str({ default: 'nfc_db' }),
    MONGO_DESIGNS_COLL: str({ default: 'designs' }),
    MONGO_BACKGROUNDS_COLL: str({ default: 'backgrounds' }),
    JWT_SECRET: str(),
    CLOUDINARY_CLOUD_NAME: str({ default: '' }), // Optional per README but kept for structure
    CLOUDINARY_API_KEY: str({ default: '' }),
    CLOUDINARY_API_SECRET: str({ default: '' }),
    PUBLIC_BASE_URL: url(),
    SITE_BASE_URL: url({ default: '' }), // Sometimes used in server.js instead of PUBLIC_BASE_URL
    EMAIL_PROVIDER: str({ default: 'sendgrid' }),
    EMAIL_API_KEY: str({ default: '' }),
    EMAIL_FROM_ADDRESS: str({ default: 'noreply@mcprim.com' }),
    EMAIL_FROM_NAME: str({ default: 'MC PRIME NFC' }),
    ALLOWED_ORIGINS: str({ default: '' }),
    EXTERNAL_UPLOAD_URL: str({ default: '' }),
    UPLOAD_SECRET: str({ default: '' }),
    TRUST_PROXY: str({ default: 'false' })
});

module.exports = env;
