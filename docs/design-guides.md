# Design Guides

Working guides that apply the shared direction in `DESIGN.md` (identity, tokens,
typography, components, Delivery Gate). Product context is in `PRODUCT.md`. The
report-workspace specialization is in `.superdesign/design-system.md`.

Direction in one line: Arabic RTL clinical and operational workspace, ENERGY 1 / RHYTHM 1 /
MOTION 1, existing blue/orange identity.

## 1. Applying the direction to a screen

1. Identify the screen's main task, current renderer, data sources, permissions and
   existing controls before changing the layout.
2. Choose the record, action or exception that leads the hierarchy.
3. Reuse shared tokens, fonts, components and the route's shell conventions.
4. Arrange filters, forms and tables around the real comparison or editing need.
5. Implement empty, loading, error and permission states with specific feedback.
6. Verify changed controls, both themes, breakpoints and applicable print output.

Make focused edits in the owning source files and preserve unrelated worktree changes. A
design change does not authorize database, business-policy, deployment or permission
changes, and old prototypes must never replace active source files wholesale.

Module direction:

| Module | Lead with | Why |
| --- | --- | --- |
| Attendance | Employee/punch records and actionable exceptions | Staff review real attendance and sync state |
| Payroll | Period, employee rows, calculated amounts | Users compare amounts before finalizing |
| Accounting | Wrapped statements, consistently aligned amounts | Transactions must be readable without hidden text |
| Clinical | Patient context and explicit OD/OS groups | Findings stay tied to the right patient and eye |

Metrics are sourced, scoped and relevant; there is no fixed four-card header. Navigation
uses existing routes and permissions. Section headings use normal casing and zero letter
spacing. Page sections stay unframed; cards frame individual items or real tools.

## 2. Screen patterns

| Screen family | Main task and focal point | Composition |
| --- | --- | --- |
| Authentication | Enter credentials, resolve validation | Focused labelled form |
| Patient search and reception | Identify the patient and current visit | Search/filter row, then comparison fields and real registration actions |
| Queue and workflow | Find the patient needing the next action | Ordered records with explicit service, doctor and state |
| Patient file and examination | Review context, record findings | Persistent patient identity, grouped history, labelled clinical fields |
| Prescriptions and reports | Prepare the right patient document | Patient selection, document form, real preview/print |
| Clinical measurements and scans | Compare labelled OD/OS results | Paired-eye data and scans at inspectable size |
| Attendance | Review punches, exceptions, employee status | Date/scope filters; explicit device and sync states |
| Payroll | Review the period and employee amounts | Scoped table, totals, supported save/finalize actions |
| Accounting | Compare transactions, reconcile balances | Date/account filters, wrapped statements, aligned amounts |
| Inventory | Inspect stock and movements | Identifiers, units, quantities, movement context |
| Administration | Review or change configuration | Labelled settings or record tables with clear save feedback |
| Portals (patient, doctor) | Complete the self-service task | Permission-scoped records, no staff-only controls |
| Marketing | Review drafts, recipients, send state | Sourced campaign records, supported actions |

Shared rules: identify the active patient, employee or account before actions; keep
filters next to the records they affect and show the selected scope and period; put
deciding fields early in tables with only supported row actions; status labels describe
real state and stay understandable without color; charts exist only when they answer a
task question; real images stay inspectable and skeletons only indicate loading.

Distinguish loading, first use, filtered-empty, permission restriction and request
failure, each naming its context and next action.

## 3. Responsive and RTL rules

Test at native widths 320, 360, 390, 430, 640 and 1024 px (not only Tailwind breakpoints;
Tailwind `sm` 640, `md` 768, `lg` 1024). Mobile uses cards, desktop uses tables.

- Grids: patient cards `grid-cols-2 sm:grid-cols-3 md:grid-cols-4` with
  `gap-1 sm:gap-1.5 md:gap-2`; stat banners `grid-cols-2 sm:grid-cols-4`. Never a fixed
  4-column grid.
- Padding: `px-2 py-1.5 sm:px-3 sm:py-2` on mobile, `px-4 py-3` on desktop.
- Selects and inputs shrink on mobile (`min-w-[100px] sm:min-w-[120px]`, not a fixed
  `w-[120px]`). Long button labels use `text-xs sm:text-sm` or shorter text. Touch
  targets stay at least 44 px.
- Dialogs: `max-h-[85vh] sm:max-h-[90vh] overflow-y-auto`.
- Toolbars `flex-wrap`; never rely on horizontal scrolling for page-level layout. Wide
  tables scroll inside their own region.
- Tables switch to cards on mobile with pagination (20 per page); desktop tables are
  virtualized for 100+ rows (`useVirtualizer`, `estimateSize 74`, `overscan 8`).
- Use `useMediaQuery("(max-width: 639px)")`, not `window.innerWidth`; memoize card lists.
- RTL: set `dir="rtl"` at the page; use logical start/end and Tailwind RTL variants;
  icons mirror; codes, dates, amounts and eye measurements are isolated as LTR; long
  Arabic text wraps.

### RTL table column order

Tables carry `dir="rtl"` on the container and the table. Name columns are `text-right`
with `min-w-max`; code, status and action columns are `text-center` with a fixed width
(`w-16` or `w-20`). Header and body column order must match exactly.

| Table | Order (first to last) |
| --- | --- |
| Employees/staff | الكود، الاسم، القسم، النوع، الحالة، الإجراءات |
| Salary/payroll | الكود، الاسم، الراتب، البدلات، الخصومات، الإجمالي، الإجراءات |
| Attendance/reports | التاريخ، الموظف، الحضور، الغياب، التأخير، الملاحظات، الإجراءات |

## 4. Clinical sheets and print

- Patient context and visit date come before findings; OD and OS are explicitly
  labelled with paired fields, never distinguished by color or position alone.
- Typography: Cairo for Arabic, the shared English font, LTR isolation for abbreviations.
  Keep existing approved templates for field content and order; add no clinical content.
- Forms follow the screen theme with visible focus, labels, validation and save
  feedback. Toolbars wrap on phones with 44 px actions; measurement tables scroll locally.
- Print: A4 portrait (210 x 297 mm), light surfaces, navigation and editing controls
  hidden, patient identity never split from its clinical content, repeated headers on
  long histories, signature areas only for existing approved roles. Use real records,
  logos and scans; missing measurements stay empty.
- Verified 2026-10-02 with `scripts/verify-clinical-design.mjs`: 18 isolated screen/PDF
  cases (both themes, phone and desktop, LASIK at 768 px); LASIK and consultant printed
  as two A4 pages, external sheets and leave certificates as one; native HTML snapshots
  preserved live field values. Not verified: physical Android printing, hardware margins,
  production saving, all saved designer configurations.

### Six clinical reports (quiet paper)

The six documents on `ClinicalReportsPage` share one stationery skin. The hub is
`/reports` and `/clinical-reports` (default tab `offdays`). Each direct route below opens
the same page on one tab. `/post-op-offdays-en` is a separate English page and does not
use this skin. `/medical-reports` is the records list, not this hub.

| Tab query | Label | Sheet root | Direct route |
| --- | --- | --- | --- |
| `offdays` | إجازة ما بعد العملية | `.report-sheet-body` | `/post-op-offdays` |
| `pre-post-op` | تقرير قبل وبعد | `.report-sheet-body` | `/pre-post-op-report` |
| `referral` | خطاب الإحالة | `.report-sheet-body` | `/sheets/referral` |
| `medical-report` | تقرير طبي | `.printable-report-sheet` | `/medical-report` |
| `condition` | تقرير حالة طبية | `.report-sheet-body` | `/medical-condition-report` |
| `clinical` | التقرير الشامل | `.report-sheet-body` | `/clinical-report` |

`tab`, `patientId`, and `id` stay in the query string. A route `:id` selects the same
patient. The hub print button calls `window.print()` for the open tab. Title inputs are
`print:hidden`; the printed title is the adjacent text. An empty occupation row is
`print:hidden`.

Paper and ink are two `<select>`s on the hub, stored only in this browser:

| Control | Values | `localStorage` | Effect |
| --- | --- | --- | --- |
| الورق | `blank` (default), `preprinted` | `clinical-report-stock` | `data-report-stock` on the page |
| لون الطباعة | `color` (default), `mono` | `clinical-report-color` | `data-report-color` on the page |

`blank` prints the letterhead (`/logos/full.png`, عيون الشروق) and the footer
(عيون الشروق · لليزك وتصحيح الإبصار, `selrs.cc`). `preprinted` keeps both nodes in the
DOM and sets `display: none`, then reserves the physical letterhead with
`--report-top-clearance: 50mm` (screen `padding-top: 50mm` as well). Print `@page` margin
stays `0`. Chrome drops a large `@page` top margin, so clearance is the sheet padding in
`ClinicalReportFrame` and `PrintableMedicalReport`:
`var(--report-top-clearance, 8mm) 15mm 8mm 15mm`. Blank top is 8mm. Both sheets are
210mm wide.

Color ink uses `#0b2a52`, `#0b4a8f`, `#4a6283`, rule `#b9c8da`, tint `#eef4fb`, and a
`#f7941d` title mark. Mono sets those tokens to `#111` / `#444` / `#999` / `#fff`, turns
the title mark `#666`, and grayscales the logo (`grayscale(1) contrast(1.35)`). In print,
mono also forces sheet text to `#111` and backgrounds to transparent.

Quiet-paper rules in `client/src/styles/medical-report-brand.css` strip `rounded` and
`border` boxes inside either sheet root. `.report-stamp-space` and a wrapper whose only
child is one `input` or `textarea` stay. Headings become a 15px rule, not a card.
`ReportSection`, `ReportFacts`, and `ReportFact` in `ReportStationery.tsx` are the
shared blocks. Screen edits use a dashed border; print makes field borders transparent.

Saved print profiles (`shared/printSettings.ts`, applied by `applyClinicalPrintSettings`)
are separate from stock and ink. `currentPrintDocument` picks a profile when the path
matches `PRINT_DOCUMENTS` in `client/src/lib/clinicalPrintSettings.ts`, or when a visible
sheet matches the fallback selector. `/reports` is not a profile route. The `report`
profile route is `/clinical-reports` or `/medical-reports`, and its selector is
`.printable-report-sheet`. The records list at `/medical-reports` usually has no such
sheet, so the profile does nothing there. Inactive Radix tabs unmount, so on the hub
that profile runs only while the medical-report tab is mounted (including
`/medical-report`, via the fallback). An enabled profile puts its margins on `@page`
and sets the matched sheet's padding to `0`
inside `@layer base`. That `!important` beats the unlayered 8mm/50mm padding. On
`/reports` the other five tabs keep that stationery padding even when their direct-route
profiles are enabled, because those paths are not `/reports`. Leave a profile disabled
unless its `@page` margin is the clearance you want. Each of these URLs is its own
entry in `PAGE_PERMISSION_DEFINITIONS`; a parent path does not grant it. Admins skip
that check.

`scripts/verify-report-stationery.mjs` loads each tab from `http://127.0.0.1:5186/reports`
in Edge, mocks tRPC GETs, and checks all four stock/color pairs: letterhead and footer
nodes exist, they are hidden only for `preprinted`, print top is about 30.24px (8mm) or
188.98px (50mm), width is about 793.7px, mono ink is `#000` or `#111`, and each mocked
sample PDF is one page. It then appends a long paragraph to the clinical sheet and
expects more than one page. It does not load a real patient. Reference shots from the
layout change: `docs/screenshots/reports-quiet-blank.png`,
`docs/screenshots/reports-quiet-mono.png`, `docs/screenshots/reports-quiet-preprinted.png`.

## 5. Verification

For each changed screen record the build/run command and result, viewports, theme, data
state, control, observed action, console output and remaining limits. Check at least:

- Long Arabic labels and statements, mixed LTR values, mobile containment.
- 44 px targets, keyboard order, visible focus, dialog Escape and focus restoration.
- Empty, loading, error, filtered-empty, permission, validation and save feedback.
- Real route navigation, filters, row actions, menus, tabs and theme switching.
- Measured contrast in both themes and an A4 preview for printable documents.

Implemented and measured on 2026-10-02: shared screen tokens in
`client/src/styles/design-system.css`, updated primitives and shells;
`scripts/verify-antislop-ui.mjs` (login and administration at 360/768/1440 in both themes
plus the native stylesheet at 360; 32 cases, no page-level overflow; submit contrast
10.55:1 light and 7.81:1 dark); `pnpm check`, `pnpm test` (37 files, 270 tests) and
`pnpm build` passed. Those are bounded checks, not a repository-wide Delivery Gate PASS.
