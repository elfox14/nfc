const express = require('express');
const multer = require('multer');
const sharp = require('sharp');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { nanoid } = require('nanoid');
const EmailService = require('../email-service');
const verifyToken = require('../auth-middleware');
const rateLimit = require('express-rate-limit');

const uploadDir = path.join(__dirname, '..', 'uploads');

module.exports = function createDesignsRouter({ 
  getDb, 
  designsCollectionName, 
  usersCollectionName, 
  cardRequestsCollectionName, savedCardsCollectionName,
  absoluteBaseUrl
}) {
  const router = express.Router();

const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (file.mimetype && file.mimetype.startsWith('image/')) {
      const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
      if (allowedTypes.includes(file.mimetype)) {
        cb(null, true);
      } else {
        cb(new Error('نوع الصورة غير مدعوم.'), false);
      }
    } else {
      cb(new Error('الرجاء رفع ملف صورة.'), false);
    }
  }
});

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


router.post('/upload-image', verifyToken, upload.single('image'), handleMulterErrors, async (req, res) => {
  try {
    if (!req.file) {
      if (!res.headersSent) {
        return res.status(400).json({ error: 'لم يتم تقديم أي ملف صورة.' });
      }
      return;
    }

    // Process image with sharp
    const processedBuffer = await sharp(req.file.buffer)
      .resize({ width: 2560, height: 2560, fit: 'inside', withoutEnlargement: true })
      .webp({ quality: 85 })
      .toBuffer();

    // Determine if we should overwrite an existing image
    // Valid purposes: logo, photo, front_bg, back_bg, qr, capturedFront, capturedBack
    const purpose = req.body.purpose;
    const userId = req.user.userId;
    const validPurposes = ['logo', 'photo', 'front_bg', 'back_bg', 'qr', 'capturedFront', 'capturedBack'];
    const shouldOverwrite = purpose && validPurposes.includes(purpose) && userId;
    const deterministicId = shouldOverwrite ? `mcprim/user_${userId}_${purpose}` : null;

    if (shouldOverwrite) {
      console.log(`[Upload] Overwrite mode: public_id=${deterministicId}`);
    }

    // Phase 1: Try External Upload (Priority 1)
    if (process.env.EXTERNAL_UPLOAD_URL) {
      try {
        const formData = new FormData();
        const blob = new Blob([processedBuffer], { type: 'image/webp' });
        formData.append('image', blob, 'image.webp');
        if (process.env.UPLOAD_SECRET) {
          formData.append('secret', process.env.UPLOAD_SECRET);
        }
        // Pass deterministic ID for overwrite support
        if (deterministicId) {
          formData.append('overwrite_id', `user_${userId}_${purpose}`);
        }

        const externalResponse = await fetch(process.env.EXTERNAL_UPLOAD_URL, {
          method: 'POST',
          body: formData
        });

        if (externalResponse.ok) {
          const result = await externalResponse.json();
          if (result.success && result.url) {
            // Append cache-bust for overwritten images
            let finalUrl = result.url;
            if (deterministicId) {
              const separator = finalUrl.includes('?') ? '&' : '?';
              finalUrl = `${finalUrl}${separator}v=${Date.now()}`;
            }
            console.log('[Upload] Image uploaded to external server:', finalUrl);
            return res.json({ success: true, url: finalUrl, external: true });
          }
        }
        console.warn('[Upload] External upload returned error status:', externalResponse.status);
      } catch (externalErr) {
        console.warn('[Upload] External upload failed, falling back to Cloudinary:', externalErr.message);
      }
    }

    // Phase 2: Try Cloudinary (Priority 2)
    if (process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY && process.env.CLOUDINARY_API_SECRET) {
      try {
        const cloudinaryOptions = {
          resource_type: 'image',
          format: 'webp'
        };

        if (deterministicId) {
          // Use deterministic public_id to overwrite existing image
          cloudinaryOptions.public_id = deterministicId;
          cloudinaryOptions.overwrite = true;
          cloudinaryOptions.invalidate = true; // Invalidate CDN cache
        } else {
          cloudinaryOptions.folder = 'mcprim';
        }

        const result = await new Promise((resolve, reject) => {
          const uploadStream = cloudinary.uploader.upload_stream(
            cloudinaryOptions,
            (error, result) => {
              if (error) reject(error);
              else resolve(result);
            }
          );
          uploadStream.end(processedBuffer);
        });

        // Append version/timestamp to URL to bust CDN cache
        let imageUrl = result.secure_url;
        if (deterministicId) {
          const separator = imageUrl.includes('?') ? '&' : '?';
          imageUrl = `${imageUrl}${separator}v=${result.version || Date.now()}`;
        }

        console.log('[Upload] Image uploaded to Cloudinary:', imageUrl);
        return res.json({
          success: true,
          url: imageUrl,
          cloud: true
        });
      } catch (cloudErr) {
        console.warn('[Upload] Cloudinary upload failed, falling back to local:', cloudErr.message);
      }
    }

    // fallback: Local storage (Ephemeral/Development)
    // For local storage with overwrite: use deterministic filename
    const filename = deterministicId
      ? `user_${userId}_${purpose}.webp`
      : nanoid(10) + '.webp';
    const out = path.join(uploadDir, filename);
    await fs.promises.writeFile(out, processedBuffer);

    const base = absoluteBaseUrl(req);
    console.log('[Upload] Image saved locally (Fallback):', filename);

    return res.json({
      success: true,
      url: `${base}/uploads/${filename}?v=${Date.now()}`,
      local: true
    });

  } catch (e) {
    console.error('Image upload processing error:', e);
    if (!res.headersSent) {
      return res.status(500).json({ error: 'فشل معالجة الصورة بعد الرفع.' });
    }
  }
});

// === PUBLIC UPLOAD PROXY (for unauthenticated users editing cards) ===
// Rate-limited strictly to prevent abuse — no auth required
const publicUploadLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20, // 20 uploads per 15 minutes per IP
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'محاولات رفع كثيرة. حاول مرة أخرى لاحقاً. / Too many uploads. Try again later.' }
});

router.post('/upload-image-public', publicUploadLimiter, upload.single('image'), handleMulterErrors, async (req, res) => {
  try {
    if (!req.file) {
      if (!res.headersSent) {
        return res.status(400).json({ error: 'لم يتم تقديم أي ملف صورة.' });
      }
      return;
    }

    // Process image with sharp (same as authenticated route)
    const processedBuffer = await sharp(req.file.buffer)
      .resize({ width: 2560, height: 2560, fit: 'inside', withoutEnlargement: true })
      .webp({ quality: 85 })
      .toBuffer();

    // No deterministic IDs for public uploads (no overwrite support)
    // Phase 1: Try External Upload
    if (process.env.EXTERNAL_UPLOAD_URL) {
      try {
        const formData = new FormData();
        const blob = new Blob([processedBuffer], { type: 'image/webp' });
        formData.append('image', blob, 'image.webp');
        if (process.env.UPLOAD_SECRET) {
          formData.append('secret', process.env.UPLOAD_SECRET);
        }

        const externalResponse = await fetch(process.env.EXTERNAL_UPLOAD_URL, {
          method: 'POST',
          body: formData
        });

        if (externalResponse.ok) {
          const result = await externalResponse.json();
          if (result.success && result.url) {
            console.log('[PublicUpload] Image uploaded to external server:', result.url);
            return res.json({ success: true, url: result.url, external: true });
          }
        }
        console.warn('[PublicUpload] External upload returned error status:', externalResponse.status);
      } catch (externalErr) {
        console.warn('[PublicUpload] External upload failed, falling back:', externalErr.message);
      }
    }

    // Phase 2: Try Cloudinary
    if (process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY && process.env.CLOUDINARY_API_SECRET) {
      try {
        const result = await new Promise((resolve, reject) => {
          const uploadStream = cloudinary.uploader.upload_stream(
            { resource_type: 'image', format: 'webp', folder: 'mcprim' },
            (error, result) => { if (error) reject(error); else resolve(result); }
          );
          uploadStream.end(processedBuffer);
        });
        console.log('[PublicUpload] Image uploaded to Cloudinary:', result.secure_url);
        return res.json({ success: true, url: result.secure_url, cloud: true });
      } catch (cloudErr) {
        console.warn('[PublicUpload] Cloudinary upload failed, falling back to local:', cloudErr.message);
      }
    }

    // Phase 3: Local fallback
    const filename = nanoid(10) + '.webp';
    const out = path.join(uploadDir, filename);
    await fs.promises.writeFile(out, processedBuffer);
    const base = absoluteBaseUrl(req);
    console.log('[PublicUpload] Image saved locally:', filename);
    return res.json({ success: true, url: `${base}/uploads/${filename}?v=${Date.now()}`, local: true });

  } catch (e) {
    console.error('Public image upload error:', e);
    if (!res.headersSent) {
      return res.status(500).json({ error: 'فشل معالجة الصورة.' });
    }
  }
});

router.post('/save-design', verifyToken, async (req, res) => {
  try {
    if (!getDb()) return res.status(500).json({ error: 'DB not connected' });
    let data = req.body || {};
    if (data.inputs) data.inputs = sanitizeInputs(data.inputs);
    if (data.dynamic) {
      if (data.dynamic.phones) {
        data.dynamic.phones = data.dynamic.phones.map(phone => ({ ...phone, value: phone && phone.value ? DOMPurify.sanitize(String(phone.value)) : '' }));
      }
      if (data.dynamic.social) {
        data.dynamic.social = data.dynamic.social.map(link => ({ ...link, value: link && link.value ? DOMPurify.sanitize(String(link.value)) : '' }));
      }
      if (data.dynamic.staticSocial) {
        for (const key in data.dynamic.staticSocial) {
          if (data.dynamic.staticSocial[key] && data.dynamic.staticSocial[key].value) {
            data.dynamic.staticSocial[key].value = DOMPurify.sanitize(String(data.dynamic.staticSocial[key].value));
          }
        }
      }
    }
    const existingId = req.query.id;
    let shortId = existingId || nanoid(8);
    let isUpdate = false;

    // Retrieve ownerId from authenticated session via verifyToken
    let ownerId = req.user.userId;

    // Soft limit: unverified users can only save up to 3 designs
    const UNVERIFIED_DESIGN_LIMIT = 3;
    const user = await getDb().collection(usersCollectionName).findOne({ userId: ownerId });
    if (user && !user.isVerified && !existingId) {
      const designCount = await getDb().collection(designsCollectionName).countDocuments({ ownerId });
      if (designCount >= UNVERIFIED_DESIGN_LIMIT) {
        return res.status(403).json({ 
          error: user.email ? 
            'يرجى تأكيد بريدك الإلكتروني لحفظ المزيد من التصاميم' : 
            'Please verify your email to save more designs',
          code: 'EMAIL_NOT_VERIFIED'
        });
      }
    }

    if (existingId) {
      const existingDesign = await getDb().collection(designsCollectionName).findOne({ shortId: existingId });
      if (existingDesign) {
        if (existingDesign.ownerId && existingDesign.ownerId !== ownerId) {
          shortId = nanoid(8);
          isUpdate = false;
        } else {
          isUpdate = true;
        }
      } else {
        shortId = nanoid(8);
        isUpdate = false;
      }
    }

    if (isUpdate) {
      // Preserve captured card images during auto-save (which doesn't capture images)
      const existingDoc = await getDb().collection(designsCollectionName).findOne({ shortId: shortId });
      if (existingDoc?.data?.imageUrls) {
        if (!data.imageUrls) data.imageUrls = {};
        const existing = existingDoc.data.imageUrls;
        // If update has no captured images, keep existing ones
        if (!data.imageUrls.capturedFront && existing.capturedFront) {
          data.imageUrls.capturedFront = existing.capturedFront;
        }
        if (!data.imageUrls.capturedBack && existing.capturedBack) {
          data.imageUrls.capturedBack = existing.capturedBack;
        }
      }
    }

    const updateDoc = {
      data,
      lastModified: new Date()
    };
    if (ownerId && !isUpdate) updateDoc.ownerId = ownerId;
    if (ownerId && isUpdate) updateDoc.ownerId = ownerId;

    if (isUpdate) {
      await getDb().collection(designsCollectionName).updateOne(
        { shortId: shortId },
        { $set: updateDoc }
      );
    } else {
      // If user already has a design, update it instead of failing
      if (ownerId) {
        const searchQuery = existingId ? { shortId: existingId, ownerId } : { ownerId };
        const existingDesign = await getDb().collection(designsCollectionName).findOne(searchQuery);
        if (existingDesign) {
          shortId = existingDesign.shortId;
          isUpdate = true;
          // Preserve existing captured images if not re-capturing now
          if (existingDesign.data?.imageUrls) {
            if (!data.imageUrls) data.imageUrls = {};
            const existing = existingDesign.data.imageUrls;
            if (!data.imageUrls.capturedFront && existing.capturedFront) {
              data.imageUrls.capturedFront = existing.capturedFront;
            }
            if (!data.imageUrls.capturedBack && existing.capturedBack) {
              data.imageUrls.capturedBack = existing.capturedBack;
            }
          }
          const updateExisting = { data, ownerId, lastModified: new Date() };
          await getDb().collection(designsCollectionName).updateOne(
            { shortId: shortId },
            { $set: updateExisting }
          );
          return res.json({ success: true, id: shortId });
        }
      }

      await getDb().collection(designsCollectionName).insertOne({
        shortId,
        ...updateDoc,
        createdAt: new Date(),
        views: 0
      });
    }

    res.json({ success: true, id: shortId });
  } catch (e) {
    console.error('Save design error:', e);
    if (!res.headersSent) {
      res.status(500).json({ error: 'Save failed' });
    }
  }
});

// PATCH element property
router.patch('/design/:id/element/:elementId', verifyToken, async (req, res) => {
  try {
    if (!getDb()) return res.status(500).json({ error: 'DB not connected' });
    const { id, elementId } = req.params;
    const updates = req.body;

    // Whitelist of allowed properties
    const allowedKeys = ['position', 'fontSize', 'color', 'content', 'width', 'height', 'rotation', 'opacity', 'zIndex', 'display', 'text', 'src', 'url'];
    const filteredUpdates = {};
    Object.keys(updates).forEach(key => {
      if (allowedKeys.includes(key)) {
        filteredUpdates[key] = updates[key];
      }
    });

    if (Object.keys(filteredUpdates).length === 0) {
      return res.status(400).json({ error: 'No valid properties to update' });
    }

    const updatePayload = {};
    for (const key in filteredUpdates) {
      updatePayload[`data.elements.$.${key}`] = filteredUpdates[key];
    }

    // Try primary structure (data.elements)
    let result = await getDb().collection(designsCollectionName).updateOne(
      { shortId: id, 'data.elements.id': elementId, ownerId: req.user.userId },
      { $set: updatePayload }
    );

    // Fallback for legacy or test structures
    if (result.matchedCount === 0) {
      const fallbackPayload = {};
      for (const key in filteredUpdates) {
        fallbackPayload[`elements.$.${key}`] = filteredUpdates[key];
      }
      result = await getDb().collection(designsCollectionName).updateOne(
        { shortId: id, 'elements.id': elementId, ownerId: req.user.userId },
        { $set: fallbackPayload }
      );
    }

    if (result.matchedCount === 0) {
      return res.status(404).json({ error: 'Design or element not found or unauthorized' });
    }

    console.log(`[PatchElement] Element ${elementId} updated in design ${id}`);
    res.json({ success: true, message: 'Element updated successfully' });

  } catch (err) {
    console.error('Patch element error:', err);
    res.status(500).json({ error: 'Failed to update element' });
  }
});


// Get User Profile/Designs
router.get('/user/designs', verifyToken, async (req, res) => {
  try {
    if (!getDb()) return res.status(500).json({ error: 'DB not connected' });

    const designs = await getDb().collection(designsCollectionName)
      .find({ ownerId: req.user.userId })
      .project({
        'data.inputs.input-name_ar': 1,
        'data.inputs.input-name_en': 1,
        'data.inputs.input-name': 1,
        'shortId': 1,
        'createdAt': 1,
        'views': 1,
        'data.imageUrls.front': 1,
        'data.imageUrls.capturedFront': 1
      })
      .sort({ createdAt: -1 })
      .toArray();

    res.json({ success: true, designs });
  } catch (err) {
    console.error('Get user designs error:', err);
    res.status(500).json({ error: 'Failed to fetch designs' });
  }
});

// Delete a user's design
router.delete('/user/designs/:id', verifyToken, async (req, res) => {
  try {
    if (!getDb()) return res.status(500).json({ error: 'DB not connected' });

    const shortId = String(req.params.id);
    const design = await getDb().collection(designsCollectionName).findOne({ shortId });

    if (!design) {
      return res.status(404).json({ error: 'التصميم غير موجود / Design not found' });
    }

    if (design.ownerId !== req.user.userId) {
      return res.status(403).json({ error: 'لا يمكنك حذف هذا التصميم / You cannot delete this design' });
    }

    await getDb().collection(designsCollectionName).deleteOne({ shortId });

    res.json({ success: true, message: 'تم حذف التصميم بنجاح / Design deleted successfully' });
  } catch (err) {
    console.error('Delete design error:', err);
    res.status(500).json({ error: 'فشل حذف التصميم / Failed to delete design' });
  }
});

// ===== CARD SAVE WITH CONSENT FEATURE =====

// Get card privacy setting
router.get('/card-privacy', verifyToken, async (req, res) => {
  try {
    if (!getDb()) return res.status(500).json({ error: 'DB not connected' });
    const user = await getDb().collection(usersCollectionName).findOne(
      { userId: req.user.userId },
      { projection: { cardPrivacy: 1 } }
    );
    res.json({ success: true, cardPrivacy: user?.cardPrivacy || 'require_approval' });
  } catch (err) {
    console.error('Get card privacy error:', err);
    res.status(500).json({ error: 'Failed to get privacy setting' });
  }
});

// Update card privacy setting
router.put('/card-privacy', verifyToken, async (req, res) => {
  try {
    if (!getDb()) return res.status(500).json({ error: 'DB not connected' });
    const { cardPrivacy } = req.body;
    if (!['allow_all', 'require_approval', 'deny_all'].includes(cardPrivacy)) {
      return res.status(400).json({ error: 'Invalid privacy setting' });
    }
    await getDb().collection(usersCollectionName).updateOne(
      { userId: req.user.userId },
      { $set: { cardPrivacy } }
    );
    res.json({ success: true });
  } catch (err) {
    console.error('Update card privacy error:', err);
    res.status(500).json({ error: 'Failed to update privacy setting' });
  }
});

// Request to save someone's card
router.post('/save-card/:designId', verifyToken, async (req, res) => {
  try {
    if (!getDb()) return res.status(500).json({ error: 'DB not connected' });
    const designId = String(req.params.designId);
    const requesterId = req.user.userId;

    // Find the design
    const design = await getDb().collection(designsCollectionName).findOne({ shortId: designId });
    if (!design) return res.status(404).json({ error: 'Design not found' });

    // Can't save your own card
    if (design.ownerId === requesterId) {
      return res.status(400).json({ error: 'Cannot save your own card' });
    }

    // Check if already saved
    const existing = await getDb().collection(savedCardsCollectionName).findOne({
      userId: requesterId, designShortId: designId
    });
    if (existing) return res.json({ success: true, status: 'already_saved' });

    // Check if request already pending
    const pendingRequest = await getDb().collection(cardRequestsCollectionName).findOne({
      requesterId, designShortId: designId, status: 'pending'
    });
    if (pendingRequest) return res.json({ success: true, status: 'already_requested' });

    // Get owner's privacy setting
    let ownerPrivacy = 'require_approval';
    let owner = null;
    if (design.ownerId) {
      owner = await getDb().collection(usersCollectionName).findOne(
        { userId: design.ownerId },
        { projection: { cardPrivacy: 1, email: 1, name: 1 } }
      );
      ownerPrivacy = owner?.cardPrivacy || 'require_approval';
    }

    // Get requester info
    const requester = await getDb().collection(usersCollectionName).findOne(
      { userId: requesterId },
      { projection: { name: 1, email: 1 } }
    );

    const cardName = design.data?.inputs?.['input-name_ar'] || design.data?.inputs?.['input-name_en'] || 'بطاقة';

    if (ownerPrivacy === 'deny_all') {
      return res.status(403).json({ error: 'Card owner does not allow saving', status: 'denied' });
    }

    if (ownerPrivacy === 'allow_all' || !design.ownerId) {
      // Save directly
      await getDb().collection(savedCardsCollectionName).insertOne({
        userId: requesterId,
        designShortId: designId,
        ownerName: cardName,
        cardThumb: design.data?.imageUrls?.front || null,
        savedAt: new Date()
      });
      return res.json({ success: true, status: 'saved' });
    }

    // require_approval: create a request
    await getDb().collection(cardRequestsCollectionName).insertOne({
      requesterId,
      requesterName: requester?.name || 'مستخدم',
      requesterEmail: requester?.email || '',
      designShortId: designId,
      cardName,
      cardThumb: design.data?.imageUrls?.front || null,
      ownerUserId: design.ownerId,
      status: 'pending',
      createdAt: new Date()
    });

    // Send email notification to owner
    if (owner && owner.email) {
      const link = 'https://mcprim.com/nfc/dashboard.html?tab=card-requests'; // Or dynamic host
      const emailContent = EmailService.cardRequestEmail(
        owner.name || 'مستخدم',
        requester?.name || 'مستخدم',
        cardName,
        link
      );
      // Fire and forget (don't await to avoid delaying response)
      EmailService.send({
        to: owner.email,
        subject: emailContent.subject,
        html: emailContent.html
      }).catch(err => console.error('Failed to send request email:', err));
    }

    res.json({ success: true, status: 'requested' });
  } catch (err) {
    console.error('Save card error:', err);
    res.status(500).json({ error: 'Failed to process save request' });
  }
});

// Get user's saved cards
router.get('/saved-cards', verifyToken, async (req, res) => {
  try {
    if (!getDb()) return res.status(500).json({ error: 'DB not connected' });
    const savedCards = await getDb().collection(savedCardsCollectionName)
      .find({ userId: req.user.userId })
      .sort({ savedAt: -1 })
      .toArray();
    res.json({ success: true, savedCards });
  } catch (err) {
    console.error('Get saved cards error:', err);
    res.status(500).json({ error: 'Failed to fetch saved cards' });
  }
});

// Remove a saved card
router.delete('/saved-cards/:designId', verifyToken, async (req, res) => {
  try {
    if (!getDb()) return res.status(500).json({ error: 'DB not connected' });
    await getDb().collection(savedCardsCollectionName).deleteOne({
      userId: req.user.userId,
      designShortId: String(req.params.designId)
    });
    res.json({ success: true });
  } catch (err) {
    console.error('Delete saved card error:', err);
    res.status(500).json({ error: 'Failed to remove saved card' });
  }
});

// Get pending card requests count (for badge)
router.get('/card-requests/count', verifyToken, async (req, res) => {
  try {
    if (!getDb()) return res.status(500).json({ error: 'DB not connected' });
    const count = await getDb().collection(cardRequestsCollectionName).countDocuments({
      ownerUserId: req.user.userId,
      status: 'pending'
    });
    res.json({ success: true, count });
  } catch (err) {
    console.error('Get card requests count error:', err);
    res.status(500).json({ error: 'Failed to get request count' });
  }
});

// Get card requests for card owner
router.get('/card-requests', verifyToken, async (req, res) => {
  try {
    if (!getDb()) return res.status(500).json({ error: 'DB not connected' });
    const requests = await getDb().collection(cardRequestsCollectionName)
      .find({ ownerUserId: req.user.userId })
      .sort({ createdAt: -1 })
      .toArray();
    res.json({ success: true, requests });
  } catch (err) {
    console.error('Get card requests error:', err);
    res.status(500).json({ error: 'Failed to fetch requests' });
  }
});

// Approve or reject a card request
router.put('/card-requests/:requestId', verifyToken, async (req, res) => {
  try {
    if (!getDb()) return res.status(500).json({ error: 'DB not connected' });
    const { ObjectId } = require('mongodb');
    const requestId = req.params.requestId;
    const { action } = req.body; // 'approve' or 'reject'

    if (!['approve', 'reject'].includes(action)) {
      return res.status(400).json({ error: 'Invalid action' });
    }

    const request = await getDb().collection(cardRequestsCollectionName).findOne({
      _id: new ObjectId(requestId),
      ownerUserId: req.user.userId
    });

    if (!request) return res.status(404).json({ error: 'Request not found' });
    if (request.status !== 'pending') return res.status(400).json({ error: 'Request already processed' });

    // Update request status
    await getDb().collection(cardRequestsCollectionName).updateOne(
      { _id: new ObjectId(requestId) },
      { $set: { status: action === 'approve' ? 'approved' : 'rejected', processedAt: new Date() } }
    );

    // If approved, add to saved cards
    if (action === 'approve') {
      try {
        await getDb().collection(savedCardsCollectionName).insertOne({
          userId: request.requesterId,
          designShortId: request.designShortId,
          ownerName: request.cardName,
          cardThumb: request.cardThumb,
          savedAt: new Date()
        });
      } catch (dupErr) {
        // Already saved, ignore duplicate key error
        if (dupErr.code !== 11000) throw dupErr;
      }
    }

    res.json({ success: true });
  } catch (err) {
    console.error('Process card request error:', err);
    res.status(500).json({ error: 'Failed to process request' });
  }
});

// Get design owner info (for viewer save button)
router.get('/design-owner/:designId', async (req, res) => {
  try {
    if (!getDb()) return res.status(500).json({ error: 'DB not connected' });
    const designId = String(req.params.designId);
    const design = await getDb().collection(designsCollectionName).findOne(
      { shortId: designId },
      { projection: { ownerId: 1 } }
    );
    if (!design) return res.status(404).json({ error: 'Design not found' });

    let cardPrivacy = 'require_approval';
    if (design.ownerId) {
      const owner = await getDb().collection(usersCollectionName).findOne(
        { userId: design.ownerId },
        { projection: { cardPrivacy: 1 } }
      );
      cardPrivacy = owner?.cardPrivacy || 'require_approval';
    }

    res.json({
      success: true,
      ownerId: design.ownerId || null,
      cardPrivacy
    });
  } catch (err) {
    console.error('Get design owner error:', err);
    res.status(500).json({ error: 'Failed to get design info' });
  }
});

router.get('/get-design/:id', async (req, res) => {
  try {
    if (!getDb()) return res.status(500).json({ error: 'DB not connected' });
    const id = String(req.params.id);
    const { ObjectId } = require('mongodb');
    
    // 1. Try to find by shortId first
    let doc = await getDb().collection(designsCollectionName).findOne({ shortId: id });
    
    // 2. Fallback: Try to find by ObjectId if 1 fails and it's a valid hex string
    if (!doc && id.length === 24 && /^[0-9a-fA-F]+$/.test(id)) {
      try {
        doc = await getDb().collection(designsCollectionName).findOne({ _id: new ObjectId(id) });
        if (doc) console.log(`[API] Design found using fallback ObjectId: ${id}`);
      } catch (err) {
        // Not a valid ObjectId even if it's 24 chars
      }
    }

    if (!doc || !doc.data) {
      console.warn(`[API] Design not found for ID: ${id}`);
      return res.status(404).json({ error: 'Design not found or data missing' });
    }

    console.log(`[API] Design found for ID: ${id}. Returning data.`);
    res.json(doc.data);
  } catch (e) {
    console.error('Get design error:', e);
    if (!res.headersSent) {
      res.status(500).json({ error: 'Fetch failed' });
    }
  }
});

// Get Card Statistics
// SECURITY: Card stats require authentication and ownership verification
router.get('/card-stats/:id', verifyToken, async (req, res) => {
  try {
    if (!getDb()) return res.status(500).json({ error: 'DB not connected' });
    const id = String(req.params.id);
    const doc = await getDb().collection(designsCollectionName).findOne(
      { shortId: id },
      { projection: { views: 1, createdAt: 1, lastModified: 1, shortId: 1, ownerId: 1 } }
    );

    if (!doc) return res.status(404).json({ error: 'Design not found' });

    // Verify ownership — only the card owner can see detailed stats
    if (doc.ownerId && doc.ownerId !== req.user.userId) {
      return res.status(403).json({ error: 'Access denied: you do not own this design' });
    }

    res.json({
      success: true,
      stats: {
        id: doc.shortId,
        views: doc.views || 0,
        createdAt: doc.createdAt,
        lastModified: doc.lastModified
      }
    });
  } catch (e) {
    console.error('Get card stats error:', e);
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
});

// START: NEW GALLERY API ENDPOINT
router.get('/gallery', async (req, res) => {
  try {
    if (!getDb()) return res.status(500).json({ error: 'Database not connected' });

    const page = parseInt(req.query.page, 10) || 1;
    const limit = 20; // 5 columns * 4 rows
    const skip = (page - 1) * limit;
    const sortBy = req.query.sortBy || 'createdAt';
    const searchTerm = req.query.search ? String(req.query.search).trim() : '';

    // Build search query - only show designs shared to gallery
    const query = { 'data.sharedToGallery': true };
    if (searchTerm) {
      const escaped = searchTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const regex = new RegExp(escaped, 'i'); // Case-insensitive search (escaped)
      query['$or'] = [
        { 'data.inputs.input-name_ar': regex },
        { 'data.inputs.input-name_en': regex },
        { 'data.inputs.input-tagline_ar': regex },
        { 'data.inputs.input-tagline_en': regex }
      ];
    }

    // Build sort options
    const sortOptions = {};
    if (sortBy === 'views') {
      sortOptions.views = -1; // Descending
    } else {
      sortOptions.createdAt = -1; // Default to newest
    }

    // Get total count for pagination
    const totalDesigns = await getDb().collection(designsCollectionName).countDocuments(query);
    const totalPages = Math.ceil(totalDesigns / limit);

    // Fetch paginated designs with projection
    const designs = await getDb().collection(designsCollectionName)
      .find(query)
      .project({
        'data.inputs.input-name_ar': 1,
        'data.inputs.input-name_en': 1,
        'data.inputs.input-tagline_ar': 1,
        'data.inputs.input-tagline_en': 1,
        'data.imageUrls.capturedFront': 1,
        'data.imageUrls.front': 1,
        'shortId': 1,
        'createdAt': 1,
        'views': 1
      })
      .sort(sortOptions)
      .skip(skip)
      .limit(limit)
      .toArray();

    res.json({
      success: true,
      designs,
      pagination: {
        page,
        totalPages,
        totalDesigns
      }
    });

  } catch (e) {
    console.error('Gallery fetch error:', e);
    res.status(500).json({ success: false, error: 'Failed to fetch gallery designs' });
  }
});
// END: NEW GALLERY API ENDPOINT


  return router;
};
