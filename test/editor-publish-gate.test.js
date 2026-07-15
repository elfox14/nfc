/**
 * @jest-environment jsdom
 */

'use strict';

describe('Editor publish gate', () => {
    let trigger;

    beforeAll(() => {
        jest.resetModules();
        delete window.EditorPublishGate;
        document.documentElement.lang = 'ar';
        document.body.innerHTML = '<button id="export-png-btn">تصدير PNG</button>';
        trigger = document.getElementById('export-png-btn');
        window.EditorSmartValidation = { run: jest.fn(() => []) };
        require('../editor-publish-gate');
        document.dispatchEvent(new Event('DOMContentLoaded'));
    });

    beforeEach(() => {
        window.EditorSmartValidation.run.mockReset();
        window.EditorSmartValidation.run.mockReturnValue([]);
        window.EditorPublishGate.close();
        const consent = document.getElementById('epg-consent');
        if (consent) {
            consent.checked = false;
            consent.dispatchEvent(new Event('change', { bubbles: true }));
        }
    });

    test('recognizes export and share triggers', () => {
        expect(window.EditorPublishGate.isPublishTrigger(trigger)).not.toBeNull();
    });

    test('blocks publishing when critical errors exist', () => {
        window.EditorSmartValidation.run.mockReturnValue([{ severity: 'error', message: 'خطأ', target: null }]);
        trigger.click();
        const gate = document.getElementById('editor-publish-gate');
        expect(gate).not.toBeNull();
        expect(gate.classList.contains('is-open')).toBe(true);
        expect(gate.querySelector('#epg-proceed').disabled).toBe(true);
    });

    test('requires consent before warning override', () => {
        window.EditorSmartValidation.run.mockReturnValue([{ severity: 'warning', message: 'تحذير', target: null }]);
        trigger.click();
        const gate = document.getElementById('editor-publish-gate');
        const proceed = gate.querySelector('#epg-proceed');
        expect(proceed.disabled).toBe(true);
        const consent = gate.querySelector('#epg-consent');
        consent.checked = true;
        consent.dispatchEvent(new Event('change', { bubbles: true }));
        expect(proceed.disabled).toBe(false);
    });

    test('allows a clean action after review', () => {
        const handler = jest.fn();
        trigger.addEventListener('click', handler, { once: true });
        trigger.click();
        const gate = document.getElementById('editor-publish-gate');
        expect(gate).not.toBeNull();
        gate.querySelector('#epg-proceed').click();
        expect(handler).toHaveBeenCalledTimes(1);
    });
});
