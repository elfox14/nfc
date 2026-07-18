'use strict';

const express = require('express');
const verifyToken = require('../auth-middleware');
const { canEdit, getDesignWorkspaceAccess, isSafeDesignId } = require('../utils/workspace-access');

function sanitizeDesignData(raw, sanitizeInputs, DOMPurify) {
  const data = raw && typeof raw === 'object' ? JSON.parse(JSON.stringify(raw)) : {};
  if (data.inputs && typeof data.inputs === 'object') data.inputs = sanitizeInputs(data.inputs);
  if (data.dynamic?.phones && Array.isArray(data.dynamic.phones)) {
    data.dynamic.phones = data.dynamic.phones.map(item => ({
      ...item,
      value: item?.value ? DOMPurify.sanitize(String(item.value)) : ''
    }));
  }
  if (data.dynamic?.social && Array.isArray(data.dynamic.social)) {
    data.dynamic.social = data.dynamic.social.map(item => ({
      ...item,
      value: item?.value ? DOMPurify.sanitize(String(item.value)) : ''
    }));
  }
  if (data.dynamic?.staticSocial && typeof data.dynamic.staticSocial === 'object') {
    Object.values(data.dynamic.staticSocial).forEach(item => {
      if (item?.value) item.value = DOMPurify.sanitize(String(item.value));
    });
  }
  return data;
}

function resetWorkflowAfterEdit(workflow, userId, now) {
  return {
    ...(workflow || {}),
    enabled: true,
    status: 'draft',
    revision: Number(workflow?.revision || 0) + 1,
    submittedAt: null,
    submittedBy: null,
    reviewedAt: null,
    reviewedBy: null,
    reviewNote: '',
    publishedAt: null,
    publishedBy: null,
    lastEditedBy: userId,
    updatedAt: now
  };
}

function mayEdit(access, userId) {
  return Boolean(access?.owner || (access?.workspace && canEdit(access.workspace, userId)));
}

module.exports = function createWorkspaceDesignBridgeRouter({
  getDb,
  designsCollectionName = 'designs',
  workspacesCollectionName = 'workspaces',
  sanitizeInputs,
  DOMPurify
}) {
  const router = express.Router();

  router.post('/save-design', verifyToken, async (req, res, next) => {
    try {
      const db = getDb();
      if (!db) return res.status(500).json({ error: 'DB not connected' });
      const existingId = String(req.query.id || '');
      if (!isSafeDesignId(existingId)) return next();
      const design = await db.collection(designsCollectionName).findOne({ shortId: existingId });
      if (!design || !design.workspaceId) return next();

      const access = await getDesignWorkspaceAccess({
        db, workspacesCollectionName, design, userId: req.user.userId
      });
      if (!access.allowed) return res.status(403).json({ error: 'Workspace access denied' });
      if (!mayEdit(access, req.user.userId)) {
        return res.status(403).json({ error: 'Workspace edit permission required' });
      }

      const data = sanitizeDesignData(req.body || {}, sanitizeInputs, DOMPurify);
      if (design.data?.imageUrls) {
        if (!data.imageUrls) data.imageUrls = {};
        ['capturedFront', 'capturedBack'].forEach(key => {
          if (!data.imageUrls[key] && design.data.imageUrls[key]) data.imageUrls[key] = design.data.imageUrls[key];
        });
      }
      const now = new Date();
      await db.collection(designsCollectionName).updateOne(
        { shortId: design.shortId, workspaceId: design.workspaceId },
        {
          $set: {
            data,
            workflow: resetWorkflowAfterEdit(design.workflow, req.user.userId, now),
            lastEditedBy: req.user.userId,
            lastModified: now
          }
        }
      );
      return res.json({ success: true, id: design.shortId, workspace: true, workflowStatus: 'draft' });
    } catch (error) {
      console.error('[WorkspaceDesignBridge] Collaborative save failed:', error);
      return res.status(500).json({ error: 'Workspace save failed' });
    }
  });

  router.patch('/design/:id/element/:elementId', verifyToken, async (req, res, next) => {
    try {
      const db = getDb();
      if (!db) return res.status(500).json({ error: 'DB not connected' });
      const design = await db.collection(designsCollectionName).findOne({ shortId: String(req.params.id) });
      if (!design || !design.workspaceId) return next();
      const access = await getDesignWorkspaceAccess({ db, workspacesCollectionName, design, userId: req.user.userId });
      if (!access.allowed) return res.status(403).json({ error: 'Workspace access denied' });
      if (!mayEdit(access, req.user.userId)) return res.status(403).json({ error: 'Workspace edit permission required' });

      const allowedKeys = new Set(['position', 'fontSize', 'color', 'content', 'width', 'height', 'rotation', 'opacity', 'zIndex', 'display', 'text', 'src', 'url']);
      const updates = Object.fromEntries(Object.entries(req.body || {}).filter(([key]) => allowedKeys.has(key)));
      if (!Object.keys(updates).length) return res.status(400).json({ error: 'No valid properties to update' });
      const payload = {};
      Object.entries(updates).forEach(([key, value]) => { payload[`data.elements.$.${key}`] = value; });
      const now = new Date();
      Object.assign(payload, {
        workflow: resetWorkflowAfterEdit(design.workflow, req.user.userId, now),
        lastEditedBy: req.user.userId,
        lastModified: now
      });
      let result = await db.collection(designsCollectionName).updateOne(
        { shortId: design.shortId, workspaceId: design.workspaceId, 'data.elements.id': req.params.elementId },
        { $set: payload }
      );
      if (!result.matchedCount) {
        const fallback = {};
        Object.entries(updates).forEach(([key, value]) => { fallback[`elements.$.${key}`] = value; });
        Object.assign(fallback, {
          workflow: resetWorkflowAfterEdit(design.workflow, req.user.userId, now),
          lastEditedBy: req.user.userId,
          lastModified: now
        });
        result = await db.collection(designsCollectionName).updateOne(
          { shortId: design.shortId, workspaceId: design.workspaceId, 'elements.id': req.params.elementId },
          { $set: fallback }
        );
      }
      if (!result.matchedCount) return res.status(404).json({ error: 'Design element not found' });
      return res.json({ success: true, workspace: true, workflowStatus: 'draft' });
    } catch (error) {
      console.error('[WorkspaceDesignBridge] Element update failed:', error);
      return res.status(500).json({ error: 'Workspace element update failed' });
    }
  });

  router.get('/get-design/:id', verifyToken.optional, async (req, res, next) => {
    try {
      const db = getDb();
      if (!db) return res.status(500).json({ error: 'DB not connected' });
      const designId = String(req.params.id || '');
      if (!isSafeDesignId(designId)) return next();
      const design = await db.collection(designsCollectionName).findOne({ shortId: designId });
      if (!design?.workflow?.enabled || design.workflow.status === 'published') return next();
      if (!req.user?.userId) return res.status(404).json({ error: 'Design not found or not published' });
      const access = await getDesignWorkspaceAccess({ db, workspacesCollectionName, design, userId: req.user.userId });
      if (!access.allowed) return res.status(404).json({ error: 'Design not found or not published' });
      res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
      res.setHeader('X-Robots-Tag', 'noindex, noarchive');
      return res.json(design.data);
    } catch (error) {
      console.error('[WorkspaceDesignBridge] Private design read failed:', error);
      return res.status(500).json({ error: 'Failed to load private workspace design' });
    }
  });

  return router;
};

module.exports._test = { mayEdit, resetWorkflowAfterEdit, sanitizeDesignData };
