## Goal
Create two streamlined admin pages with calm, inline filters (no collapsible panel) and clear, role‑specific actions.

## Pages & Navigation
- Routes
  - /admin/students → Manage Students
  - /admin/advisors → Manage Advisors
  - Redirect /admin/manage-users → /admin/students (compat).
- Sidebar
  - Replace single entry with two: Manage Students, Manage Advisors.

## Shared Header Layout (both pages)
- Left: Page title
- Right: single inline filter strip (small size components) + Add User + Actions menu.
- No collapsible panel; keep everything on one tidy row using compact widths and tight spacing.

## Students Page
- Filters (inline, compact)
  - Term: 180px (Current/All/specific)
  - Search: 240–280px (expands on focus)
  - Year Level (current): 120px
  - Term Status: 160px (hidden if term=All)
  - Program (term): 180px (options from /api/programs)
  - Year (term): 120px (options from /api/settings/year-levels)
  - Status: 120px (Active/Inactive)
  - Sort: 140px (Name/Status)
- Actions menu: Upload Users (students), Download CSV (visible rows), Export Term Members
- Add User button
- Table & bulk bar (shows only when rows selected): Bulk Deactivate (with reasons), Add/Remove from Term, Promote Cohort (filters or selected only)
- Maintain in‑term badges and editing for a specific/current term.

## Advisors Page
- Filters (inline, compact)
  - Term selector & Search (same sizing)
  - Department: 180px (options from /api/departments)
  - Term Status: 160px (optional if enforced)
  - Status: 120px
  - Sort: 140px
- Actions menu: Upload Users (advisors), Download CSV, Export Term Members
- Add User button
- Bulk bar: Bulk Deactivate (option to cancel future slots), Add/Remove from Term

## Exports & Membership
- Keep CSV (visible rows) respecting filters
- Keep Export Term Members for selected term
- No behavioral changes to membership APIs

## Implementation Steps
1) Duplicate current Manage Users into two pages and remove role toggle per page.
2) Update router and sidebar; add redirect from /admin/manage-users.
3) Build compact inline filter strips per page; remove collapsible UI and keep existing logic.
4) Keep bulk bar behavior; ensure role‑specific actions appear on the right page.
5) Validate: term changes, filtering, exports, bulk flows on both pages; visual spacing/widths.

## Validation Checklist
- Students: term filters work; promote cohort (selected and filtered) OK; CSV/Term Members accurate.
- Advisors: department filter OK; bulk deactivate can cancel slots; CSV/Term Members accurate.
- Navigation: new sidebar routes and redirect work as expected.

If approved, I’ll implement the two pages, route/sidebar updates, compact inline filters, and verify flows in small commits.