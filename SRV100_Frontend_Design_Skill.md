# SRV100 Frontend Design Skill

> **Purpose:** Reusable AI design reference for the SELRS / SRV100 clinic management system.
> Apply these rules in every UI change, regardless of which AI tool is being used.
> Brand: SELRS — Navy blue (#003D82) primary, orange (#FF9500) accent. Light-only app (dark mode exists but is a fallback, not a target). RTL-first.

---

## Design Philosophy

The interface serves clinic staff under real-time pressure: receptionists registering patients, doctors reading exam results, accountants reconciling payments. Speed and clarity dominate aesthetics. Every pixel that doesn't reduce friction or convey status is a liability. The style is dense-but-readable — not sparse, not decorative.

Key repeated patterns across the codebase reveal these values:
- **Zero wasted clicks.** Shortcuts for every common action on the dashboard.
- **State at a glance.** Color-coded status strips, badges, and icon dots answer "what's happened to this patient?" without opening a detail view.
- **Drawer > dialog for data entry.** Accounting entries, loan edits, and service drawers all use slide-in panels, not disruptive full modals.
- **Semantic tokens, never raw colors.** `text-warning`, `bg-success/15`, `text-destructive` — always. Never `text-amber-500` or inline hex.
- **Arabic-first copy, RTL layout.** UI text is Egyptian colloquial Arabic. English only for technical labels (service codes, device names).

---

## Layout Rules

### Spacing & Padding
- Page wrapper: `selrs-page-bg` class with `p-4 sm:p-6` or `px-4 py-6`.
- Section-to-section gap: `space-y-4` (tight) to `space-y-6` (comfortable). Never `space-y-8` inside a page.
- Card internal padding: `p-3` (compact, data cards) · `p-4` (standard) · `px-4 py-3` (header rows).
- Grid gaps: `gap-3` (tight grid) · `gap-4` (standard) · `gap-5` (wide separations).
- Inline icon-label gap: `gap-1.5` (icon + text in a badge) · `gap-2` (normal) · `gap-3` (spacious action rows).

### Card Density
- Stat cards: `px-3 py-2.5` — extremely compact. Value in `text-2xl font-bold`, label in `text-xs`.
- Patient list cards (mobile): `px-3 py-3` — tight. Three lines max before expand.
- Section cards: `rounded-lg border border-border/50 bg-background shadow-sm` — white background, thin border, light shadow.
- Hover state on interactive cards: `hover:border-primary/25 hover:bg-accent/30` — primary color hint, warm orange tint.

### Table Density
- Desktop table rows: `py-2 px-4` or `py-2.5 px-4`. Single-line data rows, no excessive row height.
- Table header: `bg-muted/60 text-muted-foreground text-xs`.
- Alternating rows: avoided — use `hover:bg-primary/5` instead of zebra striping.

### Sticky Behavior
- **Sticky table headers:** always, using `sticky top-0 z-10 bg-background`.
- **Sticky action bar / page header:** sticky on scroll for long pages.
- **Quick actions bar on dashboard:** always visible, never hidden behind scroll.
- **Sidebar:** always visible on desktop, collapses to off-canvas on mobile.

### Responsive & Mobile Behavior
- Mobile breakpoint: `sm` (640px).
- Mobile-first grids: `grid-cols-2 sm:grid-cols-4`, `grid-cols-1 sm:grid-cols-3`.
- On mobile, tables collapse to card lists with `PatientMedicalStatusStrip` at the top edge.
- Pull-to-refresh on mobile list pages (`PullToRefresh` component).
- Mobile dialogs: full-screen or bottom-sheet style, not centered modals.

### Desktop Behavior
- Content max-width: `container mx-auto` or free-width within shell.
- Three-column dashboard: `grid-cols-1 gap-5 lg:grid-cols-3` with main content spanning `lg:col-span-2`.
- Sidebar always rendered. Top nav shows breadcrumbs and user avatar.

---

## Visual Style Rules

### Borders
- Standard card border: `border border-border/50` or `border border-border/70` — always semi-transparent.
- Active/focus borders: `border-primary/25` (hover) · `ring-2 ring-primary/50` (focus).
- Dividers: `border-b border-border/40` — not full opacity, never heavy.

### Shadows
- Cards: `shadow-sm` default · `hover:shadow-md` on interactive cards.
- No `shadow-lg` or `shadow-xl` in data interfaces. Those are for login/landing.
- Dropdowns and popovers: `shadow-md`.

### Rounded Corners
- Standard: `rounded-lg` (cards, buttons, inputs).
- Small chips/badges: `rounded-full` or `rounded-md`.
- Progress bars and strip indicators: `rounded-full`.
- Tab lists: `rounded-3xl` (the pill-shaped tab container).
- Icon containers: `rounded-md` (square-ish) or `rounded-full` (circular avatar style).

### Cards
- Background: `bg-background` (white in light mode).
- Surface variant: `bg-card` for slightly off-white sections.
- Muted background: `bg-muted/30` or `bg-muted/20` — never solid muted.

### Colors & Semantic Tokens
Always use design tokens. Never use Tailwind raw color scales for semantic meaning:

| Meaning | Token |
|---|---|
| Primary action / navy | `bg-primary` / `text-primary` |
| Secondary / orange accent | `bg-secondary` / `text-secondary` |
| Success / done | `bg-success` / `text-success` / `bg-success/15 text-success` |
| Warning / attention | `bg-warning` / `text-warning` / `bg-warning/15 text-warning-foreground` |
| Info / neutral status | `bg-info/15 text-info` |
| Error / destructive | `bg-destructive/15 text-destructive` |
| Muted label | `text-muted-foreground` |

**Never:** `text-amber-500`, `text-yellow-600`, `text-green-500`. Always map to `text-warning`, `text-success`.

### Badges
- Soft badge (status pill): `rounded-full px-2 py-0.5 text-xs font-semibold bg-{token}/15 text-{token}`.
- Hard badge (count): `rounded-full bg-warning/15 px-1.5 text-[11px] font-semibold text-warning tabular-nums`.
- Status badges use exact color map: draft=muted, published=success, failed=destructive, scheduled=info.

### Status Strips
- `PatientMedicalStatusStrip`: 3px top-edge horizontal bar, split into segments by color.
- Colors: autoref=success, glasses=primary/50, pentacam=destructive, prescription/tests/reports=secondary, empty=muted.
- Used on every patient card in lists and bottleneck board. Required, not optional.

### Icons
- Library: Lucide React exclusively.
- Size in actions: `h-4 w-4` standard · `h-3.5 w-3.5` in dense/small contexts.
- Icon-only buttons: always have `aria-label`.
- Icon color: inherit from parent text color or set explicitly via `text-{token}`.
- No decorative emojis in the app UI.

---

## Medical Software Rules

### Fast Data Entry
- Patient registration: one form, `QuickPatientEntryForm`, minimal fields, primary CTA is full-width `h-10 text-lg`.
- Examination form: tabbed (Pentacam, Autorefraction/Airpuff, Patient Info) — tabs are scrollable, each section is self-contained.
- Refraction fields default to `----` (not empty, not zero). Users navigate with combobox.
- Autofocus on the first input in every dialog/drawer on open.

### Low Click Count
- Dashboard quick-actions panel: always visible. 12 actions accessible in one click.
- Medical file launcher: single picker dialog opens any patient flow.
- Drawer-based entry (accounting, scheduling) never requires navigating away.
- "Next action" buttons always present at bottom of step-based flows.

### Information Density
- Patient cards show: name, file number, service type, doctor, queue status, medical status strip — all without expanding.
- Bottleneck board shows all stages simultaneously (checkedIn, next, clinic, treated) in side-by-side columns.
- Stats cards: 4-across on desktop (sm:grid-cols-4), 2-across on mobile.

### Patient Workflows
- Patient intake → queue status → clinic → treated is the canonical flow.
- Status colors are fixed: checkedIn=info, next=warning, clinic=primary, treated=success.
- Operations booking uses a quick dialog, not a separate page.
- Patient medical status strip is the single visual indicator of "has data" — it replaces verbose text labels.

### Reception Workflows
- Reception role sees: quick-entry, schedule visit, today queue, patient search.
- Table filters and tabs are always visible, not hidden behind a "filter" button.
- Search suggestions appear inline below the search input, keyboard-navigable.

### Accounting Workflows
- Accounting home is a hub with quick-link groups (2 columns, 4 rows each).
- Entry/edit uses a slide-in drawer (not a modal or page navigation).
- Money formatted via `formatMoneyAr()` — Egyptian pound notation.
- Daily revenue, cashbook, advances, loans each have their own page. No mega-pages.

### Operation Booking Workflows
- `OperationsBookingQuickDialog` — accessible from dashboard and today-patients.
- Date defaults to today (`getLocalDateIso()`).
- Confirmation/success reloads the operations list, not the whole page.

---

## Dashboard Rules

### Shortcut Placement
- Quick actions: top of dashboard content area, horizontal scrollable row.
- Role-based: reception sees entry+schedule; doctor sees medical shortcuts; admin sees all.
- Always above the queue/appointment section.

### Card Placement
- Order (top to bottom): Quick Actions → KPI stats row → Queue/Appointments → Charts.
- Attendance and leave summary: right column (lg:col-span-1), alongside charts.
- Charts lazy-load with `<Suspense>` and `animate-pulse` skeleton placeholder.

### Statistics Placement
- KPI stat cards: `grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4` — 4 cards in a row on desktop.
- Stats always above charts and lists.
- Stat card anatomy: icon container (colored bg-{token}/10) + label (text-xs muted) + value (text-2xl font-bold).

### Scrolling Behavior
- Dashboard page scrolls as a whole; section panels do not have internal scroll unless a list exceeds `max-h-48` (e.g., absence list).
- Do not split dashboard into separate scroll containers.

### Section Ordering
1. Quick actions
2. Today stats (patients, operations, services counts)
3. Scheduler / today queue
4. Trend charts
5. Secondary sections (attendance, operations, alerts)

---

## Tables Rules

### Sorting
- Sortable columns have a sort icon. Clicking cycles: none → asc → desc.
- Default sort: most recent first (by date or ID desc).

### Filtering
- Filters displayed as tab row (not a sidebar or collapse panel).
- Active filter tab: `bg-primary text-primary-foreground` pill.
- Multiple filter dimensions (date range, doctor, service type) shown inline above table.

### Search
- Search input always visible above the table, never inside a filter dropdown.
- Suggestions appear as a dropdown list below the input.
- Keyboard navigation: ArrowUp/ArrowDown through suggestions, Enter to select.
- Debounced at 300ms.

### Pagination
- Cursor-based pagination with "Load More" button at bottom of table.
- Never traditional page-number pagination for large datasets.
- Button: `variant="outline" rounded-lg` · disabled when no more pages.
- Show current count vs total if available.

### Infinite Scrolling
- Not used for primary tables — explicit "Load More" is preferred for predictability.
- Exception: PostHistory and DraftPosts (marketing) use explicit load-more with 25-item pages.

### Sticky Columns
- First column (patient name/ID) sticky on desktop for wide tables.
- Actions column sticky on the end.

### Sticky Headers
- Always. `sticky top-0 z-10` with `bg-background` or `bg-muted/60` matching header style.

---

## Mobile Rules

### Dialogs
- Full-height sheet or bottom-sheet; not center-screen floating modals.
- `DialogContent` with vertical scroll when content is long.
- Primary action button: full-width at bottom.
- Secondary (cancel): ghost, above primary or alongside.

### Spacing
- Reduce padding by one step on mobile: `p-4 sm:p-6`, `gap-3 sm:gap-4`.
- Text stays readable: minimum `text-sm` in data rows.

### Touch Targets
- Minimum touch target: `h-9 w-9` (36px) for icon-only buttons.
- Primary CTA buttons in forms: `h-10` minimum, full-width when inside a dialog.
- List items: minimum `py-3` to ensure 44px+ tap area.
- Delete/destructive icon buttons: `h-9 w-9` (increased from 28px → 32px → 36px per audit).

### Responsive Tables
- On mobile (`< sm`), tables collapse to card format.
- Card shows top-priority data: name, date, status, primary action.
- Expand/collapse chevron for secondary data.
- `PatientMedicalStatusStrip` always at card top edge.

### Responsive Cards
- Stat cards: `grid-cols-2` on mobile, `grid-cols-4` on desktop.
- Action cards: stacked column on mobile, side-by-side on desktop.
- Card tap area is the whole card, not just a button inside it.

---

## Things The User Frequently Rejects

1. **Eyebrow labels** (`uppercase tracking-wide text-xs` section headers above content blocks) — removed from MarketingDashboard preview panel.
2. **Raw color classes for semantic meaning** — `text-amber-500`, `text-yellow-600`, `text-green-500` rejected every time. Must use `text-warning`, `text-success`.
3. **Dead dark-mode variants on light-only pages** — `dark:bg-*` and `dark:text-*` in marketing pages stripped.
4. **Traditional numbered pagination** — cursor-based load-more is the standard.
5. **Large result sets without pagination** — query limit 25-100 enforced; load-more button required.
6. **Separate page navigation for data entry** — drawers/dialogs always preferred over navigating away.
7. **Icon-only buttons without aria-label** — a11y requirement, rejected without exception.
8. **Touch targets smaller than 36px (h-9)** — bumped from 28px, 32px to 36px per explicit audit feedback.
9. **`loading="eager"` on post/brand images** — lazy loading required.
10. **Subjective "clean up" refactors alongside bug fixes** — changes must be scoped to the task.

---

## Things The User Frequently Requests

1. **Medical status strip on every patient card** — thin 3px top-edge color bar, always.
2. **Quick-action shortcuts at the top of dashboard** — role-based, always above the queue.
3. **Drawer-based entry for accounting** — slide-in panel, never a new page.
4. **Egyptian colloquial Arabic for all UI text** — not Modern Standard Arabic, not English.
5. **Semantic color tokens** — `text-warning`, `bg-success/15 text-success`, never raw Tailwind scales.
6. **Bottleneck board with all queue stages simultaneously** — columnar, color-coded by stage.
7. **RTL layout (dir="rtl")** — Arabic text, all pages, default.
8. **Accessible icon-only buttons** — `aria-label` on every icon button.
9. **`aria-live` on dynamic lists** — loading state feedback for screen readers.
10. **Load-more pagination** — 25–100 items per page with explicit load-more button.
11. **Soft badge style** — `bg-{token}/15 text-{token}` — never solid-filled for status labels.
12. **Skeleton loaders** — `animate-pulse rounded-lg bg-muted/40` while data loads.

---

## AI Design Decision Framework

### 1. First, optimize for: **Task completion speed**
How many clicks/taps does the user need to complete their primary task? Reduce this to the minimum. Every dialog, step, or navigation adds friction. Inline actions, quick dialogs, and persistent shortcuts beat page navigations.

### 2. Second, optimize for: **Status legibility**
Can the user read the state of the system (queue status, patient status, payment status) in under two seconds without clicking anything? Use color tokens, status strips, and icon dots. Do not hide status behind tooltips or expandable rows on the primary list view.

### 3. Never change without approval:
- The color token system (the mapping of `--success`, `--warning`, `--primary`, `--secondary`).
- The `PatientMedicalStatusStrip` color semantics (which color means which data type).
- Queue status color assignments (checkedIn=info, next=warning, clinic=primary, treated=success).
- The `selrs-page-bg` page background definition.
- RTL layout direction on any patient/medical/accounting page.
- The role-based access filtering of quick actions.

---

## SRV100 UI Commandments

1. **Use semantic color tokens always.** `text-warning` not `text-amber-500`. `text-success` not `text-green-600`. No exceptions.

2. **Every icon-only button gets `aria-label`.** No silent icon buttons, ever.

3. **Touch targets are 36px minimum.** `h-9 w-9` for icon buttons. `h-10` for primary CTA in forms.

4. **RTL is the default.** Every patient, medical, accounting, and reception page has `dir="rtl"`. Never add `dir="ltr"` to an Arabic-content block.

5. **No dead dark-mode variants.** The app is light-only. Strip `dark:*` classes on pages that don't participate in dark theming.

6. **`loading="lazy"` on all post and image grid images.** Never eager-load image galleries.

7. **Drawer over dialog over navigation.** For data entry: slide-in drawer > centered dialog > new page. Navigate only when the task is a full workflow, not a single CRUD action.

8. **Load-more over pagination.** Cursor-based with a "Load More" button. Never classic page numbers for large datasets.

9. **Status strip on every patient card.** `PatientMedicalStatusStrip` at the top edge. 3px, color segments, always rendered when medical status is available.

10. **Arabic UI text is Egyptian colloquial.** "تسجيل مريض" not "تسجيل المريض" (formal). Match the existing wording of the touched screen exactly.

11. **`aria-live="polite" aria-busy` on all dynamic list containers.** Required for screen reader compatibility on every searchable/filterable list.

12. **Quick actions belong at the top.** Dashboard quick-actions row is always the first visible interactive element, never buried below stats or charts.

13. **Stats before charts, charts before lists.** KPI cards → trend charts → detail lists. Never reorder this hierarchy.

14. **Skeleton loaders, not spinners, for page-level loading.** `animate-pulse rounded-lg bg-muted/40` for card placeholders. Reserve `<Loader2 animate-spin>` for inline mutations.

15. **No eyebrow labels on data pages.** `uppercase tracking-wide text-xs` section titles are a marketing pattern. Remove from medical/accounting/reception interfaces.

16. **Soft badge style for all status indicators.** `bg-{token}/15 text-{token}` — never solid-filled backgrounds for status. Exception: action buttons, which use full `bg-{token}`.

17. **Grid gaps are `gap-3` (mobile) / `gap-4` (desktop), never larger inside a data page.** Visual breathing room comes from section spacing (`space-y-4`), not inflated grid gaps.

18. **Never widen route access or permissions in a UI refactor.** If a route is gated by `ProtectedRoute` or a role check, the gate stays unless the task explicitly requires changing access.

19. **Extend existing patterns, never introduce new abstractions.** If a nearby component does 90% of what's needed, extend it. Don't create a new component family for a one-off variation.

20. **`selrs-card` for hoverable data cards.** Use the `.selrs-card` utility class (`rounded-lg border border-border bg-card shadow-sm hover:shadow-md hover:border-accent transition-*`) for interactive card surfaces. Don't recreate these properties inline.
