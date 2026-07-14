const jwt = require('jsonwebtoken');
const { WebSocketServer } = require('ws');
const url = require('url');
const {
  WS_LIMITS,
  getClientIP,
  isSafeCollabId,
  parseWsJsonMessage
} = require('./websocket-security');

function registerRealtimeCollaboration(server) {
  const wss = new WebSocketServer({ server });
  const rooms = new Map();
  const wsConnectionsPerIP = new Map();

  wss.on('connection', (ws, req) => {
    const clientIP = getClientIP(req);
    const currentCount = wsConnectionsPerIP.get(clientIP) || 0;

    if (currentCount >= WS_LIMITS.MAX_CONNECTIONS_PER_IP) {
      console.log(`WebSocket rejected: IP ${clientIP} exceeded max connections (${WS_LIMITS.MAX_CONNECTIONS_PER_IP})`);
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
      console.log('Connection rejected: Invalid collabId.');
      ws.close(1008, 'Valid collabId is required');
      return;
    }

    const secret = process.env.JWT_SECRET;
    if (!secret) {
      console.error('CRITICAL: WebSocket connection rejected because JWT_SECRET is not configured on the server.');
      ws.close(1011, 'Internal Server Error: Authentication configuration missing');
      return;
    }

    let authenticated = false;
    const authTimeout = setTimeout(() => {
      if (!authenticated) {
        console.log(`WebSocket auth timeout for room: ${collabId}`);
        ws.close(1008, 'Authentication timeout');
      }
    }, 10000);

    ws.once('message', (message) => {
      try {
        if (message.length > WS_LIMITS.MAX_MESSAGE_SIZE) {
          clearTimeout(authTimeout);
          ws.close(1009, 'Message too large');
          return;
        }

        const data = parseWsJsonMessage(message);
        if (data.type === 'auth' && data.token) {
          const decoded = jwt.verify(data.token, secret);
          if (decoded.type !== 'access' || !decoded.userId) {
            throw new Error('Invalid WebSocket token type');
          }

          authenticated = true;
          clearTimeout(authTimeout);

          if (!rooms.has(collabId)) {
            rooms.set(collabId, new Set());
          }
          const room = rooms.get(collabId);

          if (room.size >= WS_LIMITS.MAX_ROOM_SIZE) {
            ws.close(1008, 'Room is full');
            return;
          }

          room.add(ws);
          console.log(`Client authenticated and joined room: ${collabId}. Room size: ${room.size}`);
          ws.send(JSON.stringify({ type: 'auth', success: true }));

          let messageTimestamps = [];

          ws.on('message', (msg) => {
            try {
              if (msg.length > WS_LIMITS.MAX_MESSAGE_SIZE) {
                ws.send(JSON.stringify({ type: 'error', message: 'Message too large' }));
                return;
              }
              parseWsJsonMessage(msg);

              const now = Date.now();
              messageTimestamps = messageTimestamps.filter(t => now - t < WS_LIMITS.RATE_WINDOW_MS);
              messageTimestamps.push(now);

              if (messageTimestamps.length > WS_LIMITS.MAX_MESSAGES_PER_SEC) {
                ws.send(JSON.stringify({ type: 'error', message: 'Rate limit exceeded. Slow down.' }));
                return;
              }

              room.forEach(client => {
                if (client !== ws && client.readyState === ws.OPEN) {
                  client.send(msg.toString());
                }
              });
            } catch (error) {
              ws.send(JSON.stringify({ type: 'error', message: 'Invalid collaboration message' }));
            }
          });

          ws.on('close', () => {
            room.delete(ws);
            console.log(`Client disconnected from room: ${collabId}. Room size: ${room.size}`);
            if (room.size === 0) {
              rooms.delete(collabId);
              console.log(`Room ${collabId} is now empty and has been closed.`);
            }
          });
        } else {
          console.log('WebSocket connection rejected: First message was not auth.');
          clearTimeout(authTimeout);
          ws.close(1008, 'Authentication required as first message');
        }
      } catch (err) {
        console.log('WebSocket connection rejected: Invalid auth token.');
        clearTimeout(authTimeout);
        ws.close(1008, 'Invalid authentication token');
      }
    });

    ws.on('error', (error) => {
      console.error('WebSocket error:', error);
      clearTimeout(authTimeout);
    });
  });

  return { wss, rooms, wsConnectionsPerIP };
}

module.exports = {
  registerRealtimeCollaboration
};
