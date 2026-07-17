/**
 * @jest-environment jsdom
 */

test('design validation finds blocking issues, reports a score and routes fixes to the inspector', () => {
    document.documentElement.lang = 'en';
    document.documentElement.removeAttribute('data-editor-validation');
    document.body.innerHTML = `
        <div class="editor-canvas-tools"></div>
        <div class="editor-inspector-heading"></div>
        <input id="input-name_en" value="Your full name here">
        <input id="input-tagline_en" value="Designer">
        <textarea id="input-bio_en"></textarea>
        <select id="input-availability"><option value="" selected>None</option></select>
        <input type="checkbox" id="visibility-name" checked>
        <input type="checkbox" id="visibility-qr">
        <input type="checkbox" id="visibility-bio">
        <div id="phone-numbers-container"><input type="tel" value=""></div>
        <input id="input-email" value="">
        <input id="front-bg-start" value="#000000">
        <input id="front-bg-end" value="#111111">
        <input id="name-color" value="#ffffff">
        <input id="tagline-color" value="#ffffff">
        <div class="business-card"><h1 id="card-name" data-editor-selectable="name"></h1></div>
    `;

    window.EditorWorkspace = {
        select: jest.fn(),
        setFace: jest.fn()
    };
    delete window.EditorValidation;
    jest.resetModules();
    jest.isolateModules(() => require('../editor-validation'));
    if (document.documentElement.dataset.editorValidation !== 'ready') {
        document.dispatchEvent(new Event('DOMContentLoaded'));
    }

    const initial = window.EditorValidation.run();
    expect(document.documentElement.dataset.editorValidation).toBe('ready');
    expect(initial.errors).toBe(2);
    expect(initial.issues.map((item) => item.code)).toEqual(expect.arrayContaining(['missing-name', 'missing-contact']));
    expect(initial.score).toBeLessThan(100);
    expect(document.querySelectorAll('.editor-validation-trigger')).toHaveLength(1);
    expect(document.querySelectorAll('.editor-validation-inspector-trigger')).toHaveLength(1);

    const trigger = document.querySelector('.editor-validation-trigger');
    trigger.click();
    expect(document.querySelector('.editor-validation-overlay').hidden).toBe(false);
    expect(document.querySelector('.editor-validation-dialog').getAttribute('role')).toBe('dialog');

    document.getElementById('input-name_en').value = 'Mona Ahmed';
    document.getElementById('input-email').value = 'mona@example.com';
    const ready = window.EditorValidation.run();
    expect(ready.errors).toBe(0);
    expect(ready.score).toBe(100);

    document.getElementById('input-name_en').value = 'Your full name here';
    window.EditorValidation.open(trigger);
    const review = Array.from(document.querySelectorAll('[data-validation-item]'))
        .find((button) => button.dataset.validationItem === 'name');
    review.click();
    expect(window.EditorWorkspace.select).toHaveBeenCalledWith('name', { focusPanel: true });
    expect(document.querySelector('.editor-validation-overlay').hidden).toBe(true);
});
