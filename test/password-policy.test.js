const { isStrongPassword } = require('../utils/password-policy');

describe('Password policy', () => {
  it('accepts passwords with at least 10 characters, letters, and numbers', () => {
    expect(isStrongPassword('securePass123')).toBe(true);
    expect(isStrongPassword('myStr0ngP@ss')).toBe(true);
  });

  it('rejects passwords shorter than 10 characters', () => {
    expect(isStrongPassword('short1')).toBe(false);
    expect(isStrongPassword('12345678')).toBe(false); // 8 chars — below new minimum
    expect(isStrongPassword('pass1234')).toBe(false); // 8 chars
  });

  it('rejects single-class passwords (letters or digits only)', () => {
    expect(isStrongPassword('password')).toBe(false);
    expect(isStrongPassword('abcdefghij')).toBe(false); // no digits
    expect(isStrongPassword('1234567890')).toBe(false); // no letters
  });

  it('rejects commonly used weak passwords', () => {
    expect(isStrongPassword('password123')).toBe(false); // explicitly blocked
    expect(isStrongPassword('qwerty123')).toBe(false);
    expect(isStrongPassword('letmein')).toBe(false);
    expect(isStrongPassword('123456789')).toBe(false);
  });

  it('rejects passwords that contain the user email local-part or name', () => {
    expect(isStrongPassword('john1234567', { email: 'john@example.com', name: 'John' })).toBe(false);
    expect(isStrongPassword('JohnPass123', { email: 'john@example.com', name: 'John' })).toBe(false);
    expect(isStrongPassword('securePass123', { email: 'john@example.com', name: 'John' })).toBe(true);
  });

  it('rejects passwords longer than 128 characters', () => {
    expect(isStrongPassword('A1' + 'x'.repeat(127))).toBe(false);
  });
});
