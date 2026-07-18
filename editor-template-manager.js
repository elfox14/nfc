(function initializeEditorTemplateManager(global) {
  'use strict';

  const document = global.document;
  if (!document || global.EditorTemplateManager) return;

  const VERSION = '8.2.0';
  const PERSONAL_STORAGE_KEY = 'mcprime-editor-personal-templates-v1';
  const MAX_PERSONAL_TEMPLATES = 12;
  const isEnglish = document.documentElement.lang.toLowerCase().startsWith('en');

  const copy = isEnglish ? {
    title: 'Professional templates',
    hint: 'Preview a complete visual direction before applying it. Your name, contacts and uploaded images stay unchanged.',
    all: 'All',
    personal: 'My templates',
    preview: 'Preview',
    apply: 'Apply template',
    cancel: 'Cancel',
    close: 'Close',
    saveCurrent: 'Save current design',
    saveTitle: 'Save as personal template',
    templateName: 'Template name',
    save: 'Save template',
    delete: 'Delete template',
    emptyPersonal: 'No personal templates yet.',
    applied: 'Template applied without replacing your content.',
    saved: 'Personal template saved.',
    deleted: 'Personal template deleted.',
    saveFailed: 'Could not save the template in this browser.',
    unavailable: 'The editor state is not ready yet.',
    undo: 'Undo',
    undoDone: 'Template application undone.',
    front: 'Front',
    back: 'Back',
    sampleName: 'Your Name',
    sampleRole: 'Professional title',
    personalBadge: 'Personal',
    builtInBadge: 'Ready-made',
    layout: 'Layout',
    colors: 'Colors',
    typography: 'Typography',
    category: 'Category',
    confirmDelete: 'Delete this personal template?',
    categories: {
      business: 'Business', medical: 'Medical', technology: 'Technology', realestate: 'Real estate',
      legal: 'Legal', food: 'Hospitality', creative: 'Creative', education: 'Education', fitness: 'Fitness'
    }
  } : {
    title: 'القوالب الاحترافية',
    hint: 'عاين الهوية البصرية كاملة قبل التطبيق. لن يتم استبدال الاسم أو بيانات التواصل أو الصور المرفوعة.',
    all: 'الكل',
    personal: 'قوالبي',
    preview: 'معاينة',
    apply: 'تطبيق القالب',
    cancel: 'إلغاء',
    close: 'إغلاق',
    saveCurrent: 'حفظ التصميم الحالي',
    saveTitle: 'حفظ كقالب شخصي',
    templateName: 'اسم القالب',
    save: 'حفظ القالب',
    delete: 'حذف القالب',
    emptyPersonal: 'لا توجد قوالب شخصية حتى الآن.',
    applied: 'تم تطبيق القالب دون استبدال بياناتك.',
    saved: 'تم حفظ القالب الشخصي.',
    deleted: 'تم حذف القالب الشخصي.',
    saveFailed: 'تعذر حفظ القالب داخل هذا المتصفح.',
    unavailable: 'حالة المحرر غير جاهزة بعد.',
    undo: 'تراجع',
    undoDone: 'تم التراجع عن تطبيق القالب.',
    front: 'الأمامي',
    back: 'الخلفي',
    sampleName: 'اسمك الكامل',
    sampleRole: 'المسمى المهني',
    personalBadge: 'شخصي',
    builtInBadge: 'جاهز',
    layout: 'التخطيط',
    colors: 'الألوان',
    typography: 'الخطوط',
    category: 'المجال',
    confirmDelete: 'هل تريد حذف هذا القالب الشخصي؟',
    categories: {
      business: 'أعمال', medical: 'طبي', technology: 'تقنية', realestate: 'عقارات',
      legal: 'قانون', food: 'ضيافة', creative: 'إبداعي', education: 'تعليم', fitness: 'لياقة'
    }
  };

  const designInputKeys = new Set([
    'layout-select-visual',
    'front-bg-start', 'front-bg-end', 'back-bg-start', 'back-bg-end',
    'front-bg-opacity', 'back-bg-opacity',
    'name-color', 'name-font', 'name-font-size',
    'tagline-color', 'tagline-font', 'tagline-font-size',
    'phone-btn-bg-color', 'phone-btn-text-color', 'phone-btn-font', 'phone-btn-font-size', 'phone-btn-padding',
    'phone-text-color', 'phone-text-font', 'phone-text-font-size', 'phone-text-layout',
    'back-buttons-bg-color', 'back-buttons-text-color', 'back-buttons-font', 'back-buttons-font-size',
    'social-text-color', 'social-text-font', 'social-text-size',
    'logo-size', 'logo-opacity', 'logo-bg-color', 'logo-shadow-enabled', 'logo-shadow-blur', 'logo-shadow-color',
    'photo-size', 'photo-opacity', 'photo-border-color', 'photo-border-width', 'photo-shadow-enabled',
    'photo-shadow-blur', 'photo-shadow-color', 'photo-shape',
    'qr-size', 'qr-fg-color', 'qr-bg-color',
    'editor-layer-order', 'editor-layer-locks', 'editor-layer-bio-position', 'editor-layer-appearance'
  ]);

  const placements = { logo: 'front', photo: 'front', name: 'front', tagline: 'front', qr: 'back' };

  function makeTemplate(id, category, icon, names, descriptions, preview, inputs, placementPatch = placements) {
    return {
      id,
      category,
      icon,
      name: isEnglish ? names.en : names.ar,
      description: isEnglish ? descriptions.en : descriptions.ar,
      preview,
      design: { inputs, placements: placementPatch },
      personal: false
    };
  }

  const builtInTemplates = [
    makeTemplate('executive-navy', 'business', 'fa-briefcase',
      { ar: 'تنفيذي كحلي', en: 'Executive navy' },
      { ar: 'هوية رسمية هادئة للمديرين والاستشاريين.', en: 'A composed corporate direction for executives and consultants.' },
      { colors: ['#081a2f', '#123b62', '#f8fbff', '#55b6ff'], font: 'Cairo, sans-serif', layout: 'modern' },
      {
        'layout-select-visual': 'modern', 'front-bg-start': '#081a2f', 'front-bg-end': '#123b62',
        'back-bg-start': '#f8fbff', 'back-bg-end': '#e7f0f8', 'name-color': '#ffffff',
        'tagline-color': '#79c8ff', 'name-font': 'Cairo, sans-serif', 'tagline-font': 'Tajawal, sans-serif',
        'name-font-size': '28', 'tagline-font-size': '15', 'back-buttons-bg-color': '#123b62',
        'back-buttons-text-color': '#ffffff', 'social-text-color': '#17324d', 'social-text-font': 'Tajawal, sans-serif',
        'phone-btn-bg-color': '#ffffff', 'phone-btn-text-color': '#123b62', 'photo-border-color': '#55b6ff',
        'photo-border-width': '3', 'logo-bg-color': 'transparent'
      }),
    makeTemplate('medical-trust', 'medical', 'fa-stethoscope',
      { ar: 'ثقة طبية', en: 'Medical trust' },
      { ar: 'ألوان نظيفة ومطمئنة للأطباء والمراكز الطبية.', en: 'Clean, reassuring colors for doctors and medical centers.' },
      { colors: ['#063b46', '#0e7490', '#f0fdfa', '#67e8f9'], font: 'Tajawal, sans-serif', layout: 'modern' },
      {
        'layout-select-visual': 'modern', 'front-bg-start': '#063b46', 'front-bg-end': '#0e7490',
        'back-bg-start': '#f0fdfa', 'back-bg-end': '#ccfbf1', 'name-color': '#ffffff',
        'tagline-color': '#a5f3fc', 'name-font': 'Cairo, sans-serif', 'tagline-font': 'Tajawal, sans-serif',
        'name-font-size': '27', 'tagline-font-size': '15', 'back-buttons-bg-color': '#0e7490',
        'back-buttons-text-color': '#ffffff', 'social-text-color': '#134e4a', 'social-text-font': 'Tajawal, sans-serif',
        'phone-btn-bg-color': '#ecfeff', 'phone-btn-text-color': '#155e75', 'photo-border-color': '#67e8f9',
        'photo-border-width': '4', 'logo-bg-color': '#ffffff'
      }),
    makeTemplate('technology-cyan', 'technology', 'fa-microchip',
      { ar: 'تقنية مستقبلية', en: 'Future technology' },
      { ar: 'تباين رقمي قوي للمطورين وشركات التقنية.', en: 'A sharp digital contrast for developers and technology companies.' },
      { colors: ['#07111f', '#172554', '#e0f2fe', '#22d3ee'], font: 'Poppins, sans-serif', layout: 'modern' },
      {
        'layout-select-visual': 'modern', 'front-bg-start': '#07111f', 'front-bg-end': '#172554',
        'back-bg-start': '#081426', 'back-bg-end': '#101f3d', 'name-color': '#f8fafc',
        'tagline-color': '#22d3ee', 'name-font': 'Poppins, sans-serif', 'tagline-font': 'Poppins, sans-serif',
        'name-font-size': '27', 'tagline-font-size': '14', 'back-buttons-bg-color': '#164e63',
        'back-buttons-text-color': '#ecfeff', 'social-text-color': '#bae6fd', 'social-text-font': 'Poppins, sans-serif',
        'phone-btn-bg-color': '#0e7490', 'phone-btn-text-color': '#ffffff', 'photo-border-color': '#22d3ee',
        'photo-border-width': '3', 'logo-shadow-enabled': 'true', 'logo-shadow-color': '#22d3ee', 'logo-shadow-blur': '12'
      }),
    makeTemplate('realestate-luxury', 'realestate', 'fa-building',
      { ar: 'عقارات فاخرة', en: 'Luxury real estate' },
      { ar: 'كحلي وذهبي للوسطاء والمطورين العقاريين.', en: 'Navy and gold for brokers and property developers.' },
      { colors: ['#111827', '#1f2937', '#fffaf0', '#d4a853'], font: 'Amiri, serif', layout: 'classic' },
      {
        'layout-select-visual': 'classic', 'front-bg-start': '#111827', 'front-bg-end': '#1f2937',
        'back-bg-start': '#fffaf0', 'back-bg-end': '#f4ead5', 'name-color': '#fef3c7',
        'tagline-color': '#d4a853', 'name-font': 'Amiri, serif', 'tagline-font': 'Tajawal, sans-serif',
        'name-font-size': '31', 'tagline-font-size': '15', 'back-buttons-bg-color': '#1f2937',
        'back-buttons-text-color': '#fef3c7', 'social-text-color': '#4b3a20', 'social-text-font': 'Tajawal, sans-serif',
        'phone-btn-bg-color': '#d4a853', 'phone-btn-text-color': '#111827', 'photo-border-color': '#d4a853',
        'photo-border-width': '4', 'logo-shadow-enabled': 'true', 'logo-shadow-color': '#000000', 'logo-shadow-blur': '10'
      }),
    makeTemplate('legal-charcoal', 'legal', 'fa-scale-balanced',
      { ar: 'قانوني رصين', en: 'Legal charcoal' },
      { ar: 'تصميم جاد للمحامين والمكاتب القانونية.', en: 'A serious, authoritative style for lawyers and legal firms.' },
      { colors: ['#171717', '#292524', '#fafaf9', '#c0a16b'], font: 'Amiri, serif', layout: 'classic' },
      {
        'layout-select-visual': 'classic', 'front-bg-start': '#171717', 'front-bg-end': '#292524',
        'back-bg-start': '#fafaf9', 'back-bg-end': '#e7e5e4', 'name-color': '#ffffff',
        'tagline-color': '#c0a16b', 'name-font': 'Amiri, serif', 'tagline-font': 'Tajawal, sans-serif',
        'name-font-size': '30', 'tagline-font-size': '15', 'back-buttons-bg-color': '#292524',
        'back-buttons-text-color': '#ffffff', 'social-text-color': '#292524', 'social-text-font': 'Tajawal, sans-serif',
        'phone-btn-bg-color': '#fafaf9', 'phone-btn-text-color': '#292524', 'photo-border-color': '#c0a16b',
        'photo-border-width': '2'
      }),
    makeTemplate('hospitality-terracotta', 'food', 'fa-utensils',
      { ar: 'ضيافة دافئة', en: 'Warm hospitality' },
      { ar: 'ألوان شهية للمطاعم والطهاة وخدمات الضيافة.', en: 'Appetizing colors for restaurants, chefs and hospitality services.' },
      { colors: ['#4a1f16', '#9a3412', '#fff7ed', '#fb923c'], font: 'Changa, sans-serif', layout: 'vertical' },
      {
        'layout-select-visual': 'vertical', 'front-bg-start': '#4a1f16', 'front-bg-end': '#9a3412',
        'back-bg-start': '#fff7ed', 'back-bg-end': '#fed7aa', 'name-color': '#fff7ed',
        'tagline-color': '#fdba74', 'name-font': 'Changa, sans-serif', 'tagline-font': 'Tajawal, sans-serif',
        'name-font-size': '28', 'tagline-font-size': '15', 'back-buttons-bg-color': '#9a3412',
        'back-buttons-text-color': '#fff7ed', 'social-text-color': '#7c2d12', 'social-text-font': 'Tajawal, sans-serif',
        'phone-btn-bg-color': '#fff7ed', 'phone-btn-text-color': '#9a3412', 'photo-border-color': '#fb923c',
        'photo-border-width': '4'
      }),
    makeTemplate('creative-violet', 'creative', 'fa-wand-magic-sparkles',
      { ar: 'بنفسجي إبداعي', en: 'Creative violet' },
      { ar: 'هوية مرنة للمصممين وصناع المحتوى والفنانين.', en: 'A flexible identity for designers, creators and artists.' },
      { colors: ['#25113f', '#6d28d9', '#faf5ff', '#d8b4fe'], font: 'Changa, sans-serif', layout: 'vertical' },
      {
        'layout-select-visual': 'vertical', 'front-bg-start': '#25113f', 'front-bg-end': '#6d28d9',
        'back-bg-start': '#faf5ff', 'back-bg-end': '#ede9fe', 'name-color': '#ffffff',
        'tagline-color': '#d8b4fe', 'name-font': 'Changa, sans-serif', 'tagline-font': 'Readex Pro, sans-serif',
        'name-font-size': '29', 'tagline-font-size': '15', 'back-buttons-bg-color': '#6d28d9',
        'back-buttons-text-color': '#ffffff', 'social-text-color': '#4c1d95', 'social-text-font': 'Readex Pro, sans-serif',
        'phone-btn-bg-color': '#ffffff', 'phone-btn-text-color': '#6d28d9', 'photo-border-color': '#d8b4fe',
        'photo-border-width': '4', 'logo-shadow-enabled': 'true', 'logo-shadow-color': '#d8b4fe', 'logo-shadow-blur': '14'
      }),
    makeTemplate('education-teal', 'education', 'fa-graduation-cap',
      { ar: 'تعليم موثوق', en: 'Trusted education' },
      { ar: 'قالب واضح للمدربين والمعلمين والمؤسسات التعليمية.', en: 'A clear template for trainers, teachers and educational institutions.' },
      { colors: ['#083344', '#0f766e', '#f0fdfa', '#5eead4'], font: 'Readex Pro, sans-serif', layout: 'modern' },
      {
        'layout-select-visual': 'modern', 'front-bg-start': '#083344', 'front-bg-end': '#0f766e',
        'back-bg-start': '#f0fdfa', 'back-bg-end': '#ccfbf1', 'name-color': '#ffffff',
        'tagline-color': '#99f6e4', 'name-font': 'Readex Pro, sans-serif', 'tagline-font': 'Tajawal, sans-serif',
        'name-font-size': '27', 'tagline-font-size': '15', 'back-buttons-bg-color': '#0f766e',
        'back-buttons-text-color': '#ffffff', 'social-text-color': '#134e4a', 'social-text-font': 'Tajawal, sans-serif',
        'phone-btn-bg-color': '#f0fdfa', 'phone-btn-text-color': '#0f766e', 'photo-border-color': '#5eead4',
        'photo-border-width': '3'
      }),
    makeTemplate('fitness-energy', 'fitness', 'fa-dumbbell',
      { ar: 'طاقة رياضية', en: 'Fitness energy' },
      { ar: 'تباين قوي للمدربين والنوادي والأنشطة الرياضية.', en: 'High contrast for coaches, gyms and sports brands.' },
      { colors: ['#09090b', '#27272a', '#fafafa', '#a3e635'], font: 'Poppins, sans-serif', layout: 'modern' },
      {
        'layout-select-visual': 'modern', 'front-bg-start': '#09090b', 'front-bg-end': '#27272a',
        'back-bg-start': '#18181b', 'back-bg-end': '#27272a', 'name-color': '#fafafa',
        'tagline-color': '#a3e635', 'name-font': 'Poppins, sans-serif', 'tagline-font': 'Poppins, sans-serif',
        'name-font-size': '28', 'tagline-font-size': '14', 'back-buttons-bg-color': '#a3e635',
        'back-buttons-text-color': '#18181b', 'social-text-color': '#f4f4f5', 'social-text-font': 'Poppins, sans-serif',
        'phone-btn-bg-color': '#a3e635', 'phone-btn-text-color': '#18181b', 'photo-border-color': '#a3e635',
        'photo-border-width': '4'
      })
  ];

  let initialized = false;
  let activeCategory = 'all';
  let previewTemplate = null;
  let panel = null;
  let grid = null;
  let filterHost = null;
  let modal = null;
  let saveDialog = null;
  let lastAppliedState = null;

  function clone(value) {
    return JSON.parse(JSON.stringify(value));
  }

  function readPersonalTemplates() {
    try {
      const parsed = JSON.parse(global.localStorage?.getItem(PERSONAL_STORAGE_KEY) || '[]');
      if (!Array.isArray(parsed)) return [];
      return parsed.filter((template) => template && template.id && template.design);
    } catch (_error) {
      return [];
    }
  }

  function writePersonalTemplates(templates) {
    try {
      global.localStorage?.setItem(PERSONAL_STORAGE_KEY, JSON.stringify(templates.slice(0, MAX_PERSONAL_TEMPLATES)));
      return true;
    } catch (_error) {
      announce(copy.saveFailed);
      return false;
    }
  }

  function announce(message) {
    if (global.UIManager?.announce) global.UIManager.announce(message);
    else {
      const live = document.getElementById('live-announcer');
      if (live) live.textContent = message;
    }
  }

  function element(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined && text !== null) node.textContent = text;
    return node;
  }

  function button(label, className) {
    const node = element('button', className, label);
    node.type = 'button';
    return node;
  }

  function icon(name) {
    const node = element('i', `fas ${name}`);
    node.setAttribute('aria-hidden', 'true');
    return node;
  }

  function categoryLabel(category) {
    return copy.categories[category] || category;
  }

  function getCatalog() {
    return [...builtInTemplates, ...readPersonalTemplates().map((template) => ({ ...template, personal: true }))];
  }

  function getTemplate(id) {
    return getCatalog().find((template) => template.id === id) || null;
  }

  function getCurrentState() {
    if (typeof global.StateManager === 'undefined' || typeof global.StateManager.getStateObject !== 'function') return null;
    return clone(global.StateManager.getStateObject());
  }

  function captureDesignState(sourceState) {
    const source = sourceState ? clone(sourceState) : getCurrentState();
    if (!source) return null;
    const capturedInputs = {};
    Object.entries(source.inputs || {}).forEach(([key, value]) => {
      if (designInputKeys.has(key)) capturedInputs[key] = value;
    });
    return {
      inputs: capturedInputs,
      placements: clone(source.placements || {}),
      visibilities: clone(source.visibilities || {})
    };
  }

  function derivePreview(design) {
    const inputs = design?.inputs || {};
    return {
      colors: [
        inputs['front-bg-start'] || '#16243a',
        inputs['front-bg-end'] || '#274d73',
        inputs['name-color'] || '#ffffff',
        inputs['tagline-color'] || '#54a7ff'
      ],
      font: inputs['name-font'] || 'Cairo, sans-serif',
      layout: inputs['layout-select-visual'] || 'modern'
    };
  }

  function createPersonalTemplate(name) {
    const design = captureDesignState();
    if (!design) {
      announce(copy.unavailable);
      return null;
    }
    const trimmedName = String(name || '').trim().slice(0, 60);
    if (!trimmedName) return null;
    const templates = readPersonalTemplates();
    const template = {
      id: `personal-${Date.now()}`,
      category: 'personal',
      icon: 'fa-bookmark',
      name: trimmedName,
      description: isEnglish ? 'Saved visual settings from your editor.' : 'إعدادات بصرية محفوظة من المحرر.',
      preview: derivePreview(design),
      design,
      personal: true,
      createdAt: Date.now()
    };
    templates.unshift(template);
    if (!writePersonalTemplates(templates)) return null;
    render();
    announce(copy.saved);
    document.dispatchEvent(new global.CustomEvent('editor:personaltemplatesaved', { detail: { id: template.id } }));
    return template;
  }

  function deletePersonalTemplate(id) {
    const templates = readPersonalTemplates();
    if (!templates.some((template) => template.id === id)) return false;
    if (typeof global.confirm === 'function' && !global.confirm(copy.confirmDelete)) return false;
    const saved = writePersonalTemplates(templates.filter((template) => template.id !== id));
    if (saved) {
      render();
      closePreview();
      announce(copy.deleted);
    }
    return saved;
  }

  function mergeTemplate(current, template) {
    const next = clone(current);
    next.inputs = { ...(current.inputs || {}), ...(template.design?.inputs || {}) };
    if (template.design?.placements) {
      next.placements = { ...(current.placements || {}), ...template.design.placements };
    }
    if (template.design?.visibilities && Object.keys(template.design.visibilities).length) {
      next.visibilities = { ...(current.visibilities || {}), ...template.design.visibilities };
    }
    return next;
  }

  function applyTemplate(templateOrId) {
    const template = typeof templateOrId === 'string' ? getTemplate(templateOrId) : templateOrId;
    const current = getCurrentState();
    if (!template || !current || typeof global.StateManager.applyState !== 'function') {
      announce(copy.unavailable);
      return false;
    }
    const next = mergeTemplate(current, template);
    lastAppliedState = current;
    if (global.HistoryManager?.pushState) global.HistoryManager.pushState(current);
    global.StateManager.applyState(next, true);
    if (global.HistoryManager?.pushState) global.HistoryManager.pushState(next);
    global.StateManager.saveDebounced?.();
    document.dispatchEvent(new global.CustomEvent('editor:templateapplied', {
      detail: { id: template.id, category: template.category, personal: Boolean(template.personal) }
    }));
    closePreview();
    showUndoToast();
    announce(copy.applied);
    return true;
  }

  function undoLastTemplate() {
    if (global.HistoryManager?.undo) {
      global.HistoryManager.undo();
    } else if (lastAppliedState && global.StateManager?.applyState) {
      global.StateManager.applyState(clone(lastAppliedState), true);
      global.StateManager.saveDebounced?.();
    } else return false;
    lastAppliedState = null;
    document.getElementById('editor-template-toast')?.remove();
    announce(copy.undoDone);
    return true;
  }

  function showUndoToast() {
    document.getElementById('editor-template-toast')?.remove();
    const toast = element('div', 'editor-template-toast');
    toast.id = 'editor-template-toast';
    toast.setAttribute('role', 'status');
    const text = element('span', '', copy.applied);
    const undo = button(copy.undo, 'editor-template-toast-undo');
    undo.addEventListener('click', undoLastTemplate);
    toast.append(text, undo);
    document.body.append(toast);
    global.setTimeout(() => toast.remove(), 6500);
  }

  function previewCard(template, face, large = false) {
    const preview = template.preview || derivePreview(template.design);
    const colors = preview.colors || ['#16243a', '#274d73', '#ffffff', '#54a7ff'];
    const card = element('div', `editor-template-card-preview editor-template-card-preview-${face}${large ? ' is-large' : ''}`);
    card.dataset.layout = preview.layout || 'modern';
    card.style.setProperty('--template-bg-start', face === 'front' ? colors[0] : (colors[2] || '#f8fafc'));
    card.style.setProperty('--template-bg-end', face === 'front' ? colors[1] : (colors[0] || '#16243a'));
    card.style.setProperty('--template-text', face === 'front' ? (colors[2] || '#ffffff') : (colors[2] || '#ffffff'));
    card.style.setProperty('--template-accent', colors[3] || '#54a7ff');
    card.style.fontFamily = preview.font || 'Cairo, sans-serif';

    const mark = element('span', 'editor-template-preview-mark');
    mark.append(icon(template.icon || 'fa-id-card'));
    const sample = element('div', 'editor-template-preview-copy');
    sample.append(
      element('strong', '', copy.sampleName),
      element('small', '', copy.sampleRole)
    );
    const detail = element('div', 'editor-template-preview-detail');
    detail.append(element('i'), element('i'), element('i'));
    card.append(mark, sample, detail);
    return card;
  }

  function renderTemplateCard(template) {
    const article = element('article', 'editor-template-card');
    article.dataset.templateId = template.id;
    article.dataset.templateCategory = template.category;
    if (template.personal) article.dataset.personalTemplate = 'true';

    const previewWrap = element('button', 'editor-template-preview-trigger');
    previewWrap.type = 'button';
    previewWrap.setAttribute('aria-label', `${copy.preview}: ${template.name}`);
    previewWrap.append(previewCard(template, 'front'));
    previewWrap.addEventListener('click', () => openPreview(template.id));

    const meta = element('div', 'editor-template-card-meta');
    const heading = element('div', 'editor-template-card-heading');
    const title = element('h4', '', template.name);
    const badge = element('span', template.personal ? 'editor-template-badge is-personal' : 'editor-template-badge',
      template.personal ? copy.personalBadge : categoryLabel(template.category));
    heading.append(title, badge);
    meta.append(heading, element('p', '', template.description));

    const actions = element('div', 'editor-template-card-actions');
    const preview = button(copy.preview, 'editor-template-secondary');
    preview.addEventListener('click', () => openPreview(template.id));
    const apply = button(copy.apply, 'editor-template-primary');
    apply.addEventListener('click', () => applyTemplate(template));
    actions.append(preview, apply);
    if (template.personal) {
      const remove = button('', 'editor-template-delete');
      remove.append(icon('fa-trash'));
      remove.setAttribute('aria-label', `${copy.delete}: ${template.name}`);
      remove.addEventListener('click', () => deletePersonalTemplate(template.id));
      actions.append(remove);
    }
    article.append(previewWrap, meta, actions);
    return article;
  }

  function getVisibleTemplates() {
    const catalog = getCatalog();
    if (activeCategory === 'all') return catalog;
    if (activeCategory === 'personal') return catalog.filter((template) => template.personal);
    return catalog.filter((template) => template.category === activeCategory);
  }

  function renderFilters() {
    if (!filterHost) return;
    filterHost.replaceChildren();
    const categories = ['all', ...Array.from(new Set(builtInTemplates.map((template) => template.category))), 'personal'];
    categories.forEach((category) => {
      const label = category === 'all' ? copy.all : category === 'personal' ? copy.personal : categoryLabel(category);
      const filter = button(label, 'editor-template-filter');
      filter.dataset.templateFilter = category;
      filter.setAttribute('aria-pressed', activeCategory === category ? 'true' : 'false');
      filter.addEventListener('click', () => {
        activeCategory = category;
        render();
      });
      filterHost.append(filter);
    });
  }

  function render() {
    if (!grid || !filterHost) return;
    renderFilters();
    grid.replaceChildren();
    const visible = getVisibleTemplates();
    if (!visible.length) {
      grid.append(element('p', 'editor-template-empty', copy.emptyPersonal));
      return;
    }
    visible.forEach((template) => grid.append(renderTemplateCard(template)));
  }

  function createPanel() {
    const host = document.querySelector('.editor-library-shortcuts');
    if (!host) return false;
    document.getElementById('editor-template-manager-panel')?.remove();
    panel = element('section', 'editor-template-manager-panel');
    panel.id = 'editor-template-manager-panel';
    panel.dataset.templateManagerPanel = 'true';

    const header = element('div', 'editor-template-manager-header');
    const text = element('div');
    text.append(element('h3', '', copy.title), element('p', '', copy.hint));
    const save = button(copy.saveCurrent, 'editor-template-save-current');
    save.prepend(icon('fa-bookmark'));
    save.addEventListener('click', openSaveDialog);
    header.append(text, save);

    filterHost = element('div', 'editor-template-filters');
    filterHost.setAttribute('role', 'toolbar');
    filterHost.setAttribute('aria-label', copy.category);
    grid = element('div', 'editor-template-grid');
    panel.append(header, filterHost, grid);

    const intro = host.querySelector('.editor-library-intro');
    if (intro) intro.insertAdjacentElement('afterend', panel);
    else host.prepend(panel);
    render();
    return true;
  }

  function mountForCurrentView() {
    const view = global.EditorWorkspace?.getState?.().libraryView || 'templates';
    if (view !== 'templates') {
      document.getElementById('editor-template-manager-panel')?.remove();
      panel = null;
      grid = null;
      filterHost = null;
      return;
    }
    if (!document.getElementById('editor-template-manager-panel')) createPanel();
  }

  function modalFeature(label, value) {
    const row = element('div', 'editor-template-modal-feature');
    row.append(element('span', '', label), element('strong', '', value));
    return row;
  }

  function ensurePreviewModal() {
    if (modal) return modal;
    modal = element('div', 'editor-template-modal');
    modal.id = 'editor-template-modal';
    modal.hidden = true;
    modal.setAttribute('role', 'dialog');
    modal.setAttribute('aria-modal', 'true');
    modal.setAttribute('aria-labelledby', 'editor-template-modal-title');
    modal.innerHTML = `
      <div class="editor-template-modal-backdrop" data-template-close></div>
      <div class="editor-template-modal-dialog">
        <button type="button" class="editor-template-modal-close" data-template-close aria-label="${copy.close}">×</button>
        <div class="editor-template-modal-copy">
          <span class="editor-template-modal-badge"></span>
          <h2 id="editor-template-modal-title"></h2>
          <p class="editor-template-modal-description"></p>
          <div class="editor-template-modal-features"></div>
        </div>
        <div class="editor-template-modal-previews"></div>
        <div class="editor-template-modal-actions">
          <button type="button" class="editor-template-secondary" data-template-close>${copy.cancel}</button>
          <button type="button" class="editor-template-primary" data-template-apply>${copy.apply}</button>
        </div>
      </div>`;
    modal.addEventListener('click', (event) => {
      if (event.target.closest('[data-template-close]')) closePreview();
      if (event.target.closest('[data-template-apply]') && previewTemplate) applyTemplate(previewTemplate);
    });
    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape' && !modal.hidden) closePreview();
    });
    document.body.append(modal);
    return modal;
  }

  function openPreview(id) {
    const template = getTemplate(id);
    if (!template) return false;
    previewTemplate = template;
    const root = ensurePreviewModal();
    root.querySelector('.editor-template-modal-badge').textContent = template.personal ? copy.personalBadge : categoryLabel(template.category);
    root.querySelector('#editor-template-modal-title').textContent = template.name;
    root.querySelector('.editor-template-modal-description').textContent = template.description;
    const features = root.querySelector('.editor-template-modal-features');
    features.replaceChildren(
      modalFeature(copy.layout, template.preview?.layout || template.design?.inputs?.['layout-select-visual'] || 'modern'),
      modalFeature(copy.typography, String(template.preview?.font || template.design?.inputs?.['name-font'] || 'Cairo').split(',')[0]),
      modalFeature(copy.category, template.personal ? copy.personalBadge : categoryLabel(template.category))
    );
    const previews = root.querySelector('.editor-template-modal-previews');
    previews.replaceChildren();
    const front = element('div', 'editor-template-modal-face');
    front.append(element('span', '', copy.front), previewCard(template, 'front', true));
    const back = element('div', 'editor-template-modal-face');
    back.append(element('span', '', copy.back), previewCard(template, 'back', true));
    previews.append(front, back);
    root.hidden = false;
    document.body.classList.add('editor-template-modal-open');
    root.querySelector('[data-template-apply]').focus();
    return true;
  }

  function closePreview() {
    if (!modal) return;
    modal.hidden = true;
    previewTemplate = null;
    document.body.classList.remove('editor-template-modal-open');
  }

  function ensureSaveDialog() {
    if (saveDialog) return saveDialog;
    saveDialog = element('div', 'editor-template-save-dialog');
    saveDialog.id = 'editor-template-save-dialog';
    saveDialog.hidden = true;
    saveDialog.setAttribute('role', 'dialog');
    saveDialog.setAttribute('aria-modal', 'true');
    saveDialog.innerHTML = `
      <div class="editor-template-modal-backdrop" data-save-close></div>
      <form class="editor-template-save-form">
        <button type="button" class="editor-template-modal-close" data-save-close aria-label="${copy.close}">×</button>
        <h2>${copy.saveTitle}</h2>
        <label for="editor-personal-template-name">${copy.templateName}</label>
        <input id="editor-personal-template-name" type="text" maxlength="60" required autocomplete="off">
        <p>${copy.hint}</p>
        <div class="editor-template-modal-actions">
          <button type="button" class="editor-template-secondary" data-save-close>${copy.cancel}</button>
          <button type="submit" class="editor-template-primary">${copy.save}</button>
        </div>
      </form>`;
    saveDialog.addEventListener('click', (event) => {
      if (event.target.closest('[data-save-close]')) closeSaveDialog();
    });
    saveDialog.querySelector('form').addEventListener('submit', (event) => {
      event.preventDefault();
      const input = saveDialog.querySelector('#editor-personal-template-name');
      const saved = createPersonalTemplate(input.value);
      if (saved) {
        input.value = '';
        closeSaveDialog();
        activeCategory = 'personal';
        render();
      }
    });
    document.body.append(saveDialog);
    return saveDialog;
  }

  function openSaveDialog() {
    const root = ensureSaveDialog();
    root.hidden = false;
    document.body.classList.add('editor-template-modal-open');
    root.querySelector('input').focus();
  }

  function closeSaveDialog() {
    if (!saveDialog) return;
    saveDialog.hidden = true;
    document.body.classList.remove('editor-template-modal-open');
  }

  function initialize() {
    if (initialized) return;
    initialized = true;
    global.setTimeout(mountForCurrentView, 0);
    document.addEventListener('editor:librarychange', (event) => {
      global.setTimeout(() => {
        if (event.detail?.view === 'templates') createPanel();
        else mountForCurrentView();
      }, 0);
    });
    document.documentElement.dataset.editorTemplateManager = 'ready';
    document.dispatchEvent(new global.CustomEvent('editor:templatemanagerready', { detail: { version: VERSION } }));
  }

  global.EditorTemplateManager = {
    version: VERSION,
    init: initialize,
    getCatalog: () => clone(getCatalog()),
    getTemplate: (id) => clone(getTemplate(id)),
    openPreview,
    closePreview,
    applyTemplate,
    undoLastTemplate,
    captureDesignState,
    createPersonalTemplate,
    deletePersonalTemplate,
    mount: mountForCurrentView
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initialize, { once: true });
  else initialize();
}(typeof window !== 'undefined' ? window : globalThis));
