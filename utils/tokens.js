// utils/tokens.js
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const config = require('../config');

/**
 * Creates a short-lived Access Token
 * @param {Object} payload Data to encode in the token
 * @returns {string} JWT Token
 */
function createAccessToken(payload) {
    const secret = config.JWT_SECRET;
    if (!secret) throw new Error('JWT_SECRET is not configured in environment variables.');
    return jwt.sign({ ...payload, type: 'access' }, secret, { expiresIn: '15m' });
}

/**
 * Creates a random long-lived Refresh Token
 * @returns {string} Hex string token
 */
function createRefreshToken() {
    return crypto.randomBytes(64).toString('hex');
}

/**
 * Hashes a token for secure storage in the database.
 * Uses HMAC-SHA-256 with a server secret to prevent rainbow-table attacks.
 * @param {string} token The plain text token
 * @returns {string} Hashed hex string
 */
function hashToken(token) {
    const hmacSecret = process.env.TOKEN_HASH_SECRET;
    if (!hmacSecret) {
        throw new Error('TOKEN_HASH_SECRET is required but not configured. Fallback to JWT_SECRET is disabled for security.');
    }
    return crypto.createHmac('sha256', hmacSecret).update(token).digest('hex');
}

module.exports = {
    createAccessToken,
    createRefreshToken,
    hashToken
};
