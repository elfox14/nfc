# Security policy

## Reporting a vulnerability

Do not publish credentials, proof-of-concept payloads, customer data, or an
unpatched vulnerability in a public issue. Contact the repository owner
privately and include the affected revision, impact, and minimal reproduction.

## Credential exposure response

Deleting an exposed value from the current tree does not revoke it and does not
remove it from Git history. If any credential may have been shared or committed:

1. Rotate the MongoDB database user password and restrict its network access.
2. Rotate the Cloudinary API secret and revoke the old credential.
3. Generate independent random values for `JWT_SECRET`, `TOKEN_HASH_SECRET`,
   `COOKIE_SIGNING_SECRET`, and `UPLOAD_SECRET`; never reuse a value between
   purposes. Rotating `COOKIE_SIGNING_SECRET` intentionally invalidates every
   existing signed browser cookie.
4. Generate a new random admin token, store only its SHA-256 digest as
   `ADMIN_TOKEN_SHA256`, and discard the plaintext after placing it in the
   approved password manager.
5. Update Render and the external upload host in one maintenance window.
6. Invalidate all stored refresh and one-time initialization tokens:

   ```javascript
   db.users.updateMany(
     {},
     {
       $unset: {
         refreshTokenHash: '',
         sessionInitTokenHash: '',
         sessionInitTokenExpiry: '',
         resetTokenHash: '',
         resetTokenExpiry: '',
         verificationTokenHash: '',
         verificationTokenExpiry: ''
       }
     }
   )
   ```

7. Redeploy the API, verify that old sessions and credentials fail, and review
   MongoDB, Cloudinary, Render, and upload-host logs for unauthorized use.
8. Treat Git-history rewriting as a separate coordinated operation: it requires
   a protected-branch maintenance window, force-pushing rewritten refs, and
   having every contributor re-clone. Rotation must happen before that cleanup.

Generate server secrets with a cryptographically secure generator, for example
`openssl rand -hex 32`. Never place generated values in source, documentation,
issues, pull requests, CI logs, or chat transcripts.

## Supported releases

Security fixes are applied to the current `main` branch. Production deployments
should use an immutable reviewed commit and pass CI, full dependency audit, and
secret scanning before release.
