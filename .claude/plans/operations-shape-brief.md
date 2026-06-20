# Operations Page Shape Brief

## 1. Feature Summary

A receptionist-daily-driver page for managing LASIK/corneal surgery operations at SELRS center. The receptionist creates bookings, manages per-doctor operation lists (add patients, edit details, save), and views financial summaries. Currently a 3-tab x 4-mode matrix (12 states) that needs radical simplification into a single coherent workflow.

## 2. Primary User Action

**Book an operation, then manage the day's list.** The receptionist's daily loop is: check today's bookings, add patients to the doctor's list, verify totals, and print/export. Everything else supports this loop.

## 3. Design Direction

- **Color strategy**: Restrained (tinted neutrals + orange accent ≤10%). Matches the dashboard and medical file panel already redesigned. This is a workhorse data page, not a showcase.
- **Theme**: Light always. Receptionist at a bright front desk, under fluorescent clinic lighting, managing patient flow during busy hours. Speed and clarity matter more than visual interest.
- **Anchor references**: Notion's database views (clean density, inline editing), Linear's list views (compact rows, clear hierarchy), a surgical schedule whiteboard (the real-world analogue this replaces).
- **Scene sentence**: "A receptionist at a bright front-desk monitor, managing a constant stream of patients during peak clinic hours, needing to find, add, and verify operation entries in seconds without thinking about the interface."

## 4. Scope

- **Fidelity**: Production-ready. Ship to the receptionist.
- **Breadth**: Full page: bookings, lists, inline accounts, history. All 4 current functions.
- **Interactivity**: Shipped-quality React components with existing tRPC hooks.
- **Time intent**: Polish until it ships.

## 5. Layout Strategy

### Navigation simplification

**Before**: 3 doctor tabs (Saadany, Sawaf, Others) x 4 view modes (list, table, accounts, history) = 12 state combinations.

**After**: Doctor selector + 2 views.

- **Doctor selector**: Compact pill row or dropdown at the top. Three options: د. محمد السعدني | د. احمد الصواف | خارجي. Preserves data model (different pricing, different accounting rules per doctor) without tab chrome.
- **Main view (default)**: The live operation list for the selected doctor on the selected date. Includes:
  - Date/time controls in a slim toolbar row
  - Patient search + add inline (not a separate dialog for the core action)
  - Editable operation table (same data fields as current OperationsTable)
  - Bookings section (for "Others" tab) integrated above or below the list
  - **Collapsible financial summary** at the bottom (replaces the entire "accounts" view mode). Shows totals, per-patient breakdown on expand.
- **History view**: Toggle to browse saved lists. Searchable, grouped by operation type. Load button to pull a saved list into the main view.

### Visual hierarchy

1. **Top**: Doctor selector + date picker + action bar (save, print, export, new list)
2. **Middle**: The operation list table (dominant, most screen space)
3. **Bottom**: Financial summary (collapsible), only when relevant
4. **History**: Separate toggle/section, not a view mode

### Spacing rhythm

- Tight table rows (12px padding) for data density
- Breathing room between sections (24px gaps)
- Slim toolbar, not a fat dialog header

## 6. Key States

| State | What the user sees |
|-------|--------------------|
| **Default** | Today's date, first doctor selected, list table (empty or populated) |
| **Loading** | Skeleton rows in the table area, no spinners |
| **Empty list** | Helpful empty state: "لا توجد عمليات مسجلة لهذا التاريخ" with quick-add prompt |
| **Empty bookings** | Subtle "لا توجد حجوزات" message in bookings section |
| **Active editing** | Inline editable rows with clear focus states |
| **Saving** | Button loading state, no full-page blocking |
| **Auto-save on** | Visual indicator (small dot or label) that auto-save is active |
| **Accounts expanded** | Financial summary slides open below the table |
| **History browsing** | History section replaces or overlays the main list |
| **Error/offline** | Inline error banner with retry, matches dashboard's OfflinePageState |
| **Print mode** | Clean print stylesheet (already exists via reportStyles) |

## 7. Interaction Model

- **Doctor switching**: Click pill/selector. List reloads for new doctor. No page transition.
- **Date change**: Date input in toolbar. List reloads. Bookings update.
- **Add patient**: Type in search field, results appear inline below, click to add row to table. No modal for the core flow.
- **Edit row**: Click cell to edit inline (same as current OperationsTable behavior). Tab to move between cells.
- **Save**: Toolbar button. Confirmation toast. Auto-save option available.
- **Print/export**: Toolbar dropdown or button group. Generates JPG/share as current.
- **Financials**: Click "الحسابات" chevron/tab at table bottom. Summary expands. Click again to collapse.
- **History**: Click history toggle. List view hides, history cards appear. Click "load" on a history item to populate the main list.

## 8. Content Requirements

### Labels (Arabic primary)
- Page title: "العمليات" (keep current)
- Doctor pills: "د. محمد السعدني" | "د. احمد الصواف" | "خارجي"
- Toolbar: date input, time input, operation type selector
- Table headers: receipt#, name, phone, doctor, operation, eye, hospital, center, payment, code, delete
- Financial summary header: "ملخص الحسابات"
- History header: "السجل"
- Actions: حفظ, طباعة, تصدير, قائمة جديدة
- Empty states: Arabic messages as noted in Key States

### Dynamic content
- Operation types: PRK, Lasik, Moria, Metal, Femto, Cataract, Yag, Other (from operationsPricing.ts)
- Doctor names vary per tab
- Hospital column appears only for cataract operations
- Financial adjustments differ by doctor (Sawaf has extra rows)

## 9. Recommended References

- `spatial-design.md` — Complex multi-section layout with collapsible regions
- `interaction-design.md` — Inline editing, table interactions, toolbar patterns
- `product.md` — Product register: density, consistency, familiar patterns

## 10. Resolved Decisions

1. **Bookings placement**: Inline above the operation list. Bookings table shows in the main view area, above the editable list. Receptionist sees the day's scheduled operations and the live list in one scroll.
2. **History location**: Side drawer. Slides in from the right (RTL: from the left), keeps the main list visible. Click load to populate the main list from history.
3. **Quick-add + dialog**: Both available. Inline quick-add row at the top of the table for fast entry (type name, tab through fields). Dialog/picker for searching existing patients. Power users use inline, new staff use the dialog.
4. **Accounts detail level**: Full detail, collapsed by default. The collapsible section at the bottom contains the complete per-patient financial breakdown with editable discounts. Expanding reveals everything the current accounts view shows.
