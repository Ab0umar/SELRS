# SELRS Design System

## Color Palette

### Primary Colors
- **Orange (Brand Primary)**: `#FF6B35` (warmth, action, medical optimism)
  - Light: `#FFE5D9`
  - Dark: `#CC5529`
- **Blue (Trust)**: `#2563EB` (clarity, reliability, focus)
  - Light: `#DBEAFE`
  - Dark: `#1E40AF`
- **White (Cleanliness)**: `#FFFFFF`

### Neutrals (Tinted)
- **Foreground (text)**: `#1F2937` (near-black, tinted blue)
- **Muted text**: `#6B7280` (gray, medical neutral)
- **Border**: `#E5E7EB` (light gray)
- **Background**: `#F9FAFB` (off-white, clinical clean)
- **Light background**: `#F3F4F6` (card/section backgrounds)

### Semantic Colors
- **Success**: `#10B981` (positive, recovery, post-op success)
- **Warning**: `#F59E0B` (caution, pending, awaiting approval)
- **Error**: `#EF4444` (critical, alerts, urgent)
- **Info**: `#3B82F6` (notification, guidance)

### Color discipline (no third brand color)

The palette is **navy + orange + semantic tokens**. No `--accent-3`. When a feature reaches for a third color (violet, cyan, teal, etc.) to differentiate a category or role:

1. First option: use **secondary (orange)** with opacity variants (`bg-secondary/10`, `bg-secondary/15`, `text-secondary`). This is the canonical "second identity color" in the system.
2. Second option: use a **semantic token** if the meaning matches (success / warning / destructive / info).
3. Third option: use **muted neutrals** if the distinction is decorative, not semantic.

**Rationale**: A two-color brand is harder to dilute. Every additional named color is a future migration debt. Violet, indigo, teal, and emerald palettes were normalized to `secondary` in 2026-05 (Pass 3 audit).

### Hub-shell category palette (token-only)

Multi-hub navigation surfaces (Clinics / Admin / Services / Medical Reports / Patients / Workflow) need visual identity per hub. Use this **fixed rotation of semantic tokens**, not Tailwind raw palette names:

| Slot | iconWrap | Use for |
|---|---|---|
| 1 | `bg-primary/10 text-primary` | Main / clinical / default hub |
| 2 | `bg-secondary/15 text-secondary` | Secondary identity (orange-warm) |
| 3 | `bg-success/15 text-success` | Health / completed / labs |
| 4 | `bg-warning/20 text-warning` | Admin / caution / migrations |
| 5 | `bg-destructive/10 text-destructive` | Critical / errors only |
| 6 | `bg-muted text-muted-foreground` | Utility / neutral hub |

Never reach for `sky-*`, `cyan-*`, `pink-*`, `indigo-*`, `teal-*`, `emerald-*`, `rose-*`, `amber-*`, `violet-*`. They were swept in Pass 4 (2026-05) and should not return.

## Typography

### Font Family
- **UI Font**: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif
- **Fallback for Arabic**: Segoe UI, Tahoma, Arial (system fonts that support Arabic)

### Scale & Weight
| Role | Size | Weight | Line Height | Usage |
|------|------|--------|-------------|-------|
| H1 (Page Title) | 32px | 700 | 1.2 | Page headers |
| H2 (Section) | 24px | 700 | 1.25 | Major sections |
| H3 (Subsection) | 20px | 600 | 1.3 | Subsections |
| H4 (Card/Table Header) | 16px | 600 | 1.4 | Card titles, table headers |
| Body (Regular) | 14px | 400 | 1.6 | Body text, table cells |
| Body (Small) | 13px | 400 | 1.5 | Secondary text, captions |
| Label (Form) | 13px | 500 | 1.4 | Form labels, badges |
| Mono (Data) | 13px | 400 | 1.5 | IDs, codes, medical record numbers |

**Contrast Hierarchy**: Title (H1) → H2 → H3 → H4 → Body Regular → Body Small. Avoid flat scales.

## Spacing Scale
| Token | Size | Usage |
|-------|------|-------|
| xs | 4px | Inline spacing, small gaps |
| sm | 8px | Small padding, component internals |
| md | 12px | Standard padding, breathing room |
| lg | 16px | Sections, card padding |
| xl | 24px | Page sections, major spacing |
| 2xl | 32px | Large section breaks |
| 3xl | 48px | Page top/bottom margins |

**Rule**: Vary spacing for rhythm. Consistent 16px padding everywhere = monotony.

## Components

### Buttons
- **Primary (Orange)**: Orange background, white text, 8px padding vertical, 12px horizontal, rounded 6px, 400 weight
- **Secondary (Blue outline)**: Blue border, blue text, white background, 8px v / 12px h, rounded 6px
- **Tertiary (Ghost)**: No background, blue text, no border, 8px v / 12px h, hover: light background
- **Danger (Red)**: Red background, white text, same sizing
- **Disabled**: Muted text, muted background, no interaction

### Tables
- **Header row**: Light blue background (#DBEAFE), 600 weight, left-align text + numbers
- **Data rows**: Alternating white / light gray (#F3F4F6), 14px body
- **Row hover**: Light blue tint (#F0F9FF)
- **Grouping rows**: Light blue section headers (#E0F2FE), 600 weight, can be collapsible
- **Total/Summary rows**: Light orange (#FFE5D9) or light gray highlight, bold or slightly heavier weight
- **Column spacing**: Min 12px padding, increase for readability

### Forms
- **Input**: 12px padding, light gray background, blue border on focus, rounded 6px, 13px label
- **Select/Dropdown**: Match input styling
- **Validation**: Red text for errors, green text for success, warning yellow for caution
- **Placeholder**: Muted gray text

### Cards
- **Background**: White
- **Border**: 1px light gray, rounded 8px
- **Padding**: 16px (lg spacing)
- **Shadow**: None (restrained clinic aesthetic, not material design)
- **No nested cards** (absolute ban)

### Navigation
- **Sidebar/Top nav**: Light gray background (#F9FAFB), dark text
- **Active link**: Blue left border (2px), blue text, light blue background
- **Inactive link**: Muted text, no background
- **Hover**: Light gray background

### Alerts / Callouts
- **Success**: Green (#10B981) left border (2px), light green background (#ECFDF5), green text
- **Warning**: Yellow (#F59E0B) left border, light yellow background, yellow text
- **Error**: Red border, light red background, red text
- **Info**: Blue border, light blue background, blue text
- **No side-stripe only** (must include background tint)

## Layout Principles

1. **Breathing room** — Don't fill every pixel. Whitespace aids clarity.
2. **Content-first** — Sidebars support, don't dominate.
3. **Data density** — Tables can be tighter (12px row padding) than prose (16px).
4. **No boxes-within-boxes** — One level of nesting max (card → content, not card → card → content).
5. **Responsive grid** — 1-column mobile, 2-col tablet, 3+ desktop; use CSS Grid or Flexbox, not Bootstrap-style containers.

## Theme & Lighting
**Light theme always.** Clinic staff work in bright office lighting and daylight surgery suites. Dark mode contradicts the medical environment. Light backgrounds reduce fatigue in OR/recovery where screens are visible from distance.

## Motion
- **Button hover/active**: Slight opacity change (0.9), no animation
- **Form validation**: Instant visual feedback, no animation
- **Page transitions**: Fade in (200ms ease-out) if needed
- **Avoid**: Animating layout properties, bouncing, elastic easing

## Bilingual (Arabic/English)
- **Arabic primary** — All UI text leads in Arabic
- **English fallback** — English always available, not translated separately
- **RTL layout** — Ensure flex/grid flow adapts to text direction
- **Typography**: Same font stack supports both; line-height works for both
- **Data**: Numbers stay LTR (123, not ١٢٣)

## Accessibility (Standard)
- **Color contrast**: WCAG AA (4.5:1 normal text, 3:1 large text)
- **Touch targets**: Min 44×44px (clinic staff with gloves, time pressure)
- **Focus states**: Visible outline (2px blue), no invisible focus
- **Screen readers**: Semantic HTML, labels on form inputs
- **Mobile**: Readable on 5-inch and 27-inch screens; scale text appropriately

## Anti-Patterns (Absolute Bans)
1. ❌ **Side-stripe borders only** — Rewrite with full borders or background tints
2. ❌ **Gradient text** — Use solid color, emphasis via weight/size
3. ❌ **Glassmorphism as default** — No decorative blurs
4. ❌ **Card grids of identical cards** — Vary content, use tables for structured data
5. ❌ **Modal-first** — Use inline or progressive UI; modals are last resort
6. ❌ **Hero-metric template** — No big-number + label + gradient cliché

## Current Debt
- Inconsistent button styles (no unified primary/secondary)
- Random color usage (orange, blue, teal scattered without system)
- Poor spacing rhythm (16px everywhere, no variation)
- Weak typography hierarchy (size only, no weight contrast)
- Ad-hoc table styling (no consistent header/row treatment)
- Missing focus/hover states
