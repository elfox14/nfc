const ACCESS_TOKEN_MAX_AGE_MS = 15 * 60 * 1000;
const REFRESH_TOKEN_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

function baseCookieOptions(path, maxAge) {
  return {
    httpOnly: true,
    secure: true,
    sameSite: 'None',
    signed: true,
    path,
    ...(maxAge ? { maxAge } : {})
  };
}

function accessCookieOptions() {
  return baseCookieOptions('/', ACCESS_TOKEN_MAX_AGE_MS);
}

function refreshCookieOptions() {
  return baseCookieOptions('/api/auth', REFRESH_TOKEN_MAX_AGE_MS);
}

function clearAccessCookieOptions() {
  const options = baseCookieOptions('/');
  delete options.signed;
  return options;
}

function clearRefreshCookieOptions() {
  const options = baseCookieOptions('/api/auth');
  delete options.signed;
  return options;
}

function setAuthCookies(res, { accessToken, refreshToken }) {
  res.cookie('refreshToken', refreshToken, refreshCookieOptions());
  res.cookie('accessToken', accessToken, accessCookieOptions());
}

function clearAuthCookies(res) {
  res.clearCookie('refreshToken', clearRefreshCookieOptions());
  res.clearCookie('accessToken', clearAccessCookieOptions());
}

module.exports = {
  ACCESS_TOKEN_MAX_AGE_MS,
  REFRESH_TOKEN_MAX_AGE_MS,
  accessCookieOptions,
  refreshCookieOptions,
  clearAccessCookieOptions,
  clearRefreshCookieOptions,
  setAuthCookies,
  clearAuthCookies
};
