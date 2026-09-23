const jwt = require('jsonwebtoken');

function normalizeSessionVersion(value) {
    return Number.isSafeInteger(value) && value >= 0 ? value : 0;
}

function createVerifyToken({ getDb, usersCollectionName = 'users' } = {}) {
    return async function verifyToken(req, res, next) {
        const authHeader = req.headers['authorization'];
        let token = authHeader && authHeader.split(' ')[1];

        if (!token && req.cookies && req.cookies.accessToken) {
            token = req.cookies.accessToken;
        }

        if (!token) {
            console.warn('[AuthMiddleware] No token provided');
            return res.status(401).json({ error: 'Access denied. No token provided.' });
        }

        let decoded;
        try {
            const secret = process.env.JWT_SECRET;
            if (!secret) {
                console.error('[AuthMiddleware] JWT_SECRET is missing in config');
                return res.status(500).json({ error: 'Server misconfiguration' });
            }

            decoded = jwt.verify(token, secret, { algorithms: ['HS256'] });
        } catch (err) {
            console.warn(`[AuthMiddleware] Token verification failed: ${err.message}`);
            return res.status(403).json({ error: 'Invalid token.' });
        }

        if (decoded.type !== 'access' || !decoded.userId) {
            console.warn(`[AuthMiddleware] Invalid token type or subject: ${decoded.type}`);
            return res.status(403).json({ error: 'Invalid token type.' });
        }

        // Production routers configure DB-backed session validation. Keeping the
        // unconfigured fallback preserves isolated middleware unit tests only.
        if (typeof getDb === 'function') {
            try {
                const db = getDb();
                if (!db) return res.status(503).json({ error: 'Authentication service unavailable' });

                const user = await db.collection(usersCollectionName).findOne(
                    { userId: decoded.userId },
                    { projection: { userId: 1, email: 1, sessionVersion: 1, _id: 0 } }
                );

                if (!user) {
                    return res.status(401).json({ error: 'Session is no longer valid.' });
                }

                const tokenVersion = normalizeSessionVersion(decoded.sessionVersion);
                const currentVersion = normalizeSessionVersion(user.sessionVersion);
                if (tokenVersion !== currentVersion) {
                    return res.status(401).json({ error: 'Session has been revoked.' });
                }

                req.authUser = user;
            } catch (err) {
                console.error('[AuthMiddleware] Session validation failed:', err.message);
                return res.status(503).json({ error: 'Authentication service unavailable' });
            }
        }

        req.user = decoded;
        return next();
    };
}

const verifyToken = createVerifyToken();

module.exports = verifyToken;
module.exports.createVerifyToken = createVerifyToken;
module.exports.normalizeSessionVersion = normalizeSessionVersion;
