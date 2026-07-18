(function initializeBrandKitClient(global) {
  'use strict';

  if (!global.document || global.BrandKitClient) return;

  const VERSION = '10.0.0';

  function baseUrl() {
    if (global.Auth?.getBaseUrl) return global.Auth.getBaseUrl();
    const configured = typeof global.__API_BASE_URL === 'string' ? global.__API_BASE_URL.trim() : '';
    return (configured || global.location.origin).replace(/\/+$/, '');
  }

  function authHeaders(extra = {}) {
    const headers = { ...extra };
    const token = global.Auth?.getHeader?.().Authorization || global.sessionStorage?.getItem('authAccessToken');
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
      const error = new Error(data.error || `Brand Kit request failed (${response.status})`);
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
    list: () => request('/api/brand-kits'),
    get: kitId => request(`/api/brand-kits/${encodeURIComponent(kitId)}`),
    create: payload => request('/api/brand-kits', json('POST', payload)),
    update: (kitId, payload) => request(`/api/brand-kits/${encodeURIComponent(kitId)}`, json('PUT', payload)),
    remove: kitId => request(`/api/brand-kits/${encodeURIComponent(kitId)}`, { method: 'DELETE' }),
    addLogo: (kitId, payload) => request(`/api/brand-kits/${encodeURIComponent(kitId)}/logos`, json('POST', payload)),
    addColor: (kitId, payload) => request(`/api/brand-kits/${encodeURIComponent(kitId)}/colors`, json('POST', payload)),
    addFont: (kitId, payload) => request(`/api/brand-kits/${encodeURIComponent(kitId)}/fonts`, json('POST', payload)),
    removeAsset: (kitId, type, assetId) => request(
      `/api/brand-kits/${encodeURIComponent(kitId)}/${encodeURIComponent(type)}/${encodeURIComponent(assetId)}`,
      { method: 'DELETE' }
    ),
    addTemplate: (kitId, payload) => request(`/api/brand-kits/${encodeURIComponent(kitId)}/templates`, json('POST', payload)),
    removeTemplate: (kitId, templateId) => request(
      `/api/brand-kits/${encodeURIComponent(kitId)}/templates/${encodeURIComponent(templateId)}`,
      { method: 'DELETE' }
    ),
    addMember: (kitId, payload) => request(`/api/brand-kits/${encodeURIComponent(kitId)}/members`, json('POST', payload)),
    updateMember: (kitId, userId, role) => request(
      `/api/brand-kits/${encodeURIComponent(kitId)}/members/${encodeURIComponent(userId)}`,
      json('PATCH', { role })
    ),
    removeMember: (kitId, userId) => request(
      `/api/brand-kits/${encodeURIComponent(kitId)}/members/${encodeURIComponent(userId)}`,
      { method: 'DELETE' }
    ),
    applyDesigns: (kitId, payload) => request(
      `/api/brand-kits/${encodeURIComponent(kitId)}/apply-designs`,
      json('POST', payload)
    ),
    async uploadLogo(file) {
      const form = new FormData();
      form.append('image', file, file.name || 'brand-logo');
      const response = await request('/api/upload-image', { method: 'POST', body: form });
      if (!response.url) throw new Error('Logo upload returned no URL');
      return response.url;
    }
  };

  global.BrandKitClient = client;
  global.document.documentElement.dataset.brandKitClient = 'ready';
  global.document.dispatchEvent(new global.CustomEvent('brandkit:clientready', { detail: { version: VERSION } }));
}(typeof window !== 'undefined' ? window : globalThis));
