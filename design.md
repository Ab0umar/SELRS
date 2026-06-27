# SELRS Design System

The single source of truth for UI in this app. Tokens live in `client/src/index.css`
(`@theme` + `:root`/`.dark`). Components live in `client/src/components/ui` (shadcn/ui +
Tailwind v4). This document explains **how to use them** — do not hardcode values that a
token already covers.

---

## 1. Principles

The app is medical software for a LASIK center. Design like it.

1. **Minimal homepage.** Don't jam everything onto one screen. Lead with the few numbers
   that matter (today's patients, queue, operations, revenue), then drill down.
2. **This is vision care, not retail.** No gimmicks, no loud marketing. Calm, precise, trustworthy.
3. **Legible above all.** It is a clinic for eyes — typography must be easy to read. Use the
   system font scale; never go below 11px for body text.
4. **Responsive by default.** Every screen must work on phone, tablet, and desktop. Sidebars
   collapse, grids reflow, tables become cards.
5. **RTL Arabic first.** UI is Arabic. Preserve existing wording. Layout flows right-to-left.

---

## 2. Color tokens

Never use raw hex in components. Use the semantic Tailwind classes that map to these
CSS variables (e.g. `bg-primary`, `text-muted-foreground`, `border-border`). They auto-adapt
to dark mode.

### Brand
| Token | Light | Meaning |
|---|---|---|
| `--primary` | `#003d82` (navy) | Primary actions, active nav, key figures |
| `--secondary` / `--accent` | `#ff9500` (orange) | Accent, highlights, secondary CTAs |
| `--selrs-dark-blue` | `#001f47` | Deepest text / headings |
| `--selrs-light-blue` | `#e8f0f8` | Soft fills, muted surfaces |

### Surfaces
| Token | Light | Use |
|---|---|---|
| `--background` | `#ffffff` | Page background |
| `--card` | `#f5f5f5` | Cards, panels |
| `--popover` | `#ffffff` | Menus, dialogs |
| `--border` | `#e5e7eb` | Hairlines, dividers |
| `--muted` | `#e8f0f8` | Subtle backgrounds |
| `--muted-foreground` | `#4b5563` | Secondary text |

### Status (always pair `*` fill with `*-text` for text on light surfaces — WCAG AA)
| Token | Light | Use |
|---|---|---|
| `--success` / `--success-text` | `#10b981` / `#047857` | Done, completed, paid |
| `--warning` / `--warning-text` | `#f59e0b` / `#92400e` | Waiting, pending, attention |
| `--destructive` / `--destructive-text` | `#ef4444` / `#b91c1c` | Errors, delete, unjustified absence |
| `--info` | `#3b82f6` | In-progress, informational |

**Dark mode** is fully defined in `.dark` — every token above has a dark counterpart. Build
with semantic classes and dark mode just works. Never special-case colors in a component.

### Department color convention (for tags/charts)
Keep these consistent across queue, tables, and charts:
- استشاري (consultant) → blue `info`
- أخصائي (specialist) → `success` green
- ليزك / surgery → violet (`chart`/`#7c3aed`)
- بنتاكام (pentacam) → orange/amber `warning`

---

## 3. Typography

- **Font:** Cairo (primary) — already loaded. Arabic + Latin, weights 300–900.
- **Scale** (use Tailwind text-\*):
  | Role | Size | Weight |
  |---|---|---|
  | Page title | `text-2xl` (24px) | 700–800 |
  | Section title | `text-base`/`text-lg` (15–18px) | 700 |
  | Card metric value | `text-3xl` (30–32px) | 800 |
  | Body | `text-sm` (13–14px) | 400–500 |
  | Label / caption | `text-xs` (11–12px) | 500–600 |
- **Numbers** (counts, money) are bold and large — they're the point of a clinic dashboard.
- Don't mix more than two weights in one card.

---

## 4. Spacing, radius, elevation

- **Radius:** base `--radius: 0.65rem`. Use `rounded-lg`/`rounded-xl` for cards, `rounded-md`
  for inputs/buttons, `rounded-full` for avatars/pills.
- **Spacing:** 4px grid. Card padding `p-5`/`p-6` (20–24px). Gaps `gap-4`/`gap-5` between cards.
- **Elevation:** keep it flat. One soft shadow for cards (`shadow-sm`), a slightly stronger one
  on hover for interactive cards. No heavy drop shadows.
- **Borders over shadows:** prefer a 1px `border-border` to define cards on light backgrounds.

---

## 5. Layout patterns

Three validated shells (see `/scratchpad` prototypes for reference):

- **Sidebar shell** — fixed 240px navy sidebar + scrollable main. Best for admin-heavy screens
  with many sections. Collapses to a bottom bar / drawer under 900px.
- **Top-nav + hero** — 64px top bar + hero banner with live KPIs. Best for the landing/overview
  page. Nav hides into a menu on mobile.
- **Icon rail + data table** — 76px icon-only rail + dense table + side panel. Best for
  operational screens (queue, patient lists). Rail moves to bottom on mobile.

**Grid rules**
- Desktop: 4-up KPI strip, then 1.5fr/1fr two-column content.
- Tablet (<1000px): 2-up KPIs, single column content.
- Phone (<640px): everything stacks; tables render as stacked cards.

---

## 6. Component conventions

Use the existing `components/ui` primitives — do not build parallel ones.

- **Cards:** `Card` + `CardHeader`/`CardContent`. White/`card` surface, 1px border, `rounded-xl`.
- **Buttons:** `Button` — `default` (navy), `secondary` (orange), `outline`, `ghost`, `destructive`.
- **Badges/pills:** `Badge` for status. Pill shape, status color fill + `*-text`. Keep labels short
  (انتظار / فحص / منجز / عملية).
- **Tables:** filter tabs in the header, patient cell = avatar + name + ID, status as a colored
  dot + label, row actions behind a `⋯` menu. Hover-highlight rows.
- **Dates:** ALWAYS `<DateInput>` from `components/ui/date-input.tsx` — never raw `type="date"`.
- **Avatars:** rounded-square or circle, brand-soft background + brand-deep initials. 2 Arabic initials.
- **Empty/loading:** use `empty.tsx` and skeletons, not blank screens.

---

## 7. Do / Don't

**Do**
- Use semantic tokens (`bg-primary`, `text-success-text`) so dark mode + theming stay correct.
- Keep one clear primary action per screen.
- Show live operational state (now-serving, queue count, avg wait) prominently.
- Right-align everything for RTL; mirror icons that imply direction.

**Don't**
- Hardcode hex values that a token already covers.
- Replace Arabic labels with English (see CLAUDE.md).
- Add a third font, heavy shadows, or decorative gradients on data surfaces.
- Overcrowd the overview page — push detail to dedicated screens.

---

## 8. Where things live

- Tokens: `client/src/index.css` (`@theme inline`, `:root`, `.dark`)
- Primitives: `client/src/components/ui/*`
- Pages: `client/src/pages/*` — gated by `client/src/components/ProtectedRoute.tsx`
- Routing: `client/src/App.tsx`

To add or change a token, edit `index.css` once — every component inherits it.
