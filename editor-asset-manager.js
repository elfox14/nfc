(function initializeEditorAssetManager(global) {
  'use strict';

  const document = global.document;
  if (!document || global.EditorAssetManager) return;

  const VERSION = '8.1.0';
  const MAX_FILE_BYTES = 12 * 1024 * 1024;
  const OPTIMIZE_THRESHOLD_BYTES = 1400 * 1024;
  const supportedTypes = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif']);
  const isEnglish = document.documentElement.lang.toLowerCase().startsWith('en');
  const copy = isEnglish ? {
    processing: 'Optimizing image…',
    ready: 'Image optimized and ready to crop.',
    original: 'Image is ready to crop.',
    lowResolution: 'Low-resolution image. A sharper image is recommended.',
    invalidType: 'Choose a JPG, PNG, WebP, or GIF image.',
    tooLarge: 'The image is larger than 12 MB.',
    decodeFailed: 'The image could not be read. Try another file.',
    processingFailed: 'Image processing failed. Try another file.',
    dropSingle: 'Drop one image at a time.',
    dropHere: 'Drop the image here',
    browserFallback: 'This browser will upload the original image without optimization.',
    rotateLeft: 'Rotate left',
    rotateRight: 'Rotate right',
    zoomIn: 'Zoom in',
    zoomOut: 'Zoom out',
    reset: 'Reset crop',
    cropNotReady: 'Wait until the crop preview is ready.'
  } : {
    processing: 'جاري تحسين الصورة…',
    ready: 'تم تحسين الصورة وأصبحت جاهزة للقص.',
    original: 'الصورة جاهزة للقص.',
    lowResolution: 'دقة الصورة منخفضة؛ يُفضّل استخدام صورة أوضح.',
    invalidType: 'اختر صورة بصيغة JPG أو PNG أو WebP أو GIF.',
    tooLarge: 'حجم الصورة أكبر من 12 ميجابايت.',
    decodeFailed: 'تعذر قراءة الصورة. جرّب ملفًا آخر.',
    processingFailed: 'فشلت معالجة الصورة. جرّب ملفًا آخر.',
    dropSingle: 'أفلت صورة واحدة فقط في كل مرة.',
    dropHere: 'أفلت الصورة هنا',
    browserFallback: 'سيتم رفع الصورة الأصلية دون ضغط في هذا المتصفح.',
    rotateLeft: 'تدوير لليسار',
    rotateRight: 'تدوير لليمين',
    zoomIn: 'تكبير',
    zoomOut: 'تصغير',
    reset: 'إعادة ضبط القص',
    cropNotReady: 'انتظر حتى تصبح معاينة القص جاهزة.'
  };

  const specs = [
    {
      inputId: 'input-logo-upload',
      zoneId: 'logo-drop-zone',
      kind: 'logo',
      maxDimension: 2200,
      minWidth: 320,
      minHeight: 180,
      preservePng: true
    },
    {
      inputId: 'input-photo-upload',
      zoneId: 'photo-controls-fieldset',
      kind: 'photo',
      maxDimension: 1800,
      minWidth: 480,
      minHeight: 480,
      preservePng: false
    },
    {
      inputId: 'front-bg-upload',
      kind: 'front-background',
      maxDimension: 2560,
      minWidth: 900,
      minHeight: 550,
      preservePng: false
    },
    {
      inputId: 'back-bg-upload',
      kind: 'back-background',
      maxDimension: 2560,
      minWidth: 900,
      minHeight: 550,
      preservePng: false
    }
  ];

  const specsByInput = new Map(specs.map((spec) => [spec.inputId, spec]));
  let initialized = false;

  function formatBytes(bytes) {
    if (!Number.isFinite(bytes) || bytes <= 0) return '0 KB';
    if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  function getZone(spec, input) {
    if (spec.zoneId) return document.getElementById(spec.zoneId);
    return input.closest('.lp-upload-zone-mini, .lp-upload-zone, .fieldset-content, .lp-section');
  }

  function getStatusNode(spec, input) {
    const zone = getZone(spec, input);
    if (!zone) return null;
    let status = zone.querySelector(`[data-asset-status="${spec.inputId}"]`);
    if (!status) {
      status = document.createElement('div');
      status.className = 'asset-upload-status';
      status.dataset.assetStatus = spec.inputId;
      status.id = `${spec.inputId}-asset-status`;
      status.setAttribute('role', 'status');
      status.setAttribute('aria-live', 'polite');
      zone.appendChild(status);
      input.setAttribute('aria-describedby', status.id);
    }
    return status;
  }

  function setState(spec, input, state, message) {
    const zone = getZone(spec, input);
    const status = getStatusNode(spec, input);
    if (zone) zone.dataset.assetState = state;
    input.dataset.assetState = state;
    if (status) {
      status.dataset.state = state;
      status.textContent = message || '';
      status.hidden = !message;
    }
  }

  function announce(message) {
    if (global.UIManager?.announce) global.UIManager.announce(message);
  }

  function canRewriteFileList() {
    if (typeof global.DataTransfer !== 'function') return false;
    try {
      const transfer = new global.DataTransfer();
      return Boolean(transfer.items && typeof transfer.items.add === 'function');
    } catch (_error) {
      return false;
    }
  }

  function assignFile(input, file) {
    const transfer = new global.DataTransfer();
    transfer.items.add(file);
    input.files = transfer.files;
  }

  function validateFile(file) {
    if (!file || !supportedTypes.has(String(file.type || '').toLowerCase())) {
      throw new Error(copy.invalidType);
    }
    if (file.size > MAX_FILE_BYTES) throw new Error(copy.tooLarge);
  }

  function loadWithImageElement(file) {
    return new Promise((resolve, reject) => {
      const objectUrl = global.URL.createObjectURL(file);
      const image = new global.Image();
      image.onload = () => resolve({
        source: image,
        width: image.naturalWidth || image.width,
        height: image.naturalHeight || image.height,
        cleanup: () => global.URL.revokeObjectURL(objectUrl)
      });
      image.onerror = () => {
        global.URL.revokeObjectURL(objectUrl);
        reject(new Error(copy.decodeFailed));
      };
      image.src = objectUrl;
    });
  }

  async function decodeImage(file) {
    if (typeof global.createImageBitmap === 'function') {
      try {
        const bitmap = await global.createImageBitmap(file);
        return {
          source: bitmap,
          width: bitmap.width,
          height: bitmap.height,
          cleanup: () => bitmap.close?.()
        };
      } catch (_error) {
        return loadWithImageElement(file);
      }
    }
    return loadWithImageElement(file);
  }

  function canvasToBlob(canvas, type, quality) {
    return new Promise((resolve, reject) => {
      canvas.toBlob((blob) => {
        if (blob) resolve(blob);
        else reject(new Error(copy.processingFailed));
      }, type, quality);
    });
  }

  function optimizedName(name, type) {
    const stem = String(name || 'image').replace(/\.[^.]+$/, '');
    const extension = type === 'image/png' ? 'png' : 'jpg';
    return `${stem}-optimized.${extension}`;
  }

  async function processFile(file, spec) {
    validateFile(file);
    const decoded = await decodeImage(file);
    const width = Number(decoded.width) || 0;
    const height = Number(decoded.height) || 0;
    const lowResolution = width < spec.minWidth || height < spec.minHeight;
    const largestDimension = Math.max(width, height);
    const scale = largestDimension > spec.maxDimension ? spec.maxDimension / largestDimension : 1;
    const shouldOptimize = file.type !== 'image/gif' && (scale < 1 || file.size > OPTIMIZE_THRESHOLD_BYTES);

    if (!shouldOptimize) {
      decoded.cleanup();
      return { file, width, height, lowResolution, optimized: false, originalBytes: file.size };
    }

    try {
      const canvas = document.createElement('canvas');
      canvas.width = Math.max(1, Math.round(width * scale));
      canvas.height = Math.max(1, Math.round(height * scale));
      const context = canvas.getContext('2d', { alpha: true });
      if (!context) throw new Error(copy.processingFailed);

      const outputType = spec.preservePng && file.type === 'image/png' ? 'image/png' : 'image/jpeg';
      if (outputType === 'image/jpeg') {
        context.fillStyle = '#ffffff';
        context.fillRect(0, 0, canvas.width, canvas.height);
      }
      context.imageSmoothingEnabled = true;
      context.imageSmoothingQuality = 'high';
      context.drawImage(decoded.source, 0, 0, canvas.width, canvas.height);

      const blob = await canvasToBlob(canvas, outputType, outputType === 'image/png' ? undefined : 0.88);
      const processedFile = blob.size < file.size
        ? new global.File([blob], optimizedName(file.name, outputType), {
          type: outputType,
          lastModified: Date.now()
        })
        : file;

      return {
        file: processedFile,
        width: canvas.width,
        height: canvas.height,
        lowResolution,
        optimized: processedFile !== file,
        originalBytes: file.size
      };
    } finally {
      decoded.cleanup();
    }
  }

  async function handleFile(spec, input, file) {
    setState(spec, input, 'processing', copy.processing);
    try {
      const result = await processFile(file, spec);
      assignFile(input, result.file);
      input.dataset.editorAssetBypass = 'true';
      input.dispatchEvent(new global.Event('change', { bubbles: true }));

      const sizeMessage = result.optimized
        ? `${copy.ready} ${formatBytes(result.originalBytes)} → ${formatBytes(result.file.size)}`
        : copy.original;
      const message = result.lowResolution ? `${copy.lowResolution} ${sizeMessage}` : sizeMessage;
      setState(spec, input, result.lowResolution ? 'warning' : 'ready', message);
      document.dispatchEvent(new global.CustomEvent('editor:assetprocessed', {
        detail: {
          inputId: spec.inputId,
          kind: spec.kind,
          width: result.width,
          height: result.height,
          optimized: result.optimized,
          originalBytes: result.originalBytes,
          processedBytes: result.file.size,
          lowResolution: result.lowResolution
        }
      }));
    } catch (error) {
      input.value = '';
      const message = error?.message || copy.processingFailed;
      setState(spec, input, 'error', message);
      announce(message);
    }
  }

  function onDocumentChange(event) {
    const input = event.target;
    const spec = input && specsByInput.get(input.id);
    if (!spec) return;

    if (input.dataset.editorAssetBypass === 'true') {
      delete input.dataset.editorAssetBypass;
      return;
    }

    const file = input.files?.[0];
    if (!file) return;
    if (!canRewriteFileList()) {
      setState(spec, input, 'warning', copy.browserFallback);
      return;
    }

    event.preventDefault();
    event.stopImmediatePropagation();
    void handleFile(spec, input, file);
  }

  function bindDropZone(spec, input) {
    const zone = getZone(spec, input);
    if (!zone || zone.dataset.assetDropReady === 'true') return;
    zone.dataset.assetDropReady = 'true';
    zone.classList.add('asset-drop-zone');

    const activate = (event) => {
      event.preventDefault();
      zone.classList.add('asset-is-dragging');
      zone.dataset.assetDropLabel = copy.dropHere;
    };
    const deactivate = (event) => {
      event.preventDefault();
      if (event.type === 'dragleave' && zone.contains(event.relatedTarget)) return;
      zone.classList.remove('asset-is-dragging');
    };

    zone.addEventListener('dragenter', activate);
    zone.addEventListener('dragover', activate);
    zone.addEventListener('dragleave', deactivate);
    zone.addEventListener('drop', (event) => {
      deactivate(event);
      const files = Array.from(event.dataTransfer?.files || []).filter((file) => file.type.startsWith('image/'));
      if (files.length !== 1) {
        setState(spec, input, 'error', copy.dropSingle);
        return;
      }
      if (!canRewriteFileList()) {
        setState(spec, input, 'warning', copy.browserFallback);
        return;
      }
      void handleFile(spec, input, files[0]);
    });
  }

  function cropButton(label, iconClass, action) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'asset-crop-action';
    button.dataset.cropAction = action;
    button.setAttribute('aria-label', label);
    button.title = label;
    const icon = document.createElement('i');
    icon.className = iconClass;
    icon.setAttribute('aria-hidden', 'true');
    const text = document.createElement('span');
    text.textContent = label;
    button.append(icon, text);
    return button;
  }

  function setupCropControls() {
    const modal = document.getElementById('crop-modal-overlay');
    const container = document.getElementById('crop-image-container');
    const footer = modal?.querySelector('.modal-footer');
    if (!modal || !container || !footer || modal.querySelector('[data-asset-crop-toolbar]')) return;

    const toolbar = document.createElement('div');
    toolbar.className = 'asset-crop-toolbar';
    toolbar.dataset.assetCropToolbar = 'true';
    const actions = [
      [copy.rotateLeft, 'fas fa-rotate-left', 'rotate-left'],
      [copy.rotateRight, 'fas fa-rotate-right', 'rotate-right'],
      [copy.zoomOut, 'fas fa-magnifying-glass-minus', 'zoom-out'],
      [copy.zoomIn, 'fas fa-magnifying-glass-plus', 'zoom-in'],
      [copy.reset, 'fas fa-arrow-rotate-left', 'reset']
    ];
    actions.forEach(([label, icon, action]) => toolbar.append(cropButton(label, icon, action)));

    toolbar.addEventListener('click', (event) => {
      const trigger = event.target.closest('[data-crop-action]');
      if (!trigger) return;
      const image = container.querySelector('img');
      const cropper = image?.cropper;
      if (!cropper) {
        announce(copy.cropNotReady);
        return;
      }
      const action = trigger.dataset.cropAction;
      if (action === 'rotate-left') cropper.rotate(-90);
      if (action === 'rotate-right') cropper.rotate(90);
      if (action === 'zoom-out') cropper.zoom(-0.1);
      if (action === 'zoom-in') cropper.zoom(0.1);
      if (action === 'reset') cropper.reset();
    });

    footer.before(toolbar);
  }

  function initialize() {
    if (initialized) return;
    initialized = true;
    specs.forEach((spec) => {
      const input = document.getElementById(spec.inputId);
      if (!input) return;
      input.dataset.assetManager = VERSION;
      getStatusNode(spec, input);
      bindDropZone(spec, input);
    });
    setupCropControls();
    document.documentElement.dataset.editorAssetManager = 'ready';
    document.dispatchEvent(new global.CustomEvent('editor:assetmanagerready', { detail: { version: VERSION } }));
  }

  document.addEventListener('change', onDocumentChange, true);
  global.EditorAssetManager = {
    version: VERSION,
    init: initialize,
    processFile,
    getSpecs: () => specs.map((spec) => ({ ...spec }))
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initialize, { once: true });
  else initialize();
}(typeof window !== 'undefined' ? window : globalThis));
