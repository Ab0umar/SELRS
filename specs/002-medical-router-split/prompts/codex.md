Follow the project Constitution and Project Principles strictly.
Run these IN ORDER. Do not start the next task until `pnpm check` passes for the current one.

---

## T002 — Extract Pentacam helpers

Task: Extract Pentacam helper functions from `server/routers/medical.ts` into `server/routers/_medical/pentacam-helpers.ts`.

1. Read `server/routers/medical.ts`
2. Move ALL of the following to the new file (export each):
   - Types: `PentacamPatientCandidate`, `FailedPentacamSuggestion`, `FailedPentacamPreview`, `LocalPentacamMismatchEntry`
   - Constants: `PENTACAM_ROOT_DIR`, `PENTACAM_FAILED_DIR`
   - Functions: `normalizePentacamMatchText`, `normalizePentacamPhoneticToken`, `buildPentacamTokenSignatureSet`, `buildPentacamNameKeys`, `extractPentacamNameFragment`, `tokenizePentacamMatchText`, `buildPentacamPatientCandidates`, `resolvePatientForPentacamFileName`, `suggestPatientsForPentacamFileName`, `reorderPatientNameSecondThirdFirst`, `sanitizeLabel`, `normalizePentacamKey`, `resolvePentacamSourceKeyCandidates`, `buildPentacamPatientPrefix`, `buildPentacamPatientKey`, `buildPentacamObjectUrl`, `movePentacamObjectToPatient`, `parsePentacamLocalMeta`, `pentacamEyeHasAnyData`, `pentacamEyeIsComplete`, `expandPentacamDashboardRows`, `stripLeadingCodeLabel`, `assertSafePentacamFileName`, `pathExists`, `nextAvailablePentacamPath`, `extractPentacamPageType`, `buildFailedPentacamGroupLabel`, `buildFailedPentacamGroupKey`, `listFailedPentacamRows`, `previewFailedPentacamRenameTargets`, `moveFailedPentacamFile`, `scanMismatchedLocalPentacamLinks`, `inferPentacamEyeSideFromName`, `inferPentacamCapturedAtFromName`, `inferPentacamMimeType`
3. New file imports whatever it needs (fs/promises, path, db, drizzle, etc.)
4. In `medical.ts` replace moved code with: `import { ... } from "./_medical/pentacam-helpers";`
5. Run `pnpm check` — must pass

Do NOT rename anything. Do NOT change logic. Move only.
Report: files changed, medical.ts line count before/after.

---

## T003 — Extract patient helpers

Task: Extract patient helper functions from `server/routers/medical.ts` into `server/routers/_medical/patient-helpers.ts`.

1. Read `server/routers/medical.ts`
2. Move ALL of the following (export each):
   `resolvePatientNotifTitle`, `resolveNotificationTargetRolesByUserRole`, `normalizePhoneKey`, `findExistingPatientByNameOrPhone`, `resolveServiceCodeForType`, `pushNewPatientToMssql`, `registrationPricingPayload`, `canPushToMssql`, `readFreshDoctorNameForPatient`, `readDoctorNameFromStateData`, `readRoleSignatureFromStateData`, `resolveDoctorCodeById`, `resolveDoctorCodeByName`
3. New file imports from `../db`, `../integrations/mssqlPatients`, drizzle, etc.
4. In `medical.ts` replace with: `import { ... } from "./_medical/patient-helpers";`
5. Run `pnpm check`

Do NOT rename anything. Move only.
Report: files changed, medical.ts line count before/after.

---

## T004 — Extract service helpers

Task: Extract service/catalog helper functions from `server/routers/medical.ts` into `server/routers/_medical/service-helpers.ts`.

1. Read `server/routers/medical.ts`
2. Move ALL of the following (export each):
   - Constants: `LASIK_CODES`, `CONSULTANT_CODES`, `SPECIALIST_CODES`, `XRAY_CODES`, `MOJIBAKE_HINT`, `DEFAULT_MSSQL_SYNC_RUNTIME_CONFIG`
   - Functions: `getSystemSettingFallbackValue`, `decodeMojibake`, `normalizeServiceCodeKey`, `inferSrvTyp`, `normalizeServiceDefaultSheet`, `serviceTypeFromSheetOrType`, `normalizeVisitType`
   - Schemas: `doctorLocationTypeSchema`, `doctorTypeSchema`, `doctorDirectoryEntrySchema`, `serviceDirectoryEntrySchema`, `readyTemplateScopeSchema`, `symptomDirectoryEntrySchema`, `readyTemplateOverrideUpdateSchema`, `readyTemplateOverrideImportSchema`
   - Functions: `readReadyPrescriptionTemplatesFromFile`, `readReadyTestTemplatesFromFile`, `assertPentacamViewPermission`
3. New file imports: zod, @trpc/server, and whatever else each function needs
4. In `medical.ts` replace with: `import { ... } from "./_medical/service-helpers";`
5. Run `pnpm check`

Do NOT rename anything. Move only.
Report: files changed, medical.ts line count before/after.

---

## T006 — Extract medical-pentacam.ts

Task: Extract all Pentacam tRPC procedures from `server/routers/medical.ts` into `server/routers/medical-pentacam.ts`.

CRITICAL: Export a PLAIN OBJECT — NOT a router() instance:
`export const medicalPentacamRoutes = { procedureName: procedure, ... }`
In `medical.ts`, spread it: `export const medicalRouter = router({ ...medicalPentacamRoutes, ... })`

1. Read `server/routers/medical.ts`
2. Move these 21 procedures to the new file:
   `updatePentacamResult`, `getPentacamResultsByVisit`, `listPentacamDashboard`, `getPentacamDashboardStats`, `getPentacamFilesByPatient`, `getPentacamMeasurementsByPatient`, `debugPentacamS3`, `removePentacamLink`, `importLocalPentacamExports`, `autoImportLocalPentacamExports`, `getUnmatchedLocalPentacamSuggestions`, `getMismatchedLocalPentacamLinks`, `listFailedPentacamFiles`, `previewFailedPentacamRename`, `reviewFailedPentacamFile`, `reviewFailedPentacamGroup`, `releaseFailedPentacamFile`, `retryFailedPentacamOcr`, `unlinkMismatchedLocalPentacamLinks`, `reassignLocalPentacamLink`, `searchPentacamPatients`
3. New file imports from `../_core/procedures`, `../../drizzle/schema`, `../db`, `drizzle-orm`, `../_core/s3`, `./_medical/pentacam-helpers`
4. Cut from `medical.ts`; add import + spread
5. Run `pnpm check`

Report: procedure count in new file (must be 21), pnpm check result.

---

## T007 — Extract medical-catalog.ts

Task: Extract all Catalog/Medications/Tests/Prescriptions/Surgery procedures from `server/routers/medical.ts` into `server/routers/medical-catalog.ts`.

CRITICAL: Export a PLAIN OBJECT: `export const medicalCatalogRoutes = { ... }`
Spread in `medical.ts`: `...medicalCatalogRoutes`

Move these 38 procedures:
`getMedications`, `getAllMedications`, `createMedication`, `updateMedication`, `deleteMedication`, `getAllDiseases`, `createDisease`, `updateDisease`, `deleteDisease`, `getAllSymptoms`, `createSymptom`, `updateSymptom`, `deleteSymptom`, `getTests`, `getAllTests`, `createTest`, `updateTest`, `deleteTest`, `getMyTestFavorites`, `toggleTestFavorite`, `createTestRequest`, `getTestRequestsByPatient`, `getPatientTestRequests`, `getTestRequestsByVisit`, `createPrescription`, `getPrescriptionsByVisit`, `createPrescriptionWithItems`, `getPrescriptionsByPatient`, `getPrescriptionsWithItemsByPatient`, `getPrescriptionsOverview`, `getPrescriptionsWithItemsByVisit`, `deletePrescription`, `createSurgery`, `getSurgeriesByPatient`, `deleteSurgery`, `createPostOpFollowup`, `getPostOpFollowupsByPatient`, `getPostOpFollowupsBySurgery`

New file imports from `../_core/procedures`, `../../drizzle/schema`, `../db`, `drizzle-orm`
Run `pnpm check` after.
Report: procedure count (must be 38), pnpm check result.

---

## T008 — Extract medical-examinations.ts

Task: Extract all Examinations/Visits/Refractions/Sheets procedures from `server/routers/medical.ts` into `server/routers/medical-examinations.ts`.

CRITICAL: Export a PLAIN OBJECT: `export const medicalExaminationsRoutes = { ... }`
Spread in `medical.ts`: `...medicalExaminationsRoutes`

Move these 32 procedures:
`getAppointmentsByPatient`, `getMedicalTotals`, `getOperations`, `getAllOperations`, `getAppointments`, `deleteAppointment`, `updateAppointment`, `createExamination`, `updateExamination`, `getExaminationsByPatient`, `getAutorefractometryByPatient`, `getAutorefractometryOverview`, `getGlassesRecordsByPatient`, `getAfterRefractionByPatient`, `saveAfterRefractionData`, `getVisitsByPatient`, `getFollowupVisitsByPatient`, `getVisits`, `getExaminations`, `updateVisitDate`, `updateVisitExamData`, `saveFollowupSheet`, `getFollowupSheets`, `getAllExaminations`, `getRefractionsOverview`, `getSheetEntry`, `saveSheetEntry`, `saveRefractionToExamination`, `saveExaminationForm`, `saveMedicalVisit`, `updateVisitQueueStatus`, `getTodayPatientsByQueueStatus`

New file imports: `../_core/procedures`, `../../drizzle/schema`, `../db`, `drizzle-orm`, `../_core/ws` (broadcastSheetUpdate), `./_medical/service-helpers`
Run `pnpm check` after.
Report: procedure count (must be 32), pnpm check result.

---

## T010 — Extract medical-mssql.ts

Task: Extract all MSSQL Sync procedures from `server/routers/medical.ts` into `server/routers/medical-mssql.ts`.

CRITICAL: Export a PLAIN OBJECT: `export const medicalMssqlRoutes = { ... }`
Spread in `medical.ts`: `...medicalMssqlRoutes`

Move these 21 procedures:
`syncPatientsFromMssql`, `resetPatientServiceTypesFromServiceCode`, `resetMssqlSyncCodes`, `resetPatientsAutoIncrement`, `getMssqlSyncStatus`, `backfillMssqlServiceNames`, `getMssqlSyncRuntimeConfig`, `updateMssqlSyncRuntimeConfig`, `linkMultipleServicesToMssql`, `linkPatientServiceToMssql`, `deletePatientFromMssql`, `deletePatientWithAllData`, `deleteVisitWithAllData`, `deleteExaminationDirect`, `syncRegistrationCatalogFromMssql`, `updateServicePriceInMssql`, `addServiceInDb`, `getServicesFromDb`, `updateServiceInDb`, `getRegistrationCatalog`, `getDataSourceAuditStatus`

New file imports: `../_core/procedures`, `../../drizzle/schema`, `../db`, `drizzle-orm`, `../integrations/mssqlPatients`, `../services/accounting/mssqlAccounting`, `./_medical/patient-helpers`, `./_medical/service-helpers`
Run `pnpm check` after.
Report: procedure count (must be 21), pnpm check result.

---

## T011 — Extract medical-ops.ts

Task: Extract all Ops/Admin/Reports/Directory procedures from `server/routers/medical.ts` into `server/routers/medical-ops.ts`.

CRITICAL: Export a PLAIN OBJECT: `export const medicalOpsRoutes = { ... }`
Spread in `medical.ts`: `...medicalOpsRoutes`

Move these procedures:
`getOpsHealth`, `getBuildInfo`, `getRuntimeDbInfo`, `fixOrphanedExaminations`, `autoFixAllDataIssues`, `checkInvalidVisitIds`, `checkVisitsWithoutAppointments`, `fixExamsWithVisitId0`, `fixVisitsWithoutAppointmentId`, `getDashboardCardVisibility`, `setDashboardCardVisibility`, `deletePatient`, `deleteAllPatients`, `getDoctors`, `getAllUsers`, `getNotificationMeta`, `createUser`, `updateUser`, `deleteUser`, `getUserPermissions`, `getUserPermissionState`, `getMyPermissions`, `getTeamPermissions`, `setTeamPermissions`, `setUserPermissions`, `populatePatientNamesFromSheets`, `debugTodayPatients`, `getPatientMedicalStatusBatch`, `createDoctorReport`, `updateDoctorReport`, `getDoctorReportsByVisit`, `getMedicalReportsByPatient`, `getMedicalReportsOverview`, `getDoctorReports`, `createMedicalReport`, `updateMedicalReport`, `deleteMedicalReport`, `getAuditLogs`, `getOperationList`, `getOperationListById`, `saveOperationList`, `getOperationListsHistory`, `getTodayOperationLists`, `deleteOperationList`, `deleteOperationListById`, `getOperationBookings`, `createOperationBooking`, `updateOperationBooking`, `deleteOperationBooking`, `getUserPageState`, `saveUserPageState`, `getPatientPageState`, `saveExaminationChecklist`, `getExaminationChecklist`, `savePatientPageState`, `getReadyTemplateOverrides`, `upsertReadyTemplateOverride`, `importReadyTemplateOverrides`, `importReadyTemplateOverridesFromFile`, `getSystemSetting`, `registerPushDeviceToken`, `unregisterPushDeviceToken`, `updateSystemSetting`, `getDoctorDirectory`, `updateDoctorDirectory`, `getServiceDirectory`, `getServicesCatalog`, `updateServiceDirectory`

New file imports: `../_core/procedures`, `../../drizzle/schema`, `../db`, `drizzle-orm`, `../_core/buildInfo`, `../_core/fcmPush`, `../_core/appNotifications`, `./_medical/patient-helpers`, `./_medical/service-helpers`
Run `pnpm check` after.
Report: procedure count, pnpm check result.
