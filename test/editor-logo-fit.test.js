/** @jest-environment jsdom */

describe('editor logo fit guard', () => {
  beforeEach(() => {
    jest.resetModules();
    jest.useFakeTimers();
    delete window.EditorLogoFit;
    document.body.innerHTML = `
      <div class="card-content-layer" id="card-content">
        <div id="card-logo" data-x="0" data-y="100"><img id="card-logo-img" alt=""></div>
      </div>
      <input id="logo-size" type="range">
    `;
    window.requestAnimationFrame = (callback) => { callback(); return 1; };
    window.cancelAnimationFrame = jest.fn();
    const content = document.getElementById('card-content');
    const logo = document.getElementById('card-logo');
    content.getBoundingClientRect = () => ({ left: 0, top: 0, right: 510, bottom: 330, width: 510, height: 330 });
    logo.getBoundingClientRect = () => ({ left: 51, top: 250, right: 459, bottom: 440, width: 408, height: 190 });
  });

  afterEach(() => {
    jest.useRealTimers();
    delete window.EditorLogoFit;
  });

  test('moves a historical oversized logo back inside the printable card area', () => {
    require('../editor-logo-fit');
    document.dispatchEvent(new Event('DOMContentLoaded'));
    const fitted = window.EditorLogoFit.clamp();
    const logo = document.getElementById('card-logo');

    expect(fitted).toBe(true);
    expect(logo.dataset.y).toBe('-30');
    expect(logo.style.transform).toBe('translate(0px, -30px)');
  });

  test('leaves a logo that is already inside the card untouched', () => {
    const logo = document.getElementById('card-logo');
    logo.dataset.y = '0';
    logo.getBoundingClientRect = () => ({ left: 150, top: 60, right: 350, bottom: 200, width: 200, height: 140 });
    require('../editor-logo-fit');
    document.dispatchEvent(new Event('DOMContentLoaded'));

    expect(window.EditorLogoFit.clamp()).toBe(false);
    expect(logo.style.transform).toBe('');
  });
});
