const { accessCookieOptions, refreshCookieOptions } = require('../utils/auth-cookies');

describe('Auth cookie options', () => {
  it('keeps access cookies HttpOnly, Secure, SameSite=None, and root-scoped', () => {
    expect(accessCookieOptions()).toMatchObject({
      httpOnly: true,
      secure: true,
      sameSite: 'None',
      path: '/'
    });
  });

  it('keeps refresh cookies HttpOnly, Secure, SameSite=None, and auth-scoped', () => {
    expect(refreshCookieOptions()).toMatchObject({
      httpOnly: true,
      secure: true,
      sameSite: 'None',
      path: '/api/auth'
    });
  });
});
