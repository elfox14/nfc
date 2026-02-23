const { nanoid } = require('nanoid');
const config = require('./config');

try {
    const clientId = config.GOOGLE_CLIENT_ID || process.env.GOOGLE_CLIENT_ID || '123';
    if (!clientId) throw new Error('no client id');
    const publicBaseUrl = config.PUBLIC_BASE_URL || 'https://mcprim.com';
    const redirectUri = `${publicBaseUrl}/api/auth/google/callback`;
    const state = nanoid(16);
    const scope = encodeURIComponent('openid email profile');
    const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?response_type=code&client_id=${encodeURIComponent(clientId)}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${scope}&state=${state}&prompt=select_account`;
    console.log('SUCCESS:', authUrl);
} catch (err) {
    console.log('ERROR:', err);
}
