const MIN_PASSWORD_LENGTH = 10;
const MAX_PASSWORD_LENGTH = 128;

// Common weak passwords — sourced from publicly leaked password rankings.
// Expand this list over time as new weak patterns emerge.
const BLOCKED_PASSWORDS = new Set([
  // Classic top-ranked leaks
  '123456789',
  '1234567890',
  '12345678',
  '123456',
  'password',
  'password1',
  'password123',
  'qwerty123',
  'qwertyuiop',
  'abc123456',
  'abcd1234',
  'iloveyou',
  'letmein',
  'welcome',
  'admin123',
  'monkey123',
  'dragon123',
  'football',
  'baseball',
  'master123',
  // Arabic keyboard mappable weak patterns
  '123456789!',
  'passw0rd1',
  'p@ssw0rd1',
]);

/**
 * Returns true if the password meets all strength requirements:
 * - 10–128 characters
 * - At least one letter (Arabic or Latin)
 * - At least one digit
 * - Not in the blocked list
 * - Does not contain the local part of the user's email or their name
 *   (checked by caller via containsUserInfo — see passwordValidator below)
 */
function isStrongPassword(password, userInfo) {
  if (typeof password !== 'string') return false;
  if (password.length < MIN_PASSWORD_LENGTH || password.length > MAX_PASSWORD_LENGTH) {
    return false;
  }
  // Must contain at least one letter and one digit
  if (!/[A-Za-z\u0600-\u06FF]/.test(password)) return false;
  if (!/\d/.test(password)) return false;
  // Reject exact matches against the blocked list (case-insensitive)
  if (BLOCKED_PASSWORDS.has(password.toLowerCase())) return false;
  // Reject passwords that embed the user's email local-part or name
  if (userInfo && containsUserInfo(password, userInfo)) return false;
  return true;
}

/**
 * Checks whether the password contains the user's email local-part or
 * display name as a substring (case-insensitive, 3+ char tokens only).
 */
function containsUserInfo(password, userInfo) {
  const lower = password.toLowerCase();
  const tokens = [];

  if (userInfo.email) {
    const localPart = String(userInfo.email).split('@')[0];
    if (localPart && localPart.length >= 3) tokens.push(localPart.toLowerCase());
  }
  if (userInfo.name) {
    // Split name on whitespace and collect each meaningful token
    for (const part of String(userInfo.name).split(/\s+/)) {
      if (part && part.length >= 3) tokens.push(part.toLowerCase());
    }
  }

  return tokens.some(token => lower.includes(token));
}

/**
 * Express-validator custom validator.
 * The optional `userInfo` object ({ email, name }) is used to reject
 * passwords that embed personal identifiers.
 */
function passwordValidator(value, userInfo) {
  if (!isStrongPassword(value, userInfo)) {
    throw new Error(
      'Password must be 10–128 characters, include letters and numbers, ' +
      'not be commonly used, and must not contain your name or email'
    );
  }
  return true;
}

module.exports = {
  MIN_PASSWORD_LENGTH,
  MAX_PASSWORD_LENGTH,
  isStrongPassword,
  passwordValidator,
  containsUserInfo
};
