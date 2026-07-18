'use strict';

const express = require('express');
const { nanoid } = require('nanoid');
const verifyToken = require('../auth-middleware');
const {
  MEMBER_ROLES,
  canAccess,
  canEdit,
  canManage,
  canPublish,
  canReview,
  cleanText,
  getDesignWorkspaceAccess,
  isSafeDesignId,
  isSafeWorkspaceId,
  normalizeMemberRole,
  permissionFor
} = require('../utils/workspace-access');

const WORKFLOW_STATUSES = Object.freeze(['draft', 'in_review', 'changes_requested', 'approved', 'published']);
const MAX_WORKSPACES_PER_OWNER = 10;
const MAX_MEMBERS = 50;
const MAX_REVIEW_ENTRIES = 1000;

function normalizeEmail(value) {
  return String(value || '').trim().toLowerCase().slice(0, 180);
}

function cleanElementId(value) {
  const normalized = String(value || '').trim();
  return /^[A-Za-z0-9_.:-]{1,80}$/.test(normalized) ? normalized : '';
}

function workflowFor(design) {
  const source = design?.workflow && typeof design.workflow === 'object' ? design.workflow : {};
  const status = WORKFLOW_STATUSES.includes(source.status) ? source.status : 'draft';
  return {
    enabled: Boolean(design?.workspaceId),
    status,
    revision: Number(source.revision || 1),
    submittedAt: source.submittedAt || null,
    submittedBy: source.submittedBy || null,
    reviewedAt: source.reviewedAt || null,
    reviewedBy: source.reviewedBy || null,
    reviewNote: source.reviewNote || '',
    publishedAt: source.publishedAt || null,
    publishedBy: source.publishedBy || null,
    updatedAt: source.updatedAt || design?.lastModified || design?.createdAt || null
  };
}

function workspaceView(workspace, userId) {
  return {
    workspaceId: workspace.workspaceId,
    name: workspace.name,
    description: workspace.description || '',
    ownerId: workspace.ownerId,
    ownerName: workspace.ownerName || '',
    members: workspace.members || [],
    permission: permissionFor(workspace, userId),
    createdAt: workspace.createdAt,
    updatedAt: workspace.updatedAt
  };
}

function designView(design) {
  const inputs = design?.data?.inputs || {};
  return {
    shortId: design.shortId,
    ownerId: design.ownerId,
    workspaceId: design.workspaceId || null,
    name: inputs['input-name_ar'] || inputs['input-name_en'] || inputs['input-name'] || 'Untitled design',
    thumbnail: design?.data?.imageUrls?.capturedFront || design?.data?.imageUrls?.front || null,
    createdAt: design.createdAt,
    lastModified: design.lastModified,
    workflow: workflowFor(design)
  };
}

module.exports = function createWorkspacesRouter({
  getDb,
  workspacesCollectionName = 'workspaces',
  designReviewsCollectionName = 'designReviews',
  usersCollectionName = 'users',
  designsCollectionName = 'designs'
}) {
  const router = express.Router();

  function workspaces() {
    return getDb().collection(workspacesCollectionName);
  }

  function reviews() {
    return getDb().collection(designReviewsCollectionName);
  }

  function designs() {
    return getDb().collection(designsCollectionName);
  }

  async function currentUser(userId) {
    return getDb().collection(usersCollectionName).findOne(
      { userId },
      { projection: { userId: 1, name: 1, email: 1, avatar: 1 } }
    );
  }

  async function loadWorkspace(req, res, minimumRole = 'viewer') {
    const workspaceId = String(req.params.workspaceId || '');
    if (!isSafeWorkspaceId(workspaceId)) {
      res.status(400).json({ error: 'Invalid workspace id' });
      return null;
    }
    const workspace = await workspaces().findOne({ workspaceId });
    if (!workspace) {
      res.status(404).json({ error: 'Workspace not found' });
      return null;
    }
    if (!canAccess(workspace, req.user.userId, minimumRole)) {
      res.status(403).json({ error: 'Workspace access denied' });
      return null;
    }
    return workspace;
  }

  async function loadDesignContext(req, res) {
    const designId = String(req.params.designId || '');
    if (!isSafeDesignId(designId)) {
      res.status(400).json({ error: 'Invalid design id' });
      return null;
    }
    const design = await designs().findOne({ shortId: designId });
    if (!design) {
      res.status(404).json({ error: 'Design not found' });
      return null;
    }
    if (!design.workspaceId) {
      res.status(409).json({ error: 'Design is not attached to a workspace' });
      return null;
    }
    const access = await getDesignWorkspaceAccess({
      db: getDb(), workspacesCollectionName, design, userId: req.user.userId
    });
    if (!access.allowed || !access.workspace) {
      res.status(403).json({ error: 'Design workspace access denied' });
      return null;
    }
    return {
      design,
      workspace: access.workspace,
      permission: access.permission,
      owner: access.owner,
      canEdit: access.owner || canEdit(access.workspace, req.user.userId),
      canReview: canReview(access.workspace, req.user.userId),
      canPublish: access.owner || canPublish(access.workspace, req.user.userId)
    };
  }

  async function recordEntry({ design, workspace, user, kind = 'activity', action = '', text = '', elementId = '', parentId = '' }) {
    const total = await reviews().countDocuments({ designId: design.shortId });
    if (total >= MAX_REVIEW_ENTRIES) {
      const oldest = await reviews().find({ designId: design.shortId }).sort({ createdAt: 1 }).limit(total - MAX_REVIEW_ENTRIES + 1).project({ _id: 1 }).toArray();
      if (oldest.length) await reviews().deleteMany({ _id: { $in: oldest.map(item => item._id) } });
    }
    const entry = {
      entryId: nanoid(12),
      designId: design.shortId,
      workspaceId: workspace.workspaceId,
      kind,
      action,
      text: cleanText(text, 1500),
      elementId: cleanElementId(elementId),
      parentId: cleanText(parentId, 40),
      authorId: user.userId,
      authorName: cleanText(user.name || user.email || 'User', 100),
      authorEmail: normalizeEmail(user.email),
      resolved: false,
      createdAt: new Date()
    };
    await reviews().insertOne(entry);
    return entry;
  }

  async function updateWorkflow(designId, patch) {
    const update = { ...patch, 'workflow.updatedAt': new Date(), lastModified: new Date() };
    await designs().updateOne({ shortId: designId }, { $set: update });
  }

  router.get('/workspaces', verifyToken, async (req, res) => {
    try {
      if (!getDb()) return res.status(500).json({ error: 'DB not connected' });
      const items = await workspaces().find({
        $or: [{ ownerId: req.user.userId }, { 'members.userId': req.user.userId }]
      }).sort({ updatedAt: -1 }).toArray();
      return res.json({ success: true, workspaces: items.map(item => workspaceView(item, req.user.userId)) });
    } catch (error) {
      console.error('[Workspaces] List failed:', error);
      return res.status(500).json({ error: 'Failed to load workspaces' });
    }
  });

  router.post('/workspaces', verifyToken, async (req, res) => {
    try {
      if (!getDb()) return res.status(500).json({ error: 'DB not connected' });
      const name = cleanText(req.body?.name, 80);
      if (!name) return res.status(400).json({ error: 'Workspace name is required' });
      const count = await workspaces().countDocuments({ ownerId: req.user.userId });
      if (count >= MAX_WORKSPACES_PER_OWNER) return res.status(409).json({ error: 'Workspace limit reached' });
      const user = await currentUser(req.user.userId) || req.user;
      const workspace = {
        workspaceId: nanoid(12),
        name,
        description: cleanText(req.body?.description, 240),
        ownerId: req.user.userId,
        ownerName: cleanText(user.name || user.email, 100),
        ownerEmail: normalizeEmail(user.email),
        members: [],
        createdAt: new Date(),
        updatedAt: new Date()
      };
      await workspaces().insertOne(workspace);
      return res.status(201).json({ success: true, workspace: workspaceView(workspace, req.user.userId) });
    } catch (error) {
      console.error('[Workspaces] Create failed:', error);
      return res.status(500).json({ error: 'Failed to create workspace' });
    }
  });

  router.get('/workspaces/:workspaceId', verifyToken, async (req, res) => {
    try {
      const workspace = await loadWorkspace(req, res);
      if (!workspace) return undefined;
      return res.json({ success: true, workspace: workspaceView(workspace, req.user.userId) });
    } catch (error) {
      console.error('[Workspaces] Read failed:', error);
      return res.status(500).json({ error: 'Failed to load workspace' });
    }
  });

  router.put('/workspaces/:workspaceId', verifyToken, async (req, res) => {
    try {
      const workspace = await loadWorkspace(req, res, 'admin');
      if (!workspace) return undefined;
      const name = cleanText(req.body?.name, 80);
      if (!name) return res.status(400).json({ error: 'Workspace name is required' });
      const patch = { name, description: cleanText(req.body?.description, 240), updatedAt: new Date() };
      await workspaces().updateOne({ workspaceId: workspace.workspaceId }, { $set: patch });
      return res.json({ success: true, workspace: workspaceView({ ...workspace, ...patch }, req.user.userId) });
    } catch (error) {
      console.error('[Workspaces] Update failed:', error);
      return res.status(500).json({ error: 'Failed to update workspace' });
    }
  });

  router.delete('/workspaces/:workspaceId', verifyToken, async (req, res) => {
    try {
      const workspace = await loadWorkspace(req, res, 'owner');
      if (!workspace) return undefined;
      const linked = await designs().countDocuments({ workspaceId: workspace.workspaceId });
      if (linked) return res.status(409).json({ error: 'Unlink workspace designs before deleting it' });
      await Promise.all([
        workspaces().deleteOne({ workspaceId: workspace.workspaceId }),
        reviews().deleteMany({ workspaceId: workspace.workspaceId })
      ]);
      return res.json({ success: true });
    } catch (error) {
      console.error('[Workspaces] Delete failed:', error);
      return res.status(500).json({ error: 'Failed to delete workspace' });
    }
  });

  router.post('/workspaces/:workspaceId/members', verifyToken, async (req, res) => {
    try {
      const workspace = await loadWorkspace(req, res, 'admin');
      if (!workspace) return undefined;
      if ((workspace.members || []).length >= MAX_MEMBERS) return res.status(409).json({ error: 'Workspace member limit reached' });
      const email = normalizeEmail(req.body?.email);
      if (!email) return res.status(400).json({ error: 'Member email is required' });
      const user = await getDb().collection(usersCollectionName).findOne({ email }, { projection: { userId: 1, name: 1, email: 1 } });
      if (!user) return res.status(404).json({ error: 'Registered user not found' });
      if (user.userId === workspace.ownerId || (workspace.members || []).some(member => member.userId === user.userId)) {
        return res.status(409).json({ error: 'User is already a workspace member' });
      }
      const role = normalizeMemberRole(req.body?.role);
      if (role === 'admin' && workspace.ownerId !== req.user.userId) return res.status(403).json({ error: 'Only the owner can add an admin' });
      const member = {
        userId: user.userId,
        name: cleanText(user.name || user.email, 100),
        email: normalizeEmail(user.email),
        role,
        addedAt: new Date()
      };
      await workspaces().updateOne(
        { workspaceId: workspace.workspaceId },
        { $push: { members: member }, $set: { updatedAt: new Date() } }
      );
      return res.status(201).json({ success: true, member });
    } catch (error) {
      console.error('[Workspaces] Add member failed:', error);
      return res.status(500).json({ error: 'Failed to add member' });
    }
  });

  router.patch('/workspaces/:workspaceId/members/:userId', verifyToken, async (req, res) => {
    try {
      const workspace = await loadWorkspace(req, res, 'admin');
      if (!workspace) return undefined;
      const target = (workspace.members || []).find(member => member.userId === req.params.userId);
      if (!target) return res.status(404).json({ error: 'Workspace member not found' });
      const role = normalizeMemberRole(req.body?.role);
      if ((target.role === 'admin' || role === 'admin') && workspace.ownerId !== req.user.userId) {
        return res.status(403).json({ error: 'Only the owner can manage admins' });
      }
      await workspaces().updateOne(
        { workspaceId: workspace.workspaceId, 'members.userId': target.userId },
        { $set: { 'members.$.role': role, updatedAt: new Date() } }
      );
      return res.json({ success: true, role });
    } catch (error) {
      console.error('[Workspaces] Update member failed:', error);
      return res.status(500).json({ error: 'Failed to update member' });
    }
  });

  router.delete('/workspaces/:workspaceId/members/:userId', verifyToken, async (req, res) => {
    try {
      const workspace = await loadWorkspace(req, res, 'admin');
      if (!workspace) return undefined;
      const target = (workspace.members || []).find(member => member.userId === req.params.userId);
      if (!target) return res.status(404).json({ error: 'Workspace member not found' });
      if (target.role === 'admin' && workspace.ownerId !== req.user.userId) return res.status(403).json({ error: 'Only the owner can remove an admin' });
      await workspaces().updateOne(
        { workspaceId: workspace.workspaceId },
        { $pull: { members: { userId: target.userId } }, $set: { updatedAt: new Date() } }
      );
      return res.json({ success: true });
    } catch (error) {
      console.error('[Workspaces] Remove member failed:', error);
      return res.status(500).json({ error: 'Failed to remove member' });
    }
  });

  router.get('/workspaces/:workspaceId/designs', verifyToken, async (req, res) => {
    try {
      const workspace = await loadWorkspace(req, res);
      if (!workspace) return undefined;
      const items = await designs().find({ workspaceId: workspace.workspaceId }).project({
        shortId: 1, ownerId: 1, workspaceId: 1, workflow: 1, createdAt: 1, lastModified: 1,
        'data.inputs.input-name_ar': 1, 'data.inputs.input-name_en': 1, 'data.inputs.input-name': 1,
        'data.imageUrls.front': 1, 'data.imageUrls.capturedFront': 1
      }).sort({ lastModified: -1, createdAt: -1 }).toArray();
      return res.json({ success: true, permission: permissionFor(workspace, req.user.userId), designs: items.map(designView) });
    } catch (error) {
      console.error('[Workspaces] List designs failed:', error);
      return res.status(500).json({ error: 'Failed to load workspace designs' });
    }
  });

  router.post('/workspaces/:workspaceId/designs/:designId', verifyToken, async (req, res) => {
    try {
      const workspace = await loadWorkspace(req, res);
      if (!workspace) return undefined;
      if (!canEdit(workspace, req.user.userId)) return res.status(403).json({ error: 'Workspace edit permission required' });
      const designId = String(req.params.designId || '');
      if (!isSafeDesignId(designId)) return res.status(400).json({ error: 'Invalid design id' });
      const design = await designs().findOne({ shortId: designId });
      if (!design) return res.status(404).json({ error: 'Design not found' });
      if (design.ownerId !== req.user.userId) return res.status(403).json({ error: 'Only the design owner can attach it to a workspace' });
      if (design.workspaceId && design.workspaceId !== workspace.workspaceId) return res.status(409).json({ error: 'Design already belongs to another workspace' });
      const now = new Date();
      const workflow = {
        enabled: true, status: 'draft', revision: Number(design.workflow?.revision || 0) + 1,
        submittedAt: null, submittedBy: null, reviewedAt: null, reviewedBy: null,
        reviewNote: '', publishedAt: null, publishedBy: null, updatedAt: now
      };
      await designs().updateOne({ shortId: designId, ownerId: req.user.userId }, {
        $set: { workspaceId: workspace.workspaceId, workflow, lastModified: now }
      });
      const user = await currentUser(req.user.userId) || req.user;
      await recordEntry({ design: { ...design, workspaceId: workspace.workspaceId }, workspace, user, action: 'linked', text: workspace.name });
      return res.json({ success: true, design: designView({ ...design, workspaceId: workspace.workspaceId, workflow, lastModified: now }) });
    } catch (error) {
      console.error('[Workspaces] Attach design failed:', error);
      return res.status(500).json({ error: 'Failed to attach design' });
    }
  });

  router.delete('/workspaces/:workspaceId/designs/:designId', verifyToken, async (req, res) => {
    try {
      const workspace = await loadWorkspace(req, res);
      if (!workspace) return undefined;
      const design = await designs().findOne({ shortId: String(req.params.designId), workspaceId: workspace.workspaceId });
      if (!design) return res.status(404).json({ error: 'Workspace design not found' });
      const allowed = design.ownerId === req.user.userId || canManage(workspace, req.user.userId);
      if (!allowed) return res.status(403).json({ error: 'Only the design owner or workspace admin can unlink it' });
      await designs().updateOne({ shortId: design.shortId }, {
        $unset: { workspaceId: '', workflow: '' }, $set: { lastModified: new Date() }
      });
      await reviews().deleteMany({ designId: design.shortId, workspaceId: workspace.workspaceId });
      return res.json({ success: true });
    } catch (error) {
      console.error('[Workspaces] Unlink design failed:', error);
      return res.status(500).json({ error: 'Failed to unlink design' });
    }
  });

  router.get('/design-workflow/:designId', verifyToken, async (req, res) => {
    try {
      const context = await loadDesignContext(req, res);
      if (!context) return undefined;
      const entries = await reviews().find({ designId: context.design.shortId }).sort({ createdAt: 1 }).limit(MAX_REVIEW_ENTRIES).toArray();
      return res.json({
        success: true,
        design: designView(context.design),
        workspace: { workspaceId: context.workspace.workspaceId, name: context.workspace.name },
        permission: context.permission,
        capabilities: { edit: context.canEdit, review: context.canReview, publish: context.canPublish },
        entries
      });
    } catch (error) {
      console.error('[Workflow] Load failed:', error);
      return res.status(500).json({ error: 'Failed to load design workflow' });
    }
  });

  router.post('/design-workflow/:designId/comments', verifyToken, async (req, res) => {
    try {
      const context = await loadDesignContext(req, res);
      if (!context) return undefined;
      const text = cleanText(req.body?.text, 1500);
      if (!text) return res.status(400).json({ error: 'Comment text is required' });
      const user = await currentUser(req.user.userId) || req.user;
      const entry = await recordEntry({
        design: context.design, workspace: context.workspace, user, kind: 'comment', text,
        elementId: req.body?.elementId, parentId: req.body?.parentId
      });
      return res.status(201).json({ success: true, entry });
    } catch (error) {
      console.error('[Workflow] Comment failed:', error);
      return res.status(500).json({ error: 'Failed to add comment' });
    }
  });

  router.patch('/design-workflow/:designId/comments/:entryId', verifyToken, async (req, res) => {
    try {
      const context = await loadDesignContext(req, res);
      if (!context) return undefined;
      const entry = await reviews().findOne({ designId: context.design.shortId, entryId: req.params.entryId, kind: 'comment' });
      if (!entry) return res.status(404).json({ error: 'Comment not found' });
      const allowed = entry.authorId === req.user.userId || context.canEdit || context.canReview;
      if (!allowed) return res.status(403).json({ error: 'Comment resolution permission required' });
      const resolved = req.body?.resolved !== false;
      await reviews().updateOne({ _id: entry._id }, {
        $set: { resolved, resolvedAt: resolved ? new Date() : null, resolvedBy: resolved ? req.user.userId : null }
      });
      return res.json({ success: true, resolved });
    } catch (error) {
      console.error('[Workflow] Resolve comment failed:', error);
      return res.status(500).json({ error: 'Failed to update comment' });
    }
  });

  router.post('/design-workflow/:designId/submit', verifyToken, async (req, res) => {
    try {
      const context = await loadDesignContext(req, res);
      if (!context) return undefined;
      if (!context.canEdit) return res.status(403).json({ error: 'Design edit permission required' });
      const current = workflowFor(context.design);
      if (!['draft', 'changes_requested'].includes(current.status)) return res.status(409).json({ error: 'Design cannot be submitted from its current status' });
      const now = new Date();
      await updateWorkflow(context.design.shortId, {
        'workflow.enabled': true, 'workflow.status': 'in_review',
        'workflow.submittedAt': now, 'workflow.submittedBy': req.user.userId,
        'workflow.reviewedAt': null, 'workflow.reviewedBy': null, 'workflow.reviewNote': '',
        'workflow.publishedAt': null, 'workflow.publishedBy': null
      });
      const user = await currentUser(req.user.userId) || req.user;
      await recordEntry({ design: context.design, workspace: context.workspace, user, action: 'submitted', text: req.body?.note });
      return res.json({ success: true, status: 'in_review' });
    } catch (error) {
      console.error('[Workflow] Submit failed:', error);
      return res.status(500).json({ error: 'Failed to submit design for review' });
    }
  });

  router.post('/design-workflow/:designId/decision', verifyToken, async (req, res) => {
    try {
      const context = await loadDesignContext(req, res);
      if (!context) return undefined;
      if (!context.canReview) return res.status(403).json({ error: 'Review permission required' });
      const action = req.body?.action;
      if (!['approve', 'request_changes'].includes(action)) return res.status(400).json({ error: 'Invalid review decision' });
      const current = workflowFor(context.design);
      if (current.status !== 'in_review') return res.status(409).json({ error: 'Design is not currently in review' });
      const note = cleanText(req.body?.note, 1500);
      if (action === 'request_changes' && !note) return res.status(400).json({ error: 'A change request note is required' });
      const status = action === 'approve' ? 'approved' : 'changes_requested';
      const now = new Date();
      await updateWorkflow(context.design.shortId, {
        'workflow.status': status, 'workflow.reviewedAt': now, 'workflow.reviewedBy': req.user.userId,
        'workflow.reviewNote': note, 'workflow.publishedAt': null, 'workflow.publishedBy': null
      });
      const user = await currentUser(req.user.userId) || req.user;
      await recordEntry({ design: context.design, workspace: context.workspace, user, action: status, text: note });
      if (action === 'request_changes') {
        await recordEntry({ design: context.design, workspace: context.workspace, user, kind: 'comment', text: note });
      }
      return res.json({ success: true, status });
    } catch (error) {
      console.error('[Workflow] Decision failed:', error);
      return res.status(500).json({ error: 'Failed to save review decision' });
    }
  });

  router.post('/design-workflow/:designId/publish', verifyToken, async (req, res) => {
    try {
      const context = await loadDesignContext(req, res);
      if (!context) return undefined;
      if (!context.canPublish) return res.status(403).json({ error: 'Publish permission required' });
      const current = workflowFor(context.design);
      if (current.status !== 'approved') return res.status(409).json({ error: 'Design must be approved before publishing' });
      const now = new Date();
      await updateWorkflow(context.design.shortId, {
        'workflow.status': 'published', 'workflow.publishedAt': now, 'workflow.publishedBy': req.user.userId
      });
      const user = await currentUser(req.user.userId) || req.user;
      await recordEntry({ design: context.design, workspace: context.workspace, user, action: 'published' });
      return res.json({ success: true, status: 'published' });
    } catch (error) {
      console.error('[Workflow] Publish failed:', error);
      return res.status(500).json({ error: 'Failed to publish design' });
    }
  });

  router.post('/design-workflow/:designId/draft', verifyToken, async (req, res) => {
    try {
      const context = await loadDesignContext(req, res);
      if (!context) return undefined;
      if (!context.canEdit) return res.status(403).json({ error: 'Design edit permission required' });
      const current = workflowFor(context.design);
      if (current.status === 'in_review' && !context.canReview) return res.status(409).json({ error: 'A reviewer must return an active review to draft' });
      await updateWorkflow(context.design.shortId, {
        'workflow.status': 'draft', 'workflow.submittedAt': null, 'workflow.submittedBy': null,
        'workflow.reviewedAt': null, 'workflow.reviewedBy': null, 'workflow.reviewNote': '',
        'workflow.publishedAt': null, 'workflow.publishedBy': null
      });
      const user = await currentUser(req.user.userId) || req.user;
      await recordEntry({ design: context.design, workspace: context.workspace, user, action: 'draft', text: req.body?.note });
      return res.json({ success: true, status: 'draft' });
    } catch (error) {
      console.error('[Workflow] Draft transition failed:', error);
      return res.status(500).json({ error: 'Failed to return design to draft' });
    }
  });

  return router;
};

module.exports._test = {
  WORKFLOW_STATUSES,
  cleanElementId,
  designView,
  normalizeEmail,
  workflowFor,
  workspaceView
};
