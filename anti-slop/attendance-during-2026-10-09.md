# Attendance antislop refinement

Mode: during, selected explicitly in this session. Applied code-comment,
copywriting, human, mobile-layout, and UI filters.

Reading this as: an Arabic RTL attendance workspace for medical-center staff,
with the existing framed surfaces, ENERGY 1 / RHYTHM 1 / MOTION 1.

## Changes and reasons

- Keep page titles visible so each page identifies the current task.
- Show all seven attendance destinations in two columns below 700px, avoiding
  a horizontally concealed menu. Each destination retains a 44px minimum height.
- Extend visible focus to inputs, textareas, and focusable regions.
- Reduce overview title scale and vertical padding to keep daily records nearer
  the page heading. Remove entry animations to match MOTION 1.
- Name the data being loaded and explain how to recover from a filtered empty
  result. Announce the register result count after filtering.
- Remove comments that only label state, queries, mutations, or components.
  Preserve schedule, protocol, concurrency, and business-rule explanations.
- Fix nested employee-profile anchors in the mobile list and desktop table by
  applying the existing link classes to the Link element itself.

The existing palette, rounded panel grouping, action icons, queries, permissions,
and payroll calculations were retained. Source was already substantially modified
before this session; the complete worktree diff is not this patch's ownership scope.

## Verification gate for the changed behavior

- PASS, mobile containment and themes (R-03/R-34): 18 overview cases at
  360/768/1440px in light/dark; no horizontal page overflow. At 360px all seven
  navigation links fit inside the viewport and remain at least 44px tall.
- PASS, state copy and real content (R-17/R-27/R-38): register populated,
  empty, and error states were exercised with isolated test fixtures; no product
  data was fabricated or production records written.
- PASS, changed interactions (R-26/R-32): search filters rows; absent-status
  selection shows the filtered empty message; clearing filters restores the table;
  retry recovers from a failed register request; report navigation opens the
  reports route with a visible title. Search and navigation have focus outlines.
- PASS, measured overview pairings (R-25): muted text/surface ratios are
  5.62:1 light and 7.85:1 dark; focus accent/surface ratios are 6.56:1 light and
  9.05:1 dark, measured using the installed contrast checker.
- PASS, purpose and motion (R-19/R-31): each change has the reason above;
  entry animation and transform feedback were removed; reduced motion disables
  the remaining button background transition.
- PASS, comment scope: comment cleanup changes only comments in EmployeeDetail,
  EmployeesList, ScheduleSwap, ShiftAssignments, and admin/DeviceConsole. The
  EmployeesList link correction is a separate functional UI fix.
- PASS, runtime verification (R-35): local Vite app ran in Edge; the overview
  suite recorded 18 cases without page errors. The existing module suite recorded
  234 tab/route/theme/viewport cases, including keyboard End-key tab selection
  and live-monitor pause. A final rerun also checked for nested-anchor and
  missing-list-key console warnings, and passed all 234 cases after correcting
  the employee links and adding the missing punch ID to the test fixture.
  Screenshots and JSON evidence are under
  `outputs/attendance-antislop/`.
- PASS, source checks: `pnpm check`; `pnpm test` (50 files, 343 tests);
  targeted attendance tests (2 files, 8 tests); scoped `git diff --check`.

This gate covers the changes and observations listed above, not a complete
accessibility certification of every existing attendance control. Real device
sync, record-save operations, production permissions, report printing, real mobile
keyboard behavior, and 200% browser zoom were not verified. No deployment was run.

The older overview verification script targets a prior page composition and was
not used as evidence. `scripts/verify-attendance-antislop.mjs` exercises the current
overview. Playwright's bundled browser was missing; verification used the installed
Edge executable via `PLAYWRIGHT_CHROMIUM_EXECUTABLE`.

The AST graph update completed, with warnings about missing SQL parser support,
zero-node files, and retained nodes from files excluded by changed scan filters.
Those warnings limit graph coverage; current source inspection supported this work.
