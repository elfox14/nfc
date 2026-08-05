process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = process.env.JWT_SECRET || 'test_secret_value_for_jest';
process.env.TOKEN_HASH_SECRET = process.env.TOKEN_HASH_SECRET || 'test_hash_secret_value_for_jest';
process.env.MONGO_URI = process.env.MONGO_URI || 'mongodb://fake-uri';
process.env.PUBLIC_BASE_URL = process.env.PUBLIC_BASE_URL || 'http://localhost:3000';

// Keep tests isolated from local .env credentials and third-party services.
process.env.EMAIL_PROVIDER = 'console';
process.env.EMAIL_API_KEY = '';
process.env.CLOUDINARY_CLOUD_NAME = '';
process.env.CLOUDINARY_API_KEY = '';
process.env.CLOUDINARY_API_SECRET = '';
process.env.EXTERNAL_UPLOAD_URL = '';
