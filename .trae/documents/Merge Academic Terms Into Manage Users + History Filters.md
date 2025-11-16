## Summary of Updates
- Admin Settings manages academic terms. Manage Users shows a term dropdown to filter cohorts and drive actions.
- Bulk deactivate supports a reason select (Graduated, Dropped, Other) and applies to a chosen term, with optional archiving/canceling.
- History screens add: (a) View by Consultations, (b) View by Counterpart (Students for advisors, Advisors for students) with a thread page.
- Advisor thread pages include a term dropdown and a PDF export of all consultations shown (including missed/canceled).
- Remove Delete action from all consultation cards/details; adopt cancel/close/archive only. Lock down the delete API.

## Admin Settings: Academic Terms
- Panel to create/edit/delete terms and set current term. Prevent overlapping current.
- Endpoints (extend settings):
  - GET/POST/PATCH/DELETE `/api/settings/academic/terms`
  - PATCH `/api/settings/academic/current-term` { termId }
- Data: `academic_terms(id, year_label, semester_label, start_date, end_date, is_current)`; unique `(year_label, semester_label)`.

## Manage Users: Term Filter + Memberships + Bulk Deactivate
- Term dropdown: "Show data for: [Academic Term]"; default to current term.
- Tables show members of selected term with status badges (Enrolled/Dropped/Graduated for students).
- Bulk actions on selected term: Add/Remove members, Promote cohort, Update per-term status, Bulk Deactivate.
- Bulk deactivate modal:
  - Reason select: Graduated, Dropped, Other (specify text field)
  - Apply to Term: defaults to selected term
  - Options: Archive open consultations in term; For advisors, cancel future slots in term
- Backend:
  - POST `/api/users/bulk-deactivate` { userIds[], reason, otherReason?, termId, archiveOpenConsultations?, cancelAdvisorSlots? }
  - Extend PATCH `/api/users/:id/status` to accept { status:'inactive', reason, otherReason?, termId } (server/routes/users.js:110–181)
  - Audit: `user_deactivation_events(user_id, reason, other_reason, term_id, performed_by, created_at)`
- Memberships:
  - Table: `academic_term_memberships(term_id, user_id, role, status_in_term, program_snapshot, year_level_snapshot, created_at)`
  - Endpoints: GET/POST/DELETE `/api/academic/terms/:termId/members`, PATCH `/api/academic/terms/:termId/members/status`, POST `/api/academic/terms/:termId/promote`

## Consultations: Term Tagging + Defaults + No Delete
- Schema: add `consultations.academic_term_id` (FK), `archived_at`, `archive_reason` ('graduated','dropped','year_end'). Existing block: server/db/schema.sql:129–160.
- Create: auto-attach current term; require student `status_in_term='enrolled'` in current term (server/routes/consultations.js:118–182).
- Lists: default to current term, allow `?termId` or `term=all` (server/routes/consultations.js:298–366, 377–411).
- Remove delete from UI everywhere. Replace with:
  - Upcoming: Cancel (for student), Decline/Cancel (for advisor), Reschedule
  - Completed/missed/canceled: View only; optionally Archive indicator
- API policy: restrict or deprecate DELETE `/api/consultations/:id` (server/routes/consultations.js:1036) to admin only, or convert to archive (sets `archived_at`/`archive_reason`) and return 405 for non-admin.

## History UX: Consultations + Threads with Term Filter
- Add "Show data for: [Academic Term]" dropdown to History screens.
- Mode toggle:
  - View by Consultations: chronological list filtered by selected term (optionally "All terms").
  - View by Counterpart:
    - Advisor: list of Students consulted with in the selected term; shows count and last consulted date.
    - Student: list of Advisors consulted with similarly.
- Thread page (selecting a counterpart):
  - Shows all consultations with that person; dropdown filters by term or All; includes missed/canceled.
  - Advisor-only action: Export to PDF of the currently shown set.
- Endpoints:
  - GET `/api/consultations/students/:studentId/counterparts?termId`
  - GET `/api/consultations/advisors/:advisorId/counterparts?termId`
  - GET `/api/consultations/thread?studentId&advisorId&termId&from&to`

## PDF Export: Advisor Per-Person Thread
- Server generates PDF from HTML template (headless browser render) for pagination and styling.
- Content per consultation: date, topic/request, category, mode, status, summary (if present), optional notes.
- Header: Student/Advisor names, program/year snapshot, academic year/semester or date range; footer page numbers.
- Endpoint: GET `/api/reports/consultations/thread.pdf?studentId&advisorId&termId&from&to` (advisor-only).
- Large result handling: soft limit (e.g., 300 records) and optional date range.

## Reporting & Dashboards
- Add `termId` filter to admin/advisor dashboards; aggregate by `status_in_term`, `program_snapshot`, `year_level_snapshot`, and `mode` (server/routes/dashboard.js:30–59 already aggregates; extend with term filter).

## Migration & Backfill
- Seed one current term covering today; backfill `consultations.academic_term_id` from `start_datetime`.
- Create memberships for current students/advisors in the current term; set `status_in_term='enrolled'` and snapshot program/year.

## Implementation Order
1) Schema: `academic_terms`, `academic_term_memberships`, `consultations.academic_term_id`, `archived_at`, `archive_reason`, `user_deactivation_events`.
2) Settings: term CRUD + set current; expose current term to frontend.
3) Consultations: assign term on create; default term filtering; archive helper.
4) Manage Users: term dropdown + membership listing; bulk deactivate with reason modal.
5) History: add term dropdown, counterparts list, thread pages.
6) PDF export: advisor thread download.
7) Remove Delete button from consultation UIs; lock the DELETE API to admin or convert to archive.

## Code Touchpoints
- DB: `server/db/schema.sql` (consultations table at 129–160; add new tables and fields).
- Consultations routes: `server/routes/consultations.js` (create/list; DELETE at 1036 for lockdown).
- Users routes: `server/routes/users.js:110–181` (status patch; add bulk deactivate endpoint near here).
- Settings routes: `server/routes/settings.js` (add academic terms CRUD and current term).
- New routes: `server/routes/academic.js` for memberships/counterparts if not added to settings.
- Frontend Admin: `client/src/pages/admin/AdminManageUsers.jsx` (term dropdown, bulk deactivate modal, remove delete on cards if present).
- Frontend Student: `client/src/pages/student/MyConsultationsPage.jsx` and History pages (term dropdown, view modes, thread navigation; no delete).
- Frontend Advisor: consultations list and new thread view with PDF export; no delete.