'use strict';

const ROLE_WEIGHT = Object.freeze({ viewer: 1, reviewer: 2, editor: 3, admin: 4, owner: 5 });
const MEMBER_ROLES = Object.freeze(['admin', 'editor', 'reviewer', 'viewer']);

function cleanText(value, maxLength = 240) {
  return String(value || '')
    .replace(/[<>]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, maxLength);
}

function isSafeWorkspaceId(value) {
  return typeof value === 'string' && /^[A-Za-z0-9_-]{4,40}$/.test(value);
}

function isSafeDesignId(value) {
  return typeof value === 'string' && /^[A-Za-z0-9_-]{3,32}$/.test(value);
}

function membershipFor(workspace, userId) {
  if (!workspace || !userId) return null;
  if (workspace.ownerId === userId) return { userId, role: 'owner', name: workspace.ownerName || '', email: workspace.ownerEmail || '' };
  return Array.isArray(workspace.members)
    ? workspace.members.find(member => member && member.userId === userId) || null
    : null;
}

function permissionFor(workspace, userId) {
  return membershipFor(workspace, userId)?.role || null;
}

function canAccess(workspace, userId, minimumRole = 'viewer') {
  const role = permissionFor(workspace, userId);
  return Boolean(role && ROLE_WEIGHT[role] >= ROLE_WEIGHT[minimumRole]);
}

function canManage(workspace, userId) {
  return canAccess(workspace, userId, 'admin');
}

function canEdit(workspace, userId) {
  const role = permissionFor(workspace, userId);
  return ['owner', 'admin', 'editor'].includes(role);
}

function canReview(workspace, userId) {
  const role = permissionFor(workspace, userId);
  return ['owner', 'admin', 'reviewer'].includes(role);
}

function canPublish(workspace, userId) {
  const role = permissionFor(workspace, userId);
  return ['owner', 'admin'].includes(role);
}

function normalizeMemberRole(role) {
  return MEMBER_ROLES.includes(role) ? role : 'viewer';
}

async function findWorkspace(db, collectionName, workspaceId) {
  if (!db || !isSafeWorkspaceId(workspaceId)) return null;
  return db.collection(collectionName).findOne({ workspaceId });
}

async function getDesignWorkspaceAccess({ db, workspacesCollectionName, design, userId }) {
  if (!design || !userId) return { allowed: false, permission: null, workspace: null };
  if (design.ownerId === userId) {
    const workspace = design.workspaceId
      ? await findWorkspace(db, workspacesCollectionName, design.workspaceId)
      : null;
    return { allowed: true, permission: 'owner', workspace, owner: true };
  }
  if (!design.workspaceId) return { allowed: false, permission: null, workspace: null };
  const workspace = await findWorkspace(db, workspacesCollectionName, design.workspaceId);
  const permission = permissionFor(workspace, userId);
  return { allowed: Boolean(permission), permission, workspace, owner: false };
}

module.exports = {
  MEMBER_ROLES,
  ROLE_WEIGHT,
  canAccess,
  canEdit,
  canManage,
  canPublish,
  canReview,
  cleanText,
  findWorkspace,
  getDesignWorkspaceAccess,
  isSafeDesignId,
  isSafeWorkspaceId,
  membershipFor,
  normalizeMemberRole,
  permissionFor
};
