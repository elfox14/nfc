'use strict';

const express = require('express');
const { nanoid } = require('nanoid');
const verifyToken = require('../auth-middleware');

const MAX_KITS_PER_OWNER = 5;
const MAX_LOGOS = 8;
const MAX_COLORS = 12;
const MAX_FONTS = 6;
const MAX_TEMPLATES = 20;
const ROLES = new Set(['admin', 'editor', 'viewer']);
const ROLE_WEIGHT = { viewer: 1, editor: 2, admin: 3, owner: 4 };
const LOGO_VARIANTS = new Set(['primary', 'secondary', 'icon', 'mono']);
const COLOR_ROLES = new Set(['primary', 'secondary', 'accent', 'background', 'text']);
const FONT_ROLES = new Set(['heading', 'body', 'accent']);
const PLACEMENT_KEYS = new Set(['logo', 'photo', 'name', 'tagline', 'qr']);
const TEMPLATE_INPUT_KEYS = new Set([
  'layout-select-visual',
  'front-bg-start', 'front-bg-end', 'back-bg-start', 'back-bg-end',
  'front-bg-opacity', 'back-bg-opacity',
  'name-color', 'name-font', 'name-font-size',
  'tagline-color', 'tagline-font', 'tagline-font-size',
  'phone-btn-bg-color', 'phone-btn-text-color', 'phone-btn-font', 'phone-btn-font-size', 'phone-btn-padding',
  'phone-text-color', 'phone-text-font', 'phone-text-font-size', 'phone-text-layout',
  'back-buttons-bg-color', 'back-buttons-text-color', 'back-buttons-font', 'back-buttons-font-size',
  'social-text-color', 'social-text-font', 'social-text-size',
  'logo-size', 'logo-opacity', 'logo-bg-color', 'logo-shadow-enabled', 'logo-shadow-blur', 'logo-shadow-color',
  'photo-size', 'photo-opacity', 'photo-border-color', 'photo-border-width', 'photo-shadow-enabled',
  'photo-shadow-blur', 'photo-shadow-color', 'photo-shape',
  'qr-size', 'qr-fg-color', 'qr-bg-color',
  'editor-layer-order', 'editor-layer-locks', 'editor-layer-bio-position', 'editor-layer-appearance', 'editor-layer-groups'
]);

function cleanText(value, max = 80) {
  return String(value || '').trim().replace(/[<>\u0000-\u001f]/g, '').slice(0, max);
}

function normalizeEmail(value) {
  return String(value || '').trim().toLowerCase().slice(0, 254);
}

function cleanUrl(value) {
  try {
    const url = new URL(String(value || '').trim());
    return ['http:', 'https:'].includes(url.protocol) ? url.toString().slice(0, 2048) : '';
  } catch (_error) {
    return '';
  }
}

function cleanHex(value) {
  const color = String(value || '').trim();
  return /^#[0-9a-f]{6}$/i.test(color) ? color.toLowerCase() : '';
}

function cleanFontFamily(value) {
  const family = cleanText(value, 120);
  return /^[\p{L}\p{N}\s,'"._-]+$/u.test(family) ? family : '';
}

function safeClone(value) {
  return JSON.parse(JSON.stringify(value || {}));
}

function sanitizeTemplateDesign(raw) {
  const source = raw && typeof raw === 'object' ? raw : {};
  const inputs = {};
  Object.entries(source.inputs || {}).forEach(([key, value]) => {
    if (!TEMPLATE_INPUT_KEYS.has(key)) return;
    if (typeof value === 'boolean' || typeof value === 'number') inputs[key] = value;
    else inputs[key] = cleanText(value, 5000);
  });

  const placements = {};
  Object.entries(source.placements || {}).forEach(([key, value]) => {
    if (PLACEMENT_KEYS.has(key) && ['front', 'back'].includes(value)) placements[key] = value;
  });

  const visibilities = {};
  Object.entries(source.visibilities || {}).forEach(([key, value]) => {
    if (/^[a-z][a-z0-9-]{0,40}$/i.test(key)) visibilities[key] = Boolean(value);
  });

  return { inputs, placements, visibilities };
}

function sanitizePreview(raw, design) {
  const source = raw && typeof raw === 'object' ? raw : {};
  const colors = Array.isArray(source.colors)
    ? source.colors.map(cleanHex).filter(Boolean).slice(0, 4)
    : [];
  return {
    colors: colors.length ? colors : [
      design.inputs['front-bg-start'] || '#16243a',
      design.inputs['front-bg-end'] || '#274d73',
      design.inputs['name-color'] || '#ffffff',
      design.inputs['tagline-color'] || '#54a7ff'
    ],
    font: cleanFontFamily(source.font || design.inputs['name-font']) || 'Cairo, sans-serif',
    layout: ['classic', 'modern', 'vertical'].includes(source.layout)
      ? source.layout
      : design.inputs['layout-select-visual'] || 'modern'
  };
}

function membershipFor(kit, userId) {
  if (!kit || !userId) return null;
  if (kit.ownerId === userId) return { userId, role: 'owner' };
  return (kit.members || []).find(member => member.userId === userId) || null;
}

function canAccess(kit, userId, minimumRole = 'viewer') {
  const membership = membershipFor(kit, userId);
  return Boolean(membership && ROLE_WEIGHT[membership.role] >= ROLE_WEIGHT[minimumRole]);
}

function identityPatch(identity, options = {}) {
  const colors = Array.isArray(identity?.colors) ? identity.colors : [];
  const fonts = Array.isArray(identity?.fonts) ? identity.fonts : [];
  const logos = Array.isArray(identity?.logos) ? identity.logos : [];
  const color = role => colors.find(item => item.role === role)?.value || '';
  const font = role => fonts.find(item => item.role === role)?.family || '';
  const logo = logos.find(item => item.variant === 'primary')?.url || logos[0]?.url || '';
  const patch = {};

  if (options.colors !== false) {
    const primary = color('primary');
    const secondary = color('secondary') || primary;
    const accent = color('accent') || secondary;
    const background = color('background');
    const text = color('text');
    if (primary) {
      patch['data.inputs.front-bg-start'] = primary;
      patch['data.inputs.phone-btn-bg-color'] = primary;
      patch['data.inputs.back-buttons-bg-color'] = primary;
    }
    if (secondary) patch['data.inputs.front-bg-end'] = secondary;
    if (background) {
      patch['data.inputs.back-bg-start'] = background;
      patch['data.inputs.back-bg-end'] = background;
    }
    if (accent) {
      patch['data.inputs.tagline-color'] = accent;
      patch['data.inputs.photo-border-color'] = accent;
    }
    if (text) {
      patch['data.inputs.name-color'] = text;
      patch['data.inputs.phone-btn-text-color'] = text;
      patch['data.inputs.back-buttons-text-color'] = text;
    }
  }

  if (options.fonts !== false) {
    const heading = font('heading');
    const body = font('body') || heading;
    const accent = font('accent') || body;
    if (heading) patch['data.inputs.name-font'] = heading;
    if (body) {
      patch['data.inputs.phone-btn-font'] = body;
      patch['data.inputs.phone-text-font'] = body;
      patch['data.inputs.social-text-font'] = body;
    }
    if (accent) patch['data.inputs.tagline-font'] = accent;
  }

  if (options.logo !== false && logo) patch['data.inputs.input-logo'] = logo;
  return patch;
}

module.exports = function createBrandKitsRouter({
  getDb,
  brandKitsCollectionName = 'brandKits',
  usersCollectionName = 'users',
  designsCollectionName = 'designs'
}) {
  const router = express.Router();

  async function loadKit(req, res, minimumRole = 'viewer') {
    if (!getDb()) {
      res.status(500).json({ error: 'DB not connected' });
      return null;
    }
    const kit = await getDb().collection(brandKitsCollectionName).findOne({ kitId: String(req.params.kitId || '') });
    if (!kit) {
      res.status(404).json({ error: 'Brand kit not found' });
      return null;
    }
    if (!canAccess(kit, req.user.userId, minimumRole)) {
      res.status(403).json({ error: 'Insufficient brand kit permission' });
      return null;
    }
    return kit;
  }

  router.get('/brand-kits', verifyToken, async (req, res) => {
    try {
      if (!getDb()) return res.status(500).json({ error: 'DB not connected' });
      const userId = req.user.userId;
      const kits = await getDb().collection(brandKitsCollectionName)
        .find({ $or: [{ ownerId: userId }, { 'members.userId': userId }] })
        .sort({ updatedAt: -1 })
        .toArray();
      res.json({ success: true, kits: kits.map(kit => ({ ...kit, permission: membershipFor(kit, userId)?.role })) });
    } catch (error) {
      console.error('List brand kits error:', error);
      res.status(500).json({ error: 'Failed to fetch brand kits' });
    }
  });

  router.post('/brand-kits', verifyToken, async (req, res) => {
    try {
      if (!getDb()) return res.status(500).json({ error: 'DB not connected' });
      const ownerId = req.user.userId;
      const count = await getDb().collection(brandKitsCollectionName).countDocuments({ ownerId });
      if (count >= MAX_KITS_PER_OWNER) return res.status(409).json({ error: `Maximum ${MAX_KITS_PER_OWNER} brand kits allowed` });
      const name = cleanText(req.body?.name, 80);
      if (!name) return res.status(400).json({ error: 'Brand kit name is required' });
      const now = new Date();
      const kit = {
        kitId: nanoid(12),
        name,
        description: cleanText(req.body?.description, 240),
        ownerId,
        members: [],
        identity: { logos: [], colors: [], fonts: [] },
        templates: [],
        createdAt: now,
        updatedAt: now
      };
      await getDb().collection(brandKitsCollectionName).insertOne(kit);
      res.status(201).json({ success: true, kit: { ...kit, permission: 'owner' } });
    } catch (error) {
      console.error('Create brand kit error:', error);
      res.status(500).json({ error: 'Failed to create brand kit' });
    }
  });

  router.get('/brand-kits/:kitId', verifyToken, async (req, res) => {
    try {
      const kit = await loadKit(req, res, 'viewer');
      if (!kit) return;
      res.json({ success: true, kit: { ...kit, permission: membershipFor(kit, req.user.userId)?.role } });
    } catch (error) {
      console.error('Get brand kit error:', error);
      res.status(500).json({ error: 'Failed to fetch brand kit' });
    }
  });

  router.put('/brand-kits/:kitId', verifyToken, async (req, res) => {
    try {
      const kit = await loadKit(req, res, 'admin');
      if (!kit) return;
      const patch = { updatedAt: new Date() };
      if (req.body?.name !== undefined) {
        patch.name = cleanText(req.body.name, 80);
        if (!patch.name) return res.status(400).json({ error: 'Brand kit name is required' });
      }
      if (req.body?.description !== undefined) patch.description = cleanText(req.body.description, 240);
      await getDb().collection(brandKitsCollectionName).updateOne({ kitId: kit.kitId }, { $set: patch });
      res.json({ success: true });
    } catch (error) {
      console.error('Update brand kit error:', error);
      res.status(500).json({ error: 'Failed to update brand kit' });
    }
  });

  router.delete('/brand-kits/:kitId', verifyToken, async (req, res) => {
    try {
      const kit = await loadKit(req, res, 'owner');
      if (!kit) return;
      await getDb().collection(brandKitsCollectionName).deleteOne({ kitId: kit.kitId, ownerId: req.user.userId });
      res.json({ success: true });
    } catch (error) {
      console.error('Delete brand kit error:', error);
      res.status(500).json({ error: 'Failed to delete brand kit' });
    }
  });

  router.post('/brand-kits/:kitId/logos', verifyToken, async (req, res) => {
    try {
      const kit = await loadKit(req, res, 'editor');
      if (!kit) return;
      if ((kit.identity?.logos || []).length >= MAX_LOGOS) return res.status(409).json({ error: `Maximum ${MAX_LOGOS} logos allowed` });
      const url = cleanUrl(req.body?.url);
      if (!url) return res.status(400).json({ error: 'A valid logo URL is required' });
      const logo = {
        id: nanoid(10),
        name: cleanText(req.body?.name, 60) || 'Logo',
        url,
        variant: LOGO_VARIANTS.has(req.body?.variant) ? req.body.variant : 'primary',
        createdAt: new Date()
      };
      await getDb().collection(brandKitsCollectionName).updateOne(
        { kitId: kit.kitId },
        { $push: { 'identity.logos': logo }, $set: { updatedAt: new Date() } }
      );
      res.status(201).json({ success: true, logo });
    } catch (error) {
      console.error('Add brand logo error:', error);
      res.status(500).json({ error: 'Failed to add logo' });
    }
  });

  router.delete('/brand-kits/:kitId/logos/:assetId', verifyToken, async (req, res) => {
    try {
      const kit = await loadKit(req, res, 'editor');
      if (!kit) return;
      await getDb().collection(brandKitsCollectionName).updateOne(
        { kitId: kit.kitId },
        { $pull: { 'identity.logos': { id: String(req.params.assetId) } }, $set: { updatedAt: new Date() } }
      );
      res.json({ success: true });
    } catch (error) {
      console.error('Delete brand logo error:', error);
      res.status(500).json({ error: 'Failed to delete logo' });
    }
  });

  router.post('/brand-kits/:kitId/colors', verifyToken, async (req, res) => {
    try {
      const kit = await loadKit(req, res, 'editor');
      if (!kit) return;
      if ((kit.identity?.colors || []).length >= MAX_COLORS) return res.status(409).json({ error: `Maximum ${MAX_COLORS} colors allowed` });
      const value = cleanHex(req.body?.value);
      if (!value) return res.status(400).json({ error: 'A six-digit HEX color is required' });
      const color = {
        id: nanoid(10),
        name: cleanText(req.body?.name, 40) || 'Color',
        value,
        role: COLOR_ROLES.has(req.body?.role) ? req.body.role : 'accent'
      };
      await getDb().collection(brandKitsCollectionName).updateOne(
        { kitId: kit.kitId },
        { $push: { 'identity.colors': color }, $set: { updatedAt: new Date() } }
      );
      res.status(201).json({ success: true, color });
    } catch (error) {
      console.error('Add brand color error:', error);
      res.status(500).json({ error: 'Failed to add color' });
    }
  });

  router.delete('/brand-kits/:kitId/colors/:assetId', verifyToken, async (req, res) => {
    try {
      const kit = await loadKit(req, res, 'editor');
      if (!kit) return;
      await getDb().collection(brandKitsCollectionName).updateOne(
        { kitId: kit.kitId },
        { $pull: { 'identity.colors': { id: String(req.params.assetId) } }, $set: { updatedAt: new Date() } }
      );
      res.json({ success: true });
    } catch (error) {
      console.error('Delete brand color error:', error);
      res.status(500).json({ error: 'Failed to delete color' });
    }
  });

  router.post('/brand-kits/:kitId/fonts', verifyToken, async (req, res) => {
    try {
      const kit = await loadKit(req, res, 'editor');
      if (!kit) return;
      if ((kit.identity?.fonts || []).length >= MAX_FONTS) return res.status(409).json({ error: `Maximum ${MAX_FONTS} fonts allowed` });
      const family = cleanFontFamily(req.body?.family);
      if (!family) return res.status(400).json({ error: 'A valid font family is required' });
      const font = {
        id: nanoid(10),
        name: cleanText(req.body?.name, 50) || family.split(',')[0],
        family,
        role: FONT_ROLES.has(req.body?.role) ? req.body.role : 'body'
      };
      await getDb().collection(brandKitsCollectionName).updateOne(
        { kitId: kit.kitId },
        { $push: { 'identity.fonts': font }, $set: { updatedAt: new Date() } }
      );
      res.status(201).json({ success: true, font });
    } catch (error) {
      console.error('Add brand font error:', error);
      res.status(500).json({ error: 'Failed to add font' });
    }
  });

  router.delete('/brand-kits/:kitId/fonts/:assetId', verifyToken, async (req, res) => {
    try {
      const kit = await loadKit(req, res, 'editor');
      if (!kit) return;
      await getDb().collection(brandKitsCollectionName).updateOne(
        { kitId: kit.kitId },
        { $pull: { 'identity.fonts': { id: String(req.params.assetId) } }, $set: { updatedAt: new Date() } }
      );
      res.json({ success: true });
    } catch (error) {
      console.error('Delete brand font error:', error);
      res.status(500).json({ error: 'Failed to delete font' });
    }
  });

  router.post('/brand-kits/:kitId/templates', verifyToken, async (req, res) => {
    try {
      const kit = await loadKit(req, res, 'editor');
      if (!kit) return;
      if ((kit.templates || []).length >= MAX_TEMPLATES) return res.status(409).json({ error: `Maximum ${MAX_TEMPLATES} templates allowed` });
      const name = cleanText(req.body?.name, 60);
      if (!name) return res.status(400).json({ error: 'Template name is required' });
      const design = sanitizeTemplateDesign(req.body?.design);
      const now = new Date();
      const template = {
        id: nanoid(12),
        name,
        description: cleanText(req.body?.description, 180),
        design,
        preview: sanitizePreview(req.body?.preview, design),
        createdBy: req.user.userId,
        createdAt: now,
        updatedAt: now
      };
      await getDb().collection(brandKitsCollectionName).updateOne(
        { kitId: kit.kitId },
        { $push: { templates: template }, $set: { updatedAt: now } }
      );
      res.status(201).json({ success: true, template });
    } catch (error) {
      console.error('Add brand template error:', error);
      res.status(500).json({ error: 'Failed to add brand template' });
    }
  });

  router.delete('/brand-kits/:kitId/templates/:templateId', verifyToken, async (req, res) => {
    try {
      const kit = await loadKit(req, res, 'editor');
      if (!kit) return;
      await getDb().collection(brandKitsCollectionName).updateOne(
        { kitId: kit.kitId },
        { $pull: { templates: { id: String(req.params.templateId) } }, $set: { updatedAt: new Date() } }
      );
      res.json({ success: true });
    } catch (error) {
      console.error('Delete brand template error:', error);
      res.status(500).json({ error: 'Failed to delete brand template' });
    }
  });

  router.post('/brand-kits/:kitId/members', verifyToken, async (req, res) => {
    try {
      const kit = await loadKit(req, res, 'owner');
      if (!kit) return;
      const email = normalizeEmail(req.body?.email);
      const role = ROLES.has(req.body?.role) ? req.body.role : 'viewer';
      if (!email) return res.status(400).json({ error: 'Member email is required' });
      const user = await getDb().collection(usersCollectionName).findOne(
        { email },
        { projection: { userId: 1, email: 1, name: 1 } }
      );
      if (!user) return res.status(404).json({ error: 'The member must create an account first' });
      if (user.userId === kit.ownerId) return res.status(409).json({ error: 'The owner is already part of this kit' });
      const member = {
        userId: user.userId,
        email: user.email,
        name: cleanText(user.name, 80),
        role,
        joinedAt: new Date()
      };
      await getDb().collection(brandKitsCollectionName).updateOne(
        { kitId: kit.kitId },
        { $pull: { members: { userId: user.userId } } }
      );
      await getDb().collection(brandKitsCollectionName).updateOne(
        { kitId: kit.kitId },
        { $push: { members: member }, $set: { updatedAt: new Date() } }
      );
      res.status(201).json({ success: true, member });
    } catch (error) {
      console.error('Add brand kit member error:', error);
      res.status(500).json({ error: 'Failed to add member' });
    }
  });

  router.patch('/brand-kits/:kitId/members/:userId', verifyToken, async (req, res) => {
    try {
      const kit = await loadKit(req, res, 'owner');
      if (!kit) return;
      const role = ROLES.has(req.body?.role) ? req.body.role : '';
      if (!role) return res.status(400).json({ error: 'Invalid role' });
      const result = await getDb().collection(brandKitsCollectionName).updateOne(
        { kitId: kit.kitId, 'members.userId': String(req.params.userId) },
        { $set: { 'members.$.role': role, updatedAt: new Date() } }
      );
      if (!result.matchedCount) return res.status(404).json({ error: 'Member not found' });
      res.json({ success: true });
    } catch (error) {
      console.error('Update member role error:', error);
      res.status(500).json({ error: 'Failed to update member' });
    }
  });

  router.delete('/brand-kits/:kitId/members/:userId', verifyToken, async (req, res) => {
    try {
      const kit = await loadKit(req, res, 'owner');
      if (!kit) return;
      await getDb().collection(brandKitsCollectionName).updateOne(
        { kitId: kit.kitId },
        { $pull: { members: { userId: String(req.params.userId) } }, $set: { updatedAt: new Date() } }
      );
      res.json({ success: true });
    } catch (error) {
      console.error('Remove brand kit member error:', error);
      res.status(500).json({ error: 'Failed to remove member' });
    }
  });

  router.post('/brand-kits/:kitId/apply-designs', verifyToken, async (req, res) => {
    try {
      const kit = await loadKit(req, res, 'editor');
      if (!kit) return;
      const options = req.body?.options && typeof req.body.options === 'object' ? req.body.options : {};
      const patch = identityPatch(kit.identity, options);
      if (!Object.keys(patch).length) return res.status(400).json({ error: 'Brand kit has no applicable identity assets' });
      const designIds = Array.isArray(req.body?.designIds)
        ? req.body.designIds.map(value => String(value)).filter(value => /^[A-Za-z0-9_-]{3,32}$/.test(value)).slice(0, 100)
        : [];
      const filter = { ownerId: req.user.userId };
      if (designIds.length) filter.shortId = { $in: designIds };
      const result = await getDb().collection(designsCollectionName).updateMany(
        filter,
        { $set: { ...patch, lastModified: new Date(), 'data.brandKitId': kit.kitId } }
      );
      res.json({ success: true, matched: result.matchedCount, modified: result.modifiedCount });
    } catch (error) {
      console.error('Apply brand kit error:', error);
      res.status(500).json({ error: 'Failed to apply brand kit' });
    }
  });

  return router;
};

module.exports._test = {
  canAccess,
  cleanFontFamily,
  cleanHex,
  cleanText,
  cleanUrl,
  identityPatch,
  membershipFor,
  sanitizePreview,
  sanitizeTemplateDesign
};
