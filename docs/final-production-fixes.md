# Final production fixes

This release completes the remaining Phase 11 production work.

- The Arabic and English editor files now begin directly with the HTML doctype.
- The viewer forwards the authenticated session when workspace members preview unpublished designs.
- Production verification rejects injected editor metadata and checks the authenticated viewer bundle.
- No database migration is required.

## Files to synchronize

- `editor.html`
- `editor-en.html`
- `view/viewer.js`
- `scripts/verify-production-release.js`

## Validation

1. Deploy the latest `main` API to Render.
2. Synchronize the updated static files to `public_html/nfc/`.
3. Open an unpublished workspace design while signed in as a workspace member.
4. Confirm that a signed-out visitor receives no access until the design is published.
5. Run `npm run verify:production` and require every check to pass.
