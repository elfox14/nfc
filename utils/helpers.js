const { JSDOM } = require('jsdom');
const DOMPurifyFactory = require('dompurify');

const window = (new JSDOM('')).window;
const DOMPurify = DOMPurifyFactory(window);

// قائمة بالحقول النصية التي يجب تعقيمها
const FIELDS_TO_SANITIZE = [
    'input-name', 'input-tagline',
    'input-email', 'input-website',
    'input-whatsapp', 'input-facebook', 'input-linkedin'
];

function absoluteBaseUrl(req) {
    const envBase = process.env.SITE_BASE_URL;
    if (envBase) return envBase.replace(/\/+$/, '');
    const proto = (req.headers['x-forwarded-proto'] || req.protocol || 'https');
    const host = req.get('host');
    return `${proto}://${host}`;
}

function sanitizeInputs(inputs) {
    if (!inputs) return {};
    const sanitized = { ...inputs };
    FIELDS_TO_SANITIZE.forEach(k => {
        if (sanitized[k]) {
            sanitized[k] = DOMPurify.sanitize(String(sanitized[k]));
        }
    });
    // تعقيم الحقول الديناميكية (مثل الروابط المضافة حديثًا)
    if (sanitized.dynamic && sanitized.dynamic.social) {
        sanitized.dynamic.social = sanitized.dynamic.social.map(link => ({
            ...link,
            // التأكد من أن القيمة موجودة قبل التعقيم
            value: link && link.value ? DOMPurify.sanitize(String(link.value)) : ''
        }));
    }
    // تعقيم أرقام الهواتف الديناميكية
    if (sanitized.dynamic && sanitized.dynamic.phones) {
        sanitized.dynamic.phones = sanitized.dynamic.phones.map(phone => ({
            ...phone,
            // التأكد من أن القيمة موجودة قبل التعقيم
            value: phone && phone.value ? DOMPurify.sanitize(String(phone.value)) : ''
        }));
    }
    return sanitized;
}

function assertAdmin(req, res) {
    const expected = process.env.ADMIN_TOKEN || '';
    const provided = req.headers['x-admin-token'] || '';
    if (!expected || expected !== provided) {
        res.status(401).json({ error: 'Unauthorized' });
        return false;
    }
    return true;
}

module.exports = {
    absoluteBaseUrl,
    sanitizeInputs,
    assertAdmin,
    DOMPurify // Exporting DOMPurify in case it's needed directly
};
