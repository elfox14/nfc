const { isStrongPassword } = require('../utils/password-policy');

describe('Password policy', () => {
  it('accepts passwords with at least 12 characters, letters, and numbers', () => {
    expect(isStrongPassword('CorrectHorse42')).toBe(true);
  });

  it('rejects short, single-class, and common passwords', () => {
    expect(isStrongPassword('short1')).toBe(false);
    expect(isStrongPassword('password')).toBe(false);
    expect(isStrongPassword('123456789012')).toBe(false);
    expect(isStrongPassword('password123456')).toBe(false);
  });
});
