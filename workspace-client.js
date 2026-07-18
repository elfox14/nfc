(function initializeWorkspaceClient(global) {
  'use strict';

  if (!global.document || global.WorkspaceClient) return;

  const VERSION = '11.0.0';

  function baseUrl() {
    if (global.Auth?.getBaseUrl) return global.Auth.getBaseUrl();
    const configured = typeof global.__API_BASE_URL === 'string' ? global.__API_BASE_URL.trim() : '';
    return (configured || global.location.origin).replace(/\/+$/, '');
  }

  function authHeaders(extra = {}) {
    const headers = { ...extra };
    const token = global.Auth?.getHeader?.()?.Authorization || global.sessionStorage?.getItem('authAccessToken');
    if (token) headers.Authorization = token.startsWith('Bearer ') ? token : `Bearer ${token}`;
    return headers;
  }

  async function request(path, options = {}) {
    const url = `${baseUrl()}${path}`;
    const init = { ...options, credentials: 'include', cache: 'no-store' };
    init.headers = authHeaders(init.headers || {});
    const response = global.Auth?.apiFetchWithRefresh
      ? await global.Auth.apiFetchWithRefresh(url, init)
      : await global.fetch(url, init);
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      const error = new Error(data.error || `Workspace request failed (${response.status})`);
      error.status = response.status;
      error.payload = data;
      throw error;
    }
    return data;
  }

  function json(method, body) {
    return {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: body === undefined ? undefined : JSON.stringify(body)
    };
  }

  const client = {
    version: VERSION,
    request,
    list: () => request('/api/workspaces'),
    get: workspaceId => request(`/api/workspaces/${encodeURIComponent(workspaceId)}`),
    create: payload => request('/api/workspaces', json('POST', payload)),
    update: (workspaceId, payload) => request(`/api/workspaces/${encodeURIComponent(workspaceId)}`, json('PUT', payload)),
    remove: workspaceId => request(`/api/workspaces/${encodeURIComponent(workspaceId)}`, { method: 'DELETE' }),
    addMember: (workspaceId, payload) => request(`/api/workspaces/${encodeURIComponent(workspaceId)}/members`, json('POST', payload)),
    updateMember: (workspaceId, userId, role) => request(
      `/api/workspaces/${encodeURIComponent(workspaceId)}/members/${encodeURIComponent(userId)}`,
      json('PATCH', { role })
    ),
    removeMember: (workspaceId, userId) => request(
      `/api/workspaces/${encodeURIComponent(workspaceId)}/members/${encodeURIComponent(userId)}`,
      { method: 'DELETE' }
    ),
    listDesigns: workspaceId => request(`/api/workspaces/${encodeURIComponent(workspaceId)}/designs`),
    linkDesign: (workspaceId, designId) => request(
      `/api/workspaces/${encodeURIComponent(workspaceId)}/designs/${encodeURIComponent(designId)}`,
      { method: 'POST' }
    ),
    unlinkDesign: (workspaceId, designId) => request(
      `/api/workspaces/${encodeURIComponent(workspaceId)}/designs/${encodeURIComponent(designId)}`,
      { method: 'DELETE' }
    ),
    workflow: designId => request(`/api/design-workflow/${encodeURIComponent(designId)}`),
    addComment: (designId, payload) => request(
      `/api/design-workflow/${encodeURIComponent(designId)}/comments`,
      json('POST', payload)
    ),
    resolveComment: (designId, entryId, resolved = true) => request(
      `/api/design-workflow/${encodeURIComponent(designId)}/comments/${encodeURIComponent(entryId)}`,
      json('PATCH', { resolved })
    ),
    submitReview: (designId, note = '') => request(
      `/api/design-workflow/${encodeURIComponent(designId)}/submit`,
      json('POST', { note })
    ),
    decide: (designId, action, note = '') => request(
      `/api/design-workflow/${encodeURIComponent(designId)}/decision`,
      json('POST', { action, note })
    ),
    publish: designId => request(`/api/design-workflow/${encodeURIComponent(designId)}/publish`, { method: 'POST' }),
    returnDraft: (designId, note = '') => request(
      `/api/design-workflow/${encodeURIComponent(designId)}/draft`,
      json('POST', { note })
    ),
    async ownedDesigns() {
      const url = global.Auth?.API_USER_DESIGNS || `${baseUrl()}/api/user/designs`;
      const response = global.Auth?.apiFetchWithRefresh
        ? await global.Auth.apiFetchWithRefresh(url)
        : await global.fetch(url, { credentials: 'include', headers: authHeaders(), cache: 'no-store' });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || 'Failed to load designs');
      return data;
    }
  };

  global.WorkspaceClient = client;
  global.document.documentElement.dataset.workspaceClient = 'ready';
  global.document.dispatchEvent(new global.CustomEvent('workspace:clientready', { detail: { version: VERSION } }));
}(typeof window !== 'undefined' ? window : globalThis));
