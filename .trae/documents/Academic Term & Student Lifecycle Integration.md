## What Changes Focus On
- Admin creates academic years/semesters with date ranges and marks one as current.
- Admin explicitly assigns users (students and advisors) to each academic term.
- Consultations are scoped to a term and only allowed for users assigned to that term.
- New school year is a distinct set of memberships and consultations.

## Data Model
- `academic_terms` (admin-managed): `id`, `year_label`, `semester_label`, `start_date`, `end_date`, `is_current`.
- `term_memberships` (users in a term): `id`, `term_id`, `user_id`, `role ENUM('student','advisor')`, `member_status ENUM('enrolled','dropped','graduated','active')`, `joined_at`, unique `(term_id,user_id)`.
- `consultations` add `academic_term_id INT UNSIGNED NOT NULL` and FK to `academic_terms.id` (refs: c:\Users\Jezreel D\OneDrive\Desktop\AdviSys\server\db\schema.sql:129–160).
- Keep `student_profiles.year_level` as is; promotions will move students into the next term and optionally increment `year_level` (refs: c:\Users\Jezreel D\OneDrive\Desktop\AdviSys\server\db\schema.sql:57–66).

## Admin Workflows
- Create terms:
  - `POST /api/academic/terms` (year range + semester labels + dates).
  - `PATCH /api/academic/current-term` to set the current term.
- Assign users:
  - `POST /api/academic/terms/:termId/members` accepts arrays of `userId`s for students/advisors.
  - `DELETE /api/academic/terms/:termId/members/:userId` to remove assignment.
  - `PATCH /api/academic/terms/:termId/members/:userId/status` to set `enrolled|dropped|graduated`.
- Promote cohorts:
  - `POST /api/academic/terms/:fromTermId/promote` with `toTermId` and options: `incrementYearLevel=true|false`.
- Archive graduates/drops:
  - `POST /api/academic/terms/:termId/archive-graduates-drops` sets `consultations.archived_at` and `archive_reason` for affected members.

## Consultation Rules (Scoped by Term)
- Creation (`server/routes/consultations.js:118–182`):
  - Resolve current term if not provided.
  - Require both `student_user_id` and `advisor_user_id` to have active `term_memberships` for that `term_id`.
  - Reject if student’s membership `member_status` is `dropped|graduated`.
  - Save with `academic_term_id`.
- Listing:
  - Student (`server/routes/consultations.js:298–366`) and Advisor (`377–411`) default to `?term=current`.
  - Accept `?termId=<id>` or `?term=all`.

## UI (Admin-Heavy)
- Admin pages:
  - `AdminDashboard.jsx`: term selector, stats by term (refs: c:\Users\Jezreel D\OneDrive\Desktop\AdviSys\client\src\pages\admin\AdminDashboard.jsx).
  - `AdminManageUsers.jsx`: assign selected students/advisors to term; set member statuses; bulk promote (refs: c:\Users\Jezreel D\OneDrive\Desktop\AdviSys\client\src\pages\admin\AdminManageUsers.jsx).
  - New admin screen "Academic Terms": CRUD terms, make current, manage memberships.
- Student/advisor pages:
  - `MyConsultationsPage.jsx` and advisor consultation lists default to current term and show a term switcher (refs: c:\Users\Jezreel D\OneDrive\Desktop\AdviSys\client\src\pages\student\MyConsultationsPage.jsx).
  - Booking flow blocked for users not assigned to the current term or with `dropped|graduated`.

## Reporting & Analytics
- Per-term reports:
  - `GET /api/reports/consultations?termId&program&studentStatus&mode&advisorId`.
  - Dashboards accept `termId` and display per-term metrics; reuse existing year-level normalization where needed (refs: c:\Users\Jezreel D\OneDrive\Desktop\AdviSys\server\routes\dashboard.js:36–49).

## Automated Transitions (Admin-Orchestrated)
- At year/semester rollover:
  - Admin sets the new term as current.
  - Bulk membership copy: move students/advisors into the new term.
  - Optional auto-promotion increments `year_level`.
  - Archive graduates/drops from the previous term.
- Optional scheduled job to remind admin near term end; execution remains admin-driven.

## Migration & Backfill
- Seed the current term covering today.
- Backfill `academic_term_id` for existing consultations by date.
- Initialize `term_memberships` for current users based on simple rules (e.g., all active students/advisors → current term).

## Testing
- Backend: membership checks on consultation create; list filtering by term; promote/assign endpoints.
- Frontend: admin membership assignment UX, default current-term filters, blocked booking for unassigned/dropped/graduated.

## Code References
- Add fields to `consultations` table: c:\Users\Jezreel D\OneDrive\Desktop\AdviSys\server\db\schema.sql:129–160.
- Student profile (year level persists): c:\Users\Jezreel D\OneDrive\Desktop\AdviSys\server\db\schema.sql:57–66.
- Update consultation create/list routes: c:\Users\Jezreel D\OneDrive\Desktop\AdviSys\server\routes\consultations.js:118–182, 298–366, 377–411.

If you approve, I’ll implement admin term management, memberships, consultation validation, and UI changes in small verified steps focused on the admin side.