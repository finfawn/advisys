## Summary
- Replace SendGrid with Mailjet in the backend email utility, no new dependency needed (use HTTP API with `undici`).
- Keep the `sendEmail({ to, subject, html })` interface stable so the rest of the code remains unchanged.
- Implement the email verification flow (register → code → verify → activate → JWT) using the provider‑agnostic `sendEmail`.
- Deploy client to Firebase Hosting and add Google Sign‑In via Firebase Auth.

## Mailjet Migration (No Domain Required Now)
- Config
  - Env: `MAILJET_API_KEY`, `MAILJET_API_SECRET`, `MAIL_FROM`, `MAIL_FROM_NAME`.
  - Remove SendGrid envs and scripts.
- Code changes
  - server/services/email.js: swap SendGrid call for Mailjet v3.1 send (POST `https://api.mailjet.com/v3.1/send`) using Basic Auth with API key/secret; payload `Messages: [ { From, To, Subject, HTMLPart } ]`.
  - Keep return `{ ok }` and warning when not configured.
- Cleanup
  - Remove SendGrid mentions from `server/package.json` scripts (e.g., `email:test`) and from any deploy script envs.
- Sender setup in Mailjet
  - Without a domain: add and verify a Single Sender email in Mailjet; set `MAIL_FROM` to that address. Later, authenticate a custom domain for better deliverability.

## Backend – Email Verification Flow
- Data model
  - New table `email_verifications(id, user_id, code_hash, expires_at, consumed_at, resend_count, created_at)`.
  - Use existing `users.status` (`inactive` until verified).
- Endpoints (server/routes/auth.js)
  - Register: create user with `status='inactive'`, generate 6‑digit code (hash+store), send via `sendEmail`, respond `{ pending: true, email }`.
  - Verify request/resend: POST `/api/auth/verify/request` with `{ email }` (throttle and always return success).
  - Verify confirm: POST `/api/auth/verify/confirm` with `{ email, code }`; on success set `status='active'` and return `{ token, user }` via `makeToken`.
  - Login: if `status!=='active'`, return 403 `Email not verified` and optionally send a fresh code.
- Env
  - `VERIFICATION_CODE_TTL_MINUTES=10`, `VERIFICATION_CODE_RESEND_SECONDS=60`, `VERIFICATION_MAX_PER_HOUR=5`.

## Client – Verification UI
- New route `/verify-email` using `client/src/lightswind/input-otp.tsx` for 6 digits.
- After register, navigate to `/verify-email?email=...` (stop storing token on register); on success of confirm, store `{ token, user }` and route by role.
- On login 403 unverified, show message + resend and link to `/verify-email`.

## Google Sign‑In + Firebase Hosting
- Host client on Firebase (`*.web.app` works without a custom domain).
- Add Google Sign‑In via Firebase Auth on the client; send Firebase ID token to `/api/auth/firebase-login`.
- Server verifies token with Firebase Admin SDK, finds/creates user (mark `status='active'`), returns our JWT.

## Rollout & Tests
- Add DB migration script for `email_verifications` (patterned on `db/scripts/add_password_resets_table.js`).
- Add server tests for request/resend/confirm and for login block when inactive.
- Validate: register, receive Mailjet Single Sender email, verify, then log in; try unverified login to confirm 403 path.

## Later: Move to Custom .app Domain
- Buy and connect domain to Firebase Hosting.
- In Mailjet, authenticate the domain (SPF/DKIM) and add DMARC; switch `MAIL_FROM` to `no-reply@yourdomain.app` for better deliverability.
