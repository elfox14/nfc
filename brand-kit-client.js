(function initializeBrandKitClient(global) {
  'use strict';

  if (!global.document || global.BrandKitClient) return;

  const VERSION = '10.0.0';
  const document = global.document;

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

  function normalizeEditorFontFamily(value) {
    const family = String(value || '').trim();
    const normalized = family.replace(/['"]/g, '').toLowerCase();
    const known = new Map([
      ['cairo, sans-serif', "'Cairo', sans-serif"],
      ['tajawal, sans-serif', "'Tajawal', sans-serif"],
      ['poppins, sans-serif', "'Poppins', sans-serif"],
      ['amiri, serif', "'Amiri', serif"],
      ['changa, sans-serif', "'Changa', sans-serif"],
      ['lalezar, cursive', "'Lalezar', cursive"],
      ['almarai, sans-serif', "'Almarai', sans-serif"],
      ['readex pro, sans-serif', "'Readex Pro', sans-serif"]
    ]);
    return known.get(normalized) || family;
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

  function submitForm(form) {
    if (typeof form.requestSubmit === 'function') form.requestSubmit();
    else form.dispatchEvent(new global.Event('submit', { bubbles: true, cancelable: true }));
  }

  function installFormSubmitBridge() {
    const previous = global.__BRAND_KIT_FORM_SUBMIT_HANDLER__;
    if (typeof previous === 'function') document.removeEventListener('click', previous);

    const handler = event => {
      const trigger = event.target.closest(
        '.brand-kit-workspace form .brand-kit-primary, .brand-kit-modal form .brand-kit-primary'
      );
      if (!trigger || trigger.type !== 'button') return;
      if (trigger.dataset.brandAction || trigger.dataset.brandEditorAction) return;
      const form = trigger.closest('form');
      if (!form) return;
      event.preventDefault();
      submitForm(form);
    };

    global.__BRAND_KIT_FORM_SUBMIT_HANDLER__ = handler;
    document.addEventListener('click', handler);
  }

  const client = {
    version: VERSION,
    request,
    normalizeEditorFontFamily,
    list: () => request('/api/brand-kits'),
    get: kitId => request(`/api/brand-kits/${encodeURIComponent(kitId)}`),
    create: payload => request('/api/brand-kits', json('POST', payload)),
    update: (kitId, payload) => request(`/api/brand-kits/${encodeURIComponent(kitId)}`, json('PUT', payload)),
    remove: kitId => request(`/api/brand-kits/${encodeURIComponent(kitId)}`, { method: 'DELETE' }),
    addLogo: (kitId, payload) => request(`/api/brand-kits/${encodeURIComponent(kitId)}/logos`, json('POST', payload)),
    addColor: (kitId, payload) => request(`/api/brand-kits/${encodeURIComponent(kitId)}/colors`, json('POST', payload)),
    addFont: (kitId, payload) => request(
      `/api/brand-kits/${encodeURIComponent(kitId)}/fonts`,
      json('POST', { ...payload, family: normalizeEditorFontFamily(payload?.family) })
    ),
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

  installFormSubmitBridge();
  global.BrandKitClient = client;
  document.documentElement.dataset.brandKitClient = 'ready';
  document.dispatchEvent(new global.CustomEvent('brandkit:clientready', { detail: { version: VERSION } }));
}(typeof window !== 'undefined' ? window : globalThis));
