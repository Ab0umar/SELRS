# Salary redesign

Scope: salary-only presentation in SalaryLayout.redesigned.tsx,
SalaryDashboard.redesigned.tsx, and salary-design.css. Existing worktree changes
remain intact. No backend, schema, payroll arithmetic, permission, or print edits.

Reading this as: an Arabic RTL payroll workspace for medical-center staff,
using SELRS blue/orange identity, ENERGY 1 / RHYTHM 1 / MOTION 1.

## Diagnosis and decisions

- Hidden titles obscured page context: restore visible dashboard and existing page headings.
- Mobile navigation hid destinations offscreen: wrap the ten existing links into two columns.
- Global mobile canvas replaced neutral surfaces with blue: apply salary-only white canvas and gray working surfaces.
- Saturated ruled totals panel competed with approval status: separate branch totals into neutral panels with blue net amounts.
- Status appeared after totals: place status before totals visually so unavailable or draft figures have context.
- Typography: preserve Cairo and shared fonts for the Arabic operational interface; use tabular figures for amounts.
- Spacing: use 16/20/24px grouping, 44px navigation targets, and wrapped labels for narrow screens.
- Icons: retain existing route-specific tools for recognition; add no icon library or decorative assets.
- Motion: remove totals entrance and progress-width animation; keep quiet hover feedback.
- Orange remains concentrated on the existing payroll action. Success/warning/error colors retain their real state meanings.

## Verification

- PASS Hard gate for changed presentation: browser overview checks cover populated,
  finalized, empty, and error states in both themes at 320/360/768/1024/1440px;
  assert no page overflow, retry recovery, month-query updates, visible title,
  payroll action placement, focus outline, and 4.5:1 contrast for key changed text.
- PASS Purpose gate: visual decisions above identify each treatment's operational purpose;
  no fabricated records, claims, images, gradients, or new navigation destinations.
- PASS Liveliness: explicit 1/1/1 dials, month/status context, blue net-pay focal points,
  structural spacing, and the existing Arabic grouped-data motif.
- PASS Quality locks for this patch: shared theme tokens, localized CSS, existing Arabic labels,
  paired action colors, responsive navigation, no new dependencies or financial mutations.

Commands: pnpm check; pnpm test; node scripts/verify-salary-overview.mjs;
node scripts/verify-salary-module.mjs; graphify update .

Recorded results: TypeScript passed; Vitest 50 files / 343 tests passed;
overview 40 state/theme/viewport cases passed; module 60 route/theme/viewport
cases passed. Browser checks use installed Microsoft Edge.

Browser verification uses intercepted, explicitly synthetic responses, not live payroll.
Route checks cover ten salary pages, both themes, and 320/768/1440px with navigation
click-through and screenshots in outputs/salary-module. Overview screenshots are in
outputs/salary-overview. Existing financial save/compute/finalize controls are not
executed; no claim of live financial or production verification is made.
