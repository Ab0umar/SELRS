# Plan: App.tsx Router Split

**Branch**: `010-app-router-split`
**Hard Dependency**: `009-routes-full-coverage` merged (all paths typed before splitting)

## Approach

Same pattern as plan 002 (medical.ts) and plan 007 (attendance.ts) — extract domain blocks into separate files, then import and compose.

**Key difference from backend splits**: React components, not tRPC plain objects. Each domain file exports a JSX fragment or array of `<Route>` elements.

```tsx
// client/src/routes/attendance-routes.tsx
export function AttendanceRoutes() {
  return (
    <>
      <Route path={ROUTES.attendance} component={...} />
      <Route path={ROUTES.attendanceLive} component={...} />
      ...
    </>
  );
}

// App.tsx
import { AttendanceRoutes } from "./routes/attendance-routes";
// ...
<Switch>
  <AttendanceRoutes />
  <SalaryRoutes />
  ...
</Switch>
```

## File Map

| File | Domain | Approx lines |
|------|--------|-------------|
| `routes/attendance-routes.tsx` | Attendance | ~100 |
| `routes/salary-routes.tsx` | Salary | ~100 |
| `routes/kf-routes.tsx` | KF | ~150 |
| `routes/accounting-routes.tsx` | Accounting | ~250 |
| `routes/medical-routes.tsx` | Medical/sheets/visits | ~300 |
| `routes/admin-routes.tsx` | Admin + admin-hub | ~200 |
| `routes/marketing-routes.tsx` | Marketing | ~60 |
| `routes/misc-routes.tsx` | Hubs, portals, misc | ~150 |

## Key Rules

- No route paths change — extraction only
- No component logic moves — only the `<Route>` wrappers
- Lazy imports stay in the same file as the `<Route>` that uses them (move them to the domain file)
- `ProtectedRoute` wrappers move with their `<Route>`
- `App.tsx` retains: imports, `<Switch>`, catch-all 404, top-level providers
- Run `pnpm check` + visual smoke after each domain extraction

## Constitution Check

- No new abstractions beyond the route component wrapper
- No route paths or components changed
- `pnpm check` + `pnpm build` + `pnpm test` as final gate
