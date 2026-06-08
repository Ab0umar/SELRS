---
name: SRV100 Frontend Design Skill
description: >
  Design system and UI rules for the SELRS (Saadany Eye Laser & Refractive Surgery)
  medical platform. Use this skill whenever modifying any frontend page, component,
  or style in the SRV100_Acc project. Covers layout, spacing, color semantics, medical
  workflows, accounting workflows, table patterns, mobile behavior, and commandments
  for AI agents. Inferred from the actual codebase — no invented preferences.
---

# Design Philosophy

The SELRS UI is built for **speed over beauty**. Staff operate under time pressure in a
clinical environment. Every UI decision must reduce clicks, surface critical status
immediately, and avoid visual noise that slows reading.

The app is **RTL-first** (Arabic). All layouts use `dir="rtl"`. Arabic UI text is
non-negotiable. Mixed Arabic/English is acceptable only when the English term is the
domain standard (Pentacam, Autoref, Refraction, Lasik, UCVA/BCVA, tRPC).

The design system is **Tailwind CSS 4 + shadcn/ui** on a semantic token foundation.
Never hardcode hex colors; always use the semantic token (e.g. `text-success`, `bg-warning/20`).

---

# Layout Rules

## Page Containers
- Top-level pages use: `className="selrs-page-bg flex h-full flex-col" dir="rtl"`
- Full-page forms/entries: `className="min-h-screen selrs-page-bg p-6" dir="rtl"`
- Detail/admin pages: `className="mx-auto max-w-6xl space-y-6 p-6" dir="rtl"`
- Never use raw `bg-white` or `bg-gray-*` as a page background — use `selrs-page-bg`.

## Spacing Scale
- Card body padding: `px-3 py-2.5` (compact) or `px-4 py-3` (standard)
- Section headers: `px-4 py-2.5`
- Between sections: `space-y-4` to `space-y-6`
- Between list items: `space-y-1.5` to `space-y-2.5`
- Between inline elements: `gap-2` to `gap-3`
- Never use more than `gap-4` for inline flows — it is visually too loose.

## Module Shells
- Each major module (Attendance, Salary, Marketing) has a `<ModuleLayout>` wrapper.
- Sub-navigation is inside the layout shell, not the page.
- Pages rendered inside a shell must not re-implement their own nav or back-button chrome.

## Section Headers
Use `SectionHeader` pattern for any panel:
```tsx
<div className="flex items-center justify-between border-b border-border/40 px-4 py-2.5">
  <h3 className="text-base font-semibold leading-tight text-foreground">{title}</h3>
  {children}  {/* optional badge / action */}
</div>
```

## Sticky Behavior
- Queue columns on TodayPatients board are scrollable internally; the column header stays visible.
- Page-level action bars (save/print) stick to the top or bottom on mobile.
- Accounting tables: the header row sticks on scroll.

---

# Visual Style Rules

## Borders
- Cards: `border border-border` (100% opacity)
- Subtle inner sections: `border-border/40` to `border-border/70`
- Status-tinted borders: `border-success/30`, `border-warning/35`, `border-info/30`, `border-destructive/30`
- Patient portal (external-facing): `border-[#dbe7f4]` — a soft blue tint

## Shadows
- Internal app cards: no box-shadow by default; rely on border only
- Patient portal cards: `hover:shadow-[0_12px_24px_rgba(28,64,104,0.08)]` on hover
- Elevated overlays (popovers, sheets): rely on shadcn/ui defaults

## Rounded Corners
- Standard cards and inputs: `rounded-lg`
- Small badges and pills: `rounded-full`
- Skeleton loading shapes: `rounded-full` for text skeletons, `rounded-md` for block skeletons
- Patient portal cards: `rounded-2xl` (softer external appearance)
- Progress bars: `rounded-full h-1.5`

## Color Tokens (always use these, never hardcode)
| Token | Use case |
|---|---|
| `primary` / `primary/10` / `primary/30` | Main actions, clinic stage, registration |
| `secondary` / `secondary/15` | Secondary actions, refraction, follow-ups |
| `success` / `success/10` / `success/30` | Treated/done state, active employees |
| `warning` / `warning/15` / `warning/20` | Pending/next state, caution, leave counts |
| `destructive` / `destructive/10` | Errors, absent status, deletions |
| `info` / `info/10` | Checked-in stage, informational |
| `muted` / `muted-foreground` | Disabled, inactive, secondary labels |
| `border` | Default border |
| `foreground` | Main text |

## Badges and Status Pills
- Format: `rounded-full px-3 py-1 text-xs font-semibold`
- Color: always use `bg-{token}/10 text-{token}` (soft fill + matching text)
- Example: active employee = `bg-success/10 text-success`, absent = `bg-destructive/10 text-destructive`
- Count badges in section headers: `flex h-5 min-w-5 items-center justify-center rounded-full bg-warning/15 px-1.5 text-[11px] font-semibold text-warning tabular-nums`

## Status Strips
- `PatientMedicalStatusStrip` renders a thin colored bar at the top of patient cards.
- It is the canonical way to show patient medical state — do not duplicate this with inline badges.

## Icons
- Inline icons (in text rows): `h-3.5 w-3.5 shrink-0` with `aria-hidden`
- Standard icons (in buttons/headers): `h-4 w-4`
- Large feature icons (in quick-action tiles): `h-5 w-5` to `h-6 w-6`
- Use Lucide icons exclusively. Never introduce another icon library.
- Add `aria-hidden` to all decorative icons.

---

# Medical Software Rules

## Fast Data Entry
- Forms for high-frequency entry (AutoRef, Refraction) use compact grid layouts:
  `grid-cols-[72px_minmax(0,1fr)_minmax(0,1fr)]` on mobile, wider on `sm:`.
- Input height: `h-10` on mobile (touch), `sm:h-7` on desktop.
- Text in measurement inputs: `text-xs text-center` — numeric data needs compact, centered fields.
- Tab order must follow left-to-right eye (OD then OS) then parameter type.

## Low Click Count
- Quick-entry dialogs for registration open directly from the board — no intermediate page.
- Patient picker appears inline; selecting a patient immediately navigates.
- Operations booking, scheduling, quick entry are all dialog-first, not page-first.
- Quick actions are always present on dashboard and today board for the logged-in role.

## Information Density
- Patient cards are compact: `rounded-lg border px-3 py-2.5`.
- Two lines of text max per patient card: name (primary, `text-sm font-semibold`) + service·doctor (`text-xs text-muted-foreground`).
- Queue stage is communicated via border+background tint (not a badge label) to save horizontal space.
- Wait times are shown in minutes, Arabic-Indic digits, abbreviated (`٣ د` not `٣ دقائق`).

## Queue Stage Color Mapping
| Stage | Label | Background | Border |
|---|---|---|---|
| `checkedIn` | تسجيل | `bg-info/5` | `border-info/30` |
| `next` | التالي | `bg-warning/5` | `border-warning/35` |
| `clinic` | عيادة | `bg-primary/5` | `border-primary/30` |
| `treated` | معالج | `bg-success/5` | `border-success/30` |

## Patient Workflow
- Entry point: Quick Entry Dialog → creates patient → automatically sets queue to `checkedIn`.
- Board columns are scrollable, sorted by wait time descending (longest wait first).
- "Mark treated" is a one-click action on the card — no confirmation dialog (low-risk, reversible).

## Reception Workflows
- Must always see: today's queue, quick-entry button, booking button.
- Quick links order: Register → Book Appointment → Measurements → Operations Booking.
- Date picker on today-board defaults to today; changing date shows historical data.

## Accounting Workflows
- Quick links grouped in rows of 4: Cashbook → Advances → Daily Revenue → Receipts Search.
- Money always formatted with `formatMoneyAr()`: Eastern Arabic-Indic digits, Arabic currency label.
- Entry forms (income/expense) are always visible on the accounting home screen — never behind a modal.
- Tab between cashbook and service-entry mode is top-level, not buried.

## Operation Booking Workflows
- Booking dialog is launched from both dashboard and today board.
- After saving, the operations list invalidates automatically.
- Date fields default to today.

---

# Dashboard Rules

## Stat Tile Grid
- Always `grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4`
- Tile structure: border + rounded-lg + icon (left) + label + value
- Value: `text-2xl font-bold tabular-nums`
- Label: `text-xs text-muted-foreground`
- Icon wrap: `rounded-md h-9 w-9` with semantic token bg (`bg-primary/10 text-primary`, etc.)

## Quick Actions
- Rendered above the queue/stat content — always at top of the page
- Role-filtered: reception sees registration + booking; doctor sees medical file + prescription
- Button color codes: primary (registration/file), secondary (follow-up/refraction), success (operations), warning (prescriptions)
- Buttons use `rounded-md` not `rounded-full`

## Panel Layout
- Dashboard panels are bordered cards with `SectionHeader` + padded body
- Each panel has a "view all" link (`PanelLink`) at the footer when content is truncated
- Panel max-height for lists: `max-h-48 overflow-y-auto`

## Stats Placement
- Today summary tiles: top of main content area
- Service breakdown chart (bar progress): below tiles
- Activity feed / queue: below charts
- Historical totals (all-time counts): sidebar or secondary panel

## Scrolling
- Main dashboard does not paginate or infinite-scroll — it shows a fixed, data-complete snapshot
- Real-time sections (queue, live punches) update via polling or WebSocket without scroll reset

## Section Ordering (Medical Dashboard)
1. Quick Actions (immediately visible on load)
2. Today stat tiles (4 numbers)
3. Service breakdown (progress bars)
4. Queue board / patient list
5. Operations count
6. Historical totals (collapsible or sidebar)

---

# Tables Rules

## General Table Style
- Use `AccountingOpReport.module.css` for accounting print tables
- Web tables: dense, `text-sm`, `py-2` row height
- Header: `text-xs font-semibold text-muted-foreground uppercase tracking-wide border-b`
- Rows: zebra striping is optional; rely on hover state (`hover:bg-muted/30`) instead
- Numbers: always `tabular-nums text-right` (or `text-left` in RTL context as appropriate)

## Sorting
- Client-side sort for lists under ~200 rows
- Sort indicator: icon only (ChevronUp/ChevronDown) — no text labels
- Default sort: date descending (most recent first)

## Filtering / Search
- Search input at top of table, full-width on mobile
- Filter selects next to search on desktop, stacked on mobile
- URL-persisted filters (use `useSearch` + `useLocation` from wouter)

## Pagination vs Infinite Scroll
- Accounting reports: server-side with limit=50 default, no infinite scroll
- Medical patient lists: server-side cursor or limit; not infinite scroll
- Live boards (queue, punches): fixed limit (last 50-100), auto-updating via polling

## Sticky Headers
- Tables with more than ~10 rows should have sticky `thead`
- Accounting table rows: `position: sticky; top: 0` header on print preview

## Sticky Columns
- Not implemented in current codebase; do not introduce without explicit request.

---

# Mobile Rules

## Touch Targets
- All interactive elements: minimum `h-10` on mobile
- Input fields: `h-10` mobile → `sm:h-7` desktop (observed in NewCases.tsx)
- Buttons: `h-10` mobile, can reduce to `h-9` on `sm:`

## Dialogs on Mobile
- Use shadcn/ui `Dialog` for desktop, `Sheet` (bottom sheet) for mobile-primary flows
- Dialog max-width: `sm:max-w-md` or `sm:max-w-lg`; never wider than viewport on mobile
- Sheet: `side="bottom"` with `rounded-t-xl`

## Responsive Tables
- On mobile: hide non-critical columns; show name + primary value only
- Use horizontal scroll (`overflow-x-auto`) rather than wrapping table cells
- Never shrink text below `text-xs` to fit a table on mobile

## Responsive Cards
- Stat tiles: `grid-cols-2` on mobile, `sm:grid-cols-4` on desktop
- Quick action tiles: `grid-cols-2` or `grid-cols-3` on mobile

## Spacing on Mobile
- Page padding: `p-4` on mobile, `p-6` on desktop
- Stack flex items: `flex-col sm:flex-row`

## Orientation
- The app tracks orientation (`portrait` / `landscape`) in App.tsx
- Landscape on tablet: show queue board columns side-by-side (the Bottleneck Board is already designed for this)

---

# Things The User Frequently Rejects

1. **Hardcoded hex colors** — every color must be a semantic token or Tailwind palette alias
2. **Extra abstractions** — new wrapper components, new helper files not needed by the task
3. **English UI labels** replacing existing Arabic ones — UI language is preserved per-screen
4. **Confirmation dialogs for low-risk, reversible actions** (e.g. mark-treated)
5. **Page-level navigation chrome inside module shells** — shell handles the nav
6. **Raw `bg-white` or `bg-gray-100`** as page/card backgrounds
7. **Hardcoded dimensions** (e.g. `width: 300px`) — use Tailwind responsive utilities
8. **Importing accounting components into medical pages** or vice versa
9. **Duplicate state-badge patterns** when `PatientMedicalStatusStrip` already exists
10. **Non-tabular number formatting** — all numbers must use `tabular-nums`

---

# Things The User Frequently Requests

1. **Compact, dense layouts** — more content visible without scrolling
2. **Role-filtered quick actions** that are always a single click away
3. **Arabic-first UI text** with Eastern Arabic-Indic digits for money
4. **Semantic color tokens for every status** — no plain gray for meaningful states
5. **Skeleton loading states** instead of spinners
6. **Responsive grids** (`grid-cols-2 sm:grid-cols-4`) over fixed-column layouts
7. **Truncation + tooltip** for long names, not text wrapping
8. **`PatientMedicalStatusStrip`** on any patient card that shows queue status
9. **In-page quick-entry** dialogs, not full navigation to a separate registration page
10. **Print-compatible accounting tables** that match legacy OP report structure row-for-row

---

# AI Design Decision Framework

## What to optimize first: Correctness of access control and data routing
Before any layout change: verify `ProtectedRoute` gating is unchanged. Verify backend
procedure permissions are untouched. Medical and accounting modules must remain separated.

## What to optimize second: Information density and low click-count
The UI serves clinic staff under time pressure. Every extra click, scroll, or visual
search is a cost. Prefer visible over hidden, inline over modal, compact over spacious.

## What to never change without approval
1. `ProtectedRoute` gating (any role change breaks access control)
2. URL/route paths (deep links exist in printed materials and mobile bookmarks)
3. Arabic UI text (translation is a deliberate product decision, not a cosmetic issue)
4. `PatientMedicalStatusStrip` appearance (clinical meaning encoded in color)
5. Accounting print layout (must match legacy `.rtm` report output exactly)
6. `formatMoneyAr()` and `formatCountAr()` helpers (Eastern Arabic-Indic digits are required)
7. The queue stage color mapping (checkedIn=info, next=warning, clinic=primary, treated=success)

---

# SRV100 UI Commandments

> Concrete rules every AI agent must follow when touching any `.tsx` or `.css` file
> in this project. These are inferred from repeated patterns in the actual codebase.

1. **RTL is non-negotiable.** Every new page or component must carry `dir="rtl"`.
   Never add `dir="ltr"` to a top-level container without an explicit instruction.

2. **Use `selrs-page-bg` as the page background.** Never use `bg-white`, `bg-gray-50`,
   or any hardcoded background color on a page-level container.

3. **Semantic tokens only.** Never write `text-green-600` when `text-success` exists.
   Never write `bg-yellow-100` when `bg-warning/10` exists. Token violations will be reverted.

4. **Keep Arabic labels.** If the current screen has Arabic UI text, keep it Arabic.
   Do not translate to English unless the entire screen is already in English.

5. **`tabular-nums` on every number.** Any element displaying a numeric value
   (count, money, ID, percentage) must have `tabular-nums` in its class list.

6. **Skeleton loading, not spinners.** Loading states use `<Skeleton>` from shadcn/ui.
   Do not introduce a `<Spinner>` or `<Loader>` where Skeletons are already the convention.

7. **Two-line max for patient cards.** Patient list items: line 1 = name (`font-semibold text-sm`),
   line 2 = service + doctor (`text-xs text-muted-foreground`). No third line.

8. **Icons are `h-3.5 w-3.5 shrink-0 aria-hidden` in rows.** Standard icon in text rows.
   Never omit `shrink-0` — icons must not flex-shrink in tight layouts.

9. **`h-10` on mobile, `sm:h-7` on desktop for measurement inputs.** Observed in
   NewCases.tsx for all measurement/refraction selects and inputs. Apply this pair to
   any new compact data-entry input.

10. **Don't add confirmation dialogs to mark-treated or similar single-click
    reversible actions.** The UX cost outweighs the safety benefit in a clinical workflow.

11. **Quick actions are role-gated, not visibility-hidden.** When showing fewer actions
    to a role, filter the array. Do not use CSS `hidden` on unauthorized buttons.

12. **Queue stage = border + background tint, not text badges.** The stage is
    communicated through the card's border and fill color (see STAGE_META). Do not add
    a stage-label badge to patient cards — it is redundant and clutters the layout.

13. **Accounting money = `formatMoneyAr()`; counts = `formatCountAr()`.** Never use
    `toLocaleString('en-US')` or plain `.toFixed(2)` for financial output.

14. **Print tables must match legacy OP output.** Accounting print reports use
    `AccountingOpReport.module.css` and must match row-for-row with legacy `.rtm` files.
    Do not reorder columns, reformat column headers, or add/remove subtotals.

15. **Patient portal uses `rounded-2xl` and `border-[#dbe7f4]`.** External-facing
    patient portal cards are softer (rounded-2xl, blue-tinted border, hover shadow).
    Internal staff UI uses `rounded-lg` and `border-border`. Do not mix these.

16. **No new icon libraries.** Lucide icons only. If a needed icon does not exist in
    Lucide, use the closest Lucide alternative — do not install another library.

17. **`truncate` for names in tight layouts; never multi-line wrap inside cards.**
    Long patient names must `truncate` with `min-w-0 flex-1`. No wrapping in compact cards.

18. **Do not widen or narrow access control when renaming or moving routes.**
    `ProtectedRoute` wrappers and `requiredRoles` props must be copied verbatim when
    restructuring route paths.

19. **`border-b border-border/40 px-4 py-2.5` is the section header bar.**
    Every in-card section header uses this exact class sequence. Do not invent a
    different header style for new panels.

20. **The app already has a Mobile QA system (`mobileQa.ts`) that flags overflow.**
    Before shipping any layout change, verify that no element overflows its container
    by checking that `markOverflowInSheets()` returns 0 (or enable the QA watcher via
    the dev toggle). Do not merge a layout change that introduces overflow regressions.
