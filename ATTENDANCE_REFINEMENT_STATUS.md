# Attendance Module Refinement

## Approved Direction

The user approved `outputs/attendance-design-options/1-familiar.html` on
2026-10-05 after rejecting the flattened treatment. Keep the clearer Arabic copy,
but use neutral page backgrounds, white framed workspaces, small-radius cards,
and blue selected navigation. Do not reintroduce the unframed list/metric rules.
Dark mode retains the existing dark palette with the same grouping and spacing.

The overview uses five existing counters, a read-only daily register from
`attendance.dailyByDate`, and separate shift/action/device panels. The register
does not edit attendance, expose additional write actions, or invent department
and shift names that the daily response does not provide. Search and status
filters apply locally. Report navigation retains its permission check.

Scope: attendance overview, employees and requests, reports, settings, live
attendance, employee details, personal attendance, and shared attendance controls.

- Date and a read-only refresh command in the overview header.
- Five labeled totals with separate loading and failure displays.
- Framed shift summaries, compact operational controls, and a separate device panel.
- Responsive wrapping and visible keyboard focus on operational actions and links.
- Consistent wrapping tabs in the employee, report, settings, and administration hubs.
- Framed list/report workspaces, edit forms, and device tools, with plain rows inside.
- Direct settings links replacing explanatory feature lists.
- Compact employee/profile headers and a labeled, touch-sized profile back link.

Existing attendance queries, permission checks, punch synchronization, and the existing
26th-to-25th recomputation range are unchanged. No production mutations or deployment
are part of this pass. The new daily register reuses the existing read-only daily query.

Verification: `scripts/verify-attendance-overview.mjs` uses isolated API fixtures for
populated, empty, failed-summary, and failed-register states at 360, 768, and 1440
pixels in both themes. It checks card framing, local search/status filtering,
refresh, retry, page bounds, nested controls, and browser errors.
It does not validate a real device connection or execute synchronization/recomputation.

`scripts/verify-attendance-module.mjs` covers all hub tabs, shift subviews,
administration subviews, and standalone live/detail/profile/console/sync/roster
routes using fixtures. It checks tab keyboard navigation, page bounds, browser
errors, and live-monitor pause without sending mutations.

Limitations: real-device operations, authenticated production permission combinations,
record-save workflows, Android packaging, and report printing are not certified by
these visual fixture checks. Backend rules and print templates were not changed.
