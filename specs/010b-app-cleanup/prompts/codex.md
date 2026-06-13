Follow the project Constitution and Project Principles strictly.
Run `pnpm check` after each task. Do not start the next task until check passes.

---

## T001 — Extract TRACKED_ROUTES into tracked-routes.ts

Task: Move the `TRACKED_ROUTES` array and any related helpers out of `client/src/App.tsx`.

1. Read `client/src/App.tsx` fully
2. Find the `TRACKED_ROUTES` array (and any types or helper functions used exclusively by it)
3. Move them into a new file `client/src/routes/tracked-routes.ts`:
   ```typescript
   export const TRACKED_ROUTES: Array<{ pathPrefix: string; label: string }> = [
     // ... moved content
   ];
   // export any related helpers
   ```
4. In `App.tsx`: delete the moved declarations, add `import { TRACKED_ROUTES } from './routes/tracked-routes'`
5. Run `pnpm check`

Do NOT change any values or logic. Move only.
Report: lines removed from App.tsx, App.tsx line count before/after, pnpm check result.

---

## T003 — Extract redirect guard logic into guards.tsx

Task: Move redirect guard components and URL-matching logic out of `client/src/App.tsx`.

1. Read `client/src/App.tsx` fully (after T001 cut)
2. Find all redirect-related logic that is NOT inside a `<Route path=...>` declaration — this includes:
   - Standalone `<Redirect>` component definitions
   - URL-pattern-matching functions (e.g. functions that check `path.startsWith(...)`)
   - Any helper components that wrap redirect behavior
3. Move them into `client/src/routes/guards.tsx`, export each
4. In `App.tsx`: delete the moved code, add the import
5. Run `pnpm check`

Do NOT change any redirect targets, conditions, or component logic. Move only.
Report: lines removed from App.tsx, App.tsx final line count, pnpm check result.
