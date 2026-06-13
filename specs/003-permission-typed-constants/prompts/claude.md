Follow the project Constitution and Project Principles strictly.
Run `pnpm check` after each task.

---

## T002 — Create shared/routes.ts

Task: Create `shared/routes.ts` with all route path constants, based on the inventory from T001.

**Input**: The path inventory from T001. Also read `client/src/components/ProtectedRoute.tsx` to confirm all paths.

1. Create `shared/routes.ts` with this structure:
   ```ts
   export const ROUTES = {
     // Navigation
     home: "/",
     login: "/login",
     dashboard: "/dashboard",
     
     // Medical / patient
     patients: "/patients",
     today: "/today",
     txhub: "/txhub",
     kf: "/kf",
     kfSheets: "/kf/sheets",
     
     // Admin
     adminHub: "/admin-hub",
     adminUsers: "/admin/users",
     // ... all other paths from T001 inventory
   } as const;

   export type RoutePath = typeof ROUTES[keyof typeof ROUTES];
   ```
2. Include EVERY path from the T001 inventory — do not skip any
3. Use camelCase key names (e.g., `adminHub` for `"/admin-hub"`, `txhub` for `"/txhub"`)
4. Run `pnpm check`

**IMPORTANT**: Do NOT change any path value strings. The values must exactly match the current path strings in the codebase. This task only creates the constants — renaming paths happens in 004.

Report: count of constants created, pnpm check result.

---

## T008 — Final verification gate

Task: Run `pnpm check` + full 62-test suite as the final gate for 003.

1. Run `pnpm check` — zero errors required
2. Run `python testsprite_tests/local_run.py` — 62/62 required
3. Verify with grep that no permission-gated raw path strings remain in:
   - `client/src/components/ProtectedRoute.tsx`
   - Permission-grant admin UI components
4. If any raw strings are found, fix them before reporting success

Report: check result, test result (X/62), grep confirmation, changed files list.
