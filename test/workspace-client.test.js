/** @jest-environment jsdom */
'use strict';

function response(status, payload) {
  return { ok: status >= 200 && status < 300, status, json: async () => payload };
}

function loadClient(fetchImpl, pathname = '/nfc/dashboard.html', body = '') {
  jest.resetModules();
  document.documentElement.innerHTML = `<head></head><body>${body}</body>`;
  window.history.replaceState({}, '', pathname);
  sessionStorage.setItem('authAccessToken', 'workspace-access-token');
  window.fetch = fetchImpl;
  delete window.Auth;
  delete window.WorkspaceClient;
  delete window.EditorReviewWorkflow;
  delete window.EditorBrandKit;
  jest.isolateModules(() => require('../workspace-client'));
  return window.WorkspaceClient;
}

describe('Workspace browser client', () => {
  test('builds authenticated workflow requests', async () => {
    const fetchImpl = jest.fn(async () => response(200, { success: true, status: 'in_review' }));
    const client = loadClient(fetchImpl);

    await client.submitReview('card 123', 'Ready for review');

    expect(client.version).toBe('11.0.0');
    expect(fetchImpl).toHaveBeenCalledWith(
      expect.stringContaining('/api/design-workflow/card%20123/submit'),
      expect.objectContaining({
        method: 'POST',
        credentials: 'include',
        cache: 'no-store',
        headers: expect.objectContaining({
          Authorization: 'Bearer workspace-access-token',
          'Content-Type': 'application/json'
        }),
        body: JSON.stringify({ note: 'Ready for review' })
      })
    );
    expect(document.documentElement.dataset.workspaceClient).toBe('ready');
  });

  test('supports member roles and design linking', async () => {
    const fetchImpl = jest.fn(async () => response(201, { success: true }));
    const client = loadClient(fetchImpl);

    await client.addMember('workspace-1', { email: 'reviewer@example.com', role: 'reviewer' });
    await client.linkDesign('workspace-1', 'card-123');

    expect(fetchImpl.mock.calls[0][0]).toContain('/api/workspaces/workspace-1/members');
    expect(fetchImpl.mock.calls[1][0]).toContain('/api/workspaces/workspace-1/designs/card-123');
    expect(fetchImpl.mock.calls[1][1].method).toBe('POST');
  });

  test('marks a clean editor source as free from injected output metadata', () => {
    const client = loadClient(jest.fn(), '/nfc/editor.html');

    expect(client.removeInjectedOutputWarning()).toBe(false);
    expect(document.documentElement.dataset.editorOutputWarning).toBe('removed');
  });

  test('removes injected truncation warning text from editor pages', () => {
    const client = loadClient(jest.fn(), '/nfc/editor.html');
    document.body.prepend(document.createTextNode('Warning: truncated output (original token count: 41854) Total output lines: 2530'));

    expect(client.removeInjectedOutputWarning()).toBe(true);
    expect(document.body.textContent).not.toContain('Warning: truncated output');
    expect(document.documentElement.dataset.editorOutputWarning).toBe('removed');
  });

  test('adds Brand Kit and review to the mobile more menu', () => {
    const client = loadClient(
      jest.fn(),
      '/nfc/editor.html?id=card-123',
      '<div id="toolbar-more-menu-floating"><hr></div>'
    );
    window.EditorBrandKit = { open: jest.fn() };
    window.EditorReviewWorkflow = { open: jest.fn() };

    expect(client.mountMobileBrandKitMenu()).toBe(false);
    expect(client.mountMobileReviewMenu()).toBe(false);

    const brandButton = document.getElementById('editor-brand-kit-menu-btn');
    const reviewButton = document.getElementById('editor-review-workflow-menu-btn');
    expect(brandButton).not.toBeNull();
    expect(reviewButton).not.toBeNull();
    expect(brandButton.textContent).toContain('هوية الشركة');
    expect(reviewButton.textContent).toContain('مراجعة التصميم');

    brandButton.click();
    reviewButton.click();
    expect(window.EditorBrandKit.open).toHaveBeenCalledTimes(1);
    expect(window.EditorReviewWorkflow.open).toHaveBeenCalledTimes(1);
    expect(document.documentElement.dataset.editorMobileBrandKitMenu).toBe('ready');
    expect(document.documentElement.dataset.editorMobileReviewMenu).toBe('ready');
  });

  test('surfaces authorization errors with status and payload', async () => {
    const client = loadClient(jest.fn(async () => response(403, { error: 'Review permission required' })));

    await expect(client.decide('card-123', 'approve')).rejects.toMatchObject({
      message: 'Review permission required',
      status: 403,
      payload: { error: 'Review permission required' }
    });
  });
});
