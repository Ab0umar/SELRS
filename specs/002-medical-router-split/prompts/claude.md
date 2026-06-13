Follow the project Constitution and Project Principles strictly.
Run `pnpm check` after each task. Do not proceed to the next task if check fails.

---

## T001 — Create _medical/ directory

Task: Create the helpers directory `server/routers/_medical/` with three empty placeholder files.

1. Create directory `server/routers/_medical/`
2. Create empty files: `pentacam-helpers.ts`, `patient-helpers.ts`, `service-helpers.ts`
   - Each file starts with just: `// placeholder — to be filled by subsequent tasks`
3. Run `pnpm check` — must pass (no imports to break yet)

Report: directory created, files created, pnpm check result.

---

## T005 — Wire sub-routers into medical.ts

Task: After T002/T003/T004 (helper extractions) complete, add the spread pattern to `medical.ts` in preparation for procedure extractions.

**Context**: Procedure extraction tasks (T006–T011) will each export a plain object. This task adds the spread imports ahead of time so the pattern is established.

1. Read the bottom of `server/routers/medical.ts` — find the `medicalRouter = router({` declaration
2. Add commented-out import stubs at the top of the file (these will be uncommented as T006–T011 complete):
   ```ts
   // import { medicalPentacamRoutes } from "./medical-pentacam";
   // import { medicalCatalogRoutes } from "./medical-catalog";
   // import { medicalExaminationsRoutes } from "./medical-examinations";
   // import { medicalMssqlRoutes } from "./medical-mssql";
   // import { medicalOpsRoutes } from "./medical-ops";
   ```
3. Run `pnpm check`

Report: lines added, pnpm check result.

---

## T009 — Extract medical-patient.ts

Task: Extract all Patient-core tRPC procedures from `server/routers/medical.ts` into `server/routers/medical-patient.ts`.

CRITICAL: Export a PLAIN OBJECT — NOT a router() instance:
`export const medicalPatientRoutes = { procedureName: procedure, ... }`
In `medical.ts`, spread it: `export const medicalRouter = router({ ...medicalPatientRoutes, ... })`

Move these procedures:
`getPatient`, `getPatients`, `searchPatients`, `getPatientsByDoctor`, `createPatient`, `updatePatient`, `getPatientStatus`, `setPatientStatus`, `getPatientFiles`, `uploadPatientFile`, `deletePatientFile`, `getPatientFileUrl`, `getPatientTimeline`, `getPatientHistory`, `getPatientInsurance`, `updatePatientInsurance`, `setPatientQueue`, `getQueueStats`, `createVisitFromQueue`, `getPatientQueueEntry`, `linkPatientToMssql`, `unlinkPatientFromMssql`, `getPatientServiceEntries`, `createPatientServiceEntry`, `updatePatientServiceEntry`, `deletePatientServiceEntry`

New file imports: `../_core/procedures`, `../../drizzle/schema`, `../db`, `drizzle-orm`, `./_medical/patient-helpers`
Run `pnpm check` after.
Report: procedure count, pnpm check result.

---

## T012 — Verify medical.ts final state

Task: After T006–T011 all complete, verify that `medical.ts` is in final correct state.

1. Read `server/routers/medical.ts`
2. Confirm:
   - `medicalRouter = router({` spreads all 5 sub-route objects: `...medicalPentacamRoutes`, `...medicalCatalogRoutes`, `...medicalExaminationsRoutes`, `...medicalPatientRoutes`, `...medicalMssqlRoutes`, `...medicalOpsRoutes`
   - No procedure definitions remain inline (only helper functions that couldn't be extracted)
   - All import stubs from T005 are uncommented and active
3. Run `pnpm check`
4. Report medical.ts line count (target: under 500 lines, from original 10,444)

Report: final line count, spread count, pnpm check result.

---

## T013 — Integration smoke test

Task: Run the full verification suite after the medical router split is complete.

1. Run `pnpm check` — zero errors required
2. Run `pnpm build` — zero errors required
3. Report: check result, build result, any errors found

If any errors exist, fix them before reporting success. This is the Constitution Principle VII gate.

---

## T016 — Verify /kf route fix (post T014)

Task: After Gemini completes T014 (fixing the /kf route), verify the fix is correct.

1. Read `client/src/App.tsx` — find the `/kf` route
2. Confirm it renders `KfPatientList` (not Global Search or any other component)
3. Read `client/src/components/ProtectedRoute.tsx` — confirm line 237 fallback is `/kf`
4. Run `pnpm check`

Report: route line content, ProtectedRoute fallback line, pnpm check result.

---

## T017 — Verify /KFsheets rename (post T015)

Task: After Gemini completes T015 (renaming /KFsheets to /kf/sheets), verify the rename is complete and correct.

1. Read `client/src/App.tsx` — confirm `/kf/sheets` route exists and `/KFsheets` redirect exists
2. Read `client/src/components/ProtectedRoute.tsx` — confirm the path check uses `/kf/sheets/consultant` not `/KFsheets/consultant`
3. Run grep across the entire codebase for any remaining `/KFsheets` references that are NOT the redirect route
4. Run `pnpm check`

Report: redirect route lines, ProtectedRoute updated line, any stray /KFsheets references found, pnpm check result.

---

## T018 — Final route verification

Task: Run complete verification after all route fixes (T014–T017) are complete.

1. Run `pnpm check`
2. Run `pnpm build`
3. Confirm no TypeScript errors related to routes or components

Report: check result, build result.

---

## T019 — Final integration test

Task: Run the 62-test Playwright suite as the final gate.

1. Run the test suite: `node testsprite_tests/local_run.py` (or the project's test command)
2. All 62 tests must pass
3. If any fail, investigate and fix root cause

Report: test results (X/62 pass), any failures and their cause.

---

## T020 — Update CLAUDE.md speckit pointer

Task: Update the speckit plan pointer in `CLAUDE.md` to point to the next active plan after 002 completes.

1. Read `CLAUDE.md`
2. Find the `<!-- SPECKIT START -->` / `<!-- SPECKIT END -->` block (or the "current plan" reference line)
3. If 003 is the next plan to execute, update the pointer to `specs/003-permission-typed-constants/plan.md`
4. If 002 is still active, leave it unchanged

Report: current pointer value, new pointer value (or "no change"), file updated.
