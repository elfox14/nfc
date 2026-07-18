'use strict';

const jwt = require('jsonwebtoken');

function tokenFromRequest(req) {
    const authHeader = req.headers?.authorization || req.headers?.['authorization'];
    const bearer = authHeader && String(authHeader).match(/^Bearer\s+(.+)$/i);
    if (bearer?.[1]) return bearer[1];
    if (req.cookies?.accessToken) return req.cookies.accessToken;
    return null;
}

function decodeRequestUser(req) {
    const token = tokenFromRequest(req);
    if (!token) return null;
    const secret = process.env.JWT_SECRET;
    if (!secret) throw new Error('JWT_SECRET is missing in config');
    const decoded = jwt.verify(token, secret);
    if (decoded.type !== 'access' || !decoded.userId) throw new Error('Invalid token type');
    return decoded;
}

const verifyToken = (req, res, next) => {
    try {
        const user = decodeRequestUser(req);
        if (!user) {
            console.warn('[AuthMiddleware] No token provided');
            return res.status(401).json({ error: 'Access denied. No token provided.' });
        }
        req.user = user;
        return next();
    } catch (err) {
        if (err.message === 'JWT_SECRET is missing in config') {
            console.error('[AuthMiddleware] JWT_SECRET is missing in config');
            return res.status(500).json({ error: 'Server misconfiguration' });
        }
        console.warn(`[AuthMiddleware] Token verification failed: ${err.message}`);
        return res.status(403).json({ error: 'Invalid token.' });
    }
};

verifyToken.optional = (req, res, next) => {
    try {
        req.user = decodeRequestUser(req);
    } catch (error) {
        req.user = null;
    }
    next();
};

verifyToken.decodeRequestUser = decodeRequestUser;
verifyToken.tokenFromRequest = tokenFromRequest;

module.exports = verifyToken;
