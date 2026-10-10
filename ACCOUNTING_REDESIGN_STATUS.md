# Accounting Redesign Status

## Sequence

Complete accounting web before accounting mobile. Then repeat web/mobile for
payroll, attendance, medical, and the remaining modules.

## Web Direction

Apply DESIGN.md: calm Arabic RTL workspace, ENERGY 1 / RHYTHM 1 / MOTION 1.
Financial entry is the focal task. Neutral labelled fields separate amounts from
actions; primary blue marks saving or selection, destructive red marks deletion.
Related accounts remain direct navigation, not promotional tiles. Report filters
and ledger rows stay predictable, with long statements wrapping.

## Implemented First Batch

- Ledger: removed gradient and competing action colors; shared save/delete/new
  buttons, compact related-account navigation, desktop field typography and spacing.
- Expenses: unframed desktop sections, readable filters/table, full statements,
  explicit query error and retry instead of an empty result or zero total.
- CSS changes are scoped to accounting and desktop screen media, not print.

## Evidence

`scripts/verify-accounting-web.mjs` passed light/dark at 1024, 1440, and 1920px.
It checked ledger input/reset, summary dialog Escape, expense category requests,
long statement fit, error/retry recovery, and page overflow. API calls were
intercepted with isolated labelled fixtures; no financial mutations occurred.
Screenshots and results: `outputs/accounting-web-verification/`.

TypeScript check, production build, and 37 Vitest files / 270 tests passed.

## Still Open

This is not completion of the accounting module or the antislop Delivery Gate.
Patient/doctor accounts, cost, and receipt print preview have a bounded web batch
below. Whole-module review and other print paths remain open. Full contrast, zoom,
permission states, real save/sync/import workflows, and physical printing remain
unverified. Mobile work has not started in these batches.
No production deployment or accounting-policy change is implied.

## Register Batch - 2026-10-02

Implemented web presentation for cashbook, advances, loans, InstaPay, home fund,
and Dr. Saadany accounts. Page identity, entry forms, and history use a predictable
RTL hierarchy. Screen sections are flat; wide tables scroll locally. Transfer
statements receive more width than amount columns; names and notes wrap.

Query failures are distinct from empty results, with explicit retry. Failed or
missing summaries do not display a zero balance. Existing financial calculations,
payloads, field meanings, filters, and synchronization endpoints are unchanged.

Cashbook and loan editors use the existing Radix-backed side-sheet: focus is
contained, Escape closes it, and focus returns to the opening control. The advance
employee picker supports Arrow Up/Down, Enter, and Escape without closing while
focus moves to an option. Save and transfer icons identify their actual commands.

### Recorded Checks

- `scripts/verify-accounting-registers.mjs`: 36 page/theme/viewport cases at
  1024, 1440, and 1920px; six pages in both themes, no page overflow.
- At 1440px, all six histories in both themes passed loading, error, retry, and
  empty-state checks. Test fixtures are explicit and all API requests intercepted.
- Keyboard row editing populated existing values. Cashbook and loan editors
  passed Escape and focus restoration. No financial mutations were sent.
- A focused 1024px rerun checks the final layout, employee picker, and computed
  field-label contrast in both themes. Contrast coverage is labels only, not all UI.
- `pnpm check`, `pnpm build`, `pnpm test`: 38 files / 273 tests passed.
- Evidence: `outputs/accounting-register-verification/`, including editor images,
  the full matrix `results.json`, and `focused-results.json`.

### Work-in-Progress Gate

This is a partial verification record, not full antislop Delivery Gate approval.
The module remains in progress until every relevant gate item is verified.

| Gate | Verified Scope | Open Scope |
| --- | --- | --- |
| R-03, R-34 | Desktop layout and both themes passed the matrix | Mobile and zoom |
| R-25 | Computed field-label ratios in five entry forms | All other text, borders, icons, and states |
| R-26, R-32 | Keyboard editing, dialog close/focus, picker selection | Full navigation and all controls |
| R-27 | Six history query loading/error/retry/empty states | Permissions and other accounting views |
| R-35 | Build, tests, isolated browser click-through | Real save, delete, import, sync, and print |
| R-17, R-18, R-23, R-36, R-38 | No fabricated production records, claims, or new visual assets | Live-data validation |
| Purpose and identity | DESIGN.md dials, domain labels, meaningful action icons, flat sections | Whole-module visual consistency |

## Report Batch - 2026-10-02

Implemented daily revenue, service revenue, services, receipt inquiry, and receipt
detail web presentation. Desktop sections are flat with readable wrapping tables
and local horizontal scrolling. Screen-only overrides leave print styles intact.
Receipt context fields are unframed; editable line inputs have accessible names.

Revenue and services queries use explicit loading/error/retry boundaries instead
of showing empty reports after a failure. Revenue metrics distinguish missing or
failed data from an actual zero and retain each report's money formatter.
Receipt failures hide stale details and disable printing; missing receipts have
an explicit not-found state.

Doctor/service filters now use the existing Radix Popover with native checkboxes,
catalog loading/error/empty states, and retry. This removes nested buttons and
provides Escape dismissal and trigger focus restoration. Financial calculations,
write payloads, synchronization, and accounting policy are unchanged.

### Recorded Checks

- Production-preview Playwright matrix: five pages, light/dark, 1024/1440/1920px,
  30 cases. No page overflow, no nested buttons, and flat section borders checked.
- At 1440px all five queries in both themes passed loading/error/retry/empty.
- Doctor selection reached the revenue request; Escape returned focus.
  Receipt patient filtering preserved the leading zeros in `000999`.
- Receipt line editing populated the existing service and per-unit price.
  Cancel exited editing; all non-GET API calls were blocked and none occurred.
- `pnpm check`, `pnpm build`, `pnpm test`: 38 files / 274 tests passed.
- Evidence: `scripts/verify-accounting-reports.mjs` and
  `outputs/accounting-report-verification/` (screenshots and results).

This remains partial antislop gate evidence. Printing/PDF output, permissions,
full contrast/zoom, all filter combinations, real saves, production integration,
and physical devices are not verified by this batch. No deployment occurred.
Patient/doctor accounts, cost, and receipt preview are recorded in the next batch.
Accounting mobile has not started.

## Account and Cost Batch - 2026-10-02

Implemented patient inquiry, patient account detail, doctor account detail, and
LASIK cost web presentation. Page titles identify each task. Report sections and
summary fields follow the existing flat accounting layout, with locally scrollable
tables and wrapping record names. Cost presets expose selected state; profit/cost
tabs retain existing financial definitions and values.

The four result queries now use explicit loading/error/retry boundaries. Failed
patient queries no longer show an empty report or stale totals. Invalid or missing
cost dates hide the result; manual refresh is disabled until dates are valid.
Financial calculations, query inputs, mutations, and backend policy are unchanged.

Receipt preview failures use Arabic messages and an alert; initial loading is
announced. Existing print payload generation and A4 sheet styling are unchanged.

### Recorded Checks

- `scripts/verify-accounting-accounts.mjs`: four pages, both themes, three desktop
  widths (1024/1440/1920px), 24 cases without page overflow.
- All four query states passed loading/error/retry/empty in both themes at 1440px.
- Patient code `000999` and doctor code `900` reached their existing queries.
  Quarter preset selection and profitability tab interaction passed.
- Keyboard opening of an inquiry receipt, receipt detail, and its actual
  `openPrint` navigation reached the preview. Both themes produced one A4 PDF page
  with the isolated receipt fixture. Missing print payload showed the Arabic alert.
- `pnpm check`, `pnpm build`, `pnpm test`: 38 files / 274 tests passed.
- Evidence: `outputs/accounting-account-verification/`, including screenshots,
  `results.json`, preview/print images, two receipt PDFs, and print result records.
- All API calls intercepted; no financial writes or production deployment.

This is not full antislop Delivery Gate approval or completion of accounting.
Still open: whole-web navigation/accessibility/contrast/zoom review, permission
states, all search variants, real save/sync/import workflows, and physical printing.
Revenue/grouped print checks are recorded below. Accounting mobile
starts only after the web review is finished; payroll has not started.

## Revenue and Grouped Print Batch - 2026-10-03

Daily and service revenue print commands are disabled after query failure and
for empty results. The command handler also guards these states. Daily output
has an explicit title inside the print scope; shared report period metadata
prints on white with a black border rather than a gradient.

### Recorded Checks

- `scripts/verify-accounting-print.mjs`: 14 PDF cases, light/dark, all A4.
- Single daily and service fixtures produced one page. An 80-row daily fixture
  produced two pages; 80 service details produced four pages.
- 100-row plain, service-grouped, and doctor/service-grouped previews produced
  four pages in each theme.
- Actual revenue print button handlers invoked browser print. Scope activation,
  afterprint cleanup, and disabled error/empty actions passed.
- All API requests intercepted, non-GET requests blocked; no financial writes.
- `pnpm check`, `pnpm build`, `pnpm test`: 38 files / 274 tests passed.
- Evidence: `outputs/accounting-print-verification/` with PDFs, print-media
  screenshots, and `results.json`.

PDF checks establish generation, page geometry, and pagination for these fixtures.
Print-media images were inspected for the daily title, period and service table.
They do not establish every row's physical-print fidelity, every printer, or every
possible group/column combination. Native mobile PDF export and the separate
service summary popup print buttons are not covered. Whole-web gate review remains
open; this is not approval to move on to mobile or payroll.

## Navigation and Text Accessibility Batch - 2026-10-03

Fixed unreadable semantic-colored headings on the primary-colored advances table
header and a low-contrast discount breakdown label in service revenue. Advance
date sorting is now a named keyboard button with `aria-sort` on its column.
The advance movement count is nonshrinking plain text rather than a clipped pill.

### Recorded Checks

- `scripts/verify-accounting-accessibility.mjs`: 17 destinations in light/dark,
  at CSS zoom 1 and 2, 68 cases. No page-level horizontal overflow.
- Main accounting links opened through focused links and Enter; subaccounts opened
  through the existing native select. Detail-only routes were opened directly.
- 3096 computed contrast samples of visible leaf headings, labels, table text,
  links, buttons, and paragraphs met their 4.5:1 or large-text 3:1 threshold.
  Background alpha compositing is included. Disabled text is excluded.
- Advance date sort passed Enter activation and announced ascending state.
- Four focused advance reruns verified the final count fit, sorting, and contrast.
- `pnpm check`, `pnpm build`, `pnpm test`: 38 files / 274 tests passed.
- Evidence: `outputs/accounting-accessibility-verification/`, full
  `results.json`, `focused-results.json`, and screenshots.
- Explicit isolated API fixtures, blocked non-GET requests, no production writes.

These checks do not certify full WCAG compliance. CSS zoom is not a browser's
native zoom/reflow test. Input/placeholder text, icon and border contrast, focused
and hover colors, permission variants, save/disabled interactions, all dialogs,
screen-reader traversal, and real integration remain outside this batch.
Next web checks are permissions and save/disabled behavior using isolated fixtures,
plus remaining non-text/focus checks. Mobile and payroll have not started.

## Permission Navigation Batch - 2026-10-03

Accounting subaccount options now follow the existing `canAccess` matcher.
Groups with no accessible children are hidden; a loans-only permission still
exposes the group even though its default advances destination is denied.
This is navigation presentation, not a new authorization or read/write policy.

- PASS: seven unit tests cover unavailable permissions, empty groups, restricted
  children, read/read-write tokens, explicit page boundaries, and admin order.
- PASS: six isolated browser cases cover cashbook-only, loans-only, and admin
  navigation in light and dark at 1440px. Loans remained selectable and focusable.
- PASS: no browser page errors or financial mutations in those cases.
- PASS: `pnpm check`, `pnpm build`, and `pnpm test` (39 files / 281 tests).
- Evidence: `outputs/accounting-permission-verification/results.json` and screenshots;
  reproducible with `scripts/verify-accounting-permissions.mjs`.

The complete antislop delivery gate remains open. Server authorization, actual
read-only write restrictions, save/pending/disabled feedback, and full non-text
and focus contrast are not certified by this navigation batch. No production
financial data was changed. Mobile and payroll have not started.

## Ledger Save States Batch - 2026-10-03

The ledger now locks draft fields and navigation while a save/delete operation
is pending, including query invalidation. A synchronous guard rejects repeated
submits. Failed operations show an announced Arabic alert and retain the draft.
Ledger add/update/delete explicitly disable the global automatic mutation retry;
an uncertain financial write is not replayed automatically.

- PASS: `scripts/verify-accounting-save.mjs` exercised slow save, repeated submit,
  failure with retained fields, and successful manual retry in both themes.
- PASS: each failed attempt issued one intercepted mutation, with no browser page
  errors. Successful add cleared the draft and displayed the saved state.
- PASS: TypeScript, production build, and 39 files / 281 tests.
- Evidence: `outputs/accounting-save-verification/results.json` and failure/success
  screenshots. All API calls were intercepted; no database writes occurred.

This verifies adding a ledger entry with isolated API fixtures, not persistence
against the real accounting backend. Update/delete error branches, other register
save flows, remaining focus/non-text contrast, and the complete antislop delivery
gate still need verification. Mobile and payroll have not started.

## Service and Loan Entry Alignment - 2026-10-03

The existing service and loan entry tabs now share the ledger's restrained
three-column workspace, compact desktop fields, form dividers, neutral sidebar
links, and shared new/save buttons. Removed the old orange/yellow controls and
decorative oversized icons. Service line removal has a named icon button, and
patient/service/price/quantity/discount fields have explicit accessible names.
Existing calculations and mutation payloads were preserved.

- PASS: 12 isolated cases: both entry tabs, light/dark, 1024/1440/1920px.
- PASS: service net amount, add/remove line, summary dialog Escape, loan remaining
  amount, initial save-disabled state and reset; no page-level horizontal overflow.
- PASS: no browser page errors or financial mutations in the fixture harness.
- PASS: `pnpm check`, `pnpm build`, and 281 tests across 39 files.
- Evidence: `outputs/accounting-entry-tab-verification/` and
  `scripts/verify-accounting-entry-tabs.mjs`.

This is the requested web visual alignment, not backend persistence or full
antislop gate certification. Mobile remains a later batch.

## Service and Loan Save States - 2026-10-03

Service and loan forms now lock all draft controls while saving and refreshing
their queries. A synchronous guard blocks repeated submit events. Failures show
announced Arabic alerts and leave the draft intact. Automatic mutation retries
are disabled for these financial writes; manual retry remains available.
Loan summary is invalidated after success. Editing a field clears the saved label.

- PASS: six isolated save workflows covering ledger/service/loan in both themes,
  including slow requests, duplicate submit, failed draft retention, no automatic
  retry, successful manual retry, cleared draft and loan saved-label reset.
- PASS: intercepted payload checks preserve the patient's leading-zero code,
  service code/price, ledger income and loan amount. No real financial writes.
- PASS: `pnpm check`, `pnpm build`, and 39 files / 281 tests.
- Evidence: `scripts/verify-accounting-save.mjs` and
  `outputs/accounting-save-verification/results.json` with screenshots.

This does not certify real backend persistence, timeout reconciliation, or every
other accounting register's save flow. The full web gate and mobile work remain
open; payroll has not started.
