const jwt = require('jsonwebtoken');

jest.mock('jsonwebtoken');

const verifyToken = require('../auth-middleware');

describe('Auth Middleware', () => {
    let req, res, next;
    const originalJwtSecret = process.env.JWT_SECRET;

    beforeEach(() => {
        req = { headers: {}, signedCookies: {} };
        res = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn()
        };
        next = jest.fn();
        process.env.JWT_SECRET = originalJwtSecret;
        jwt.verify.mockReset();
    });

    test('should return 401 if no token provided', () => {
        verifyToken(req, res, next);
        expect(res.status).toHaveBeenCalledWith(401);
        expect(res.json).toHaveBeenCalledWith({ error: 'Access denied. No token provided.' });
    });

    test('should return 403 if token is invalid', () => {
        req.headers['authorization'] = 'Bearer invalidtoken';
        jwt.verify.mockImplementation(() => { throw new Error('Invalid token'); });

        verifyToken(req, res, next);
        expect(res.status).toHaveBeenCalledWith(403);
        expect(res.json).toHaveBeenCalledWith({ error: 'Invalid token.' });
    });

    test('should call next() and attach user if token is valid', () => {
        req.headers['authorization'] = 'Bearer validtoken';
        const mockUser = { userId: '123', email: 'test@example.com', type: 'access' };
        jwt.verify.mockReturnValue(mockUser);

        verifyToken(req, res, next);
        expect(next).toHaveBeenCalled();
        expect(req.user).toEqual(mockUser);
    });

    test('accepts a signature-verified access cookie', () => {
        req.signedCookies.accessToken = 'signed-access-token';
        const mockUser = { userId: '123', email: 'test@example.com', type: 'access' };
        jwt.verify.mockReturnValue(mockUser);

        verifyToken(req, res, next);

        expect(jwt.verify).toHaveBeenCalledWith('signed-access-token', process.env.JWT_SECRET);
        expect(next).toHaveBeenCalled();
        expect(req.user).toEqual(mockUser);
    });

    test('ignores an unsigned access cookie', () => {
        req.cookies = { accessToken: 'attacker-controlled-token' };

        verifyToken(req, res, next);

        expect(jwt.verify).not.toHaveBeenCalled();
        expect(res.status).toHaveBeenCalledWith(401);
        expect(next).not.toHaveBeenCalled();
    });

    test('should return 500 if JWT_SECRET is not configured', () => {
        process.env.JWT_SECRET = '';
        req.headers['authorization'] = 'Bearer sometoken';

        verifyToken(req, res, next);
        expect(res.status).toHaveBeenCalledWith(500);
        expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ error: expect.stringContaining('misconfiguration') }));
    });
});
