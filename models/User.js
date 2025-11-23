// models/User.js
const bcrypt = require('bcrypt');

/**
 * User Model (Plain Object Schema)
 * نموذج المستخدم - يستخدم مع MongoDB بشكل مباشر
 */

class UserModel {
    /**
     * إنشاء schema للمستخدم
     * @returns {Object} بنية المستخدم الأساسية
     */
    static schema() {
        return {
            username: String,      // اسم المستخدم (فريد)
            email: String,         // البريد الإلكتروني (فريد)
            password: String,      // كلمة المرور (مُشفرة)
            createdAt: Date,       // تاريخ الإنشاء
            updatedAt: Date,       // تاريخ آخر تحديث
            isActive: Boolean,     // الحساب نشط؟
            role: String          // الدور (user, admin)
        };
    }

    /**
     * تشفير كلمة المرور
     * @param {string} password - كلمة المرور النصية
     * @returns {Promise<string>} كلمة المرور المُشفرة
     */
    static async hashPassword(password) {
        const saltRounds = 10;
        return await bcrypt.hash(password, saltRounds);
    }

    /**
     * مقارنة كلمة المرور
     * @param {string} candidatePassword - كلمة المرور المُدخلة
     * @param {string} hashedPassword - كلمة المرور المُشفرة من DB
     * @returns {Promise<boolean>} هل هي متطابقة؟
     */
    static async comparePassword(candidatePassword, hashedPassword) {
        return await bcrypt.compare(candidatePassword, hashedPassword);
    }

    /**
     * التحقق من صحة البريد الإلكتروني
     * @param {string} email 
     * @returns {boolean}
     */
    static isValidEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }

    /**
     * التحقق من قوة كلمة المرور
     * @param {string} password 
     * @returns {Object} { valid: boolean, message: string }
     */
    static validatePassword(password) {
        if (!password || password.length < 8) {
            return {
                valid: false,
                message: 'كلمة المرور يجب أن تكون 8 أحرف على الأقل'
            };
        }

        if (!/[A-Z]/.test(password)) {
            return {
                valid: false,
                message: 'كلمة المرور يجب أن تحتوي على حرف كبير واحد على الأقل'
            };
        }

        if (!/[a-z]/.test(password)) {
            return {
                valid: false,
                message: 'كلمة المرور يجب أن تحتوي على حرف صغير واحد على الأقل'
            };
        }

        if (!/[0-9]/.test(password)) {
            return {
                valid: false,
                message: 'كلمة المرور يجب أن تحتوي على رقم واحد على الأقل'
            };
        }

        return { valid: true, message: 'كلمة مرور قوية' };
    }

    /**
     * تنظيف بيانات المستخدم (إزالة كلمة المرور)
     * @param {Object} user - بيانات المستخدم من DB
     * @returns {Object} بيانات آمنة للإرسال
     */
    static sanitizeUser(user) {
        if (!user) return null;

        const { password, ...safeUser } = user;
        return safeUser;
    }

    /**
     * إنشاء مستخدم جديد (helper)
     * @param {Object} data - { username, email, password }
     * @returns {Promise<Object>} مستخدم جاهز للحفظ
     */
    static async createUser(data) {
        const { username, email, password, role = 'user' } = data;

        // التحقق من البيانات
        if (!username || username.length < 3) {
            throw new Error('اسم المستخدم يجب أن يكون 3 أحرف على الأقل');
        }

        if (!this.isValidEmail(email)) {
            throw new Error('البريد الإلكتروني غير صحيح');
        }

        const passwordValidation = this.validatePassword(password);
        if (!passwordValidation.valid) {
            throw new Error(passwordValidation.message);
        }

        // تشفير كلمة المرور
        const hashedPassword = await this.hashPassword(password);

        // إرجاع المستخدم الجديد
        return {
            username: username.toLowerCase().trim(),
            email: email.toLowerCase().trim(),
            password: hashedPassword,
            createdAt: new Date(),
            updatedAt: new Date(),
            isActive: true,
            role: role
        };
    }
}

module.exports = UserModel;
