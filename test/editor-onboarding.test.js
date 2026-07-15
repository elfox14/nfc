/**
 * @jest-environment jsdom
 */
'use strict';

describe('Editor onboarding', () => {
    beforeEach(() => {
        jest.useFakeTimers();
        jest.resetModules();
        delete window.EditorOnboarding;
        localStorage.clear();
        document.documentElement.lang = 'ar';
        document.body.innerHTML = `
            <input id="input-name_ar">
            <input id="input-tagline_ar">
            <input id="input-phone">
            <input id="input-email">
            <button data-template-id="modern" id="modern-template"></button>
        `;
        require('../editor-onboarding');
        document.dispatchEvent(new Event('DOMContentLoaded'));
        jest.runOnlyPendingTimers();
    });

    afterEach(() => {
        jest.useRealTimers();
        delete window.EditorOnboarding;
    });

    test('opens automatically for a first-time user', () => {
        expect(document.getElementById('editor-onboarding').classList.contains('is-open')).toBe(true);
    });

    test('does not reopen after completion', () => {
        window.EditorOnboarding.close(true);
        expect(window.EditorOnboarding.shouldOpen()).toBe(false);
    });

    test('writes onboarding values into existing editor inputs', () => {
        expect(window.EditorOnboarding.setValue(['input-name_ar'], 'Mahmoud')).toBe(true);
        expect(document.getElementById('input-name_ar').value).toBe('Mahmoud');
    });

    test('supports reopening the onboarding flow manually', () => {
        window.EditorOnboarding.close(true);
        window.EditorOnboarding.open({ step: 2 });
        expect(document.getElementById('editor-onboarding').classList.contains('is-open')).toBe(true);
        expect(document.getElementById('eob-name')).not.toBeNull();
    });
});
