# AccountingHome Redesign Brief

## 1. Feature Summary

The `/accounting` landing page is a **navigation hub** for the accounting section of the SELRS LASIK center admin platform. It gives receptionists and admins a quick financial pulse (4 real KPIs) and fast access to 7 detailed reports. It also shows today's live receipt activity as a scannable feed. All data comes from real MSSQL queries via tRPC.

## 2. Primary User Action

**Navigate to the right report quickly.** The user opens this page, glances at today's numbers for confidence, then clicks through to the specific report they need. The page is a launchpad, not a destination.

## 3. Design Direction

- **Color strategy**: Restrained. Tinted neutrals with orange accent used only on financial amounts and primary interactions. Numbers should feel authoritative and weighty without being flashy.
- **Scene sentence**: "Accountant opens the hub at 9am in a bright clinic office to confirm today's receipts look normal before the morning rush, then clicks through to the daily revenue report."
- **Anchor references**:
  1. **Wise account overview** - Compact financial numbers with clear navigation below
  2. **Xero dashboard** - Professional financial hub, warm but authoritative
  3. **Monzo recent transactions** - Scannable activity feed with personality

## 4. Scope

- **Fidelity**: Production-ready
- **Breadth**: Single page (AccountingHome)
- **Interactivity**: Shipped-quality with loading/empty/error states
- **Time intent**: Ship it

## 5. Layout Strategy

**Top-down hierarchy, two zones:**

**Zone 1: Metric ribbon (full width)**
A single horizontal strip with 4 metric pairs. Not cards. Not a grid of boxes. A thin, dense ribbon: "إيراد اليوم: ٤,٥٠٠.٠٠  |  إيصالات: ١٢  |  إيراد الشهر: ٨٥,٠٠٠.٠٠  |  إيصالات: ٢٤٠". Each number is clickable (navigates to relevant report). This should feel like a stock ticker strip, not a card grid. Subtle background tint to separate it from the content below.

**Zone 2: Two-column layout (activity feed + report list)**

Left column (dominant, ~65%): Today's activity feed. A scannable vertical list of today's receipts. Each row shows: time, receipt number, patient name, amount, paid status. Newest first. Max 15-20 rows. Clickable rows navigate to receipt detail. Live indicator dot at the top.

Right column (secondary, ~35%): Report shortcuts. A compact vertical list of the 7 reports. Each item is a horizontal row with a small icon badge, report name, and brief description. Clean, dense, no cards. Just rows with hover states.

On mobile: single column, metrics ribbon wraps, activity feed first, reports below.

## 6. Key States

| State | What user sees |
|-------|---------------|
| **Loading** | Metric ribbon shows skeleton bars. Activity feed shows centered spinner. Reports list is visible immediately (static config). |
| **Has data** | Full metric ribbon with real numbers. Activity feed with receipt rows. Reports list. |
| **Empty (no receipts today)** | Metric ribbon shows 0s. Activity feed shows "لا توجد حركات اليوم" with subtle note "ستظهر الإيصالات هنا تلقائياً". Reports list always visible. |
| **Error** | Metric ribbon shows dashes. Activity feed shows inline error with retry button. Reports list always visible (it's static). |
| **Fetching (background)** | Small spinner or refresh icon near the activity feed header. Metrics remain showing stale data until fresh data arrives. |

## 7. Interaction Model

- **Metric ribbon numbers**: Clickable. Navigate to the relevant report (today's revenue → daily revenue, month's revenue → service revenue, etc.)
- **Activity feed rows**: Clickable. Navigate to receipt detail `/accounting/receipts/:secCd/:trTy/:trNo`. Hover highlights the row. Keyboard accessible (Enter/Space).
- **Report items**: Clickable. Navigate to report page. Hover shows subtle background.
- **Auto-refresh**: Activity feed polls every 60s. Metrics refresh on window focus. Green dot pulses when connected.
- **No modals, no date pickers, no form inputs on this page.** It's read-only + navigation.

## 8. Content Requirements

**Metric ribbon labels** (Arabic):
- إيراد اليوم (today's revenue, money)
- إيصالات اليوم (today's count, number)
- إيراد الشهر (month revenue, money)
- إيصالات الشهر (month count, number)

**Activity feed header**: "حركات اليوم" with count badge and live dot

**Activity row columns**: الوقت · الإيصال · المريض · المبلغ · الحالة (paid/remaining)

**Empty state**: "لا توجد حركات اليوم" + "ستظهر الإيصالات هنا تلقائياً"

**Error state**: "تعذر تحميل البيانات" + retry link

**Report items** (existing 7):
1. الإيراد اليومي - مراجعة الإيرادات حسب اليوم
2. إيراد الخدمات - إجماليات الطبيب والخدمة
3. استعلام الإيصالات - البحث عن رؤوس الإيصالات
4. الخدمات - حركة خدمات الليزك
5. استعلام المرضى - بحث المرضى والإيصالات
6. حساب مريض - بحث حساب مريض
7. حساب طبيب - بحث حساب طبيب

## 9. Recommended References

- `reference/product.md` (register reference)
- `reference/spatial-design.md` if it exists (two-column layout)
- `reference/interaction-design.md` if it exists (clickable rows, navigation patterns)

## 10. Resolved Questions

- **KPI tile navigation**: YES. Clicking a metric navigates to the relevant report.
- **Section name in activity feed**: NO. Default section 15 (LASIK) only.
- **Activity feed included**: YES (user did NOT select "No activity feed" anti-goal).
- **Visual richness welcome**: YES (user did NOT select "No SaaS cliché" but the hero-metric template remains banned per impeccable rules).
