---
name: SRV100 Edit Feature
description: >
  Safe editing playbook for modifying existing code in the SRV100_Acc project.
  Use this skill whenever the user asks to change, fix, update, rename, extend, or
  refactor any existing page, component, tRPC procedure, service, schema column, or
  route. Covers pre-edit reading requirements, the minimal-diff rule, which files are
  untouchable, how to handle auth/permission-sensitive changes, verification steps,
  and the pattern for each change type (frontend page, backend procedure, shared type,
  DB schema, route path). Do not make any edit without reading this skill first.
---

# The Core Rule

**Make the smallest correct diff.** Fix the root cause only. Do not clean up
surrounding code, extract helpers, rename unrelated variables, or add error handling
for cases that cannot happen. If the change touches 10 lines, the diff should be
~10 lines — not 100.

---

# Pre-Edit Reading Protocol

Before touching any file, read:

1. **The file you are about to change** — all of it, or at minimum the section
   containing the target code. Never edit blind.
2. **CLAUDE.md Read Order** — use it to find the correct related files:
   - Frontend route/page → `client/src/App.tsx` + target page + related components
   - Auth/permissions → `ProtectedRoute.tsx` + `useAuth*`
   - Backend API → `server/routers/index.ts` + `medical.ts` or `patient.ts`
   - tRPC/auth context → `server/_core/trpc.ts`, `procedures.ts`, `context.ts`
   - DB behavior → `server/db.ts` + `drizzle/schema.ts`
   - Shared types → `shared/types.ts`, `shared/const.ts`
3. **The immediate callers** of whatever you are changing (one level up).

Reading is not optional. Reading saves time. Blind edits cause regressions.

---

# Untouchable Files — Never Edit

These files must not be modified unless the task explicitly requires it AND the user confirms:

| File | Reason |
|---|---|
| `client/src/components/ProtectedRoute.tsx` | Frontend auth gate — any change breaks access control |
| `server/routers/medical.ts` | Core medical business logic — untouchable |
| `server/routers/patient.ts` | Patient queries — untouchable |
| `server/db.ts` | Drizzle MySQL access — untouchable |
| `server/_core/trpc.ts` | tRPC init — untouchable |
| `server/_core/context.ts` | Auth context — untouchable |
| `drizzle/schema.ts` (existing columns) | DB schema — additive only, never rename/drop |

If a task appears to require editing one of these files, stop and re-read the task.
Usually there is a different approach that avoids touching them.

---

# Change Type Playbooks

## Changing a Frontend Page or Component

**Steps:**
1. Read the page file.
2. Read `client/src/App.tsx` to confirm the route path and `ProtectedRoute` wrapper.
3. Make the change — minimum diff.
4. Preserve all Arabic UI text. Do not translate to English.
5. Preserve all `dir="rtl"` attributes.
6. Preserve existing Tailwind classes for unchanged sections — do not reformat.
7. Run: `pnpm check`

**What not to do:**
- Do not change the route path.
- Do not change `requiredRoles` on `ProtectedRoute` unless the task says to.
- Do not add a new state variable if an existing one already holds the data.
- Do not replace `<Skeleton>` loading with a spinner.
- Do not hardcode hex colors — use semantic tokens.

## Changing a tRPC Procedure

**Steps:**
1. Read the router file (e.g. `server/routers/attendance.ts`).
2. Read `server/_core/procedures.ts` to confirm the procedure type in use.
3. Make the change — keep the existing procedure type (do not swap `adminProcedure` to `protectedProcedure` unless that is the stated intent).
4. Keep existing audit logging and permission checks if the surrounding code already has them.
5. Keep Zod validation on all inputs — never remove `.input(...)`.
6. Run: `pnpm check`

**What not to do:**
- Do not widen the procedure access level accidentally.
- Do not add a new router — extend the existing one with new procedures.
- Do not change the procedure name/key — it breaks all client callers.
- Do not switch from a typed procedure to raw `t.procedure`.

## Adding a New Procedure to an Existing Router

1. Read the existing router file end-to-end first.
2. Add the procedure at the bottom of the router object.
3. Use the same procedure type as neighboring procedures of similar sensitivity.
4. Input: always use `z.object({...})` even for a single field.
5. Run: `pnpm check` after adding.

## Changing a Shared Type in `shared/`

1. Read `shared/types.ts` and `shared/const.ts`.
2. Find all usages: `Grep` the type/const name across `client/src/` and `server/`.
3. Update every call site in the same diff — partial updates cause type errors.
4. Run: `pnpm check`

## Changing a Drizzle Schema Column

**Only additive changes are allowed without explicit approval:**
- Adding a new column: allowed.
- Renaming a column: requires explicit instruction + migration.
- Dropping a column: requires explicit instruction + migration.
- Changing a column's type: requires explicit instruction + migration.

After any schema change:
1. Run `pnpm db:generate` to create the migration.
2. Run `pnpm db:migrate` to apply it.
3. Update all query sites that reference the changed column.
4. Run: `pnpm check`

**Critical:** The DB code in `server/db.ts` has mojibake/legacy encoding helpers.
Do not remove or bypass decode/encode helpers without understanding the data path.

## Changing a Route Path

Route paths appear in:
- `client/src/App.tsx` (route definition)
- `client/src/App.tsx` `TRACKED_ROUTES` (recent-pages tracker)
- Navigation components (layout sidebars, `quick-actions.tsx`)
- Any `useLocation` or `Link href` in pages

When changing a path:
1. Search for all occurrences of the old path string.
2. Add a redirect from the old path to the new one if the old path may be bookmarked.
3. Update all occurrences.
4. Run: `pnpm check`

Default: do NOT change route paths unless the task explicitly requires it.

## Changing Access Control / Permissions

This is the highest-risk edit type. Read before and after:
- `client/src/components/ProtectedRoute.tsx`
- `server/_core/procedures.ts`
- The affected router file

Rules:
- Frontend gating (`requiredRoles` on `ProtectedRoute`) and backend procedure type must always agree.
- If you add a role to `requiredRoles`, also check the backend procedure allows that role.
- If you change a backend procedure type, also update the frontend `requiredRoles`.
- Admin bypass must remain intact in path-based procedures (accounting, attendance).
- Never remove a `requiredRoles` prop and leave the route unprotected.

After any permission change: `pnpm check` + manual test of the affected role.

---

# Verification Rules

| What changed | Run |
|---|---|
| TypeScript types, tRPC surface, shared types | `pnpm check` — mandatory |
| Logic with existing test coverage | `pnpm test` |
| Shipped frontend or server behavior | `pnpm build` |
| Auth, routing, permissions, patient flows | `pnpm check` at minimum |
| DB schema | `pnpm db:generate` → `pnpm db:migrate` → `pnpm check` |

Always report which checks were run and which were skipped (with reason).

---

# Language Preservation

| Situation | Rule |
|---|---|
| The file has Arabic UI labels | Keep them Arabic. Translate nothing. |
| The file mixes Arabic and English | Preserve exact language per-element. |
| The file is all English (dev/admin screens) | Keep it English. |
| You are adding new UI text | Match the language of the surrounding screen. |

This is not a style preference — it is a product decision. Arabic labels serve
real users who read Arabic. Do not override this.

---

# Number and Money Formatting

- All numeric values in JSX: add `tabular-nums` class.
- Money in Accounting pages: use `formatMoneyAr()` from `accounting/accountingFormat.ts`.
- Counts in Accounting pages: use `formatCountAr()` from the same file.
- Never use `toLocaleString('en-US')` or `.toFixed(2)` for financial output.
- Never use `toLocaleString('ar-EG')` directly when a format helper already exists.

---

# What Not to Do (Repeated Anti-Patterns)

These have been rejected before — do not introduce them:

1. **Do not add a loading spinner** where `<Skeleton>` is the existing pattern.
2. **Do not add a confirmation dialog** for single-click reversible actions (e.g. mark-treated, status toggle).
3. **Do not add a new component abstraction** unless the task explicitly says to.
4. **Do not reformat or reorder unrelated code** in files you are editing.
5. **Do not swap `bg-success/10 text-success`** for a Tailwind green shade.
6. **Do not import from another module's page tree** — cross-module imports are banned.
7. **Do not use CSS `hidden`** to gate unauthorized UI — filter the data/array instead.
8. **Do not add `width: Npx` or `height: Npx`** hardcoded values — use Tailwind responsive utilities.
9. **Do not add a `console.log`** for debugging — remove it before reporting the task done.
10. **Do not change `pnpm check` to ignore a type error** — fix the underlying type issue.

---

# Final Response Format

After completing any edit, report exactly:

```
Changed files:
- client/src/pages/foo/Bar.tsx — [one line describing what changed]
- server/routers/attendance.ts — [one line describing what changed]

Checks run:
- pnpm check: passed
- pnpm test: skipped (no tests for this area)
```

Nothing else. No narration. No "I hope this helps." No summary of what the code does now.
