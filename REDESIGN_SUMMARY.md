# SELRS Design Documents

## Status

These documents replace the historical redesign proposal and its unsupported
completion, browser-support, accessibility, and performance claims.
The shared web/mobile implementation is described below; this is not a deployment report.

Reading this as: a design reference set for SELRS medical-center staff workflows,
using the existing Arabic RTL identity, ENERGY 1 / RHYTHM 1 / MOTION 1.

## Document Index

| Document | Responsibility |
| --- | --- |
| `design.md` | Shared identity, tokens, typography, components, states, and Delivery Gate. |
| `PAGES_DESIGN.md` | Task-based screen composition without an assumed route inventory. |
| `REDESIGN_GUIDE.md` | Applying the shared direction and recording actual verification. |
| `SHEETS_REDESIGN_SUMMARY.md` | Clinical measurement and A4 print requirements. |
| `.superdesign/design-system.md` | Medical-report workspace direction and acceptance. |

## Shared Decisions

- Arabic-first patient, employee, and account context provides the identity motif.
- Predictable tables and forms support repeated comparison and editing.
- Blue/neutral surfaces and selective orange retain the existing identity.
- Relevant icons, explicit status labels, and brief interaction feedback support actions.
- Actual records supply metrics and content; missing values remain honest.
- Both screen themes, mobile reflow, keyboard use, data states, and applicable
  print output require verification before UI delivery.

These choices retain a task focal point, structural whitespace, and selective
accent without imposing decorative card layouts or fictional dashboard data.

## Verification Boundary

Implemented shared screen tokens in `client/src/styles/design-system.css`, loaded
after the web or native stylesheet. Updated button, input, select, card, and tab
primitives; top/bottom navigation; operational and sidebar shells; dashboard
framing; administration directory/search/status; login; and patient mobile navigation.
Mobile tables keep readable text and local horizontal scrolling. Existing route,
permission, authentication, clinical-data, and persistence logic remains in place.

`scripts/verify-antislop-ui.mjs` uses intercepted API fixtures, not production
accounts. It checks login and administration at 360, 768, and 1440 pixels in both
themes, plus the native stylesheet in a browser at 360 pixels. Screenshots and
results are written to `outputs/antislop-verification/`.
Checks cover overflow, loaded logo, password reveal by keyboard/click, remember
state, login error, submit contrast, administration empty-search state, and
native table readability/scrolling. Portal links are inspected, not exercised.

This does not prove every individual module, native device execution, successful
live authentication, clinical printing, or production deployment. No unmeasured
performance or full accessibility claims are made.

### Observed Results (2026-10-02)

- `pnpm check`: passed.
- `pnpm test`: 37 files, 270 tests passed.
- `pnpm build`: encoding check, web/native assets, and server bundle passed.
- Browser matrix: 32 cases passed; no page errors or page-level overflow in those cases.
- Login submit contrast: 10.55:1 light, 7.81:1 dark, measured from computed colors.
- Native table simulation: 14px text, 1055px content scrolling inside a 352px container.
- `git -c core.whitespace=cr-at-eol diff --check`: passed.
- `graphify update .`: code graph refreshed; SQL extraction is unavailable because
  the environment lacks `tree_sitter_sql`. Documentation semantic extraction was not run.

These are bounded checks, not a repository-wide antislop Delivery Gate PASS.
That gate still requires every module's interactions and applicable print/device evidence.

### Operational Screen Follow-Up

Accounting summary loading/missing/error values no longer masquerade as zero.
The patient header wraps a long name and visit controls on phones, route links
use `aria-current`, and the change-patient icon has an accessible name.
Selected patient routes own their mobile navigation; the global bar is hidden
there so the two bars cannot overlap. A shared route helper and ten unit cases
keep that ownership consistent. Payroll section controls expose selected state
and its month/year controls have 44px height.

The expanded browser matrix includes accounting missing-summary display,
payroll section/month changes, patient visit navigation, and mobile sheet
opening/Escape dismissal. All patient/accounting/payroll data is intercepted
fixture data; no production writes or actual payroll computations are exercised.

The core antislop Delivery Gate and antislop-ui checklist remain the acceptance
criteria described in `design.md`; document inspection is not a UI PASS.
