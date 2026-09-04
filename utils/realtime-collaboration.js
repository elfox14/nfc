const jwt = require('jsonwebtoken');
const { WebSocketServer } = require('ws');
const url = require('url');
const { sanitizeDesignState } = require('./sanitize');
const { isAllowedOrigin } = require('./cors-config');
const {
  WS_LIMITS,
  getClientIP,
  isSafeCollabId,
  isValidWsClaims,
  parseCollaborationMessage,
  parseWsJsonMessage
} = require('./websocket-security');

function registerRealtimeCollaboration(server, options = {}) {
  const { allowedOrigins = [] } = options;
  const wss = new WebSocketServer({
    server,
    maxPayload: WS_LIMITS.MAX_MESSAGE_SIZE
  });
  const rooms = new Map();
  const wsConnectionsPerIP = new Map();
  const trustProxy = process.env.TRUST_PROXY === 'true';

  wss.on('connection', (ws, req) => {
    // 1. Validate Origin header to mitigate Cross-Site WebSocket Hijacking (CSWSH)
    const origin = req.headers.origin;
    if (origin && Array.isArray(allowedOrigins) && allowedOrigins.length > 0) {
      if (!isAllowedOrigin(origin, allowedOrigins)) {
        console.warn(`[WebSocket] Connection rejected: unauthorized origin '${origin}'`);
        ws.close(1008, 'Origin not allowed');
        return;
      }
    }

    const clientIP = getClientIP(req, trustProxy);
    const currentCount = wsConnectionsPerIP.get(clientIP) || 0;

    if (currentCount >= WS_LIMITS.MAX_CONNECTIONS_PER_IP) {
      ws.close(1008, 'Too many connections from your IP');
      return;
    }
    wsConnectionsPerIP.set(clientIP, currentCount + 1);

    ws.on('close', () => {
      const count = wsConnectionsPerIP.get(clientIP) || 1;
      if (count <= 1) wsConnectionsPerIP.delete(clientIP);
      else wsConnectionsPerIP.set(clientIP, count - 1);
    });

    const parameters = new url.URL(req.url, `ws://${req.headers.host}`).searchParams;
    const collabId = parameters.get('collabId');
    if (!isSafeCollabId(collabId)) {
      ws.close(1008, 'Valid collaboration room is required');
      return;
    }

    const secret = process.env.JWT_SECRET;
    if (!secret) {
      console.error('CRITICAL: WebSocket rejected because JWT_SECRET is missing.');
      ws.close(1011, 'Authentication configuration missing');
      return;
    }

    let authenticated = false;
    const authTimeout = setTimeout(() => {
      if (!authenticated) ws.close(1008, 'Authentication timeout');
    }, 10000);

    ws.once('message', (message) => {
      try {
        const data = parseWsJsonMessage(message);
        if (data.type !== 'auth' || typeof data.token !== 'string') {
          throw new Error('Authentication required as first message');
        }

        const decoded = jwt.verify(data.token, secret, { algorithms: ['HS256'] });
        if (!isValidWsClaims(decoded, collabId)) {
          throw new Error('Invalid WebSocket token scope');
        }

        authenticated = true;
        clearTimeout(authTimeout);

        if (!rooms.has(collabId)) {
          rooms.set(collabId, { clients: new Set(), latestState: null, designId: decoded.designId });
        }
        const room = rooms.get(collabId);
        if (room.designId !== decoded.designId) {
          ws.close(1008, 'Room scope mismatch');
          return;
        }
        if (room.clients.size >= WS_LIMITS.MAX_ROOM_SIZE) {
          ws.close(1008, 'Room is full');
          return;
        }

        room.clients.add(ws);
        ws.send(JSON.stringify({ type: 'auth', success: true, role: decoded.role }));
        if (room.latestState) {
          ws.send(JSON.stringify({ type: 'state', state: room.latestState }));
        }

        let messageTimestamps = [];
        let rateLimitViolations = 0;
        ws.on('message', (msg) => {
          try {
            const now = Date.now();
            messageTimestamps = messageTimestamps.filter(timestamp => now - timestamp < WS_LIMITS.RATE_WINDOW_MS);
            if (messageTimestamps.length >= WS_LIMITS.MAX_MESSAGES_PER_SEC) {
              rateLimitViolations++;
              if (rateLimitViolations >= 3) {
                console.warn(`[WebSocket] Client exceeded rate limit repeatedly. Terminating connection.`);
                ws.close(1008, 'Rate limit exceeded repeatedly');
                return;
              }
              ws.send(JSON.stringify({ type: 'error', code: 'RATE_LIMITED' }));
              return;
            }
            if (rateLimitViolations > 0) rateLimitViolations = Math.max(0, rateLimitViolations - 0.5);
            messageTimestamps.push(now);

            const collaborationMessage = parseCollaborationMessage(msg);
            const state = sanitizeDesignState(collaborationMessage.state);
            if (!state.inputs || !state.dynamic) {
              throw new Error('Collaboration state is not renderable');
            }

            const outbound = JSON.stringify({ type: 'state', state });
            if (Buffer.byteLength(outbound) > WS_LIMITS.MAX_MESSAGE_SIZE) {
              ws.send(JSON.stringify({ type: 'error', code: 'MESSAGE_TOO_LARGE' }));
              return;
            }

            room.latestState = state;
            room.clients.forEach(client => {
              if (client !== ws && client.readyState === 1) client.send(outbound);
            });
          } catch {
            ws.send(JSON.stringify({ type: 'error', code: 'INVALID_MESSAGE' }));
          }
        });

        ws.on('close', () => {
          room.clients.delete(ws);
          if (room.clients.size === 0) rooms.delete(collabId);
        });
      } catch {
        clearTimeout(authTimeout);
        ws.close(1008, 'Invalid authentication token');
      }
    });

    ws.on('error', error => {
      console.error('WebSocket error:', error.message);
      clearTimeout(authTimeout);
    });
  });

  return { wss, rooms, wsConnectionsPerIP };
}

module.exports = {
  registerRealtimeCollaboration
};
