<<<<<<< HEAD
const MIN_PASSWORD_LENGTH = 12;

// Common weak passwords — expand this list over time
const BLOCKED_PASSWORDS = new Set([
  'password123456',
  'qwerty12345678',
  'admin123456789',
  'mcprime123456',
  'password1234',
  '123456789012',
  'abcdefghijkl',
  'qwertyuioplk',
  'aaaaaaaaaaaa',
  '111111111111',
  'abc123456789',
  'letmein12345',
  'welcome12345',
  'monkey123456',
  'dragon123456',
]);

/**
 * Returns true if the password meets all strength requirements:
 * - 12–128 characters
 * - At least one letter (Arabic or Latin)
 * - At least one digit
 * - At least one special character
 * - Not in the blocked list
 */
function isStrongPassword(password) {
  if (typeof password !== 'string') return false;
  const normalized = password.toLowerCase();
  return (
    password.length >= MIN_PASSWORD_LENGTH &&
    password.length <= 128 &&
    /[A-Za-z\u0600-\u06FF]/.test(password) &&
    /\d/.test(password) &&
    !BLOCKED_PASSWORDS.has(normalized)
=======
function isStrongPassword(password) {
  return (
    typeof password === 'string' &&
    password.length >= 8 &&
    password.length <= 128 &&
    /[A-Za-z]/.test(password) &&
    /\d/.test(password)
>>>>>>> parent of 1bcf56b (Merge pull request #118 from elfox14/agent/security-launch-hardening-round-2)
  );
}

function passwordValidator(value) {
  if (!isStrongPassword(value)) {
<<<<<<< HEAD
    throw new Error(
      'Password must be 12–128 characters, include letters, numbers, and at least one special character (!@#$%^&* etc.), and not be commonly used'
    );
=======
    throw new Error('Password must be 8-128 characters and include letters and numbers');
>>>>>>> parent of 1bcf56b (Merge pull request #118 from elfox14/agent/security-launch-hardening-round-2)
  }
  return true;
}

module.exports = {
  isStrongPassword,
  passwordValidator
};
