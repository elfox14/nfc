/**
 * @jest-environment jsdom
 */
'use strict';

describe('Editor design score', () => {
  beforeEach(() => {
    jest.resetModules();
    delete window.EditorDesignScore;
    document.documentElement.lang = 'ar';
    document.body.innerHTML = '<div class="tb-center"></div>';
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

  test('renders score in toolbar and updates from validation event', () => {
    document.dispatchEvent(new CustomEvent('editor:validationcomplete', {
      detail: { issues: [{ severity: 'error', message: 'Missing name' }] }
    }));
    expect(document.getElementById('editor-design-score')).not.toBeNull();
    expect(document.querySelector('.eds-ring strong').textContent).toBe('82');
    expect(window.EditorDesignScore.getCurrent().issues).toHaveLength(1);
  });
});