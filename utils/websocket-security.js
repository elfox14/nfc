const WS_LIMITS = {
  MAX_MESSAGE_SIZE: 64 * 1024,
  MAX_MESSAGES_PER_SEC: 30,
  MAX_CONNECTIONS_PER_IP: 5,
  MAX_ROOM_SIZE: 10,
  RATE_WINDOW_MS: 1000,
};

function getClientIP(req) {
  return req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.socket.remoteAddress || 'unknown';
}

function isSafeCollabId(collabId) {
  return typeof collabId === 'string' && /^[A-Za-z0-9_-]{3,64}$/.test(collabId);
}

function parseWsJsonMessage(message, maxSize = WS_LIMITS.MAX_MESSAGE_SIZE) {
  if (!message || message.length > maxSize) {
    const err = new Error('Message too large');
    err.code = 'MESSAGE_TOO_LARGE';
    throw err;
  }

  return JSON.parse(message.toString());
}

module.exports = {
  WS_LIMITS,
  getClientIP,
  isSafeCollabId,
  parseWsJsonMessage
};
