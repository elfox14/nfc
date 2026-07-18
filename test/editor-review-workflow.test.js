/** @jest-environment jsdom */
'use strict';

const flush = () => new Promise(resolve => setTimeout(resolve, 0));

function workflowData(overrides = {}) {
  return {
    success: true,
    design: { shortId: 'card-123', workflow: { status: 'in_review', revision: 2 } },
    workspace: { workspaceId: 'workspace-1', name: 'MC PRIME Team' },
    permission: 'reviewer',
    capabilities: { edit: false, review: true, publish: false },
    entries: [
      {
        entryId: 'comment-1', kind: 'comment', text: 'راجع موضع الشعار', elementId: 'logo',
        authorName: 'Reviewer', resolved: false, createdAt: '2026-07-19T10:00:00Z'
      },
      {
        entryId: 'activity-1', kind: 'activity', action: 'submitted', authorName: 'Editor',
        createdAt: '2026-07-19T09:00:00Z'
      }
    ],
    ...overrides
  };
}

async function loadManager(data = workflowData()) {
  jest.resetModules();
  document.documentElement.lang = 'ar';
  document.documentElement.innerHTML = '<head></head><body><div id="pro-toolbar"><div class="tb-history"></div></div></body>';
  window.history.replaceState({}, '', '/nfc/editor.html?id=card-123');
  window.UIManager = { announce: jest.fn() };
  window.EditorWorkspace = { getState: jest.fn(() => ({ selectedItem: 'logo' })) };
  window.WorkspaceClient = {
    workflow: jest.fn(async () => data),
    addComment: jest.fn(async () => ({ success: true })),
    resolveComment: jest.fn(async () => ({ success: true })),
    submitReview: jest.fn(async () => ({ success: true })),
    decide: jest.fn(async () => ({ success: true })),
    publish: jest.fn(async () => ({ success: true })),
    returnDraft: jest.fn(async () => ({ success: true }))
  };
  delete window.EditorReviewWorkflow;
  jest.isolateModules(() => require('../editor-review-workflow'));
  await flush();
  await flush();
  return window.EditorReviewWorkflow;
}

describe('editor review workflow', () => {
  test('mounts the review launcher and loads status with unresolved badge', async () => {
    const manager = await loadManager();
    const launcher = document.getElementById('editor-review-workflow-btn');

    expect(manager.version).toBe('11.0.0');
    expect(launcher).not.toBeNull();
    expect(launcher.textContent).toContain('المراجعة');
    expect(launcher.dataset.workflowStatus).toBe('in_review');
    expect(launcher.querySelector('.workspace-launcher-badge').textContent).toBe('1');
    expect(document.documentElement.dataset.editorReviewStatus).toBe('in_review');
  });

  test('renders reviewer actions and submits an element comment', async () => {
    await loadManager();
    document.getElementById('editor-review-workflow-btn').click();
    await flush();
    await flush();

    const modal = document.getElementById('workspace-review-modal');
    expect(modal.hidden).toBe(false);
    expect(modal.textContent).toContain('MC PRIME Team');
    expect(modal.textContent).toContain('الدور: مراجع');
    expect(modal.querySelector('[data-review-action="approve"]')).not.toBeNull();
    expect(modal.querySelector('[data-review-action="changes"]')).not.toBeNull();

    const textarea = modal.querySelector('[data-review-form="comment"] textarea');
    textarea.value = 'كبر الشعار قليلًا';
    modal.querySelector('[data-review-form="comment"] button[type="submit"]').click();
    await flush();
    await flush();

    expect(window.WorkspaceClient.addComment).toHaveBeenCalledWith('card-123', {
      text: 'كبر الشعار قليلًا',
      elementId: 'logo'
    });
  });

  test('shows an unavailable workspace state without exposing review actions', async () => {
    jest.resetModules();
    document.documentElement.lang = 'en';
    document.documentElement.innerHTML = '<head></head><body><div id="pro-toolbar"><div class="tb-history"></div></div></body>';
    window.history.replaceState({}, '', '/nfc/editor.html?id=private-card');
    const error = Object.assign(new Error('Design is not attached to a workspace'), { status: 409 });
    window.WorkspaceClient = { workflow: jest.fn(async () => { throw error; }) };
    delete window.EditorReviewWorkflow;
    jest.isolateModules(() => require('../editor-review-workflow'));
    await flush();
    document.getElementById('editor-review-workflow-btn').click();
    await flush();

    expect(document.getElementById('workspace-review-modal').textContent).toContain('not attached to a team workspace');
    expect(document.querySelector('[data-review-action="approve"]')).toBeNull();
  });
});
