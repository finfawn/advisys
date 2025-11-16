## Goals

* Reduce manual work by auto-enrolling students into the correct academic term.

* Keep logic simple, idempotent, and snapshot program/year at the time of enrollment.

* Preserve manual controls for exceptions.

## Enrollment Modes (Configurable)

1. Event-driven (default): Ensure membership on consultation creation.
2. Login-driven (optional): Ensure membership on login if within current term dates.
3. Ensure wizard (on demand): Admin bulk-enrolls into a term with filters and dry-run preview.

## Backend Changes

1. Consultation create hook (idempotent ensure)

* Location: consultation create route.

* Behavior:

  * Resolve current term (already present).

  * If student has no membership row for that term: INSERT IGNORE a row with status\_in\_term='enrolled', program\_snapshot, year\_level\_snapshot.

  * If a membership exists with status\_in\_term in ('dropped','graduated'), reject booking (current behavior preserved for non-eligible statuses).

* Result: Booking no longer fails solely due to missing membership.

1. Login bootstrap ensure (feature-flagged)

* Add env flag `AUTO_ENROLL_ON_LOGIN=true|false` (default false).

* On successful login for an active student, if today within current term and no membership: INSERT IGNORE as above.

1. Ensure Members wizard endpoint (admin)

* `POST /api/settings/academic/terms/:termId/ensure-members`

* Body: { program?, year?, onlyActive?: boolean, recentActivityDays?: number, dryRun?: boolean }

* Behavior:

  * Build candidate student set per filters (default: onlyActive=true).

  * Return counts when `dryRun=true`.

  * When `dryRun=false`, INSERT IGNORE memberships with snapshots; return { insertedCount }.

1. Snapshot rules

* On first membership insertion for that term, snapshot `program` and `year_level` from `student_profiles` into `program_snapshot` and `year_level_snapshot`.

* Never back-edit snapshots.

## Client Changes

1. Settings → Academic Terms

* New toggle: “Auto-enroll students at login (current term)” (reads/writes a simple server setting or env-backed endpoint).

* New wizard: “Enroll into Current Term”

  * Filters: Program, Year, Only active, Recent activity window (optional).

  * Step 1: Preview (dry-run) shows counts.

  * Step 2: Confirm enroll (executes).

1. Manage Students

* Keep existing Add to Term and the newly renamed “Advance to Next Term” action.

* Optional small info banner if auto-enroll-on-login is enabled.

## Data Integrity & Idempotency

* Use unique constraint `(term_id, user_id)` and `INSERT IGNORE`.

* No changes to existing tables; reuse `academic_term_memberships`.

## Rollout

1. Implement consultation ensure (low risk, core benefit).
2. Add wizard endpoint + minimal UI button in Academic Terms.
3. Add login ensure behind flag.

## Verification

* Book a consultation as a new student in current term → membership auto-created and booking succeeds.

* Run wizard dry-run and execution → counts and inserted rows match expectations.

* Toggle login ensure → verify new logins create membership.

## Non-Goals (for now)

* No auto-promotion; still use “Advance to Next Term”.

* No registrar-like full SIS enrollment; keep consultation-centric logic.

## Backout Plan

* Feature flags allow disabling login ensure.

* Consultation ensure can be guarded with a quick toggle if needed.

