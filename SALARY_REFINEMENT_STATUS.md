# Salary Refinement

Updated: 2026-10-05

## Completed Scope

The overview and module navigation follow the existing quiet RTL direction (ENERGY 1 / RHYTHM 1 / MOTION 1). The selected month and payroll status are the focal points. Totals use an unframed layout with dividers rather than floating section cards. Existing report routes are accessible through a Reports menu; single-page sections use direct links. Controls have visible keyboard focus.

The month selector changes only the read-only overview query. It does not select the payroll report's period, recalculate salaries, save payroll or finalize a month. Dashboard links no longer nest buttons inside anchors. Payroll arithmetic, the 26th-25th period rules and backend persistence are unchanged.

## Verification

- `pnpm build`: passed.
- `pnpm test`: 40 files, 284 tests passed.
- `node scripts/verify-salary-overview.mjs`: 18 populated/empty/error state cases passed across 360, 768 and 1440px in both themes. Month query changes and error retry were checked; server writes were blocked.
- Scoped whitespace check: passed.
- `pnpm check`: blocked by existing duplicate JSX attributes in `client/src/features/accounting/AccEntryDrawer.tsx` at lines 226 and 248. That unrelated file was left untouched.

This is an overview/navigation refinement, not certification of every salary screen. Authenticated payroll persistence, print and permission workflows remain outside this isolated fixture run. No server restart, APK build or production financial write was performed.
