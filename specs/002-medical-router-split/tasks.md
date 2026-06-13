# Tasks: Medical Router Split and Route Cleanup

**Branch**: `20260610-medical-router-split`
**Input**: `specs/002-medical-router-split/`
**Spec**: [spec.md](spec.md) | **Plan**: [plan.md](plan.md) | **Data model**: [data-model.md](data-model.md)

> Every task prompt must include: _"Follow the project Constitution and Project Principles strictly."_

---

## Phase 1: Setup

**Purpose**: Create the shared helpers directory structure before any extraction begins.

- [x] T001 Create directory `server/routers/_medical/` by adding a `.gitkeep` placeholder (verify `server/routers/` exists first)

**Checkpoint**: `_medical/` directory present. No code moved yet.

---

## Phase 2: Foundational — Extract Shared Helpers

**Purpose**: Move all helper functions from `medical.ts` (lines 1–2235) into domain-specific helper files. This is a **hard prerequisite** — sub-routers cannot import from helpers that don't exist yet.

**⚠️ CRITICAL**: No sub-router extraction can begin until T004 is complete and T005 passes.

- [x] T002 Extract Pentacam helpers into `server/routers/_medical/pentacam-helpers.ts`
  - **Owner**: claude-sonnet-4-6 | **Backup**: claude-opus-4-8 | **Tool**: Edit/Write
  - **Input**: `server/routers/medical.ts` lines 751–1826 (all functions prefixed `buildPentacam*`, `normalizePentacam*`, `extractPentacam*`, `tokenizePentacam*`, `inferPentacam*`, `listFailedPentacamRows`, `previewFailedPentacamRenameTargets`, `scanMismatchedLocalPentacamLinks`, `movePentacamObjectToPatient`, supporting types `PentacamPatientCandidate`, `FailedPentacamSuggestion`, `FailedPentacamPreview`, `LocalPentacamMismatchEntry`, constants `PENTACAM_ROOT_DIR`, `PENTACAM_FAILED_DIR`)
  - **Output**: New file `server/routers/_medical/pentacam-helpers.ts` exporting all moved symbols; `medical.ts` imports them back with `import { ... } from "./_medical/pentacam-helpers"`
  - **Acceptance**: `pnpm check` passes; `medical.ts` line count reduced by ~1,100

- [x] T003 [P] Extract patient helpers into `server/routers/_medical/patient-helpers.ts`
  - **Owner**: claude-sonnet-4-6 | **Backup**: claude-opus-4-8 | **Tool**: Edit/Write
  - **Input**: `server/routers/medical.ts` — functions `findExistingPatientByNameOrPhone`, `resolveServiceCodeForType`, `pushNewPatientToMssql`, `readFreshDoctorNameForPatient`, `readDoctorNameFromStateData`, `readRoleSignatureFromStateData`, `resolveDoctorCodeById`, `resolveDoctorCodeByName`, `canPushToMssql`, `registrationPricingPayload`, `normalizePhoneKey`, `reorderPatientNameSecondThirdFirst`
  - **Output**: New file `server/routers/_medical/patient-helpers.ts` exporting all moved symbols; `medical.ts` imports them back
  - **Acceptance**: `pnpm check` passes

- [x] T004 [P] Extract service helpers into `server/routers/_medical/service-helpers.ts`
  - **Owner**: claude-sonnet-4-6 | **Backup**: claude-opus-4-8 | **Tool**: Edit/Write
  - **Input**: `server/routers/medical.ts` — constants `LASIK_CODES`, `CONSULTANT_CODES`, `SPECIALIST_CODES`, `XRAY_CODES`; schemas `doctorLocationTypeSchema`, `doctorTypeSchema`, `doctorDirectoryEntrySchema`, `serviceDirectoryEntrySchema`, `readyTemplateScopeSchema`, `symptomDirectoryEntrySchema`, `readyTemplateOverrideUpdateSchema`, `readyTemplateOverrideImportSchema`; functions `inferSrvTyp`, `normalizeServiceDefaultSheet`, `serviceTypeFromSheetOrType`, `normalizeServiceCodeKey`, `decodeMojibake`, `MOJIBAKE_HINT`, `sanitizeLabel`, `normalizeVisitType`, `resolvePatientNotifTitle`, `resolveNotificationTargetRolesByUserRole`, `assertPentacamViewPermission`, `inferPentacamEyeSideFromName`, `inferPentacamMimeType`, `readReadyPrescriptionTemplatesFromFile`, `readReadyTestTemplatesFromFile`
  - **Output**: New file `server/routers/_medical/service-helpers.ts` exporting all moved symbols; `medical.ts` imports them back
  - **Acceptance**: `pnpm check` passes

- [x] T005 Run `pnpm check` after T002–T004 complete; confirm zero new TypeScript errors before proceeding
  - **Acceptance**: Exit code 0, no new errors

**Checkpoint**: Three helper files exist. `medical.ts` imports from them. All callers unchanged. `pnpm check` green.

---

## Phase 3: US1 — Developer Navigates to Domain Logic (P1)

**Goal**: Extract Pentacam, Catalog, and Examinations into their own files. Each file is independently readable and focused.

**Independent Test**: Open `server/routers/medical-pentacam.ts` and confirm it contains `getPentacamFilesByPatient` and no unrelated procedures. Run `pnpm check`.

- [x] T006 [US1] Create `server/routers/medical-pentacam.ts` with all 21 Pentacam procedures
  - **Owner**: claude-sonnet-4-6 | **Backup**: claude-opus-4-8 | **Tool**: Write
  - **Input**: `server/routers/medical.ts` lines ~5299–6164 (procedures: `updatePentacamResult`, `getPentacamResultsByVisit`, `listPentacamDashboard`, `getPentacamDashboardStats`, `getPentacamFilesByPatient`, `getPentacamMeasurementsByPatient`, `debugPentacamS3`, `removePentacamLink`, `importLocalPentacamExports`, `autoImportLocalPentacamExports`, `getUnmatchedLocalPentacamSuggestions`, `getMismatchedLocalPentacamLinks`, `listFailedPentacamFiles`, `previewFailedPentacamRename`, `reviewFailedPentacamFile`, `reviewFailedPentacamGroup`, `releaseFailedPentacamFile`, `retryFailedPentacamOcr`, `unlinkMismatchedLocalPentacamLinks`, `reassignLocalPentacamLink`, `searchPentacamPatients`)
  - **Output**: New file exporting `export const medicalPentacamRoutes = { ... }` (plain object, NOT a `router()` instance); procedures cut from `medical.ts`; `medical.ts` spreads `...medicalPentacamRoutes` in `medicalRouter`
  - **Acceptance**: `pnpm check` passes; 21 procedures accessible via `trpc.medical.*`

- [x] T007 [P] [US1] Create `server/routers/medical-catalog.ts` with all 38 Catalog procedures
  - **Owner**: claude-sonnet-4-6 | **Backup**: claude-opus-4-8 | **Tool**: Write
  - **Input**: `server/routers/medical.ts` lines ~6381–7090 (procedures: `getMedications`, `getAllMedications`, `createMedication`, `updateMedication`, `deleteMedication`, `getAllDiseases`, `createDisease`, `updateDisease`, `deleteDisease`, `getAllSymptoms`, `createSymptom`, `updateSymptom`, `deleteSymptom`, `getTests`, `getAllTests`, `createTest`, `updateTest`, `deleteTest`, `getMyTestFavorites`, `toggleTestFavorite`, `createTestRequest`, `getTestRequestsByPatient`, `getPatientTestRequests`, `getTestRequestsByVisit`, `createPrescription`, `getPrescriptionsByVisit`, `createPrescriptionWithItems`, `getPrescriptionsByPatient`, `getPrescriptionsWithItemsByPatient`, `getPrescriptionsOverview`, `getPrescriptionsWithItemsByVisit`, `deletePrescription`, `createSurgery`, `getSurgeriesByPatient`, `deleteSurgery`, `createPostOpFollowup`, `getPostOpFollowupsByPatient`, `getPostOpFollowupsBySurgery`)
  - **Output**: New file exporting `export const medicalCatalogRoutes = { ... }`; procedures cut from `medical.ts`; spread into `medicalRouter`
  - **Acceptance**: `pnpm check` passes; 38 procedures accessible via `trpc.medical.*`

- [x] T008 [P] [US1] Create `server/routers/medical-examinations.ts` with all 32 Examinations/Visits procedures
  - **Owner**: claude-sonnet-4-6 | **Backup**: claude-opus-4-8 | **Tool**: Write
  - **Input**: `server/routers/medical.ts` lines ~4684–5298 (procedures: `getAppointmentsByPatient`, `getMedicalTotals`, `getOperations`, `getAllOperations`, `getAppointments`, `deleteAppointment`, `updateAppointment`, `createExamination`, `updateExamination`, `getExaminationsByPatient`, `getAutorefractometryByPatient`, `getAutorefractometryOverview`, `getGlassesRecordsByPatient`, `getAfterRefractionByPatient`, `saveAfterRefractionData`, `getVisitsByPatient`, `getFollowupVisitsByPatient`, `getVisits`, `getExaminations`, `updateVisitDate`, `updateVisitExamData`, `saveFollowupSheet`, `getFollowupSheets`, `getAllExaminations`, `getRefractionsOverview`, `getSheetEntry`, `saveSheetEntry`, `saveRefractionToExamination`, `saveExaminationForm`, `saveMedicalVisit`, `updateVisitQueueStatus`, `getTodayPatientsByQueueStatus`)
  - **Output**: New file exporting `export const medicalExaminationsRoutes = { ... }`; procedures cut from `medical.ts`; spread into `medicalRouter`; imports `broadcastSheetUpdate` from `../_core/ws` and service helpers from `./_medical/service-helpers`
  - **Acceptance**: `pnpm check` passes; 32 procedures accessible via `trpc.medical.*`

- [x] T009 [US1] Run `pnpm check` after T006–T008; confirm zero errors before proceeding to Phase 4
  - **Acceptance**: Exit code 0

**Checkpoint**: Pentacam, Catalog, and Examinations each in their own file. `trpc.medical.*` namespace unchanged. `pnpm check` green.

---

## Phase 4: US2 — Developer Can Navigate to MSSQL Sync Logic (P1)

**Goal**: Extract the MSSQL sync domain and the Ops/Admin domain. Reduce `medical.ts` to the patient core. Run full verification.

**Independent Test**: Search for `syncPatientsFromMssql` — it should exist only in `server/routers/medical-mssql.ts`. `pnpm check` + 62-test suite pass.

- [x] T010 [US2] Create `server/routers/medical-mssql.ts` with all MSSQL sync procedures
  - **Owner**: claude-sonnet-4-6 | **Backup**: claude-opus-4-8 | **Tool**: Write
  - **Input**: `server/routers/medical.ts` — procedures: `syncPatientsFromMssql`, `resetPatientServiceTypesFromServiceCode`, `resetMssqlSyncCodes`, `resetPatientsAutoIncrement`, `getMssqlSyncStatus`, `backfillMssqlServiceNames`, `getMssqlSyncRuntimeConfig`, `updateMssqlSyncRuntimeConfig`, `linkMultipleServicesToMssql`, `linkPatientServiceToMssql`, `deletePatientFromMssql`, `deletePatientWithAllData`, `deleteVisitWithAllData`, `deleteExaminationDirect`, `syncRegistrationCatalogFromMssql`, `updateServicePriceInMssql`, `addServiceInDb`, `getServicesFromDb`, `updateServiceInDb`, `getRegistrationCatalog`, `getDataSourceAuditStatus`; constant `DEFAULT_MSSQL_SYNC_RUNTIME_CONFIG`
  - **Output**: New file exporting `export const medicalMssqlRoutes = { ... }`; procedures cut from `medical.ts`; spread into `medicalRouter`; imports from `./_medical/patient-helpers`, `./_medical/service-helpers`, `../integrations/mssqlPatients`
  - **Acceptance**: `pnpm check` passes; `resetMssqlSyncCodes` accessible via `trpc.medical.resetMssqlSyncCodes`

- [x] T011 [P] [US2] Create `server/routers/medical-ops.ts` with all Ops/Admin/Reports procedures
  - **Owner**: claude-sonnet-4-6 | **Backup**: claude-opus-4-8 | **Tool**: Write
  - **Input**: `server/routers/medical.ts` — procedures: `getOpsHealth`, `getBuildInfo`, `getRuntimeDbInfo`, `fixOrphanedExaminations`, `autoFixAllDataIssues`, `checkInvalidVisitIds`, `checkVisitsWithoutAppointments`, `fixExamsWithVisitId0`, `fixVisitsWithoutAppointmentId`, `getDashboardCardVisibility`, `setDashboardCardVisibility`, `deletePatient`, `deleteAllPatients`, `getDoctors`, `getAllUsers`, `getNotificationMeta`, `createUser`, `updateUser`, `deleteUser`, `getUserPermissions`, `getUserPermissionState`, `getMyPermissions`, `getTeamPermissions`, `setTeamPermissions`, `setUserPermissions`, `populatePatientNamesFromSheets`, `debugTodayPatients`, `getPatientMedicalStatusBatch`, plus all Reports/Directory procedures (createDoctorReport through updateServiceDirectory — ~40 additional)
  - **Output**: New file exporting `export const medicalOpsRoutes = { ... }`; procedures cut from `medical.ts`; spread into `medicalRouter`
  - **Acceptance**: `pnpm check` passes; `getMyPermissions` accessible via `trpc.medical.getMyPermissions`

- [x] T012 [US2] Reduce `server/routers/medical.ts` to patient core + router composition
  - **Owner**: claude-sonnet-4-6 | **Backup**: claude-opus-4-8 | **Tool**: Edit
  - **Input**: `medical.ts` after T006–T011 cuts; should contain only: ~15 patient-core procedures + the `medicalRouter = router({ ...spreads })` declaration + necessary imports
  - **Output**: `medical.ts` ≤ 700 lines; all spreads present; all imports cleaned up (remove imports of symbols moved to sub-routers)
  - **Acceptance**: File ≤ 700 lines; `pnpm check` passes

- [x] T013 [US2] Run `pnpm check` AND full 62-test suite (`pnpm test` or Playwright runner)
  - **Acceptance**: `pnpm check` exit 0; all 62 tests pass (zero new failures); report results

**Checkpoint**: All 195 procedures distributed. No file in `server/routers/` exceeds 2,500 lines. Full test suite green. Backend split complete.

---

## Phase 5: US3 — Staff Navigates Directly to KF Patient List (P2)

**Goal**: Fix `/kf` so it renders the KF patient list, not Global Search.

**Independent Test**: Navigate to `/kf` while authenticated as KF staff; KF patient table renders on first load.

- [x] T014 [US3] Identify current component rendered at `/kf` in `client/src/App.tsx` (read lines 936–950) and identify component rendered at `/kf/patients` (read lines 1016–1030)
  - **Output**: Note exact component names for T015
  - **Acceptance**: Both component names identified

- [x] T015 [US3] Update `/kf` route in `client/src/App.tsx` to render the same component as `/kf/patients`
  - **Owner**: claude-sonnet-4-6 | **Tool**: Edit
  - **Input**: `client/src/App.tsx` line ~938; component name from T014
  - **Output**: `/kf` route renders KF patient list component; `/kf/patients` route unchanged
  - **Acceptance**: `pnpm check` passes; navigating to `/kf` shows patient table, not Global Search

**Checkpoint**: `/kf` and `/kf/patients` both show the KF patient list.

---

## Phase 6: US4 — Consistent KF Sheet Routes (P2)

**Goal**: Add `/kf/sheets/*` as the canonical path, redirect `/KFsheets/*` to it, update ProtectedRoute.tsx.

**Independent Test**: Navigate to `/KFsheets/consultant/1` — browser redirects to `/kf/sheets/consultant/1` and sheet renders. Navigate directly to `/kf/sheets/consultant/1` — sheet renders without redirect.

- [x] T016 [US4] Add redirect routes for `/KFsheets/*` in `client/src/App.tsx`
  - **Owner**: claude-sonnet-4-6 | **Tool**: Edit
  - **Input**: `client/src/App.tsx` lines ~1048–1064 (current `/KFsheets/consultant/:kfPatientId` and `/KFsheets/consultant/:kfPatientId/followup` routes); Wouter's `useRoute` + `Redirect` pattern (see line ~408 for existing redirect example)
  - **Output**: Two redirect routes added before the existing KFsheets routes; they redirect to `/kf/sheets/consultant/:kfPatientId` and `/kf/sheets/consultant/:kfPatientId/followup` respectively
  - **Acceptance**: `pnpm check` passes; old URLs redirect

- [x] T017 [US4] Register canonical `/kf/sheets/*` routes in `client/src/App.tsx`
  - **Owner**: claude-sonnet-4-6 | **Tool**: Edit
  - **Input**: `client/src/App.tsx`; same components currently used by `/KFsheets/*` routes
  - **Output**: Two new routes at `/kf/sheets/consultant/:kfPatientId` and `/kf/sheets/consultant/:kfPatientId/followup` rendering the same components as before
  - **Acceptance**: `pnpm check` passes; new paths render sheets correctly

- [x] T018 [US4] Update `client/src/components/ProtectedRoute.tsx` permission path check
  - **Owner**: claude-sonnet-4-6 | **Tool**: Edit
  - **Input**: `client/src/components/ProtectedRoute.tsx` lines 80–87; change `"/KFsheets/consultant"` and `"/KFsheets/consultant/"` prefix check to `"/kf/sheets/consultant"` and `"/kf/sheets/consultant/"` respectively
  - **Output**: Permission check uses canonical `/kf/sheets/consultant` path; existing KF permission grant (`/kf`) still covers it via prefix match at line 76
  - **Acceptance**: `pnpm check` passes; KF staff can access `/kf/sheets/*` routes; non-KF staff are blocked

**Checkpoint**: `/KFsheets/*` → redirects to `/kf/sheets/*`. Permission check updated. KF access control intact.

---

## Final Phase: Verification & Cleanup

- [x] T019 Run `pnpm check` + full 62-test suite as final gate
  - **Acceptance**: `pnpm check` exit 0; 62/62 tests pass; report changed files, checks run

- [x] T020 [P] Update `specs/002-medical-router-split/checklists/requirements.md` — mark all items complete and note final line counts per file

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1** (Setup): No dependencies
- **Phase 2** (Foundational): Depends on Phase 1 — **blocks Phases 3–4**
- **Phase 3** (US1): Depends on Phase 2 completion; T006, T007, T008 can run in parallel
- **Phase 4** (US2): Depends on Phase 3 completion; T010 and T011 can run in parallel
- **Phase 5** (US3): Independent of Phases 3–4; can run after Phase 2 or in parallel with Phase 3
- **Phase 6** (US4): Independent of Phases 3–4; can run after Phase 2 or in parallel
- **Final Phase**: Depends on all phases complete

### Parallel Opportunities

```
Phase 2:  T002 + T003 + T004 in parallel (different output files)
Phase 3:  T006 + T007 + T008 in parallel (different output files)
Phase 4:  T010 + T011 in parallel (different output files)
Phases 5+6 can overlap with Phase 3/4 (different file surfaces: backend vs frontend)
```

---

## Implementation Strategy

### MVP (US1 + US2 only — backend split)

1. Phase 1 → Phase 2 → Phase 3 → Phase 4
2. `pnpm check` + 62-test suite green
3. Ship backend split independently — no frontend changes needed

### Full Delivery

1. Backend split (Phases 1–4)
2. Frontend route fixes (Phases 5–6)
3. Final verification (T019–T020)

---

## Notes

- Constitution Principle VII is active: every sub-task that touches `medical.ts` must run `pnpm check` before moving on
- Sub-router files export **plain objects**, not `router()` instances — this keeps `trpc.medical.*` namespace flat
- Do not rename any procedures during extraction — exact names must match [contracts/medical-router-surface.md](contracts/medical-router-surface.md)
- If `pnpm check` fails at any checkpoint, stop and fix before proceeding to the next task
