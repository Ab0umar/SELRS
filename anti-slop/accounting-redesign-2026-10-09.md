# Accounting page redesign

Reading this as: an Arabic RTL accounting workspace for medical-center staff,
using SELRS blue/orange identity, ENERGY 1 / RHYTHM 1 / MOTION 1.

## Scope and decisions

- Restore page titles: AccountingPage discarded supplied titles and several reports had no visible heading.
- Keep Cairo/shared fonts: Arabic operational records need consistency rather than a new display font.
- White canvas and neutral work areas: remove inherited mobile blue gradients without changing other modules.
- Wrapped navigation: existing permission-filtered destinations stay visible on phones; the subaccounts selector spans the row to fit its label.
- Framed content: 16px outer radius and 12px panel radius preserve the approved SELRS framing and distinguish groups from controls.
- Predictable spacing: 16/20/24px grouping separates context, filters, and records without adding marketing-style empty space.
- Readable history: wrap names and notes rather than truncating information needed to distinguish transactions.
- Semantic color: use warning-text for the advances label after measured contrast failed for the original orange.
- Blue remains selected-navigation emphasis; existing orange and semantic colors retain their actual action/state purpose.
- Existing icons retain route-specific meaning. No new imagery, icons, libraries, decorative texture, or animation.

Changed presentation is scoped to AccountingShell, AccountingPagePrimitives,
accounting-design.css, and missing screen headings. New headings are print-hidden.
No backend, database, transaction calculations, permissions, save/delete handlers,
or print implementation changed. Unrelated worktree changes were preserved.

## Delivery gate

- Hard gate PASS for changed presentation: production browser checks assert no page overflow,
  visible titles, 44px mobile navigation bounds, recoverable query states, field-label contrast,
  keyboard editing/cancel, and zero financial writes. Fixture records are explicitly synthetic.
- Purpose gate PASS: every major treatment has its operational reason above; no decorative assets or fabricated claims.
- Liveliness PASS: explicit 1/1/1 dials, page-context headings, selected-navigation emphasis,
  structural spacing, and Arabic labelled record groups match DESIGN.md.
- Quality locks PASS for this patch: localized shared-token styling, both themes,
  existing workflows, production build, TypeScript, and unit tests. Financial mutation
  execution and live production behavior are not claimed.

## Verification and limits

- pnpm check: passed.
- pnpm test: 50 files / 343 tests passed.
- pnpm exec vite build --outDir ../outputs/accounting-redesign-build: passed, isolated output; no deployment.
- Browser suites: verify-accounting-web.mjs, verify-accounting-registers.mjs,
  verify-accounting-reports.mjs, verify-accounting-accounts.mjs.
- Final production-preview runs passed: 6 ledger/expense cases, 36 register cases,
  30 desktop report plus 10 mobile report cases, and 24 desktop account plus 8 mobile account cases (114 total).
- Reports/accounts cover 320/1024/1440/1920px; registers cover 320/768/1440px; both themes.
- Loading/error/retry/empty workflows are checked at 1440px; phone checks cover rendered layout
  and navigation rather than pretending hidden desktop tables are the mobile interface.
- Account suite includes actual receipt preview/PDF verification through its existing print workflow.
- Initial dev-preview checks intermittently reported React DOM removal errors. Final checks use
  the isolated production preview at port 5180, not hot reload. The original preview errors are
  recorded here rather than suppressed in the test assertions.
- Graph updated with graphify update .; SQL-parser and zero-node configuration warnings are unrelated to these UI checks.

Screenshots and test results: outputs/accounting-web-verification,
outputs/accounting-register-verification, outputs/accounting-report-verification,
outputs/accounting-account-verification. API responses are intercepted; no live
financial records are saved, deleted, or altered.
