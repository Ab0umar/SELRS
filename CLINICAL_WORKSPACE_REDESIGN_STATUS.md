# Clinical Workspace Redesign

Updated: 2026-10-03

## Scope

- `/reports`
- `/records/patients`
- `/records/medical`
- `/sheets`

The workspace uses the existing calm antislop direction: ENERGY 1 / RHYTHM 1 / MOTION 1. Headers and tab panels are unframed; tabs wrap instead of requiring horizontal scrolling. Active tabs use existing theme tokens. Controls retain keyboard focus indicators and tabs have 44px minimum height. Mobile tabs reflow into two columns. Screen-only styling leaves print geometry unchanged.

The reports page has a visible title and a concise patient field label. Existing patient-record print actions are preserved. Sheet header date inputs have enough screen width for the complete date. Pentacam refresh promises accept the different query result types without changing behavior.

## Verification

- `node scripts/verify-clinical-workspaces.mjs`: 114 cases passed on the initial workspace build: 19 tabs, three widths (360, 768, 1440), light and dark themes. No page errors or attempted writes. Fixtures cover empty workspaces, not real patient persistence.
- `pnpm test`: 39 files, 281 tests passed.
- Scoped `git -c core.whitespace=cr-at-eol diff --check`: passed.
- `graphify update .`: AST extraction completed; the later graph-processing stage was stopped before completion. SQL extraction remains unavailable because the optional SQL parser is not installed.
- Latest `pnpm build` and `pnpm check`: blocked by syntax errors in the concurrently edited `client/src/features/admin/AdminServices.tsx` at lines 2244-2245. That unrelated file was left unchanged.

## Remaining Gates

The final reports title, header touch-target sizing and sheet date-width adjustment need a fresh browser run after the build blocker is resolved. Populated-patient flows, save/error states, full contrast checks and physical printing are not certified by the empty-workspace harness. No production data was changed and no deployment was performed.

## Lasik Print Correction

The attached followup page now fills the printable page width without applying the saved scale or offsets. Pentacam print columns explicitly run left to right: empty column, right-eye table, left-eye table. Printed textareas disable resizing. These changes are confined to print rules; clinical fields and save behavior are unchanged.

Both Pentacam tables also use matching print column proportions, row heights, border colors and heading colors, based on the visually rightmost table. The test harness compares both tables' widths, each row height and each first-row cell width; eye-specific values remain independent.

### Android Print Isolation

The Android HTML builder removes elements marked `print:hidden`. The Pentacam spacer carried that class even though print CSS made it visible in the browser, so native print lost the spacer and shifted the tables left. It now uses `print:block`. A regression assertion reproduced the missing third column before the fix and passed for the generated native-print HTML after the fix. This is not an APK-cache diagnosis. Capacitor loads the server web layer; the source fix needs web deployment and subsequent application reload. A real Android-device confirmation remains required.

## Sheets Navigation

The five visible tabs match the requested service vocabulary:

- كشف: consultant sheet, with its type explicitly passed rather than inferred from the hub URL.
- مقاس نظارة / أشعة خارجي: specialist sheet.
- تصحيح الإبصار: Lasik sheet.
- الصواف: external sheet.
- متابعة: consultant or specialist, selected through a labeled control. Queries, saves, patient navigation and print titles use the selected type.

The existing Lasik followup URLs are preserved without adding a sixth visible tab. Specialist followups have a patient-specific route at `/sheets/specialist/:id/followup`. Followup editing controls wrap on mobile; print geometry is unchanged by these screen styles.

`pnpm check`, `pnpm build` and all 281 unit tests passed for the navigation changes. The final focused browser run passed 30 `/sheets` tab cases across three widths and both themes, covering tab names, document types, followup selection and mobile toolbar bounds with isolated fixtures. It does not certify real medical persistence.

After this correction, `pnpm check`, `pnpm build` and `node scripts/verify-clinical-design.mjs` passed. Print-layout assertions passed at 360, 768 and 1440px in both themes: followup width, no scaling, Pentacam placement and textarea resize handles. The PDF remains two A4 pages. Physical printer output remains unverified.
