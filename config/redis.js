// config/redis.js
/**
 * Redis Configuration and Helper Functions
 * إعدادات Redis والدوال المساعدة للتخزين المؤقت
 */

const redis = require('redis');

let redisClient = null;
let isRedisAvailable = false;

/**
 * إنشاء اتصال Redis
 * @returns {Promise<Object>} Redis client
 */
async function createRedisClient() {
    const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';

    try {
        const client = redis.createClient({
            url: redisUrl,
            socket: {
                reconnectStrategy: (retries) => {
                    if (retries > 3) {
                        console.warn('⚠️ Redis reconnection failed after 3 attempts. Continuing without cache.');
                        return false; // Stop reconnecting
                    }
                    return retries * 1000; // Wait 1s, 2s, 3s
                }
            }
        });

        // Event listeners
        client.on('error', (err) => {
            console.error('Redis Client Error:', err.message);
            isRedisAvailable = false;
        });

        client.on('connect', () => {
            console.log('🔴 Redis connecting...');
        });

        client.on('ready', () => {
            console.log('✅ Redis connected and ready');
            isRedisAvailable = true;
        });

        client.on('end', () => {
            console.log('🔴 Redis connection closed');
            isRedisAvailable = false;
        });

        await client.connect();
        redisClient = client;
        return client;

    } catch (error) {
        console.error('❌ Failed to connect to Redis:', error.message);
        console.warn('⚠️ Running without Redis cache. Performance may be affected.');
        isRedisAvailable = false;
        return null;
    }
}

/**
 * الحصول على Redis client
 * @returns {Object|null} Redis client or null
 */
function getRedisClient() {
    return redisClient;
}

/**
 * التحقق من توفر Redis
 * @returns {boolean}
 */
function isRedisReady() {
    return isRedisAvailable && redisClient && redisClient.isReady;
}

/**
 * حفظ قيمة في الـ cache
 * @param {string} key - المفتاح
 * @param {*} value - القيمة (سيتم تحويلها لـ JSON)
 * @param {number} ttl - مدة البقاء بالثواني (default: 3600 = 1 hour)
 * @returns {Promise<boolean>} نجحت العملية؟
 */
async function setCache(key, value, ttl = 3600) {
    if (!isRedisReady()) {
        return false;
    }

    try {
        const serialized = JSON.stringify(value);
        await redisClient.setEx(key, ttl, serialized);
        return true;
    } catch (error) {
        console.error(`Error setting cache for key "${key}":`, error.message);
        return false;
    }
}

/**
 * استرجاع قيمة من الـ cache
 * @param {string} key - المفتاح
 * @returns {Promise<*|null>} القيمة أو null
 */
async function getCache(key) {
    if (!isRedisReady()) {
        return null;
    }

    try {
        const value = await redisClient.get(key);
        if (!value) return null;
        return JSON.parse(value);
    } catch (error) {
        console.error(`Error getting cache for key "${key}":`, error.message);
        return null;
    }
}

/**
 * حذف قيمة من الـ cache
 * @param {string} key - المفتاح
 * @returns {Promise<boolean>}
 */
async function deleteCache(key) {
    if (!isRedisReady()) {
        return false;
    }

    try {
        await redisClient.del(key);
        return true;
    } catch (error) {
        console.error(`Error deleting cache for key "${key}":`, error.message);
        return false;
    }
}

/**
 * حذف عدة مفاتيح بنمط معين
 * @param {string} pattern - النمط (مثل: 'design:*')
 * @returns {Promise<number>} عدد المفاتيح المحذوفة
 */
async function deleteCachePattern(pattern) {
    if (!isRedisReady()) {
        return 0;
    }

    try {
        const keys = await redisClient.keys(pattern);
        if (keys.length === 0) return 0;

        await redisClient.del(keys);
        return keys.length;
    } catch (error) {
        console.error(`Error deleting cache pattern "${pattern}":`, error.message);
        return 0;
    }
}

/**
 * مسح جميع الـ cache
 * @returns {Promise<boolean>}
 */
async function flushCache() {
    if (!isRedisReady()) {
        return false;
    }

    try {
        await redisClient.flushDb();
        console.log('✅ Redis cache flushed');
        return true;
    } catch (error) {
        console.error('Error flushing cache:', error.message);
        return false;
    }
}

/**
 * Middleware للتخزين المؤقت
 * يقوم بحفظ response في cache تلقائياً
 * 
 * @param {number} ttl - مدة البقاء بالثواني
 * @param {Function} keyGenerator - دالة لتوليد المفتاح من req
 * @returns {Function} Express middleware
 * 
 * @example
 * app.get('/api/design/:id', cacheMiddleware(3600, (req) => `design:${req.params.id}`), handler)
 */
function cacheMiddleware(ttl = 3600, keyGenerator) {
    return async (req, res, next) => {
        // تخطي إذا Redis غير متاح
        if (!isRedisReady()) {
            return next();
        }

        try {
            const key = keyGenerator(req);

            // محاولة الحصول من الـ cache
            const cached = await getCache(key);
            if (cached) {
                console.log(`✅ Cache HIT for key: ${key}`);
                return res.json(cached);
            }

            console.log(`⚪ Cache MISS for key: ${key}`);

            // حفظ الـ response الأصلي
            const originalJson = res.json.bind(res);

            // Override res.json لحفظ في cache
            res.json = function (data) {
                setCache(key, data, ttl).catch(err => {
                    console.error('Error saving to cache:', err.message);
                });
                return originalJson(data);
            };

            next();
        } catch (error) {
            console.error('Cache middleware error:', error.message);
            next();
        }
    };
}

/**
 * إغلاق اتصال Redis
 */
async function closeRedis() {
    if (redisClient) {
        await redisClient.quit();
        console.log('🔴 Redis connection closed gracefully');
    }
}

module.exports = {
    createRedisClient,
    getRedisClient,
    isRedisReady,
    setCache,
    getCache,
    deleteCache,
    deleteCachePattern,
    flushCache,
    cacheMiddleware,
    closeRedis
};
