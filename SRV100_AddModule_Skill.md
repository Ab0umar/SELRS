---
name: SRV100 Add New Module
description: >
  Step-by-step playbook for adding a brand-new module to the SRV100_Acc project.
  Use this skill whenever the user asks to add a new module, new section, new area,
  or new standalone feature that needs its own layout, routes, tRPC router, and
  service layer. Real examples in the codebase: Attendance, Salary, Marketing, Stockroom,
  Accounting. Covers every required touch-point in the exact order they must be done,
  permission gating, the layout shell pattern, route registration, router composition,
  service layer structure, Drizzle schema additions, and the mandatory verification steps.
  Do not start writing code without reading this skill first.
---

# What "a new module" means in SRV100

A module is a self-contained vertical slice with:
- Its own URL namespace (`/module-name/*`)
- Its own layout shell (`client/src/pages/module-name/ModuleNameLayout.tsx`)
- Its own pages directory (`client/src/pages/module-name/`)
- Its own tRPC router (`server/routers/module-name.ts`)
- Its own service layer (`server/services/module-name/`)
- Its own Drizzle schema tables (if it needs persistence)
- **Zero cross-imports** with other modules (Medical, Accounting, etc.)

Existing modules for reference: `attendance`, `salary`, `marketing`, `stockroom`, `accounting`.

---

# Constitution Check — do this before any code

Every new module must pass these gates. If any fails, stop and resolve before writing code.

| Gate | Rule |
|---|---|
| **Module Separation** | `server/routers/new-module.ts` must NOT import from `medical.ts`, `accounting.ts`, or `patient.ts`. `client/src/pages/new-module/*` must NOT import from other module page trees. |
| **No edits to existing schemas** | Only ADD new tables via an additive Drizzle migration. Never rename, drop, or repurpose existing columns. |
| **Medical untouched** | `server/routers/medical.ts`, `server/db.ts`, `client/src/components/ProtectedRoute.tsx` must not be modified. |
| **Minimal diff** | Only `server/routers/index.ts` and `client/src/App.tsx` are edited among existing files. Everything else is new files. |
| **pnpm check passes** | `pnpm check` is mandatory after all changes before calling the task done. |

---

# Touch-Point Checklist (in order)

## 1. Plan the permission model first

Decide before writing any code:
- Which roles can access this module? (`admin`, `manager`, `reception`, `doctor`, `nurse`, `technician`, `accountant`, or a new permission path)
- Is it role-based (use existing procedure from `procedures.ts`) or path-based (like accounting/attendance)?

**Available procedures** (import from `server/_core/procedures`):
- `protectedProcedure` — any authenticated user
- `adminProcedure` — admin only
- `managerProcedure` — manager + admin + accountant
- `medicalStaffProcedure` — all medical roles + admin + manager
- `accountingProcedure` — path-based `/accounting` permission
- `attendanceViewerProcedure` — path-based `/attendance` permission
- `attendanceManagerProcedure` — same but write-level

If you need a new path-based procedure, add it to `server/_core/procedures.ts` following the `attendanceViewerProcedure` pattern exactly.

## 2. Create the service layer

```
server/services/new-module/
├── dashboard.service.ts       (summary stats the layout header will show)
├── [feature].service.ts       (one file per major concern)
└── __tests__/                 (optional Vitest unit tests)
```

- Services import ONLY from `server/db.ts` and `drizzle/schema.ts`.
- Services never import from other module routers or services.
- Return plain objects, never tRPC types.

## 3. Create the tRPC router

**File:** `server/routers/new-module.ts`

```ts
import { z } from 'zod';
import { router, protectedProcedure, adminProcedure } from '../_core/procedures';
import { SomeService } from '../services/new-module/some.service';

export const newModuleRouter = router({
  dashboardSummary: protectedProcedure.query(async () => {
    return SomeService.getSummary();
  }),

  someList: protectedProcedure
    .input(z.object({ page: z.number().optional() }))
    .query(async ({ input }) => {
      return SomeService.getList(input);
    }),
});
```

Rules:
- Every procedure uses a typed procedure from `procedures.ts` — never raw `t.procedure`.
- Input validated with Zod.
- No `any` on return types — infer from the service return.

## 4. Register the router in index.ts

**File:** `server/routers/index.ts` — the ONLY existing file you edit here.

```ts
import { newModuleRouter } from './new-module';

export const appRouter = router({
  // ...existing routers unchanged...
  newModule: newModuleRouter,   // ← add this line
});
```

After this edit, run `pnpm check` immediately. If it fails, fix before proceeding.

## 5. Create Drizzle schema tables (if needed)

**File:** `drizzle/schema.ts` — additive additions only.

```ts
export const newModuleItems = mysqlTable('new_module_items', {
  id: int('id').autoincrement().primaryKey(),
  // ...
});
```

Rules:
- Table names prefixed with module name: `new_module_*`
- Run `pnpm db:generate` then `pnpm db:migrate` (or the equivalent in this project).
- Never edit existing table definitions.

## 6. Create the layout shell

**File:** `client/src/pages/new-module/NewModuleLayout.tsx`

The canonical pattern (copy from SalaryLayout or AttendanceLayout and adapt):

```tsx
import { ReactNode } from "react";
import { Link, useLocation } from "wouter";
import { SomeIcon, ChevronRight } from "lucide-react";
import { trpc } from "@/lib/trpc";

interface NewModuleLayoutProps { children: ReactNode }

const navigationSections = [
  {
    id: "section-id",
    label: "اسم القسم",
    description: "وصف مختصر",
    icon: SomeIcon,
    items: [
      {
        href: "/new-module",
        label: "الرئيسية",
        description: "الصفحة الرئيسية",
        activeFor: ["/new-module"],
      },
    ],
  },
];

function isItemActive(pathname: string, activeFor: string[]) {
  return activeFor.some((path) =>
    path === "/new-module"
      ? pathname === path
      : pathname === path || pathname.startsWith(`${path}/`)
  );
}

export default function NewModuleLayout({ children }: NewModuleLayoutProps) {
  const [location] = useLocation();
  const summaryQ = trpc.newModule.dashboardSummary.useQuery(undefined, {
    refetchInterval: 60_000,
    refetchIntervalInBackground: false,
  });
  const summary = summaryQ.data;

  const metrics = [
    { label: "مقياس 1", value: summary?.count ?? "—", tone: "text-primary", accent: "bg-primary/10 border-primary/20" },
    // add 3 more — layouts always show 4 metrics in 2x2 / 4-col grid
  ];

  return (
    <div className="page-layout min-h-screen bg-background text-foreground" dir="rtl">
      {/* Module header with accent color gradient */}
      <div className="border-b border-primary/15 bg-gradient-to-b from-primary/5 to-transparent">
        <div className="mx-auto w-full px-3 py-4 sm:px-4 lg:px-5">
          <div className="flex flex-col gap-4 sm:gap-6">
            <div className="space-y-2">
              <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
                <span className="h-2 w-2 rounded-full bg-primary" />
                اسم الوحدة
              </div>
              <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
                عنوان الوحدة
              </h1>
              <p className="max-w-2xl text-sm leading-6 text-muted-foreground">
                وصف الوحدة ووظيفتها
              </p>
            </div>
            {/* Always 4 metrics in a 2×2 / 4-col grid */}
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {metrics.map((m) => (
                <div key={m.label} className={`rounded-lg border p-3 ${m.accent}`}>
                  <div className="text-xs font-semibold text-foreground/70">{m.label}</div>
                  <div className={`mt-1.5 text-lg font-bold tabular-nums ${m.tone}`}>{m.value}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Two-column: Sidebar + Content */}
      <div className="flex flex-col lg:flex-row">
        <aside className="w-full border-b border-border bg-card/50 lg:w-64 lg:border-b-0 lg:border-r">
          <nav className="space-y-1 p-3 sm:p-4">
            {navigationSections.map((section) => {
              const sectionActive = section.items.some((item) => isItemActive(location, item.activeFor));
              return (
                <div key={section.id} className="space-y-1">
                  <div className="px-3 py-2">
                    <div className="flex items-center gap-2">
                      <section.icon className="h-4 w-4 text-muted-foreground" />
                      <div className="flex-1 min-w-0">
                        <h3 className="text-xs font-semibold text-foreground uppercase tracking-wide">{section.label}</h3>
                        <p className="text-xs text-muted-foreground mt-0.5">{section.description}</p>
                      </div>
                    </div>
                  </div>
                  <div className="space-y-1">
                    {section.items.map((item) => {
                      const active = isItemActive(location, item.activeFor);
                      return (
                        <Link key={item.href} href={item.href}
                          className={`group flex items-start gap-3 rounded-lg px-3 py-2.5 text-sm transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 focus-visible:ring-offset-2 ${
                            active
                              ? "bg-primary/10 text-primary font-medium shadow-sm"
                              : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                          }`}
                        >
                          <ChevronRight className="h-4 w-4 mt-0.5 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
                          <div className="flex-1 min-w-0">
                            <div className="font-medium">{item.label}</div>
                            <div className="text-xs text-muted-foreground mt-0.5">{item.description}</div>
                          </div>
                        </Link>
                      );
                    })}
                  </div>
                  <div className="my-2 border-t border-border" />
                </div>
              );
            })}
          </nav>
        </aside>
        <main className="flex-1 px-3 py-5 sm:px-4 lg:px-5">{children}</main>
      </div>
    </div>
  );
}
```

**Layout color token**: pick one semantic token that represents this module and use it consistently throughout the layout header and active nav states. Do not use the same token as an existing module. Existing assignments:
- Attendance → `secondary`
- Salary → `primary`
- Marketing → `primary`
- Accounting → (tab nav, no gradient header)

## 7. Create the home page

**File:** `client/src/pages/new-module/NewModuleHome.tsx`

Minimum content:
- Quick-link grid (groups of 4) to all sub-pages
- A summary card using the 4 metrics from the layout
- Any frequently-needed inline entry form (keep visible, not behind a dialog)

## 8. Register routes in App.tsx

**File:** `client/src/App.tsx` — second and final existing file you edit.

Add the lazy imports at the top (with module grouping comment):
```tsx
// New Module
import NewModuleLayout from "./pages/new-module/NewModuleLayout";
const NewModuleHome = lazy(() => import("./pages/new-module/NewModuleHome"));
const NewModulePage2 = lazy(() => import("./pages/new-module/Page2"));
```

Add routes inside `<Switch>` (grouped with a comment):
```tsx
{/* New Module Routes */}
<Route path={"/new-module"} component={() =>
  <ProtectedRoute requiredRoles={["admin"]}><NewModuleLayout><NewModuleHome /></NewModuleLayout></ProtectedRoute>
} />
<Route path={"/new-module/page2"} component={() =>
  <ProtectedRoute requiredRoles={["admin"]}><NewModuleLayout><NewModulePage2 /></NewModuleLayout></ProtectedRoute>
} />
```

Rules for route registration:
- Layout is always in the Route, not inside the page component.
- `ProtectedRoute` wraps the Layout, not the page.
- `requiredRoles` must match the procedure-level access — never looser.
- Non-layout pages (print preview, dialogs) do NOT get the Layout wrapper.
- For direct imports (like existing Layout components): use `import` not `lazy()`.

## 9. Add TRACKED_ROUTES entry (optional but recommended)

In `App.tsx`, the `TRACKED_ROUTES` array drives the recent-pages tracker. Add your module root:
```ts
{ pathPrefix: "/new-module", label: "اسم الوحدة" },
```

## 10. Add dashboard shortcut (optional)

If the module should appear in the admin Dashboard tab bar (`Dashboard.tsx`), add an entry to the `TABS` array:
```ts
{ id: 'new-module', label: 'الوحدة الجديدة', icon: SomeIcon, iconWrapCls: 'bg-primary/10 text-primary' },
```

---

# File Creation Order

Always create in this order to catch type errors early:

1. `drizzle/schema.ts` additions (if any)
2. `server/services/new-module/` files
3. `server/routers/new-module.ts`
4. `server/routers/index.ts` edit → **run `pnpm check`**
5. `client/src/pages/new-module/NewModuleLayout.tsx`
6. `client/src/pages/new-module/` page files
7. `client/src/App.tsx` edits → **run `pnpm check`**

---

# Verification

Run after all changes:

```bash
pnpm check       # TypeScript — mandatory, no skipping
pnpm build       # If touching shipped frontend/server behavior
```

Report:
- Which files were created (new)
- Which existing files were edited (App.tsx, routers/index.ts)
- `pnpm check` result

---

# Hard Rules

1. **Never import from another module's router or pages.** Only `shared/` types and `server/_core/*` are shared.
2. **Never edit `ProtectedRoute.tsx`** — it is untouchable.
3. **Never edit `server/routers/medical.ts`** — it is untouchable.
4. **Never edit `server/db.ts`** — it is untouchable.
5. **Layout shell must include 4 header metrics** pulled from `dashboardSummary` via tRPC.
6. **Sidebar nav items** must use `isItemActive()` with exact-match for the root path and prefix-match for sub-paths.
7. **`dir="rtl"`** on every page container and layout shell root element.
8. **Module accent color** must be a semantic token — never a hardcoded Tailwind shade.
9. **Route paths are permanent** once registered — do not rename them without explicit instruction.
10. **`pnpm check` must pass** before the task is considered complete.
