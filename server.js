        window.close();
      </script>
    `);
  }
});

// Forgot Password - Request Reset Link
app.post('/api/auth/forgot-password', [
  body('email').isEmail().normalizeEmail()
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    if (!db) return res.status(500).json({ error: 'DB not connected' });

    const { email } = req.body;
    const user = await db.collection(usersCollectionName).findOne({ email });

    // Always return success to prevent email enumeration
    if (!user) {
      console.log(`[ForgotPassword] Email not found: ${email}`);
      return res.json({ success: true });
    }

    // Generate reset token
    const secret = process.env.JWT_SECRET || 'default_jwt_secret_change_me';
    const resetToken = jwt.sign({ userId: user.userId, email: user.email, type: 'password-reset' }, secret, { expiresIn: '1h' });

    // Store reset token in DB
    await db.collection(usersCollectionName).updateOne(
      { userId: user.userId },
      { $set: { resetToken, resetTokenExpiry: new Date(Date.now() + 3600000) } }
    );

    // TODO: Send email with reset link
    // For now, log the reset link (in production, use email service)
    const baseUrl = process.env.PUBLIC_BASE_URL || 'https://mcprim.com/nfc';
    const resetLink = `${baseUrl}/reset-password.html?token=${resetToken}`;
    console.log(`[ForgotPassword] Reset link for ${email}: ${resetLink}`);

    res.json({ success: true });

  } catch (err) {
    console.error('Forgot password error:', err);
    res.status(500).json({ error: 'Failed to process request' });
  }
});

// Reset Password - Set New Password
app.post('/api/auth/reset-password/:token', [
  body('password').isLength({ min: 6 })
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    if (!db) return res.status(500).json({ error: 'DB not connected' });

    const { token } = req.params;
    const { password } = req.body;

    // Verify token
    const secret = process.env.JWT_SECRET || 'default_jwt_secret_change_me';
    let decoded;
    try {
      decoded = jwt.verify(token, secret);
      if (decoded.type !== 'password-reset') throw new Error('Invalid token type');
    } catch (tokenErr) {
      return res.status(400).json({ error: 'رابط غير صالح أو منتهي الصلاحية' });
    }

    // Find user and verify token matches
    const user = await db.collection(usersCollectionName).findOne({ userId: decoded.userId, resetToken: token });
    if (!user) {
      return res.status(400).json({ error: 'رابط غير صالح أو منتهي الصلاحية' });
    }

    // Check token expiry
    if (new Date() > new Date(user.resetTokenExpiry)) {
      return res.status(400).json({ error: 'انتهت صلاحية الرابط، اطلب رابطاً جديداً' });
    }

    // Hash new password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Update password and clear reset token
    await db.collection(usersCollectionName).updateOne(
      { userId: user.userId },
      { $set: { password: hashedPassword }, $unset: { resetToken: '', resetTokenExpiry: '' } }
    );

    console.log(`[ResetPassword] Password updated for user: ${user.email}`);
    res.json({ success: true });

  } catch (err) {
    console.error('Reset password error:', err);
    res.status(500).json({ error: 'Failed to reset password' });
  }
});

// Verify Email
app.get('/api/auth/verify-email/:token', async (req, res) => {
  try {
    if (!db) return res.status(500).json({ error: 'DB not connected' });

    const { token } = req.params;

    // Verify token
    const secret = process.env.JWT_SECRET || 'default_jwt_secret_change_me';
    let decoded;
    try {
      decoded = jwt.verify(token, secret);
      if (decoded.type !== 'email-verify') throw new Error('Invalid token type');
    } catch (tokenErr) {
      return res.status(400).json({ error: 'رابط التحقق غير صالح أو منتهي الصلاحية' });
    }

    // Find user and verify token matches
    const user = await db.collection(usersCollectionName).findOne({ userId: decoded.userId, verificationToken: token });
    if (!user) {
      return res.status(400).json({ error: 'رابط التحقق غير صالح أو منتهي الصلاحية' });
    }

    // Check if already verified
    if (user.isVerified) {
      return res.json({ success: true, message: 'البريد مُتحقق مسبقاً' });
    }

    // Update user as verified
    await db.collection(usersCollectionName).updateOne(
      { userId: user.userId },
      { $set: { isVerified: true }, $unset: { verificationToken: '' } }
    );

    console.log(`[VerifyEmail] Email verified for user: ${user.email}`);
    res.json({ success: true });

  } catch (err) {
    console.error('Verify email error:', err);
    res.status(500).json({ error: 'Failed to verify email' });
  }
});

// Get User Profile/Designs
app.get('/api/user/designs', verifyToken, async (req, res) => {
  try {
    if (!db) return res.status(500).json({ error: 'DB not connected' });

    const designs = await db.collection(designsCollectionName)
      .find({ ownerId: req.user.userId })
      .project({
        'data.inputs.input-name_ar': 1,
        'data.inputs.input-name_en': 1,
        'shortId': 1,
        'createdAt': 1,
        'views': 1,
        'data.imageUrls.front': 1
      })
      .sort({ createdAt: -1 })
      .toArray();

    res.json({ success: true, designs });
  } catch (err) {
    console.error('Get user designs error:', err);
    res.status(500).json({ error: 'Failed to fetch designs' });
  }
});

// ===== CARD SAVE WITH CONSENT FEATURE =====

// Get card privacy setting
app.get('/api/card-privacy', verifyToken, async (req, res) => {
  try {
    if (!db) return res.status(500).json({ error: 'DB not connected' });
    const user = await db.collection(usersCollectionName).findOne(
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
app.put('/api/card-privacy', verifyToken, async (req, res) => {
  try {
    if (!db) return res.status(500).json({ error: 'DB not connected' });
    const { cardPrivacy } = req.body;
    if (!['allow_all', 'require_approval', 'deny_all'].includes(cardPrivacy)) {
      return res.status(400).json({ error: 'Invalid privacy setting' });
    }
    await db.collection(usersCollectionName).updateOne(