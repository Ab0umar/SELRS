# Responsive Design Guidelines (SRV100 Production)

## Viewport Breakpoints

SRV100 is tested and optimized for these device widths:

| Breakpoint | Width | Device | UI Mode | Priority |
|------------|-------|--------|---------|----------|
| `xs` | 320px | iPhone SE (compat) | Mobile cards | Critical |
| `sm` | 360px | Android 5.5" (common) | Mobile cards | Critical |
| `sm+` | 390px | iPhone 12 Pro | Mobile cards | Critical |
| `md` | 430px | iPhone Max | Mobile cards | Critical |
| `tablet` | 640px | iPad mini | Hybrid | High |
| `lg` | 1024px+ | Desktop | Table/Grid | High |

**Breakpoints used in Tailwind:**
- `sm`: 640px (default Tailwind)
- `md`: 768px (default Tailwind, rarely used)
- `lg`: 1024px (default Tailwind)

**Custom testing widths (320, 360, 390, 430) must work at native resolution, not Tailwind breakpoints.**

## Layout Patterns

### Mobile-First Grid System

#### Patient Cards (Admin Patients)
```tailwind
grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4
gap-1 sm:gap-1.5 md:gap-2
```

| Width | Cols | Gap | Card Width |
|-------|------|-----|-----------|
| 320px | 2 | 4px | ~144px |
| 360px | 2 | 4px | ~164px |
| 390px | 2 | 6px | ~174px |
| 430px | 2 | 6px | ~194px |
| 640px | 3 | 6px | ~198px |
| 1024px | 4 | 8px | ~232px |

#### Stats Banners (Dashboard)
```tailwind
grid grid-cols-2 sm:grid-cols-4
gap-1 sm:gap-1.5
```

| Width | Cols | Gap | Stat Width |
|-------|------|-----|-----------|
| 320px | 2 | 4px | ~150px |
| 360px | 2 | 4px | ~170px |
| 640px | 4 | 6px | ~151px |
| 1024px | 4 | 8px | ~224px |

### Typography Scaling
```tailwind
text-[10px] sm:text-[11px] sm:text-sm md:text-base
```

| Width | Body | Labels | Headers |
|-------|------|--------|---------|
| 320px | 12px | 10px | 14px |
| 640px | 14px | 12px | 16px |
| 1024px | 16px | 13px | 18px |

### Spacing System

#### Mobile Padding (xs, sm, sm+, md)
```tailwind
px-2 py-1.5 sm:px-3 sm:py-2
```
- **Horizontal:** 8px base, 12px on sm
- **Vertical:** 6px base, 8px on sm

#### Desktop Padding (lg)
```tailwind
px-4 py-3
```
- **Horizontal:** 16px
- **Vertical:** 12px

#### Gaps
```tailwind
gap-1 sm:gap-1.5 md:gap-2
```
- **Mobile:** 4px
- **Tablet (sm):** 6px
- **Desktop (md):** 8px

## Component Rules

### Select/Input Min-Width
**Rule:** Allow inputs to shrink below 120px on mobile

```tailwind
// WRONG - Fixed width prevents responsive shrinking
<SelectTrigger className="w-[120px]">

// CORRECT - Responsive width with mobile-first
<SelectTrigger className="min-w-[100px] sm:min-w-[120px] rounded-lg">
```

| Component | Width 320px | Width 640px | Width 1024px |
|-----------|------------|------------|-------------|
| Month select | 100px | 120px | 120px |
| Year select | 80px | 94px | 94px |
| Size select | 100px | 120px | 120px |

### Button Text Sizing
```tailwind
// WRONG - Same font size everywhere
<Button className="text-sm">Long Arabic Text</Button>

// CORRECT - Shrink text on mobile
<Button className="text-xs sm:text-sm">مزامنة الكتالوج</Button>
```

| Width | Text Size | Button Height |
|-------|-----------|---------------|
| 320px | 12px | 32px |
| 640px | 14px | 36px |
| 1024px | 14px | 36px |

### Dialog Height
**Rule:** Max-height must account for mobile headers and footers

```tailwind
// Dialogs should use safe height on mobile
<DialogContent className="max-h-[85vh] sm:max-h-[90vh] overflow-y-auto">
```

| Width | Max Height | Space for Controls |
|-------|-----------|------------------|
| 320px | 85vh | 15% (status bar, keyboard) |
| 640px | 90vh | 10% (header bar) |
| 1024px | 95vh | 5% (minimal) |

### Toolbar Wrapping
**Rule:** Toolbars should flex-wrap on mobile instead of overflow-x

```tailwind
// WRONG - Causes horizontal scroll
<div className="flex gap-2">
  <Button>Long Label</Button>
  <Button>Another Long Label</Button>
</div>

// CORRECT - Wraps on mobile
<div className="flex flex-wrap gap-2 items-center">
  <Button>Short</Button>
  <Button>Labels</Button>
</div>
```

### Table Display
**Rule:** Desktop tables, mobile cards

```tsx
{isMobileViewport ? (
  // Mobile: Cards with pagination
  <div className="grid grid-cols-2 gap-2">...</div>
) : (
  // Desktop: Virtualized table
  <Table>...</Table>
)}
```

## RTL Alignment

### Margin & Padding
**Rule:** Use Tailwind's automatic RTL direction

```tailwind
// Automatically becomes pl-4 (padding-left) in RTL
<div className="pr-4">Text</div>

// Explicitly RTL for special cases
<div className="rtl:ml-4 ltr:mr-4">Spacer</div>
```

### Flex Direction
**Rule:** Use flex-row-reverse for RTL manually, or rely on dir="rtl"

```tsx
// Correct - Relies on dir="rtl" at parent
<div dir="rtl" className="flex gap-2">
  <Button>First</Button>
  <Button>Second</Button>
</div>

// Result in RTL: [Second] [First]
```

### Icon Placement
```tsx
// Icons mirror automatically in RTL
<Button className="gap-2">
  <RefreshCw className="h-4 w-4" />  {/* Renders on right in RTL */}
  <span>مزامنة</span>
</Button>
```

## Testing Checklist

### Visual Testing
- [ ] 320px: No horizontal overflow, text readable
- [ ] 360px: Cards/buttons properly spaced
- [ ] 390px: Stats banners readable (2-col layout)
- [ ] 430px: Still mobile (not tablet)
- [ ] 640px: Tablet layout smooth transition
- [ ] 1024px: Desktop layout full-featured

### Component Testing
- [ ] Selects don't overflow: input width >= (label + icon)
- [ ] Dialogs fit screen: height <= 90vh
- [ ] Toolbars wrap: buttons stack on mobile
- [ ] Tables paginate: mobile shows 20 cards/page
- [ ] Cards readable: text not squeezed

### RTL Testing
- [ ] Text right-aligned (dir="rtl" at page)
- [ ] Icons mirror correctly
- [ ] Dialogs right-aligned
- [ ] Tables RTL column order
- [ ] Forms left-labeled (RTL convention)

### Performance Testing
- [ ] Mobile card grid: 20 cards per page, no lag
- [ ] Desktop table: 100+ rows virtualized, smooth scroll
- [ ] Stats banners: Instantly visible (no render delay)
- [ ] Select dropdowns: Open in <200ms

## Common Mistakes

### ❌ Don't Do This

```tailwind
// Fixed 4-column grid on all widths
<div className="grid grid-cols-4 gap-2">

// Fixed select width
<SelectTrigger className="w-[140px]">

// Fixed font size
<span className="text-sm">
  {/* Unreadable on 320px */}
</span>

// Overflow-x instead of wrapping
<div className="flex overflow-x-auto">
  {/* Causes horizontal scroll */}
</div>

// Dialog without height constraint
<DialogContent className="space-y-4">
  {/* Overflows on mobile */}
</DialogContent>

// Button text too long
<Button>Direct Examination Referral Form</Button>
{/* Wraps awkwardly on mobile */}
```

### ✅ Do This Instead

```tailwind
// Responsive columns
<div className="grid grid-cols-2 sm:grid-cols-4 gap-1 sm:gap-2">

// Responsive select width
<SelectTrigger className="min-w-[100px] sm:min-w-[140px]">

// Responsive font size
<span className="text-[12px] sm:text-sm">
  {/* Readable everywhere */}
</span>

// Flex wrap instead
<div className="flex flex-wrap gap-2 items-center">
  {/* Wraps naturally on mobile */}
</div>

// Dialog with height constraint
<DialogContent className="max-h-[85vh] sm:max-h-[90vh] overflow-y-auto">
  {/* Fits on all devices */}
</DialogContent>

// Abbreviated button text
<Button className="text-xs sm:text-sm">Direct Exam</Button>
{/* Fits everywhere, expand on desktop */}
```

## Performance Guidelines

### Avoid Rerenders on Viewport Change
```typescript
// ✅ Correct
const isMobileViewport = useMediaQuery("(max-width: 639px)");
// Memoized, only triggers on actual viewport change

// ❌ Wrong
const isMobileViewport = window.innerWidth < 640;
// Recalculates every render
```

### Virtualization for Large Lists
```typescript
// Mobile: Paginated cards (20 per page)
const pages = Math.ceil(patients.length / 20);

// Desktop: Virtualized table (100+ rows)
const rowVirtualizer = useVirtualizer({
  count: patients.length,
  estimateSize: () => 74,
  overscan: 8,
});
```

### Memoize Grid/Cards Rendering
```typescript
// ✅ Correct
const cardComponents = useMemo(
  () => paginatedPatients.map(p => <PatientCard key={p.id} patient={p} />),
  [paginatedPatients]
);

// ❌ Wrong
paginatedPatients.map(p => <PatientCard key={p.id} patient={p} />);
// Remounts all cards on every parent render
```

## Deployment Checklist

Before deploying, verify:

- [ ] All pages tested at 320, 360, 390, 430, 640, 1024px
- [ ] No horizontal scroll on any viewport
- [ ] Text readable at smallest width
- [ ] Buttons/inputs accessible (min 44px height mobile)
- [ ] Dialogs fit within viewport
- [ ] RTL renders correctly
- [ ] Mobile pagination works (20 items/page)
- [ ] Desktop virtualization works (smooth scroll)
- [ ] Dark mode works on all widths
- [ ] Print media doesn't break (if applicable)

---

**Last Updated:** 2026-05-07
**Status:** Production guidelines locked
**Owner:** UX/Frontend team
