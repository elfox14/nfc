const verifyToken = require('../auth-middleware');
const jwt = require('jsonwebtoken');

jest.mock('jsonwebtoken');

describe('Auth Middleware', () => {
    let req, res, next;

    beforeEach(() => {
        req = { headers: {} };
        res = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn()
        };
        next = jest.fn();
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
        const mockUser = { userId: '123', email: 'test@example.com' };
        jwt.verify.mockReturnValue(mockUser);

        verifyToken(req, res, next);
        expect(next).toHaveBeenCalled();
        expect(req.user).toEqual(mockUser);
    });
});
