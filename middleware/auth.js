// middleware/auth.js
const jwt = require('jsonwebtoken');

/**
 * JWT Authentication Middleware
 * مكون للتحقق من صلاحية المستخدم باستخدام JWT
 */

/**
 * توليد JWT Token
 * @param {Object} payload - البيانات المراد تضمينها في Token (مثل userId)
 * @returns {string} JWT Token
 */
function generateToken(payload) {
    const secret = process.env.JWT_SECRET;
    const expiresIn = process.env.JWT_EXPIRE || '7d';

    if (!secret) {
        throw new Error('JWT_SECRET is not defined in environment variables');
    }

    return jwt.sign(payload, secret, { expiresIn });
}

/**
 * التحقق من صحة JWT Token
 * @param {string} token 
 * @returns {Object} الـ payload المفكوك
 * @throws {Error} إذا كان Token غير صحيح
 */
function verifyToken(token) {
    const secret = process.env.JWT_SECRET;

    if (!secret) {
        throw new Error('JWT_SECRET is not defined in environment variables');
    }

    try {
        return jwt.verify(token, secret);
    } catch (error) {
        if (error.name === 'TokenExpiredError') {
            throw new Error('انتهت صلاحية الجلسة. الرجاء تسجيل الدخول مرة أخرى.');
        } else if (error.name === 'JsonWebTokenError') {
            throw new Error('الجلسة غير صحيحة.');
        } else {
            throw error;
        }
    }
}

/**
 * Middleware للتحقق من المصادقة
 * يجب أن يتم استخدامه قبل أي route محمي
 * 
 * @example
 * app.get('/api/protected', authenticate, (req, res) => {
 *   // req.user متاح هنا
 * });
 */
function authenticate(req, res, next) {
    try {
        // استخراج Token من Header
        const authHeader = req.headers.authorization;

        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({
                error: 'غير مصرح. الرجاء تسجيل الدخول.'
            });
        }

        const token = authHeader.substring(7); // إزالة "Bearer "

        // التحقق من Token
        const decoded = verifyToken(token);

        // إضافة بيانات المستخدم إلى Request
        req.user = decoded;

        next();
    } catch (error) {
        return res.status(401).json({
            error: error.message || 'غير مصرح.'
        });
    }
}

/**
 * Middleware للتحقق من دور المستخدم (Role)
 * يجب استخدامه بعد authenticate
 * 
 * @param {string[]} allowedRoles - قائمة الأدوار المسموحة
 * @returns {Function} Middleware
 * 
 * @example
 * app.delete('/api/admin/delete', authenticate, requireRole(['admin']), (req, res) => {
 *   // فقط admin يمكنه الوصول
 * });
 */
function requireRole(allowedRoles) {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({
                error: 'غير مصرح.'
            });
        }

        if (!allowedRoles.includes(req.user.role)) {
            return res.status(403).json({
                error: 'ليس لديك صلاحية للوصول إلى هذا المورد.'
            });
        }

        next();
    };
}

/**
 * Middleware اختياري للمصادقة
 * لا يتطلب token، لكن إذا وُجد سيتم فك تشفيره
 * مفيد للـ routes التي تريد معرفة المستخدم إذا كان مسجلاً دون إجبار
 */
function optionalAuth(req, res, next) {
    try {
        const authHeader = req.headers.authorization;

        if (authHeader && authHeader.startsWith('Bearer ')) {
            const token = authHeader.substring(7);
            const decoded = verifyToken(token);
            req.user = decoded;
        }

        // Continue even if no token
        next();
    } catch (error) {
        // Ignore errors in optional auth
        next();
    }
}

/**
 * التحقق من ملكية المورد
 * يتأكد من أن المستخدم هو صاحب المورد (مثل التصميم)
 * 
 * @param {Object} db - اتصال قاعدة البيانات
 * @param {string} collection - اسم Collection
 * @param {string} idParam - اسم المعامل في req.params
 * @returns {Function} Middleware
 * 
 * @example
 * app.put('/api/designs/:id', authenticate, requireOwnership(db, 'designs', 'id'), (req, res) => {
 *   // فقط صاحب التصميم يمكنه التعديل
 * });
 */
function requireOwnership(db, collection, idParam = 'id') {
    return async (req, res, next) => {
        try {
            if (!req.user) {
                return res.status(401).json({ error: 'غير مصرح.' });
            }

            const resourceId = req.params[idParam];
            if (!resourceId) {
                return res.status(400).json({ error: 'معرّف المورد مفقود.' });
            }

            // جلب المورد من DB
            const resource = await db.collection(collection).findOne({
                shortId: resourceId
            });

            if (!resource) {
                return res.status(404).json({ error: 'المورد غير موجود.' });
            }

            // التحقق من الملكية (أو إذا كان admin)
            if (resource.userId !== req.user.userId && req.user.role !== 'admin') {
                return res.status(403).json({
                    error: 'ليس لديك صلاحية لتعديل هذا المورد.'
                });
            }

            // إضافة المورد إلى req للاستخدام في Handler
            req.resource = resource;

            next();
        } catch (error) {
            console.error('Error in requireOwnership middleware:', error);
            return res.status(500).json({ error: 'خطأ في التحقق من الملكية.' });
        }
    };
}

module.exports = {
    generateToken,
    verifyToken,
    authenticate,
    requireRole,
    optionalAuth,
    requireOwnership
};
