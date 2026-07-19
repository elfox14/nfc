(function installEditorLogoFit(global) {
  'use strict';

  const document = global.document;
  if (!document || global.EditorLogoFit) return;

  let frame = null;
  let applying = false;

  function syncLogoSizeToControl() {
    const logo = document.getElementById('card-logo');
    const sizeControl = document.getElementById('logo-size');
    if (!logo || !sizeControl) return false;

    const size = Number.parseFloat(sizeControl.value);
    if (!Number.isFinite(size)) return false;
    const nextWidth = `${Math.min(80, Math.max(10, size))}%`;
    if (logo.style.width === nextWidth) return false;
    applying = true;
    logo.style.width = nextWidth;
    applying = false;
    return true;
  }

  function clampLogoToCard() {
    const logo = document.getElementById('card-logo');
    const content = logo?.parentElement;
    if (!logo || !content?.classList.contains('card-content-layer')) return false;

    const logoRect = logo.getBoundingClientRect();
    const contentRect = content.getBoundingClientRect();
    if (!logoRect.width || !logoRect.height || !contentRect.width || !contentRect.height) return false;

    const inset = 8;
    const brandingSpace = 20;
    const bounds = {
      left: contentRect.left + inset,
      right: contentRect.right - inset,
      top: contentRect.top + inset,
      bottom: contentRect.bottom - brandingSpace
    };
    let deltaX = 0;
    let deltaY = 0;
    if (logoRect.left < bounds.left) deltaX += bounds.left - logoRect.left;
    if (logoRect.right > bounds.right) deltaX -= logoRect.right - bounds.right;
    if (logoRect.top < bounds.top) deltaY += bounds.top - logoRect.top;
    if (logoRect.bottom > bounds.bottom) deltaY -= logoRect.bottom - bounds.bottom;
    if (!deltaX && !deltaY) return false;

    const currentX = Number.parseFloat(logo.dataset.x) || 0;
    const currentY = Number.parseFloat(logo.dataset.y) || 0;
    const nextX = Math.round((currentX + deltaX) * 100) / 100;
    const nextY = Math.round((currentY + deltaY) * 100) / 100;
    applying = true;
    logo.dataset.x = String(nextX);
    logo.dataset.y = String(nextY);
    logo.style.transform = `translate(${nextX}px, ${nextY}px)`;
    applying = false;
    document.dispatchEvent(new global.CustomEvent('editor:logofitted', { detail: { x: nextX, y: nextY } }));
    return true;
  }

  function schedule() {
    const cancelFrame = global.cancelAnimationFrame || global.clearTimeout;
    const requestFrame = global.requestAnimationFrame || ((callback) => global.setTimeout(callback, 16));
    if (frame !== null) cancelFrame(frame);
    frame = requestFrame(() => {
      frame = null;
      syncLogoSizeToControl();
      clampLogoToCard();
    });
  }

  function init() {
    const logo = document.getElementById('card-logo');
    const image = document.getElementById('card-logo-img');
    if (!logo || !image) return;

    syncLogoSizeToControl();
    image.addEventListener('load', schedule);
    document.getElementById('logo-size')?.addEventListener('input', schedule);
    document.getElementById('visibility-logo')?.addEventListener('input', () => {
      // The core renderer detaches hidden elements and appends them again when shown.
      // Run after that render so the restored logo uses the configured size.
      global.setTimeout(schedule, 0);
    });
    document.querySelectorAll('input[name="placement-logo"], input[name="logo-align"], .lp-dpad[data-target-id="card-logo"] .move-btn')
      .forEach((control) => control.addEventListener('click', () => global.setTimeout(schedule, 0)));
    ['editor:templateapplied', 'editor:brandkitapplied', 'editor:cloudsavesuccess', 'editor:logofitrequest']
      .forEach((eventName) => document.addEventListener(eventName, schedule));
    document.addEventListener('pointerup', (event) => {
      if (event.target.closest?.('#card-logo, [data-target-id="card-logo"]')) schedule();
    });

    const observer = new MutationObserver(() => { if (!applying) schedule(); });
    observer.observe(logo, { attributes: true, attributeFilter: ['style', 'data-x', 'data-y'] });
    observer.observe(image, { attributes: true, attributeFilter: ['src', 'style'] });
    global.addEventListener?.('load', schedule, { once: true });
    [0, 100, 500, 1500, 3000].forEach((delay) => global.setTimeout(schedule, delay));
  }

  global.EditorLogoFit = { clamp: clampLogoToCard, schedule, syncSize: syncLogoSizeToControl };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true });
  else init();
})(window);
