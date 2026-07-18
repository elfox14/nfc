(function initializeEditorReviewWorkflow(global) {
  'use strict';

  const document = global.document;
  if (!document || global.EditorReviewWorkflow) return;

  const VERSION = '11.0.0';
  const isEnglish = document.documentElement.lang.toLowerCase().startsWith('en');
  const copy = isEnglish ? {
    open: 'Review', title: 'Design review', subtitle: 'Comments, approvals and publication status for this shared design.', close: 'Close',
    noDesign: 'Save the design first to start a review workflow.', noWorkspace: 'This design is not attached to a team workspace.', dashboard: 'Open Team Workspace',
    loading: 'Loading review…', comments: 'Comments', activity: 'Activity', addComment: 'Add comment', commentPlaceholder: 'Write clear feedback for the team…',
    selectedElement: 'Attach to selected element', general: 'General design comment', resolve: 'Resolve', reopen: 'Reopen',
    submit: 'Submit for review', approve: 'Approve', changes: 'Request changes', publish: 'Publish', draft: 'Return to draft',
    note: 'Optional note', changeNote: 'Describe the required changes', saved: 'Workflow updated.', error: 'Could not update the review workflow.',
    statusDraft: 'Draft', statusReview: 'In review', statusChanges: 'Changes requested', statusApproved: 'Approved', statusPublished: 'Published',
    owner: 'Owner', admin: 'Admin', editor: 'Editor', reviewer: 'Reviewer', viewer: 'Viewer', noComments: 'No comments yet.', noActivity: 'No activity yet.',
    linked: 'Design added to workspace', submitted: 'Submitted for review', approved: 'Design approved', changesRequested: 'Changes requested', published: 'Design published', returnedDraft: 'Returned to draft'
  } : {
    open: 'المراجعة', title: 'مراجعة التصميم', subtitle: 'التعليقات والاعتماد وحالة النشر لهذا التصميم المشترك.', close: 'إغلاق',
    noDesign: 'احفظ التصميم أولًا لبدء دورة المراجعة.', noWorkspace: 'هذا التصميم غير مرتبط بمساحة عمل للفريق.', dashboard: 'فتح مساحة الفريق',
    loading: 'جاري تحميل المراجعة…', comments: 'التعليقات', activity: 'سجل النشاط', addComment: 'إضافة تعليق', commentPlaceholder: 'اكتب ملاحظة واضحة للفريق…',
    selectedElement: 'ربط بالعنصر المحدد', general: 'تعليق عام على التصميم', resolve: 'تم الحل', reopen: 'إعادة الفتح',
    submit: 'إرسال للمراجعة', approve: 'اعتماد', changes: 'طلب تعديلات', publish: 'نشر', draft: 'إعادة إلى مسودة',
    note: 'ملاحظة اختيارية', changeNote: 'اكتب التعديلات المطلوبة بوضوح', saved: 'تم تحديث دورة المراجعة.', error: 'تعذر تحديث دورة المراجعة.',
    statusDraft: 'مسودة', statusReview: 'قيد المراجعة', statusChanges: 'تعديلات مطلوبة', statusApproved: 'معتمد', statusPublished: 'منشور',
    owner: 'المالك', admin: 'مدير', editor: 'محرر', reviewer: 'مراجع', viewer: 'مشاهد', noComments: 'لا توجد تعليقات حتى الآن.', noActivity: 'لا يوجد نشاط حتى الآن.',
    linked: 'تمت إضافة التصميم لمساحة العمل', submitted: 'تم إرسال التصميم للمراجعة', approved: 'تم اعتماد التصميم', changesRequested: 'تم طلب تعديلات', published: 'تم نشر التصميم', returnedDraft: 'تمت إعادة التصميم إلى مسودة'
  };

  const roleLabels = { owner: copy.owner, admin: copy.admin, editor: copy.editor, reviewer: copy.reviewer, viewer: copy.viewer };
  const statusLabels = {
    draft: copy.statusDraft, in_review: copy.statusReview, changes_requested: copy.statusChanges,
    approved: copy.statusApproved, published: copy.statusPublished
  };
  const activityLabels = {
    linked: copy.linked, submitted: copy.submitted, approved: copy.approved,
    changes_requested: copy.changesRequested, published: copy.published, draft: copy.returnedDraft
  };

  const state = {
    data: null,
    loading: false,
    mounted: false,
    open: false,
    unavailable: false
  };
  let launcher;
  let modal;
  let body;

  function el(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  }

  function button(text, className, action) {
    const node = el('button', className, text);
    node.type = 'button';
    if (action) node.dataset.reviewAction = action;
    return node;
  }

  function api() {
    if (!global.WorkspaceClient) throw new Error('Workspace client is not ready');
    return global.WorkspaceClient;
  }

  function designId() {
    const params = new URLSearchParams(global.location.search);
    return params.get('id') || params.get('collabId') || '';
  }

  function selectedElement() {
    const selected = global.EditorWorkspace?.getState?.().selectedItem;
    return selected && selected !== 'card' ? selected : '';
  }

  function status() {
    return state.data?.design?.workflow?.status || 'draft';
  }

  function announce(message, type = 'success') {
    global.UIManager?.announce?.(message);
    let toast = document.getElementById('workspace-review-toast');
    if (!toast) {
      toast = el('div', 'workspace-toast');
      toast.id = 'workspace-review-toast';
      toast.setAttribute('role', 'status');
      document.body.append(toast);
    }
    toast.dataset.type = type;
    toast.textContent = message;
    toast.hidden = false;
    global.clearTimeout(toast._timer);
    toast._timer = global.setTimeout(() => { toast.hidden = true; }, 3500);
  }

  function unresolvedCount() {
    return (state.data?.entries || []).filter(entry => entry.kind === 'comment' && !entry.resolved).length;
  }

  function updateLauncher() {
    if (!launcher) return;
    const badge = launcher.querySelector('.workspace-launcher-badge');
    const count = unresolvedCount();
    if (badge) {
      badge.textContent = String(count);
      badge.hidden = !count;
    }
    launcher.dataset.workflowStatus = state.data?.design?.workflow?.status || (state.unavailable ? 'unavailable' : 'unknown');
    launcher.title = state.data
      ? `${copy.open}: ${statusLabels[status()] || status()}`
      : copy.open;
  }

  function statusBadge(value) {
    const badge = el('span', 'workspace-status', statusLabels[value] || value);
    badge.dataset.status = value;
    return badge;
  }

  async function load({ silent = false } = {}) {
    const id = designId();
    if (!id) {
      state.data = null;
      state.unavailable = true;
      updateLauncher();
      if (!silent) render();
      return null;
    }
    state.loading = true;
    if (!silent) render();
    try {
      state.data = await api().workflow(id);
      state.unavailable = false;
      document.documentElement.dataset.editorReviewWorkflow = 'ready';
      document.documentElement.dataset.editorReviewStatus = status();
      return state.data;
    } catch (error) {
      if ([404, 409].includes(error.status)) {
        state.data = null;
        state.unavailable = true;
      } else {
        console.error('[EditorReviewWorkflow] Load failed:', error);
        if (!silent) announce(error.message || copy.error, 'error');
      }
      return null;
    } finally {
      state.loading = false;
      updateLauncher();
      if (!silent) render();
    }
  }

  function emptyPanel() {
    const panel = el('div', 'workspace-editor-panel workspace-empty');
    panel.append(el('i', 'fas fa-clipboard-check'));
    const id = designId();
    panel.append(el('h3', '', id ? copy.noWorkspace : copy.noDesign));
    const link = el('a', 'workspace-primary', copy.dashboard);
    link.href = `${isEnglish ? 'dashboard-en.html' : 'dashboard.html'}?tab=workspace`;
    panel.append(link);
    return panel;
  }

  function reviewActions() {
    const actions = el('div', 'workspace-actions');
    const capabilities = state.data?.capabilities || {};
    const current = status();
    if (capabilities.edit && ['draft', 'changes_requested'].includes(current)) {
      actions.append(button(copy.submit, 'workspace-primary', 'submit'));
    }
    if (capabilities.review && current === 'in_review') {
      actions.append(button(copy.approve, 'workspace-primary', 'approve'));
      actions.append(button(copy.changes, 'workspace-secondary', 'changes'));
    }
    if (capabilities.publish && current === 'approved') {
      actions.append(button(copy.publish, 'workspace-primary', 'publish'));
    }
    if (capabilities.edit && ['approved', 'published', 'changes_requested'].includes(current)) {
      actions.append(button(copy.draft, 'workspace-secondary', 'draft'));
    }
    return actions;
  }

  function commentsPanel() {
    const panel = el('section', 'workspace-editor-panel');
    const heading = el('div', 'workspace-card-heading');
    heading.append(el('h3', '', copy.comments), el('span', 'workspace-muted', String(unresolvedCount())));
    panel.append(heading);
    const form = el('form', 'workspace-shell');
    form.dataset.reviewForm = 'comment';
    const textarea = el('textarea', 'workspace-textarea');
    textarea.name = 'text';
    textarea.placeholder = copy.commentPlaceholder;
    textarea.maxLength = 1500;
    textarea.required = true;
    const element = selectedElement();
    const attachment = el('label', 'workspace-status-line');
    const checkbox = el('input');
    checkbox.type = 'checkbox';
    checkbox.name = 'attachElement';
    checkbox.checked = Boolean(element);
    checkbox.disabled = !element;
    attachment.append(checkbox, el('span', '', element ? `${copy.selectedElement}: ${element}` : copy.general));
    form.append(textarea, attachment, button(copy.addComment, 'workspace-primary'));
    panel.append(form);

    const list = el('div', 'workspace-comment-list');
    const comments = (state.data?.entries || []).filter(entry => entry.kind === 'comment').slice().reverse();
    comments.forEach(entry => {
      const card = el('article', 'workspace-comment');
      card.dataset.resolved = entry.resolved ? 'true' : 'false';
      const header = el('div', 'workspace-comment-header');
      const copyBlock = el('div');
      copyBlock.append(el('strong', '', entry.authorName || entry.authorEmail || 'User'));
      copyBlock.append(el('small', '', new Date(entry.createdAt).toLocaleString()));
      header.append(copyBlock);
      if (entry.elementId) header.append(el('span', 'workspace-comment-element', entry.elementId));
      card.append(header, el('p', '', entry.text || ''));
      const resolve = button(entry.resolved ? copy.reopen : copy.resolve, 'workspace-secondary', 'resolve-comment');
      resolve.dataset.entryId = entry.entryId;
      resolve.dataset.resolved = entry.resolved ? 'false' : 'true';
      card.append(resolve);
      list.append(card);
    });
    if (!comments.length) list.append(el('p', 'workspace-muted', copy.noComments));
    panel.append(list);
    return panel;
  }

  function activityPanel() {
    const panel = el('section', 'workspace-editor-panel');
    panel.append(el('h3', '', copy.activity));
    const list = el('div', 'workspace-activity-list');
    const entries = (state.data?.entries || []).filter(entry => entry.kind === 'activity').slice().reverse();
    entries.forEach(entry => {
      const row = el('div', 'workspace-activity');
      row.append(el('span', 'workspace-activity-dot'));
      const text = el('div');
      text.append(el('strong', '', activityLabels[entry.action] || entry.action || copy.activity));
      text.append(el('small', 'workspace-muted', `${entry.authorName || ''} · ${new Date(entry.createdAt).toLocaleString()}`));
      if (entry.text) text.append(el('p', '', entry.text));
      row.append(text);
      list.append(row);
    });
    if (!entries.length) list.append(el('p', 'workspace-muted', copy.noActivity));
    panel.append(list);
    return panel;
  }

  function render() {
    if (!body || !state.open) return;
    body.replaceChildren();
    if (state.loading) {
      body.append(el('div', 'workspace-empty', copy.loading));
      return;
    }
    if (!state.data) {
      body.append(emptyPanel());
      return;
    }

    const summary = el('section', 'workspace-editor-panel');
    const line = el('div', 'workspace-card-heading');
    const title = el('div');
    title.append(el('h3', '', state.data.workspace?.name || copy.title));
    title.append(el('p', 'workspace-muted', `${copy.role}: ${roleLabels[state.data.permission] || state.data.permission}`));
    line.append(title, statusBadge(status()));
    summary.append(line, reviewActions());
    body.append(summary);

    const grid = el('div', 'workspace-review-grid');
    grid.append(commentsPanel(), activityPanel());
    body.append(grid);
  }

  function open() {
    if (!modal) return;
    state.open = true;
    modal.hidden = false;
    document.body.style.overflow = 'hidden';
    load();
  }

  function close() {
    if (!modal) return;
    state.open = false;
    modal.hidden = true;
    document.body.style.removeProperty('overflow');
  }

  async function submitComment(form) {
    const data = new FormData(form);
    const element = data.get('attachElement') ? selectedElement() : '';
    await api().addComment(designId(), { text: data.get('text'), elementId: element });
    form.reset();
    await load();
    announce(copy.saved);
  }

  async function handleAction(node) {
    try {
      switch (node.dataset.reviewAction) {
        case 'close': close(); break;
        case 'submit': await api().submitReview(designId(), global.prompt(copy.note) || ''); break;
        case 'approve': await api().decide(designId(), 'approve', global.prompt(copy.note) || ''); break;
        case 'changes': {
          const note = global.prompt(copy.changeNote) || '';
          if (!note.trim()) return;
          await api().decide(designId(), 'request_changes', note);
          break;
        }
        case 'publish': await api().publish(designId()); break;
        case 'draft': await api().returnDraft(designId(), global.prompt(copy.note) || ''); break;
        case 'resolve-comment': await api().resolveComment(designId(), node.dataset.entryId, node.dataset.resolved === 'true'); break;
        default: return;
      }
      if (node.dataset.reviewAction !== 'close') {
        await load();
        announce(copy.saved);
      }
    } catch (error) {
      console.error('[EditorReviewWorkflow] Action failed:', error);
      announce(error.message || copy.error, 'error');
    }
  }

  function createModal() {
    modal = el('div', 'workspace-editor-modal');
    modal.id = 'workspace-review-modal';
    modal.hidden = true;
    modal.setAttribute('role', 'dialog');
    modal.setAttribute('aria-modal', 'true');
    modal.setAttribute('aria-labelledby', 'workspace-review-title');
    const dialog = el('div', 'workspace-editor-dialog');
    const header = el('header', 'workspace-review-header');
    const title = el('div');
    const heading = el('h2', '', copy.title);
    heading.id = 'workspace-review-title';
    title.append(heading, el('p', '', copy.subtitle));
    const closeButton = button('×', 'workspace-icon-button', 'close');
    closeButton.setAttribute('aria-label', copy.close);
    header.append(title, closeButton);
    body = el('div', 'workspace-editor-body');
    dialog.append(header, body);
    modal.append(dialog);
    document.body.append(modal);

    modal.addEventListener('click', event => {
      if (event.target === modal) close();
      const action = event.target.closest('[data-review-action]');
      if (action) handleAction(action);
    });
    modal.addEventListener('submit', event => {
      const form = event.target.closest('[data-review-form="comment"]');
      if (!form) return;
      event.preventDefault();
      submitComment(form).catch(error => announce(error.message || copy.error, 'error'));
    });
  }

  function mountLauncher() {
    if (launcher) return true;
    const host = document.querySelector('#pro-toolbar .tb-history, .pro-toolbar .tb-history, #pro-toolbar');
    if (!host) return false;
    launcher = button('', 'tb-action-btn workspace-review-launcher');
    launcher.id = 'editor-review-workflow-btn';
    launcher.setAttribute('aria-label', copy.open);
    launcher.append(el('i', 'fas fa-clipboard-check'));
    launcher.append(el('span', 'tb-label', copy.open));
    const badge = el('span', 'workspace-launcher-badge', '0');
    badge.hidden = true;
    launcher.append(badge);
    launcher.addEventListener('click', open);
    host.append(launcher);
    return true;
  }

  function init() {
    if (state.mounted) return;
    if (!mountLauncher()) {
      const observer = new MutationObserver(() => {
        if (mountLauncher()) {
          observer.disconnect();
          init();
        }
      });
      observer.observe(document.documentElement, { childList: true, subtree: true });
      global.setTimeout(() => observer.disconnect(), 10000);
      return;
    }
    createModal();
    state.mounted = true;
    document.documentElement.dataset.editorReviewWorkflowLoader = 'ready';
    load({ silent: true });
    document.addEventListener('editor:cloudsavesuccess', () => load({ silent: true }));
    document.addEventListener('editor:versionrestored', () => load({ silent: true }));
    global.addEventListener('popstate', () => load({ silent: true }));
    document.addEventListener('keydown', event => {
      if (event.key === 'Escape' && state.open) close();
    });
  }

  global.EditorReviewWorkflow = {
    version: VERSION,
    init,
    open,
    close,
    reload: load,
    getState: () => ({ ...state, data: state.data ? JSON.parse(JSON.stringify(state.data)) : null })
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true });
  else init();
}(typeof window !== 'undefined' ? window : globalThis));
