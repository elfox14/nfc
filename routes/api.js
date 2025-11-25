const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const { nanoid } = require('nanoid');
const sharp = require('sharp');
const multer = require('multer');
const { absoluteBaseUrl, sanitizeInputs, assertAdmin, DOMPurify } = require('../utils/helpers');

module.exports = function (db, upload, uploadDir, designsCollectionName, backgroundsCollectionName) {

    // Middleware لمعالجة أخطاء Multer بشكل أفضل
    function handleMulterErrors(err, req, res, next) {
        if (err instanceof multer.MulterError) {
            if (err.code === 'LIMIT_FILE_SIZE') {
                return res.status(400).json({ error: `حجم الملف كبير جدًا. الحد الأقصى ${err.field ? err.field : '10'} ميجابايت.` });
            }
            return res.status(400).json({ error: `خطأ في رفع الملف: ${err.message}` });
        } else if (err) {
            return res.status(400).json({ error: err.message || 'خطأ غير معروف أثناء الرفع.' });
        }
        next();
    }

    // --- API: رفع صورة ---
    router.post('/upload-image', upload.single('image'), handleMulterErrors, async (req, res) => {
        try {
            if (!req.file) {
                if (!res.headersSent) {
                    return res.status(400).json({ error: 'لم يتم تقديم أي ملف صورة.' });
                }
                return;
            }

            const filename = nanoid(10) + '.webp';
            const out = path.join(uploadDir, filename);
            await sharp(req.file.buffer)
                .resize({ width: 2560, height: 2560, fit: 'inside', withoutEnlargement: true })
                .webp({ quality: 85 })
                .toFile(out);

            const base = absoluteBaseUrl(req);
            return res.json({ success: true, url: `${base}/uploads/${filename}` });

        } catch (e) {
            console.error('Image upload processing error:', e);
            if (!res.headersSent) {
                return res.status(500).json({ error: 'فشل معالجة الصورة بعد الرفع.' });
            }
        }
    });

    // --- API: حفظ تصميم ---
    router.post('/save-design', async (req, res) => {
        try {
            const db = req.db;
            if (!db) return res.status(500).json({ error: 'DB not connected' });

            let data = req.body || {};

            // تطبيق التعقيم هنا قبل الحفظ
            if (data.inputs) {
                data.inputs = sanitizeInputs(data.inputs); // تعقيم المدخلات الرئيسية (تشمل الاسم والمسمى)
            }
            if (data.dynamic) {
                if (data.dynamic.phones) {
                    data.dynamic.phones = data.dynamic.phones.map(phone => ({
                        ...phone,
                        value: phone && phone.value ? DOMPurify.sanitize(String(phone.value)) : ''
                    }));
                }
                if (data.dynamic.social) {
                    data.dynamic.social = data.dynamic.social.map(link => ({
                        ...link,
                        value: link && link.value ? DOMPurify.sanitize(String(link.value)) : ''
                    }));
                }
                if (data.dynamic.staticSocial) {
                    for (const key in data.dynamic.staticSocial) {
                        if (data.dynamic.staticSocial[key] && data.dynamic.staticSocial[key].value) {
                            data.dynamic.staticSocial[key].value = DOMPurify.sanitize(String(data.dynamic.staticSocial[key].value));
                        }
                    }
                }
            }


            const shortId = nanoid(8);
            await db.collection(designsCollectionName).insertOne({ shortId, data, createdAt: new Date(), views: 0 });
            res.json({ success: true, id: shortId });
        } catch (e) {
            console.error('Save design error:', e);
            if (!res.headersSent) {
                res.status(500).json({ error: 'Save failed' });
            }
        }
    });

    // --- API: جلب تصميم ---
    router.get('/get-design/:id', async (req, res) => {
        try {
            const db = req.db;
            if (!db) return res.status(500).json({ error: 'DB not connected' });
            const id = String(req.params.id);
            const doc = await db.collection(designsCollectionName).findOne({ shortId: id });
            if (!doc || !doc.data) return res.status(404).json({ error: 'Design not found or data missing' });

            res.json(doc.data);
        } catch (e) {
            console.error('Get design error:', e);
            if (!res.headersSent) {
                res.status(500).json({ error: 'Fetch failed' });
            }
        }
    });

    // --- API: المعرض (أحدث التصاميم) ---
    router.get('/gallery', async (req, res) => {
        try {
            const db = req.db;
            if (!db) return res.status(500).json({ error: 'DB not connected' });

            // 1. Pagination
            const page = parseInt(req.query.page || '1', 10);
            const limit = 12; // 12 تصميم في الصفحة (يناسب 4 أعمدة)
            const skip = (page - 1) * limit;

            // 2. Sorting
            const sortBy = String(req.query.sortBy || 'createdAt');
            const sortQuery = {};
            if (sortBy === 'views') {
                sortQuery.views = -1; // فرز حسب المشاهدات (الأكثر أولاً)
            } else {
                sortQuery.createdAt = -1; // الافتراضي: فرز حسب تاريخ الإنشاء (الأحدث أولاً)
            }

            // 3. Filtering & Search
            const findQuery = {
                // ضمان وجود صورة مصغرة
                'data.imageUrls.capturedFront': { $exists: true, $ne: null }
            };

            // إضافة منطق البحث
            const searchQuery = req.query.search;
            if (searchQuery) {
                findQuery.$or = [
                    { 'data.inputs.input-name': { $regex: searchQuery, $options: 'i' } },
                    { 'data.inputs.input-tagline': { $regex: searchQuery, $options: 'i' } }
                ];
            }

            // جلب العدد الإجمالي للمستندات المطابقة للفلترة (مهم لـ Pagination)
            const totalDocs = await db.collection(designsCollectionName).countDocuments(findQuery);
            const totalPages = Math.ceil(totalDocs / limit);

            const docs = await db.collection(designsCollectionName)
                .find(findQuery) // تطبيق الفلترة والبحث
                .sort(sortQuery) // تطبيق الفرز
                .skip(skip)   // تطبيق Pagination
                .limit(limit) // تطبيق Pagination
                .project({ // إرسال البيانات المطلوبة فقط
                    shortId: 1,
                    'data.inputs.input-name': 1,
                    'data.inputs.input-tagline': 1,
                    'data.imageUrls.capturedFront': 1, // الصورة المصغرة الحقيقية
                    'data.imageUrls.front': 1, // صورة احتياطية
                    createdAt: 1,
                    views: 1
                })
                .toArray();

            // إرسال الرد مع بيانات الـ Pagination
            res.json({
                success: true,
                designs: docs,
                pagination: {
                    page,
                    limit,
                    totalDocs,
                    totalPages
                }
            });
        } catch (e) {
            console.error('Fetch gallery error:', e);
            if (!res.headersSent) {
                res.status(500).json({ error: 'Fetch failed', success: false });
            }
        }
    });

    // --- API: خلفيات (إدارة) ---
    router.post('/upload-background', upload.single('image'), handleMulterErrors, async (req, res) => {
        try {
            if (!assertAdmin(req, res)) return;
            if (!req.file) {
                if (!res.headersSent) {
                    return res.status(400).json({ error: 'لم يتم تقديم أي ملف صورة.' });
                }
                return;
            }
            const db = req.db;
            if (!db) return res.status(500).json({ error: 'DB not connected' });

            const filename = 'bg_' + nanoid(10) + '.webp';
            const out = path.join(uploadDir, filename);
            await sharp(req.file.buffer)
                .resize({ width: 3840, height: 3840, fit: 'inside', withoutEnlargement: true })
                .webp({ quality: 88 })
                .toFile(out);

            const base = absoluteBaseUrl(req);

            const payload = {
                shortId: nanoid(8),
                url: `${base}/uploads/${filename}`,
                name: DOMPurify.sanitize(String(req.body.name || 'خلفية')),
                category: DOMPurify.sanitize(String(req.body.category || 'عام')),
                createdAt: new Date()
            };
            await db.collection(backgroundsCollectionName).insertOne(payload);
            res.json({ success: true, background: payload });
        } catch (e) {
            console.error('Upload background error:', e);
            if (!res.headersSent) {
                res.status(500).json({ error: 'Upload background failed' });
            }
        }
    });

    // --- API: جلب الخلفيات ---
    router.get('/gallery/backgrounds', async (req, res) => {
        try {
            const db = req.db;
            if (!db) return res.status(500).json({ error: 'DB not connected' });
            const category = req.query.category;
            const page = Math.max(1, parseInt(req.query.page || '1', 10));
            const limit = Math.max(1, Math.min(100, parseInt(req.query.limit || '50', 10)));
            const skip = (page - 1) * limit;
            const q = (category && category !== 'all') ? { category: String(category) } : {};
            const coll = db.collection(backgroundsCollectionName);
            const [items, total] = await Promise.all([
                coll.find(q).sort({ createdAt: -1 }).skip(skip).limit(limit).toArray(),
                coll.countDocuments(q)
            ]);
            res.json({ success: true, items, page, limit, total, totalPages: Math.ceil(total / limit) });
        } catch (e) {
            console.error('Fetch backgrounds error:', e);
            if (!res.headersSent) {
                res.status(500).json({ error: 'Fetch backgrounds failed' });
            }
        }
    });

    // --- API: حذف خلفية ---
    router.delete('/backgrounds/:shortId', async (req, res) => {
        try {
            if (!assertAdmin(req, res)) return;
            const db = req.db;
            if (!db) return res.status(500).json({ error: 'DB not connected' });
            const shortId = String(req.params.shortId);
            const coll = db.collection(backgroundsCollectionName);
            const doc = await coll.findOne({ shortId });
            if (!doc) return res.status(404).json({ error: 'Not found' });

            // حذف الملف المرتبط إذا كان موجودًا
            if (doc.url) {
                try {
                    const urlParts = doc.url.split('/');
                    const filename = urlParts[urlParts.length - 1];
                    if (filename) {
                        const filePath = path.join(uploadDir, filename);
                        if (fs.existsSync(filePath)) {
                            fs.unlinkSync(filePath);
                            console.log(`Deleted file: ${filePath}`);
                        } else {
                            console.warn(`File not found for deletion: ${filePath}`);
                        }
                    }
                } catch (fileError) {
                    console.error(`Error deleting file for background ${shortId}:`, fileError);
                }
            }

            await coll.deleteOne({ shortId });
            res.json({ success: true });
        } catch (e) {
            console.error('Delete background error:', e);
            if (!res.headersSent) {
                res.status(500).json({ error: 'Delete failed' });
            }
        }
    });

    // --- نقطة نهاية بسيطة للتحقق من صحة الخدمة ---
    router.get('/healthz', (req, res) => {
        const db = req.db;
        if (db && db.client.topology && db.client.topology.isConnected()) {
            res.json({ ok: true, db_status: 'connected' });
        } else {
            res.status(500).json({ ok: false, db_status: 'disconnected' });
        }
    });

    return router;
};
