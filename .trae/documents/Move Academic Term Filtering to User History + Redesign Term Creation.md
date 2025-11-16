## Goals
- Remove academic term as a visible filter on Manage Students (treat it as background context).
- Add academic term selector to a student/advisor history view (when viewing a user), matching the “Previous/Current/Next Semester” UX.
- Redesign Admin Settings → Academic Terms creation to use School Year (From/To), Term (First/Second/Summer), and month–day Start/End inputs.

## Manage Students/Advisors Pages
- Hide academic-term-related filters from the header (keep simple: Search, Year Level, Status, Sort).
- Default membership operations to the current term (no explicit term dropdown in the header).
- Keep bulk actions unchanged.

## User History Term Selector (Admin)
- Where: Admin user view (existing drawer) or a dedicated “User Details” page.
- Add a compact term dropdown at the top of the user’s history.
- Items:
  - Previous Semester (label derived relative to current)
  - Current Semester (First/Second/Summer S.Y. YYYY–YYYY)
  - Next Semester
  - All remaining terms listed chronologically
- Behavior: Selecting a term filters the consultations to that term (uses the existing thread/list endpoints with `termId` or `term=all`).
- Implementation:
  - Extend AdminUserHistoryDrawer to fetch the terms list once and render the dropdown; default to current.
  - Compute “Previous/Current/Next” locally using sorted terms around the current one; render friendly labels.

## Admin Settings → Academic Terms Form
- Inputs:
  - School Year From: YYYY (dropdown)
  - School Year To: YYYY (dropdown, defaults to From+1, must be > From)
  - Term: First | Second | Summer
  - Start Month/Day: MM-DD (date picker constrained to month/day)
  - End Month/Day: MM-DD (date picker constrained to month/day)
  - Toggle: Set as current (optional)
- Derived fields (preview-only):
  - Year Label: `${from}-${to}`
  - Semester Label: First/Second/Summer
  - Computed start_date and end_date using the selected month/day projected into the correct year boundary:
    - If the chosen Start month is in From-year window → start_date uses From-year; End month/day uses either From or To so that end_date ≥ start_date.
- Validation:
  - To > From
  - Start/End combine into valid dates where end_date ≥ start_date
  - Unique (year_label, semester_label)
- API Changes:
  - Accept `{ yearFrom, yearTo, termType: 'first'|'second'|'summer', startMonthDay: 'MM-DD', endMonthDay: 'MM-DD', isCurrent? }`
  - Server computes `year_label`, `semester_label`, `start_date`, `end_date` and persists; if `isCurrent`, flip current.

## Data & Endpoints (reuse existing where possible)
- Terms list: GET `/api/settings/academic/terms` (already exists) → used by history view for dropdown.
- New terms create payload (above); update existing POST `/api/settings/academic/terms` to support the new body while still accepting the old (backward compatible).
- No changes to consultation list/thread endpoints; they already support `termId`.

## UI Polish
- Term dropdown styling matches your inspiration: prefix items with “Previous/Current/Next Semester” where applicable, fallback to full label for others.
- Keep filters compact on Manage pages; move contextual term choice into history where it’s most meaningful.

## Rollout Steps
1) Update Admin Settings form to use School Year From/To + Term + Start/End month/day; add preview and validation.
2) Remove academic-year filters from Manage Students header (leave Year Level/Status/Sort only); default membership ops to current term.
3) Add the term selector to Admin user history (drawer) and wire to existing endpoints.
4) QA with mixed terms: ensure “Previous/Current/Next” labels resolve correctly; verify history filtering and term creation.

## Testing Checklist
- Create a First/Second/Summer term with distinct month/day; confirm saved dates and uniqueness.
- History: selecting a term updates list; “Previous/Current/Next” indicate expected terms.
- Manage Students page: no term filter visible; basic filters and actions work.

Confirm and I’ll implement the updated settings form, hide the Manage Students term filter, and add the history term dropdown with the friendly labels.