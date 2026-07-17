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
            <button data-template-id="professional" id="professional-template"></button>
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

    test('blocks the first step until an industry is selected', () => {
        expect(window.EditorOnboarding.next()).toBe(false);
        expect(document.getElementById('eob-message').hidden).toBe(false);
        expect(window.EditorOnboarding.getState().step).toBe(0);
    });

    test('filters templates for the selected industry', () => {
        document.querySelector('[data-industry="restaurant"]').click();
        expect(window.EditorOnboarding.next()).toBe(true);
        expect(document.querySelector('[data-template-choice="minimal"]')).not.toBeNull();
        expect(document.querySelector('[data-template-choice="professional"]')).toBeNull();
    });

    test('requires a name and one contact method', () => {
        document.querySelector('[data-industry="business"]').click();
        window.EditorOnboarding.next();
        document.querySelector('[data-template-choice="modern"]').click();
        window.EditorOnboarding.next();
        expect(window.EditorOnboarding.next()).toBe(false);
        document.getElementById('eob-name').value = 'Mahmoud';
        document.getElementById('eob-name').dispatchEvent(new Event('input', { bubbles: true }));
        expect(window.EditorOnboarding.next()).toBe(false);
        document.getElementById('eob-phone').value = '01000000000';
        document.getElementById('eob-phone').dispatchEvent(new Event('input', { bubbles: true }));
        expect(window.EditorOnboarding.next()).toBe(true);
    });

    test('restores draft progress when reopened', () => {
        document.querySelector('[data-industry="medical"]').click();
        window.EditorOnboarding.next();
        document.querySelector('[data-template-choice="professional"]').click();
        window.EditorOnboarding.next();
        document.getElementById('eob-name').value = 'Mahmoud';
        document.getElementById('eob-name').dispatchEvent(new Event('input', { bubbles: true }));
        window.EditorOnboarding.close(false);
        window.EditorOnboarding.open();
        expect(window.EditorOnboarding.getState().step).toBe(2);
        expect(document.getElementById('eob-name').value).toBe('Mahmoud');
    });
});
