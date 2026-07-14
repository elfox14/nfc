function isStrongPassword(password) {
  return (
    typeof password === 'string' &&
    password.length >= 8 &&
    password.length <= 128 &&
    /[A-Za-z]/.test(password) &&
    /\d/.test(password)
  );
}

function passwordValidator(value) {
  if (!isStrongPassword(value)) {
    throw new Error('Password must be 8-128 characters and include letters and numbers');
  }
  return true;
}

module.exports = {
  isStrongPassword,
  passwordValidator
};
