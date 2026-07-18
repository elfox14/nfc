/** @jest-environment node */
'use strict';

const {
  canAccess,
  canEdit,
  canManage,
  canPublish,
  canReview,
  cleanText,
  getDesignWorkspaceAccess,
  isSafeDesignId,
  isSafeWorkspaceId,
  membershipFor,
  normalizeMemberRole,
  permissionFor
} = require('../utils/workspace-access');

const workspace = {
  workspaceId: 'workspace-1',
  ownerId: 'owner-1',
  members: [
    { userId: 'admin-1', role: 'admin' },
    { userId: 'editor-1', role: 'editor' },
    { userId: 'reviewer-1', role: 'reviewer' },
    { userId: 'viewer-1', role: 'viewer' }
  ]
};

describe('team workspace access rules', () => {
  test('enforces management, edit, review, publish and view roles independently', () => {
    expect(permissionFor(workspace, 'owner-1')).toBe('owner');
    expect(membershipFor(workspace, 'admin-1')).toMatchObject({ role: 'admin' });
    expect(canManage(workspace, 'owner-1')).toBe(true);
    expect(canManage(workspace, 'admin-1')).toBe(true);
    expect(canManage(workspace, 'editor-1')).toBe(false);
    expect(canEdit(workspace, 'editor-1')).toBe(true);
    expect(canEdit(workspace, 'reviewer-1')).toBe(false);
    expect(canReview(workspace, 'reviewer-1')).toBe(true);
    expect(canReview(workspace, 'editor-1')).toBe(false);
    expect(canPublish(workspace, 'admin-1')).toBe(true);
    expect(canPublish(workspace, 'reviewer-1')).toBe(false);
    expect(canAccess(workspace, 'viewer-1', 'viewer')).toBe(true);
    expect(canAccess(workspace, 'outsider', 'viewer')).toBe(false);
  });

  test('keeps the design owner authorized while sharing workspace access with members', async () => {
    const db = {
      collection: jest.fn(() => ({ findOne: jest.fn(async query => query.workspaceId === 'workspace-1' ? workspace : null) }))
    };
    const design = { shortId: 'card-123', ownerId: 'design-owner', workspaceId: 'workspace-1' };

    await expect(getDesignWorkspaceAccess({ db, workspacesCollectionName: 'workspaces', design, userId: 'design-owner' }))
      .resolves.toMatchObject({ allowed: true, permission: 'owner', owner: true });
    await expect(getDesignWorkspaceAccess({ db, workspacesCollectionName: 'workspaces', design, userId: 'reviewer-1' }))
      .resolves.toMatchObject({ allowed: true, permission: 'reviewer', owner: false });
    await expect(getDesignWorkspaceAccess({ db, workspacesCollectionName: 'workspaces', design, userId: 'outsider' }))
      .resolves.toMatchObject({ allowed: false, permission: null });
  });

  test('normalizes ids, roles and user-facing text', () => {
    expect(isSafeWorkspaceId('team_2026-main')).toBe(true);
    expect(isSafeWorkspaceId('bad space')).toBe(false);
    expect(isSafeDesignId('card_123')).toBe(true);
    expect(isSafeDesignId('x')).toBe(false);
    expect(normalizeMemberRole('reviewer')).toBe('reviewer');
    expect(normalizeMemberRole('owner')).toBe('viewer');
    expect(cleanText('  Team <script> Prime  ', 40)).toBe('Team script Prime');
  });
});
