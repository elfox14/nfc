const { createRefreshToken, isOpaqueToken } = require('../utils/tokens');

describe('Opaque token helpers', () => {
  it('creates and accepts 128-character hex tokens', () => {
    const token = createRefreshToken();
    expect(token).toHaveLength(128);
    expect(isOpaqueToken(token)).toBe(true);
  });

  it('rejects malformed tokens before hashing or database lookup', () => {
    expect(isOpaqueToken('not-a-token')).toBe(false);
    expect(isOpaqueToken('a'.repeat(127))).toBe(false);
    expect(isOpaqueToken('g'.repeat(128))).toBe(false);
  });
});
