## Goals
- Reduce visual clutter, improve scanability and alignment, and make actions consistent.
- Keep rows compact and readable with clear hierarchy (avatar/name first, status and actions aligned).

## Table Structure
- Columns: [Select] | Name | Program/Department | Status | Actions
- Column sizing:
  - Select: 40px fixed
  - Name: flex (min 280px), shows avatar + primary name
  - Program/Department: 260–320px, truncates with tooltip
  - Status: 120px right-aligned pill (Active/Inactive)
  - Actions: 56–80px fixed (single overflow menu)
- Sticky header with zebra body rows; hover background on row

## Row Composition
- Name cell: avatar (24–28px) + name link; secondary line (email) muted and optional on XL
- Program/Department cell: badge or muted text; single line with ellipsis; full value in tooltip
- Status: pill (green Active, gray Inactive) aligned center-right
- Actions: compact menu (3-dots) with: View, History, Activate/Deactivate, (Students only) Edit Year/Program; removes three separate icon buttons
- Checkbox aligned with header; larger click target

## Interaction & Behavior
- Clicking name opens View; History remains in the menu
- Bulk bar appears only when rows selected; stays sticky at top of table container
- Keyboard focus outlines for rows and menu; tooltips on truncated fields
- Empty state: friendly message with “Add User” CTA

## Styling
- Row height: ~56–60px; padding-y: 10–12px
- Typography: name semibold, secondary meta muted-500; badge border-100 background-50
- Consistent icon size: 16px; spacing: 8px

## Implementation Steps
1) Update AdminManageUserRow.jsx
   - Merge avatar + name; add optional secondary meta
   - Replace inline action buttons with a DropdownMenu (Lightswind) trigger (3-dots)
   - Use a StatusBadge component (small pill) for active state
   - Add ellipsis + tooltip for long department/program
2) Update AdminManageUserList.jsx
   - Adjust TableHead widths; make header sticky; zebra rows
   - Move bulk bar into a sticky subheader inside the table container
3) CSS tweaks
   - Add .admin-table styles: sticky thead, zebra tr:nth-child(even), hover backgrounds, truncation helpers
4) Advisors vs Students
   - Students column title “Program • Year” (single column); show “Program (term) • Year (term)” when a specific term is active
   - Advisors column title “Department”
5) QA
   - Verify alignment at 1280–1440 widths
   - Verify tooltips show full values; actions work; bulk bar behavior

## Minimal Code Touchpoints
- client/src/components/admin/manage/AdminManageUserRow.jsx
- client/src/components/admin/manage/AdminManageUserList.jsx
- client/src/pages/admin/AdminManageUsers.jsx (styling hooks only)
- client/src/pages/admin/AdminManageUsers.css (or shared AdminContent.css)

## Rollout
- Implement Students page first (table + row), mirror on Advisors, then polish shared CSS.

If approved, I’ll implement the compact table layout, sticky header, overflow actions menu, and truncation with tooltips for both Students and Advisors.