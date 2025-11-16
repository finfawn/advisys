## Goal
Make notification preferences fully functional:
- When “Email notifications” is ON, send important events via email (Mailjet)
- When “Mute notifications” is ON, suppress all in‑app notifications (including Lightswind toasts and native browser notifications) and do not email
- Respect existing per‑type prefs (consultation reminders, new request alerts)
- Include a clear CTA button in reminder emails (and other important emails) linking back to the app for quick routing

## Changes Overview
1) Backend: centralize notification creation and add email delivery with CTA button
2) Backend: adopt centralized helper in reminder/missed jobs, consultations routes, and notifications route
3) Frontend: ensure profile settings persist mute flag locally and UI respects it
4) Frontend: suppress Lightswind toasts and native notifications when muted
5) Verification: targeted checks to validate behavior end‑to‑end

## Backend Implementation
### 1. Create notification service
- Add `server/services/notifications.js` exporting:
  - `getNotificationSettings(userId)` → `{ email_notifications, consultation_reminders, new_request_notifications, notifications_muted }`
  - `notify(poolOrConn, userId, type, title, message, data?)` →
    - If `notifications_muted` → return without inserting/emailing
    - Insert into `notifications` table
    - Decide on email send:
      - Require `email_notifications` true
      - For reminders also require `consultation_reminders` true
      - For advisor new requests also require `new_request_notifications` true
      - Allowed email types: `consultation_request`, `consultation_request_submitted`, `consultation_approved`, `consultation_declined`, `consultation_cancelled`, `consultation_rescheduled`, `consultation_reminder`, `consultation_missed`, `consultation_room_ready`, `consultation_summary_updated`, `consultation_summary_edit_requested`, `consultation_summary_edit_approved`, `consultation_summary_edit_declined`
    - Fetch user email/role from `users`
    - Build subject/body using provided `title`/`message` and include a CTA button:
      - Student CTA → `${APP_BASE_URL}/student-dashboard/consultations`
      - Advisor CTA → `${APP_BASE_URL}/advisor-dashboard/consultations`
      - HTML button style: inline CSS, accessible contrast, full‑width on mobile
    - Use existing `sendEmail({ to, subject, html })`

### 2. Replace ad‑hoc helpers with service
- `server/server.js`:
  - Remove local `createNotification`/`isNotificationsMuted`
  - Import `{ notify, getNotificationSettings }` and call `notify(...)` in:
    - Reminder job for student/advisor (uses existing `consultation_reminders` checks)
    - Missed job notifications
- `server/routes/consultations.js`:
  - Remove local `createNotification`/`isNotificationsMuted`
  - Replace all calls with `notify(...)` for:
    - New request (advisor) and submitted (student)
    - Status updates (approved/declined/cancelled/missed)
    - Notes/summary updates and room‑ready
  - Optionally reuse `getNotificationSettings` from service
- `server/routes/notifications.js`:
  - Change POST handler to call `notify(...)` instead of manual insert, preserving mute behavior

### 3. Email content rules
- Subject: reuse `title`
- Body: HTML structure:
  - Title and message
  - Context extras from `data` (date/time/threshold/room)
  - Prominent CTA button linking to the correct dashboard
  - Footer with “Manage notification preferences” hint
- Style: inline CSS for broad client support; button with padding, radius, brand color

## Frontend Implementation
### 4. Persist and read mute preference locally
- Student Settings `client/src/pages/student/StudentSettingsPage.jsx`:
  - On load and toggle, mirror `notificationsMuted` → `localStorage.advisys_notifications_muted_<userId>`; also mirror `emailNotifications` → `advisys_email_notifications_<userId>`
- Advisor Settings `client/src/pages/advisor/AdvisorSettingsPage.jsx`:
  - Same mirroring on load/toggle

### 5. Suppress toasts and native notifications when muted
- Lightswind toasts `client/src/components/hooks/use-toast.tsx`:
  - Before creating a toast, read `advisys_user` and consult `advisys_notifications_muted_<id>`; if true → no‑op
- Notification context `client/src/contexts/NotificationContext.jsx`:
  - On mount/user change, fetch `/api/settings/users/:id/notifications` to cache `notificationsMuted`
  - Wrap native browser notifications logic to skip entirely when muted

## Verification
- Mute ON → no DB notifications, no toasts, no native notifications, no emails
- Email ON, Mute OFF → email flows for important types; reminders include CTA button that routes to the app dashboard
- Email OFF → in‑app only; no emails
- Reminders thresholds honored by `REMINDER_THRESHOLDS` and `consultation_reminders`

## Notes
- Reuses existing Mailjet and `APP_BASE_URL` envs (no new secrets)
- Minimal changes, centralized logic avoids duplication and ensures consistent mute/email behavior across all notification paths

Approve and I’ll implement these scoped changes with clean diffs and references.