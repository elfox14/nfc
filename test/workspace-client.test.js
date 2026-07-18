/** @jest-environment jsdom */
'use strict';

function response(status, payload) {
  return { ok: status >= 200 && status < 300, status, json: async () => payload };
}

function loadClient(fetchImpl) {
  jest.resetModules();
  document.documentElement.innerHTML = '<head></head><body></body>';
  window.history.replaceState({}, '', '/nfc/dashboard.html');
  sessionStorage.setItem('authAccessToken', 'workspace-access-token');
  window.fetch = fetchImpl;
  delete window.Auth;
  delete window.WorkspaceClient;
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

  test('surfaces authorization errors with status and payload', async () => {
    const client = loadClient(jest.fn(async () => response(403, { error: 'Review permission required' })));

    await expect(client.decide('card-123', 'approve')).rejects.toMatchObject({
      message: 'Review permission required',
      status: 403,
      payload: { error: 'Review permission required' }
    });
  });
});
