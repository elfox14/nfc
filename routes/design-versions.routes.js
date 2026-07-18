'use strict';

const express = require('express');
const { nanoid } = require('nanoid');
const verifyToken = require('../auth-middleware');
const { canEdit, getDesignWorkspaceAccess } = require('../utils/workspace-access');

const DEFAULT_COLLECTION_NAME = 'designVersions';
const DEFAULT_MAX_VERSIONS = 30;
const MAX_SNAPSHOT_BYTES = 450 * 1024;
const VERSION_SOURCE = new Set(['manual', 'local-sync', 'pre-restore']);

function isSafeDesignId(value) {
  return typeof value === 'string' && /^[A-Za-z0-9_-]{3,32}$/.test(value);
}

function cloneJson(value) {
  return JSON.parse(JSON.stringify(value));
}

function cleanVersionName(value, fallback = 'Checkpoint') {
  const normalized = String(value || fallback)
    .replace(/[<>]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 64);
  return normalized || fallback;
}

function sanitizeDynamic(dynamic, DOMPurify) {
  if (!dynamic || typeof dynamic !== 'object') return dynamic;
  const clean = cloneJson(dynamic);
  ['phones', 'social'].forEach((key) => {
    if (!Array.isArray(clean[key])) return;
    clean[key] = clean[key].map((item) => ({
      ...item,
      value: item?.value ? DOMPurify.sanitize(String(item.value)) : ''
    }));
  });
  if (clean.staticSocial && typeof clean.staticSocial === 'object') {
    Object.keys(clean.staticSocial).forEach((key) => {
      const item = clean.staticSocial[key];
      if (item?.value) item.value = DOMPurify.sanitize(String(item.value));
    });
  }
  return clean;
}

function sanitizeSnapshot(rawState, sanitizeInputs, DOMPurify) {
  const source = rawState && typeof rawState === 'object' ? rawState : {};
  const snapshot = cloneJson(source);
  if (snapshot.inputs && typeof snapshot.inputs === 'object') {
    snapshot.inputs = sanitizeInputs(snapshot.inputs);
  }
  if (snapshot.dynamic) snapshot.dynamic = sanitizeDynamic(snapshot.dynamic, DOMPurify);

  const serialized = JSON.stringify(snapshot, (key, value) => {
    if (['__proto__', 'prototype', 'constructor'].includes(key)) return undefined;
    return value;
  });
  if (Buffer.byteLength(serialized, 'utf8') > MAX_SNAPSHOT_BYTES) {
    const error = new Error('Version snapshot is too large');
    error.status = 413;
    throw error;
  }
  return JSON.parse(serialized);
}

function metadata(version) {
  return {
    id: version.versionId,
    name: version.name,
    source: version.source,
    createdAt: version.createdAt,
    createdBy: version.createdBy,
    schemaVersion: version.schemaVersion || 1
  };
}

module.exports = function createDesignVersionsRouter({
  getDb,
  designsCollectionName,
  workspacesCollectionName = 'workspaces',
  sanitizeInputs,
  DOMPurify,
  versionsCollectionName = DEFAULT_COLLECTION_NAME,
  maxVersions = DEFAULT_MAX_VERSIONS
}) {
  const router = express.Router();
  let indexPromise;

  function collection() {
    return getDb().collection(versionsCollectionName);
  }

  function ensureIndexes() {
    if (!indexPromise) {
      indexPromise = Promise.all([
        collection().createIndex({ designShortId: 1, ownerId: 1, createdAt: -1 }),
        collection().createIndex({ designShortId: 1, versionId: 1 }, { unique: true })
      ]).catch((error) => {
        indexPromise = null;
        console.warn('[DesignVersions] Could not create indexes:', error.message);
      });
    }
    return indexPromise;
  }

  async function authorizedDesign(req, res, requireEdit = false) {
    const { id } = req.params;
    if (!isSafeDesignId(id)) {
      res.status(400).json({ error: 'Invalid design id' });
      return null;
    }
    const design = await getDb().collection(designsCollectionName).findOne({ shortId: id });
    if (!design) {
      res.status(404).json({ error: 'Design not found or unauthorized' });
      return null;
    }
    if (design.ownerId === req.user.userId) return design;
    if (!design.workspaceId) {
      res.status(404).json({ error: 'Design not found or unauthorized' });
      return null;
    }
    const access = await getDesignWorkspaceAccess({
      db: getDb(), workspacesCollectionName, design, userId: req.user.userId
    });
    if (!access.allowed || (requireEdit && !canEdit(access.workspace, req.user.userId))) {
      res.status(403).json({ error: requireEdit ? 'Workspace edit permission required' : 'Workspace access denied' });
      return null;
    }
    return design;
  }

  async function trimVersions(designShortId, ownerId) {
    const total = await collection().countDocuments({ designShortId, ownerId });
    if (total <= maxVersions) return;
    const overflow = await collection()
      .find({ designShortId, ownerId })
      .sort({ createdAt: 1 })
      .limit(total - maxVersions)
      .project({ _id: 1 })
      .toArray();
    if (overflow.length) {
      await collection().deleteMany({ _id: { $in: overflow.map((item) => item._id) } });
    }
  }

  async function insertVersion({ design, ownerId, createdBy, name, source, state }) {
    await ensureIndexes();
    const document = {
      versionId: nanoid(12),
      designShortId: design.shortId,
      ownerId,
      name: cleanVersionName(name),
      source: VERSION_SOURCE.has(source) ? source : 'manual',
      state: sanitizeSnapshot(state || design.data || {}, sanitizeInputs, DOMPurify),
      schemaVersion: 1,
      createdBy: createdBy || ownerId,
      createdAt: new Date()
    };
    await collection().insertOne(document);
    await trimVersions(design.shortId, ownerId);
    return document;
  }

  router.get('/design/:id/versions', verifyToken, async (req, res) => {
    try {
      if (!getDb()) return res.status(500).json({ error: 'DB not connected' });
      const design = await authorizedDesign(req, res, false);
      if (!design) return undefined;
      await ensureIndexes();
      const requestedLimit = Number.parseInt(req.query.limit, 10);
      const limit = Number.isFinite(requestedLimit) ? Math.min(50, Math.max(1, requestedLimit)) : 30;
      const versions = await collection()
        .find({ designShortId: design.shortId, ownerId: design.ownerId })
        .project({ state: 0 })
        .sort({ createdAt: -1 })
        .limit(limit)
        .toArray();
      return res.json({ success: true, cloud: true, versions: versions.map(metadata) });
    } catch (error) {
      console.error('[DesignVersions] List failed:', error);
      return res.status(500).json({ error: 'Failed to load design versions' });
    }
  });

  router.post('/design/:id/versions', verifyToken, async (req, res) => {
    try {
      if (!getDb()) return res.status(500).json({ error: 'DB not connected' });
      const design = await authorizedDesign(req, res, true);
      if (!design) return undefined;
      const version = await insertVersion({
        design,
        ownerId: design.ownerId,
        createdBy: req.user.userId,
        name: req.body?.name,
        source: req.body?.source,
        state: req.body?.state
      });
      return res.status(201).json({ success: true, cloud: true, version: metadata(version) });
    } catch (error) {
      console.error('[DesignVersions] Create failed:', error);
      return res.status(error.status || 500).json({ error: error.message || 'Failed to create design version' });
    }
  });

  router.get('/design/:id/versions/:versionId', verifyToken, async (req, res) => {
    try {
      if (!getDb()) return res.status(500).json({ error: 'DB not connected' });
      const design = await authorizedDesign(req, res, false);
      if (!design) return undefined;
      await ensureIndexes();
      const version = await collection().findOne({
        designShortId: design.shortId,
        ownerId: design.ownerId,
        versionId: req.params.versionId
      });
      if (!version) return res.status(404).json({ error: 'Version not found' });
      return res.json({ success: true, cloud: true, version: { ...metadata(version), state: version.state } });
    } catch (error) {
      console.error('[DesignVersions] Read failed:', error);
      return res.status(500).json({ error: 'Failed to load design version' });
    }
  });

  router.post('/design/:id/versions/:versionId/restore', verifyToken, async (req, res) => {
    try {
      if (!getDb()) return res.status(500).json({ error: 'DB not connected' });
      const design = await authorizedDesign(req, res, true);
      if (!design) return undefined;
      await ensureIndexes();
      const version = await collection().findOne({
        designShortId: design.shortId,
        ownerId: design.ownerId,
        versionId: req.params.versionId
      });
      if (!version) return res.status(404).json({ error: 'Version not found' });

      const safetyVersion = await insertVersion({
        design,
        ownerId: design.ownerId,
        createdBy: req.user.userId,
        name: cleanVersionName(req.body?.safetyName, 'Before restore'),
        source: 'pre-restore',
        state: design.data || {}
      });

      const restoredState = cloneJson(version.state || {});
      const currentImages = design.data?.imageUrls;
      if (currentImages) {
        if (!restoredState.imageUrls) restoredState.imageUrls = {};
        ['capturedFront', 'capturedBack'].forEach((key) => {
          if (!restoredState.imageUrls[key] && currentImages[key]) {
            restoredState.imageUrls[key] = currentImages[key];
          }
        });
      }

      const now = new Date();
      const workflow = design.workspaceId ? {
        ...(design.workflow || {}),
        enabled: true,
        status: 'draft',
        revision: Number(design.workflow?.revision || 0) + 1,
        submittedAt: null,
        submittedBy: null,
        reviewedAt: null,
        reviewedBy: null,
        reviewNote: '',
        publishedAt: null,
        publishedBy: null,
        lastEditedBy: req.user.userId,
        updatedAt: now
      } : design.workflow;

      const patch = { data: restoredState, lastModified: now, lastEditedBy: req.user.userId };
      if (workflow) patch.workflow = workflow;
      await getDb().collection(designsCollectionName).updateOne(
        { shortId: design.shortId },
        { $set: patch }
      );

      return res.json({
        success: true,
        cloud: true,
        restoredVersion: metadata(version),
        safetyVersion: metadata(safetyVersion),
        state: restoredState,
        workflowStatus: workflow?.status || null
      });
    } catch (error) {
      console.error('[DesignVersions] Restore failed:', error);
      return res.status(error.status || 500).json({ error: error.message || 'Failed to restore design version' });
    }
  });

  router.delete('/design/:id/versions/:versionId', verifyToken, async (req, res) => {
    try {
      if (!getDb()) return res.status(500).json({ error: 'DB not connected' });
      const design = await authorizedDesign(req, res, true);
      if (!design) return undefined;
      await ensureIndexes();
      const result = await collection().deleteOne({
        designShortId: design.shortId,
        ownerId: design.ownerId,
        versionId: req.params.versionId
      });
      if (!result.deletedCount) return res.status(404).json({ error: 'Version not found' });
      return res.json({ success: true });
    } catch (error) {
      console.error('[DesignVersions] Delete failed:', error);
      return res.status(500).json({ error: 'Failed to delete design version' });
    }
  });

  return router;
};

module.exports.sanitizeSnapshot = sanitizeSnapshot;
module.exports.cleanVersionName = cleanVersionName;
module.exports.isSafeDesignId = isSafeDesignId;
