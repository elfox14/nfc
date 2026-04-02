const jwt = require('jsonwebtoken');

const verifyToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer <token>

    if (!token) {
        return res.status(401).json({ error: 'Access denied. No token provided.' });
    }

    try {
        const secret = process.env.JWT_SECRET || 'default_jwt_secret_change_me';
        const decoded = jwt.verify(token, secret);
        req.user = decoded; // { userId: "...", email: "..." }
        next();
    } catch (err) {
        return res.status(403).json({ error: 'Invalid token.' });
    }
};

module.exports = verifyToken;
