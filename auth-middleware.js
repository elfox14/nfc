// auth-middleware.js
const jwt = require('jsonwebtoken');

const verifyToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer <token>

    if (!token) {
        return res.status(401).json({ error: 'Access denied. No token provided.' });
    }

    // لا نستخدم قيمة افتراضية هنا — نطلب وجود متغير البيئة
    const secret = process.env.JWT_SECRET;
    if (!secret) {
        console.error('JWT_SECRET is not set. This is a server configuration error.');
        return res.status(500).json({ error: 'Server misconfiguration: JWT secret not set.' });
    }

    try {
        const decoded = jwt.verify(token, secret);
        req.user = decoded; // { userId: "...", email: "..." }
        next();
    } catch (err) {
        if (err.name === 'TokenExpiredError') {
            return res.status(401).json({ error: 'Token expired.' });
        }
        return res.status(403).json({ error: 'Invalid token.' });
    }
};

module.exports = verifyToken;