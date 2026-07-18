# Final production fixes

This release completes the remaining Phase 11 production work.

- The Arabic and English editor files now begin directly with the HTML doctype.
- The viewer forwards the authenticated session when workspace members preview unpublished designs.
- Production verification rejects injected editor metadata and checks the authenticated viewer bundle.
- No database migration is required.

After deployment, synchronize the updated static files and run `npm run verify:production`.
