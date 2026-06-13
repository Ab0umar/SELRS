# Tasks: Queue Visit Hardening

**Branch**: `012-queue-visit-hardening`
**Depends on**: `011-backend-tests` merged
**Input**: `specs/012-queue-visit-hardening/`

> Every task prompt must include: _"Follow the project Constitution and Project Principles strictly."_

---

## Phase 1: DB Helper

- [x] T001 Add `hasVisitForDate` helper to `server/db.ts`
  - **Owner**: Codex | **Tool**: Edit
  - **Prompt**: See `prompts/codex.md` T001
  - **Acceptance**: `pnpm check` passes; function exported from `server/db.ts`

---

## Phase 2: Dedup Guards

- [x] T002 Guard MSSQL sync visit creation in `server/integrations/mssqlPatients.ts`
  - **Owner**: Codex | **Tool**: Edit
  - **Prompt**: See `prompts/codex.md` T002
  - **Acceptance**: `pnpm check` passes; sync no longer creates a second visit when one already exists

- [x] T003 Replace O(n) scan in `createPatient` existing-patient branch
  - **Owner**: Codex | **Tool**: Edit
  - **Prompt**: See `prompts/codex.md` T003
  - **Acceptance**: `pnpm check` passes; `getVisitsByPatient` call removed from that branch

- [x] T004 Run `pnpm check` gate
  - **Owner**: Claude | **Tool**: Bash
  - **Acceptance**: Exit 0

---

## Phase 3: Test Coverage

- [x] T005 Add queue-fix regression test to `server/tests/medical.test.ts`
  - **Owner**: Codex | **Tool**: Edit
  - **Prompt**: See `prompts/codex.md` T005
  - **Acceptance**: `pnpm test:backend` passes; total backend tests = previous count + 1

- [x] T006 Run `pnpm check` + `pnpm test:backend` gate
  - **Owner**: Claude | **Tool**: Bash
  - **Acceptance**: Both exit 0; backend test count incremented by 1

---

## Final Phase: Verification

- [x] T007 Full suite: `pnpm check` + `pnpm test` + `pnpm test:backend`
  - **Owner**: Claude | **Tool**: Bash
  - **Acceptance**: All three exit 0; frontend 105/105; backend ≥ 30

---

## Dependencies & Execution Order

```
T001 → T002
T001 → T003
T002, T003 → T004
T004 → T005 → T006 → T007
```
