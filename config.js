// config.js (مثال تكميلي — ادمجه مع باقي config لديكم)
const { cleanEnv, str, port, url, bool } = require('envalid');

const env = cleanEnv(process.env, {
  NODE_ENV: str({ choices: ['development','production','test'], default: 'development' }),
  PORT: port({ default: 3000 }),
  MONGO_URI: str(),
  MONGO_DB: str({ default: 'nfc_db' }),

  // Security
  JWT_SECRET: str(),

  // Google OAuth (اضفنا validators هنا)
  GOOGLE_CLIENT_ID: str(),
  GOOGLE_CLIENT_SECRET: str(),

  // Base URLs
  PUBLIC_BASE_URL: url(),

  // Cloudinary (إن مستخدمة)
  CLOUDINARY_CLOUD_NAME: str({ default: '' }),
  CLOUDINARY_API_KEY: str({ default: '' }),
  CLOUDINARY_API_SECRET: str({ default: '' }),

  TRUST_PROXY: bool({ default: false }),
  ALLOWED_ORIGINS: str({ default: '' }),

  // Sentry (اختياري)
  SENTRY_DSN: str({ default: '' })
});

module.exports = env;
