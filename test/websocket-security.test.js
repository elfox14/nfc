const {
  WS_LIMITS,
  getClientIP,
  isSafeCollabId,
  isValidWsClaims,
  parseCollaborationMessage,
  parseWsJsonMessage
} = require('../utils/websocket-security');

describe('WebSocket security helpers', () => {
  describe('isSafeCollabId', () => {
    it('accepts only high-entropy collaboration IDs', () => {
      expect(isSafeCollabId('room_123-Abc-room_123-Abc')).toBe(true);
      expect(isSafeCollabId('a'.repeat(64))).toBe(true);
    });

    it('rejects missing, short, long, or unsafe IDs', () => {
      expect(isSafeCollabId()).toBe(false);
      expect(isSafeCollabId('room_123-Abc')).toBe(false);
      expect(isSafeCollabId('a'.repeat(23))).toBe(false);
      expect(isSafeCollabId('a'.repeat(65))).toBe(false);
      expect(isSafeCollabId('../secret')).toBe(false);
      expect(isSafeCollabId('room<script>')).toBe(false);
      expect(isSafeCollabId('room space')).toBe(false);
    });
  });

  describe('parseWsJsonMessage', () => {
    it('parses valid JSON buffers', () => {
      expect(parseWsJsonMessage(Buffer.from('{"type":"cursor","x":1}'))).toEqual({
        type: 'cursor',
        x: 1
      });
    });

    it('throws a coded error for oversized messages', () => {
      expect(() => parseWsJsonMessage(Buffer.alloc(WS_LIMITS.MAX_MESSAGE_SIZE + 1))).toThrow('Message too large');

      try {
        parseWsJsonMessage(Buffer.alloc(WS_LIMITS.MAX_MESSAGE_SIZE + 1));
      } catch (err) {
        expect(err.code).toBe('MESSAGE_TOO_LARGE');
      }
    });

    it('throws for malformed JSON', () => {
      expect(() => parseWsJsonMessage(Buffer.from('{bad json'))).toThrow();
    });
  });

  describe('getClientIP', () => {
    it('uses the first forwarded address only behind a trusted proxy', () => {
      const req = {
        headers: { 'x-forwarded-for': '203.0.113.10, 10.0.0.1' },
        socket: { remoteAddress: '127.0.0.1' }
      };

      expect(getClientIP(req, true)).toBe('203.0.113.10');
      expect(getClientIP(req)).toBe('127.0.0.1');
    });

    it('falls back to the socket remote address', () => {
      const req = {
        headers: {},
        socket: { remoteAddress: '127.0.0.1' }
      };

      expect(getClientIP(req)).toBe('127.0.0.1');
    });
  });

  describe('collaboration authorization and schema', () => {
    const collabId = 'a'.repeat(32);

    it('accepts only room-bound WebSocket claims', () => {
      expect(isValidWsClaims({
        type: 'ws', userId: 'user-1', collabId, designId: 'card-1', role: 'editor'
      }, collabId)).toBe(true);
      expect(isValidWsClaims({ type: 'access', userId: 'user-1' }, collabId)).toBe(false);
      expect(isValidWsClaims({
        type: 'ws', userId: 'user-1', collabId: 'b'.repeat(32), designId: 'card-1', role: 'editor'
      }, collabId)).toBe(false);
    });

    it('accepts only state message envelopes', () => {
      expect(parseCollaborationMessage(Buffer.from('{"type":"state","state":{"inputs":{}}}')))
        .toEqual({ type: 'state', state: { inputs: {} } });
      expect(() => parseCollaborationMessage(Buffer.from('{"inputs":{}}')))
        .toThrow('Invalid collaboration message schema');
      expect(() => parseCollaborationMessage(Buffer.from('{"type":"cursor","x":1}')))
        .toThrow('Invalid collaboration message schema');
    });
  });
});
