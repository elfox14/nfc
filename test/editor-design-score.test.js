/**
 * @jest-environment jsdom
 */
'use strict';

describe('Editor design score', () => {
  beforeEach(() => {
    jest.resetModules();
    delete window.EditorDesignScore;
    document.documentElement.lang = 'ar';
    document.body.innerHTML = '<aside id="editor-context-inspector"><div id="existing-inspector-content"></div></aside><div class="tb-center"></div>';
    require('../editor-design-score');
    document.dispatchEvent(new Event('DOMContentLoaded'));
  });

  afterEach(() => {
    delete window.EditorDesignScore;
  });

  test('calculates weighted score from validation issues', () => {
    expect(window.EditorDesignScore.calculate([])).toBe(100);
    expect(window.EditorDesignScore.calculate([{ severity: 'error' }, { severity: 'warning' }])).toBe(75);
  });

  test('renders score inside inspector instead of the top toolbar', () => {
    const score = document.getElementById('editor-design-score');
    expect(score).not.toBeNull();
    expect(score.parentElement.id).toBe('editor-context-inspector');
    expect(document.querySelector('.tb-center #editor-design-score')).toBeNull();
  });

  test('updates score and recommendations from validation event', () => {
    document.dispatchEvent(new CustomEvent('editor:validationcomplete', {
      detail: { issues: [{ severity: 'error', message: 'Missing name' }] }
    }));
    expect(document.querySelector('.eds-value').textContent).toBe('82');
    expect(document.querySelector('.eds-details ol').textContent).toContain('Missing name');
    expect(window.EditorDesignScore.getCurrent().issues).toHaveLength(1);
  });
});