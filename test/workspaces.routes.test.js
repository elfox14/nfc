/** @jest-environment node */
'use strict';

const {
  WORKFLOW_STATUSES,
  cleanElementId,
  designView,
  normalizeEmail,
  workflowFor,
  workspaceView
} = require('../routes/workspaces.routes')._test;

describe('workspace workflow route helpers', () => {
  test('normalizes workflow state for legacy and shared designs', () => {
    expect(WORKFLOW_STATUSES).toEqual(['draft', 'in_review', 'changes_requested', 'approved', 'published']);
    expect(workflowFor({ createdAt: '2026-07-19' })).toMatchObject({
      enabled: false,
      status: 'draft',
      revision: 1
    });
    expect(workflowFor({
      workspaceId: 'workspace-1',
      workflow: { status: 'approved', revision: 7, reviewNote: 'Ready' }
    })).toMatchObject({
      enabled: true,
      status: 'approved',
      revision: 7,
      reviewNote: 'Ready'
    });
  });

  test('returns compact workspace and design snapshots for clients', () => {
    const workspace = workspaceView({
      workspaceId: 'workspace-1',
      name: 'MC PRIME Team',
      description: 'Medical cards',
      ownerId: 'owner-1',
      ownerName: 'Owner',
      members: [{ userId: 'reviewer-1', role: 'reviewer' }],
      createdAt: '2026-07-19',
      updatedAt: '2026-07-19'
    }, 'reviewer-1');
    expect(workspace).toMatchObject({ workspaceId: 'workspace-1', permission: 'reviewer' });

    const design = designView({
      shortId: 'card-123',
      ownerId: 'owner-1',
      workspaceId: 'workspace-1',
      data: {
        inputs: { 'input-name_ar': 'بطاقة الفريق' },
        imageUrls: { capturedFront: '/front.webp' }
      },
      workflow: { status: 'in_review', revision: 2 }
    });
    expect(design).toMatchObject({
      shortId: 'card-123',
      name: 'بطاقة الفريق',
      thumbnail: '/front.webp',
      workflow: { status: 'in_review', revision: 2 }
    });
    expect(design).not.toHaveProperty('data');
  });

  test('cleans emails and optional element targets', () => {
    expect(normalizeEmail('  TEAM@Example.COM ')).toBe('team@example.com');
    expect(cleanElementId('card-name')).toBe('card-name');
    expect(cleanElementId('bad target with spaces')).toBe('');
  });
});
