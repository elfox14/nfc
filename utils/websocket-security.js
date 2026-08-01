const WS_LIMITS = {
  MAX_MESSAGE_SIZE: 64 * 1024,
  MAX_MESSAGES_PER_SEC: 30,
  MAX_CONNECTIONS_PER_IP: 5,
  MAX_ROOM_SIZE: 10,
  RATE_WINDOW_MS: 1000,
};

function getClientIP(req, trustProxy = false) {
  if (trustProxy) {
    const forwarded = req.headers['x-forwarded-for']?.split(',')[0]?.trim();
    if (forwarded) return forwarded;
  }
  return req.socket.remoteAddress || 'unknown';
}

function isSafeCollabId(collabId) {
  return typeof collabId === 'string' && /^[A-Za-z0-9_-]{24,64}$/.test(collabId);
}

function parseWsJsonMessage(message, maxSize = WS_LIMITS.MAX_MESSAGE_SIZE) {
  if (!message || message.length > maxSize) {
    const err = new Error('Message too large');
    err.code = 'MESSAGE_TOO_LARGE';
    throw err;
  }

  return JSON.parse(message.toString());
}

function parseCollaborationMessage(message) {
  const data = parseWsJsonMessage(message);
  if (!data || data.type !== 'state' || !data.state || typeof data.state !== 'object' || Array.isArray(data.state)) {
    const err = new Error('Invalid collaboration message schema');
    err.code = 'INVALID_COLLABORATION_MESSAGE';
    throw err;
  }
  return data;
}

function isValidWsClaims(decoded, collabId) {
  return Boolean(
    decoded &&
    decoded.type === 'ws' &&
    decoded.userId &&
    decoded.collabId === collabId &&
    decoded.designId &&
    ['owner', 'editor'].includes(decoded.role)
  );
}

module.exports = {
  WS_LIMITS,
  getClientIP,
  isSafeCollabId,
  isValidWsClaims,
  parseCollaborationMessage,
  parseWsJsonMessage
};
