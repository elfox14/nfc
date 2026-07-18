/** @jest-environment node */
'use strict';

const {
  mayEdit,
  resetWorkflowAfterEdit,
  sanitizeDesignData
} = require('../routes/workspace-design-bridge.routes')._test;

describe('workspace design bridge helpers', () => {
  test('returns every collaborative edit to a clean draft revision', () => {
    const now = new Date('2026-07-19T10:00:00Z');
    const workflow = resetWorkflowAfterEdit({
      enabled: true,
      status: 'approved',
      revision: 4,
      submittedAt: new Date('2026-07-18T09:00:00Z'),
      reviewedAt: new Date('2026-07-18T10:00:00Z'),
      publishedAt: new Date('2026-07-18T11:00:00Z')
    }, 'editor-1', now);

    expect(workflow).toMatchObject({
      enabled: true,
      status: 'draft',
      revision: 5,
      submittedAt: null,
      submittedBy: null,
      reviewedAt: null,
      reviewedBy: null,
      reviewNote: '',
      publishedAt: null,
      publishedBy: null,
      lastEditedBy: 'editor-1',
      updatedAt: now
    });
  });

  test('allows the design owner and workspace editors but not reviewers to save', () => {
    const workspace = {
      ownerId: 'workspace-owner',
      members: [
        { userId: 'editor-1', role: 'editor' },
        { userId: 'reviewer-1', role: 'reviewer' }
      ]
    };
    expect(mayEdit({ owner: true, workspace }, 'design-owner')).toBe(true);
    expect(mayEdit({ owner: false, workspace }, 'editor-1')).toBe(true);
    expect(mayEdit({ owner: false, workspace }, 'reviewer-1')).toBe(false);
  });

  test('sanitizes personal content without removing visual state', () => {
    const sanitizeInputs = jest.fn(inputs => Object.fromEntries(
      Object.entries(inputs).map(([key, value]) => [key, String(value).replace(/[<>]/g, '')])
    ));
    const DOMPurify = { sanitize: value => String(value).replace(/[<>]/g, '') };
    const result = sanitizeDesignData({
      inputs: { 'input-name_ar': '<محمود>', 'front-bg-start': '#123456' },
      dynamic: {
        phones: [{ value: '<01000000000>' }],
        social: [{ value: '<profile>' }],
        staticSocial: { email: { value: '<mail@example.com>' } }
      },
      placements: { logo: 'front' }
    }, sanitizeInputs, DOMPurify);

    expect(sanitizeInputs).toHaveBeenCalledTimes(1);
    expect(result.inputs).toEqual({ 'input-name_ar': 'محمود', 'front-bg-start': '#123456' });
    expect(result.dynamic.phones[0].value).toBe('01000000000');
    expect(result.dynamic.social[0].value).toBe('profile');
    expect(result.dynamic.staticSocial.email.value).toBe('mail@example.com');
    expect(result.placements).toEqual({ logo: 'front' });
  });
});
