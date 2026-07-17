/**
 * @jest-environment jsdom
 */

test('professional preview moves the real cards, gates publishing and restores the canvas', () => {
    document.documentElement.lang = 'en';
    document.documentElement.removeAttribute('data-editor-preview');
    document.body.innerHTML = `
        <button id="preview-mode-btn"><span>Preview</span></button>
        <button id="save-share-btn">Save</button>
        <button id="download-pdf">PDF</button>
        <button id="exit-preview-btn"></button>
        <div class="card-flipper" id="card-home">
            <article class="business-card card-front" id="card-front-preview"><h1 id="card-name">Mona</h1></article>
            <article class="business-card card-back" id="card-back-preview"></article>
        </div>
    `;

    let validationResult = { score: 56, errors: 1, warnings: 1, issues: [] };
    window.EditorValidation = {
        run: jest.fn(() => ({ ...validationResult })),
        open: jest.fn()
    };
    delete window.EditorCommands;
    delete window.EditorPreview;
    const save = jest.fn();
    const pdf = jest.fn();
    document.getElementById('save-share-btn').addEventListener('click', save);
    document.getElementById('download-pdf').addEventListener('click', pdf);

    jest.resetModules();
    jest.isolateModules(() => require('../editor-preview'));
    if (document.documentElement.dataset.editorPreview !== 'ready') {
        document.dispatchEvent(new Event('DOMContentLoaded'));
    }

    const trigger = document.getElementById('preview-mode-btn');
    trigger.click();
    const overlay = document.getElementById('editor-professional-preview');
    const stage = overlay.querySelector('.editor-preview-stage');
    expect(document.documentElement.dataset.editorPreview).toBe('ready');
    expect(overlay.hidden).toBe(false);
    expect(stage.querySelector('#card-front-preview')).not.toBeNull();
    expect(stage.querySelector('#card-back-preview')).not.toBeNull();
    expect(document.querySelector('.editor-preview-publish').disabled).toBe(true);
    expect(document.querySelector('.editor-preview-readiness strong').textContent).toBe('56/100');

    window.EditorPreview.setDevice('mobile');
    window.EditorPreview.setFace('back');
    expect(stage.dataset.device).toBe('mobile');
    expect(stage.dataset.face).toBe('back');

    validationResult = { score: 100, errors: 0, warnings: 0, issues: [] };
    expect(window.EditorPreview.publish()).toBe(true);
    expect(save).toHaveBeenCalledTimes(1);
    expect(overlay.hidden).toBe(true);
    expect(document.getElementById('card-home').children[0].id).toBe('card-front-preview');
    expect(document.getElementById('card-home').children[1].id).toBe('card-back-preview');

    window.EditorPreview.open(trigger);
    document.querySelector('.editor-preview-dialog footer .btn:nth-child(2)').click();
    expect(pdf).toHaveBeenCalledTimes(1);
    expect(document.getElementById('card-home').querySelector('#card-front-preview')).not.toBeNull();
});
