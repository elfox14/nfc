(function initializeDashboardBrandKit(global) {
  'use strict';

  const document = global.document;
  if (!document || global.DashboardBrandKit) return;

  const VERSION = '10.0.0';
  const STORAGE_KEY = 'mcprime-active-brand-kit';
  const isEnglish = document.documentElement.lang.toLowerCase().startsWith('en');
  const copy = isEnglish ? {
    nav: 'Brand Kit', title: 'Cloud Brand Kit', subtitle: 'Keep logos, colors, fonts, company templates and team permissions in one shared workspace.',
    create: 'Create Brand Kit', createHint: 'Create your first shared company identity.', name: 'Brand name', description: 'Description', save: 'Save',
    selectKit: 'Active Brand Kit', assets: 'Identity assets', logos: 'Logos', colors: 'Colors', fonts: 'Fonts', templates: 'Company templates', team: 'Team',
    addLogo: 'Upload logo', logoName: 'Logo name', variant: 'Variant', addColor: 'Add color', colorName: 'Color name', role: 'Role', addFont: 'Add font', fontName: 'Font name',
    memberEmail: 'Registered member email', addMember: 'Add member', applyAll: 'Apply to all my designs', applyTitle: 'Apply company identity', applyHint: 'Updates visual identity only. Names and contact details are preserved.',
    applyColors: 'Colors', applyFonts: 'Fonts', applyLogo: 'Primary logo', deleteKit: 'Delete Brand Kit', confirmDelete: 'Delete this Brand Kit permanently?', confirmApply: 'Apply this identity to all your designs?',
    empty: 'No Brand Kit yet.', noLogos: 'No logos uploaded.', noColors: 'No colors added.', noFonts: 'No fonts added.', noTemplates: 'Save a company template from the editor.', noMembers: 'No additional team members.',
    owner: 'Owner', admin: 'Admin', editor: 'Editor', viewer: 'Viewer', loading: 'Loading Brand Kit…', saved: 'Saved successfully.', applied: 'Identity applied to designs.', removed: 'Removed.', upload: 'Uploading…', error: 'Operation failed.'
  } : {
    nav: 'هوية الشركة', title: 'Cloud Brand Kit', subtitle: 'اجمع شعارات الشركة وألوانها وخطوطها وقوالبها وصلاحيات الفريق في مساحة سحابية مشتركة.',
    create: 'إنشاء هوية شركة', createHint: 'أنشئ أول هوية مشتركة للشركة.', name: 'اسم الهوية', description: 'وصف مختصر', save: 'حفظ',
    selectKit: 'الهوية النشطة', assets: 'أصول الهوية', logos: 'الشعارات', colors: 'الألوان', fonts: 'الخطوط', templates: 'قوالب الشركة', team: 'الفريق',
    addLogo: 'رفع شعار', logoName: 'اسم الشعار', variant: 'النوع', addColor: 'إضافة لون', colorName: 'اسم اللون', role: 'الدور', addFont: 'إضافة خط', fontName: 'اسم الخط',
    memberEmail: 'بريد عضو مسجل', addMember: 'إضافة عضو', applyAll: 'تطبيق على كل تصاميمي', applyTitle: 'تطبيق هوية الشركة', applyHint: 'يتم تحديث الهوية البصرية فقط مع الحفاظ على الأسماء وبيانات التواصل.',
    applyColors: 'الألوان', applyFonts: 'الخطوط', applyLogo: 'الشعار الأساسي', deleteKit: 'حذف الهوية', confirmDelete: 'هل تريد حذف هوية الشركة نهائيًا؟', confirmApply: 'هل تريد تطبيق هذه الهوية على كل تصاميمك؟',
    empty: 'لا توجد هوية شركة حتى الآن.', noLogos: 'لم يتم رفع شعارات.', noColors: 'لم تتم إضافة ألوان.', noFonts: 'لم تتم إضافة خطوط.', noTemplates: 'احفظ قالب شركة من داخل المحرر.', noMembers: 'لا يوجد أعضاء إضافيون.',
    owner: 'المالك', admin: 'مدير', editor: 'محرر', viewer: 'مشاهد', loading: 'جاري تحميل هوية الشركة…', saved: 'تم الحفظ بنجاح.', applied: 'تم تطبيق الهوية على التصاميم.', removed: 'تم الحذف.', upload: 'جاري الرفع…', error: 'تعذر تنفيذ العملية.'
  };

  const roleLabels = { owner: copy.owner, admin: copy.admin, editor: copy.editor, viewer: copy.viewer };
  const fontChoices = [
    'Cairo, sans-serif', 'Tajawal, sans-serif', 'Poppins, sans-serif', 'Amiri, serif',
    'Changa, sans-serif', 'Lalezar, cursive', 'Arial, sans-serif', 'Georgia, serif'
  ];

  const state = { kits: [], activeKitId: '', loading: false, mounted: false };
  let section;
  let workspace;
  let navItem;

  function el(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  }

  function button(text, className, action) {
    const node = el('button', className, text);
    node.type = 'button';
    if (action) node.dataset.brandAction = action;
    return node;
  }

  function option(value, label, selected = false) {
    const node = el('option', '', label);
    node.value = value;
    node.selected = selected;
    return node;
  }

  function activeKit() {
    return state.kits.find(kit => kit.kitId === state.activeKitId) || state.kits[0] || null;
  }

  function canEdit(kit) {
    return ['owner', 'admin', 'editor'].includes(kit?.permission);
  }

  function canAdmin(kit) {
    return ['owner', 'admin'].includes(kit?.permission);
  }

  function announce(message, type = 'success') {
    let toast = document.getElementById('brand-kit-dashboard-toast');
    if (!toast) {
      toast = el('div', 'brand-kit-toast');
      toast.id = 'brand-kit-dashboard-toast';
      toast.setAttribute('role', 'status');
      document.body.append(toast);
    }
    toast.dataset.type = type;
    toast.textContent = message;
    toast.hidden = false;
    global.clearTimeout(toast._timer);
    toast._timer = global.setTimeout(() => { toast.hidden = true; }, 3500);
  }

  function api() {
    if (!global.BrandKitClient) throw new Error('Brand Kit client is not ready');
    return global.BrandKitClient;
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
      document.dispatchEvent(new global.CustomEvent('brandkit:changed', { detail: { kitId: state.activeKitId } }));
    } catch (error) {
      console.error('[DashboardBrandKit] load failed:', error);
      announce(error.message || copy.error, 'error');
    } finally {
      state.loading = false;
      render();
    }
  }

  function createEmptyState() {
    const card = el('div', 'brand-kit-empty');
    card.append(el('i', 'fas fa-swatchbook'));
    card.append(el('h3', '', copy.empty));
    card.append(el('p', '', copy.createHint));
    const form = el('form', 'brand-kit-create-form');
    form.dataset.brandForm = 'create-kit';
    const name = el('input', 'brand-kit-input');
    name.name = 'name';
    name.placeholder = copy.name;
    name.maxLength = 80;
    name.required = true;
    const description = el('textarea', 'brand-kit-input');
    description.name = 'description';
    description.placeholder = copy.description;
    description.maxLength = 240;
    form.append(name, description, button(copy.create, 'brand-kit-primary'));
    card.append(form);
    return card;
  }

  function createKitHeader(kit) {
    const header = el('div', 'brand-kit-toolbar');
    const selectorWrap = el('label', 'brand-kit-field');
    selectorWrap.append(el('span', '', copy.selectKit));
    const select = el('select', 'brand-kit-input');
    select.dataset.brandSelect = 'kit';
    state.kits.forEach(item => select.append(option(item.kitId, `${item.name} · ${roleLabels[item.permission] || item.permission}`, item.kitId === kit.kitId)));
    selectorWrap.append(select);
    const create = button(copy.create, 'brand-kit-secondary', 'new-kit');
    create.prepend(el('i', 'fas fa-plus'));
    header.append(selectorWrap, create);
    return header;
  }

  function createMetadata(kit) {
    const card = el('section', 'brand-kit-card');
    const heading = el('div', 'brand-kit-card-heading');
    heading.append(el('h3', '', copy.title), el('span', 'brand-kit-permission', roleLabels[kit.permission] || kit.permission));
    card.append(heading);
    const form = el('form', 'brand-kit-meta-form');
    form.dataset.brandForm = 'metadata';
    const name = el('input', 'brand-kit-input');
    name.name = 'name';
    name.value = kit.name || '';
    name.placeholder = copy.name;
    name.maxLength = 80;
    name.disabled = !canAdmin(kit);
    const description = el('textarea', 'brand-kit-input');
    description.name = 'description';
    description.value = kit.description || '';
    description.placeholder = copy.description;
    description.maxLength = 240;
    description.disabled = !canAdmin(kit);
    form.append(name, description);
    if (canAdmin(kit)) form.append(button(copy.save, 'brand-kit-primary'));
    card.append(form);
    return card;
  }

  function assetHeader(title, icon) {
    const heading = el('div', 'brand-kit-card-heading');
    const titleNode = el('h3');
    titleNode.append(el('i', `fas ${icon}`), document.createTextNode(` ${title}`));
    heading.append(titleNode);
    return heading;
  }

  function renderLogos(kit) {
    const card = el('section', 'brand-kit-card');
    card.append(assetHeader(copy.logos, 'fa-image'));
    const grid = el('div', 'brand-kit-logo-grid');
    const logos = kit.identity?.logos || [];
    if (!logos.length) grid.append(el('p', 'brand-kit-muted', copy.noLogos));
    logos.forEach(logo => {
      const item = el('article', 'brand-kit-logo-item');
      const image = el('img');
      image.src = logo.url;
      image.alt = logo.name || 'Logo';
      image.loading = 'lazy';
      const meta = el('div');
      meta.append(el('strong', '', logo.name), el('small', '', logo.variant));
      item.append(image, meta);
      if (canEdit(kit)) {
        const remove = button('×', 'brand-kit-icon-button', 'remove-asset');
        remove.dataset.assetType = 'logos';
        remove.dataset.assetId = logo.id;
        item.append(remove);
      }
      grid.append(item);
    });
    card.append(grid);
    if (canEdit(kit)) {
      const form = el('form', 'brand-kit-inline-form');
      form.dataset.brandForm = 'logo';
      const file = el('input', 'brand-kit-input');
      file.type = 'file';
      file.name = 'file';
      file.accept = 'image/png,image/jpeg,image/webp,image/svg+xml';
      file.required = true;
      const name = el('input', 'brand-kit-input');
      name.name = 'name';
      name.placeholder = copy.logoName;
      const variant = el('select', 'brand-kit-input');
      variant.name = 'variant';
      ['primary', 'secondary', 'icon', 'mono'].forEach(value => variant.append(option(value, value)));
      form.append(file, name, variant, button(copy.addLogo, 'brand-kit-primary'));
      card.append(form);
    }
    return card;
  }

  function renderColors(kit) {
    const card = el('section', 'brand-kit-card');
    card.append(assetHeader(copy.colors, 'fa-palette'));
    const grid = el('div', 'brand-kit-color-grid');
    const colors = kit.identity?.colors || [];
    if (!colors.length) grid.append(el('p', 'brand-kit-muted', copy.noColors));
    colors.forEach(color => {
      const item = el('article', 'brand-kit-color-item');
      const swatch = el('span', 'brand-kit-color-swatch');
      swatch.style.background = color.value;
      const meta = el('div');
      meta.append(el('strong', '', color.name), el('small', '', `${color.value} · ${color.role}`));
      item.append(swatch, meta);
      if (canEdit(kit)) {
        const remove = button('×', 'brand-kit-icon-button', 'remove-asset');
        remove.dataset.assetType = 'colors';
        remove.dataset.assetId = color.id;
        item.append(remove);
      }
      grid.append(item);
    });
    card.append(grid);
    if (canEdit(kit)) {
      const form = el('form', 'brand-kit-inline-form');
      form.dataset.brandForm = 'color';
      const value = el('input', 'brand-kit-color-input');
      value.type = 'color';
      value.name = 'value';
      value.value = '#4da6ff';
      const name = el('input', 'brand-kit-input');
      name.name = 'name';
      name.placeholder = copy.colorName;
      const role = el('select', 'brand-kit-input');
      role.name = 'role';
      ['primary', 'secondary', 'accent', 'background', 'text'].forEach(valueName => role.append(option(valueName, valueName)));
      form.append(value, name, role, button(copy.addColor, 'brand-kit-primary'));
      card.append(form);
    }
    return card;
  }

  function renderFonts(kit) {
    const card = el('section', 'brand-kit-card');
    card.append(assetHeader(copy.fonts, 'fa-font'));
    const list = el('div', 'brand-kit-font-list');
    const fonts = kit.identity?.fonts || [];
    if (!fonts.length) list.append(el('p', 'brand-kit-muted', copy.noFonts));
    fonts.forEach(font => {
      const item = el('article', 'brand-kit-font-item');
      const sample = el('strong', '', font.name);
      sample.style.fontFamily = font.family;
      const meta = el('small', '', `${font.family} · ${font.role}`);
      item.append(sample, meta);
      if (canEdit(kit)) {
        const remove = button('×', 'brand-kit-icon-button', 'remove-asset');
        remove.dataset.assetType = 'fonts';
        remove.dataset.assetId = font.id;
        item.append(remove);
      }
      list.append(item);
    });
    card.append(list);
    if (canEdit(kit)) {
      const form = el('form', 'brand-kit-inline-form');
      form.dataset.brandForm = 'font';
      const name = el('input', 'brand-kit-input');
      name.name = 'name';
      name.placeholder = copy.fontName;
      const family = el('select', 'brand-kit-input');
      family.name = 'family';
      fontChoices.forEach(value => family.append(option(value, value.split(',')[0])));
      const role = el('select', 'brand-kit-input');
      role.name = 'role';
      ['heading', 'body', 'accent'].forEach(value => role.append(option(value, value)));
      form.append(name, family, role, button(copy.addFont, 'brand-kit-primary'));
      card.append(form);
    }
    return card;
  }

  function renderTemplates(kit) {
    const card = el('section', 'brand-kit-card');
    card.append(assetHeader(copy.templates, 'fa-bookmark'));
    const grid = el('div', 'brand-kit-template-grid');
    const templates = kit.templates || [];
    if (!templates.length) grid.append(el('p', 'brand-kit-muted', copy.noTemplates));
    templates.forEach(template => {
      const item = el('article', 'brand-kit-template-item');
      const preview = el('div', 'brand-kit-template-preview');
      const colors = template.preview?.colors || [];
      preview.style.setProperty('--brand-preview-a', colors[0] || '#16243a');
      preview.style.setProperty('--brand-preview-b', colors[1] || '#274d73');
      preview.style.setProperty('--brand-preview-accent', colors[3] || '#54a7ff');
      const meta = el('div');
      meta.append(el('strong', '', template.name), el('small', '', template.description || template.preview?.layout || ''));
      item.append(preview, meta);
      if (canEdit(kit)) {
        const remove = button('×', 'brand-kit-icon-button', 'remove-template');
        remove.dataset.templateId = template.id;
        item.append(remove);
      }
      grid.append(item);
    });
    card.append(grid);
    return card;
  }

  function renderTeam(kit) {
    const card = el('section', 'brand-kit-card');
    card.append(assetHeader(copy.team, 'fa-users'));
    const list = el('div', 'brand-kit-member-list');
    const owner = el('article', 'brand-kit-member-item');
    owner.append(el('i', 'fas fa-crown'), el('strong', '', copy.owner), el('span', 'brand-kit-role', copy.owner));
    list.append(owner);
    const members = kit.members || [];
    if (!members.length) list.append(el('p', 'brand-kit-muted', copy.noMembers));
    members.forEach(member => {
      const item = el('article', 'brand-kit-member-item');
      const identity = el('div');
      identity.append(el('strong', '', member.name || member.email), el('small', '', member.email));
      item.append(el('i', 'fas fa-user'), identity);
      if (kit.permission === 'owner') {
        const select = el('select', 'brand-kit-input brand-kit-role-select');
        select.dataset.memberRole = member.userId;
        ['admin', 'editor', 'viewer'].forEach(role => select.append(option(role, roleLabels[role], role === member.role)));
        const remove = button('×', 'brand-kit-icon-button', 'remove-member');
        remove.dataset.memberId = member.userId;
        item.append(select, remove);
      } else item.append(el('span', 'brand-kit-role', roleLabels[member.role] || member.role));
      list.append(item);
    });
    card.append(list);
    if (kit.permission === 'owner') {
      const form = el('form', 'brand-kit-inline-form');
      form.dataset.brandForm = 'member';
      const email = el('input', 'brand-kit-input');
      email.type = 'email';
      email.name = 'email';
      email.placeholder = copy.memberEmail;
      email.required = true;
      const role = el('select', 'brand-kit-input');
      role.name = 'role';
      ['editor', 'viewer', 'admin'].forEach(value => role.append(option(value, roleLabels[value])));
      form.append(email, role, button(copy.addMember, 'brand-kit-primary'));
      card.append(form);
    }
    return card;
  }

  function renderApply(kit) {
    const card = el('section', 'brand-kit-card brand-kit-apply-card');
    card.append(assetHeader(copy.applyTitle, 'fa-wand-magic-sparkles'));
    card.append(el('p', 'brand-kit-muted', copy.applyHint));
    const form = el('form', 'brand-kit-apply-form');
    form.dataset.brandForm = 'apply';
    [['colors', copy.applyColors], ['fonts', copy.applyFonts], ['logo', copy.applyLogo]].forEach(([name, label]) => {
      const optionLabel = el('label', 'brand-kit-check');
      const input = el('input');
      input.type = 'checkbox';
      input.name = name;
      input.checked = true;
      optionLabel.append(input, document.createTextNode(label));
      form.append(optionLabel);
    });
    form.append(button(copy.applyAll, 'brand-kit-primary'));
    card.append(form);
    if (kit.permission === 'owner') card.append(button(copy.deleteKit, 'brand-kit-danger', 'delete-kit'));
    return card;
  }

  function render() {
    if (!workspace) return;
    workspace.replaceChildren();
    if (state.loading) {
      const loading = el('div', 'brand-kit-loading');
      loading.append(el('i', 'fas fa-circle-notch fa-spin'), el('span', '', copy.loading));
      workspace.append(loading);
      return;
    }
    const kit = activeKit();
    if (!kit) {
      workspace.append(createEmptyState());
      return;
    }
    workspace.append(createKitHeader(kit), createMetadata(kit));
    const assets = el('div', 'brand-kit-grid');
    assets.append(renderLogos(kit), renderColors(kit), renderFonts(kit));
    workspace.append(assets, renderTemplates(kit), renderTeam(kit), renderApply(kit));
  }

  async function submitForm(form) {
    const kit = activeKit();
    const data = new FormData(form);
    const type = form.dataset.brandForm;
    const submit = form.querySelector('button[type="submit"], button:not([type])');
    if (submit) submit.disabled = true;
    try {
      if (type === 'create-kit') {
        const result = await api().create({ name: data.get('name'), description: data.get('description') });
        await reload(result.kit?.kitId);
      } else if (type === 'metadata') {
        await api().update(kit.kitId, { name: data.get('name'), description: data.get('description') });
        announce(copy.saved);
        await reload(kit.kitId);
      } else if (type === 'logo') {
        const file = data.get('file');
        if (!(file instanceof File) || !file.size) return;
        announce(copy.upload, 'info');
        const url = await api().uploadLogo(file);
        await api().addLogo(kit.kitId, { url, name: data.get('name'), variant: data.get('variant') });
        form.reset();
        await reload(kit.kitId);
      } else if (type === 'color') {
        await api().addColor(kit.kitId, { value: data.get('value'), name: data.get('name'), role: data.get('role') });
        form.reset();
        await reload(kit.kitId);
      } else if (type === 'font') {
        await api().addFont(kit.kitId, { family: data.get('family'), name: data.get('name'), role: data.get('role') });
        form.reset();
        await reload(kit.kitId);
      } else if (type === 'member') {
        await api().addMember(kit.kitId, { email: data.get('email'), role: data.get('role') });
        form.reset();
        await reload(kit.kitId);
      } else if (type === 'apply') {
        if (!global.confirm(copy.confirmApply)) return;
        const result = await api().applyDesigns(kit.kitId, {
          options: { colors: data.has('colors'), fonts: data.has('fonts'), logo: data.has('logo') }
        });
        announce(`${copy.applied} (${result.modified || 0})`);
        global.localStorage?.setItem('nfc:brand_kit_applied', String(Date.now()));
      }
    } catch (error) {
      console.error('[DashboardBrandKit] action failed:', error);
      announce(error.message || copy.error, 'error');
    } finally {
      if (submit) submit.disabled = false;
    }
  }

  async function handleAction(buttonNode) {
    const kit = activeKit();
    if (!kit) return;
    try {
      if (buttonNode.dataset.brandAction === 'new-kit') {
        state.activeKitId = '';
        workspace.replaceChildren(createEmptyState());
      } else if (buttonNode.dataset.brandAction === 'remove-asset') {
        await api().removeAsset(kit.kitId, buttonNode.dataset.assetType, buttonNode.dataset.assetId);
        announce(copy.removed);
        await reload(kit.kitId);
      } else if (buttonNode.dataset.brandAction === 'remove-template') {
        await api().removeTemplate(kit.kitId, buttonNode.dataset.templateId);
        announce(copy.removed);
        await reload(kit.kitId);
      } else if (buttonNode.dataset.brandAction === 'remove-member') {
        await api().removeMember(kit.kitId, buttonNode.dataset.memberId);
        announce(copy.removed);
        await reload(kit.kitId);
      } else if (buttonNode.dataset.brandAction === 'delete-kit') {
        if (!global.confirm(copy.confirmDelete)) return;
        await api().remove(kit.kitId);
        global.localStorage?.removeItem(STORAGE_KEY);
        announce(copy.removed);
        await reload();
      }
    } catch (error) {
      console.error('[DashboardBrandKit] action failed:', error);
      announce(error.message || copy.error, 'error');
    }
  }

  function activateSection() {
    document.querySelectorAll('.sidebar-item').forEach(item => item.classList.remove('active'));
    navItem?.classList.add('active');
    document.querySelectorAll('.dashboard-section').forEach(item => item.classList.remove('active'));
    section?.classList.add('active');
    reload(state.activeKitId);
  }

  function mount() {
    if (state.mounted) return true;
    const sidebar = document.querySelector('.sidebar-menu');
    const main = document.querySelector('.dashboard-main');
    if (!sidebar || !main) return false;

    navItem = el('a', 'sidebar-item');
    navItem.href = '#';
    navItem.dataset.section = 'brand-kit';
    navItem.append(el('i', 'fas fa-swatchbook'), el('span', '', copy.nav));
    const privacy = sidebar.querySelector('[data-section="privacy-settings"]');
    if (privacy) privacy.insertAdjacentElement('afterend', navItem);
    else sidebar.append(navItem);
    navItem.addEventListener('click', event => { event.preventDefault(); activateSection(); });

    section = el('div', 'dashboard-section brand-kit-dashboard-section');
    section.id = 'section-brand-kit';
    const header = el('div', 'dashboard-header');
    const text = el('div');
    text.append(el('h1', '', copy.title), el('p', 'user-info', copy.subtitle));
    header.append(text);
    workspace = el('div', 'brand-kit-workspace');
    section.append(header, workspace);
    main.append(section);

    workspace.addEventListener('submit', event => {
      const form = event.target.closest('[data-brand-form]');
      if (!form) return;
      event.preventDefault();
      submitForm(form);
    });
    workspace.addEventListener('click', event => {
      const action = event.target.closest('[data-brand-action]');
      if (action) handleAction(action);
    });
    workspace.addEventListener('change', async event => {
      if (event.target.matches('[data-brand-select="kit"]')) {
        state.activeKitId = event.target.value;
        global.localStorage?.setItem(STORAGE_KEY, state.activeKitId);
        render();
      }
      if (event.target.matches('[data-member-role]')) {
        const kit = activeKit();
        try {
          await api().updateMember(kit.kitId, event.target.dataset.memberRole, event.target.value);
          announce(copy.saved);
          await reload(kit.kitId);
        } catch (error) {
          announce(error.message || copy.error, 'error');
        }
      }
    });

    state.mounted = true;
    document.documentElement.dataset.dashboardBrandKit = 'ready';
    if (new URLSearchParams(global.location.search).get('tab') === 'brand-kit') activateSection();
    return true;
  }

  function init() {
    if (mount()) return;
    const observer = new MutationObserver(() => {
      if (mount()) observer.disconnect();
    });
    observer.observe(document.documentElement, { childList: true, subtree: true });
    global.setTimeout(() => observer.disconnect(), 10000);
  }

  global.DashboardBrandKit = { version: VERSION, init, reload, getState: () => ({ ...state }) };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true });
  else init();
}(typeof window !== 'undefined' ? window : globalThis));
