## Goal
Ensure consultation notes are private to the author:
- Students only see their own student notes and shared summary
- Advisors only see their own advisor notes and shared summary
- No cross‑visibility of private notes anywhere

## Changes
### Backend (server/routes/consultations.js)
1) Student consultations list (GET /consultations/students/:studentId/consultations)
- Remove `advisorPrivateNotes` from the response object
- Keep: `studentPrivateNotes`, `studentNotes`, `summaryNotes`, `aiSummary`

2) Advisor consultations list (GET /consultations/advisors/:advisorId/consultations)
- Confirm only `advisorPrivateNotes` is exposed (already true)
- Ensure `studentPrivateNotes` is NOT present

3) Thread endpoint (GET /consultations/thread)
- Replace raw `c.*` passthrough with a role‑aware mapping using `req.user.role`:
  - If role = student: omit `advisor_private_notes`
  - If role = advisor: omit `student_private_notes`
  - Always include shared fields (summary, times, status, etc.)
- Return an array of sanitized items with consistent shape

### Frontend (sanity safeguard)
4) Student details pages
- Ensure components never render `advisorPrivateNotes` keys if present
- No UI changes expected after backend fix; add a guard in mapping to drop `advisorPrivateNotes`

## Verification
- As student: call `/consultations/students/:id/consultations` and confirm `advisorPrivateNotes` is absent
- As advisor: call `/consultations/advisors/:id/consultations` and confirm `studentPrivateNotes` is absent
- Call `/consultations/thread` as student and advisor separately; verify only own private notes are present per role
- Open student and advisor consultation details pages to confirm only own notes + shared summary appear

## Scope & Safety
- No schema changes
- Purely response shaping; low‑risk and easily testable
- Consistent with current data model: `student_private_notes`, `advisor_private_notes`, `summary_notes`