// routes/auth.js
const express = require('express');
const { body, validationResult } = require('express-validator');
const UserModel = require('../models/User');
const { generateToken, authenticate } = require('../middleware/auth');

const router = express.Router();

/**
 * تسجيل مستخدم جديد
 * POST /api/auth/register
 */
router.post('/register', [
    // Validation middleware
    body('username')
        .trim()
        .isLength({ min: 3, max: 30 })
        .withMessage('اسم المستخدم يجب أن يكون بين 3 و 30 حرفاً')
        .matches(/^[a-zA-Z0-9_]+$/)
        .withMessage('اسم المستخدم يجب أن يحتوي فقط على حروف، أرقام، وشرطة سفلية'),

    body('email')
        .trim()
        .isEmail()
        .normalizeEmail()
        .withMessage('البريد الإلكتروني غير صحيح'),

    body('password')
        .isLength({ min: 8 })
        .withMessage('كلمة المرور يجب أن تكون 8 أحرف على الأقل')
], async (req, res) => {
    try {
        // التحقق من صحة البيانات
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                error: errors.array()[0].msg
            });
        }

        const { username, email, password } = req.body;

        // الحصول على DB من app
        const db = req.app.locals.db;
        if (!db) {
            return res.status(500).json({ error: 'خطأ في الاتصال بقاعدة البيانات' });
        }

        const usersCollection = db.collection('users');

        // التحقق من عدم وجود المستخدم مسبقاً
        const existingUser = await usersCollection.findOne({
            $or: [
                { username: username.toLowerCase() },
                { email: email.toLowerCase() }
            ]
        });

        if (existingUser) {
            if (existingUser.username === username.toLowerCase()) {
                return res.status(400).json({
                    error: 'اسم المستخدم موجود مسبقاً'
                });
            }
            if (existingUser.email === email.toLowerCase()) {
                return res.status(400).json({
                    error: 'البريد الإلكتروني مسجل مسبقاً'
                });
            }
        }

        // إنشاء المستخدم الجديد
        const newUser = await UserModel.createUser({ username, email, password });

        // حفظ في DB
        const result = await usersCollection.insertOne(newUser);

        // توليد Token
        const token = generateToken({
            userId: result.insertedId.toString(),
            username: newUser.username,
            email: newUser.email,
            role: newUser.role
        });

        // إرجاع الرد
        res.status(201).json({
            success: true,
            message: 'تم إنشاء الحساب بنجاح',
            token,
            user: {
                id: result.insertedId.toString(),
                username: newUser.username,
                email: newUser.email,
                role: newUser.role,
                createdAt: newUser.createdAt
            }
        });

    } catch (error) {
        console.error('Register error:', error);
        res.status(500).json({
            error: error.message || 'خطأ في التسجيل'
        });
    }
});

/**
 * تسجيل الدخول
 * POST /api/auth/login
 */
router.post('/login', [
    body('email')
        .trim()
        .isEmail()
        .normalizeEmail()
        .withMessage('البريد الإلكتروني غير صحيح'),

    body('password')
        .notEmpty()
        .withMessage('كلمة المرور مطلوبة')
], async (req, res) => {
    try {
        // التحقق من صحة البيانات
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                error: errors.array()[0].msg
            });
        }

        const { email, password } = req.body;

        // الحصول على DB
        const db = req.app.locals.db;
        if (!db) {
            return res.status(500).json({ error: 'خطأ في الاتصال بقاعدة البيانات' });
        }

        const usersCollection = db.collection('users');

        // البحث عن المستخدم
        const user = await usersCollection.findOne({
            email: email.toLowerCase()
        });

        if (!user) {
            return res.status(401).json({
                error: 'البريد الإلكتروني أو كلمة المرور غير صحيحة'
            });
        }

        // التحقق من كلمة المرور
        const isPasswordValid = await UserModel.comparePassword(
            password,
            user.password
        );

        if (!isPasswordValid) {
            return res.status(401).json({
                error: 'البريد الإلكتروني أو كلمة المرور غير صحيحة'
            });
        }

        // التحقق من أن الحساب نشط
        if (!user.isActive) {
            return res.status(403).json({
                error: 'الحساب غير نشط. الرجاء التواصل مع الدعم.'
            });
        }

        // توليد Token
        const token = generateToken({
            userId: user._id.toString(),
            username: user.username,
            email: user.email,
            role: user.role
        });

        // إرجاع الرد
        res.json({
            success: true,
            message: 'تم تسجيل الدخول بنجاح',
            token,
            user: {
                id: user._id.toString(),
                username: user.username,
                email: user.email,
                role: user.role,
                createdAt: user.createdAt
            }
        });

    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({
            error: 'خطأ في تسجيل الدخول'
        });
    }
});

/**
 * جلب بيانات المستخدم الحالي
 * GET /api/auth/me
 * يتطلب: Authorization header
 */
router.get('/me', authenticate, async (req, res) => {
    try {
        const db = req.app.locals.db;
        if (!db) {
            return res.status(500).json({ error: 'خطأ في الاتصال بقاعدة البيانات' });
        }

        const usersCollection = db.collection('users');
        const { ObjectId } = require('mongodb');

        // جلب المستخدم من DB
        const user = await usersCollection.findOne({
            _id: new ObjectId(req.user.userId)
        });

        if (!user) {
            return res.status(404).json({ error: 'المستخدم غير موجود' });
        }

        // إرجاع البيانات (بدون كلمة المرور)
        res.json({
            success: true,
            user: {
                id: user._id.toString(),
                username: user.username,
                email: user.email,
                role: user.role,
                isActive: user.isActive,
                createdAt: user.createdAt,
                updatedAt: user.updatedAt
            }
        });

    } catch (error) {
        console.error('Get user error:', error);
        res.status(500).json({ error: 'خطأ في جلب البيانات' });
    }
});

/**
 * تحديث بيانات المستخدم
 * PUT /api/auth/update
 * يتطلب: Authorization header
 */
router.put('/update', authenticate, [
    body('username')
        .optional()
        .trim()
        .isLength({ min: 3, max: 30 })
        .withMessage('اسم المستخدم يجب أن يكون بين 3 و 30 حرفاً'),

    body('email')
        .optional()
        .trim()
        .isEmail()
        .normalizeEmail()
        .withMessage('البريد الإلكتروني غير صحيح')
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ error: errors.array()[0].msg });
        }

        const db = req.app.locals.db;
        if (!db) {
            return res.status(500).json({ error: 'خطأ في الاتصال بقاعدة البيانات' });
        }

        const usersCollection = db.collection('users');
        const { ObjectId } = require('mongodb');
        const { username, email } = req.body;

        // بناء الـ update object
        const updateData = { updatedAt: new Date() };

        if (username) {
            // التحقق من عدم وجود username
            const existing = await usersCollection.findOne({
                username: username.toLowerCase(),
                _id: { $ne: new ObjectId(req.user.userId) }
            });
            if (existing) {
                return res.status(400).json({ error: 'اسم المستخدم موجود مسبقاً' });
            }
            updateData.username = username.toLowerCase();
        }

        if (email) {
            // التحقق من عدم وجود email
            const existing = await usersCollection.findOne({
                email: email.toLowerCase(),
                _id: { $ne: new ObjectId(req.user.userId) }
            });
            if (existing) {
                return res.status(400).json({ error: 'البريد الإلكتروني مسجل مسبقاً' });
            }
            updateData.email = email.toLowerCase();
        }

        // التحديث
        await usersCollection.updateOne(
            { _id: new ObjectId(req.user.userId) },
            { $set: updateData }
        );

        res.json({
            success: true,
            message: 'تم تحديث البيانات بنجاح'
        });

    } catch (error) {
        console.error('Update user error:', error);
        res.status(500).json({ error: 'خطأ في التحديث' });
    }
});

/**
 * تغيير كلمة المرور
 * POST /api/auth/change-password
 * يتطلب: Authorization header
 */
router.post('/change-password', authenticate, [
    body('currentPassword').notEmpty().withMessage('كلمة المرور الحالية مطلوبة'),
    body('newPassword').isLength({ min: 8 }).withMessage('كلمة المرور الجديدة يجب أن تكون 8 أحرف على الأقل')
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ error: errors.array()[0].msg });
        }

        const { currentPassword, newPassword } = req.body;
        const db = req.app.locals.db;
        const usersCollection = db.collection('users');
        const { ObjectId } = require('mongodb');

        // جلب المستخدم
        const user = await usersCollection.findOne({
            _id: new ObjectId(req.user.userId)
        });

        // التحقق من كلمة المرور الحالية
        const isValid = await UserModel.comparePassword(currentPassword, user.password);
        if (!isValid) {
            return res.status(401).json({ error: 'كلمة المرور الحالية غير صحيحة' });
        }

        // تشفير كلمة المرور الجديدة
        const hashedPassword = await UserModel.hashPassword(newPassword);

        // التحديث
        await usersCollection.updateOne(
            { _id: new ObjectId(req.user.userId) },
            { $set: { password: hashedPassword, updatedAt: new Date() } }
        );

        res.json({
            success: true,
            message: 'تم تغيير كلمة المرور بنجاح'
        });

    } catch (error) {
        console.error('Change password error:', error);
        res.status(500).json({ error: 'خطأ في تغيير كلمة المرور' });
    }
});

module.exports = router;
