const MIN_PASSWORD_LENGTH = 8;

// Common weak passwords — based on NCSC / Have I Been Pwned top lists
const BLOCKED_PASSWORDS = new Set([
  '12345678', '123456789', '1234567890', '87654321',
  'password', 'password1', 'password!', 'p@ssword',
  'passw0rd', 'p@ssw0rd', 'pa$$word', 'qwerty123',
  'iloveyou', 'iloveyou1', 'loveyou1', '1q2w3e4r',
  'admin123', 'admin1234', 'admin@123', 'adminadmin',
  'welcome1', 'welcome!', 'letmein1', 'letmein!',
  'monkey123', 'dragon123', 'master123', 'baseball1',
  'sunshine1', 'princess1', 'football1', 'michael1',
  'shadow123', 'superman1', 'batman123', 'starwars1',
  'trustno1', 'abc12345', 'abc123456', '11111111',
  '00000000', '99999999', '12121212', '11223344',
  'qazwsxed', 'zaq12wsx', 'asdfghjk', '1qaz2wsx',
  'mcprim123', 'mcprime1', 'nfc12345', 'nfc123456',
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
