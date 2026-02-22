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
    // Use a default config fallback if needed, but config.js handles envalid
    const secret = config.JWT_SECRET || 'default_jwt_secret_change_me';
    return jwt.sign(payload, secret, { expiresIn: '15m' });
}

/**
 * Creates a random long-lived Refresh Token
 * @returns {string} Hex string token
 */
function createRefreshToken() {
    return crypto.randomBytes(64).toString('hex');
}

/**
 * Hashes a token for secure storage in the database
 * @param {string} token The plain text token
 * @returns {string} Hashed hex string
 */
function hashToken(token) {
    return crypto.createHash('sha256').update(token).digest('hex');
}

module.exports = {
    createAccessToken,
    createRefreshToken,
    hashToken
};
