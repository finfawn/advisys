## Overview
Add a complete, user‑friendly Forgot Password experience using the already‑implemented backend endpoints. No server changes are required; we will wire up the UI and route.

## What Already Exists (Server)
- Request reset: POST /api/auth/forgot-password { email }
  - Sends a reset link to the user’s email (token in URL)
  - Avoids email enumeration; always returns success
- Reset password: POST /api/auth/reset-password { token, newPassword }
  - Verifies token validity/expiry and updates the password
  - Marks token used
- Reset link destination: `${APP_BASE_URL}/reset-password?token=...`

## Client Changes
1) Add “Forgot password?” link on the login form
- File: client/src/pages/AuthPage.jsx
- Condition: visible when mode === "login"
- Behavior: clicking opens a small dialog/modal OR navigates to a dedicated page (see 2)
- We’ll implement a simple dialog for email entry; after submit call /api/auth/forgot-password
- Show a friendly success message regardless of whether the email exists

2) Create Reset Password page
- File: client/src/pages/ResetPassword.jsx (new)
- Reads `token` from the query string
- Shows a form with: New password, Confirm password
- Validates: minimum length, match, non-empty
- Submit → POST /api/auth/reset-password with { token, newPassword }
- Success → show confirmation and a “Go to Sign in” button that routes to /auth
- Error (invalid/expired token) → show a clear message and a “Request a new link” path to /auth (where user can use "Forgot password")

3) Register route
- File: client/src/App.jsx
- Add route: `/reset-password` → <ResetPassword />

## UX Details
- Forgot link placement: below password input, aligned left; label: “Forgot password?”
- Dialog fields: Email, Submit
- Dialog success copy: “If an account exists for this email, we’ve sent a reset link. Please check your inbox.”
- Reset page copy: “Create a new password for your account”
- Password rules: show helper text (e.g., at least 6 characters)

## Configuration Notes
- Ensure `APP_BASE_URL` is set in server/.env to your deployed client URL so links in emails point to the correct site (e.g., https://app.yourdomain.com)
- Mail sending must be configured (MAILJET_* and MAIL_FROM) — already set for verification

## Validation
- Manual: request link → receive email → click link → reset page opens → submit new password → login with new password
- Error paths: expired token shows proper message and directs to request a new link

## Security & Privacy
- No account enumeration (server already returns success uniformly)
- Tokens are one‑time use and time‑limited on the server
- Client never logs tokens or passwords

If you approve, I will implement the dialog on AuthPage, add the ResetPassword page, and wire the new route. 