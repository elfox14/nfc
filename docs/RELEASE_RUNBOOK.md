# Release and rollback runbook

Production uses one manually approved GitHub Actions workflow for the Render API and the `mcprim.com/nfc` static site.

## One-time configuration

Create a protected GitHub environment named `production`, then configure:

- `RENDER_DEPLOY_HOOK_URL`: the secret Render deploy hook URL.
- `API_HEALTH_URL`: the public Render `/healthz` URL.
- `STATIC_FTP_URL`: the FTPS server URL.
- `STATIC_FTP_USERNAME` and `STATIC_FTP_PASSWORD`.
- Optional repository variable `STATIC_REMOTE_DIR`. It defaults to the site's FTP-visible `/mcprim.com/nfc` directory; set it only when the FTP account exposes a different root. The workflow refuses `/`.
- Optional repository/environment variable `STATIC_RELEASE_URL`. It defaults to `https://mcprim.com/nfc/release.json`.

Configure every `sync: false` variable from `render.yaml` manually on the existing Render service. Render ignores newly added `sync: false` values when an existing Blueprint is synchronized.

## Release

1. Run **Release and Rollback** from GitHub Actions.
2. Set `ref` to the tested `main` commit SHA.
3. Set `release_tag` to the next immutable version, for example `v2.1.0`.
4. Approve the protected `production` environment.

The workflow repeats audits, unit tests, and Playwright tests; packages the static site; deploys the exact commit to Render; waits for database-backed readiness; deploys the matching static package; then verifies that the public `release.json` contains the exact same SHA before creating the tag and GitHub Release.

If `workflow_dispatch` is unavailable, merge a reviewed change to `.github/release-command.json` on `main` with `ref` and optional `releaseTag`. Changes to that file are an auditable alternative trigger for the same protected workflow; refs and tags are validated before checkout.

## Rollback

1. Run the same workflow.
2. Set `ref` to a previous release tag or full commit SHA.
3. Leave `release_tag` empty.
4. Approve the protected `production` environment.

Both halves are redeployed from the same historical ref. The workflow stamps `release.json` itself, so rollback commits created before manifest support remain verifiable. A rollback is successful only when `/healthz.release` and the public `/nfc/release.json.sha` both equal the resolved historical SHA. Release artifacts are retained for 90 days, and immutable tags remain available as rollback points.

## Git history discipline

The release workflow checks out a specific commit SHA and requires it to be
merged to `main`. Preserve a linear, traceable history so every deploy can be
audited:

- **Never force-push to `main`.** A force-push rewrites SHAs and breaks the
  `merge-base --is-ancestor` check. If a bad commit lands, push a revert
  commit instead.
- **Avoid squash-merging PRs into `main`.** Squashing discards the individual
  commit history that reviewers approved. Use regular merge commits or
  rebase-merge so the approved SHAs remain addressable.
- **Every release tag must point to a commit that was reviewed and tested on
  `main`.** The workflow's `merge-base --is-ancestor` guard enforces this, but
  keeping the history clean makes auditing straightforward.
- **Keep commits focused.** One logical change per commit so rollback targets
  a specific fix, not a mixed bag.
