(function initializeEditorBrandKit(global) {
  'use strict';

  const document = global.document;
  if (!document || global.EditorBrandKit) return;

  const VERSION = '10.0.0';
  const STORAGE_KEY = 'mcprime-active-brand-kit';
  const isEnglish = document.documentElement.lang.toLowerCase().startsWith('en');
  const copy = isEnglish ? {
    open: 'Brand Kit', title: 'Cloud Brand Kit', subtitle: 'Apply a shared company identity without replacing personal content.', close: 'Close',
    noKits: 'No Brand Kit is available for this account. Create one from the dashboard.', dashboard: 'Open dashboard', loading: 'Loading…',
    applyAll: 'Apply full identity', applyColors: 'Apply colors', applyFonts: 'Apply fonts', applyLogo: 'Apply primary logo',
    templates: 'Company templates', applyTemplate: 'Apply template', noTemplates: 'No company templates yet.',
    saveTemplate: 'Save current visual design as company template', templateName: 'Template name', templateDescription: 'Short description', save: 'Save template',
    applied: 'Brand identity applied.', saved: 'Company template saved.', unavailable: 'Editor state is not ready.', error: 'Could not complete the Brand Kit action.',
    logos: 'Logos', colors: 'Colors', fonts: 'Fonts', permission: 'Permission', owner: 'Owner', admin: 'Admin', editor: 'Editor', viewer: 'Viewer'
  } : {
    open: 'هوية الشركة', title: 'Cloud Brand Kit', subtitle: 'طبّق هوية الشركة المشتركة دون استبدال البيانات الشخصية.', close: 'إغلاق',
    noKits: 'لا توجد هوية شركة متاحة لهذا الحساب. أنشئ واحدة من لوحة التحكم.', dashboard: 'فتح لوحة التحكم', loading: 'جاري التحميل…',
    applyAll: 'تطبيق الهوية كاملة', applyColors: 'تطبيق الألوان', applyFonts: 'تطبيق الخطوط', applyLogo: 'تطبيق الشعار الأساسي',
    templates: 'قوالب الشركة', applyTemplate: 'تطبيق القالب', noTemplates: 'لا توجد قوالب شركة حتى الآن.',
    saveTemplate: 'حفظ التصميم البصري الحالي كقالب شركة', templateName: 'اسم القالب', templateDescription: 'وصف مختصر', save: 'حفظ القالب',
    applied: 'تم تطبيق هوية الشركة.', saved: 'تم حفظ قالب الشركة.', unavailable: 'حالة المحرر غير جاهزة.', error: 'تعذر تنفيذ إجراء هوية الشركة.',
    logos: 'الشعارات', colors: 'الألوان', fonts: 'الخطوط', permission: 'الصلاحية', owner: 'المالك', admin: 'مدير', editor: 'محرر', viewer: 'مشاهد'
  };
  const roleLabels = { owner: copy.owner, admin: copy.admin, editor: copy.editor, viewer: copy.viewer };
  const state = { kits: [], activeKitId: '', loading: false, mounted: false };
  let modal;
  let body;
  let launcher;

  function clone(value) {
    return JSON.parse(JSON.stringify(value || {}));
  }

  function el(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  }

  function button(text, className, action) {
    const node = el('button', className, text);
    node.type = 'button';
    if (action) node.dataset.brandEditorAction = action;
    return node;
  }

  function activeKit() {
    return state.kits.find(kit => kit.kitId === state.activeKitId) || state.kits[0] || null;
  }

  function canEdit(kit) {
    return ['owner', 'admin', 'editor'].includes(kit?.permission);
  }

  function api() {
    if (!global.BrandKitClient) throw new Error('Brand Kit client is not ready');
    return global.BrandKitClient;
  }

  function announce(message, type = 'success') {
    if (global.UIManager?.announce) global.UIManager.announce(message);
    let toast = document.getElementById('brand-kit-editor-toast');
    if (!toast) {
      toast = el('div', 'brand-kit-toast');
      toast.id = 'brand-kit-editor-toast';
      toast.setAttribute('role', 'status');
      document.body.append(toast);
    }
    toast.dataset.type = type;
    toast.textContent = message;
    toast.hidden = false;
    global.clearTimeout(toast._timer);
    toast._timer = global.setTimeout(() => { toast.hidden = true; }, 3500);
  }

  function getCurrentState() {
    if (!global.StateManager?.getStateObject) return null;
    return clone(global.StateManager.getStateObject());
  }

  function findAsset(identity, type, role, fallback = null) {
    const items = Array.isArray(identity?.[type]) ? identity[type] : [];
    return items.find(item => item.role === role || item.variant === role) || items[0] || fallback;
  }

  function buildIdentityInputs(kit, options = {}) {
    const identity = kit?.identity || {};
    const patch = {};
    if (options.colors !== false) {
      const primary = findAsset(identity, 'colors', 'primary')?.value;
      const secondary = findAsset(identity, 'colors', 'secondary')?.value || primary;
      const accent = findAsset(identity, 'colors', 'accent')?.value || secondary;
      const background = findAsset(identity, 'colors', 'background')?.value;
      const text = findAsset(identity, 'colors', 'text')?.value;
      if (primary) {
        patch['front-bg-start'] = primary;
        patch['phone-btn-bg-color'] = primary;
        patch['back-buttons-bg-color'] = primary;
      }
      if (secondary) patch['front-bg-end'] = secondary;
      if (background) {
        patch['back-bg-start'] = background;
        patch['back-bg-end'] = background;
      }
      if (accent) {
        patch['tagline-color'] = accent;
        patch['photo-border-color'] = accent;
      }
      if (text) {
        patch['name-color'] = text;
        patch['phone-btn-text-color'] = text;
        patch['back-buttons-text-color'] = text;
      }
    }
    if (options.fonts !== false) {
      const heading = findAsset(identity, 'fonts', 'heading')?.family;
      const bodyFont = findAsset(identity, 'fonts', 'body')?.family || heading;
      const accentFont = findAsset(identity, 'fonts', 'accent')?.family || bodyFont;
      if (heading) patch['name-font'] = heading;
      if (bodyFont) {
        patch['phone-btn-font'] = bodyFont;
        patch['phone-text-font'] = bodyFont;
        patch['social-text-font'] = bodyFont;
      }
      if (accentFont) patch['tagline-font'] = accentFont;
    }
    if (options.logo !== false) {
      const logo = findAsset(identity, 'logos', 'primary')?.url;
      if (logo) patch['input-logo'] = logo;
    }
    return patch;
  }

  function applyIdentity(kit, options) {
    const current = getCurrentState();
    if (!current || !global.StateManager?.applyState) {
      announce(copy.unavailable, 'error');
      return false;
    }
    const next = clone(current);
    next.inputs = { ...(current.inputs || {}), ...buildIdentityInputs(kit, options) };
    next.brandKitId = kit.kitId;
    global.HistoryManager?.pushState?.(current);
    global.StateManager.applyState(next, true);
    global.HistoryManager?.pushState?.(next);
    global.StateManager.saveDebounced?.();
    document.dispatchEvent(new global.CustomEvent('editor:brandkitapplied', {
      detail: { kitId: kit.kitId, options: { ...options } }
    }));
    announce(copy.applied);
    close();
    return true;
  }

  function applyTemplate(template) {
    const kit = activeKit();
    if (!template || !kit) return false;
    if (global.EditorTemplateManager?.applyTemplate) {
      const applied = global.EditorTemplateManager.applyTemplate({
        ...clone(template),
        id: `brand-${kit.kitId}-${template.id}`,
        category: 'brand',
        personal: false
      });
      if (applied) document.dispatchEvent(new global.CustomEvent('editor:brandtemplateapplied', { detail: { kitId: kit.kitId, templateId: template.id } }));
      return applied;
    }
    const current = getCurrentState();
    if (!current || !global.StateManager?.applyState) return false;
    const next = clone(current);
    next.inputs = { ...(current.inputs || {}), ...(template.design?.inputs || {}) };
    next.placements = { ...(current.placements || {}), ...(template.design?.placements || {}) };
    next.visibilities = { ...(current.visibilities || {}), ...(template.design?.visibilities || {}) };
    global.HistoryManager?.pushState?.(current);
    global.StateManager.applyState(next, true);
    global.StateManager.saveDebounced?.();
    announce(copy.applied);
    return true;
  }

  function captureTemplate() {
    if (global.EditorTemplateManager?.captureDesignState) return global.EditorTemplateManager.captureDesignState();
    const current = getCurrentState();
    if (!current) return null;
    return { inputs: clone(current.inputs || {}), placements: clone(current.placements || {}), visibilities: clone(current.visibilities || {}) };
  }

  function derivePreview(design) {
    const inputs = design?.inputs || {};
    return {
      colors: [inputs['front-bg-start'], inputs['front-bg-end'], inputs['name-color'], inputs['tagline-color']].filter(Boolean),
      font: inputs['name-font'] || 'Cairo, sans-serif',
      layout: inputs['layout-select-visual'] || 'modern'
    };
  }

  async function saveTemplate(form) {
    const kit = activeKit();
    const design = captureTemplate();
    if (!kit || !design) {
      announce(copy.unavailable, 'error');
      return;
    }
    const data = new FormData(form);
    const result = await api().addTemplate(kit.kitId, {
      name: data.get('name'),
      description: data.get('description'),
      design,
      preview: derivePreview(design)
    });
    form.reset();
    await reload(kit.kitId);
    announce(copy.saved);
    document.dispatchEvent(new global.CustomEvent('editor:brandtemplatesaved', { detail: { kitId: kit.kitId, templateId: result.template?.id } }));
  }

  function createAssetSection(title, items, renderer) {
    const section = el('section');
    section.append(el('h4', '', title));
    if (!items.length) section.append(el('p', 'brand-kit-muted', '—'));
    items.forEach(item => section.append(renderer(item)));
    return section;
  }

  function renderKit(kit) {
    const wrapper = el('article', 'brand-kit-editor-kit');
    const heading = el('div', 'brand-kit-card-heading');
    const title = el('div');
    title.append(el('h3', '', kit.name), el('p', 'brand-kit-muted', kit.description || copy.subtitle));
    heading.append(title, el('span', 'brand-kit-permission', `${copy.permission}: ${roleLabels[kit.permission] || kit.permission}`));
    wrapper.append(heading);

    const assets = el('div', 'brand-kit-editor-assets');
    assets.append(
      createAssetSection(copy.logos, kit.identity?.logos || [], logo => {
        const row = el('div', 'brand-kit-editor-logo-row');
        const image = el('img');
        image.src = logo.url;
        image.alt = logo.name;
        image.width = 36;
        image.height = 36;
        image.style.objectFit = 'contain';
        image.style.background = '#fff';
        image.style.borderRadius = '8px';
        row.append(image, el('span', '', logo.name));
        return row;
      }),
      createAssetSection(copy.colors, kit.identity?.colors || [], color => {
        const row = el('div', 'brand-kit-editor-color-row');
        const swatch = el('span');
        swatch.style.background = color.value;
        row.append(swatch, el('span', '', `${color.name} · ${color.role}`));
        return row;
      }),
      createAssetSection(copy.fonts, kit.identity?.fonts || [], font => {
        const row = el('div', 'brand-kit-editor-font-row');
        const label = el('span', '', `${font.name} · ${font.role}`);
        label.style.fontFamily = font.family;
        row.append(label);
        return row;
      })
    );
    wrapper.append(assets);

    const actions = el('div', 'brand-kit-editor-actions');
    actions.append(
      button(copy.applyAll, 'brand-kit-primary', 'apply-all'),
      button(copy.applyColors, 'brand-kit-secondary', 'apply-colors'),
      button(copy.applyFonts, 'brand-kit-secondary', 'apply-fonts'),
      button(copy.applyLogo, 'brand-kit-secondary', 'apply-logo')
    );
    wrapper.append(actions);

    const templateHeading = el('div', 'brand-kit-card-heading');
    templateHeading.append(el('h3', '', copy.templates));
    wrapper.append(templateHeading);
    const templateList = el('div', 'brand-kit-editor-template-list');
    const templates = kit.templates || [];
    if (!templates.length) templateList.append(el('p', 'brand-kit-muted', copy.noTemplates));
    templates.forEach(template => {
      const item = el('article', 'brand-kit-editor-template');
      item.append(el('strong', '', template.name), el('small', 'brand-kit-muted', template.description || template.preview?.layout || ''));
      const apply = button(copy.applyTemplate, 'brand-kit-secondary', 'apply-template');
      apply.dataset.templateId = template.id;
      item.append(apply);
      templateList.append(item);
    });
    wrapper.append(templateList);

    if (canEdit(kit)) {
      const form = el('form', 'brand-kit-inline-form');
      form.dataset.brandEditorForm = 'save-template';
      const name = el('input', 'brand-kit-input');
      name.name = 'name';
      name.placeholder = copy.templateName;
      name.maxLength = 60;
      name.required = true;
      const description = el('input', 'brand-kit-input');
      description.name = 'description';
      description.placeholder = copy.templateDescription;
      description.maxLength = 180;
      form.append(name, description, button(copy.save, 'brand-kit-primary'));
      const label = el('p', 'brand-kit-muted', copy.saveTemplate);
      wrapper.append(label, form);
    }
    return wrapper;
  }

  function render() {
    if (!body) return;
    body.replaceChildren();
    if (state.loading) {
      body.append(el('div', 'brand-kit-loading', copy.loading));
      return;
    }
    if (!state.kits.length) {
      const empty = el('div', 'brand-kit-empty');
      empty.append(el('i', 'fas fa-swatchbook'), el('p', '', copy.noKits));
      const link = el('a', 'brand-kit-primary', copy.dashboard);
      link.href = isEnglish ? '/nfc/dashboard-en.html?tab=brand-kit' : '/nfc/dashboard.html?tab=brand-kit';
      empty.append(link);
      body.append(empty);
      return;
    }
    const selectWrap = el('label', 'brand-kit-field');
    selectWrap.append(el('span', '', copy.title));
    const select = el('select', 'brand-kit-input');
    select.dataset.brandEditorSelect = 'kit';
    state.kits.forEach(kit => {
      const optionNode = el('option', '', `${kit.name} · ${roleLabels[kit.permission] || kit.permission}`);
      optionNode.value = kit.kitId;
      optionNode.selected = kit.kitId === state.activeKitId;
      select.append(optionNode);
    });
    selectWrap.append(select);
    body.append(selectWrap, renderKit(activeKit()));
  }

  async function reload(preferredId) {
    state.loading = true;
    render();
    try {
      const result = await api().list();
      state.kits = result.kits || [];
      const stored = preferredId || global.localStorage?.getItem(STORAGE_KEY) || '';
      state.activeKitId = state.kits.some(kit => kit.kitId === stored) ? stored : state.kits[0]?.kitId || '';
      if (state.activeKitId) global.localStorage?.setItem(STORAGE_KEY, state.activeKitId);
    } catch (error) {
      console.error('[EditorBrandKit] load failed:', error);
      announce(error.message || copy.error, 'error');
      state.kits = [];
    } finally {
      state.loading = false;
      render();
    }
  }

  function ensureModal() {
    if (modal) return modal;
    modal = el('div', 'brand-kit-modal');
    modal.id = 'editor-brand-kit-modal';
    modal.hidden = true;
    modal.setAttribute('role', 'dialog');
    modal.setAttribute('aria-modal', 'true');
    modal.innerHTML = `
      <div class="brand-kit-modal-backdrop" data-brand-editor-close></div>
      <div class="brand-kit-modal-dialog">
        <header class="brand-kit-modal-header">
          <div><h2>${copy.title}</h2><p class="brand-kit-muted">${copy.subtitle}</p></div>
          <button type="button" class="brand-kit-modal-close" data-brand-editor-close aria-label="${copy.close}">×</button>
        </header>
        <div class="brand-kit-modal-body"></div>
      </div>`;
    body = modal.querySelector('.brand-kit-modal-body');
    modal.addEventListener('click', event => {
      if (event.target.closest('[data-brand-editor-close]')) close();
      const action = event.target.closest('[data-brand-editor-action]');
      if (!action) return;
      const kit = activeKit();
      if (!kit) return;
      if (action.dataset.brandEditorAction === 'apply-all') applyIdentity(kit, { colors: true, fonts: true, logo: true });
      if (action.dataset.brandEditorAction === 'apply-colors') applyIdentity(kit, { colors: true, fonts: false, logo: false });
      if (action.dataset.brandEditorAction === 'apply-fonts') applyIdentity(kit, { colors: false, fonts: true, logo: false });
      if (action.dataset.brandEditorAction === 'apply-logo') applyIdentity(kit, { colors: false, fonts: false, logo: true });
      if (action.dataset.brandEditorAction === 'apply-template') {
        const template = (kit.templates || []).find(item => item.id === action.dataset.templateId);
        if (template) applyTemplate(template);
      }
    });
    modal.addEventListener('submit', async event => {
      const form = event.target.closest('[data-brand-editor-form="save-template"]');
      if (!form) return;
      event.preventDefault();
      const submit = form.querySelector('button');
      submit.disabled = true;
      try {
        await saveTemplate(form);
      } catch (error) {
        console.error('[EditorBrandKit] save template failed:', error);
        announce(error.message || copy.error, 'error');
      } finally {
        submit.disabled = false;
      }
    });
    modal.addEventListener('change', event => {
      if (!event.target.matches('[data-brand-editor-select="kit"]')) return;
      state.activeKitId = event.target.value;
      global.localStorage?.setItem(STORAGE_KEY, state.activeKitId);
      render();
    });
    document.addEventListener('keydown', event => {
      if (event.key === 'Escape' && modal && !modal.hidden) close();
    });
    document.body.append(modal);
    return modal;
  }

  function open() {
    const root = ensureModal();
    root.hidden = false;
    document.body.classList.add('brand-kit-modal-open');
    reload(state.activeKitId);
  }

  function close() {
    if (!modal) return;
    modal.hidden = true;
    document.body.classList.remove('brand-kit-modal-open');
  }

  function mountLauncher() {
    if (state.mounted) return true;
    const host = document.querySelector('.tb-history') || document.querySelector('#pro-toolbar .pro-toolbar-actions') || document.getElementById('pro-toolbar');
    if (!host) return false;
    launcher = button(copy.open, 'toolbar-btn brand-kit-editor-launcher');
    launcher.id = 'editor-brand-kit-btn';
    launcher.prepend(el('i', 'fas fa-swatchbook'));
    launcher.addEventListener('click', open);
    host.append(launcher);
    state.mounted = true;
    document.documentElement.dataset.editorBrandKit = 'ready';
    document.dispatchEvent(new global.CustomEvent('editor:brandkitready', { detail: { version: VERSION } }));
    return true;
  }

  function init() {
    if (mountLauncher()) return;
    const observer = new MutationObserver(() => {
      if (mountLauncher()) observer.disconnect();
    });
    observer.observe(document.documentElement, { childList: true, subtree: true });
    global.setTimeout(() => observer.disconnect(), 10000);
  }

  global.EditorBrandKit = {
    version: VERSION,
    init,
    open,
    close,
    reload,
    applyIdentity,
    applyTemplate,
    captureTemplate,
    buildIdentityInputs,
    getState: () => ({ ...state })
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true });
  else init();
}(typeof window !== 'undefined' ? window : globalThis));
