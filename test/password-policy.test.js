const { isStrongPassword } = require('../utils/password-policy');

describe('Password policy', () => {
  it('accepts passwords with at least 8 characters, letters, and numbers', () => {
    expect(isStrongPassword('password123')).toBe(true);
  });

  it('rejects short or single-class passwords', () => {
    expect(isStrongPassword('short1')).toBe(false);
    expect(isStrongPassword('password')).toBe(false);
    expect(isStrongPassword('12345678')).toBe(false);
  });
});
