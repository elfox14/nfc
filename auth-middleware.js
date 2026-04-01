const jwt = require('jsonwebtoken');

const verifyToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer <token>

    if (!token) {
        console.warn('[AuthMiddleware] No token provided in Authorization header');
        return res.status(401).json({ error: 'Access denied. No token provided.' });
    }

    try {
        const secret = process.env.JWT_SECRET;
        if (!secret) {
            console.error('[AuthMiddleware] JWT_SECRET is missing in environment variables');
            return res.status(500).json({ error: 'Server misconfiguration' });
        }
        
        const decoded = jwt.verify(token, secret);
        req.user = decoded; // { userId: "...", email: "..." }
        console.log(`[AuthMiddleware] Token verified for user: ${decoded.email} (${decoded.userId})`);
        next();
    } catch (err) {
        console.warn(`[AuthMiddleware] Token verification failed: ${err.message}`);
        return res.status(403).json({ error: 'Invalid token.' });
    }
};

module.exports = verifyToken;
