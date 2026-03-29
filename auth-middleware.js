const jwt = require('jsonwebtoken');
// FIX: نقل require خارج الدالة لتجنب إعادة التحميل في كل طلب
const config = require('./config');

const verifyToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer <token>

    if (!token) {
        return res.status(401).json({ error: 'Access denied. No token provided.' });
    }

    const secret = config.JWT_SECRET;
    if (!secret) {
        console.error('[Security] JWT_SECRET is not configured!');
        return res.status(500).json({ error: 'Server misconfiguration: JWT_SECRET not set.' });
    }

    try {
        const decoded = jwt.verify(token, secret);
        req.user = decoded; // { userId: "...", email: "..." }
        next();
    } catch (err) {
        console.error('[JWT Verification Error]', err.message);
        return res.status(403).json({ error: 'Invalid token.', details: err.message });
    }
};

module.exports = verifyToken;
