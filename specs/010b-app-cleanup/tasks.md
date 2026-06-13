# Tasks: App.tsx Cleanup

**Branch**: `010b-app-cleanup`
**Hard Dependency**: `010-app-router-split` merged
**Input**: `specs/010b-app-cleanup/`

> Every task prompt must include: _"Follow the project Constitution and Project Principles strictly."_

---

## Phase 1: Extract TRACKED_ROUTES

- [ ] T001 Extract `TRACKED_ROUTES` into `client/src/routes/tracked-routes.ts`
  - **Owner**: Codex | **Tool**: Write + Edit
  - **Prompt**: "Read `client/src/App.tsx` fully. Find the `TRACKED_ROUTES` array and any helper functions or types that are only used by it. Move them into a new file `client/src/routes/tracked-routes.ts`, export each symbol. In `App.tsx`, delete the moved code and add the import. Run `pnpm check`. Follow the project Constitution and Project Principles strictly."
  - **Acceptance**: `pnpm check` passes; `TRACKED_ROUTES` no longer defined in App.tsx

- [ ] T002 Run `pnpm check` gate after T001
  - **Owner**: Claude | **Tool**: Bash
  - **Acceptance**: Exit code 0

---

## Phase 2: Extract Redirect Guards

- [ ] T003 Extract redirect and URL-matching logic into `client/src/routes/guards.tsx`
  - **Owner**: Codex | **Tool**: Write + Edit
  - **Prompt**: "Read `client/src/App.tsx` fully. Find all redirect guard components, URL-pattern-matching functions, and `<Redirect>` logic that are not part of a `<Route>` declaration. Move them into `client/src/routes/guards.tsx`, export each component/function. In `App.tsx`, delete the moved code and add the import. Do not change any redirect targets or conditions. Run `pnpm check`. Follow the project Constitution and Project Principles strictly."
  - **Acceptance**: `pnpm check` passes; redirect logic no longer inline in App.tsx

- [ ] T004 Run `pnpm check` gate after T003
  - **Owner**: Claude | **Tool**: Bash
  - **Acceptance**: Exit code 0

---

## Final Phase: Verification

- [ ] T005 Verify App.tsx line count + full test suite
  - **Owner**: Claude | **Tool**: Bash + PowerShell
  - **Prompt**: "Run `pnpm check` then `pnpm test`. Run `(Get-Content client/src/App.tsx).Count` — must be ≤ 300. Follow the project Constitution and Project Principles strictly."
  - **Acceptance**: Both pass; App.tsx ≤ 300 lines

- [ ] T006 Run `pnpm build` as final gate
  - **Owner**: Claude | **Tool**: Bash
  - **Acceptance**: Exit code 0; produce standard task report

---

## Dependencies & Execution Order

```
T001 → T002 → T003 → T004 → T005 → T006
```
