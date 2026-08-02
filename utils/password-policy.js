const MIN_PASSWORD_LENGTH = 12;
const BLOCKED_PASSWORDS = new Set([
  'password123456',
  'qwerty12345678',
  'admin123456789',
  'mcprime123456'
]);

function isStrongPassword(password) {
  const normalized = typeof password === 'string' ? password.toLowerCase() : '';
  return (
    typeof password === 'string' &&
    password.length >= MIN_PASSWORD_LENGTH &&
    password.length <= 128 &&
    /[A-Za-z]/.test(password) &&
    /\d/.test(password) &&
    !BLOCKED_PASSWORDS.has(normalized)
  );
}

function passwordValidator(value) {
  if (!isStrongPassword(value)) {
    throw new Error('Password must be 12-128 characters, include letters and numbers, and not be commonly used');
  }
  return true;
}

module.exports = {
  MIN_PASSWORD_LENGTH,
  isStrongPassword,
  passwordValidator
};
