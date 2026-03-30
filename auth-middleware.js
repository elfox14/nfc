const jwt = require('jsonwebtoken');

let config;
try {
    config = require('./config');
} catch (e) {
    config = null;
}

const verifyToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer <token>

    if (!token) {
        return res.status(401).json({ error: 'Access denied. No token provided.' });
    }

    // Resolve JWT secret — never use a hardcoded fallback
    const secret = (config && config.JWT_SECRET) || process.env.JWT_SECRET;
    if (!secret) {
        console.error('[auth-middleware] JWT_SECRET is not configured');
        return res.status(500).json({ error: 'Server misconfiguration: JWT_SECRET not set' });
    }

    try {
        const decoded = jwt.verify(token, secret);
        req.user = decoded; // { userId: "...", email: "..." }
        next();
    } catch (err) {
        return res.status(403).json({ error: 'Invalid token.' });
    }
};

module.exports = verifyToken;
