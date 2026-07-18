(function initializeDashboardWorkspaces(global) {
  'use strict';

  const document = global.document;
  if (!document || global.DashboardWorkspaces) return;

  const VERSION = '11.0.0';
  const STORAGE_KEY = 'mcprime-active-workspace';
  const isEnglish = document.documentElement.lang.toLowerCase().startsWith('en');
  const copy = isEnglish ? {
    nav: 'Team Workspace', title: 'Team Workspaces', subtitle: 'Share designs with editors and reviewers, collect feedback, approve, then publish.',
    create: 'Create workspace', createHint: 'Create a shared space for your team and design approvals.', name: 'Workspace name', description: 'Description', save: 'Save',
    active: 'Active workspace', team: 'Team members', designs: 'Workspace designs', addMember: 'Add member', memberEmail: 'Registered member email', role: 'Role',
    linkDesign: 'Add design', chooseDesign: 'Choose one of my designs', open: 'Open editor', unlink: 'Remove from workspace', deleteWorkspace: 'Delete workspace',
    submit: 'Submit for review', approve: 'Approve', changes: 'Request changes', publish: 'Publish', draft: 'Return to draft',
    noSpaces: 'No team workspace yet.', noMembers: 'No additional members.', noDesigns: 'No designs attached to this workspace.', noOwned: 'Create and save a design first.',
    loading: 'Loading workspace…', saved: 'Saved successfully.', removed: 'Removed.', error: 'Operation failed.', note: 'Optional review note', changeNote: 'Describe the required changes',
    owner: 'Owner', admin: 'Admin', editor: 'Editor', reviewer: 'Reviewer', viewer: 'Viewer',
    statusDraft: 'Draft', statusReview: 'In review', statusChanges: 'Changes requested', statusApproved: 'Approved', statusPublished: 'Published',
    confirmDelete: 'Delete this workspace permanently?', confirmUnlink: 'Remove this design from the workspace?'
  } : {
    nav: 'مساحة الفريق', title: 'مساحات عمل الفريق', subtitle: 'شارك التصاميم مع المحررين والمراجعين، اجمع الملاحظات، اعتمد التصميم ثم انشره.',
    create: 'إنشاء مساحة عمل', createHint: 'أنشئ مساحة مشتركة للفريق واعتماد التصاميم.', name: 'اسم مساحة العمل', description: 'وصف مختصر', save: 'حفظ',
    active: 'مساحة العمل النشطة', team: 'أعضاء الفريق', designs: 'تصاميم مساحة العمل', addMember: 'إضافة عضو', memberEmail: 'بريد عضو مسجل', role: 'الدور',
    linkDesign: 'إضافة تصميم', chooseDesign: 'اختر تصميمًا من تصاميمي', open: 'فتح المحرر', unlink: 'إزالة من المساحة', deleteWorkspace: 'حذف مساحة العمل',
    submit: 'إرسال للمراجعة', approve: 'اعتماد', changes: 'طلب تعديلات', publish: 'نشر', draft: 'إعادة إلى مسودة',
    noSpaces: 'لا توجد مساحة عمل للفريق حتى الآن.', noMembers: 'لا يوجد أعضاء إضافيون.', noDesigns: 'لا توجد تصاميم مرتبطة بهذه المساحة.', noOwned: 'أنشئ تصميمًا واحفظه أولًا.',
    loading: 'جاري تحميل مساحة العمل…', saved: 'تم الحفظ بنجاح.', removed: 'تمت الإزالة.', error: 'تعذر تنفيذ العملية.', note: 'ملاحظة مراجعة اختيارية', changeNote: 'اكتب التعديلات المطلوبة بوضوح',
    owner: 'المالك', admin: 'مدير', editor: 'محرر', reviewer: 'مراجع', viewer: 'مشاهد',
    statusDraft: 'مسودة', statusReview: 'قيد المراجعة', statusChanges: 'تعديلات مطلوبة', statusApproved: 'معتمد', statusPublished: 'منشور',
    confirmDelete: 'هل تريد حذف مساحة العمل نهائيًا؟', confirmUnlink: 'هل تريد إزالة هذا التصميم من مساحة العمل؟'
  };

  const roleLabels = { owner: copy.owner, admin: copy.admin, editor: copy.editor, reviewer: copy.reviewer, viewer: copy.viewer };
  const statusLabels = {
    draft: copy.statusDraft, in_review: copy.statusReview, changes_requested: copy.statusChanges,
    approved: copy.statusApproved, published: copy.statusPublished
  };

  const state = {
    workspaces: [], activeWorkspaceId: '', designs: [], ownedDesigns: [], permission: null,
    loading: false, mounted: false
  };
  let section;
  let shell;
  let navItem;

  function el(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  }

  function button(text, className, action) {
    const node = el('button', className, text);
    node.type = action ? 'button' : 'submit';
    if (action) node.dataset.workspaceAction = action;
    return node;
  }

  function option(value, label, selected = false) {
    const node = el('option', '', label);
    node.value = value;
    node.selected = selected;
    return node;
  }

  function api() {
    if (!global.WorkspaceClient) throw new Error('Workspace client is not ready');
    return global.WorkspaceClient;
  }

  function activeWorkspace() {
    return state.workspaces.find(item => item.workspaceId === state.activeWorkspaceId) || state.workspaces[0] || null;
  }

  function canManage() {
    return ['owner', 'admin'].includes(state.permission);
  }

  function canEdit() {
    return ['owner', 'admin', 'editor'].includes(state.permission);
  }

  function canReview() {
    return ['owner', 'admin', 'reviewer'].includes(state.permission);
  }

  function canPublish() {
    return ['owner', 'admin'].includes(state.permission);
  }

  function announce(message, type = 'success') {
    let toast = document.getElementById('workspace-dashboard-toast');
    if (!toast) {
      toast = el('div', 'workspace-toast');
      toast.id = 'workspace-dashboard-toast';
      toast.setAttribute('role', 'status');
      document.body.append(toast);
    }
    toast.dataset.type = type;
    toast.textContent = message;
    toast.hidden = false;
    global.clearTimeout(toast._timer);
    toast._timer = global.setTimeout(() => { toast.hidden = true; }, 3500);
  }

  function ownedDesignName(design) {
    const inputs = design?.data?.inputs || {};
    return inputs['input-name_ar'] || inputs['input-name_en'] || inputs['input-name'] || design.shortId;
  }

  async function loadActive() {
    const workspace = activeWorkspace();
    if (!workspace) {
      state.designs = [];
      state.permission = null;
      return;
    }
    const result = await api().listDesigns(workspace.workspaceId);
    state.designs = result.designs || [];
    state.permission = result.permission || workspace.permission;
  }

  async function reload(preferredId) {
    state.loading = true;
    render();
    try {
      const [workspaceResult, ownedResult] = await Promise.all([api().list(), api().ownedDesigns()]);
      state.workspaces = workspaceResult.workspaces || [];
      state.ownedDesigns = ownedResult.designs || [];
      const stored = preferredId || global.localStorage?.getItem(STORAGE_KEY) || '';
      state.activeWorkspaceId = state.workspaces.some(item => item.workspaceId === stored)
        ? stored
        : state.workspaces[0]?.workspaceId || '';
      if (state.activeWorkspaceId) global.localStorage?.setItem(STORAGE_KEY, state.activeWorkspaceId);
      await loadActive();
    } catch (error) {
      console.error('[DashboardWorkspaces] Load failed:', error);
      announce(error.message || copy.error, 'error');
    } finally {
      state.loading = false;
      render();
    }
  }

  function emptyState() {
    const card = el('div', 'workspace-empty');
    card.append(el('i', 'fas fa-users-rectangle'), el('h3', '', copy.noSpaces), el('p', 'workspace-muted', copy.createHint));
    const form = el('form', 'workspace-meta-form');
    form.dataset.workspaceForm = 'create';
    const name = el('input', 'workspace-input');
    name.name = 'name';
    name.placeholder = copy.name;
    name.maxLength = 80;
    name.required = true;
    const description = el('input', 'workspace-input');
    description.name = 'description';
    description.placeholder = copy.description;
    description.maxLength = 240;
    form.append(name, description, button(copy.create, 'workspace-primary'));
    card.append(form);
    return card;
  }

  function toolbar(workspace) {
    const bar = el('div', 'workspace-toolbar');
    const field = el('label');
    field.append(el('span', 'workspace-muted', copy.active));
    const select = el('select', 'workspace-select');
    select.dataset.workspaceSelect = 'active';
    state.workspaces.forEach(item => select.append(option(
      item.workspaceId,
      `${item.name} · ${roleLabels[item.permission] || item.permission}`,
      item.workspaceId === workspace.workspaceId
    )));
    field.append(select);
    const create = button(copy.create, 'workspace-secondary', 'new-workspace');
    create.prepend(el('i', 'fas fa-plus'));
    bar.append(field, create);
    return bar;
  }

  function metadataCard(workspace) {
    const card = el('section', 'workspace-card');
    const heading = el('div', 'workspace-card-heading');
    heading.append(el('h3', '', copy.title), el('span', 'workspace-permission', roleLabels[state.permission] || state.permission || ''));
    card.append(heading);
    const form = el('form', 'workspace-meta-form');
    form.dataset.workspaceForm = 'metadata';
    const name = el('input', 'workspace-input');
    name.name = 'name';
    name.value = workspace.name || '';
    name.placeholder = copy.name;
    name.required = true;
    name.disabled = !canManage();
    const description = el('input', 'workspace-input');
    description.name = 'description';
    description.value = workspace.description || '';
    description.placeholder = copy.description;
    description.disabled = !canManage();
    form.append(name, description);
    if (canManage()) form.append(button(copy.save, 'workspace-primary'));
    card.append(form);
    return card;
  }

  function memberCard(workspace) {
    const card = el('section', 'workspace-card');
    const heading = el('div', 'workspace-card-heading');
    heading.append(el('h3', '', copy.team), el('span', 'workspace-muted', String((workspace.members || []).length + 1)));
    card.append(heading);
    const list = el('div', 'workspace-member-list');
    const owner = el('div', 'workspace-member');
    owner.append(el('span', 'workspace-member-avatar', (workspace.ownerName || 'O').slice(0, 1).toUpperCase()));
    const ownerCopy = el('div', 'workspace-member-copy');
    ownerCopy.append(el('strong', '', workspace.ownerName || copy.owner), el('small', '', copy.owner));
    owner.append(ownerCopy, el('span', 'workspace-role', copy.owner));
    list.append(owner);
    (workspace.members || []).forEach(member => {
      const row = el('div', 'workspace-member');
      row.append(el('span', 'workspace-member-avatar', (member.name || member.email || 'U').slice(0, 1).toUpperCase()));
      const text = el('div', 'workspace-member-copy');
      text.append(el('strong', '', member.name || member.email), el('small', '', member.email || ''));
      row.append(text);
      if (canManage()) {
        const select = el('select', 'workspace-select');
        select.dataset.workspaceMemberRole = member.userId;
        ['admin', 'editor', 'reviewer', 'viewer'].forEach(role => select.append(option(role, roleLabels[role], member.role === role)));
        if (state.permission !== 'owner' && member.role === 'admin') select.disabled = true;
        const remove = button('×', 'workspace-icon-button', 'remove-member');
        remove.dataset.memberId = member.userId;
        row.append(select, remove);
      } else row.append(el('span', 'workspace-role', roleLabels[member.role] || member.role));
      list.append(row);
    });
    if (!(workspace.members || []).length) list.append(el('p', 'workspace-muted', copy.noMembers));
    card.append(list);
    if (canManage()) {
      const form = el('form', 'workspace-inline-form');
      form.dataset.workspaceForm = 'member';
      const email = el('input', 'workspace-input');
      email.name = 'email';
      email.type = 'email';
      email.required = true;
      email.placeholder = copy.memberEmail;
      const role = el('select', 'workspace-select');
      role.name = 'role';
      ['editor', 'reviewer', 'viewer'].forEach(value => role.append(option(value, roleLabels[value])));
      if (state.permission === 'owner') role.append(option('admin', roleLabels.admin));
      form.append(email, role, button(copy.addMember, 'workspace-primary'));
      card.append(form);
    }
    return card;
  }

  function statusBadge(status) {
    const badge = el('span', 'workspace-status', statusLabels[status] || status);
    badge.dataset.status = status;
    return badge;
  }

  function designActions(design) {
    const actions = el('div', 'workspace-actions');
    const open = button(copy.open, 'workspace-secondary', 'open-design');
    open.dataset.designId = design.shortId;
    actions.append(open);
    const status = design.workflow?.status || 'draft';
    if (canEdit() && ['draft', 'changes_requested'].includes(status)) {
      const submit = button(copy.submit, 'workspace-primary', 'submit-review');
      submit.dataset.designId = design.shortId;
      actions.append(submit);
    }
    if (canReview() && status === 'in_review') {
      const approve = button(copy.approve, 'workspace-primary', 'approve');
      approve.dataset.designId = design.shortId;
      const changes = button(copy.changes, 'workspace-secondary', 'request-changes');
      changes.dataset.designId = design.shortId;
      actions.append(approve, changes);
    }
    if (canPublish() && status === 'approved') {
      const publish = button(copy.publish, 'workspace-primary', 'publish');
      publish.dataset.designId = design.shortId;
      actions.append(publish);
    }
    if (canEdit() && ['approved', 'published', 'changes_requested'].includes(status)) {
      const draft = button(copy.draft, 'workspace-secondary', 'draft');
      draft.dataset.designId = design.shortId;
      actions.append(draft);
    }
    if (canManage() || design.ownerId === global.Auth?.user?.userId) {
      const unlink = button(copy.unlink, 'workspace-danger', 'unlink-design');
      unlink.dataset.designId = design.shortId;
      actions.append(unlink);
    }
    return actions;
  }

  function designsCard(workspace) {
    const card = el('section', 'workspace-card');
    const heading = el('div', 'workspace-card-heading');
    heading.append(el('h3', '', copy.designs), el('span', 'workspace-muted', String(state.designs.length)));
    card.append(heading);
    if (canEdit()) {
      const form = el('form', 'workspace-inline-form');
      form.dataset.workspaceForm = 'link-design';
      const select = el('select', 'workspace-select');
      select.name = 'designId';
      select.required = true;
      select.append(option('', state.ownedDesigns.length ? copy.chooseDesign : copy.noOwned));
      state.ownedDesigns.forEach(design => select.append(option(design.shortId, `${ownedDesignName(design)} · ${design.shortId}`)));
      form.append(select, el('span'), button(copy.linkDesign, 'workspace-primary'));
      card.append(form);
    }
    const list = el('div', 'workspace-design-list');
    state.designs.forEach(design => {
      const row = el('article', 'workspace-design-row');
      const thumb = el('img', 'workspace-design-thumb');
      if (design.thumbnail) thumb.src = design.thumbnail;
      thumb.alt = design.name || 'Design';
      const text = el('div', 'workspace-design-copy');
      text.append(el('strong', '', design.name), el('small', '', `${design.shortId} · ${new Date(design.lastModified || design.createdAt || Date.now()).toLocaleDateString()}`));
      row.append(thumb, text, statusBadge(design.workflow?.status || 'draft'), designActions(design));
      list.append(row);
    });
    if (!state.designs.length) list.append(el('p', 'workspace-muted', copy.noDesigns));
    card.append(list);
    if (state.permission === 'owner') {
      const remove = button(copy.deleteWorkspace, 'workspace-danger', 'delete-workspace');
      card.append(remove);
    }
    return card;
  }

  function render() {
    if (!shell) return;
    shell.replaceChildren();
    if (state.loading) {
      shell.append(el('div', 'workspace-empty', copy.loading));
      return;
    }
    const workspace = activeWorkspace();
    if (!workspace) {
      shell.append(emptyState());
      return;
    }
    shell.append(toolbar(workspace), metadataCard(workspace));
    const grid = el('div', 'workspace-grid');
    grid.append(memberCard(workspace), designsCard(workspace));
    shell.append(grid);
  }

  async function submitForm(form) {
    const workspace = activeWorkspace();
    const data = new FormData(form);
    try {
      if (form.dataset.workspaceForm === 'create') {
        const result = await api().create({ name: data.get('name'), description: data.get('description') });
        announce(copy.saved);
        await reload(result.workspace?.workspaceId);
      } else if (form.dataset.workspaceForm === 'metadata' && workspace) {
        await api().update(workspace.workspaceId, { name: data.get('name'), description: data.get('description') });
        announce(copy.saved);
        await reload(workspace.workspaceId);
      } else if (form.dataset.workspaceForm === 'member' && workspace) {
        await api().addMember(workspace.workspaceId, { email: data.get('email'), role: data.get('role') });
        form.reset();
        announce(copy.saved);
        await reload(workspace.workspaceId);
      } else if (form.dataset.workspaceForm === 'link-design' && workspace) {
        await api().linkDesign(workspace.workspaceId, data.get('designId'));
        announce(copy.saved);
        await reload(workspace.workspaceId);
      }
    } catch (error) {
      announce(error.message || copy.error, 'error');
    }
  }

  async function handleAction(node) {
    const workspace = activeWorkspace();
    try {
      switch (node.dataset.workspaceAction) {
        case 'new-workspace':
          state.workspaces = [];
          state.activeWorkspaceId = '';
          state.designs = [];
          state.permission = null;
          render();
          break;
        case 'remove-member':
          await api().removeMember(workspace.workspaceId, node.dataset.memberId);
          announce(copy.removed);
          await reload(workspace.workspaceId);
          break;
        case 'open-design':
          global.location.href = `${isEnglish ? 'editor-en.html' : 'editor.html'}?id=${encodeURIComponent(node.dataset.designId)}`;
          break;
        case 'unlink-design':
          if (!global.confirm(copy.confirmUnlink)) return;
          await api().unlinkDesign(workspace.workspaceId, node.dataset.designId);
          announce(copy.removed);
          await reload(workspace.workspaceId);
          break;
        case 'submit-review':
          await api().submitReview(node.dataset.designId, global.prompt(copy.note) || '');
          announce(copy.saved);
          await reload(workspace.workspaceId);
          break;
        case 'approve':
          await api().decide(node.dataset.designId, 'approve', global.prompt(copy.note) || '');
          announce(copy.saved);
          await reload(workspace.workspaceId);
          break;
        case 'request-changes': {
          const note = global.prompt(copy.changeNote) || '';
          if (!note.trim()) return;
          await api().decide(node.dataset.designId, 'request_changes', note);
          announce(copy.saved);
          await reload(workspace.workspaceId);
          break;
        }
        case 'publish':
          await api().publish(node.dataset.designId);
          announce(copy.saved);
          await reload(workspace.workspaceId);
          break;
        case 'draft':
          await api().returnDraft(node.dataset.designId, global.prompt(copy.note) || '');
          announce(copy.saved);
          await reload(workspace.workspaceId);
          break;
        case 'delete-workspace':
          if (!global.confirm(copy.confirmDelete)) return;
          await api().remove(workspace.workspaceId);
          global.localStorage?.removeItem(STORAGE_KEY);
          announce(copy.removed);
          await reload();
          break;
        default:
          break;
      }
    } catch (error) {
      console.error('[DashboardWorkspaces] Action failed:', error);
      announce(error.message || copy.error, 'error');
    }
  }

  function activate() {
    document.querySelectorAll('.sidebar-item').forEach(item => item.classList.remove('active'));
    navItem?.classList.add('active');
    document.querySelectorAll('.dashboard-section').forEach(item => item.classList.remove('active'));
    section?.classList.add('active');
    reload(state.activeWorkspaceId);
  }

  function mount() {
    if (state.mounted) return true;
    const sidebar = document.querySelector('.sidebar-menu');
    const main = document.querySelector('.dashboard-main');
    if (!sidebar || !main) return false;

    navItem = el('a', 'sidebar-item');
    navItem.href = '#';
    navItem.dataset.section = 'team-workspace';
    navItem.append(el('i', 'fas fa-users-rectangle'), el('span', '', copy.nav));
    const brand = sidebar.querySelector('[data-section="brand-kit"]');
    if (brand) brand.insertAdjacentElement('afterend', navItem);
    else sidebar.append(navItem);
    navItem.addEventListener('click', event => { event.preventDefault(); activate(); });

    section = el('div', 'dashboard-section workspace-dashboard-section');
    section.id = 'section-team-workspace';
    const header = el('div', 'dashboard-header');
    const text = el('div');
    text.append(el('h1', '', copy.title), el('p', 'user-info', copy.subtitle));
    header.append(text);
    shell = el('div', 'workspace-shell');
    section.append(header, shell);
    main.append(section);

    shell.addEventListener('submit', event => {
      const form = event.target.closest('[data-workspace-form]');
      if (!form) return;
      event.preventDefault();
      submitForm(form);
    });
    shell.addEventListener('click', event => {
      const action = event.target.closest('[data-workspace-action]');
      if (action) handleAction(action);
    });
    shell.addEventListener('change', async event => {
      if (event.target.matches('[data-workspace-select="active"]')) {
        state.activeWorkspaceId = event.target.value;
        global.localStorage?.setItem(STORAGE_KEY, state.activeWorkspaceId);
        state.loading = true;
        render();
        try { await loadActive(); } catch (error) { announce(error.message || copy.error, 'error'); }
        state.loading = false;
        render();
      }
      if (event.target.matches('[data-workspace-member-role]')) {
        const workspace = activeWorkspace();
        try {
          await api().updateMember(workspace.workspaceId, event.target.dataset.workspaceMemberRole, event.target.value);
          announce(copy.saved);
          await reload(workspace.workspaceId);
        } catch (error) { announce(error.message || copy.error, 'error'); }
      }
    });

    state.mounted = true;
    document.documentElement.dataset.dashboardWorkspaces = 'ready';
    if (new URLSearchParams(global.location.search).get('tab') === 'workspace') activate();
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

  global.DashboardWorkspaces = { version: VERSION, init, reload, getState: () => ({ ...state }) };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true });
  else init();
}(typeof window !== 'undefined' ? window : globalThis));
