'use strict';

/**
 * Email Service Module
 * Handles sending transactional emails (verification, password reset, etc.)
 * 
 * Currently supports console logging for development.
 * For production, configure with SendGrid, Resend, or Mailgun.
 */

const EmailService = {
    // Configuration
    config: {
        provider: process.env.EMAIL_PROVIDER || 'console', // 'console', 'sendgrid', 'resend'
        apiKey: process.env.EMAIL_API_KEY || '',
        fromEmail: process.env.EMAIL_FROM_ADDRESS || 'noreply@mcprim.com',
        fromName: process.env.EMAIL_FROM_NAME || 'MC PRIME NFC'
    },

    /**
     * Send an email
     * @param {Object} options - Email options
     * @param {string} options.to - Recipient email
     * @param {string} options.subject - Email subject
     * @param {string} options.html - HTML content
     * @param {string} options.text - Plain text content (optional)
     */
    async send({ to, subject, html, text }) {
        const { provider, apiKey, fromEmail, fromName } = this.config;

        console.log(`[EmailService] Sending email to: ${to}, Subject: ${subject}`);

        switch (provider) {
            case 'sendgrid':
                return this._sendWithSendGrid({ to, subject, html, text, apiKey, fromEmail, fromName });

            case 'resend':
                return this._sendWithResend({ to, subject, html, text, apiKey, fromEmail, fromName });

            case 'console':
            default:
                return this._logToConsole({ to, subject, html, text });
        }
    },

    /**
     * Console logging (development mode)
     */
    async _logToConsole({ to, subject, html }) {
        console.log('========== EMAIL (DEV MODE) ==========');
        console.log(`To: ${to}`);
        console.log(`Subject: ${subject}`);
        console.log(`Body: ${html}`);
        console.log('=======================================');
        return { success: true, provider: 'console' };
    },

    /**
     * Send with SendGrid
     */
    async _sendWithSendGrid({ to, subject, html, text, apiKey, fromEmail, fromName }) {
        try {
            const response = await fetch('https://api.sendgrid.com/v3/mail/send', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${apiKey}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    personalizations: [{ to: [{ email: to }] }],
                    from: { email: fromEmail, name: fromName },
                    subject,
                    content: [
                        { type: 'text/plain', value: text || html.replace(/<[^>]*>/g, '') },
                        { type: 'text/html', value: html }
                    ]
                })
            });

            if (!response.ok) {
                const error = await response.text();
                console.error('[EmailService] SendGrid error:', error);
                return { success: false, error };
            }

            return { success: true, provider: 'sendgrid' };
        } catch (err) {
            console.error('[EmailService] SendGrid exception:', err);
            return { success: false, error: err.message };
        }
    },

    /**
     * Send with Resend
     */
    async _sendWithResend({ to, subject, html, apiKey, fromEmail }) {
        try {
            const response = await fetch('https://api.resend.com/emails', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${apiKey}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    from: fromEmail,
                    to: [to],
                    subject,
                    html
                })
            });

            const data = await response.json();
            if (!response.ok) {
                console.error('[EmailService] Resend error:', data);
                return { success: false, error: data };
            }

            return { success: true, provider: 'resend', id: data.id };
        } catch (err) {
            console.error('[EmailService] Resend exception:', err);
            return { success: false, error: err.message };
        }
    },

    // ========== Email Templates ==========

    /**
     * Verification Email Template
     */
    verificationEmail(userName, verifyUrl) {
        return {
            subject: 'تأكيد بريدك الإلكتروني - MC PRIME',
            html: `
                <div style="font-family: 'Tajawal', Arial, sans-serif; direction: rtl; max-width: 600px; margin: 0 auto; padding: 20px;">
                    <h2 style="color: #4DA6FF;">مرحباً ${userName}!</h2>
                    <p>شكراً لتسجيلك في MC PRIME. لتأكيد بريدك الإلكتروني، اضغط على الزر أدناه:</p>
                    <div style="text-align: center; margin: 30px 0;">
                        <a href="${verifyUrl}" style="background: linear-gradient(135deg, #4DA6FF, #00E5FF); color: white; padding: 15px 30px; border-radius: 8px; text-decoration: none; font-weight: bold;">تأكيد البريد الإلكتروني</a>
                    </div>
                    <p style="color: #888;">إذا لم تقم بإنشاء حساب، تجاهل هذا البريد.</p>
                    <hr style="border: none; border-top: 1px solid #ddd; margin: 20px 0;">
                    <p style="color: #888; font-size: 12px;">© MC PRIME NFC - بطاقات الأعمال الرقمية</p>
                </div>
            `
        };
    },

    /**
     * Password Reset Email Template
     */
    passwordResetEmail(userName, resetUrl) {
        return {
            subject: 'إعادة تعيين كلمة المرور - MC PRIME',
            html: `
                <div style="font-family: 'Tajawal', Arial, sans-serif; direction: rtl; max-width: 600px; margin: 0 auto; padding: 20px;">
                    <h2 style="color: #4DA6FF;">مرحباً ${userName}!</h2>
                    <p>تلقينا طلباً لإعادة تعيين كلمة المرور الخاصة بك. اضغط على الزر أدناه:</p>
                    <div style="text-align: center; margin: 30px 0;">
                        <a href="${resetUrl}" style="background: linear-gradient(135deg, #4DA6FF, #00E5FF); color: white; padding: 15px 30px; border-radius: 8px; text-decoration: none; font-weight: bold;">إعادة تعيين كلمة المرور</a>
                    </div>
                    <p style="color: #888;">هذا الرابط صالح لمدة ساعة واحدة فقط.</p>
                    <p style="color: #888;">إذا لم تطلب إعادة تعيين كلمة المرور، تجاهل هذا البريد.</p>
                    <hr style="border: none; border-top: 1px solid #ddd; margin: 20px 0;">
                    <p style="color: #888; font-size: 12px;">© MC PRIME NFC - بطاقات الأعمال الرقمية</p>
                </div>
            `
        };
    },
    cardRequestEmail(ownerName, requesterName, cardName, requestLink) {
        return {
            subject: 'طلب حفظ بطاقة جديد - MC PRIME',
            html: `
                <div style="font-family: 'Tajawal', Arial, sans-serif; direction: rtl; max-width: 600px; margin: 0 auto; padding: 20px;">
                    <h2 style="color: #4DA6FF;">مرحباً ${ownerName}!</h2>
                    <p>المستخدم <strong>${requesterName}</strong> يرغب في حفظ بطاقتك <strong>"${cardName}"</strong>.</p>
                    <p>يمكنك قبول أو رفض الطلب من لوحة التحكم.</p>
                    <div style="text-align: center; margin: 30px 0;">
                        <a href="${requestLink}" style="background: linear-gradient(135deg, #4DA6FF, #00E5FF); color: white; padding: 15px 30px; border-radius: 8px; text-decoration: none; font-weight: bold;">عرض الطلبات</a>
                    </div>
                    <hr style="border: none; border-top: 1px solid #ddd; margin: 20px 0;">
                    <p style="color: #888; font-size: 12px;">© MC PRIME NFC - بطاقات الأعمال الرقمية</p>
                </div>
            `
        };
    }
};

module.exports = EmailService;
