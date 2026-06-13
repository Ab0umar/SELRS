# Tasks: MSSQL Push Tests

**Branch**: `013-mssql-push-tests`
**Depends on**: `012-queue-visit-hardening` merged
**Input**: `specs/013-mssql-push-tests/`

> Every task prompt must include: _"Follow the project Constitution and Project Principles strictly."_

---

## Phase 1: Write test file

- [x] T001 Write `server/tests/mssql-push.test.ts` — all 10 push wiring tests
  - **Owner**: Codex | **Tool**: Write
  - **Prompt**: See `prompts/codex.md`
  - **Acceptance**: `pnpm test:backend` passes; total backend test count = previous + 10

---

## Phase 2: Gate

- [x] T002 Run `pnpm check` + `pnpm test:backend`
  - **Owner**: Claude | **Tool**: Bash
  - **Acceptance**: Both exit 0; backend test count incremented by 10

- [x] T003 Full suite: `pnpm check` + `pnpm test` + `pnpm test:backend`
  - **Owner**: Claude | **Tool**: Bash
  - **Acceptance**: All three exit 0; frontend 105/105; backend ≥ 40

---

## Dependencies & Execution Order

```
T001 → T002 → T003
```
