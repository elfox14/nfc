/**
 * @jest-environment node
 */

'use strict';

const {
  sanitizeDesignState,
  sanitizeInputs,
  sanitizeUrl
} = require('../utils/sanitize');

describe('persisted design security boundary', () => {
  test('rejects executable and attribute-breaking image URLs', () => {
    const inputs = sanitizeInputs({
      'input-logo': 'x" onerror="alert(1)',
      'input-photo-url': 'javascript:alert(1)',
      'input-qr-url': 'data:text/html,<script>alert(1)</script>'
    });

    expect(inputs['input-logo']).toBe('');
    expect(inputs['input-photo-url']).toBe('');
    expect(inputs['input-qr-url']).toBe('');
  });

  test('keeps safe local, HTTPS, and raster data-image sources', () => {
    expect(sanitizeUrl('mc-prime-nfc.png')).toBe('mc-prime-nfc.png');
    expect(sanitizeUrl('https://res.cloudinary.com/demo/image/upload/card.webp')).toBe(
      'https://res.cloudinary.com/demo/image/upload/card.webp'
    );
    expect(sanitizeUrl('data:image/png;base64,iVBORw0KGgo=')).toBe(
      'data:image/png;base64,iVBORw0KGgo='
    );
  });

  test('strips markup and rejects CSS attribute injection', () => {
    const state = sanitizeDesignState({
      inputs: {
        'input-name': '<img src=x onerror=alert(1)>Mahmoud',
        'name-font': 'Arial;position:fixed;inset:0',
        'name-color': 'red; background:url(javascript:alert(1))'
      },
      dynamic: {
        phones: [{ value: '<b>0100</b>' }],
        social: []
      }
    });

    expect(state.inputs['input-name']).toBe('Mahmoud');
    expect(state.inputs['name-font']).toBe('');
    expect(state.inputs['name-color']).toBe('');
    expect(state.dynamic.phones[0].value).toBe('0100');
  });

  test('drops unknown top-level state and bounds geometry', () => {
    const state = sanitizeDesignState({
      inputs: {},
      dynamic: {},
      positions: { 'card-logo': { x: 999999, y: -999999 } },
      attackerControlled: { html: '<script>alert(1)</script>' }
    });

    expect(state.attackerControlled).toBeUndefined();
    expect(state.positions['card-logo']).toEqual({ x: 5000, y: -5000 });
  });
});
