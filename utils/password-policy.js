const MIN_PASSWORD_LENGTH = 8;

// Common weak passwords — expand this list over time
const BLOCKED_PASSWORDS = new Set([
  '12345678',
  'password',
]);

/**
 * Returns true if the password meets all strength requirements:
 * - 8–128 characters
 * - At least one letter (Arabic or Latin)
 * - At least one digit
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
  );
}

function passwordValidator(value) {
  if (!isStrongPassword(value)) {
    throw new Error(
      'Password must be 8–128 characters, include letters and numbers, and not be commonly used'
    );
  }
  return true;
}

module.exports = {
  isStrongPassword,
  passwordValidator
};
